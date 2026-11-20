import Link from 'next/link'
import type { Locale } from '@/lib/i18n'
import { locales } from '@/lib/i18n'

const labels = {
  fr: { line: 'Des livres choisis pour durer.', shop: 'Librairie', home: 'Accueil', all: 'Tous les livres', edit: 'La sélection', journal: 'Journal', house: 'La maison', service: 'Nos engagements', delivery: 'Livraison partout au Maroc', payment: 'Paiement à la réception', returns: 'Retour des produits défectueux', languages: 'Langues', rights: 'Tous droits réservés', country: 'Librairie indépendante · Maroc' },
  ar: { line: 'كتب نختارها لتبقى.', shop: 'المكتبة', home: 'الرئيسية', all: 'كل الكتب', edit: 'مختاراتنا', journal: 'المجلة', house: 'دار Tekno Store', service: 'التزاماتنا', delivery: 'توصيل إلى جميع مدن المغرب', payment: 'الدفع عند الاستلام', returns: 'إرجاع المنتجات المعيبة', languages: 'اللغات', rights: 'جميع الحقوق محفوظة', country: 'مكتبة مستقلة · المغرب' },
  en: { line: 'Books selected to last.', shop: 'Bookshop', home: 'Home', all: 'All books', edit: 'The edit', journal: 'Journal', house: 'Our house', service: 'Our promises', delivery: 'Delivery across Morocco', payment: 'Cash on delivery', returns: 'Defective item returns', languages: 'Languages', rights: 'All rights reserved', country: 'Independent bookshop · Morocco' },
} as const

export function SiteFooter({ locale }: { locale: Locale }) {
  const t = labels[locale]
  return <>
    <section className="footer-promises" aria-label={t.service}><div className="shell"><p><b>01</b>{t.delivery}</p><p><b>02</b>{t.payment}</p><p><b>03</b>{t.returns}</p></div></section>
    <footer className="site-footer"><div className="shell footer-grid">
      <div className="footer-brand"><Link className="wordmark inverse" href={`/${locale}`}><span>TEKNO</span><small>Tekno Store</small></Link><h2>{t.line}</h2><p>{t.country}</p></div>
      <nav aria-label={t.shop}><p className="footer-label">{t.shop}</p><Link href={`/${locale}`}>{t.home}</Link><Link href={`/${locale}/books`}>{t.all}</Link><Link href={`/${locale}#selection`}>{t.edit}</Link></nav>
      <nav aria-label={t.house}><p className="footer-label">{t.house}</p><Link href={`/${locale}/journal`}>{t.journal}</Link><Link href={`/${locale}#maison`}>{t.house}</Link></nav>
      <div className="footer-languages"><p className="footer-label">{t.languages}</p>{locales.map((item) => <Link className={item === locale ? 'active' : ''} href={`/${item}`} key={item}>{item.toUpperCase()}</Link>)}</div>
    </div><div className="shell footer-bottom"><span>© 2026 Tekno Store · {t.rights}</span><span>Casablanca · Morocco</span></div></footer>
  </>
}
