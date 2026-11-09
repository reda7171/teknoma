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

function cleanContent(text: string | null | undefined): string {
    if (!text) return ''
    return text
        .replace(/<[^>]*>/g, ' ')
        .replace(/&nbsp;/gi, ' ')
        .replace(/\s+/g, ' ')
        .trim()
}

export async function GET() {
    try {
        const baseUrl = getBaseUrl()

        // 1. Récupérer tous les avis approuvés liés à des livres actifs
        const reviews = await prisma.review.findMany({
            where: {
                isApproved: true,
                book: { active: true },
            },
            include: {
                book: {
                    select: {
                        id: true,
                        title: true,
                        author: true,
                        isbn: true,
                        sellerSku: true,
                    }
                }
            },
            orderBy: { createdAt: 'desc' },
            take: 1000,
        })

        let reviewsXml = ''

        for (const rev of reviews) {
            const bookUrl = `${baseUrl}/fr/books/${rev.book.id}`
            const validIsbn = rev.book.isbn ? rev.book.isbn.replace(/[^0-9X]/gi, '') : null
            const hasGtin = validIsbn && (validIsbn.length === 10 || validIsbn.length === 13)
            const cleaned = cleanContent(rev.comment)
            const titleSnippet = cleaned.length > 50 ? `${cleaned.slice(0, 50)}...` : cleaned

            reviewsXml += `
        <review>
            <review_id>${escapeXml(rev.id)}</review_id>
            <reviewer>
                <name>${escapeXml(rev.fullName || 'Client Vérifié')}</name>
                ${rev.customerId ? `<reviewer_id>${escapeXml(rev.customerId)}</reviewer_id>` : ''}
            </reviewer>
            <review_timestamp>${new Date(rev.createdAt).toISOString()}</review_timestamp>
            <title>${escapeXml(titleSnippet)}</title>
            <content>${escapeXml(cleaned)}</content>
            <review_url type="singleton">${bookUrl}</review_url>
            <ratings>
                <overall min="1" max="5">${rev.rating || 5}</overall>
            </ratings>
            <products>
                <product>
                    <product_ids>
                        <skus>
                            <sku>${escapeXml(rev.book.sellerSku || rev.book.id)}</sku>
                        </skus>
                        ${hasGtin ? `<gtins><gtin>${validIsbn}</gtin></gtins>` : ''}
                    </product_ids>
                    <product_name>${escapeXml(rev.book.title)} - ${escapeXml(rev.book.author)}</product_name>
                    <product_url>${bookUrl}</product_url>
                </product>
            </products>
            <collection_method>post_fulfillment</collection_method>
        </review>`
        }

        const xml = `<?xml version="1.0" encoding="UTF-8"?>
<feed xmlns:vc="http://www.w3.org/2007/XMLSchema-versioning"
      xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
      xsi:noNamespaceSchemaLocation="http://www.google.com/shopping/reviews/schema/product/2.3/product_reviews.xsd">
    <version>2.3</version>
    <aggregator>
        <name>Riwaya</name>
    </aggregator>
    <publisher>
        <name>Riwaya</name>
        <favicon>${baseUrl}/favicon.ico</favicon>
    </publisher>
    <reviews>${reviewsXml}
    </reviews>
</feed>`

        return new NextResponse(xml, {
            headers: {
                'Content-Type': 'application/xml; charset=utf-8',
                'Cache-Control': 'public, max-age=3600, s-maxage=3600, stale-while-revalidate=86400',
            },
        })
    } catch (error) {
        console.error('Erreur génération flux Google Product Reviews:', error)
        return new NextResponse('<error>Failed to generate Google Product Reviews feed</error>', {
            status: 500,
            headers: { 'Content-Type': 'application/xml' },
        })
    }
}
