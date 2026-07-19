import { getAllPosts, getPostCategories } from '@/lib/actions/blog'
import Link from 'next/link'
import { Plus, Edit, FileText, Globe, TrendingUp, Clock } from 'lucide-react'
import AdminPostsTable from '@/components/admin/AdminPostsTable'
import AdminPostsFilters from './AdminPostsFilters'
import { prisma } from '@/lib/prisma'
import AdminPostsEvolutionChart from '@/components/admin/AdminPostsEvolutionChart'

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
    const published = typeof searchParamsValues.published === 'string' ? searchParamsValues.published === 'true' : undefined;
    const category = typeof searchParamsValues.category === 'string' ? searchParamsValues.category : undefined;
    const authorId = typeof searchParamsValues.authorId === 'string' ? searchParamsValues.authorId : undefined;
    const bookId = typeof searchParamsValues.bookId === 'string' ? searchParamsValues.bookId : undefined;
    const sort = typeof searchParamsValues.sort === 'string' ? searchParamsValues.sort : undefined;
    const dateFrom = typeof searchParamsValues.dateFrom === 'string' ? searchParamsValues.dateFrom : undefined;
    const dateTo = typeof searchParamsValues.dateTo === 'string' ? searchParamsValues.dateTo : undefined;

    const { posts, pagination } = await getAllPosts(page, 20, search, contentLang, published, category, authorId, sort, dateFrom, dateTo, bookId)

    const langCountsRaw = await prisma.post.groupBy({
        by: ['language'],
        _count: { id: true }
    })
    const langCounts = langCountsRaw.reduce((acc, curr) => {
        acc[curr.language] = curr._count.id
        return acc
    }, {} as Record<string, number>)

    // Calculate total views and read time using Prisma
    const totalsAgg = await prisma.post.aggregate({
        _sum: { viewCount: true, totalReadTime: true }
    })
    const totalViews = totalsAgg._sum.viewCount || 0
    const totalReadTimeSeconds = totalsAgg._sum.totalReadTime || 0
    const avgReadTimeSeconds = totalViews > 0 ? Math.round(totalReadTimeSeconds / totalViews) : 0
    const avgReadTimeFormatted = `${Math.floor(avgReadTimeSeconds / 60)}m ${avgReadTimeSeconds % 60}s`

    // Fetch filters data
    const categories = await getPostCategories(contentLang)
    const authorsRaw = await prisma.user.findMany({
        where: { posts: { some: {} } },
        select: { id: true, fullName: true }
    })
    const authors = authorsRaw.filter(a => a.fullName).map(a => ({ id: a.id, fullName: a.fullName as string }))
    
    const books = await prisma.book.findMany({
        select: { id: true, title: true },
        orderBy: { title: 'asc' }
    })

    // Fetch data for evolution chart
    const allPostsData = await prisma.post.findMany({
        select: {
            language: true,
            createdAt: true
        }
    })

    // Fetch language stats
    const langStatsRaw = await prisma.post.groupBy({
        by: ['language'],
        _sum: { viewCount: true },
        _min: { createdAt: true }
    })
    
    const langStats = langStatsRaw.map(stat => {
        const totalViews = stat._sum.viewCount || 0
        const oldestDate = stat._min.createdAt || new Date()
        const daysSince = Math.max(1, Math.ceil((new Date().getTime() - oldestDate.getTime()) / (1000 * 60 * 60 * 24)))
        const viewsPerDay = Math.round(totalViews / daysSince)
        
        return {
            language: stat.language,
            totalViews,
            viewsPerDay
        }
    })
    const langNames: Record<string, string> = { fr: 'Français', ar: 'Arabe', en: 'Anglais' }

    // Fetch top countries visiting the blog
    const topCountriesRaw = await prisma.pageView.groupBy({
        by: ['country'],
        where: { url: { contains: '/blog' }, country: { not: null, not: 'Inconnu' } },
        _count: { id: true },
        orderBy: { _count: { id: 'desc' } },
        take: 5
    })
    const topCountries = topCountriesRaw

    const activeFilters = {
        search: search || '',
        published: typeof searchParamsValues.published === 'string' ? searchParamsValues.published : 'all',
        category: category || 'all',
        authorId: authorId || 'all',
        bookId: bookId || 'all',
        lang: contentLang,
        sort: sort || 'newest',
        dateFrom: dateFrom || '',
        dateTo: dateTo || ''
    }

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
                    { id: 'all', label: 'Toutes' },
                    { id: 'fr', label: 'Français' },
                    { id: 'ar', label: 'العربية' },
                    { id: 'en', label: 'English' }
                ].map(tab => {
                    const count = tab.id === 'all' 
                        ? Object.values(langCounts).reduce((a, b) => a + b, 0)
                        : (langCounts[tab.id] || 0);
                    
                    return (
                        <Link
                            key={tab.id}
                            href={`/${locale}/admin/posts?lang=${tab.id}`}
                            className={`px-6 py-2.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 ${contentLang === tab.id ? 'bg-black text-white shadow-md' : 'bg-gray-50 text-gray-400 hover:bg-gray-100 border border-gray-100'}`}
                        >
                            {tab.label}
                            <span className={`px-2 py-0.5 rounded-full text-[9px] ${contentLang === tab.id ? 'bg-white/20' : 'bg-gray-200'}`}>
                                {count}
                            </span>
                        </Link>
                    )
                })}
            </div>

            <AdminPostsFilters 
                activeFilters={activeFilters}
                categories={categories}
                authors={authors}
                books={books}
                totalCount={pagination.total}
            />

            {/* Stats par Langue */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {langStats.map(stat => (
                    <div key={stat.language} className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm flex flex-col justify-center">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-[12px] font-black uppercase tracking-widest text-gray-400">Blog {langNames[stat.language] || stat.language}</h3>
                            <Globe className="w-5 h-5 text-blue-500" />
                        </div>
                        <div className="flex items-end gap-2">
                            <span className="text-3xl font-black text-black leading-none">{stat.viewsPerDay}</span>
                            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">vues / jour</span>
                        </div>
                        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-4">Total : {stat.totalViews} vues</p>
                    </div>
                ))}
            </div>

            {/* Quick Stats & Chart */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-1 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-6">
                    {[
                        { label: "Total Articles", value: pagination.total, icon: FileText, color: "bg-black" },
                        { label: "Articles Publiés", value: posts.filter(p => p.published).length, icon: Globe, color: "bg-blue-600" },
                        { label: "Vues Globales", value: totalViews, icon: TrendingUp, color: "bg-emerald-500" },
                        { label: "Temps Lecture (Moyen)", value: avgReadTimeFormatted, icon: Clock, color: "bg-amber-500" }
                    ].map((stat, i) => (
                        <div key={i} className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm flex items-center gap-4">
                            <div className={`w-12 h-12 ${stat.color} rounded-2xl flex items-center justify-center shrink-0`}>
                                <stat.icon className={`w-5 h-5 ${stat.color === 'bg-gray-200' ? 'text-gray-600' : 'text-white'}`} />
                            </div>
                            <div>
                                <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-0.5">{stat.label}</p>
                                <p className="text-xl font-black text-black tracking-tight">{stat.value}</p>
                            </div>
                        </div>
                    ))}
                </div>
                <div className="lg:col-span-2">
                    <AdminPostsEvolutionChart data={allPostsData} />
                </div>
            </div>

            {/* Top Countries Section */}
            <div className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm">
                <h3 className="text-[12px] font-black uppercase tracking-widest text-gray-400 mb-4">Pays Visiteurs (Top 5)</h3>
                {topCountries.length > 0 ? (
                    <div className="flex flex-wrap gap-4">
                        {topCountries.map((c, idx) => (
                            <div key={idx} className="flex items-center gap-2 bg-gray-50 px-4 py-2 rounded-xl border border-gray-100">
                                <span className="font-bold text-sm">{c.country}</span>
                                <span className="text-[10px] font-black bg-black text-white px-2 py-0.5 rounded-full">{c._count.id} vues</span>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="text-gray-400 text-sm font-medium italic">Aucune donnée de visite pour le moment (ouvrez un article de blog pour tester).</div>
                )}
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
