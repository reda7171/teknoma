import { prisma } from '@/lib/prisma'
import { getSetting } from '@/lib/actions/site-settings'

export const dynamic = 'force-dynamic'

export async function GET() {
    try {
        const siteUrl = await getSetting('site_url') || 'https://riwaya.store'

        // Fetch active books and packs
        const books = await prisma.book.findMany({
            where: { active: true },
            select: {
                id: true,
                title: true,
                description: true,
                price: true,
                image: true,
                stock: true,
                author: true,
            }
        })

        const packs = await prisma.pack.findMany({
            where: { active: true },
            select: {
                id: true,
                name: true,
                description: true,
                price: true,
                image: true,
            }
        })

        const feedDate = new Date().toUTCString()

        // XML Header and Channel
        let xml = `<?xml version="1.0"?>
<rss xmlns:g="http://base.google.com/ns/1.0" version="2.0">
    <channel>
        <title>Riwaya Catalog</title>
        <link>${siteUrl}</link>
        <description>Catalogue des livres et packs Riwaya</description>
`

        // Add Books
        books.forEach((book) => {
            const availability = book.stock > 0 ? 'in stock' : 'out of stock'
            const escapedDesc = (book.description || book.title).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
            const escapedTitle = book.title.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
            const brand = (book.author || 'Riwaya').replace(/&/g, '&amp;')
            
            xml += `        <item>
            <g:id>${book.id}</g:id>
            <g:title>${escapedTitle}</g:title>
            <g:description>${escapedDesc.substring(0, 5000)}</g:description>
            <g:link>${siteUrl}/fr/books/${book.id}</g:link>
            <g:image_link>${book.image.startsWith('http') ? book.image : `${siteUrl}${book.image}`}</g:image_link>
            <g:brand>${brand}</g:brand>
            <g:condition>new</g:condition>
            <g:availability>${availability}</g:availability>
            <g:price>${book.price} MAD</g:price>
        </item>\n`
        })

        // Add Packs
        packs.forEach((pack) => {
            const escapedDesc = (pack.description || pack.name).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
            const escapedTitle = pack.name.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
            
            xml += `        <item>
            <g:id>${pack.id}</g:id>
            <g:title>${escapedTitle}</g:title>
            <g:description>${escapedDesc.substring(0, 5000)}</g:description>
            <g:link>${siteUrl}/fr/packs/${pack.id}</g:link>
            <g:image_link>${pack.image?.startsWith('http') ? pack.image : `${siteUrl}${pack.image}`}</g:image_link>
            <g:brand>Riwaya Packs</g:brand>
            <g:condition>new</g:condition>
            <g:availability>in stock</g:availability>
            <g:price>${pack.price} MAD</g:price>
        </item>\n`
        })

        xml += `    </channel>\n</rss>`

        return new Response(xml, {
            headers: {
                'Content-Type': 'application/xml; charset=utf-8',
                'Cache-Control': 'public, max-age=3600'
            }
        })
    } catch (error) {
        console.error('Erreur Feed XML:', error)
        return new Response('Erreur serveur', { status: 500 })
    }
}
