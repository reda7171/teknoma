import { NextResponse } from 'next/server'
import { getStorefrontCatalog, type StorefrontLocale } from '@/lib/storefront/catalog'

const locales = new Set<StorefrontLocale>(['fr', 'ar', 'en'])
const sorts = new Set(['newest', 'price-asc', 'price-desc'])

export async function GET(request: Request) {
    const params = new URL(request.url).searchParams
    const rawLocale = params.get('locale') as StorefrontLocale | null
    const locale = rawLocale && locales.has(rawLocale) ? rawLocale : 'fr'
    const page = Math.max(1, Number.parseInt(params.get('page') || '1', 10) || 1)
    const limit = Math.min(48, Math.max(1, Number.parseInt(params.get('limit') || '24', 10) || 24))
    const search = params.get('search')?.trim().slice(0, 100) || undefined
    const category = params.get('category')?.trim().slice(0, 100) || undefined
    const language = params.get('language')?.trim().slice(0, 10) || undefined
    const requestedSort = params.get('sort') || 'newest'
    const sort = sorts.has(requestedSort) ? requestedSort as 'newest' | 'price-asc' | 'price-desc' : 'newest'

    try {
        const catalog = await getStorefrontCatalog({ locale, page, limit, search, category, language, sort })
        return NextResponse.json(
            { version: 1, locale, ...catalog },
            { headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=1800', 'X-Content-Type-Options': 'nosniff' } },
        )
    } catch (error) {
        console.error('Storefront catalog error:', error)
        return NextResponse.json({ version: 1, locale, error: 'catalog_unavailable' }, { status: 503, headers: { 'Cache-Control': 'no-store' } })
    }
}
