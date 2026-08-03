
import { getTranslations } from 'next-intl/server'
import Header from '@/components/HeaderWithUser'
import Footer from '@/components/Footer'
import { Shield, Lock, Eye, FileText, Database, Bell, UserCheck } from 'lucide-react'

export default async function PrivacyPage() {
    const t = await getTranslations('PrivacyPage')
    return (
        <div className="min-h-screen bg-pixio-cream">
            <Header />
            <main className="max-w-4xl mx-auto px-4 py-24">
                <div className="bg-white rounded-[3rem] p-12 md:p-20 shadow-2xl shadow-black/5 border border-gray-100">
                    <div className="w-16 h-16 bg-black text-white rounded-2xl flex items-center justify-center mb-10">
                        <Shield className="w-8 h-8" />
                    </div>
                    
                    <h1 className="text-5xl font-black text-black tracking-tighter mb-12 italic">
                        {t('Title')}<span className="text-gray-200">.</span>
                    </h1>

                    <div className="prose prose-lg max-w-none text-gray-500 font-bold uppercase tracking-tight text-xs space-y-12 rtl:text-right">
                        <section className="space-y-6">
                            <h2 className="text-black text-xl font-black flex items-center gap-4">
                                <Lock className="w-5 h-5 rtl:ml-4 rtl:mr-0" /> {t('Section1Title')}
                            </h2>
                            <p className="leading-relaxed">
                                {t.rich('Section1Desc', { bold: (chunks) => <strong>{chunks}</strong>, contact: (chunks) => <a href="mailto:admin@riwaya.store" className="text-blue-500 underline">{chunks}</a> })}
                            </p>
                        </section>

                        <section className="space-y-6">
                            <h2 className="text-black text-xl font-black flex items-center gap-4">
                                <Eye className="w-5 h-5 rtl:ml-4 rtl:mr-0" /> {t('Section2Title')}
                            </h2>
                            <p className="leading-relaxed">
                                {t.rich('Section2Desc', { bold: (chunks) => <strong>{chunks}</strong>, contact: (chunks) => <a href="mailto:admin@riwaya.store" className="text-blue-500 underline">{chunks}</a> })}
                            </p>
                        </section>

                        <section className="space-y-6">
                            <h2 className="text-black text-xl font-black flex items-center gap-4">
                                <Database className="w-5 h-5 rtl:ml-4 rtl:mr-0" /> {t('Section3Title')}
                            </h2>
                            <p className="leading-relaxed">
                                {t.rich('Section3Desc', { bold: (chunks) => <strong>{chunks}</strong>, contact: (chunks) => <a href="mailto:admin@riwaya.store" className="text-blue-500 underline">{chunks}</a> })}
                            </p>
                        </section>

                        <section className="space-y-6">
                            <h2 className="text-black text-xl font-black flex items-center gap-4">
                                <Bell className="w-5 h-5 rtl:ml-4 rtl:mr-0" /> {t('Section4Title')}
                            </h2>
                            <p className="leading-relaxed">
                                {t.rich('Section4Desc', { bold: (chunks) => <strong>{chunks}</strong>, link: (chunks) => <a href="https://myadcenter.google.com/" target="_blank" rel="noopener noreferrer" className="text-blue-500 underline">{chunks}</a>, contact: (chunks) => <a href="mailto:admin@riwaya.store" className="text-blue-500 underline">{chunks}</a> })}
                            </p>
                        </section>

                        <section className="space-y-6">
                            <h2 className="text-black text-xl font-black flex items-center gap-4">
                                <UserCheck className="w-5 h-5 rtl:ml-4 rtl:mr-0" /> {t('Section5Title')}
                            </h2>
                            <p className="leading-relaxed">
                                {t.rich('Section5Desc', { bold: (chunks) => <strong>{chunks}</strong>, contact: (chunks) => <a href="mailto:admin@riwaya.store" className="text-blue-500 underline">{chunks}</a> })}
                            </p>
                        </section>

                        <section className="space-y-6">
                            <h2 className="text-black text-xl font-black flex items-center gap-4">
                                <FileText className="w-5 h-5 rtl:ml-4 rtl:mr-0" /> {t('Section6Title')}
                            </h2>
                            <p className="leading-relaxed">
                                {t.rich('Section6Desc', { bold: (chunks) => <strong>{chunks}</strong>, contact: (chunks) => <a href="mailto:admin@riwaya.store" className="text-blue-500 underline">{chunks}</a> })}
                            </p>
                        </section>
                    </div>
                </div>
            </main>
            <Footer />
        </div>
    )
}
