'use client'

import React, { useState } from 'react'
import {
    Search,
    RefreshCw,
    CheckCircle2,
    XCircle,
    RotateCcw,
    Trash2,
    Copy,
    Check,
    ExternalLink,
    Clock,
    AlertCircle,
    Eye,
    X,
    MessageSquare,
    Filter
} from 'lucide-react'
import {
    getWhatsAppMessageLogs,
    resendWhatsAppMessage,
    deleteWhatsAppLog,
    clearWhatsAppLogs,
    type WhatsAppLogItem
} from '@/lib/actions/whatsapp-gateway'

interface Props {
    initialLogs: WhatsAppLogItem[]
    initialStats: {
        total: number
        sent: number
        failed: number
        delivered: number
    }
    initialTotal: number
    onShowFeedback: (message: string, type: 'success' | 'error') => void
}

const TYPE_CONFIG: Record<string, { label: string; bg: string; text: string }> = {
    ORDER_CONFIRM: { label: 'Confirmation Commande', bg: 'bg-emerald-50 border-emerald-200', text: 'text-emerald-700' },
    PROMO_LEAD: { label: 'Lead Panier (-10%)', bg: 'bg-purple-50 border-purple-200', text: 'text-purple-700' },
    ABANDONED_CART: { label: 'Relance Panier', bg: 'bg-amber-50 border-amber-200', text: 'text-amber-700' },
    TEST: { label: 'Test Passerelle', bg: 'bg-sky-50 border-sky-200', text: 'text-sky-700' },
    ORDER_STATUS: { label: 'Statut Expédition', bg: 'bg-blue-50 border-blue-200', text: 'text-blue-700' },
    DIRECT: { label: 'Message Direct', bg: 'bg-slate-100 border-slate-200', text: 'text-slate-700' },
}

