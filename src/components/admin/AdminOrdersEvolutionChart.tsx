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

const AccessibleTooltip = Tooltip as any;

interface EvolutionData {
    date: string
    count: number
    revenue: number
}

interface ChartProps {
    data: EvolutionData[]
}

type PeriodType = '1m' | '3m' | '1y';

export default function AdminOrdersEvolutionChart({ data }: ChartProps) {
    const [period, setPeriod] = useState<PeriodType>('1m')

    const chartData = useMemo(() => {
        if (!data || data.length === 0) return []

        const now = new Date()
        let daysToSubtract = 30
        if (period === '3m') daysToSubtract = 90
        else if (period === '1y') daysToSubtract = 365

        const cutoffDate = subDays(now, daysToSubtract)
        const cutoffStr = cutoffDate.toISOString().split('T')[0]

        // Filtrer les données selon la période sélectionnée
        const filtered = data.filter(d => d.date >= cutoffStr)
        const sortedData = [...filtered].sort((a, b) => a.date.localeCompare(b.date))

        if (period === '1y') {
            // Pour 1 an, regrouper par mois pour une lisibilité maximale
            const monthlyMap: Record<string, { date: string; dateLabel: string; count: number; revenue: number }> = {}
            sortedData.forEach(item => {
                const monthKey = item.date.slice(0, 7) // 'YYYY-MM'
                if (!monthlyMap[monthKey]) {
                    const parsed = parseISO(`${monthKey}-01`)
                    monthlyMap[monthKey] = {
                        date: monthKey,
                        dateLabel: format(parsed, 'MMM yyyy', { locale: fr }),
                        count: 0,
                        revenue: 0
                    }
                }
                monthlyMap[monthKey].count += item.count
                monthlyMap[monthKey].revenue += item.revenue
            })
            return Object.values(monthlyMap)
        }

        return sortedData.map(item => ({
            ...item,
            dateLabel: format(parseISO(item.date), 'dd MMM', { locale: fr })
        }))
    }, [data, period])

    const totalOrdersInPeriod = useMemo(() => {
        return chartData.reduce((acc, curr) => acc + curr.count, 0)
    }, [chartData])

    const totalRevenueInPeriod = useMemo(() => {
        return chartData.reduce((acc, curr) => acc + curr.revenue, 0)
    }, [chartData])

    return (
        <div className="bg-white p-6 rounded-[2rem] border border-gray-200 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                <div className="flex items-center gap-3">
                    <h3 className="text-lg font-black text-gray-900 tracking-tight">Évolution des Commandes</h3>
                    <span className="text-xs font-bold text-gray-500 bg-gray-100 px-3 py-1 rounded-full border border-gray-200">
                        {totalOrdersInPeriod} commande{totalOrdersInPeriod > 1 ? 's' : ''} ({totalRevenueInPeriod.toFixed(0)} DH)
                    </span>
                </div>

                {/* 3 onglets en haut à droite (1 mois | 3 mois | 1 an) */}
                <div className="inline-flex items-center p-1 bg-gray-100/80 border border-gray-200 rounded-xl self-start sm:self-auto shadow-inner">
                    <button
                        type="button"
                        onClick={() => setPeriod('1m')}
                        className={`px-3 py-1.5 text-xs font-black rounded-lg transition-all ${
                            period === '1m'
                                ? 'bg-white text-blue-600 shadow-sm'
                                : 'text-gray-500 hover:text-gray-900'
                        }`}
                    >
                        1 mois
                    </button>
                    <button
                        type="button"
                        onClick={() => setPeriod('3m')}
                        className={`px-3 py-1.5 text-xs font-black rounded-lg transition-all ${
                            period === '3m'
                                ? 'bg-white text-blue-600 shadow-sm'
                                : 'text-gray-500 hover:text-gray-900'
                        }`}
                    >
                        3 mois
                    </button>
                    <button
                        type="button"
                        onClick={() => setPeriod('1y')}
                        className={`px-3 py-1.5 text-xs font-black rounded-lg transition-all ${
                            period === '1y'
                                ? 'bg-white text-blue-600 shadow-sm'
                                : 'text-gray-500 hover:text-gray-900'
                        }`}
                    >
                        1 an
                    </button>
                </div>
            </div>

            {chartData.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-[260px] text-gray-400">
                    <p className="font-bold uppercase tracking-widest text-xs">Aucune commande sur cette période</p>
                </div>
            ) : (
                <div className="h-[300px] w-full min-w-0">
                    <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                        <AreaChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                            <defs>
                                <linearGradient id="colorCountOrders" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#2563eb" stopOpacity={0.3}/>
                                    <stop offset="95%" stopColor="#2563eb" stopOpacity={0}/>
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
                                contentStyle={{ borderRadius: '1rem', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(37 99 235 / 0.1)' }}
                                itemStyle={{ fontSize: '12px', fontWeight: 700 }}
                                labelStyle={{ fontSize: '10px', fontWeight: 900, color: '#2563eb', textTransform: 'uppercase', marginBottom: '4px' }}
                            />
                            <Legend 
                                iconType="circle"
                                wrapperStyle={{ fontSize: '10px', fontWeight: 700, paddingTop: '20px' }}
                            />
                            <Area type="monotone" name="Commandes" dataKey="count" stroke="#2563eb" strokeWidth={3} fillOpacity={1} fill="url(#colorCountOrders)" activeDot={{ r: 6 }} />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            )}
        </div>
    )
}
