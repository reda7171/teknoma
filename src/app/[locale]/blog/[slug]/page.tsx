import { getPostBySlug, incrementPostViews, getRelatedPosts } from '@/lib/actions/blog'
import { notFound } from 'next/navigation'
import Image from 'next/image'
import Header from '@/components/HeaderWithUser'
import Footer from '@/components/FooterWithFeatures'
import { Calendar, User, Eye, Tag, MessageSquare, Clock, Pencil, ArrowRight, BookOpen, Quote, Lightbulb, Target, Bookmark } from 'lucide-react'
import { Link } from '@/i18n/routing'
import { Metadata } from 'next'
import { cookies } from 'next/headers'
import remarkHtml from 'remark-html'
import remarkGfm from 'remark-gfm'
import { remark } from 'remark'
import dynamic from 'next/dynamic'

const CommentsSection = dynamic(() => import('@/components/blog/CommentsSection'), { loading: () => <div className="h-32 bg-slate-50 animate-pulse rounded-2xl" /> })
const ShareArticle = dynamic(() => import('@/components/blog/ShareArticle'))
import ReadingProgress from '@/components/blog/ReadingProgress'
import { getTranslations } from 'next-intl/server'
import { getSetting } from '@/lib/actions/site-settings'
import AdBanner from '@/components/AdBanner'
import { getLocalizedTitle, generateBookUrl } from '@/lib/i18n-utils'

export async function generateMetadata({ params }: { params: Promise<{ slug: string; locale: string }> }): Promise<Metadata> {
    const { slug: rawSlug, locale } = await params
    // Normaliser le slug : supprimer les accents pour matcher la DB (slugs ASCII)
    const slug = rawSlug
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
    const post = await getPostBySlug(slug, locale)

    if (!post) return {}

    const siteUrl = 'https://riwaya.store'
    const canonicalUrl = `${siteUrl}/${locale}/blog/${slug}`

    const baseKeywords = ["رواية", "riwaya", "book", "الكاتب", "authors", "كتب"]
    const tags = post.tags ? post.tags.split(',').map(t => t.trim()).filter(Boolean) : []
    const keywords = [...tags, ...baseKeywords]

    return {
        title: `${post.title} | Blog Riwaya`,
        description: post.excerpt || post.title,
        keywords: keywords,
        openGraph: {
            title: post.title,
            description: post.excerpt || post.title,
            url: canonicalUrl,
            type: 'article',
            publishedTime: post.publishedAt?.toISOString(),
            authors: post.author?.fullName ? [post.author.fullName] : ['Riwaya'],
            images: post.coverImage ? [{ url: post.coverImage, width: 1200, height: 630, alt: post.title }] : [],
        },
        twitter: {
            card: 'summary_large_image',
            title: post.title,
            description: post.excerpt || post.title,
            images: post.coverImage ? [post.coverImage] : [],
        },
        alternates: { canonical: canonicalUrl },
    }
}

// Calcule le temps de lecture estimé
function estimateReadingTime(content: string): number {
    const words = content.trim().split(/\s+/).length
    return Math.max(1, Math.ceil(words / 200))
}

