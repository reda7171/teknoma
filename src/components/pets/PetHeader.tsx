'use client'

import { Link } from '@/i18n/routing'
import Image from 'next/image'
import { useLocale } from 'next-intl'
import {
  ShoppingBag,
  Menu,
  X,
  Search,
  Phone,
  MessageCircle,
  Truck,
  ShieldCheck,
  Sparkles,
  ChevronDown,
  Smartphone,
  Laptop,
  Monitor,
  Zap,
  Headphones,
  HardDrive,
} from 'lucide-react'
import { useCartStore } from '@/store/cart'
import { useEffect, useRef, useState } from 'react'
import LanguageSwitcher from '@/components/LanguageSwitcher'
import { getPetCopy, PET_CATEGORIES } from '@/lib/pets'
import { getPetContent } from '@/lib/pet-content'
import { useSiteLogo } from '@/components/SiteLogoProvider'

const CATEGORY_ICONS: Record<string, typeof Smartphone> = {
  Smartphones: Smartphone,
  'PC Portables': Laptop,
  'Mac & Apple': Monitor,
  Accessoires: Zap,
  Audio: Headphones,
  Stockage: HardDrive,
}

export default function PetHeader() {
  const locale = useLocale()
  const c = getPetCopy(locale)
  const t = getPetContent(locale)
  const siteLogo = useSiteLogo()
  const count = useCartStore((s) => s.items.reduce((n, i) => n + i.quantity, 0))
  const [mounted, setMounted] = useState(false)
  const [open, setOpen] = useState(false)
  const [expandedCat, setExpandedCat] = useState<string | null>(null)
  const headerRef = useRef<HTMLElement>(null)
  const [headerHeight, setHeaderHeight] = useState<number | null>(null)

  useEffect(() => setMounted(true), [])
  useEffect(() => {
    const el = headerRef.current
    if (!el || typeof ResizeObserver === 'undefined') return
    const update = () => setHeaderHeight(el.getBoundingClientRect().height)
    update()
    const observer = new ResizeObserver(update)
    observer.observe(el)
    return () => observer.disconnect()
  }, [])
  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [open])

  const links = [
    { href: '/products', label: c.all },
    { href: '/products?category=Smartphones', label: c.smartphones },
    { href: '/products?category=PC%20Portables', label: c.pc },
    { href: '/products?category=Mac%20%26%20Apple', label: c.mac },
    { href: '/products?category=Audio', label: c.care },
    { href: '/products?category=Accessoires', label: c.accessories },
    { href: '/products?category=Stockage', label: c.small },
    { href: '/about', label: t.about }
  ]

  return (
    <>
    <header ref={headerRef} className="fixed inset-x-0 top-0 z-50 bg-white shadow-sm">
      <a
        href="#main-content"
        className="sr-only z-50 rounded-lg bg-white p-4 focus:not-sr-only focus:absolute"
      >
        {locale === 'ar' ? 'انتقل إلى المحتوى' : locale === 'en' ? 'Skip to content' : 'Aller au contenu'}
      </a>

      {/* MicroMagma-style Top Bar in Deep Carbon Black */}
      <div className="bg-[#1A1C1F] text-white px-4 py-2 text-[11px] tracking-wide">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-1.5 font-semibold text-[#75C300]">
              <Truck className="h-3.5 w-3.5" />
              Livraison 24/48h au Maroc
            </span>
            <span className="hidden opacity-30 sm:inline">|</span>
            <span className="hidden items-center gap-1 text-gray-300 sm:inline-flex">
              <ShieldCheck className="h-3.5 w-3.5 text-[#75C300]" />
              Paiement à la livraison (COD)
            </span>
          </div>

          <div className="flex items-center gap-4 ms-auto text-xs">
            <a
              dir="ltr"
              href="tel:+212769686055"
              className="inline-flex items-center gap-1 font-bold text-white hover:text-[#75C300] transition-colors"
            >
              <Phone className="h-3 w-3 text-[#75C300]" />
              +212 769-686055
            </a>
            <span className="opacity-30">|</span>
            <a
              dir="ltr"
              href="https://wa.me/212769686055"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 font-semibold text-[#75C300] hover:underline"
            >
              <MessageCircle className="h-3.5 w-3.5" />
              WhatsApp 7j/7
            </a>
          </div>
        </div>
      </div>

      {/* Main Header Bar */}
      <div className="border-b border-gray-100 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3.5 sm:px-8 sm:py-4">
          {/* Logo */}
          <Link href="/" className="flex shrink-0 items-center gap-2" dir="ltr">
            <Image
              src={siteLogo}
              alt="Tekno Store"
              width={160}
              height={45}
              className="h-9 sm:h-11 w-auto object-contain"
              priority
            />
          </Link>

          {/* Central Search Bar (MicroMagma style) */}
          <form
            action={'/' + locale + '/products'}
            className="hidden w-full max-w-lg items-center rounded-full border border-gray-200 bg-gray-50/80 px-2 py-1 transition focus-within:border-[#1976D2] focus-within:bg-white focus-within:shadow-sm md:flex"
          >
            <input
              name="search"
              aria-label={c.search}
              placeholder={c.search || 'Rechercher un smartphone, PC, marque...'}
              className="min-w-0 flex-1 bg-transparent px-3 py-1.5 text-xs text-[#1A1C1F] outline-none placeholder:text-gray-400"
            />
            <button
              type="submit"
              aria-label={c.searchButton}
              className="flex items-center gap-1.5 rounded-full bg-[#75C300] px-4 py-1.5 text-xs font-bold text-[#1A1C1F] hover:bg-[#68ad00] transition active:scale-95 cursor-pointer"
            >
              <Search className="h-3.5 w-3.5" />
              <span className="hidden lg:inline">Rechercher</span>
            </button>
          </form>

          {/* Actions: Lang switcher + Cart */}
          <div className="flex shrink-0 items-center gap-3 sm:gap-4">
            <LanguageSwitcher />

            <Link
              href="/cart"
              aria-label={c.cart + ' (' + (mounted ? count : 0) + ')'}
              className="group relative flex items-center gap-2.5 rounded-full bg-gray-100 hover:bg-gray-200/80 px-4 py-2 text-xs font-bold text-[#1A1C1F] transition-colors"
            >
              <ShoppingBag className="h-4 w-4 text-[#1976D2] group-hover:scale-110 transition-transform" />
              <span className="hidden sm:inline">{c.cart}</span>
              <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-[#75C300] px-1.5 text-[10px] font-black text-[#1A1C1F]">
                {mounted ? count : 0}
              </span>
            </Link>

            <button
              aria-label={open ? 'Fermer / Close' : 'Menu'}
              aria-expanded={open}
              aria-controls="pet-navigation"
              className="rounded-lg border border-gray-200 p-2 text-[#1A1C1F] md:hidden hover:bg-gray-50"
              onClick={() => setOpen(!open)}
            >
              {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Search Bar */}
        <div className="px-4 pb-3 md:hidden">
          <form
            action={'/' + locale + '/products'}
            className="flex w-full items-center rounded-full border border-gray-200 bg-gray-50 px-3 py-1.5"
          >
            <input
              name="search"
              aria-label={c.search}
              placeholder={c.search || 'Rechercher un produit...'}
              className="min-w-0 flex-1 bg-transparent text-xs text-[#1A1C1F] outline-none"
            />
            <button
              type="submit"
              aria-label={c.searchButton}
              className="rounded-full bg-[#75C300] p-1.5 text-[#1A1C1F]"
            >
              <Search className="h-3.5 w-3.5" />
            </button>
          </form>
        </div>
      </div>

      {/* Category Navigation Bar (Desktop) */}
      <nav
        aria-label={c.catalog}
        className="mx-auto hidden max-w-7xl flex-row items-center gap-1 border-t border-gray-100 px-4 py-2.5 text-xs font-semibold sm:px-8 md:flex"
      >
        {links.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="rounded-lg px-3 py-2 text-gray-700 hover:bg-gray-100 hover:text-[#1976D2] transition-colors"
          >
            {link.label}
          </Link>
        ))}

        <Link
          href="/products?packs=true"
          className="inline-flex items-center gap-1 rounded-lg px-3 py-2 font-bold text-[#1976D2] hover:bg-blue-50 transition-colors"
        >
          <Sparkles className="h-3.5 w-3.5 text-[#75C300]" />
          Packs Promo
        </Link>

        <Link
          href="/contact"
          className="ms-auto flex items-center justify-center gap-1.5 rounded-full bg-[#75C300] px-4 py-1.5 text-xs font-bold text-[#1A1C1F] hover:bg-[#68ad00] transition"
        >
          {c.contact}
        </Link>
      </nav>

      {/* Mobile Sandwich Menu — Plein écran, uniquement les catégories Tekno */}
      {open && (
        <nav
          id="pet-navigation"
          aria-label={c.catalog}
          className="fixed inset-0 z-[100] flex flex-col bg-white md:hidden"
        >
          {/* En-tête plein écran */}
          <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
            <span className="text-base font-black tracking-tight text-[#1A1C1F]">
              {locale === 'ar' ? 'الفئات' : locale === 'en' ? 'Categories' : 'Catégories'}
            </span>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label={locale === 'ar' ? 'إغلاق' : locale === 'en' ? 'Close' : 'Fermer'}
              className="flex h-10 w-10 items-center justify-center rounded-full border border-gray-200 bg-gray-50 text-[#1A1C1F] hover:bg-gray-100"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Barre de recherche en haut du menu mobile */}
          <div className="border-b border-gray-100 px-4 py-3">
            <form
              action={'/' + locale + '/products'}
              onSubmit={() => setOpen(false)}
              className="flex w-full items-center rounded-full border border-gray-200 bg-gray-50 px-3 py-2 focus-within:border-[#1976D2] focus-within:bg-white"
            >
              <input
                name="search"
                aria-label={c.search}
                placeholder={c.search || 'Rechercher un produit...'}
                className="min-w-0 flex-1 bg-transparent text-xs text-[#1A1C1F] outline-none placeholder:text-gray-400"
              />
              <button
                type="submit"
                aria-label={c.searchButton}
                className="rounded-full bg-[#75C300] p-1.5 text-[#1A1C1F] hover:bg-[#68ad00]"
              >
                <Search className="h-4 w-4" />
              </button>
            </form>
          </div>

          {/* Liste plein écran des catégories Tekno (sous-menus au clic) */}
          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-2.5">
            {Object.entries(PET_CATEGORIES).map(([cat, subcats]) => {
              const Icon = CATEGORY_ICONS[cat] || Smartphone
              const isExpanded = expandedCat === cat
              const catLabel =
                cat === 'Smartphones'
                  ? c.smartphones
                  : cat === 'PC Portables'
                    ? c.pc
                    : cat === 'Mac & Apple'
                      ? c.mac
                      : cat === 'Audio'
                        ? c.care
                        : cat === 'Accessoires'
                          ? c.accessories
                          : cat === 'Stockage'
                            ? c.small
                            : cat

              return (
                <div key={cat} className="overflow-hidden rounded-2xl border border-gray-200 bg-gray-50/70">
                  <button
                    type="button"
                    onClick={() => setExpandedCat(isExpanded ? null : cat)}
                    aria-expanded={isExpanded}
                    className="flex w-full items-center justify-between px-4 py-3.5 text-sm font-black text-[#1A1C1F] transition hover:bg-white hover:text-[#1976D2]"
                  >
                    <span className="flex items-center gap-3">
                      <span className="flex h-9 w-9 items-center justify-center rounded-xl border border-gray-200 bg-white text-[#1976D2]">
                        <Icon className="h-4 w-4" />
                      </span>
                      <span>{catLabel}</span>
                    </span>
                    <ChevronDown
                      className={`h-5 w-5 text-gray-400 transition-transform ${isExpanded ? 'rotate-180 text-[#1976D2]' : ''}`}
                    />
                  </button>

                  {isExpanded && (
                    <ul className="divide-y divide-gray-100 border-t border-gray-200 bg-white">
                      <li>
                        <Link
                          href={`/products?category=${encodeURIComponent(cat)}`}
                          onClick={() => setOpen(false)}
                          className="flex items-center justify-between px-4 py-3 text-xs font-bold text-[#4e8200] hover:bg-gray-50"
                        >
                          <span>{locale === 'ar' ? 'الكل' : locale === 'en' ? 'View all' : 'Tout voir'}</span>
                        </Link>
                      </li>
                      {subcats.map((sub) => (
                        <li key={sub}>
                          <Link
                            href={`/products?category=${encodeURIComponent(cat)}&brand=${encodeURIComponent(sub)}`}
                            onClick={() => setOpen(false)}
                            className="flex items-center justify-between px-4 py-3 text-xs font-medium text-gray-700 hover:bg-gray-50 hover:text-[#1976D2]"
                          >
                            <span>{sub}</span>
                          </Link>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )
            })}
          </div>
        </nav>
      )}
    </header>
    <div
      aria-hidden="true"
      style={headerHeight ? { height: `${headerHeight}px` } : undefined}
      className="h-[146px] sm:h-[154px] md:h-[156px]"
    />
    </>
  )
}
