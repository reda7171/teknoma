import { getTranslations } from 'next-intl/server'
import Header from '@/components/HeaderWithUser'
import Footer from '@/components/Footer'
import { FileSignature, CreditCard, Truck, RefreshCcw, Copyright, FileWarning } from 'lucide-react'

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
    const { locale } = await params;
    const t = await getTranslations({ locale, namespace: 'TermsPage' });
    return {
        title: `${t('Title')} | PetsUnivers`
    }
}

export default async function TermsPage({ params }: { params: Promise<{ locale: string }> }) {
    const { locale } = await params;
    const t = await getTranslations({ locale, namespace: 'TermsPage' })

    return (
        <div className="min-h-screen bg-pixio-cream">
            <Header />
            <main className="max-w-4xl mx-auto px-4 py-8 sm:py-16 md:py-24">
                <div className="bg-white rounded-2xl sm:rounded-[3rem] p-6 sm:p-12 md:p-20 shadow-2xl shadow-black/5 border border-gray-100">
                    <div className="w-12 h-12 sm:w-16 sm:h-16 bg-black text-white rounded-xl sm:rounded-2xl flex items-center justify-center mb-6 sm:mb-10">
                        <FileSignature className="w-6 h-6 sm:w-8 sm:h-8" />
                    </div>

                    <h1 className="text-3xl sm:text-5xl font-black text-black tracking-tighter mb-6 sm:mb-12 italic">
                        {t('Title')}<span className="text-gray-200">.</span>
                    </h1>

                    <div className="prose prose-lg max-w-none text-gray-500 font-bold uppercase tracking-tight text-xs space-y-12 rtl:text-right">
                        <section className="space-y-6">
                            <h2 className="text-black text-xl font-black flex items-center gap-4">
                                <FileSignature className="w-5 h-5 rtl:ml-4 rtl:mr-0" /> {t('Section1Title')}
                            </h2>
                            <p className="leading-relaxed">
                                {t.rich('Section1Desc', { bold: (chunks) => <strong>{chunks}</strong> })}
                            </p>
                        </section>

                        <section className="space-y-6">
                            <h2 className="text-black text-xl font-black flex items-center gap-4">
                                <CreditCard className="w-5 h-5 rtl:ml-4 rtl:mr-0" /> {t('Section2Title')}
                            </h2>
                            <p className="leading-relaxed">
                                {t.rich('Section2Desc', { bold: (chunks) => <strong>{chunks}</strong> })}
                            </p>
                        </section>

                        <section className="space-y-6">
                            <h2 className="text-black text-xl font-black flex items-center gap-4">
                                <Truck className="w-5 h-5 rtl:ml-4 rtl:mr-0" /> {t('Section3Title')}
                            </h2>
                            <p className="leading-relaxed">
                                {t.rich('Section3Desc', { bold: (chunks) => <strong>{chunks}</strong> })}
                            </p>
                        </section>

                        <section className="space-y-6">
                            <h2 className="text-black text-xl font-black flex items-center gap-4">
                                <RefreshCcw className="w-5 h-5 rtl:ml-4 rtl:mr-0" /> {t('Section4Title')}
                            </h2>
                            <p className="leading-relaxed">
                                {t.rich('Section4Desc', { bold: (chunks) => <strong>{chunks}</strong> })}
                            </p>
                        </section>

                        <section className="space-y-6">
                            <h2 className="text-black text-xl font-black flex items-center gap-4">
                                <Copyright className="w-5 h-5 rtl:ml-4 rtl:mr-0" /> {t('Section5Title')}
                            </h2>
                            <p className="leading-relaxed">
                                {t.rich('Section5Desc', { bold: (chunks) => <strong>{chunks}</strong> })}
                            </p>
                        </section>

                        <section className="space-y-6">
                            <h2 className="text-black text-xl font-black flex items-center gap-4">
                                <FileWarning className="w-5 h-5 rtl:ml-4 rtl:mr-0" /> {t('Section6Title')}
                            </h2>
                            <p className="leading-relaxed">
                                {t.rich('Section6Desc', { bold: (chunks) => <strong>{chunks}</strong> })}
                            </p>
                        </section>
                    </div>
                </div>
            </main>
            <Footer />
        </div>
    )
}
