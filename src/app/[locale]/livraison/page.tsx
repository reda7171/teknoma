import { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'
import Header from '@/components/HeaderWithUser'
import Footer from '@/components/Footer'
import { Truck, MapPin, Clock, ShieldCheck, CreditCard, ChevronRight } from 'lucide-react'
import Link from 'next/link'
import Script from 'next/script'

const moroccoCities = [
    { slug: 'casablanca', nameFr: 'Casablanca', nameAr: 'الدار البيضاء', nameEn: 'Casablanca' },
    { slug: 'rabat', nameFr: 'Rabat', nameAr: 'الرباط', nameEn: 'Rabat' },
    { slug: 'marrakech', nameFr: 'Marrakech', nameAr: 'مراكش', nameEn: 'Marrakech' },
    { slug: 'tanger', nameFr: 'Tanger', nameAr: 'طنجة', nameEn: 'Tangier' },
    { slug: 'fes', nameFr: 'Fès', nameAr: 'فاس', nameEn: 'Fez' },
    { slug: 'agadir', nameFr: 'Agadir', nameAr: 'أكادير', nameEn: 'Agadir' },
    { slug: 'meknes', nameFr: 'Meknès', nameAr: 'مكناس', nameEn: 'Meknes' },
    { slug: 'oujda', nameFr: 'Oujda', nameAr: 'وجدة', nameEn: 'Oujda' },
    { slug: 'kenitra', nameFr: 'Kénitra', nameAr: 'القنيطرة', nameEn: 'Kenitra' },
    { slug: 'tetouan', nameFr: 'Tétouan', nameAr: 'تطوان', nameEn: 'Tetouan' },
    { slug: 'sale', nameFr: 'Salé', nameAr: 'سلا', nameEn: 'Sale' },
    { slug: 'temara', nameFr: 'Témara', nameAr: 'تمارة', nameEn: 'Temara' },
]

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
    const { locale } = await params
    const isAr = locale === 'ar'
    const isEn = locale === 'en'

    const title = isAr
        ? 'سياسة ومناطق التوصيل في المغرب | مكتبة PetsUnivers'
        : isEn
            ? 'Delivery Policy & Cities in Morocco | PetsUnivers Bookstore'
            : 'Livraison de Livres au Maroc · Délais & Villes | Librairie PetsUnivers'

    const description = isAr
        ? 'توصيل سريع لجميع كتب وروايات مكتبة PetsUnivers إلى كافة مدن المغرب (الدار البيضاء، الرباط، مراكش، طنجة...). الدفع عند الاستلام والتوصيل مجاني للطلبات المؤهلة.'
        : isEn
            ? 'Fast book delivery across Morocco with PetsUnivers (Casablanca, Rabat, Marrakech, Tangier...). Cash on delivery and free shipping available.'
            : 'Livraison express de vos livres partout au Maroc avec PetsUnivers. Casablanca, Rabat, Marrakech, Tanger... Paiement à la livraison et livraison offerte dès 300 MAD.'

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://petsunivers.ma'

    return {
        title,
        description,
        alternates: {
            canonical: `${baseUrl}/${locale}/livraison`,
            languages: {
                fr: `${baseUrl}/fr/livraison`,
                ar: `${baseUrl}/ar/livraison`,
                en: `${baseUrl}/en/livraison`,
                'x-default': `${baseUrl}/fr/livraison`,
            },
        },
        openGraph: {
            title,
            description,
            url: `${baseUrl}/${locale}/livraison`,
            images: ['/og-image.jpg'],
        },
    }
}

