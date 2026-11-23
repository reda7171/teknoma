import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { sendTelegramMessage } from '@/lib/telegram'
import { getSetting } from '@/lib/actions/site-settings'
import { isAuthorizedCronRequest } from '@/lib/cron-auth'
import { JumiaAPI } from '@/lib/jumia-api'
import { summarizeJumiaOrders, type JumiaReportOrder } from '@/lib/jumia-reporting'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
    try {
        if (!isAuthorizedCronRequest(req)) {
            return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
        }

        // 1. Vérifier si activé
        const shouldNotify = await getSetting('telegram_notify_daily_summary') !== 'false'
        if (!shouldNotify) {
            return NextResponse.json({ skipped: true, reason: 'Disabled in settings' })
        }

        // 2. Calculer les dates (Aujourd'hui)
        const now = new Date()
        const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate())
        const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59)

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

        // 3. Récupérer les commandes du jour
        const orders = await prisma.order.findMany({
            where: {
                createdAt: {
                    gte: startOfDay,
                    lte: endOfDay
                },
                status: {
                    not: 'CANCELLED'
                }
            },
            include: {
                items: true
            }
        })

        // 4. Calculer CA et Stats
        const totalRevenue = orders.reduce((sum, o) => sum + (o.total || 0), 0)

        // Calculer les frais de livraison depuis CityDelivery
        let totalDeliveryFees = 0
        for (const order of orders) {
            const cleanCity = (order.city || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim()
            let fee = cityPriceMap.get(cleanCity)
            if (fee === undefined) {
                for (const [key, price] of cityPriceMap) {
                    if (key.includes(cleanCity) || cleanCity.includes(key)) { fee = price; break }
                }
            }
            totalDeliveryFees += fee ?? 30
        }
        const caNet = totalRevenue - totalDeliveryFees

        // Trouver le livre le plus vendu
        const bookStats: Record<string, { title: string, qty: number }> = {}

        for (const order of orders) {
            for (const item of order.items) {
                if (item.bookId) {
                    // On récupère le titre si on l'a pas
                    if (!bookStats[item.bookId]) {
                        const book = await prisma.book.findUnique({ where: { id: item.bookId }, select: { title: true } })
                        bookStats[item.bookId] = { title: book?.title || 'Livre inconnu', qty: 0 }
                    }
                    bookStats[item.bookId].qty += item.quantity
                }
            }
        }

        const bestSeller = Object.values(bookStats).sort((a, b) => b.qty - a.qty)[0]

        let jumiaSection = '\n\n🟠 <b>Jumia</b>\n⚠️ Données indisponibles'
        let jumiaValidOrders = 0
        try {
            const jumia = await JumiaAPI.getInstance()
            if (jumia) {
                const allOrders: JumiaReportOrder[] = []
                let nextToken: string | undefined
                let pageCount = 0
                do {
                    const response = await jumia.getOrders(100, nextToken, undefined, undefined, undefined, 'createdAt', 'DESC')
                    const pageOrders = response?.orders || response?.data?.orders || []
                    allOrders.push(...pageOrders)
                    nextToken = response?.nextToken || response?.data?.nextToken || undefined
                    pageCount++
                    if (pageOrders.length === 0 || pageCount >= 20) nextToken = undefined
                } while (nextToken)

                const formatter = new Intl.DateTimeFormat('en-CA', {
                    timeZone: 'Africa/Casablanca', year: 'numeric', month: '2-digit', day: '2-digit'
                })
                const today = formatter.format(now)
                const todayOrders = allOrders.filter(order => {
                    const rawDate = order.createdAt || order.CreatedAt || order.created_at || order.orderDate || order.OrderDate
                    if (typeof rawDate !== 'string' && typeof rawDate !== 'number' && !(rawDate instanceof Date)) return false
                    const date = new Date(rawDate)
                    return !Number.isNaN(date.getTime()) && formatter.format(date) === today
                })
                const summary = summarizeJumiaOrders(todayOrders)
                jumiaValidOrders = summary.valid
                jumiaSection = `\n\n🟠 <b>Jumia</b>\n` +
                    `📦 Commandes valides : <b>${summary.valid}</b> / ${summary.total}\n` +
                    `⏳ En attente : <b>${summary.statusCounts.PENDING || 0}</b>\n` +
                    `🚚 En expédition : <b>${(summary.statusCounts.READY_TO_SHIP || 0) + (summary.statusCounts.SHIPPED || 0)}</b>\n` +
                    `✅ Livrées : <b>${summary.statusCounts.DELIVERED || 0}</b>\n` +
                    `❌ Annulées/retournées : <b>${summary.excluded}</b>\n` +
                    `💰 CA net : <b>${summary.revenue.toFixed(2)} درهم</b>`
            }
        } catch (error) {
            console.error('Erreur résumé Jumia:', error)
        }

        // 5. Envoyer le message
        const text = `📊 <b>Résumé Journalier - Tekno Store</b>\n\n` +
            `📅 <b>Date:</b> ${startOfDay.toLocaleDateString('fr-FR')}\n` +
            `📦 <b>Commandes:</b> ${orders.length}\n` +
            `💰 <b>CA Brut:</b> ${totalRevenue.toFixed(2)} درهم\n` +
            `🚚 <b>Frais Livraison:</b> -${totalDeliveryFees.toFixed(2)} درهم\n` +
            `💵 <b>CA Net:</b> ${caNet.toFixed(2)} درهم\n\n` +
            (bestSeller ? `🔥 <b>Top Vente:</b> ${bestSeller.title} (${bestSeller.qty} expl.)\n` : '') +
            jumiaSection + `\n\n🚀 <i>Continuez comme ça !</i>`

        await sendTelegramMessage(text)

        return NextResponse.json({ success: true, orders: orders.length, revenue: totalRevenue, jumiaOrders: jumiaValidOrders })

    } catch (error) {
        console.error('Erreur Résumé Journalier:', error)
        return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 })
    }
}
