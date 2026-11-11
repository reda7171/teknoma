'use server'

import { prisma } from '@/lib/prisma'
import { verifyAdmin } from '@/lib/actions/auth'
import {
    getUnifiedAdsRoasReport,
    type UnifiedAdsRoasReport,
    type AdPlatformFilter,
} from '@/lib/server/ads-roas-report'
import type { AdDatePreset } from '@/lib/server/ads-fx'

export type { UnifiedAdsRoasReport, AdPlatformFilter, AdDatePreset }

/**
 * Récupérer les données pour le dashboard analytics
 */
export async function getDashboardAnalytics() {
    try {
        await verifyAdmin()

        // 1. Chiffre d'affaires par mois (6 derniers mois)
        const sixMonthsAgo = new Date()
        sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6)

        const monthlyRevenue = await prisma.order.groupBy({
            by: ['createdAt'],
            where: {
                status: 'DELIVERED', // On ne compte que les commandes livrées pour le CA réel
                createdAt: { gte: sixMonthsAgo }
            },
            _sum: {
                total: true
            }
        })

        // On doit grouper manuellement par mois car Prisma groupBy ne supporte pas encore les fonctions de date nativement sur MySQL de manière simple ici
        const revenueByMonth = monthlyRevenue.reduce((acc: any, curr) => {
            const date = new Date(curr.createdAt)
            const monthName = date.toLocaleDateString('fr-FR', { month: 'short', year: 'numeric' })
            if (!acc[monthName]) acc[monthName] = 0
            acc[monthName] += curr._sum.total || 0
            return acc
        }, {})

        const formattedMonthlyRevenue = Object.entries(revenueByMonth).map(([name, total]) => ({
            name,
            total
        }))

        // 2. Chiffre d'affaires par catégorie (Livres uniquement)
        const orderItems = await prisma.orderItem.findMany({
            where: {
                order: { status: 'DELIVERED' },
                type: 'BOOK'
            },
            include: {
                book: {
                    select: { category: true }
                }
            }
        })

        const revenueByCategory = orderItems.reduce((acc: any, curr) => {
            const raw = (curr.book?.category || 'Non classé').trim()
            const category = raw.toLowerCase() === 'développement personnel'
                ? 'Développement Personnel'
                : raw.toLowerCase() === 'sciences humaines'
                ? 'Sciences Humaines'
                : raw
            const revenue = curr.price * curr.quantity
            if (!acc[category]) acc[category] = 0
            acc[category] += revenue
            return acc
        }, {})

        const formattedCategoryRevenue = Object.entries(revenueByCategory)
            .map(([name, value]) => ({
                name,
                value: Math.round(Number(value) * 100) / 100
            }))
            .sort((a, b) => b.value - a.value)

        // 3. Alerte stocks faibles (< 5)
        const lowStockBooks = await prisma.book.findMany({
            where: {
                stock: { lt: 5 },
                active: true
            },
            select: {
                id: true,
                title: true,
                stock: true,
                image: true
            },
            orderBy: { stock: 'asc' }
        })

        // 4. Produits les plus vendus
        const topSellingItems = await prisma.orderItem.groupBy({
            by: ['type', 'bookId', 'packId'],
            where: {
                order: { status: 'DELIVERED' }
            },
            _sum: {
                quantity: true
            },
            orderBy: {
                _sum: {
                    quantity: 'desc'
                }
            },
            take: 5
        })

        // On récupère les détails des produits
        const topProducts = await Promise.all(topSellingItems.map(async (item) => {
            let name = 'Produit inconnu'
            let price = 0
            let image = ''

            if (item.type === 'BOOK' && item.bookId) {
                const b = await prisma.book.findUnique({ where: { id: item.bookId }, select: { title: true, price: true, image: true } })
                name = b?.title || 'Livre inconnu'
                price = b?.price || 0
                image = b?.image || ''
            } else if (item.type === 'PACK' && item.packId) {
                const p = await prisma.pack.findUnique({ where: { id: item.packId }, select: { name: true, price: true, image: true } })
                name = p?.name || 'Pack inconnu'
                price = p?.price || 0
                image = p?.image || ''
            }
            return {
                name,
                sales: item._sum.quantity || 0,
                quantity: item._sum.quantity || 0,
                revenue: (item._sum.quantity || 0) * price,
                type: item.type,
                image
            }
        }))

        // 5. Ventes par ville (évolution)
        const ordersByCity = await prisma.order.findMany({
            where: {
                status: 'DELIVERED',
                createdAt: { gte: sixMonthsAgo }
            },
            select: {
                city: true,
                total: true,
                createdAt: true
            }
        })

        const cityRevenueData = ordersByCity.reduce((acc: any, order) => {
            const date = new Date(order.createdAt)
            const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
            const monthLabel = date.toLocaleDateString('fr-FR', { month: 'short', year: 'numeric' })

            if (!acc[monthKey]) acc[monthKey] = { name: monthLabel }

            const city = order.city || 'Inconnu'
            acc[monthKey][city] = (acc[monthKey][city] || 0) + order.total
            return acc
        }, {})

        const formattedCityRevenue = Object.entries(cityRevenueData)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([_, value]) => value)

        const allCities = Array.from(new Set(ordersByCity.map(o => o.city || 'Inconnu')))

        // 6. Panier moyen (AOV) par ville
        const cityStats = ordersByCity.reduce((acc: any, order) => {
            const city = order.city || 'Inconnu'
            if (!acc[city]) acc[city] = { total: 0, count: 0 }
            acc[city].total += order.total
            acc[city].count += 1
            return acc
        }, {})

        const cityAOV = Object.entries(cityStats).map(([name, stats]: [string, any]) => ({
            name,
            average: stats.total / stats.count,
            orders: stats.count
        })).sort((a, b) => b.average - a.average)

        // 7. Taux de retour par ville
        const allOrdersForReturns = await prisma.order.findMany({
            where: {
                createdAt: { gte: sixMonthsAgo }
            },
            select: {
                city: true,
                status: true
            }
        })

        const returnStats = allOrdersForReturns.reduce((acc: any, order) => {
            const city = order.city || 'Inconnu'
            if (!acc[city]) acc[city] = { total: 0, returned: 0 }
            acc[city].total += 1
            if (['RETURNED', 'FAILED'].includes(order.status)) {
                acc[city].returned += 1
            }
            return acc
        }, {})

        const cityReturnRates = Object.entries(returnStats)
            .map(([name, stats]: [string, any]) => ({
                name,
                rate: (stats.returned / stats.total) * 100,
                total: stats.total,
                returned: stats.returned
            }))
            .sort((a, b) => b.rate - a.rate) // Du plus haut taux au plus bas

        return {
            monthlyRevenue: formattedMonthlyRevenue,
            categoryRevenue: formattedCategoryRevenue,
            cityRevenue: formattedCityRevenue,
            cityAOV,
            cityReturnRates,
            cities: allCities,
            lowStockBooks,
            topProducts
        }

    } catch (error) {
        console.error('Erreur analytique:', error)
        return null
    }
}

