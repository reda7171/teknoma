import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

function escapeXml(unsafe: string) {
    if (!unsafe) return ''
    return unsafe
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;')
}

export async function GET() {
    try {
        const coupons = await prisma.coupon.findMany({
            where: { isActive: true },
        })

        const now = new Date()
        
        let xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">
<channel>
    <title>Riwaya Promotions</title>
    <link>https://riwaya.store</link>
    <description>Promotions et codes de réduction pour Riwaya</description>
`

        for (const coupon of coupons) {
            // Ignore les coupons expirés
            if (coupon.expiresAt && coupon.expiresAt < now) continue

            const promoId = escapeXml(coupon.code)
            const discountFormatted = Number(coupon.discount).toFixed(2)
            const typeText = coupon.type === 'PERCENTAGE' ? `${coupon.discount}% de réduction` : `${discountFormatted} درهم de réduction`
            
            const minAmountFormatted = coupon.minAmount ? Number(coupon.minAmount).toFixed(2) : null
            const minAmountStr = minAmountFormatted ? ` (dès ${minAmountFormatted} درهم)` : ''
            const longTitle = escapeXml(`${typeText}${minAmountStr}`)
            
            const startDate = coupon.createdAt.toISOString()
            const endDateDate = coupon.expiresAt ? new Date(coupon.expiresAt) : new Date(now.getFullYear() + 1, now.getMonth(), now.getDate())
            const endDate = endDateDate.toISOString()

            const minAmountXml = minAmountFormatted ? `\n        <g:minimum_purchase_amount>${minAmountFormatted} درهم</g:minimum_purchase_amount>` : ''
            const discountXml = coupon.type === 'PERCENTAGE' 
                ? `\n        <g:percent_off>${coupon.discount}</g:percent_off>` 
                : `\n        <g:money_off_amount>${discountFormatted} درهم</g:money_off_amount>`

            xml += `
    <item>
        <g:promotion_id>${promoId}</g:promotion_id>
        <g:product_applicability>ALL_PRODUCTS</g:product_applicability>
        <g:offer_type>GENERIC_CODE</g:offer_type>
        <g:generic_code>${promoId}</g:generic_code>
        <g:long_title>${longTitle}</g:long_title>
        <g:promotion_effective_dates>${startDate}/${endDate}</g:promotion_effective_dates>
        <g:redemption_channel>ONLINE</g:redemption_channel>${minAmountXml}${discountXml}
    </item>`
        }

        xml += `
</channel>
</rss>`

        return new NextResponse(xml, {
            headers: {
                'Content-Type': 'application/xml',
                'Cache-Control': 's-maxage=3600, stale-while-revalidate'
            }
        })
    } catch (error) {
        console.error('Error generating Google Promotions feed:', error)
        return new NextResponse('Internal Server Error', { status: 500 })
    }
}
