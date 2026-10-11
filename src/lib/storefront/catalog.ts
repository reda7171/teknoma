import { unstable_cache } from 'next/cache'
import { prisma } from '@/lib/prisma'
import { getBaseUrl, normalizeImage } from '@/lib/utils'
import type { Prisma } from '@prisma/client'

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

const publicBookSelect = {
    id: true,
    title: true,
    titleFr: true,
    titleEn: true,
    author: true,
    price: true,
    originalPrice: true,
    stock: true,
    image: true,
    imageAlt: true,
    language: true,
    category: true,
} satisfies Prisma.BookSelect

function serializeBook(book: {
    id: string
    title: string
    titleFr: string | null
    titleEn: string | null
    author: string
    price: number
    originalPrice: number | null
    stock: number
    image: string
    imageAlt: string | null
    language: string
    category: string | null
}, locale: StorefrontLocale) {
    const title = localizedTitle(book, locale)
    return {
        id: book.id,
        title,
        author: book.author,
        price: book.price,
        originalPrice: book.originalPrice,
        inStock: book.stock > 0,
        image: absoluteImage(book.image),
        imageAlt: book.imageAlt || title,
        language: book.language,
        category: book.category,
        href: `/${locale}/books/${book.id}`,
    }
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
        select: publicBookSelect,
    }),
    ['storefront-home-catalog-v1'],
    { revalidate: 900, tags: ['storefront-catalog'] },
)

export async function getStorefrontHomeCatalog(locale: StorefrontLocale) {
    const books = await readHomeCatalog()

    return books.map((book) => serializeBook(book, locale))
}

export async function getStorefrontCatalog(options: {
    locale: StorefrontLocale
    page: number
    limit: number
    search?: string
    category?: string
    language?: string
    sort?: 'newest' | 'price-asc' | 'price-desc'
}) {
    const { locale, page, limit, search, category, language, sort = 'newest' } = options
    const where: Prisma.BookWhereInput = {
        active: true,
        status: 'APPROVED',
        ...(search ? {
            OR: [
                { title: { contains: search } },
                { titleFr: { contains: search } },
                { titleEn: { contains: search } },
                { author: { contains: search } },
            ],
        } : {}),
        ...(category ? { category } : {}),
        ...(language ? { language } : {}),
    }
    const orderBy: Prisma.BookOrderByWithRelationInput[] = sort === 'price-asc'
        ? [{ stock: 'desc' }, { price: 'asc' }]
        : sort === 'price-desc'
            ? [{ stock: 'desc' }, { price: 'desc' }]
            : [{ stock: 'desc' }, { createdAt: 'desc' }]

    const [books, total, categoryRows] = await Promise.all([
        prisma.book.findMany({ where, orderBy, skip: (page - 1) * limit, take: limit, select: publicBookSelect }),
        prisma.book.count({ where }),
        prisma.book.findMany({
            where: { active: true, status: 'APPROVED', category: { not: null } },
            distinct: ['category'],
            orderBy: { category: 'asc' },
            select: { category: true },
        }),
    ])

    return {
        books: books.map((book) => serializeBook(book, locale)),
        categories: categoryRows.flatMap((row) => row.category ? [row.category] : []),
        pagination: { page, limit, total, pages: Math.max(1, Math.ceil(total / limit)) },
    }
}
