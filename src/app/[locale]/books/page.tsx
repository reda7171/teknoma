import { getBooks, getBookCategories, getBooksCount, getAllAuthors } from '@/lib/db/books'
import { getPopularPacks } from '@/lib/db/packs'
import { getCategoryConfigByName } from '@/lib/actions/categories'
import { getSetting } from '@/lib/server/site-settings'
import { getCategoryTree } from '@/lib/actions/category-tree'
import { parsePriceFilter } from '@/lib/utils/search'
import { prisma } from '@/lib/prisma'
import Header from '@/components/HeaderWithUser'
import Footer from '@/components/Footer'
import BookCard from '@/components/BookCard'
import InfiniteBookList from '@/components/InfiniteBookList'
import BooksFilters from '@/components/BooksFilters'
import CatalogViewSwitcher from '@/components/books/CatalogViewSwitcher'
import KidsProductsClient from '../mon-enfant/KidsProductsClient'
import { Filter, SlidersHorizontal, Quote, Banknote, Globe, User } from 'lucide-react'
import { Link } from '@/i18n/routing'
import { getTranslations } from 'next-intl/server'
import { Metadata } from 'next'
import { sendTelegramMessage } from '@/lib/telegram'
import { headers } from 'next/headers'
import { getBaseUrl } from '@/lib/utils'

export async function generateMetadata({ params, searchParams }: { params: Promise<{ locale: string }>, searchParams: Promise<SearchParams> }): Promise<Metadata> {
    const { locale } = await params
    const resolvedParams = await searchParams
    const tCommon = await getTranslations('Common')
    const tCats = await getTranslations('Categories')
    const tBooksPage = await getTranslations('BooksPage')
    const baseUrl = getBaseUrl()

    const isUsedOnly = resolvedParams.usedOnly === 'true' || resolvedParams.isUsed === 'true'
    const isAr = locale === 'ar'
    const isEn = locale === 'en'

    if (isUsedOnly) {
        const title = isAr
            ? 'كتب وروايات مستعملة بالمغرب | بأسعار مخفضة | متجر رواية'
            : isEn
                ? 'Used Books in Morocco | Pre-Loved Books at Low Prices | Riwaya'
                : 'Livres d\'Occasion au Maroc | Petits Prix & Paiement à la Livraison | Riwaya'

        const description = isAr
            ? 'اشتري كتب وروايات مستعملة بحالة ممتازة وبأفضل الأسعار في المغرب. توصيل سريع والدفع عند الاستلام.'
            : isEn
                ? 'Buy pre-loved and second-hand books in great condition across Morocco. Discounted novels, essays, and self-help with Cash on Delivery.'
                : 'Achetez des livres d\'occasion en excellent état au Maroc. Romans, essais, développement personnel à petits prix avec paiement à la livraison.'

        const keywords = isAr
            ? ['كتب مستعملة المغرب', 'شراء كتب مستعملة', 'روايات مستعملة', 'كتب رخيصة المغرب', 'livres occasion maroc']
            : isEn
                ? ['used books morocco', 'second hand books morocco', 'pre loved books morocco', 'cheap books morocco', 'used novels']
                : ['livres d occasion maroc', 'livres occasion maroc', 'acheter livre occasion', 'livres pas chers maroc', 'livres occasion casablanca rabat']

        const canonicalUrl = `${baseUrl}/${locale}/books?usedOnly=true`

        return {
            title,
            description,
            keywords,
            openGraph: {
                title,
                description,
                url: canonicalUrl,
                type: 'website',
                images: ['/og-image.jpg'],
            },
            alternates: {
                canonical: canonicalUrl,
                languages: {
                    'ar': `${baseUrl}/ar/books?usedOnly=true`,
                    'fr': `${baseUrl}/fr/books?usedOnly=true`,
                    'en': `${baseUrl}/en/books?usedOnly=true`,
                    'x-default': `${baseUrl}/fr/books?usedOnly=true`,
                },
            },
        }
    }

    const categoryName = resolvedParams.category ? (tCats.has(resolvedParams.category as any) ? String(tCats(resolvedParams.category as any)) : resolvedParams.category) : null
    const title = categoryName ? `${categoryName} | Riwaya` : String(tBooksPage('Title')) + ' | Riwaya'

    return {
        title,
        description: `Explorez notre collection de livres ${categoryName ? `en ${categoryName}` : 'de développement personnel et business'} sur Riwaya. Livraison disponible dans tout le Maroc.`,
        openGraph: {
            title,
            description: `Explorez notre collection de livres ${categoryName ? `en ${categoryName}` : 'de développement personnel et business'} sur Riwaya. Livraison disponible dans tout le Maroc.`,
            images: ['/og-image.jpg'],
        },
        alternates: {
            canonical: `${baseUrl}/${locale}/books`,
            languages: {
                'ar': `${baseUrl}/ar/books`,
                'fr': `${baseUrl}/fr/books`,
                'en': `${baseUrl}/en/books`,
                'x-default': `${baseUrl}/ar/books`,
            },
        },
    }
}