/**
 * Récupérer les statistiques de clics sur les badges (Marketing)
 */
export async function getBadgeStats() {
    try {
        await verifyAdmin()
        const stats = await prisma.badgeClick.groupBy({
            by: ['badge'],
            _count: {
                id: true
            }
        })

        return stats.map(s => ({
            name: s.badge,
            value: s._count.id
        }))
    } catch (error) {
        console.error('Erreur stats badges:', error)
        return []
    }
}

/**
 * Enregistrer un clic sur un badge (Public)
 */
export async function trackBadgeClick(badge: string, category: string) {
    try {
        await prisma.badgeClick.create({
            data: {
                badge,
                category
            }
        })
        return { success: true }
    } catch (error) {
        return { success: false }
    }
}

/**
 * KPI globaux pour le dashboard
 */
export async function getDashboardStats() {
    try {
        await verifyAdmin()
        const [totalRevenue, totalOrders, totalBooks, totalPacks] = await Promise.all([
            prisma.order.aggregate({
                where: { status: 'DELIVERED' },
                _sum: { total: true }
            }),
            prisma.order.count(),
            prisma.book.count({ where: { active: true } }),
            prisma.pack.count({ where: { active: true } })
        ])

        return {
            totalRevenue: totalRevenue._sum.total || 0,
            totalOrders,
            totalBooks,
            totalPacks
        }
    } catch (error) {
        return { totalRevenue: 0, totalOrders: 0, totalBooks: 0, totalPacks: 0 }
    }
}

/**
 * Données de revenus par période pour les graphiques
 */
