import { getBooks } from '@/lib/db/books'
import { getAuthorProfile } from '@/lib/db/authors'
import Header from '@/components/HeaderWithUser'
import Footer from '@/components/FooterWithFeatures'
import BookCard from '@/components/BookCard'
import { getTranslations } from 'next-intl/server'
import { Link } from '@/i18n/routing'
import { ArrowLeft, User, Edit, Quote, BookOpen, Globe2, Calendar } from 'lucide-react'
import { notFound } from 'next/navigation'
import { Metadata } from 'next'
import { getBaseUrl } from '@/lib/utils'
import ImageWithFallback from '@/components/ImageWithFallback'
import ShareArticle from '@/components/blog/ShareArticle'
import { getSimilarAuthors } from '@/lib/db/authors'
import { isAuthenticated } from '@/lib/actions/auth'

// Generate metadata for the author page
export async function generateMetadata({
    params,
}: {
    params: Promise<{ name: string; locale: string }>
}): Promise<Metadata> {
    const { name, locale } = await params
    const authorName = decodeURIComponent(name)

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
        },
        twitter: {
            card: 'summary_large_image',
            title: siteTitle,
            description: description,
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

    const profile = authorProfile
    const displayImage = profile?.image || (books.length > 0 ? books[0].image : null);

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
                "image": displayImage || `${baseUrl}/logo.png`,
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
        }
    ]

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col selection:bg-black selection:text-white">
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c') }}
            />
            <Header />

            <main className="flex-grow">
                {/* Hero Section */}
                <section className="relative pt-12 pb-20 overflow-hidden">
                    {/* Decorative Background */}
                    <div className="absolute top-0 inset-x-0 h-[500px] bg-gradient-to-b from-slate-200/50 to-transparent -z-10" />
                    <div className="absolute -top-40 -right-40 w-96 h-96 bg-indigo-100 rounded-full mix-blend-multiply filter blur-3xl opacity-50 -z-10" />
                    <div className="absolute top-40 -left-40 w-96 h-96 bg-amber-100 rounded-full mix-blend-multiply filter blur-3xl opacity-50 -z-10" />

                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                        <Link
                            href="/books"
                            className="inline-flex items-center gap-3 text-xs md:text-sm font-bold uppercase tracking-widest text-slate-500 hover:text-black mb-10 group transition-colors rtl:flex-row-reverse"
                        >
                            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform rtl:rotate-180 rtl:group-hover:translate-x-1" />
                            <span>{tBook('BackToSelection')}</span>
                        </Link>

                        <div className="flex flex-col lg:flex-row gap-12 lg:gap-20 items-start">

                            {/* Left: Author Image (Magazine Style) */}
                            <div className="w-full lg:w-[400px] flex-shrink-0 group">
                                <div className="relative aspect-[3/4] rounded-2xl overflow-hidden shadow-2xl bg-white border border-white/40">
                                    {displayImage ? (
                                        <ImageWithFallback
                                            src={displayImage}
                                            alt={authorName}
                                            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                                        />
                                    ) : (
                                        <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-slate-100 to-slate-200">
                                            <User className="w-32 h-32 text-slate-300 mb-4" />
                                            <span className="text-slate-400 font-bold uppercase tracking-widest text-sm">{authorName}</span>
                                        </div>
                                    )}
                                    {/* Overlay Gradient */}
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                                </div>
                            </div>

                            {/* Right: Author Details */}
                            <div className="flex-1 w-full pt-4">
                                <div className="flex flex-wrap items-center gap-4 mb-6">
                                    <span className="inline-flex items-center gap-2 px-4 py-1.5 bg-black text-white rounded-full text-[10px] font-black uppercase tracking-[0.2em] shadow-md">
                                        <User className="w-3 h-3" />
                                        {tAuthor('AuthorLabel')}
                                    </span>

                                    {isAuth && (
                                        <Link
                                            href={`/admin/authors?search=${encodeURIComponent(authorName)}`}
                                            className="inline-flex items-center gap-2 px-4 py-1.5 bg-indigo-50 text-indigo-700 rounded-full text-[10px] font-black uppercase tracking-widest hover:bg-indigo-100 transition-colors border border-indigo-100"
                                        >
                                            <Edit className="w-3 h-3" />
                                            Modifier
                                        </Link>
                                    )}
                                </div>

                                <h1 className="text-5xl md:text-7xl lg:text-8xl font-black text-slate-900 leading-[0.9] tracking-tighter mb-8">
                                    {authorName}<span className="text-amber-500">.</span>
                                </h1>

                                {/* Quick Stats Bar */}
                                <div className="flex flex-wrap items-center gap-x-8 gap-y-4 mb-10 pb-10 border-b border-slate-200">
                                    <div className="flex items-center gap-3 text-slate-600">
                                        <BookOpen className="w-5 h-5 text-slate-400" />
                                        <span className="font-bold">{tAuthor('BooksCount', { count: books.length })}</span>
                                    </div>
                                    {profile?.nationality && (
                                        <div className="flex items-center gap-3 text-slate-600">
                                            <Globe2 className="w-5 h-5 text-slate-400" />
                                            <span className="font-bold">{profile.nationality}</span>
                                        </div>
                                    )}
                                    {profile?.birthYear && (
                                        <div className="flex items-center gap-3 text-slate-600">
                                            <Calendar className="w-5 h-5 text-slate-400" />
                                            <span className="font-bold">{profile.birthYear}</span>
                                        </div>
                                    )}
                                </div>

                                {/* Genres / Tags */}
                                {profile?.genres && (
                                    <div className="flex flex-wrap gap-2 mb-10">
                                        {profile.genres.split(',').map((genre, idx) => (
                                            <span key={idx} className="px-4 py-2 bg-white text-slate-700 rounded-lg text-xs font-bold uppercase tracking-wider border border-slate-200 shadow-sm hover:border-slate-400 hover:shadow-md transition-all cursor-default">
                                                {genre.trim()}
                                            </span>
                                        ))}
                                    </div>
                                )}

                                {/* Biography */}
                                {profile?.bio && (
                                    <div className="prose prose-lg md:prose-xl prose-slate max-w-3xl mb-12">
                                        <p 
                                            className="leading-relaxed text-slate-600 font-medium text-justify"
                                            dir="auto"
                                        >
                                            {profile.bio}
                                        </p>
                                    </div>
                                )}

                                {/* Highlight Quote */}
                                {profile?.quote && (
                                    <div className="relative bg-white p-8 md:p-12 rounded-3xl shadow-lg border border-slate-100 max-w-4xl mt-8">
                                        <Quote className="absolute top-6 left-6 md:top-8 md:left-8 w-12 h-12 text-amber-100 rtl:-right-8 rtl:left-auto" />
                                        <blockquote className="relative z-10 text-2xl md:text-3xl font-serif italic text-slate-800 leading-snug pl-12 md:pl-16 rtl:pr-16 rtl:pl-0">
                                            "{profile.quote}"
                                        </blockquote>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="mt-16 flex justify-end">
                            <ShareArticle title={shareTitle} />
                        </div>
                    </div>
                </section>

                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
                    {/* Books Library Section */}
                    <div className="mb-16 flex items-end justify-between border-b-2 border-slate-900 pb-4">
                        <h2 className="text-4xl md:text-5xl font-black text-slate-900 tracking-tight">
                            {locale === 'ar' ? 'المؤلفات' : locale === 'en' ? 'Library' : 'Œuvres'}
                        </h2>
                        <span className="text-lg font-bold text-slate-500 uppercase tracking-widest hidden sm:block">
                            {books.length} {locale === 'ar' ? 'كتاب' : 'Titles'}
                        </span>
                    </div>

                    {books.length > 0 ? (
                        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-x-6 gap-y-12">
                            {books.map((book) => (
                                <BookCard key={book.id} {...book} />
                            ))}
                        </div>
                    ) : (
                        <div className="bg-white rounded-3xl p-20 text-center border border-slate-100 shadow-sm">
                            <BookOpen className="w-16 h-16 text-slate-200 mx-auto mb-6" />
                            <p className="text-xl font-bold text-slate-400 uppercase tracking-widest">
                                {tCommon('NoResultsDesc')}
                            </p>
                        </div>
                    )}

                    {/* Similar Authors Section */}
                    {similarAuthors.length > 0 && (
                        <div className="mt-32">
                            <div className="mb-12 flex items-center justify-between">
                                <h2 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tight">
                                    {locale === 'ar' ? 'اكتشف كتاباً آخرين' : locale === 'en' ? 'Discover Similar Authors' : 'Découvrez d\'autres auteurs'}
                                </h2>
                            </div>

                            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                                {similarAuthors.map((simAuthor) => (
                                    <Link
                                        key={simAuthor.id}
                                        href={`/authors/${encodeURIComponent(simAuthor.name)}`}
                                        className="group bg-white p-6 rounded-3xl border border-slate-100 shadow-sm hover:shadow-2xl hover:-translate-y-2 transition-all duration-300 flex flex-col items-center text-center"
                                    >
                                        <div className="relative w-28 h-28 md:w-32 md:h-32 rounded-full overflow-hidden mb-6 bg-slate-50 border-4 border-slate-50 group-hover:border-amber-100 transition-colors">
                                            {(simAuthor.image || simAuthor.sampleBookImage) ? (
                                                <ImageWithFallback src={simAuthor.image || simAuthor.sampleBookImage} alt={simAuthor.name} className="w-full h-full object-cover" />
                                            ) : (
                                                <User className="w-12 h-12 text-slate-300 mx-auto mt-8 md:mt-10" />
                                            )}
                                        </div>
                                        <h3 className="text-lg font-black text-slate-900 group-hover:text-amber-600 transition-colors line-clamp-1">
                                            {simAuthor.name}
                                        </h3>
                                    </Link>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </main>

            <Footer />
        </div>
    )
}