interface SearchParams {
    category?: string
    subCategory?: string
    search?: string
    language?: string
    inStock?: string
    author?: string
    usedOnly?: string
    isUsed?: string
    newArrivals?: string
}

export default async function BooksPage({
    params,
    searchParams,
}: {
    params: Promise<{ locale: string }>
    searchParams: Promise<SearchParams>
}) {
    const { locale } = await params
    const sParams = await searchParams
    const tCommon = await getTranslations('Common');
    const tCats = await getTranslations('Categories');
    const tBooksPage = await getTranslations('BooksPage');
    const tNav = await getTranslations('Navigation');

    // Parser le prix dans la recherche si elle existe
    const priceFilter = sParams.search ? parsePriceFilter(sParams.search) : { minPrice: undefined, maxPrice: undefined, cleanQuery: sParams.search };

    const filterObj = {
        category: sParams.category,
        subCategory: sParams.subCategory,
        search: priceFilter.cleanQuery,
        minPrice: priceFilter.minPrice,
        maxPrice: priceFilter.maxPrice,
        active: true,
        language: sParams.language,
        inStock: sParams.inStock === undefined ? true : sParams.inStock === 'true',
        usedOnly: sParams.usedOnly === 'true' || sParams.isUsed === 'true',
        isUsed: sParams.isUsed === 'true' || sParams.usedOnly === 'true',
        newArrivals: sParams.newArrivals === 'true',
        author: sParams.author,
    };

    const [books, totalCount, categoryTree, categoryConfig, authors, adsenseEnabled, adsensePublisherId, adsenseSlotBetweenBooks, popularPacks, categoryCounts, boardGames, kidsProductsData] = await Promise.all([
        getBooks(filterObj),
        getBooksCount(filterObj),
        getCategoryTree(),
        sParams.category ? getCategoryConfigByName(sParams.category) : null,
        getAllAuthors(),
        getSetting('adsense_enabled'),
        getSetting('adsense_publisher_id'),
        getSetting('adsense_slot_between_books'),
        getPopularPacks(5),
        import('@/lib/db/books').then(m => m.getCategoryCounts()),
        prisma.extraProduct.findMany({ where: { category: 'BOARD_GAME', active: true }, take: 3, select: { id: true, name: true, images: true } }),
        prisma.extraProduct.findMany({ where: { category: 'KIDS', active: true }, take: 3, select: { id: true, name: true, images: true } })
    ])

    const isEnfants = sParams.category?.toLowerCase() === 'enfants'
    let kidsProducts: any[] = []
    if (isEnfants) {
        kidsProducts = await prisma.extraProduct.findMany({
            where: { category: 'KIDS', active: true },
            orderBy: { createdAt: 'desc' }
        })
    }

    const languages = [
        { code: 'fr', label: 'Français' },
        { code: 'en', label: 'English' },
        { code: 'ar', label: 'العربية' },
    ];

    const isUsedOnly = sParams.usedOnly === 'true' || sParams.isUsed === 'true'
    const baseUrl = getBaseUrl()
    const pageUrl = isUsedOnly ? `${baseUrl}/${locale}/books?usedOnly=true` : `${baseUrl}/${locale}/books`

    let usedBooksSchema = null
    if (isUsedOnly) {
        usedBooksSchema = {
            '@context': 'https://schema.org',
            '@type': 'CollectionPage',
            name: locale === 'ar' ? 'كتب وروايات مستعملة بالمغرب' : 'Livres d\'Occasion au Maroc',
            description: locale === 'ar' ? 'تشكيلة مختارة من الكتب والروايات المستعملة بحالة ممتازة في المغرب' : 'Sélection de livres et romans d\'occasion en excellent état à petits prix au Maroc',
            url: pageUrl,
            mainEntity: {
                '@type': 'ItemList',
                numberOfItems: books.length,
                itemListElement: books.slice(0, 20).map((b: any, index: number) => {
                    const img = b.image ? (b.image.startsWith('http') ? b.image : `${baseUrl}${b.image}`) : undefined
                    return {
                        '@type': 'ListItem',
                        position: index + 1,
                        name: b.title,
                        url: `${baseUrl}/${locale}/books/${b.id}`,
                        ...(img ? { image: img } : {})
                    }
                })
            }
        }
    }

    return (
        <div className="min-h-screen bg-[#FDFBF7]">
            {usedBooksSchema && (
                <script
                    type="application/ld+json"
                    dangerouslySetInnerHTML={{ __html: JSON.stringify(usedBooksSchema) }}
                />
            )}
            <Header />

            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-10 pb-4 pt-2 sm:pt-4 lg:py-8">
                {/* En-tête Catalogue avec titre visible et Sélecteur rapide */}
                <div className="mb-3 sm:mb-4 lg:mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div>
                        <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-black tracking-tight">
                            {sParams.category ? (tCats.has(sParams.category as any) ? tCats(sParams.category as any) : sParams.category) : tBooksPage('Title')}
                            <span className="text-gray-400" aria-hidden="true">.</span>
                        </h1>
                        <p className="text-xs sm:text-sm text-gray-700 font-medium mt-0.5">
                            {tBooksPage('ItemsAvailable', { count: totalCount })}
                        </p>
                    </div>

                    {/* Sélecteur rapide : Vue par défaut vs Ma vue personnalisée */}
                    <div className="shrink-0">
                        <CatalogViewSwitcher activeParams={sParams as any} />
                    </div>
                </div>

                <div className="flex flex-col lg:flex-row gap-4 xl:gap-6">
                    {/* Sidebar / Mobile Sticky Filters */}
                    <BooksFilters
                        params={sParams}
                        categoryTree={categoryTree}
                        categoryCounts={categoryCounts}
                        authors={authors}
                        languages={languages}
                        totalCount={totalCount}
                    />


                    {/* Books Grid */}
                    <div className="flex-1">
                        {isEnfants && kidsProducts.length > 0 && (
                            <div className="mb-10 bg-pink-50/50 p-6 rounded-3xl border border-pink-100/50">
                                <div className="flex items-center gap-3 mb-6">
                                    <h2 className="text-xl font-black text-gray-900">Accessoires & Goodies</h2>
                                </div>
                                <KidsProductsClient products={JSON.parse(JSON.stringify(kidsProducts))} />
                            </div>
                        )}

                        {books.length === 0 ? (
                            <div className="bg-white rounded-[2.5rem] p-20 text-center border border-gray-100">
                                <div className="w-24 h-24 bg-pixio-cream rounded-full flex items-center justify-center mx-auto mb-10">
                                    <Filter className="w-10 h-10 text-black/10" />
                                </div>
                                <h2 className="text-2xl font-black text-black mb-4">{tBooksPage('NoVolumes')}</h2>
                                <p className="text-gray-700 font-bold uppercase rtl:uppercase-none tracking-widest rtl:tracking-normal text-[10px] rtl:text-sm mb-10">
                                    {tBooksPage('EmptyCollection')}
                                </p>
                                <Link
                                    href="/books"
                                    className="inline-flex items-center gap-4 px-10 py-5 bg-black text-white text-[10px] rtl:text-sm font-black uppercase rtl:uppercase-none tracking-[0.3em] rtl:tracking-normal rounded-full hover:bg-gray-800 transition-all shadow-2xl"
                                >
                                    {tBooksPage('EmptyFilters')}
                                </Link>
                            </div>
                        ) : (
                            <>
                                {/* Results Header */}
                                <div className="flex items-center justify-between mb-4 px-2">
                                    <div className="flex items-center gap-3">
                                        <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></div>
                                        <h2 className="text-xs rtl:text-sm font-bold uppercase rtl:uppercase-none tracking-widest rtl:tracking-normal text-gray-700">
                                            <span className="text-gray-900 font-black">{totalCount}</span> {tBooksPage('Results')}
                                        </h2>
                                    </div>
                                </div>

                                {/* Grid with Infinite Scroll */}
                                <InfiniteBookList
                                    initialBooks={books}
                                    initialFilters={{
                                        category: sParams.category,
                                        subCategory: sParams.subCategory,
                                        search: priceFilter.cleanQuery,
                                        minPrice: priceFilter.minPrice,
                                        maxPrice: priceFilter.maxPrice,
                                        active: true,
                                        language: sParams.language,
                                        inStock: sParams.inStock === undefined ? true : sParams.inStock === 'true',
                                        usedOnly: sParams.usedOnly === 'true' || sParams.isUsed === 'true',
                                        isUsed: sParams.isUsed === 'true' || sParams.usedOnly === 'true',
                                        newArrivals: sParams.newArrivals === 'true',
                                        author: sParams.author,
                                        page: 1,
                                        limit: 12
                                    }}
                                    adsense={{
                                        enabled: adsenseEnabled === 'true',
                                        publisherId: adsensePublisherId || '',
                                        slotId: adsenseSlotBetweenBooks || ''
                                    }}
                                    packsCTA={popularPacks}
                                    boardGames={boardGames}
                                    kidsProducts={kidsProductsData}
                                />
                            </>
                        )}
                    </div>
                </div>
            </main>
            <Footer />
        </div>
    )
}
