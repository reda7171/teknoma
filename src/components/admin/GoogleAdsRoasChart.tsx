'use client'

import {
    ComposedChart,
    Area,
    Bar,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Legend
} from 'recharts'
import { TrendingUp, DollarSign, Target, ShoppingBag, ArrowUpRight } from 'lucide-react'
import { RoasEvolutionResult } from '@/lib/actions/ads-roas'

const AccessibleTooltip = Tooltip as any

interface GoogleAdsRoasChartProps {
    data: RoasEvolutionResult
}

export default function GoogleAdsRoasChart({ data }: GoogleAdsRoasChartProps) {
    const { points, totalRevenue, totalAdSpend, averageRoas, netMargin, deliveredOrdersCount } = data

    return (
        <div className="bg-white rounded-[3rem] p-6 md:p-10 border border-gray-100 shadow-xl shadow-black/5 space-y-8">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-gray-100">
                <div>
                    <div className="flex items-center gap-2 mb-1.5">
                        <span className="px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-black uppercase tracking-wider">
                            Smart Bidding COD
                        </span>
                        <span className="px-3 py-1 rounded-full bg-amber-100 text-amber-800 text-[10px] font-black uppercase tracking-wider">
                            ROAS Net : {averageRoas}x
                        </span>
                    </div>
                    <h2 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight">
                        Évolution du ROAS Net &amp; Recettes COD
                    </h2>
                    <p className="text-xs text-slate-500 font-medium mt-1">
                        Recettes réelles des commandes livrées &amp; encaissées vs dépenses publicitaires Google Ads
                    </p>
                </div>

                <div className="flex items-center gap-2">
                    <span className="inline-flex items-center gap-1 px-4 py-2 bg-slate-50 text-slate-700 text-xs font-bold rounded-xl border border-slate-200">
                        <Target className="w-3.5 h-3.5 text-blue-600" />
                        <span>{deliveredOrdersCount} Commandes Livrées</span>
                    </span>
                </div>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="p-5 bg-slate-50 rounded-2xl border border-slate-100 space-y-1">
                    <div className="flex items-center justify-between text-slate-500 text-xs font-bold">
                        <span>Recettes COD Encaissées</span>
                        <ShoppingBag className="w-4 h-4 text-emerald-600" />
                    </div>
                    <p className="text-2xl font-black text-slate-900 tracking-tight">
                        {totalRevenue.toLocaleString('fr-FR')} <span className="text-xs font-bold text-slate-500">MAD</span>
                    </p>
                    <span className="text-[10px] font-bold text-emerald-600 flex items-center gap-0.5">
                        <ArrowUpRight className="w-3 h-3" />
                        Conversions réelles livrées
                    </span>
                </div>

                <div className="p-5 bg-slate-50 rounded-2xl border border-slate-100 space-y-1">
                    <div className="flex items-center justify-between text-slate-500 text-xs font-bold">
                        <span>Dépenses Publicitaires</span>
                        <DollarSign className="w-4 h-4 text-slate-600" />
                    </div>
                    <p className="text-2xl font-black text-slate-900 tracking-tight">
                        {totalAdSpend.toLocaleString('fr-FR')} <span className="text-xs font-bold text-slate-500">MAD</span>
                    </p>
                    <span className="text-[10px] font-bold text-slate-500">
                        Search &amp; Performance Max
                    </span>
                </div>

                <div className="p-5 bg-amber-50/70 rounded-2xl border border-amber-200/70 space-y-1">
                    <div className="flex items-center justify-between text-amber-800 text-xs font-bold">
                        <span>ROAS Net Moyen</span>
                        <TrendingUp className="w-4 h-4 text-amber-600" />
                    </div>
                    <p className="text-2xl font-black text-amber-950 tracking-tight">
                        {averageRoas}x
                    </p>
                    <span className="text-[10px] font-bold text-amber-700">
                        {averageRoas >= 4 ? '🟢 Excellent retour sur dépenses' : '🟡 Rentabilité correcte'}
                    </span>
                </div>

                <div className="p-5 bg-emerald-50/70 rounded-2xl border border-emerald-200/70 space-y-1">
                    <div className="flex items-center justify-between text-emerald-800 text-xs font-bold">
                        <span>Marge Nette après Ads</span>
                        <DollarSign className="w-4 h-4 text-emerald-600" />
                    </div>
                    <p className="text-2xl font-black text-emerald-950 tracking-tight">
                        +{netMargin.toLocaleString('fr-FR')} <span className="text-xs font-bold text-emerald-700">MAD</span>
                    </p>
                    <span className="text-[10px] font-bold text-emerald-700">
                        Bénéfice brut après acquisition
                    </span>
                </div>
            </div>

            {/* Chart Area */}
            <div className="h-[360px] w-full min-w-0 pt-4">
                <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                    <ComposedChart data={points} margin={{ top: 10, right: 30, left: 10, bottom: 0 }}>
                        <defs>
                            <linearGradient id="colorRoasRevenue" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#10b981" stopOpacity={0.25} />
                                <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis
                            dataKey="name"
                            axisLine={false}
                            tickLine={false}
                            tick={{ fontSize: 12, fill: '#64748b', fontWeight: 600 }}
                            dy={10}
                        />
                        {/* Axe gauche : Revenus & Dépenses en MAD */}
                        <YAxis
                            yAxisId="left"
                            axisLine={false}
                            tickLine={false}
                            tick={{ fontSize: 12, fill: '#64748b', fontWeight: 600 }}
                            tickFormatter={(val) => `${val} DH`}
                        />
                        {/* Axe droit : Multiplicateur ROAS (1x, 2x, etc.) */}
                        <YAxis
                            yAxisId="right"
                            orientation="right"
                            axisLine={false}
                            tickLine={false}
                            tick={{ fontSize: 12, fill: '#d97706', fontWeight: 700 }}
                            tickFormatter={(val) => `${val}x`}
                            domain={[0, 'auto']}
                        />
                        <AccessibleTooltip
                            contentStyle={{
                                borderRadius: '1rem',
                                border: 'none',
                                boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1)',
                                fontWeight: 'bold',
                                fontSize: '13px',
                                backgroundColor: '#ffffff',
                                padding: '12px 16px'
                            }}
                            formatter={(value: any, name: string) => {
                                if (name === 'ROAS Net') {
                                    return [`${value}x`, name]
                                }
                                return [`${Number(value || 0).toLocaleString('fr-FR')} MAD`, name]
                            }}
                            labelFormatter={(label: string, payload: any[]) => {
                                const period = payload?.[0]?.payload?.period
                                return `${label} (${period || ''})`
                            }}
                        />
                        <Legend
                            wrapperStyle={{ paddingTop: '20px', fontSize: '12px', fontWeight: 'bold' }}
                        />

                        {/* Recettes COD Réelles (Aire dégradée) */}
                        <Area
                            yAxisId="left"
                            type="monotone"
                            dataKey="revenue"
                            name="Recettes COD Réelles"
                            stroke="#10b981"
                            strokeWidth={3}
                            fillOpacity={1}
                            fill="url(#colorRoasRevenue)"
                        />

                        {/* Dépenses Publicitaires (Barres sombres) */}
                        <Bar
                            yAxisId="left"
                            dataKey="adSpend"
                            name="Dépenses Ads"
                            fill="#334155"
                            radius={[6, 6, 0, 0]}
                            maxBarSize={32}
                        />

                        {/* Ligne ROAS Net (Axe droit ambre) */}
                        <Line
                            yAxisId="right"
                            type="monotone"
                            dataKey="roas"
                            name="ROAS Net"
                            stroke="#f59e0b"
                            strokeWidth={3}
                            dot={{ fill: '#f59e0b', r: 4, strokeWidth: 2, stroke: '#ffffff' }}
                            activeDot={{ r: 6, fill: '#b45309' }}
                        />
                    </ComposedChart>
                </ResponsiveContainer>
            </div>
        </div>
    )
}

