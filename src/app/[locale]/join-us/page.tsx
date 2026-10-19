import Header from '@/components/HeaderWithUser'
import Footer from '@/components/Footer'
import { FileText, AlertCircle, Edit, MessageCircle } from 'lucide-react'
import { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
    const { locale } = await params;
    return {
        title: locale === 'ar' ? 'إلتحق بفريق العمل | رواية' : locale === 'en' ? 'Join the Team | Riwaya' : "Rejoignez l'équipe | Riwaya",
        description: locale === 'ar' ? 'إلتحق بفريق العمل. ابعث لنا تدوينتك التجريبية الآن.' : locale === 'en' ? 'Join the team. Send us your sample post now.' : "Rejoignez l'équipe. Envoyez-nous votre article d'essai maintenant.",
    }
}

export default async function JoinUsPage() {
    const t = await getTranslations('JoinUs');

    return (
        <div className="min-h-screen bg-pixio-cream overflow-hidden">
            <Header />
            
            {/* Hero Section */}
            <section className="relative py-8 sm:py-16 md:py-32 lg:py-48 px-4 border-b border-gray-100" dir={t('heroTag') === 'فرصة عمل' ? 'rtl' : 'ltr'}>
                <div className="max-w-7xl mx-auto text-center relative z-10">
                    <div className="inline-flex items-center gap-3 px-4 sm:px-6 py-2 bg-black text-white rounded-full text-xs sm:text-sm font-black mb-6 sm:mb-10 md:mb-12 animate-in fade-in slide-in-from-bottom-4 duration-700">
                        <Edit className="w-4 h-4 text-pixio-yellow" />
                        {t('heroTag')}
                    </div>
                    <h1 className="text-3xl sm:text-5xl md:text-8xl font-black text-black leading-tight mb-4 sm:mb-8 md:mb-10">
                        {t('heroTitle1')} <span className="text-gray-400">{t('heroTitle2')}</span>
                    </h1>
                    <p className="max-w-3xl mx-auto text-lg md:text-2xl font-bold text-gray-500 leading-relaxed">
                        {t('heroDescription')}
                    </p>
                </div>
                {/* Decorative Elements */}
                <div className="absolute top-1/2 left-0 w-64 h-64 bg-pixio-yellow/20 blur-[120px] -translate-y-1/2 -translate-x-1/2"></div>
                <div className="absolute top-1/2 right-0 w-64 h-64 bg-pixio-pink/20 blur-[120px] -translate-y-1/2 translate-x-1/2"></div>
            </section>

            {/* Conditions Section */}
            <section className="py-8 sm:py-14 md:py-24 px-4 bg-white" dir={t('heroTag') === 'فرصة عمل' ? 'rtl' : 'ltr'}>
                <div className="max-w-5xl mx-auto">
                    <div className="text-center mb-6 sm:mb-10 md:mb-16">
                        <h2 className="text-2xl sm:text-4xl md:text-6xl font-black text-black mb-3 sm:mb-6">{t('conditionsTitle')}</h2>
                        <p className="text-xl text-gray-500 font-bold leading-relaxed">
                            {t('conditionsDescription')}
                        </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 md:gap-8">
                        {[
                            { title: t('condition1Title'), desc: t('condition1Desc') },
                            { title: t('condition2Title'), desc: t('condition2Desc') },
                            { title: t('condition3Title'), desc: t('condition3Desc') },
                            { title: t('condition4Title'), desc: t('condition4Desc') }
                        ].map((condition, index) => (
                            <div key={index} className="p-5 sm:p-8 md:p-10 bg-gray-50 rounded-[1.5rem] sm:rounded-[2.5rem] border border-gray-100 hover:bg-black group transition-all duration-500">
                                <div className="w-14 h-14 bg-white group-hover:bg-gray-800 rounded-2xl flex items-center justify-center shadow-sm mb-6 transition-colors duration-500">
                                    <AlertCircle className="w-7 h-7 text-black group-hover:text-pixio-yellow transition-colors duration-500" />
                                </div>
                                <h3 className="text-2xl font-black text-black group-hover:text-white mb-4 transition-colors duration-500">{condition.title}</h3>
                                <p className="text-gray-500 group-hover:text-gray-400 font-bold leading-relaxed transition-colors duration-500">
                                    {condition.desc}
                                </p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Apply Section */}
            <section className="py-8 sm:py-14 md:py-32 px-4 bg-pixio-cream border-t border-gray-100" dir={t('heroTag') === 'فرصة عمل' ? 'rtl' : 'ltr'}>
                <div className="max-w-4xl mx-auto text-center">
                    <div className="bg-white p-6 sm:p-10 md:p-16 rounded-[2rem] sm:rounded-[3rem] shadow-2xl border border-gray-100 relative overflow-hidden group">
                        <div className="absolute top-0 left-0 w-full h-3 bg-gradient-to-r from-pixio-pink via-pixio-yellow to-blue-400"></div>
                        <FileText className="w-12 h-12 sm:w-20 sm:h-20 text-gray-200 group-hover:text-black transition-colors duration-500 mx-auto mb-4 sm:mb-10" />
                        <h2 className="text-2xl sm:text-4xl md:text-6xl font-black text-black mb-3 sm:mb-8">{t('applyTitle')}</h2>
                        <p className="text-base sm:text-xl md:text-2xl text-gray-500 font-bold leading-relaxed mb-6 sm:mb-12">
                            {t('applyDescription')}
                        </p>
                        
                        <a 
                            href="https://wa.me/"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-4 px-10 py-5 bg-[#25D366] hover:bg-[#128C7E] text-white rounded-full text-xl font-black transition-all duration-300 transform hover:-translate-y-2 shadow-xl shadow-[#25D366]/30"
                        >
                            <MessageCircle className="w-8 h-8" />
                            {t('applyButton')}
                        </a>
                        <div className="mt-6 sm:mt-12 text-2xl sm:text-4xl font-black text-gray-300 italic">
                            {t('applyThanks')}
                        </div>
                    </div>
                </div>
            </section>

            <Footer />
        </div>
    )
}
