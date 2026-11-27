import { HomeWorlds, HomeMore } from '@/components/pets/PetHomeSections'
import HeaderWithUser from '@/components/HeaderWithUser'
import Footer from '@/components/Footer'
import PetArtwork from '@/components/pets/PetArtwork'
import PetProductGrid from '@/components/pets/PetProductGrid'
import PetBrandStrip from '@/components/pets/PetBrandStrip'
import PetHomeSlider from '@/components/pets/PetHomeSlider'
import PetPromoPacks from '@/components/pets/PetPromoPacks'
import PetTestimonials from '@/components/pets/PetTestimonials'
import { Link } from '@/i18n/routing'
import { getPetCopy } from '@/lib/pets'
import { prisma } from '@/lib/prisma'
import { getSetting } from '@/lib/actions/site-settings'
import {
  ArrowUpRight,
  Smartphone,
  Laptop,
  Monitor,
  Headphones,
  Zap,
  HardDrive,
  Truck,
  ShieldCheck,
  Sparkles,
  HeartHandshake,
  Star,
  CheckCircle2,
  Clock,
  MessageCircle,
  Cpu
} from 'lucide-react'
import type { Metadata } from 'next'

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params
  const c = getPetCopy(locale)
  return {
    title: `Tekno Store — Smartphones, PC, Mac & Accessoires au Maroc | Tekno.ma`,
    description: c.intro,
    keywords: [
      'smartphone Maroc',
      'iPhone Maroc',
      'MacBook Maroc',
      'PC Portable gamer Casablanca',
      'Samsung Galaxy Maroc',
      'accessoires tech Maroc',
      'AirPods Maroc',
      'Tekno Store',
      'tekno.ma'
    ],
    openGraph: {
      title: `Tekno Store — Smartphones, PC, Mac & Accessoires au Maroc`,
      description: c.intro,
      type: 'website',
      locale: locale === 'ar' ? 'ar_MA' : locale === 'en' ? 'en_US' : 'fr_FR'
    }
  }
}

