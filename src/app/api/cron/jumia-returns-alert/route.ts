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

        return NextResponse.json({ success: true, returned: returnedOrders.length, canceled: canceledOrders.length })
    } catch (e: any) {
        return NextResponse.json({ success: false, error: e.message }, { status: 500 })
    }
}
