import { prisma } from '@/lib/prisma'
import { generateBookUrl, getLocalizedDescription, getLocalizedTitle } from '@/lib/i18n-utils'
import { getBaseUrl, normalizeImage } from '@/lib/utils'

function escapeXml(value: string | null | undefined): string {
    return (value || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;')
}

function plainText(value: string | null | undefined): string {
    return (value || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 500)
}

async function getNewestBooks() {
    return prisma.book.findMany({
        where: { active: true },
        orderBy: { createdAt: 'desc' },
        take: 100,
        select: {
            id: true,
            title: true,
            titleFr: true,
            titleEn: true,
            description: true,
            descriptionFr: true,
            descriptionEn: true,
            author: true,
            category: true,
            image: true,
            price: true,
            createdAt: true,
            updatedAt: true,
        },
    })
}

export async function buildNewBooksRss(): Promise<string> {
    const baseUrl = getBaseUrl()
    const books = await getNewestBooks()
    const lastBuildDate = (books[0]?.createdAt || new Date()).toUTCString()
    const items = books.map(book => {
        const url = `${baseUrl}/fr${generateBookUrl(book, 'fr')}`
        const title = getLocalizedTitle(book, 'fr') || book.title
        const description = plainText(getLocalizedDescription(book, 'fr') || book.description)
        const normalizedImage = normalizeImage(book.image)
        const image = normalizedImage.startsWith('http') ? normalizedImage : `${baseUrl}${normalizedImage}`

        return `    <item>
      <title>${escapeXml(title)}</title>
      <link>${escapeXml(url)}</link>
      <guid isPermaLink="true">${escapeXml(url)}</guid>
      <pubDate>${book.createdAt.toUTCString()}</pubDate>
      <dc:creator>${escapeXml(book.author || 'Tekno Store')}</dc:creator>
      <category>${escapeXml(book.category || 'Livres')}</category>
      <description>${escapeXml(`${description} — ${book.price} MAD`)}</description>
      <media:content url="${escapeXml(image)}" medium="image" />
    </item>`
    }).join('\n')

    return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:media="http://search.yahoo.com/mrss/">
  <channel>
    <title>Tekno Store — Nouveaux livres</title>
    <link>${baseUrl}/fr/books</link>
    <description>Les derniers livres ajoutés à la librairie Tekno Store au Maroc.</description>
    <language>fr-MA</language>
    <lastBuildDate>${lastBuildDate}</lastBuildDate>
    <atom:link href="${baseUrl}/nouveautes.xml" rel="self" type="application/rss+xml" />
${items}
  </channel>
</rss>`
}

export async function buildNewBooksAtom(): Promise<string> {
    const baseUrl = getBaseUrl()
    const books = await getNewestBooks()
    const updated = (books[0]?.updatedAt || books[0]?.createdAt || new Date()).toISOString()
    const entries = books.map(book => {
        const url = `${baseUrl}/fr${generateBookUrl(book, 'fr')}`
        const title = getLocalizedTitle(book, 'fr') || book.title
        const summary = plainText(getLocalizedDescription(book, 'fr') || book.description)

        return `  <entry>
    <title>${escapeXml(title)}</title>
    <link href="${escapeXml(url)}" rel="alternate" />
    <id>${escapeXml(url)}</id>
    <published>${book.createdAt.toISOString()}</published>
    <updated>${book.updatedAt.toISOString()}</updated>
    <author><name>${escapeXml(book.author || 'Tekno Store')}</name></author>
    <category term="${escapeXml(book.category || 'Livres')}" />
    <summary>${escapeXml(`${summary} — ${book.price} MAD`)}</summary>
  </entry>`
    }).join('\n')

    return `<?xml version="1.0" encoding="UTF-8"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <title>Tekno Store — Nouveaux livres</title>
  <subtitle>Les derniers livres ajoutés à la librairie Tekno Store au Maroc.</subtitle>
  <link href="${baseUrl}/nouveautes.atom" rel="self" type="application/atom+xml" />
  <link href="${baseUrl}/fr/books" rel="alternate" />
  <id>${baseUrl}/nouveautes.atom</id>
  <updated>${updated}</updated>
${entries}
</feed>`
}
