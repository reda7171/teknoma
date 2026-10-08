import { getPostBySlug, incrementPostViews, getRelatedPosts, getPrevNextPosts } from '@/lib/actions/blog'
import { notFound } from 'next/navigation'
import Image from 'next/image'
import Header from '@/components/HeaderWithUser'
import Footer from '@/components/FooterWithFeatures'
import { Calendar, User, Eye, Tag, MessageSquare, Clock, Pencil, ArrowRight, BookOpen, Quote, Lightbulb, Target, Bookmark, Bot, Sparkles, BadgeCheck, ChevronRight, Home, ShoppingBag } from 'lucide-react'
import { Link } from '@/i18n/routing'
import { Metadata } from 'next'
import { cookies, headers } from 'next/headers'
import remarkHtml from 'remark-html'
import remarkGfm from 'remark-gfm'
import { remark } from 'remark'
import dynamic from 'next/dynamic'
import { prisma } from '@/lib/prisma'

const CommentsSection = dynamic(() => import('@/components/blog/CommentsSection'), { loading: () => <div className="h-32 bg-slate-50 animate-pulse rounded-2xl" /> })
const ShareArticle = dynamic(() => import('@/components/blog/ShareArticle'))
const TableOfContents = dynamic(() => import('@/components/blog/TableOfContents'))
import ArticleMeta from '@/components/blog/ArticleMeta'
import ReadingProgress from '@/components/blog/ReadingProgress'
import PostTimeTracker from '@/components/blog/PostTimeTracker'
import BlogDynamicContent from '@/components/blog/BlogDynamicContent'
const MobileSectionNavigation = dynamic(() => import('@/components/blog/MobileSectionNavigation'))
import FontSizeRegulator from '@/components/blog/FontSizeRegulator'
import { getTranslations } from 'next-intl/server'
import { getSetting } from '@/lib/actions/site-settings'
import AdBanner from '@/components/AdBanner'
import { getLocalizedTitle, generateBookUrl } from '@/lib/i18n-utils'
import { getOgImageUrl, getBaseUrl, normalizeImage } from '@/lib/utils'

export async function generateMetadata({ params }: { params: Promise<{ slug: string; locale: string }> }): Promise<Metadata> {
    const { slug: rawSlug, locale } = await params
    const decodedSlug = decodeURIComponent(rawSlug)
    const post = await getPostBySlug(decodedSlug, locale)

    if (!post) return {}

    const siteUrl = getBaseUrl()
    const canonicalUrl = `${siteUrl}/${locale}/blog/${decodedSlug}`
    const fallbackApiUrl = `${siteUrl}/api/blog/${post.id}/image`
    const imageUrl = post.coverImage ? getOgImageUrl(post.coverImage, siteUrl, fallbackApiUrl) : null

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
            images: imageUrl ? [{ url: imageUrl, width: 1200, height: 630, alt: post.title }] : [],
        },
        twitter: {
            card: 'summary_large_image',
            title: post.title,
            description: post.excerpt || post.title,
            images: imageUrl ? [imageUrl] : [],
        },
        alternates: { canonical: canonicalUrl },
    }
}

// Calcule le temps de lecture estimé
function estimateReadingTime(content: string): number {
    const words = content.trim().split(/\s+/).length
    return Math.max(1, Math.ceil(words / 200))
}

function getDisplayAuthor(name: string | null | undefined, locale: string): string {
    let author = name || (locale === 'ar' ? 'فريق رواية' : locale === 'en' ? 'Riwaya Team' : 'Équipe Riwaya');
    if (author.toLowerCase() === 'admin') {
        return locale === 'ar' ? 'مشرف' : locale === 'en' ? 'Moderator' : 'Modérateur';
    }
    return author;
}

