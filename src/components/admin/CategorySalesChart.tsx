'use client'

import { useState, useMemo } from 'react'
import {
    PieChart, Pie, Cell, ResponsiveContainer, Tooltip,
    BarChart, Bar, XAxis, YAxis, CartesianGrid
} from 'recharts'
import { Package, BarChart3, PieChart as PieIcon, ChevronDown, ChevronUp, Layers } from 'lucide-react'
import SensitiveValue from './SensitiveValue'

const AccessibleTooltip = Tooltip as any

// Palette soignée sans violet/mauve (respect strict de la charte)
const PALETTE = [
    '#059669', // Emerald
    '#2563eb', // Blue
    '#d97706', // Amber
    '#0284c7', // Sky
    '#0d9488', // Teal
    '#ea580c', // Orange
    '#475569', // Slate
    '#94a3b8', // Gray (Autres)
]

interface CategoryRevenueItem {
    name: string
    value: number
}

interface CategorySalesChartProps {
    data: CategoryRevenueItem[]
}

export default function CategorySalesChart({ data }: CategorySalesChartProps) {
    const [viewMode, setViewMode] = useState<'donut' | 'bars'>('donut')
    const [showAllList, setShowAllList] = useState(false)
    const [activeIndex, setActiveIndex] = useState<number | null>(null)

    // 1. Normaliser et dédoublonner les catégories (ex: casse "Développement Personnel")
    const consolidatedList = useMemo(() => {
        if (!data || data.length === 0) return []

        const map = new Map<string, number>()

        data.forEach(item => {
            let name = (item.name || 'Non classé').trim()
            // Unification de la casse pour les doublons fréquents
            if (name.toLowerCase() === 'développement personnel') {
                name = 'Développement Personnel'
            } else if (name.toLowerCase() === 'sciences humaines') {
                name = 'Sciences Humaines'
            } else if (name.toLowerCase() === 'roman' || name.toLowerCase() === 'romans') {
                name = 'Romans & Littérature'
            }

            const current = map.get(name) || 0
            map.set(name, current + Number(item.value || 0))
        })

        return Array.from(map.entries())
            .map(([name, value]) => ({ name, value: Math.round(value * 100) / 100 }))
            .sort((a, b) => b.value - a.value)
    }, [data])

    const totalRevenue = useMemo(() => {
        return consolidatedList.reduce((acc, curr) => acc + curr.value, 0)
    }, [consolidatedList])

    // 2. Préparer les données pour le Donut (Top 6 + Autres)
    const donutData = useMemo(() => {
        if (consolidatedList.length <= 7) return consolidatedList

        const top6 = consolidatedList.slice(0, 6)
        const others = consolidatedList.slice(6)
        const othersValue = others.reduce((acc, curr) => acc + curr.value, 0)

        return [
            ...top6,
            {
                name: `Autres (${others.length} catégories)`,
                value: Math.round(othersValue * 100) / 100
            }
        ]
    }, [consolidatedList])

    // Top 8 pour la vue en barres horizontales
    const topBarData = useMemo(() => {
        return consolidatedList.slice(0, 8).map(item => ({
            ...item,
            shortName: item.name.length > 20 ? `${item.name.substring(0, 18)}...` : item.name
        }))
    }, [consolidatedList])

    if (!consolidatedList || consolidatedList.length === 0) {
        return (
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col items-center justify-center min-h-[350px] text-gray-400">
                <Package className="w-10 h-10 mb-2 opacity-40" />
                <p className="text-sm font-semibold">Aucune vente enregistrée par catégorie</p>
            </div>
        )
    }

    return (
        <div className="bg-white p-6 md:p-8 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-between">
            {/* Header avec métriques et bascule de vue */}
            <div className="flex flex-wrap items-center justify-between gap-3 mb-6 pb-4 border-b border-gray-100">
                <div>
                    <h3 className="text-lg font-black text-gray-900 flex items-center gap-2">
                        <Package className="w-5 h-5 text-emerald-600" />
                        Ventes par Catégorie
                    </h3>
                    <p className="text-xs text-gray-500 font-medium mt-0.5">
                        {consolidatedList.length} catégories • Total:{' '}
                        <span className="font-bold text-gray-900">
                            <SensitiveValue name="Total Catégories" value={`${totalRevenue.toLocaleString('fr-FR')} MAD`} />
                        </span>
                    </p>
                </div>

                {/* Sélecteur Donut / Barres */}
                <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-xl text-xs font-bold">
                    <button
                        type="button"
                        onClick={() => setViewMode('donut')}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
                            viewMode === 'donut'
                                ? 'bg-white text-gray-900 shadow-sm'
                                : 'text-gray-500 hover:text-gray-900'
                        }`}
                        title="Vue répartition circulaire"
                    >
                        <PieIcon className="w-3.5 h-3.5" />
                        <span>Répartition</span>
                    </button>
                    <button
                        type="button"
                        onClick={() => setViewMode('bars')}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
                            viewMode === 'bars'
                                ? 'bg-white text-gray-900 shadow-sm'
                                : 'text-gray-500 hover:text-gray-900'
                        }`}
                        title="Vue classement en barres"
                    >
                        <BarChart3 className="w-3.5 h-3.5" />
                        <span>Classement</span>
                    </button>
                </div>
            </div>

            {/* Corps du graphique */}
            {viewMode === 'donut' ? (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
                    {/* Donut Chart */}
                    <div className="lg:col-span-5 h-[230px] w-full min-w-0 relative flex items-center justify-center">
                        <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                            <PieChart>
                                <Pie
                                    data={donutData}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={55}
                                    outerRadius={85}
                                    paddingAngle={3}
                                    dataKey="value"
                                    onMouseEnter={(_, index) => setActiveIndex(index)}
                                    onMouseLeave={() => setActiveIndex(null)}
                                >
                                    {donutData.map((_, index) => (
                                        <Cell
                                            key={`cell-${index}`}
                                            fill={PALETTE[index % PALETTE.length]}
                                            stroke="#ffffff"
                                            strokeWidth={2}
                                            style={{
                                                filter: activeIndex === index ? 'brightness(1.1)' : 'none',
                                                cursor: 'pointer',
                                                transition: 'all 0.2s ease'
                                            }}
                                        />
                                    ))}
                                </Pie>
                                <AccessibleTooltip
                                    wrapperProps={{ 'aria-label': 'Détails de la catégorie' }}
                                    contentStyle={{
                                        borderRadius: '16px',
                                        border: '1px solid #f1f5f9',
                                        boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)',
                                        backgroundColor: '#ffffff',
                                        padding: '10px 14px'
                                    }}
                                    formatter={(value: any, name: string) => {
                                        const num = Number(value || 0)
                                        const pct = totalRevenue > 0 ? ((num / totalRevenue) * 100).toFixed(1) : '0'
                                        return [`${num.toLocaleString('fr-FR')} MAD (${pct}%)`, name]
                                    }}
                                />
                            </PieChart>
                        </ResponsiveContainer>

                        {/* Centre du Donut : Résumé */}
                        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center">
                            <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Top 1</span>
                            <span className="text-xs font-black text-gray-900 max-w-[90px] truncate px-1">
                                {consolidatedList[0]?.name || '-'}
                            </span>
                        </div>
                    </div>

                    {/* Légende structurée et propre (Top 6 + Autres) */}
                    <div className="lg:col-span-7 space-y-2.5">
                        {donutData.map((item, index) => {
                            const pct = totalRevenue > 0 ? ((item.value / totalRevenue) * 100).toFixed(1) : '0'
                            const color = PALETTE[index % PALETTE.length]
                            const isHovered = activeIndex === index

                            return (
                                <div
                                    key={item.name}
                                    onMouseEnter={() => setActiveIndex(index)}
                                    onMouseLeave={() => setActiveIndex(null)}
                                    className={`flex items-center justify-between p-2 rounded-xl transition-all cursor-pointer ${
                                        isHovered ? 'bg-gray-50 scale-[1.01]' : 'hover:bg-gray-50/60'
                                    }`}
                                >
                                    <div className="flex items-center gap-2.5 min-w-0 pr-2">
                                        <span
                                            className="w-3 h-3 rounded-full shrink-0 shadow-xs"
                                            style={{ backgroundColor: color }}
                                        />
                                        <span className="text-xs font-bold text-gray-800 truncate" title={item.name}>
                                            {item.name}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-3 shrink-0 text-right">
                                        <span className="text-xs font-black text-gray-900">
                                            <SensitiveValue name={item.name} value={`${item.value.toLocaleString('fr-FR')} MAD`} />
                                        </span>
                                        <span className="text-[11px] font-bold text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full min-w-[42px] text-center">
                                            {pct}%
                                        </span>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                </div>
            ) : (
                /* Vue Barres horizontales pour comparaison nette */
                <div className="h-[260px] w-full min-w-0">
                    <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                        <BarChart
                            layout="vertical"
                            data={topBarData}
                            margin={{ top: 5, right: 30, left: 10, bottom: 5 }}
                        >
                            <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                            <XAxis type="number" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                            <YAxis
                                dataKey="shortName"
                                type="category"
                                tick={{ fontSize: 11, fill: '#1e293b', fontWeight: 600 }}
                                width={120}
                                axisLine={false}
                                tickLine={false}
                            />
                            <AccessibleTooltip
                                wrapperProps={{ 'aria-label': 'Détails de la catégorie' }}
                                contentStyle={{
                                    borderRadius: '12px',
                                    border: '1px solid #f1f5f9',
                                    boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)'
                                }}
                                formatter={(value: any) => [`${Number(value).toLocaleString('fr-FR')} MAD`, 'Revenu']}
                            />
                            <Bar
                                dataKey="value"
                                fill="#059669"
                                radius={[0, 6, 6, 0]}
                                barSize={16}
                            >
                                {topBarData.map((_, index) => (
                                    <Cell key={`bar-${index}`} fill={PALETTE[index % PALETTE.length]} />
                                ))}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            )}

            {/* Tiroir déroulant : Toutes les catégories avec recherche rapide */}
            {consolidatedList.length > 6 && (
                <div className="mt-5 pt-4 border-t border-gray-100">
                    <button
                        type="button"
                        onClick={() => setShowAllList(!showAllList)}
                        className="w-full flex items-center justify-between text-xs font-bold text-gray-600 hover:text-gray-900 py-1 transition-colors"
                    >
                        <span className="flex items-center gap-1.5">
                            <Layers className="w-3.5 h-3.5 text-gray-400" />
                            {showAllList ? 'Masquer la liste complète' : `Afficher l'ensemble des ${consolidatedList.length} catégories`}
                        </span>
                        {showAllList ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                    </button>

                    {showAllList && (
                        <div className="mt-3 max-h-[240px] overflow-y-auto pr-1 space-y-1.5 custom-scrollbar bg-gray-50/70 p-3 rounded-xl border border-gray-100">
                            {consolidatedList.map((cat, idx) => {
                                const pct = totalRevenue > 0 ? ((cat.value / totalRevenue) * 100).toFixed(1) : '0'
                                return (
                                    <div
                                        key={cat.name}
                                        className="flex items-center justify-between py-1.5 px-2 bg-white rounded-lg text-xs border border-gray-100/60"
                                    >
                                        <div className="flex items-center gap-2 min-w-0 pr-2">
                                            <span className="font-mono text-[10px] text-gray-400 w-5 text-right">{idx + 1}.</span>
                                            <span className="font-semibold text-gray-800 truncate">{cat.name}</span>
                                        </div>
                                        <div className="flex items-center gap-2 shrink-0">
                                            <span className="font-bold text-gray-900">
                                                <SensitiveValue name={cat.name} value={`${cat.value.toLocaleString('fr-FR')} MAD`} />
                                            </span>
                                            <span className="text-[10px] text-gray-500 font-semibold min-w-[36px] text-right">
                                                {pct}%
                                            </span>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}
