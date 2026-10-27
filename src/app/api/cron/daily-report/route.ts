import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { sendTelegramMessage } from "@/lib/telegram"
import { JumiaAPI } from "@/lib/jumia-api"
import { isAuthorizedCronRequest } from '@/lib/cron-auth'
import { summarizeJumiaOrders } from '@/lib/jumia-reporting'

// Rapport quotidien — à appeler via cron chaque matin à 8h
export async function GET(req: Request) {
    try {
        if (!isAuthorizedCronRequest(req)) {
            return new NextResponse("Unauthorized", { status: 401 })
        }

        const now = new Date()
        const yesterday = new Date(now)
        yesterday.setDate(yesterday.getDate() - 1)
        yesterday.setHours(0, 0, 0, 0)
        const yesterdayEnd = new Date(yesterday)
        yesterdayEnd.setHours(23, 59, 59, 999)

        // Charger les tarifs de livraison depuis CityDelivery
        const cityDeliveryPrices = await (prisma as any).cityDelivery.findMany({
            where: { active: true },
            select: { city: true, price: true }
        })
        const cityPriceMap = new Map<string, number>()
        for (const cd of cityDeliveryPrices) {
            const key = cd.city.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim()
            cityPriceMap.set(key, cd.price)
        }

        // Stats web (commandes site)
        const [totalYesterday, revenueYesterday, byStatus, ordersForFees] = await Promise.all([
            prisma.order.count({ where: { createdAt: { gte: yesterday, lte: yesterdayEnd } } }),
            prisma.order.aggregate({
                where: { createdAt: { gte: yesterday, lte: yesterdayEnd }, status: { not: 'CANCELLED' } },
                _sum: { total: true }
            }),
            prisma.order.groupBy({
                by: ['status'],
                where: { createdAt: { gte: yesterday, lte: yesterdayEnd } },
                _count: { status: true }
            }),
            prisma.order.findMany({
                where: { createdAt: { gte: yesterday, lte: yesterdayEnd }, status: { not: 'CANCELLED' } },
                select: { city: true }
            })
        ])

        // Calculer les frais de livraison depuis CityDelivery
        let totalDeliveryFees = 0
        for (const order of ordersForFees) {
            const cleanCity = (order.city || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim()
            let fee = cityPriceMap.get(cleanCity)
            if (fee === undefined) {
                for (const [key, price] of cityPriceMap) {
                    if (key.includes(cleanCity) || cleanCity.includes(key)) { fee = price; break }
                }
            }
            totalDeliveryFees += fee ?? 30
        }
        const caBrut = revenueYesterday._sum.total || 0
        const caNet = caBrut - totalDeliveryFees

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
                const summary = summarizeJumiaOrders(jOrders)
                const jPending = summary.statusCounts.PENDING || 0
                jumiaSection = `\n\n🟠 <b>Jumia Hier</b>\n📦 Commandes valides: <b>${summary.valid}</b> / ${summary.total}\n❌ Annulées/retournées: <b>${summary.excluded}</b>\n⏳ En attente: <b>${jPending}</b>\n💰 CA net: <b>${summary.revenue.toFixed(2)} درهم</b>`
            }
        } catch {}

        const dateStr = yesterday.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })
        const msg = `☀️ <b>Rapport Quotidien Riwaya</b>\n📅 ${dateStr}\n\n` +
            `🌐 <b>Site Web</b>\n📦 Commandes: <b>${totalYesterday}</b>\n💰 CA Brut: <b>${caBrut.toFixed(2)} درهم</b>\n🚚 Frais Livraison: <b>-${totalDeliveryFees.toFixed(2)} درهم</b>\n💵 CA Net: <b>${caNet.toFixed(2)} درهم</b>` +
            (statusLines ? `\n\n📊 <b>Détail :</b>\n${statusLines}` : '') +
            jumiaSection

        await sendTelegramMessage(msg)

        return NextResponse.json({ success: true })
    } catch (e: any) {
        return NextResponse.json({ success: false, error: e.message }, { status: 500 })
    }
}
