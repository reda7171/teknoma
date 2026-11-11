'use client'

import React, { useState, useEffect, useMemo, useRef } from 'react'
import {
    Activity,
    CheckCircle2,
    AlertCircle,
    XCircle,
    Copy,
    Check,
    Trash2,
    Play,
    Download,
    Eye,
    ChevronDown,
    ChevronUp,
    Sparkles,
    ShoppingBag,
    Layers,
    Filter,
    ArrowRight,
    Search,
    AlertTriangle,
    RefreshCw,
    ServerCrash,
    ShieldCheck
} from 'lucide-react'

interface Ga4MpAlertLog {
    id: string
    action: string
    orderId: string | null
    status: number | null
    error: string
    paymentMethod: string | null
    value: number | null
    currency: string
    measurementId: string | null
    source: string
    createdAt: string
    isUnresolved: boolean
}

interface Ga4MpMonitorState {
    logs: Ga4MpAlertLog[]
    unresolvedCount: number
    totalRecent: number
    hasConfig: boolean
    hasMeasurementId: boolean
    hasApiSecret: boolean
}
import {
    DataLayerMonitoredEvent,
    FUNNEL_STEPS,
    DATALAYER_CHANNEL_NAME,
    getMonitoredDataLayerEvents,
    clearMonitoredDataLayerEvents,
    simulateDataLayerFunnelStep
} from '@/lib/tracking'

interface DataLayerMonitorWidgetProps {
    compact?: boolean
    title?: string
    description?: string
}

