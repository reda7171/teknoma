import { prisma } from '@/lib/prisma'
import { BookOpen, Package, ShoppingCart, TrendingUp, BarChart2, ShoppingBag, Cpu, CheckCircle, Users, Clock, AlertTriangle, XOctagon, ExternalLink, ShoppingBag as JumiaIcon, Zap, Link2, DollarSign, Sparkles, Coins } from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'
import { getBadgeStats } from '@/lib/actions/analytics'
import DashboardAnalytics from '@/components/admin/DashboardAnalytics'
import { isAuthenticated, getAdminRole, getAdminUser } from '@/lib/actions/auth'
import { redirect } from 'next/navigation'
import { getSetting } from '@/lib/actions/site-settings'
import ScanRetourButton from '@/components/admin/ScanRetourButton'
import BubbleToggle from '@/components/admin/BubbleToggle'
import StatsGridController from '@/components/admin/StatsGridController'
import { getJumiaStats as getJumiaRemoteStats } from './jumia-orders/actions'
import { calculateBookSeoScore } from '@/lib/utils/seo-score'
import SeoAlertBanner from '@/components/admin/seo/SeoAlertBanner'
import { DashboardPrivacyProvider } from '@/components/admin/DashboardPrivacyContext'
import DashboardPrivacyToggle from '@/components/admin/DashboardPrivacyToggle'
import SensitiveValue from '@/components/admin/SensitiveValue'
import { getCoverCacheStats } from '@/lib/actions/gemini-cache'


async function getStats(role: string | null, userId: string | null) {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1)

    const sellerBookWhere = role === 'SELLER' && userId ? { sellerId: userId } : {}
    const sellerOrderWhere: any = role === 'SELLER' && userId ? { items: { some: { sellerId: userId } } } : {}

    const [
        booksCount, packsCount, ordersCount, deliveredCount,
        pendingOrders, totalUsers, outOfStockBooks, cancelledCount, totalOrdersCount,
        shippedOrders, confirmedOrders, ordersToday, returnedCount,
        stockValueRaw, booksNoImage, paidOrdersCount, uniqueCustomersResult, salesChannelsRaw
    ] = await prisma.$transaction([
        prisma.book.count({ where: { active: true, ...sellerBookWhere } }),
        prisma.pack.count({ where: { active: true } }), // Packs are complicated, keep as is or filter? We'll ignore seller filter for packs count for now
        prisma.order.count({ where: { status: { notIn: ['CANCELLED', 'RETURNED'] }, ...sellerOrderWhere } }),
        prisma.order.count({ where: { status: 'DELIVERED', ...sellerOrderWhere } }),
        prisma.order.count({ where: { status: 'PENDING', ...sellerOrderWhere } }),
        role === 'SELLER' ? prisma.user.count({ where: { id: 'impossible' } }) : prisma.user.count(),
        prisma.book.count({ where: { active: true, stock: 0, ...sellerBookWhere } }),
        prisma.order.count({ where: { status: { in: ['CANCELLED', 'RETURNED'] }, ...sellerOrderWhere } }),
        prisma.order.count({ where: { ...sellerOrderWhere } }),
        // Nouveaux KPIs
        prisma.order.count({ where: { status: 'SHIPPED', ...sellerOrderWhere } }),
        prisma.order.count({ where: { status: 'CONFIRMED', ...sellerOrderWhere } }),
        prisma.order.count({ where: { createdAt: { gte: today }, ...sellerOrderWhere } }),
        prisma.order.count({ where: { status: 'RETURNED', ...sellerOrderWhere } }),
        prisma.book.aggregate({ where: { active: true, ...sellerBookWhere }, _sum: { stock: true } }),
        prisma.book.count({ where: { active: true, image: '', ...sellerBookWhere } }),
        prisma.order.count({ where: { isPaid: true, ...sellerOrderWhere } }),
        role === 'SELLER'
            ? prisma.order.groupBy({ by: ['phone'], where: { status: 'DELIVERED', ...sellerOrderWhere }, _count: { id: true }, orderBy: { _count: { id: 'desc' } } })
            : prisma.order.groupBy({ by: ['phone'], where: { status: 'DELIVERED' }, _count: { id: true }, orderBy: { _count: { id: 'desc' } } }),
        prisma.order.groupBy({
            by: ['salesChannel'],
            where: {
                ...sellerOrderWhere,
                status: { notIn: ['CANCELLED', 'RETURNED'] }
            },
            _count: { id: true },
            _sum: { total: true },
            orderBy: { salesChannel: 'asc' }
        })
    ])

    const booksForSeo = await prisma.book.findMany({
        where: { active: true, ...sellerBookWhere },
        select: {
            title: true,
            titleFr: true,
            titleEn: true,
            author: true,
            description: true,
            descriptionFr: true,
            descriptionEn: true,
            longDescription: true,
            seoKeywords: true,
            image: true,
            price: true,
            stock: true,
            isbn: true,
        }
    })
    const seoScoreLte80Count = booksForSeo.filter(b => calculateBookSeoScore(b) <= 80).length

    // For totalRevenue, revenueMonth, booksSoldToday we have to sum the specific items if it's a SELLER
    let totalRev = 0
    let revenueMois = 0
    let booksSoldToday = 0

    if (role === 'SELLER' && userId) {
        const allItems = await prisma.orderItem.aggregate({
            where: {
                sellerId: userId,
                order: { status: { notIn: ['CANCELLED', 'RETURNED'] } }
            },
            _sum: { price: true, quantity: true }
        })
        const monthItems = await prisma.orderItem.aggregate({
            where: {
                order: {
                    createdAt: { gte: firstDayOfMonth },
                    status: { notIn: ['CANCELLED', 'RETURNED'] }
                },
                sellerId: userId
            },
            _sum: { price: true, quantity: true }
        })
        const todayItems = await prisma.orderItem.aggregate({
            where: {
                order: {
                    createdAt: { gte: today },
                    status: { notIn: ['CANCELLED', 'RETURNED'] }
                },
                sellerId: userId,
                type: 'BOOK'
            },
            _sum: { quantity: true }
        })

        totalRev = allItems._sum.price || 0
        revenueMois = monthItems._sum.price || 0
        booksSoldToday = todayItems._sum.quantity || 0
    } else {
        const tr = await prisma.order.aggregate({
            where: { status: { notIn: ['CANCELLED', 'RETURNED'] } },
            _sum: { total: true }
        })
        const rm = await prisma.order.aggregate({
            where: {
                createdAt: { gte: firstDayOfMonth },
                status: { notIn: ['CANCELLED', 'RETURNED'] }
            },
            _sum: { total: true }
        })
        const bst = await prisma.orderItem.aggregate({
            where: {
                order: {
                    createdAt: { gte: today },
                    status: { notIn: ['CANCELLED', 'RETURNED'] }
                },
                type: 'BOOK'
            },
            _sum: { quantity: true }
        })
        totalRev = tr._sum.total || 0
        revenueMois = rm._sum.total || 0
        booksSoldToday = bst._sum.quantity || 0
    }

    const panierMoyen = ordersCount > 0 ? totalRev / ordersCount : 0
    const tauxConversion = totalOrdersCount > 0 ? (deliveredCount / totalOrdersCount) * 100 : 0
    const tauxAnnulation = totalOrdersCount > 0 ? (cancelledCount / totalOrdersCount) * 100 : 0
    const stockTotal = stockValueRaw._sum.stock || 0
    const uniqueCustomersCount = uniqueCustomersResult.length || 0
    const ltv = uniqueCustomersCount > 0 ? totalRev / uniqueCustomersCount : 0
    const netRevenue = role === 'SELLER' ? totalRev * 0.85 : totalRev // 15% commission par défaut
    const salesChannels = Object.fromEntries(salesChannelsRaw.map((channel: any) => [channel.salesChannel, {
        orders: channel._count?.id || 0,
        revenue: channel._sum?.total || 0
    }]))

    return {
        booksCount,
        packsCount,
        ordersCount,
        totalRevenue: totalRev,
        netRevenue,
        panierMoyen,
        tauxConversion,
        pendingOrders,
        totalUsers: role === 'SELLER' ? 0 : totalUsers,
        outOfStockBooks,
        tauxAnnulation,
        shippedOrders,
        confirmedOrders,
        ordersToday,
        revenueMois,
        returnedCount,
        stockTotal,
        booksNoImage,
        booksSoldToday,
        paidOrdersCount,
        ltv: role === 'SELLER' ? 0 : ltv,
        salesChannels,
        seoScoreLte80Count,
    }
}