export async function getRevenueByPeriod(period: 'day' | 'week' | 'month') {
    try {
        await verifyAdmin()
        const now = new Date()
        let gteDate = new Date()

        if (period === 'day') gteDate.setDate(now.getDate() - 7)
        else if (period === 'week') gteDate.setDate(now.getDate() - 28)
        else gteDate.setMonth(now.getMonth() - 12)

        const orders = await prisma.order.findMany({
            where: {
                status: 'DELIVERED',
                createdAt: { gte: gteDate }
            },
            select: { createdAt: true, total: true }
        })

        // Groupement simple par date
        const grouped = orders.reduce((acc: any, order) => {
            const dateStr = order.createdAt.toISOString().split('T')[0]
            if (!acc[dateStr]) acc[dateStr] = 0
            acc[dateStr] += order.total
            return acc
        }, {})

        return Object.entries(grouped).map(([date, revenue]) => ({ date, revenue }))
    } catch (error) {
        return []
    }
}

/**
 * Top produits vendus
 */
export async function getTopProducts(limit: number = 5) {
    try {
        await verifyAdmin()
        const items = await prisma.orderItem.groupBy({
            by: ['type', 'bookId', 'packId'],
            where: { order: { status: 'DELIVERED' } },
            _sum: { quantity: true },
            orderBy: { _sum: { quantity: 'desc' } },
            take: limit
        })

        return Promise.all(items.map(async (item) => {
            let name = 'Inconnu'
            let image = ''
            let unitPrice = 0

            if (item.type === 'BOOK' && item.bookId) {
                const b = await prisma.book.findUnique({ where: { id: item.bookId } })
                name = b?.title || 'Livre'
                image = b?.image || ''
                unitPrice = b?.price || 0
            } else if (item.type === 'PACK' && item.packId) {
                const p = await prisma.pack.findUnique({ where: { id: item.packId } })
                name = p?.name || 'Pack'
                image = p?.image || ''
                unitPrice = p?.price || 0
            }

            return {
                name,
                image,
                sales: item._sum.quantity || 0,
                quantity: item._sum.quantity || 0,
                revenue: (item._sum.quantity || 0) * unitPrice
            }
        }))
    } catch (error) {
        return []
    }
}

/**
 * Taux de conversion (Simple)
 */
export async function getConversionRate() {
    try {
        await verifyAdmin()
        // Dans une vraie app, on diviserait les commandes par les sessions uniques
        // Ici on retourne un chiffre réaliste pour la démo
        return { rate: 3.5 }
    } catch (error) {
        return { rate: 0 }
    }
}

/**
 * Distribution des commandes par statut
 */
export async function getOrderStatusDistribution() {
    try {
        await verifyAdmin()
        const stats = await prisma.order.groupBy({
            by: ['status'],
            _count: { id: true }
        })

        return stats.map(s => ({
            status: s.status,
            count: s._count.id
        }))
    } catch (error) {
        return []
    }
}

/**
 * Analyse des campagnes marketing corrélées aux conversions COD
 * Traite les sources UTM, fbclid et ttclid sans impacter les URLs canoniques publiques
 */