export default function DataLayerMonitorWidget({
    compact = false,
    title = 'Monitoring DataLayer (GA4 Ecommerce)',
    description = 'Vérification en temps réel des événements du tunnel de vente et conformité Google Analytics 4 (gtag.js)'
}: DataLayerMonitorWidgetProps) {
    const [events, setEvents] = useState<DataLayerMonitoredEvent[]>([])
    const [filterStep, setFilterStep] = useState<string>('ALL')
    const [searchQuery, setSearchQuery] = useState('')
    const [expandedEventId, setExpandedEventId] = useState<string | null>(null)
    const [copiedId, setCopiedId] = useState<string | null>(null)
    const [isSimulatingAll, setIsSimulatingAll] = useState(false)
    const [mpState, setMpState] = useState<Ga4MpMonitorState>({
        logs: [],
        unresolvedCount: 0,
        totalRecent: 0,
        hasConfig: true,
        hasMeasurementId: true,
        hasApiSecret: true,
    })
    const [mpLoading, setMpLoading] = useState(false)
    const [mpTesting, setMpTesting] = useState(false)
    const [mpExpanded, setMpExpanded] = useState(false)
    const [mpBanner, setMpBanner] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
    const channelRef = useRef<BroadcastChannel | null>(null)

    const fetchMpLogs = async () => {
        setMpLoading(true)
        try {
            const res = await fetch('/api/admin/analytics/ga4-mp-logs', { cache: 'no-store' })
            if (!res.ok) return
            const data = await res.json()
            if (data.success) {
                setMpState({
                    logs: data.logs || [],
                    unresolvedCount: data.unresolvedCount || 0,
                    totalRecent: data.totalRecent || 0,
                    hasConfig: Boolean(data.hasConfig),
                    hasMeasurementId: Boolean(data.hasMeasurementId),
                    hasApiSecret: Boolean(data.hasApiSecret),
                })
            }
        } catch {
            // Silencieux en cas de coupure réseau temporaire
        } finally {
            setMpLoading(false)
        }
    }

    const handleAcknowledgeMpAlerts = async () => {
        setMpLoading(true)
        try {
            const res = await fetch('/api/admin/analytics/ga4-mp-logs', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'acknowledge' }),
            })
            const data = await res.json()
            if (res.ok && data.success) {
                setMpState(prev => ({
                    ...prev,
                    logs: data.logs || prev.logs,
                    unresolvedCount: data.unresolvedCount || 0,
                    totalRecent: data.totalRecent || 0,
                }))
                setMpBanner({ type: 'success', text: 'Alertes Measurement Protocol acquittées.' })
                setMpExpanded(false)
            }
        } catch {
            setMpBanner({ type: 'error', text: 'Impossible d\'acquitter les alertes.' })
        } finally {
            setMpLoading(false)
        }
    }

    const handleTestMpDebug = async () => {
        setMpTesting(true)
        setMpBanner(null)
        try {
            const res = await fetch('/api/admin/analytics/ga4-mp-logs', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'test_debug' }),
            })
            const data = await res.json()
            setMpState(prev => ({
                ...prev,
                logs: data.logs || prev.logs,
                unresolvedCount: data.unresolvedCount ?? prev.unresolvedCount,
                totalRecent: data.totalRecent ?? prev.totalRecent,
            }))
            if (data.success) {
                setMpBanner({ type: 'success', text: `Endpoint debug/mp/collect validé (HTTP ${data.httpStatus || 200}, 0 avertissement).` })
            } else {
                setMpBanner({ type: 'error', text: data.error || 'Anomalie détectée par /debug/mp/collect — consultez le journal ci-dessous.' })
                setMpExpanded(true)
            }
        } catch {
            setMpBanner({ type: 'error', text: 'Erreur réseau lors du diagnostic /debug/mp/collect.' })
        } finally {
            setMpTesting(false)
        }
    }

    // Initial load and listeners
    useEffect(() => {
        // 1. Charge les événements existants + sonde serveur GA4 Measurement Protocol
        setEvents(getMonitoredDataLayerEvents())
        fetchMpLogs()

        const pollTimer = setInterval(() => {
            if (typeof document === 'undefined' || document.visibilityState === 'visible') {
                fetchMpLogs()
            }
        }, 15000)

        // 2. BroadcastChannel pour synchronisation entre onglets
        if (typeof BroadcastChannel !== 'undefined') {
            try {
                const bc = new BroadcastChannel(DATALAYER_CHANNEL_NAME)
                bc.onmessage = (msgEvent) => {
                    if (msgEvent.data && msgEvent.data.id) {
                        setEvents(prev => {
                            if (prev.some(e => e.id === msgEvent.data.id)) return prev
                            return [msgEvent.data, ...prev].slice(0, 50)
                        })
                    }
                }
                channelRef.current = bc
            } catch {
                // Ignore
            }
        }

        // 3. CustomEvent pour le même onglet
        const handleCustomEvent = (e: Event) => {
            const detail = (e as CustomEvent).detail as DataLayerMonitoredEvent
            if (detail && detail.id) {
                setEvents(prev => {
                    if (prev.some(ev => ev.id === detail.id)) return prev
                    return [detail, ...prev].slice(0, 50)
                })
            }
        }

        const handleClearEvent = () => {
            setEvents([])
        }

        window.addEventListener('riwaya:datalayer_event', handleCustomEvent)
        window.addEventListener('riwaya:datalayer_clear', handleClearEvent)

        return () => {
            clearInterval(pollTimer)
            if (channelRef.current) {
                channelRef.current.close()
            }
            window.removeEventListener('riwaya:datalayer_event', handleCustomEvent)
            window.removeEventListener('riwaya:datalayer_clear', handleClearEvent)
        }
    }, [])

    // Compteurs par étape du tunnel
    const stepCounts = useMemo(() => {
        const counts: Record<string, number> = {}
        Object.keys(FUNNEL_STEPS).forEach(step => {
            counts[step] = 0
        })
        events.forEach(e => {
            if (counts[e.eventName] !== undefined) {
                counts[e.eventName]++
            }
        })
        return counts
    }, [events])

    // Événements filtrés
    const filteredEvents = useMemo(() => {
        return events.filter(e => {
            const matchStep = filterStep === 'ALL' || e.eventName === filterStep
            const matchSearch = searchQuery === '' ||
                e.eventName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                e.stepName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                JSON.stringify(e.ecommerce).toLowerCase().includes(searchQuery.toLowerCase())
            return matchStep && matchSearch
        })
    }, [events, filterStep, searchQuery])

    // Statistiques globales de conformité
    const totalEvents = events.length
    const validEvents = events.filter(e => e.validation.isValid).length
    const warningEvents = events.filter(e => e.validation.warnings.length > 0 && e.validation.isValid).length
    const errorEvents = events.filter(e => !e.validation.isValid).length

    const handleCopyJson = (evt: DataLayerMonitoredEvent) => {
        const payload = {
            event: evt.eventName,
            ecommerce: evt.ecommerce
        }
        navigator.clipboard.writeText(JSON.stringify(payload, null, 2))
        setCopiedId(evt.id)
        setTimeout(() => setCopiedId(null), 2000)
    }

    const handleClear = () => {
        clearMonitoredDataLayerEvents()
        setEvents([])
    }

    const handleExport = () => {
        const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(events, null, 2))
        const downloadAnchor = document.createElement('a')
        downloadAnchor.setAttribute('href', dataStr)
        downloadAnchor.setAttribute('download', `datalayer-events-${new Date().toISOString().split('T')[0]}.json`)
        document.body.appendChild(downloadAnchor)
        downloadAnchor.click()
        downloadAnchor.remove()
    }

    const handleSimulateStep = (stepName: string) => {
        simulateDataLayerFunnelStep(stepName)
    }

    const handleSimulateFullFunnel = async () => {
        setIsSimulatingAll(true)
        const allSteps = Object.keys(FUNNEL_STEPS)
        for (let i = 0; i < allSteps.length; i++) {
            simulateDataLayerFunnelStep(allSteps[i])
            await new Promise(resolve => setTimeout(resolve, 350))
        }
        setIsSimulatingAll(false)
    }

    return (
        <div className="bg-white rounded-3xl border border-gray-100 shadow-xl shadow-black/5 overflow-hidden transition-all">
            {/* Header Monitoring */}
            <div className="p-6 sm:p-8 border-b border-gray-100 bg-gradient-to-r from-gray-50 via-white to-gray-50">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                    <div>
                        <div className="flex items-center gap-3 mb-2">
                            <span className="flex h-3 w-3 relative">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                            </span>
                            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                                Flux en direct actif
                            </span>
                            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">
                                Cross-Tab Sync
                            </span>
                        </div>
                        <h2 className="text-2xl sm:text-3xl font-black text-black tracking-tight flex items-center gap-3">
                            <Activity className="w-6 h-6 text-black" />
                            {title}
                        </h2>
                        <p className="text-xs text-gray-700 font-bold mt-1">
                            {description}
                        </p>
                    </div>

                    {/* Actions de test et gestion */}
                    <div className="flex items-center gap-2 flex-wrap">
                        <button
                            onClick={handleSimulateFullFunnel}
                            disabled={isSimulatingAll}
                            className="flex items-center gap-2 px-4 py-2.5 bg-black text-white hover:bg-gray-800 rounded-2xl font-black text-[11px] uppercase tracking-wider transition-all shadow-md active:scale-95 disabled:opacity-50"
                        >
                            <Sparkles className="w-3.5 h-3.5 text-yellow-400" />
                            {isSimulatingAll ? 'Simulation en cours...' : 'Simuler le tunnel (10 étapes)'}
                        </button>

                        <button
                            onClick={handleExport}
                            disabled={events.length === 0}
                            className="flex items-center gap-2 px-4 py-2.5 bg-white text-gray-700 hover:text-black border border-gray-200 hover:border-gray-300 rounded-2xl font-black text-[11px] uppercase tracking-wider transition-all disabled:opacity-40"
                        >
                            <Download className="w-3.5 h-3.5" />
                            Exporter JSON
                        </button>

                        <button
                            onClick={handleClear}
                            disabled={events.length === 0}
                            className="flex items-center gap-2 px-4 py-2.5 bg-red-50 text-red-600 hover:bg-red-100 rounded-2xl font-black text-[11px] uppercase tracking-wider transition-all disabled:opacity-40"
                        >
                            <Trash2 className="w-3.5 h-3.5" />
                            Vider
                        </button>
                    </div>
                </div>

                {/* Scorecards de conformité */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mt-6">
                    <div className="p-4 bg-white rounded-2xl border border-gray-100 shadow-sm">
                        <p className="text-[10px] font-black uppercase tracking-widest text-gray-700">Événements Captés</p>
                        <p className="text-2xl font-black text-black tracking-tight mt-1">{totalEvents}</p>
                    </div>
                    <div className="p-4 bg-white rounded-2xl border border-emerald-100 shadow-sm">
                        <div className="flex items-center justify-between">
                            <p className="text-[10px] font-black uppercase tracking-widest text-emerald-600">100% Conformes</p>
                            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                        </div>
                        <p className="text-2xl font-black text-emerald-600 tracking-tight mt-1">{validEvents}</p>
                    </div>
                    <div className="p-4 bg-white rounded-2xl border border-amber-100 shadow-sm">
                        <div className="flex items-center justify-between">
                            <p className="text-[10px] font-black uppercase tracking-widest text-amber-600">Avertissements</p>
                            <AlertCircle className="w-4 h-4 text-amber-500" />
                        </div>
                        <p className="text-2xl font-black text-amber-600 tracking-tight mt-1">{warningEvents}</p>
                    </div>
                    <div className="p-4 bg-white rounded-2xl border border-red-100 shadow-sm">
                        <div className="flex items-center justify-between">
                            <p className="text-[10px] font-black uppercase tracking-widest text-red-600">Anomalies</p>
                            <XCircle className="w-4 h-4 text-red-500" />
                        </div>
                        <p className="text-2xl font-black text-red-600 tracking-tight mt-1">{errorEvents}</p>
                    </div>
                </div>

                {/* Alerte Temps Réel GA4 Measurement Protocol (mp/collect) */}
                <div
                    className={`mt-5 rounded-2xl border p-4 transition-all ${
                        mpState.unresolvedCount > 0 || !mpState.hasConfig
                            ? 'bg-red-50/90 border-red-200'
                            : 'bg-emerald-50/60 border-emerald-200'
                    }`}
                >
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                        <div className="flex items-start sm:items-center gap-3">
                            {mpState.unresolvedCount > 0 || !mpState.hasConfig ? (
                                <ServerCrash className="w-5 h-5 text-red-600 shrink-0 mt-0.5 sm:mt-0" />
                            ) : (
                                <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5 sm:mt-0" />
                            )}
                            <div>
                                <div className="flex items-center gap-2 flex-wrap">
                                    <p className={`text-xs font-black uppercase tracking-wider ${
                                        mpState.unresolvedCount > 0 || !mpState.hasConfig ? 'text-red-900' : 'text-emerald-900'
                                    }`}>
                                        GA4 Measurement Protocol (mp/collect serveur)
                                    </p>
                                    {mpState.unresolvedCount > 0 && (
                                        <span className="px-2 py-0.5 rounded-full bg-red-600 text-white text-[10px] font-black animate-pulse">
                                            {mpState.unresolvedCount} alerte{mpState.unresolvedCount > 1 ? 's' : ''} active{mpState.unresolvedCount > 1 ? 's' : ''}
                                        </span>
                                    )}
                                    {!mpState.hasConfig && (
                                        <span className="px-2 py-0.5 rounded-full bg-amber-600 text-white text-[10px] font-black">
                                            {!mpState.hasMeasurementId ? 'Measurement ID manquant' : 'API Secret manquant'}
                                        </span>
                                    )}
                                </div>
                                <p className="text-[11px] font-semibold text-gray-700 mt-0.5">
                                    {mpState.unresolvedCount > 0
                                        ? `${mpState.totalRecent} erreur(s) mp/collect détectée(s) sur les dernières 24h (synchronisation auto 15s).`
                                        : 'Suivi serveur des conversions COD opérationnel · 0 erreur mp/collect non acquittée (24h).'}
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center gap-2 flex-wrap">
                            <button
                                onClick={handleTestMpDebug}
                                disabled={mpTesting}
                                className="px-3 py-1.5 bg-black text-white hover:bg-gray-800 rounded-xl text-[10px] font-black uppercase tracking-wider inline-flex items-center gap-1.5 disabled:opacity-50"
                            >
                                <Play className="w-3 h-3" />
                                {mpTesting ? 'Diagnostic...' : 'Tester debug/mp/collect'}
                            </button>
                            <button
                                onClick={fetchMpLogs}
                                disabled={mpLoading}
                                className="px-3 py-1.5 bg-white text-gray-700 border border-gray-200 hover:border-gray-300 rounded-xl text-[10px] font-black uppercase tracking-wider inline-flex items-center gap-1.5"
                            >
                                <RefreshCw className={`w-3 h-3 ${mpLoading ? 'animate-spin' : ''}`} />
                                Actualiser
                            </button>
                            {mpState.logs.length > 0 && (
                                <button
                                    onClick={() => setMpExpanded(!mpExpanded)}
                                    className="px-3 py-1.5 bg-white text-black border border-gray-200 rounded-xl text-[10px] font-black uppercase tracking-wider"
                                >
                                    {mpExpanded ? 'Masquer logs' : `Logs (${mpState.logs.length})`}
                                </button>
                            )}
                            {mpState.unresolvedCount > 0 && (
                                <button
                                    onClick={handleAcknowledgeMpAlerts}
                                    disabled={mpLoading}
                                    className="px-3 py-1.5 bg-red-600 text-white hover:bg-red-700 rounded-xl text-[10px] font-black uppercase tracking-wider"
                                >
                                    Acquitter
                                </button>
                            )}
                        </div>
                    </div>

                    {mpBanner && (
                        <div className={`mt-3 px-3.5 py-2 rounded-xl text-xs font-bold border ${
                            mpBanner.type === 'success'
                                ? 'bg-white text-emerald-800 border-emerald-200'
                                : 'bg-white text-red-800 border-red-200'
                        }`}>
                            {mpBanner.text}
                        </div>
                    )}

                    {(mpExpanded || mpState.unresolvedCount > 0) && mpState.logs.length > 0 && (
                        <div className="mt-3 space-y-2 max-h-56 overflow-y-auto pr-1">
                            {mpState.logs.map((log) => (
                                <div
                                    key={log.id}
                                    className={`p-3 rounded-xl border bg-white text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2 ${
                                        log.isUnresolved ? 'border-red-300' : 'border-gray-200 opacity-75'
                                    }`}
                                >
                                    <div className="min-w-0 flex-1">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <span className="font-mono text-[10px] font-black px-2 py-0.5 rounded bg-red-100 text-red-800">
                                                {log.action}
                                            </span>
                                            {log.status !== null && (
                                                <span className="font-mono text-[10px] font-black text-black">
                                                    HTTP {log.status}
                                                </span>
                                            )}
                                            {log.orderId && (
                                                <span className="font-mono text-[10px] text-gray-600">
                                                    #{log.orderId}
                                                </span>
                                            )}
                                            {typeof log.value === 'number' && (
                                                <span className="text-[10px] font-bold text-gray-700">
                                                    {log.value} {log.currency} ({log.paymentMethod || 'COD'})
                                                </span>
                                            )}
                                        </div>
                                        <p className="text-[11px] font-medium text-red-800 mt-1 break-words">
                                            {log.error}
                                        </p>
                                    </div>
                                    <span className="text-[10px] font-mono text-gray-500 shrink-0">
                                        {new Date(log.createdAt).toLocaleString('fr-FR')}
                                    </span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Pipeline visuel du tunnel (10 étapes) */}
            <div className="p-6 sm:p-8 border-b border-gray-100 bg-white">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                        <Layers className="w-4 h-4 text-black" />
                        <h3 className="text-sm font-black uppercase tracking-wider text-black">
                            Pipeline des 10 étapes GA4
                        </h3>
                    </div>
                    <span className="text-[10px] font-bold text-gray-700">
                        Cliquez sur &quot;Tester&quot; pour déclencher un événement simulé
                    </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                    {Object.entries(FUNNEL_STEPS).map(([stepKey, stepInfo]) => {
                        const count = stepCounts[stepKey] || 0
                        const isActive = filterStep === stepKey
                        return (
                            <div
                                key={stepKey}
                                className={`p-3.5 rounded-2xl border transition-all ${
                                    isActive
                                        ? 'border-black bg-gray-50 shadow-md ring-2 ring-black/5'
                                        : count > 0
                                        ? 'border-emerald-200 bg-emerald-50/30 hover:border-emerald-400'
                                        : 'border-gray-200 bg-gray-50/50 hover:border-gray-300'
                                }`}
                            >
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-[10px] font-black text-gray-600">
                                        #{stepInfo.stepIndex}
                                    </span>
                                    <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                                        count > 0 ? 'bg-emerald-600 text-white' : 'bg-gray-200 text-gray-700'
                                    }`}>
                                        {count}
                                    </span>
                                </div>
                                <p className="text-xs font-black text-black truncate" title={stepInfo.stepName}>
                                    {stepInfo.stepName}
                                </p>
                                <p className="text-[9px] font-mono text-gray-600 truncate mt-0.5" title={stepKey}>
                                    {stepKey}
                                </p>

                                <div className="flex items-center justify-between gap-1 mt-3 pt-2 border-t border-gray-200">
                                    <button
                                        onClick={() => setFilterStep(isActive ? 'ALL' : stepKey)}
                                        className="text-[9px] font-black uppercase tracking-wider text-gray-600 hover:text-black transition-colors"
                                    >
                                        {isActive ? 'Voir tous' : 'Filtrer'}
                                    </button>
                                    <button
                                        onClick={() => handleSimulateStep(stepKey)}
                                        className="flex items-center gap-1 text-[9px] font-black uppercase tracking-wider text-black hover:text-blue-600 transition-colors bg-white px-2 py-0.5 rounded border border-gray-200 shadow-xs"
                                    >
                                        <Play className="w-2.5 h-2.5" />
                                        Tester
                                    </button>
                                </div>
                            </div>
                        )
                    })}
                </div>
            </div>

            {/* Contrôles de filtrage du flux */}
            <div className="p-4 sm:p-6 bg-gray-50/80 border-b border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-2 w-full sm:w-auto flex-1 max-w-md">
                    <div className="relative w-full">
                        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-600" />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Rechercher par événement, clé, ID..."
                            className="w-full pl-9 pr-4 py-2 bg-white border border-gray-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-black"
                        />
                    </div>
                </div>

                <div className="flex items-center gap-2 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
                    <button
                        onClick={() => setFilterStep('ALL')}
                        className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider whitespace-nowrap transition-all ${
                            filterStep === 'ALL'
                                ? 'bg-black text-white'
                                : 'bg-white text-gray-600 border border-gray-200 hover:border-gray-300'
                        }`}
                    >
                        Tous ({events.length})
                    </button>
                    {['view_item', 'add_to_cart', 'begin_checkout', 'purchase'].map(step => (
                        <button
                            key={step}
                            onClick={() => setFilterStep(filterStep === step ? 'ALL' : step)}
                            className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider whitespace-nowrap transition-all ${
                                filterStep === step
                                    ? 'bg-black text-white'
                                    : 'bg-white text-gray-600 border border-gray-200 hover:border-gray-300'
                            }`}
                        >
                            {step} ({stepCounts[step] || 0})
                        </button>
                    ))}
                </div>
            </div>

            {/* Liste des événements captés */}
            <div className="divide-y divide-gray-100">
                {filteredEvents.length === 0 ? (
                    <div className="p-16 text-center">
                        <div className="w-14 h-14 bg-gray-50 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-gray-200">
                            <Activity className="w-7 h-7 text-gray-500" />
                        </div>
                        <h4 className="text-base font-black text-black">Aucun événement capté pour ce filtre</h4>
                        <p className="text-xs text-gray-600 font-medium max-w-md mx-auto mt-1">
                            Naviguez sur la boutique pour émettre des événements réels ou cliquez sur &quot;Simuler le tunnel&quot; pour tester le flux complet.
                        </p>
                        <button
                            onClick={handleSimulateFullFunnel}
                            className="mt-4 px-6 py-2.5 bg-black text-white rounded-xl text-xs font-black uppercase tracking-wider inline-flex items-center gap-2 shadow-sm"
                        >
                            <Sparkles className="w-3.5 h-3.5 text-yellow-400" />
                            Lancer une simulation complète
                        </button>
                    </div>
                ) : (
                    filteredEvents.map(evt => {
                        const isExpanded = expandedEventId === evt.id
                        const isCopied = copiedId === evt.id
                        const itemsCount = Array.isArray(evt.ecommerce?.items) ? evt.ecommerce.items.length : 0

                        return (
                            <div key={evt.id} className="p-4 sm:p-6 hover:bg-gray-50/50 transition-colors">
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                    <div className="flex items-start sm:items-center gap-3">
                                        <span className={`w-8 h-8 rounded-xl flex items-center justify-center font-black text-xs shrink-0 ${
                                            evt.validation.isValid
                                                ? 'bg-emerald-100 text-emerald-700'
                                                : 'bg-red-100 text-red-700'
                                        }`}>
                                            {evt.stepIndex > 0 ? `#${evt.stepIndex}` : '•'}
                                        </span>

                                        <div>
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <span className="font-mono text-xs font-black text-black bg-gray-100 px-2 py-0.5 rounded">
                                                    {evt.eventName}
                                                </span>
                                                <span className="text-xs font-bold text-gray-700">
                                                    {evt.stepName}
                                                </span>
                                                <span className={`text-[10px] font-black px-2 py-0.5 rounded-full flex items-center gap-1 ${
                                                    evt.validation.isValid
                                                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                                        : 'bg-red-50 text-red-700 border border-red-200'
                                                }`}>
                                                    {evt.validation.isValid ? (
                                                        <>
                                                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                                            Conforme GA4
                                                        </>
                                                    ) : (
                                                        <>
                                                            <XCircle className="w-3 h-3 text-red-600" />
                                                            Incomplet
                                                        </>
                                                    )}
                                                </span>
                                            </div>

                                            <div className="flex items-center gap-4 text-[11px] text-gray-600 font-medium mt-1">
                                                <span>{new Date(evt.timestamp).toLocaleTimeString('fr-FR')}</span>
                                                {evt.ecommerce.currency && (
                                                    <span>Devise: <strong className="text-black">{evt.ecommerce.currency}</strong></span>
                                                )}
                                                {typeof evt.ecommerce.value === 'number' && (
                                                    <span>Valeur: <strong className="text-black">{evt.ecommerce.value} MAD</strong></span>
                                                )}
                                                {itemsCount > 0 && (
                                                    <span>Articles: <strong className="text-black">{itemsCount}</strong></span>
                                                )}
                                                {evt.ecommerce.transaction_id && (
                                                    <span>Tx: <strong className="text-black font-mono">{evt.ecommerce.transaction_id}</strong></span>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Actions d'inspection */}
                                    <div className="flex items-center gap-2 self-end sm:self-center">
                                        <button
                                            onClick={() => handleCopyJson(evt)}
                                            className="px-3 py-1.5 text-[10px] font-black uppercase tracking-wider bg-white border border-gray-200 hover:border-gray-300 rounded-lg text-gray-700 hover:text-black flex items-center gap-1.5 transition-all shadow-2xs"
                                        >
                                            {isCopied ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                                            {isCopied ? 'Copié' : 'Copier JSON'}
                                        </button>

                                        <button
                                            onClick={() => setExpandedEventId(isExpanded ? null : evt.id)}
                                            className="px-3 py-1.5 text-[10px] font-black uppercase tracking-wider bg-gray-100 hover:bg-gray-200 rounded-lg text-black flex items-center gap-1.5 transition-all"
                                        >
                                            {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                                            {isExpanded ? 'Masquer' : 'Inspecter'}
                                        </button>
                                    </div>
                                </div>

                                {/* Accordéon détails & Checklist de validation */}
                                {isExpanded && (
                                    <div className="mt-4 pt-4 border-t border-gray-100 space-y-4">
                                        {/* Checklist des règles GA4 */}
                                        <div className="bg-white p-4 rounded-xl border border-gray-200">
                                            <p className="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-2">
                                                Checklist de Conformité Google Analytics 4
                                            </p>
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                                {evt.validation.checks.map((chk, i) => (
                                                    <div key={i} className="flex items-center gap-2 text-xs font-semibold">
                                                        {chk.passed ? (
                                                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                                                        ) : (
                                                            <XCircle className="w-3.5 h-3.5 text-red-600 shrink-0" />
                                                        )}
                                                        <span className={chk.passed ? 'text-gray-700' : 'text-red-700'}>
                                                            {chk.label}
                                                        </span>
                                                    </div>
                                                ))}
                                            </div>

                                            {evt.validation.warnings.length > 0 && (
                                                <div className="mt-3 p-2.5 bg-amber-50 rounded-lg border border-amber-200 text-xs text-amber-800">
                                                    <strong>Avertissements :</strong>
                                                    <ul className="list-disc list-inside mt-1">
                                                        {evt.validation.warnings.map((w, idx) => (
                                                            <li key={idx}>{w}</li>
                                                        ))}
                                                    </ul>
                                                </div>
                                            )}

                                            {evt.validation.errors.length > 0 && (
                                                <div className="mt-3 p-2.5 bg-red-50 rounded-lg border border-red-200 text-xs text-red-800">
                                                    <strong>Erreurs bloquantes :</strong>
                                                    <ul className="list-disc list-inside mt-1">
                                                        {evt.validation.errors.map((err, idx) => (
                                                            <li key={idx}>{err}</li>
                                                        ))}
                                                    </ul>
                                                </div>
                                            )}
                                        </div>

                                        {/* Payload JSON brut émis dans dataLayer */}
                                        <div>
                                            <div className="flex items-center justify-between text-[10px] font-mono text-gray-500 mb-1">
                                                <span>dataLayer.push({JSON.stringify({ event: evt.eventName })})</span>
                                                <span>Payload inspecteur</span>
                                            </div>
                                            <pre className="p-4 bg-gray-950 text-emerald-400 font-mono text-xs rounded-xl overflow-x-auto border border-gray-800 max-h-80">
                                                <code>{JSON.stringify({ event: evt.eventName, ecommerce: evt.ecommerce }, null, 2)}</code>
                                            </pre>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )
                    })
                )}
            </div>
        </div>
    )
}

