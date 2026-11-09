'use server'

import { prisma } from '@/lib/prisma'
import { verifyAdmin } from './auth'
import { getBaseUrl } from '@/lib/utils'
import { revalidatePath } from 'next/cache'
import { getIndexNowKey, getIndexNowSubmissionLog, IndexNowSubmissionLog } from '@/lib/indexnow'

export interface BotCrawlLog {
    timestamp: string
    userAgent: string
    ip: string
    crawler: string
}

export interface SitemapItemStatus {
    id: string
    name: string
    url: string
    type: 'SITEMAP' | 'FEED'
    urlCount: number
    status: 'SYNCHRONIZED' | 'UPDATING' | 'ERROR'
    lastModified: string
    priorityCategory: string
}

export interface IndexNowOverview {
    key: string
    keyLocation: string
    status: 'ACTIVE' | 'PENDING'
    lastSubmission: IndexNowSubmissionLog | null
    supportedEngines: string[]
}

export interface SitemapsOverviewData {
    sitemaps: SitemapItemStatus[]
    googlebotSellersVisit: BotCrawlLog | null
    otherBotSellersVisit: BotCrawlLog | null
    robotsTxtStatus: {
        declared: boolean
        sitemapsCount: number
    }
    indexNow: IndexNowOverview
}

export async function getSitemapsSyncStatus(): Promise<SitemapsOverviewData> {
    try {
        await verifyAdmin()
    } catch {
        throw new Error('Non autorisé')
    }

    const baseUrl = getBaseUrl()

    // 1. Récupérer les données de visite stockées dans SiteSettings
    const [
        googlebotVisitSetting,
        otherBotVisitSetting,
        booksCount,
        packsCount,
        reviewsCount,
        postsCount,
        categoriesCount,
        latestSellerReq,
        latestExchangeBook,
        indexNowKey,
        indexNowLog
    ] = await Promise.all([
        prisma.siteSettings.findUnique({
            where: { key: 'seo_googlebot_sitemap_sellers_last_visit' }
        }).catch(() => null),
        prisma.siteSettings.findUnique({
            where: { key: 'seo_bot_sitemap_sellers_last_visit' }
        }).catch(() => null),
        prisma.book.count({ where: { active: true } }).catch(() => 0),
        prisma.pack.count({ where: { active: true } }).catch(() => 0),
        prisma.review.count({ where: { isApproved: true } }).catch(() => 0),
        prisma.post.count({ where: { published: true } }).catch(() => 0),
        prisma.seoCategory.count({ where: { isActive: true } }).catch(() => 0),
        prisma.sellerRequest.findFirst({
            orderBy: { updatedAt: 'desc' },
            select: { updatedAt: true }
        }).catch(() => null),
        (prisma as any).exchangeBook.findFirst({
            where: { status: 'AVAILABLE' },
            orderBy: { updatedAt: 'desc' },
            select: { updatedAt: true }
        }).catch(() => null),
        getIndexNowKey().catch(() => 'a918d1a2e64740c2b085b754a73fabbe'),
        getIndexNowSubmissionLog().catch(() => null),
    ])

    let googlebotSellersVisit: BotCrawlLog | null = null
    if (googlebotVisitSetting?.value) {
        try {
            googlebotSellersVisit = JSON.parse(googlebotVisitSetting.value)
        } catch {}
    }

    let otherBotSellersVisit: BotCrawlLog | null = null
    if (otherBotVisitSetting?.value) {
        try {
            otherBotSellersVisit = JSON.parse(otherBotVisitSetting.value)
        } catch {}
    }

    const now = new Date()
    const sellersLastMod = latestSellerReq?.updatedAt || latestExchangeBook?.updatedAt || now
    const generalLastMod = booksCount > 0 ? now : sellersLastMod

    // Calcul du nombre d'URL par sitemap
    // sitemap-sellers : 10 routes thématiques * 3 langues (fr, ar, en) = 30 URL
    const sellersUrlCount = 10 * 3
    // sitemap principal : static (18*3) + livres*3 + packs*3 + posts*3 + catégories*3
    const staticCount = 18 * 3
    const generalUrlCount = staticCount + (booksCount * 3) + (packsCount * 3) + (postsCount * 3) + (categoriesCount * 3)

    const sitemaps: SitemapItemStatus[] = [
        {
            id: 'sitemap-sellers',
            name: 'Sitemap Programmes Marchands & Vendeurs',
            url: `${baseUrl}/sitemap-sellers.xml`,
            type: 'SITEMAP',
            urlCount: sellersUrlCount,
            status: 'SYNCHRONIZED',
            lastModified: sellersLastMod.toISOString(),
            priorityCategory: 'Haute priorité (0.70 à 1.0)'
        },
        {
            id: 'sitemap-main',
            name: 'Sitemap Général Riwaya',
            url: `${baseUrl}/sitemap.xml`,
            type: 'SITEMAP',
            urlCount: generalUrlCount,
            status: 'SYNCHRONIZED',
            lastModified: generalLastMod.toISOString(),
            priorityCategory: 'Standard & Catalogue'
        },
        {
            id: 'google-shopping-xml',
            name: 'Flux Google Shopping & Merchant Center',
            url: `${baseUrl}/google-shopping.xml`,
            type: 'FEED',
            urlCount: booksCount + packsCount,
            status: 'SYNCHRONIZED',
            lastModified: now.toISOString(),
            priorityCategory: 'Google Merchant Center (Haute Priorité)'
        },
        {
            id: 'google-product-reviews-xml',
            name: 'Flux Google Product Reviews (Avis Certifiés)',
            url: `${baseUrl}/google-product-reviews.xml`,
            type: 'FEED',
            urlCount: reviewsCount,
            status: 'SYNCHRONIZED',
            lastModified: now.toISOString(),
            priorityCategory: 'Avis & Étoiles Google Search'
        },
        {
            id: 'feed-rss',
            name: 'Flux RSS Produits & Actualités',
            url: `${baseUrl}/feed.xml`,
            type: 'FEED',
            urlCount: Math.min(postsCount + booksCount, 50),
            status: 'SYNCHRONIZED',
            lastModified: now.toISOString(),
            priorityCategory: 'Syndication'
        },
        {
            id: 'nouveautes-rss',
            name: 'Flux Nouveautés Livres',
            url: `${baseUrl}/nouveautes.xml`,
            type: 'FEED',
            urlCount: Math.min(booksCount, 30),
            status: 'SYNCHRONIZED',
            lastModified: now.toISOString(),
            priorityCategory: 'Nouveaux Arrivages'
        }
    ]

    const indexNowOverview: IndexNowOverview = {
        key: indexNowKey,
        keyLocation: `${baseUrl}/${indexNowKey}.txt`,
        status: 'ACTIVE',
        lastSubmission: indexNowLog,
        supportedEngines: ['Bing', 'Yandex', 'Seznam', 'Naver']
    }

    return {
        sitemaps,
        googlebotSellersVisit,
        otherBotSellersVisit,
        robotsTxtStatus: {
            declared: true,
            sitemapsCount: 7
        },
        indexNow: indexNowOverview
    }
}

