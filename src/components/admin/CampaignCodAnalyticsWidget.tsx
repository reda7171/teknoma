import { getCampaignCodAnalytics } from '@/lib/actions/analytics'
import { Target, TrendingUp, BarChart2, ShieldCheck, DollarSign, Package, CheckCircle2, Share2, Layers } from 'lucide-react'

export default async function CampaignCodAnalyticsWidget() {
    const data = await getCampaignCodAnalytics()
    const { summary, sources, topCampaigns } = data

    return (
        <div className="bg-white rounded-[2rem] sm:rounded-[3rem] border border-gray-100 shadow-xl shadow-black/5 overflow-hidden">
            {/* Header */}
            <div className="px-6 py-6 md:px-10 md:py-8 border-b border-gray-50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-gray-50/50">
                <div>
                    <h2 className="text-[11px] font-black text-gray-500 uppercase tracking-[0.2em] flex items-center gap-2">
                        <Target className="w-4 h-4 text-emerald-600" />
                        Attribution Campagnes & Conversions COD
                    </h2>
                    <p className="text-xs text-gray-500 mt-1">
                        Corrélation directe des commandes COD aux sources UTM et clics publicitaires.
                    </p>
                </div>
                <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-50 border border-emerald-200 rounded-full text-[10px] font-bold text-emerald-800">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                    <span>URLs Publiques 100% Propres (SEO Sauf)</span>
                </div>
            </div>

            {/* KPI Cards */}
            <div className="p-6 md:p-10 space-y-8">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
                    <div className="p-5 md:p-6 bg-gray-50/60 rounded-2xl border border-gray-100 flex flex-col justify-between">
                        <div className="flex items-center justify-between text-gray-500 mb-2">
                            <span className="text-[10px] font-black uppercase tracking-wider">Commandes Trackées</span>
                            <Package className="w-4 h-4 text-blue-600" />
                        </div>
                        <div className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight">
                            {summary.totalTrackedOrders}
                        </div>
                        <div className="text-[11px] text-gray-500 mt-2 font-medium">
                            {summary.trackedShare}% du volume global COD
                        </div>
                    </div>

                    <div className="p-5 md:p-6 bg-gray-50/60 rounded-2xl border border-gray-100 flex flex-col justify-between">
                        <div className="flex items-center justify-between text-gray-500 mb-2">
                            <span className="text-[10px] font-black uppercase tracking-wider">CA Livré Attribué</span>
                            <DollarSign className="w-4 h-4 text-emerald-600" />
                        </div>
                        <div className="text-2xl md:text-3xl font-black text-emerald-700 tracking-tight">
                            {Math.round(summary.totalTrackedDeliveredRevenue).toLocaleString('fr-FR')} MAD
                        </div>
                        <div className="text-[11px] text-gray-500 mt-2 font-medium">
                            Sur {Math.round(summary.totalTrackedGrossRevenue).toLocaleString('fr-FR')} MAD brut
                        </div>
                    </div>

                    <div className="p-5 md:p-6 bg-gray-50/60 rounded-2xl border border-gray-100 flex flex-col justify-between">
                        <div className="flex items-center justify-between text-gray-500 mb-2">
                            <span className="text-[10px] font-black uppercase tracking-wider">Taux Livraison Campagnes</span>
                            <CheckCircle2 className="w-4 h-4 text-teal-600" />
                        </div>
                        <div className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight">
                            {summary.totalTrackedOrders > 0
                                ? Math.round(
                                      (sources
                                          .filter((s) => s.source !== 'direct_organique')
                                          .reduce((acc, curr) => acc + curr.deliveredOrders, 0) /
                                          summary.totalTrackedOrders) *
                                          100
                                  )
                                : 0}
                            %
                        </div>
                        <div className="text-[11px] text-gray-500 mt-2 font-medium">
                            Sur commandes confirmées et expédiées
                        </div>
                    </div>

                    <div className="p-5 md:p-6 bg-gray-50/60 rounded-2xl border border-gray-100 flex flex-col justify-between">
                        <div className="flex items-center justify-between text-gray-500 mb-2">
                            <span className="text-[10px] font-black uppercase tracking-wider">Direct / Organique</span>
                            <Share2 className="w-4 h-4 text-amber-600" />
                        </div>
                        <div className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight">
                            {summary.totalDirectOrders}
                        </div>
                        <div className="text-[11px] text-gray-500 mt-2 font-medium">
                            {Math.round(summary.totalDirectRevenue).toLocaleString('fr-FR')} MAD livrés
                        </div>
                    </div>
                </div>

                {/* Sources Table Breakdown */}
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <h3 className="text-xs font-black uppercase tracking-widest text-gray-700 flex items-center gap-2">
                            <BarChart2 className="w-4 h-4 text-slate-600" />
                            Performance par Source d&apos;Acquisition (UTM Source)
                        </h3>
                        <span className="text-[11px] text-gray-400 font-medium">
                            {sources.length} source(s) active(s)
                        </span>
                    </div>

                    <div className="overflow-x-auto border border-gray-100 rounded-2xl">
                        <table className="w-full text-left border-collapse text-xs">
                            <thead>
                                <tr className="bg-gray-50/80 border-b border-gray-100 text-gray-500 font-bold uppercase text-[10px] tracking-wider">
                                    <th className="py-3 px-4">Canal / Source</th>
                                    <th className="py-3 px-4">Support</th>
                                    <th className="py-3 px-4 text-center">Commandes COD</th>
                                    <th className="py-3 px-4 text-center">Taux Livraison</th>
                                    <th className="py-3 px-4 text-right">Panier Moyen (AOV)</th>
                                    <th className="py-3 px-4 text-right">CA Livré</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 text-slate-700">
                                {sources.length === 0 ? (
                                    <tr>
                                        <td colSpan={6} className="py-8 text-center text-gray-400 italic font-medium">
                                            Aucune commande enregistrée pour le moment.
                                        </td>
                                    </tr>
                                ) : (
                                    sources.map((s) => (
                                        <tr key={s.source} className="hover:bg-gray-50/50 transition-colors">
                                            <td className="py-3.5 px-4 font-bold text-slate-900 capitalize flex items-center gap-2">
                                                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                                                {s.source.replace('_', ' ')}
                                            </td>
                                            <td className="py-3.5 px-4 text-gray-500 font-mono text-[11px]">
                                                {s.medium}
                                            </td>
                                            <td className="py-3.5 px-4 text-center font-semibold">
                                                <span>{s.totalOrders}</span>
                                                <span className="text-[10px] text-gray-400 ml-1">
                                                    ({s.deliveredOrders} livrées)
                                                </span>
                                            </td>
                                            <td className="py-3.5 px-4 text-center">
                                                <div className="flex items-center justify-center gap-2">
                                                    <div className="w-16 bg-gray-200 rounded-full h-1.5 overflow-hidden">
                                                        <div
                                                            className="bg-emerald-500 h-1.5 rounded-full"
                                                            style={{ width: `${Math.min(s.deliveryRate, 100)}%` }}
                                                        />
                                                    </div>
                                                    <span className="font-bold text-[11px]">{s.deliveryRate}%</span>
                                                </div>
                                            </td>
                                            <td className="py-3.5 px-4 text-right font-mono text-gray-600">
                                                {s.aov.toLocaleString('fr-FR')} MAD
                                            </td>
                                            <td className="py-3.5 px-4 text-right font-bold text-emerald-700 font-mono">
                                                {Math.round(s.deliveredRevenue).toLocaleString('fr-FR')} MAD
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Top Campaigns Breakdown */}
                {topCampaigns.length > 0 && (
                    <div className="space-y-4 pt-4 border-t border-gray-100">
                        <div className="flex items-center justify-between">
                            <h3 className="text-xs font-black uppercase tracking-widest text-gray-700 flex items-center gap-2">
                                <Layers className="w-4 h-4 text-blue-600" />
                                Top Campagnes Publicitaires (UTM Campaign)
                            </h3>
                            <span className="text-[11px] text-gray-400 font-medium">
                                Attribution nominative des campagnes
                            </span>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {topCampaigns.map((c) => (
                                <div
                                    key={c.campaign}
                                    className="p-4 rounded-xl border border-gray-100 bg-gray-50/40 flex items-center justify-between"
                                >
                                    <div className="space-y-1">
                                        <p className="text-xs font-bold text-slate-900 truncate max-w-[220px] sm:max-w-[280px]">
                                            {c.campaign}
                                        </p>
                                        <p className="text-[10px] text-gray-400 uppercase font-mono">
                                            Source: {c.source} | {c.totalOrders} commandes ({c.deliveryRate}% livrées)
                                        </p>
                                    </div>
                                    <div className="text-right">
                                        <span className="text-sm font-black text-slate-900 font-mono">
                                            {Math.round(c.deliveredRevenue).toLocaleString('fr-FR')} MAD
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Technical Note on URL Sanitization & SEO */}
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl text-[11px] text-slate-600 leading-relaxed flex items-start gap-3">
                    <ShieldCheck className="w-4 h-4 text-slate-800 flex-shrink-0 mt-0.5" />
                    <div>
                        <strong className="text-slate-800">Garantie Technique SEO :</strong> Les paramètres de campagne (`utm_*`, `fbclid`, `ttclid`) sont capturés silencieusement côté client dans le stockage local avant d&apos;être purgés de l&apos;URL navigateur (`history.replaceState`). Les en-têtes HTTP et balises canoniques demeurent 100% épurés pour consolider l&apos;autorité de page Google sans risque de duplicate content.
                    </div>
                </div>
            </div>
        </div>
    )
}