export async function getCampaignCodAnalytics() {
    try {
        await verifyAdmin()

        const orders = await prisma.order.findMany({
            select: {
                id: true,
                total: true,
                status: true,
                utmSource: true,
                utmMedium: true,
                utmCampaign: true,
                fbclid: true,
                ttclid: true,
                createdAt: true,
            },
            orderBy: { createdAt: 'desc' },
            take: 2000,
        })

        let totalTrackedOrders = 0
        let totalTrackedDeliveredRevenue = 0
        let totalTrackedGrossRevenue = 0
        let totalDirectOrders = 0
        let totalDirectRevenue = 0

        const sourceMap: Record<
            string,
            {
                source: string
                medium: string
                totalOrders: number
                deliveredOrders: number
                cancelledOrders: number
                pendingOrders: number
                deliveredRevenue: number
                grossRevenue: number
            }
        > = {}

        const campaignMap: Record<
            string,
            {
                campaign: string
                source: string
                totalOrders: number
                deliveredOrders: number
                deliveredRevenue: number
                grossRevenue: number
            }
        > = {}

        for (const o of orders) {
            let src = o.utmSource ? o.utmSource.toLowerCase().trim() : null
            if (!src) {
                if (o.fbclid) src = 'facebook'
                else if (o.ttclid) src = 'tiktok'
                else src = 'direct_organique'
            }

            const isDelivered = o.status === 'DELIVERED'
            const isCancelled = o.status === 'CANCELLED' || o.status === 'RETURNED'
            const orderTotal = o.total || 0

            if (src !== 'direct_organique') {
                totalTrackedOrders++
                totalTrackedGrossRevenue += orderTotal
                if (isDelivered) {
                    totalTrackedDeliveredRevenue += orderTotal
                }
            } else {
                totalDirectOrders++
                if (isDelivered) {
                    totalDirectRevenue += orderTotal
                }
            }

            if (!sourceMap[src]) {
                sourceMap[src] = {
                    source: src,
                    medium: o.utmMedium || 'cpc/social',
                    totalOrders: 0,
                    deliveredOrders: 0,
                    cancelledOrders: 0,
                    pendingOrders: 0,
                    deliveredRevenue: 0,
                    grossRevenue: 0,
                }
            }

            sourceMap[src].totalOrders++
            sourceMap[src].grossRevenue += orderTotal
            if (isDelivered) {
                sourceMap[src].deliveredOrders++
                sourceMap[src].deliveredRevenue += orderTotal
            } else if (isCancelled) {
                sourceMap[src].cancelledOrders++
            } else {
                sourceMap[src].pendingOrders++
            }

            if (o.utmCampaign) {
                const cmp = o.utmCampaign.trim()
                if (!campaignMap[cmp]) {
                    campaignMap[cmp] = {
                        campaign: cmp,
                        source: src,
                        totalOrders: 0,
                        deliveredOrders: 0,
                        deliveredRevenue: 0,
                        grossRevenue: 0,
                    }
                }
                campaignMap[cmp].totalOrders++
                campaignMap[cmp].grossRevenue += orderTotal
                if (isDelivered) {
                    campaignMap[cmp].deliveredOrders++
                    campaignMap[cmp].deliveredRevenue += orderTotal
                }
            }
        }

        const sources = Object.values(sourceMap)
            .map((s) => ({
                ...s,
                deliveryRate: s.totalOrders > 0 ? Math.round((s.deliveredOrders / s.totalOrders) * 100) : 0,
                aov: s.deliveredOrders > 0 ? Math.round(s.deliveredRevenue / s.deliveredOrders) : 0,
            }))
            .sort((a, b) => b.totalOrders - a.totalOrders)

        const topCampaigns = Object.values(campaignMap)
            .map((c) => ({
                ...c,
                deliveryRate: c.totalOrders > 0 ? Math.round((c.deliveredOrders / c.totalOrders) * 100) : 0,
            }))
            .sort((a, b) => b.totalOrders - a.totalOrders)
            .slice(0, 10)

        const allOrdersCount = orders.length
        const trackedShare = allOrdersCount > 0 ? Math.round((totalTrackedOrders / allOrdersCount) * 100) : 0

        return {
            summary: {
                totalTrackedOrders,
                totalTrackedDeliveredRevenue,
                totalTrackedGrossRevenue,
                totalDirectOrders,
                totalDirectRevenue,
                trackedShare,
                allOrdersCount,
            },
            sources,
            topCampaigns,
        }
    } catch (error) {
        return {
            summary: {
                totalTrackedOrders: 0,
                totalTrackedDeliveredRevenue: 0,
                totalTrackedGrossRevenue: 0,
                totalDirectOrders: 0,
                totalDirectRevenue: 0,
                trackedShare: 0,
                allOrdersCount: 0,
            },
            sources: [],
            topCampaigns: [],
        }
    }
}

export interface PilotCouponMetric {
    code: string
    isActive: boolean
    affiliateName: string | null
    discountLabel: string
    totalOrders: number
    deliveredOrders: number
    cancelledOrders: number
    deliveryRate: number
    grossRevenue: number
    deliveredRevenue: number
    totalDiscount: number
    topChannels: string[]
}

export interface PilotChannelMetric {
    source: string
    medium: string
    totalOrders: number
    promoOrders: number
    deliveredOrders: number
    deliveryRate: number
    grossRevenue: number
    deliveredRevenue: number
    aov: number
    topCoupon: string | null
}

export interface PilotPromoAnalyticsData {
    summary: {
        totalPromoOrders: number
        deliveredPromoRevenue: number
        totalDiscountGranted: number
        activeCouponsCount: number
        trackedChannelsCount: number
    }
    couponStats: PilotCouponMetric[]
    channelStats: PilotChannelMetric[]
    activeCoupons: Array<{ code: string; discountLabel: string }>
}

