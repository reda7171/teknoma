'use client'

import { useState, useEffect, useMemo } from 'react'
import { useTranslations } from 'next-intl'
import { toast } from 'sonner'
import {
    Megaphone,
    RefreshCw,
    DollarSign,
    TrendingUp,
    ShoppingBag,
    Wallet,
    Search,
    Clock,
    Code2,
    Copy,
    Check,
} from 'lucide-react'
import type {
    UnifiedAdsRoasReport,
    AdPlatformFilter,
    AdDatePreset,
} from '@/lib/actions/analytics'
import MetaApiErrorBanner, { type MetaApiErrorState } from './MetaApiErrorBanner'

interface MetaAdsRoasWidgetProps {
    initialData: UnifiedAdsRoasReport | null
}

function getRoasBadgeStyle(roas: number, spendMad: number): string {
    if (spendMad <= 0) return 'bg-gray-100 text-gray-600'
    if (roas >= 3) return 'bg-emerald-100 text-emerald-800 border border-emerald-200'
    if (roas >= 1.5) return 'bg-amber-100 text-amber-800 border border-amber-200'
    return 'bg-red-100 text-red-700 border border-red-200'
}

/**
 * Widget Analytics unifié (Meta Ads + Google Ads) : coûts par campagne et ROAS COD réel.
 */
