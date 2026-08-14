import { getMarketBooks, getSmartMatches } from '@/lib/actions/community-market'
import { getCommunityUser, getUserOrderCount } from '@/lib/actions/community-auth'
import Header from '@/components/HeaderWithUser'
import Footer from '@/components/FooterWithFeatures'
import MarketClientSection from '@/components/community/MarketClientSection'
import MarketMap from '@/components/community/MarketMap'
import { getTranslations } from 'next-intl/server'


export default async function MarketPage({
    params,
    searchParams,
}: {
    params: Promise<{ locale: string }>
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
    const sParams = await searchParams
    const p = await params
    const search = typeof sParams.search === 'string' ? sParams.search : undefined
    const city = typeof sParams.city === 'string' ? sParams.city : undefined
    const t = await getTranslations('Community.Market')
    const locale = p.locale || 'fr'

    const user = await getCommunityUser()
    const orderCount = await getUserOrderCount(user)
    const isBlurred = orderCount === 0

    // Si l'utilisateur n'a pas de commande, on force la recherche sur sa ville
    const effectiveCity = isBlurred ? (user?.city || city) : city

    const [books, smartMatches] = await Promise.all([
        getMarketBooks({ search, city: effectiveCity }),
        getSmartMatches()
    ])

    return (
        <div className="min-h-screen bg-pixio-cream flex flex-col">
            <Header />

            <div className="w-full">
                <MarketMap books={books} isBlurred={isBlurred} isLoggedIn={!!user} />
            </div>

            <main className="flex-grow max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 pb-24 sm:pb-32 w-full">
                <div className="mb-8 sm:mb-12 text-center md:text-start" dir={locale === 'ar' ? 'rtl' : 'ltr'}>
                    <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-black tracking-tighter mb-3 sm:mb-4 uppercase">
                        {t('Title')}
                    </h1>
                    <p className="text-gray-500 font-medium max-w-2xl mx-auto md:mx-0">
                        {t('Subtitle')}
                    </p>
                </div>

                <MarketClientSection
                    initialBooks={books}
                    smartMatches={smartMatches}
                    search={search}
                    city={effectiveCity}
                    isBlurred={isBlurred}
                />
            </main>

            <Footer />
        </div>
    )
}
