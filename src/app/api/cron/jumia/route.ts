import { NextResponse } from "next/server"
import { JumiaAPI } from "@/lib/jumia-api"
import { prisma } from "@/lib/prisma"
import { sendTelegramMessage } from "@/lib/telegram"

export async function GET(req: Request) {
    try {
        const url = new URL(req.url)
        const token = url.searchParams.get("token")
        
        // Optional security check if CRON_SECRET is defined in env
        if (process.env.CRON_SECRET && token !== process.env.CRON_SECRET) {
            return new NextResponse("Unauthorized", { status: 401 })
        }

        const jumia = await JumiaAPI.getInstance()
        if (!jumia) {
            return NextResponse.json({ success: false, error: "Jumia API non configurée" })
        }

        // Get the last sync date
        const syncSetting = await prisma.siteSettings.findUnique({ where: { key: 'jumia_last_sync_date' } })
        
        // Default to 1 hour ago if no previous sync
        let lastSyncDate = new Date()
        if (syncSetting && syncSetting.value) {
            lastSyncDate = new Date(syncSetting.value)
        } else {
            lastSyncDate.setHours(lastSyncDate.getHours() - 1)
        }

        // Format to ISO string for the Jumia API (YYYY-MM-DDTHH:mm:ssZ)
        const createdAfter = lastSyncDate.toISOString().split('T')[0] // Using date only to avoid parsing issues
        
        const tomorrow = new Date()
        tomorrow.setDate(tomorrow.getDate() + 1)
        const createdBefore = tomorrow.toISOString().split('T')[0]

        const response = await jumia.getOrders(100, undefined, undefined, createdAfter, createdBefore)
        const orders = response?.orders || response?.data?.orders || []

        const newOrders = orders.filter((o: any) => {
            const createdAt = o.createdAt || o.CreatedAt
            if (!createdAt) return false
            return new Date(createdAt) > lastSyncDate
        })

        if (newOrders.length > 0) {
            for (const order of newOrders) {
                const orderId = order.orderId || order.OrderId || order.orderNumber || "Inconnu"
                const customerName = order.customerFirstName || order.CustomerFirstName || order.customerLastName || order.CustomerLastName || "Client Jumia"
                const price = order.totalAmountLocal?.value || order.Price || order.GrandTotal || "0"
                const status = order.status || order.Status || "PENDING"
                
                const message = `🛍️ *Nouvelle Commande Jumia !*\n\n` +
                                `📦 *Numéro :* \`${orderId}\`\n` +
                                `👤 *Client :* ${customerName}\n` +
                                `💰 *Total :* ${price} MAD\n` +
                                `📊 *Statut :* ${status}\n\n` +
                                `🕒 Date: ${new Date(order.createdAt || order.CreatedAt).toLocaleString('fr-FR')}`

                const replyMarkup = {
                    inline_keyboard: [
                        [
                            { text: '📦 Préparer (Ready-to-Ship)', callback_data: `jumia_rts:${orderId}` }
                        ]
                    ]
                }

                await sendTelegramMessage(message, process.env.TELEGRAM_CHAT_ID, process.env.TELEGRAM_BOT_TOKEN, replyMarkup)
            }

            // Find the most recent date from the new orders
            let maxDate = lastSyncDate
            newOrders.forEach((o: any) => {
                const date = new Date(o.createdAt || o.CreatedAt)
                if (date > maxDate) maxDate = date
            })

            // Update the last sync date
            await prisma.siteSettings.upsert({
                where: { key: 'jumia_last_sync_date' },
                update: { value: maxDate.toISOString() },
                create: { key: 'jumia_last_sync_date', value: maxDate.toISOString() }
            })
        }

        return NextResponse.json({ 
            success: true, 
            message: `${newOrders.length} nouvelles commandes notifiées.`,
            lastSync: lastSyncDate.toISOString()
        })
    } catch (e: any) {
        console.error("Erreur Cron Jumia:", e)
        return NextResponse.json({ success: false, error: e.message }, { status: 500 })
    }
}
