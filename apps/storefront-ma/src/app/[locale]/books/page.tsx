import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { BookImage } from '@/components/book-image'
import { SiteFooter } from '@/components/site-footer'
import { SiteHeader } from '@/components/site-header'
import { getCatalog } from '@/lib/catalog'
import { isLocale, locales } from '@/lib/i18n'

const labels = {
  fr: { title: 'Tous les livres', intro: 'Le catalogue PetsUnivers, choisi et disponible au Maroc.', search: 'Titre ou auteur', category: 'Toutes les catégories', language: 'Toutes les langues', sort: 'Nouveautés', priceAsc: 'Prix croissant', priceDesc: 'Prix décroissant', filter: 'Filtrer', available: 'Disponible', unavailable: 'Indisponible', results: 'livres', previous: 'Précédent', next: 'Suivant' },
  ar: { title: 'كل الكتب', intro: 'كتالوج PetsUnivers المختار والمتوفر في المغرب.', search: 'العنوان أو الكاتب', category: 'كل التصنيفات', language: 'كل اللغات', sort: 'الأحدث', priceAsc: 'السعر تصاعدياً', priceDesc: 'السعر تنازلياً', filter: 'تصفية', available: 'متوفر', unavailable: 'غير متوفر', results: 'كتاب', previous: 'السابق', next: 'التالي' },
  en: { title: 'All books', intro: 'The PetsUnivers catalogue, thoughtfully selected and available in Morocco.', search: 'Title or author', category: 'All categories', language: 'All languages', sort: 'Newest', priceAsc: 'Price: low to high', priceDesc: 'Price: high to low', filter: 'Filter', available: 'Available', unavailable: 'Unavailable', results: 'books', previous: 'Previous', next: 'Next' },
} as const

export function generateStaticParams() { return locales.map((locale) => ({ locale })) }

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params
  if (!isLocale(locale)) return {}
  const content = locale === 'ar'
    ? { title: 'كل الكتب', description: 'اكتشف مجموعة PetsUnivers من الكتب العربية والفرنسية والإنجليزية المتوفرة في المغرب.' }
    : locale === 'en'
      ? { title: 'All books', description: 'Explore PetsUnivers’s curated catalogue of Arabic, French and English books available in Morocco.' }
      : { title: 'Tous les livres', description: 'Découvrez le catalogue PetsUnivers de livres français, arabes et anglais disponibles au Maroc.' }
  return { ...content, alternates: { canonical: `/${locale}/books`, languages: { fr: '/fr/books', ar: '/ar/books', en: '/en/books', 'x-default': '/fr/books' } } }
}

