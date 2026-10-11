import Link from 'next/link'
import Image from 'next/image'
import { notFound } from 'next/navigation'
import { getHomeCatalog } from '@/lib/catalog'
import { copy, isLocale, locales } from '@/lib/i18n'
import { CartLink } from '@/components/cart-controls'

export const dynamic = 'force-dynamic'

export default async function HomePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  if (!isLocale(locale)) notFound()
  const t = copy[locale]
  const rtl = locale === 'ar'
  const books = await getHomeCatalog(locale)

  return (
    <div dir={rtl ? 'rtl' : 'ltr'} lang={locale}>
      <div className="announcement">{t.announcement}</div>
      <header className="site-header shell">
        <Link className="wordmark" href={`/${locale}`} aria-label="Riwaya, accueil">
          <span>RIWAYA</span><small>رواية</small>
        </Link>
        <nav aria-label="Navigation principale">
          {t.nav.map((item, index) => index === 0 ? <Link href={`/${locale}/books`} key={item}>{item}</Link> : <a href="#selection" key={item}>{item}</a>)}
        </nav>
        <div className="header-tools">
          <div className="languages" aria-label="Langues">
            {locales.map((item) => <Link className={item === locale ? 'active' : ''} href={`/${item}`} key={item}>{item.toUpperCase()}</Link>)}
          </div>
          <CartLink locale={locale} />
        </div>
      </header>

      <main>
        <section className="hero shell">
          <div className="hero-copy">
            <p className="eyebrow">{t.heroEyebrow}</p>
            <h1>{t.heroTitle}</h1>
            <p className="hero-text">{t.heroText}</p>
            <div className="actions">
              <a className="button primary" href="#selection">{t.primaryCta}</a>
              <a className="text-link" href="#selection">{t.secondaryCta} <span aria-hidden>→</span></a>
            </div>
          </div>
          <div className="hero-art" aria-label="Sélection éditoriale de livres">
            <div className="arch" />
            <div className="book-object book-one"><span>الخبز<br />الحافي</span><small>محمد شكري</small></div>
            <div className="book-object book-two"><span>L’ÉTRANGER</span><small>ALBERT CAMUS</small></div>
            <p className="edition-note">ÉDITION 01<br /><strong>Histoires qui traversent le temps</strong></p>
          </div>
        </section>

        <section className="selection shell" id="selection">
          <div className="section-heading">
            <div><p className="eyebrow">{t.sectionEyebrow}</p><h2>{t.sectionTitle}</h2></div>
            <p>{t.sectionText}</p>
          </div>
          <div className="book-grid">
            {books.map((book, index) => (
              <article className="book-card" key={book.id}>
                <Link className="cover-link" href={book.href} aria-label={book.title}>
                  {book.image ? (
                    <Image
                      className="cover-image"
                      src={book.image}
                      alt={book.imageAlt}
                      fill
                      sizes="(max-width: 560px) 46vw, (max-width: 900px) 45vw, 270px"
                      priority={index < 2}
                    />
                  ) : (
                    <div className={`cover ${['green', 'burgundy', 'gold', 'ink'][index % 4]}`}><span>{book.title.slice(0, 2)}</span><i>RIWAYA</i></div>
                  )}
                </Link>
                <p className="book-author">{book.author}</p>
                <h3>{book.title}</h3>
                <p className="price">{book.price} MAD {book.originalPrice && book.originalPrice > book.price ? <del>{book.originalPrice} MAD</del> : null}</p>
              </article>
            ))}
          </div>
          <Link className="button outline" href={`/${locale}/books`}>{t.viewAll}</Link>
        </section>

        <section className="services">
          <div className="shell services-inner">
            <h2>{t.serviceTitle}</h2>
            <div className="service-list">{t.services.map((service, index) => <p key={service}><b>0{index + 1}</b>{service}</p>)}</div>
          </div>
        </section>

        <section className="newsletter shell">
          <p className="eyebrow">LETTRE RIWAYA</p>
          <h2>{t.newsletterTitle}</h2>
          <p>{t.newsletterText}</p>
          <form><label className="sr-only" htmlFor="email">{t.email}</label><input id="email" type="email" placeholder={t.email} /><button type="submit">{t.subscribe}</button></form>
        </section>
      </main>

      <footer><div className="shell footer-inner"><div className="wordmark inverse"><span>RIWAYA</span><small>رواية</small></div><p>Casablanca · Morocco</p><p>© 2026 Riwaya</p></div></footer>
    </div>
  )
}
