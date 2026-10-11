import Image from 'next/image'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { SiteFooter } from '@/components/site-footer'
import { SiteHeader } from '@/components/site-header'
import { getEditorialArticles } from '@/data/journal'
import { getHomeCatalog } from '@/lib/catalog'
import { copy, isLocale } from '@/lib/i18n'

export const dynamic = 'force-dynamic'

const extra = {
  fr: { heroNote: 'ÉDITION AUTOMNE · 2026', manifesto: 'Nous croyons aux livres qui changent une soirée, une idée, parfois une vie.', categories: ['Romans qui traversent le temps', 'Idées pour mieux vivre', 'Voix arabes contemporaines'], categoryText: ['Grands classiques et découvertes modernes.', 'Psychologie, philosophie et développement personnel.', 'Une littérature proche, vivante et plurielle.'], promiseTitle: 'Choisir moins. Lire mieux.', promiseText: 'Riwaya est une librairie indépendante marocaine. Nous cherchons les livres qui méritent une place chez vous, puis nous les faisons arriver partout au Maroc.', journal: 'Dans le Journal', journalCta: 'Tous les articles', stats: [['413+', 'titres choisis'], ['3', 'langues'], ['100%', 'livraison Maroc']] },
  ar: { heroNote: 'إصدار الخريف · 2026', manifesto: 'نؤمن بالكتب التي تغيّر أمسية أو فكرة، وأحياناً حياة كاملة.', categories: ['روايات تتجاوز الزمن', 'أفكار لحياة أفضل', 'أصوات عربية معاصرة'], categoryText: ['كلاسيكيات خالدة واكتشافات حديثة.', 'علم النفس والفلسفة وتطوير الذات.', 'أدب قريب، حي ومتعدد.'], promiseTitle: 'اختر أقل. اقرأ أفضل.', promiseText: 'رواية مكتبة مغربية مستقلة. نبحث عن الكتب التي تستحق مكاناً في بيتك ونوصلها إلى كل مدن المغرب.', journal: 'من مجلة رواية', journalCta: 'كل المقالات', stats: [['+413', 'كتاب مختار'], ['3', 'لغات'], ['100%', 'توصيل بالمغرب']] },
  en: { heroNote: 'AUTUMN EDIT · 2026', manifesto: 'We believe in books that change an evening, an idea, sometimes a life.', categories: ['Novels beyond their time', 'Ideas for a better life', 'Contemporary Arab voices'], categoryText: ['Enduring classics and modern discoveries.', 'Psychology, philosophy and self-development.', 'Literature that feels close, alive and plural.'], promiseTitle: 'Choose less. Read better.', promiseText: 'Riwaya is an independent Moroccan bookshop. We find the books that deserve a place in your home and deliver them across Morocco.', journal: 'From the Journal', journalCta: 'All stories', stats: [['413+', 'selected titles'], ['3', 'languages'], ['100%', 'Morocco delivery']] },
} as const

export default async function HomePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  if (!isLocale(locale)) notFound()
  const t = copy[locale]
  const x = extra[locale]
  const books = await getHomeCatalog(locale)
  const articles = getEditorialArticles(locale)

  return <div dir={locale === 'ar' ? 'rtl' : 'ltr'} lang={locale}>
    <SiteHeader locale={locale}/>
    <main>
      <section className="hero shell"><div className="hero-copy"><p className="eyebrow">{t.heroEyebrow}</p><h1>{t.heroTitle}</h1><p className="hero-text">{t.heroText}</p><div className="actions"><Link className="button primary" href={`/${locale}/books`}>{t.primaryCta}</Link><Link className="text-link" href={`/${locale}/journal`}>{t.nav[4]} →</Link></div></div><div className="hero-art"><div className="arch"/>{books.slice(0, 2).map((book, index) => <Link className={`hero-book hero-book-${index + 1}`} href={book.href} key={book.id}>{book.image ? <Image src={book.image} alt={book.imageAlt} fill priority sizes="190px"/> : <span>{book.title}</span>}</Link>)}<p className="edition-note">{x.heroNote}<br/><strong>{x.manifesto}</strong></p></div></section>

      <section className="stats-strip"><div className="shell">{x.stats.map(([value, label]) => <p key={label}><strong>{value}</strong><span>{label}</span></p>)}</div></section>

      <section className="selection shell" id="selection"><div className="section-heading"><div><p className="eyebrow">{t.sectionEyebrow}</p><h2>{t.sectionTitle}</h2></div><p>{t.sectionText}</p></div><div className="book-grid">{books.slice(0, 8).map((book, index) => <article className="book-card" key={book.id}><Link className="cover-link" href={book.href}>{book.image ? <Image className="cover-image" src={book.image} alt={book.imageAlt} fill sizes="(max-width:560px) 46vw, 270px" priority={index < 2}/> : <div className="cover green"><span>{book.title.slice(0, 2)}</span><i>RIWAYA</i></div>}</Link><p className="book-author">{book.author}</p><h3>{book.title}</h3><p className="price">{book.price} MAD {book.originalPrice && book.originalPrice > book.price ? <del>{book.originalPrice} MAD</del> : null}</p></article>)}</div><Link className="button outline" href={`/${locale}/books`}>{t.viewAll}</Link></section>

      <section className="collection-panels shell">{x.categories.map((title, index) => <Link href={`/${locale}/books`} className={`collection-panel panel-${index + 1}`} key={title}><small>0{index + 1}</small><h2>{title}</h2><p>{x.categoryText[index]}</p><span>→</span></Link>)}</section>

      <section className="manifesto" id="maison"><div className="shell manifesto-grid"><p className="manifesto-mark">R</p><div><p className="eyebrow">LA MAISON RIWAYA</p><h2>{x.promiseTitle}</h2><p>{x.promiseText}</p><div className="service-pills">{t.services.map((service) => <span key={service}>{service}</span>)}</div></div></div></section>

      <section className="home-journal shell"><div className="section-heading"><div><p className="eyebrow">NOTES · IDÉES · LECTURES</p><h2>{x.journal}</h2></div><Link className="text-link" href={`/${locale}/journal`}>{x.journalCta} →</Link></div><div className="home-journal-grid">{articles.map((article, index) => <article key={article.slug}><p className="journal-index">0{index + 1}</p><p className="eyebrow">{article.category} · {article.readTime}</p><h3><Link href={`/${locale}/journal/${article.slug}`}>{article.title}</Link></h3><p>{article.excerpt}</p></article>)}</div></section>

      <section className="newsletter shell"><p className="eyebrow">LETTRE RIWAYA</p><h2>{t.newsletterTitle}</h2><p>{t.newsletterText}</p><form><label className="sr-only" htmlFor="email">{t.email}</label><input id="email" type="email" placeholder={t.email}/><button type="submit">{t.subscribe}</button></form></section>
    </main><SiteFooter locale={locale}/>
  </div>
}
