import { HomeWorlds, HomeMore } from '@/components/pets/PetHomeSections'
import HeaderWithUser from '@/components/HeaderWithUser'
import Footer from '@/components/Footer'
import PetArtwork from '@/components/pets/PetArtwork'
import PetProductGrid from '@/components/pets/PetProductGrid'
import PetBrandStrip from '@/components/pets/PetBrandStrip'
import PetPromoPacks from '@/components/pets/PetPromoPacks'
import PetTestimonials from '@/components/pets/PetTestimonials'
import { Link } from '@/i18n/routing'
import { getPetCopy } from '@/lib/pets'
import { prisma } from '@/lib/prisma'
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

  const products = await prisma.book.findMany({
    where: { active: true, status: 'APPROVED' },
    orderBy: { createdAt: 'desc' },
    take: 12
  })

  const categories = [
    { key: 'Smartphones', label: c.smartphones, icon: Smartphone, color: 'bg-[#e8ecdf]', count: 'iPhone, Galaxy & Xiaomi' },
    { key: 'PC Portables', label: c.pc, icon: Laptop, color: 'bg-[#f0e3ce]', count: 'Gamer & Ultrabooks' },
    { key: 'Mac & Apple', label: c.mac, icon: Monitor, color: 'bg-[#eee5d5]', count: 'MacBook, iMac & iPad' },
    { key: 'Audio', label: c.care, icon: Headphones, color: 'bg-[#e1e8dc]', count: 'AirPods & Casques Hi-Res' },
    { key: 'Accessoires', label: c.accessories, icon: Zap, color: 'bg-[#f2e8d6]', count: 'Chargeurs GaN & Câbles' },
    { key: 'Stockage', label: c.small, icon: HardDrive, color: 'bg-[#e5e8da]', count: 'SSD Externes & Hubs' }
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
      <main id="main-content" className="pets-store bg-[#fffdf8] text-[#17351d]">
        {/* HERO SECTION */}
        <section className="relative overflow-hidden border-b border-[#17351d]/10 bg-linear-to-b from-[#fbf8f0] to-[#fffdf8] py-12 md:py-20">
          <div className="mx-auto grid max-w-7xl items-center gap-10 px-5 sm:px-8 lg:grid-cols-2">
            <div>
              {/* Top Badge */}
              <div className="mb-6 flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-2 rounded-full border border-[#c59a55]/40 bg-[#f7f0df] px-4 py-2 text-xs font-bold text-[#82602d] tracking-wide">
                  <Cpu className="h-4 w-4 text-[#96703a]" />
                  {c.heroBadge}
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-600/10 px-3 py-1.5 text-xs font-bold text-emerald-800">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Paiement à la livraison
                </span>
              </div>

              {/* Main Headline */}
              <h1 className="max-w-xl font-serif text-5xl leading-[1.08] tracking-tight text-[#17351d] md:text-6xl lg:text-7xl">
                {c.title}
              </h1>

              {/* Intro Text */}
              <p className="mt-6 max-w-lg text-base leading-8 text-[#56634e]">
                {c.intro}
              </p>

              {/* Action Buttons */}
              <div className="mt-8 flex flex-wrap items-center gap-3.5">
                <Link
                  href="/products"
                  className="inline-flex items-center gap-3 rounded-full bg-[#17351d] px-7 py-4 text-sm font-bold text-[#fff9eb] transition hover:bg-[#284b2c] hover:shadow-md active:scale-95"
                >
                  {c.shop}
                  <ArrowUpRight className="h-4 w-4" />
                </Link>
                <Link
                  href="/services"
                  className="rounded-full border border-[#17351d]/20 bg-white/60 px-7 py-4 text-sm font-bold text-[#17351d] transition hover:bg-white hover:border-[#17351d]/40"
                >
                  {c.services}
                </Link>
              </div>

              {/* Social Proof Pill & Trust Metrics */}
              <div className="mt-10 border-t border-[#17351d]/10 pt-6">
                <div className="flex flex-wrap items-center gap-6 text-xs text-[#56634e]">
                  <div className="flex items-center gap-1.5">
                    <div className="flex text-amber-500">
                      {[...Array(5)].map((_, i) => (
                        <Star key={i} className="h-4 w-4 fill-current" />
                      ))}
                    </div>
                    <span className="font-bold text-[#17351d]">{c.heroSocialProof}</span>
                  </div>
                  <span className="hidden h-4 w-px bg-[#17351d]/15 sm:inline" />
                  <div className="flex items-center gap-1.5 font-medium">
                    <Clock className="h-4 w-4 text-[#96703a]" />
                    <span>Livraison rapide 24/48h</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Hero Visual Artwork with Floating Trust Cards */}
            <div className="relative mx-auto w-full max-w-md lg:max-w-lg">
              <div className="absolute inset-4 rounded-full border border-[#c59a55]/30 -z-10 animate-pulse" />
              <div className="rounded-3xl border border-[#c59a55]/20 bg-[#fffdf8] p-4 shadow-xl shadow-stone-200/50">
                <PetArtwork />
              </div>

              {/* Floating Reassurance Badge Left */}
              <div className="absolute -bottom-4 start-0 flex items-center gap-3 rounded-2xl border border-[#c59a55]/20 bg-white/95 backdrop-blur-sm px-4 py-3 shadow-lg">
                <ShieldCheck className="h-5 w-5 text-[#96703a]" />
                <div>
                  <p className="text-[11px] font-bold text-[#17351d]">100% Neuf & Scellé</p>
                  <p className="text-[10px] text-[#6d7966]">Garantie constructeur 12M</p>
                </div>
              </div>

              {/* Floating WhatsApp Quick Pill Right */}
              <div className="absolute -top-3 end-0 flex items-center gap-2 rounded-2xl border border-emerald-600/20 bg-emerald-50 px-4 py-2.5 shadow-md">
                <MessageCircle className="h-4 w-4 text-emerald-700" />
                <span className="text-[11px] font-bold text-emerald-900">Conseillers WhatsApp 7j/7</span>
              </div>
            </div>
          </div>
        </section>

        {/* 4-PILLAR TRUST BAR */}
        <div className="border-b border-[#17351d]/10 bg-[#f7f0df]">
          <div className="mx-auto grid max-w-7xl grid-cols-1 gap-4 px-5 py-6 sm:grid-cols-2 lg:grid-cols-4 sm:px-8">
            {[
              { icon: Truck, title: c.delivery, subtitle: 'Casablanca, Rabat, Marrakech et partout' },
              { icon: ShieldCheck, title: c.secure, subtitle: 'Payez en espèces à la livraison' },
              { icon: Sparkles, title: c.authenticProducts, subtitle: 'Marques certifiées d’origine' },
              { icon: HeartHandshake, title: c.help, subtitle: 'Une équipe passionnée à vos côtés' }
            ].map(({ icon: Icon, title, subtitle }) => (
              <div key={title} className="flex items-center gap-3.5 p-2">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#fffdf8] border border-[#c59a55]/30 shadow-xs">
                  <Icon className="h-5 w-5 text-[#96703a]" />
                </div>
                <div>
                  <p className="text-xs font-bold text-[#17351d]">{title}</p>
                  <p className="text-[11px] text-[#68705f]">{subtitle}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* BRAND STRIP */}
        <PetBrandStrip title={c.brandsTitle} />

        {/* CATEGORIES SECTION */}
        <section className="mx-auto max-w-7xl px-5 py-16 sm:px-8">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#82602d]">PetsUnivers</p>
              <h2 className="mt-3 font-serif text-3xl md:text-4xl text-[#17351d]">{c.categories}</h2>
              <p className="mt-2 text-sm text-[#68705f]">{c.categoriesText}</p>
            </div>
            <Link
              href="/products"
              className="inline-flex items-center gap-2 text-sm font-bold text-[#17351d] hover:text-[#82602d] transition-colors"
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
                className={`group flex flex-col items-center rounded-3xl p-6 transition-all hover:-translate-y-1 hover:shadow-md ${color}`}
              >
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white/70 shadow-xs transition group-hover:scale-105">
                  <Icon className="h-8 w-8 stroke-[1.25] text-[#17351d]" />
                </div>
                <span className="mt-4 text-center text-sm font-bold text-[#17351d]">{label}</span>
                <span className="mt-1 text-center text-[10px] text-[#56634e]">{count}</span>
                <ArrowUpRight className="mt-3 h-4 w-4 text-[#96703a] transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
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
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#82602d]">Sélection du moment</p>
              <h2 className="mt-2 font-serif text-3xl md:text-4xl text-[#17351d]">{c.products}</h2>
            </div>
            <Link href="/products" className="flex items-center gap-2 text-sm font-bold text-[#17351d] hover:text-[#82602d]">
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
          subtitle={c.packSectionText}
        />

        {/* SERVICES BANNER */}
        <section className="mx-5 mb-16 rounded-[2rem] bg-[#17351d] px-6 py-12 text-[#f7f0df] md:mx-auto md:max-w-7xl md:px-12">
          <div className="grid items-center gap-8 md:grid-cols-[1.4fr_1fr]">
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-[#dbb875]">{c.serviceTag}</p>
              <h2 className="mt-4 max-w-lg font-serif text-4xl leading-tight">{c.serviceTitle}</h2>
              <p className="mt-5 max-w-lg text-sm leading-7 text-[#f7f0df]/70">{c.serviceText}</p>
              <Link
                href="/services"
                className="mt-6 inline-flex items-center gap-3 rounded-full bg-[#c59a55] px-6 py-3 text-sm font-bold text-[#17351d] transition hover:bg-[#d4a860] active:scale-95"
              >
                {c.services}
                <ArrowUpRight className="h-4 w-4" />
              </Link>
            </div>
            <div className="grid gap-3">
              {[c.grooming, c.advice, c.support].map((s, i) => (
                <div key={s} className="flex items-center gap-4 rounded-2xl border border-[#f7f0df]/15 bg-white/5 px-5 py-5 transition hover:bg-white/10">
                  <span className="font-serif text-2xl text-[#dbb875]">0{i + 1}</span>
                  <span className="font-semibold text-sm sm:text-base">{s}</span>
                  <ArrowUpRight className="ms-auto h-4 w-4 text-[#dbb875]" />
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
