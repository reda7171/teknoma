import { getBookById, getBooks, getPopularBooks } from '@/lib/db/books'
import { getAuthorProfile } from '@/lib/db/authors'
import Header from '@/components/HeaderWithUser'
import Footer from '@/components/Footer'
import BookCard from '@/components/BookCard'
import WishlistButton from '@/components/WishlistButton'
import { normalizeImage, getOgImageUrl, getBaseUrl } from '@/lib/utils'
import { ArrowLeft, Star, Truck, Shield, Package, MessageSquare, Quote, Sparkles, CheckCircle2, Edit2, Eye } from 'lucide-react'
import { notFound } from 'next/navigation'
import AddToCartButton from '@/components/AddToCartButton'
import ReviewForm from '@/components/ReviewForm'
import ReviewList from '@/components/ReviewList'
import { getBookReviews, getBookAverageRating } from '@/lib/actions/reviews'
import { incrementBookViews } from '@/lib/actions/books'
import { getCategoryConfigByName } from '@/lib/actions/categories'
import { getTranslations } from 'next-intl/server'
import { Link } from '@/i18n/routing'
import { getCommunityUser } from '@/lib/actions/community-auth'
import { Metadata } from 'next'
import SetPixelView from '@/components/SetPixelView'
import ImageWithFallback from '@/components/ImageWithFallback'
import TiltImage from '@/components/TiltImage'
import StickyBottomActions from '@/components/StickyBottomActions'
import WhatsAppOrderButton from '@/components/WhatsAppOrderButton'
import { getSetting } from '@/lib/actions/site-settings'
import AnnouncementBar from '@/components/AnnouncementBar'
import { getPostsByBookId } from '@/lib/actions/blog'
import Image from 'next/image'
import { Calendar, User as UserIcon, ArrowUpRight, FileText } from 'lucide-react'
import BookSubNav from '@/components/BookSubNav'
import ReserveBookButton from '@/components/ReserveBookButton'
import { BookJsonLd } from '@/components/BookJsonLd'
import AdBanner from '@/components/AdBanner'

import { getLocalizedTitle, getLocalizedDescription, getLocalizedLongDescription, generateBookUrl } from '@/lib/i18n-utils'

export async function generateMetadata({
    params,
}: {
    params: Promise<{ id: string; locale: string }>
}): Promise<Metadata> {
    const { id, locale } = await params
    const bookId = id.slice(0, 36);
    const book = await getBookById(bookId)

    if (!book) {
        return {
            title: 'Livre introuvable | Riwaya',
        }
    }

    const baseUrl = getBaseUrl()
    const fallbackApiUrl = `${baseUrl}/api/books/${book.id}/image`
    const imageUrl = getOgImageUrl(book.image, baseUrl, fallbackApiUrl)

    const localizedTitle = getLocalizedTitle(book, locale)
    const localizedDescriptionText = getLocalizedDescription(book, locale)

    let keywords: string[] = []
    let description = ''
    let siteTitle = ''

    const baseKeywords = ["رواية", "riwaya", "book", "الكاتب", "authors", "كتب"]

    if (locale === 'ar') {
        siteTitle = `${localizedTitle} - ${book.author} | مكتبة رواية`
        description = localizedDescriptionText ? localizedDescriptionText.slice(0, 150) + '...' : `اشتري كتاب "${localizedTitle}" للكاتب ${book.author} من مكتبة رواية. توصيل سريع لجميع مدن المغرب. السعر: ${book.price} درهم. ${book.stock > 0 ? 'متوفر' : 'غير متوفر'}.`
        keywords = [
            localizedTitle,
            book.author,
            `${localizedTitle} ${book.author}`,
            `شراء كتاب ${localizedTitle}`,
            `كتاب ${book.category}`,
            `كتب ${book.author}`,
            'مكتبة في الرباط',
            'مكتبة f rabat',
            'مكتبة في الدار البيضاء',
            'مكتبة رواية',
            'كتب للبيع بالمغرب',
            'روايات عربية',
            'توصيل كتب المغرب'
        ]
    } else if (locale === 'en') {
        siteTitle = `${localizedTitle} - ${book.author} | Riwaya Library`
        description = localizedDescriptionText ? localizedDescriptionText.slice(0, 150) + '...' : `Buy "${localizedTitle}" by ${book.author} on Riwaya. Fast delivery in Morocco. Price: ${book.price} درهم. ${book.stock > 0 ? 'In stock' : 'Out of stock'}.`
        keywords = [
            localizedTitle,
            book.author,
            `${localizedTitle} ${book.author}`,
            `buy ${localizedTitle} morocco`,
            `${book.category} books`,
            `${book.author} books`,
            'bookstore in rabat',
            'bookstore in casablanca',
            'buy books morocco',
            'online bookstore morocco'
        ]
    } else {
        siteTitle = `${localizedTitle} - ${book.author} | Librairie Riwaya`
        description = localizedDescriptionText ? localizedDescriptionText.slice(0, 150) + '...' : `Achetez "${localizedTitle}" de ${book.author} sur Riwaya. Livraison rapide au Maroc. Prix: ${book.price} درهم. ${book.stock > 0 ? 'En stock' : 'Rupture de stock'}.`
        keywords = [
            localizedTitle,
            book.author,
            `${localizedTitle} ${book.author}`,
            `acheter ${localizedTitle} maroc`,
            `livre ${book.category}`,
            `${book.author} livres`,
            'librairie à rabat',
            'librairie rabat',
            'librairie casablanca',
            'livres maroc',
            'librairie en ligne maroc',
            'acheter des livres au maroc'
        ]
    }
    
    keywords = [...keywords, ...baseKeywords]

    return {
        title: siteTitle,
        description: description,
        keywords: keywords,
        openGraph: {
            title: siteTitle,
            description: description,
            images: [imageUrl],
            type: 'book',
            locale: locale === 'ar' ? 'ar_MA' : locale === 'en' ? 'en_MA' : 'fr_MA',
            url: `${baseUrl}/${locale}${generateBookUrl(book, locale)}`,
        },
        twitter: {
            card: 'summary_large_image',
            title: siteTitle,
            description: description,
            images: [imageUrl],
        },
        alternates: {
            canonical: `${baseUrl}/${locale}${generateBookUrl(book, locale)}`,
            languages: {
                'ar': `${baseUrl}/ar${generateBookUrl(book, 'ar')}`,
                'fr': `${baseUrl}/fr${generateBookUrl(book, 'fr')}`,
                'en': `${baseUrl}/en${generateBookUrl(book, 'en')}`,
                'x-default': `${baseUrl}/ar${generateBookUrl(book, 'ar')}`,
            },
        },
    }
}