export default async function DeliveryPage({ params }: { params: Promise<{ locale: string }> }): Promise<React.JSX.Element> {
    const { locale } = await params
    const t = await getTranslations('ShippingPolicyPage')
    const isAr = locale === 'ar'
    const isEn = locale === 'en'
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://petsunivers.ma'

    const jsonLd = {
        '@context': 'https://schema.org',
        '@graph': [
            {
                '@type': 'DeliveryChargeSpecification',
                name: 'Tarifs de livraison PetsUnivers Maroc',
                appliesToDeliveryMethod: 'https://schema.org/DeliveryModeOwnFleet',
                price: '35',
                priceCurrency: 'MAD',
                areaServed: {
                    '@type': 'Country',
                    name: 'Morocco'
                }
            },
            {
                '@type': 'BreadcrumbList',
                itemListElement: [
                    {
                        '@type': 'ListItem',
                        position: 1,
                        name: isAr ? 'الرئيسية' : isEn ? 'Home' : 'Accueil',
                        item: `${baseUrl}/${locale}`
                    },
                    {
                        '@type': 'ListItem',
                        position: 2,
                        name: t('Title'),
                        item: `${baseUrl}/${locale}/livraison`
                    }
                ]
            }
        ]
    }

    return (
        <div className="min-h-screen bg-pixio-cream text-gray-900">
            <Script id="delivery-schema" type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
            <Header />

            {/* Hero Header */}
            <section className="pt-28 pb-16 bg-white border-b border-gray-100 relative overflow-hidden">
                <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
                    <div className="inline-flex items-center gap-2 px-5 py-2 bg-emerald-50 text-emerald-800 rounded-full text-xs font-black uppercase tracking-widest mb-6">
                        <Truck className="w-4 h-4" />
                        <span>{isAr ? 'توصيل موثوق لجميع أنحاء المغرب' : isEn ? 'Reliable delivery across Morocco' : 'Expédition nationale rapide'}</span>
                    </div>
                    <h1 className="text-4xl md:text-6xl font-black text-black tracking-tight mb-4">
                        {t('Title')}
                    </h1>
                    <p className="text-gray-600 max-w-2xl mx-auto text-base md:text-lg">
                        {isAr
                            ? 'نضمن لك استلام كتبك في أفضل الظروف وخلال 24-48 ساعة، مع إمكانية الدفع عند الاستلام.'
                            : isEn
                                ? 'Get your books delivered to your doorstep within 24-48h, with Cash on Delivery anywhere in Morocco.'
                                : 'Recevez vos livres préférés chez vous sous 24 à 48h, avec paiement sécurisé à la livraison.'}
                    </p>
                </div>
            </section>

            {/* Core Commitments */}
            <section className="py-12 bg-white/60">
                <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex items-start gap-4">
                            <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                                <Clock className="w-6 h-6" />
                            </div>
                            <div>
                                <h3 className="font-black text-base text-gray-900 mb-1">{t('Section2Title')}</h3>
                                <p className="text-xs text-gray-600 leading-relaxed" dangerouslySetInnerHTML={{ __html: t.raw('Section2Desc') }} />
                            </div>
                        </div>

                        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex items-start gap-4">
                            <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                                <CreditCard className="w-6 h-6" />
                            </div>
                            <div>
                                <h3 className="font-black text-base text-gray-900 mb-1">{t('Section3Title')}</h3>
                                <p className="text-xs text-gray-600 leading-relaxed" dangerouslySetInnerHTML={{ __html: t.raw('Section3Desc') }} />
                            </div>
                        </div>

                        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex items-start gap-4">
                            <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                                <ShieldCheck className="w-6 h-6" />
                            </div>
                            <div>
                                <h3 className="font-black text-base text-gray-900 mb-1">{t('Section4Title')}</h3>
                                <p className="text-xs text-gray-600 leading-relaxed" dangerouslySetInnerHTML={{ __html: t.raw('Section4Desc') }} />
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Cities Directory for Local SEO */}
            <section className="py-16">
                <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center mb-10">
                        <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-gray-100 text-gray-800 rounded-full text-xs font-bold mb-3">
                            <MapPin className="w-3.5 h-3.5" />
                            <span>{isAr ? 'مدن التوصيل النشطة' : isEn ? 'Covered Cities' : 'Villes desservies'}</span>
                        </div>
                        <h2 className="text-2xl md:text-3xl font-black text-gray-900">
                            {isAr ? 'اختر مدينتك للاطلاع على تفاصيل التوصيل' : isEn ? 'Explore delivery in your city' : 'Découvrez la livraison dans votre ville'}
                        </h2>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                        {moroccoCities.map(city => {
                            const name = isAr ? city.nameAr : isEn ? city.nameEn : city.nameFr
                            return (
                                <Link
                                    key={city.slug}
                                    href={`/livraison/${city.slug}`}
                                    className="group bg-white p-4 rounded-xl border border-gray-100 shadow-sm hover:shadow-md hover:border-black transition-all flex items-center justify-between"
                                >
                                    <div className="flex items-center gap-2.5">
                                        <MapPin className="w-4 h-4 text-emerald-600 group-hover:scale-110 transition-transform" />
                                        <span className="font-bold text-sm text-gray-900 group-hover:text-black">{name}</span>
                                    </div>
                                    <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-black group-hover:translate-x-0.5 rtl:group-hover:-translate-x-0.5 rtl:rotate-180 transition-all" />
                                </Link>
                            )
                        })}
                    </div>
                </div>
            </section>

            <Footer />
        </div>
    )
}
