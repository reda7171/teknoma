import type { Metadata } from 'next'
import Image from 'next/image'
import { ArrowRight, BookOpen, Clock, Lightbulb, Sparkles } from 'lucide-react'
import Header from '@/components/HeaderWithUser'
import Footer from '@/components/Footer'
import { Link } from '@/i18n/routing'
import { prisma } from '@/lib/prisma'
import { normalizeImage } from '@/lib/utils'
import { getCanonicalAlternates } from '@/lib/seo/canonical'

export const revalidate = 3600

const COPY_BY_LOCALE = {
    fr: {
        metaTitle: "Guides de Lecture & Conseils Littéraires | Riwaya",
        metaDesc: "Découvrez nos guides pratiques pour choisir vos romans, livres de développement personnel, business et lectures jeunesse au Maroc.",
        badge: "Sélection Éditoriale",
        h1Start: "Guides de",
        h1Accent: "Lecture.",
        subtitle: "Analyses littéraires, sélections thématiques et conseils d'experts pour réussir chaque lecture.",
        readGuide: "Lire l'article complet",
        helpTitle: "Besoin d'un conseil personnalisé ?",
        helpBody: "Partagez vos derniers coups de cœur avec notre équipe libraire et recevez des recommandations adaptées à votre profil.",
        helpCta: "Parler à un conseiller",
        allArticles: "Explorer tous les articles du blog",
        minRead: "min de lecture",
    },
    en: {
        metaTitle: "Reading Guides & Book Recommendations | Riwaya",
        metaDesc: "Curated reading guides covering fiction, personal development, business books, and children's literature in Morocco.",
        badge: "Editorial Selection",
        h1Start: "Reading",
        h1Accent: "Guides.",
        subtitle: "Editorial essays, thematic reading lists, and practical tips to choose your next book wisely.",
        readGuide: "Read full guide",
        helpTitle: "Looking for tailored recommendations?",
        helpBody: "Tell our booksellers what you enjoyed recently and get curated book suggestions delivered anywhere in Morocco.",
        helpCta: "Contact our team",
        allArticles: "Browse all blog articles",
        minRead: "min read",
    },
    ar: {
        metaTitle: "أدلة القراءة ونصائح اختيار الكتب | رواية",
        metaDesc: "أدلة قراءة متكاملة ومقالات تحليلية لاختيار أفضل الروايات وكتب تطوير الذات والأعمال وكتب الأطفال في المغرب.",
        badge: "اختيارات التحرير",
        h1Start: "أدلة",
        h1Accent: "القراءة.",
        subtitle: "مقالات تحليلية وقوائم قراءة مختارة تساعدك على اختيار كتابك القادم بعناية.",
        readGuide: "اقرأ المقال كاملاً",
        helpTitle: "هل تحتاج إلى ترشيح مخصص لكتابك القادم؟",
        helpBody: "شاركنا اهتماماتك الأدبية وسيرشح لك فريق مكتبة رواية أفضل العناوين المناسبة لذوقك.",
        helpCta: "تواصل مع مستشار القراءة",
        allArticles: "تصفح جميع مقالات المدونة",
        minRead: "دقائق قراءة",
    },
} as const

function getCopy(locale: string) {
    if (locale === 'ar') return COPY_BY_LOCALE.ar
    if (locale === 'en') return COPY_BY_LOCALE.en
    return COPY_BY_LOCALE.fr
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
    const { locale } = await params
    const copy = getCopy(locale)
    return {
        title: copy.metaTitle,
        description: copy.metaDesc,
        alternates: getCanonicalAlternates(`/${locale}/guides`, locale),
    }
}

