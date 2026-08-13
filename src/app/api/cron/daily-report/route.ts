import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { sendTelegramMessage } from "@/lib/telegram"
import { JumiaAPI } from "@/lib/jumia-api"

// Rapport quotidien — à appeler via cron chaque matin à 8h
export async function GET(req: Request) {
    try {
        const url = new URL(req.url)
        const token = url.searchParams.get("token")
        
        if (process.env.CRON_SECRET && token !== process.env.CRON_SECRET) {
            return new NextResponse("Unauthorized", { status: 401 })
        }

        const now = new Date()
        const yesterday = new Date(now)
        yesterday.setDate(yesterday.getDate() - 1)
        yesterday.setHours(0, 0, 0, 0)
        const yesterdayEnd = new Date(yesterday)
        yesterdayEnd.setHours(23, 59, 59, 999)

        // Stats web (commandes site)
        const [totalYesterday, revenueYesterday, byStatus] = await Promise.all([
            prisma.order.count({ where: { createdAt: { gte: yesterday, lte: yesterdayEnd } } }),
            prisma.order.aggregate({
                where: { createdAt: { gte: yesterday, lte: yesterdayEnd }, status: { not: 'CANCELLED' } },
                _sum: { total: true }
            }),
            prisma.order.groupBy({
                by: ['status'],
                where: { createdAt: { gte: yesterday, lte: yesterdayEnd } },
                _count: { status: true }
            })
        ])

        const statusEmojis: Record<string, string> = {
            PENDING: '⏳', CONFIRMED: '✅', SHIPPED: '🚚',
            DELIVERED: '📬', CANCELLED: '❌', RETURNED: '🔄'
        }

        const statusLines = byStatus
            .map(s => `${statusEmojis[s.status] || '📦'} ${s.status}: <b>${s._count.status}</b>`)
            .join('\n')

        // Stats Jumia hier
        let jumiaSection = ''
        try {
            const jumia = await JumiaAPI.getInstance()
            if (jumia) {
                const yesterdayStr = yesterday.toISOString().split('T')[0]
                const todayStr = now.toISOString().split('T')[0]
                const jResponse = await jumia.getOrders(100, undefined, undefined, yesterdayStr, todayStr)
                const jOrders = jResponse?.orders || jResponse?.data?.orders || []
                const jRevenue = jOrders.reduce((sum: number, o: any) => {
                    return sum + parseFloat(o.totalAmountLocal?.value || o.Price || '0')
                }, 0)
                const jPending = jOrders.filter((o: any) => (o.status || '').toUpperCase() === 'PENDING').length
                jumiaSection = `\n\n🟠 <b>Jumia Hier</b>\n📦 Commandes: <b>${jOrders.length}</b>\n⏳ En attente: <b>${jPending}</b>\n💰 CA: <b>${jRevenue.toFixed(2)} درهم</b>`
            }
        } catch {}

        const dateStr = yesterday.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })
        const msg = `☀️ <b>Rapport Quotidien Riwaya</b>\n📅 ${dateStr}\n\n` +
            `🌐 <b>Site Web</b>\n📦 Commandes: <b>${totalYesterday}</b>\n💰 CA: <b>${(revenueYesterday._sum.total || 0).toFixed(2)} درهم</b>` +
            (statusLines ? `\n\n📊 <b>Détail :</b>\n${statusLines}` : '') +
            jumiaSection

        await sendTelegramMessage(msg)

        return NextResponse.json({ success: true })
    } catch (e: any) {
        return NextResponse.json({ success: false, error: e.message }, { status: 500 })
    }
}
