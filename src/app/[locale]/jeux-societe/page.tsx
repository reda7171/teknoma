import { prisma } from '@/lib/prisma'
import Image from 'next/image'
import Link from 'next/link'
import HeaderWithUser from '@/components/HeaderWithUser'
import Footer from '@/components/FooterWithFeatures'
import { ShoppingCart, Star, Package, Filter, Search, Gamepad2 } from 'lucide-react'
import type { Metadata } from 'next'
import JeuxSocieteClient from './JeuxSocieteClient'
import { getTranslations } from 'next-intl/server'
import ImageWithFallback from '@/components/ImageWithFallback'
import { getBaseUrl, normalizeImage } from '@/lib/utils'

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
    const { locale } = await params
    const baseUrl = getBaseUrl()
    const pageUrl = `${baseUrl}/${locale}/jeux-societe`

    const isAr = locale === 'ar'
    const isEn = locale === 'en'

    const title = isAr
        ? 'ألعاب جماعية ولوحية بالمغرب | متجر رواية'
        : isEn
            ? 'Board Games in Morocco | Riwaya Store'
            : 'Jeux de Société au Maroc | Riwaya Store'

    const description = isAr
        ? 'اكتشف أفضل الألعاب الجماعية واللوحية بالمغرب: ألعاب التفكير، الاستراتيجية، وألعاب الذكاء للعائلة والأصدقاء. توصيل سريع لجميع المدن والدفع عند الاستلام.'
        : isEn
            ? 'Discover our curated selection of board games in Morocco: strategy, trivia, family fun, and party games. Fast nationwide delivery with Cash on Delivery.'
            : 'Découvrez notre sélection de jeux de société au Maroc : stratégie, ambiance, coopération et réflexion pour vos soirées en famille ou entre amis. Livraison express COD.'

    const keywords = isAr
        ? ['ألعاب جماعية المغرب', 'ألعاب لوحية', 'شراء ألعاب جماعية', 'ألعاب عائلية المغرب', 'board games maroc', 'ألعاب الذكاء']
        : isEn
            ? ['board games morocco', 'party games morocco', 'strategy games morocco', 'family board games', 'buy board games casablanca rabat']
            : ['jeux de societe maroc', 'acheter jeux de societe maroc', 'jeux de societe casablanca', 'jeux de societe rabat', 'jeux de plateau maroc', 'jeux de strategie maroc', 'jeux ambiance maroc']

    return {
        title,
        description,
        keywords,
        openGraph: {
            title,
            description,
            url: pageUrl,
            type: 'website',
            images: ['/og-image.jpg'],
        },
        alternates: {
            canonical: pageUrl,
            languages: {
                'fr': `${baseUrl}/fr/jeux-societe`,
                'ar': `${baseUrl}/ar/jeux-societe`,
                'en': `${baseUrl}/en/jeux-societe`,
                'x-default': `${baseUrl}/fr/jeux-societe`,
            }
        }
    }
}