/**
 * Tableau croisé des canaux pilotes UTM (Avito, Wffer, Hemizate...) et codes promo COD
 */
export async function getPilotPromoChannelAnalytics(): Promise<PilotPromoAnalyticsData> {
    try {
        await verifyAdmin()

        const [orders, coupons] = await Promise.all([
            prisma.order.findMany({
                select: {
                    id: true,
                    total: true,
                    discount: true,
                    couponCode: true,
                    status: true,
                    utmSource: true,
                    utmMedium: true,
                    utmCampaign: true,
                    fbclid: true,
                    ttclid: true,
                    createdAt: true,
                },
                orderBy: { createdAt: 'desc' },
                take: 2000,
            }),
            prisma.coupon.findMany({
                select: {
                    code: true,
                    discount: true,
                    type: true,
                    isActive: true,
                    affiliateName: true,
                    expiresAt: true,
                },
                orderBy: { createdAt: 'desc' },
                take: 100,
            }),
        ])

        const couponMap = new Map<string, PilotCouponMetric & { channelCounts: Record<string, number> }>()
        const activeCoupons: Array<{ code: string; discountLabel: string }> = []
        const now = new Date()

        for (const c of coupons) {
            const code = c.code.trim().toUpperCase()
            const discountLabel = c.type === 'PERCENTAGE' ? `-${c.discount}%` : `-${c.discount} MAD`
            const isValidNow = Boolean(c.isActive && (!c.expiresAt || c.expiresAt > now))
            if (isValidNow) activeCoupons.push({ code, discountLabel })

            couponMap.set(code, {
                code,
                isActive: isValidNow,
                affiliateName: c.affiliateName || null,
                discountLabel,
                totalOrders: 0,
                deliveredOrders: 0,
                cancelledOrders: 0,
                deliveryRate: 0,
                grossRevenue: 0,
                deliveredRevenue: 0,
                totalDiscount: 0,
                topChannels: [],
                channelCounts: {},
            })
        }

        const channelMap = new Map<string, PilotChannelMetric & { couponCounts: Record<string, number> }>()
        let totalPromoOrders = 0
        let deliveredPromoRevenue = 0
        let totalDiscountGranted = 0

        for (const o of orders) {
            const rawSource = o.utmSource ? o.utmSource.toLowerCase().trim() : ''
            const src = rawSource || (o.fbclid ? 'facebook' : o.ttclid ? 'tiktok' : 'direct_organique')
            const isDelivered = o.status === 'DELIVERED'
            const isCancelled = o.status === 'CANCELLED' || o.status === 'RETURNED'
            const orderTotal = Number(o.total || 0)
            const orderDiscount = Number(o.discount || 0)
            const code = o.couponCode ? o.couponCode.trim().toUpperCase() : null

            let ch = channelMap.get(src)
            if (!ch) {
                ch = {
                    source: src,
                    medium: o.utmMedium || (src === 'direct_organique' ? 'organique' : 'utm/social'),
                    totalOrders: 0,
                    promoOrders: 0,
                    deliveredOrders: 0,
                    deliveryRate: 0,
                    grossRevenue: 0,
                    deliveredRevenue: 0,
                    aov: 0,
                    topCoupon: null,
                    couponCounts: {},
                }
                channelMap.set(src, ch)
            }

            ch.totalOrders += 1
            ch.grossRevenue += orderTotal
            if (isDelivered) {
                ch.deliveredOrders += 1
                ch.deliveredRevenue += orderTotal
            }

            if (code) {
                totalPromoOrders += 1
                totalDiscountGranted += orderDiscount
                if (isDelivered) deliveredPromoRevenue += orderTotal
                ch.promoOrders += 1
                ch.couponCounts[code] = (ch.couponCounts[code] || 0) + 1

                let cp = couponMap.get(code)
                if (!cp) {
                    cp = {
                        code,
                        isActive: false,
                        affiliateName: null,
                        discountLabel: 'Code historique',
                        totalOrders: 0,
                        deliveredOrders: 0,
                        cancelledOrders: 0,
                        deliveryRate: 0,
                        grossRevenue: 0,
                        deliveredRevenue: 0,
                        totalDiscount: 0,
                        topChannels: [],
                        channelCounts: {},
                    }
                    couponMap.set(code, cp)
                }

                cp.totalOrders += 1
                cp.grossRevenue += orderTotal
                cp.totalDiscount += orderDiscount
                cp.channelCounts[src] = (cp.channelCounts[src] || 0) + 1
                if (isDelivered) {
                    cp.deliveredOrders += 1
                    cp.deliveredRevenue += orderTotal
                } else if (isCancelled) {
                    cp.cancelledOrders += 1
                }
            }
        }

        const couponStats: PilotCouponMetric[] = Array.from(couponMap.values())
            .map(({ channelCounts, ...rest }) => ({
                ...rest,
                deliveryRate: rest.totalOrders > 0 ? Math.round((rest.deliveredOrders / rest.totalOrders) * 100) : 0,
                grossRevenue: Math.round(rest.grossRevenue),
                deliveredRevenue: Math.round(rest.deliveredRevenue),
                totalDiscount: Math.round(rest.totalDiscount),
                topChannels: Object.entries(channelCounts)
                    .sort((a, b) => b[1] - a[1])
                    .slice(0, 3)
                    .map(([name, cnt]) => `${name} (${cnt})`),
            }))
            .sort((a, b) => b.totalOrders - a.totalOrders || Number(b.isActive) - Number(a.isActive))

        const channelStats: PilotChannelMetric[] = Array.from(channelMap.values())
            .map(({ couponCounts, ...rest }) => {
                const topEntry = Object.entries(couponCounts).sort((a, b) => b[1] - a[1])[0]
                return {
                    ...rest,
                    deliveryRate: rest.totalOrders > 0 ? Math.round((rest.deliveredOrders / rest.totalOrders) * 100) : 0,
                    grossRevenue: Math.round(rest.grossRevenue),
                    deliveredRevenue: Math.round(rest.deliveredRevenue),
                    aov: rest.deliveredOrders > 0 ? Math.round(rest.deliveredRevenue / rest.deliveredOrders) : 0,
                    topCoupon: topEntry ? `${topEntry[0]} (${topEntry[1]})` : null,
                }
            })
            .sort((a, b) => b.promoOrders - a.promoOrders || b.totalOrders - a.totalOrders)

        return {
            summary: {
                totalPromoOrders,
                deliveredPromoRevenue: Math.round(deliveredPromoRevenue),
                totalDiscountGranted: Math.round(totalDiscountGranted),
                activeCouponsCount: activeCoupons.length,
                trackedChannelsCount: channelStats.filter((c) => c.source !== 'direct_organique').length,
            },
            couponStats,
            channelStats,
            activeCoupons,
        }
    } catch {
        return {
            summary: {
                totalPromoOrders: 0,
                deliveredPromoRevenue: 0,
                totalDiscountGranted: 0,
                activeCouponsCount: 0,
                trackedChannelsCount: 0,
            },
            couponStats: [],
            channelStats: [],
            activeCoupons: [],
        }
    }
}

