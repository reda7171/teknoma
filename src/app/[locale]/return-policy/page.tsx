
import Header from '@/components/HeaderWithUser'
import Footer from '@/components/Footer'
import { RefreshCcw, HelpCircle, AlertCircle, CheckCircle2, PhoneCall } from 'lucide-react'
import { getTranslations } from 'next-intl/server'

export default async function ReturnPolicyPage() {
    const t = await getTranslations('ReturnPolicyPage')
    return (
        <div className="min-h-screen bg-pixio-cream">
            <Header />
            <main className="max-w-4xl mx-auto px-4 py-24">
                <div className="bg-white rounded-[3rem] p-12 md:p-20 shadow-2xl shadow-black/5 border border-gray-100">
                    <div className="w-16 h-16 bg-black text-white rounded-2xl flex items-center justify-center mb-10">
                        <RefreshCcw className="w-8 h-8" />
                    </div>
                    
                    <h1 className="text-5xl font-black text-black tracking-tighter mb-12 italic">
                        {t('Title1')} <span className="text-gray-400">{t('Title2')}</span><span className="text-gray-200">.</span>
                    </h1>

                    <div className="prose prose-lg max-w-none text-gray-500 font-bold uppercase tracking-tight text-xs space-y-12 rtl:text-right">
                        <section className="space-y-6">
                            <h2 className="text-black text-xl font-black flex items-center gap-4">
                                <HelpCircle className="w-5 h-5 rtl:ml-4 rtl:mr-0" /> {t('Section1Title')}
                            </h2>
                            <p className="leading-relaxed">
                                {t.rich('Section1Desc', { bold: (chunks) => <strong>{chunks}</strong> })}
                            </p>
                        </section>

                        <section className="space-y-6">
                            <h2 className="text-black text-xl font-black flex items-center gap-4">
                                <AlertCircle className="w-5 h-5 rtl:ml-4 rtl:mr-0" /> {t('Section2Title')}
                            </h2>
                            <p className="leading-relaxed">
                                {t.rich('Section2Desc', { bold: (chunks) => <strong>{chunks}</strong> })}
                            </p>
                        </section>

                        <section className="space-y-6">
                            <h2 className="text-black text-xl font-black flex items-center gap-4">
                                <CheckCircle2 className="w-5 h-5 rtl:ml-4 rtl:mr-0" /> {t('Section3Title')}
                            </h2>
                            <p className="leading-relaxed">
                                {t.rich('Section3Desc', { bold: (chunks) => <strong>{chunks}</strong> })}
                            </p>
                        </section>

                        <section className="space-y-6">
                            <h2 className="text-black text-xl font-black flex items-center gap-4">
                                <PhoneCall className="w-5 h-5 rtl:ml-4 rtl:mr-0" /> {t('Section4Title')}
                            </h2>
                            <p className="leading-relaxed">
                                {t.rich('Section4Desc', { bold: (chunks) => <strong>{chunks}</strong> })}
                            </p>
                        </section>

                        <section className="space-y-6">
                            <h2 className="text-black text-xl font-black flex items-center gap-4">
                                <RefreshCcw className="w-5 h-5 rtl:ml-4 rtl:mr-0" /> {t('Section5Title')}
                            </h2>
                            <p className="leading-relaxed">
                                {t.rich('Section5Desc', { bold: (chunks) => <strong>{chunks}</strong> })}
                            </p>
                        </section>
                    </div>
                </div>
            </main>
            <Footer />
        </div>
    )
}
