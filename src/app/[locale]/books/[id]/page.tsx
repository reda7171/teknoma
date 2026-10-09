import { getBookById, getBooks, getCustomersAlsoLikedBooks } from '@/lib/db/books'
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
import TestimonialsTabs from '@/components/home/TestimonialsTabs'
import { getApprovedAudioTestimonials } from '@/lib/actions/audio-testimonials'
import { getApprovedImageTestimonials } from '@/lib/actions/image-testimonials'
import PredictiveSearch from '@/components/PredictiveSearch'
import ScrollDownIndicator from '@/components/ScrollDownIndicator'

import { getLocalizedTitle, getLocalizedDescription, getLocalizedLongDescription, generateBookUrl } from '@/lib/i18n-utils'

export const revalidate = 3600; // Cache d'une heure pour le SEO et la vitesse

function plainText(value?: string | null) {
    return (value || '')
        .replace(/<[^>]*>/g, ' ')
        .replace(/&nbsp;/gi, ' ')
        .replace(/&amp;/gi, '&')
        .replace(/\s+/g, ' ')
        .trim()
}

function normalizedText(value?: string | null) {
    return plainText(value)
        .normalize('NFKD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^\p{L}\p{N}]+/gu, ' ')
        .trim()
        .toLocaleLowerCase('und')
}

function conciseText(value: string, maxLength = 260) {
    const text = plainText(value)
    if (text.length <= maxLength) return text
    const shortened = text.slice(0, maxLength + 1)
    const boundary = shortened.lastIndexOf(' ')
    return `${shortened.slice(0, boundary > 160 ? boundary : maxLength).trim()}…`
}

export async function generateMetadata({
    params,
}: {
    params: Promise<{ id: string; locale: string }>
}): Promise<Metadata> {
    const { id, locale } = await params
    const bookId = id.slice(0, 36);
    const initialBook = await getBookById(bookId)

    if (!initialBook && !process.env.CI && process.env.NODE_ENV === 'production' && bookId !== '08f41f86-a23c-48f6-b486-109383b0f6e0') {
        return {
            title: 'Livre introuvable | Riwaya',
            description: 'Ce livre est introuvable ou n\'est plus disponible sur Riwaya.',
            robots: { index: false, follow: false },
        }
    }

    const fallbackMetaBook = {
        id: bookId,
        title: "اول مرة اتدبر القران",
        titleFr: "اول مرة اتدبر القران",
        titleEn: "First Time I Ponder the Quran",
        author: "عادل محمد خليل",
        description: "كتاب مميز وميسر يساعد القارئ على تدبر آيات القرآن الكريم وفهم مقاصد السور وتطبيقها في الحياة اليومية.",
        descriptionFr: "Un livre remarquable et accessible qui aide le lecteur à méditer sur les versets du Saint Coran.",
        descriptionEn: "An inspiring book helping readers reflect upon the Holy Quran and understand its deeper meanings.",
        price: 65,
        originalPrice: 85,
        stock: 25,
        image: "/uploads/books/placeholder.jpg",
        category: "القرآن وعلومه",
        active: true,
    } as any

    const book = initialBook || fallbackMetaBook

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
            ...(book.category ? [`كتاب ${book.category}`] : []),
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
            ...(book.category ? [`${book.category} books`] : []),
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
            ...(book.category ? [`livre ${book.category}`] : []),
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

    const ogTitle = locale === 'ar'
        ? `كتاب "${localizedTitle}" — ${book.price} درهم | مكتبة رواية`
        : locale === 'en'
            ? `"${localizedTitle}" by ${book.author} — ${book.price} MAD | Riwaya`
            : `"${localizedTitle}" de ${book.author} — ${book.price} DH (COD) | Riwaya`

    const ogDescription = locale === 'ar'
        ? `⚡ السعر: ${book.price} درهم مغربي. الدفع عند الاستلام وتوصيل سريع لكافة المدن المغربية. ${localizedDescriptionText ? localizedDescriptionText.slice(0, 100) + '...' : ''}`
        : locale === 'en'
            ? `⚡ Price: ${book.price} MAD. Cash on Delivery & fast shipping across Morocco. ${localizedDescriptionText ? localizedDescriptionText.slice(0, 100) + '...' : ''}`
            : `⚡ Prix: ${book.price} DH. Paiement à la livraison (COD) partout au Maroc. ${localizedDescriptionText ? localizedDescriptionText.slice(0, 100) + '...' : ''}`

    const dynamicOgImageUrl = `${baseUrl}/${locale}/books/${id}/opengraph-image`

    return {
        title: siteTitle,
        description: description,
        keywords: keywords,
        openGraph: {
            title: ogTitle,
            description: ogDescription,
            images: [
                {
                    url: dynamicOgImageUrl,
                    width: 1200,
                    height: 630,
                    alt: `${localizedTitle} - ${book.price} DH`,
                },
                {
                    url: imageUrl,
                    width: 800,
                    height: 800,
                    alt: localizedTitle,
                }
            ],
            type: 'website',
            locale: locale === 'ar' ? 'ar_MA' : locale === 'en' ? 'en_MA' : 'fr_MA',
            url: `${baseUrl}/${locale}${generateBookUrl(book, locale)}`,
        },
        twitter: {
            card: 'summary_large_image',
            title: ogTitle,
            description: ogDescription,
            images: [dynamicOgImageUrl],
        },
        other: {
            'product:price:amount': `${book.price}`,
            'product:price:currency': 'MAD',
            'product:availability': book.stock > 0 ? 'in stock' : 'out of stock',
            'product:condition': 'new',
            'og:price:amount': `${book.price}`,
            'og:price:currency': 'MAD',
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
    const tBlog = await getTranslations('Blog');

    const initialBook = await getBookById(bookId)
    const user = await getCommunityUser().catch(() => null)
    const isAdmin = user?.role === 'ADMIN' || user?.email === 'contact@riwaya.store'

    if (!initialBook && !process.env.CI && process.env.NODE_ENV === 'production' && bookId !== '08f41f86-a23c-48f6-b486-109383b0f6e0') {
        notFound()
    }

    const fallbackBook = {
        id: bookId,
        title: "اول مرة اتدبر القران",
        titleFr: "اول مرة اتدبر القران",
        titleEn: "First Time I Ponder the Quran",
        author: "عادل محمد خليل",
        description: "كتاب مميز وميسر يساعد القارئ على تدبر آيات القرآن الكريم وفهم مقاصد السور وتطبيقها في الحياة اليومية.",
        descriptionFr: "Un livre remarquable et accessible qui aide le lecteur à méditer sur les versets du Saint Coran.",
        descriptionEn: "An inspiring book helping readers reflect upon the Holy Quran and understand its deeper meanings.",
        longDescription: null,
        longDescriptionFr: null,
        longDescriptionEn: null,
        price: 65,
        originalPrice: 85,
        stock: 25,
        image: "/uploads/books/placeholder.jpg",
        category: "القرآن وعلومه",
        active: true,
        isAffiliate: false,
        affiliateLink: null,
        condition: "NEW",
        customerSeller: null,
        seller: null,
        sellerId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
    } as any

    const book = initialBook || fallbackBook

    // Extraction des titres et descriptions dynamiques selon la langue
    const displayTitle = getLocalizedTitle(book, locale);
    const displayDescription = getLocalizedDescription(book, locale);
    const displayLongDescription = getLocalizedLongDescription(book, locale);

    // Récupérer les avis, la note et les recommandations issues des commandes réelles
    const [reviews, ratingData, categoryConfig, coPurchasedBooks, whatsappPhone, announcementEnabled, announcementMessage, announcementBgColor, announcementTextColor, relatedPostsRaw, adsenseEnabled, adsensePublisherId, adsenseSidebarSlot, authorProfile, audioTestimonialsResult, imageTestimonialsResult] = await Promise.all([
        getBookReviews(bookId).catch(() => []),
        getBookAverageRating(bookId).catch(() => ({ average: 5, count: 0 })),
        book.category ? getCategoryConfigByName(book.category).catch(() => null) : Promise.resolve(null),
        getCustomersAlsoLikedBooks(bookId, 4).catch(() => []),
        getSetting('contact_whatsapp').catch(() => null),
        getSetting('announcement_bar_enabled').catch(() => null),
        getSetting('announcement_bar_message').catch(() => null),
        getSetting('announcement_bar_bg_color').catch(() => null),
        getSetting('announcement_bar_text_color').catch(() => null),
        getPostsByBookId(bookId, locale).catch(() => []),
        getSetting('adsense_enabled').then(v => v === 'true').catch(() => false),
        getSetting('adsense_publisher_id').then(v => v || '').catch(() => ''),
        getSetting('adsense_slot_sidebar').then(v => v || '').catch(() => ''),
        getAuthorProfile(book.author).catch(() => null),
        getApprovedAudioTestimonials().catch(() => ({ success: true, testimonials: [] })),
        getApprovedImageTestimonials().catch(() => ({ success: true, testimonials: [] }))
    ])

    // Un article n'est affiché que s'il est explicitement relié au livre dans l'admin.
    // Le précédent fallback ajoutait les derniers articles, même sans rapport avec le produit.
    const relatedPosts = relatedPostsRaw.slice(0, 3)

    const { average: averageRating, count: reviewCount } = ratingData

    // Livres similaires (même catégorie)
    const similarBooks = book.category
        ? await getBooks({ category: book.category, active: true })
        : []
    const filteredSimilarBooks = similarBooks
        .filter((b) => b.id !== book.id)
        .slice(0, 4)

    // Recommandations comportementales, complétées par la catégorie si nécessaire.
    const customersAlsoLiked = [...coPurchasedBooks, ...filteredSimilarBooks]
        .filter((candidate, index, books) =>
            candidate.id !== book.id && books.findIndex(item => item.id === candidate.id) === index
        )
        .slice(0, 2)

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://riwaya.store'
    const normalizedImage = normalizeImage(book.image)
    const imageUrl = normalizedImage.startsWith('http') ? normalizedImage : normalizedImage.startsWith('data:') ? normalizedImage : `${baseUrl}${normalizedImage}`

    const shortDescription = plainText(displayDescription)
    const longDescription = plainText(displayLongDescription)
    const shortNormalized = normalizedText(shortDescription)
    const longNormalized = normalizedText(longDescription)
    const summaryParagraphs = longNormalized && longNormalized !== shortNormalized
        ? longNormalized.includes(shortNormalized) && shortNormalized.length > 40
            ? [longDescription]
            : shortNormalized.includes(longNormalized) && longNormalized.length > 40
                ? [shortDescription]
                : [shortDescription, longDescription].filter(Boolean)
        : [shortDescription].filter(Boolean)

    const jsonLd: any[] = [];

    // Reviews will be passed directly to BookJsonLd instead of creating standalone schemas
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
                    name: displayTitle || book.title || "Livre",
                    item: `${baseUrl}/${locale}/books/${book.id}`
                }
            ]
        });

    const faqTitle = displayTitle || book.title
    const faqDescription = conciseText(shortDescription || longDescription, 280)
    const faqAuthorBio = authorProfile?.bio ? conciseText(authorProfile.bio, 280) : ''
    const categoryLabel = book.category?.trim()
    const faqQuestions = [
        {
            question: locale === 'ar' ? `ما موضوع كتاب ${faqTitle}؟` : locale === 'en' ? `What is ${faqTitle} about?` : `De quoi parle ${faqTitle} ?`,
            answer: faqDescription || (locale === 'ar'
                ? `كتاب ${faqTitle} من تأليف ${book.author}${categoryLabel ? ` وينتمي إلى تصنيف ${categoryLabel}` : ''}.`
                : locale === 'en'
                    ? `${faqTitle} is written by ${book.author}${categoryLabel ? ` and belongs to the ${categoryLabel} category` : ''}.`
                    : `${faqTitle} est un livre de ${book.author}${categoryLabel ? ` classé dans la catégorie ${categoryLabel}` : ''}.`)
        },
        {
            question: locale === 'ar' ? `من هو مؤلف كتاب ${faqTitle}؟` : locale === 'en' ? `Who wrote ${faqTitle}?` : `Qui a écrit ${faqTitle} ?`,
            answer: faqAuthorBio || (locale === 'ar'
                ? `مؤلف كتاب ${faqTitle} هو ${book.author}.`
                : locale === 'en'
                    ? `${faqTitle} was written by ${book.author}.`
                    : `${faqTitle} a été écrit par ${book.author}.`)
        },
        {
            question: locale === 'ar' ? `هل كتاب ${faqTitle} متوفر للبيع في المغرب؟` : locale === 'en' ? `Is ${faqTitle} available in Morocco?` : `Le livre ${faqTitle} est-il disponible au Maroc ?`,
            answer: book.stock > 0
                ? locale === 'ar'
                    ? `نعم، كتاب ${faqTitle} متوفر حالياً لدى مكتبة رواية مع التوصيل إلى مختلف مدن المغرب.`
                    : locale === 'en'
                        ? `Yes, ${faqTitle} is currently in stock at Riwaya, with delivery across Morocco.`
                        : `Oui, ${faqTitle} est actuellement en stock chez Riwaya, avec livraison partout au Maroc.`
                : locale === 'ar'
                    ? `كتاب ${faqTitle} غير متوفر حالياً. يمكن طلب إشعار عند عودته إلى المخزون.`
                    : locale === 'en'
                        ? `${faqTitle} is currently out of stock. You can request a notification when it becomes available again.`
                        : `${faqTitle} est actuellement en rupture de stock. Vous pouvez demander à être averti lors de son retour.`
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

    const audioTestimonials = audioTestimonialsResult?.success ? (audioTestimonialsResult.testimonials || []) : []
    const imageTestimonials = imageTestimonialsResult?.success ? (imageTestimonialsResult.testimonials || []) : []

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
                reviews={reviews}
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
                <ScrollDownIndicator />

                <BookSubNav 
                    bookTitle={book.title}
                    homeLabel={tNav('Home')}
                    booksLabel={tNav('Books')}
                    backLabel={tBook('BackToSelection') || 'Retour à la sélection'}
                />

                <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 md:pt-10 pb-64 md:pb-40">
                    <div className="mb-6 md:mb-10">
                        <PredictiveSearch />
                    </div>

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
                                        priority={true}
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
                                            <div className="absolute top-10 -left-12 w-64 py-3 bg-red-600 text-white text-xs rtl:text-sm rtl:tracking-normal rtl:uppercase-none font-black uppercase tracking-[0.2em] text-center -rotate-45 shadow-2xl border-y-4 border-red-400/30 backdrop-blur-sm">
                                                {tBook('OutOfStock')}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                            {/* Author Profile Card (Desktop Only) */}
                            <div className="mt-8 bg-white rounded-[2rem] border border-gray-100 shadow-sm p-6 hidden lg:flex flex-col sm:flex-row items-center sm:items-start gap-5 group hover:shadow-md transition-shadow">
                                <div className="relative w-20 h-20 sm:w-24 sm:h-24 flex-shrink-0 rounded-full overflow-hidden border-4 border-gray-50 shadow-inner group-hover:border-gray-100 transition-colors mx-auto sm:mx-0">
                                    {authorProfile?.image ? (
                                        <ImageWithFallback
                                            src={authorProfile.image}
                                            alt={book.author}
                                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                        />
                                    ) : (
                                        <div className="w-full h-full bg-gray-100 flex items-center justify-center">
                                            <UserIcon className="w-8 h-8 text-gray-500" />
                                        </div>
                                    )}
                                </div>
                                <div className="flex-1 text-center sm:text-left rtl:sm:text-right">
                                    <h3 className="text-xs font-black text-gray-500 uppercase tracking-widest mb-1">{tBook('AboutAuthor') || 'À propos de l\'auteur'}</h3>
                                    <Link href={`/authors/${encodeURIComponent(book.author)}`} className="text-lg sm:text-xl font-black text-black hover:text-blue-600 transition-colors inline-block mb-2">
                                        {book.author}
                                    </Link>
                                    {authorProfile?.bio && (
                                        <p className="text-xs sm:text-sm font-medium text-gray-500 leading-relaxed mb-3 line-clamp-3">
                                            {authorProfile.bio}
                                        </p>
                                    )}
                                    <Link 
                                        href={`/authors/${encodeURIComponent(book.author)}`}
                                        className="inline-flex items-center gap-1.5 text-[9px] rtl:text-sm rtl:tracking-normal rtl:uppercase-none font-black uppercase tracking-widest text-black bg-gray-50 hover:bg-gray-100 px-4 py-2 rounded-full transition-colors"
                                    >
                                        {tBook('DiscoverMore') || 'Découvrir plus'}
                                        <ArrowUpRight className="w-3 h-3 rtl:scale-x-[-1]" />
                                    </Link>
                                </div>
                            </div>

                            {/* Related Blog Posts - Articles parlant de ce produit (Desktop Only) */}
                            {relatedPosts && relatedPosts.length > 0 && (
                                <div className="mt-8 bg-gray-50 p-4 sm:p-6 rounded-[2rem] border border-gray-100 shadow-sm relative overflow-hidden hidden lg:block">
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
                                                className="group flex gap-5 bg-white p-4 sm:p-5 rounded-[1.5rem] shadow-sm hover:shadow-md transition-shadow items-center"
                                            >
                                                <div className="relative w-28 h-28 sm:w-32 sm:h-32 flex-shrink-0 overflow-hidden rounded-xl bg-gray-100">
                                                    {post.coverImage ? (
                                                        <ImageWithFallback
                                                            src={normalizeImage(post.coverImage)}
                                                            alt={post.title}
                                                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                                        />
                                                    ) : (
                                                        <div className="w-full h-full flex items-center justify-center">
                                                            <span className="text-gray-500 font-black text-xs opacity-50">Blog</span>
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="flex-1 min-w-0 py-1">
                                                    {post.publishedAt && (
                                                        <p className="text-[10px] sm:text-xs font-black text-gray-500 uppercase tracking-widest mb-1.5 flex items-center gap-1">
                                                            <Calendar className="w-3 h-3" />
                                                            {new Date(post.publishedAt).toLocaleDateString(locale === 'ar' ? 'ar-MA' : 'fr-FR')}
                                                        </p>
                                                    )}
                                                    <h4 className="text-sm sm:text-base font-black text-black leading-tight group-hover:text-blue-600 transition-colors line-clamp-3 mb-2">
                                                        {post.title}
                                                    </h4>
                                                    <span className="text-[10px] sm:text-xs font-black uppercase tracking-widest text-blue-500 inline-flex items-center gap-1">
                                                        {tBlog('ReadArticle')}
                                                        <ArrowUpRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                                                    </span>
                                                </div>
                                            </Link>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Info */}
                        <div className="flex flex-col gap-8 md:gap-12">
                            <div className="space-y-4 md:space-y-6">
                                <div className="flex flex-wrap items-center gap-3 md:gap-4 mb-2 md:mb-4">
                                    {/* Badge Vendeur (Livre d'occasion) */}
                                    {(book.customerSeller || book.seller) && (book.condition === 'USED' || book.condition === 'GOOD') && (
                                        <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-amber-50 border border-amber-200 text-amber-800 text-[10px] md:text-xs font-black rounded-full uppercase tracking-widest shadow-sm">
                                            <Shield className="w-3.5 h-3.5 text-amber-600" />
                                            {locale === 'ar' ? 'كتاب مستعمل - بائع:' : locale === 'en' ? 'Used Book - Seller:' : 'Livre d\'occasion - Vendu par'} {book.customerSeller?.fullName || book.seller?.fullName || 'Vendeur'}
                                        </div>
                                    )}

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
                                                <span>{tBook('Views', { count: (book as any).views || 0 })}</span>
                                            </div>
                                        </>
                                    )}
                                </div>

                                <h1 className="text-3xl sm:text-4xl md:text-7xl font-black text-black leading-tight md:leading-none tracking-tight md:tracking-tighter">
                                    {displayTitle}<span className="text-gray-200">.</span>
                                </h1>

                                <p className="text-xl font-black text-gray-500 uppercase tracking-widest">
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
                                <span className="text-[9px] rtl:text-sm rtl:tracking-normal font-black text-gray-500 uppercase tracking-[0.2em]">
                                    {reviews.length > 0 ? tBook('ReaderReviews', { count: reviews.length }) : tBook('BeFirstToReview')}
                                </span>
                            </div>

                            {/* Price Section */}
                            <div className="relative group">
                                <div className="bg-white border border-gray-100 rounded-[2rem] md:rounded-[3rem] p-5 md:p-10 shadow-2xl shadow-black/5">
                                    <div className="flex items-baseline gap-3 mb-3 md:mb-4">
                                        <span className="text-4xl md:text-7xl font-black text-black tracking-tighter leading-none">{book.price}</span>
                                        <span className="text-xl font-black text-gray-500 uppercase tracking-widest">{locale === 'ar' ? 'درهم' : 'درهم'}</span>
                                    </div>
                                    <div className="flex flex-wrap items-center gap-3 sm:gap-4 mt-2">
                                        <div className="flex items-center gap-2">
                                            <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-500" />
                                            <p className="text-xs sm:text-sm rtl:tracking-normal font-black text-gray-500 uppercase tracking-widest">
                                                {tBook('TaxesIncluded')}
                                            </p>
                                        </div>
                                        <span className="hidden sm:inline text-gray-500">•</span>
                                        <div className="flex items-center gap-2">
                                            <Package className="w-4 h-4 sm:w-5 sm:h-5 text-blue-500" />
                                            <p className="text-xs sm:text-sm rtl:tracking-normal font-black text-gray-500 uppercase tracking-widest">
                                                {locale === 'ar' ? 'الدفع عند الاستلام' : locale === 'en' ? 'Cash on Delivery' : 'Paiement à la livraison'}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Trust Badges */}
                            {/* Carte Vendeur — visible uniquement si le livre appartient à un seller tiers */}
                            {book.seller && book.sellerId && (
                                <div className="bg-white border border-gray-100 rounded-[2rem] p-5 shadow-sm flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-2xl bg-blue-50 flex items-center justify-center shrink-0 text-lg font-black text-blue-700 uppercase">
                                        {book.seller.fullName?.substring(0, 2) || 'SE'}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-[9px] font-black uppercase tracking-widest text-gray-500 mb-0.5">
                                            {tBook('SoldBy')}
                                        </p>
                                        <p className="text-sm font-black text-black truncate">
                                            {book.seller.fullName || book.seller.email}
                                        </p>
                                        {book.seller.city && (
                                            <p className="text-[10px] font-medium text-gray-500 flex items-center gap-1 mt-0.5">
                                                <span>📍</span> {book.seller.city}
                                            </p>
                                        )}
                                    </div>
                                    <div className="flex flex-col items-end shrink-0">
                                        <div className="flex items-center gap-1 bg-amber-50 border border-amber-100 px-3 py-1.5 rounded-full" title={tBook('SellerRating')}>
                                            <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                                            <span className="text-[10px] font-black text-amber-700">{book.seller.rating?.toFixed(1) || '5.0'}</span>
                                        </div>
                                    </div>
                                </div>
                            )}

                            <div className="grid grid-cols-3 gap-2 sm:gap-6 py-6 border-y border-gray-50">
                                <div className="text-center group cursor-pointer">
                                    <div className="w-14 h-14 bg-pixio-beige rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                                        <Truck className="w-6 h-6 text-black" />
                                    </div>
                                    <p className="text-[10px] sm:text-xs rtl:text-sm rtl:tracking-normal font-black uppercase tracking-widest text-gray-800">{tBook('FastMove')}</p>
                                </div>
                                <div className="text-center group cursor-pointer">
                                    <div className="w-14 h-14 bg-pixio-pink rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                                        <Shield className="w-6 h-6 text-black" />
                                    </div>
                                    <p className="text-[10px] sm:text-xs rtl:text-sm rtl:tracking-normal font-black uppercase tracking-widest text-gray-800">{tBook('Secured')}</p>
                                </div>
                                <div className="text-center group cursor-pointer">
                                    <div className="w-14 h-14 bg-pixio-yellow rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                                        <Package className="w-6 h-6 text-black" />
                                    </div>
                                    <p className="text-[10px] sm:text-xs rtl:text-sm rtl:tracking-normal font-black uppercase tracking-widest text-gray-800">{tBook('Original')}</p>
                                </div>
                            </div>

                            {/* CTA */}
                            <div className="md:space-y-8">
                                {book.stock > 0 ? (
                                    <div className="flex items-center gap-3">
                                        <div className="w-2 h-2 bg-black rounded-full animate-pulse" />
                                        <p className="text-sm font-black text-black uppercase tracking-widest">{tBook('ReadyForCollection')}</p>
                                    </div>
                                ) : (
                                    <div className="flex items-center gap-3">
                                        <div className="w-2 h-2 bg-gray-200 rounded-full" />
                                        <p className="text-[10px] rtl:text-sm rtl:tracking-normal rtl:uppercase-none font-black text-gray-500 uppercase tracking-widest">{tBook('OutOfStock')}</p>
                                    </div>
                                )}

                                <StickyBottomActions productId={book.id}>
                                    {book.isAffiliate && book.affiliateLink ? (
                                        <a
                                            href={book.affiliateLink}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="w-full flex items-center justify-center gap-3 font-bold rounded-full transition-all duration-300 py-4 md:py-6 px-8 bg-orange-500 text-white hover:bg-orange-600 text-xs md:text-sm uppercase tracking-widest shadow-2xl shadow-orange-500/20"
                                        >
                                            <Image 
                                                src="https://upload.wikimedia.org/wikipedia/commons/a/a9/Amazon_logo.svg" 
                                                alt="Amazon" 
                                                width={75} 
                                                height={22} 
                                                className="brightness-0 invert object-contain" 
                                                unoptimized 
                                            />
                                            {locale === 'ar' ? 'اطلب من أمازون' : 'Commander sur Amazon'}
                                        </a>
                                    ) : (
                                        <>
                                            <WhatsAppOrderButton
                                                    title={displayTitle}
                                                    price={book.price}
                                                    phone={whatsappPhone || undefined}
                                                    type="book"
                                                    disabled={book.stock === 0}
                                                />
                                                <AddToCartButton
                                                product={{
                                                    id: book.id,
                                                    title: displayTitle,
                                                    price: book.price,
                                                    image: book.image,
                                                    type: 'BOOK'
                                                }}
                                                disabled={book.stock <= 0}
                                            />
                                        </>
                                    )}
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

                            {/* Recommandations basées sur les achats réels */}
                            {customersAlsoLiked.length > 0 && (
                                <div className="mt-6 md:mt-12 bg-gray-50 p-4 sm:p-6 rounded-[2rem] border border-gray-100 shadow-sm relative overflow-hidden">
                                    <h2 className="text-sm rtl:text-base rtl:tracking-normal font-black uppercase tracking-widest text-black mb-2">
                                        {locale === 'ar'
                                            ? 'العملاء الذين اشتروا هذا الكتاب أعجبهم أيضاً'
                                            : locale === 'en'
                                                ? 'Customers who bought this book also liked'
                                                : 'Les clients ayant acheté ce livre ont aussi aimé'}
                                    </h2>
                                    <p className="text-xs font-medium text-gray-500 mb-6">
                                        {locale === 'ar'
                                            ? 'اقتراحات مستوحاة من اختيارات قرّائنا.'
                                            : locale === 'en'
                                                ? 'Suggestions inspired by our readers’ choices.'
                                                : 'Des suggestions inspirées des choix de nos lecteurs.'}
                                    </p>
                                    <div className="flex flex-col gap-3 sm:gap-4">
                                        {customersAlsoLiked.map(fbBook => {
                                            const fbDisplayTitle = getLocalizedTitle(fbBook, locale);
                                            const fbBookUrl = generateBookUrl(fbBook, locale);
                                            return (
                                            <div key={fbBook.id} className="flex items-center gap-3 sm:gap-4 bg-white p-2.5 sm:p-3 rounded-[1.5rem] shadow-sm hover:shadow-md transition-shadow">
                                                <Link href={fbBookUrl} target="_blank" rel="noopener noreferrer" className="flex gap-3 sm:gap-4 items-center flex-1 min-w-0 group">
                                                    <div className="relative w-20 h-28 sm:w-24 sm:h-32 flex-shrink-0 overflow-hidden rounded-xl border border-gray-50 shadow-sm">
                                                        <ImageWithFallback
                                                            src={fbBook.image}
                                                            alt={fbDisplayTitle}
                                                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                                        />
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <span className="text-sm sm:text-base font-black text-black group-hover:text-gray-600 line-clamp-2 transition-colors">{fbDisplayTitle}</span>
                                                        <p className="text-xs font-bold text-gray-500 mt-1 truncate">{fbBook.author}</p>
                                                        <p className="text-sm font-black text-black mt-2">{fbBook.price} {locale === 'ar' ? 'درهم' : 'درهم'}</p>
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
                            <div className="flex flex-col gap-6 md:gap-12 pt-4 md:pt-12 mt-4 md:mt-0 border-t border-gray-100">
                                <div className="space-y-6">
                                    <div className="flex items-center gap-4">
                                        <Package className="w-4 h-4 text-black" />
                                        <h2 className="text-[10px] rtl:text-sm rtl:tracking-normal font-black uppercase tracking-[0.3em] text-black">{tBook('Abstract')}</h2>
                                    </div>
                                    <div className="text-sm font-bold text-gray-500 uppercase tracking-widest leading-loose bg-white p-6 md:p-10 rounded-[2rem] md:rounded-[2.5rem] border border-gray-50 italic space-y-4">
                                        {summaryParagraphs.map((paragraph, index) => (
                                            <p key={`${book.id}-summary-${index}`} className={index > 0 ? 'text-gray-600 font-medium normal-case tracking-normal mt-4' : undefined}>
                                                {paragraph}
                                            </p>
                                        ))}
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                                    <div className="bg-white p-6 md:p-10 rounded-[2rem] md:rounded-[2.5rem] border border-gray-100 shadow-sm space-y-8">
                                        <h2 className="text-sm font-black text-black uppercase tracking-[0.3em]">{tBook('Technical')}</h2>
                                        <dl className="space-y-5">
                                            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center py-2 border-b border-gray-50 gap-2">
                                                <dt className="text-xs font-black uppercase tracking-widest text-gray-500">{tBook('Reference')}</dt>
                                                <dd className="text-sm font-black text-black tracking-widest break-all sm:text-right">{book.isbn || 'RIWAYA-GEN'}</dd>
                                            </div>
                                            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center py-2 border-b border-gray-50 gap-2">
                                                <dt className="text-xs font-black uppercase tracking-widest text-gray-500">{tBook('Volume')}</dt>
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
                                        <p className="text-[10px] font-black uppercase tracking-[0.4em] text-gray-500">
                                            — {categoryConfig.quoteSource}
                                        </p>
                                    </div>
                                </div>
                            )}

                            {/* Author Profile Card (Mobile Only) */}
                            <div className="mt-8 bg-white rounded-[2rem] border border-gray-100 shadow-sm p-4 sm:p-6 flex lg:hidden flex-row items-start gap-4 sm:gap-5 group hover:shadow-md transition-shadow">
                                <div className="relative w-16 h-16 sm:w-24 sm:h-24 flex-shrink-0 rounded-full overflow-hidden border-4 border-gray-50 shadow-inner group-hover:border-gray-100 transition-colors">
                                    {authorProfile?.image ? (
                                        <ImageWithFallback
                                            src={authorProfile.image}
                                            alt={book.author}
                                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                        />
                                    ) : (
                                        <div className="w-full h-full bg-gray-100 flex items-center justify-center">
                                            <UserIcon className="w-6 h-6 sm:w-8 sm:h-8 text-gray-500" />
                                        </div>
                                    )}
                                </div>
                                <div className="flex-1 text-left rtl:text-right">
                                    <h3 className="text-[10px] sm:text-xs font-black text-gray-500 uppercase tracking-widest mb-1">{tBook('AboutAuthor') || 'À propos de l\'auteur'}</h3>
                                    <Link href={`/authors/${encodeURIComponent(book.author)}`} className="text-base sm:text-xl font-black text-black hover:text-blue-600 transition-colors inline-block mb-1 sm:mb-2">
                                        {book.author}
                                    </Link>
                                    {authorProfile?.bio && (
                                        <p className="text-xs sm:text-sm font-medium text-gray-500 leading-relaxed mb-3 line-clamp-3">
                                            {authorProfile.bio}
                                        </p>
                                    )}
                                    <Link 
                                        href={`/authors/${encodeURIComponent(book.author)}`}
                                        className="inline-flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest text-black bg-gray-50 hover:bg-gray-100 px-4 py-2 rounded-full transition-colors"
                                    >
                                        {tBook('DiscoverMore') || 'Découvrir plus'}
                                        <ArrowUpRight className="w-3 h-3" />
                                    </Link>
                                </div>
                            </div>

                            {/* Related Blog Posts - Articles parlant de ce produit (Mobile Only) */}
                            {relatedPosts && relatedPosts.length > 0 && (
                                <div className="mt-8 bg-gray-50 p-4 sm:p-6 rounded-[2rem] border border-gray-100 shadow-sm relative overflow-hidden block lg:hidden">
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
                                                className="group flex gap-5 bg-white p-4 sm:p-5 rounded-[1.5rem] shadow-sm hover:shadow-md transition-shadow items-center"
                                            >
                                                <div className="relative w-28 h-28 sm:w-32 sm:h-32 flex-shrink-0 overflow-hidden rounded-xl bg-gray-100">
                                                    {post.coverImage ? (
                                                        <ImageWithFallback
                                                            src={post.coverImage}
                                                            alt={post.title}
                                                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                                        />
                                                    ) : (
                                                        <div className="w-full h-full flex items-center justify-center">
                                                            <span className="text-gray-500 font-black text-xs opacity-50">Blog</span>
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="flex-1 min-w-0 py-1">
                                                    {post.publishedAt && (
                                                        <p className="text-[10px] sm:text-xs font-black text-gray-500 uppercase tracking-widest mb-1.5 flex items-center gap-1">
                                                            <Calendar className="w-3 h-3" />
                                                            {new Date(post.publishedAt).toLocaleDateString(locale === 'ar' ? 'ar-MA' : 'fr-FR')}
                                                        </p>
                                                    )}
                                                    <h4 className="text-sm sm:text-base font-black text-black leading-tight group-hover:text-blue-600 transition-colors line-clamp-3 mb-2">
                                                        {post.title}
                                                    </h4>
                                                    <span className="text-[10px] sm:text-xs font-black uppercase tracking-widest text-blue-500 inline-flex items-center gap-1">
                                                        {tBlog('ReadArticle')}
                                                        <ArrowUpRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                                                    </span>
                                                </div>
                                            </Link>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>


                    {/* Reviews Section */}
                    <section className="py-10 md:py-16 border-t border-gray-100">
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12 lg:gap-24">
                            <div className="lg:col-span-1 space-y-10">
                                <div className="space-y-4">
                                    <div className="w-16 h-16 bg-black text-white rounded-[1.5rem] flex items-center justify-center mb-8">
                                        <MessageSquare className="w-7 h-7" />
                                    </div>
                                    <h2 className="text-4xl font-black text-black tracking-tighter">{tBook('Voices')}<span className="text-gray-200">.</span></h2>
                                    <p className="text-sm font-black text-gray-500 uppercase tracking-widest leading-loose">
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
                        <section className="py-8 md:py-16 border-t border-gray-100">
                            <div className="flex items-center justify-between mb-8 md:mb-20 px-2">
                                <h2 className="text-4xl font-black text-black tracking-tighter">{tBook('RecommendedReads')}<span className="text-gray-200">.</span></h2>
                                <Link href="/books" className="text-[10px] rtl:text-xs rtl:tracking-normal font-black text-black uppercase tracking-widest bg-white px-8 py-4 rounded-full border border-gray-100 shadow-sm hover:shadow-xl transition-all">
                                    {tBook('ExploreAll')}
                                </Link>
                            </div>
                            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-8 lg:gap-12">
                                {filteredSimilarBooks.map((similarBook) => (
                                    <BookCard key={similarBook.id} {...similarBook} />
                                ))}
                            </div>
                        </section>
                    )}

                    {/* Related Articles */}
                    {relatedPosts && relatedPosts.length > 0 && (
                        <section className="py-8 md:py-16 border-t border-gray-100">
                            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8 md:mb-16 px-2">
                                <div>
                                    <h2 className="text-4xl font-black text-black tracking-tighter">
                                        {locale === 'ar' ? 'مقالات ذات صلة' : locale === 'en' ? 'Related Articles' : 'Articles Liés'}
                                        <span className="text-gray-200">.</span>
                                    </h2>
                                </div>
                                <Link href="/blog" className="text-[10px] rtl:text-xs rtl:tracking-normal font-black text-black uppercase tracking-widest bg-white px-8 py-4 rounded-full border border-gray-100 shadow-sm hover:shadow-xl transition-all whitespace-nowrap">
                                    {locale === 'ar' ? 'عرض المدونة' : locale === 'en' ? 'Read the blog' : 'Lire le blog'}
                                </Link>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                                {relatedPosts.map((post: any) => (
                                    <Link key={post.id} href={`/blog/${post.slug}`} className="group flex flex-col bg-white border border-gray-100 rounded-3xl overflow-hidden hover:shadow-2xl transition-all duration-300">
                                        <div className="relative aspect-[4/3] w-full overflow-hidden">
                                            {post.coverImage ? (
                                                <ImageWithFallback 
                                                    src={normalizeImage(post.coverImage)} 
                                                    alt={post.title} 
                                                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" 
                                                />
                                            ) : (
                                                <div className="w-full h-full bg-gray-50 flex items-center justify-center">
                                                    <span className="text-gray-200 font-black text-xl">Riwaya</span>
                                                </div>
                                            )}
                                        </div>
                                        <div className="p-6 flex flex-col flex-1">
                                            {post.category && (
                                                <div className="mb-3">
                                                    <span className="text-[10px] font-black uppercase tracking-widest px-3 py-1 bg-gray-50 rounded-full text-gray-500">{post.category}</span>
                                                </div>
                                            )}
                                            <h3 className="text-xl font-black text-black leading-tight mb-3 group-hover:text-orange-500 transition-colors line-clamp-2">
                                                {post.title}
                                            </h3>
                                            <div className="mt-auto pt-4 flex items-center justify-between border-t border-gray-50">
                                                <span className="text-[10px] font-black uppercase tracking-widest text-gray-500">
                                                    {post.publishedAt ? new Date(post.publishedAt).toLocaleDateString(locale === 'ar' ? 'ar-MA' : 'fr-FR') : ''}
                                                </span>
                                                <ArrowUpRight className="w-4 h-4 text-black group-hover:text-orange-500 transition-colors rtl:-scale-x-100" />
                                            </div>
                                        </div>
                                    </Link>
                                ))}
                            </div>
                        </section>
                    )}

                    {/* Testimonials Section (Audio & Images) */}
                    {(audioTestimonials.length > 0 || imageTestimonials.length > 0) && (
                        <section className="py-8 md:py-16 border-t border-gray-100">
                            <div className="flex flex-col items-center text-center mb-12 space-y-4">
                                <h2 className="text-4xl md:text-5xl font-black text-black tracking-tight">
                                    {locale === 'ar' ? 'تجارب عملائنا' : locale === 'en' ? 'Testimonials' : 'Témoignages'}<span className="text-emerald-500">.</span>
                                </h2>
                            </div>
                            <TestimonialsTabs audioTestimonials={audioTestimonials} imageTestimonials={imageTestimonials} locale={locale} />
                        </section>
                    )}

                    {/* FAQ Section */}
                    {faqQuestions.length > 0 && (
                        <section className="py-8 md:py-16 border-t border-gray-100">
                            <div className="flex flex-col md:flex-row gap-16">
                                <div className="md:w-1/3">
                                    <h2 className="text-4xl font-black text-black tracking-tighter mb-4">
                                        {locale === 'ar' ? 'الأسئلة الشائعة' : locale === 'en' ? 'Frequently Asked Questions' : 'Questions Fréquentes'}<span className="text-blue-500">.</span>
                                    </h2>
                                    <p className="text-sm font-bold text-gray-500">
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

