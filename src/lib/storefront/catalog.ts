import { unstable_cache } from 'next/cache'
import { prisma } from '@/lib/prisma'
import { getBaseUrl, normalizeImage } from '@/lib/utils'

export type StorefrontLocale = 'fr' | 'ar' | 'en'

function localizedTitle(book: { title: string; titleFr: string | null; titleEn: string | null }, locale: StorefrontLocale) {
    if (locale === 'fr') return book.titleFr || book.title
    if (locale === 'en') return book.titleEn || book.title
    return book.title
}

function absoluteImage(image: string | null) {
    const normalized = normalizeImage(image)
    return normalized.startsWith('http') ? normalized : `${getBaseUrl()}${normalized}`
}

const readHomeCatalog = unstable_cache(
    async () => prisma.book.findMany({
        where: {
            active: true,
            status: 'APPROVED',
            stock: { gt: 0 },
        },
        orderBy: [
            { isBestSeller: 'desc' },
            { displayOrder: 'asc' },
            { createdAt: 'desc' },
        ],
        take: 8,
        select: {
            id: true,
            title: true,
            titleFr: true,
            titleEn: true,
            author: true,
            price: true,
            originalPrice: true,
            image: true,
            imageAlt: true,
            language: true,
            category: true,
        },
    }),
    ['storefront-home-catalog-v1'],
    { revalidate: 900, tags: ['storefront-catalog'] },
)

export async function getStorefrontHomeCatalog(locale: StorefrontLocale) {
    const books = await readHomeCatalog()

    return books.map((book) => ({
        id: book.id,
        title: localizedTitle(book, locale),
        author: book.author,
        price: book.price,
        originalPrice: book.originalPrice,
        image: absoluteImage(book.image),
        imageAlt: book.imageAlt || localizedTitle(book, locale),
        language: book.language,
        category: book.category,
        href: `/${locale}/books/${book.id}`,
    }))
}
