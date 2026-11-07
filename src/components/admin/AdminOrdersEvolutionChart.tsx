"use client"

import { useMemo, useState } from 'react'
import {
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Legend
} from 'recharts'
import { format, parseISO, subDays } from 'date-fns'
import { fr } from 'date-fns/locale'
import { useTranslations } from 'next-intl'
import { TrendingUp, TrendingDown, Layers, ArrowUpRight, ArrowDownRight } from 'lucide-react'

const AccessibleTooltip = Tooltip as any;

export interface EvolutionData {
    date: string
    count: number
    revenue: number
}

export type PeriodType = '1m' | '3m' | '1y' | 'all' | 'n_vs_n1';

interface ChartProps {
    data: EvolutionData[]
    initialPeriod?: PeriodType
}

const MONTH_LABELS_FR = ['Janv', 'Févr', 'Mars', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sept', 'Oct', 'Nov', 'Déc'];

export default function AdminOrdersEvolutionChart({ data, initialPeriod = 'all' }: ChartProps) {
    const t = useTranslations('AdminOrdersEvolution')
    const [period, setPeriod] = useState<PeriodType>(initialPeriod)
    const [compareN1, setCompareN1] = useState(false)
    const [metric, setMetric] = useState<'count' | 'revenue'>('count')

    // Annees disponibles dans le dataset
    const availableYears = useMemo(() => {
        const yearsSet = new Set<number>()
        if (data && data.length > 0) {
            data.forEach(item => {
                const y = parseInt(item.date.slice(0, 4), 10)
                if (!isNaN(y)) yearsSet.add(y)
            })
        }
        const currentYear = new Date().getFullYear()
        yearsSet.add(currentYear)
        return Array.from(yearsSet).sort((a, b) => b - a)
    }, [data])

    const selectedYearN = availableYears[0] || new Date().getFullYear()
    const yearN1 = selectedYearN - 1

    // Le mode comparatif est actif s'il est selectionne via l'onglet dedie ou active sur 1 an / all
    const isComparativeMode = period === 'n_vs_n1' || (compareN1 && (period === '1y' || period === 'all'))

    // Agregation des donnees pour le graphique
    const chartData = useMemo(() => {
        if (!data || data.length === 0) return []

        // 1. Mode N vs N-1 (Superposition des 12 mois de l'annee civile)
        if (period === 'n_vs_n1') {
            const now = new Date()
            const currentYear = now.getFullYear()
            const currentMonthIdx = now.getMonth()

            return MONTH_LABELS_FR.map((monthLabel, idx) => {
                const monthStr = String(idx + 1).padStart(2, '0')
                const isFutureMonthN = selectedYearN === currentYear && idx > currentMonthIdx

                // Commandes et CA annee N
                const itemsN = data.filter(d => d.date.startsWith(`${selectedYearN}-${monthStr}`))
                const countN = isFutureMonthN ? null : itemsN.reduce((sum, item) => sum + item.count, 0)
                const revenueN = isFutureMonthN ? null : itemsN.reduce((sum, item) => sum + item.revenue, 0)

                // Commandes et CA annee N-1
                const itemsN1 = data.filter(d => d.date.startsWith(`${yearN1}-${monthStr}`))
                const countN1 = itemsN1.reduce((sum, item) => sum + item.count, 0)
                const revenueN1 = itemsN1.reduce((sum, item) => sum + item.revenue, 0)

                return {
                    dateLabel: monthLabel,
                    monthNum: idx + 1,
                    countN,
                    revenueN,
                    countN1,
                    revenueN1,
                    isFuture: isFutureMonthN
                }
            })
        }

        // 2. Modes temporels standards (1m, 3m, 1y, all)
        let filtered = data
        if (period !== 'all') {
            const now = new Date()
            let daysToSubtract = 30
            if (period === '3m') daysToSubtract = 90
            else if (period === '1y') daysToSubtract = 365

            const cutoffDate = subDays(now, daysToSubtract)
            const cutoffStr = cutoffDate.toISOString().split('T')[0]
            filtered = data.filter(d => d.date >= cutoffStr)
        }

        const sortedData = [...filtered].sort((a, b) => a.date.localeCompare(b.date))

        // Regroupement mensuel pour 1 an et All time
        if (period === '1y' || period === 'all') {
            const monthlyMap: Record<string, {
                date: string;
                dateLabel: string;
                count: number;
                revenue: number;
                countN: number;
                revenueN: number;
                countN1: number;
                revenueN1: number;
            }> = {}

            sortedData.forEach(item => {
                const monthKey = item.date.slice(0, 7) // 'YYYY-MM'
                if (!monthlyMap[monthKey]) {
                    const parsed = parseISO(`${monthKey}-01`)
                    monthlyMap[monthKey] = {
                        date: monthKey,
                        dateLabel: format(parsed, 'MMM yyyy', { locale: fr }),
                        count: 0,
                        revenue: 0,
                        countN: 0,
                        revenueN: 0,
                        countN1: 0,
                        revenueN1: 0
                    }
                }
                monthlyMap[monthKey].count += item.count
                monthlyMap[monthKey].revenue += item.revenue
                monthlyMap[monthKey].countN += item.count
                monthlyMap[monthKey].revenueN += item.revenue
            })

            // Calcul des valeurs N-1 correspondantes si mode comparatif
            if (isComparativeMode) {
                Object.keys(monthlyMap).forEach(monthKey => {
                    const [yearStr, monthStr] = monthKey.split('-')
                    const prevYearStr = String(parseInt(yearStr, 10) - 1)
                    const prevMonthPrefix = `${prevYearStr}-${monthStr}`

                    const itemsN1 = data.filter(d => d.date.startsWith(prevMonthPrefix))
                    monthlyMap[monthKey].countN1 = itemsN1.reduce((sum, item) => sum + item.count, 0)
                    monthlyMap[monthKey].revenueN1 = itemsN1.reduce((sum, item) => sum + item.revenue, 0)
                })
            }

            return Object.values(monthlyMap)
        }

        // Mode journalier pour 1 mois et 3 mois
        return sortedData.map(item => ({
            ...item,
            countN: item.count,
            revenueN: item.revenue,
            countN1: 0,
            revenueN1: 0,
            dateLabel: format(parseISO(item.date), 'dd MMM', { locale: fr })
        }))
    }, [data, period, selectedYearN, yearN1, isComparativeMode])

    // Totaux et metriques de performance
    const summaryMetrics = useMemo(() => {
        if (isComparativeMode) {
            let totalOrdersN = 0
            let totalRevenueN = 0
            let totalOrdersN1 = 0
            let totalRevenueN1 = 0

            chartData.forEach((row: any) => {
                if (row.countN !== null && row.countN !== undefined) {
                    totalOrdersN += row.countN
                    totalRevenueN += (row.revenueN || 0)
                    totalOrdersN1 += (row.countN1 || 0)
                    totalRevenueN1 += (row.revenueN1 || 0)
                }
            })

            const ordersGrowth = totalOrdersN1 > 0
                ? Math.round(((totalOrdersN - totalOrdersN1) / totalOrdersN1) * 1000) / 10
                : null

            const revenueGrowth = totalRevenueN1 > 0
                ? Math.round(((totalRevenueN - totalRevenueN1) / totalRevenueN1) * 1000) / 10
                : null

            return {
                totalOrdersN,
                totalRevenueN,
                totalOrdersN1,
                totalRevenueN1,
                ordersGrowth,
                revenueGrowth
            }
        }

        const totalOrders = chartData.reduce((acc: number, curr: any) => acc + (curr.count || 0), 0)
        const totalRevenue = chartData.reduce((acc: number, curr: any) => acc + (curr.revenue || 0), 0)

        return {
            totalOrders,
            totalRevenue,
            ordersGrowth: null,
            revenueGrowth: null
        }
    }, [chartData, isComparativeMode])

    const primaryColor = '#2563eb'
    const secondaryColor = '#64748b'

    return (
        <div className="bg-white p-6 rounded-[2rem] sm:rounded-[3rem] border border-gray-100 shadow-xl shadow-black/5">
            {/* Header avec titres, KPI et boutons d'action */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6">
                <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-3">
                        <h3 className="text-lg font-black text-gray-900 tracking-tight">
                            {t('title')}
                        </h3>

                        {isComparativeMode ? (
                            <div className="flex flex-wrap items-center gap-2">
                                <span className="text-xs font-bold text-blue-700 bg-blue-50 px-3 py-1 rounded-full border border-blue-200 font-mono">
                                    N ({selectedYearN}) : {summaryMetrics.totalOrdersN} cmd ({Math.round(summaryMetrics.totalRevenueN || 0).toLocaleString('fr-FR')} DH)
                                </span>
                                <span className="text-xs font-bold text-slate-600 bg-slate-100 px-3 py-1 rounded-full border border-slate-200 font-mono">
                                    N-1 ({yearN1}) : {summaryMetrics.totalOrdersN1} cmd ({Math.round(summaryMetrics.totalRevenueN1 || 0).toLocaleString('fr-FR')} DH)
                                </span>
                                {summaryMetrics.ordersGrowth !== null && (
                                    <span className={`inline-flex items-center gap-1 text-xs font-black px-2.5 py-0.5 rounded-full border ${
                                        summaryMetrics.ordersGrowth >= 0
                                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                            : 'bg-rose-50 text-rose-700 border-rose-200'
                                    }`}>
                                        {summaryMetrics.ordersGrowth >= 0 ? (
                                            <ArrowUpRight className="w-3.5 h-3.5" />
                                        ) : (
                                            <ArrowDownRight className="w-3.5 h-3.5" />
                                        )}
                                        {summaryMetrics.ordersGrowth >= 0 ? `+${summaryMetrics.ordersGrowth}` : summaryMetrics.ordersGrowth}% {t('growthVsN1')}
                                    </span>
                                )}
                            </div>
                        ) : (
                            <span className="text-xs font-bold text-gray-700 bg-gray-100 px-3 py-1 rounded-full border border-gray-200 font-mono">
                                {summaryMetrics.totalOrders} {t('tooltipOrders').toLowerCase()}{summaryMetrics.totalOrders && summaryMetrics.totalOrders > 1 ? 's' : ''} ({Math.round(summaryMetrics.totalRevenue || 0).toLocaleString('fr-FR')} DH)
                            </span>
                        )}
                    </div>

                    {isComparativeMode && (
                        <p className="text-xs text-gray-500 font-medium">
                            {t('subtitleNvsN1')} ({selectedYearN} vs {yearN1})
                        </p>
                    )}
                </div>

                {/* Controles de filtres : Metrique, Superposition et Periodes */}
                <div className="flex flex-wrap items-center gap-2 self-start lg:self-auto">
                    {/* Toggle Metrique : Commandes vs Chiffre d'Affaires */}
                    <div className="inline-flex items-center p-1 bg-gray-100/80 border border-gray-200 rounded-xl shadow-inner text-xs font-black">
                        <button
                            type="button"
                            onClick={() => setMetric('count')}
                            className={`px-2.5 py-1 rounded-lg transition-all ${
                                metric === 'count'
                                    ? 'bg-white text-blue-600 shadow-sm'
                                    : 'text-gray-500 hover:text-gray-900'
                            }`}
                        >
                            {t('metricOrders')}
                        </button>
                        <button
                            type="button"
                            onClick={() => setMetric('revenue')}
                            className={`px-2.5 py-1 rounded-lg transition-all ${
                                metric === 'revenue'
                                    ? 'bg-white text-blue-600 shadow-sm'
                                    : 'text-gray-500 hover:text-gray-900'
                            }`}
                        >
                            {t('metricRevenue')}
                        </button>
                    </div>

                    {/* Bouton Superposition N-1 rapide (actif pour 1 an et all) */}
                    {(period === '1y' || period === 'all') && (
                        <button
                            type="button"
                            onClick={() => setCompareN1(!compareN1)}
                            className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-black rounded-xl border transition-all ${
                                compareN1
                                    ? 'bg-blue-50 text-blue-700 border-blue-300 shadow-sm'
                                    : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                            }`}
                        >
                            <Layers className="w-3.5 h-3.5 text-blue-600" />
                            <span>{t('overlayN1')}</span>
                        </button>
                    )}

                    {/* Onglets de periode */}
                    <div className="inline-flex items-center p-1 bg-gray-100/80 border border-gray-200 rounded-xl shadow-inner text-xs font-black">
                        <button
                            type="button"
                            onClick={() => { setPeriod('1m'); setCompareN1(false); }}
                            className={`px-3 py-1.5 rounded-lg transition-all ${
                                period === '1m'
                                    ? 'bg-white text-blue-600 shadow-sm'
                                    : 'text-gray-500 hover:text-gray-900'
                            }`}
                        >
                            {t('period1m')}
                        </button>
                        <button
                            type="button"
                            onClick={() => { setPeriod('3m'); setCompareN1(false); }}
                            className={`px-3 py-1.5 rounded-lg transition-all ${
                                period === '3m'
                                    ? 'bg-white text-blue-600 shadow-sm'
                                    : 'text-gray-500 hover:text-gray-900'
                            }`}
                        >
                            {t('period3m')}
                        </button>
                        <button
                            type="button"
                            onClick={() => setPeriod('1y')}
                            className={`px-3 py-1.5 rounded-lg transition-all ${
                                period === '1y'
                                    ? 'bg-white text-blue-600 shadow-sm'
                                    : 'text-gray-500 hover:text-gray-900'
                            }`}
                        >
                            {t('period1y')}
                        </button>
                        <button
                            type="button"
                            onClick={() => setPeriod('all')}
                            className={`px-3 py-1.5 rounded-lg transition-all ${
                                period === 'all'
                                    ? 'bg-white text-blue-600 shadow-sm'
                                    : 'text-gray-500 hover:text-gray-900'
                            }`}
                        >
                            {t('periodAll')}
                        </button>
                        <button
                            type="button"
                            onClick={() => { setPeriod('n_vs_n1'); setCompareN1(true); }}
                            className={`px-3 py-1.5 rounded-lg transition-all ${
                                period === 'n_vs_n1'
                                    ? 'bg-white text-blue-600 shadow-sm'
                                    : 'text-gray-500 hover:text-gray-900'
                            }`}
                        >
                            {t('periodNvsN1')}
                        </button>
                    </div>
                </div>
            </div>

            {/* Zone du graphique */}
            {chartData.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-[280px] text-gray-400">
                    <p className="font-bold uppercase tracking-widest text-xs">{t('noData')}</p>
                </div>
            ) : (
                <div className="h-[320px] w-full min-w-0">
                    <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                        <AreaChart data={chartData} margin={{ top: 10, right: 30, left: 10, bottom: 5 }}>
                            <defs>
                                <linearGradient id="colorCountOrdersN" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor={primaryColor} stopOpacity={0.25}/>
                                    <stop offset="95%" stopColor={primaryColor} stopOpacity={0}/>
                                </linearGradient>
                                <linearGradient id="colorCountOrdersN1" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor={secondaryColor} stopOpacity={0.15}/>
                                    <stop offset="95%" stopColor={secondaryColor} stopOpacity={0}/>
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                            <XAxis 
                                dataKey="dateLabel" 
                                axisLine={false}
                                tickLine={false}
                                tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }}
                                dy={10}
                            />
                            <YAxis 
                                axisLine={false}
                                tickLine={false}
                                tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }}
                                dx={-10}
                            />
                            <AccessibleTooltip 
                                wrapperProps={{ 'aria-label': 'Détails des commandes' }}
                                contentStyle={{
                                    borderRadius: '1rem',
                                    border: '1px solid #e2e8f0',
                                    boxShadow: '0 4px 6px -1px rgb(37 99 235 / 0.1)',
                                    backgroundColor: '#ffffff'
                                }}
                                itemStyle={{ fontSize: '12px', fontWeight: 700 }}
                                labelStyle={{
                                    fontSize: '11px',
                                    fontWeight: 900,
                                    color: '#2563eb',
                                    textTransform: 'uppercase',
                                    marginBottom: '6px'
                                }}
                                formatter={(value: any, name: string) => {
                                    if (value === null || value === undefined) {
                                        return ['-', name]
                                    }
                                    const formattedVal = metric === 'revenue'
                                        ? `${Math.round(value).toLocaleString('fr-FR')} DH`
                                        : `${value} ${t('tooltipOrders').toLowerCase()}`
                                    return [formattedVal, name]
                                }}
                            />
                            <Legend 
                                iconType="circle"
                                wrapperStyle={{ fontSize: '11px', fontWeight: 700, paddingTop: '16px' }}
                            />

                            {/* Courbe Année N (Bleu continu) */}
                            <Area
                                type="monotone"
                                name={
                                    isComparativeMode
                                        ? `${t('currentYear')} (${selectedYearN})`
                                        : (metric === 'count' ? t('metricOrders') : t('metricRevenue'))
                                }
                                dataKey={isComparativeMode ? (metric === 'count' ? 'countN' : 'revenueN') : (metric === 'count' ? 'count' : 'revenue')}
                                stroke={primaryColor}
                                strokeWidth={3}
                                fillOpacity={1}
                                fill="url(#colorCountOrdersN)"
                                connectNulls={false}
                                activeDot={{ r: 6, fill: primaryColor, stroke: '#ffffff', strokeWidth: 2 }}
                            />

                            {/* Courbe Année N-1 (Ardoise pointillée comparative) */}
                            {isComparativeMode && (
                                <Area
                                    type="monotone"
                                    name={`${t('previousYear')} (${yearN1})`}
                                    dataKey={metric === 'count' ? 'countN1' : 'revenueN1'}
                                    stroke={secondaryColor}
                                    strokeWidth={2}
                                    strokeDasharray="5 5"
                                    fillOpacity={1}
                                    fill="url(#colorCountOrdersN1)"
                                    connectNulls={true}
                                    activeDot={{ r: 5, fill: secondaryColor, stroke: '#ffffff', strokeWidth: 2 }}
                                />
                            )}
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            )}
        </div>
    )
}
