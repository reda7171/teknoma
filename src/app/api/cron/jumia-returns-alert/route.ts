import { NextResponse } from "next/server"
import { JumiaAPI } from "@/lib/jumia-api"
import { sendTelegramMessage } from "@/lib/telegram"

// Alerte commandes Jumia retournées/remboursées
export async function GET(req: Request) {
    try {
        const url = new URL(req.url)
        const token = url.searchParams.get("token")
        
        if (process.env.CRON_SECRET && token !== process.env.CRON_SECRET) {
            return new NextResponse("Unauthorized", { status: 401 })
        }

        const jumia = await JumiaAPI.getInstance()
        if (!jumia) {
            return NextResponse.json({ success: false, error: "Jumia non configuré" })
        }

        const threeDaysAgo = new Date()
        threeDaysAgo.setDate(threeDaysAgo.getDate() - 3)
        const createdAfter = threeDaysAgo.toISOString().split('T')[0]
        const tomorrow = new Date()
        tomorrow.setDate(tomorrow.getDate() + 1)
        const createdBefore = tomorrow.toISOString().split('T')[0]

        // Vérifier les commandes retournées récentes
        const [returnedResponse, canceledResponse] = await Promise.all([
            jumia.getOrders(50, undefined, 'returned', createdAfter, createdBefore),
            jumia.getOrders(50, undefined, 'canceled', createdAfter, createdBefore)
        ])

        const returnedOrders = returnedResponse?.orders || returnedResponse?.data?.orders || []
        const canceledOrders = canceledResponse?.orders || canceledResponse?.data?.orders || []

        if (returnedOrders.length === 0 && canceledOrders.length === 0) {
            return NextResponse.json({ success: true, message: 'Aucun retour/annulation récent.' })
        }

        // --- NOUVEAU: Restaurer le stock local ---
        const { prisma } = await import('@/lib/prisma')
        const processedSetting = await prisma.siteSettings.findUnique({ where: { key: 'jumia_processed_returns' } })
        let processedReturns = new Set<string>()
        if (processedSetting?.value) {
            try { processedReturns = new Set(JSON.parse(processedSetting.value)) } catch (e) {}
        }

        const allToProcess = [...returnedOrders, ...canceledOrders]
        const unprocessedOrders = allToProcess.filter((o: any) => !processedReturns.has((o.id || o.orderId || o.number)?.toString()))

        for (const order of unprocessedOrders) {
            const internalId = order.id || order.orderId || order.number
            
            try {
                const itemsResponse = await jumia.getOrderItems(internalId)
                let allItems: any[] = []
                if (Array.isArray(itemsResponse) && itemsResponse.length > 0) {
                    for (const pkg of itemsResponse) { allItems = allItems.concat(pkg.orderItems || []) }
                } else {
                    allItems = itemsResponse?.orderItems || itemsResponse?.data?.orderItems || []
                }

                for (const item of allItems) {
                    const quantity = item.quantity || 1
                    const sellerSku = item.product?.sellerSku || item.sellerSku || item.sku || item.shopSku

                    if (sellerSku) {
                        try {
                            await prisma.book.updateMany({ where: { sellerSku }, data: { stock: { increment: quantity } } })
                            await prisma.pack.updateMany({ where: { sellerSku }, data: { stock: { increment: quantity } } })
                            await prisma.extraProduct.updateMany({ where: { sellerSku }, data: { stock: { increment: quantity } } })
                            await prisma.jumiaActionLog.create({
                                data: {
                                    orderId: internalId.toString(),
                                    action: "AUTO_INCREMENT_STOCK",
                                    status: "SUCCESS",
                                    detail: `Restauration de ${quantity} unité(s) suite annulation/retour Jumia (SKU ${sellerSku})`
                                }
                            })
                        } catch (e) { console.error("Erreur incrementation stock", e) }
                    }
                }

                processedReturns.add(internalId.toString())
            } catch (err) {
                console.error(`Erreur récupération items pour retour ${internalId}`, err)
            }
        }

        if (unprocessedOrders.length > 0) {
            const toSave = Array.from(processedReturns).slice(-2000)
            await prisma.siteSettings.upsert({
                where: { key: 'jumia_processed_returns' },
                update: { value: JSON.stringify(toSave) },
                create: { key: 'jumia_processed_returns', value: JSON.stringify(toSave) }
            })
        }
        // ----------------------------------------

        let msg = `🔄 <b>Alerte Retours/Annulations Jumia (3 derniers jours)</b>\n\n`

        if (returnedOrders.length > 0) {
            msg += `↩️ <b>Retournées : ${returnedOrders.length}</b>\n`
            returnedOrders.slice(0, 3).forEach((o: any) => {
                const id = o.number || o.orderId || 'N/A'
                const amount = o.totalAmountLocal?.value || '?'
                msg += `  • #${id} → ${amount} MAD\n`
            })
        }

        if (canceledOrders.length > 0) {
            msg += `\n❌ <b>Annulées : ${canceledOrders.length}</b>\n`
            canceledOrders.slice(0, 3).forEach((o: any) => {
                const id = o.number || o.orderId || 'N/A'
                const amount = o.totalAmountLocal?.value || '?'
                msg += `  • #${id} → ${amount} MAD\n`
            })
        }

        await sendTelegramMessage(msg)

        return NextResponse.json({ success: true, returned: returnedOrders.length, canceled: canceledOrders.length, restored: unprocessedOrders.length })
    } catch (e: any) {
        return NextResponse.json({ success: false, error: e.message }, { status: 500 })
    }
}
