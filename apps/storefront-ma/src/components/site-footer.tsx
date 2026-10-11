import Link from 'next/link'
import type { Locale } from '@/lib/i18n'

const labels = {
  fr: { line: 'Des livres choisis pour durer.', shop: 'Librairie', all: 'Tous les livres', journal: 'Journal', help: 'Service', delivery: 'Livraison partout au Maroc', payment: 'Paiement à la réception', rights: 'Tous droits réservés' },
  ar: { line: 'كتب نختارها لتبقى.', shop: 'المكتبة', all: 'كل الكتب', journal: 'المجلة', help: 'الخدمة', delivery: 'توصيل إلى جميع مدن المغرب', payment: 'الدفع عند الاستلام', rights: 'جميع الحقوق محفوظة' },
  en: { line: 'Books selected to last.', shop: 'Bookshop', all: 'All books', journal: 'Journal', help: 'Service', delivery: 'Delivery across Morocco', payment: 'Cash on delivery', rights: 'All rights reserved' },
} as const

export function SiteFooter({ locale }: { locale: Locale }) {
  const t = labels[locale]
  return <footer className="site-footer"><div className="shell footer-grid">
    <div><Link className="wordmark inverse" href={`/${locale}`}><span>RIWAYA</span><small>رواية</small></Link><h2>{t.line}</h2></div>
    <div><p className="footer-label">{t.shop}</p><Link href={`/${locale}/books`}>{t.all}</Link><Link href={`/${locale}/journal`}>{t.journal}</Link></div>
    <div><p className="footer-label">{t.help}</p><span>{t.delivery}</span><span>{t.payment}</span></div>
  </div><div className="shell footer-bottom"><span>© 2026 Riwaya · {t.rights}</span><span>Casablanca · Morocco</span></div></footer>
}
