import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { generateBookUrl, getLocalizedTitle, getLocalizedDescription } from '@/lib/i18n-utils'
import { getBaseUrl, normalizeImage } from '@/lib/utils'

export const dynamic = 'force-dynamic'
export const revalidate = 1800 // 30 minutes

function escapeXml(unsafe: string | null | undefined): string {
    if (!unsafe) return ''
    return unsafe
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;')
}

function cleanDescription(text: string | null | undefined, maxLength: number = 300): string {
    if (!text) return ''
    const clean = text
        .replace(/<[^>]*>/g, ' ')
        .replace(/&nbsp;/gi, ' ')
        .replace(/\s+/g, ' ')
        .trim()
    return clean.length > maxLength ? clean.slice(0, maxLength) + '…' : clean
}

export async function GET() {
    try {
        const baseUrl = getBaseUrl()

        // 1. Récupérer les derniers livres actifs
        const books = await prisma.book.findMany({
            where: {
                active: true,
            },
            orderBy: {
                createdAt: 'desc',
            },
            take: 40,
            select: {
                id: true,
                title: true,
                titleFr: true,
                titleEn: true,
                author: true,
                description: true,
                descriptionFr: true,
                price: true,
                image: true,
                category: true,
                createdAt: true,
                updatedAt: true,
            },
        })

        // 2. Récupérer les derniers articles de blog publiés
        const posts = await prisma.post.findMany({
            where: {
                published: true,
            },
            orderBy: {
                publishedAt: 'desc',
            },
            take: 20,
            select: {
                id: true,
                title: true,
                slug: true,
                excerpt: true,
                content: true,
                coverImage: true,
                category: true,
                language: true,
                publishedAt: true,
                createdAt: true,
                author: {
                    select: {
                        fullName: true,
                    },
                },
            },
        })

        type FeedItem = {
            title: string
            link: string
            guid: string
            pubDate: Date
            author: string
            category: string
            description: string
            imageUrl?: string
        }

        const items: FeedItem[] = []

        // Formater les livres
        for (const book of books) {
            const localizedTitle = getLocalizedTitle(book, 'fr') || book.title || 'Livre Riwaya'
            const localizedDesc = cleanDescription(getLocalizedDescription(book, 'fr') || book.description)
            const bookUrl = `${baseUrl}/fr${generateBookUrl(book, 'fr')}`
            const normalizedImg = normalizeImage(book.image)
            const imageUrl = normalizedImg.startsWith('http')
                ? normalizedImg
                : normalizedImg.startsWith('/')
                    ? `${baseUrl}${normalizedImg}`
                    : undefined

            items.push({
                title: localizedTitle,
                link: bookUrl,
                guid: `${baseUrl}/books/${book.id}`,
                pubDate: book.createdAt || new Date(),
                author: book.author || 'Riwaya',
                category: book.category || 'Livres',
                description: `${localizedDesc}${book.price ? ` — Prix: ${book.price} MAD` : ''}`,
                imageUrl,
            })
        }

        // Formater les articles de blog
        for (const post of posts) {
            const postLang = post.language || 'fr'
            const postUrl = `${baseUrl}/${postLang}/blog/${post.slug}`
            const desc = cleanDescription(post.excerpt || post.content)
            const normalizedImg = normalizeImage(post.coverImage)
            const imageUrl = normalizedImg.startsWith('http')
                ? normalizedImg
                : normalizedImg.startsWith('/')
                    ? `${baseUrl}${normalizedImg}`
                    : undefined

            items.push({
                title: post.title,
                link: postUrl,
                guid: `${baseUrl}/blog/${post.slug}`,
                pubDate: post.publishedAt || post.createdAt || new Date(),
                author: post.author?.fullName || 'Équipe Riwaya',
                category: post.category || 'Blog Littéraire',
                description: desc,
                imageUrl,
            })
        }

        // Trier l'ensemble du flux par date décroissante
        items.sort((a, b) => b.pubDate.getTime() - a.pubDate.getTime())

        const latestBuildDate = items.length > 0 ? items[0].pubDate.toUTCString() : new Date().toUTCString()

        const xmlItems = items
            .map((item) => {
                const enclosureTag = item.imageUrl
                    ? `\n      <enclosure url="${escapeXml(item.imageUrl)}" length="0" type="image/jpeg" />`
                    : ''
                const mediaTag = item.imageUrl
                    ? `\n      <media:content url="${escapeXml(item.imageUrl)}" medium="image" />`
                    : ''

                return `    <item>
      <title>${escapeXml(item.title)}</title>
      <link>${escapeXml(item.link)}</link>
      <guid isPermaLink="true">${escapeXml(item.guid)}</guid>
      <pubDate>${item.pubDate.toUTCString()}</pubDate>
      <dc:creator>${escapeXml(item.author)}</dc:creator>
      <category>${escapeXml(item.category)}</category>
      <description><![CDATA[${item.description}]]></description>${enclosureTag}${mediaTag}
    </item>`
            })
            .join('\n')

        const rssXml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" 
     xmlns:atom="http://www.w3.org/2005/Atom" 
     xmlns:dc="http://purl.org/dc/elements/1.1/" 
     xmlns:media="http://search.yahoo.com/mrss/">
  <channel>
    <title>Riwaya | Nouveaux Livres et Articles</title>
    <link>${baseUrl}</link>
    <description>Flux officiel de la librairie Riwaya au Maroc. Nouveaux livres, romans, packs et articles du blog littéraire.</description>
    <language>fr</language>
    <lastBuildDate>${latestBuildDate}</lastBuildDate>
    <atom:link href="${baseUrl}/feed.xml" rel="self" type="application/rss+xml"/>
    <image>
      <url>${baseUrl}/logo.png</url>
      <title>Riwaya</title>
      <link>${baseUrl}</link>
    </image>
${xmlItems}
  </channel>
</rss>`

        return new NextResponse(rssXml, {
            status: 200,
            headers: {
                'Content-Type': 'application/xml; charset=utf-8',
                'Cache-Control': 'public, max-age=1800, s-maxage=1800, stale-while-revalidate=86400',
            },
        })
    } catch (error) {
        console.error('Erreur lors de la génération du flux RSS:', error)
        return new NextResponse('Internal Server Error', { status: 500 })
    }
}
