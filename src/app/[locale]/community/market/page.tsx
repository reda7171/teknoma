import { getMarketBooks, getSmartMatches } from '@/lib/actions/community-market'
import { getCommunityUser, getUserOrderCount } from '@/lib/actions/community-auth'
import Header from '@/components/HeaderWithUser'
import Footer from '@/components/FooterWithFeatures'
import MarketClientSection from '@/components/community/MarketClientSection'
import MarketSeoContent from '@/components/community/MarketSeoContent'
import { Metadata } from 'next'
import { getBaseUrl } from '@/lib/utils'
import { getPrimaryImage } from '@/lib/utils/image'

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
    const { locale } = await params
    const baseUrl = getBaseUrl()
    const pageUrl = `${baseUrl}/${locale}/community/market`

    const isAr = locale === 'ar'
    const isEn = locale === 'en'

    const title = isAr
        ? 'تبادل الكتب المستعملة بالمغرب | سوق وروايات القراء - مجتمع رواية'
        : isEn
            ? 'Used Books Exchange Morocco | Readers Swap & Trade - Riwaya'
            : 'Échange de Livre Occasion au Maroc | Troc & Bourse aux Livres - Riwaya'

    const description = isAr
        ? 'منصة مجانية لتبادل وتدوير الكتب والروايات المستعملة بين القراء بالمغرب (الدار البيضاء، الرباط، مراكش...). بدّل كتبك القديمة بكتب جديدة بسهولة وبدون تكاليف.'
        : isEn
            ? 'Morocco\'s free used books exchange and novel swap community. Trade pre-loved books in Casablanca, Rabat, Marrakech and across Morocco at zero cost.'
            : 'Plateforme gratuite d\'échange de livre occasion et troc de romans entre lecteurs au Maroc (Casablanca, Rabat, Marrakech...). Échangez vos livres de seconde main sans frais.'

    const keywords = isAr
        ? ['تبادل الكتب المستعملة بالمغرب', 'تبادل كتب مستعملة', 'سوق تبادل الكتب', 'تبادل الروايات بالمغرب', 'كتب مستعملة الدار البيضاء', 'قراء المغرب', 'troc livres maroc']
        : isEn
            ? ['used books exchange morocco', 'used book swap morocco', 'trade pre-loved books morocco', 'book exchange casablanca', 'riwaya book market']
            : ['échange de livre occasion', 'échange de livres maroc', 'troc livre occasion maroc', 'bourse aux livres occasion', 'livres occasion casablanca', 'troc romans maroc', 'livres seconde main maroc', 'riwaya community']

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
    const lat = typeof sParams.lat === 'string' ? parseFloat(sParams.lat) : undefined
    const lng = typeof sParams.lng === 'string' ? parseFloat(sParams.lng) : undefined
    const radius = typeof sParams.radius === 'string' ? parseFloat(sParams.radius) : undefined

    const user = await getCommunityUser()
    const orderCount = await getUserOrderCount(user)
    const isBlurred = orderCount === 0

    // Si l'utilisateur n'a pas de commande, on force la recherche sur sa ville
    const effectiveCity = isBlurred ? (user?.city || city) : city

    const [books, smartMatches] = await Promise.all([
        getMarketBooks({ search, city: effectiveCity, lat, lng, radiusKm: radius }),
        getSmartMatches()
    ])

    const isAr = locale === 'ar'
    const isEn = locale === 'en'

    const pageTitle = isAr
        ? 'تبادل الكتب المستعملة بالمغرب | سوق وروايات القراء'
        : isEn
            ? 'Used Books Exchange Morocco | Readers Swap'
            : 'Échange de Livre Occasion au Maroc | Troc & Bourse aux Livres'

    const pageDesc = isAr
        ? 'منصة مجانية لتبادل وتدوير الكتب والروايات المستعملة بين القراء بالمغرب'
        : isEn
            ? 'Free platform to swap and exchange used books between readers in Morocco'
            : 'Plateforme gratuite d\'échange de livre occasion et troc de romans entre lecteurs au Maroc'

    // FAQ schema matching on-page content for rich snippets
    const faqQuestions = isAr ? [
        {
            q: 'كيف يمكنني تبادل كتاب مستعمل على منصة رواية؟',
            a: 'سجل حسابك على رواية، أضف الكتب المستعملة من مكتبتك، وتصفح قائمة الكتب المتاحة لطلب التبادل مع قارئ آخر.'
        },
        {
            q: 'هل تبادل الكتب مجاني؟',
            a: 'نعم، التبادل بين القراء مجاني بنسبة 100% وبدون أي عمولة. يتم اللقاء في مكان عام مناسب للطرفين.'
        },
        {
            q: 'ما هي أنواع الكتب المتاحة للتبادل؟',
            a: 'جميع الأصناف: روايات، مانجا، كتب تطوير الذات، كتب دينية، كتب مدرسية وجامعية باللغات العربية، الفرنسية والإنجليزية.'
        },
        {
            q: 'ماذا لو لم أجد كتاباً يعجبني لدى الطرف الآخر؟',
            a: 'يمكنك التبادل بنظام الرصيد: امنح كتابك واكسب رصيداً يمكنك استخدامه للحصول على كتاب من أي عضو آخر.'
        }
    ] : isEn ? [
        {
            q: 'How do I exchange a used book on Riwaya?',
            a: 'Create an account on Riwaya, list the used books from your bookshelf, and browse the market to request a direct swap or trade with credits.'
        },
        {
            q: 'Is the book exchange free?',
            a: 'Yes, exchanging books between community members is 100% free with zero fees. Members meet locally in public spaces.'
        },
        {
            q: 'What types of used books can be exchanged?',
            a: 'All genres are welcome: novels, fiction, manga, self-help, non-fiction, academic and school books in French, Arabic, and English.'
        },
        {
            q: 'What if the owner has no book I want?',
            a: 'Use Riwaya\'s credit system: give away your book to earn credits, then redeem them whenever you find a book you like from another reader.'
        }
    ] : [
        {
            q: 'Comment échanger un livre d\'occasion sur Riwaya ?',
            a: 'Inscrivez-vous sur Riwaya, ajoutez les livres d\'occasion de votre bibliothèque que vous souhaitez prêter ou échanger, puis parcourez le catalogue pour proposer un échange direct ou via crédits.'
        },
        {
            q: 'L\'échange de livres d\'occasion est-il gratuit ?',
            a: 'Oui, le troc de livres entre membres de la communauté Riwaya est 100% gratuit. Les échanges se font principalement en main propre dans un lieu public sécurisé de votre ville.'
        },
        {
            q: 'Quels types de livres peut-on troquer ?',
            a: 'Tous les genres sont acceptés : romans, polars, mangas, essais, développement personnel, livres jeunesse, manuels scolaires et universitaires en français, arabe ou anglais.'
        },
        {
            q: 'Comment faire si aucun livre ne m\'intéresse chez le propriétaire ?',
            a: 'Grâce au système de crédits Riwaya : cédez votre livre pour gagner des crédits et utilisez-les plus tard pour acquérir le livre de n\'importe quel autre membre.'
        }
    ]

    const structuredData = {
        '@context': 'https://schema.org',
        '@graph': [
            {
                '@type': 'CollectionPage',
                '@id': pageUrl,
                url: pageUrl,
                name: pageTitle,
                description: pageDesc,
                inLanguage: locale,
                isPartOf: {
                    '@type': 'WebSite',
                    '@id': `${baseUrl}/#website`,
                    name: 'Riwaya',
                    url: baseUrl
                }
            },
            {
                '@type': 'BreadcrumbList',
                itemListElement: [
                    {
                        '@type': 'ListItem',
                        position: 1,
                        name: isAr ? 'الرئيسية' : isEn ? 'Home' : 'Accueil',
                        item: `${baseUrl}/${locale}`
                    },
                    {
                        '@type': 'ListItem',
                        position: 2,
                        name: isAr ? 'مجتمع رواية' : isEn ? 'Community' : 'Communauté',
                        item: `${baseUrl}/${locale}/community`
                    },
                    {
                        '@type': 'ListItem',
                        position: 3,
                        name: pageTitle,
                        item: pageUrl
                    }
                ]
            },
            {
                '@type': 'ItemList',
                name: pageTitle,
                numberOfItems: Math.min(books.length, 12),
                itemListElement: books.slice(0, 12).map((book: any, index: number) => ({
                    '@type': 'ListItem',
                    position: index + 1,
                    item: {
                        '@type': 'Book',
                        name: book.title,
                        author: {
                            '@type': 'Person',
                            name: book.author
                        },
                        url: `${baseUrl}/${locale}/community/market/${book.id}`,
                        image: book.image ? (getPrimaryImage(book.image).startsWith('http') ? getPrimaryImage(book.image) : `${baseUrl}${getPrimaryImage(book.image)}`) : undefined,
                        itemCondition: 'https://schema.org/UsedCondition',
                        offers: {
                            '@type': 'Offer',
                            price: '0',
                            priceCurrency: 'MAD',
                            availability: 'https://schema.org/InStock',
                            description: 'Échange ou troc de livre d\'occasion'
                        }
                    }
                }))
            },
            {
                '@type': 'FAQPage',
                mainEntity: faqQuestions.map(faq => ({
                    '@type': 'Question',
                    name: faq.q,
                    acceptedAnswer: {
                        '@type': 'Answer',
                        text: faq.a
                    }
                }))
            }
        ]
    }

    return (
        <div className="min-h-screen bg-pixio-cream flex flex-col">
            <link rel="canonical" href={pageUrl} />
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
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

            <MarketSeoContent locale={locale} />

            <Footer />
        </div>
    )
}

