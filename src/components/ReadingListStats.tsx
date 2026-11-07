'use client'

import { useState, useEffect, useRef } from 'react'
import { BookOpen, Users, ScrollText, GraduationCap } from 'lucide-react'
import { useTranslations, useLocale } from 'next-intl'

interface ReadingListStatsProps {
    items: any[]
}

const STATS_STORAGE_KEY = 'riwaya_reading_stats_tab'

export default function ReadingListStats({ items }: ReadingListStatsProps) {
    const t = useTranslations('Community.ReadingList.Stats')
    const locale = useLocale()
    const isRtl = locale === 'ar'
    const [activeTab, setActiveTab] = useState(0)

    // Restauration de l'onglet favori mémorisé en état local (localStorage)
    useEffect(() => {
        try {
            const saved = localStorage.getItem(STATS_STORAGE_KEY)
            if (saved !== null) {
                const parsed = parseInt(saved, 10)
                if (!isNaN(parsed) && parsed >= 0 && parsed <= 3) {
                    setActiveTab(parsed)
                }
            }
        } catch {}
    }, [])

    const handleSelectTab = (idx: number) => {
        setActiveTab(idx)
        try {
            localStorage.setItem(STATS_STORAGE_KEY, String(idx))
        } catch {}
    }

    // Gestion native du balayage tactile (swipe mobile) sans re-render
    const touchStartX = useRef<number | null>(null)
    const touchStartY = useRef<number | null>(null)

    const totalBooks = items.length
    const completedBooks = items.filter(i => i.status === 'COMPLETED').length
    const uniqueAuthors = new Set(items.map(i => i.author)).size
    const totalPages = items.reduce((acc, i) => acc + (i.totalPages || 0), 0)
    const pagesRead = items.reduce((acc, i) => acc + (i.currentPage || 0), 0)
    const readingProgress = totalPages > 0 ? Math.round((pagesRead / totalPages) * 100) : 0

    const stats = [
        {
            id: 'library',
            label: t('Library'),
            value: totalBooks,
            subValue: t('Completed', { count: completedBooks }),
            icon: BookOpen,
            color: 'bg-black text-white hover:bg-gray-900 border-black'
        },
        {
            id: 'authors',
            label: t('Authors'),
            value: uniqueAuthors,
            subValue: t('Explored'),
            icon: Users,
            color: 'bg-white text-black hover:bg-gray-50 border-gray-100 shadow-sm'
        },
        {
            id: 'volume',
            label: t('TotalVolume'),
            value: totalPages.toLocaleString('fr-FR'),
            subValue: t('PagesAccumulated'),
            icon: ScrollText,
            color: 'bg-white text-black hover:bg-gray-50 border-gray-100 shadow-sm'
        },
        {
            id: 'progress',
            label: t('Progress'),
            value: `${readingProgress}%`,
            subValue: t('PagesRead', { count: pagesRead.toLocaleString('fr-FR') }),
            icon: GraduationCap,
            color: 'bg-emerald-600 text-white hover:bg-emerald-700 border-emerald-600'
        }
    ]

    const handleTouchStart = (e: React.TouchEvent) => {
        touchStartX.current = e.touches[0].clientX
        touchStartY.current = e.touches[0].clientY
    }

    const handleTouchEnd = (e: React.TouchEvent) => {
        if (touchStartX.current === null || touchStartY.current === null) return

        const deltaX = e.changedTouches[0].clientX - touchStartX.current
        const deltaY = e.changedTouches[0].clientY - touchStartY.current
        touchStartX.current = null
        touchStartY.current = null

        // Détection de geste de balayage horizontal (seuil minimum de 40px)
        if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 40) {
            setActiveTab(prev => {
                let next = prev
                if (deltaX < 0) {
                    // Balayage vers la gauche
                    next = isRtl ? Math.max(0, prev - 1) : Math.min(stats.length - 1, prev + 1)
                } else {
                    // Balayage vers la droite
                    next = isRtl ? Math.min(stats.length - 1, prev + 1) : Math.max(0, prev - 1)
                }
                try {
                    localStorage.setItem(STATS_STORAGE_KEY, String(next))
                } catch {}
                return next
            })
        }
    }

    return (
        <div className="mb-8">
            {/* Vue mobile sous forme d'onglets tactiles avec swipe (sm:hidden) */}
            <div className="sm:hidden">
                {/* Sélecteur d'onglets compact */}
                <div className="grid grid-cols-4 p-1 bg-gray-100 rounded-2xl gap-1 mb-2.5">
                    {stats.map((stat, idx) => {
                        const Icon = stat.icon
                        const isActive = activeTab === idx
                        return (
                            <button
                                key={stat.id}
                                type="button"
                                onClick={() => handleSelectTab(idx)}
                                className={`flex flex-col items-center justify-center py-2 px-1 rounded-xl transition-all ${
                                    isActive
                                        ? 'bg-white text-black shadow-sm font-black'
                                        : 'text-gray-500 hover:text-gray-900 font-bold'
                                }`}
                                aria-selected={isActive}
                                role="tab"
                            >
                                <Icon className={`w-4 h-4 mb-1 ${isActive ? 'text-blue-600' : 'text-gray-400'}`} />
                                <span className="text-xs font-black truncate max-w-full" suppressHydrationWarning>{stat.value}</span>
                                <span className="text-[9px] uppercase tracking-tighter truncate max-w-full text-gray-400 font-semibold">{stat.label}</span>
                            </button>
                        )
                    })}
                </div>

                {/* Cadre actif détaillé réagissant au balayage tactile (swipe) */}
                <div
                    onTouchStart={handleTouchStart}
                    onTouchEnd={handleTouchEnd}
                    className={`p-4 rounded-2xl border transition-all duration-300 touch-pan-y select-none ${stats[activeTab].color}`}
                >
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className={`p-2.5 rounded-xl border ${
                                stats[activeTab].color.includes('bg-black')
                                    ? 'bg-white/10 border-white/20'
                                    : stats[activeTab].color.includes('bg-emerald')
                                    ? 'bg-white/15 border-white/20'
                                    : 'bg-gray-50 border-gray-200'
                            }`}>
                                {(() => {
                                    const ActiveIcon = stats[activeTab].icon
                                    return <ActiveIcon className={`w-5 h-5 ${stats[activeTab].color.includes('text-white') ? 'text-white' : 'text-gray-900'}`} />
                                })()}
                            </div>
                            <div>
                                <span className={`text-[10px] uppercase font-black tracking-widest block ${stats[activeTab].color.includes('text-white') ? 'text-white/70' : 'text-gray-400'}`}>
                                    {stats[activeTab].label}
                                </span>
                                <p className={`text-xs font-bold ${stats[activeTab].color.includes('text-white') ? 'text-white/80' : 'text-gray-500'}`} suppressHydrationWarning>
                                    {stats[activeTab].subValue}
                                </p>
                            </div>
                        </div>
                        <div className="text-right">
                            <span className="text-2xl font-black tracking-tight" suppressHydrationWarning>
                                {stats[activeTab].value}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Indicateur visuel discret de pagination swipe (dots) */}
                <div className="flex justify-center items-center gap-1.5 mt-2">
                    {stats.map((_, dotIdx) => (
                        <button
                            key={dotIdx}
                            type="button"
                            onClick={() => handleSelectTab(dotIdx)}
                            className={`h-1 rounded-full transition-all duration-300 ${
                                activeTab === dotIdx
                                    ? 'w-5 bg-black'
                                    : 'w-1.5 bg-gray-200 hover:bg-gray-300'
                            }`}
                            aria-label={`Onglet ${dotIdx + 1}`}
                        />
                    ))}
                </div>
            </div>

            {/* Vue desktop standard en grille 4 colonnes (hidden sm:grid) */}
            <div className="hidden sm:grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {stats.map((stat) => {
                    const Icon = stat.icon
                    return (
                        <div
                            key={stat.id}
                            className={`p-6 rounded-3xl border transition-all duration-300 group cursor-default ${stat.color}`}
                        >
                            <div className="flex justify-between items-start mb-4">
                                <div className={`p-2 rounded-xl border ${stat.color === 'bg-black text-white hover:bg-gray-900 border-black' ? 'bg-white/10 border-white/20' : 'bg-gray-50 border-gray-100 group-hover:bg-blue-50 group-hover:border-blue-100 transition-colors'}`}>
                                    <Icon className={`w-5 h-5 ${stat.color.includes('text-white') ? 'text-white' : 'text-gray-400 group-hover:text-blue-500'}`} />
                                </div>
                            </div>
                            <div className="space-y-1">
                                <h4 className="text-2xl font-black tracking-tight" suppressHydrationWarning>{stat.value}</h4>
                                <div className="flex flex-col">
                                    <span className={`text-[10px] uppercase font-black tracking-widest rtl:tracking-normal ${stat.color.includes('text-white') ? 'text-white/60' : 'text-gray-400'}`}>
                                        {stat.label}
                                    </span>
                                    <span
                                        className={`text-[10px] font-bold ${stat.color.includes('text-white') ? 'text-white/40' : 'text-gray-300'}`}
                                        suppressHydrationWarning
                                    >
                                        {stat.subValue}
                                    </span>
                                </div>
                            </div>
                        </div>
                    )
                })}
            </div>
        </div>
    )
}
