'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { Link } from '@/i18n/routing'
import ImageWithFallback from '@/components/ImageWithFallback'
import {
  ChevronLeft,
  ChevronRight,
  ArrowUpRight,
  Smartphone,
  Laptop,
  Package,
  Headphones,
  Truck,
  ShieldCheck,
} from 'lucide-react'

export interface SliderProductPreview {
  id: string
  title: string
  author: string
  price: number
  image: string
  category?: string | null
}

interface SlideItem {
  id: string
  badge: string
  title: string
  subtitle: string
  ctaLabel: string
  ctaHref: string
  secondaryLabel: string
  secondaryHref: string
  accentColor: string
  bgClass: string
  iconName: 'smartphone' | 'laptop' | 'pack' | 'audio'
  product?: SliderProductPreview | null
}

const SLIDES_BY_LOCALE: Record<'fr' | 'en' | 'ar', Omit<SlideItem, 'product'>[]> = {
  fr: [
    {
      id: 'smartphones',
      badge: 'Nouveautés Smartphones 2026',
      title: 'iPhone 16 Pro, Galaxy S24 Ultra & Xiaomi',
      subtitle: '100% neufs sous blister d’origine avec garantie constructeur 12 mois et paiement à la livraison partout au Maroc.',
      ctaLabel: 'Voir les Smartphones',
      ctaHref: '/products?category=Smartphones',
      secondaryLabel: 'Commander via WhatsApp',
      secondaryHref: '/contact',
      accentColor: '#75C300',
      bgClass: 'bg-[#1A1C1F] text-white',
      iconName: 'smartphone',
    },
    {
      id: 'laptops',
      badge: 'Performance & Créativité',
      title: 'MacBook M3 & PC Portables Gamer',
      subtitle: 'Des machines taillées pour le développement, le montage vidéo, la bureautique et le gaming haute fréquence.',
      ctaLabel: 'Explorer les PC & Mac',
      ctaHref: '/products?category=PC%20Portables',
      secondaryLabel: 'Voir Mac & Apple',
      secondaryHref: '/products?category=Mac%20%26%20Apple',
      accentColor: '#1976D2',
      bgClass: 'bg-[#0F172A] text-white',
      iconName: 'laptop',
    },
    {
      id: 'packs',
      badge: 'Offres Spéciales Packs',
      title: 'Packs Tech Complets — Jusqu’à -15%',
      subtitle: 'Combinez smartphone, chargeur GaN et audio dans un pack prêt à l’emploi avec livraison offerte.',
      ctaLabel: 'Découvrir les Packs',
      ctaHref: '/packs',
      secondaryLabel: 'Tout le catalogue',
      secondaryHref: '/products',
      accentColor: '#75C300',
      bgClass: 'bg-[#1A1C1F] text-white',
      iconName: 'pack',
    },
    {
      id: 'audio',
      badge: 'Audio & Énergie GaN',
      title: 'AirPods Pro, Casques Sony & Chargeurs Anker',
      subtitle: 'Son haute définition avec réduction de bruit active et chargeurs rapides certifiés pour votre quotidien.',
      ctaLabel: 'Voir Audio & Accessoires',
      ctaHref: '/products?category=Audio',
      secondaryLabel: 'Accessoires',
      secondaryHref: '/products?category=Accessoires',
      accentColor: '#1976D2',
      bgClass: 'bg-[#111827] text-white',
      iconName: 'audio',
    },
  ],
  en: [
    {
      id: 'smartphones',
      badge: 'New Smartphones 2026',
      title: 'iPhone 16 Pro, Galaxy S24 Ultra & Xiaomi',
      subtitle: '100% brand-new factory sealed with 12-month official warranty and Cash on Delivery across Morocco.',
      ctaLabel: 'Shop Smartphones',
      ctaHref: '/products?category=Smartphones',
      secondaryLabel: 'Contact Sales',
      secondaryHref: '/contact',
      accentColor: '#75C300',
      bgClass: 'bg-[#1A1C1F] text-white',
      iconName: 'smartphone',
    },
    {
      id: 'laptops',
      badge: 'Performance & Creativity',
      title: 'MacBook M3 & Gaming Laptops',
      subtitle: 'Built for developers, video creators, productivity and high-refresh-rate gaming.',
      ctaLabel: 'Explore Laptops & Mac',
      ctaHref: '/products?category=PC%20Portables',
      secondaryLabel: 'Browse Mac & Apple',
      secondaryHref: '/products?category=Mac%20%26%20Apple',
      accentColor: '#1976D2',
      bgClass: 'bg-[#0F172A] text-white',
      iconName: 'laptop',
    },
    {
      id: 'packs',
      badge: 'Bundle Deals',
      title: 'Complete Tech Bundles — Up to 15% Off',
      subtitle: 'Pair your smartphone with fast GaN charging and premium audio with free delivery.',
      ctaLabel: 'View Bundles',
      ctaHref: '/packs',
      secondaryLabel: 'All Products',
      secondaryHref: '/products',
      accentColor: '#75C300',
      bgClass: 'bg-[#1A1C1F] text-white',
      iconName: 'pack',
    },
    {
      id: 'audio',
      badge: 'Audio & GaN Power',
      title: 'AirPods Pro, Sony Headphones & Anker GaN',
      subtitle: 'Hi-res active noise-canceling audio and certified fast chargers for daily mobility.',
      ctaLabel: 'Shop Audio',
      ctaHref: '/products?category=Audio',
      secondaryLabel: 'Accessories',
      secondaryHref: '/products?category=Accessoires',
      accentColor: '#1976D2',
      bgClass: 'bg-[#111827] text-white',
      iconName: 'audio',
    },
  ],
  ar: [
    {
      id: 'smartphones',
      badge: 'أحدث الهواتف 2026',
      title: 'آيفون 16 برو، جالكسي S24 ألترا وشاومي',
      subtitle: 'أجهزة جديدة 100% بعلبها الأصلية المغلقة مع ضمان 12 شهراً والدفع عند الاستلام بجميع مدن المغرب.',
      ctaLabel: 'تصفح الهواتف',
      ctaHref: '/products?category=Smartphones',
      secondaryLabel: 'تواصل معنا',
      secondaryHref: '/contact',
      accentColor: '#75C300',
      bgClass: 'bg-[#1A1C1F] text-white',
      iconName: 'smartphone',
    },
    {
      id: 'laptops',
      badge: 'أداء احترافي وإبداع',
      title: 'ماك بوك M3 وحواسيب الألعاب المحمولة',
      subtitle: 'أجهزة قوية للبرمجة، المونتاج، الأعمال المكتبية والألعاب بأعلى سرعة وأفضل سعر.',
      ctaLabel: 'اكتشف الحواسيب',
      ctaHref: '/products?category=PC%20Portables',
      secondaryLabel: 'أجهزة ماك وآبل',
      secondaryHref: '/products?category=Mac%20%26%20Apple',
      accentColor: '#1976D2',
      bgClass: 'bg-[#0F172A] text-white',
      iconName: 'laptop',
    },
    {
      id: 'packs',
      badge: 'عروض الباقات الحصرية',
      title: 'باقات التوفير التكنولوجية — خصم حتى 15%',
      subtitle: 'اجمع بين الهاتف، الشاحن السريع والسماعات في باقة واحدة مع توصيل مجاني.',
      ctaLabel: 'اكتشف الباقات',
      ctaHref: '/packs',
      secondaryLabel: 'كل المنتجات',
      secondaryHref: '/products',
      accentColor: '#75C300',
      bgClass: 'bg-[#1A1C1F] text-white',
      iconName: 'pack',
    },
    {
      id: 'audio',
      badge: 'صوتيات وشحن سريع',
      title: 'إيربودز برو، سماعات سوني وشواحن أنكر',
      subtitle: 'صوت نقي مع عزل الضوضاء وشواحن GaN فائقة السرعة ومعتمدة.',
      ctaLabel: 'تصفح الصوتيات',
      ctaHref: '/products?category=Audio',
      secondaryLabel: 'الإكسسوارات',
      secondaryHref: '/products?category=Accessoires',
      accentColor: '#1976D2',
      bgClass: 'bg-[#111827] text-white',
      iconName: 'audio',
    },
  ],
}