export default async function BlogPostPage({ params }: { params: Promise<{ slug: string; locale: string }> }) {
    const { slug: rawSlug, locale } = await params
    const decodedSlug = decodeURIComponent(rawSlug)
    const post = await getPostBySlug(decodedSlug, locale)
    const t = await getTranslations('BlogArticle')
    const tPost = await getTranslations({ locale: post?.language || 'fr', namespace: 'BlogArticle' })

    if (!post) notFound()

    const headersList = await headers()
    const country = headersList.get('cf-ipcountry') || headersList.get('x-vercel-ip-country') || 'Inconnu'
    await incrementPostViews(post.id, country)

    const cookieStore = await cookies()
    const adminRole = cookieStore.get('admin-role')?.value
    const isAdmin = adminRole === 'ADMIN'

    const displayAuthor = getDisplayAuthor(post.authorName || post.author?.fullName, locale);

    // Convertir markdown → HTML et réparer quelques soucis de formattage
    let rawContent = post.content || '';
    // Si l'utilisateur a écrit des tirets directement sans saut de ligne correct
    rawContent = rawContent.replace(/<br>\s*-/g, '\n-');
    
    const processedContent = await remark()
        .use(remarkGfm)
        .use(remarkHtml, { sanitize: false })
        .process(rawContent)
    let contentHtml = processedContent.toString()

    if (process.env.NODE_ENV === 'development') {
        contentHtml = contentHtml.replace(/src="\/uploads\//g, 'src="https://riwaya.store/uploads/')
    }

    // Mettre en gras le premier groupe de mots avant deux-points dans les listes
    contentHtml = contentHtml.replace(/<li>([^<]{2,60}?)\s*:/g, '<li><strong>$1</strong> :');


    // Add unique IDs to h2 and h3 tags
    const usedIds = new Set<string>();
    contentHtml = contentHtml.replace(/<(h[23])>(.*?)<\/\1>/g, (match, tag, text) => {
        const cleanText = text.replace(/<[^>]+>/g, '');
        let baseId = cleanText.toLowerCase().replace(/[^a-z0-9\u0600-\u06FF]+/g, '-').replace(/(^-|-$)+/g, '');
        if (!baseId) baseId = `section`;
        
        let finalId = baseId;
        let counter = 1;
        while (usedIds.has(finalId)) {
            finalId = `${baseId}-${counter}`;
            counter++;
        }
        usedIds.add(finalId);
        
        return `<${tag} id="${finalId}">${text}</${tag}>`;
    });

    const tags = post.tags ? post.tags.split(',').map(t => t.trim()).filter(Boolean) : []
    const readingTime = estimateReadingTime(post.content)

    // Articles similaires + config AdSense
    const [relatedPosts, adsenseEnabled, adsensePublisherId, slotTop, slotBottom, { prev: prevPost, next: nextPost }] = await Promise.all([
        getRelatedPosts(post.id, post.category, locale, 4),
        getSetting('adsense_enabled').then(v => v === 'true'),
        getSetting('adsense_publisher_id').then(v => v || ''),
        getSetting('adsense_slot_article_top').then(v => v || ''),
        getSetting('adsense_slot_article_bottom').then(v => v || ''),
        getPrevNextPosts(post.id, post.publishedAt || new Date(), locale)
    ])

    // Récupérer le livre lié à l'article
    let linkedBook: {
        id: string
        title: string
        author: string
        price: number
        image: string
        stock: number
        description: string
        bestChapters: string | null
        bestFor: string | null
        bestLessons: string | null
        bestQuote: string | null
    } | null = post.books?.[0] ?? null
    if (!linkedBook) {
        const searchKeyword = post.title.split(/[:–—\-]/)[0]?.trim()
        if (searchKeyword && searchKeyword.length >= 3) {
            linkedBook = await prisma.book.findFirst({
                where: {
                    title: { contains: searchKeyword },
                    active: true
                },
                select: {
                    id: true,
                    title: true,
                    author: true,
                    price: true,
                    image: true,
                    stock: true,
                    description: true,
                    bestChapters: true,
                    bestFor: true,
                    bestLessons: true,
                    bestQuote: true,
                }
            })
        }
    }

    return (
        <div className="min-h-screen bg-white" id="article-page">
            <ReadingProgress />
            <PostTimeTracker postId={post.id} />
            <MobileSectionNavigation language={locale} />
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
                                    "name": displayAuthor,
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
                            "abstract": post.excerpt || post.title,
                            "about": {
                                "@type": "Thing",
                                "name": post.category || "Littérature",
                                "description": "Article publié par Riwaya, la 1ère plateforme de livres au Maroc."
                            },
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
                                            ? `كتب هذا المقال ${displayAuthor}. يمكنك قراءة المزيد من مقالاتنا على مدونة رواية.`
                                            : locale === 'en'
                                                ? `This article was written by ${displayAuthor}. You can read more articles on the Riwaya blog.`
                                                : `Cet article a été rédigé par ${displayAuthor}. Vous pouvez lire plus d'articles sur le blog Riwaya.`
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
                            unoptimized
                        />
                    </div>
                )}

                <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-4 pb-4 md:pt-6 md:pb-6">
                    {/* Call to action vers le livre lié à l'article */}
                    {linkedBook && (
                        <div className="mb-4 sm:mb-6 bg-white/95 backdrop-blur-md border border-amber-200/90 rounded-2xl p-4 sm:p-5 shadow-sm hover:shadow-md transition-all overflow-hidden">
                            <div className="flex flex-col md:flex-row items-center justify-between gap-4 md:gap-6">
                                <div className="w-full md:flex-1 min-w-0 flex flex-col md:flex-row items-center gap-4 text-center md:text-start rtl:md:text-right">
                                    {/* Cover en grande taille seule sur la 1ère ligne en mobile */}
                                    <div className="relative w-36 h-52 sm:w-44 sm:h-64 md:w-16 md:h-24 shrink-0 rounded-2xl md:rounded-xl overflow-hidden shadow-lg md:shadow bg-slate-50 border border-slate-100 mx-auto md:mx-0">
                                        <Image
                                            src={normalizeImage(linkedBook.image)}
                                            alt={linkedBook.title}
                                            fill
                                            className="object-cover"
                                            sizes="(max-width: 768px) 180px, 64px"
                                            priority
                                        />
                                    </div>
                                    {/* Informations sous la cover en mobile */}
                                    <div className="flex-1 min-w-0 flex flex-col items-center md:items-start w-full">
                                        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] sm:text-xs font-black uppercase tracking-wider bg-amber-50 text-amber-900 border border-amber-200 mb-1.5">
                                            <Sparkles className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                                            <span className="truncate">
                                                {locale === 'ar' ? 'الكتاب موضوع هذا المقال' : locale === 'en' ? 'Book featured in this article' : 'Livre présenté dans cet article'}
                                            </span>
                                        </div>
                                        <h3 className="text-lg sm:text-xl font-black text-slate-900 line-clamp-2 w-full">
                                            {linkedBook.title}
                                        </h3>
                                        <p className="text-xs sm:text-sm text-slate-500 font-bold truncate mt-0.5 w-full">
                                            {linkedBook.author}
                                        </p>
                                        <div className="flex items-center justify-center md:justify-start gap-2.5 mt-2 flex-wrap">
                                            <span className="text-base sm:text-lg font-black text-slate-900 whitespace-nowrap">
                                                {linkedBook.price} {locale === 'ar' ? 'درهم' : 'DH'}
                                            </span>
                                            <span className="text-[11px] sm:text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-md font-bold whitespace-nowrap">
                                                {locale === 'ar' ? 'متوفر • الدفع عند الاستلام' : 'En stock • COD'}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                                <div className="w-full md:w-auto shrink-0 flex items-center justify-center md:justify-end">
                                    <Link
                                        href={generateBookUrl(linkedBook, locale)}
                                        className="w-full md:w-auto inline-flex items-center justify-center gap-2.5 px-6 sm:px-7 py-3 sm:py-3.5 bg-black hover:bg-slate-800 text-white text-xs sm:text-sm font-black uppercase tracking-wider rounded-xl shadow-md hover:shadow-xl hover:-translate-y-0.5 transition-all whitespace-nowrap shrink-0"
                                    >
                                        <ShoppingBag className="w-4 h-4 text-amber-400 shrink-0" />
                                        <span>
                                            {locale === 'ar' ? 'اطلب نسختك الآن' : locale === 'en' ? 'Order your copy' : 'Commander le livre'}
                                        </span>
                                        <ArrowRight className="w-4 h-4 rtl:rotate-180 shrink-0" />
                                    </Link>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Fil d'Ariane + btn admin */}
                    <div className="flex flex-wrap items-center justify-between gap-4 mb-6 md:mb-8">
                        <nav className="flex items-center gap-2 sm:gap-3 text-xs sm:text-sm font-bold uppercase tracking-widest rtl:tracking-normal text-slate-500 overflow-x-auto no-scrollbar py-1.5 px-4 bg-white/70 backdrop-blur-md rounded-full border border-slate-200 shadow-sm">
                            <Link href="/blog" className="flex items-center gap-1.5 hover:text-slate-900 transition-colors whitespace-nowrap shrink-0">
                                <Home className="w-3 h-3" />
                                {t('Blog')}
                            </Link>
                            
                            <ChevronRight className="w-3 h-3 text-slate-300 flex-shrink-0 rtl:rotate-180" />
                            
                            {post.category && (
                                <>
                                    <Link href={`/blog?category=${encodeURIComponent(post.category)}`} className="hover:text-slate-900 transition-colors whitespace-nowrap shrink-0">
                                        {post.category}
                                    </Link>
                                    <ChevronRight className="w-3 h-3 text-slate-300 flex-shrink-0 rtl:rotate-180" />
                                </>
                            )}
                            <span className="text-slate-900 truncate max-w-[150px] md:max-w-[250px] lg:max-w-[350px]">
                                {post.title}
                            </span>
                        </nav>

                        {isAdmin && (
                            <Link
                                href={`/admin/posts/${post.id}`}
                                className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-900 text-[10px] rtl:text-xs font-black uppercase tracking-widest rtl:tracking-normal rounded-full hover:bg-slate-50 transition-all shadow-sm"
                            >
                                <Pencil className="w-3 h-3 text-slate-600" />
                                {t('Edit')}
                            </Link>
                        )}
                    </div>

                    {/* Catégorie badge */}
                    {post.category && (
                        <div className="mb-4 md:mb-6">
                            <Link
                                href={`/blog?category=${post.category}`}
                                className="inline-block px-4 py-1.5 bg-slate-50 text-slate-600 text-xs sm:text-sm font-black uppercase tracking-widest rtl:tracking-normal rounded-full hover:bg-slate-100 transition-colors"
                            >
                                {post.category}
                            </Link>
                        </div>
                    )}

                    {/* Titre principal */}
                    <h1 dir={post.language === 'ar' ? 'rtl' : 'ltr'} className={`text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-black text-slate-900 mb-4 md:mb-6 max-w-4xl break-words ${post.language === 'ar' ? 'font-tajawal text-right leading-[1.4]' : 'text-left leading-[1.3] md:leading-[1.2] tracking-tighter'}`}>
                        {post.title}
                    </h1>

                    {/* Régulateur de police */}
                    <div className="mb-6 flex md:hidden">
                        <FontSizeRegulator />
                    </div>

                    {/* Extrait */}
                    {post.excerpt && (
                        <p dir={post.language === 'ar' ? 'rtl' : 'ltr'} className={`text-base sm:text-lg md:text-xl text-slate-500 mb-6 md:mb-8 max-w-3xl font-medium ${post.language === 'ar' ? 'font-tajawal text-right leading-[1.8]' : 'text-left leading-relaxed'}`}>
                            {post.excerpt}
                        </p>
                    )}

                    {/* Méta avec nouveau composant ArticleMeta */}
                    <ArticleMeta 
                        author={post.author}
                        authorName={post.authorName}
                        displayAuthor={displayAuthor}
                        publishedAt={post.publishedAt}
                        locale={locale}
                        readingTime={readingTime}
                        viewCount={post.viewCount}
                        commentsCount={post._count?.comments}
                        translations={{
                            MinRead: t('MinRead'),
                            Views: t('Views'),
                            Comments: t('Comments')
                        }}
                    />
                </div>
            </section>

            {/* === IMAGE COVER grande === */}
            {post.coverImage && (
                <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 mt-4 md:mt-8 mb-8 md:mb-16">
                    <div className="relative group">
                        {/* Decorative background blocks for editorial look */}
                        <div className="absolute inset-0 bg-black rounded-3xl md:rounded-[2rem] rotate-1 group-hover:rotate-2 transition-transform duration-700 opacity-5 shadow-2xl hidden md:block" />
                        <div className="absolute inset-0 bg-gray-200 rounded-3xl md:rounded-[2rem] -rotate-1 group-hover:-rotate-2 transition-transform duration-700 opacity-20 hidden md:block" />
                        
                        {/* Main Container - Rounded on mobile, larger on desktop */}
                        <div className="relative h-[250px] sm:h-[300px] md:h-auto md:aspect-[21/9] w-full overflow-hidden rounded-2xl md:rounded-[2rem] md:border-8 border-white bg-slate-50 shadow-sm md:shadow-2xl md:shadow-black/10 group-hover:-translate-y-1 transition-transform duration-700">
                            {/* Blurred Ambient Background */}
                            <div className="absolute inset-0 z-0">
                                <Image
                                    src={normalizeImage(post.coverImage)}
                                    alt=""
                                    fill
                                    className="object-cover opacity-30 blur-[40px] scale-125 saturate-150"
                                    unoptimized
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-slate-100/50 to-transparent" />
                            </div>
                            
                            {/* Foreground Image */}
                            <Image
                                src={normalizeImage(post.coverImage)}
                                alt={post.title}
                                fill
                                className="object-cover md:object-contain z-10 md:drop-shadow-2xl group-hover:scale-105 transition-transform duration-700"
                                priority
                                unoptimized
                            />
                            
                            {/* Inner highlight (Desktop only) */}
                            <div className="hidden md:block absolute inset-0 ring-1 ring-inset ring-black/5 rounded-[1.5rem] pointer-events-none z-20" />
                        </div>
                    </div>
                </div>
            )}

            {/* === CONTENU PRINCIPAL === */}
            <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-4 md:py-12 lg:py-16 pb-32">
                {/* Desktop Layout : 12 colonnes */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 xl:gap-16 items-start">

                    {/* Colonne article (8 colonnes sur Desktop) */}
                    <div className="lg:col-span-8 w-full min-w-0">
                        {/* AdSense haut */}
                        {adsenseEnabled && (
                            <AdBanner
                                publisherId={adsensePublisherId}
                                slotId={slotTop}
                                label="Haut de l'article"
                            />
                        )}

                        {/* Corps de l'article */}
                        <article
                            id="article-content"
                            dir={post.language === 'ar' ? 'rtl' : 'ltr'}
                            className={`prose max-w-none break-words
                                prose-headings:font-black prose-headings:text-slate-900
                                prose-h2:pb-4 prose-h2:border-b prose-h2:border-gray-100
                                prose-a:text-slate-600 prose-a:font-semibold prose-a:no-underline prose-a:border-b-2 prose-a:border-slate-600 hover:prose-a:bg-slate-50 prose-a:transition-colors
                                prose-strong:text-slate-900 prose-strong:font-black
                                prose-code:bg-gray-100 prose-code:px-2 prose-code:py-0.5 prose-code:rounded-md prose-code:text-sm prose-code:text-rose-600 prose-code:break-all
                                prose-pre:bg-slate-900 prose-pre:rounded-2xl prose-pre:shadow-xl prose-pre:my-8 prose-pre:overflow-x-auto
                                prose-img:rounded-xl md:prose-img:rounded-2xl prose-img:shadow-lg prose-img:mx-auto prose-img:my-8 md:prose-img:my-10 prose-img:w-full prose-img:object-cover
                                prose-ul:space-y-3 prose-ol:space-y-3 prose-ul:mb-8 prose-ol:mb-8 prose-ul:pl-4 prose-ol:pl-4
                                prose-li:text-slate-800 prose-li:mb-4
                                prose-blockquote:bg-slate-50 prose-blockquote:py-4 prose-blockquote:px-6 prose-blockquote:not-italic prose-blockquote:font-medium prose-blockquote:text-slate-700 prose-blockquote:shadow-sm
                                    ${post.language === 'ar' 
                                        ? 'font-tajawal text-right text-[20px] md:text-[24px] leading-[1.9] md:leading-[2.3] prose-h2:font-black prose-h3:font-black prose-p:font-bold prose-li:font-bold prose-h2:!text-[36px] md:prose-h2:!text-[48px] prose-h3:!text-[30px] md:prose-h3:!text-[38px] prose-p:!text-[22px] md:prose-p:!text-[28px] prose-p:leading-[2.1] md:prose-p:leading-[2.4] prose-li:text-[22px] md:prose-li:text-[26px] prose-li:leading-[2.1] md:prose-li:leading-[2.4] prose-blockquote:border-r-4 prose-blockquote:border-slate-800 prose-blockquote:rounded-l-2xl' 
                                        : 'prose-xl text-left prose-headings:tracking-tight prose-h2:!text-3xl md:prose-h2:!text-4xl lg:prose-h2:!text-5xl prose-h3:!text-2xl md:prose-h3:!text-3xl prose-p:leading-[2] md:prose-p:leading-[2.2] prose-p:!text-[22px] md:prose-p:!text-[26px] prose-p:font-medium prose-li:leading-[2] md:prose-li:leading-[2.2] prose-li:font-medium prose-li:!text-[20px] md:prose-li:!text-[24px] prose-blockquote:border-l-4 prose-blockquote:border-slate-800 prose-blockquote:rounded-r-2xl'}`}
                        >
                            {/* === GEO: AI TL;DR Summary === */}
                            {post.excerpt && (
                                <section aria-label="Résumé de l'article pour l'IA" className="not-prose mb-10 p-6 bg-emerald-50/50 border border-emerald-100/50 rounded-3xl relative overflow-hidden">
                                    <div className="absolute top-0 right-0 p-4 opacity-[0.03] pointer-events-none">
                                        <Bot className="w-24 h-24 text-emerald-900" />
                                    </div>
                                    <h2 className="text-xs md:text-sm font-black uppercase tracking-widest text-emerald-800 mb-3 flex items-center gap-2">
                                        <Sparkles className="w-4 h-4 text-emerald-600" /> 
                                        {locale === 'ar' ? 'نظرة سريعة (TL;DR)' : locale === 'en' ? 'Quick Summary (TL;DR)' : 'Résumé Rapide (TL;DR)'}
                                    </h2>
                                    <div className="text-emerald-950/80 font-medium leading-relaxed relative z-10 text-[15px] md:text-[17px]">
                                        {post.excerpt}
                                    </div>
                                </section>
                            )}

                            {/* Sommaire / TOC (Mobile Uniquement) */}
                            <div className="not-prose lg:hidden">
                                <TableOfContents language={post.language} />
                            </div>

                            {(() => {
                                if (post.books && post.books.length > 0) {
                                    // Diviser par H2 pour injecter le CTA au milieu (avant le 2ème H2 s'il existe)
                                    const h2Parts = contentHtml.split(/(<h2[^>]*>.*?<\/h2>)/gi);
                                    if (h2Parts.length >= 5) { // Au moins 2 H2 (0: texte, 1: H2, 2: texte, 3: H2, 4: texte...)
                                        const part1 = h2Parts.slice(0, 3).join('');
                                        const part2 = h2Parts.slice(3).join('');
                                        return (
                                            <>
                                                <BlogDynamicContent html={part1} />
                                                
                                                {/* === CTA Interne (Mobile & Desktop) === */}
                                                <div className="not-prose my-12 p-8 md:p-10 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 rounded-[2.5rem] shadow-[0_20px_50px_-12px_rgba(0,0,0,0.3)] relative overflow-hidden group transform hover:-translate-y-1 transition-all duration-500 border border-slate-700/50">
                                                    {/* Background decorative elements */}
                                                    <div className="absolute top-0 right-0 -mr-20 -mt-20 w-64 h-64 bg-emerald-500/10 rounded-full blur-[80px] group-hover:bg-emerald-500/20 transition-colors duration-700" />
                                                    <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-64 h-64 bg-blue-500/10 rounded-full blur-[80px] group-hover:bg-blue-500/20 transition-colors duration-700" />
                                                    
                                                    <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-8">
                                                        <div className="text-center md:text-start flex-1 space-y-3">
                                                            <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/10 rounded-full text-white/80 text-[10px] uppercase tracking-widest font-black backdrop-blur-sm border border-white/10 mb-2">
                                                                <Sparkles className="w-3 h-3 text-emerald-400" />
                                                                {locale === 'ar' ? 'تشكيلة مميزة' : locale === 'en' ? 'Special Selection' : 'Sélection Spéciale'}
                                                            </div>
                                                            <h4 className="text-2xl md:text-3xl font-black text-white leading-tight">
                                                                {locale === 'ar' ? 'اكتشف تشكيلتنا من الكتب' : locale === 'en' ? 'Discover our book selection' : 'Découvrez notre sélection de livres'}
                                                            </h4>
                                                            <p className="text-slate-300/90 text-sm md:text-base font-medium max-w-lg">
                                                                {locale === 'ar' ? 'كتب مختارة بعناية لتناسب جميع الأذواق وبأفضل الأسعار.' : locale === 'en' ? 'Carefully selected books for all tastes at the best prices.' : 'Des livres soigneusement sélectionnés pour tous les goûts aux meilleurs prix.'}
                                                            </p>
                                                        </div>
                                                        <a 
                                                            href="#recommended-books" 
                                                            className="relative overflow-hidden inline-flex items-center gap-3 px-8 py-4 bg-white text-slate-900 text-sm md:text-base font-black uppercase tracking-wider rounded-full hover:scale-105 active:scale-95 transition-all shadow-[0_0_40px_-10px_rgba(255,255,255,0.3)] flex-shrink-0 group/btn"
                                                        >
                                                            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent -translate-x-full group-hover/btn:animate-[shimmer_1.5s_infinite]" />
                                                            <BookOpen className="w-5 h-5 transition-transform group-hover/btn:-rotate-12" />
                                                            <span className="relative z-10">{t('Discover')}</span>
                                                        </a>
                                                    </div>
                                                </div>

                                                <BlogDynamicContent html={part2} />
                                            </>
                                        );
                                    }
                                }
                                return <BlogDynamicContent html={contentHtml} />;
                            })()}
                        </article>

                        {/* AdSense bas */}
                        {adsenseEnabled && (
                            <AdBanner
                                publisherId={adsensePublisherId}
                                slotId={slotBottom}
                                label="Bas de l'article"
                            />
                        )}

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

                        {/* === Bio Auteur (Mobile Uniquement) === */}
                        {(post.authorName || post.author) && (
                            <Link id="author-bio-mobile" href={post.author?.id ? `/blog/author/${post.author.id}` : `/blog`} className="lg:hidden mt-10 md:mt-16 p-5 md:p-6 bg-white/70 backdrop-blur-xl border border-white/40 rounded-3xl text-slate-900 shadow-[0_8px_30px_rgb(0,0,0,0.04)] relative overflow-hidden group block hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1">
                                <div className="absolute top-0 right-0 w-32 h-32 bg-rose-500/5 rounded-full blur-3xl group-hover:bg-rose-500/15 transition-colors duration-500" />
                                
                                <div className="relative z-10 flex items-start gap-4">
                                    {/* Photo */}
                                    <div className="w-16 h-16 md:w-20 md:h-20 rounded-[1.2rem] bg-white border border-slate-100 overflow-hidden flex-shrink-0 flex items-center justify-center shadow-sm">
                                        {(post.author?.image) ? (
                                            <Image
                                                src={post.author.image}
                                                alt={post.author?.fullName || ''}
                                                width={80}
                                                height={80}
                                                className="object-cover w-full h-full"
                                                unoptimized
                                            />
                                        ) : (
                                            <User className="w-7 h-7 md:w-8 md:h-8 text-slate-300" />
                                        )}
                                    </div>

                                    {/* Infos */}
                                    <div className="flex-1 min-w-0 pt-1">
                                        <div className="flex items-center gap-1.5 mb-1">
                                            <h3 className="text-lg md:text-xl font-black text-slate-800 truncate">{displayAuthor}</h3>
                                            <BadgeCheck className="w-4 h-4 md:w-5 md:h-5 text-blue-500 fill-blue-500/10 shrink-0" />
                                        </div>
                                        <p className="text-xs md:text-sm text-slate-500 font-medium truncate mb-4">
                                            {(!post.authorName && post.author?.bio) ? post.author.bio : (post.author?.editorialRole || t('ModeratorRole'))}
                                        </p>

                                        {/* Statistiques et Lien */}
                                        <div className="flex flex-col gap-2 mt-auto">
                                            {(post.author && post.author._count && 'posts' in post.author._count) && (
                                                <div className="flex items-center gap-2 text-slate-500">
                                                    <Pencil className="w-3.5 h-3.5 text-rose-400" />
                                                    <span className="text-[11px] md:text-xs font-black uppercase tracking-wider">{post.author._count.posts} {t('PublishedArticles')}</span>
                                                </div>
                                            )}
                                            <div className="inline-flex items-center gap-1.5 text-[11px] md:text-xs font-black text-rose-600 uppercase tracking-wider group-hover:text-rose-700 transition-colors">
                                                {t('ViewAllArticles')} <ArrowRight className="w-3.5 h-3.5 rtl:rotate-180 group-hover:translate-x-1 rtl:group-hover:-translate-x-1 transition-transform" />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </Link>
                        )}

                        {/* === Livres Mentionnés (Mobile/Desktop bas d'article) === */}
                        {post.books && post.books.length > 0 && (
                            <div id="recommended-books" className="mt-10 md:mt-12 p-5 md:p-8 bg-slate-50/50 border border-slate-100 rounded-3xl scroll-mt-24">
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
                                                        <p className="text-base md:text-lg font-black text-slate-600">{book.price} درهم</p>
                                                        {book.stock > 0 ? (
                                                            <span className="text-[9px] md:text-[10px] font-bold text-emerald-600 uppercase tracking-widest">{t('InStock')}</span>
                                                        ) : (
                                                            <span className="text-[9px] md:text-[10px] font-bold text-rose-500 uppercase tracking-widest">{t('OutOfStock')}</span>
                                                        )}
                                                    </div>
                                                    <div className="relative overflow-hidden px-5 py-2.5 bg-slate-900 text-white text-[9px] md:text-[10px] font-black uppercase tracking-[0.2em] rounded-full transition-all group-hover:bg-rose-600 group-hover:shadow-[0_0_20px_rgba(225,29,72,0.3)] whitespace-nowrap sm:ml-auto flex items-center justify-center">
                                                        <span className="relative z-10">{t('Discover')}</span>
                                                        {/* Shimmer effect */}
                                                        <div className="absolute inset-0 -translate-x-[100%] bg-gradient-to-r from-transparent via-white/20 to-transparent group-hover:animate-[shimmer_1.5s_infinite]" />
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
                            postTitle={post.title}
                            postCategory={post.category || ''}
                            comments={post.comments || []}
                            totalCount={post._count?.comments || 0}
                        />
                    </div>

                    {/* === Sidebar sticky === */}
                    <aside className="hidden lg:block lg:col-span-4 sticky top-24 space-y-6 lg:space-y-8 h-max pb-8">
                            
                            {/* TOC Desktop */}
                            <div className="bg-white/70 backdrop-blur-xl border border-white/40 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] relative overflow-hidden">
                                <TableOfContents language={post.language} />
                            </div>

                            {/* Bio Auteur (Desktop) */}
                            {(post.authorName || post.author) && (
                                <Link id="author-bio-desktop" href={post.author?.id ? `/blog/author/${post.author.id}` : `/blog`} className="p-6 bg-white/70 backdrop-blur-xl border border-white/40 rounded-3xl text-slate-900 shadow-[0_8px_30px_rgb(0,0,0,0.04)] relative overflow-hidden group block hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1">
                                    <div className="absolute top-0 right-0 w-32 h-32 bg-rose-500/5 rounded-full blur-3xl group-hover:bg-rose-500/15 transition-colors duration-500" />
                                    <p className="relative z-10 text-[10px] rtl:text-xs font-black uppercase tracking-[0.3em] rtl:tracking-normal text-slate-400 mb-5">{t('AboutAuthor')}</p>
                                    
                                    <div className="relative z-10 flex items-start gap-4">
                                        {/* Photo */}
                                        <div className="w-16 h-16 rounded-[1.2rem] bg-white border border-slate-100 overflow-hidden flex-shrink-0 flex items-center justify-center shadow-sm">
                                            {(post.author?.image) ? (
                                                <Image
                                                    src={post.author.image}
                                                    alt={post.author?.fullName || ''}
                                                    width={80}
                                                    height={80}
                                                    className="object-cover w-full h-full"
                                                    unoptimized
                                                />
                                            ) : (
                                                <User className="w-7 h-7 text-slate-300" />
                                            )}
                                        </div>

                                        {/* Infos */}
                                        <div className="flex-1 min-w-0 pt-1">
                                            <div className="flex items-center gap-1.5 mb-1">
                                                <h3 className="text-lg font-black text-slate-800 truncate">{displayAuthor}</h3>
                                                <BadgeCheck className="w-4 h-4 text-blue-500 fill-blue-500/10 shrink-0" />
                                            </div>
                                            <p className="text-xs text-slate-500 font-medium truncate mb-4">
                                                {(!post.authorName && post.author?.bio) ? post.author.bio : (post.author?.editorialRole || t('ModeratorRole'))}
                                            </p>

                                            {/* Statistiques et Lien */}
                                            <div className="flex flex-col gap-2 mt-auto">
                                                {(post.author && post.author._count && 'posts' in post.author._count) && (
                                                    <div className="flex items-center gap-2 text-slate-500">
                                                        <Pencil className="w-3.5 h-3.5 text-rose-400" />
                                                        <span className="text-[11px] font-black uppercase tracking-wider">{post.author._count.posts} {t('PublishedArticles')}</span>
                                                    </div>
                                                )}
                                                <div className="inline-flex items-center gap-1.5 text-[11px] font-black text-rose-600 uppercase tracking-wider group-hover:text-rose-700 transition-colors">
                                                    {t('ViewAllArticles')} <ArrowRight className="w-3.5 h-3.5 rtl:rotate-180 group-hover:translate-x-1 rtl:group-hover:-translate-x-1 transition-transform" />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </Link>
                            )}

                            {/* Partage */}
                            <div className="bg-white/70 backdrop-blur-xl border border-white/40 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-6 relative overflow-hidden group">
                                <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 rounded-full blur-3xl group-hover:bg-blue-500/10 transition-colors duration-500" />
                                <p className="relative z-10 text-[10px] rtl:text-xs font-black uppercase tracking-[0.3em] rtl:tracking-normal text-slate-400 mb-4">{tPost('ShareArticle')}</p>
                                <div className="flex flex-col gap-3">
                                    <ShareArticle title={post.title} vertical translations={{
                                        facebook: tPost('Share.Facebook'),
                                        twitter: tPost('Share.Twitter'),
                                        linkedin: tPost('Share.LinkedIn'),
                                        whatsapp: tPost('Share.WhatsApp'),
                                        copyLink: tPost('Share.CopyLink'),
                                        linkCopied: tPost('Share.LinkCopied'),
                                        shareTitle: tPost('ShareTitle')
                                    }} />
                                </div>
                            </div>

                            {/* Méta article */}
                            <div className="bg-slate-50 border border-slate-100 rounded-3xl p-6 text-slate-900">
                                <p className="text-[10px] rtl:text-xs font-black uppercase tracking-[0.3em] rtl:tracking-normal text-slate-400 mb-5">{tPost('ArticleInfo')}</p>
                                <div className="space-y-4">
                                    <div className="flex items-center gap-3 text-sm">
                                        <div className="w-8 h-8 rounded-xl bg-white border border-slate-200 flex items-center justify-center flex-shrink-0">
                                            <Clock className="w-3.5 h-3.5 text-slate-500" />
                                        </div>
                                        <div>
                                            <p className="text-[10px] rtl:text-xs text-slate-400 font-bold uppercase tracking-wider rtl:tracking-normal">{tPost('Reading')}</p>
                                            <p className="font-bold">{readingTime} {tPost('Minutes')}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3 text-sm">
                                        <div className="w-8 h-8 rounded-xl bg-white border border-slate-200 flex items-center justify-center flex-shrink-0">
                                            <Eye className="w-3.5 h-3.5 text-slate-500" />
                                        </div>
                                        <div>
                                            <p className="text-[10px] rtl:text-xs text-slate-400 font-bold uppercase tracking-wider rtl:tracking-normal">{tPost('Views')}</p>
                                            <p className="font-bold">{post.viewCount.toLocaleString()}</p>
                                        </div>
                                    </div>
                                    {post._count?.comments > 0 && (
                                        <div className="flex items-center gap-3 text-sm">
                                            <div className="w-8 h-8 rounded-xl bg-white border border-slate-200 flex items-center justify-center flex-shrink-0">
                                                <MessageSquare className="w-3.5 h-3.5 text-slate-500" />
                                            </div>
                                            <div>
                                                <p className="text-[10px] rtl:text-xs text-slate-400 font-bold uppercase tracking-wider rtl:tracking-normal">{tPost('Comments')}</p>
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
                                                <p className="text-[10px] rtl:text-xs text-slate-400 font-bold uppercase tracking-wider rtl:tracking-normal">{tPost('PublishedOn')}</p>
                                                <p className="font-bold">{new Date(post.publishedAt).toLocaleDateString(post.language === 'ar' ? 'ar-MA' : post.language === 'fr' ? 'fr-FR' : 'en-US', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Tags sidebar */}
                            {tags.length > 0 && (
                                <div className="bg-gray-50 rounded-3xl p-6">
                                    <p className="text-[10px] rtl:text-xs font-black uppercase tracking-[0.3em] rtl:tracking-normal text-gray-400 mb-4">{tPost('Tags')}</p>
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
                                        {tPost('InThisArticle')}
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
                                                    <p className="text-xs font-black text-slate-600 mt-1">{book.price} درهم</p>
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
                                    <p className="text-[10px] rtl:text-xs font-black uppercase tracking-[0.2em] rtl:tracking-normal text-slate-400 mb-1">{tPost('Explore')}</p>
                                    <p className="font-black text-slate-900 text-sm">{tPost('AllArticles')}</p>
                                </div>
                                <div className="w-9 h-9 bg-slate-600 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform shadow-sm">
                                    <BookOpen className="w-4 h-4 text-white" />
                                </div>
                            </Link>
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
                                    className="group bg-white rounded-3xl overflow-hidden border border-slate-100 shadow-sm hover:shadow-xl transition-all duration-500 flex flex-col"
                                >
                                    <div className="relative aspect-[4/3] overflow-hidden bg-slate-50">
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
                                            <div className="flex items-center gap-2">
                                                {related.author?.image ? (
                                                    <Image src={related.author.image} alt={related.author.fullName || ''} width={36} height={36} className="rounded-full w-9 h-9 object-cover ring-2 ring-slate-50" unoptimized />
                                                ) : (
                                                    <div className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center ring-2 ring-slate-50">
                                                        <User className="w-4 h-4 text-slate-400" />
                                                    </div>
                                                )}
                                                <div className="flex flex-col">
                                                    <div className="flex items-center gap-1">
                                                        <span className="text-xs font-bold text-slate-700">{getDisplayAuthor(related.authorName || related.author?.fullName, locale)}</span>
                                                        <BadgeCheck className="w-3.5 h-3.5 text-blue-500 fill-blue-500/10 shrink-0" />
                                                    </div>
                                                    <span className="text-[10px] text-slate-400 capitalize font-medium leading-none mt-0.5">
                                                        {locale === 'ar' ? 'مشرف المدونة' : locale === 'en' ? 'Blog Moderator' : 'Modérateur blog'}
                                                    </span>
                                                </div>
                                            </div>
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
                                {locale === 'ar' ? `كاتب هذا المقال هو ${post.author?.fullName || 'رواية'}.` : locale === 'en' ? `This article was written by ${post.author?.fullName || 'Riwaya'}.` : `Cet article a été écrit par ${post.author?.fullName || 'Riwaya'}.`}
                            </p>
                        </div>
                    </div>
                </div>
            </section>

            <Footer />
            
            {/* === Navigation Article Précédent / Suivant === */}
            {(prevPost || nextPost) && (
                <nav className="bg-white border-t border-slate-100" aria-label={locale === 'ar' ? 'تصفح المقالات' : locale === 'en' ? 'Article navigation' : 'Navigation articles'}>
                    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-0">
                        <div className="grid grid-cols-1 sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x divide-slate-100">

                            {/* Article précédent */}
                            {prevPost ? (
                                <Link
                                    href={`/blog/${prevPost.slug}`}
                                    className="group flex items-center gap-4 p-6 sm:p-8 hover:bg-slate-50 transition-all border-b-4 border-transparent hover:border-amber-400"
                                >
                                    <div className="w-10 h-10 rounded-2xl bg-slate-100 flex items-center justify-center flex-shrink-0 group-hover:bg-slate-900 transition-colors">
                                        <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-white rotate-180 rtl:rotate-0 transition-colors" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-1">
                                            {locale === 'ar' ? 'المقال السابق' : locale === 'en' ? 'Previous article' : 'Article précédent'}
                                        </p>
                                        <p className="font-black text-slate-900 text-sm leading-snug line-clamp-2 group-hover:text-slate-600 transition-colors">
                                            {prevPost.title}
                                        </p>
                                    </div>
                                </Link>
                            ) : (
                                <div />
                            )}

                            {/* Article suivant */}
                            {nextPost ? (
                                <Link
                                    href={`/blog/${nextPost.slug}`}
                                    className="group flex items-center gap-4 p-6 sm:p-8 hover:bg-slate-50 transition-all sm:flex-row-reverse sm:text-right rtl:sm:flex-row rtl:sm:text-left border-b-4 border-transparent hover:border-amber-400"
                                >
                                    <div className="w-10 h-10 rounded-2xl bg-slate-100 flex items-center justify-center flex-shrink-0 group-hover:bg-slate-900 transition-colors">
                                        <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-white rtl:rotate-180 transition-colors" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-1">
                                            {locale === 'ar' ? 'المقال التالي' : locale === 'en' ? 'Next article' : 'Article suivant'}
                                        </p>
                                        <p className="font-black text-slate-900 text-sm leading-snug line-clamp-2 group-hover:text-slate-600 transition-colors">
                                            {nextPost.title}
                                        </p>
                                    </div>
                                </Link>
                            ) : (
                                <div />
                            )}

                        </div>
                    </div>
                </nav>
            )}
            
            {/* === Mobile Sticky Share Bar === */}
            <div className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-xl border-t border-slate-200/50 p-3 shadow-[0_-10px_40px_-15px_rgba(0,0,0,0.1)] pb-safe">
                <div className="flex items-center justify-center w-full">
                    <ShareArticle title={post.title} />
                </div>
            </div>

        </div>
    )
}