export default async function BuyingGuidesPage({ params }: { params: Promise<{ locale: string }> }) {
    const { locale } = await params
    const copy = getCopy(locale)
    const targetLang = ['fr', 'ar', 'en'].includes(locale) ? locale : 'fr'

    const posts = await prisma.post
        .findMany({
            where: { published: true, language: targetLang },
            orderBy: [{ isFeatured: 'desc' }, { viewCount: 'desc' }, { publishedAt: 'desc' }],
            take: 6,
            select: {
                id: true,
                slug: true,
                title: true,
                excerpt: true,
                coverImage: true,
                category: true,
                totalReadTime: true,
            },
        })
        .catch(() => [])

    return (
        <div className="min-h-screen bg-pixio-cream">
            <Header />

            <div className="pt-28 pb-16 bg-pixio-beige relative overflow-hidden">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
                    <div className="inline-flex items-center gap-2 px-6 py-2 bg-white rounded-full text-black text-[10px] font-black uppercase tracking-[0.2em] shadow-sm mb-6">
                        <Lightbulb className="w-4 h-4 text-pixio-yellow" />
                        <span>{copy.badge}</span>
                    </div>
                    <h1 className="text-5xl md:text-7xl font-black text-black tracking-tighter mb-6">
                        {copy.h1Start} <span className="text-blue-600 italic">{copy.h1Accent}</span>
                    </h1>
                    <p className="text-gray-600 max-w-2xl mx-auto text-lg font-medium">{copy.subtitle}</p>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {posts.map((post) => (
                        <article
                            key={post.id}
                            className="group bg-white rounded-[2.5rem] overflow-hidden border border-gray-100 hover:shadow-xl transition-all duration-300 flex flex-col"
                        >
                            <div className="relative h-56 overflow-hidden bg-slate-100">
                                <Image
                                    src={post.coverImage ? normalizeImage(post.coverImage) : '/book-placeholder.png'}
                                    alt={post.title}
                                    fill
                                    sizes="(max-width: 768px) 100vw, 33vw"
                                    className="object-cover group-hover:scale-105 transition-transform duration-500"
                                />
                                {post.category && (
                                    <span className="absolute top-4 left-4 px-3 py-1 bg-white/95 rounded-full text-[10px] font-black uppercase tracking-wider text-slate-800 shadow-sm">
                                        {post.category}
                                    </span>
                                )}
                            </div>
                            <div className="p-8 flex-1 flex flex-col justify-between gap-4">
                                <div>
                                    <div className="flex items-center gap-2 text-xs text-gray-400 font-bold mb-2">
                                        <Clock className="w-3.5 h-3.5" />
                                        <span>
                                            {post.totalReadTime || 5} {copy.minRead}
                                        </span>
                                    </div>
                                    <h2 className="text-xl font-black text-black leading-snug mb-3 group-hover:text-blue-600 transition-colors">
                                        {post.title}
                                    </h2>
                                    {post.excerpt && (
                                        <p className="text-gray-600 text-sm font-medium leading-relaxed line-clamp-3">
                                            {post.excerpt}
                                        </p>
                                    )}
                                </div>
                                <Link
                                    href={`/blog/${encodeURIComponent(post.slug)}`}
                                    className="inline-flex items-center gap-2 text-[11px] font-black uppercase tracking-wider text-black group-hover:gap-3 transition-all"
                                >
                                    <span>{copy.readGuide}</span>
                                    <ArrowRight className="w-4 h-4 text-blue-600 rtl:rotate-180" />
                                </Link>
                            </div>
                        </article>
                    ))}
                </div>

                <div className="mt-12 text-center">
                    <Link
                        href="/blog"
                        className="inline-flex items-center gap-2 px-8 py-4 bg-white border border-gray-200 rounded-full text-xs font-black uppercase tracking-widest text-slate-900 hover:bg-slate-50 transition-all shadow-sm"
                    >
                        <BookOpen className="w-4 h-4" />
                        <span>{copy.allArticles}</span>
                    </Link>
                </div>

                {/* Aide éditoriale personnalisée */}
                <div className="mt-16 bg-white p-10 md:p-14 rounded-[3rem] border border-gray-100 flex flex-col lg:flex-row items-center gap-10">
                    <div className="flex-1 space-y-4">
                        <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center">
                            <Sparkles className="w-8 h-8 text-blue-600" />
                        </div>
                        <h2 className="text-3xl font-black text-black tracking-tight">{copy.helpTitle}</h2>
                        <p className="text-gray-600 text-base font-medium leading-relaxed">{copy.helpBody}</p>
                        <Link
                            href="/contact"
                            className="inline-flex items-center justify-center px-8 py-4 bg-black text-white font-black text-xs uppercase tracking-[0.2em] rounded-full hover:bg-slate-800 transition-all"
                        >
                            {copy.helpCta}
                        </Link>
                    </div>
                </div>
            </div>

            <Footer />
        </div>
    )
}
