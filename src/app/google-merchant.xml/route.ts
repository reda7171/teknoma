import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

function escapeXml(unsafe: string) {
    if (!unsafe) return ''
    return unsafe.replace(/[<>&'"]/g, function (c) {
        switch (c) {
            case '<': return '&lt;'
            case '>': return '&gt;'
            case '&': return '&amp;'
            case '\'': return '&apos;'
            case '"': return '&quot;'
            default: return c
        }
    })
}

export async function GET() {
    try {
        const books = await prisma.book.findMany({
            where: { active: true }
        })

        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://riwaya.store'

        let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`
        xml += `<rss xmlns:g="http://base.google.com/ns/1.0" version="2.0">\n`
        xml += `  <channel>\n`
        xml += `    <title>Riwaya</title>\n`
        xml += `    <link>${baseUrl}</link>\n`
        xml += `    <description>Riwaya Bookstore - The best books available.</description>\n`

        for (const book of books) {
            const productUrl = `${baseUrl}/${book.language}/books/${book.id}`
            const imageUrl = book.image?.startsWith('http') ? book.image : `${baseUrl}${book.image}`
            const availability = book.stock > 0 ? 'in_stock' : 'out_of_stock'
            const condition = book.isOriginal ? 'new' : 'used'
            
            xml += `    <item>\n`
            xml += `      <g:id>${escapeXml(book.id)}</g:id>\n`
            xml += `      <g:title>${escapeXml(book.title)}</g:title>\n`
            xml += `      <g:description>${escapeXml(book.description.slice(0, 5000))}</g:description>\n`
            xml += `      <g:link>${escapeXml(productUrl)}</g:link>\n`
            xml += `      <g:image_link>${escapeXml(imageUrl)}</g:image_link>\n`
            xml += `      <g:condition>${condition}</g:condition>\n`
            xml += `      <g:availability>${availability}</g:availability>\n`
            xml += `      <g:price>${book.price} MAD</g:price>\n`
            xml += `      <g:brand>${escapeXml(book.author)}</g:brand>\n`
            
            if (book.isbn) {
                xml += `      <g:gtin>${escapeXml(book.isbn)}</g:gtin>\n`
            }
            
            if (book.category) {
                xml += `      <g:product_type>${escapeXml(book.category)}</g:product_type>\n`
            }

            xml += `    </item>\n`
        }

        xml += `  </channel>\n`
        xml += `</rss>`

        return new NextResponse(xml, {
            status: 200,
            headers: {
                'Content-Type': 'application/xml; charset=utf-8',
                'Cache-Control': 's-maxage=86400, stale-while-revalidate'
            }
        })
    } catch (error) {
        console.error('Error generating Google Merchant feed:', error)
        return new NextResponse('Internal Server Error', { status: 500 })
    }
}