async function getJumiaStats() {
    const [totalActions, successActions, errorActions, syncedBooks, booksWithSku] = await Promise.all([
        prisma.jumiaActionLog.count(),
        prisma.jumiaActionLog.count({ where: { status: 'SUCCESS' } }),
        prisma.jumiaActionLog.count({ where: { status: 'ERROR' } }),
        prisma.book.count({ where: { isSyncedWithJumia: true } }),
        prisma.book.count({ where: { sellerSku: { not: null } } }),
    ])

    // Derniere action Jumia
    const lastAction = await prisma.jumiaActionLog.findFirst({
        orderBy: { createdAt: 'desc' },
        select: { action: true, status: true, createdAt: true }
    })

    const tauxSucces = totalActions > 0 ? Math.round((successActions / totalActions) * 100) : 0

    return {
        totalActions,
        successActions,
        errorActions,
        syncedBooks,
        booksWithSku,
        tauxSucces,
        lastAction
    }
}

async function getRecentOrders(role: string | null, userId: string | null) {
    const sellerOrderWhere = role === 'SELLER' && userId ? { items: { some: { sellerId: userId } } } : {}
    return prisma.order.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        where: sellerOrderWhere,
        include: {
            items: true,
        },
    })
}

async function getLowStockBooks(role: string | null, userId: string | null) {
    const sellerBookWhere = role === 'SELLER' && userId ? { sellerId: userId } : {}
    return prisma.book.findMany({
        where: {
            stock: { lte: 5 },
            active: true,
            ...sellerBookWhere
        },
        orderBy: { stock: 'asc' },
        take: 5
    })
}