const SLIDE_ICONS = {
  smartphone: Smartphone,
  laptop: Laptop,
  pack: Package,
  audio: Headphones,
}

export default function PetHomeSlider({
  locale,
  featuredProducts = [],
}: {
  locale: string
  featuredProducts?: SliderProductPreview[]
}) {
  const lang = (locale in SLIDES_BY_LOCALE ? locale : 'fr') as 'fr' | 'en' | 'ar'
  const baseSlides = SLIDES_BY_LOCALE[lang]

  // Associer un produit réel du catalogue à chaque slide selon sa catégorie
  const slides: SlideItem[] = baseSlides.map((slide, idx) => {
    const matched =
      featuredProducts.find((p) => {
        const cat = (p.category || '').toLowerCase()
        if (slide.id === 'smartphones') return cat.includes('smartphone')
        if (slide.id === 'laptops') return cat.includes('pc') || cat.includes('mac')
        if (slide.id === 'audio') return cat.includes('audio')
        return false
      }) || featuredProducts[idx % Math.max(featuredProducts.length, 1)] || null

    return { ...slide, product: matched }
  })

  const [active, setActive] = useState(0)
  const [paused, setPaused] = useState(false)
  const touchStartX = useRef<number | null>(null)

  const next = useCallback(() => {
    setActive((prev) => (prev + 1) % slides.length)
  }, [slides.length])

  const prev = useCallback(() => {
    setActive((prev) => (prev - 1 + slides.length) % slides.length)
  }, [slides.length])

  useEffect(() => {
    if (paused) return
    const timer = setInterval(next, 5500)
    return () => clearInterval(timer)
  }, [paused, next])

  const current = slides[active]
  const SlideIcon = SLIDE_ICONS[current.iconName]

  return (
    <section
      aria-roledescription="carousel"
      aria-label="Promotions Tekno Store"
      className="border-b border-gray-200 bg-[#F0EFF2] pt-4 pb-2 sm:pt-6 sm:pb-4"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onTouchStart={(e) => {
        touchStartX.current = e.touches[0]?.clientX ?? null
      }}
      onTouchEnd={(e) => {
        if (touchStartX.current === null) return
        const diff = touchStartX.current - (e.changedTouches[0]?.clientX ?? touchStartX.current)
        if (Math.abs(diff) > 45) {
          if (diff > 0) next()
          else prev()
        }
        touchStartX.current = null
      }}
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-8">
        <div
          className={`relative overflow-hidden rounded-3xl shadow-lg transition-colors duration-500 ${current.bgClass}`}
        >
          {/* Motif discret d'arrière-plan */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -end-24 -top-24 h-72 w-72 rounded-full bg-[#75C300]/10 blur-3xl"
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -bottom-24 -start-24 h-72 w-72 rounded-full bg-[#1976D2]/15 blur-3xl"
          />

          <div className="relative grid min-h-[300px] items-center gap-6 px-6 py-8 sm:min-h-[340px] sm:px-12 sm:py-10 lg:grid-cols-[1.25fr_0.75fr]">
            {/* Texte & CTA */}
            <div className="z-10">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3.5 py-1.5 text-xs font-bold tracking-wide text-[#75C300]">
                <SlideIcon className="h-3.5 w-3.5" />
                <span>{current.badge}</span>
              </div>

              <h2 className="mt-4 max-w-2xl font-sans text-2xl font-black leading-tight tracking-tight text-white sm:text-4xl">
                {current.title}
              </h2>

              <p className="mt-3 max-w-xl text-sm leading-relaxed text-gray-300 sm:text-base">
                {current.subtitle}
              </p>

              <div className="mt-6 flex flex-wrap items-center gap-3">
                <Link
                  href={current.ctaHref}
                  className="inline-flex items-center gap-2 rounded-full bg-[#75C300] px-6 py-3 text-sm font-black text-[#1A1C1F] shadow-sm transition hover:bg-[#68ad00] active:scale-95"
                >
                  <span>{current.ctaLabel}</span>
                  <ArrowUpRight className="h-4 w-4" />
                </Link>
                <Link
                  href={current.secondaryHref}
                  className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/5 px-5 py-3 text-sm font-bold text-white transition hover:bg-white/15"
                >
                  {current.secondaryLabel}
                </Link>
              </div>

              <div className="mt-6 flex flex-wrap items-center gap-4 text-[11px] font-medium text-gray-400">
                <span className="inline-flex items-center gap-1.5">
                  <Truck className="h-3.5 w-3.5 text-[#75C300]" />
                  {lang === 'ar' ? 'توصيل سريع 24/48 ساعة' : lang === 'en' ? 'Fast 24/48h Delivery' : 'Livraison 24/48h'}
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <ShieldCheck className="h-3.5 w-3.5 text-[#1976D2]" />
                  {lang === 'ar' ? 'الدفع عند الاستلام' : lang === 'en' ? 'Cash on Delivery' : 'Paiement à la livraison (COD)'}
                </span>
              </div>
            </div>

            {/* Aperçu produit du catalogue */}
            <div className="z-10 flex justify-center lg:justify-end">
              {current.product ? (
                <Link
                  href={`/products/${current.product.id}`}
                  className="group flex w-full max-w-[290px] items-center gap-4 rounded-2xl border border-white/15 bg-white/95 p-3.5 text-[#1A1C1F] shadow-2xl transition hover:-translate-y-1 sm:flex-col sm:items-stretch sm:p-4"
                >
                  <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-xl bg-gray-50 sm:h-40 sm:w-full">
                    <ImageWithFallback
                      src={current.product.image}
                      alt={current.product.title}
                      fallback="/book-placeholder.png"
                      className="h-full w-full object-contain p-2 transition-transform duration-300 group-hover:scale-105"
                      priority={active === 0}
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-[#1976D2]">
                      {current.product.author || 'Tekno Store'}
                    </p>
                    <p className="mt-0.5 line-clamp-2 text-xs font-bold text-[#1A1C1F] sm:text-sm">
                      {current.product.title}
                    </p>
                    <p className="mt-1.5 text-base font-black text-[#1A1C1F]">
                      {current.product.price.toLocaleString('fr-FR')}{' '}
                      <span className="text-xs font-bold text-[#1976D2]">DH</span>
                    </p>
                  </div>
                </Link>
              ) : (
                <div className="flex h-44 w-44 items-center justify-center rounded-3xl border border-white/10 bg-white/5 text-[#75C300]">
                  <SlideIcon className="h-20 w-20 opacity-85" />
                </div>
              )}
            </div>
          </div>

          {/* Boutons Précédent / Suivant */}
          <button
            type="button"
            onClick={prev}
            aria-label={lang === 'ar' ? 'السابق' : lang === 'en' ? 'Previous slide' : 'Slide précédente'}
            className="absolute start-2.5 top-1/2 z-20 hidden h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-white/15 bg-black/40 text-white backdrop-blur-xs transition hover:bg-black/70 sm:flex"
          >
            <ChevronLeft className="h-5 w-5 rtl:rotate-180" />
          </button>
          <button
            type="button"
            onClick={next}
            aria-label={lang === 'ar' ? 'التالي' : lang === 'en' ? 'Next slide' : 'Slide suivante'}
            className="absolute end-2.5 top-1/2 z-20 hidden h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-white/15 bg-black/40 text-white backdrop-blur-xs transition hover:bg-black/70 sm:flex"
          >
            <ChevronRight className="h-5 w-5 rtl:rotate-180" />
          </button>

          {/* Indicateurs (dots) */}
          <div className="relative z-20 flex items-center justify-center gap-2 pb-4">
            {slides.map((s, idx) => (
              <button
                key={s.id}
                type="button"
                onClick={() => setActive(idx)}
                aria-label={`Slide ${idx + 1}: ${s.badge}`}
                aria-current={idx === active ? 'true' : undefined}
                className={`h-2 rounded-full transition-all ${
                  idx === active ? 'w-7 bg-[#75C300]' : 'w-2 bg-white/35 hover:bg-white/60'
                }`}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
