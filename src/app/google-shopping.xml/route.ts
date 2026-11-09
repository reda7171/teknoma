import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getBaseUrl } from '@/lib/utils'

export const dynamic = 'force-dynamic'
export const revalidate = 3600 // 1 heure

function escapeXml(unsafe: string | null | undefined): string {
    if (!unsafe) return ''
    return unsafe
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;')
}

function cleanDescription(text: string | null | undefined, maxLength: number = 1000): string {
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

        // 1. Livres actifs
        const books = await prisma.book.findMany({
            where: { active: true },
            select: {
                id: true,
                title: true,
                author: true,
                description: true,
                price: true,
                stock: true,
                image: true,
                category: true,
                isbn: true,
                sellerSku: true,
                condition: true,
                createdAt: true,
            },
            orderBy: { createdAt: 'desc' },
            take: 500,
        })

        // 2. Packs actifs
        const packs = await prisma.pack.findMany({
            where: { active: true },
            include: {
                books: {
                    include: {
                        book: {
                            select: { title: true, author: true, image: true, stock: true }
                        }
                    }
                }
            },
            take: 100,
        })

        let itemsXml = ''

        // Formatage des Livres pour Google Merchant Center
        for (const book of books) {
            const link = `${baseUrl}/fr/books/${book.id}`
            const safeImg = book.image
                ? (book.image.startsWith('http') ? book.image : `${baseUrl}${book.image}`)
                : `${baseUrl}/images/og-books.png`

            const validIsbn = book.isbn ? book.isbn.replace(/[^0-9X]/gi, '') : null
            const hasGtin = validIsbn && (validIsbn.length === 10 || validIsbn.length === 13)
            const cleanDesc = cleanDescription(book.description) || `Achetez ${book.title} par ${book.author} sur Riwaya. Livraison express partout au Maroc avec paiement à la livraison (COD).`
            const isUsed = book.condition === 'USED' || book.condition === 'GOOD'
            const inStock = book.stock > 0

            itemsXml += `
        <item>
            <g:id>${escapeXml(book.sellerSku || book.id)}</g:id>
            <g:title>${escapeXml(book.title)} - ${escapeXml(book.author)}</g:title>
            <g:description>${escapeXml(cleanDesc)}</g:description>
            <g:link>${link}</g:link>
            <g:image_link>${escapeXml(safeImg)}</g:image_link>
            <g:availability>${inStock ? 'in_stock' : 'out_of_stock'}</g:availability>
            <g:price>${book.price.toFixed(2)} MAD</g:price>
            <g:google_product_category>Media &gt; Books &gt; Print Books</g:google_product_category>
            <g:product_type>${escapeXml(book.category || 'Livres')}</g:product_type>
            <g:brand>${escapeXml(book.author || 'Riwaya Édition')}</g:brand>
            <g:condition>${isUsed ? 'used' : 'new'}</g:condition>
            ${hasGtin ? `<g:gtin>${validIsbn}</g:gtin>` : '<g:identifier_exists>no</g:identifier_exists>'}
            <g:shipping>
                <g:country>MA</g:country>
                <g:service>Livraison Standard Maroc</g:service>
                <g:price>30.00 MAD</g:price>
            </g:shipping>
        </item>`
        }

        // Formatage des Packs pour Google Merchant Center
        for (const pack of packs) {
            const link = `${baseUrl}/fr/packs/${pack.id}`
            const firstImg = pack.image || (pack.books[0]?.book?.image) || '/images/placeholder-pack.jpg'
            const safeImg = firstImg.startsWith('http') ? firstImg : `${baseUrl}${firstImg}`
            const bookTitles = pack.books.map(b => b.book.title).join(', ')
            const cleanDesc = cleanDescription(pack.description) || `Pack littéraire exclusif contenant : ${bookTitles}. Économisez avec livraison COD au Maroc.`
            const hasStock = pack.books.every(b => b.book.stock > 0)

            itemsXml += `
        <item>
            <g:id>PACK-${escapeXml(pack.id)}</g:id>
            <g:title>Pack ${escapeXml(pack.name)} (${pack.books.length} Livres)</g:title>
            <g:description>${escapeXml(cleanDesc)}</g:description>
            <g:link>${link}</g:link>
            <g:image_link>${escapeXml(safeImg)}</g:image_link>
            <g:availability>${hasStock ? 'in_stock' : 'out_of_stock'}</g:availability>
            <g:price>${pack.price.toFixed(2)} MAD</g:price>
            <g:google_product_category>Media &gt; Books &gt; Print Books</g:google_product_category>
            <g:product_type>Packs Littéraires</g:product_type>
            <g:brand>Riwaya</g:brand>
            <g:condition>new</g:condition>
            <g:is_bundle>yes</g:is_bundle>
            <g:identifier_exists>no</g:identifier_exists>
            <g:shipping>
                <g:country>MA</g:country>
                <g:service>Livraison Standard Maroc</g:service>
                <g:price>30.00 MAD</g:price>
            </g:shipping>
        </item>`
        }

        const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">
    <channel>
        <title>Riwaya - Flux Google Shopping &amp; Merchant Center</title>
        <link>${baseUrl}</link>
        <description>Catalogue des livres et packs littéraires au Maroc avec paiement à la livraison (COD)</description>
        <language>fr</language>
        ${itemsXml}
    </channel>
</rss>`

        return new NextResponse(xml, {
            headers: {
                'Content-Type': 'application/xml; charset=utf-8',
                'Cache-Control': 'public, max-age=3600, s-maxage=3600, stale-while-revalidate=86400',
            },
        })
    } catch (error) {
        console.error('Erreur génération flux Google Shopping:', error)
        return new NextResponse('<error>Failed to generate Google Shopping feed</error>', {
            status: 500,
            headers: { 'Content-Type': 'application/xml' },
        })
    }
}