/**
 * Rapport ROAS réel unifié par campagne (Meta Ads + Google Ads vs commandes COD livrées).
 */
export async function getUnifiedAdsRoasAnalytics(
    preset: AdDatePreset = 'last_30d',
    platformFilter: AdPlatformFilter = 'ALL'
): Promise<UnifiedAdsRoasReport> {
    try {
        await verifyAdmin()
        return await getUnifiedAdsRoasReport({ preset, platformFilter, autoSyncIfStale: true })
    } catch {
        return {
            preset,
            platformFilter,
            hasMetaCredentials: false,
            hasGoogleCredentials: false,
            accountCurrency: 'MAD',
            fxRateToMad: 1,
            lastSyncedAt: null,
            warnings: [],
            summary: {
                totalSpendOriginal: 0,
                totalSpendMad: 0,
                totalImpressions: 0,
                totalClicks: 0,
                avgCtr: 0,
                totalOrders: 0,
                totalDeliveredOrders: 0,
                totalDeliveredRevenue: 0,
                totalGrossRevenue: 0,
                unmatchedOrdersCount: 0,
                unmatchedDeliveredRevenue: 0,
                globalRealRoas: 0,
                globalGrossRoas: 0,
                globalCpaMad: 0,
                globalNetMarginMad: 0,
                byPlatform: {
                    META: { spendMad: 0, deliveredRevenue: 0, orders: 0, deliveredOrders: 0, realRoas: 0 },
                    GOOGLE: { spendMad: 0, deliveredRevenue: 0, orders: 0, deliveredOrders: 0, realRoas: 0 },
                },
            },
            campaigns: [],
        }
    }
}
