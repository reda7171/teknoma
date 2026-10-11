import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { SiteFooter } from '@/components/site-footer'
import { SiteHeader } from '@/components/site-header'
import { getEditorialArticle } from '@/data/journal'
import { isLocale } from '@/lib/i18n'

export async function generateMetadata({ params }: { params: Promise<{ locale: string; slug: string }> }): Promise<Metadata> {
  const { locale, slug } = await params
  if (!isLocale(locale)) return {}
  const article = getEditorialArticle(locale, slug)
  return article ? { title: article.title, description: article.excerpt } : {}
}

export default async function JournalArticlePage({ params }: { params: Promise<{ locale: string; slug: string }> }) {
  const { locale, slug } = await params
  if (!isLocale(locale)) notFound()
  const article = getEditorialArticle(locale, slug)
  if (!article) notFound()
  return <div dir={locale === 'ar' ? 'rtl' : 'ltr'} lang={locale}><SiteHeader locale={locale} path={`journal/${slug}`}/><main className="article-page shell"><Link className="back-link" href={`/${locale}/journal`}>← {locale === 'ar' ? 'المجلة' : 'Journal'}</Link><header><p className="eyebrow">{article.category} · {article.readTime}</p><h1>{article.title}</h1><p>{article.excerpt}</p></header><article>{article.content.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}</article><aside><p className="eyebrow">RIWAYA RECOMMANDE</p><h2>{locale === 'ar' ? 'واصل القراءة مع مختاراتنا' : locale === 'en' ? 'Continue with our book edit' : 'Poursuivez avec notre sélection'}</h2><Link className="button primary" href={`/${locale}/books`}>{locale === 'ar' ? 'اكتشف الكتب' : locale === 'en' ? 'Discover the books' : 'Découvrir les livres'}</Link></aside></main><SiteFooter locale={locale}/></div>
}