export function WhatsAppLogsView({ initialLogs, initialStats, initialTotal, onShowFeedback }: Props) {
    const [logs, setLogs] = useState<WhatsAppLogItem[]>(initialLogs)
    const [stats, setStats] = useState(initialStats)
    const [total, setTotal] = useState(initialTotal)
    const [searchQuery, setSearchQuery] = useState('')
    const [filterStatus, setFilterStatus] = useState<string>('ALL')
    const [filterType, setFilterType] = useState<string>('ALL')
    const [isLoading, setIsLoading] = useState(false)
    const [selectedLog, setSelectedLog] = useState<WhatsAppLogItem | null>(null)
    const [resendingId, setResendingId] = useState<string | null>(null)
    const [copiedId, setCopiedId] = useState<string | null>(null)
    const [isClearing, setIsClearing] = useState(false)

    const fetchLogs = async (status = filterStatus, type = filterType, search = searchQuery) => {
        setIsLoading(true)
        try {
            const res = await getWhatsAppMessageLogs({
                status,
                type,
                search,
                limit: 50
            })
            setLogs(res.logs)
            setStats(res.stats)
            setTotal(res.total)
        } catch {
            onShowFeedback('Erreur lors du rechargement des messages', 'error')
        } finally {
            setIsLoading(false)
        }
    }

    const handleSearchSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        fetchLogs(filterStatus, filterType, searchQuery)
    }

    const handleStatusChange = (status: string) => {
        setFilterStatus(status)
        fetchLogs(status, filterType, searchQuery)
    }

    const handleTypeChange = (type: string) => {
        setFilterType(type)
        fetchLogs(filterStatus, type, searchQuery)
    }

    const handleResend = async (log: WhatsAppLogItem) => {
        setResendingId(log.id)
        try {
            const res = await resendWhatsAppMessage(log.id)
            if (res.success) {
                onShowFeedback('Message renvoyé avec succès sur WhatsApp !', 'success')
                await fetchLogs()
            } else {
                onShowFeedback(res.error || 'Erreur lors du renvoi', 'error')
            }
        } catch {
            onShowFeedback('Erreur réseau lors du renvoi', 'error')
        } finally {
            setResendingId(null)
        }
    }

    const handleDelete = async (id: string) => {
        if (!confirm('Supprimer cet enregistrement du journal ?')) return
        try {
            const res = await deleteWhatsAppLog(id)
            if (res.success) {
                onShowFeedback('Enregistrement supprimé', 'success')
                setLogs(prev => prev.filter(l => l.id !== id))
                setStats(prev => ({ ...prev, total: Math.max(0, prev.total - 1) }))
                if (selectedLog?.id === id) setSelectedLog(null)
            } else {
                onShowFeedback(res.error || 'Erreur suppression', 'error')
            }
        } catch {
            onShowFeedback('Erreur réseau', 'error')
        }
    }

    const handleClearAll = async () => {
        if (!confirm('Voulez-vous réinitialiser TOUT le journal des messages WhatsApp ?')) return
        setIsClearing(true)
        try {
            const res = await clearWhatsAppLogs()
            if (res.success) {
                onShowFeedback('Journal réinitialisé avec succès', 'success')
                setLogs([])
                setStats({ total: 0, sent: 0, failed: 0, delivered: 0 })
                setTotal(0)
            } else {
                onShowFeedback(res.error || 'Erreur', 'error')
            }
        } finally {
            setIsClearing(false)
        }
    }

    const handleCopyPhone = (phone: string, id: string) => {
        navigator.clipboard.writeText(phone)
        setCopiedId(id)
        setTimeout(() => setCopiedId(null), 2000)
    }

    const successRate = stats.total > 0
        ? Math.round(((stats.sent + stats.delivered) / stats.total) * 100)
        : 100

    return (
        <div className="space-y-6">
            {/* KPI Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm flex flex-col justify-between">
                    <p className="text-[11px] font-black uppercase tracking-wider text-slate-400">Total Envoyés</p>
                    <p className="text-3xl font-black text-slate-900 mt-2">{stats.total}</p>
                    <p className="text-[10px] text-gray-500 font-medium mt-1">Tous canaux WAHA</p>
                </div>
                <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm flex flex-col justify-between">
                    <p className="text-[11px] font-black uppercase tracking-wider text-emerald-600">Succès (Envoyés)</p>
                    <p className="text-3xl font-black text-emerald-600 mt-2">{stats.sent + stats.delivered}</p>
                    <p className="text-[10px] text-emerald-700/80 font-medium mt-1">Reçus par WhatsApp</p>
                </div>
                <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm flex flex-col justify-between">
                    <p className="text-[11px] font-black uppercase tracking-wider text-rose-500">Échecs</p>
                    <p className="text-3xl font-black text-rose-600 mt-2">{stats.failed}</p>
                    <p className="text-[10px] text-rose-500/80 font-medium mt-1">Non joignables / Erreurs</p>
                </div>
                <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm flex flex-col justify-between">
                    <p className="text-[11px] font-black uppercase tracking-wider text-sky-600">Taux de Succès</p>
                    <p className="text-3xl font-black text-sky-600 mt-2">{successRate}%</p>
                    <p className="text-[10px] text-sky-700/80 font-medium mt-1">Délivrabilité globale</p>
                </div>
            </div>

            {/* Barre de Filtres & Recherche */}
            <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-5 space-y-4">
                <form onSubmit={handleSearchSubmit} className="flex flex-col sm:flex-row gap-3">
                    <div className="relative flex-1">
                        <Search className="w-4 h-4 text-gray-400 absolute left-4 top-1/2 -translate-y-1/2" />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Rechercher par numéro (ex: 2126...) ou texte..."
                            className="w-full pl-11 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-2xl text-xs font-bold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        />
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            type="submit"
                            className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-black rounded-2xl transition-all cursor-pointer"
                        >
                            Filtrer
                        </button>
                        <button
                            type="button"
                            onClick={() => fetchLogs()}
                            disabled={isLoading}
                            className="p-2.5 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-2xl text-slate-700 transition-all cursor-pointer disabled:opacity-50"
                            title="Actualiser le journal"
                        >
                            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-emerald-600' : ''}`} />
                        </button>
                        {logs.length > 0 && (
                            <button
                                type="button"
                                onClick={handleClearAll}
                                disabled={isClearing}
                                className="p-2.5 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-2xl text-rose-600 transition-all cursor-pointer"
                                title="Vider le journal"
                            >
                                <Trash2 className="w-4 h-4" />
                            </button>
                        )}
                    </div>
                </form>

                {/* Filtres par chips */}
                <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-gray-100">
                    <span className="text-[11px] font-black uppercase text-gray-400 tracking-wider flex items-center gap-1 mr-1">
                        <Filter className="w-3 h-3" />
                        Type:
                    </span>
                    {[
                        { key: 'ALL', label: 'Tous' },
                        { key: 'ORDER_CONFIRM', label: 'Commandes' },
                        { key: 'PROMO_LEAD', label: 'Leads Panier' },
                        { key: 'ABANDONED_CART', label: 'Relances Panier' },
                        { key: 'ORDER_STATUS', label: 'Expéditions' },
                        { key: 'TEST', label: 'Tests' },
                    ].map(t => (
                        <button
                            key={t.key}
                            type="button"
                            onClick={() => handleTypeChange(t.key)}
                            className={`px-3 py-1 rounded-xl text-[11px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                                filterType === t.key
                                    ? 'bg-emerald-600 text-white shadow-sm'
                                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                            }`}
                        >
                            {t.label}
                        </button>
                    ))}

                    <span className="text-[11px] font-black uppercase text-gray-400 tracking-wider flex items-center gap-1 ml-3 mr-1">
                        Statut:
                    </span>
                    {[
                        { key: 'ALL', label: 'Tous' },
                        { key: 'SENT', label: 'Envoyés' },
                        { key: 'FAILED', label: 'Échecs' }
                    ].map(s => (
                        <button
                            key={s.key}
                            type="button"
                            onClick={() => handleStatusChange(s.key)}
                            className={`px-3 py-1 rounded-xl text-[11px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                                filterStatus === s.key
                                    ? 'bg-slate-900 text-white shadow-sm'
                                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                            }`}
                        >
                            {s.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Liste / Tableau des Messages */}
            <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                    <div>
                        <h3 className="text-base font-black text-slate-900">
                            Messages WhatsApp Tracés ({total})
                        </h3>
                        <p className="text-[11px] text-gray-500 font-medium">
                            Historique des envois effectués via la passerelle WAHA
                        </p>
                    </div>
                </div>

                {logs.length === 0 ? (
                    <div className="p-12 text-center">
                        <div className="w-16 h-16 rounded-full bg-gray-50 border border-gray-100 flex items-center justify-center mx-auto mb-3">
                            <MessageSquare className="w-8 h-8 text-gray-400" />
                        </div>
                        <p className="text-sm font-black text-slate-800">Aucun message WhatsApp trouvé</p>
                        <p className="text-xs text-gray-400 font-medium mt-1">
                            Les messages envoyés par WAHA apparaîtront ici avec leur statut d&apos;acheminement.
                        </p>
                    </div>
                ) : (
                    <div className="divide-y divide-gray-100">
                        {logs.map((log) => {
                            const typeCfg = TYPE_CONFIG[log.type] || {
                                label: log.type,
                                bg: 'bg-gray-100 border-gray-200',
                                text: 'text-gray-700'
                            }
                            const isSent = log.status === 'SENT' || log.status === 'DELIVERED'
                            const isResending = resendingId === log.id

                            const dateFormatted = new Date(log.createdAt).toLocaleString('fr-FR', {
                                day: '2-digit',
                                month: '2-digit',
                                year: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                            })

                            return (
                                <div
                                    key={log.id}
                                    className="p-5 hover:bg-gray-50/80 transition-colors flex flex-col lg:flex-row lg:items-center justify-between gap-4"
                                >
                                    {/* Bloc Destinataire & Méta */}
                                    <div className="flex items-start gap-3.5 min-w-[240px]">
                                        <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 ${
                                            isSent ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
                                        }`}>
                                            {isSent ? (
                                                <CheckCircle2 className="w-5 h-5" />
                                            ) : (
                                                <XCircle className="w-5 h-5" />
                                            )}
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <span className="font-mono font-black text-sm text-slate-900 tracking-tight">
                                                    +{log.phone}
                                                </span>
                                                <button
                                                    type="button"
                                                    onClick={() => handleCopyPhone(log.phone, log.id)}
                                                    className="p-1 hover:bg-gray-200 rounded text-gray-400 hover:text-slate-800 transition-colors cursor-pointer"
                                                    title="Copier le numéro"
                                                >
                                                    {copiedId === log.id ? (
                                                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                                                    ) : (
                                                        <Copy className="w-3.5 h-3.5" />
                                                    )}
                                                </button>
                                                <a
                                                    href={`https://wa.me/${log.phone}`}
                                                    target="_blank"
                                                    rel="noreferrer"
                                                    className="p-1 hover:bg-emerald-50 rounded text-emerald-600 transition-colors"
                                                    title="Ouvrir WhatsApp Web"
                                                >
                                                    <ExternalLink className="w-3.5 h-3.5" />
                                                </a>
                                            </div>
                                            <div className="flex flex-wrap items-center gap-2 mt-1">
                                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border ${typeCfg.bg} ${typeCfg.text}`}>
                                                    {typeCfg.label}
                                                </span>
                                                <span className="text-[10px] text-gray-400 font-medium flex items-center gap-1">
                                                    <Clock className="w-3 h-3" />
                                                    {dateFormatted}
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Extrait Message WhatsApp */}
                                    <div className="flex-1 max-w-xl">
                                        <div
                                            onClick={() => setSelectedLog(log)}
                                            className="bg-[#EFEAE2]/60 hover:bg-[#EFEAE2] p-3 rounded-2xl border border-stone-200/80 cursor-pointer transition-all group"
                                        >
                                            <p className="text-xs text-slate-800 line-clamp-2 leading-relaxed">
                                                {log.message}
                                            </p>
                                            <div className="flex items-center justify-between mt-1 text-[10px] text-stone-500">
                                                <span className="group-hover:text-emerald-700 font-bold flex items-center gap-1">
                                                    <Eye className="w-3 h-3" />
                                                    Cliquer pour voir le message complet
                                                </span>
                                                <span className="font-mono">{isSent ? '✓✓ Envoyé' : 'Échec'}</span>
                                            </div>
                                        </div>
                                        {log.error && (
                                            <p className="text-[11px] text-rose-600 font-bold mt-1.5 flex items-center gap-1">
                                                <AlertCircle className="w-3 h-3 shrink-0" />
                                                <span>{log.error}</span>
                                            </p>
                                        )}
                                    </div>

                                    {/* Statut WAHA & Actions */}
                                    <div className="flex items-center justify-between lg:justify-end gap-3 shrink-0 pt-2 lg:pt-0 border-t lg:border-t-0 border-gray-100">
                                        <div className="text-right">
                                            <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-black uppercase tracking-wider ${
                                                isSent
                                                    ? 'bg-emerald-100 text-emerald-800'
                                                    : 'bg-rose-100 text-rose-800'
                                            }`}>
                                                {isSent ? 'Envoyé' : 'Échec'}
                                            </span>
                                            {log.messageId && (
                                                <p className="text-[9px] font-mono text-gray-400 mt-1 max-w-[120px] truncate" title={log.messageId}>
                                                    ID: {log.messageId}
                                                </p>
                                            )}
                                        </div>

                                        <div className="flex items-center gap-1">
                                            <button
                                                type="button"
                                                onClick={() => handleResend(log)}
                                                disabled={isResending}
                                                className="p-2.5 bg-gray-50 hover:bg-emerald-50 hover:text-emerald-700 rounded-xl text-slate-600 transition-colors cursor-pointer disabled:opacity-50"
                                                title="Renvoyer ce message"
                                            >
                                                <RotateCcw className={`w-4 h-4 ${isResending ? 'animate-spin text-emerald-600' : ''}`} />
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => handleDelete(log.id)}
                                                className="p-2.5 bg-gray-50 hover:bg-rose-50 hover:text-rose-700 rounded-xl text-slate-400 transition-colors cursor-pointer"
                                                title="Supprimer"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                )}
            </div>

            {/* Modal Détail du Message */}
            {selectedLog && (
                <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
                    <div className="bg-white rounded-3xl max-w-xl w-full p-6 sm:p-8 shadow-2xl border border-gray-100 space-y-6 relative max-h-[90vh] overflow-y-auto">
                        <button
                            type="button"
                            onClick={() => setSelectedLog(null)}
                            className="absolute top-5 right-5 p-2 bg-gray-100 hover:bg-gray-200 rounded-full text-slate-600 transition-colors cursor-pointer"
                        >
                            <X className="w-4 h-4" />
                        </button>

                        <div>
                            <span className="text-[10px] font-black uppercase tracking-wider text-emerald-600">
                                Trace Message WAHA
                            </span>
                            <h3 className="text-xl font-black text-slate-900 mt-0.5">
                                Destinataire : +{selectedLog.phone}
                            </h3>
                            <p className="text-xs text-gray-400 font-medium mt-1">
                                Enregistré le {new Date(selectedLog.createdAt).toLocaleString('fr-FR')}
                            </p>
                        </div>

                        {/* Bulle WhatsApp Réaliste */}
                        <div>
                            <label className="block text-xs font-black uppercase tracking-wider text-slate-700 mb-2">
                                Contenu exact envoyé
                            </label>
                            <div className="bg-[#EFEAE2] p-5 rounded-2xl border border-stone-300">
                                <div className="bg-white rounded-2xl rounded-bl-sm p-4 shadow-sm border border-stone-200 text-slate-900 text-xs sm:text-sm whitespace-pre-wrap leading-relaxed">
                                    {selectedLog.message}
                                    <div className="text-[10px] text-stone-400 text-right mt-2 font-mono flex items-center justify-end gap-1">
                                        <span>{new Date(selectedLog.createdAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</span>
                                        <span>{selectedLog.status === 'SENT' ? '✓✓' : '✕'}</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Méta-données */}
                        <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100 space-y-2 text-xs">
                            <div className="flex justify-between py-1 border-b border-gray-200/60">
                                <span className="font-bold text-gray-500">Statut:</span>
                                <span className={`font-black ${selectedLog.status === 'SENT' ? 'text-emerald-700' : 'text-rose-700'}`}>
                                    {selectedLog.status}
                                </span>
                            </div>
                            <div className="flex justify-between py-1 border-b border-gray-200/60">
                                <span className="font-bold text-gray-500">Type d&apos;envoi:</span>
                                <span className="font-black text-slate-800">{selectedLog.type}</span>
                            </div>
                            {selectedLog.messageId && (
                                <div className="flex justify-between py-1 border-b border-gray-200/60">
                                    <span className="font-bold text-gray-500">ID Message WAHA:</span>
                                    <span className="font-mono text-slate-800 text-[11px] break-all">{selectedLog.messageId}</span>
                                </div>
                            )}
                            {selectedLog.metadata && (
                                <div className="pt-1">
                                    <span className="font-bold text-gray-500 block mb-1">Métadonnées:</span>
                                    <pre className="bg-gray-900 text-emerald-400 p-2.5 rounded-xl text-[11px] font-mono overflow-x-auto">
                                        {JSON.stringify(JSON.parse(selectedLog.metadata), null, 2)}
                                    </pre>
                                </div>
                            )}
                            {selectedLog.error && (
                                <div className="pt-1 text-rose-700 font-bold">
                                    <span className="block mb-0.5">Erreur signalée :</span>
                                    <p className="bg-rose-50 border border-rose-200 p-2.5 rounded-xl text-xs">
                                        {selectedLog.error}
                                    </p>
                                </div>
                            )}
                        </div>

                        {/* Actions */}
                        <div className="flex items-center justify-between gap-3 pt-2">
                            <a
                                href={`https://wa.me/${selectedLog.phone}`}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-black text-xs rounded-xl transition-all"
                            >
                                <ExternalLink className="w-3.5 h-3.5" />
                                <span>Ouvrir dans WhatsApp</span>
                            </a>
                            <div className="flex items-center gap-2">
                                <button
                                    type="button"
                                    onClick={() => handleResend(selectedLog)}
                                    disabled={resendingId === selectedLog.id}
                                    className="inline-flex items-center gap-1.5 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs rounded-xl shadow transition-all cursor-pointer disabled:opacity-50"
                                >
                                    <RotateCcw className={`w-3.5 h-3.5 ${resendingId === selectedLog.id ? 'animate-spin' : ''}`} />
                                    <span>Renvoyer maintenant</span>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