export default async function BooksPage({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { locale } = await params
  if (!isLocale(locale)) notFound()
  const raw = await searchParams
  const one = (key: string) => typeof raw[key] === 'string' ? raw[key] as string : undefined
  const filters = { page: one('page'), search: one('search'), category: one('category'), language: one('language'), sort: one('sort') }
  const catalog = await getCatalog(locale, filters)
  const t = labels[locale]
  const ui = locale === 'ar'
    ? { refine: 'تصفية المجموعة', clear: 'مسح الفلاتر', active: 'الفلاتر النشطة', noResults: 'لم نجد كتاباً بهذه المعايير.', noResultsText: 'جرّب تغيير البحث أو إزالة أحد الفلاتر.', searchLabel: 'البحث', categoryLabel: 'التصنيف', languageLabel: 'اللغة', sortLabel: 'الترتيب' }
    : locale === 'en'
      ? { refine: 'Refine the collection', clear: 'Clear filters', active: 'Active filters', noResults: 'No books match these criteria.', noResultsText: 'Try another search or remove one of the filters.', searchLabel: 'Search', categoryLabel: 'Category', languageLabel: 'Language', sortLabel: 'Sort order' }
      : { refine: 'Affiner la collection', clear: 'Effacer les filtres', active: 'Filtres actifs', noResults: 'Aucun livre ne correspond à ces critères.', noResultsText: 'Essayez une autre recherche ou retirez l’un des filtres.', searchLabel: 'Recherche', categoryLabel: 'Catégorie', languageLabel: 'Langue', sortLabel: 'Ordre de tri' }
  const activeFilterEntries = Object.entries(filters).filter(([key, value]) => key !== 'page' && Boolean(value)) as Array<[string, string]>
  const pageHref = (page: number) => { const query = new URLSearchParams(); Object.entries(filters).forEach(([key, value]) => { if (value && key !== 'page') query.set(key, value) }); query.set('page', String(page)); return `/${locale}/books?${query}` }

  return <div dir={locale === 'ar' ? 'rtl' : 'ltr'} lang={locale}>
    <SiteHeader locale={locale} path="books"/>
    <main className="catalog shell" id="main-content">
      <div className="catalog-title"><p className="eyebrow">PETSUNIVERS CATALOGUE</p><h1>{t.title}</h1><p>{t.intro}</p></div>
      <section className="catalog-tools" aria-labelledby="catalog-filters-title"><div className="catalog-tools-heading"><p className="eyebrow" id="catalog-filters-title">{ui.refine}</p>{activeFilterEntries.length ? <Link href={`/${locale}/books`}>{ui.clear}</Link> : null}</div><form className="filters" action={`/${locale}/books`}><label><span>{ui.searchLabel}</span><input name="search" defaultValue={filters.search} placeholder={t.search}/></label><label><span>{ui.categoryLabel}</span><select name="category" defaultValue={filters.category || ''}><option value="">{t.category}</option>{catalog.categories.map((category) => <option key={category}>{category}</option>)}</select></label><label><span>{ui.languageLabel}</span><select name="language" defaultValue={filters.language || ''}><option value="">{t.language}</option><option value="fr">Français</option><option value="ar">العربية</option><option value="en">English</option></select></label><label><span>{ui.sortLabel}</span><select name="sort" defaultValue={filters.sort || 'newest'}><option value="newest">{t.sort}</option><option value="price-asc">{t.priceAsc}</option><option value="price-desc">{t.priceDesc}</option></select></label><button>{t.filter}</button></form>{activeFilterEntries.length ? <div className="active-filters" aria-label={ui.active}>{activeFilterEntries.map(([key, value]) => <span key={key}>{value}</span>)}</div> : null}</section>
      <p className="result-count"><strong>{catalog.pagination.total}</strong> {t.results}</p>
      {catalog.books.length ? <div className="book-grid catalog-grid">{catalog.books.map((book) => <article className="book-card" key={book.id}><Link className="cover-link" href={book.href}><BookImage className="cover-image" src={book.image} alt={book.imageAlt} title={book.title} sizes="(max-width:560px) 46vw, (max-width:900px) 30vw, 220px"/></Link><p className={`availability ${book.inStock === false ? 'off' : ''}`}>{book.inStock === false ? t.unavailable : t.available}</p><p className="book-author">{book.author}</p><h2><Link href={book.href}>{book.title}</Link></h2><p className="price">{book.price} MAD {book.originalPrice && book.originalPrice > book.price ? <del>{book.originalPrice} MAD</del> : null}</p></article>)}</div> : <div className="catalog-empty"><span>R</span><h2>{ui.noResults}</h2><p>{ui.noResultsText}</p><Link className="button outline" href={`/${locale}/books`}>{ui.clear}</Link></div>}
      {catalog.pagination.pages > 1 ? <div className="pagination">{catalog.pagination.page > 1 ? <Link href={pageHref(catalog.pagination.page - 1)}>← {t.previous}</Link> : <span/>}<b>{catalog.pagination.page} / {catalog.pagination.pages}</b>{catalog.pagination.page < catalog.pagination.pages ? <Link href={pageHref(catalog.pagination.page + 1)}>{t.next} →</Link> : <span/>}</div> : null}
    </main><SiteFooter locale={locale}/>
  </div>
}
