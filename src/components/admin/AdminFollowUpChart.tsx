'use client'

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { useMemo } from 'react'

type OrderType = {
    id: string
    followUpCount?: number
}

const COLORS = ['#94a3b8', '#3b82f6', '#10b981', '#f59e0b']

export default function AdminFollowUpChart({ orders }: { orders: OrderType[] }) {
    const data = useMemo(() => {
        let none = 0
        let one = 0
        let two = 0
        let more = 0

        orders.forEach(order => {
            const count = order.followUpCount || 0
            if (count === 0) none++
            else if (count === 1) one++
            else if (count === 2) two++
            else more++
        })

        return [
            { name: 'Jamais relancé', value: none },
            { name: '1 Relance', value: one },
            { name: '2 Relances', value: two },
            { name: '+3 Relances', value: more }
        ].filter(d => d.value > 0) // N'afficher que ceux avec des valeurs
    }, [orders])

    // S'il n'y a pas de commandes, afficher un état vide
    if (orders.length === 0) {
        return (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                <h3 className="font-bold text-gray-900 mb-4">Statistiques de Relances</h3>
                <div className="h-[250px] flex items-center justify-center text-sm font-medium text-gray-400">
                    Aucune donnée disponible
                </div>
            </div>
        )
    }

    return (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <h3 className="font-bold text-gray-900 mb-4 text-lg">Statistiques de Relances (Taux de Couverture)</h3>
            <div className="h-[250px]">
                <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                        <Pie
                            data={data}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={90}
                            paddingAngle={2}
                            dataKey="value"
                            stroke="none"
                        >
                            {data.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                        </Pie>
                        <Tooltip 
                            contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)' }}
                            itemStyle={{ color: '#111827', fontWeight: 600 }}
                            formatter={(value: number, name: string, props: any) => {
                                const total = orders.length
                                const percent = ((value / total) * 100).toFixed(0)
                                return [`${value} commandes (${percent}%)`, name]
                            }}
                        />
                        <Legend 
                            verticalAlign="bottom" 
                            height={36} 
                            iconType="circle"
                            formatter={(value) => <span className="text-sm font-medium text-gray-600">{value}</span>}
                        />
                    </PieChart>
                </ResponsiveContainer>
            </div>
        </div>
    )
}
