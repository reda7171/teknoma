import { NextResponse } from "next/server"
import { JumiaAPI } from "@/lib/jumia-api"
import { sendTelegramMessage } from "@/lib/telegram"
import { isAuthorizedCronRequest } from '@/lib/cron-auth'
import { getJumiaOrderStatus } from '@/lib/jumia-reporting'

// Alerte commandes Jumia retournées/remboursées
export async function GET(req: Request) {
    try {
        if (!isAuthorizedCronRequest(req)) {
            return new NextResponse("Unauthorized", { status: 401 })
        }

        const jumia = await JumiaAPI.getInstance()
        if (!jumia) {
            return NextResponse.json({ success: false, error: "Jumia non configuré ou authentification indisponible" }, { status: 503 })
        }

        const threeDaysAgo = new Date()
        threeDaysAgo.setDate(threeDaysAgo.getDate() - 3)
        const updatedAfter = threeDaysAgo.toISOString()
        const updatedBefore = new Date().toISOString()
        const updatedOrders: any[] = []
        let nextToken: string | undefined
        let pageCount = 0

        do {
            const response = await jumia.getOrdersUpdated({
                size: 300,
                token: nextToken,
                updatedAfter,
                updatedBefore,
                sort: 'ASC'
            })
            const pageOrders = response?.orders || response?.data?.orders || []
            updatedOrders.push(...pageOrders)
            nextToken = response?.nextToken || response?.data?.nextToken || undefined
            pageCount++
            if (pageOrders.length === 0 || updatedOrders.length >= 10000 || pageCount >= 40) {
                nextToken = undefined
            }
        } while (nextToken)

        const returnedStatuses = new Set(['RETURNED', 'RETURNED_TO_SELLER', 'REFUNDED'])
        const canceledStatuses = new Set(['CANCELED', 'CANCELLED', 'FAILED', 'DELIVERY_FAILED'])
        const returnedOrders = updatedOrders.filter(order => returnedStatuses.has(getJumiaOrderStatus(order)))
        const canceledOrders = updatedOrders.filter(order => canceledStatuses.has(getJumiaOrderStatus(order)))

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

        // Ne pas impacter le stock automatiquement sur un retour avant récupération physique du colis
        const allToProcess = [...canceledOrders]
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
                msg += `  • #${id} → ${amount} درهم\n`
            })
        }

        if (canceledOrders.length > 0) {
            msg += `\n❌ <b>Annulées : ${canceledOrders.length}</b>\n`
            canceledOrders.slice(0, 3).forEach((o: any) => {
                const id = o.number || o.orderId || 'N/A'
                const amount = o.totalAmountLocal?.value || '?'
                msg += `  • #${id} → ${amount} درهم\n`
            })
        }

        await sendTelegramMessage(msg)

        return NextResponse.json({ success: true, returned: returnedOrders.length, canceled: canceledOrders.length, restored: unprocessedOrders.length })
    } catch (e: any) {
        console.error('[JUMIA RETURNS] Vérification impossible:', e)
        return NextResponse.json({ success: false, error: e?.message || 'Erreur Jumia inconnue' }, { status: 500 })
    }
}
