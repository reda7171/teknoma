import { getAllPosts } from '@/lib/actions/blog'
import Link from 'next/link'
import { Plus, Edit, FileText, Globe, TrendingUp } from 'lucide-react'
import AdminPostsTable from '@/components/admin/AdminPostsTable'
import { prisma } from '@/lib/prisma'

export default async function AdminPostsPage({
    params,
    searchParams
}: {
    params: Promise<{ locale: string }>,
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
    const { locale } = await params
    const searchParamsValues = await searchParams
    const page = typeof searchParamsValues.page === 'string' ? parseInt(searchParamsValues.page) : 1
    const search = typeof searchParamsValues.search === 'string' ? searchParamsValues.search : undefined

    const contentLang = typeof searchParamsValues.lang === 'string' ? searchParamsValues.lang : locale;
    const { posts, pagination } = await getAllPosts(page, 20, search, contentLang)

    const langCountsRaw = await prisma.post.groupBy({
        by: ['language'],
        _count: { id: true }
    })
    const langCounts = langCountsRaw.reduce((acc, curr) => {
        acc[curr.language] = curr._count.id
        return acc
    }, {} as Record<string, number>)

    // Calculate total views using Prisma
    const totalViewsAgg = await prisma.post.aggregate({
        _sum: { viewCount: true }
    })
    const totalViews = totalViewsAgg._sum.viewCount || 0

    return (
        <div className="space-y-12">
            {/* Header section style Riwaya */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b border-gray-100">
                <div>
                    <h1 className="text-5xl lg:text-6xl font-black text-black tracking-tighter mb-2">
                        Articles<span className="text-blue-600">.</span>
                    </h1>
                    <p className="text-gray-400 font-bold uppercase tracking-[0.2em] text-[10px]">
                        Gestion du contenu éditorial & Blog
                    </p>
                </div>
                
                <Link
                    href={`/${locale}/admin/posts/new`}
                    className="bg-black text-white px-10 py-4 rounded-[2rem] text-[10px] font-black uppercase tracking-widest flex items-center gap-3 shadow-xl shadow-black/10 hover:bg-gray-800 transition-all active:scale-95 w-fit"
                >
                    <Plus className="w-4 h-4" />
                    Nouvel Article
                </Link>
            </div>

            {/* Tabs */}
            <div className="flex items-center gap-2 border-b border-gray-100 pb-2">
                {[
                    { id: 'fr', label: 'Français' },
                    { id: 'ar', label: 'العربية' },
                    { id: 'en', label: 'English' }
                ].map(tab => (
                    <Link
                        key={tab.id}
                        href={`/${locale}/admin/posts?lang=${tab.id}`}
                        className={`px-6 py-2.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 ${contentLang === tab.id ? 'bg-black text-white shadow-md' : 'bg-gray-50 text-gray-400 hover:bg-gray-100 border border-gray-100'}`}
                    >
                        {tab.label}
                        <span className={`px-2 py-0.5 rounded-full text-[9px] ${contentLang === tab.id ? 'bg-white/20' : 'bg-gray-200'}`}>
                            {langCounts[tab.id] || 0}
                        </span>
                    </Link>
                ))}
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {[
                    { label: "Total Articles", value: pagination.total, icon: FileText, color: "bg-black" },
                    { label: "Articles Publiés", value: posts.filter(p => p.published).length, icon: Globe, color: "bg-blue-600" },
                    { label: "Brouillons", value: posts.filter(p => !p.published).length, icon: Edit, color: "bg-gray-200" },
                    { label: "Vues Globales", value: totalViews, icon: TrendingUp, color: "bg-emerald-500" }
                ].map((stat, i) => (
                    <div key={i} className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm">
                        <div className="flex items-center justify-between mb-4">
                            <div className={`w-10 h-10 ${stat.color} rounded-xl flex items-center justify-center`}>
                                <stat.icon className={`w-5 h-5 ${stat.color === 'bg-gray-200' ? 'text-gray-600' : 'text-white'}`} />
                            </div>
                        </div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1">{stat.label}</p>
                        <p className="text-2xl font-black text-black tracking-tight">{stat.value}</p>
                    </div>
                ))}
            </div>

            {/* Posts Table component */}
            <AdminPostsTable posts={posts} locale={locale} />

            {/* Pagination (Simplified) */}
                {pagination.totalPages > 1 && (
                    <div className="px-8 py-8 border-t border-gray-100 flex justify-center gap-3 bg-gray-50/30">
                        {Array.from({ length: pagination.totalPages }).map((_, i) => (
                                <Link
                                    key={i}
                                    href={`/${locale}/admin/posts?page=${i + 1}&lang=${contentLang}`}
                                    className={`w-10 h-10 flex items-center justify-center rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${page === i + 1
                                    ? 'bg-black text-white shadow-lg'
                                    : 'bg-white text-gray-400 hover:bg-gray-100 border border-gray-100'
                                    }`}
                            >
                                {i + 1}
                            </Link>
                        ))}
                    </div>
                )}
        </div>
    )
}
