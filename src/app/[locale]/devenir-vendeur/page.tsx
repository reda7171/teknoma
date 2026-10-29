import { Metadata } from 'next'
import { Store, Truck, ShieldCheck, Wallet, ArrowRight, BookOpen, CheckCircle2, TrendingUp } from 'lucide-react'
import BecomeSellerForm from './BecomeSellerForm'
import HeaderWithUser from '@/components/HeaderWithUser'
import Footer from '@/components/FooterWithFeatures'
import { isFeatureEnabled } from '@/lib/actions/site-settings'
import { notFound } from 'next/navigation'
import { getTranslations } from 'next-intl/server'

import { getBaseUrl } from '@/lib/utils'

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
    const { locale } = await params
    const baseUrl = getBaseUrl()
    const pageUrl = `${baseUrl}/${locale}/devenir-vendeur`

    const isAr = locale === 'ar'
    const isEn = locale === 'en'

    const title = isAr
        ? 'كن بائعاً أو موزعاً للكتب | متجر PetsUnivers المغرب'
        : isEn
            ? 'Become a Book Seller & Partner | PetsUnivers Morocco'
            : 'Devenir Vendeur & Revendeur de Livres | PetsUnivers Maroc'

    const description = isAr
        ? 'انضم إلى أكبر منصة ومكتبة لبيع الكتب في المغرب. اعرض كتبك كموزع أو بائع مستقل واستفد من آلاف القراء في جميع المدن المغربية.'
        : isEn
            ? 'Join Morocco\'s premier online bookstore. Sell and distribute your books effortlessly with fast local delivery and maximum reach.'
            : 'Rejoignez la première librairie en ligne du Maroc. Vendez et distribuez vos livres simplement : touchez des milliers de lecteurs partout au Maroc.'

    const keywords = isAr
        ? ['موزع كتب', 'بيع كتب بالمغرب', 'كن بائعاً', 'مكتبة الكترونية', 'شريك PetsUnivers', 'تجارة الكتب المغرب', 'devenir revendeur maroc']
        : isEn
            ? ['become a book reseller', 'sell books morocco', 'book reseller morocco', 'book distributor', 'petsunivers partner']
            : ['devenir revendeur', 'devenir vendeur', 'revendeur livres maroc', 'vendre des livres maroc', 'librairie en ligne maroc', 'partenaire librairie']

    return {
        title,
        description,
        keywords,
        openGraph: {
            title,
            description,
            url: pageUrl,
            images: ['/og-image.jpg'],
            type: 'website',
        },
        alternates: {
            canonical: pageUrl,
            languages: {
                'fr': `${baseUrl}/fr/devenir-vendeur`,
                'ar': `${baseUrl}/ar/devenir-vendeur`,
                'en': `${baseUrl}/en/devenir-vendeur`,
                'x-default': `${baseUrl}/fr/devenir-vendeur`,
            }
        }
    }
}

