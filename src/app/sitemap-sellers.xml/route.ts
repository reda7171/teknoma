import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getBaseUrl } from '@/lib/utils'

export const dynamic = 'force-dynamic'
export const revalidate = 3600 // 1 heure

const locales = ['fr', 'ar', 'en']

type SellerProgramRoute = {
    path: string
    changefreq: 'always' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'never'
    priority: number
    getLastMod?: () => Promise<Date | null>
}

export async function GET(request: Request) {
    const baseUrl = getBaseUrl()

    // Détection et enregistrement des crawls Googlebot et autres robots
    try {
        const userAgent = request.headers.get('user-agent') || ''
        const isGooglebot = /googlebot/i.test(userAgent)
        const isBot = isGooglebot || /bot|crawler|spider|bingbot|yandex/i.test(userAgent)

        if (isBot) {
            const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
            const payload = JSON.stringify({
                timestamp: new Date().toISOString(),
                userAgent: userAgent.slice(0, 255),
                ip,
                crawler: isGooglebot ? 'Googlebot' : 'Other Crawler'
            })

            prisma.siteSettings.upsert({
                where: { key: isGooglebot ? 'seo_googlebot_sitemap_sellers_last_visit' : 'seo_bot_sitemap_sellers_last_visit' },
                create: {
                    key: isGooglebot ? 'seo_googlebot_sitemap_sellers_last_visit' : 'seo_bot_sitemap_sellers_last_visit',
                    value: payload,
                    category: 'seo',
                    label: isGooglebot ? 'Dernier passage Googlebot sur sitemap-sellers.xml' : 'Dernier passage Bot sur sitemap-sellers.xml',
                    type: 'text'
                },
                update: { value: payload }
            }).catch(() => null)
        }
    } catch {}

    // Récupérer dynamiquement les dates de dernière mise à jour
    const [latestSellerReq, latestExchangeBook] = await Promise.all([
        prisma.sellerRequest.findFirst({
            orderBy: { updatedAt: 'desc' },
            select: { updatedAt: true },
        }).catch(() => null),
        (prisma as any).exchangeBook.findFirst({
            where: { status: 'AVAILABLE' },
            orderBy: { updatedAt: 'desc' },
            select: { updatedAt: true },
        }).catch(() => null),
    ])

    const now = new Date()
    const sellerLastMod = latestSellerReq?.updatedAt || now
    const exchangeLastMod = latestExchangeBook?.updatedAt || now

    // Routes stratégiques du programme marchands, vendeurs et partenaires
    const routes: SellerProgramRoute[] = [
        {
            path: '/devenir-vendeur',
            changefreq: 'daily',
            priority: 1.0,
            getLastMod: async () => sellerLastMod,
        },
        {
            path: '/b2b',
            changefreq: 'weekly',
            priority: 0.95,
            getLastMod: async () => now,
        },
        {
            path: '/sell-book',
            changefreq: 'daily',
            priority: 0.90,
            getLastMod: async () => exchangeLastMod,
        },
        {
            path: '/community/market',
            changefreq: 'daily',
            priority: 0.90,
            getLastMod: async () => exchangeLastMod,
        },
        {
            path: '/community/market/new',
            changefreq: 'daily',
            priority: 0.85,
            getLastMod: async () => now,
        },
        {
            path: '/join-us',
            changefreq: 'weekly',
            priority: 0.85,
            getLastMod: async () => now,
        },
        {
            path: '/contact',
            changefreq: 'weekly',
            priority: 0.80,
            getLastMod: async () => now,
        },
        {
            path: '/shipping-policy',
            changefreq: 'monthly',
            priority: 0.75,
            getLastMod: async () => now,
        },
        {
            path: '/return-policy',
            changefreq: 'monthly',
            priority: 0.75,
            getLastMod: async () => now,
        },
        {
            path: '/terms',
            changefreq: 'monthly',
            priority: 0.70,
            getLastMod: async () => now,
        },
    ]

    const entries: string[] = []

    for (const route of routes) {
        const lastModDate = route.getLastMod ? await route.getLastMod() : now
        const lastModStr = (lastModDate || now).toISOString()

        for (const locale of locales) {
            const locUrl = `${baseUrl}/${locale}${route.path}`
            const alternateLinks = locales
                .map((altLocale) => `    <xhtml:link rel="alternate" hreflang="${altLocale}" href="${baseUrl}/${altLocale}${route.path}" />`)
                .join('\n')
            const xDefaultLink = `    <xhtml:link rel="alternate" hreflang="x-default" href="${baseUrl}/fr${route.path}" />`

            entries.push(`  <url>
    <loc>${locUrl}</loc>
${alternateLinks}
${xDefaultLink}
    <lastmod>${lastModStr}</lastmod>
    <changefreq>${route.changefreq}</changefreq>
    <priority>${route.priority.toFixed(2)}</priority>
  </url>`)
        }
    }

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xhtml="http://www.w3.org/1999/xhtml">
${entries.join('\n')}
</urlset>`

    return new NextResponse(xml, {
        headers: {
            'Content-Type': 'application/xml; charset=utf-8',
            'Cache-Control': 'public, max-age=3600, s-maxage=3600, stale-while-revalidate=86400',
        },
    })
}