export default async function JeuxSocietePage({ params }: { params: Promise<{ locale: string }> }) {
    const { locale } = await params;
    const baseUrl = getBaseUrl()
    const pageUrl = `${baseUrl}/${locale}/jeux-societe`
    const t = await getTranslations('BoardGamesPage')
    
    /* Récupérer les produits catégorie BOARD_GAME depuis extra_products */
    const products = await prisma.extraProduct.findMany({
        where: { active: true, category: 'BOARD_GAME' },
        orderBy: { createdAt: 'desc' },
    })

    const featuredProducts = products.filter(p => !!p.image).slice(0, 4)

    const boardGamesSchema = {
        '@context': 'https://schema.org',
        '@type': 'CollectionPage',
        name: locale === 'ar' ? 'ألعاب جماعية ولوحية بالمغرب' : 'Jeux de Société au Maroc',
        description: locale === 'ar' ? 'أفضل الألعاب الجماعية واللوحية للعائلة والأصدقاء بالمغرب' : 'Sélection de jeux de société, réflexion et stratégie au Maroc',
        url: pageUrl,
        mainEntity: {
            '@type': 'ItemList',
            numberOfItems: products.length,
            itemListElement: products.map((p, index) => {
                const img = p.image ? (p.image.startsWith('http') ? p.image : `${baseUrl}${p.image}`) : undefined
                return {
                    '@type': 'ListItem',
                    position: index + 1,
                    name: p.name,
                    item: {
                        '@type': 'Product',
                        name: p.name,
                        description: p.description || p.name,
                        image: img,
                        offers: {
                            '@type': 'Offer',
                            priceCurrency: 'MAD',
                            price: p.price,
                            availability: p.stock > 0 ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
                            itemCondition: 'https://schema.org/NewCondition',
                            seller: {
                                '@type': 'Organization',
                                name: 'Riwaya'
                            }
                        }
                    }
                }
            })
        }
    }

    return (
        <div className="min-h-screen bg-[#FAFAF9]" dir={locale === 'ar' ? 'rtl' : 'ltr'}>
            <link rel="canonical" href={pageUrl} />
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(boardGamesSchema) }}
            />
            <HeaderWithUser />

            {/* ──────── HERO ──────── */}
            <section className="relative bg-white border-b border-slate-100 py-8 sm:py-14 md:py-20 overflow-hidden">
                <div className="absolute -top-20 ltr:-right-20 rtl:-left-20 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl opacity-70 pointer-events-none" />
                <div className="absolute -bottom-16 ltr:-left-16 rtl:-right-16 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl opacity-70 pointer-events-none" />
                
                {/* Micro-pattern background for premium feel */}
                <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, black 1px, transparent 0)', backgroundSize: '24px 24px' }}></div>

                <div className="max-w-6xl mx-auto px-4 flex flex-col md:flex-row items-center text-center md:ltr:text-left md:rtl:text-right gap-10 md:gap-16 relative z-10">
                    <div className="flex-1">
                        <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-gradient-to-r from-amber-100 to-orange-100 text-amber-800 rounded-full text-xs sm:text-sm font-bold mb-4 sm:mb-6 shadow-sm border border-amber-200/50">
                            <Gamepad2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                            {t('HeroBadge')}
                        </div>
                        <h1 className="text-4xl sm:text-5xl md:text-6xl font-black text-slate-900 leading-[1.1] mb-6 tracking-tight">
                            {t('Title1')} <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-600 to-orange-500">{t('Title2')}</span>
                        </h1>
                        <p className="text-slate-500 text-base sm:text-lg leading-relaxed max-w-lg mx-auto md:mx-0 mb-8 sm:mb-10 font-medium">
                            {t('Desc')}
                        </p>
                        <div className="flex justify-center md:justify-start gap-4 sm:gap-6 text-sm font-bold text-slate-600">
                            <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-xl shadow-sm border border-slate-100">
                                <Package className="w-4 h-4 text-amber-500" /> 
                                <span>{products.length} {t('ProductsCount')}</span>
                            </div>
                            <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-xl shadow-sm border border-slate-100">
                                <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" /> 
                                <span>{t('FastShipping')}</span>
                            </div>
                        </div>
                    </div>
                    <div className="flex-1 flex justify-center w-full mt-6 md:mt-0">
                        <div className="w-64 h-64 sm:w-80 sm:h-80 relative group">
                            <div className="absolute inset-0 bg-gradient-to-tr from-amber-100 to-orange-50 rounded-[2.5rem] sm:rounded-[3rem] rotate-3 group-hover:rotate-6 transition-transform duration-500 shadow-inner" />
                            <div className="absolute inset-0 bg-white rounded-[2.5rem] sm:rounded-[3rem] shadow-[0_20px_50px_-12px_rgba(245,158,11,0.2)] border border-slate-100 p-3 sm:p-4 flex items-center justify-center transform group-hover:-translate-y-1 transition-transform duration-500 overflow-hidden">
                                {featuredProducts.length >= 4 ? (
                                    <div className="grid grid-cols-2 gap-2 sm:gap-3 w-full h-full">
                                        {featuredProducts.map((p) => (
                                            <div key={p.id} className="relative aspect-square rounded-2xl overflow-hidden bg-slate-50 border border-slate-100/80 shadow-sm">
                                                <ImageWithFallback
                                                    src={p.image}
                                                    alt={p.name}
                                                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                                />
                                            </div>
                                        ))}
                                    </div>
                                ) : featuredProducts.length > 0 ? (
                                    <div className="relative w-full h-full rounded-2xl overflow-hidden bg-slate-50 border border-slate-100/80">
                                        <ImageWithFallback
                                            src={featuredProducts[0].image}
                                            alt={featuredProducts[0].name}
                                            className="w-full h-full object-contain p-2"
                                        />
                                    </div>
                                ) : (
                                    <Gamepad2 className="w-24 h-24 sm:w-32 sm:h-32 text-amber-500 drop-shadow-md" strokeWidth={1.5} />
                                )}
                            </div>
                            
                            {/* Floating decorative elements */}
                            <div className="absolute -top-3 -right-3 sm:-top-4 sm:-right-4 w-10 h-10 sm:w-12 sm:h-12 bg-amber-400 text-white rounded-full flex items-center justify-center shadow-lg">
                                <Star className="w-5 h-5 fill-current text-white" />
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* ──────── PRODUITS ──────── */}
            <section className="max-w-6xl mx-auto px-4 py-6 sm:py-10 md:py-16 relative">
                <JeuxSocieteClient products={JSON.parse(JSON.stringify(products))} locale={locale} />
            </section>

            {/* ──────── CTA VIDE si pas de produits ──────── */}
            {products.length === 0 && (
                <div className="max-w-lg mx-auto px-4 py-12 sm:py-24 text-center">
                    <div className="w-24 h-24 bg-gradient-to-br from-amber-50 to-orange-50 rounded-[2rem] flex items-center justify-center mx-auto mb-8 shadow-sm border border-amber-100">
                        <Package className="w-10 h-10 text-amber-500" />
                    </div>
                    <h2 className="text-3xl font-black text-slate-800 mb-4 tracking-tight">{t('EmptyTitle')}</h2>
                    <p className="text-slate-500 mb-10 text-lg">{t('EmptyDesc')}</p>
                    <Link
                        href="/"
                        className="inline-flex items-center gap-2 px-8 py-4 bg-slate-900 text-white font-bold rounded-2xl hover:bg-amber-600 hover:shadow-lg hover:shadow-amber-500/30 transition-all duration-300 hover:-translate-y-1"
                    >
                        {t('BackHome')}
                    </Link>
                </div>
            )}

            <Footer />
        </div>
    )
}