export default function MetaAdsRoasWidget({ initialData }: MetaAdsRoasWidgetProps) {
    const t = useTranslations('AdminMetaRoas')
    const [report, setReport] = useState<UnifiedAdsRoasReport | null>(initialData)
    const [preset, setPreset] = useState<AdDatePreset>(initialData?.preset || 'last_30d')
    const [platform, setPlatform] = useState<AdPlatformFilter>(initialData?.platformFilter || 'ALL')
    const [fxInput, setFxInput] = useState<string>(String(initialData?.fxRateToMad || 10))
    const [syncing, setSyncing] = useState(false)
    const [loadingFilter, setLoadingFilter] = useState(false)
    const [searchQuery, setSearchQuery] = useState('')
    const [googleScript, setGoogleScript] = useState<string | null>(null)
    const [loadingScript, setLoadingScript] = useState(false)
    const [copiedScript, setCopiedScript] = useState(false)

    useEffect(() => {
        if (initialData) {
            setReport(initialData)
            if (initialData.fxRateToMad > 1) {
                setFxInput(String(initialData.fxRateToMad))
            }
        }
    }, [initialData])

    const activeBanners: MetaApiErrorState[] = useMemo(() => {
        if (!report) return []
        if (report.warnings && report.warnings.length > 0) {
            return report.warnings.map((w) => ({
                error: `[${w.platform}] ${w.error}`,
                errorCode: w.errorCode,
                configPath: w.configPath || '/fr/admin/config/api',
            }))
        }
        if (!report.hasMetaCredentials && !report.hasGoogleCredentials && report.campaigns.length === 0) {
            return [
                {
                    error: t('missingCreds'),
                    errorCode: 'MISSING_CONFIG',
                    configPath: '/fr/admin/config/api',
                },
            ]
        }
        return []
    }, [report, t])

    const filteredCampaigns = useMemo(() => {
        const list = report?.campaigns || []
        const q = searchQuery.trim().toLowerCase()
        if (!q) return list
        return list.filter(
            (c) =>
                c.campaignName.toLowerCase().includes(q) ||
                c.utmSlug.toLowerCase().includes(q) ||
                c.platform.toLowerCase().includes(q) ||
                c.campaignId.toLowerCase().includes(q)
        )
    }, [report?.campaigns, searchQuery])

    const fetchReport = async (nextPreset: AdDatePreset, nextPlatform: AdPlatformFilter) => {
        setPreset(nextPreset)
        setPlatform(nextPlatform)
        setLoadingFilter(true)
        try {
            const res = await fetch(
                `/api/admin/analytics/meta-ads-sync?preset=${nextPreset}&platform=${nextPlatform}`
            )
            const json = await res.json()
            if (json?.report) {
                setReport(json.report)
            }
        } catch {
            toast.error(t('syncError'))
        } finally {
            setLoadingFilter(false)
        }
    }

    const handleSyncNow = async () => {
        setSyncing(true)
        try {
            const parsedFx = parseFloat(fxInput)
            const bodyPayload: { preset: AdDatePreset; platform: AdPlatformFilter; fxRate?: number } = {
                preset,
                platform,
            }
            if (report && report.accountCurrency !== 'MAD' && Number.isFinite(parsedFx) && parsedFx > 0) {
                bodyPayload.fxRate = parsedFx
            }

            const res = await fetch('/api/admin/analytics/meta-ads-sync', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(bodyPayload),
            })
            const json = await res.json()
            if (json?.report) {
                setReport(json.report)
            }
            if (json?.success) {
                toast.success(`${t('syncSuccess')} (${json.syncedCount || 0})`)
            } else {
                toast.error(json?.error || t('syncError'))
            }
        } catch {
            toast.error(t('syncError'))
        } finally {
            setSyncing(false)
        }
    }

    const handleToggleGoogleScript = async () => {
        if (googleScript) {
            setGoogleScript(null)
            return
        }
        setLoadingScript(true)
        try {
            const res = await fetch('/api/admin/analytics/meta-ads-sync?action=google-script')
            const json = await res.json()
            if (json?.success && json.script) {
                setGoogleScript(json.script)
            } else {
                toast.error(json?.error || t('syncError'))
            }
        } catch {
            toast.error(t('syncError'))
        } finally {
            setLoadingScript(false)
        }
    }

    const handleCopyScript = () => {
        if (!googleScript || typeof navigator === 'undefined') return
        navigator.clipboard.writeText(googleScript)
        setCopiedScript(true)
        setTimeout(() => setCopiedScript(false), 2000)
    }

    const summary = report?.summary || {
        totalSpendOriginal: 0,
        totalSpendMad: 0,
        totalImpressions: 0,
        totalClicks: 0,
        avgCtr: 0,
        totalOrders: 0,
        totalDeliveredOrders: 0,
        totalDeliveredRevenue: 0,
        totalGrossRevenue: 0,
        unmatchedOrdersCount: 0,
        unmatchedDeliveredRevenue: 0,
        globalRealRoas: 0,
        globalGrossRoas: 0,
        globalCpaMad: 0,
        globalNetMarginMad: 0,
        byPlatform: {
            META: { spendMad: 0, deliveredRevenue: 0, orders: 0, deliveredOrders: 0, realRoas: 0 },
            GOOGLE: { spendMad: 0, deliveredRevenue: 0, orders: 0, deliveredOrders: 0, realRoas: 0 },
        },
    }

    const accountCurrency = report?.accountCurrency || 'MAD'
    const lastSyncLabel = report?.lastSyncedAt
        ? new Date(report.lastSyncedAt).toLocaleString('fr-FR', {
              day: '2-digit',
              month: '2-digit',
              hour: '2-digit',
              minute: '2-digit',
          })
        : t('neverSynced')

    return (
        <div className="bg-white rounded-[3rem] border border-gray-100 shadow-sm overflow-hidden">
            {/* En-tête */}
            <div className="p-6 sm:p-8 border-b border-gray-100 flex flex-col xl:flex-row xl:items-center justify-between gap-4 bg-slate-50/70">
                <div>
                    <div className="flex flex-wrap items-center gap-2 mb-1.5">
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-200 text-[10px] font-black uppercase tracking-wider">
                            <Megaphone className="w-3.5 h-3.5" />
                            <span>{t('badge')}</span>
                        </span>
                        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-white text-slate-600 border border-slate-200 text-[10px] font-bold">
                            <Clock className="w-3 h-3" />
                            <span>
                                {t('lastSyncPrefix')} : {lastSyncLabel}
                            </span>
                        </span>
                    </div>
                    <h2 className="text-2xl font-black text-black tracking-tight">{t('title')}</h2>
                    <p className="text-xs font-medium text-gray-500 mt-1">{t('subtitle')}</p>
                </div>

                <div className="flex flex-wrap items-center gap-2.5">
                    {/* Filtre Plateforme */}
                    <div className="flex items-center gap-1 p-1 bg-gray-100 rounded-2xl">
                        {(
                            [
                                { id: 'ALL', label: t('platformAll') },
                                { id: 'META', label: t('platformMeta') },
                                { id: 'GOOGLE', label: t('platformGoogle') },
                            ] as const
                        ).map((tab) => (
                            <button
                                key={tab.id}
                                type="button"
                                disabled={loadingFilter}
                                onClick={() => fetchReport(preset, tab.id)}
                                className={`px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all ${
                                    platform === tab.id
                                        ? 'bg-black text-white shadow-sm'
                                        : 'text-gray-600 hover:text-black'
                                }`}
                            >
                                {tab.label}
                            </button>
                        ))}
                    </div>

                    {/* Filtre Période */}
                    <div className="flex items-center gap-1 p-1 bg-gray-100 rounded-2xl">
                        {(
                            [
                                { id: 'last_7d', label: t('preset7d') },
                                { id: 'last_30d', label: t('preset30d') },
                                { id: 'maximum', label: t('presetMax') },
                            ] as const
                        ).map((item) => (
                            <button
                                key={item.id}
                                type="button"
                                disabled={loadingFilter}
                                onClick={() => fetchReport(item.id, platform)}
                                className={`px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all ${
                                    preset === item.id
                                        ? 'bg-white text-black shadow-sm'
                                        : 'text-gray-600 hover:text-black'
                                }`}
                            >
                                {item.label}
                            </button>
                        ))}
                    </div>

                    {accountCurrency !== 'MAD' && (
                        <label className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-200 rounded-xl text-[11px] font-bold text-slate-700">
                            <span>
                                1 {accountCurrency} ({t('fxRateLabel')}) :
                            </span>
                            <input
                                type="number"
                                step="0.1"
                                min="0.1"
                                max="50"
                                value={fxInput}
                                onChange={(e) => setFxInput(e.target.value)}
                                className="w-16 px-2 py-1 bg-gray-50 border border-gray-200 rounded-lg text-xs font-black font-mono text-black text-center"
                            />
                        </label>
                    )}

                    <button
                        type="button"
                        disabled={loadingScript}
                        onClick={handleToggleGoogleScript}
                        className="inline-flex items-center gap-1.5 px-3.5 py-2.5 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 text-xs font-black rounded-2xl transition-all"
                    >
                        <Code2 className="w-3.5 h-3.5" />
                        <span>{t('googleScriptBtn')}</span>
                    </button>

                    <button
                        type="button"
                        disabled={syncing || (!report?.hasMetaCredentials && !report?.hasGoogleCredentials)}
                        onClick={handleSyncNow}
                        className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-black rounded-2xl transition-all disabled:opacity-50"
                    >
                        <RefreshCw className={`w-3.5 h-3.5 ${syncing ? 'animate-spin' : ''}`} />
                        <span>{syncing ? t('syncing') : t('syncButton')}</span>
                    </button>
                </div>
            </div>

            <div className="p-6 sm:p-8 space-y-6">
                {activeBanners.map((b, idx) => (
                    <MetaApiErrorBanner key={`${b.errorCode || 'warn'}-${idx}`} banner={b} />
                ))}

                {/* Panneau Script Google Ads (AdsApp) */}
                {googleScript && (
                    <div className="p-5 rounded-2xl bg-slate-900 text-slate-100 space-y-3">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                            <p className="text-xs font-semibold text-amber-300">{t('googleScriptHelp')}</p>
                            <button
                                type="button"
                                onClick={handleCopyScript}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-400 text-black text-xs font-black hover:bg-amber-300"
                            >
                                {copiedScript ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                                <span>{copiedScript ? t('scriptCopied') : t('copyScript')}</span>
                            </button>
                        </div>
                        <pre className="p-3 bg-black/50 rounded-xl text-[11px] font-mono overflow-x-auto max-h-56 text-slate-200">
                            {googleScript}
                        </pre>
                    </div>
                )}

                {/* 4 KPIs ROAS Consolidés */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100">
                        <div className="flex items-center justify-between text-slate-500 text-[10px] font-black uppercase tracking-widest">
                            <span>{t('kpiSpend')}</span>
                            <DollarSign className="w-4 h-4 text-blue-600" />
                        </div>
                        <p className="text-2xl font-black text-slate-900 mt-1.5">
                            {summary.totalSpendMad.toLocaleString('fr-FR')} <span className="text-xs font-bold">MAD</span>
                        </p>
                        <p className="text-[11px] font-semibold text-slate-500 mt-1">
                            Meta {summary.byPlatform.META.spendMad} | Google {summary.byPlatform.GOOGLE.spendMad} MAD
                        </p>
                    </div>

                    <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-100">
                        <div className="flex items-center justify-between text-emerald-800 text-[10px] font-black uppercase tracking-widest">
                            <span>{t('kpiRevenue')}</span>
                            <ShoppingBag className="w-4 h-4 text-emerald-600" />
                        </div>
                        <p className="text-2xl font-black text-emerald-950 mt-1.5">
                            {summary.totalDeliveredRevenue.toLocaleString('fr-FR')}{' '}
                            <span className="text-xs font-bold">MAD</span>
                        </p>
                        <p className="text-[11px] font-semibold text-emerald-700 mt-1">
                            {summary.totalDeliveredOrders}/{summary.totalOrders} {t('deliveredSuffix')}
                        </p>
                    </div>

                    <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200/80">
                        <div className="flex items-center justify-between text-amber-800 text-[10px] font-black uppercase tracking-widest">
                            <span>{t('kpiRoas')}</span>
                            <TrendingUp className="w-4 h-4 text-amber-600" />
                        </div>
                        <p className="text-2xl font-black text-amber-950 mt-1.5">{summary.globalRealRoas}x</p>
                        <p className="text-[11px] font-semibold text-amber-800 mt-1">
                            Meta {summary.byPlatform.META.realRoas}x | Google {summary.byPlatform.GOOGLE.realRoas}x
                        </p>
                    </div>

                    <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100">
                        <div className="flex items-center justify-between text-slate-500 text-[10px] font-black uppercase tracking-widest">
                            <span>{t('kpiMargin')}</span>
                            <Wallet className="w-4 h-4 text-slate-700" />
                        </div>
                        <p
                            className={`text-2xl font-black mt-1.5 ${
                                summary.globalNetMarginMad >= 0 ? 'text-emerald-700' : 'text-red-600'
                            }`}
                        >
                            {summary.globalNetMarginMad >= 0 ? '+' : ''}
                            {summary.globalNetMarginMad.toLocaleString('fr-FR')} <span className="text-xs font-bold">MAD</span>
                        </p>
                        <p className="text-[11px] font-medium text-slate-500 mt-1">
                            {t('grossRoasLabel')} : {summary.globalGrossRoas}x | CPA {summary.globalCpaMad} MAD
                        </p>
                    </div>
                </div>

                {/* Filtre recherche */}
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="relative max-w-md w-full">
                        <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder={t('searchPlaceholder')}
                            className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-black"
                        />
                    </div>
                    {summary.unmatchedOrdersCount > 0 && (
                        <span className="text-[11px] font-semibold text-slate-500">
                            {t('unmatchedNote')} : +{summary.unmatchedDeliveredRevenue.toLocaleString('fr-FR')} MAD ({summary.unmatchedOrdersCount} {t('ordersSuffix')})
                        </span>
                    )}
                </div>

                {/* Tableau comparatif Meta & Google Ads */}
                <div className="overflow-x-auto border border-gray-100 rounded-2xl">
                    <table className="w-full text-left border-collapse text-xs">
                        <thead>
                            <tr className="bg-gray-50 border-b border-gray-100 text-gray-500 font-black uppercase text-[10px] tracking-wider">
                                <th className="py-3 px-4">{t('colPlatform')}</th>
                                <th className="py-3 px-4">{t('colCampaign')}</th>
                                <th className="py-3 px-4 text-right">{t('colSpend')}</th>
                                <th className="py-3 px-4 text-center">{t('colTraffic')}</th>
                                <th className="py-3 px-4 text-center">{t('colOrders')}</th>
                                <th className="py-3 px-4 text-right">{t('colRevenue')}</th>
                                <th className="py-3 px-4 text-right">{t('colCpa')}</th>
                                <th className="py-3 px-4 text-right">{t('colRoas')}</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 text-slate-700">
                            {filteredCampaigns.length === 0 ? (
                                <tr>
                                    <td colSpan={8} className="py-8 px-4 text-center text-gray-400 font-medium">
                                        {t('emptyState')}
                                    </td>
                                </tr>
                            ) : (
                                filteredCampaigns.map((c) => (
                                    <tr key={`${c.platform}-${c.campaignId}`} className="hover:bg-gray-50/70 transition-colors">
                                        <td className="py-3.5 px-4">
                                            <span
                                                className={`inline-block px-2.5 py-1 rounded-lg text-[10px] font-black uppercase ${
                                                    c.platform === 'META'
                                                        ? 'bg-blue-50 text-blue-700 border border-blue-200'
                                                        : 'bg-amber-50 text-amber-800 border border-amber-200'
                                                }`}
                                            >
                                                {c.platform}
                                            </span>
                                            {c.channelType && (
                                                <div className="text-[9px] font-bold text-gray-400 mt-1 truncate max-w-[90px]">
                                                    {c.channelType}
                                                </div>
                                            )}
                                        </td>
                                        <td className="py-3.5 px-4">
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <span className="font-black text-slate-900">{c.campaignName}</span>
                                                <span
                                                    className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase ${
                                                        c.status === 'ACTIVE'
                                                            ? 'bg-emerald-100 text-emerald-700'
                                                            : 'bg-gray-100 text-gray-500'
                                                    }`}
                                                >
                                                    {c.status}
                                                </span>
                                            </div>
                                            <p className="text-[10px] font-mono text-gray-400 mt-0.5">
                                                utm_campaign: {c.utmSlug}
                                                {c.dateStart && c.dateStop ? ` | ${c.dateStart} / ${c.dateStop}` : ''}
                                            </p>
                                        </td>
                                        <td className="py-3.5 px-4 text-right font-mono font-bold text-slate-900">
                                            <div>{c.spendMad.toLocaleString('fr-FR')} MAD</div>
                                            {c.currency !== 'MAD' && (
                                                <div className="text-[10px] text-gray-400">
                                                    ({c.spend.toLocaleString('fr-FR')} {c.currency})
                                                </div>
                                            )}
                                        </td>
                                        <td className="py-3.5 px-4 text-center">
                                            <div className="font-bold text-slate-800">{c.clicks.toLocaleString('fr-FR')}</div>
                                            <div className="text-[10px] text-gray-400">
                                                {c.ctr}% CTR | {c.cpcMad} MAD
                                            </div>
                                        </td>
                                        <td className="py-3.5 px-4 text-center">
                                            <div className="font-bold text-slate-900">
                                                {c.codDeliveredOrders}/{c.codTotalOrders} {t('ordersSuffix')}
                                            </div>
                                            <div className="text-[10px] text-gray-400">
                                                {c.codDeliveryRate}% {t('deliveredSuffix')}
                                            </div>
                                        </td>
                                        <td className="py-3.5 px-4 text-right font-mono font-bold text-emerald-700">
                                            {c.codDeliveredRevenue.toLocaleString('fr-FR')} MAD
                                        </td>
                                        <td className="py-3.5 px-4 text-right font-mono text-slate-700">
                                            {c.cpaMad > 0 ? `${c.cpaMad} MAD` : '-'}
                                        </td>
                                        <td className="py-3.5 px-4 text-right">
                                            <span
                                                className={`inline-block px-2.5 py-1 rounded-xl font-mono font-black text-xs ${getRoasBadgeStyle(
                                                    c.realRoas,
                                                    c.spendMad
                                                )}`}
                                            >
                                                {c.realRoas}x
                                            </span>
                                            <div
                                                className={`text-[10px] font-mono mt-1 ${
                                                    c.netMarginMad >= 0 ? 'text-emerald-600' : 'text-red-500'
                                                }`}
                                            >
                                                {c.netMarginMad >= 0 ? '+' : ''}
                                                {c.netMarginMad.toLocaleString('fr-FR')} MAD
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    )
}