async function getTopPerformers(role: string | null, userId: string | null) {
    const sellerOrderWhere: any = role === 'SELLER' && userId ? { order: { status: { notIn: ['CANCELLED', 'RETURNED'] } }, sellerId: userId } : { order: { status: { notIn: ['CANCELLED', 'RETURNED'] } } }

    // Récupérer les livres les plus vendus
    const topBooks = await prisma.orderItem.groupBy({
        by: ['bookId'],
        where: {
            type: 'BOOK',
            bookId: { not: null },
            ...sellerOrderWhere
        },
        _sum: {
            quantity: true,
            price: true
        },
        _count: {
            id: true
        },
        orderBy: {
            _sum: {
                quantity: 'desc'
            }
        },
        take: 5
    })

    // Récupérer les détails des livres
    const booksWithDetails = await Promise.all(
        topBooks.map(async (item) => {
            const book = await prisma.book.findUnique({
                where: { id: item.bookId! },
                select: { id: true, title: true, author: true, image: true, price: true }
            })
            return {
                ...book,
                totalOrders: item._count?.id || 0,
                totalQuantity: item._sum.quantity || 0,
                totalRevenue: item._sum.price || 0
            }
        })
    )

    // Récupérer les packs les plus vendus
    const topPacks = await prisma.orderItem.groupBy({
        by: ['packId'],
        where: {
            type: 'PACK',
            packId: { not: null },
            // Ignore seller for packs? If sellers don't have packs, this will be empty, which is fine
            ...sellerOrderWhere
        },
        _sum: {
            quantity: true,
            price: true
        },
        _count: {
            id: true
        },
        orderBy: {
            _sum: {
                quantity: 'desc'
            }
        },
        take: 5
    })

    // Récupérer les détails des packs
    const packsWithDetails = await Promise.all(
        topPacks.map(async (item) => {
            const pack = await prisma.pack.findUnique({
                where: { id: item.packId! },
                select: { id: true, name: true, image: true, price: true }
            })
            return {
                ...pack,
                totalOrders: item._count?.id || 0,
                totalQuantity: item._sum.quantity || 0,
                totalRevenue: item._sum.price || 0
            }
        })
    )

    // Meilleurs Revenus (Livres + Packs confondus)
    const topRevenueBooksRaw = await prisma.orderItem.groupBy({
        by: ['bookId'],
        where: { type: 'BOOK', bookId: { not: null }, ...sellerOrderWhere },
        _sum: { quantity: true, price: true },
        orderBy: { _sum: { price: 'desc' } },
        take: 5
    })

    const topRevenuePacksRaw = await prisma.orderItem.groupBy({
        by: ['packId'],
        where: { type: 'PACK', packId: { not: null }, ...sellerOrderWhere },
        _sum: { quantity: true, price: true },
        orderBy: { _sum: { price: 'desc' } },
        take: 5
    })

    const revBooks = await Promise.all(
        topRevenueBooksRaw.map(async (item) => {
            const book = await prisma.book.findUnique({ where: { id: item.bookId! }, select: { id: true, title: true, image: true } })
            return { id: book?.id, title: book?.title, image: book?.image, type: 'BOOK', totalQuantity: item._sum.quantity || 0, totalRevenue: item._sum.price || 0 }
        })
    )

    const revPacks = await Promise.all(
        topRevenuePacksRaw.map(async (item) => {
            const pack = await prisma.pack.findUnique({ where: { id: item.packId! }, select: { id: true, name: true, image: true } })
            return { id: pack?.id, title: pack?.name, image: pack?.image, type: 'PACK', totalQuantity: item._sum.quantity || 0, totalRevenue: item._sum.price || 0 }
        })
    )

    const topRevenue = [...revBooks, ...revPacks]
        .filter(i => i.id)
        .sort((a, b) => b.totalRevenue - a.totalRevenue)
        .slice(0, 5)

    return {
        books: booksWithDetails.filter(b => b.id !== null),
        packs: packsWithDetails.filter(p => p.id !== null),
        topRevenue
    }
}



