import { MetadataRoute } from 'next'
import { prisma } from '@/lib/prisma'

const locales = ['fr', 'ar', 'en']
const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_BASE_URL || 'https://riwaya.store'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
    // 1. Pages statiques
    const staticPages = [
        { path: '', priority: 1.0, freq: 'daily' as const },
        { path: '/books', priority: 0.9, freq: 'daily' as const },
        { path: '/packs', priority: 0.9, freq: 'daily' as const },
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
        { path: '/return-policy', priority: 0.4, freq: 'yearly' as const },
    ]

    const staticUrls = locales.flatMap((locale) =>
        staticPages.map((page) => ({
            url: `${baseUrl}/${locale}${page.path}`,
            lastModified: new Date(),
            changeFrequency: page.freq,
            priority: page.priority,
        }))
    )

    // 2. Livres dynamiques
    let bookUrls: any[] = []
    try {
        const books = await prisma.book.findMany({
            select: { id: true, updatedAt: true }
        })
        bookUrls = locales.flatMap((locale) =>
            books.map((book) => ({
                url: `${baseUrl}/${locale}/books/${book.id}`,
                lastModified: book.updatedAt,
                changeFrequency: 'weekly' as const,
                priority: 0.7,
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
            select: { slug: true, updatedAt: true }
        })
        postUrls = locales.flatMap((locale) =>
            posts.map((post) => ({
                url: `${baseUrl}/${locale}/blog/${post.slug}`,
                lastModified: post.updatedAt,
                changeFrequency: 'weekly' as const,
                priority: 0.6,
            }))
        )
    } catch (e) {
        console.warn('⚠️ Sitemaps: Could not fetch posts during build')
    }

    // 4. Packs dynamiques
    let packUrls: any[] = []
    try {
        const packs = await prisma.pack.findMany({
            where: { active: true },
            select: { id: true }
        })
        packUrls = locales.flatMap((locale) =>
            packs.map((pack) => ({
                url: `${baseUrl}/${locale}/packs/${pack.id}`,
                lastModified: new Date(),
                changeFrequency: 'weekly' as const,
                priority: 0.7,
            }))
        )
    } catch (e) {
        console.warn('⚠️ Sitemaps: Could not fetch packs during build')
    }

    // 5. Auteurs dynamiques (récupérés depuis les livres)
    let authorUrls: any[] = []
    try {
        const authors = await prisma.book.findMany({
            where: { active: true },
            select: { author: true },
            distinct: ['author']
        })
        authorUrls = locales.flatMap((locale) =>
            authors.filter(a => a.author).map((a) => ({
                url: `${baseUrl}/${locale}/authors/${encodeURIComponent(a.author)}`,
                lastModified: new Date(),
                changeFrequency: 'weekly' as const,
                priority: 0.6,
            }))
        )
    } catch (e) {
        console.warn('⚠️ Sitemaps: Could not fetch authors during build')
    }

    return [...staticUrls, ...bookUrls, ...postUrls, ...packUrls, ...authorUrls]
}