export default async function BecomeSellerPage({ params }: { params: Promise<{ locale: string }> }) {
    const { locale } = await params
    const baseUrl = getBaseUrl()
    const pageUrl = `${baseUrl}/${locale}/devenir-vendeur`

    // Guard: vérifier si la fonctionnalité Devenir Vendeur est activée
    const enabled = await isFeatureEnabled('feature_seller')
    if (!enabled) notFound()

    const t = await getTranslations('DevenirVendeur')

    const sellerSchema = {
        '@context': 'https://schema.org',
        '@type': 'WebPage',
        name: locale === 'ar' ? 'كن بائعاً أو موزعاً للكتب' : locale === 'en' ? 'Become a Book Seller & Partner' : 'Devenir Vendeur & Revendeur de Livres',
        description: locale === 'ar' ? 'انضم إلى أكبر منصة ومكتبة لبيع الكتب في المغرب' : 'Rejoignez la première librairie en ligne du Maroc pour vendre et distribuer vos livres',
        url: pageUrl,
    }

    return (
        <div className="min-h-screen bg-white">
            <link rel="canonical" href={pageUrl} />
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(sellerSchema) }}
            />
            <HeaderWithUser />
            {/* Hero Section */}
            <section className="relative bg-pixio-cream text-black py-8 sm:py-16 md:py-32 overflow-hidden">
                <div className="absolute inset-0 opacity-40">
                    {/* Background Pattern */}
                    <div className="absolute top-0 -left-1/4 w-96 h-96 bg-pixio-yellow rounded-full mix-blend-multiply filter blur-[128px] animate-blob"></div>
                    <div className="absolute top-0 -right-1/4 w-96 h-96 bg-emerald-200 rounded-full mix-blend-multiply filter blur-[128px] animate-blob animation-delay-2000"></div>
                    <div className="absolute -bottom-32 left-1/2 w-96 h-96 bg-purple-200 rounded-full mix-blend-multiply filter blur-[128px] animate-blob animation-delay-4000"></div>
                </div>

                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
                    <div className="max-w-3xl">
                        <div className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-full text-black text-xs font-black uppercase tracking-widest mb-4 sm:mb-8 shadow-sm">
                            <Store className="w-4 h-4 text-pixio-yellow" />
                            <span>{t('ProgrammeVendeurPartenaire')}</span>
                        </div>
                        <h1 className="text-3xl sm:text-5xl md:text-7xl font-black tracking-tight mb-4 sm:mb-6 leading-[1.1]">
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

            {/* Pourquoi choisir PetsUnivers */}
            <section className="py-8 sm:py-16 md:py-24 bg-white overflow-hidden">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center mb-6 sm:mb-10 md:mb-16">
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
            <section id="comment-ca-marche" className="py-8 sm:py-16 md:py-24 bg-pixio-cream">
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

                        {/* Image illustrative dashboard seller */}
                        <div className="flex-1 relative w-full max-w-lg mx-auto">
                            <div className="absolute inset-0 bg-blue-50/70 transform rotate-2 rounded-2xl sm:rounded-[3rem] -z-10"></div>
                            <div className="bg-white p-4 sm:p-6 md:p-8 rounded-2xl sm:rounded-[3rem] shadow-xl border border-gray-100">
                                <div className="w-full bg-gradient-to-b from-gray-50 to-white rounded-xl sm:rounded-2xl p-4 sm:p-6 border border-gray-100 flex flex-col gap-3 sm:gap-4 relative overflow-hidden">
                                    <div className="flex items-center justify-between border-b border-gray-200/60 pb-3">
                                        <div className="flex items-center gap-2">
                                            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
                                            <span className="text-xs font-black uppercase tracking-wider text-gray-700">PetsUnivers Seller</span>
                                        </div>
                                        <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-400">
                                            <BookOpen className="w-4 h-4" />
                                        </div>
                                    </div>

                                    {/* Nouvelle commande item */}
                                    <div className="bg-white shadow-sm rounded-xl p-3.5 sm:p-4 border border-gray-100 flex items-center justify-between gap-3">
                                        <div className="flex items-center gap-3 min-w-0">
                                            <div className="w-9 h-9 bg-emerald-100 rounded-xl flex items-center justify-center text-emerald-600 shrink-0">
                                                <CheckCircle2 className="w-5 h-5" />
                                            </div>
                                            <div className="min-w-0">
                                                <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wide truncate">{t('NouvelleCommande')}</div>
                                                <div className="font-black text-xs sm:text-sm text-gray-900 truncate">{t('AlchimistePrice')}</div>
                                            </div>
                                        </div>
                                        <span className="shrink-0 text-[10px] sm:text-xs font-black text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-100">
                                            COD 100%
                                        </span>
                                    </div>

                                    {/* Solde disponible item */}
                                    <div className="bg-neutral-900 text-white shadow-md rounded-xl p-3.5 sm:p-4 flex items-center justify-between gap-3">
                                        <div className="flex items-center gap-3 min-w-0">
                                            <div className="w-9 h-9 bg-neutral-800 rounded-xl flex items-center justify-center text-pixio-yellow shrink-0">
                                                <Wallet className="w-5 h-5" />
                                            </div>
                                            <div className="min-w-0">
                                                <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wide truncate">{t('SoldeDisponible')}</div>
                                                <div className="font-black text-sm sm:text-base text-pixio-yellow truncate">{t('SoldeAmount')}</div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-1 shrink-0 text-emerald-400 text-xs font-bold bg-neutral-800 px-2.5 py-1 rounded-full">
                                            <TrendingUp className="w-3.5 h-3.5" />
                                            <span>0% com.</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Inscription Form */}
            <section id="inscription" className="py-8 sm:py-16 md:py-24 bg-gray-50 border-t border-gray-100">
                <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="bg-white rounded-[2rem] sm:rounded-[3rem] shadow-xl p-5 sm:p-8 md:p-12 border-2 border-gray-100">
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
