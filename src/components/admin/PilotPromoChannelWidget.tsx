'use client'

import { useState, useMemo } from 'react'
import { Ticket, Share2, Copy, Check, Search, ExternalLink, TrendingUp } from 'lucide-react'
import type { PilotPromoAnalyticsData } from '@/lib/actions/analytics'

interface PilotPromoChannelWidgetProps {
    data: PilotPromoAnalyticsData | null
}

const PILOT_PRESETS = [
    { id: 'avito', label: 'Avito' },
    { id: 'wffer', label: 'Wffer' },
    { id: 'hemizate', label: 'Hemizate' },
    { id: 'facebook', label: 'Facebook' },
    { id: 'whatsapp', label: 'WhatsApp' },
] as const

export default function PilotPromoChannelWidget({ data }: PilotPromoChannelWidgetProps) {
    const [activeView, setActiveView] = useState<'coupons' | 'channels'>('coupons')
    const [searchQuery, setSearchQuery] = useState('')
    const [utmSource, setUtmSource] = useState('avito')
    const [utmCampaign, setUtmCampaign] = useState('pilote-nov2026')
    const [targetPath, setTargetPath] = useState('/fr/books')
    const [copiedLink, setCopiedLink] = useState(false)

    const summary = data?.summary || {
        totalPromoOrders: 0,
        deliveredPromoRevenue: 0,
        totalDiscountGranted: 0,
        activeCouponsCount: 0,
        trackedChannelsCount: 0,
    }
    const couponStats = data?.couponStats || []
    const channelStats = data?.channelStats || []

    const generatedUrl = useMemo(() => {
        const cleanSource = utmSource.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '') || 'avito'
        const cleanCampaign = utmCampaign.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '') || 'pilote'
        return `https://riwaya.store${targetPath}?utm_source=${encodeURIComponent(cleanSource)}&utm_medium=coupon&utm_campaign=${encodeURIComponent(cleanCampaign)}`
    }, [utmSource, utmCampaign, targetPath])

    const filteredCoupons = useMemo(() => {
        const q = searchQuery.trim().toLowerCase()
        if (!q) return couponStats
        return couponStats.filter(
            (c) =>
                c.code.toLowerCase().includes(q) ||
                (c.affiliateName || '').toLowerCase().includes(q) ||
                c.topChannels.some((ch) => ch.toLowerCase().includes(q))
        )
    }, [couponStats, searchQuery])

    const filteredChannels = useMemo(() => {
        const q = searchQuery.trim().toLowerCase()
        if (!q) return channelStats
        return channelStats.filter(
            (ch) =>
                ch.source.toLowerCase().includes(q) ||
                ch.medium.toLowerCase().includes(q) ||
                (ch.topCoupon || '').toLowerCase().includes(q)
        )
    }, [channelStats, searchQuery])

    const handleCopyLink = () => {
        if (typeof navigator !== 'undefined' && navigator.clipboard) {
            navigator.clipboard.writeText(generatedUrl)
            setCopiedLink(true)
            setTimeout(() => setCopiedLink(false), 2000)
        }
    }

    return (
        <div className="bg-white rounded-[3rem] border border-gray-100 shadow-sm overflow-hidden">
            {/* En-tête */}
            <div className="p-6 sm:p-8 border-b border-gray-100 flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-gray-50/60">
                <div>
                    <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-emerald-700 mb-1">
                        <Ticket className="w-4 h-4" />
                        <span>Suivi Acquisition & Coupons Pilotes</span>
                    </div>
                    <h2 className="text-2xl font-black text-black tracking-tight">
                        Canaux Pilotes (Avito, Wffer, Hemizate) & Codes Promo
                    </h2>
                    <p className="text-xs font-bold text-gray-500 mt-1">
                        Corrélation entre `utm_source` capté par `UtmTracker`, code promo utilisé et livraisons COD validées.
                    </p>
                </div>

                <div className="flex items-center gap-2 p-1.5 bg-gray-100 rounded-2xl w-fit">
                    <button
                        type="button"
                        onClick={() => setActiveView('coupons')}
                        className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all ${
                            activeView === 'coupons' ? 'bg-black text-white shadow-sm' : 'text-gray-600 hover:text-black'
                        }`}
                    >
                        Par Code Promo ({couponStats.length})
                    </button>
                    <button
                        type="button"
                        onClick={() => setActiveView('channels')}
                        className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all ${
                            activeView === 'channels' ? 'bg-black text-white shadow-sm' : 'text-gray-600 hover:text-black'
                        }`}
                    >
                        Par Canal UTM ({channelStats.length})
                    </button>
                </div>
            </div>

            <div className="p-6 sm:p-8 space-y-6">
                {/* KPIs résumés */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="p-4 rounded-2xl bg-gray-50 border border-gray-100">
                        <p className="text-[10px] font-black uppercase tracking-widest text-gray-500">Commandes avec Coupon</p>
                        <p className="text-2xl font-black text-black mt-1">{summary.totalPromoOrders}</p>
                        <p className="text-[11px] font-semibold text-gray-500 mt-1">{summary.activeCouponsCount} code(s) actif(s)</p>
                    </div>
                    <div className="p-4 rounded-2xl bg-emerald-50/60 border border-emerald-100">
                        <p className="text-[10px] font-black uppercase tracking-widest text-emerald-700">CA Livré sous Coupon</p>
                        <p className="text-2xl font-black text-emerald-800 mt-1">{summary.deliveredPromoRevenue.toLocaleString('fr-FR')} MAD</p>
                        <p className="text-[11px] font-semibold text-emerald-700 mt-1">Net encaissé COD</p>
                    </div>
                    <div className="p-4 rounded-2xl bg-amber-50/60 border border-amber-100">
                        <p className="text-[10px] font-black uppercase tracking-widest text-amber-700">Remises Accordées</p>
                        <p className="text-2xl font-black text-amber-900 mt-1">{summary.totalDiscountGranted.toLocaleString('fr-FR')} MAD</p>
                        <p className="text-[11px] font-semibold text-amber-700 mt-1">Coût promo total</p>
                    </div>
                    <div className="p-4 rounded-2xl bg-gray-50 border border-gray-100">
                        <p className="text-[10px] font-black uppercase tracking-widest text-gray-500">Canaux UTM Détectés</p>
                        <p className="text-2xl font-black text-black mt-1">{summary.trackedChannelsCount}</p>
                        <p className="text-[11px] font-semibold text-gray-500 mt-1">Hors trafic direct</p>
                    </div>
                </div>

                {/* Générateur de lien traçable canal pilote */}
                <div className="p-5 rounded-3xl bg-gray-50 border border-gray-200/80 space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="text-xs font-black uppercase tracking-wider text-black flex items-center gap-2">
                            <Share2 className="w-4 h-4 text-emerald-600" />
                            Générateur de lien traçable pour campagne pilote
                        </p>
                        <div className="flex items-center gap-1.5 flex-wrap">
                            {PILOT_PRESETS.map((preset) => (
                                <button
                                    key={preset.id}
                                    type="button"
                                    onClick={() => setUtmSource(preset.id)}
                                    className={`px-2.5 py-1 rounded-xl text-[10px] font-black transition-all border ${
                                        utmSource === preset.id
                                            ? 'bg-black text-white border-black'
                                            : 'bg-white text-gray-700 border-gray-200 hover:border-gray-300'
                                    }`}
                                >
                                    {preset.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <input
                            type="text"
                            value={utmSource}
                            onChange={(e) => setUtmSource(e.target.value)}
                            placeholder="utm_source (ex: avito, wffer)"
                            aria-label="Source UTM pilote"
                            className="px-3.5 py-2 rounded-xl border border-gray-200 bg-white text-xs font-bold focus:outline-none focus:ring-2 focus:ring-black"
                        />
                        <input
                            type="text"
                            value={utmCampaign}
                            onChange={(e) => setUtmCampaign(e.target.value)}
                            placeholder="utm_campaign (ex: pilote-nov2026)"
                            aria-label="Campagne UTM pilote"
                            className="px-3.5 py-2 rounded-xl border border-gray-200 bg-white text-xs font-bold focus:outline-none focus:ring-2 focus:ring-black"
                        />
                        <select
                            value={targetPath}
                            onChange={(e) => setTargetPath(e.target.value)}
                            aria-label="Page de destination"
                            className="px-3.5 py-2 rounded-xl border border-gray-200 bg-white text-xs font-bold focus:outline-none focus:ring-2 focus:ring-black"
                        >
                            <option value="/fr/books">Catalogue FR (/fr/books)</option>
                            <option value="/ar/books">Catalogue AR (/ar/books)</option>
                            <option value="/fr/packs">Packs FR (/fr/packs)</option>
                            <option value="/ar/packs">Packs AR (/ar/packs)</option>
                        </select>
                    </div>

                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                        <div className="flex-1 px-3.5 py-2 bg-white border border-gray-200 rounded-xl font-mono text-[11px] text-gray-700 truncate">
                            {generatedUrl}
                        </div>
                        <button
                            type="button"
                            onClick={handleCopyLink}
                            className="px-4 py-2 rounded-xl bg-black hover:bg-gray-800 text-white text-[10px] font-black uppercase tracking-wider inline-flex items-center justify-center gap-1.5 shrink-0"
                        >
                            {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                            {copiedLink ? 'Lien copié' : 'Copier lien UTM'}
                        </button>
                    </div>
                </div>

                {/* Filtre recherche tableau */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="relative w-full sm:max-w-xs">
                        <Search className="w-4 h-4 text-gray-500 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder={activeView === 'coupons' ? 'Filtrer par code ou canal...' : 'Filtrer par source UTM...'}
                            className="w-full pl-9 pr-3.5 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-black"
                        />
                    </div>
                    <a
                        href="/fr/admin/marketing"
                        className="text-[11px] font-black text-gray-600 hover:text-black inline-flex items-center gap-1"
                    >
                        Gérer les codes promo
                        <ExternalLink className="w-3 h-3" />
                    </a>
                </div>

                {/* Tableau */}
                {activeView === 'coupons' ? (
                    <div className="overflow-x-auto border border-gray-100 rounded-2xl">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-gray-50 border-b border-gray-100 text-[10px] font-black uppercase tracking-widest text-gray-500">
                                    <th className="py-3.5 px-4">Code Promo</th>
                                    <th className="py-3.5 px-4">Statut / Remise</th>
                                    <th className="py-3.5 px-4">Sources UTM liées</th>
                                    <th className="py-3.5 px-4 text-right">Commandes</th>
                                    <th className="py-3.5 px-4 text-right">Livrées (%)</th>
                                    <th className="py-3.5 px-4 text-right">Remises</th>
                                    <th className="py-3.5 px-4 text-right">CA Livré</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 text-xs">
                                {filteredCoupons.length === 0 ? (
                                    <tr>
                                        <td colSpan={7} className="py-10 text-center text-gray-500 font-bold">
                                            Aucun code promo trouvé pour ce filtre.
                                        </td>
                                    </tr>
                                ) : (
                                    filteredCoupons.map((row) => (
                                        <tr key={row.code} className="hover:bg-gray-50/70 transition-colors">
                                            <td className="py-3.5 px-4">
                                                <span className="font-mono font-black text-black bg-gray-100 px-2.5 py-1 rounded-lg">
                                                    {row.code}
                                                </span>
                                                {row.affiliateName && (
                                                    <p className="text-[10px] font-bold text-gray-500 mt-1">{row.affiliateName}</p>
                                                )}
                                            </td>
                                            <td className="py-3.5 px-4">
                                                <div className="flex items-center gap-1.5 flex-wrap">
                                                    <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase ${
                                                        row.isActive ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-100 text-gray-600'
                                                    }`}>
                                                        {row.isActive ? 'Actif' : 'Inactif'}
                                                    </span>
                                                    <span className="font-black text-black">{row.discountLabel}</span>
                                                </div>
                                            </td>
                                            <td className="py-3.5 px-4">
                                                {row.topChannels.length > 0 ? (
                                                    <div className="flex flex-wrap gap-1">
                                                        {row.topChannels.map((ch) => (
                                                            <span key={ch} className="px-2 py-0.5 rounded-md bg-gray-100 text-gray-800 font-mono text-[10px] font-bold">
                                                                {ch}
                                                            </span>
                                                        ))}
                                                    </div>
                                                ) : (
                                                    <span className="text-gray-400 text-[11px]">Aucune commande</span>
                                                )}
                                            </td>
                                            <td className="py-3.5 px-4 text-right font-black text-black">{row.totalOrders}</td>
                                            <td className="py-3.5 px-4 text-right font-bold text-gray-700">
                                                {row.deliveredOrders} <span className="text-[10px] text-emerald-700">({row.deliveryRate}%)</span>
                                            </td>
                                            <td className="py-3.5 px-4 text-right font-bold text-amber-800">
                                                {row.totalDiscount.toLocaleString('fr-FR')} MAD
                                            </td>
                                            <td className="py-3.5 px-4 text-right font-black text-emerald-700">
                                                {row.deliveredRevenue.toLocaleString('fr-FR')} MAD
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <div className="overflow-x-auto border border-gray-100 rounded-2xl">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-gray-50 border-b border-gray-100 text-[10px] font-black uppercase tracking-widest text-gray-500">
                                    <th className="py-3.5 px-4">Source UTM</th>
                                    <th className="py-3.5 px-4">Médium</th>
                                    <th className="py-3.5 px-4">Top Coupon</th>
                                    <th className="py-3.5 px-4 text-right">Commandes (Promo)</th>
                                    <th className="py-3.5 px-4 text-right">Taux Livraison</th>
                                    <th className="py-3.5 px-4 text-right">Panier Moyen</th>
                                    <th className="py-3.5 px-4 text-right">CA Livré</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 text-xs">
                                {filteredChannels.length === 0 ? (
                                    <tr>
                                        <td colSpan={7} className="py-10 text-center text-gray-500 font-bold">
                                            Aucun canal trouvé pour ce filtre.
                                        </td>
                                    </tr>
                                ) : (
                                    filteredChannels.map((ch) => (
                                        <tr key={ch.source} className="hover:bg-gray-50/70 transition-colors">
                                            <td className="py-3.5 px-4 font-mono font-black text-black">{ch.source}</td>
                                            <td className="py-3.5 px-4 text-gray-600 font-semibold">{ch.medium}</td>
                                            <td className="py-3.5 px-4">
                                                {ch.topCoupon ? (
                                                    <span className="font-mono text-[10px] font-black bg-amber-50 text-amber-900 border border-amber-200 px-2 py-0.5 rounded-md">
                                                        {ch.topCoupon}
                                                    </span>
                                                ) : (
                                                    <span className="text-gray-400 text-[11px]">Sans coupon</span>
                                                )}
                                            </td>
                                            <td className="py-3.5 px-4 text-right font-black text-black">
                                                {ch.totalOrders} <span className="text-[10px] font-bold text-gray-500">({ch.promoOrders} promo)</span>
                                            </td>
                                            <td className="py-3.5 px-4 text-right font-bold text-emerald-700">{ch.deliveryRate}%</td>
                                            <td className="py-3.5 px-4 text-right font-bold text-gray-700">{ch.aov.toLocaleString('fr-FR')} MAD</td>
                                            <td className="py-3.5 px-4 text-right font-black text-emerald-700 inline-flex items-center justify-end gap-1 w-full">
                                                <TrendingUp className="w-3 h-3" />
                                                {ch.deliveredRevenue.toLocaleString('fr-FR')} MAD
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    )
}

