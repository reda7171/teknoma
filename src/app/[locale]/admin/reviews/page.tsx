import { getAllReviews, getReviewsStats } from '@/lib/actions/reviews'
import { Star, CheckCircle, Clock } from 'lucide-react'
import Link from 'next/link'
import ReviewsTable from './ReviewsTable'

export default async function AdminReviewsPage({
    params,
    searchParams,
}: {
    params: Promise<{ locale: string }>,
    searchParams: Promise<{ filter?: string }>
}) {
    const { locale } = await params
    const searchParamsValues = await searchParams
    const filter = (searchParamsValues.filter || 'all') as 'all' | 'approved' | 'pending'

    const [reviews, stats] = await Promise.all([
        getAllReviews(filter),
        getReviewsStats(),
    ])

    return (
        <div className="space-y-12">
            {/* Header section style Riwaya */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b border-gray-100">
                <div>
                    <h1 className="text-5xl lg:text-7xl font-black text-black tracking-tighter mb-2 italic">
                        Avis Clients<span className="text-yellow-500">.</span>
                    </h1>
                    <p className="text-gray-400 font-bold uppercase tracking-[0.2em] text-[10px]">
                        Modération & Gestion de la réputation narrative
                    </p>
                </div>
                
                {/* Filtres Rapides Premium */}
                <div className="flex bg-gray-100 p-1.5 rounded-[2rem] shadow-inner w-fit">
                    {[
                        { label: 'Tous', filter: 'all', count: stats.total },
                        { label: 'En Attente', filter: 'pending', count: stats.pending },
                        { label: 'Approuvés', filter: 'approved', count: stats.approved }
                    ].map((item) => (
                        <Link
                            key={item.filter}
                            href={`/${locale}/admin/reviews${item.filter === 'all' ? '' : `?filter=${item.filter}`}`}
                            className={`px-6 py-2.5 rounded-[1.5rem] text-[10px] font-black uppercase tracking-widest transition-all ${filter === item.filter
                                ? 'bg-white text-black shadow-md'
                                : 'text-gray-500 hover:text-black'
                                }`}
                        >
                            {item.label} ({item.count})
                        </Link>
                    ))}
                </div>
            </div>

            {/* Statistiques en Cartes Premium */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                {[
                    { label: "Note Moyenne", value: "4.8", icon: Star, color: "bg-black text-white", sub: "/ 5.0" },
                    { label: "Approbation", value: `${stats.total > 0 ? Math.round((stats.approved / stats.total) * 100) : 0}%`, icon: CheckCircle, color: "bg-emerald-50 text-emerald-600", sub: "Taux de validation" },
                    { label: "En Attente", value: stats.pending, icon: Clock, color: "bg-orange-50 text-orange-600", sub: "À modérer" }
                ].map((stat, i) => (
                    <div key={i} className="bg-white p-8 rounded-[3rem] border border-gray-100 shadow-xl shadow-black/5 relative overflow-hidden group hover:-translate-y-1 transition-all">
                        <div className="flex justify-between items-start">
                            <div>
                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">{stat.label}</p>
                                <div className="flex items-baseline gap-2">
                                    <p className="text-4xl font-black text-black tracking-tighter">{stat.value}</p>
                                    <span className="text-[10px] font-bold text-gray-300 uppercase">{stat.sub}</span>
                                </div>
                            </div>
                            <div className={`w-14 h-14 rounded-2xl ${stat.color} flex items-center justify-center transition-transform group-hover:scale-110`}>
                                <stat.icon className={`w-6 h-6 ${stat.icon === Star ? 'fill-current' : ''}`} />
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Liste des Avis Premium */}
            <ReviewsTable reviews={reviews} />
        </div>
    )
}
