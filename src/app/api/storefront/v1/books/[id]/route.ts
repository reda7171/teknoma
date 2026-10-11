import { NextResponse } from 'next/server'
import { getStorefrontBook, type StorefrontLocale } from '@/lib/storefront/catalog'

const locales = new Set<StorefrontLocale>(['fr', 'ar', 'en'])
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params
    if (!uuidPattern.test(id)) return NextResponse.json({ error: 'invalid_book_id' }, { status: 400 })
    const rawLocale = new URL(request.url).searchParams.get('locale') as StorefrontLocale | null
    const locale = rawLocale && locales.has(rawLocale) ? rawLocale : 'fr'

    try {
        const book = await getStorefrontBook(id, locale)
        if (!book) return NextResponse.json({ error: 'book_not_found' }, { status: 404 })
        return NextResponse.json(
            { version: 1, locale, book },
            { headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=1800', 'X-Content-Type-Options': 'nosniff' } },
        )
    } catch (error) {
        console.error('Storefront book error:', error)
        return NextResponse.json({ error: 'book_unavailable' }, { status: 503, headers: { 'Cache-Control': 'no-store' } })
    }
}
