import { getUserExchanges } from '@/lib/actions/community-exchanges'
import { getCommunityUser } from '@/lib/actions/community-auth'
import { redirect } from 'next/navigation'
import Header from '@/components/HeaderWithUser'
import Footer from '@/components/FooterWithFeatures'
import ExchangesList from '@/components/community/ExchangesList'
import { Link } from '@/i18n/routing'
import { ArrowLeft, ArrowRight, BookOpen, Clock, CheckCircle, RefreshCw, Layers } from 'lucide-react'
import { getTranslations, getLocale } from 'next-intl/server'
import { isFeatureEnabled } from '@/lib/actions/site-settings'

export default async function ExchangesPage() {
    const enabled = await isFeatureEnabled('feature_exchange')
    const user = await getCommunityUser()

    if (!user) {
        redirect('/community/login')
    }

    const [{ received, sent }, t, locale] = await Promise.all([
        getUserExchanges(),
        getTranslations('Community.Exchanges'),
        getLocale()
    ])

    const isAr = locale === 'ar'
    const totalRequests = received.length + sent.length
    const allItems = [...received, ...sent]
    const pendingCount = allItems.filter(e => e.status === 'PENDING').length
    const acceptedCount = allItems.filter(e => e.status === 'ACCEPTED').length
    const completedCount = allItems.filter(e => e.status === 'COMPLETED').length

    return (
        <div className="min-h-screen bg-pixio-cream flex flex-col">
            <Header />

            <main className="flex-grow max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12 pb-32 w-full">
                {/* Top Navigation & Breadcrumb */}
                <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
                    <Link
                        href="/community"
                        className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-wider text-gray-500 hover:text-black transition-colors"
                    >
                        {isAr ? <ArrowRight className="w-4 h-4" /> : <ArrowLeft className="w-4 h-4" />}
                        <span>{t('BackToProfile')}</span>
                    </Link>

                    <Link
                        href="/community/market"
                        className="inline-flex items-center gap-2 bg-amber-400 hover:bg-amber-500 text-black px-4 py-2.5 rounded-2xl text-xs font-black uppercase tracking-wider transition-all shadow-sm active:scale-95"
                    >
                        <BookOpen className="w-4 h-4" />
                        <span>{t('ExploreMarket')}</span>
                    </Link>
                </div>

                {/* Hero Header */}
                <div className="mb-8">
                    <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-black tracking-tight uppercase mb-3">
                        {t('Title')}
                    </h1>
                    <p className="text-gray-600 text-sm md:text-base font-medium max-w-2xl leading-relaxed">
                        {t('Subtitle')}
                    </p>
                </div>

                {/* KPI Metric Summary Cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-8">
                    {/* Total */}
                    <div className="bg-white rounded-2xl p-4 md:p-5 border border-gray-100 shadow-sm flex items-center gap-3.5">
                        <div className="w-11 h-11 bg-gray-100 text-gray-800 rounded-xl flex items-center justify-center shrink-0">
                            <Layers className="w-5 h-5" />
                        </div>
                        <div className="min-w-0">
                            <p className="text-[10px] md:text-xs font-bold text-gray-400 uppercase tracking-wider truncate">
                                {t('StatsTotal')}
                            </p>
                            <p className="text-xl md:text-2xl font-black text-black">
                                {totalRequests}
                            </p>
                        </div>
                    </div>

                    {/* Pending */}
                    <div className="bg-white rounded-2xl p-4 md:p-5 border border-amber-100 shadow-sm flex items-center gap-3.5">
                        <div className="w-11 h-11 bg-amber-50 text-amber-700 rounded-xl flex items-center justify-center shrink-0 border border-amber-200">
                            <Clock className="w-5 h-5" />
                        </div>
                        <div className="min-w-0">
                            <p className="text-[10px] md:text-xs font-bold text-amber-700 uppercase tracking-wider truncate">
                                {t('StatsPending')}
                            </p>
                            <p className="text-xl md:text-2xl font-black text-amber-900">
                                {pendingCount}
                            </p>
                        </div>
                    </div>

                    {/* Accepted */}
                    <div className="bg-white rounded-2xl p-4 md:p-5 border border-blue-100 shadow-sm flex items-center gap-3.5">
                        <div className="w-11 h-11 bg-blue-50 text-blue-700 rounded-xl flex items-center justify-center shrink-0 border border-blue-200">
                            <RefreshCw className="w-5 h-5" />
                        </div>
                        <div className="min-w-0">
                            <p className="text-[10px] md:text-xs font-bold text-blue-700 uppercase tracking-wider truncate">
                                {t('StatsAccepted')}
                            </p>
                            <p className="text-xl md:text-2xl font-black text-blue-900">
                                {acceptedCount}
                            </p>
                        </div>
                    </div>

                    {/* Completed */}
                    <div className="bg-white rounded-2xl p-4 md:p-5 border border-emerald-100 shadow-sm flex items-center gap-3.5">
                        <div className="w-11 h-11 bg-emerald-50 text-emerald-800 rounded-xl flex items-center justify-center shrink-0 border border-emerald-200">
                            <CheckCircle className="w-5 h-5" />
                        </div>
                        <div className="min-w-0">
                            <p className="text-[10px] md:text-xs font-bold text-emerald-800 uppercase tracking-wider truncate">
                                {t('StatsCompleted')}
                            </p>
                            <p className="text-xl md:text-2xl font-black text-emerald-950">
                                {completedCount}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Interactive Exchanges Dashboard */}
                <ExchangesList received={received} sent={sent} />
            </main>

            <Footer />
        </div>
    )
}
