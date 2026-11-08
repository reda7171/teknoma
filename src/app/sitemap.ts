import { MetadataRoute } from 'next'
import { prisma } from '@/lib/prisma'
import { generateBookUrl } from '@/lib/i18n-utils'
import { isFeatureEnabled } from '@/lib/server/site-settings'

export const revalidate = 3600

const locales = ['fr', 'ar', 'en']
const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_BASE_URL || 'https://riwaya.store'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
    const sellerEnabled = await isFeatureEnabled('feature_seller').catch(() => true)

    // 1. Pages statiques
    const staticPages = [
        { path: '', priority: 1.0, freq: 'daily' as const },
        { path: '/books', priority: 0.9, freq: 'daily' as const },
        { path: '/books?usedOnly=true', priority: 0.85, freq: 'daily' as const },
        { path: '/packs', priority: 0.9, freq: 'daily' as const },
        { path: '/jeux-societe', priority: 0.85, freq: 'daily' as const },
        { path: '/mon-enfant', priority: 0.85, freq: 'daily' as const },
        { path: '/blog', priority: 0.9, freq: 'daily' as const },
        { path: '/faq', priority: 0.85, freq: 'weekly' as const },
        { path: '/about', priority: 0.8, freq: 'monthly' as const },
        { path: '/contact', priority: 0.7, freq: 'monthly' as const },
        { path: '/guides', priority: 0.8, freq: 'weekly' as const },
        { path: '/authors', priority: 0.75, freq: 'weekly' as const },
        { path: '/privacy', priority: 0.3, freq: 'yearly' as const },
        { path: '/terms', priority: 0.3, freq: 'yearly' as const },
        { path: '/tracking', priority: 0.5, freq: 'weekly' as const },
        { path: '/livraison', priority: 0.6, freq: 'monthly' as const },
        { path: '/livraison-internationale', priority: 0.9, freq: 'weekly' as const },
        { path: '/community/market', priority: 0.85, freq: 'daily' as const },
        ...(sellerEnabled ? [{ path: '/devenir-vendeur', priority: 0.7, freq: 'monthly' as const }] : []),
    ]

    const staticUrls = locales.flatMap((locale) =>
        staticPages.map((page) => ({
            url: `${baseUrl}/${locale}${page.path}`,
            lastModified: new Date(),
            changeFrequency: page.freq,
            priority: page.priority,
        }))
    )

    // 2. Livres dynamiques actifs (triés du plus récent au plus ancien)
    let bookUrls: any[] = []
    try {
        const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
        const books = await prisma.book.findMany({
            where: { active: true },
            select: { id: true, title: true, titleFr: true, titleEn: true, updatedAt: true },
            orderBy: { updatedAt: 'desc' }
        })
        bookUrls = locales.flatMap((locale) =>
            books.map((book) => ({
                url: `${baseUrl}/${locale}${generateBookUrl(book, locale)}`,
                lastModified: book.updatedAt,
                changeFrequency: book.updatedAt > thirtyDaysAgo ? ('daily' as const) : ('weekly' as const),
                priority: book.updatedAt > thirtyDaysAgo ? 0.85 : 0.75,
            }))
        )
    } catch (e) {
        console.warn('⚠️ Sitemaps: Could not fetch books during build')
    }

    // 3. Articles de blog dynamiques
    let postUrls: any[] = []
    try {
        const posts = await prisma.post.findMany({
            where: { published: true },
            select: { slug: true, updatedAt: true },
            orderBy: { updatedAt: 'desc' }
        })
        postUrls = locales.flatMap((locale) =>
            posts.map((post) => ({
                url: `${baseUrl}/${locale}/blog/${post.slug}`,
                lastModified: post.updatedAt,
                changeFrequency: 'weekly' as const,
                priority: 0.7,
            }))
        )
    } catch (e) {
        console.warn('⚠️ Sitemaps: Could not fetch posts during build')
    }

    // 4. Packs dynamiques actifs
    let packUrls: any[] = []
    try {
        const packs = await prisma.pack.findMany({
            where: { active: true },
            select: { id: true, updatedAt: true },
            orderBy: { updatedAt: 'desc' }
        })
        packUrls = locales.flatMap((locale) =>
            packs.map((pack) => ({
                url: `${baseUrl}/${locale}/packs/${pack.id}`,
                lastModified: pack.updatedAt,
                changeFrequency: 'daily' as const,
                priority: 0.9,
            }))
        )
    } catch (e) {
        console.warn('⚠️ Sitemaps: Could not fetch packs during build')
    }

    // 5. Auteurs dynamiques (récupérés depuis les livres actifs)
    let authorUrls: any[] = []
    try {
        const authors = await prisma.book.findMany({
            where: { active: true },
            select: { author: true, updatedAt: true },
            orderBy: { updatedAt: 'desc' }
        })
        const authorMap = new Map<string, Date>()
        for (const a of authors) {
            if (a.author && !authorMap.has(a.author)) {
                authorMap.set(a.author, a.updatedAt)
            }
        }
        authorUrls = locales.flatMap((locale) =>
            Array.from(authorMap.entries()).map(([authorName, updatedAt]) => ({
                url: `${baseUrl}/${locale}/authors/${encodeURIComponent(authorName)}`,
                lastModified: updatedAt,
                changeFrequency: 'weekly' as const,
                priority: 0.7,
            }))
        )
    } catch (e) {
        console.warn('⚠️ Sitemaps: Could not fetch authors during build')
    }

    // 6. Catégories SEO dynamiques
    let seoUrls: any[] = []
    try {
        const seoPages = await prisma.seoCategory.findMany({
            where: { isActive: true },
            select: { slug: true, updatedAt: true },
            orderBy: { updatedAt: 'desc' }
        })
        seoUrls = locales.flatMap((locale) =>
            seoPages.map((page) => ({
                url: `${baseUrl}/${locale}/collection/${page.slug}`,
                lastModified: page.updatedAt,
                changeFrequency: 'daily' as const,
                priority: 0.9,
            }))
        )
    } catch (e) {
        console.warn('⚠️ Sitemaps: Could not fetch seo categories during build')
    }

    // 7. Livres d'échange communautaires (disponibles pour le troc)
    let exchangeBookUrls: any[] = []
    try {
        const exchangeBooks = await (prisma as any).exchangeBook.findMany({
            where: { status: 'AVAILABLE' },
            select: { id: true, updatedAt: true },
            orderBy: { updatedAt: 'desc' },
            take: 200
        })
        exchangeBookUrls = locales.flatMap((locale) =>
            exchangeBooks.map((b: any) => ({
                url: `${baseUrl}/${locale}/community/market/${b.id}`,
                lastModified: b.updatedAt,
                changeFrequency: 'weekly' as const,
                priority: 0.75,
            }))
        )
    } catch (e) {
        console.warn('⚠️ Sitemaps: Could not fetch exchange books during build')
    }

    return [...staticUrls, ...bookUrls, ...postUrls, ...packUrls, ...authorUrls, ...seoUrls, ...exchangeBookUrls]
}
