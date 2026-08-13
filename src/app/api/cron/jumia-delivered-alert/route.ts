import { NextResponse } from "next/server"
import { JumiaAPI } from "@/lib/jumia-api"
import { sendTelegramMessage } from "@/lib/telegram"
import { prisma } from "@/lib/prisma"

// Alerte commandes Jumia livrées
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

        // On vérifie les commandes créées au cours des 30 derniers jours pour être sûr de ne pas rater une livraison tardive
        const thirtyDaysAgo = new Date()
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
        const createdAfter = thirtyDaysAgo.toISOString().split('T')[0]
        
        const tomorrow = new Date()
        tomorrow.setDate(tomorrow.getDate() + 1)
        const createdBefore = tomorrow.toISOString().split('T')[0]

        // Récupérer les commandes (tous les statuts) et filtrer localement
        const response = await jumia.getOrders(100, undefined, undefined, createdAfter, createdBefore)
        const allOrders = response?.orders || response?.data?.orders || []
        
        const deliveredOrders = allOrders.filter((o: any) => {
            const status = (o.status || o.Statuses?.[0] || '').toLowerCase()
            return status === 'delivered'
        })

        if (deliveredOrders.length === 0) {
            return NextResponse.json({ success: true, message: 'Aucune commande livrée trouvée dans la période.' })
        }

        const notifiedOrders = []

        for (const order of deliveredOrders) {
            const orderId = order.OrderNumber || order.orderNumber || order.OrderId || order.orderId || order.number || 'Inconnu'
            
            // Vérifier si cette commande a déjà été notifiée comme livrée
            const existingLog = await prisma.jumiaActionLog.findFirst({
                where: {
                    orderId: orderId,
                    action: 'DELIVERED_NOTIFIED',
                    status: 'SUCCESS'
                }
            })

            if (!existingLog) {
                // Notifier
                const customerName = `${order.shippingAddress?.firstName || order.CustomerFirstName || ''} ${order.shippingAddress?.lastName || order.CustomerLastName || ''}`.trim() || "Client Jumia"
                const price = order.totalAmountLocal?.value || order.Price || order.GrandTotal || "0"
                
                const msg = `✅ <b>Commande Jumia Livrée !</b>\n\n📦 <b>Numéro :</b> <code>${orderId}</code>\n👤 <b>Client :</b> ${customerName}\n💰 <b>Total :</b> ${price} درهم\n\n🎉 Félicitations pour cette vente !`
                
                await sendTelegramMessage(msg)

                // Enregistrer dans les logs pour ne plus notifier
                await prisma.jumiaActionLog.create({
                    data: {
                        orderId: orderId,
                        action: 'DELIVERED_NOTIFIED',
                        status: 'SUCCESS'
                    }
                })

                notifiedOrders.push(orderId)
            }
        }

        return NextResponse.json({ 
            success: true, 
            message: `${notifiedOrders.length} nouvelles commandes livrées notifiées.`,
            notified: notifiedOrders
        })
    } catch (e: any) {
        console.error("Error in jumia-delivered-alert:", e)
        return NextResponse.json({ success: false, error: e.message, stack: e.stack }, { status: 500 })
    }
}
