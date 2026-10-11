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
}

type CatalogResponse = {
  version: number
  locale: Locale
  books: CatalogBook[]
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
