import ImageWithFallback from '@/components/ImageWithFallback'
import AddToCartButton from '@/components/AddToCartButton'
import { Link } from '@/i18n/routing'
import { getTranslations } from 'next-intl/server'
import { normalizeImage } from '@/lib/utils'
import { Sparkles, Calendar, Clock, ArrowRight, Quote, BookOpen, CheckCircle2 } from 'lucide-react'

export interface EditorialPostItem {
    id: string
    title: string
    slug: string
    category?: string | null
    excerpt?: string | null
    coverImage?: string | null
    publishedAt?: Date | string | null
    totalReadTime?: number | null
    authorName?: string | null
    tags?: string | null
    language?: string | null
    author?: {
        fullName?: string | null
        image?: string | null
    } | null
}

interface EditorialArticlesSectionProps {
    posts: EditorialPostItem[]
    bookId: string
    bookTitle: string
    bookPrice: number
    bookImage: string
    locale: string
    inStock: boolean
}

export default async function EditorialArticlesSection({
    posts,
    bookId,
    bookTitle,
    bookPrice,
    bookImage,
    locale,
    inStock
}: EditorialArticlesSectionProps) {
    if (!posts || posts.length === 0) return null

    const t = await getTranslations({ locale, namespace: 'Book' })
    const primaryPost = posts[0]
    const secondaryPosts = posts.slice(1, 3)

    // Microdonnées JSON-LD pour booster le référencement naturel (SEO sémantique Google)
    const jsonLd = {
        '@context': 'https://schema.org',
        '@type': 'ItemList',
        itemListElement: posts.map((post, idx) => ({
            '@type': 'ListItem',
            position: idx + 1,
            item: {
                '@type': 'Article',
                headline: post.title,
                description: post.excerpt || undefined,
                image: post.coverImage ? normalizeImage(post.coverImage) : undefined,
                datePublished: post.publishedAt ? new Date(post.publishedAt).toISOString() : undefined,
                author: {
                    '@type': 'Person',
                    name: post.authorName || post.author?.fullName || 'Comité Éditorial Riwaya'
                },
                about: {
                    '@type': 'Book',
                    name: bookTitle
                }
            }
        }))
    }

    const formatDate = (dateValue?: Date | string | null) => {
        if (!dateValue) return null
        try {
            return new Date(dateValue).toLocaleDateString(
                locale === 'ar' ? 'ar-MA' : locale === 'en' ? 'en-US' : 'fr-FR',
                { day: 'numeric', month: 'short', year: 'numeric' }
            )
        } catch {
            return null
        }
    }

    return (
        <section
            id="editorial-reviews"
            aria-labelledby="editorial-reviews-heading"
            className="py-10 md:py-16 border-t border-gray-100 scroll-mt-28"
        >
            {/* Injection JSON-LD SEO */}
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
            />

            <div className="max-w-7xl mx-auto px-4 sm:px-6">
                {/* En-tête de section éditoriale */}
                <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8 sm:mb-12">
                    <div className="space-y-2 max-w-2xl">
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-50 text-amber-900 border border-amber-200/60 text-[11px] font-bold uppercase tracking-wider">
                            <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                            <span>{t('EditorialSectionBadge')}</span>
                        </div>
                        <h2
                            id="editorial-reviews-heading"
                            className="text-2xl sm:text-3xl lg:text-4xl font-black text-black tracking-tight"
                        >
                            {t('EditorialSectionTitle')}
                            <span className="text-amber-500">.</span>
                        </h2>
                        <p className="text-xs sm:text-sm text-gray-500 font-medium leading-relaxed">
                            {t('EditorialSectionSubtitle')}
                        </p>
                    </div>

                    <Link
                        href="/blog"
                        className="inline-flex items-center gap-2 text-xs font-bold text-gray-700 hover:text-black uppercase tracking-wider transition-colors self-start sm:self-end py-2"
                    >
                        <span>{t('ExploreAll')}</span>
                        <ArrowRight className="w-4 h-4 rtl:rotate-180" />
                    </Link>
                </div>

                {/* Article Vedette (Hero Spotlight Card) */}
                <article className="group bg-gradient-to-br from-amber-50/40 via-white to-gray-50/50 rounded-3xl sm:rounded-[2.5rem] border border-amber-100/70 p-5 sm:p-8 lg:p-10 shadow-sm hover:shadow-xl transition-all duration-300 relative overflow-hidden">
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-10 items-center">
                        {/* Image de couverture */}
                        <div className="lg:col-span-5 relative">
                            <div className="relative aspect-[16/10] sm:aspect-[4/3] rounded-2xl sm:rounded-[2rem] overflow-hidden bg-gray-100 shadow-md">
                                {primaryPost.coverImage ? (
                                    <ImageWithFallback
                                        src={normalizeImage(primaryPost.coverImage)}
                                        alt={primaryPost.title}
                                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                                    />
                                ) : (
                                    <div className="w-full h-full flex flex-col items-center justify-center bg-gray-100 text-gray-400 gap-2">
                                        <BookOpen className="w-10 h-10 text-gray-300" />
                                        <span className="text-xs font-bold uppercase tracking-widest">Riwaya Mag</span>
                                    </div>
                                )}
                                {primaryPost.category && (
                                    <div className="absolute top-4 left-4 rtl:left-auto rtl:right-4">
                                        <span className="px-3 py-1 bg-black/85 backdrop-blur-md text-white text-[10px] font-black uppercase tracking-widest rounded-full shadow-sm">
                                            {primaryPost.category}
                                        </span>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Corps éditorial & Arguments clés */}
                        <div className="lg:col-span-7 flex flex-col justify-between space-y-4 sm:space-y-6">
                            {/* Métadonnées & Auteur */}
                            <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500 font-medium">
                                <div className="flex items-center gap-1.5">
                                    <span className="font-bold text-gray-800">
                                        {primaryPost.authorName || primaryPost.author?.fullName || 'Comité de lecture'}
                                    </span>
                                </div>
                                {formatDate(primaryPost.publishedAt) && (
                                    <>
                                        <span className="text-gray-300">•</span>
                                        <span className="flex items-center gap-1">
                                            <Calendar className="w-3.5 h-3.5 text-gray-400" />
                                            {formatDate(primaryPost.publishedAt)}
                                        </span>
                                    </>
                                )}
                                <span className="text-gray-300">•</span>
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-white border border-gray-200 text-gray-700 font-bold text-[10px]">
                                    <Clock className="w-3 h-3 text-amber-600" />
                                    {t('EditorialReadingTime', { minutes: primaryPost.totalReadTime || 4 })}
                                </span>
                            </div>

                            {/* Titre */}
                            <h3 className="text-xl sm:text-2xl lg:text-3xl font-black text-black leading-tight tracking-tight group-hover:text-amber-800 transition-colors">
                                <Link href={`/blog/${primaryPost.slug}`}>
                                    {primaryPost.title}
                                </Link>
                            </h3>

                            {/* Extrait éditorial en citation */}
                            {primaryPost.excerpt && (
                                <div className="relative pl-4 sm:pl-6 rtl:pl-0 rtl:pr-4 sm:rtl:pr-6 border-l-2 rtl:border-l-0 rtl:border-r-2 border-amber-400/80 bg-amber-50/30 rounded-r-2xl rtl:rounded-r-none rtl:rounded-l-2xl py-3 pr-3 rtl:pr-0 rtl:pl-3">
                                    <Quote className="w-4 h-4 text-amber-500 mb-1 opacity-70" />
                                    <p className="text-xs sm:text-sm text-gray-700 italic leading-relaxed line-clamp-3">
                                        « {primaryPost.excerpt} »
                                    </p>
                                </div>
                            )}

                            {/* Encart conversion : Lien direct + Réassurance d'achat */}
                            <div className="pt-2 sm:pt-4 border-t border-amber-200/40 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                <Link
                                    href={`/blog/${primaryPost.slug}`}
                                    className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-full bg-black text-white hover:bg-neutral-800 text-xs font-black uppercase tracking-wider transition-all shadow-md hover:shadow-lg group/btn self-start sm:self-auto"
                                >
                                    <span>{t('EditorialReadFull')}</span>
                                    <ArrowRight className="w-3.5 h-3.5 group-hover/btn:translate-x-1 rtl:group-hover/btn:-translate-x-1 transition-transform" />
                                </Link>

                                {inStock && (
                                    <div className="flex items-center gap-3">
                                        <div className="hidden sm:flex flex-col text-right rtl:text-left">
                                            <span className="text-[11px] font-bold text-gray-500 uppercase tracking-widest">
                                                {bookPrice} {locale === 'ar' ? 'درهم' : locale === 'en' ? 'MAD' : 'DH'}
                                            </span>
                                            <span className="text-[10px] text-emerald-600 font-bold flex items-center gap-1 justify-end rtl:justify-start">
                                                <CheckCircle2 className="w-3 h-3" />
                                                COD Disponible
                                            </span>
                                        </div>
                                        <AddToCartButton
                                            product={{
                                                id: bookId,
                                                title: bookTitle,
                                                price: bookPrice,
                                                image: bookImage,
                                                type: 'BOOK'
                                            }}
                                            showIcon={true}
                                            className="!px-5 !py-3 text-[10px] uppercase tracking-wider font-black !rounded-full shadow-md"
                                        />
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </article>

                {/* Articles secondaires compagnons (si 2 ou 3 articles mentionnent ce livre) */}
                {secondaryPosts.length > 0 && (
                    <div className="mt-8 pt-8 border-t border-gray-100">
                        <h4 className="text-xs font-black uppercase tracking-widest text-gray-400 mb-4">
                            {t('EditorialOtherArticles')}
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                            {secondaryPosts.map(post => (
                                <Link
                                    key={post.id}
                                    href={`/blog/${post.slug}`}
                                    className="group flex gap-4 bg-white p-4 rounded-2xl border border-gray-100 hover:border-gray-200 hover:shadow-md transition-all items-center"
                                >
                                    <div className="relative w-20 h-20 sm:w-24 sm:h-24 flex-shrink-0 rounded-xl overflow-hidden bg-gray-100">
                                        {post.coverImage ? (
                                            <ImageWithFallback
                                                src={normalizeImage(post.coverImage)}
                                                alt={post.title}
                                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                            />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center bg-gray-50 text-gray-400 text-xs font-bold">
                                                Blog
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        {post.category && (
                                            <span className="text-[9px] font-black uppercase tracking-wider text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full inline-block mb-1">
                                                {post.category}
                                            </span>
                                        )}
                                        <h5 className="text-sm font-bold text-gray-900 group-hover:text-black line-clamp-2 leading-snug">
                                            {post.title}
                                        </h5>
                                        <div className="flex items-center gap-2 mt-2 text-[10px] text-gray-400">
                                            {formatDate(post.publishedAt) && (
                                                <span>{formatDate(post.publishedAt)}</span>
                                            )}
                                            <span>•</span>
                                            <span className="font-semibold text-gray-600">
                                                {t('EditorialReadingTime', { minutes: post.totalReadTime || 3 })}
                                            </span>
                                        </div>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </section>
    )
}
