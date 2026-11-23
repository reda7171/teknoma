'use client'
import { Link } from '@/i18n/routing'
import Image from 'next/image'
import { useLocale } from 'next-intl'
import { ShoppingBag, Menu, X, Search, ArrowUpRight } from 'lucide-react'
import { useCartStore } from '@/store/cart'
import { useEffect, useState } from 'react'
import LanguageSwitcher from '@/components/LanguageSwitcher'
import { getPetCopy } from '@/lib/pets'
import { getPetContent } from '@/lib/pet-content'

export default function PetHeader() {
  const locale = useLocale(), c = getPetCopy(locale), t = getPetContent(locale)
  const count = useCartStore(s => s.items.reduce((n, i) => n + i.quantity, 0))
  const [mounted, setMounted] = useState(false), [open, setOpen] = useState(false)
  useEffect(() => setMounted(true), [])
  const links = [
    { href: '/products', label: c.all },
    { href: '/products?category=Smartphones', label: c.smartphones },
    { href: '/products?category=PC%20Portables', label: c.pc },
    { href: '/products?category=Mac%20%26%20Apple', label: c.mac },
    { href: '/products?category=Audio', label: c.care },
    { href: '/products?category=Accessoires', label: c.accessories },
    { href: '/about', label: t.about }
  ]
  return <header className="pet-header border-b border-[#17351d]/10 bg-[#fffdf8] text-[#17351d]">
    <a href="#main-content" className="sr-only z-50 rounded-lg bg-white p-4 focus:not-sr-only focus:absolute">{locale === 'ar' ? 'انتقل إلى المحتوى' : locale === 'en' ? 'Skip to content' : 'Aller au contenu'}</a>
    <div className="bg-[#17351d] px-4 py-2.5 text-center text-[11px] tracking-wide text-[#f7f0df] flex flex-wrap items-center justify-center gap-x-4 gap-y-1"><span>{c.tag}</span><span className="hidden opacity-40 sm:inline">|</span><a dir="ltr" href="tel:+212769686055" className="font-bold text-[#e5c993] hover:underline">📞 +212 769-686055</a><span className="hidden opacity-40 sm:inline">|</span><a dir="ltr" href="https://wa.me/212769686055" target="_blank" rel="noopener noreferrer" className="font-semibold text-emerald-300 hover:underline">WhatsApp 7j/7</a><span className="hidden opacity-40 sm:inline">|</span><Link href="/contact" className="hidden underline underline-offset-4 sm:inline">{c.help}</Link></div>
    <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-5 py-5 sm:px-8 md:py-6">
      <Link href="/" className="flex shrink-0 items-center gap-2" dir="ltr">
        <Image src="/logo.png" alt="Tekno Store" width={160} height={50} className="h-10 w-auto object-contain sm:h-12" priority />
      </Link>
      <form action={'/' + locale + '/products'} className="hidden w-full max-w-sm items-center gap-3 rounded-full border border-[#17351d]/15 bg-white px-4 lg:flex"><input name="search" aria-label={c.search} placeholder={c.search} className="min-w-0 flex-1 bg-transparent py-3 text-xs outline-none" /><button aria-label={c.searchButton} className="p-2"><Search className="h-4 w-4" /></button></form>
      <div className="flex shrink-0 items-center gap-3 sm:gap-5"><LanguageSwitcher /><Link href="/cart" aria-label={c.cart + ' (' + (mounted ? count : 0) + ')'} className="relative flex items-center gap-2 text-sm font-bold"><ShoppingBag className="h-5 w-5" /><span className="hidden sm:inline">{c.cart}</span><span className="rounded-full bg-[#ecead8] px-2 py-0.5 text-xs">{mounted ? count : 0}</span></Link><button aria-label={open ? 'Fermer / Close' : 'Menu'} aria-expanded={open} aria-controls="pet-navigation" className="rounded-lg border border-[#17351d]/15 p-2 md:hidden" onClick={() => setOpen(!open)}>{open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}</button></div>
    </div>
    <nav id="pet-navigation" aria-label={c.catalog} className={(open ? 'flex' : 'hidden') + ' mx-auto max-w-7xl flex-col gap-1 px-5 pb-4 text-sm font-medium sm:px-8 md:flex md:flex-row md:items-center md:gap-6'}>
      {links.map(link => <Link key={link.href} href={link.href} onClick={() => setOpen(false)} className="rounded-lg py-2 hover:text-[#96703a]">{link.label}</Link>)}
      <Link href="/contact" onClick={() => setOpen(false)} className="mt-2 flex items-center gap-2 rounded-full bg-[#f0e8d6] px-4 py-2.5 text-xs font-bold md:ms-auto md:mt-0">{c.contact}<ArrowUpRight className="h-3 w-3" /></Link>
    </nav>
  </header>
}
