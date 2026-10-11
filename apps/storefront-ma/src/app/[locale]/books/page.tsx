import Image from 'next/image'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getCatalog } from '@/lib/catalog'
import { copy, isLocale, locales } from '@/lib/i18n'

const labels = {
  fr: { title: 'Tous les livres', intro: 'Le catalogue Riwaya, choisi et disponible au Maroc.', search: 'Titre ou auteur', category: 'Toutes les catégories', language: 'Toutes les langues', sort: 'Nouveautés', priceAsc: 'Prix croissant', priceDesc: 'Prix décroissant', filter: 'Filtrer', available: 'Disponible', unavailable: 'Indisponible', results: 'livres', previous: 'Précédent', next: 'Suivant' },
  ar: { title: 'كل الكتب', intro: 'كتالوج رواية المختار والمتوفر في المغرب.', search: 'العنوان أو الكاتب', category: 'كل التصنيفات', language: 'كل اللغات', sort: 'الأحدث', priceAsc: 'السعر تصاعدياً', priceDesc: 'السعر تنازلياً', filter: 'تصفية', available: 'متوفر', unavailable: 'غير متوفر', results: 'كتاب', previous: 'السابق', next: 'التالي' },
  en: { title: 'All books', intro: 'The Riwaya catalogue, thoughtfully selected and available in Morocco.', search: 'Title or author', category: 'All categories', language: 'All languages', sort: 'Newest', priceAsc: 'Price: low to high', priceDesc: 'Price: high to low', filter: 'Filter', available: 'Available', unavailable: 'Unavailable', results: 'books', previous: 'Previous', next: 'Next' },
} as const

export function generateStaticParams() { return locales.map((locale) => ({ locale })) }

export default async function BooksPage({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { locale } = await params
  if (!isLocale(locale)) notFound()
  const raw = await searchParams
  const one = (key: string) => typeof raw[key] === 'string' ? raw[key] as string : undefined
  const filters = { page: one('page'), search: one('search'), category: one('category'), language: one('language'), sort: one('sort') }
  const catalog = await getCatalog(locale, filters)
  const t = labels[locale]
  const home = copy[locale]
  const pageHref = (page: number) => { const query = new URLSearchParams(); Object.entries(filters).forEach(([key, value]) => { if (value && key !== 'page') query.set(key, value) }); query.set('page', String(page)); return `/${locale}/books?${query}` }

  return <div dir={locale === 'ar' ? 'rtl' : 'ltr'} lang={locale}>
    <div className="announcement">{home.announcement}</div>
    <header className="site-header shell"><Link className="wordmark" href={`/${locale}`}><span>RIWAYA</span><small>رواية</small></Link><nav><Link href={`/${locale}/books`}>{home.nav[0]}</Link><Link href={`/${locale}`}>{home.nav[1]}</Link></nav><div className="header-tools"><div className="languages">{locales.map((item) => <Link className={item === locale ? 'active' : ''} href={`/${item}/books`} key={item}>{item.toUpperCase()}</Link>)}</div></div></header>
    <main className="catalog shell">
      <div className="catalog-title"><p className="eyebrow">RIWAYA CATALOGUE</p><h1>{t.title}</h1><p>{t.intro}</p></div>
      <form className="filters" action={`/${locale}/books`}><input name="search" defaultValue={filters.search} placeholder={t.search}/><select name="category" defaultValue={filters.category || ''}><option value="">{t.category}</option>{catalog.categories.map((category) => <option key={category}>{category}</option>)}</select><select name="language" defaultValue={filters.language || ''}><option value="">{t.language}</option><option value="fr">Français</option><option value="ar">العربية</option><option value="en">English</option></select><select name="sort" defaultValue={filters.sort || 'newest'}><option value="newest">{t.sort}</option><option value="price-asc">{t.priceAsc}</option><option value="price-desc">{t.priceDesc}</option></select><button>{t.filter}</button></form>
      <p className="result-count">{catalog.pagination.total} {t.results}</p>
      <div className="book-grid catalog-grid">{catalog.books.map((book) => <article className="book-card" key={book.id}><Link className="cover-link" href={book.href}>{book.image ? <Image className="cover-image" src={book.image} alt={book.imageAlt} fill sizes="(max-width:560px) 46vw, (max-width:900px) 30vw, 220px"/> : <div className="cover green"><span>{book.title.slice(0,2)}</span><i>RIWAYA</i></div>}</Link><p className={`availability ${book.inStock === false ? 'off' : ''}`}>{book.inStock === false ? t.unavailable : t.available}</p><p className="book-author">{book.author}</p><h2>{book.title}</h2><p className="price">{book.price} MAD {book.originalPrice && book.originalPrice > book.price ? <del>{book.originalPrice} MAD</del> : null}</p></article>)}</div>
      {catalog.pagination.pages > 1 ? <div className="pagination">{catalog.pagination.page > 1 ? <Link href={pageHref(catalog.pagination.page - 1)}>← {t.previous}</Link> : <span/>}<b>{catalog.pagination.page} / {catalog.pagination.pages}</b>{catalog.pagination.page < catalog.pagination.pages ? <Link href={pageHref(catalog.pagination.page + 1)}>{t.next} →</Link> : <span/>}</div> : null}
    </main>
  </div>
}
