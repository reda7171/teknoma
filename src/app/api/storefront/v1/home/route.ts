import { NextResponse } from 'next/server'
import { getStorefrontHomeCatalog, type StorefrontLocale } from '@/lib/storefront/catalog'

const locales = new Set<StorefrontLocale>(['fr', 'ar', 'en'])

export async function GET(request: Request) {
    const requestedLocale = new URL(request.url).searchParams.get('locale') as StorefrontLocale | null
    const locale = requestedLocale && locales.has(requestedLocale) ? requestedLocale : 'fr'

    try {
        const books = await getStorefrontHomeCatalog(locale)
        return NextResponse.json(
            { version: 1, locale, books },
            {
                headers: {
                    'Cache-Control': 'public, s-maxage=900, stale-while-revalidate=3600',
                    'X-Content-Type-Options': 'nosniff',
                },
            },
        )
    } catch (error) {
        console.error('Storefront home catalog error:', error)
        return NextResponse.json(
            { version: 1, locale, books: [], error: 'catalog_unavailable' },
            { status: 503, headers: { 'Cache-Control': 'no-store' } },
        )
    }
}
