import { getMarketBooks, getSmartMatches } from '@/lib/actions/community-market'
import { getCommunityUser, getUserOrderCount } from '@/lib/actions/community-auth'
import Header from '@/components/HeaderWithUser'
import Footer from '@/components/FooterWithFeatures'
import MarketClientSection from '@/components/community/MarketClientSection'
import { Metadata } from 'next'
import { getBaseUrl } from '@/lib/utils'

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
    const { locale } = await params
    const baseUrl = getBaseUrl()
    const pageUrl = `${baseUrl}/${locale}/community/market`

    const isAr = locale === 'ar'
    const isEn = locale === 'en'

    const title = isAr
        ? 'سوق تبادل الكتب بين القراء بالمغرب | مجتمع رواية'
        : isEn
            ? 'Community Book Exchange Market Morocco | Riwaya'
            : 'Bourse d\'Échange de Livres entre Lecteurs au Maroc | Riwaya Community'

    const description = isAr
        ? 'منصة مجانية لتبادل وتدوير الكتب والروايات بين القراء بالمغرب. بدّل كتبك القديمة بكتب جديدة بسهولة وبدون تكاليف.'
        : isEn
            ? 'Free book exchange platform in Morocco. Trade your pre-loved novels and books with passionate readers across Moroccan cities.'
            : 'Plateforme gratuite d\'échange et troc de livres entre lecteurs partout au Maroc. Échangez vos romans et livres d\'occasion directement ou avec crédits.'

    const keywords = isAr
        ? ['تبادل الكتب بالمغرب', 'سوق تبادل الكتب', 'تبادل الروايات', 'كتب مستعملة المغرب', 'قراء المغرب', 'troc livres maroc']
        : isEn
            ? ['book exchange morocco', 'book swap morocco', 'used books readers morocco', 'trade books', 'riwaya community']
            : ['échange de livres maroc', 'troc de livres', 'bourse aux livres maroc', 'livres occasion maroc', 'partage de livres', 'communauté lecteurs maroc']

    return {
        title,
        description,
        keywords,
        openGraph: {
            title,
            description,
            url: pageUrl,
            type: 'website',
            images: ['/og-image.jpg'],
        },
        alternates: {
            canonical: pageUrl,
            languages: {
                'fr': `${baseUrl}/fr/community/market`,
                'ar': `${baseUrl}/ar/community/market`,
                'en': `${baseUrl}/en/community/market`,
                'x-default': `${baseUrl}/fr/community/market`,
            }
        }
    }
}

export default async function MarketPage({
    params,
    searchParams,
}: {
    params: Promise<{ locale: string }>
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
    const { locale } = await params
    const baseUrl = getBaseUrl()
    const pageUrl = `${baseUrl}/${locale}/community/market`

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

    const marketSchema = {
        '@context': 'https://schema.org',
        '@type': 'CollectionPage',
        name: locale === 'ar' ? 'سوق تبادل الكتب بين القراء بالمغرب' : 'Bourse d\'Échange de Livres entre Lecteurs au Maroc',
        description: locale === 'ar' ? 'منصة مجانية لتبادل وتدوير الكتب والروايات بين القراء بالمغرب' : 'Plateforme gratuite d\'échange et troc de livres entre lecteurs au Maroc',
        url: pageUrl,
    }

    return (
        <div className="min-h-screen bg-pixio-cream flex flex-col">
            <link rel="canonical" href={pageUrl} />
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(marketSchema) }}
            />
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
