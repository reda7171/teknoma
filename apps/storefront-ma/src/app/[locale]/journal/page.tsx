import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { SiteFooter } from '@/components/site-footer'
import { SiteHeader } from '@/components/site-header'
import { getEditorialArticles } from '@/data/journal'
import { isLocale } from '@/lib/i18n'

export const metadata: Metadata = { title: 'Journal', description: 'Conseils de lecture, sélections et culture du livre par Riwaya.' }

export default async function JournalPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  if (!isLocale(locale)) notFound()
  const articles = getEditorialArticles(locale)
  const title = locale === 'ar' ? 'مجلة رواية' : locale === 'en' ? 'The Riwaya Journal' : 'Le Journal Riwaya'
  const intro = locale === 'ar' ? 'أفكار ونصائح واختيارات من أجل حياة أغنى بالكتب.' : locale === 'en' ? 'Ideas, reading guides and considered selections for a life enriched by books.' : 'Idées, conseils et sélections pour une vie enrichie par les livres.'
  return <div dir={locale === 'ar' ? 'rtl' : 'ltr'} lang={locale}><SiteHeader locale={locale} path="journal"/><main className="journal shell"><div className="journal-hero"><p className="eyebrow">RIWAYA · ÉDITORIAL</p><h1>{title}</h1><p>{intro}</p></div><div className="journal-grid">{articles.map((article, index) => <article className={`journal-card journal-card-${index + 1}`} key={article.slug}><p className="journal-index">0{index + 1}</p><div><p className="eyebrow">{article.category} · {article.readTime}</p><h2><Link href={`/${locale}/journal/${article.slug}`}>{article.title}</Link></h2><p>{article.excerpt}</p><Link className="text-link" href={`/${locale}/journal/${article.slug}`}>{locale === 'ar' ? 'اقرأ المقال ←' : locale === 'en' ? 'Read the story →' : 'Lire l’article →'}</Link></div></article>)}</div></main><SiteFooter locale={locale}/></div>
}
