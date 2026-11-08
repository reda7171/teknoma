import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSetting } from '@/lib/server/site-settings'

export const dynamic = 'force-dynamic'

function escapeXml(unsafe?: string | null): string {
    if (!unsafe) return ''
    return unsafe
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;')
}

/**
 * Flux officiel Google Merchant Center XML (Google Shopping & Performance Max)
 * Génération dynamique de l'inventaire des livres et packs pour les annonces produit.
 */
export async function GET() {
    try {
        const siteUrl = (await getSetting('site_url')) || process.env.NEXT_PUBLIC_APP_URL || 'https://riwaya.store'

        const [books, packs] = await Promise.all([
            prisma.book.findMany({
                where: { active: true },
                select: {
                    id: true,
                    title: true,
                    titleFr: true,
                    description: true,
                    descriptionFr: true,
                    price: true,
                    originalPrice: true,
                    image: true,
                    stock: true,
                    author: true,
                    category: true,
                    condition: true,
                }
            }),
            prisma.pack.findMany({
                where: { active: true },
                select: {
                    id: true,
                    name: true,
                    nameFr: true,
                    description: true,
                    descriptionFr: true,
                    price: true,
                    originalPrice: true,
                    image: true,
                }
            })
        ])

        let xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss xmlns:g="http://base.google.com/ns/1.0" version="2.0">
  <channel>
    <title>Riwaya - Librairie en Ligne au Maroc</title>
    <link>${siteUrl}</link>
    <description>Catalogue officiel des livres et packs Riwaya avec paiement à la livraison (COD) partout au Maroc.</description>
`

        // 1. Livres
        for (const book of books) {
            const availability = book.stock > 0 ? 'in stock' : 'out of stock'
            const title = escapeXml(book.titleFr || book.title)
            const rawDesc = book.descriptionFr || book.description || book.title
            const desc = escapeXml(rawDesc.substring(0, 4900))
            const author = escapeXml(book.author || 'Riwaya')
            const category = escapeXml(book.category || 'Livres & Littérature')
            const imageUrl = book.image?.startsWith('http') ? book.image : `${siteUrl}${book.image || '/book-placeholder.png'}`
            const link = `${siteUrl}/fr/books/${book.id}`
            const price = `${Number(book.price).toFixed(2)} MAD`
            const condition = book.condition === 'USED' ? 'used' : 'new'

            xml += `    <item>
      <g:id>book_${book.id}</g:id>
      <g:title>${title}</g:title>
      <g:description>${desc}</g:description>
      <g:link>${link}</g:link>
      <g:image_link>${escapeXml(imageUrl)}</g:image_link>
      <g:brand>${author}</g:brand>
      <g:condition>${condition}</g:condition>
      <g:availability>${availability}</g:availability>
      <g:price>${price}</g:price>
      <g:google_product_category>778</g:google_product_category>
      <g:product_type>${category}</g:product_type>
      <g:shipping>
        <g:country>MA</g:country>
        <g:service>Livraison Standard COD</g:service>
        <g:price>30.00 MAD</g:price>
      </g:shipping>
      <g:custom_label_0>COD_AVAILABLE</g:custom_label_0>
      <g:custom_label_1>${escapeXml(book.category || 'General')}</g:custom_label_1>
    </item>
`
        }

        // 2. Packs promotionnels
        for (const pack of packs) {
            const title = escapeXml(pack.nameFr || pack.name)
            const rawDesc = pack.descriptionFr || pack.description || pack.name
            const desc = escapeXml(rawDesc.substring(0, 4900))
            const imageUrl = pack.image?.startsWith('http') ? pack.image : `${siteUrl}${pack.image || '/book-placeholder.png'}`
            const link = `${siteUrl}/fr/packs/${pack.id}`
            const price = `${Number(pack.price).toFixed(2)} MAD`

            xml += `    <item>
      <g:id>pack_${pack.id}</g:id>
      <g:title>${title}</g:title>
      <g:description>${desc}</g:description>
      <g:link>${link}</g:link>
      <g:image_link>${escapeXml(imageUrl)}</g:image_link>
      <g:brand>Riwaya Packs</g:brand>
      <g:condition>new</g:condition>
      <g:availability>in stock</g:availability>
      <g:price>${price}</g:price>
      <g:google_product_category>778</g:google_product_category>
      <g:product_type>Packs de Livres</g:product_type>
      <g:shipping>
        <g:country>MA</g:country>
        <g:service>Livraison Standard COD</g:service>
        <g:price>30.00 MAD</g:price>
      </g:shipping>
      <g:custom_label_0>COD_AVAILABLE</g:custom_label_0>
      <g:custom_label_1>PACK_PROMO</g:custom_label_1>
    </item>
`
        }

        xml += `  </channel>
</rss>`

        return new NextResponse(xml, {
            status: 200,
            headers: {
                'Content-Type': 'application/xml; charset=utf-8',
                'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
            }
        })
    } catch (err: any) {
        console.error('Error generating Google Merchant feed:', err)
        return new NextResponse('Erreur génération flux', { status: 500 })
    }
}
