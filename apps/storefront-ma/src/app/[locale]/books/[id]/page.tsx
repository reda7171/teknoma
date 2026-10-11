import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getBook } from '@/lib/catalog'
import { copy, isLocale, locales } from '@/lib/i18n'

const labels = {
  fr: { back: 'Retour aux livres', author: 'Par', available: 'En stock', unavailable: 'Indisponible', buy: 'Commander ce livre', secure: 'Paiement sécurisé · Livraison partout au Maroc', about: 'À propos du livre', details: 'Détails', isbn: 'ISBN', condition: 'État', reviews: 'Avis de lecteurs', related: 'Vous aimerez aussi' },
  ar: { back: 'العودة إلى الكتب', author: 'للكاتب', available: 'متوفر', unavailable: 'غير متوفر', buy: 'اطلب هذا الكتاب', secure: 'دفع آمن · توصيل إلى جميع مدن المغرب', about: 'عن الكتاب', details: 'التفاصيل', isbn: 'الترقيم الدولي', condition: 'الحالة', reviews: 'آراء القراء', related: 'قد يعجبك أيضاً' },
  en: { back: 'Back to books', author: 'By', available: 'In stock', unavailable: 'Unavailable', buy: 'Order this book', secure: 'Secure payment · Delivery across Morocco', about: 'About the book', details: 'Details', isbn: 'ISBN', condition: 'Condition', reviews: 'Reader reviews', related: 'You may also like' },
} as const

export async function generateMetadata({ params }: { params: Promise<{ locale: string; id: string }> }): Promise<Metadata> {
  const { locale, id } = await params
  if (!isLocale(locale)) return {}
  const book = await getBook(locale, id)
  if (!book) return { title: 'Livre introuvable' }
  return { title: book.title, description: book.description.slice(0, 160), openGraph: { title: book.title, description: book.description.slice(0, 160), images: [book.image] } }
}

export default async function BookPage({ params }: { params: Promise<{ locale: string; id: string }> }) {
  const { locale, id } = await params
  if (!isLocale(locale)) notFound()
  const book = await getBook(locale, id)
  if (!book) notFound()
  const t = labels[locale]
  const home = copy[locale]
  const rating = book.reviews.length ? (book.reviews.reduce((sum, review) => sum + review.rating, 0) / book.reviews.length).toFixed(1) : null
  const jsonLd = { '@context': 'https://schema.org', '@type': 'Book', name: book.title, author: { '@type': 'Person', name: book.author }, image: book.image, description: book.description, isbn: book.isbn || undefined, offers: { '@type': 'Offer', price: book.price, priceCurrency: 'MAD', availability: book.inStock ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock', url: `https://riwaya.ma/${locale}/books/${book.id}` } }

  return <div dir={locale === 'ar' ? 'rtl' : 'ltr'} lang={locale}>
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c') }} />
    <div className="announcement">{home.announcement}</div>
    <header className="site-header shell"><Link className="wordmark" href={`/${locale}`}><span>RIWAYA</span><small>رواية</small></Link><nav><Link href={`/${locale}/books`}>{home.nav[0]}</Link><Link href={`/${locale}`}>{home.nav[1]}</Link></nav><div className="header-tools"><div className="languages">{locales.map((item) => <Link href={`/${item}/books/${id}`} className={item === locale ? 'active' : ''} key={item}>{item.toUpperCase()}</Link>)}</div></div></header>
    <main>
      <section className="product shell"><div className="product-media"><Image src={book.image} alt={book.imageAlt} fill priority sizes="(max-width: 760px) 90vw, 480px"/></div><div className="product-copy"><Link className="back-link" href={`/${locale}/books`}>← {t.back}</Link><p className={`availability ${book.inStock ? '' : 'off'}`}>{book.inStock ? t.available : t.unavailable}</p><h1>{book.title}</h1><p className="product-author">{t.author} <strong>{book.author}</strong></p>{rating ? <p className="rating">★★★★★ <span>{rating} · {book.reviews.length}</span></p> : null}<p className="product-price">{book.price} MAD {book.originalPrice && book.originalPrice > book.price ? <del>{book.originalPrice} MAD</del> : null}</p><p className="product-description">{book.description}</p>{book.inStock ? <a className="button primary buy-button" href={book.purchaseUrl}>{t.buy}</a> : <span className="button disabled">{t.unavailable}</span>}<small className="secure-note">{t.secure}</small></div></section>
      <section className="product-information shell"><article><p className="eyebrow">{t.about}</p><div className="long-description">{book.longDescription || book.description}</div></article><aside><p className="eyebrow">{t.details}</p>{book.isbn ? <p><span>{t.isbn}</span><b>{book.isbn}</b></p> : null}<p><span>{t.condition}</span><b>{book.condition}</b></p></aside></section>
      {book.reviews.length ? <section className="reviews shell"><p className="eyebrow">{t.reviews}</p><div className="review-grid">{book.reviews.map((review) => <blockquote key={review.id}><div>{'★'.repeat(review.rating)}</div><p>“{review.comment}”</p><footer>{review.fullName}{review.city ? ` · ${review.city}` : ''}</footer></blockquote>)}</div></section> : null}
      {book.related.length ? <section className="related shell"><h2>{t.related}</h2><div className="book-grid">{book.related.map((item) => <article className="book-card" key={item.id}><Link className="cover-link" href={`/${locale}/books/${item.id}`}><Image className="cover-image" src={item.image} alt={item.imageAlt} fill sizes="220px"/></Link><p className="book-author">{item.author}</p><h3>{item.title}</h3><p className="price">{item.price} MAD</p></article>)}</div></section> : null}
    </main>
  </div>
}
