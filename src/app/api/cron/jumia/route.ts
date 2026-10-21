import { NextResponse } from "next/server"
import { JumiaAPI } from "@/lib/jumia-api"
import { prisma } from "@/lib/prisma"
import { sendTelegramMessage } from "@/lib/telegram"
import { isAuthorizedCronRequest } from '@/lib/cron-auth'

export async function GET(req: Request) {
    try {
        if (!isAuthorizedCronRequest(req)) {
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
                const orderId = order.OrderNumber || order.orderNumber || order.OrderId || order.orderId || order.number || "Inconnu"
                const customerName = `${order.shippingAddress?.firstName || order.CustomerFirstName || ''} ${order.shippingAddress?.lastName || order.CustomerLastName || ''}`.trim() || "Client Jumia"
                const price = order.totalAmountLocal?.value || order.Price || order.GrandTotal || "0"
                const status = order.status || order.Status || "PENDING"
                
                let itemsList = ""
                try {
                    const internalId = order.id || orderId
                    const itemsResponse = await jumia.getOrderItems(internalId)
                    
                    let allItems: any[] = []
                    
                    if (Array.isArray(itemsResponse) && itemsResponse.length > 0) {
                        for (const pkg of itemsResponse) {
                            const items = pkg.orderItems || []
                            allItems = allItems.concat(items)
                        }
                    } else {
                        allItems = itemsResponse?.orderItems || itemsResponse?.data?.orderItems || []
                    }
                    
                    if (allItems.length > 0) {
                        itemsList = "\n\n📦 *Articles :*\n"
                        for (const item of allItems) {
                            const productName = item.product?.name || item.name || item.productName || 'Article inconnu'
                            const quantity = item.quantity || 1
                            const itemPrice = item.price?.value || item.price || item.unitPrice || '0'
                            itemsList += `- ${quantity}x ${productName} (*${itemPrice} درهم*)\n`
                        }
                    }
                } catch (err) {
                    console.error("Erreur récupération items Jumia", err)
                }

                const message = `🛍️ *Nouvelle Commande Jumia !*\n\n` +
                                `📦 *Numéro :* \`${orderId}\`\n` +
                                `👤 *Client :* ${customerName}\n` +
                                `💰 *Total :* ${price} درهم\n` +
                                `📊 *Statut :* ${status}\n\n` +
                                `🕒 Date: ${new Date(order.createdAt || order.CreatedAt).toLocaleString('fr-FR')}` + itemsList

                const replyMarkup = {
                    inline_keyboard: [
                        [
                            { text: '🏷️ Imprimer étiquette', callback_data: `jumia_label:${orderId}` },
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

        // Déclencher discrètement la vérification des livraisons (sans attendre)
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || (req.headers.get('host') ? `https://${req.headers.get('host')}` : 'http://localhost:3000');
        const tokenQuery = process.env.CRON_SECRET ? `?token=${process.env.CRON_SECRET}` : '';
        fetch(`${baseUrl}/api/cron/jumia-delivered-alert${tokenQuery}`).catch(() => {});

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
