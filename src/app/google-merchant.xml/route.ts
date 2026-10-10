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

function merchantReturnsXml(itemCondition: 'NEW' | 'USED', baseUrl: string) {
    return `      <g:returns>
        <g:country>MA</g:country>
        <g:item_condition>${itemCondition}</g:item_condition>
        <g:window_days>3</g:window_days>
        <g:window_type>FINITE_RETURN_WINDOW</g:window_type>
        <g:method>BY_MAIL</g:method>
        <g:outcome>REFUND</g:outcome>
        <g:shipping_fee>35.00 MAD</g:shipping_fee>
        <g:shipping_fee_type>CUSTOMER_RESPONSIBILITY</g:shipping_fee_type>
        <g:policy_url>${baseUrl}/fr/return-policy</g:policy_url>
      </g:returns>
`
}

export async function GET() {
    try {
        const books = await prisma.book.findMany({
            where: { active: true }
        })
        
        const packs = await prisma.pack.findMany({
            where: { active: true },
            include: { books: { include: { book: true } } }
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
            const productUrl = encodeURI(`${baseUrl}/${locale}${generateBookUrl(book, locale)}`)
            // Version the URL when the generated asset changes so Google does
            // not keep serving the former 500x500 image from its cache.
            const imageUrl = encodeURI(`${baseUrl}/api/merchant-image/${book.id}?v=1500`)
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
            if (cleanIsbn && [8, 10, 12, 13, 14].includes(cleanIsbn.length)) {
                xml += `      <g:gtin>${cleanIsbn}</g:gtin>\n`
            } else {
                xml += `      <g:identifier_exists>no</g:identifier_exists>\n`
            }

            xml += `      <g:google_product_category>543543</g:google_product_category>\n`
            if (book.category) {
                xml += `      <g:product_type>${escapeXml(book.category)}</g:product_type>\n`
            }

            xml += `      <g:shipping>\n`
            xml += `        <g:country>MA</g:country>\n`
            xml += `        <g:service>Livraison Express COD Maroc (24-48h)</g:service>\n`
            xml += `        <g:price>35.00 MAD</g:price>\n`
            xml += `      </g:shipping>\n`
            xml += merchantReturnsXml(condition === 'new' ? 'NEW' : 'USED', baseUrl)

            // Map all active promotions to every product
            if (coupons && coupons.length > 0) {
                for (const coupon of coupons) {
                    xml += `      <g:promotion_id>${escapeXml(coupon.code)}</g:promotion_id>\n`
                }
            }

            xml += `    </item>\n`
        }
        
        // Ajouter les packs au catalogue Google Merchant
        for (const pack of packs) {
            const locale = 'fr' // Par défaut on utilise la version fr pour les packs
            const productUrl = `${baseUrl}/${locale}/packs/${pack.id}`
            const imageUrl = `${baseUrl}/api/merchant-pack-image/${pack.id}?v=1500`
            const allInStock = pack.books.length > 0 && pack.books.every(pb => (pb.book?.stock ?? 0) > 0)
            const availability = allInStock ? 'in_stock' : 'out_of_stock'
            const condition = 'new'
            const title = `Pack ${pack.name} (${pack.books.length} Livres)`
            const description = pack.description || `Pack de livres contenant ${pack.books.length} livres: ${pack.books.map(b => b.book.title).join(', ')}`

            const totalOriginalPrice = Math.round(
                pack.originalPrice || pack.books.reduce((acc, pb) => acc + (pb.book?.price || 0), 0)
            )
            const displayPrice = Math.round(pack.price)
            const hasDiscount = totalOriginalPrice > displayPrice
            const regularPrice = hasDiscount ? totalOriginalPrice : displayPrice
            const salePrice = hasDiscount ? displayPrice : null
            const shippingFee = displayPrice >= 300 ? 0 : 35
            
            xml += `    <item>\n`
            xml += `      <g:id>PACK-${escapeXml(pack.id)}</g:id>\n`
            xml += `      <g:title>${escapeXml(title)}</g:title>\n`
            xml += `      <g:description>${escapeXml(description.slice(0, 5000))}</g:description>\n`
            xml += `      <g:link>${escapeXml(productUrl)}</g:link>\n`
            xml += `      <g:image_link>${escapeXml(imageUrl)}</g:image_link>\n`
            const additionalImages = [...new Set(pack.books
                .filter(pb => Boolean(pb.book?.image))
                .map(pb => `${baseUrl}/api/merchant-image/${pb.book.id}?v=1500`))]
                .slice(0, 10)
            for (const additionalImage of additionalImages) {
                xml += `      <g:additional_image_link>${escapeXml(additionalImage)}</g:additional_image_link>\n`
            }
            xml += `      <g:condition>${condition}</g:condition>\n`
            xml += `      <g:availability>${availability}</g:availability>\n`
            xml += `      <g:price>${regularPrice.toFixed(2)} MAD</g:price>\n`
            if (salePrice !== null) {
                xml += `      <g:sale_price>${salePrice.toFixed(2)} MAD</g:sale_price>\n`
            }
            xml += `      <g:brand>Riwaya</g:brand>\n`
            xml += `      <g:identifier_exists>no</g:identifier_exists>\n`
            xml += `      <g:is_bundle>yes</g:is_bundle>\n`
            xml += `      <g:google_product_category>784</g:google_product_category>\n`
            xml += `      <g:product_type>Livres &gt; Packs de livres</g:product_type>\n`
            xml += `      <g:shipping>\n`
            xml += `        <g:country>MA</g:country>\n`
            xml += `        <g:service>Livraison Express COD Maroc (24-48h)</g:service>\n`
            xml += `        <g:price>${shippingFee.toFixed(2)} MAD</g:price>\n`
            xml += `      </g:shipping>\n`
            xml += merchantReturnsXml('NEW', baseUrl)

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
