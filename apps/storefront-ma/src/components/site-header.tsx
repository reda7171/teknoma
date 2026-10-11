'use client'

import Link from 'next/link'
import { useState } from 'react'
import type { Locale } from '@/lib/i18n'
import { locales } from '@/lib/i18n'
import { CartLink } from './cart-controls'

const labels = {
  fr: { books: 'Livres', edit: 'La sélection', journal: 'Journal', promise: 'Notre maison', menu: 'Menu', close: 'Fermer' },
  ar: { books: 'الكتب', edit: 'مختاراتنا', journal: 'المجلة', promise: 'دار رواية', menu: 'القائمة', close: 'إغلاق' },
  en: { books: 'Books', edit: 'The edit', journal: 'Journal', promise: 'Our house', menu: 'Menu', close: 'Close' },
} as const

export function SiteHeader({ locale, path = '' }: { locale: Locale; path?: string }) {
  const [open, setOpen] = useState(false)
  const t = labels[locale]
  const links = [
    { href: `/${locale}/books`, label: t.books },
    { href: `/${locale}#selection`, label: t.edit },
    { href: `/${locale}/journal`, label: t.journal },
    { href: `/${locale}#maison`, label: t.promise },
  ]
  const languagePath = path ? `/${path.replace(/^\//, '')}` : ''

  return <>
    <div className="announcement">{locale === 'ar' ? 'توصيل إلى جميع مدن المغرب · الدفع عند الاستلام' : locale === 'en' ? 'Delivery across Morocco · Cash on delivery' : 'Livraison partout au Maroc · Paiement à la réception'}</div>
    <header className="site-header shell">
      <Link className="wordmark" href={`/${locale}`} aria-label="Riwaya, accueil"><span>RIWAYA</span><small>رواية</small></Link>
      <nav className="desktop-nav" aria-label="Navigation principale">{links.map((item) => <Link href={item.href} key={item.href}>{item.label}</Link>)}</nav>
      <div className="header-tools">
        <div className="languages" aria-label="Langues">{locales.map((item) => <Link className={item === locale ? 'active' : ''} href={`/${item}${languagePath}`} key={item}>{item.toUpperCase()}</Link>)}</div>
        <CartLink locale={locale}/>
        <button className="menu-toggle" type="button" aria-expanded={open} aria-controls="mobile-menu" aria-label={open ? t.close : t.menu} onClick={() => setOpen(!open)}><span/><span/></button>
      </div>
    </header>
    <div className={`mobile-menu ${open ? 'open' : ''}`} id="mobile-menu" aria-hidden={!open}>
      <div className="mobile-menu-inner shell">
        <p className="eyebrow">RIWAYA · MAROC</p>
        <nav>{links.map((item, index) => <Link href={item.href} onClick={() => setOpen(false)} key={item.href}><small>0{index + 1}</small>{item.label}</Link>)}</nav>
        <div className="mobile-languages">{locales.map((item) => <Link className={item === locale ? 'active' : ''} href={`/${item}${languagePath}`} key={item}>{item.toUpperCase()}</Link>)}</div>
        <p className="mobile-menu-note">Casablanca · Morocco<br/>Livraison nationale</p>
      </div>
    </div>
  </>
}
