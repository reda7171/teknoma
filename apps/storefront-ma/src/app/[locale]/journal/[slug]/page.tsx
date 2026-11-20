import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { SiteFooter } from '@/components/site-footer'
import { SiteHeader } from '@/components/site-header'
import { getEditorialArticle, getEditorialArticles } from '@/data/journal'
import { isLocale } from '@/lib/i18n'

export async function generateMetadata({ params }: { params: Promise<{ locale: string; slug: string }> }): Promise<Metadata> {
  const { locale, slug } = await params
  if (!isLocale(locale)) return {}
  const article = getEditorialArticle(locale, slug)
  return article ? {
    title: article.title,
    description: article.excerpt,
    alternates: { canonical: `/${locale}/journal/${slug}`, languages: { fr: `/fr/journal/${slug}`, ar: `/ar/journal/${slug}`, en: `/en/journal/${slug}`, 'x-default': `/fr/journal/${slug}` } },
    openGraph: { type: 'article', title: article.title, description: article.excerpt },
  } : {}
}

export default async function JournalArticlePage({ params }: { params: Promise<{ locale: string; slug: string }> }) {
  const { locale, slug } = await params
  if (!isLocale(locale)) notFound()
  const article = getEditorialArticle(locale, slug)
  if (!article) notFound()

  const related = getEditorialArticles(locale).filter((item) => item.slug !== slug).slice(0, 2)
  const copy = locale === 'ar'
    ? { journal: 'المجلة', recommendation: 'PetsUnivers تقترح', continue: 'واصل القراءة مع مختاراتنا', books: 'اكتشف الكتب', more: 'تابع القراءة', read: 'اقرأ المقال ←' }
    : locale === 'en'
      ? { journal: 'Journal', recommendation: 'PETSUNIVERS RECOMMENDS', continue: 'Continue with our book edit', books: 'Discover the books', more: 'Continue reading', read: 'Read the story →' }
      : { journal: 'Journal', recommendation: 'PETSUNIVERS RECOMMANDE', continue: 'Poursuivez avec notre sélection', books: 'Découvrir les livres', more: 'Continuer la lecture', read: 'Lire l’article →' }

  const articleJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: article.title,
    description: article.excerpt,
    inLanguage: locale,
    publisher: { '@type': 'Organization', name: 'PetsUnivers', url: 'https://petsunivers.ma' },
    mainEntityOfPage: `https://petsunivers.ma/${locale}/journal/${slug}`,
  }

  return (
    <div dir={locale === 'ar' ? 'rtl' : 'ltr'} lang={locale}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(articleJsonLd).replace(/</g, '\\u003c') }}/>
      <SiteHeader locale={locale} path={`journal/${slug}`}/>
      <main className="article-page shell" id="main-content">
        <Link className="back-link" href={`/${locale}/journal`}>← {copy.journal}</Link>
        <header><p className="eyebrow">{article.category} · {article.readTime}</p><h1>{article.title}</h1><p>{article.excerpt}</p></header>
        <article>{article.content.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}</article>
        <aside><p className="eyebrow">{copy.recommendation}</p><h2>{copy.continue}</h2><Link className="button primary" href={`/${locale}/books`}>{copy.books}</Link></aside>

        {related.length ? <section className="article-related"><p className="eyebrow">{copy.more}</p><div>{related.map((item) => <article key={item.slug}><p>{item.category} · {item.readTime}</p><h2><Link href={`/${locale}/journal/${item.slug}`}>{item.title}</Link></h2><Link className="text-link" href={`/${locale}/journal/${item.slug}`}>{copy.read}</Link></article>)}</div></section> : null}
      </main>
      <SiteFooter locale={locale}/>
    </div>
  )
}