export default async function Home({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  const c = getPetCopy(locale)

  const [products, pinnedSettingId] = await Promise.all([
    prisma.book.findMany({
      where: { active: true, status: 'APPROVED' },
      orderBy: { createdAt: 'desc' },
      take: 12
    }),
    getSetting('hero_pinned_book_id')
  ])

  let pinnedProduct = null
  if (pinnedSettingId) {
    pinnedProduct = await prisma.book.findUnique({
      where: { id: pinnedSettingId, active: true },
      select: {
        id: true,
        title: true,
        author: true,
        image: true,
        price: true,
      }
    })
  }

  const categories = [
    { key: 'Smartphones', label: c.smartphones, icon: Smartphone, color: 'bg-white border border-gray-200 text-[#1A1C1F]', count: 'iPhone, Galaxy & Xiaomi' },
    { key: 'PC Portables', label: c.pc, icon: Laptop, color: 'bg-white border border-gray-200 text-[#1A1C1F]', count: 'Gamer & Ultrabooks' },
    { key: 'Mac & Apple', label: c.mac, icon: Monitor, color: 'bg-white border border-gray-200 text-[#1A1C1F]', count: 'MacBook, iMac & iPad' },
    { key: 'Audio', label: c.care, icon: Headphones, color: 'bg-white border border-gray-200 text-[#1A1C1F]', count: 'AirPods & Casques Hi-Res' },
    { key: 'Accessoires', label: c.accessories, icon: Zap, color: 'bg-white border border-gray-200 text-[#1A1C1F]', count: 'Chargeurs GaN & Câbles' },
    { key: 'Stockage', label: c.small, icon: HardDrive, color: 'bg-white border border-gray-200 text-[#1A1C1F]', count: 'SSD Externes & Hubs' }
  ]

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'ElectronicsStore',
    name: 'Tekno Store',
    image: 'https://tekno.ma/logo.png',
    description: c.intro,
    url: 'https://tekno.ma',
    priceRange: '$$',
    areaServed: {
      '@type': 'Country',
      name: 'Morocco'
    },
    paymentAccepted: 'Cash, Cash on Delivery',
    aggregateRating: {
      '@type': 'AggregateRating',
      ratingValue: '4.9',
      reviewCount: '2150'
    }
  }

  return (
    <>
      <HeaderWithUser />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <main id="main-content" className="pets-store bg-[#F0EFF2] text-[#1A1C1F]">
        {/* SLIDER PROMO / MISES EN AVANT APRÈS LE MENU */}
        <PetHomeSlider
          locale={locale}
          featuredProducts={products.slice(0, 6).map((p) => {
            let img = p.image
            try {
              const parsed = JSON.parse(img)
              if (Array.isArray(parsed)) img = parsed[0] || ''
            } catch {}
            return {
              id: p.id,
              title: p.title,
              author: p.author,
              price: p.price,
              image: img,
              category: p.category,
            }
          })}
        />

        {/* HERO SECTION (MicroMagma High-Tech Aesthetic) */}
        <section className="relative overflow-hidden border-b border-gray-200 bg-white py-12 md:py-20">
          <div className="mx-auto grid max-w-7xl items-center gap-10 px-5 sm:px-8 lg:grid-cols-2">
            <div>
              {/* Top Badge */}
              <div className="mb-6 flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-gray-50 px-4 py-2 text-xs font-bold text-[#1976D2] tracking-wide">
                  <Cpu className="h-4 w-4 text-[#75C300]" />
                  {c.heroBadge}
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-[#75C300]/15 px-3 py-1.5 text-xs font-bold text-[#4e8200]">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Paiement à la livraison
                </span>
              </div>

              {/* Main Headline */}
              <h1 className="max-w-xl font-sans font-black text-4xl leading-[1.1] tracking-tight text-[#1A1C1F] sm:text-5xl md:text-6xl">
                {c.title}
              </h1>

              {/* Intro Text */}
              <p className="mt-5 max-w-lg text-sm leading-7 text-gray-600 sm:text-base">
                {c.intro}
              </p>

              {/* Action Buttons (MicroMagma Green & Tech Blue) */}
              <div className="mt-8 flex flex-wrap items-center gap-3.5">
                <Link
                  href="/products"
                  className="inline-flex items-center gap-2.5 rounded-full bg-[#75C300] px-7 py-3.5 text-sm font-bold text-[#1A1C1F] shadow-sm transition hover:bg-[#68ad00] hover:shadow-md active:scale-95"
                >
                  {c.shop}
                  <ArrowUpRight className="h-4 w-4" />
                </Link>
                <Link
                  href="/services"
                  className="rounded-full border border-gray-300 bg-white px-7 py-3.5 text-sm font-bold text-[#1A1C1F] transition hover:border-[#1976D2] hover:text-[#1976D2] hover:bg-gray-50"
                >
                  {c.services}
                </Link>
              </div>

              {/* Social Proof Pill & Trust Metrics */}
              <div className="mt-10 border-t border-gray-100 pt-6">
                <div className="flex flex-wrap items-center gap-6 text-xs text-gray-500">
                  <div className="flex items-center gap-1.5">
                    <div className="flex text-amber-500">
                      {[...Array(5)].map((_, i) => (
                        <Star key={i} className="h-4 w-4 fill-current" />
                      ))}
                    </div>
                    <span className="font-bold text-[#1A1C1F]">{c.heroSocialProof}</span>
                  </div>
                  <span className="hidden h-4 w-px bg-gray-200 sm:inline" />
                  <div className="flex items-center gap-1.5 font-medium">
                    <Clock className="h-4 w-4 text-[#1976D2]" />
                    <span>Livraison rapide 24/48h</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Hero Visual Artwork with Floating Trust Cards */}
            <div className="relative mx-auto w-full max-w-md lg:max-w-lg">
              <div className="rounded-3xl border border-gray-200 bg-white p-3 shadow-2xl">
                <PetArtwork product={pinnedProduct} />
              </div>

              {/* Floating Reassurance Badge Left */}
              <div className="absolute -bottom-4 start-0 flex items-center gap-3 rounded-2xl border border-gray-200 bg-white/95 backdrop-blur-sm px-4 py-3 shadow-lg">
                <ShieldCheck className="h-5 w-5 text-[#75C300]" />
                <div>
                  <p className="text-[11px] font-bold text-[#1A1C1F]">100% Neuf & Scellé</p>
                  <p className="text-[10px] text-gray-500">Garantie constructeur 12M</p>
                </div>
              </div>

              {/* Floating WhatsApp Quick Pill Right */}
              <div className="absolute -top-3 end-0 flex items-center gap-2 rounded-2xl border border-emerald-500/30 bg-emerald-50 px-4 py-2.5 shadow-md">
                <MessageCircle className="h-4 w-4 text-emerald-700" />
                <span className="text-[11px] font-bold text-emerald-900">Conseillers WhatsApp 7j/7</span>
              </div>
            </div>
          </div>
        </section>

        {/* 4-PILLAR TRUST BAR (MicroMagma Reassurance Strip) */}
        <div className="border-b border-gray-200 bg-white">
          <div className="mx-auto grid max-w-7xl grid-cols-1 gap-4 px-5 py-6 sm:grid-cols-2 lg:grid-cols-4 sm:px-8">
            {[
              { icon: Truck, title: c.delivery, subtitle: 'Casablanca, Rabat, Marrakech et tout le Maroc' },
              { icon: ShieldCheck, title: c.secure, subtitle: 'Paiement en espèces à la livraison (COD)' },
              { icon: Sparkles, title: c.authenticProducts, subtitle: 'Marques certifiées d’origine' },
              { icon: HeartHandshake, title: c.help, subtitle: 'Support client réactif par WhatsApp & Tél' }
            ].map(({ icon: Icon, title, subtitle }) => (
              <div key={title} className="flex items-center gap-3.5 p-2">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gray-50 border border-gray-200 text-[#1976D2]">
                  <Icon className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs font-bold text-[#1A1C1F]">{title}</p>
                  <p className="text-[11px] text-gray-500">{subtitle}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* BRAND STRIP (MicroMagma Brands Showcase) */}
        <PetBrandStrip title={c.brandsTitle} />

        {/* CATEGORIES SECTION */}
        <section className="mx-auto max-w-7xl px-5 py-14 sm:px-8">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-[#1976D2]">Tekno Store</p>
              <h2 className="mt-2 font-sans font-black text-2xl sm:text-3xl md:text-4xl text-[#1A1C1F]">{c.categories}</h2>
              <p className="mt-1 text-xs sm:text-sm text-gray-500">{c.categoriesText}</p>
            </div>
            <Link
              href="/products"
              className="inline-flex items-center gap-2 text-xs sm:text-sm font-bold text-[#1976D2] hover:underline"
            >
              {c.all}
              <ArrowUpRight className="h-4 w-4" />
            </Link>
          </div>

          <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
            {categories.map(({ key, label, icon: Icon, color, count }) => (
              <Link
                key={key}
                href={'/products?category=' + encodeURIComponent(key)}
                className={`group flex flex-col items-center rounded-2xl p-5 transition-all duration-200 hover:-translate-y-1 hover:border-[#1976D2] hover:shadow-lg ${color}`}
              >
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gray-50 text-[#1A1C1F] group-hover:bg-blue-50 group-hover:text-[#1976D2] transition-colors">
                  <Icon className="h-7 w-7 stroke-[1.5]" />
                </div>
                <span className="mt-3 text-center text-xs font-bold text-[#1A1C1F] group-hover:text-[#1976D2] transition-colors">{label}</span>
                <span className="mt-1 text-center text-[10px] text-gray-400">{count}</span>
                <ArrowUpRight className="mt-2.5 h-3.5 w-3.5 text-gray-400 group-hover:text-[#75C300] transition-colors" />
              </Link>
            ))}
          </div>
        </section>

        {/* WORLDS SECTION */}
        <HomeWorlds locale={locale} />

        {/* PRODUCTS WITH CLIENT TABS */}
        <section className="mx-auto max-w-7xl px-5 pb-16 sm:px-8">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-[#1976D2]">Catalogue Officiel</p>
              <h2 className="mt-1 font-sans font-black text-2xl sm:text-3xl md:text-4xl text-[#1A1C1F]">{c.products}</h2>
            </div>
            <Link href="/products" className="flex items-center gap-2 text-xs sm:text-sm font-bold text-[#1976D2] hover:underline">
              {c.all}
              <ArrowUpRight className="h-4 w-4" />
            </Link>
          </div>

          <PetProductGrid
            products={products}
            locale={locale}
            allLabel={c.all}
            viewAllLabel={c.all}
            emptyTitle={c.empty}
            emptyText={c.emptyText}
          />
        </section>

        {/* PROMOTIONAL VALUE PACKS */}
        <PetPromoPacks
          locale={locale}
          title={c.packSectionTitle}
          subtitle={c.packSectionText} orderNowLabel={''} />

        {/* SERVICES BANNER (Carbon Black & MicroMagma Green) */}
        <section className="mx-5 mb-16 rounded-3xl bg-[#1A1C1F] px-6 py-12 text-white md:mx-auto md:max-w-7xl md:px-12 shadow-xl">
          <div className="grid items-center gap-8 md:grid-cols-[1.4fr_1fr]">
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-[#75C300]">{c.serviceTag}</p>
              <h2 className="mt-3 max-w-lg font-sans font-black text-3xl sm:text-4xl leading-tight">{c.serviceTitle}</h2>
              <p className="mt-4 max-w-lg text-xs sm:text-sm leading-6 text-gray-300">{c.serviceText}</p>
              <Link
                href="/services"
                className="mt-6 inline-flex items-center gap-2.5 rounded-full bg-[#75C300] px-6 py-3 text-xs sm:text-sm font-bold text-[#1A1C1F] transition hover:bg-[#68ad00] active:scale-95"
              >
                {c.services}
                <ArrowUpRight className="h-4 w-4" />
              </Link>
            </div>
            <div className="grid gap-3">
              {[c.grooming, c.advice, c.support].map((s, i) => (
                <div key={s} className="flex items-center gap-4 rounded-xl border border-gray-800 bg-gray-900/60 px-5 py-4 transition hover:bg-gray-800">
                  <span className="font-sans font-black text-2xl text-[#75C300]">0{i + 1}</span>
                  <span className="font-semibold text-xs sm:text-sm text-gray-200">{s}</span>
                  <ArrowUpRight className="ms-auto h-4 w-4 text-[#75C300]" />
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* VERIFIED CUSTOMER TESTIMONIALS */}
        <PetTestimonials
          locale={locale}
          title={c.reviewsTitle}
          subtitle={c.reviewsSubtitle}
        />

        {/* MORE HOMEPAGE SECTIONS: ROUTINES, VALUES, FAQ, HELP */}
        <HomeMore locale={locale} />
      </main>
      <Footer />
    </>
  )
}
