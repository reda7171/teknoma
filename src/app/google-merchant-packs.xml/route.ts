import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'
export const revalidate = 3600 // Revalider toutes les heures

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

function normalizeImageUrl(url: string | null | undefined, baseUrl: string, fallbackUrl: string): string {
    if (!url) return fallbackUrl
    if (url.startsWith('http://') || url.startsWith('https://')) return url
    if (url.startsWith('/')) return `${baseUrl}${url}`
    return `${baseUrl}/${url}`
}

export async function GET() {
    try {
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://www.riwaya.store'

        const packs = await prisma.pack.findMany({
            where: { active: true },
            include: {
                books: {
                    include: {
                        book: true
                    }
                }
            },
            orderBy: {
                createdAt: 'desc'
            }
        })

        const now = new Date()
        const allCoupons = await prisma.coupon.findMany({
            where: { isActive: true }
        })
        const coupons = allCoupons.filter(c => !c.expiresAt || c.expiresAt >= now)

        let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`
        xml += `<rss xmlns:g="http://base.google.com/ns/1.0" version="2.0">\n`
        xml += `  <channel>\n`
        xml += `    <title>Riwaya - Packs de Livres (Google Shopping)</title>\n`
        xml += `    <link>${baseUrl}/packs</link>\n`
        xml += `    <description>Catalogue officiel des packs et coffrets de livres Riwaya avec paiement à la livraison partout au Maroc.</description>\n`

        for (const pack of packs) {
            const productUrl = `${baseUrl}/fr/packs/${pack.id}`
            const dynamicOgImage = `${baseUrl}/fr/packs/${pack.id}/opengraph-image`
            const mainImage = normalizeImageUrl(pack.image, baseUrl, dynamicOgImage)

            const bookListText = pack.books
                .map(pb => `${pb.book.title} (${pb.book.author || 'Riwaya'})`)
                .join(', ')

            const title = `Pack ${pack.name} (${pack.books.length} Livres)`
            const rawDescription = pack.description || 
                `Pack promotionnel exclusif de ${pack.books.length} livres sélectionnés par Riwaya : ${bookListText}. Paiement Cash on Delivery (COD) et livraison rapide partout au Maroc.`

            const totalOriginalPrice = Math.round(
                pack.originalPrice || pack.books.reduce((acc, pb) => acc + (pb.book?.price || 0), 0)
            )
            const displayPrice = Math.round(pack.price)
            const hasDiscount = totalOriginalPrice > displayPrice

            const regularPrice = hasDiscount ? totalOriginalPrice : displayPrice
            const salePrice = hasDiscount ? displayPrice : null

            const isFreeShipping = displayPrice >= 300
            const shippingFee = isFreeShipping ? 0 : 35

            // Vérifier si le stock de tous les livres du pack est disponible
            const allInStock = pack.books.length > 0 && pack.books.every(pb => (pb.book?.stock ?? 0) > 0)
            const availability = allInStock ? 'in_stock' : 'out_of_stock'

            xml += `    <item>\n`
            xml += `      <g:id>PACK-${escapeXml(pack.id)}</g:id>\n`
            xml += `      <g:title>${escapeXml(title)}</g:title>\n`
            xml += `      <g:description>${escapeXml(rawDescription.slice(0, 5000))}</g:description>\n`
            xml += `      <g:link>${escapeXml(productUrl)}</g:link>\n`
            xml += `      <g:image_link>${escapeXml(mainImage)}</g:image_link>\n`

            // Images additionnelles (couvertures des livres inclus)
            const additionalImages = pack.books
                .map(pb => pb.book?.image)
                .filter((img): img is string => Boolean(img))
                .slice(0, 5)

            for (const addImg of additionalImages) {
                const addImgUrl = normalizeImageUrl(addImg, baseUrl, '')
                if (addImgUrl && addImgUrl !== mainImage) {
                    xml += `      <g:additional_image_link>${escapeXml(addImgUrl)}</g:additional_image_link>\n`
                }
            }

            xml += `      <g:condition>new</g:condition>\n`
            xml += `      <g:availability>${availability}</g:availability>\n`
            xml += `      <g:price>${regularPrice.toFixed(2)} MAD</g:price>\n`

            if (salePrice !== null) {
                xml += `      <g:sale_price>${salePrice.toFixed(2)} MAD</g:sale_price>\n`
            }

            xml += `      <g:brand>Riwaya</g:brand>\n`
            xml += `      <g:identifier_exists>no</g:identifier_exists>\n`
            xml += `      <g:is_bundle>yes</g:is_bundle>\n`
            xml += `      <g:google_product_category>778</g:google_product_category>\n` // 778 = Media > Books
            xml += `      <g:product_type>Livres &gt; Packs de livres</g:product_type>\n`

            // Labels personnalisés pour les campagnes Google Ads / Shopping
            xml += `      <g:custom_label_0>Pack</g:custom_label_0>\n`
            xml += `      <g:custom_label_1>${pack.books.length} livres</g:custom_label_1>\n`
            xml += `      <g:custom_label_2>${hasDiscount ? 'Promo' : 'Standard'}</g:custom_label_2>\n`
            xml += `      <g:custom_label_3>${isFreeShipping ? 'Livraison Gratuite' : 'Livraison 35 DH'}</g:custom_label_3>\n`

            // Détails de livraison spécifiques au Maroc
            xml += `      <g:shipping>\n`
            xml += `        <g:country>MA</g:country>\n`
            xml += `        <g:service>Livraison Express COD Maroc (24-48h)</g:service>\n`
            xml += `        <g:price>${shippingFee.toFixed(2)} MAD</g:price>\n`
            xml += `      </g:shipping>\n`

            // Promotions applicables
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
                'Cache-Control': 's-maxage=3600, stale-while-revalidate=86400',
                'X-Robots-Tag': 'noindex, follow' // Permet à Google Merchant d'extraire le XML sans indexer le flux brut en page de recherche
            }
        })
    } catch (error) {
        console.error('Error generating Google Merchant Packs feed:', error)
        return new NextResponse('Internal Server Error', { status: 500 })
    }
}
