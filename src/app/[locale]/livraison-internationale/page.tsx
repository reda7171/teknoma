import { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'
import { prisma } from '@/lib/prisma'
import Header from '@/components/HeaderWithUser'
import Footer from '@/components/Footer'
import BookCard from '@/components/BookCard'
import { Link } from '@/i18n/routing'
import {
    Plane,
    ShieldCheck,
    PackageCheck,
    Globe2,
    Truck,
    Clock,
    Sparkles,
    CheckCircle2,
    HelpCircle,
    ArrowRight,
    MapPin,
    PhoneCall
} from 'lucide-react'
import { getCanonicalBaseUrl } from '@/lib/seo/canonical'

export const revalidate = 3600 // 1 hour ISR

interface PageProps {
    params: Promise<{ locale: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
    const { locale } = await params
    const t = await getTranslations({ locale, namespace: 'InternationalShipping' })
    const baseUrl = getCanonicalBaseUrl()

    const canonicalUrl = `${baseUrl}/${locale}/livraison-internationale`
    const ogTitle = t('metaTitle')
    const ogDesc = t('metaDesc')

    return {
        title: ogTitle,
        description: ogDesc,
        keywords: [
            'livraison livre maroc',
            'livraison internationale livres maroc',
            'amana express international livre',
            'acheter livre marocain en france',
            'commander livre marocain depuis l etranger',
            'librairie marocaine en europe',
            'diaspora marocaine livres',
            'شحن الكتب من المغرب',
            'شحن دولي للكتب المغربية',
            'كتب عربية في أوروبا',
            'Moroccan books worldwide shipping'
        ],
        alternates: {
            canonical: canonicalUrl,
            languages: {
                'fr': `${baseUrl}/fr/livraison-internationale`,
                'ar': `${baseUrl}/ar/livraison-internationale`,
                'en': `${baseUrl}/en/livraison-internationale`,
                'x-default': `${baseUrl}/fr/livraison-internationale`
            }
        },
        openGraph: {
            title: ogTitle,
            description: ogDesc,
            url: canonicalUrl,
            siteName: 'Riwaya',
            locale: locale === 'ar' ? 'ar_MA' : locale === 'en' ? 'en_US' : 'fr_FR',
            type: 'website',
            images: [
                {
                    url: `${baseUrl}/og-image.jpg`,
                    width: 1200,
                    height: 630,
                    alt: ogTitle
                }
            ]
        },
        twitter: {
            card: 'summary_large_image',
            title: ogTitle,
            description: ogDesc,
            images: [`${baseUrl}/og-image.jpg`]
        }
    }
}

const DESTINATION_ZONES = [
    { country: 'France', code: 'FR', delay: '3-5 j', cities: 'Paris, Lyon, Marseille, Lille, Bordeaux' },
    { country: 'Belgique', code: 'BE', delay: '3-5 j', cities: 'Bruxelles, Liège, Anvers, Charleroi' },
    { country: 'Espagne', code: 'ES', delay: '3-5 j', cities: 'Madrid, Barcelone, Valence, Séville' },
    { country: 'Canada', code: 'CA', delay: '5-8 j', cities: 'Montréal, Québec, Toronto, Ottawa' },
    { country: 'Italie', code: 'IT', delay: '4-6 j', cities: 'Rome, Milan, Turin, Bologne' },
    { country: 'Allemagne', code: 'DE', delay: '4-6 j', cities: 'Berlin, Francfort, Munich, Hambourg' },
    { country: 'Pays-Bas', code: 'NL', delay: '4-6 j', cities: 'Amsterdam, Rotterdam, Utrecht' },
    { country: 'Royaume-Uni', code: 'GB', delay: '4-6 j', cities: 'Londres, Manchester, Birmingham' },
    { country: 'Suisse', code: 'CH', delay: '4-6 j', cities: 'Genève, Lausanne, Zurich' },
    { country: 'États-Unis', code: 'US', delay: '6-9 j', cities: 'New York, Miami, Chicago, Los Angeles' },
    { country: 'Émirats Arabes Unis', code: 'AE', delay: '5-7 j', cities: 'Dubaï, Abou Dabi, Sharjah' },
    { country: 'Reste du Monde', code: 'WW', delay: '6-10 j', cities: 'Afrique, Asie, Océanie' }
]

export default async function InternationalShippingPage({ params }: PageProps) {
    const { locale } = await params
    const t = await getTranslations({ locale, namespace: 'InternationalShipping' })
    const isRtl = locale === 'ar'
    const baseUrl = getCanonicalBaseUrl()

    // Livres recommandés pour l'international
    const popularBooks = await prisma.book.findMany({
        where: { active: true },
        orderBy: [
            { stock: 'desc' },
            { createdAt: 'desc' }
        ],
        take: 8
    }).catch(() => [])

    // JSON-LD Structured Data : Service + FAQPage + BreadcrumbList
    const jsonLd = {
        '@context': 'https://schema.org',
        '@graph': [
            {
                '@type': 'BreadcrumbList',
                '@id': `${baseUrl}/${locale}/livraison-internationale#breadcrumb`,
                'itemListElement': [
                    {
                        '@type': 'ListItem',
                        'position': 1,
                        'name': locale === 'ar' ? 'الرئيسية' : locale === 'en' ? 'Home' : 'Accueil',
                        'item': `${baseUrl}/${locale}`
                    },
                    {
                        '@type': 'ListItem',
                        'position': 2,
                        'name': t('title'),
                        'item': `${baseUrl}/${locale}/livraison-internationale`
                    }
                ]
            },
            {
                '@type': 'Service',
                '@id': `${baseUrl}/${locale}/livraison-internationale#service`,
                'name': t('title'),
                'serviceType': 'International Book Delivery',
                'description': t('description'),
                'provider': {
                    '@type': 'Organization',
                    'name': 'Riwaya',
                    'url': baseUrl,
                    'logo': `${baseUrl}/logo.png`
                },
                'areaServed': DESTINATION_ZONES.map(z => ({
                    '@type': 'Country',
                    'name': z.country
                })),
                'hasOfferCatalog': {
                    '@type': 'OfferCatalog',
                    'name': 'Livres et Packs Livrables à l\'International',
                    'itemListElement': [
                        {
                            '@type': 'Offer',
                            'itemOffered': {
                                '@type': 'DeliveryChargeSpecification',
                                'name': 'Amana International Express Worldwide',
                                'price': '200',
                                'priceCurrency': 'MAD'
                            }
                        }
                    ]
                }
            },
            {
                '@type': 'FAQPage',
                '@id': `${baseUrl}/${locale}/livraison-internationale#faq`,
                'mainEntity': [
                    {
                        '@type': 'Question',
                        'name': t('faq1Q'),
                        'acceptedAnswer': {
                            '@type': 'Answer',
                            'text': t('faq1A')
                        }
                    },
                    {
                        '@type': 'Question',
                        'name': t('faq2Q'),
                        'acceptedAnswer': {
                            '@type': 'Answer',
                            'text': t('faq2A')
                        }
                    },
                    {
                        '@type': 'Question',
                        'name': t('faq3Q'),
                        'acceptedAnswer': {
                            '@type': 'Answer',
                            'text': t('faq3A')
                        }
                    },
                    {
                        '@type': 'Question',
                        'name': t('faq4Q'),
                        'acceptedAnswer': {
                            '@type': 'Answer',
                            'text': t('faq4A')
                        }
                    }
                ]
            }
        ]
    }

    const whatsappMessage = encodeURIComponent(
        locale === 'ar'
            ? 'السلام عليكم، أود الاستفسار عن طلب كتب مع شحن دولي خارج المغرب.'
            : locale === 'en'
            ? 'Hello, I would like to order books from Morocco with international delivery.'
            : 'Bonjour, je souhaite commander des livres depuis l\'étranger avec livraison internationale.'
    )

    return (
        <div className={`min-h-screen bg-white text-slate-900 ${isRtl ? 'rtl' : 'ltr'}`}>
            <Header locale={locale} />

            {/* Injection des données structurées JSON-LD */}
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
            />

            {/* Hero Section Optimisé Mobile LCP */}
            <section className="relative overflow-hidden bg-slate-900 text-white py-8 sm:py-20 border-b border-slate-800">
                <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#3b82f6_1px,transparent_1px)] [background-size:16px_16px] pointer-events-none" />
                
                <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    {/* Breadcrumbs */}
                    <nav className="mb-3 sm:mb-6 flex items-center gap-2 text-xs text-slate-400 font-medium">
                        <Link href="/" className="hover:text-white transition-colors">
                            {locale === 'ar' ? 'الرئيسية' : locale === 'en' ? 'Home' : 'Accueil'}
                        </Link>
                        <span>/</span>
                        <span className="text-blue-400 font-bold">{t('badge')}</span>
                    </nav>

                    <div className="max-w-3xl">
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/30 text-blue-400 text-xs font-bold uppercase tracking-wider mb-3 sm:mb-6">
                            <Plane className="w-3.5 h-3.5" />
                            <span>{t('badge')}</span>
                        </div>

                        <h1 className="text-2xl sm:text-5xl lg:text-6xl font-black tracking-tight leading-tight text-white mb-3 sm:mb-6">
                            {t('title')}
                        </h1>

                        <p className="text-sm sm:text-lg text-slate-300 leading-relaxed mb-6 sm:mb-8 font-normal">
                            {t('description')}
                        </p>

                        <div className="flex flex-wrap items-center gap-3 sm:gap-4">
                            <Link
                                href="/books"
                                className="inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-black text-xs uppercase tracking-widest shadow-lg shadow-blue-600/30 transition-all hover:scale-[1.02] active:scale-95"
                            >
                                <span>{t('exploreCatalog')}</span>
                                <ArrowRight className={`w-4 h-4 ${isRtl ? 'rotate-180' : ''}`} />
                            </Link>

                            <a
                                href={`https://wa.me/212600000000?text=${whatsappMessage}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-black text-xs uppercase tracking-widest transition-all hover:scale-[1.02] active:scale-95"
                            >
                                <PhoneCall className="w-4 h-4 text-emerald-400" />
                                <span>{t('contactWhatsapp')}</span>
                            </a>
                        </div>
                    </div>
                </div>
            </section>

            {/* Value Pillars (4 Garanties Clés) */}
            <section className="py-8 sm:py-16 bg-slate-50/70 border-b border-slate-100">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
                        {/* 1. Amana Express */}
                        <div className="bg-white p-5 sm:p-7 rounded-2xl sm:rounded-3xl border border-slate-200/80 shadow-sm flex flex-col justify-between">
                            <div>
                                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 mb-3 sm:mb-5">
                                    <Truck className="w-5 h-5 sm:w-6 sm:h-6" />
                                </div>
                                <h3 className="text-sm sm:text-base font-black text-slate-900 mb-1.5 sm:mb-2">
                                    {t('guaranteeExpressTitle')}
                                </h3>
                                <p className="text-xs text-slate-600 leading-relaxed">
                                    {t('guaranteeExpressDesc')}
                                </p>
                            </div>
                        </div>

                        {/* 2. Emballage Renforcé */}
                        <div className="bg-white p-5 sm:p-7 rounded-2xl sm:rounded-3xl border border-slate-200/80 shadow-sm flex flex-col justify-between">
                            <div>
                                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 mb-3 sm:mb-5">
                                    <PackageCheck className="w-5 h-5 sm:w-6 sm:h-6" />
                                </div>
                                <h3 className="text-sm sm:text-base font-black text-slate-900 mb-1.5 sm:mb-2">
                                    {t('guaranteePackingTitle')}
                                </h3>
                                <p className="text-xs text-slate-600 leading-relaxed">
                                    {t('guaranteePackingDesc')}
                                </p>
                            </div>
                        </div>

                        {/* 3. Editions rares */}
                        <div className="bg-white p-5 sm:p-7 rounded-2xl sm:rounded-3xl border border-slate-200/80 shadow-sm flex flex-col justify-between">
                            <div>
                                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-600 mb-3 sm:mb-5">
                                    <Sparkles className="w-5 h-5 sm:w-6 sm:h-6" />
                                </div>
                                <h3 className="text-sm sm:text-base font-black text-slate-900 mb-1.5 sm:mb-2">
                                    {t('guaranteeSelectionTitle')}
                                </h3>
                                <p className="text-xs text-slate-600 leading-relaxed">
                                    {t('guaranteeSelectionDesc')}
                                </p>
                            </div>
                        </div>

                        {/* 4. Tarifs clairs */}
                        <div className="bg-white p-5 sm:p-7 rounded-2xl sm:rounded-3xl border border-slate-200/80 shadow-sm flex flex-col justify-between">
                            <div>
                                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-700 mb-3 sm:mb-5">
                                    <ShieldCheck className="w-5 h-5 sm:w-6 sm:h-6" />
                                </div>
                                <h3 className="text-sm sm:text-base font-black text-slate-900 mb-1.5 sm:mb-2">
                                    {t('guaranteePricingTitle')}
                                </h3>
                                <p className="text-xs text-slate-600 leading-relaxed">
                                    {t('guaranteePricingDesc')}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Destinations Desservies */}
            <section className="py-16 sm:py-24 border-b border-slate-100">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center max-w-2xl mx-auto mb-14">
                        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-xs font-bold uppercase tracking-wider mb-3">
                            <Globe2 className="w-3.5 h-3.5" />
                            <span>International</span>
                        </div>
                        <h2 className="text-2xl sm:text-4xl font-black text-slate-900 tracking-tight mb-3">
                            {t('destinationsTitle')}
                        </h2>
                        <p className="text-sm text-slate-600">
                            {t('destinationsSubtitle')}
                        </p>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
                        {DESTINATION_ZONES.map((zone) => (
                            <div
                                key={zone.country}
                                className="p-5 rounded-2xl bg-white border border-slate-200/90 shadow-sm hover:shadow-md hover:border-blue-300 transition-all group"
                            >
                                <div className="flex items-center justify-between mb-3">
                                    <span className="text-xs font-black text-slate-900 uppercase tracking-wide group-hover:text-blue-600 transition-colors">
                                        {zone.country}
                                    </span>
                                    <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                                        <Clock className="w-3 h-3 text-blue-600" />
                                        {zone.delay}
                                    </span>
                                </div>
                                <p className="text-[11px] text-slate-600 truncate">
                                    {zone.cities}
                                </p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Sélection de livres populaires pour la diaspora */}
            {popularBooks.length > 0 && (
                <section className="py-16 sm:py-24 bg-slate-50/50 border-b border-slate-100">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4 mb-12">
                            <div>
                                <h2 className="text-2xl sm:text-4xl font-black text-slate-900 tracking-tight">
                                    {t('popularSelectionTitle')}
                                </h2>
                                <p className="text-sm text-slate-600 mt-2">
                                    {t('popularSelectionSubtitle')}
                                </p>
                            </div>
                            <Link
                                href="/books"
                                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-black uppercase tracking-wider transition-colors"
                            >
                                <span>{t('exploreCatalog')}</span>
                                <ArrowRight className={`w-3.5 h-3.5 ${isRtl ? 'rotate-180' : ''}`} />
                            </Link>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                            {popularBooks.map((book, idx) => (
                                <div key={book.id}>
                                    <BookCard {...book} priority={idx === 0} />
                                </div>
                            ))}
                        </div>
                    </div>
                </section>
            )}

            {/* Comment Commander (3 étapes simples) */}
            <section className="py-16 sm:py-24 border-b border-slate-100">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center max-w-2xl mx-auto mb-14">
                        <h2 className="text-2xl sm:text-4xl font-black text-slate-900 tracking-tight mb-3">
                            {t('howItWorksTitle')}
                        </h2>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        <div className="p-8 rounded-3xl bg-white border border-slate-200 shadow-sm relative">
                            <span className="text-3xl font-black text-blue-600 mb-4 block">01</span>
                            <h3 className="text-base font-black text-slate-900 mb-2">
                                {t('step1Title')}
                            </h3>
                            <p className="text-xs text-slate-600 leading-relaxed">
                                {t('step1Desc')}
                            </p>
                        </div>

                        <div className="p-8 rounded-3xl bg-white border border-slate-200 shadow-sm relative">
                            <span className="text-3xl font-black text-blue-600 mb-4 block">02</span>
                            <h3 className="text-base font-black text-slate-900 mb-2">
                                {t('step2Title')}
                            </h3>
                            <p className="text-xs text-slate-600 leading-relaxed">
                                {t('step2Desc')}
                            </p>
                        </div>

                        <div className="p-8 rounded-3xl bg-white border border-slate-200 shadow-sm relative">
                            <span className="text-3xl font-black text-blue-600 mb-4 block">03</span>
                            <h3 className="text-base font-black text-slate-900 mb-2">
                                {t('step3Title')}
                            </h3>
                            <p className="text-xs text-slate-600 leading-relaxed">
                                {t('step3Desc')}
                            </p>
                        </div>
                    </div>
                </div>
            </section>

            {/* FAQ Interactive Schema.org */}
            <section className="py-16 sm:py-24 bg-slate-50/70 border-b border-slate-100">
                <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center mb-12">
                        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-200/80 text-slate-700 text-xs font-bold uppercase tracking-wider mb-3">
                            <HelpCircle className="w-3.5 h-3.5" />
                            <span>FAQ</span>
                        </div>
                        <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                            {t('faqTitle')}
                        </h2>
                    </div>

                    <div className="space-y-4">
                        <details className="group bg-white p-6 rounded-2xl border border-slate-200/90 shadow-sm open:border-blue-300 transition-colors">
                            <summary className="font-bold text-sm text-slate-900 cursor-pointer list-none flex items-center justify-between">
                                <span>{t('faq1Q')}</span>
                                <span className="text-slate-400 group-open:rotate-180 transition-transform">▼</span>
                            </summary>
                            <p className="text-xs text-slate-600 mt-4 leading-relaxed border-t border-slate-100 pt-3">
                                {t('faq1A')}
                            </p>
                        </details>

                        <details className="group bg-white p-6 rounded-2xl border border-slate-200/90 shadow-sm open:border-blue-300 transition-colors">
                            <summary className="font-bold text-sm text-slate-900 cursor-pointer list-none flex items-center justify-between">
                                <span>{t('faq2Q')}</span>
                                <span className="text-slate-400 group-open:rotate-180 transition-transform">▼</span>
                            </summary>
                            <p className="text-xs text-slate-600 mt-4 leading-relaxed border-t border-slate-100 pt-3">
                                {t('faq2A')}
                            </p>
                        </details>

                        <details className="group bg-white p-6 rounded-2xl border border-slate-200/90 shadow-sm open:border-blue-300 transition-colors">
                            <summary className="font-bold text-sm text-slate-900 cursor-pointer list-none flex items-center justify-between">
                                <span>{t('faq3Q')}</span>
                                <span className="text-slate-400 group-open:rotate-180 transition-transform">▼</span>
                            </summary>
                            <p className="text-xs text-slate-600 mt-4 leading-relaxed border-t border-slate-100 pt-3">
                                {t('faq3A')}
                            </p>
                        </details>

                        <details className="group bg-white p-6 rounded-2xl border border-slate-200/90 shadow-sm open:border-blue-300 transition-colors">
                            <summary className="font-bold text-sm text-slate-900 cursor-pointer list-none flex items-center justify-between">
                                <span>{t('faq4Q')}</span>
                                <span className="text-slate-400 group-open:rotate-180 transition-transform">▼</span>
                            </summary>
                            <p className="text-xs text-slate-600 mt-4 leading-relaxed border-t border-slate-100 pt-3">
                                {t('faq4A')}
                            </p>
                        </details>
                    </div>
                </div>
            </section>

            {/* CTA Final */}
            <section className="py-16 sm:py-20 bg-slate-900 text-white">
                <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
                    <h2 className="text-2xl sm:text-4xl font-black tracking-tight mb-4 text-white">
                        {t('ctaTitle')}
                    </h2>
                    <p className="text-sm sm:text-base text-slate-300 max-w-2xl mx-auto mb-8 font-normal">
                        {t('ctaDesc')}
                    </p>
                    <div className="flex flex-wrap items-center justify-center gap-4">
                        <Link
                            href="/books"
                            className="inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-black text-xs uppercase tracking-widest shadow-lg shadow-blue-600/30 transition-all hover:scale-105 active:scale-95"
                        >
                            <span>{t('ctaButton')}</span>
                            <ArrowRight className={`w-4 h-4 ${isRtl ? 'rotate-180' : ''}`} />
                        </Link>
                    </div>
                </div>
            </section>

            <Footer />
        </div>
    )
}

