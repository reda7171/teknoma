'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
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
  const isActive = (href: string) => {
    if (!path) return href === `/${locale}#selection`
    const hrefPath = href.replace(`/${locale}/`, '').split('#')[0]
    return Boolean(hrefPath) && path.startsWith(hrefPath)
  }

  useEffect(() => {
    if (!open) return
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', closeOnEscape)
    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener('keydown', closeOnEscape)
    }
  }, [open])

  return <>
    <a className="skip-link" href="#main-content">{locale === 'ar' ? 'انتقل إلى المحتوى' : locale === 'en' ? 'Skip to content' : 'Aller au contenu'}</a>
    <div className="announcement">{locale === 'ar' ? 'توصيل إلى جميع مدن المغرب · الدفع عند الاستلام' : locale === 'en' ? 'Delivery across Morocco · Cash on delivery' : 'Livraison partout au Maroc · Paiement à la réception'}</div>
    <header className="site-header shell">
      <Link className="wordmark" href={`/${locale}`} aria-label="Riwaya, accueil"><span>RIWAYA</span><small>رواية</small></Link>
      <nav className="desktop-nav" aria-label="Navigation principale">{links.map((item) => <Link className={isActive(item.href) ? 'active' : ''} aria-current={isActive(item.href) ? 'page' : undefined} href={item.href} key={item.href}>{item.label}</Link>)}</nav>
      <div className="header-tools">
        <div className="languages" aria-label="Langues">{locales.map((item) => <Link className={item === locale ? 'active' : ''} href={`/${item}${languagePath}`} key={item}>{item.toUpperCase()}</Link>)}</div>
        <CartLink locale={locale}/>
        <button className="menu-toggle" type="button" aria-expanded={open} aria-controls="mobile-menu" aria-label={open ? t.close : t.menu} onClick={() => setOpen(!open)}><span/><span/></button>
      </div>
    </header>
    <div className={`mobile-menu ${open ? 'open' : ''}`} id="mobile-menu" aria-hidden={!open}>
      <div className="mobile-menu-inner shell">
        <p className="eyebrow">RIWAYA · MAROC</p>
        <nav aria-label={t.menu}>{links.map((item, index) => <Link className={isActive(item.href) ? 'active' : ''} aria-current={isActive(item.href) ? 'page' : undefined} href={item.href} onClick={() => setOpen(false)} key={item.href}><small>0{index + 1}</small>{item.label}</Link>)}</nav>
        <div className="mobile-languages">{locales.map((item) => <Link className={item === locale ? 'active' : ''} href={`/${item}${languagePath}`} key={item}>{item.toUpperCase()}</Link>)}</div>
        <p className="mobile-menu-note">Casablanca · Morocco<br/>Livraison nationale</p>
      </div>
    </div>
  </>
}
