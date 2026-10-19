import { getMarketBooks, getSmartMatches } from '@/lib/actions/community-market'
import { getCommunityUser, getUserOrderCount } from '@/lib/actions/community-auth'
import Header from '@/components/HeaderWithUser'
import Footer from '@/components/FooterWithFeatures'
import MarketClientSection from '@/components/community/MarketClientSection'


export default async function MarketPage({
    searchParams,
}: {
    params: Promise<{ locale: string }>
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
    const sParams = await searchParams
    const search = typeof sParams.search === 'string' ? sParams.search : undefined
    const city = typeof sParams.city === 'string' ? sParams.city : undefined

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

            <MarketClientSection
                initialBooks={books}
                smartMatches={smartMatches}
                search={search}
                city={effectiveCity}
                isBlurred={isBlurred}
                isLoggedIn={!!user}
            />

            <Footer />
        </div>
    )
}