export default async function BookDetailPage({
    params,
}: {
    params: Promise<{ id: string; locale: string }>
}) {
    const { id, locale } = await params
    const bookId = id.slice(0, 36);
    
    const tBook = await getTranslations('BookDetail');
    const tCommon = await getTranslations('Common');
    const tNav = await getTranslations('Navigation');

    const book = await getBookById(bookId)
    const user = await getCommunityUser()
    const isAdmin = user?.role === 'ADMIN' || user?.email === 'admin@riwaya.store'

    if (!book) {
        notFound()
    }

    // Incrémentation asynchrone des vues
    incrementBookViews(book.id).catch(console.error)

    // Extraction des titres et descriptions dynamiques selon la langue
    const displayTitle = getLocalizedTitle(book, locale);
    const displayDescription = getLocalizedDescription(book, locale);
    const displayLongDescription = getLocalizedLongDescription(book, locale);

    // Récupérer les avis, note moyenne, citation et livres populaires pour cross-sell
    const [reviews, ratingData, categoryConfig, popularBooksForCrossSell, whatsappPhone, announcementEnabled, announcementMessage, announcementBgColor, announcementTextColor, relatedPosts, adsenseEnabled, adsensePublisherId, adsenseSidebarSlot, authorProfile] = await Promise.all([
        getBookReviews(bookId),
        getBookAverageRating(bookId),
        book.category ? getCategoryConfigByName(book.category) : Promise.resolve(null),
        getPopularBooks(6),
        getSetting('contact_whatsapp'),
        getSetting('announcement_bar_enabled'),
        getSetting('announcement_bar_message'),
        getSetting('announcement_bar_bg_color'),
        getSetting('announcement_bar_text_color'),
        getPostsByBookId(bookId),
        getSetting('adsense_enabled').then(v => v === 'true'),
        getSetting('adsense_publisher_id').then(v => v || ''),
        getSetting('adsense_slot_sidebar').then(v => v || ''),
        getAuthorProfile(book.author)
    ])

    const { average: averageRating, count: reviewCount } = ratingData

    // Livres similaires (même catégorie)
    const similarBooks = book.category
        ? await getBooks({ category: book.category, active: true })
        : []
    const filteredSimilarBooks = similarBooks
        .filter((b) => b.id !== book.id)
        .slice(0, 4)

    // Souvent achetés ensemble (cross-sell)
    const frequentlyBoughtTogether = popularBooksForCrossSell
        .filter((b) => b.id !== book.id && !filteredSimilarBooks.some((sim) => sim.id === b.id))
        .slice(0, 2)

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://riwaya.store'
    const normalizedImage = normalizeImage(book.image)
    const imageUrl = normalizedImage.startsWith('http') ? normalizedImage : normalizedImage.startsWith('data:') ? normalizedImage : `${baseUrl}${normalizedImage}`

    const jsonLd: any[] = [];

    if (reviewCount > 0) {
        const reviewSchema = reviews.map(r => ({
            '@context': 'https://schema.org',
            '@type': 'Review',
            itemReviewed: {
                '@type': 'Book',
                name: displayTitle
            },
            reviewRating: {
                '@type': 'Rating',
                ratingValue: r.rating,
                bestRating: '5'
            },
            author: {
                '@type': 'Person',
                name: r.userName || 'Anonyme'
            },
            reviewBody: r.comment || '',
            datePublished: new Date(r.createdAt).toISOString().split('T')[0]
        }));
        jsonLd.push(...reviewSchema);
    }

    jsonLd.push({
            '@context': 'https://schema.org',
            '@type': 'BreadcrumbList',
            itemListElement: [
                {
                    '@type': 'ListItem',
                    position: 1,
                    name: tNav('Home'),
                    item: `${baseUrl}/${locale}`
                },
                {
                    '@type': 'ListItem',
                    position: 2,
                    name: tNav('Books'),
                    item: `${baseUrl}/${locale}/books`
                },
                {
                    '@type': 'ListItem',
                    position: 3,
                    name: displayTitle,
                    item: `${baseUrl}/${locale}/books/${book.id}`
                }
            ]
        });

    const faqQuestions = [
        {
            question: locale === 'ar' ? `لماذا يجب عليك قراءة كتاب ${book.title}؟` : locale === 'en' ? `Why should you read ${book.title}?` : `Pourquoi devriez-vous lire ${book.title} ?`,
            answer: locale === 'ar' ? `كتاب ${book.title} للكاتب ${book.author} هو من أفضل الكتب في تصنيف ${book.category}. يقدم رؤية فريدة وقيمة لا غنى عنها للقراء.` : locale === 'en' ? `${book.title} by ${book.author} is one of the best books in the ${book.category} category. It offers unique insights for readers.` : `${book.title} de ${book.author} est l'un des meilleurs livres de la catégorie ${book.category}. Il offre une perspective unique et incontournable.`
        },
        {
            question: locale === 'ar' ? `من هو مؤلف كتاب ${book.title}؟` : locale === 'en' ? `Who is the author of ${book.title}?` : `Qui est l'auteur de ${book.title} ?`,
            answer: locale === 'ar' ? `مؤلف هذا الكتاب هو ${book.author}، وهو كاتب معروف بأسلوبه المتميز.` : locale === 'en' ? `The author of this book is ${book.author}, known for their distinct style.` : `L'auteur de ce livre est ${book.author}, connu pour son style distinctif.`
        },
        {
            question: locale === 'ar' ? `هل كتاب ${book.title} متوفر للبيع في المغرب؟` : locale === 'en' ? `Is ${book.title} available for sale in Morocco?` : `Le livre ${book.title} est-il disponible au Maroc ?`,
            answer: locale === 'ar' ? `نعم، كتاب ${book.title} متوفر للبيع في المغرب عبر مكتبة رواية، مع توصيل سريع لجميع المدن مثل الرباط والدار البيضاء.` : locale === 'en' ? `Yes, ${book.title} is available for sale in Morocco through Riwaya Library, with fast delivery to all cities like Rabat and Casablanca.` : `Oui, ${book.title} est disponible au Maroc via la Librairie Riwaya, avec livraison rapide vers toutes les villes comme Rabat et Casablanca.`
        }
    ]

    const faqSchema = {
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: faqQuestions.map(q => ({
            '@type': 'Question',
            name: q.question,
            acceptedAnswer: {
                '@type': 'Answer',
                text: q.answer
            }
        }))
    }
    
    jsonLd.push(faqSchema as any)

    return (
        <>
            <BookJsonLd 
                book={book} 
                locale={locale} 
                displayTitle={displayTitle}
                displayDescription={displayDescription}
                imageUrl={imageUrl}
                averageRating={averageRating}
                reviewCount={reviewCount}
            />
            {jsonLd.length > 0 && (
                <script
                    type="application/ld+json"
                    dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c') }}
                />
            )}
            <div className="min-h-screen bg-pixio-cream">
                <SetPixelView
                    id={book.id}
                    title={book.title}
                    price={book.price}
                    category={book.category || undefined}
                />



                <Header />

                <BookSubNav 
                    bookTitle={book.title}
                    homeLabel={tNav('Home')}
                    booksLabel={tNav('Books')}
                    backLabel={tBook('BackToSelection') || 'Retour à la sélection'}
                />

                <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 md:pt-10 pb-40">
                    {/* Bloc publicitaire AdSense avant le fil d'Ariane */}
                    {adsenseEnabled && (
                        <AdBanner
                            publisherId={adsensePublisherId}
                            slotId={adsenseSidebarSlot}
                            label="Publicité — Page Livre"
                            format="horizontal"
                            className="!my-3"
                        />
                    )}

                    {/* Product Detail */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-20 mb-10 md:mb-32">
                        {/* Image */}
                        <div className="lg:sticky lg:top-24 lg:self-start">
                            <div className="bg-white rounded-[2rem] md:rounded-[3rem] p-4 sm:p-6 md:p-10 shadow-2xl shadow-black/5 border border-gray-100 flex flex-col gap-8 md:gap-10">
                                <div className="relative aspect-[3/4] group max-w-sm mx-auto w-full">
                                    <div className="absolute top-6 left-6 z-10 rtl:right-6 rtl:left-auto">
                                        <WishlistButton
                                            item={{
                                                id: book.id,
                                                title: displayTitle,
                                                price: book.price,
                                                image: book.image,
                                                type: 'BOOK',
                                                slug: `/books/${book.id}`,
                                                author: book.author
                                            }}
                                            className="bg-white/90 backdrop-blur-md shadow-2xl hover:bg-white w-12 h-12 rounded-full"
                                        />
                                    </div>
                                    <TiltImage
                                        src={book.image}
                                        alt={displayTitle}
                                        className="w-full h-full object-cover transition-transform duration-700"
                                    />
                                    {book.stock <= 5 && book.stock > 0 && (
                                        <div className="absolute top-6 right-6 rtl:left-6 rtl:right-auto z-20">
                                            <span className="px-5 py-2.5 bg-black text-white text-[9px] font-black rounded-full shadow-2xl animate-pulse uppercase tracking-widest">
                                                {tBook('OnlyLeft', { stock: book.stock })}
                                            </span>
                                        </div>
                                    )}
                                    {book.stock === 0 && (
                                        <div className="absolute top-0 left-0 w-48 h-48 overflow-hidden z-20 pointer-events-none rounded-tl-[2rem]">
                                            <div className="absolute top-10 -left-12 w-64 py-3 bg-red-600 text-white text-xs font-black uppercase tracking-[0.2em] text-center -rotate-45 shadow-2xl border-y-4 border-red-400/30 backdrop-blur-sm">
                                                {tBook('OutOfStock')}
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Trust Badges */}
                                <div className="grid grid-cols-3 gap-2 sm:gap-6 pt-8 md:pt-10 border-t border-gray-50">
                                    <div className="text-center group cursor-pointer">
                                        <div className="w-14 h-14 bg-pixio-beige rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                                            <Truck className="w-6 h-6 text-black" />
                                        </div>
                                        <p className="text-[8px] rtl:text-xs rtl:tracking-normal font-black uppercase tracking-widest text-gray-400">{tBook('FastMove')}</p>
                                    </div>
                                    <div className="text-center group cursor-pointer">
                                        <div className="w-14 h-14 bg-pixio-pink rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                                            <Shield className="w-6 h-6 text-black" />
                                        </div>
                                        <p className="text-[8px] rtl:text-xs rtl:tracking-normal font-black uppercase tracking-widest text-gray-400">{tBook('Secured')}</p>
                                    </div>
                                    <div className="text-center group cursor-pointer">
                                        <div className="w-14 h-14 bg-pixio-yellow rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                                            <Package className="w-6 h-6 text-black" />
                                        </div>
                                        <p className="text-[8px] rtl:text-xs rtl:tracking-normal font-black uppercase tracking-widest text-gray-400">{tBook('Original')}</p>
                                    </div>
                                </div>
                            </div>

                            {/* Related Blog Posts - Articles parlant de ce produit */}
                            {relatedPosts && relatedPosts.length > 0 && (
                                <div className="mt-8 bg-gray-50 p-4 sm:p-6 rounded-[2rem] border border-gray-100 shadow-sm relative overflow-hidden">
                                    <div className="flex items-center gap-2 mb-6">
                                        <FileText className="w-4 h-4 text-blue-600" />
                                        <h3 className="text-sm rtl:text-base rtl:tracking-normal font-black uppercase tracking-widest text-black">
                                            {tBook('ArticleMentions')}
                                        </h3>
                                    </div>

                                    <div className="flex flex-col gap-4">
                                        {relatedPosts.map((post: any) => (
                                            <Link
                                                key={post.id}
                                                href={`/blog/${post.slug}`}
                                                className="group flex gap-4 bg-white p-3 rounded-[1.5rem] shadow-sm hover:shadow-md transition-shadow items-center"
                                            >
                                                <div className="relative w-20 h-20 sm:w-24 sm:h-24 flex-shrink-0 overflow-hidden rounded-xl bg-gray-100">
                                                    {post.coverImage ? (
                                                        <Image
                                                            src={post.coverImage}
                                                            alt={post.title}
                                                            fill
                                                            className="object-cover group-hover:scale-105 transition-transform duration-300"
                                                            unoptimized
                                                        />
                                                    ) : (
                                                        <div className="w-full h-full flex items-center justify-center">
                                                            <span className="text-gray-300 font-black text-xs opacity-50">Blog</span>
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="flex-1 min-w-0 py-1">
                                                    {post.publishedAt && (
                                                        <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1.5 flex items-center gap-1">
                                                            <Calendar className="w-2.5 h-2.5" />
                                                            {new Date(post.publishedAt).toLocaleDateString(locale === 'ar' ? 'ar-MA' : 'fr-FR')}
                                                        </p>
                                                    )}
                                                    <h4 className="text-xs sm:text-sm font-black text-black leading-tight group-hover:text-blue-600 transition-colors line-clamp-2 mb-1">
                                                        {post.title}
                                                    </h4>
                                                    <span className="text-[9px] font-black uppercase tracking-widest text-blue-500 inline-flex items-center gap-1 mt-1">
                                                        Lire l'article
                                                        <ArrowUpRight className="w-3 h-3 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                                                    </span>
                                                </div>
                                            </Link>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Author Profile Card */}
                            <div className="mt-8 bg-white rounded-[2rem] border border-gray-100 shadow-sm p-6 flex flex-col sm:flex-row items-center sm:items-start gap-5 group hover:shadow-md transition-shadow">
                                <div className="relative w-20 h-20 sm:w-24 sm:h-24 flex-shrink-0 rounded-full overflow-hidden border-4 border-gray-50 shadow-inner group-hover:border-gray-100 transition-colors mx-auto sm:mx-0">
                                    {authorProfile?.image ? (
                                        <ImageWithFallback
                                            src={authorProfile.image}
                                            alt={book.author}
                                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                        />
                                    ) : (
                                        <div className="w-full h-full bg-gray-100 flex items-center justify-center">
                                            <UserIcon className="w-8 h-8 text-gray-300" />
                                        </div>
                                    )}
                                </div>
                                <div className="flex-1 text-center sm:text-left rtl:sm:text-right">
                                    <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-1">{tBook('AboutAuthor') || 'À propos de l\'auteur'}</h3>
                                    <Link href={`/authors/${encodeURIComponent(book.author)}`} className="text-lg sm:text-xl font-black text-black hover:text-blue-600 transition-colors inline-block mb-2">
                                        {book.author}
                                    </Link>
                                    <p className="text-xs sm:text-sm font-medium text-gray-500 leading-relaxed mb-3 line-clamp-3">
                                        {authorProfile?.bio || (locale === 'ar' ? `كاتب متميز قدم العديد من الأعمال الرائعة التي أثرت المكتبة العربية.` : locale === 'en' ? `An outstanding author who has contributed many remarkable works.` : `Un auteur exceptionnel qui a contribué à de nombreuses œuvres remarquables.`)}
                                    </p>
                                    <Link 
                                        href={`/authors/${encodeURIComponent(book.author)}`}
                                        className="inline-flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest text-black bg-gray-50 hover:bg-gray-100 px-4 py-2 rounded-full transition-colors"
                                    >
                                        {tBook('DiscoverMore') || 'Découvrir plus'}
                                        <ArrowUpRight className="w-3 h-3" />
                                    </Link>
                                </div>
                            </div>
                        </div>

                        {/* Info */}
                        <div className="flex flex-col gap-8 md:gap-12">
                            <div className="space-y-4 md:space-y-6">
                                <div className="flex flex-wrap items-center gap-3 md:gap-4 mb-2 md:mb-4">
                                    {book.category && (
                                        <Link
                                            href={`/books?category=${encodeURIComponent(book.category)}`}
                                            className="inline-block px-5 py-2 bg-black text-white text-[9px] font-black rounded-full uppercase tracking-widest hover:bg-gray-800 transition-all"
                                        >
                                            {book.category}
                                        </Link>
                                    )}
                                    {isAdmin && (
                                        <>
                                            <a
                                                href={`/fr/admin/books/${book.id}/edit`}
                                                className="inline-flex items-center gap-2 px-5 py-2 bg-blue-600 text-white text-[9px] font-black rounded-full uppercase tracking-widest hover:bg-blue-700 transition-all shadow-lg shadow-blue-500/30 ring-2 ring-white"
                                            >
                                                <Edit2 className="w-3.5 h-3.5" />
                                                Modifier
                                            </a>
                                            <div className="inline-flex items-center gap-1.5 px-3 py-2 bg-slate-100 text-slate-600 text-[10px] font-bold rounded-full border border-slate-200">
                                                <Eye className="w-3.5 h-3.5 text-slate-400" />
                                                {/* @ts-ignore */}
                                                <span>{(book as any).views || 0} vues</span>
                                            </div>
                                        </>
                                    )}
                                </div>

                                <h1 className="text-3xl sm:text-4xl md:text-7xl font-black text-black leading-tight md:leading-none tracking-tight md:tracking-tighter">
                                    {displayTitle}<span className="text-gray-200">.</span>
                                </h1>

                                <p className="text-xl font-black text-gray-300 uppercase tracking-widest">
                                    {tCommon('By')} <Link href={`/authors/${encodeURIComponent(book.author)}`} className="hover:text-black transition-colors border-b-2 border-transparent hover:border-black">{book.author}</Link>
                                </p>
                            </div>

                            {/* Rating Summary */}
                            <div className="flex flex-wrap items-center gap-4 sm:gap-6">
                                <div className="flex items-center gap-2 bg-white px-4 md:px-5 py-2 md:py-3 rounded-2xl shadow-sm border border-gray-50">
                                    <div className="flex items-center gap-1">
                                        {[...Array(5)].map((_, i) => (
                                            <Star
                                                key={i}
                                                className={`w-3 h-3 ${i < Math.round(averageRating) ? 'fill-yellow-400 text-yellow-400' : 'text-gray-100'}`}
                                            />
                                        ))}
                                    </div>
                                    <span className="text-[10px] font-black text-black ml-2 uppercase tracking-widest">{averageRating > 0 ? averageRating.toFixed(1) : '5.0'}</span>
                                </div>
                                <span className="text-[9px] rtl:text-sm rtl:tracking-normal font-black text-gray-400 uppercase tracking-[0.2em]">
                                    {reviews.length > 0 ? tBook('ReaderReviews', { count: reviews.length }) : tBook('BeFirstToReview')}
                                </span>
                            </div>

                            {/* Price Section */}
                            <div className="relative group">
                                <div className="bg-white border border-gray-100 rounded-[2rem] md:rounded-[3rem] p-5 md:p-10 shadow-2xl shadow-black/5">
                                    <div className="flex items-baseline gap-3 mb-3 md:mb-4">
                                        <span className="text-4xl md:text-7xl font-black text-black tracking-tighter leading-none">{book.price}</span>
                                        <span className="text-xl font-black text-gray-300 uppercase tracking-widest">{locale === 'ar' ? 'درهم' : 'درهم'}</span>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <CheckCircle2 className="w-4 h-4 text-black" />
                                        <p className="text-[9px] rtl:text-xs rtl:tracking-normal font-black text-gray-400 uppercase tracking-widest">
                                            {tBook('TaxesIncluded')}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* CTA */}
                            <div className="space-y-8">
                                {book.stock > 0 ? (
                                    <div className="flex items-center gap-3">
                                        <div className="w-2 h-2 bg-black rounded-full animate-pulse" />
                                        <p className="text-sm font-black text-black uppercase tracking-widest">{tBook('ReadyForCollection')}</p>
                                    </div>
                                ) : (
                                    <div className="flex items-center gap-3">
                                        <div className="w-2 h-2 bg-gray-200 rounded-full" />
                                        <p className="text-[10px] font-black text-gray-300 uppercase tracking-widest">{tBook('OutOfStock')}</p>
                                    </div>
                                )}

                                <StickyBottomActions productId={book.id}>
                                    {book.stock > 0 && (
                                        <WhatsAppOrderButton
                                            title={displayTitle}
                                            price={book.price}
                                            phone={whatsappPhone || undefined}
                                            type="book"
                                        />
                                    )}
                                    <AddToCartButton
                                        product={{
                                            id: book.id,
                                            title: displayTitle,
                                            price: book.price,
                                            image: book.image,
                                            type: 'BOOK'
                                        }}
                                        disabled={book.stock <= 0}
                                        className="!py-4 md:!py-8 text-xs uppercase tracking-[0.3em] font-black !rounded-full shadow-2xl hover:shadow-black/20"
                                    />
                                    {(book as any).previewUrl && (
                                        <a
                                            href={(book as any).previewUrl}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="w-full flex items-center justify-center py-3 md:py-4 text-[10px] md:text-xs font-black text-black border-2 border-black rounded-full uppercase tracking-widest hover:bg-gray-50 transition-colors mt-2 md:mt-4"
                                        >
                                            Lire un extrait
                                        </a>
                                    )}
                                </StickyBottomActions>

                                {book.stock <= 0 && (
                                    <div className="space-y-4 mt-4">
                                        <ReserveBookButton bookId={book.id} />
                                    </div>
                                )}
                            </div>

                            {/* Frequently Bought Together (Upsell/Cross-sell) */}
                            {frequentlyBoughtTogether.length > 0 && (
                                <div className="mt-12 bg-gray-50 p-4 sm:p-6 rounded-[2rem] border border-gray-100 shadow-sm relative overflow-hidden">
                                    <h3 className="text-sm rtl:text-base rtl:tracking-normal font-black uppercase tracking-widest text-black mb-6">{tBook('FrequentlyBoughtTogether')}</h3>
                                    <div className="flex flex-col gap-3 sm:gap-4">
                                        {frequentlyBoughtTogether.map(fbBook => {
                                            const fbDisplayTitle = getLocalizedTitle(fbBook, locale);
                                            const fbBookUrl = generateBookUrl(fbBook, locale);
                                            return (
                                            <div key={fbBook.id} className="flex items-center gap-3 sm:gap-4 bg-white p-2.5 sm:p-3 rounded-[1.5rem] shadow-sm hover:shadow-md transition-shadow">
                                                <Link href={fbBookUrl} target="_blank" rel="noopener noreferrer" className="flex gap-3 sm:gap-4 items-center flex-1 min-w-0 group">
                                                    <div className="relative w-12 h-16 sm:w-16 sm:h-20 flex-shrink-0 overflow-hidden rounded-xl">
                                                        <ImageWithFallback
                                                            src={fbBook.image}
                                                            alt={fbDisplayTitle}
                                                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                                        />
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <span className="text-xs font-black text-black group-hover:text-gray-600 line-clamp-1 truncate block transition-colors">{fbDisplayTitle}</span>
                                                        <p className="text-[9px] font-bold text-gray-400 mt-0.5 sm:mt-1 truncate">{fbBook.author}</p>
                                                        <p className="text-[10px] font-black text-black mt-1.5 sm:mt-2">{fbBook.price} {locale === 'ar' ? 'درهم' : 'درهم'}</p>
                                                    </div>
                                                </Link>
                                                <AddToCartButton
                                                    product={{
                                                        id: fbBook.id,
                                                        title: fbDisplayTitle,
                                                        price: fbBook.price,
                                                        image: fbBook.image,
                                                        type: 'BOOK'
                                                    }}
                                                    showIcon={false}
                                                    className="!px-3 sm:!px-4 !py-2.5 sm:!py-3 text-[8px] sm:text-[9px] uppercase tracking-widest font-black !rounded-xl !w-auto flex-shrink-0 shadow-sm"
                                                />
                                            </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}

                            {/* Tabs Layout */}
                            <div className="flex flex-col gap-12 pt-8 md:pt-12 border-t border-gray-100">
                                <div className="space-y-6">
                                    <div className="flex items-center gap-4">
                                        <Package className="w-4 h-4 text-black" />
                                        <h2 className="text-[10px] rtl:text-sm rtl:tracking-normal font-black uppercase tracking-[0.3em] text-black">{tBook('Abstract')}</h2>
                                    </div>
                                    <div className="text-sm font-bold text-gray-400 uppercase tracking-widest leading-loose bg-white p-6 md:p-10 rounded-[2rem] md:rounded-[2.5rem] border border-gray-50 italic space-y-4">
                                        <p>{displayDescription}</p>
                                        {book.longDescription && (
                                            <p className="text-gray-600 font-medium normal-case tracking-normal mt-4">{book.longDescription}</p>
                                        )}
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                                    <div className="bg-white p-6 md:p-10 rounded-[2rem] md:rounded-[2.5rem] border border-gray-100 shadow-sm space-y-8">
                                        <h2 className="text-sm font-black text-black uppercase tracking-[0.3em]">{tBook('Technical')}</h2>
                                        <dl className="space-y-5">
                                            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center py-2 border-b border-gray-50 gap-2">
                                                <dt className="text-xs font-black uppercase tracking-widest text-gray-300">{tBook('Reference')}</dt>
                                                <dd className="text-sm font-black text-black tracking-widest break-all sm:text-right">{book.isbn || 'RIWAYA-GEN'}</dd>
                                            </div>
                                            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center py-2 border-b border-gray-50 gap-2">
                                                <dt className="text-xs font-black uppercase tracking-widest text-gray-300">{tBook('Volume')}</dt>
                                                <dd className="text-sm font-black text-black tracking-widest sm:text-right">~{Math.floor(Math.random() * 200) + 150} {tBook('Pages')}</dd>
                                            </div>
                                        </dl>
                                    </div>

                                </div>
                            </div>


                            {/* Category Quote (Cultural Aspect) */}
                            {categoryConfig?.quote && (
                                <div className="mt-32 relative group">
                                    <div className="absolute inset-0 bg-white rounded-[3rem] rotate-1 group-hover:rotate-0 transition-transform shadow-2xl shadow-black/5" />
                                    <div className="relative z-10 p-8 md:p-24 text-center">
                                        <div className="inline-flex items-center gap-3 px-6 py-2 bg-black text-white rounded-full text-[9px] font-black uppercase tracking-[0.3em] mb-12">
                                            <Sparkles className="w-3 h-3 text-pixio-yellow" />
                                            {tBook('CulturalSelect')}
                                        </div>
                                        <Quote className="absolute top-12 left-12 rtl:right-12 rtl:left-auto w-24 h-24 text-pixio-cream opacity-50 -rotate-12 rtl:rotate-12" />
                                        <p className="text-2xl md:text-5xl font-black text-black leading-tight tracking-tighter mb-10 italic max-w-4xl mx-auto">
                                            "{categoryConfig.quote}"
                                        </p>
                                        <p className="text-[10px] font-black uppercase tracking-[0.4em] text-gray-400">
                                            — {categoryConfig.quoteSource}
                                        </p>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>



                    {/* Reviews Section */}
                    <section className="py-10 md:py-32 border-t border-gray-100">
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12 lg:gap-24">
                            <div className="lg:col-span-1 space-y-10">
                                <div className="space-y-4">
                                    <div className="w-16 h-16 bg-black text-white rounded-[1.5rem] flex items-center justify-center mb-8">
                                        <MessageSquare className="w-7 h-7" />
                                    </div>
                                    <h2 className="text-4xl font-black text-black tracking-tighter">{tBook('Voices')}<span className="text-gray-200">.</span></h2>
                                    <p className="text-sm font-black text-gray-400 uppercase tracking-widest leading-loose">
                                        {tBook('SharePerspective')}
                                    </p>
                                </div>
                                <ReviewForm bookId={book.id} />
                            </div>
                            <div className="lg:col-span-2 space-y-12">
                                <h3 className="text-lg font-black text-black uppercase tracking-[0.3em]">
                                    {tBook('Reflections', { count: reviews.length })}
                                </h3>
                                <ReviewList reviews={reviews} />
                            </div>
                        </div>
                    </section>

                    {/* Similar Books */}
                    {filteredSimilarBooks.length > 0 && (
                        <section className="py-8 md:py-32 border-t border-gray-100">
                            <div className="flex items-center justify-between mb-8 md:mb-20 px-2">
                                <h2 className="text-4xl font-black text-black tracking-tighter">{tBook('RecommendedReads')}<span className="text-gray-200">.</span></h2>
                                <Link href="/books" className="text-[10px] rtl:text-xs rtl:tracking-normal font-black text-black uppercase tracking-widest bg-white px-8 py-4 rounded-full border border-gray-100 shadow-sm hover:shadow-xl transition-all">
                                    {tBook('ExploreAll')}
                                </Link>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-12">
                                {filteredSimilarBooks.map((similarBook) => (
                                    <BookCard key={similarBook.id} {...similarBook} />
                                ))}
                            </div>
                        </section>
                    )}

                    {/* FAQ Section */}
                    {faqQuestions.length > 0 && (
                        <section className="py-8 md:py-32 border-t border-gray-100">
                            <div className="flex flex-col md:flex-row gap-16">
                                <div className="md:w-1/3">
                                    <h2 className="text-4xl font-black text-black tracking-tighter mb-4">
                                        {locale === 'ar' ? 'الأسئلة الشائعة' : locale === 'en' ? 'Frequently Asked Questions' : 'Questions Fréquentes'}<span className="text-blue-500">.</span>
                                    </h2>
                                    <p className="text-sm font-bold text-gray-400">
                                        {locale === 'ar' ? 'كل ما تحتاج معرفته عن هذا الكتاب.' : locale === 'en' ? 'Everything you need to know about this book.' : 'Tout ce que vous devez savoir sur ce livre.'}
                                    </p>
                                </div>
                                <div className="md:w-2/3 space-y-6">
                                    {faqQuestions.map((faq, index) => (
                                        <div key={index} className="bg-white p-8 rounded-[2rem] shadow-sm border border-gray-50 hover:shadow-md transition-shadow">
                                            <h3 className="text-xl font-black text-black mb-4">{faq.question}</h3>
                                            <p className="text-sm font-medium text-gray-500 leading-relaxed">{faq.answer}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </section>
                    )}
                </main>
                <Footer />
            </div>
        </>
    )
}
