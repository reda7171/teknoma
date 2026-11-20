import { getAllReviews, getReviewsStats } from '@/lib/actions/reviews'
import { getAudioTestimonials } from '@/lib/actions/audio-testimonials'
import { getImageTestimonials } from '@/lib/actions/image-testimonials'
import { Star, CheckCircle, Clock, MessageSquareText, Mic, Image as ImageIcon } from 'lucide-react'
import Link from 'next/link'
import ReviewsTable from './ReviewsTable'
import AudioTestimonialsTable from './AudioTestimonialsTable'
import ImageTestimonialsTable from './ImageTestimonialsTable'

export default async function AdminReviewsPage({
    params,
    searchParams,
}: {
    params: Promise<{ locale: string }>,
    searchParams: Promise<{ filter?: string, tab?: string }>
}) {
    const { locale } = await params
    const searchParamsValues = await searchParams
    const filter = (searchParamsValues.filter || 'all') as 'all' | 'approved' | 'pending'
    const tab = searchParamsValues.tab || 'text'

    const [reviews, stats, audioRes, imageRes] = await Promise.all([
        getAllReviews(filter),
        getReviewsStats(),
        getAudioTestimonials(),
        getImageTestimonials()
    ])

    const audioTestimonials = audioRes?.testimonials || []
    const imageTestimonials = imageRes?.testimonials || []

    return (
        <div className="space-y-12">
            {/* Header section style Tekno Store */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b border-gray-100">
                <div>
                    <h1 className="text-5xl lg:text-7xl font-black text-black tracking-tighter mb-2 italic">
                        Avis Clients<span className="text-yellow-500">.</span>
                    </h1>
                    <p className="text-gray-400 font-bold uppercase tracking-[0.2em] text-[10px]">
                        Modération & Gestion de la réputation narrative
                    </p>
                </div>

                {/* Tabs de Navigation Principale */}
                <div className="flex bg-gray-100 p-1.5 rounded-[2rem] shadow-inner w-fit">
                    <Link
                        href={`/${locale}/admin/reviews?tab=text`}
                        className={`px-6 py-2.5 rounded-[1.5rem] text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 ${tab === 'text' ? 'bg-white text-black shadow-md' : 'text-gray-500 hover:text-black'}`}
                    >
                        <MessageSquareText className="w-4 h-4" />
                        Livres
                    </Link>
                    <Link
                        href={`/${locale}/admin/reviews?tab=image`}
                        className={`px-6 py-2.5 rounded-[1.5rem] text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 ${tab === 'image' ? 'bg-white text-black shadow-md' : 'text-gray-500 hover:text-black'}`}
                    >
                        <ImageIcon className="w-4 h-4" />
                        Avis Images
                    </Link>
                    <Link
                        href={`/${locale}/admin/reviews?tab=audio`}
                        className={`px-6 py-2.5 rounded-[1.5rem] text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 ${tab === 'audio' ? 'bg-white text-black shadow-md' : 'text-gray-500 hover:text-black'}`}
                    >
                        <Mic className="w-4 h-4" />
                        Audios
                    </Link>
                </div>
            </div>

            {tab === 'text' ? (
                <>
                    {/* Filtres Rapides Premium */}
                    <div className="flex justify-end">
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

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {[
                            { label: 'Total Avis', value: stats.total, icon: MessageSquareText, color: 'bg-black text-white' },
                            { label: 'En attente', value: stats.pending, icon: Clock, color: 'bg-orange-50 text-orange-600' },
                            { label: 'Note Moyenne', value: stats.averageRating.toFixed(1), icon: Star, color: 'bg-yellow-50 text-yellow-600' }
                        ].map((stat, i) => (
                            <div key={i} className="bg-white rounded-[2rem] p-6 border border-gray-100 shadow-xl shadow-black/5 group hover:scale-[1.02] transition-transform">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-gray-400 font-bold uppercase tracking-widest text-[10px] mb-1">{stat.label}</p>
                                        <p className="text-4xl font-black tracking-tighter text-black italic">{stat.value}</p>
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
                </>
            ) : tab === 'image' ? (
                <ImageTestimonialsTable testimonials={imageTestimonials} />
            ) : (
                <AudioTestimonialsTable testimonials={audioTestimonials} />
            )}
        </div>
    )
}
