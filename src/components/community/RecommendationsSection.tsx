'use client'

import { AIRecommendation } from '@/lib/actions/community-recommendations'
import { Sparkles, BookOpen } from 'lucide-react'
import { useTranslations } from 'next-intl'

interface RecommendationsSectionProps {
    recommendations: AIRecommendation[]
}

export default function RecommendationsSection({ recommendations }: RecommendationsSectionProps) {
    const t = useTranslations('Community.Recommendations')
    if (!recommendations || recommendations.length === 0) return null;

    return (
        <section className="mb-12">
            <div className="flex flex-col items-center md:items-start text-center md:text-start mb-6">
                <div className="flex flex-wrap items-center justify-center md:justify-start gap-3 mb-3">
                    <div className="bg-gradient-to-r from-purple-500 to-indigo-600 p-2 rounded-xl shadow-lg shadow-purple-500/20">
                        <Sparkles className="w-6 h-6 text-white" />
                    </div>
                    <h2 className="text-2xl font-black text-black uppercase tracking-tight">
                        {t('Title')}
                    </h2>
                    <span className="bg-gradient-to-r from-purple-500 to-indigo-600 text-transparent bg-clip-text text-[10px] font-black uppercase tracking-widest px-3 py-1 bg-purple-50 rounded-full border border-purple-100">
                        {t('Badge')}
                    </span>
                </div>
                <p className="max-w-3xl text-sm text-gray-600 font-medium leading-relaxed">
                    {t('Description')}
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {recommendations.map((rec, idx) => (
                    <div 
                        key={idx} 
                        className="group relative bg-white/60 backdrop-blur-xl rounded-[2rem] p-6 border border-white/50 shadow-xl shadow-indigo-900/5 hover:-translate-y-2 transition-all duration-300 overflow-hidden"
                    >
                        {/* Decorative gradient orb */}
                        <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-purple-200 to-indigo-200 rounded-full blur-3xl opacity-50 -mr-10 -mt-10 group-hover:scale-150 transition-transform duration-700"></div>
                        
                        <div className="relative z-10 flex flex-col h-full">
                            <div className="w-12 h-12 bg-white rounded-2xl shadow-sm border border-gray-100 flex items-center justify-center mb-4 text-indigo-500 group-hover:scale-110 group-hover:rotate-3 transition-transform">
                                <BookOpen className="w-6 h-6" />
                            </div>
                            
                            <h3 className="text-lg font-black text-black leading-tight mb-1">{rec.title}</h3>
                            <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-4">{rec.author}</p>
                            
                            <div className="mt-auto">
                                <div className="h-px w-full bg-gradient-to-r from-transparent via-gray-200 to-transparent mb-4"></div>
                                <p className="text-[10px] font-black uppercase tracking-widest text-indigo-500 mb-2">{t('Why')}</p>
                                <p className="text-sm text-gray-600 leading-relaxed italic">
                                    {rec.reason}
                                </p>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </section>
    )
}
