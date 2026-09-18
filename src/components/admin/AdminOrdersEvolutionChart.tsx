"use client"

import { useMemo } from 'react'
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
import { format, parseISO } from 'date-fns'
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

export default function AdminOrdersEvolutionChart({ data }: ChartProps) {
    const chartData = useMemo(() => {
        if (!data || data.length === 0) return []
        
        // Ensure data is sorted
        const sortedData = [...data].sort((a, b) => a.date.localeCompare(b.date))
        
        return sortedData.map(item => ({
            ...item,
            dateLabel: format(parseISO(item.date), 'dd MMM', { locale: fr })
        }))
    }, [data])

    if (chartData.length === 0) {
        return (
            <div className="bg-white p-6 rounded-[2rem] border border-gray-200 shadow-sm flex items-center justify-center h-[300px]">
                <p className="text-gray-400 font-bold uppercase tracking-widest text-[10px]">Pas de données disponibles</p>
            </div>
        )
    }

    return (
        <div className="bg-white p-6 rounded-[2rem] border border-gray-200 shadow-sm">
            <h3 className="text-lg font-black text-gray-900 tracking-tight mb-6">Évolution des Commandes</h3>
            <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
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
        </div>
    )
}
