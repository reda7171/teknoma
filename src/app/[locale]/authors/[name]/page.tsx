
import { getBooks } from '@/lib/db/books'
import { getAuthorProfile } from '@/lib/db/authors'
import Header from '@/components/HeaderWithUser'
import Footer from '@/components/FooterWithFeatures'
import BookCard from '@/components/BookCard'
import { getTranslations } from 'next-intl/server'
import { Link } from '@/i18n/routing'
import { ArrowLeft, User } from 'lucide-react'
import { notFound } from 'next/navigation'
import { Metadata } from 'next'
import { normalizeImage, getOgImageUrl, getBaseUrl } from '@/lib/utils'
import ImageWithFallback from '@/components/ImageWithFallback'

// Generate metadata for the author page
export async function generateMetadata({
    params,
}: {
    params: Promise<{ name: string; locale: string }>
}): Promise<Metadata> {
    const { name, locale } = await params
    const authorName = decodeURIComponent(name)
    const authorProfile = await getAuthorProfile(authorName)

    const baseUrl = getBaseUrl()

    let keywords: string[] = []
    let description = ''
    let siteTitle = ''

    const baseKeywords = ["رواية", "riwaya", "book", "الكاتب", "authors", "كتب"]

    if (locale === 'ar') {
        siteTitle = `${authorName} - كتب ومؤلفات | مكتبة رواية`
        description = `اكتشف جميع كتب ومؤلفات ${authorName} المتوفرة في مكتبة رواية. توصيل سريع لجميع مدن المغرب.`
        keywords = [
            authorName,
            `كتب ${authorName}`,
            `روايات ${authorName}`,
            'مكتبة في الرباط',
            'مكتبة f rabat',
            'مكتبة في الدار البيضاء',
            'مكتبة رواية',
            'كتب للبيع بالمغرب',
            ...baseKeywords
        ]
    } else if (locale === 'en') {
        siteTitle = `${authorName} - Books and Biography | Riwaya`
        description = `Discover all books by ${authorName} available on Riwaya. Fast delivery in Morocco.`
        keywords = [
            authorName,
            `books by ${authorName}`,
            `author ${authorName}`,
            'bookstore in rabat',
            'bookstore in casablanca',
            ...baseKeywords
        ]
    } else {
        siteTitle = `${authorName} - Livres et Biographie | Riwaya`
        description = `Découvrez tous les livres de ${authorName} disponibles sur Riwaya. Achetez en ligne au Maroc avec livraison rapide.`
        keywords = [
            authorName,
            `livres de ${authorName}`,
            `auteur ${authorName}`,
            'librairie à rabat',
            'librairie casablanca',
            'livres maroc',
            ...baseKeywords
        ]
    }

    const fallbackApiUrl = `${baseUrl}/api/authors/${encodeURIComponent(name)}/image`
    const imageUrl = authorProfile?.image ? getOgImageUrl(authorProfile.image, baseUrl, fallbackApiUrl) : fallbackApiUrl

    return {
        title: siteTitle,
        description: description,
        keywords: keywords,
        openGraph: {
            title: siteTitle,
            description: description,
            type: 'profile',
            locale: locale === 'ar' ? 'ar_MA' : locale === 'en' ? 'en_MA' : 'fr_MA',
            url: `${baseUrl}/${locale}/authors/${encodeURIComponent(name)}`,
            images: [
                {
                    url: imageUrl,
                    width: 1200,
                    height: 630,
                    alt: authorName
                }
            ]
        },
        twitter: {
            card: 'summary_large_image',
            title: siteTitle,
            description: description,
            images: [imageUrl]
        },
        alternates: {
            canonical: `${baseUrl}/${locale}/authors/${encodeURIComponent(name)}`,
            languages: {
                'fr': `${baseUrl}/fr/authors/${encodeURIComponent(name)}`,
                'ar': `${baseUrl}/ar/authors/${encodeURIComponent(name)}`,
                'en': `${baseUrl}/en/authors/${encodeURIComponent(name)}`,
            },
        },
    }
}

