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

        const [books, posts] = await Promise.all([
            prisma.book.findMany({
                where: { active: true },
                orderBy: { createdAt: 'desc' },
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
            }),
            prisma.post.findMany({
                where: { published: true },
                orderBy: { publishedAt: 'desc' },
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
                    updatedAt: true,
                    author: { select: { fullName: true } },
                },
            }),
        ])

        type AtomEntry = {
            title: string
            link: string
            id: string
            updated: Date
            summary: string
            author: string
            category: string
        }

        const entries: AtomEntry[] = []

        for (const book of books) {
            const localizedTitle = getLocalizedTitle(book, 'fr') || book.title || 'Livre PetsUnivers'
            const localizedDesc = cleanDescription(getLocalizedDescription(book, 'fr') || book.description)
            const bookUrl = `${baseUrl}/fr${generateBookUrl(book, 'fr')}`

            entries.push({
                title: localizedTitle,
                link: bookUrl,
                id: `${baseUrl}/books/${book.id}`,
                updated: book.updatedAt || book.createdAt || new Date(),
                summary: `${localizedDesc}${book.price ? ` (Prix: ${book.price} MAD)` : ''}`,
                author: book.author || 'PetsUnivers',
                category: book.category || 'Livres',
            })
        }

        for (const post of posts) {
            const postLang = post.language || 'fr'
            const postUrl = `${baseUrl}/${postLang}/blog/${post.slug}`
            const desc = cleanDescription(post.excerpt || post.content)

            entries.push({
                title: post.title,
                link: postUrl,
                id: `${baseUrl}/blog/${post.slug}`,
                updated: post.updatedAt || post.publishedAt || post.createdAt || new Date(),
                summary: desc,
                author: post.author?.fullName || 'PetsUnivers',
                category: post.category || 'Blog',
            })
        }

        entries.sort((a, b) => b.updated.getTime() - a.updated.getTime())

        const feedUpdated = entries.length > 0 ? entries[0].updated.toISOString() : new Date().toISOString()

        const xmlEntries = entries
            .map((e) => `  <entry>
    <title>${escapeXml(e.title)}</title>
    <link href="${escapeXml(e.link)}"/>
    <id>${escapeXml(e.id)}</id>
    <updated>${e.updated.toISOString()}</updated>
    <summary>${escapeXml(e.summary)}</summary>
    <author>
      <name>${escapeXml(e.author)}</name>
    </author>
    <category term="${escapeXml(e.category)}"/>
  </entry>`)
            .join('\n')

        const atomXml = `<?xml version="1.0" encoding="utf-8"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <title>PetsUnivers | Nouveaux Livres et Articles</title>
  <subtitle>Derniers livres et articles publiés sur la librairie PetsUnivers au Maroc</subtitle>
  <link href="${baseUrl}/atom.xml" rel="self" type="application/atom+xml"/>
  <link href="${baseUrl}/"/>
  <id>${baseUrl}/</id>
  <updated>${feedUpdated}</updated>
${xmlEntries}
</feed>`

        return new NextResponse(atomXml, {
            status: 200,
            headers: {
                'Content-Type': 'application/atom+xml; charset=utf-8',
                'Cache-Control': 'public, max-age=1800, s-maxage=1800, stale-while-revalidate=86400',
            },
        })
    } catch (error) {
        console.error('Erreur lors de la génération du flux Atom:', error)
        return new NextResponse('Internal Server Error', { status: 500 })
    }
}
