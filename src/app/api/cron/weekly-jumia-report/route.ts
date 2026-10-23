import { NextResponse } from "next/server"
import { JumiaAPI } from "@/lib/jumia-api"
import { sendTelegramMessage } from "@/lib/telegram"
import { isAuthorizedCronRequest } from '@/lib/cron-auth'
import { summarizeJumiaOrders } from '@/lib/jumia-reporting'

// Rapport hebdomadaire Jumia — à appeler chaque lundi à 8h
export async function GET(req: Request) {
    try {
        if (!isAuthorizedCronRequest(req)) {
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

        const summary = summarizeJumiaOrders(orders)

        const statusEmojis: Record<string, string> = {
            PENDING: '⏳', READY_TO_SHIP: '📦', SHIPPED: '🚚',
            DELIVERED: '✅', CANCELED: '❌', RETURNED: '🔄'
        }

        const lines = Object.entries(summary.statusCounts)
            .map(([s, c]) => `${statusEmojis[s] || '📦'} ${s}: <b>${c}</b>`)
            .join('\n')

        const weekStr = `${lastMonday.toLocaleDateString('fr-FR')} → ${now.toLocaleDateString('fr-FR')}`
        const msg = `📊 <b>Rapport Hebdomadaire Jumia</b>\n📅 Semaine du ${weekStr}\n\n` +
            `📦 <b>Commandes valides :</b> ${summary.valid} / ${summary.total}\n` +
            `❌ <b>Annulées/retournées :</b> ${summary.excluded}\n` +
            `💰 <b>CA net :</b> <b>${summary.revenue.toFixed(2)} درهم</b>\n\n` +
            `<b>Répartition :</b>\n${lines}`

        await sendTelegramMessage(msg)

        return NextResponse.json({ success: true, total: summary.total, valid: summary.valid, excluded: summary.excluded, revenue: summary.revenue })
    } catch (e: any) {
        return NextResponse.json({ success: false, error: e.message }, { status: 500 })
    }
}
