import type { MetadataRoute } from 'next'
import { getEditorialArticles } from '@/data/journal'

const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL ?? 'https://riwaya.ma').replace(/\/$/, '')
const locales = ['fr', 'ar', 'en'] as const

type CatalogResponse = {
  books: Array<{ id: string }>
  pagination: { page: number; pages: number }
}

export const revalidate = 3600
export const dynamic = 'force-dynamic'

function languageAlternates(path = '') {
  return {
    languages: {
      fr: `${siteUrl}/fr${path}`,
      ar: `${siteUrl}/ar${path}`,
      en: `${siteUrl}/en${path}`,
      'x-default': `${siteUrl}/fr${path}`,
    },
  }
}

async function getBookIds(): Promise<string[]> {
  const apiBaseUrl = process.env.RIWAYA_BACKEND_URL
  if (!apiBaseUrl) return []

  const ids = new Set<string>()
  let page = 1
  let pages = 1

  do {
    const response = await fetch(
      `${apiBaseUrl.replace(/\/$/, '')}/api/storefront/v1/catalog?locale=fr&page=${page}&limit=48`,
      { next: { revalidate, tags: ['storefront-sitemap'] }, signal: AbortSignal.timeout(5000) },
    )
    if (!response.ok) break
    const payload = await response.json() as CatalogResponse
    for (const book of payload.books) ids.add(book.id)
    pages = payload.pagination.pages
    page += 1
  } while (page <= pages)

  return [...ids]
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date()
  const bookIds = await getBookIds()
  const staticRoutes: MetadataRoute.Sitemap = locales.flatMap((locale) => [
    { url: `${siteUrl}/${locale}`, lastModified: now, changeFrequency: 'daily', priority: 1, alternates: languageAlternates() },
    { url: `${siteUrl}/${locale}/books`, lastModified: now, changeFrequency: 'daily', priority: 0.9, alternates: languageAlternates('/books') },
    { url: `${siteUrl}/${locale}/journal`, lastModified: now, changeFrequency: 'weekly', priority: 0.8, alternates: languageAlternates('/journal') },
  ])
  const bookRoutes: MetadataRoute.Sitemap = bookIds.flatMap((id) => locales.map((locale) => ({
    url: `${siteUrl}/${locale}/books/${id}`,
    lastModified: now,
    changeFrequency: 'weekly' as const,
    priority: 0.8,
    alternates: languageAlternates(`/books/${id}`),
  })))

  const journalRoutes: MetadataRoute.Sitemap = locales.flatMap((locale) => getEditorialArticles(locale).map((article) => ({
    url: `${siteUrl}/${locale}/journal/${article.slug}`,
    lastModified: now,
    changeFrequency: 'monthly' as const,
    priority: 0.7,
    alternates: languageAlternates(`/journal/${article.slug}`),
  })))

  return [...staticRoutes, ...bookRoutes, ...journalRoutes]
}
