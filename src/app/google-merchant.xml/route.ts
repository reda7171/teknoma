import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { generateBookUrl } from '@/lib/i18n-utils'

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
        
        const now = new Date()
        const allCoupons = await prisma.coupon.findMany({
            where: { isActive: true }
        })
        const coupons = allCoupons.filter(c => !c.expiresAt || c.expiresAt >= now)

        // Utiliser directement l'URL de production pour éviter les problèmes de compilation locale
        const baseUrl = 'https://www.riwaya.store'

        let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`
        xml += `<rss xmlns:g="http://base.google.com/ns/1.0" version="2.0">\n`
        xml += `  <channel>\n`
        xml += `    <title>Riwaya</title>\n`
        xml += `    <link>${baseUrl}</link>\n`
        xml += `    <description>Riwaya Bookstore - The best books available.</description>\n`

        for (const book of books) {
            const locale = book.language === 'en' || book.language === 'fr' ? book.language : 'ar'
            const productUrl = `${baseUrl}/${locale}${generateBookUrl(book, locale)}`
            const imageUrl = `${baseUrl}/api/merchant-image/${book.id}`
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
            xml += `      <g:price>${Number(book.price).toFixed(2)} MAD</g:price>\n`
            xml += `      <g:brand>${escapeXml(book.author || 'Riwaya')}</g:brand>\n`
            
            const cleanIsbn = book.isbn ? book.isbn.replace(/\D/g, '') : '';
            if (cleanIsbn && [8, 12, 13, 14].includes(cleanIsbn.length)) {
                xml += `      <g:gtin>${cleanIsbn}</g:gtin>\n`
            } else {
                xml += `      <g:identifier_exists>no</g:identifier_exists>\n`
            }
            
            if (book.category) {
                xml += `      <g:product_type>${escapeXml(book.category)}</g:product_type>\n`
            }

            // Map all active promotions to every product
            if (coupons && coupons.length > 0) {
                for (const coupon of coupons) {
                    xml += `      <g:promotion_id>${escapeXml(coupon.code)}</g:promotion_id>\n`
                }
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
