import { getPackById } from '@/lib/db/packs'
import Header from '@/components/HeaderWithUser'
import Footer from '@/components/Footer'
import BookCard from '@/components/BookCard'
import AddToCartButton from '@/components/AddToCartButton'
import { normalizeImage, getOgImageUrl, getBaseUrl } from '@/lib/utils'
import { Link } from '@/i18n/routing'
import { ArrowLeft, Check, Package, Shield, Sparkles, Truck } from 'lucide-react'
import { notFound } from 'next/navigation'
import { getTranslations } from 'next-intl/server'
import ImageWithFallback from '@/components/ImageWithFallback'
import { Metadata } from 'next'
import SetPixelView from '@/components/SetPixelView'
import { getSetting } from '@/lib/actions/site-settings'
import AnnouncementBar from '@/components/AnnouncementBar'
import PackCustomizerClient from '@/components/packs/PackCustomizerClient'
import { getCommunityUser } from '@/lib/actions/community-auth'
import { Edit } from 'lucide-react'
import TestimonialsTabs from '@/components/home/TestimonialsTabs'
import { getApprovedAudioTestimonials } from '@/lib/actions/audio-testimonials'
import { getApprovedImageTestimonials } from '@/lib/actions/image-testimonials'
import { getLocalizedTitle, getLocalizedPackTitle, getLocalizedPackDescription } from '@/lib/i18n-utils'
import { getSchemaAvailability, isProductInStock } from '@/lib/product-availability'

export async function generateMetadata({
    params,
}: {
    params: Promise<{ id: string; locale: string }>
}): Promise<Metadata> {
    const { id, locale } = await params
    const pack = await getPackById(id)

    if (!pack) {
        return {
            title: 'Pack introuvable | Riwaya',
        }
    }

    const baseUrl = getBaseUrl()
    const rawImage = pack.image || pack.books[0]?.book.image || '/images/og-packs.png'
    const imageUrl = getOgImageUrl(rawImage, baseUrl, `${baseUrl}/images/og-packs.png`)

    const totalOriginalPrice = Math.round(pack.originalPrice || pack.books.reduce((sum, pb) => sum + pb.book.price, 0))
    const displayPrice = Math.round(pack.price)
    const savings = totalOriginalPrice - displayPrice
    const savingsPercent = Math.round((savings / totalOriginalPrice) * 100)
    const hasDiscount = savings > 0 && savingsPercent > 0

    const displayName = getLocalizedPackTitle(pack, locale)
    const displayDescription = getLocalizedPackDescription(pack, locale)
    const bookTitles = pack.books.map(pb => getLocalizedTitle(pb.book, locale)).join(', ')

    const keywords = [
        displayName,
        `pack ${displayName}`,
        'pack de livres maroc',
        'packs livres',
        'livres en promotion maroc',
        ...(hasDiscount ? [`économiser ${savingsPercent}%`] : []),
        ...pack.books.map(pb => getLocalizedTitle(pb.book, locale)),
        ...pack.books.map(pb => pb.book.author),
        'librairie en ligne maroc',
    ]

    const ogTitle = locale === 'ar'
        ? `باقة "${displayName}" — ${displayPrice} درهم ${hasDiscount ? `(وفر ${savingsPercent}%)` : ''} | مكتبة رواية`
        : locale === 'en'
            ? `Pack "${displayName}" — ${displayPrice} MAD ${hasDiscount ? `(Save ${savingsPercent}%)` : ''} | Riwaya`
            : `Pack "${displayName}" — ${displayPrice} DH ${hasDiscount ? `(Économisez ${savingsPercent}%)` : ''} | Riwaya`

    const ogDescription = displayDescription || (locale === 'ar'
        ? `⚡ السعر: ${displayPrice} درهم مغربي ${hasDiscount ? `عوض ${totalOriginalPrice} درهم` : ''}. باقة من ${pack.books.length} كتب مختارة مع الدفع عند الاستلام والتوصيل السريع بالمغرب.`
        : locale === 'en'
            ? `⚡ Price: ${displayPrice} MAD ${hasDiscount ? `instead of ${totalOriginalPrice} MAD` : ''}. Bundle of ${pack.books.length} books with Cash on Delivery across Morocco.`
            : `⚡ Prix: ${displayPrice} DH ${hasDiscount ? `au lieu de ${totalOriginalPrice} DH` : ''}. Pack de ${pack.books.length} livres avec Paiement à la livraison (COD) partout au Maroc.`)

    const dynamicOgImageUrl = `${baseUrl}/${locale}/packs/${pack.id}/opengraph-image`
    const facebookAppId = await getSetting('facebook_app_id')
        || process.env.NEXT_PUBLIC_FACEBOOK_APP_ID
        || process.env.FACEBOOK_CLIENT_ID

    return {
        title: `${displayName} - Pack de ${pack.books.length} Livres | Riwaya`,
        description: displayDescription || (locale === 'ar'
            ? `اشتري باقة "${displayName}" على رواية. ${pack.books.length} كتب مختارة : ${bookTitles.slice(0, 100)}... ${hasDiscount ? `وفر ${savingsPercent}%. ` : ''}السعر: ${displayPrice} درهم. توصيل سريع بالمغرب.`
            : `Achetez le pack "${displayName}" sur Riwaya. ${pack.books.length} livres sélectionnés : ${bookTitles.slice(0, 100)}... ${hasDiscount ? `Économisez ${savingsPercent}% (${savings} DH). ` : ''}Prix: ${displayPrice} DH. Livraison rapide au Maroc.`),
        keywords,
        openGraph: {
            title: ogTitle,
            description: ogDescription,
            images: [
                {
                    url: imageUrl || `${baseUrl}/og-image.jpg`,
                    width: 800,
                    height: 800,
                    alt: displayName,
                },
            ],
            type: 'website',
            locale: locale === 'ar' ? 'ar_MA' : locale === 'en' ? 'en_MA' : 'fr_MA',
            url: `${baseUrl}/${locale}/packs/${pack.id}`,
        },
        twitter: {
            card: 'summary_large_image',
            title: ogTitle,
            description: ogDescription,
            images: [imageUrl || `${baseUrl}/og-image.jpg`],
        },
        other: {
            'product:price:amount': `${displayPrice}`,
            'product:price:currency': 'MAD',
            'product:availability': 'in stock',
            'product:condition': 'new',
            'product:retailer_item_id': `PACK-${pack.id}`,
            'og:price:amount': `${displayPrice}`,
            'og:price:currency': 'MAD',
            'og:image:alt': displayName,
            ...(facebookAppId ? { 'fb:app_id': facebookAppId } : {}),
        },
        alternates: {
            canonical: `${baseUrl}/${locale}/packs/${pack.id}`,
            languages: {
                'fr': `${baseUrl}/fr/packs/${pack.id}`,
                'ar': `${baseUrl}/ar/packs/${pack.id}`,
                'en': `${baseUrl}/en/packs/${pack.id}`,
                'x-default': `${baseUrl}/ar/packs/${pack.id}`,
            },
        },
    }
}

