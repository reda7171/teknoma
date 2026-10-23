import { getTranslations } from 'next-intl/server'
import { Link } from '@/i18n/routing'
import { BookOpen, MapPin, RefreshCw, Award, HelpCircle, CheckCircle2 } from 'lucide-react'

const TOP_CITIES = [
    'Casablanca',
    'Rabat',
    'Marrakech',
    'Tanger',
    'Fès',
    'Agadir',
    'Meknès',
    'Oujda',
    'Kénitra',
    'Tétouan',
    'Mohammédia',
    'Salé',
    'El Jadida',
    'Nador',
    'Safi'
]

export default async function MarketSeoContent({ locale }: { locale: string }) {
    const t = await getTranslations({ locale, namespace: 'Community.Market.Seo' })

    const faqs = [
        { q: t('FaqQ1'), a: t('FaqA1') },
        { q: t('FaqQ2'), a: t('FaqA2') },
        { q: t('FaqQ3'), a: t('FaqA3') },
        { q: t('FaqQ4'), a: t('FaqA4') },
    ]

    return (
        <section
            aria-label="Informations échange de livres d'occasion"
            className="w-full bg-white border-t border-gray-100 py-12 sm:py-16 mt-8"
        >
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                {/* Editorial Header */}
                <div className="max-w-3xl mb-12">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-50 text-amber-700 text-xs font-bold uppercase tracking-wider mb-3">
                        <RefreshCw className="w-3.5 h-3.5" />
                        Troc & Bourse aux Livres
                    </div>
                    <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black text-black tracking-tight mb-4">
                        {t('Heading')}
                    </h2>
                    <p className="text-gray-600 text-sm sm:text-base leading-relaxed">
                        {t('Intro')}
                    </p>
                </div>

                {/* 3 Step Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-14">
                    <div className="bg-pixio-cream/40 rounded-2xl p-6 border border-gray-200/60 flex flex-col justify-between">
                        <div>
                            <div className="w-10 h-10 rounded-xl bg-black text-white flex items-center justify-center font-black mb-4">
                                <BookOpen className="w-5 h-5" />
                            </div>
                            <h3 className="text-lg font-black text-black mb-2">
                                {t('Step1Title')}
                            </h3>
                            <p className="text-xs sm:text-sm text-gray-600 leading-relaxed">
                                {t('Step1Desc')}
                            </p>
                        </div>
                        <div className="mt-4 flex items-center gap-1.5 text-xs font-bold text-gray-500">
                            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                            <span>100% gratuit</span>
                        </div>
                    </div>

                    <div className="bg-pixio-cream/40 rounded-2xl p-6 border border-gray-200/60 flex flex-col justify-between">
                        <div>
                            <div className="w-10 h-10 rounded-xl bg-black text-white flex items-center justify-center font-black mb-4">
                                <MapPin className="w-5 h-5" />
                            </div>
                            <h3 className="text-lg font-black text-black mb-2">
                                {t('Step2Title')}
                            </h3>
                            <p className="text-xs sm:text-sm text-gray-600 leading-relaxed">
                                {t('Step2Desc')}
                            </p>
                        </div>
                        <div className="mt-4 flex items-center gap-1.5 text-xs font-bold text-gray-500">
                            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                            <span>Remise en main propre</span>
                        </div>
                    </div>

                    <div className="bg-pixio-cream/40 rounded-2xl p-6 border border-gray-200/60 flex flex-col justify-between">
                        <div>
                            <div className="w-10 h-10 rounded-xl bg-black text-white flex items-center justify-center font-black mb-4">
                                <Award className="w-5 h-5" />
                            </div>
                            <h3 className="text-lg font-black text-black mb-2">
                                {t('Step3Title')}
                            </h3>
                            <p className="text-xs sm:text-sm text-gray-600 leading-relaxed">
                                {t('Step3Desc')}
                            </p>
                        </div>
                        <div className="mt-4 flex items-center gap-1.5 text-xs font-bold text-gray-500">
                            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                            <span>Système équitable</span>
                        </div>
                    </div>
                </div>

                {/* Cities Internal Links for Local SEO */}
                <div className="mb-14 bg-gray-50 rounded-2xl p-6 sm:p-8 border border-gray-100">
                    <div className="flex items-center gap-2 mb-4">
                        <MapPin className="w-5 h-5 text-gray-700" />
                        <h3 className="text-base sm:text-lg font-black text-black uppercase tracking-tight">
                            {t('CitiesTitle')}
                        </h3>
                    </div>
                    <div className="flex flex-wrap gap-2 sm:gap-2.5">
                        {TOP_CITIES.map((cityName) => (
                            <Link
                                key={cityName}
                                href={`/community/market?city=${encodeURIComponent(cityName)}` as any}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white hover:bg-black hover:text-white border border-gray-200 text-xs font-bold text-gray-700 transition-all shadow-xs"
                                title={`Échange de livres d'occasion à ${cityName}`}
                            >
                                <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                                {cityName}
                            </Link>
                        ))}
                    </div>
                </div>

                {/* Accessible FAQ Accordion */}
                <div>
                    <div className="flex items-center gap-2 mb-6">
                        <HelpCircle className="w-5 h-5 text-gray-700" />
                        <h3 className="text-xl sm:text-2xl font-black text-black tracking-tight">
                            {t('FaqTitle')}
                        </h3>
                    </div>
                    <div className="space-y-3">
                        {faqs.map((faq, idx) => (
                            <details
                                key={idx}
                                className="group bg-white rounded-xl border border-gray-200 p-4 sm:p-5 transition-all open:shadow-sm"
                            >
                                <summary className="flex items-center justify-between cursor-pointer list-none font-bold text-sm sm:text-base text-gray-900 select-none">
                                    <span>{faq.q}</span>
                                    <span className="ml-4 text-gray-400 group-open:rotate-180 transition-transform text-xs">
                                        ▼
                                    </span>
                                </summary>
                                <p className="mt-3 text-xs sm:text-sm text-gray-600 leading-relaxed pt-2 border-t border-gray-100">
                                    {faq.a}
                                </p>
                            </details>
                        ))}
                    </div>
                </div>
            </div>
        </section>
    )
}
