import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { AddToCartButton } from '@/components/cart-controls'
import { SiteFooter } from '@/components/site-footer'
import { SiteHeader } from '@/components/site-header'
import { getBook } from '@/lib/catalog'
import { isLocale } from '@/lib/i18n'

const labels = {
  fr: { books: 'Livres', author: 'Par', available: 'Disponible · expédition rapide', unavailable: 'Indisponible', about: 'L’histoire de ce livre', details: 'Informations', isbn: 'ISBN', condition: 'État', reviews: 'Ce qu’en disent les lecteurs', related: 'Continuez votre bibliothèque', delivery: 'Livraison partout au Maroc', payment: 'Paiement à la réception', selected: 'Sélectionné par PetsUnivers', returnText: 'Retour si produit défectueux', tax: 'Prix TTC', save: 'Vous économisez' },
  ar: { books: 'الكتب', author: 'للكاتب', available: 'متوفر · شحن سريع', unavailable: 'غير متوفر', about: 'عن هذا الكتاب', details: 'معلومات', isbn: 'الترقيم الدولي', condition: 'الحالة', reviews: 'آراء القراء', related: 'أكمل مكتبتك', delivery: 'توصيل إلى جميع مدن المغرب', payment: 'الدفع عند الاستلام', selected: 'من اختيار PetsUnivers', returnText: 'إرجاع المنتج المعيب', tax: 'السعر شامل', save: 'توفر' },
  en: { books: 'Books', author: 'By', available: 'Available · fast dispatch', unavailable: 'Unavailable', about: 'Inside this book', details: 'Information', isbn: 'ISBN', condition: 'Condition', reviews: 'What readers say', related: 'Continue your library', delivery: 'Delivery across Morocco', payment: 'Cash on delivery', selected: 'Selected by PetsUnivers', returnText: 'Defective item returns', tax: 'Tax included', save: 'You save' },
} as const

export async function generateMetadata({ params }: { params: Promise<{ locale: string; id: string }> }): Promise<Metadata> {
  const { locale, id } = await params
  if (!isLocale(locale)) return {}
  const book = await getBook(locale, id)
  if (!book) return { title: 'Livre introuvable' }
  return { title: book.title, description: book.description.slice(0, 160), alternates: { canonical: `/${locale}/books/${id}`, languages: { fr: `/fr/books/${id}`, ar: `/ar/books/${id}`, en: `/en/books/${id}`, 'x-default': `/fr/books/${id}` } }, openGraph: { title: book.title, description: book.description.slice(0, 160), images: book.image ? [book.image] : [] } }
}

export default async function BookPage({ params }: { params: Promise<{ locale: string; id: string }> }) {
  const { locale, id } = await params
  if (!isLocale(locale)) notFound()
  const book = await getBook(locale, id)
  if (!book) notFound()
  const t = labels[locale]
  const rating = book.reviews.length ? (book.reviews.reduce((sum, review) => sum + review.rating, 0) / book.reviews.length).toFixed(1) : null
  const saving = book.originalPrice && book.originalPrice > book.price ? book.originalPrice - book.price : 0
  const jsonLd = { '@context': 'https://schema.org', '@type': 'Book', name: book.title, author: { '@type': 'Person', name: book.author }, image: book.image, description: book.description, isbn: book.isbn || undefined, offers: { '@type': 'Offer', price: book.price, priceCurrency: 'MAD', availability: book.inStock ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock', url: `https://petsunivers.ma/${locale}/books/${book.id}` } }

  return <div dir={locale === 'ar' ? 'rtl' : 'ltr'} lang={locale}>
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c') }}/>
    <SiteHeader locale={locale} path={`books/${id}`}/><main id="main-content">
      <div className="breadcrumbs shell"><Link href={`/${locale}`}>PetsUnivers</Link><span>/</span><Link href={`/${locale}/books`}>{t.books}</Link><span>/</span><b>{book.title}</b></div>
      <section className="product shell"><div className="product-gallery"><div className="product-media"><Image src={book.image} alt={book.imageAlt} fill priority sizes="(max-width:760px) 90vw, 480px"/></div><p className="image-caption">{t.selected} · PETSUNIVERS EDIT</p></div><div className="product-copy"><p className={`stock-pill ${book.inStock ? '' : 'off'}`}>{book.inStock ? t.available : t.unavailable}</p><h1>{book.title}</h1><p className="product-author">{t.author} <strong>{book.author}</strong></p>{rating ? <p className="rating">★★★★★ <span>{rating} · {book.reviews.length}</span></p> : <p className="rating">★★★★★ <span>{t.selected}</span></p>}<div className="price-row"><p className="product-price">{book.price} MAD {book.originalPrice && book.originalPrice > book.price ? <del>{book.originalPrice} MAD</del> : null}</p>{saving ? <span className="saving">{t.save} {saving} MAD</span> : null}</div><p className="tax-note">{t.tax}</p><p className="product-description">{book.description}</p>{book.inStock ? <AddToCartButton locale={locale} product={{ id: book.id, title: book.title, author: book.author, price: book.price, image: book.image }}/> : <span className="button disabled">{t.unavailable}</span>}<div className="purchase-promises"><p><b>01</b>{t.delivery}</p><p><b>02</b>{t.payment}</p><p><b>03</b>{t.returnText}</p></div></div></section>
      <section className="product-information shell"><article><p className="eyebrow">{t.about}</p><div className="long-description">{book.longDescription || book.description}</div></article><aside><p className="eyebrow">{t.details}</p>{book.isbn ? <p><span>{t.isbn}</span><b>{book.isbn}</b></p> : null}<p><span>{t.condition}</span><b>{book.condition}</b></p><p><span>{t.author}</span><b>{book.author}</b></p></aside></section>
      {book.reviews.length ? <section className="reviews shell"><div className="section-heading"><div><p className="eyebrow">COMMUNAUTÉ PETSUNIVERS</p><h2>{t.reviews}</h2></div></div><div className="review-grid">{book.reviews.map((review) => <blockquote key={review.id}><div>{'★'.repeat(review.rating)}</div><p>“{review.comment}”</p><footer>{review.fullName}{review.city ? ` · ${review.city}` : ''}</footer></blockquote>)}</div></section> : null}
      {book.related.length ? <section className="related shell"><div className="section-heading"><div><p className="eyebrow">SÉLECTION ASSOCIÉE</p><h2>{t.related}</h2></div></div><div className="book-grid">{book.related.map((item) => <article className="book-card" key={item.id}><Link className="cover-link" href={`/${locale}/books/${item.id}`}><Image className="cover-image" src={item.image} alt={item.imageAlt} fill sizes="220px"/></Link><p className="book-author">{item.author}</p><h3>{item.title}</h3><p className="price">{item.price} MAD</p></article>)}</div></section> : null}
    </main><SiteFooter locale={locale}/>
  </div>
}
