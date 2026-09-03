import { Metadata } from 'next'
import { Store, Truck, ShieldCheck, Wallet, ArrowRight, BookOpen } from 'lucide-react'
import BecomeSellerForm from './BecomeSellerForm'
import HeaderWithUser from '@/components/HeaderWithUser'
import Footer from '@/components/FooterWithFeatures'
import { isFeatureEnabled } from '@/lib/actions/site-settings'
import { notFound } from 'next/navigation'
import { getTranslations } from 'next-intl/server'

export const metadata: Metadata = {
    title: 'Devenir vendeur | Riwaya',
    description: 'Rejoignez la plus grande librairie en ligne du Maroc. Vendez vos livres simplement et rapidement avec Riwaya.',
    keywords: ['vendre', 'vendeur', 'livres', 'maroc', 'librairie', 'boutique', 'ecommerce'],
    openGraph: {
        title: 'Devenir vendeur | Riwaya',
        description: 'Rejoignez la plus grande librairie en ligne du Maroc. Vendez vos livres simplement et rapidement avec Riwaya.',
        images: ['/og-image.jpg'],
    }
}

export default async function BecomeSellerPage() {
    // Guard: vérifier si la fonctionnalité Devenir Vendeur est activée
    const enabled = await isFeatureEnabled('feature_seller')
    if (!enabled) notFound()

    const t = await getTranslations('DevenirVendeur')

    return (
        <div className="min-h-screen bg-white">
            <HeaderWithUser />
            {/* Hero Section */}
            <section className="relative bg-pixio-cream text-black py-24 md:py-32 overflow-hidden">
                <div className="absolute inset-0 opacity-40">
                    {/* Background Pattern */}
                    <div className="absolute top-0 -left-1/4 w-96 h-96 bg-pixio-yellow rounded-full mix-blend-multiply filter blur-[128px] animate-blob"></div>
                    <div className="absolute top-0 -right-1/4 w-96 h-96 bg-emerald-200 rounded-full mix-blend-multiply filter blur-[128px] animate-blob animation-delay-2000"></div>
                    <div className="absolute -bottom-32 left-1/2 w-96 h-96 bg-purple-200 rounded-full mix-blend-multiply filter blur-[128px] animate-blob animation-delay-4000"></div>
                </div>

                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
                    <div className="max-w-3xl">
                        <div className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-full text-black text-xs font-black uppercase tracking-widest mb-8 shadow-sm">
                            <Store className="w-4 h-4 text-pixio-yellow" />
                            <span>{t('ProgrammeVendeurPartenaire')}</span>
                        </div>
                        <h1 className="text-5xl md:text-7xl font-black tracking-tight mb-6 leading-[1.1]">
                            {t('OuvrezVotre')}<br />
                            <span className="text-pixio-yellow relative inline-block">
                                <span className="relative z-10 text-black">{t('SuccursaleLitteraire')}</span>
                                <span className="absolute bottom-2 left-0 w-full h-4 bg-pixio-yellow -z-10 -rotate-1"></span>
                            </span>
                        </h1>
                        <p className="text-xl md:text-2xl text-gray-500 font-medium leading-relaxed mb-10 max-w-2xl">
                            {t('HeroDescription')}
                        </p>
                        <div className="flex flex-col sm:flex-row gap-4">
                            <a href="#inscription" className="inline-flex items-center justify-center gap-3 px-8 py-4 bg-black text-white font-black text-sm uppercase tracking-widest rounded-full hover:bg-gray-800 transition-all shadow-xl hover:-translate-y-1">
                                <span>{t('BtnDevenirVendeur')}</span>
                                <ArrowRight className="w-5 h-5" />
                            </a>
                            <a href="#comment-ca-marche" className="inline-flex items-center justify-center gap-3 px-8 py-4 bg-white border-2 border-gray-200 text-black font-black text-sm uppercase tracking-widest rounded-full hover:border-black transition-all shadow-sm hover:-translate-y-1">
                                <span>{t('BtnCommentCaMarche')}</span>
                            </a>
                        </div>
                    </div>
                </div>
            </section>

            {/* Pourquoi choisir Riwaya */}
            <section className="py-24 bg-white overflow-hidden">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center mb-16">
                        <h2 className="text-4xl md:text-5xl font-black text-black tracking-tight">
                            {t('PourquoiVendre')}
                        </h2>
                        <p className="mt-4 text-xl text-gray-500 font-medium">{t('CroissancePriorite')}</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                        {/* Feature 1 */}
                        <div className="bg-white p-8 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.12)] transition-shadow border border-gray-100">
                            <div className="w-14 h-14 bg-blue-100 rounded-2xl flex items-center justify-center mb-6">
                                <Store className="w-7 h-7 text-blue-600" />
                            </div>
                            <h3 className="text-xl font-black text-black mb-3">{t('Feature1Title')}</h3>
                            <p className="text-gray-500 font-medium leading-relaxed">
                                {t('Feature1Desc')}
                            </p>
                        </div>

                        {/* Feature 2 */}
                        <div className="bg-white p-8 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.12)] transition-shadow border border-gray-100">
                            <div className="w-14 h-14 bg-emerald-100 rounded-2xl flex items-center justify-center mb-6">
                                <Truck className="w-7 h-7 text-emerald-600" />
                            </div>
                            <h3 className="text-xl font-black text-black mb-3">{t('Feature2Title')}</h3>
                            <p className="text-gray-500 font-medium leading-relaxed">
                                {t('Feature2Desc')}
                            </p>
                        </div>

                        {/* Feature 3 */}
                        <div className="bg-white p-8 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.12)] transition-shadow border border-gray-100">
                            <div className="w-14 h-14 bg-purple-100 rounded-2xl flex items-center justify-center mb-6">
                                <Wallet className="w-7 h-7 text-purple-600" />
                            </div>
                            <h3 className="text-xl font-black text-black mb-3">{t('Feature3Title')}</h3>
                            <p className="text-gray-500 font-medium leading-relaxed">
                                {t('Feature3Desc')}
                            </p>
                        </div>

                        {/* Feature 4 */}
                        <div className="bg-white p-8 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.12)] transition-shadow border border-gray-100">
                            <div className="w-14 h-14 bg-rose-100 rounded-2xl flex items-center justify-center mb-6">
                                <ShieldCheck className="w-7 h-7 text-rose-600" />
                            </div>
                            <h3 className="text-xl font-black text-black mb-3">{t('Feature4Title')}</h3>
                            <p className="text-gray-500 font-medium leading-relaxed">
                                {t('Feature4Desc')}
                            </p>
                        </div>
                    </div>
                </div>
            </section>

            {/* Comment ça marche */}
            <section id="comment-ca-marche" className="py-24 bg-pixio-cream">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex flex-col lg:flex-row items-center gap-16">
                        <div className="flex-1">
                            <h2 className="text-4xl md:text-5xl font-black text-black tracking-tight mb-8">
                                {t('4Etapes')}
                            </h2>
                            
                            <div className="space-y-8">
                                {/* Step 1 */}
                                <div className="flex gap-4">
                                    <div className="w-12 h-12 bg-black text-white font-black rounded-full flex items-center justify-center shrink-0">1</div>
                                    <div>
                                        <h3 className="text-xl font-black text-black mb-2">{t('Step1Title')}</h3>
                                        <p className="text-gray-500 font-medium">{t('Step1Desc')}</p>
                                    </div>
                                </div>
                                {/* Step 2 */}
                                <div className="flex gap-4">
                                    <div className="w-12 h-12 bg-pixio-yellow text-black font-black rounded-full flex items-center justify-center shrink-0">2</div>
                                    <div>
                                        <h3 className="text-xl font-black text-black mb-2">{t('Step2Title')}</h3>
                                        <p className="text-gray-500 font-medium">{t('Step2Desc')}</p>
                                    </div>
                                </div>
                                {/* Step 3 */}
                                <div className="flex gap-4">
                                    <div className="w-12 h-12 bg-black text-white font-black rounded-full flex items-center justify-center shrink-0">3</div>
                                    <div>
                                        <h3 className="text-xl font-black text-black mb-2">{t('Step3Title')}</h3>
                                        <p className="text-gray-500 font-medium">{t('Step3Desc')}</p>
                                    </div>
                                </div>
                                {/* Step 4 */}
                                <div className="flex gap-4">
                                    <div className="w-12 h-12 bg-black text-white font-black rounded-full flex items-center justify-center shrink-0">4</div>
                                    <div>
                                        <h3 className="text-xl font-black text-black mb-2">{t('Step4Title')}</h3>
                                        <p className="text-gray-500 font-medium">{t('Step4Desc')}</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Image illustrative (placeholder/styled) */}
                        <div className="flex-1 relative">
                            <div className="absolute inset-0 bg-blue-50 transform rotate-3 rounded-[3rem] -z-10"></div>
                            <div className="bg-white p-8 rounded-[3rem] shadow-2xl border border-gray-100">
                                <div className="w-full aspect-square bg-gray-50 rounded-[2rem] flex items-center justify-center relative overflow-hidden group">
                                    <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-pixio-yellow/20 rounded-full filter blur-[60px] group-hover:bg-pixio-yellow/30 transition-colors duration-500"></div>
                                    <BookOpen className="w-32 h-32 text-gray-200 z-10" />
                                    <div className="absolute top-4 left-4 bg-white shadow-md rounded-2xl p-4 flex items-center gap-3 animate-bounce" style={{ animationDuration: '3s' }}>
                                        <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">✅</div>
                                        <div>
                                            <div className="text-[10px] font-bold text-gray-400 uppercase">{t('NouvelleCommande')}</div>
                                            <div className="font-black text-sm">{t('AlchimistePrice')}</div>
                                        </div>
                                    </div>
                                    <div className="absolute bottom-10 right-4 bg-black text-white shadow-xl rounded-2xl p-4 flex items-center gap-3 animate-pulse" style={{ animationDuration: '4s' }}>
                                        <Wallet className="w-6 h-6 text-pixio-yellow" />
                                        <div>
                                            <div className="text-[10px] font-bold text-gray-400 uppercase">{t('SoldeDisponible')}</div>
                                            <div className="font-black text-sm text-pixio-yellow">{t('SoldeAmount')}</div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Inscription Form */}
            <section id="inscription" className="py-24 bg-gray-50 border-t border-gray-100">
                <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="bg-white rounded-[3rem] shadow-xl p-8 md:p-12 border-2 border-gray-100">
                        <div className="text-center mb-12">
                            <h2 className="text-4xl font-black text-black tracking-tight mb-4">{t('RejoindreVendeurs')}</h2>
                            <p className="text-gray-500 font-medium">{t('FormDescription')}</p>
                        </div>

                        <BecomeSellerForm />
                    </div>
                </div>
            </section>
            <Footer />
        </div>
    )
}
