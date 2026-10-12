import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { SiteFooter } from '@/components/site-footer'
import { SiteHeader } from '@/components/site-header'
import { getEditorialArticles } from '@/data/journal'
import { isLocale } from '@/lib/i18n'

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params
  if (!isLocale(locale)) return {}
  const description = locale === 'ar' ? 'قراءات وأفكار واختيارات مستقلة من رواية المغرب.' : locale === 'en' ? 'Independent reading notes, ideas and book selections from Riwaya Morocco.' : 'Conseils de lecture, sélections et culture du livre par Riwaya Maroc.'
  return { title: locale === 'ar' ? 'مجلة رواية' : locale === 'en' ? 'The Riwaya Journal' : 'Le Journal Riwaya', description, alternates: { canonical: `/${locale}/journal`, languages: { fr: '/fr/journal', ar: '/ar/journal', en: '/en/journal', 'x-default': '/fr/journal' } } }
}

export default async function JournalPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  if (!isLocale(locale)) notFound()

  const articles = getEditorialArticles(locale)
  const featured = articles[0]
  const remaining = articles.slice(1)
  const categories = [...new Set(articles.map((article) => article.category))]
  const copy = locale === 'ar'
    ? { title: 'مجلة رواية', intro: 'قراءات وأفكار واختيارات مستقلة من المغرب، من أجل علاقة أعمق مع الكتب.', latest: 'المقال المختار', explore: 'اكتشف المواضيع', read: 'اقرأ المقال ←' }
    : locale === 'en'
      ? { title: 'The Riwaya Journal', intro: 'Independent reading notes, ideas and considered selections from Morocco.', latest: 'Featured story', explore: 'Explore the journal', read: 'Read the story →' }
      : { title: 'Le Journal Riwaya', intro: 'Lectures, idées et sélections indépendantes depuis le Maroc, pour vivre plus profondément avec les livres.', latest: 'À la une', explore: 'Explorer le journal', read: 'Lire l’article →' }

  return (
    <div dir={locale === 'ar' ? 'rtl' : 'ltr'} lang={locale}>
      <SiteHeader locale={locale} path="journal"/>
      <main className="journal shell" id="main-content">
        <header className="journal-hero">
          <p className="eyebrow">RIWAYA · ÉDITORIAL INDÉPENDANT</p>
          <h1>{copy.title}</h1>
          <p>{copy.intro}</p>
          <div className="journal-categories" aria-label={copy.explore}>
            {categories.map((category) => <span key={category}>{category}</span>)}
          </div>
        </header>

        {featured ? (
          <article className="journal-featured">
            <p className="journal-index">01</p>
            <div>
              <p className="eyebrow">{copy.latest} · {featured.category} · {featured.readTime}</p>
              <h2><Link href={`/${locale}/journal/${featured.slug}`}>{featured.title}</Link></h2>
              <p>{featured.excerpt}</p>
              <Link className="button primary" href={`/${locale}/journal/${featured.slug}`}>{copy.read}</Link>
            </div>
          </article>
        ) : null}

        <div className="journal-grid journal-grid-secondary">
          {remaining.map((article, index) => (
            <article className="journal-card" key={article.slug}>
              <p className="journal-index">0{index + 2}</p>
              <div>
                <p className="eyebrow">{article.category} · {article.readTime}</p>
                <h2><Link href={`/${locale}/journal/${article.slug}`}>{article.title}</Link></h2>
                <p>{article.excerpt}</p>
                <Link className="text-link" href={`/${locale}/journal/${article.slug}`}>{copy.read}</Link>
              </div>
            </article>
          ))}
        </div>
      </main>
      <SiteFooter locale={locale}/>
    </div>
  )
}