export default async function BlogPostPage({ params }: { params: Promise<{ slug: string; locale: string }> }) {
    const { slug: rawSlug, locale } = await params
    // Normaliser le slug : supprimer les accents pour matcher la DB (slugs ASCII)
    const slug = rawSlug
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
    const post = await getPostBySlug(slug, locale)
    const t = await getTranslations('BlogArticle')

    if (!post) notFound()

    await incrementPostViews(post.id)

    const cookieStore = await cookies()
    const adminRole = cookieStore.get('admin-role')?.value
    const isAdmin = adminRole === 'ADMIN'

    // Convertir markdown → HTML
    const processedContent = await remark()
        .use(remarkHtml, { sanitize: false })
        .use(remarkGfm)
        .process(post.content)
    const contentHtml = processedContent.toString()

    const tags = post.tags ? post.tags.split(',').map(t => t.trim()).filter(Boolean) : []
    const readingTime = estimateReadingTime(post.content)

    // Articles similaires + config AdSense
    const [relatedPosts, adsenseEnabled, adsensePublisherId, slotTop, slotBottom] = await Promise.all([
        getRelatedPosts(post.id, post.category, locale),
        getSetting('adsense_enabled').then(v => v === 'true'),
        getSetting('adsense_publisher_id').then(v => v || ''),
        getSetting('adsense_slot_article_top').then(v => v || ''),
        getSetting('adsense_slot_article_bottom').then(v => v || ''),
    ])

    return (
        <div className="min-h-screen bg-white" id="article-page">

            {/* Barre de progression lecture */}
            <ReadingProgress />

            <Header />

            {/* Données Structurées Schema.org — AEO enrichi */}
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{
                    __html: JSON.stringify([
                        {
                            "@context": "https://schema.org",
                            "@type": "BlogPosting",
                            "headline": post.title,
                            "image": post.coverImage,
                            "url": `https://riwaya.store/${locale}/blog/${post.slug}`,
                            "author": {
                                "@type": "Person",
                                "name": post.authorName || post.author?.fullName || "Riwaya",
                                "url": `https://riwaya.store/${locale}/blog`
                            },
                            "publisher": {
                                "@type": "Organization",
                                "name": "Riwaya",
                                "logo": { "@type": "ImageObject", "url": "https://riwaya.store/logo.png", "width": 200, "height": 60 }
                            },
                            "datePublished": post.publishedAt,
                            "dateModified": post.updatedAt,
                            "description": post.excerpt || post.title,
                            "inLanguage": locale === 'ar' ? 'ar-MA' : locale === 'en' ? 'en-MA' : 'fr-MA',
                            "wordCount": post.content ? post.content.trim().split(/\s+/).length : 0,
                            ...(post.category ? { "articleSection": post.category } : {}),
                            ...(tags.length > 0 ? { "keywords": tags.join(', ') } : {}),
                            // Speakable : les sections que les assistants vocaux doivent lire
                            "speakable": {
                                "@type": "SpeakableSpecification",
                                "cssSelector": ["h1", ".article-excerpt", ".article-lead"]
                            },
                            "isPartOf": {
                                "@type": "Blog",
                                "name": "Blog Riwaya",
                                "url": `https://riwaya.store/${locale}/blog`
                            }
                        },
                        {
                            "@context": "https://schema.org",
                            "@type": "FAQPage",
                            "mainEntity": [
                                {
                                    "@type": "Question",
                                    "name": locale === 'ar' ? `عن ماذا يتحدث مقال "${post.title}"؟` : locale === 'en' ? `What is the article "${post.title}" about?` : `De quoi parle l'article "${post.title}" ?`,
                                    "acceptedAnswer": {
                                        "@type": "Answer",
                                        "text": post.excerpt || post.title
                                    }
                                },
                                {
                                    "@type": "Question",
                                    "name": locale === 'ar' ? `من هو كاتب هذا المقال؟` : locale === 'en' ? `Who wrote this article?` : `Qui a rédigé cet article ?`,
                                    "acceptedAnswer": {
                                        "@type": "Answer",
                                        "text": locale === 'ar'
                                            ? `كتب هذا المقال ${post.authorName || post.author?.fullName || 'فريق رواية'}. يمكنك قراءة المزيد من مقالاتنا على مدونة رواية.`
                                            : locale === 'en'
                                                ? `This article was written by ${post.authorName || post.author?.fullName || 'the Riwaya team'}. You can read more articles on the Riwaya blog.`
                                                : `Cet article a été rédigé par ${post.authorName || post.author?.fullName || "l'équipe Riwaya"}. Vous pouvez lire plus d'articles sur le blog Riwaya.`
                                    }
                                },
                                {
                                    "@type": "Question",
                                    "name": locale === 'ar' ? `كم من الوقت يستغرق قراءة هذا المقال؟` : locale === 'en' ? `How long does it take to read this article?` : `Combien de temps faut-il pour lire cet article ?`,
                                    "acceptedAnswer": {
                                        "@type": "Answer",
                                        "text": locale === 'ar'
                                            ? `يستغرق قراءة هذا المقال حوالي ${readingTime} دقيقة.`
                                            : locale === 'en'
                                                ? `Reading this article takes approximately ${readingTime} minute${readingTime > 1 ? 's' : ''}.`
                                                : `La lecture de cet article prend environ ${readingTime} minute${readingTime > 1 ? 's' : ''}.`
                                    }
                                },
                                {
                                    "@type": "Question",
                                    "name": locale === 'ar' ? `أين يمكنني شراء الكتب الموصى بها في هذا المقال؟` : locale === 'en' ? `Where can I buy books recommended in this article?` : `Où puis-je acheter les livres recommandés dans cet article ?`,
                                    "acceptedAnswer": {
                                        "@type": "Answer",
                                        "text": locale === 'ar'
                                            ? `يمكنك العثور على جميع الكتب الموصى بها في مكتبة رواية الإلكترونية على riwaya.store. الدفع عند الاستلام، توصيل سريع في المغرب.`
                                            : locale === 'en'
                                                ? `You can find all recommended books at the Riwaya online bookstore on riwaya.store. Cash on delivery, fast shipping in Morocco.`
                                                : `Vous trouverez tous les livres recommandés sur la librairie en ligne Riwaya sur riwaya.store. Paiement à la livraison, livraison rapide au Maroc.`
                                    }
                                }
                            ]
                        }
                    ]).replace(/</g, '\\u003c')
                }}
            />

            {/* === HERO === */}
            <section className="relative bg-slate-50 overflow-hidden border-b border-slate-100">
                {/* Image de fond floutée */}
                {post.coverImage && (
                    <div className="absolute inset-0 opacity-[0.03] grayscale">
                        <Image
                            src={post.coverImage}
                            alt=""
                            fill
                            className="object-cover blur-2xl scale-110"
                            priority
                        />
                    </div>
                )}

                <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-24">
                    {/* Fil d'Ariane + btn admin */}
                    <div className="flex items-center justify-between mb-10">
                        <nav className="flex items-center gap-2 text-[10px] rtl:text-xs font-bold uppercase tracking-[0.2em] rtl:tracking-normal text-slate-400">
                            <Link href="/blog" className="hover:text-slate-900 transition-colors">Blog</Link>
                            <span>/</span>
                            {post.category && (
                                <>
                                    <Link href={`/blog?category=${post.category}`} className="hover:text-slate-900 transition-colors">{post.category}</Link>
                                    <span>/</span>
                                </>
                            )}
                            <span className="text-slate-500 truncate max-w-[200px]">{post.title}</span>
                        </nav>

                        {isAdmin && (
                            <Link
                                href={`/admin/posts/${post.id}`}
                                className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-900 text-[10px] rtl:text-xs font-black uppercase tracking-[0.2em] rtl:tracking-normal rounded-full hover:bg-slate-50 transition-all shadow-sm"
                            >
                                <Pencil className="w-3 h-3 text-slate-600" />
                                {t('Edit')}
                            </Link>
                        )}
                    </div>

                    {/* Catégorie badge */}
                    {post.category && (
                        <div className="mb-6">
                            <Link
                                href={`/blog?category=${post.category}`}
                                className="inline-block px-4 py-1.5 bg-slate-50 text-slate-600 text-[10px] rtl:text-xs font-black uppercase tracking-[0.3em] rtl:tracking-normal rounded-full hover:bg-slate-100 transition-colors"
                            >
                                {post.category}
                            </Link>
                        </div>
                    )}

                    {/* Titre principal */}
                    <h1 className="text-3xl sm:text-4xl md:text-6xl lg:text-7xl font-black text-slate-900 leading-[1.2] md:leading-[1] tracking-tighter mb-6 md:mb-8 max-w-4xl break-words">
                        {post.title}
                    </h1>

                    {/* Extrait */}
                    {post.excerpt && (
                        <p className="text-base sm:text-lg md:text-xl text-slate-500 leading-relaxed mb-8 md:mb-10 max-w-3xl font-medium">
                            {post.excerpt}
                        </p>
                    )}

                    {/* Méta */}
                    <div className="flex flex-wrap items-center gap-6 text-[11px] rtl:text-[13px] font-bold uppercase tracking-[0.15em] rtl:tracking-normal text-slate-400 border-t border-slate-200 pt-8">
                        {(post.authorName || post.author?.fullName) && (
                            <span className="flex items-center gap-2 text-slate-700">
                                {(!post.authorName && post.author?.image) ? (
                                    <Image
                                        src={post.author.image}
                                        alt={post.author.fullName || ''}
                                        width={48}
                                        height={48}
                                        className="rounded-full object-cover ring-2 ring-slate-200 w-12 h-12"
                                    />
                                ) : (
                                    <div className="w-12 h-12 rounded-full bg-slate-200 flex items-center justify-center">
                                        <User className="w-6 h-6 text-slate-500" />
                                    </div>
                                )}
                                {post.authorName || post.author?.fullName}
                            </span>
                        )}
                        {post.publishedAt && (
                            <span className="flex items-center gap-2">
                                <Calendar className="w-3.5 h-3.5 text-slate-500" />
                                {new Date(post.publishedAt).toLocaleDateString(locale === 'ar' ? 'ar-MA' : locale === 'fr' ? 'fr-FR' : 'en-US', {
                                    day: 'numeric', month: 'long', year: 'numeric'
                                })}
                            </span>
                        )}
                        <span className="flex items-center gap-2">
                            <Clock className="w-3.5 h-3.5 text-slate-500" />
                            {readingTime} {t('MinRead')}
                        </span>
                        <span className="flex items-center gap-2">
                            <Eye className="w-3.5 h-3.5 text-slate-500" />
                            {post.viewCount} {t('Views')}
                        </span>
                        {post._count?.comments > 0 && (
                            <span className="flex items-center gap-2">
                                <MessageSquare className="w-3.5 h-3.5 text-slate-500" />
                                {post._count.comments} {t('Comments')}
                            </span>
                        )}
                    </div>
                </div>
            </section>

            {/* === IMAGE COVER grande === */}
            {post.coverImage && (
                <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 mt-10 md:mt-16 mb-12 md:mb-20">
                    <div className="relative group">
                        {/* Decorative background blocks for editorial look */}
                        <div className="absolute inset-0 bg-black rounded-3xl md:rounded-[3rem] rotate-1 group-hover:rotate-2 transition-transform duration-700 opacity-5 shadow-2xl" />
                        <div className="absolute inset-0 bg-gray-200 rounded-3xl md:rounded-[3rem] -rotate-1 group-hover:-rotate-2 transition-transform duration-700 opacity-20" />
                        
                        {/* Main Container */}
                        <div className="relative aspect-[4/3] md:aspect-[21/9] w-full overflow-hidden rounded-3xl md:rounded-[3rem] border-4 md:border-[8px] border-white bg-slate-50 shadow-2xl shadow-black/10 group-hover:-translate-y-2 transition-transform duration-700">
                            {/* Blurred Ambient Background */}
                            <div className="absolute inset-0 z-0">
                                <Image
                                    src={post.coverImage}
                                    alt=""
                                    fill
                                    className="object-cover opacity-30 blur-[40px] scale-125 saturate-150"
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-slate-100/50 to-transparent" />
                            </div>
                            
                            {/* Foreground Image */}
                            <Image
                                src={post.coverImage}
                                alt={post.title}
                                fill
                                className="object-contain z-10 drop-shadow-2xl group-hover:scale-105 transition-transform duration-700"
                                priority
                            />
                            
                            {/* Inner highlight */}
                            <div className="absolute inset-0 ring-1 ring-inset ring-black/5 rounded-[2.5rem] pointer-events-none z-20" />
                        </div>
                    </div>
                </div>
            )}

            {/* === CONTENU PRINCIPAL === */}
            <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16 lg:py-24">
                <div className="lg:grid lg:grid-cols-[1fr_280px] lg:gap-16 xl:gap-24">

                    {/* Colonne article */}
                    <div>
                        {/* AdSense haut */}
                        <AdBanner
                            publisherId={adsensePublisherId}
                            slotId={slotTop}
                            label="Haut de l'article"
                        />

                        {/* Corps de l'article */}
                        <article
                            id="article-content"
                            className="prose prose-base md:prose-lg max-w-none rtl:text-[18px] md:rtl:text-[22px] rtl:font-bold rtl:leading-[2] md:rtl:leading-[2.5]
                                prose-headings:font-black prose-headings:tracking-tight prose-headings:text-slate-900
                                prose-h2:text-2xl md:prose-h2:text-3xl lg:prose-h2:text-4xl prose-h2:pb-4 prose-h2:border-b prose-h2:border-gray-100 rtl:prose-h2:text-[24px] md:rtl:prose-h2:text-[34px]
                                prose-h3:text-xl md:prose-h3:text-2xl rtl:prose-h3:text-[20px] md:rtl:prose-h3:text-[30px]
                                prose-p:text-slate-800 prose-p:leading-[1.8] md:prose-p:leading-[2] prose-p:text-[16px] md:prose-p:text-[18px] rtl:prose-p:text-[18px] md:rtl:prose-p:text-[22px] rtl:prose-p:leading-[2] md:rtl:prose-p:leading-[2.5] rtl:prose-p:font-bold prose-p:font-medium
                                prose-a:text-slate-600 prose-a:font-semibold prose-a:no-underline prose-a:border-b-2 prose-a:border-slate-600 hover:prose-a:bg-slate-50 prose-a:transition-colors break-words
                                prose-blockquote:border-l-4 prose-blockquote:border-slate-500 prose-blockquote:bg-slate-50 prose-blockquote:rounded-r-2xl prose-blockquote:py-4 prose-blockquote:not-italic
                                prose-blockquote:text-slate-800 prose-blockquote:font-bold prose-blockquote:my-8 prose-blockquote:text-sm md:prose-blockquote:text-base
                                prose-strong:text-slate-900 prose-strong:font-black
                                prose-code:bg-gray-100 prose-code:px-2 prose-code:py-0.5 prose-code:rounded-md prose-code:text-sm prose-code:text-rose-600 prose-code:break-all
                                prose-pre:bg-slate-900 prose-pre:rounded-2xl prose-pre:shadow-xl prose-pre:my-8 prose-pre:overflow-x-auto
                                prose-img:rounded-xl md:prose-img:rounded-2xl prose-img:shadow-lg prose-img:mx-auto prose-img:my-8 md:prose-img:my-10 prose-img:w-full prose-img:object-cover
                                prose-ul:space-y-2 prose-ol:space-y-2 prose-ul:mb-8 prose-ol:mb-8 prose-ul:pl-4 prose-ol:pl-4
                                prose-li:text-slate-800 prose-li:leading-relaxed prose-li:font-semibold rtl:prose-li:text-[18px] md:rtl:prose-li:text-[21px] rtl:prose-li:leading-[2] md:rtl:prose-li:leading-[2.5] rtl:prose-li:font-bold"
                        >
                            <style>{`
                                #article-content p { margin-bottom: 2rem !important; margin-top: 1rem !important; }
                                #article-content h2 { margin-top: 4rem !important; margin-bottom: 1.5rem !important; }
                                #article-content h3 { margin-top: 3rem !important; margin-bottom: 1rem !important; }
                            `}</style>
                            <div dangerouslySetInnerHTML={{ __html: contentHtml }} />
                        </article>

                        {/* AdSense bas */}
                        <AdBanner
                            publisherId={adsensePublisherId}
                            slotId={slotBottom}
                            label="Bas de l'article"
                        />

                        {/* === Tags & Partage === */}
                        <div className="mt-10 md:mt-14 pt-8 md:pt-10 border-t-2 border-gray-100">
                            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                                {tags.length > 0 && (
                                    <div className="flex flex-wrap gap-2">
                                        {tags.map(tag => (
                                            <Link
                                                key={tag}
                                                href={`/blog?search=${encodeURIComponent(tag)}`}
                                                className="inline-flex items-center gap-1.5 px-4 py-2 bg-gray-100 text-gray-600 text-[11px] font-bold uppercase tracking-widest rounded-full hover:bg-slate-900 hover:text-white transition-all break-words"
                                            >
                                                <Tag className="w-3 h-3 flex-shrink-0" />
                                                <span className="truncate max-w-[150px] sm:max-w-xs">{tag}</span>
                                            </Link>
                                        ))}
                                    </div>
                                )}
                                <ShareArticle title={post.title} />
                            </div>
                        </div>

                        {/* === Bio Auteur === */}
                        {(post.authorName || post.author) && (
                            <div className="mt-12 md:mt-16 p-6 md:p-8 bg-slate-50 border border-slate-100 rounded-3xl text-slate-900">
                                <p className="text-[10px] rtl:text-xs font-black uppercase tracking-[0.3em] rtl:tracking-normal text-slate-400 mb-4 md:mb-6">{t('AboutAuthor')}</p>
                                <div className="flex flex-col sm:flex-row items-start gap-4 md:gap-6">
                                    <div className="w-14 h-14 md:w-16 md:h-16 rounded-2xl bg-white border border-slate-200 overflow-hidden flex-shrink-0 flex items-center justify-center">
                                        {(!post.authorName && post.author?.image) ? (
                                            <Image
                                                src={post.author.image}
                                                alt={post.author.fullName || ''}
                                                width={64}
                                                height={64}
                                                className="object-cover w-full h-full"
                                            />
                                        ) : (
                                            <User className="w-6 h-6 md:w-7 md:h-7 text-slate-400" />
                                        )}
                                    </div>
                                    <div>
                                        <h3 className="text-base md:text-lg font-black mb-1">{post.authorName || post.author?.fullName || "Riwaya"}</h3>
                                        {(!post.authorName && post.author?.bio) ? (
                                            <p className="text-sm text-slate-500 leading-relaxed">{post.author.bio}</p>
                                        ) : (
                                            <>
                                                <p className="text-[10px] md:text-[11px] font-bold uppercase tracking-widest text-slate-600 mb-2">{t('ModeratorRole')}</p>
                                                <p className="text-xs md:text-sm text-slate-500 leading-relaxed">{t('ModeratorDescription')}</p>
                                            </>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* === Livres Mentionnés (Mobile/Desktop bas d'article) === */}
                        {post.books && post.books.length > 0 && (
                            <div className="mt-10 md:mt-12 p-5 md:p-8 bg-slate-50/50 border border-slate-100 rounded-3xl">
                                <h3 className="text-base md:text-lg font-black text-slate-900 mb-4 md:mb-6 flex items-center gap-2">
                                    <BookOpen className="w-4 h-4 md:w-5 md:h-5 text-slate-600" />
                                    {t('InThisArticle')}
                                </h3>
                                <div className="grid grid-cols-1 gap-4">
                                    {post.books.map(book => {
                                        const displayTitle = getLocalizedTitle(book, locale);
                                        const bookUrl = generateBookUrl(book, locale);
                                        return (
                                        <Link href={bookUrl} key={book.id} className="group flex flex-col sm:flex-row gap-4 sm:gap-6 p-4 sm:p-6 bg-white rounded-2xl border border-slate-100 hover:border-slate-200 hover:shadow-lg transition-all">
                                            <div className="relative w-24 h-36 sm:w-32 sm:h-48 bg-slate-50 rounded-lg shadow-sm overflow-hidden flex-shrink-0 mx-auto sm:mx-0">
                                                {book.image && <Image src={book.image} alt={displayTitle} fill className="object-cover group-hover:scale-105 transition-transform" unoptimized />}
                                            </div>
                                            <div className="flex flex-col flex-1 min-w-0 text-center sm:text-start">
                                                <h4 className="text-base md:text-lg font-black text-slate-900 group-hover:text-slate-600 transition-colors leading-tight truncate-multiline break-words">{displayTitle}</h4>
                                                <p className="text-xs md:text-sm font-bold text-slate-500 mt-1 uppercase tracking-widest truncate">{book.author}</p>

                                                {book.description && (
                                                    <p className="text-sm text-slate-600 mt-3 line-clamp-3 leading-relaxed">
                                                        {book.description}
                                                    </p>
                                                )}

                                                {(book.bestQuote || book.bestLessons || book.bestFor || book.bestChapters) && (
                                                    <div className="mt-4 space-y-3 bg-slate-50/80 p-4 rounded-xl border border-slate-100">
                                                        {book.bestQuote && (
                                                            <div className="flex gap-3">
                                                                <Quote className="w-4 h-4 text-slate-400 flex-shrink-0 mt-0.5" />
                                                                <div>
                                                                    <p className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-0.5">{t('BestQuote')}</p>
                                                                    <p className="text-xs text-slate-700 italic font-medium leading-relaxed">"{book.bestQuote}"</p>
                                                                </div>
                                                            </div>
                                                        )}
                                                        {book.bestLessons && (
                                                            <div className="flex gap-3">
                                                                <Lightbulb className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
                                                                <div>
                                                                    <p className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-0.5">{t('KeyLessons')}</p>
                                                                    <p className="text-xs text-slate-700 leading-relaxed">{book.bestLessons}</p>
                                                                </div>
                                                            </div>
                                                        )}
                                                        {book.bestFor && (
                                                            <div className="flex gap-3">
                                                                <Target className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                                                                <div>
                                                                    <p className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-0.5">{t('BestFor')}</p>
                                                                    <p className="text-xs text-slate-700 leading-relaxed">{book.bestFor}</p>
                                                                </div>
                                                            </div>
                                                        )}
                                                        {book.bestChapters && (
                                                            <div className="flex gap-3">
                                                                <Bookmark className="w-4 h-4 text-rose-400 flex-shrink-0 mt-0.5" />
                                                                <div>
                                                                    <p className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-0.5">{t('KeyChapters')}</p>
                                                                    <p className="text-xs text-slate-700 leading-relaxed">{book.bestChapters}</p>
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                )}

                                                <div className="mt-auto pt-4 flex items-center justify-between sm:justify-start gap-4">
                                                    <div>
                                                        <p className="text-base md:text-lg font-black text-slate-600">{book.price} MAD</p>
                                                        {book.stock > 0 ? (
                                                            <span className="text-[9px] md:text-[10px] font-bold text-emerald-600 uppercase tracking-widest">{t('InStock')}</span>
                                                        ) : (
                                                            <span className="text-[9px] md:text-[10px] font-bold text-rose-500 uppercase tracking-widest">{t('OutOfStock')}</span>
                                                        )}
                                                    </div>
                                                    <div className="px-4 py-2 bg-slate-900 text-white text-[9px] md:text-[10px] font-black uppercase tracking-[0.2em] rounded-full group-hover:bg-slate-600 transition-colors whitespace-nowrap sm:ml-auto">
                                                        {t('Discover')}
                                                    </div>
                                                </div>
                                            </div>
                                        </Link>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        {/* === Commentaires === */}
                        <CommentsSection
                            postId={post.id}
                            comments={post.comments || []}
                            totalCount={post._count?.comments || 0}
                        />
                    </div>

                    {/* === Sidebar sticky === */}
                    <aside className="hidden lg:block">
                        <div className="sticky top-24 space-y-8">

                            {/* Partage */}
                            <div className="bg-gray-50 rounded-3xl p-6">
                                <p className="text-[10px] rtl:text-xs font-black uppercase tracking-[0.3em] rtl:tracking-normal text-gray-400 mb-4">{t('ShareArticle')}</p>
                                <div className="flex flex-col gap-3">
                                    <ShareArticle title={post.title} vertical />
                                </div>
                            </div>

                            {/* Méta article */}
                            <div className="bg-slate-50 border border-slate-100 rounded-3xl p-6 text-slate-900">
                                <p className="text-[10px] rtl:text-xs font-black uppercase tracking-[0.3em] rtl:tracking-normal text-slate-400 mb-5">{t('ArticleInfo')}</p>
                                <div className="space-y-4">
                                    <div className="flex items-center gap-3 text-sm">
                                        <div className="w-8 h-8 rounded-xl bg-white border border-slate-200 flex items-center justify-center flex-shrink-0">
                                            <Clock className="w-3.5 h-3.5 text-slate-500" />
                                        </div>
                                        <div>
                                            <p className="text-[10px] rtl:text-xs text-slate-400 font-bold uppercase tracking-wider rtl:tracking-normal">{t('Reading')}</p>
                                            <p className="font-bold">{readingTime} {t('Minutes')}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3 text-sm">
                                        <div className="w-8 h-8 rounded-xl bg-white border border-slate-200 flex items-center justify-center flex-shrink-0">
                                            <Eye className="w-3.5 h-3.5 text-slate-500" />
                                        </div>
                                        <div>
                                            <p className="text-[10px] rtl:text-xs text-slate-400 font-bold uppercase tracking-wider rtl:tracking-normal">{t('Views')}</p>
                                            <p className="font-bold">{post.viewCount.toLocaleString()}</p>
                                        </div>
                                    </div>
                                    {post._count?.comments > 0 && (
                                        <div className="flex items-center gap-3 text-sm">
                                            <div className="w-8 h-8 rounded-xl bg-white border border-slate-200 flex items-center justify-center flex-shrink-0">
                                                <MessageSquare className="w-3.5 h-3.5 text-slate-500" />
                                            </div>
                                            <div>
                                                <p className="text-[10px] rtl:text-xs text-slate-400 font-bold uppercase tracking-wider rtl:tracking-normal">{t('Comments')}</p>
                                                <p className="font-bold">{post._count.comments}</p>
                                            </div>
                                        </div>
                                    )}
                                    {post.publishedAt && (
                                        <div className="flex items-center gap-3 text-sm">
                                            <div className="w-8 h-8 rounded-xl bg-white border border-slate-200 flex items-center justify-center flex-shrink-0">
                                                <Calendar className="w-3.5 h-3.5 text-slate-500" />
                                            </div>
                                            <div>
                                                <p className="text-[10px] rtl:text-xs text-slate-400 font-bold uppercase tracking-wider rtl:tracking-normal">{t('PublishedOn')}</p>
                                                <p className="font-bold">{new Date(post.publishedAt).toLocaleDateString(locale === 'ar' ? 'ar-MA' : locale === 'fr' ? 'fr-FR' : 'en-US', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Tags sidebar */}
                            {tags.length > 0 && (
                                <div className="bg-gray-50 rounded-3xl p-6">
                                    <p className="text-[10px] rtl:text-xs font-black uppercase tracking-[0.3em] rtl:tracking-normal text-gray-400 mb-4">{t('Tags')}</p>
                                    <div className="flex flex-wrap gap-2">
                                        {tags.map(tag => (
                                            <Link
                                                key={tag}
                                                href={`/blog?search=${encodeURIComponent(tag)}`}
                                                className="px-3 py-1.5 bg-white border border-gray-200 text-gray-500 text-[10px] rtl:text-xs font-bold uppercase tracking-wider rtl:tracking-normal rounded-full hover:bg-slate-900 hover:text-white hover:border-slate-900 transition-all"
                                            >
                                                {tag}
                                            </Link>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Livres Mentionnés (Sidebar) */}
                            {post.books && post.books.length > 0 && (
                                <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
                                    <p className="text-[10px] rtl:text-xs font-black uppercase tracking-[0.3em] rtl:tracking-normal text-slate-400 mb-5 flex items-center gap-2">
                                        <BookOpen className="w-3.5 h-3.5" />
                                        {t('InThisArticle')}
                                    </p>
                                    <div className="space-y-4">
                                        {post.books.map(book => {
                                            const displayTitle = getLocalizedTitle(book, locale);
                                            const bookUrl = generateBookUrl(book, locale);
                                            return (
                                            <Link href={bookUrl} key={book.id} className="group flex gap-4 items-start">
                                                <div className="relative w-12 h-16 bg-slate-100 rounded shadow-sm overflow-hidden flex-shrink-0">
                                                    {book.image && <Image src={book.image} alt={displayTitle} fill className="object-cover group-hover:scale-105 transition-transform" unoptimized />}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <h4 className="text-xs font-bold text-slate-900 line-clamp-2 group-hover:text-slate-600 transition-colors leading-tight">{displayTitle}</h4>
                                                    <p className="text-[10px] text-slate-500 truncate mt-1">{book.author}</p>
                                                    <p className="text-xs font-black text-slate-600 mt-1">{book.price} MAD</p>
                                                </div>
                                            </Link>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}

                            {/* CTA Blog */}
                            <Link
                                href="/blog"
                                className="group flex items-center justify-between p-5 bg-slate-50 border border-slate-100 rounded-3xl hover:bg-slate-100 transition-colors"
                            >
                                <div>
                                    <p className="text-[10px] rtl:text-xs font-black uppercase tracking-[0.2em] rtl:tracking-normal text-slate-400 mb-1">{t('Explore')}</p>
                                    <p className="font-black text-slate-900 text-sm">{t('AllArticles')}</p>
                                </div>
                                <div className="w-9 h-9 bg-slate-600 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform shadow-sm">
                                    <BookOpen className="w-4 h-4 text-white" />
                                </div>
                            </Link>
                        </div>
                    </aside>
                </div>
            </div>

            {/* === ARTICLES SIMILAIRES === */}
            {relatedPosts.length > 0 && (
                <section className="bg-gray-50 py-20 border-t border-gray-100">
                    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
                        <div className="flex items-center justify-between mb-12">
                            <h2 className="text-3xl font-black text-slate-900 tracking-tight">
                                {t('SimilarArticles')}
                            </h2>
                            <Link
                                href="/blog"
                                className="inline-flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.2em] text-slate-400 hover:text-slate-900 transition-colors"
                            >
                                {t('SeeAll')} <ArrowRight className="w-3.5 h-3.5" />
                            </Link>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                            {relatedPosts.map((related) => (
                                <Link
                                    key={related.id}
                                    href={`/blog/${related.slug}`}
                                    className="group bg-white rounded-3xl overflow-hidden border border-gray-100 hover:shadow-2xl transition-all duration-500 flex flex-col"
                                >
                                    <div className="relative aspect-[4/3] overflow-hidden bg-gray-100">
                                        {related.coverImage ? (
                                            <Image
                                                src={related.coverImage}
                                                alt={related.title}
                                                fill
                                                className="object-contain group-hover:scale-105 transition-transform duration-700 p-2"
                                                unoptimized
                                            />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center">
                                                <span className="text-gray-200 font-black text-2xl">Riwaya</span>
                                            </div>
                                        )}
                                        {related.category && (
                                            <div className="absolute top-4 left-4">
                                                <span className="px-3 py-1 bg-slate-50 text-slate-600 text-[9px] font-black uppercase tracking-[0.25em] rounded-full">
                                                    {related.category}
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                    <div className="p-6 flex flex-col flex-1">
                                        <div className="flex items-center gap-3 text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-3">
                                            {related.publishedAt && (
                                                <span className="flex items-center gap-1">
                                                    <Calendar className="w-3 h-3" />
                                                    {new Date(related.publishedAt).toLocaleDateString(locale === 'ar' ? 'ar-MA' : locale === 'fr' ? 'fr-FR' : 'en-US', { day: 'numeric', month: 'short' })}
                                                </span>
                                            )}
                                        </div>
                                        <h3 className="font-black text-slate-900 text-lg leading-tight mb-3 group-hover:text-slate-600 transition-colors line-clamp-2">
                                            {related.title}
                                        </h3>
                                        {related.excerpt && (
                                            <p className="text-gray-500 text-sm leading-relaxed line-clamp-2 mb-4 flex-1">
                                                {related.excerpt}
                                            </p>
                                        )}
                                        <div className="mt-auto flex items-center justify-between pt-4 border-t border-gray-100">
                                            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 group-hover:text-slate-900 transition-colors">
                                                {t('ReadArticle')}
                                            </span>
                                            <div className="w-8 h-8 bg-slate-100 rounded-full flex items-center justify-center group-hover:bg-slate-600 transition-colors">
                                                <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-white -rotate-45 group-hover:rotate-0 transition-all" />
                                            </div>
                                        </div>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    </div>
                </section>
            )}

            {/* FAQ Section */}
            <section className="bg-white py-20 border-t border-gray-100">
                <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
                    <h2 className="text-3xl font-black text-slate-900 tracking-tight mb-10 text-center">
                        {locale === 'ar' ? 'الأسئلة الشائعة' : locale === 'en' ? 'Frequently Asked Questions' : 'Questions Fréquentes'}
                    </h2>
                    <div className="space-y-6">
                        <div className="bg-slate-50 p-6 md:p-8 rounded-3xl border border-slate-100">
                            <h3 className="text-lg font-black text-slate-900 mb-3">
                                {locale === 'ar' ? `عن ماذا يتحدث مقال ${post.title}؟` : locale === 'en' ? `What is the article ${post.title} about?` : `De quoi parle l'article ${post.title} ?`}
                            </h3>
                            <p className="text-slate-600 leading-relaxed font-medium">
                                {post.excerpt || post.title}
                            </p>
                        </div>
                        <div className="bg-slate-50 p-6 md:p-8 rounded-3xl border border-slate-100">
                            <h3 className="text-lg font-black text-slate-900 mb-3">
                                {locale === 'ar' ? `من هو كاتب هذا المقال؟` : locale === 'en' ? `Who is the author of this article?` : `Qui est l'auteur de cet article ?`}
                            </h3>
                            <p className="text-slate-600 leading-relaxed font-medium">
                                {locale === 'ar' ? `تمت كتابة هذا المقال بواسطة ${post.author?.fullName || 'رواية'}.` : locale === 'en' ? `This article was written by ${post.author?.fullName || 'Riwaya'}.` : `Cet article a été écrit par ${post.author?.fullName || 'Riwaya'}.`}
                            </p>
                        </div>
                    </div>
                </div>
            </section>

            <Footer />
        </div>
    )
}
