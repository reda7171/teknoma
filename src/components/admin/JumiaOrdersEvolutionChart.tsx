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

export default function JumiaOrdersEvolutionChart({ data }: ChartProps) {
    const chartData = useMemo(() => {
        if (!data) return []
        return data.map(item => ({
            ...item,
            dateLabel: format(parseISO(item.date), 'dd MMM', { locale: fr })
        }))
    }, [data])

    if (chartData.length === 0) {
        return (
            <div className="bg-white p-6 rounded-[2rem] border border-orange-100 shadow-sm flex items-center justify-center h-[300px]">
                <p className="text-gray-400 font-bold uppercase tracking-widest text-[10px]">Pas de données disponibles</p>
            </div>
        )
    }

    return (
        <div className="bg-white p-6 rounded-[2rem] border border-orange-100 shadow-sm">
            <h3 className="text-lg font-black text-slate-900 tracking-tight mb-6">Évolution des Commandes</h3>
            <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                        <defs>
                            <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#f97316" stopOpacity={0.3}/>
                                <stop offset="95%" stopColor="#f97316" stopOpacity={0}/>
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#fff7ed" />
                        <XAxis 
                            dataKey="dateLabel" 
                            axisLine={false}
                            tickLine={false}
                            tick={{ fontSize: 10, fontWeight: 700, fill: '#fdba74' }}
                            dy={10}
                        />
                        <YAxis 
                            axisLine={false}
                            tickLine={false}
                            tick={{ fontSize: 10, fontWeight: 700, fill: '#fdba74' }}
                            dx={-10}
                        />
                        <AccessibleTooltip
wrapperProps={{ 'aria-label': 'Détails de l\'évolution des commandes Jumia' }}
                            contentStyle={{ borderRadius: '1rem', border: '1px solid #ffedd5', boxShadow: '0 4px 6px -1px rgb(249 115 22 / 0.1)' }}
                            itemStyle={{ fontSize: '12px', fontWeight: 700 }}
                            labelStyle={{ fontSize: '10px', fontWeight: 900, color: '#f97316', textTransform: 'uppercase', marginBottom: '4px' }}
                        />
                        <Legend 
                            iconType="circle"
                            wrapperStyle={{ fontSize: '10px', fontWeight: 700, paddingTop: '20px' }}
                        />
                        <Area type="monotone" name="Commandes" dataKey="count" stroke="#f97316" strokeWidth={3} fillOpacity={1} fill="url(#colorCount)" activeDot={{ r: 6 }} />
                    </AreaChart>
                </ResponsiveContainer>
            </div>
        </div>
    )
}