export default async function AuthorPage({
    params,
}: {
    params: Promise<{ name: string; locale: string }>
}) {
    const { name, locale } = await params
    const authorName = decodeURIComponent(name)
    const tAuthor = await getTranslations('AuthorsPage')
    const tBook = await getTranslations('BookDetail')
    const tCommon = await getTranslations('Common')

    const [books, authorProfile] = await Promise.all([
        getBooks({ author: authorName, active: true, limit: 100 }),
        getAuthorProfile(authorName)
    ])

    // Mock data for Eckhart Tolle if no profile found (temporary for demo)
    const profile = authorProfile || (authorName === 'Eckhart Tolle' ? {
        bio: "Eckhart Tolle is a spiritual teacher and best-selling author. He is a German-born resident of Canada best known as the author of The Power of Now and A New Earth. In 2008, The New York Times called Tolle 'the most popular spiritual author in the United States'.",
        image: "https://images.gr-assets.com/authors/1698205260p8/4298.jpg",
        nationality: "German / Canadian",
        birthYear: 1948
    } : null)

    if (!books || books.length === 0) {
        // Optionnel : rediriger ou afficher 404 si on veut être strict
        // notFound()
    }

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://riwaya.store'

    const jsonLd = [
        {
            "@context": "https://schema.org",
            "@type": "ProfilePage",
            "dateCreated": new Date().toISOString(),
            "dateModified": new Date().toISOString(),
            "mainEntity": {
                "@type": "Person",
                "name": authorName,
                "description": profile?.bio || `Author ${authorName}`,
                "image": profile?.image || `${baseUrl}/logo.png`,
                "sameAs": [
                    `https://ar.wikipedia.org/wiki/${encodeURIComponent(authorName)}`,
                    `https://fr.wikipedia.org/wiki/${encodeURIComponent(authorName)}`,
                    `https://en.wikipedia.org/wiki/${encodeURIComponent(authorName)}`
                ]
            }
        },
        {
            "@context": "https://schema.org",
            "@type": "ItemList",
            "name": locale === 'ar' ? `كتب ${authorName}` : locale === 'en' ? `Books by ${authorName}` : `Livres de ${authorName}`,
            "itemListElement": books.map((book, index) => ({
                "@type": "ListItem",
                "position": index + 1,
                "item": {
                    "@type": "Book",
                    "name": book.title,
                    "author": {
                        "@type": "Person",
                        "name": authorName
                    },
                    "url": `${baseUrl}/${locale}/books/${book.id}`
                }
            }))
        },
        {
            "@context": "https://schema.org",
            "@type": "FAQPage",
            "mainEntity": [
                {
                    "@type": "Question",
                    "name": locale === 'ar' ? `من هو ${authorName}؟` : locale === 'en' ? `Who is ${authorName}?` : `Qui est ${authorName} ?`,
                    "acceptedAnswer": {
                        "@type": "Answer",
                        "text": profile?.bio || (locale === 'ar' ? `مؤلف مشهور.` : locale === 'en' ? `A renowned author.` : `Un auteur renommé.`)
                    }
                },
                {
                    "@type": "Question",
                    "name": locale === 'ar' ? `ما هي أفضل كتب ${authorName}؟` : locale === 'en' ? `What are the best books by ${authorName}?` : `Quels sont les meilleurs livres de ${authorName} ?`,
                    "acceptedAnswer": {
                        "@type": "Answer",
                        "text": locale === 'ar' ? `يمكنك العثور على أفضل كتب ${authorName} في مكتبة رواية.` : locale === 'en' ? `You can find the best books by ${authorName} at Riwaya Library.` : `Vous pouvez trouver les meilleurs livres de ${authorName} sur la Librairie Riwaya.`
                    }
                }
            ]
        }
    ]

    return (
        <div className="min-h-screen bg-pixio-cream flex flex-col">
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c') }}
            />
            <Header />

            <main className="flex-grow">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 pb-32">
                    {/* Back Button */}
                    <Link
                        href="/books"
                        className="inline-flex items-center gap-4 text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-black mb-12 group transition-colors rtl:flex-row-reverse"
                    >
                        <ArrowLeft className="w-3 h-3 group-hover:-translate-x-1 transition-transform rtl:rotate-180 rtl:group-hover:translate-x-1" />
                        <span>{tBook('BackToSelection')}</span>
                    </Link>

                    {/* Author Header */}
                    <div className="bg-white rounded-[3rem] p-10 md:p-16 mb-20 shadow-xl shadow-black/5 border border-gray-100 relative overflow-hidden group">
                        {/* Background Effect */}
                        <div className="absolute top-0 right-0 p-12 opacity-5 pointer-events-none group-hover:scale-110 transition-transform duration-700">
                            {!profile?.image && <User className="w-64 h-64 rtl:rotate-180" />}
                        </div>

                        <div className="relative z-10 grid grid-cols-1 lg:grid-cols-3 gap-12 items-start">
                            {/* Author Info */}
                            <div className="lg:col-span-2">
                                <div className="inline-flex items-center gap-3 px-5 py-2 bg-black text-white rounded-full text-[9px] font-black uppercase tracking-[0.3em] mb-8">
                                    <User className="w-3 h-3" />
                                    <span>{tAuthor('AuthorLabel')}</span>
                                </div>

                                <h1 className="text-5xl md:text-8xl font-black text-black leading-none tracking-tighter mb-8">
                                    {authorName}<span className="text-gray-200">.</span>
                                </h1>

                                {profile?.nationality && (
                                    <p className="text-sm font-black text-gray-400 uppercase tracking-widest mb-6">
                                        {profile.nationality} {profile.birthYear ? `• ${profile.birthYear}` : ''}
                                    </p>
                                )}

                                {profile?.bio && (
                                    <div className="prose prose-lg prose-headings:font-black prose-p:font-bold prose-p:text-gray-500 max-w-none mb-10">
                                        <p className="leading-relaxed">
                                            {profile.bio}
                                        </p>
                                    </div>
                                )}

                                <div className="flex items-center gap-4">
                                    <div className="h-px bg-gray-100 w-20"></div>
                                    <p className="text-lg font-black text-gray-400 uppercase tracking-widest">
                                        {tAuthor('BooksCount', { count: books.length })}
                                    </p>
                                </div>
                            </div>

                            {/* Author Image if available */}
                            {profile?.image && (
                                <div className="lg:col-span-1 flex justify-center lg:justify-end">
                                    <div className="relative w-64 h-64 md:w-80 md:h-80 rounded-full overflow-hidden border-4 border-gray-100 shadow-2xl">
                                        <ImageWithFallback
                                            src={profile.image}
                                            alt={authorName}
                                            className="w-full h-full object-cover"
                                        />
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Books Grid */}
                    {books.length > 0 ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-x-8 gap-y-12">
                            {books.map((book) => (
                                <BookCard key={book.id} {...book} />
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-20">
                            <p className="text-xl font-bold text-gray-300 uppercase tracking-widest">
                                {tCommon('NoResultsDesc')}
                            </p>
                        </div>
                    )}
                </div>

                {/* FAQ Section */}
                <section className="bg-white py-20 border-t border-gray-100 mt-20">
                    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
                        <h2 className="text-3xl font-black text-slate-900 tracking-tight mb-10 text-center">
                            {locale === 'ar' ? 'الأسئلة الشائعة حول الكاتب' : locale === 'en' ? 'Frequently Asked Questions' : 'Questions Fréquentes'}
                        </h2>
                        <div className="space-y-6">
                            <div className="bg-slate-50 p-6 md:p-8 rounded-3xl border border-slate-100">
                                <h3 className="text-lg font-black text-slate-900 mb-3">
                                    {locale === 'ar' ? `من هو ${authorName}؟` : locale === 'en' ? `Who is ${authorName}?` : `Qui est ${authorName} ?`}
                                </h3>
                                <p className="text-slate-600 leading-relaxed font-medium">
                                    {profile?.bio || (locale === 'ar' ? `${authorName} هو كاتب ومؤلف تتوفر أعماله في مكتبة رواية.` : locale === 'en' ? `${authorName} is an author whose works are available at Riwaya.` : `${authorName} est un auteur dont les œuvres sont disponibles sur Riwaya.`)}
                                </p>
                            </div>
                            <div className="bg-slate-50 p-6 md:p-8 rounded-3xl border border-slate-100">
                                <h3 className="text-lg font-black text-slate-900 mb-3">
                                    {locale === 'ar' ? `أين يمكنني شراء كتب ${authorName} في المغرب؟` : locale === 'en' ? `Where can I buy books by ${authorName} in Morocco?` : `Où puis-je acheter les livres de ${authorName} au Maroc ?`}
                                </h3>
                                <p className="text-slate-600 leading-relaxed font-medium">
                                    {locale === 'ar' ? `يمكنك شراء جميع كتب ${authorName} من مكتبة رواية مع خدمة التوصيل السريع إلى جميع مدن المغرب بما في ذلك الرباط والدار البيضاء.` : locale === 'en' ? `You can buy all books by ${authorName} from Riwaya Library with fast delivery to all Moroccan cities including Rabat and Casablanca.` : `Vous pouvez acheter tous les livres de ${authorName} sur la Librairie Riwaya avec une livraison rapide vers toutes les villes marocaines, y compris Rabat et Casablanca.`}
                                </p>
                            </div>
                        </div>
                    </div>
                </section>
            </main>

            <Footer />
        </div>
    )
}