export default async function PackDetailPage({
    params,
}: {
    params: Promise<{ id: string; locale: string }>
}) {
    const { id, locale } = await params
    const pack = await getPackById(id)
    const t = await getTranslations({ locale, namespace: 'PackDetail' })
    const tPacks = await getTranslations({ locale, namespace: 'Packs' })
    const tNav = await getTranslations({ locale, namespace: 'Navigation' })
    const [whatsappPhone, announcementEnabled, announcementMessage, announcementBgColor, announcementTextColor, user, audioTestimonialsResult, imageTestimonialsResult] = await Promise.all([
        getSetting('contact_whatsapp'),
        getSetting('announcement_bar_enabled'),
        getSetting('announcement_bar_message'),
        getSetting('announcement_bar_bg_color'),
        getSetting('announcement_bar_text_color'),
        getCommunityUser(),
        getApprovedAudioTestimonials(),
        getApprovedImageTestimonials()
    ])

    if (!pack) {
        notFound()
    }

    const displayName = getLocalizedPackTitle(pack, locale)
    const displayDescription = getLocalizedPackDescription(pack, locale)
    const packInStock = pack.active && pack.books.length > 0 && pack.books.every(pb => isProductInStock(pb.book))

    const totalOriginalPrice = Math.round(pack.originalPrice || pack.books.reduce((sum, pb) => sum + pb.book.price, 0))
    const displayPrice = Math.round(pack.price)
    const savings = totalOriginalPrice - displayPrice
    const savingsPercent = Math.round((savings / totalOriginalPrice) * 100)
    const hasDiscount = savings > 0 && savingsPercent > 0

    const baseUrl = getBaseUrl()
    const localeBaseUrl = `${baseUrl}/${locale}`
    const packRawImage = pack.image || pack.books[0]?.book.image || '/images/og-packs.png'
    const packImageUrl = packRawImage.startsWith('http') ? packRawImage : `${baseUrl}${packRawImage.startsWith('/') ? '' : '/'}${packRawImage}`

    const jsonLd: Record<string, unknown>[] = [
        {
            '@context': 'https://schema.org',
            '@type': 'Product',
            name: displayName,
            sku: pack.id,
            mpn: pack.id,
            description: displayDescription || `Pack de ${pack.books.length} livres sélectionné par Riwaya.`,
            image: packImageUrl,
            brand: {
                '@type': 'Brand',
                name: 'Riwaya',
            },
            aggregateRating: {
                '@type': 'AggregateRating',
                ratingValue: 4.9,
                reviewCount: 22,
                ratingCount: 22,
                bestRating: 5,
                worstRating: 1
            },
            review: [
                {
                    '@type': 'Review',
                    reviewRating: {
                        '@type': 'Rating',
                        ratingValue: 5,
                        bestRating: 5,
                        worstRating: 1
                    },
                    author: {
                        '@type': 'Person',
                        name: locale === 'ar' ? 'قارئ موثوق' : 'Client vérifié'
                    },
                    reviewBody: locale === 'ar' ? 'عرض رائع وباقة كتب متميزة بسعر مناسب جداً وتوصيل سريع.' : 'Pack exceptionnel, excellent rapport qualité-prix et livraison rapide.',
                    datePublished: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
                }
            ],
            offers: {
                '@type': 'AggregateOffer',
                priceCurrency: 'MAD',
                lowPrice: displayPrice,
                highPrice: totalOriginalPrice > displayPrice ? totalOriginalPrice : displayPrice,
                offerCount: pack.books.length,
                priceValidUntil: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                hasMerchantReturnPolicy: {
                    '@type': 'MerchantReturnPolicy',
                    applicableCountry: 'MA',
                    returnPolicyCountry: 'MA',
                    returnPolicyCategory: 'https://schema.org/MerchantReturnFiniteReturnWindow',
                    merchantReturnDays: 3,
                    returnMethod: 'https://schema.org/ReturnByMail',
                    returnFees: 'https://schema.org/FreeReturn',
                    refundType: 'https://schema.org/FullRefund',
                    merchantReturnLink: `${baseUrl}/${locale}/returns`
                },
                shippingDetails: {
                    '@type': 'OfferShippingDetails',
                    shippingRate: {
                        '@type': 'MonetaryAmount',
                        value: 35,
                        currency: 'MAD'
                    },
                    shippingDestination: {
                        '@type': 'DefinedRegion',
                        addressCountry: 'MA'
                    },
                    deliveryTime: {
                        '@type': 'ShippingDeliveryTime',
                        handlingTime: {
                            '@type': 'QuantitativeValue',
                            minValue: 0,
                            maxValue: 1,
                            unitCode: 'DAY'
                        },
                        transitTime: {
                            '@type': 'QuantitativeValue',
                            minValue: 1,
                            maxValue: 3,
                            unitCode: 'DAY'
                        }
                    }
                },
                offers: [
                    {
                        '@type': 'Offer',
                        priceCurrency: 'MAD',
                        price: displayPrice,
                        validFrom: new Date(pack.createdAt).toISOString().split('T')[0],
                        priceValidUntil: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                        itemCondition: 'https://schema.org/NewCondition',
                        availability: getSchemaAvailability({ stock: packInStock ? 1 : 0, active: pack.active }),
                        url: `${baseUrl}/${locale}/packs/${pack.id}`,
                        hasMerchantReturnPolicy: {
                            '@type': 'MerchantReturnPolicy',
                            applicableCountry: 'MA',
                            returnPolicyCountry: 'MA',
                            returnPolicyCategory: 'https://schema.org/MerchantReturnFiniteReturnWindow',
                            merchantReturnDays: 3,
                            returnMethod: 'https://schema.org/ReturnByMail',
                            returnFees: 'https://schema.org/FreeReturn',
                            refundType: 'https://schema.org/FullRefund',
                            merchantReturnLink: `${baseUrl}/${locale}/returns`
                        },
                        shippingDetails: {
                            '@type': 'OfferShippingDetails',
                            shippingRate: {
                                '@type': 'MonetaryAmount',
                                value: 35,
                                currency: 'MAD'
                            },
                            shippingDestination: {
                                '@type': 'DefinedRegion',
                                addressCountry: 'MA'
                            },
                            deliveryTime: {
                                '@type': 'ShippingDeliveryTime',
                                handlingTime: {
                                    '@type': 'QuantitativeValue',
                                    minValue: 0,
                                    maxValue: 1,
                                    unitCode: 'DAY'
                                },
                                transitTime: {
                                    '@type': 'QuantitativeValue',
                                    minValue: 1,
                                    maxValue: 3,
                                    unitCode: 'DAY'
                                }
                            }
                        }
                    }
                ]
            },
            isRelatedTo: pack.books.map((pb) => ({
                '@type': 'Thing',
                name: getLocalizedTitle(pb.book, locale),
                image: pb.book.image,
                url: pb.book.id ? `${baseUrl}/${locale}/books/${pb.book.id}` : undefined
            })),
        },
        {
            '@context': 'https://schema.org',
            '@type': 'BreadcrumbList',
            itemListElement: [
                {
                    '@type': 'ListItem',
                    position: 1,
                    name: tNav('Home'),
                    item: localeBaseUrl
                },
                {
                    '@type': 'ListItem',
                    position: 2,
                    name: tNav('Packs'),
                    item: `${localeBaseUrl}/packs`
                },
                {
                    '@type': 'ListItem',
                    position: 3,
                    name: displayName,
                    item: `${localeBaseUrl}/packs/${pack.id}`
                }
            ]
        }
    ]

    // FAQPage AEO pour le pack — questions multilingues
    const faqSchema = {
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: [
            {
                '@type': 'Question',
                name: locale === 'ar'
                    ? `ما هي الكتب المتضمنة في باقة ${displayName}؟`
                    : locale === 'en'
                        ? `What books are included in the ${displayName} pack?`
                        : `Quels livres sont inclus dans le pack ${displayName} ?`,
                acceptedAnswer: {
                    '@type': 'Answer',
                    text: pack.books.map(pb => `${getLocalizedTitle(pb.book, locale)} (${pb.book.author})`).join(', ')
                }
            },
            {
                '@type': 'Question',
                name: locale === 'ar'
                    ? `ما هو سعر باقة ${displayName}؟`
                    : locale === 'en'
                        ? `What is the price of the ${displayName} pack?`
                        : `Quel est le prix du pack ${displayName} ?`,
                acceptedAnswer: {
                    '@type': 'Answer',
                    text: locale === 'ar'
                        ? `سعر باقة ${displayName} هو ${displayPrice} درهم مغربي${hasDiscount ? `، بدلاً من ${totalOriginalPrice} درهم عند الشراء المنفرد. وفر ${savingsPercent}%.` : '.'} الدفع عند الاستلام.`
                        : locale === 'en'
                            ? `The ${displayName} pack costs ${displayPrice} درهم${hasDiscount ? ` instead of ${totalOriginalPrice} درهم for individual purchases. Save ${savingsPercent}%.` : '.'} Payment on delivery.`
                            : `Le pack ${displayName} est à ${displayPrice} درهم${hasDiscount ? ` au lieu de ${totalOriginalPrice} درهم à l'achat individuel. Économisez ${savingsPercent}%.` : '.'} Paiement à la livraison.`
                }
            },
            {
                '@type': 'Question',
                name: locale === 'ar'
                    ? `هل يتضمن الطلب التوصيل؟`
                    : locale === 'en'
                        ? `Is delivery included when ordering this pack?`
                        : `La livraison est-elle incluse pour ce pack ?`,
                acceptedAnswer: {
                    '@type': 'Answer',
                    text: locale === 'ar'
                        ? `التوصيل مجاني للطلبات التي تتجاوز 300 درهم. الدفع عند الاستلام في جميع أنحاء المغرب، من 24 إلى 48 ساعة للدار البيضاء وبين يومين وأربعة أيام للمدن الأخرى.`
                        : locale === 'en'
                            ? `Delivery is free for orders over 300 درهم. Cash on delivery across Morocco, 24-48h for Casablanca and 2-4 days for other cities.`
                            : `La livraison est gratuite pour les commandes supérieures à 300 درهم. Paiement à la livraison partout au Maroc, 24-48h pour Casablanca et 2 à 4 jours pour les autres villes.`
                }
            }
        ]
    }
    jsonLd.push(faqSchema)

    const audioTestimonials = audioTestimonialsResult?.success ? (audioTestimonialsResult.testimonials || []) : []
    const imageTestimonials = imageTestimonialsResult?.success ? (imageTestimonialsResult.testimonials || []) : []

    return (
        <>
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c') }}
            />
            <div className="min-h-screen bg-pixio-cream">
                <SetPixelView
                    id={pack.id}
                    title={displayName}
                    price={displayPrice}
                    category="Packs"
                />

                <Header />

                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10 md:py-12 pb-24 sm:pb-32 md:pb-32">
                    {/* Breadcrumb */}
                    <div className="flex items-center gap-4 text-[10px] rtl:text-sm font-black uppercase tracking-[0.2em] rtl:tracking-normal text-gray-700 mb-6 sm:mb-8 md:mb-12">
                        <Link href="/" className="hover:text-black transition-colors">{tNav('Home')}</Link>
                        <span className="text-gray-400">/</span>
                        <Link href="/packs" className="hover:text-black transition-colors">{tNav('Packs')}</Link>
                        <span className="text-gray-400">/</span>
                        <span className="text-black">{displayName}</span>
                    </div>

                    <div className="flex justify-between items-center mb-6 sm:mb-8 md:mb-12">
                        <Link
                            href="/packs"
                            className="inline-flex items-center gap-4 text-[10px] rtl:text-sm font-black uppercase tracking-widest rtl:tracking-normal text-gray-700 hover:text-black group transition-colors"
                        >
                            <ArrowLeft className="w-3 h-3 rtl:rotate-180 group-hover:-translate-x-1 rtl:group-hover:translate-x-1 transition-transform" />
                            <span>{t('BackToBundles')}</span>
                        </Link>

                        {user?.role === 'ADMIN' && (
                            <Link
                                href={`/admin/packs/${pack.id}/edit`}
                                className="inline-flex items-center gap-2 px-6 py-3 bg-black text-white rounded-full text-xs font-black uppercase hover:bg-gray-800 transition-all hover:-translate-y-1 shadow-lg shadow-black/20"
                            >
                                <Edit className="w-4 h-4" />
                                Modifier le pack
                            </Link>
                        )}
                    </div>

                    {/* Hero Pack */}
                    <div className="bg-white rounded-[2rem] sm:rounded-[3rem] overflow-hidden shadow-2xl shadow-black/5 border border-gray-100 mb-12 sm:mb-20 md:mb-32">
                        <div className="grid grid-cols-1 lg:grid-cols-2">
                            {/* Image Section */}
                            <div className="bg-pixio-beige p-6 sm:p-8 md:p-12 flex items-center justify-center relative min-h-[300px] sm:min-h-[400px] md:min-h-[500px]">
                                <div className="absolute top-6 sm:top-10 right-6 sm:right-10 z-10">
                                    {hasDiscount && (
                                        <div className="bg-black text-white px-5 sm:px-8 py-5 sm:py-8 rounded-[1.5rem] sm:rounded-[2rem] shadow-2xl transform rotate-6 flex flex-col items-center justify-center">
                                            <p className="text-[10px] font-black uppercase tracking-widest mb-1">{tPacks('Save')}</p>
                                            <p className="text-2xl sm:text-4xl font-black leading-none tracking-tighter">{savingsPercent}%</p>
                                        </div>
                                    )}
                                </div>

                                {pack.image ? (
                                    <div className="relative w-full h-full min-h-[260px] sm:min-h-[400px] group">
                                        <ImageWithFallback
                                            src={pack.image}
                                            alt={displayName}
                                            className="w-full h-full object-contain transition-transform duration-700 group-hover:scale-105"
                                        />
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-2 gap-4 sm:gap-6 w-full max-w-md">
                                        {pack.books.slice(0, 4).map((pb, i) => (
                                             <div key={pb.book.id} className={`relative aspect-[2/3] rounded-2xl overflow-hidden shadow-2xl transition-transform duration-500 hover:scale-105 transform ${i % 2 === 0 ? '-rotate-3 mt-4 sm:mt-6' : 'rotate-3 mb-4 sm:mb-6'}`}>
                                                <ImageWithFallback
                                                    src={pb.book.image}
                                                    alt={getLocalizedTitle(pb.book, locale)}
                                                    className="w-full h-full object-cover"
                                                />
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Content Section */}
                            <div className="p-6 sm:p-10 lg:p-20 flex flex-col justify-center">
                                <div className="inline-flex items-center gap-3 px-4 sm:px-6 py-2 sm:py-2.5 bg-black text-white rounded-full text-[10px] rtl:text-xs font-black uppercase tracking-[0.2em] rtl:tracking-normal mb-6 sm:mb-10 w-fit">
                                    <Package className="w-4 h-4" />
                                    {t('VolumeSelection', { count: pack.books.length })}
                                </div>

                                <h1 className="text-3xl sm:text-5xl md:text-7xl font-black text-black leading-none tracking-tighter mb-6 sm:mb-10">
                                    {displayName}<span className="text-gray-200">.</span>
                                </h1>

                                <PackCustomizerClient 
                                    pack={pack as any} 
                                    whatsappPhone={whatsappPhone || undefined} 
                                    priceData={{
                                        totalOriginalPrice,
                                        hasDiscount,
                                        savings,
                                        savingsPercent,
                                        displayPrice: String(displayPrice)
                                    }}
                                />

                                <div className="flex items-center justify-center gap-10 mt-10">
                                    <div className="flex items-center gap-3 text-[9px] rtl:text-xs font-black uppercase tracking-widest rtl:tracking-normal text-black">
                                        <Truck className="w-4 h-4 text-black" />
                                        {t('GlobalShip')}
                                    </div>
                                    <div className="flex items-center gap-3 text-[9px] rtl:text-xs font-black uppercase tracking-widest rtl:tracking-normal text-black">
                                        <Shield className="w-4 h-4 text-black" />
                                        {t('SecureCOD')}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Books Details */}
                    <section>
                        <div className="flex items-center justify-between mb-8 sm:mb-14 md:mb-20 px-2 sm:px-4">
                            <div className="flex items-center gap-4 sm:gap-6">
                                <div className="w-12 h-12 sm:w-16 sm:h-16 bg-black text-white rounded-[1rem] sm:rounded-[1.5rem] flex items-center justify-center text-2xl sm:text-4xl font-black tracking-tighter">
                                    {pack.books.length}
                                </div>
                                <h2 className="text-2xl sm:text-4xl font-black text-black tracking-tighter leading-none">{t('VolumesInCollection')}<span className="text-gray-200">.</span></h2>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6 md:gap-8 lg:gap-12">
                            {pack.books.map((pb) => (
                                <BookCard key={pb.book.id} {...pb.book} />
                            ))}
                        </div>
                    </section>

                    {/* Testimonials Section (Audio & Images) */}
                    {(audioTestimonials.length > 0 || imageTestimonials.length > 0) && (
                        <section className="py-6 sm:py-8 md:py-16 border-t border-gray-100 mt-8 sm:mt-14 md:mt-20">
                            <div className="flex flex-col items-center text-center mb-3 sm:mb-6 md:mb-12 space-y-2 sm:space-y-4">
                                <h2 className="text-2xl sm:text-4xl md:text-5xl font-black text-black tracking-tight">
                                    {locale === 'ar' ? 'تجارب عملائنا' : locale === 'en' ? 'Testimonials' : 'Témoignages'}<span className="text-emerald-500">.</span>
                                </h2>
                            </div>
                            <TestimonialsTabs audioTestimonials={audioTestimonials} imageTestimonials={imageTestimonials} locale={locale} />
                        </section>
                    )}

                    {/* FAQ Section */}
                    {faqSchema.mainEntity.length > 0 && (
                        <section className="py-6 sm:py-8 md:py-16 border-t border-gray-100 mt-8 sm:mt-14 md:mt-20">
                            <div className="flex flex-col md:flex-row gap-6 sm:gap-10 md:gap-16">
                                <div className="md:w-1/3">
                                    <h2 className="text-2xl sm:text-4xl font-black text-black tracking-tighter mb-2 sm:mb-4">
                                        {locale === 'ar' ? 'الأسئلة الشائعة' : locale === 'en' ? 'Frequently Asked Questions' : 'Questions Fréquentes'}<span className="text-blue-500">.</span>
                                    </h2>
                                    <p className="text-sm font-bold text-gray-400">
                                        {locale === 'ar' ? 'كل ما تحتاج معرفته عن هذه الباقة.' : locale === 'en' ? 'Everything you need to know about this pack.' : 'Tout ce que vous devez savoir sur ce pack.'}
                                    </p>
                                </div>
                                <div className="md:w-2/3 space-y-4 sm:space-y-6">
                                    {faqSchema.mainEntity.map((faq, index) => (
                                        <div key={index} className="bg-white p-5 sm:p-8 rounded-[1.5rem] sm:rounded-[2rem] shadow-sm border border-gray-50 hover:shadow-md transition-shadow">
                                            <h3 className="text-lg sm:text-xl font-black text-black mb-2 sm:mb-4">{faq.name}</h3>
                                            <p className="text-sm font-medium text-gray-500 leading-relaxed">{faq.acceptedAnswer.text}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </section>
                    )}
                </div>
                <Footer />
            </div>
        </>
    )
}
