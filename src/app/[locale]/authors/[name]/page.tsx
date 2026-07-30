import { getBooks } from '@/lib/db/books'
import { getAuthorProfile } from '@/lib/db/authors'
import Header from '@/components/HeaderWithUser'
import Footer from '@/components/FooterWithFeatures'
import BookCard from '@/components/BookCard'
import { getTranslations } from 'next-intl/server'
import { Link } from '@/i18n/routing'
import { ArrowLeft, User, Edit } from 'lucide-react'
import { notFound } from 'next/navigation'
import { Metadata } from 'next'
import { normalizeImage, getOgImageUrl, getBaseUrl } from '@/lib/utils'
import ImageWithFallback from '@/components/ImageWithFallback'
import ShareArticle from '@/components/blog/ShareArticle'
import { getSimilarAuthors } from '@/lib/db/authors'
import { Quote } from 'lucide-react'
import { isAuthenticated } from '@/lib/actions/auth'

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
    const isAuth = await isAuthenticated()

    const [books, authorProfile, similarAuthors] = await Promise.all([
        getBooks({ author: authorName, active: true, limit: 100 }),
        getAuthorProfile(authorName),
        getSimilarAuthors(authorName)
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
    const shareTitle = `${authorName} - ${locale === 'ar' ? 'كتب ومؤلفات | مكتبة رواية' : locale === 'en' ? 'Books and Biography | Riwaya' : 'Livres et Biographie | Riwaya'}`
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
                        className="inline-flex items-center gap-4 text-sm md:text-base font-black uppercase tracking-widest text-gray-400 hover:text-black mb-12 group transition-colors rtl:flex-row-reverse"
                    >
                        <ArrowLeft className="w-4 h-4 md:w-5 md:h-5 group-hover:-translate-x-1 transition-transform rtl:rotate-180 rtl:group-hover:translate-x-1" />
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
                                <div className="flex items-center gap-4 mb-8">
                                    <div className="inline-flex items-center gap-3 px-5 py-2 bg-black text-white rounded-full text-[9px] font-black uppercase tracking-[0.3em]">
                                        <User className="w-3 h-3" />
                                        <span>{tAuthor('AuthorLabel')}</span>
                                    </div>
                                    
                                    {isAuth && (
                                        <Link 
                                            href={`/admin/authors?search=${encodeURIComponent(authorName)}`} 
                                            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-100 text-blue-700 rounded-full text-[10px] font-black uppercase tracking-widest hover:bg-blue-200 transition-colors"
                                        >
                                            <Edit className="w-3 h-3" />
                                            Modifier
                                        </Link>
                                    )}
                                </div>

                                <h1 className="text-5xl md:text-8xl font-black text-black leading-none tracking-tighter mb-8">
                                    {authorName}<span className="text-gray-200">.</span>
                                </h1>

                                {/* Genres Badges */}
                                {profile?.genres && (
                                    <div className="flex flex-wrap gap-2 mb-8">
                                        {profile.genres.split(',').map((genre, idx) => (
                                            <span key={idx} className="px-4 py-1.5 bg-indigo-50 text-indigo-600 rounded-full text-[10px] font-black uppercase tracking-widest border border-indigo-100">
                                                {genre.trim()}
                                            </span>
                                        ))}
                                    </div>
                                )}

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

                                {/* Quote */}
                                {profile?.quote && (
                                    <div className="mb-10 relative">
                                        <Quote className="absolute -top-4 -left-4 w-12 h-12 text-gray-100 -z-10 rtl:-right-4 rtl:left-auto" />
                                        <blockquote className="text-2xl md:text-3xl font-serif italic text-gray-800 leading-snug pl-6 border-l-4 border-black rtl:pr-6 rtl:pl-0 rtl:border-r-4 rtl:border-l-0">
                                            "{profile.quote}"
                                        </blockquote>
                                    </div>
                                )}

                                <div className="flex flex-col sm:flex-row sm:items-center justify-between border-t border-gray-100 pt-8 mt-10 gap-6">
                                    <div className="flex items-center gap-4">
                                        <div className="h-px bg-gray-100 w-20 hidden md:block"></div>
                                        <p className="text-lg font-black text-gray-400 uppercase tracking-widest">
                                            {tAuthor('BooksCount', { count: books.length })}
                                        </p>
                                    </div>

                                    <div className="flex items-center gap-3">
                                        <ShareArticle title={shareTitle} />
                                    </div>
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

                    {/* Similar Authors */}
                    {similarAuthors.length > 0 && (
                        <section className="mb-20">
                            <div className="flex items-center justify-between mb-10">
                                <h2 className="text-3xl font-black text-slate-900 tracking-tight">
                                    {locale === 'ar' ? 'القراء يحبون أيضا' : locale === 'en' ? 'Readers also like' : 'Les lecteurs aiment aussi'}
                                </h2>
                            </div>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                                {similarAuthors.map((simAuthor) => (
                                    <Link
                                        key={simAuthor.id}
                                        href={`/authors/${encodeURIComponent(simAuthor.name)}`}
                                        className="group bg-white p-6 rounded-3xl border border-gray-100 shadow-sm hover:shadow-xl hover:border-black transition-all flex flex-col items-center text-center"
                                    >
                                        <div className="w-24 h-24 rounded-full overflow-hidden mb-4 bg-gray-50 border-2 border-gray-100 group-hover:border-black transition-colors">
                                            {simAuthor.image ? (
                                                <ImageWithFallback src={simAuthor.image} alt={simAuthor.name} className="w-full h-full object-cover" />
                                            ) : (
                                                <User className="w-12 h-12 text-gray-300 mx-auto mt-6" />
                                            )}
                                        </div>
                                        <h3 className="text-sm font-black text-gray-900 group-hover:text-indigo-600 transition-colors">
                                            {simAuthor.name}
                                        </h3>
                                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-2">
                                            {tAuthor('AuthorLabel')}
                                        </p>
                                    </Link>
                                ))}
                            </div>
                        </section>
                    )}

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
                    
                    {/* The Similar Authors section was moved from here */}
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
