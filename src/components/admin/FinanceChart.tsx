'use client'

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

export default function FinanceChart({ data }: { data: any[] }) {
    return (
        <div className="h-[400px] w-full bg-white p-6 md:p-10 rounded-[3rem] border border-gray-100 shadow-xl shadow-black/5 mt-6">
            <h2 className="text-2xl font-black mb-8 px-4 tracking-tight">Évolution Financière</h2>
            <ResponsiveContainer width="100%" height="85%">
                <AreaChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                    <defs>
                        <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                            <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                        </linearGradient>
                        <linearGradient id="colorProfit" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#000000" stopOpacity={0.3}/>
                            <stop offset="95%" stopColor="#000000" stopOpacity={0}/>
                        </linearGradient>
                        <linearGradient id="colorJumia" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#f97316" stopOpacity={0.3}/>
                            <stop offset="95%" stopColor="#f97316" stopOpacity={0}/>
                        </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                    <XAxis 
                        dataKey="name" 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{ fontSize: 12, fill: '#9ca3af', fontWeight: 600 }} 
                        dy={10} 
                    />
                    <YAxis 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{ fontSize: 12, fill: '#9ca3af', fontWeight: 600 }} 
                        tickFormatter={(val) => `${val}`} 
                    />
                    <Tooltip 
                        contentStyle={{ 
                            borderRadius: '1rem', 
                            border: 'none', 
                            boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1)',
                            fontWeight: 'bold',
                            fontSize: '14px'
                        }}
                        formatter={(value: number) => [`${Math.round(value)} درهم`]}
                    />
                    <Legend 
                        iconType="circle" 
                        wrapperStyle={{ paddingTop: '20px', fontSize: '12px', fontWeight: 'bold' }} 
                    />
                    <Area 
                        type="monotone" 
                        name="Chiffre d'Affaire" 
                        dataKey="revenue" 
                        stroke="#10b981" 
                        strokeWidth={4} 
                        fillOpacity={1} 
                        fill="url(#colorRevenue)" 
                    />
                    <Area 
                        type="monotone" 
                        name="Bénéfice Net" 
                        dataKey="profit" 
                        stroke="#000000" 
                        strokeWidth={4} 
                        fillOpacity={1} 
                        fill="url(#colorProfit)" 
                    />
                    <Area 
                        type="monotone" 
                        name="Virements Jumia" 
                        dataKey="jumia" 
                        stroke="#f97316" 
                        strokeWidth={4} 
                        fillOpacity={1} 
                        fill="url(#colorJumia)" 
                    />
                </AreaChart>
            </ResponsiveContainer>
        </div>
    )
}
