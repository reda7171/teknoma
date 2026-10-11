import type { Locale } from '@/lib/i18n'
import { featuredBooks, type EditorialBook } from '@/data/home'

export type CatalogBook = {
  id: string
  title: string
  author: string
  price: number
  originalPrice: number | null
  image: string
  imageAlt: string
  href: string
  inStock?: boolean
}

type CatalogResponse = {
  version: number
  locale: Locale
  books: CatalogBook[]
}

export type CatalogPage = CatalogResponse & {
  categories: string[]
  pagination: { page: number; limit: number; total: number; pages: number }
}

export type BookDetail = CatalogBook & {
  description: string
  longDescription: string | null
  isbn: string | null
  condition: string
  purchaseUrl: string
  reviews: Array<{ id: string; fullName: string; rating: number; comment: string; city: string | null }>
  related: CatalogBook[]
}

function fallbackBooks(locale: Locale): CatalogBook[] {
  return featuredBooks.map((book: EditorialBook) => ({
    id: book.id,
    title: book.title,
    author: book.author,
    price: book.price,
    originalPrice: null,
    image: '',
    imageAlt: book.title,
    href: `/${locale}`,
  }))
}

export async function getCatalog(locale: Locale, filters: Record<string, string | undefined>): Promise<CatalogPage> {
  const apiBaseUrl = process.env.RIWAYA_BACKEND_URL
  if (!apiBaseUrl) {
    const books = fallbackBooks(locale)
    return { version: 1, locale, books, categories: [], pagination: { page: 1, limit: books.length, total: books.length, pages: 1 } }
  }

  const query = new URLSearchParams({ locale, limit: '24' })
  for (const [key, value] of Object.entries(filters)) if (value) query.set(key, value)

  try {
    const response = await fetch(`${apiBaseUrl.replace(/\/$/, '')}/api/storefront/v1/catalog?${query}`, {
      next: { revalidate: 300, tags: ['storefront-catalog'] },
      signal: AbortSignal.timeout(4000),
    })
    if (!response.ok) throw new Error('catalog_unavailable')
    const payload = await response.json() as CatalogPage
    return {
      ...payload,
      books: payload.books.map((book) => ({ ...book, href: `/${locale}/books/${book.id}` })),
    }
  } catch {
    const books = fallbackBooks(locale)
    return { version: 1, locale, books, categories: [], pagination: { page: 1, limit: books.length, total: books.length, pages: 1 } }
  }
}

export async function getBook(locale: Locale, id: string): Promise<BookDetail | null> {
  const apiBaseUrl = process.env.RIWAYA_BACKEND_URL
  if (!apiBaseUrl) return null
  try {
    const response = await fetch(`${apiBaseUrl.replace(/\/$/, '')}/api/storefront/v1/books/${encodeURIComponent(id)}?locale=${locale}`, {
      next: { revalidate: 300, tags: ['storefront-catalog', `storefront-book-${id}`] },
      signal: AbortSignal.timeout(4000),
    })
    if (response.status === 404 || response.status === 400) return null
    if (!response.ok) throw new Error('book_unavailable')
    const payload = await response.json() as { version: number; book: BookDetail }
    return payload.book
  } catch {
    return null
  }
}

export async function getHomeCatalog(locale: Locale): Promise<CatalogBook[]> {
  const apiBaseUrl = process.env.RIWAYA_BACKEND_URL
  if (!apiBaseUrl) return fallbackBooks(locale)

  try {
    const response = await fetch(`${apiBaseUrl.replace(/\/$/, '')}/api/storefront/v1/home?locale=${locale}`, {
      next: { revalidate: 900, tags: ['storefront-catalog'] },
      signal: AbortSignal.timeout(3500),
    })
    if (!response.ok) return fallbackBooks(locale)

    const payload = await response.json() as CatalogResponse
    if (payload.version !== 1 || !Array.isArray(payload.books) || payload.books.length === 0) {
      return fallbackBooks(locale)
    }
    return payload.books.slice(0, 8).map((book) => ({
      ...book,
      href: book.href.startsWith('http') ? book.href : `${apiBaseUrl.replace(/\/$/, '')}${book.href}`,
    }))
  } catch {
    return fallbackBooks(locale)
  }
}