export default async function AdminDashboard(props: { params: Promise<{ locale: string }> }) {
    const params = await props.params
    const { locale } = params

    const isAuth = await isAuthenticated()
    if (!isAuth) {
        redirect(`/${locale}/admin/login`)
    }

    const role = await getAdminRole()
    const userId = await getAdminUser()

    const stats = await getStats(role, userId)
    const recentOrders = await getRecentOrders(role, userId)
    const lowStockBooks = await getLowStockBooks(role, userId)
    const badgeStats = await getBadgeStats() // Can leave as is
    const topPerformers = await getTopPerformers(role, userId)
    const jumiaStats = await getJumiaStats()

    // Timeout-wrapped remote stats to prevent slow loading
    const emptyJumiaStats = {
        total: 0, pending: 0, shipped: 0, delivered: 0, canceled: 0, failed: 0,
        revenue: 0, currentMonthOrders: 0, previousMonthOrders: 0,
        currentMonthRevenue: 0, previousMonthRevenue: 0, currentMonthAverageOrder: 0,
        currentMonthCanceled: 0, currentMonthReturned: 0, currentMonthCancellationRate: 0,
        todayOrders: 0, ordersMonthlyChange: 0, revenueMonthlyChange: 0,
        evolutionData: [], recentOrders: []
    }
    const jumiaRemoteStats = await Promise.race([
        getJumiaRemoteStats().then(data => data || emptyJumiaStats).catch(() => emptyJumiaStats),
        new Promise<typeof emptyJumiaStats>((resolve) => setTimeout(() => resolve(emptyJumiaStats), 3000))
    ])

    const geminiStats = await getCoverCacheStats().catch(() => ({
        totalEntries: 0,
        totalHits: 0,
        estimatedTokensSaved: 0,
        estimatedCostSavedUsd: 0,
        entries: []
    }))

    const n8nBaseUrl = await getSetting('n8n_base_url') || 'http://167.86.108.246:5678/'

    const currency = locale === 'ar' ? 'درهم' : 'MAD'

    const statCards = [
        { name: 'Livres Actifs', value: stats.booksCount, iconName: 'BookOpen', color: 'blue', roles: ['ADMIN', 'SELLER'] },
        { name: 'Score SEO ≤ 80', value: stats.seoScoreLte80Count, iconName: 'Sparkles', color: 'amber', roles: ['ADMIN', 'SELLER'], href: `/${locale}/admin/books?seoScore=lte80` },
        { name: 'Solde Tokens Économisés', value: `${geminiStats.estimatedTokensSaved.toLocaleString()} tkn`, iconName: 'Cpu', color: 'amber', roles: ['ADMIN'], href: `/${locale}/admin/settings?tab=gemini-cache` },
        { name: 'Économie IA ($)', value: `$${geminiStats.estimatedCostSavedUsd.toFixed(3)}`, iconName: 'Coins', color: 'emerald', roles: ['ADMIN'], href: `/${locale}/admin/settings?tab=gemini-cache` },
        { name: 'Packs Actifs', value: stats.packsCount, iconName: 'Package', color: 'amber', roles: ['ADMIN'] },
        { name: 'Commandes', value: stats.ordersCount, iconName: 'ShoppingCart', color: 'green', roles: ['ADMIN', 'SELLER'] },
        { name: 'Commandes (Store)', value: stats.salesChannels.PETSUNIVERS_STORE?.orders || 0, iconName: 'ShoppingCart', color: 'blue', roles: ['ADMIN'] },
        { name: 'CA (Store)', value: `${(stats.salesChannels.PETSUNIVERS_STORE?.revenue || 0).toFixed(0)} ${currency}`, iconName: 'TrendingUp', color: 'blue', roles: ['ADMIN'] },
        { name: 'Commandes (petsunivers.ma)', value: stats.salesChannels.PETSUNIVERS_MA?.orders || 0, iconName: 'ShoppingCart', color: 'teal', roles: ['ADMIN'] },
        { name: 'CA (petsunivers.ma)', value: `${(stats.salesChannels.PETSUNIVERS_MA?.revenue || 0).toFixed(0)} ${currency}`, iconName: 'TrendingUp', color: 'teal', roles: ['ADMIN'] },
        { name: 'Commandes Payées', value: stats.paidOrdersCount, iconName: 'DollarSign', color: 'emerald', roles: ['ADMIN', 'SELLER'] },
        { name: 'LTV (Client)', value: `${stats.ltv.toFixed(0)} ${currency}`, iconName: 'Users', color: 'blue', roles: ['ADMIN'] },
        { name: 'En Attente', value: stats.pendingOrders, iconName: 'Clock', color: 'yellow', roles: ['ADMIN', 'SELLER'] },
        { name: "CA (Brut)", value: `${stats.totalRevenue.toFixed(0)} ${currency}`, iconName: 'TrendingUp', color: 'orange', roles: ['ADMIN', 'SELLER'] },
        { name: "CA (Net)", value: `${stats.netRevenue.toFixed(0)} ${currency}`, iconName: 'DollarSign', color: 'emerald', roles: ['SELLER'] },
        { name: 'Panier Moyen', value: `${stats.panierMoyen.toFixed(0)} ${currency}`, iconName: 'ShoppingBag', color: 'rose', roles: ['ADMIN', 'SELLER'] },
        { name: 'Utilisateurs', value: stats.totalUsers, iconName: 'Users', color: 'blue', roles: ['ADMIN'] },
        { name: 'Ruptures Stock', value: stats.outOfStockBooks, iconName: 'AlertTriangle', color: 'red', roles: ['ADMIN', 'SELLER'] },
        { name: 'Taux Conversion', value: `${stats.tauxConversion.toFixed(1)}%`, iconName: 'BarChart2', color: 'teal', roles: ['ADMIN', 'SELLER'] },
        { name: 'Taux Annulation', value: `${stats.tauxAnnulation.toFixed(1)}%`, iconName: 'XOctagon', color: 'gray', roles: ['ADMIN', 'SELLER'] },
        { name: "Cmd Aujourd'hui", value: stats.ordersToday, iconName: 'CalendarDays', color: 'teal', roles: ['ADMIN', 'SELLER'] },
        { name: "Livres Vendus (Auj)", value: stats.booksSoldToday, iconName: 'BookOpen', color: 'emerald', roles: ['ADMIN', 'SELLER'] },
        { name: 'En Livraison', value: stats.shippedOrders, iconName: 'Truck', color: 'cyan', roles: ['ADMIN', 'SELLER'] },
        { name: 'Confirmées', value: stats.confirmedOrders, iconName: 'CheckCircle', color: 'green', roles: ['ADMIN', 'SELLER'] },
        { name: 'CA du mois', value: `${stats.revenueMois.toFixed(0)} ${currency}`, iconName: 'TrendingUp', color: 'orange', roles: ['ADMIN', 'SELLER'] },
        { name: 'Retours', value: stats.returnedCount, iconName: 'RefreshCw', color: 'rose', roles: ['ADMIN', 'SELLER'] },
        { name: 'Stock Total', value: stats.stockTotal, iconName: 'Archive', color: 'amber', roles: ['ADMIN', 'SELLER'] },
        { name: 'Sans Image', value: stats.booksNoImage, iconName: 'ImageOff', color: 'red', roles: ['ADMIN', 'SELLER'] },
        { name: 'Livres SKU (Jumia)', value: jumiaStats.booksWithSku, iconName: 'Link2', color: 'orange', roles: ['ADMIN'] },
        { name: 'Synchro Jumia', value: jumiaStats.syncedBooks, iconName: 'CheckCircle', color: 'green', roles: ['ADMIN'] },
        { name: 'Commandes (Jumia)', value: jumiaRemoteStats?.total || 0, iconName: 'ShoppingCart', color: 'orange', roles: ['ADMIN'] },
        { name: 'En Attente (Jumia)', value: jumiaRemoteStats?.pending || 0, iconName: 'Clock', color: 'yellow', roles: ['ADMIN'] },
        { name: 'Expédiées (Jumia)', value: jumiaRemoteStats?.shipped || 0, iconName: 'Truck', color: 'cyan', roles: ['ADMIN'] },
        { name: 'Livrées (Jumia)', value: jumiaRemoteStats?.delivered || 0, iconName: 'CheckCircle', color: 'green', roles: ['ADMIN'] },
        { name: 'CA Jumia (période)', value: `${jumiaRemoteStats.revenue.toFixed(0)} ${currency}`, iconName: 'TrendingUp', color: 'orange', roles: ['ADMIN'] },
        { name: 'CA mensuel Jumia', value: `${jumiaRemoteStats.currentMonthRevenue.toFixed(0)} ${currency}`, iconName: 'DollarSign', color: 'emerald', roles: ['ADMIN'], trend: jumiaRemoteStats.revenueMonthlyChange },
        { name: 'Cmd ce mois (Jumia)', value: jumiaRemoteStats.currentMonthOrders, iconName: 'CalendarDays', color: 'orange', roles: ['ADMIN'], trend: jumiaRemoteStats.ordersMonthlyChange },
        { name: "Cmd aujourd'hui (Jumia)", value: jumiaRemoteStats.todayOrders, iconName: 'ShoppingCart', color: 'teal', roles: ['ADMIN'] },
        { name: 'Panier moyen Jumia', value: `${jumiaRemoteStats.currentMonthAverageOrder.toFixed(0)} ${currency}`, iconName: 'ShoppingBag', color: 'rose', roles: ['ADMIN'] },
        { name: 'Annulées ce mois (Jumia)', value: jumiaRemoteStats.currentMonthCanceled, iconName: 'XOctagon', color: 'red', roles: ['ADMIN'] },
        { name: 'Retours ce mois (Jumia)', value: jumiaRemoteStats.currentMonthReturned, iconName: 'RefreshCw', color: 'rose', roles: ['ADMIN'] },
        { name: 'Taux annulation Jumia', value: `${jumiaRemoteStats.currentMonthCancellationRate.toFixed(1)}%`, iconName: 'BarChart2', color: 'gray', roles: ['ADMIN'] },
    ].filter(card => card.roles.includes(role || 'ADMIN'))


    const colorClasses = {
        blue: 'bg-blue-100 text-blue-600',
        amber: 'bg-amber-100 text-amber-600',
        green: 'bg-green-100 text-green-600',
        orange: 'bg-orange-100 text-orange-600',
        teal: 'bg-teal-100 text-teal-600',
        rose: 'bg-rose-100 text-rose-600',
        yellow: 'bg-yellow-100 text-yellow-600',
        red: 'bg-red-100 text-red-600',
        gray: 'bg-gray-100 text-gray-600',
        cyan: 'bg-cyan-100 text-cyan-600',
        emerald: 'bg-emerald-100 text-emerald-600',
    }

    const statusColors = {
        PENDING: 'bg-yellow-100 text-yellow-800',
        CONFIRMED: 'bg-blue-100 text-blue-800',
        SHIPPED: 'bg-cyan-100 text-cyan-800',
        DELIVERED: 'bg-green-100 text-green-800',
        RETURNED: 'bg-orange-100 text-orange-800',
        CANCELLED: 'bg-red-100 text-red-800',
    }

    const statusLabels = {
        PENDING: 'En attente',
        CONFIRMED: 'Confirmée',
        SHIPPED: 'En livraison',
        DELIVERED: 'Livrée',
        RETURNED: 'Retournée',
        CANCELLED: 'Annulée',
    }

    return (
        <DashboardPrivacyProvider>
            <div className="space-y-12">

                {/* Header section style PetsUnivers */}
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b border-gray-100">
                    <div>
                        <h1 className="text-4xl md:text-5xl lg:text-7xl font-black text-black tracking-tighter mb-2 italic">
                            Tableau<span className="text-blue-600">.</span>
                        </h1>
                        <p className="text-gray-400 font-bold uppercase tracking-[0.2em] text-[10px]">
                            Centre de commande global PetsUnivers
                        </p>
                    </div>

                    <div className="flex flex-wrap gap-3">
                        <DashboardPrivacyToggle />
                        <a
                            href="https://web.whatsapp.com/"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-3 px-6 py-3 bg-white border border-[#25D366] text-[#25D366] rounded-2xl hover:bg-[#25D366] hover:text-white transition-all font-black text-[10px] uppercase tracking-widest shadow-sm active:scale-95"
                        >
                            <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24"><path d="M12.031 0C5.385 0 0 5.385 0 12.031c0 2.128.552 4.195 1.6 6.004L.014 24l6.108-1.597A11.96 11.96 0 0012.031 24c6.646 0 12.031-5.385 12.031-12.031S18.677 0 12.031 0zm-1.042 17.653c-1.802 0-3.565-.483-5.116-1.404l-.367-.218-3.805.996.996-3.805-.218-.367c-.921-1.551-1.404-3.314-1.404-5.116 0-5.617 4.568-10.185 10.185-10.185 5.617 0 10.185 4.568 10.185 10.185 0 5.617-4.568 10.185-10.185 10.185zm5.59-7.618c-.307-.154-1.815-.895-2.097-.996-.281-.102-.486-.154-.69.154-.205.307-.793.996-.972 1.201-.18.205-.358.23-.665.077-1.464-.73-2.673-1.637-3.72-3.136-.205-.282.205-.268.808-1.482.102-.205.051-.383-.026-.537-.077-.154-.69-1.662-.946-2.276-.256-.614-.512-.512-.69-.512-.18 0-.383 0-.588 0-.205 0-.537.077-.819.384-.281.307-1.074 1.048-1.074 2.556 0 1.509 1.1 2.967 1.253 3.171.154.205 2.148 3.395 5.253 4.673 2.063.851 2.766.921 3.279.768.512-.154 1.815-.742 2.071-1.458.256-.716.256-1.329.18-1.458-.077-.128-.281-.205-.588-.358z" /></svg>
                            WhatsApp
                        </a>
                        <a
                            href={n8nBaseUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-3 px-6 py-3 bg-black text-white rounded-2xl hover:bg-gray-900 transition-all font-black text-[10px] uppercase tracking-widest shadow-xl active:scale-95"
                        >
                            <Cpu className="w-4 h-4 text-orange-500" />
                            n8n Server
                        </a>
                        <ScanRetourButton />
                        <BubbleToggle stats={statCards.map(s => ({ name: s.name, value: s.value, color: s.color }))} />
                    </div>
                </div>

            {/* Stats Grid Premium - controllable */}
            {/* SEO Alert Banner (> 50% livres SEO <= 80) */}
            <SeoAlertBanner
                totalBooks={stats.booksCount}
                lowSeoBooks={stats.seoScoreLte80Count}
                thresholdPercent={50}
                locale={locale}
            />

            <StatsGridController cards={statCards} colorClasses={colorClasses} />

            {/* Charts Section */}
            <div className="bg-white rounded-[2rem] sm:rounded-[3rem] border border-gray-100 shadow-xl shadow-black/5 p-4 sm:p-6 lg:p-10">
                <DashboardAnalytics />
            </div>



            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 md:gap-12">
                {/* Marketing Widget Premium */}
                <div className="lg:col-span-3 bg-white rounded-[2rem] sm:rounded-[3rem] border border-gray-100 shadow-xl shadow-black/5 overflow-hidden">
                    <div className="px-6 py-6 md:px-10 md:py-8 border-b border-gray-50 flex justify-between items-center bg-gray-50/50">
                        <h2 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] flex items-center gap-2">
                            <TrendingUp className="w-4 h-4 text-blue-600" />
                            Performance Marketing
                        </h2>
                    </div>
                    <div className="p-6 md:p-10">
                        {badgeStats.length === 0 ? (
                            <div className="text-center text-gray-300 py-6 italic font-bold uppercase text-[10px]">Aucune donnée</div>
                        ) : (
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
                                {badgeStats.map((stat: any) => (
                                    <div key={stat.name} className="flex flex-col items-center justify-center p-6 md:p-8 bg-gray-50/50 rounded-2xl md:rounded-[2rem] hover:bg-white hover:shadow-lg transition-all border border-transparent hover:border-gray-100 group">
                                        <SensitiveValue name={stat.name} value={stat.value} className="text-3xl font-black text-black tracking-tighter group-hover:scale-110 transition-transform" />
                                        <span className="text-[9px] font-black uppercase tracking-widest text-gray-400 mt-2">{stat.name}</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Top Performers Premium */}
                <div className="lg:col-span-3 bg-white rounded-[2rem] sm:rounded-[3rem] border border-gray-100 shadow-xl shadow-black/5 overflow-hidden">
                    <div className="px-6 py-6 md:px-10 md:py-8 border-b border-gray-50 bg-gray-50/50 flex justify-between items-center">
                        <h2 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] flex items-center gap-2">
                            <TrendingUp className="w-4 h-4 text-emerald-600" />
                            Classement des ventes
                        </h2>
                    </div>
                    <div className="p-6 md:p-10">
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 md:gap-12">
                            {/* Top Books */}
                            <div>
                                <h3 className="text-[10px] font-black text-black uppercase tracking-[0.2em] mb-6 flex items-center gap-2 italic">
                                    <BookOpen className="w-4 h-4 text-blue-600" />
                                    Livres Vedettes
                                </h3>
                                <div className="space-y-4">
                                    {topPerformers.books.map((book: any, index: number) => (
                                        <div key={book.id} className="flex items-center gap-4 p-4 rounded-2xl hover:bg-gray-50 transition-colors group border border-transparent hover:border-gray-100">
                                            <span className="flex-shrink-0 w-8 h-8 rounded-xl bg-black text-white flex items-center justify-center text-[10px] font-black italic shadow-lg">0{index + 1}</span>
                                            {book.image && (
                                                <div className="w-12 h-16 bg-gray-100 rounded-lg overflow-hidden shrink-0 shadow-sm border border-gray-100 relative">
                                                    <Image src={book.image} alt={book.title} fill className="object-cover" unoptimized />
                                                </div>
                                            )}
                                            <div className="flex-grow min-w-0">
                                                <p className="font-black text-[10px] text-black uppercase truncate italic">{book.title}</p>
                                                <div className="flex items-center gap-3 mt-1">
                                                    <span className="text-[10px] font-black text-blue-600"><SensitiveValue name="Ventes" value={`${book.totalQuantity} VENTES`} /></span>
                                                    <span className="text-[10px] font-black text-emerald-500"><SensitiveValue name="CA" value={`${book.totalRevenue.toFixed(0)} ${currency}`} /></span>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Top Packs */}
                            <div>
                                <h3 className="text-[10px] font-black text-black uppercase tracking-[0.2em] mb-6 flex items-center gap-2 italic">
                                    <Package className="w-4 h-4 text-amber-600" />
                                    Packs les plus rentables
                                </h3>
                                <div className="space-y-4">
                                    {topPerformers.packs.map((pack: any, index: number) => (
                                        <div key={pack.id} className="flex items-center gap-4 p-4 rounded-2xl hover:bg-gray-50 transition-colors group border border-transparent hover:border-gray-100">
                                            <span className="flex-shrink-0 w-8 h-8 rounded-xl bg-black text-white flex items-center justify-center text-[10px] font-black italic shadow-lg">0{index + 1}</span>
                                            {pack.image && (
                                                <div className="w-12 h-16 bg-gray-100 rounded-lg overflow-hidden shrink-0 shadow-sm border border-gray-100 relative">
                                                    <Image src={pack.image} alt={pack.name} fill className="object-cover" unoptimized />
                                                </div>
                                            )}
                                            <div className="flex-grow min-w-0">
                                                <p className="font-black text-[10px] text-black uppercase truncate italic">{pack.name}</p>
                                                <div className="flex items-center gap-3 mt-1">
                                                    <span className="text-[10px] font-black text-amber-600"><SensitiveValue name="Ventes" value={`${pack.totalQuantity} VENTES`} /></span>
                                                    <span className="text-[10px] font-black text-emerald-500"><SensitiveValue name="CA" value={`${pack.totalRevenue.toFixed(0)} ${currency}`} /></span>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Top Revenue */}
                            <div>
                                <h3 className="text-[10px] font-black text-black uppercase tracking-[0.2em] mb-6 flex items-center gap-2 italic">
                                    <TrendingUp className="w-4 h-4 text-emerald-600" />
                                    Meilleurs Revenus
                                </h3>
                                <div className="space-y-4">
                                    {topPerformers.topRevenue.map((item: any, index: number) => (
                                        <div key={`${item.type}-${item.id}`} className="flex items-center gap-4 p-4 rounded-2xl hover:bg-gray-50 transition-colors group border border-transparent hover:border-gray-100">
                                            <span className="flex-shrink-0 w-8 h-8 rounded-xl bg-black text-white flex items-center justify-center text-[10px] font-black italic shadow-lg">0{index + 1}</span>
                                            {item.image && (
                                                <div className="w-12 h-16 bg-gray-100 rounded-lg overflow-hidden shrink-0 shadow-sm border border-gray-100 relative">
                                                    <Image src={item.image} alt={item.title} fill className="object-cover" unoptimized />
                                                </div>
                                            )}
                                            <div className="flex-grow min-w-0">
                                                <p className="font-black text-[10px] text-black uppercase truncate italic">{item.title}</p>
                                                <div className="flex items-center gap-3 mt-1">
                                                    <span className="text-[10px] font-black text-emerald-500"><SensitiveValue name="CA" value={`${item.totalRevenue.toFixed(0)} ${currency}`} /></span>
                                                    <span className="text-[10px] font-black text-gray-500"><SensitiveValue name="Ventes" value={`${item.totalQuantity} VENTES`} /></span>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Recent Orders Premium */}
                <div className="lg:col-span-2 bg-white rounded-[2rem] sm:rounded-[3rem] border border-gray-100 shadow-xl shadow-black/5 overflow-hidden">
                    <div className="px-6 py-6 md:px-10 md:py-8 border-b border-gray-50 flex justify-between items-center bg-gray-50/50">
                        <h2 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Dernières Transactions</h2>
                        <Link href="/admin/orders" className="text-[9px] font-black text-white bg-black px-4 py-2 rounded-xl hover:bg-gray-800 transition-all uppercase tracking-widest">Voir tout</Link>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <tbody className="divide-y divide-gray-50">
                                {recentOrders.map((order) => (
                                    <tr key={order.id} className="hover:bg-gray-50 transition-colors group">
                                        <td className="px-6 py-4 md:px-10 md:py-6 whitespace-nowrap">
                                            <div className="text-xs font-black text-black uppercase tracking-tight italic">{order.fullName}</div>
                                            <div className="text-[9px] text-gray-400 font-bold uppercase tracking-widest mt-1">{order.city}</div>
                                        </td>
                                        <td className="px-6 py-4 md:px-10 md:py-6 whitespace-nowrap text-sm font-black text-blue-600 tracking-tighter">
                                            <SensitiveValue name="Montant Commande" value={`${order.total.toLocaleString()} ${currency}`} />
                                        </td>
                                        <td className="px-6 py-4 md:px-10 md:py-6 whitespace-nowrap text-right">
                                            <span className={`px-4 py-1 inline-flex text-[9px] font-black rounded-full uppercase tracking-widest shadow-sm ${statusColors[order.status as keyof typeof statusColors]}`}>
                                                {statusLabels[order.status as keyof typeof statusLabels]}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Low Stock Alerts Premium */}
                <div className="lg:col-span-1 bg-white rounded-[2rem] sm:rounded-[3rem] border border-gray-100 shadow-xl shadow-black/5 overflow-hidden">
                    <div className="px-6 py-6 md:px-10 md:py-8 border-b border-gray-50 flex justify-between items-center bg-red-50/30">
                        <h2 className="text-[10px] font-black text-red-600 uppercase tracking-[0.2em] flex items-center gap-2">
                            <Package className="w-4 h-4" />
                            Alerte Rupture
                        </h2>
                    </div>
                    <div className="divide-y divide-gray-50">
                        {lowStockBooks.length === 0 ? (
                            <div className="p-12 text-center">
                                <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <CheckCircle className="w-8 h-8 text-emerald-500" />
                                </div>
                                <p className="font-black uppercase tracking-widest text-[9px] text-gray-400">Stock optimal</p>
                            </div>
                        ) : (
                            lowStockBooks.map((book) => (
                                <div key={book.id} className="p-6 flex items-center justify-between hover:bg-gray-50 transition-colors">
                                    <div className="flex-1 min-w-0 pr-4">
                                        <p className="text-[10px] font-black text-black uppercase truncate italic">{book.title}</p>
                                        <p className="text-[9px] text-gray-400 font-bold uppercase tracking-[0.2em] mt-1">{book.author}</p>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <span className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-tighter ${book.stock === 0 ? 'bg-black text-red-500 shadow-lg shadow-red-500/10' : 'bg-red-50 text-red-600'}`}>
                                            {book.stock} RESTANTS
                                        </span>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                    <div className="p-6 md:p-8 bg-gray-50/50 border-t border-gray-50">
                        <Link href="/admin/books" className="block w-full text-center py-4 bg-white border border-gray-100 rounded-2xl text-[9px] font-black text-gray-400 hover:text-black hover:border-black transition-all uppercase tracking-[0.2em]">Rapprovisionner</Link>
                    </div>
                </div>
            </div>

            {/* ─── KPIs Jumia ─────────────────────────────────────────────────── */}
            <div className="bg-white rounded-[2rem] sm:rounded-[3rem] border border-gray-100 shadow-xl shadow-black/5 overflow-hidden">
                <div className="px-6 py-6 md:px-10 md:py-8 border-b border-gray-50 flex justify-between items-center bg-orange-50/30">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-orange-500 rounded-xl flex items-center justify-center shadow-lg shadow-orange-500/20">
                            <ShoppingBag className="w-4 h-4 text-white" />
                        </div>
                        <h2 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">
                            Performance Jumia
                        </h2>
                    </div>
                    <div className="flex items-center gap-2">
                        <Link href="/admin/jumia-orders" className="text-[9px] font-black text-orange-600 bg-orange-50 border border-orange-200 px-4 py-2 rounded-xl hover:bg-orange-100 transition-all uppercase tracking-widest flex items-center gap-1">
                            <ExternalLink className="w-3 h-3" />
                            Commandes
                        </Link>
                        <Link href="/admin/jumia-products" className="text-[9px] font-black text-white bg-orange-500 px-4 py-2 rounded-xl hover:bg-orange-600 transition-all uppercase tracking-widest flex items-center gap-1">
                            <ExternalLink className="w-3 h-3" />
                            Produits
                        </Link>
                    </div>
                </div>
                <div className="p-6 md:p-10">
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 md:gap-6">
                        {/* Livres avec SKU */}
                        <div className="flex flex-col items-center justify-center p-6 bg-orange-50/50 rounded-2xl border border-orange-100 group hover:shadow-md transition-all">
                            <Link2 className="w-6 h-6 text-orange-500 mb-2" />
                            <span className="text-3xl font-black text-black tracking-tighter">{jumiaStats.booksWithSku}</span>
                            <span className="text-[9px] font-black uppercase tracking-widest text-gray-400 mt-1 text-center">Livres avec SKU</span>
                        </div>
                        {/* Synced */}
                        <div className="flex flex-col items-center justify-center p-6 bg-green-50/50 rounded-2xl border border-green-100 group hover:shadow-md transition-all">
                            <CheckCircle className="w-6 h-6 text-green-500 mb-2" />
                            <span className="text-3xl font-black text-black tracking-tighter">{jumiaStats.syncedBooks}</span>
                            <span className="text-[9px] font-black uppercase tracking-widest text-gray-400 mt-1 text-center">Synchro Jumia</span>
                        </div>
                        {/* Total Actions */}
                        <div className="flex flex-col items-center justify-center p-6 bg-gray-50/50 rounded-2xl border border-gray-100 group hover:shadow-md transition-all">
                            <Zap className="w-6 h-6 text-blue-500 mb-2" />
                            <span className="text-3xl font-black text-black tracking-tighter">{jumiaStats.totalActions}</span>
                            <span className="text-[9px] font-black uppercase tracking-widest text-gray-400 mt-1 text-center">Actions totales</span>
                        </div>
                        {/* Succès */}
                        <div className="flex flex-col items-center justify-center p-6 bg-green-50/50 rounded-2xl border border-green-100 group hover:shadow-md transition-all">
                            <CheckCircle className="w-6 h-6 text-emerald-500 mb-2" />
                            <span className="text-3xl font-black text-black tracking-tighter">{jumiaStats.successActions}</span>
                            <span className="text-[9px] font-black uppercase tracking-widest text-gray-400 mt-1 text-center">Succès</span>
                        </div>
                        {/* Erreurs */}
                        <div className="flex flex-col items-center justify-center p-6 bg-red-50/50 rounded-2xl border border-red-100 group hover:shadow-md transition-all">
                            <AlertTriangle className="w-6 h-6 text-red-500 mb-2" />
                            <span className="text-3xl font-black text-black tracking-tighter">{jumiaStats.errorActions}</span>
                            <span className="text-[9px] font-black uppercase tracking-widest text-gray-400 mt-1 text-center">Erreurs</span>
                        </div>
                        {/* Taux Succès */}
                        <div className={`flex flex-col items-center justify-center p-6 rounded-2xl border group hover:shadow-md transition-all ${jumiaStats.tauxSucces >= 70 ? 'bg-emerald-50/50 border-emerald-100' : 'bg-red-50/50 border-red-100'
                            }`}>
                            <BarChart2 className={`w-6 h-6 mb-2 ${jumiaStats.tauxSucces >= 70 ? 'text-emerald-500' : 'text-red-500'}`} />
                            <span className={`text-3xl font-black tracking-tighter ${jumiaStats.tauxSucces >= 70 ? 'text-emerald-600' : 'text-red-600'
                                }`}>{jumiaStats.tauxSucces}%</span>
                            <span className="text-[9px] font-black uppercase tracking-widest text-gray-400 mt-1 text-center">Taux Succès</span>
                        </div>
                    </div>

                    {/* Dernière action */}
                    {jumiaStats.lastAction && (
                        <div className="mt-6 flex items-center gap-3 p-4 bg-gray-50 rounded-2xl border border-gray-100">
                            <div className={`w-2 h-2 rounded-full flex-shrink-0 ${jumiaStats.lastAction.status === 'SUCCESS' ? 'bg-emerald-500' : 'bg-red-500'
                                }`} />
                            <span className="text-[9px] font-black uppercase tracking-widest text-gray-400">Dernière action :</span>
                            <span className="text-[10px] font-black text-black uppercase">{jumiaStats.lastAction.action}</span>
                            <span className={`text-[9px] font-black px-2 py-0.5 rounded-lg ${jumiaStats.lastAction.status === 'SUCCESS'
                                    ? 'bg-emerald-100 text-emerald-700'
                                    : 'bg-red-100 text-red-700'
                                }`}>{jumiaStats.lastAction.status}</span>
                            <span className="text-[9px] text-gray-400 ml-auto">
                                {new Date(jumiaStats.lastAction.createdAt).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                            </span>
                        </div>
                    )}

                    {/* 3 Dernières commandes Jumia */}
                    {jumiaRemoteStats?.recentOrders && jumiaRemoteStats.recentOrders.length > 0 && (
                        <div className="mt-6 overflow-hidden rounded-2xl border border-orange-100 bg-white">
                            <div className="px-4 py-3 bg-orange-50/50 border-b border-orange-100 flex items-center justify-between">
                                <h3 className="text-[10px] font-black text-orange-600 uppercase tracking-widest flex items-center gap-2">
                                    <ShoppingBag className="w-3 h-3" />
                                    3 Dernières Commandes Jumia
                                </h3>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-sm">
                                    <tbody className="divide-y divide-gray-50">
                                        {jumiaRemoteStats.recentOrders.map((order: any, idx: number) => (
                                            <tr key={order.id || order.OrderId || idx} className="hover:bg-gray-50 transition-colors">
                                                <td className="px-4 py-3 font-bold text-gray-900 text-[11px] uppercase tracking-tighter">
                                                    {order.number || order.OrderId || order.OrderNumber}
                                                </td>
                                                <td className="px-4 py-3 text-[10px] text-gray-500 font-bold uppercase tracking-widest">
                                                    {order.shippingAddress?.firstName || order.CustomerFirstName}
                                                </td>
                                                <td className="px-4 py-3 text-[11px] font-black text-orange-600 tracking-tighter">
                                                    <SensitiveValue name="CA Jumia" value={`${order.totalAmountLocal?.value || order.Price || order.GrandTotal || '0'} ${currency}`} />
                                                </td>
                                                <td className="px-4 py-3 text-right">
                                                    <span className={`inline-flex px-2 py-1 text-[9px] font-black uppercase tracking-widest rounded-lg ${(order.status || order.Statuses?.[0] || '').toLowerCase() === 'delivered' ? 'bg-green-100 text-green-700' :
                                                            (order.status || order.Statuses?.[0] || '').toLowerCase() === 'canceled' ? 'bg-red-100 text-red-700' :
                                                                (order.status || order.Statuses?.[0] || '').toLowerCase() === 'shipped' ? 'bg-blue-100 text-blue-700' :
                                                                    'bg-orange-100 text-orange-700'
                                                        }`}>
                                                        {order.status || order.Statuses?.[0] || 'PENDING'}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </div>
            </div>
            {/* ─────────────────────────────────────────────────────────────────── */}
            </div>
        </DashboardPrivacyProvider>
    )
}
