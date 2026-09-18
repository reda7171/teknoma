"use client"

import { useMemo } from 'react'
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer
} from 'recharts'
import { format, parseISO } from 'date-fns'
import { fr } from 'date-fns/locale'

const AccessibleTooltip = Tooltip as any;

interface PostData {
    language: string
    createdAt: Date
}

interface ChartProps {
    data: PostData[]
}

export default function AdminPostsEvolutionChart({ data }: ChartProps) {
    const chartData = useMemo(() => {
        // Group by month
        const grouped = data.reduce((acc, post) => {
            const dateStr = format(new Date(post.createdAt), 'yyyy-MM', { locale: fr })
            if (!acc[dateStr]) {
                acc[dateStr] = { date: dateStr, fr: 0, ar: 0, en: 0, total: 0 }
            }
            if (post.language === 'fr') acc[dateStr].fr++
            else if (post.language === 'ar') acc[dateStr].ar++
            else if (post.language === 'en') acc[dateStr].en++
            
            acc[dateStr].total++
            return acc
        }, {} as Record<string, any>)

        // Convert to array and sort by date
        return Object.values(grouped)
            .sort((a, b) => a.date.localeCompare(b.date))
            .map(item => ({
                ...item,
                dateLabel: format(parseISO(item.date + '-01'), 'MMM yyyy', { locale: fr })
            }))
    }, [data])

    if (chartData.length === 0) {
        return (
            <div className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm flex items-center justify-center h-[300px]">
                <p className="text-gray-400 font-bold uppercase tracking-widest text-[10px]">Pas de données disponibles</p>
            </div>
        )
    }

    return (
        <div className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm">
            <h3 className="text-lg font-black text-black tracking-tight mb-6">Évolution par Langue</h3>
            <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                        <XAxis 
                            dataKey="dateLabel" 
                            axisLine={false}
                            tickLine={false}
                            tick={{ fontSize: 10, fontWeight: 700, fill: '#9ca3af' }}
                            dy={10}
                        />
                        <YAxis 
                            axisLine={false}
                            tickLine={false}
                            tick={{ fontSize: 10, fontWeight: 700, fill: '#9ca3af' }}
                            dx={-10}
                        />
                        <AccessibleTooltip 
                            wrapperProps={{ 'aria-label': 'Détails des publications' }}
                            contentStyle={{ borderRadius: '1rem', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)' }}
                            itemStyle={{ fontSize: '12px', fontWeight: 700 }}
                            labelStyle={{ fontSize: '10px', fontWeight: 900, color: '#9ca3af', textTransform: 'uppercase', marginBottom: '4px' }}
                        />
                        <Legend 
                            iconType="circle"
                            wrapperStyle={{ fontSize: '10px', fontWeight: 700, paddingTop: '20px' }}
                        />
                        <Line type="monotone" name="Français" dataKey="fr" stroke="#000000" strokeWidth={3} dot={{ r: 4, strokeWidth: 2 }} activeDot={{ r: 6 }} />
                        <Line type="monotone" name="العربية" dataKey="ar" stroke="#2563eb" strokeWidth={3} dot={{ r: 4, strokeWidth: 2 }} activeDot={{ r: 6 }} />
                        <Line type="monotone" name="English" dataKey="en" stroke="#10b981" strokeWidth={3} dot={{ r: 4, strokeWidth: 2 }} activeDot={{ r: 6 }} />
                    </LineChart>
                </ResponsiveContainer>
            </div>
        </div>
    )
}
