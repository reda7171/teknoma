'use client'

import { useTranslations } from 'next-intl'
import { Link } from '@/i18n/routing'
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
    Legend,
} from 'recharts'
import { TrendingUp, DollarSign, Target, ShoppingBag, ArrowUpRight, ExternalLink } from 'lucide-react'
import type { RoasDataPoint, RoasEvolutionResult, RoasSpendSource } from '@/lib/actions/ads-roas'

const AccessibleTooltip = Tooltip as React.ComponentType<Record<string, unknown>>

interface GoogleAdsRoasChartProps {
    data: RoasEvolutionResult
}

function getSourceBadgeClass(source: RoasSpendSource): string {
    if (source === 'IMPORTED') return 'bg-blue-50 text-blue-700 border border-blue-200'
    if (source === 'ACCOUNTING') return 'bg-emerald-50 text-emerald-700 border border-emerald-200'
    return 'bg-amber-50 text-amber-800 border border-amber-200'
}

export default function GoogleAdsRoasChart({ data }: GoogleAdsRoasChartProps) {
    const t = useTranslations('AdminAdsRoasChart')
    const {
        points,
        totalRevenue,
        totalAdSpend,
        metaSpendTotal,
        googleSpendTotal,
        averageRoas,
        netMargin,
        deliveredOrdersCount,
        spendSource,
        lastSyncedAt,
    } = data

    const sourceLabel =
        spendSource === 'IMPORTED'
            ? t('sourceImported')
            : spendSource === 'ACCOUNTING'
              ? t('sourceAccounting')
              : t('sourceEstimated')

    const syncSuffix =
        spendSource === 'IMPORTED' && lastSyncedAt
            ? ` · ${new Date(lastSyncedAt).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}`
            : ''

    return (
        <div className="bg-white rounded-[3rem] p-6 md:p-10 border border-gray-100 shadow-xl shadow-black/5 space-y-8">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-gray-100">
                <div>
                    <div className="flex flex-wrap items-center gap-2 mb-1.5">
                        <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${getSourceBadgeClass(spendSource)}`}>
                            {sourceLabel}
                            {syncSuffix}
                        </span>
                        <span className="px-3 py-1 rounded-full bg-amber-100 text-amber-800 text-[10px] font-black uppercase tracking-wider">
                            ROAS Net : {averageRoas}x
                        </span>
                    </div>
                    <h2 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight">
                        Évolution du ROAS Net &amp; Recettes COD
                    </h2>
                    <p className="text-xs text-slate-500 font-medium mt-1">
                        {spendSource === 'IMPORTED' ? t('subtitleImported') : t('subtitleFallback')}
                    </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                    <span className="inline-flex items-center gap-1 px-4 py-2 bg-slate-50 text-slate-700 text-xs font-bold rounded-xl border border-slate-200">
                        <Target className="w-3.5 h-3.5 text-blue-600" />
                        <span>{deliveredOrdersCount} Commandes Livrées</span>
                    </span>
                    <Link
                        href="/admin/analytics"
                        className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-900 hover:bg-black text-white text-xs font-bold rounded-xl transition-colors"
                    >
                        <span>{t('detailsLink')}</span>
                        <ExternalLink className="w-3.5 h-3.5" />
                    </Link>
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
                        {spendSource === 'IMPORTED'
                            ? `Meta ${metaSpendTotal.toLocaleString('fr-FR')} · Google ${googleSpendTotal.toLocaleString('fr-FR')} MAD`
                            : sourceLabel}
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
                        {averageRoas >= 4 ? 'Excellent retour sur dépenses' : averageRoas >= 1.5 ? 'Rentabilité correcte' : 'Optimisation requise'}
                    </span>
                </div>

                <div className={`p-5 rounded-2xl border space-y-1 ${netMargin >= 0 ? 'bg-emerald-50/70 border-emerald-200/70' : 'bg-red-50/70 border-red-200/70'}`}>
                    <div className={`flex items-center justify-between text-xs font-bold ${netMargin >= 0 ? 'text-emerald-800' : 'text-red-800'}`}>
                        <span>Marge Nette après Ads</span>
                        <DollarSign className={`w-4 h-4 ${netMargin >= 0 ? 'text-emerald-600' : 'text-red-600'}`} />
                    </div>
                    <p className={`text-2xl font-black tracking-tight ${netMargin >= 0 ? 'text-emerald-950' : 'text-red-900'}`}>
                        {netMargin >= 0 ? '+' : ''}
                        {netMargin.toLocaleString('fr-FR')} <span className={`text-xs font-bold ${netMargin >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>MAD</span>
                    </p>
                    <span className={`text-[10px] font-bold ${netMargin >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>
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
                        <YAxis
                            yAxisId="left"
                            axisLine={false}
                            tickLine={false}
                            tick={{ fontSize: 12, fill: '#64748b', fontWeight: 600 }}
                            tickFormatter={(val) => `${val} DH`}
                        />
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
                                padding: '12px 16px',
                            }}
                            formatter={(value: unknown, name: string, item: { payload?: RoasDataPoint }) => {
                                if (name === 'ROAS Net') {
                                    return [`${value}x`, name]
                                }
                                if (name === 'Dépenses Ads' && item?.payload?.spendSource === 'IMPORTED') {
                                    const m = Number(item.payload.metaSpend || 0)
                                    const g = Number(item.payload.googleSpend || 0)
                                    return [`${Number(value || 0).toLocaleString('fr-FR')} MAD (Meta ${m} · Google ${g})`, name]
                                }
                                return [`${Number(value || 0).toLocaleString('fr-FR')} MAD`, name]
                            }}
                            labelFormatter={(label: string, payload: Array<{ payload?: { period?: string } }>) => {
                                const period = payload?.[0]?.payload?.period
                                return `${label} (${period || ''})`
                            }}
                        />
                        <Legend wrapperStyle={{ paddingTop: '20px', fontSize: '12px', fontWeight: 'bold' }} />

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

                        <Bar
                            yAxisId="left"
                            dataKey="adSpend"
                            name="Dépenses Ads"
                            fill="#334155"
                            radius={[6, 6, 0, 0]}
                            maxBarSize={32}
                        />

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