// Action de simulation / test de crawl Googlebot pour l'administrateur
export async function simulateGooglebotVisitAction() {
    try {
        await verifyAdmin()
    } catch {
        throw new Error('Non autorisé')
    }

    const payload = JSON.stringify({
        timestamp: new Date().toISOString(),
        userAgent: 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
        ip: '66.249.66.1 (Simulation Test Admin)',
        crawler: 'Googlebot'
    })

    await prisma.siteSettings.upsert({
        where: { key: 'seo_googlebot_sitemap_sellers_last_visit' },
        create: {
            key: 'seo_googlebot_sitemap_sellers_last_visit',
            value: payload,
            category: 'seo',
            description: 'Dernier passage Googlebot sur sitemap-sellers.xml'
        },
        update: { value: payload }
    })

    revalidatePath('/[locale]/admin/seo', 'page')
    return { success: true }
}

// Action de déclenchement manuel d'une notification IndexNow
export async function triggerIndexNowPingAction(target: 'sellers' | 'community' | 'all') {
    try {
        await verifyAdmin()
    } catch {
        throw new Error('Non autorisé')
    }

    const {
        submitSellerProgramToIndexNow,
        submitCommunityMarketToIndexNow,
        submitUrlsToIndexNow,
        getSiteHost,
    } = await import('@/lib/indexnow')

    let result
    if (target === 'sellers') {
        result = await submitSellerProgramToIndexNow('Ping manuel administrateur (Vendeurs)')
    } else if (target === 'community') {
        result = await submitCommunityMarketToIndexNow(undefined, 'Ping manuel administrateur (Bourse aux livres)')
    } else {
        const host = await getSiteHost()
        const baseUrl = `https://${host}`
        const allUrls = [
            `${baseUrl}/fr/devenir-vendeur`,
            `${baseUrl}/ar/devenir-vendeur`,
            `${baseUrl}/en/devenir-vendeur`,
            `${baseUrl}/fr/b2b`,
            `${baseUrl}/ar/b2b`,
            `${baseUrl}/en/b2b`,
            `${baseUrl}/sitemap-sellers.xml`,
            `${baseUrl}/fr/community/market`,
            `${baseUrl}/ar/community/market`,
            `${baseUrl}/en/community/market`,
            `${baseUrl}/fr/community`,
            `${baseUrl}/ar/community`,
            `${baseUrl}/en/community`,
            `${baseUrl}/sitemap.xml`,
        ]
        result = await submitUrlsToIndexNow(allUrls, 'Ping manuel global administrateur')
    }

    revalidatePath('/[locale]/admin/seo', 'page')
    return result
}
