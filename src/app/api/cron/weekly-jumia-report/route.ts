import { NextResponse } from "next/server"
import { JumiaAPI } from "@/lib/jumia-api"
import { sendTelegramMessage } from "@/lib/telegram"

// Rapport hebdomadaire Jumia — à appeler chaque lundi à 8h
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

        const now = new Date()
        const lastMonday = new Date(now)
        lastMonday.setDate(now.getDate() - 7)
        lastMonday.setHours(0, 0, 0, 0)

        const weekStart = lastMonday.toISOString().split('T')[0]
        const weekEnd = now.toISOString().split('T')[0]

        const response = await jumia.getOrders(100, undefined, undefined, weekStart, weekEnd)
        const orders = response?.orders || response?.data?.orders || []

        const statusCounts: Record<string, number> = {}
        let revenue = 0

        orders.forEach((o: any) => {
            const status = (o.status || 'UNKNOWN').toUpperCase()
            statusCounts[status] = (statusCounts[status] || 0) + 1
            revenue += parseFloat(o.totalAmountLocal?.value || '0')
        })

        const statusEmojis: Record<string, string> = {
            PENDING: '⏳', READY_TO_SHIP: '📦', SHIPPED: '🚚',
            DELIVERED: '✅', CANCELED: '❌', RETURNED: '🔄'
        }

        const lines = Object.entries(statusCounts)
            .map(([s, c]) => `${statusEmojis[s] || '📦'} ${s}: <b>${c}</b>`)
            .join('\n')

        const weekStr = `${lastMonday.toLocaleDateString('fr-FR')} → ${now.toLocaleDateString('fr-FR')}`
        const msg = `📊 <b>Rapport Hebdomadaire Jumia</b>\n📅 Semaine du ${weekStr}\n\n` +
            `📦 <b>Total commandes :</b> ${orders.length}\n` +
            `💰 <b>CA estimé :</b> <b>${revenue.toFixed(2)} MAD</b>\n\n` +
            `<b>Répartition :</b>\n${lines}`

        await sendTelegramMessage(msg)

        return NextResponse.json({ success: true, total: orders.length, revenue })
    } catch (e: any) {
        return NextResponse.json({ success: false, error: e.message }, { status: 500 })
    }
}
