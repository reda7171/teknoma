'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { SlidersHorizontal, X, Eye, EyeOff, RotateCcw, BookOpen, Package, ShoppingCart, TrendingUp, BarChart2, ShoppingBag, Users, Clock, AlertTriangle, XOctagon, Truck, RefreshCw, ImageOff, Archive, CalendarDays, CheckCircle, DollarSign, Link2, Sparkles } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { useDashboardPrivacy } from './DashboardPrivacyContext'

// Résolution des icônes côté client (évite de passer des classes depuis Server Components)
const ICON_MAP: Record<string, LucideIcon> = {
    BookOpen, Package, ShoppingCart, TrendingUp, BarChart2, ShoppingBag,
    Users, Clock, AlertTriangle, XOctagon, Truck, RefreshCw, ImageOff,
    Archive, CalendarDays, CheckCircle, DollarSign, Link2, Sparkles,
}

interface StatCard {
    name: string
    value: string | number
    iconName: string
    color: string
    trend?: number | null
    href?: string
}

interface StatsGridControllerProps {
    cards: StatCard[]
    colorClasses: Record<string, string>
}

const STORAGE_KEY = 'riwaya_dashboard_cards_visibility'

export default function StatsGridController({ cards, colorClasses }: StatsGridControllerProps) {
    const { isMasked, togglePrivacy, formatValue, isSensitive, toggleKeyPrivacy } = useDashboardPrivacy()
    const [visible, setVisible] = useState<Record<string, boolean>>({})
    const [panelOpen, setPanelOpen] = useState(false)
    const [mounted, setMounted] = useState(false)
    const panelRef = useRef<HTMLDivElement>(null)

    // Charger depuis localStorage
    useEffect(() => {
        setMounted(true)
        try {
            const saved = localStorage.getItem(STORAGE_KEY)
            if (saved) {
                setVisible(JSON.parse(saved))
            } else {
                // Tout affiché par défaut
                const defaults: Record<string, boolean> = {}
                cards.forEach(c => { defaults[c.name] = true })
                setVisible(defaults)
            }
        } catch {
            const defaults: Record<string, boolean> = {}
            cards.forEach(c => { defaults[c.name] = true })
            setVisible(defaults)
        }
    }, [cards])

    // Fermer panel sur clic extérieur
    useEffect(() => {
        function handleClickOutside(e: MouseEvent) {
            if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
                setPanelOpen(false)
            }
        }
        if (panelOpen) document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [panelOpen])

    function toggle(name: string) {
        setVisible(prev => {
            const updated = { ...prev, [name]: !prev[name] }
            localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
            return updated
        })
    }

    function resetAll() {
        const defaults: Record<string, boolean> = {}
        cards.forEach(c => { defaults[c.name] = true })
        setVisible(defaults)
        localStorage.setItem(STORAGE_KEY, JSON.stringify(defaults))
    }

    function hideAll() {
        const all: Record<string, boolean> = {}
        cards.forEach(c => { all[c.name] = false })
        setVisible(all)
        localStorage.setItem(STORAGE_KEY, JSON.stringify(all))
    }

    const visibleCards = mounted ? cards.filter(c => visible[c.name] !== false) : cards
    const hiddenCount = cards.length - visibleCards.length

    return (
        <div>
            {/* Boutons contrôle (Privacy + Cartes) */}
            <div className="flex items-center justify-end gap-3 mb-4 relative" ref={panelRef}>
                <button
                    id="stats-grid-privacy-toggle"
                    type="button"
                    onClick={togglePrivacy}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl border transition-all font-black text-[10px] uppercase tracking-widest shadow-sm active:scale-95 ${
                        isMasked
                            ? 'border-blue-200 bg-blue-50/70 text-blue-700 hover:bg-blue-100 hover:border-blue-300'
                            : 'border-gray-200 bg-white text-gray-500 hover:border-black hover:text-black'
                    }`}
                    title={isMasked ? 'Afficher les données sensibles' : 'Masquer les données sensibles (**)'}
                    aria-label={isMasked ? 'Afficher les données sensibles' : 'Masquer les données sensibles'}
                >
                    {isMasked ? <Eye className="w-3.5 h-3.5 text-blue-600" /> : <EyeOff className="w-3.5 h-3.5" />}
                    <span>{isMasked ? 'Afficher chiffres' : 'Masquer (**)'}</span>
                </button>

                <button
                    id="stats-grid-toggle"
                    onClick={() => setPanelOpen(v => !v)}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-2xl border border-gray-200 bg-white text-gray-500 hover:border-black hover:text-black transition-all font-black text-[10px] uppercase tracking-widest shadow-sm active:scale-95"
                >
                    <SlidersHorizontal className="w-3.5 h-3.5" />
                    Cartes
                    {hiddenCount > 0 && (
                        <span className="ml-1 bg-black text-white text-[9px] font-black rounded-full w-5 h-5 flex items-center justify-center">
                            {hiddenCount}
                        </span>
                    )}
                </button>

                {/* Panel de contrôle */}
                {panelOpen && (
                    <div className="absolute top-full right-0 mt-2 z-50 bg-white rounded-3xl border border-gray-100 shadow-2xl shadow-black/10 w-72 overflow-hidden">
                        {/* Header */}
                        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-50">
                            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">Affichage des cartes</span>
                            <button onClick={() => setPanelOpen(false)} className="text-gray-400 hover:text-black transition-colors">
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        {/* Actions rapides */}
                        <div className="flex gap-2 px-5 py-3 border-b border-gray-50">
                            <button
                                onClick={resetAll}
                                className="flex items-center gap-1.5 px-3 py-1.5 bg-black text-white rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-gray-800 transition-all"
                            >
                                <RotateCcw className="w-3 h-3" />
                                Tout afficher
                            </button>
                            <button
                                onClick={hideAll}
                                className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 text-gray-500 rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-gray-200 transition-all"
                            >
                                <EyeOff className="w-3 h-3" />
                                Tout masquer
                            </button>
                        </div>

                        {/* Liste des cartes */}
                        <div className="max-h-80 overflow-y-auto divide-y divide-gray-50">
                            {cards.map(card => {
                                const isVisible = visible[card.name] !== false
                                const formattedVal = formatValue(card.name, card.value)
                                return (
                                    <button
                                        key={card.name}
                                        onClick={() => toggle(card.name)}
                                        className={`w-full flex items-center gap-3 px-5 py-3 text-left transition-colors hover:bg-gray-50 ${!isVisible ? 'opacity-40' : ''}`}
                                    >
                                        <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${colorClasses[card.color] || 'bg-gray-100 text-gray-400'}`}>
                                            {(() => { const Icon = ICON_MAP[card.iconName] || BookOpen; return <Icon className="w-3.5 h-3.5" /> })()}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-[10px] font-black text-black uppercase tracking-wider truncate">{card.name}</p>
                                            <p className="text-[9px] text-gray-400 font-bold">{formattedVal}</p>
                                        </div>
                                        <div className={`flex-shrink-0 w-8 h-4 rounded-full transition-colors ${isVisible ? 'bg-black' : 'bg-gray-200'}`}>
                                            <div className={`w-3 h-3 rounded-full bg-white shadow-sm mt-0.5 transition-transform ${isVisible ? 'translate-x-4' : 'translate-x-0.5'}`} />
                                        </div>
                                    </button>
                                )
                            })}
                        </div>

                        {/* Footer */}
                        <div className="px-5 py-3 bg-gray-50/50 border-t border-gray-50">
                            <p className="text-[9px] text-gray-400 font-bold text-center">
                                {visibleCards.length}/{cards.length} cartes affichées • Sauvegardé localement
                            </p>
                        </div>
                    </div>
                )}
            </div>

            {/* Grille des cartes filtrées */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-6">
                {visibleCards.map((stat) => {
                    const Icon = ICON_MAP[stat.iconName] || BookOpen
                    const isCardSensitive = isSensitive(stat.name)
                    const displayValue = formatValue(stat.name, stat.value)
                    const isCardHidden = isCardSensitive && displayValue === '**'

                    const hasTrend = typeof stat.trend === 'number' && Number.isFinite(stat.trend)
                    const trendIsPositive = hasTrend && stat.trend! > 0
                    const trendIsNegative = hasTrend && stat.trend! < 0
                    const cardBody = (
                        <div
                            className={`group bg-white rounded-3xl sm:rounded-[2.5rem] border border-gray-100 p-6 sm:p-8 shadow-xl shadow-black/5 hover:-translate-y-1 transition-all relative overflow-hidden h-full flex flex-col justify-between ${
                                stat.href ? 'hover:border-black/20 hover:shadow-2xl' : ''
                            }`}
                        >
                            <div className="flex flex-col relative z-10">
                                <div className="flex items-center justify-between mb-3 gap-1">
                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest truncate">{stat.name}</p>
                                    {isCardSensitive && (
                                        <button
                                            type="button"
                                            onClick={(e) => {
                                                e.preventDefault()
                                                e.stopPropagation()
                                                toggleKeyPrivacy(stat.name)
                                            }}
                                            className="p-1 rounded-md text-gray-300 hover:text-black hover:bg-gray-100 transition-colors shrink-0"
                                            title={isCardHidden ? 'Afficher cette valeur' : 'Masquer (**)'}
                                            aria-label={isCardHidden ? 'Afficher cette valeur' : 'Masquer cette valeur'}
                                        >
                                            {isCardHidden ? <Eye className="w-3.5 h-3.5 text-blue-600" /> : <EyeOff className="w-3.5 h-3.5 text-gray-400" />}
                                        </button>
                                    )}
                                </div>
                                <p className={`text-3xl font-black text-black tracking-tighter mb-4 ${isCardHidden ? 'tracking-widest font-mono text-gray-700' : ''}`}>
                                    {displayValue}
                                </p>
                                <div className={`w-12 h-12 rounded-xl flex items-center justify-center transition-transform group-hover:scale-110 shadow-lg ${colorClasses[stat.color as keyof typeof colorClasses]} shadow-current/10`}>
                                    <Icon className="w-5 h-5" />
                                </div>
                            </div>
                            <div className="mt-6 pt-4 border-t border-gray-50 flex items-center gap-2">
                                {isCardHidden ? (
                                    <span className="text-[9px] font-bold text-gray-300 uppercase tracking-tighter">Données masquées</span>
                                ) : hasTrend ? (
                                    <>
                                        <span className={`text-[10px] font-black italic ${trendIsPositive ? 'text-emerald-500' : trendIsNegative ? 'text-red-500' : 'text-gray-400'}`}>
                                            {trendIsPositive ? '+' : ''}{stat.trend!.toFixed(1)}%
                                        </span>
                                        <span className="text-[9px] font-bold text-gray-300 uppercase tracking-tighter">vs mois dernier</span>
                                    </>
                                ) : stat.trend === null ? (
                                    <span className="text-[9px] font-bold text-blue-500 uppercase tracking-tighter">Nouveau ce mois</span>
                                ) : stat.href ? (
                                    <span className="text-[9px] font-black text-blue-600 group-hover:underline uppercase tracking-tighter flex items-center gap-1">
                                        Filtrer livres →
                                    </span>
                                ) : (
                                    <span className="text-[9px] font-bold text-gray-300 uppercase tracking-tighter">Données cumulées</span>
                                )}
                            </div>
                        </div>
                    )

                    return stat.href ? (
                        <Link key={stat.name} href={stat.href} className="block h-full focus:outline-none">
                            {cardBody}
                        </Link>
                    ) : (
                        <div key={stat.name} className="h-full">
                            {cardBody}
                        </div>
                    )
                })}
            </div>
        </div>
    )
}
