'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import {
    Plane,
    CheckCircle2,
    Clock,
    Truck,
    Package,
    ShieldCheck,
    Copy,
    Check,
    RefreshCw,
    ExternalLink,
    MapPin,
    AlertCircle
} from 'lucide-react'
import { AmanaTrackingResult } from '@/lib/shipping/amana-tracking'
import { fetchLiveAmanaTracking } from '@/lib/actions/amana'

interface AmanaLiveTrackingWidgetProps {
    orderId: string
    initialTracking: AmanaTrackingResult
    locale?: string
}

export default function AmanaLiveTrackingWidget({
    orderId,
    initialTracking,
    locale = 'fr'
}: AmanaLiveTrackingWidgetProps) {
    const t = useTranslations('AmanaTracking')
    const [tracking, setTracking] = useState<AmanaTrackingResult>(initialTracking)
    const [copied, setCopied] = useState(false)
    const [isRefreshing, setIsRefreshing] = useState(false)

    const isRtl = locale === 'ar'

    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(tracking.trackingNumber)
            setCopied(true)
            setTimeout(() => setCopied(false), 2000)
        } catch {
            // Fallback
        }
    }

    const handleRefresh = async () => {
        setIsRefreshing(true)
        try {
            const fresh = await fetchLiveAmanaTracking(orderId)
            if (fresh) {
                setTracking(fresh)
            }
        } finally {
            setIsRefreshing(false)
        }
    }

    const getStatusBadge = () => {
        if (tracking.isDelivered) {
            return {
                bg: 'bg-emerald-50 text-emerald-700 border-emerald-200',
                dot: 'bg-emerald-500',
                label: t('statusDelivered')
            }
        }
        if (tracking.currentStatusCode === 'IN_TRANSIT' || tracking.currentStatusCode === 'CUSTOMS_IN') {
            return {
                bg: 'bg-blue-50 text-blue-700 border-blue-200',
                dot: 'bg-blue-500 animate-pulse',
                label: t('statusInTransit')
            }
        }
        if (tracking.currentStatusCode === 'OUT_FOR_DELIVERY') {
            return {
                bg: 'bg-emerald-50 text-emerald-700 border-emerald-200',
                dot: 'bg-emerald-500 animate-pulse',
                label: t('statusOutForDelivery')
            }
        }
        if (tracking.currentStatusCode === 'CUSTOMS_OUT') {
            return {
                bg: 'bg-amber-50 text-amber-800 border-amber-200',
                dot: 'bg-amber-500',
                label: t('statusCustoms')
            }
        }
        return {
            bg: 'bg-slate-100 text-slate-800 border-slate-200',
            dot: 'bg-slate-400',
            label: t('statusPreparing')
        }
    }

    const badge = getStatusBadge()

    return (
        <div className="bg-white rounded-3xl border border-slate-200/90 shadow-xl shadow-slate-200/40 p-6 sm:p-8 overflow-hidden text-slate-900" dir={isRtl ? 'rtl' : 'ltr'}>
            {/* Top Bar Branded Amana & Poste Maroc */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-100">
                <div className="flex items-center gap-3.5">
                    <div className="w-12 h-12 rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-md shadow-blue-500/20 shrink-0">
                        <Plane className="w-6 h-6" />
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <h3 className="text-base sm:text-lg font-black tracking-tight text-slate-900">
                                {t('title')}
                            </h3>
                            <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-200/60">
                                Poste Maroc
                            </span>
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5">
                            {t('subtitle')}
                        </p>
                    </div>
                </div>

                <div className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border text-xs font-bold self-start sm:self-auto ${badge.bg}`}>
                    <span className={`w-2 h-2 rounded-full ${badge.dot}`} />
                    <span>{badge.label}</span>
                </div>
            </div>

            {/* Tracking ID & Action Bar */}
            <div className="mt-6 p-4 sm:p-5 rounded-2xl bg-slate-50 border border-slate-200/80 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex flex-wrap items-center gap-3">
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                        {t('trackingNumber')} :
                    </span>
                    <span className="font-mono font-black text-base sm:text-lg text-blue-700 bg-white px-3 py-1 rounded-xl border border-blue-100 shadow-sm">
                        {tracking.trackingNumber}
                    </span>
                    <button
                        type="button"
                        onClick={handleCopy}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white hover:bg-slate-100 text-slate-700 text-xs font-bold border border-slate-200 transition-colors shadow-sm"
                        title={t('copy')}
                    >
                        {copied ? (
                            <>
                                <Check className="w-3.5 h-3.5 text-emerald-600" />
                                <span className="text-emerald-700">{t('copied')}</span>
                            </>
                        ) : (
                            <>
                                <Copy className="w-3.5 h-3.5 text-slate-500" />
                                <span>{t('copy')}</span>
                            </>
                        )}
                    </button>
                </div>

                <div className="flex items-center gap-2">
                    <button
                        type="button"
                        onClick={handleRefresh}
                        disabled={isRefreshing}
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white hover:bg-slate-100 text-slate-700 text-xs font-bold border border-slate-200 shadow-sm transition-all active:scale-95 disabled:opacity-60"
                    >
                        <RefreshCw className={`w-3.5 h-3.5 text-blue-600 ${isRefreshing ? 'animate-spin' : ''}`} />
                        <span>{isRefreshing ? t('refreshing') : t('refresh')}</span>
                    </button>

                    <a
                        href={tracking.officialTrackingUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold shadow-sm transition-all hover:scale-[1.02] active:scale-95"
                    >
                        <span>{t('trackOnOfficialSite')}</span>
                        <ExternalLink className="w-3.5 h-3.5 text-slate-300" />
                    </a>
                </div>
            </div>

            {/* Quick Metrics Bar */}
            <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div className="p-3 bg-white rounded-xl border border-slate-100 shadow-sm">
                    <span className="text-slate-400 font-medium block text-[10px] uppercase tracking-wider">{t('origin')}</span>
                    <span className="font-bold text-slate-900 mt-0.5 block">{tracking.origin}</span>
                </div>
                <div className="p-3 bg-white rounded-xl border border-slate-100 shadow-sm">
                    <span className="text-slate-400 font-medium block text-[10px] uppercase tracking-wider">{t('destination')}</span>
                    <span className="font-bold text-slate-900 mt-0.5 block">{tracking.destination}</span>
                </div>
                <div className="p-3 bg-white rounded-xl border border-slate-100 shadow-sm">
                    <span className="text-slate-400 font-medium block text-[10px] uppercase tracking-wider">{t('estimatedDelivery')}</span>
                    <span className="font-bold text-blue-700 mt-0.5 block">{tracking.estimatedDelivery}</span>
                </div>
                <div className="p-3 bg-white rounded-xl border border-slate-100 shadow-sm">
                    <span className="text-slate-400 font-medium block text-[10px] uppercase tracking-wider">{t('lastUpdate')}</span>
                    <span className="font-bold text-slate-600 mt-0.5 block">{tracking.lastUpdate}</span>
                </div>
            </div>

            {/* Live Checkpoint Timeline */}
            <div className="mt-8">
                <div className="space-y-4">
                    {tracking.checkpoints.map((cp, idx) => {
                        const isLast = idx === tracking.checkpoints.length - 1

                        return (
                            <div key={cp.id} className="relative flex items-start gap-4 group">
                                {/* Connecting line */}
                                {!isLast && (
                                    <div
                                        className={`absolute ${isRtl ? 'right-4' : 'left-4'} top-8 bottom-0 w-0.5 ${
                                            cp.completed ? 'bg-blue-600' : 'bg-slate-200'
                                        }`}
                                    />
                                )}

                                {/* Status Icon Indicator */}
                                <div className="relative z-10 shrink-0">
                                    {cp.completed ? (
                                        <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center shadow-md shadow-blue-500/20">
                                            <CheckCircle2 className="w-4 h-4" />
                                        </div>
                                    ) : cp.current ? (
                                        <div className="w-8 h-8 rounded-full bg-blue-500 text-white flex items-center justify-center ring-4 ring-blue-100 shadow-md">
                                            <Clock className="w-4 h-4 animate-spin" />
                                        </div>
                                    ) : (
                                        <div className="w-8 h-8 rounded-full bg-white border-2 border-slate-200 text-slate-300 flex items-center justify-center">
                                            <div className="w-2 h-2 rounded-full bg-slate-200" />
                                        </div>
                                    )}
                                </div>

                                {/* Checkpoint Content */}
                                <div className={`flex-1 p-3.5 rounded-2xl border transition-all ${
                                    cp.current
                                        ? 'bg-blue-50/50 border-blue-200 shadow-sm'
                                        : cp.completed
                                        ? 'bg-white border-slate-200/80 shadow-xs'
                                        : 'bg-slate-50/40 border-slate-100 opacity-60'
                                }`}>
                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mb-1">
                                        <h4 className={`text-xs sm:text-sm font-black ${
                                            cp.completed || cp.current ? 'text-slate-900' : 'text-slate-400'
                                        }`}>
                                            {cp.status}
                                        </h4>
                                        <span className="text-[11px] font-bold text-slate-400 font-mono">
                                            {cp.dateFormatted} • {cp.timeFormatted}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-1.5 text-xs text-slate-500">
                                        <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                        <span className="font-medium truncate">{cp.location}</span>
                                    </div>
                                </div>
                            </div>
                        )
                    })}
                </div>
            </div>
        </div>
    )
}

