'use client'

import React, { useState, useEffect } from 'react'
import Image from 'next/image'
import {
    Monitor,
    Play,
    Square,
    RotateCcw,
    Trash2,
    QrCode,
    Plus,
    RefreshCw,
    CheckCircle2,
    AlertTriangle,
    XCircle,
    ExternalLink,
    Smartphone,
    X,
    User,
    Clock,
    Activity,
    Layers,
    Shield,
    BarChart2
} from 'lucide-react'
import {
    getWahaSessions,
    createWahaSession,
    startWahaSession,
    stopWahaSession,
    restartWahaSessionByName,
    deleteWahaSession,
    getWahaSessionQrCode,
    type WahaSessionItem
} from '@/lib/actions/whatsapp-gateway'

interface Props {
    initialSessions: WahaSessionItem[]
    onShowFeedback: (message: string, type: 'success' | 'error') => void
}

export function WhatsAppSessionsView({ initialSessions, onShowFeedback }: Props) {
    const [sessions, setSessions] = useState<WahaSessionItem[]>(initialSessions)
    const [isLoading, setIsLoading] = useState(false)
    const [actionRunning, setActionRunning] = useState<string | null>(null)

    // Modal Création
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
    const [newSessionName, setNewSessionName] = useState('')
    const [autoStart, setAutoStart] = useState(true)
    const [isCreating, setIsCreating] = useState(false)

    // Modal QR Code
    const [qrModalSession, setQrModalSession] = useState<string | null>(null)
    const [qrCodeData, setQrCodeData] = useState<string | null>(null)
    const [isLoadingQr, setIsLoadingQr] = useState(false)

    const refreshSessions = async () => {
        setIsLoading(true)
        try {
            const res = await getWahaSessions()
            if (res.success) {
                setSessions(res.sessions)
            } else {
                onShowFeedback(res.error || 'Erreur chargement des sessions', 'error')
            }
        } catch {
            onShowFeedback('Erreur de communication avec WAHA', 'error')
        } finally {
            setIsLoading(false)
        }
    }

    const handleCreateSession = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!newSessionName.trim()) {
            onShowFeedback('Veuillez spécifier un nom de session', 'error')
            return
        }

        setIsCreating(true)
        try {
            const res = await createWahaSession(newSessionName, autoStart)
            if (res.success) {
                onShowFeedback(`Session "${newSessionName}" créée avec succès !`, 'success')
                setIsCreateModalOpen(false)
                const createdName = newSessionName
                setNewSessionName('')
                await refreshSessions()
                if (autoStart) {
                    // Ouvrir directement le QR modal pour appairer
                    handleOpenQrModal(createdName)
                }
            } else {
                onShowFeedback(res.error || 'Erreur création session', 'error')
            }
        } catch {
            onShowFeedback('Erreur réseau lors de la création', 'error')
        } finally {
            setIsCreating(false)
        }
    }

    const handleStartSession = async (name: string) => {
        setActionRunning(name + '_start')
        try {
            const res = await startWahaSession(name)
            if (res.success) {
                onShowFeedback(`Session "${name}" démarrée !`, 'success')
                await refreshSessions()
            } else {
                onShowFeedback(res.error || 'Erreur démarrage', 'error')
            }
        } catch {
            onShowFeedback('Erreur réseau', 'error')
        } finally {
            setActionRunning(null)
        }
    }

    const handleStopSession = async (name: string) => {
        if (!confirm(`Voulez-vous vraiment arrêter la session "${name}" ?`)) return
        setActionRunning(name + '_stop')
        try {
            const res = await stopWahaSession(name)
            if (res.success) {
                onShowFeedback(`Session "${name}" arrêtée`, 'success')
                await refreshSessions()
            } else {
                onShowFeedback(res.error || 'Erreur arrêt', 'error')
            }
        } catch {
            onShowFeedback('Erreur réseau', 'error')
        } finally {
            setActionRunning(null)
        }
    }

    const handleRestartSession = async (name: string) => {
        setActionRunning(name + '_restart')
        try {
            const res = await restartWahaSessionByName(name)
            if (res.success) {
                onShowFeedback(`Session "${name}" redémarrée avec succès`, 'success')
                await refreshSessions()
            } else {
                onShowFeedback(res.error || 'Erreur redémarrage', 'error')
            }
        } catch {
            onShowFeedback('Erreur réseau', 'error')
        } finally {
            setActionRunning(null)
        }
    }

    const handleDeleteSession = async (name: string) => {
        if (!confirm(`Supprimer définitivement la session "${name}" et ses données d'authentification ?`)) return
        setActionRunning(name + '_delete')
        try {
            const res = await deleteWahaSession(name)
            if (res.success) {
                onShowFeedback(`Session "${name}" supprimée`, 'success')
                setSessions(prev => prev.filter(s => s.name !== name))
            } else {
                onShowFeedback(res.error || 'Erreur suppression', 'error')
            }
        } catch {
            onShowFeedback('Erreur réseau', 'error')
        } finally {
            setActionRunning(null)
        }
    }

    const handleOpenQrModal = async (name: string) => {
        setQrModalSession(name)
        setIsLoadingQr(true)
        setQrCodeData(null)
        try {
            const res = await getWahaSessionQrCode(name)
            if (res.success && res.qr) {
                setQrCodeData(res.qr)
            } else {
                onShowFeedback('Session pas encore prête pour le QR (en cours d\'initialisation...)', 'error')
            }
        } catch {
            onShowFeedback('Erreur récupération QR', 'error')
        } finally {
            setIsLoadingQr(false)
        }
    }

    // Polling du QR Code si modal ouvert
    useEffect(() => {
        if (!qrModalSession) return

        const interval = setInterval(async () => {
            const [qrRes, sessionsRes] = await Promise.all([
                getWahaSessionQrCode(qrModalSession),
                getWahaSessions()
            ])

            if (qrRes.success && qrRes.qr) {
                setQrCodeData(qrRes.qr)
            }

            if (sessionsRes.success) {
                setSessions(sessionsRes.sessions)
                const current = sessionsRes.sessions.find(s => s.name === qrModalSession)
                if (current?.status === 'WORKING') {
                    onShowFeedback(`Session "${qrModalSession}" connectée avec succès !`, 'success')
                    setQrModalSession(null)
                }
            }
        }, 3000)

        return () => clearInterval(interval)
    }, [qrModalSession])

    const totalCount = sessions.length
    const workingCount = sessions.filter(s => s.status === 'WORKING').length
    const qrCount = sessions.filter(s => s.status === 'SCAN_QR').length
    const stoppedCount = sessions.filter(s => s.status === 'STOPPED' || s.status === 'FAILED').length

    return (
        <div className="space-y-8">
            {/* KPI Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm flex flex-col justify-between">
                    <p className="text-[11px] font-black uppercase tracking-wider text-slate-400">Total Sessions</p>
                    <p className="text-3xl font-black text-slate-900 mt-2">{totalCount}</p>
                    <p className="text-[10px] text-gray-500 font-medium mt-1">Comptes WhatsApp configurés</p>
                </div>
                <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm flex flex-col justify-between">
                    <p className="text-[11px] font-black uppercase tracking-wider text-emerald-600">En Ligne (WORKING)</p>
                    <p className="text-3xl font-black text-emerald-600 mt-2">{workingCount}</p>
                    <p className="text-[10px] text-emerald-700/80 font-medium mt-1">Opérationnels pour les envois</p>
                </div>
                <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm flex flex-col justify-between">
                    <p className="text-[11px] font-black uppercase tracking-wider text-amber-600">Scan Requis (QR)</p>
                    <p className="text-3xl font-black text-amber-600 mt-2">{qrCount}</p>
                    <p className="text-[10px] text-amber-700/80 font-medium mt-1">En attente de scan téléphone</p>
                </div>
                <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm flex flex-col justify-between">
                    <p className="text-[11px] font-black uppercase tracking-wider text-rose-500">Arrêtées / Échec</p>
                    <p className="text-3xl font-black text-rose-600 mt-2">{stoppedCount}</p>
                    <p className="text-[10px] text-rose-500/80 font-medium mt-1">Inactives ou erreur Chromium</p>
                </div>
            </div>

            {/* En-tête de section avec actions */}
            <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6 sm:p-8">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-gray-100">
                    <div>
                        <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
                            <Monitor className="w-5 h-5 text-emerald-600" />
                            Contrôle des Sessions WAHA (Multi-Accounts)
                        </h3>
                        <p className="text-xs text-gray-500 font-medium mt-0.5">
                            Gérez vos instances WhatsApp, démarrez plusieurs numéros en parallèle et contrôlez leur statut.
                        </p>
                    </div>

                    <div className="flex items-center gap-2.5">
                        <a
                            href="http://167.86.108.246:3001/#/%F0%9F%96%A5%EF%B8%8F%20Sessions"
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1.5 px-3.5 py-2.5 bg-gray-50 hover:bg-gray-100 text-slate-700 font-bold text-xs rounded-2xl border border-gray-200 transition-all"
                            title="Documentation API Swagger"
                        >
                            <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
                            <span>Swagger API</span>
                        </a>

                        <button
                            type="button"
                            onClick={refreshSessions}
                            disabled={isLoading}
                            className="p-2.5 bg-gray-50 hover:bg-gray-100 text-slate-700 rounded-2xl border border-gray-200 transition-all cursor-pointer disabled:opacity-50"
                            title="Actualiser la liste"
                        >
                            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-emerald-600' : ''}`} />
                        </button>

                        <button
                            type="button"
                            onClick={() => setIsCreateModalOpen(true)}
                            className="inline-flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs rounded-2xl shadow transition-all cursor-pointer"
                        >
                            <Plus className="w-4 h-4" />
                            <span>Créer une Session</span>
                        </button>
                    </div>
                </div>

                {/* Grille des Sessions */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mt-6">
                    {sessions.map((session) => {
                        const isWorking = session.status === 'WORKING'
                        const isScan = session.status === 'SCAN_QR'
                        const isStarting = session.status === 'STARTING'
                        const isStopped = session.status === 'STOPPED'
                        const isFailed = session.status === 'FAILED'

                        const phone = session.me?.id ? session.me.id.replace(/@c\.us|@s\.whatsapp\.net/, '') : null
                        const pushName = session.me?.pushName || null

                        return (
                            <div
                                key={session.name}
                                className={`rounded-3xl border p-6 flex flex-col justify-between transition-all ${
                                    isWorking
                                        ? 'bg-gradient-to-br from-emerald-50/40 to-white border-emerald-200/80 shadow-sm'
                                        : isScan
                                        ? 'bg-gradient-to-br from-amber-50/40 to-white border-amber-200/80 shadow-sm'
                                        : 'bg-white border-gray-200/70 shadow-sm'
                                }`}
                            >
                                <div>
                                    {/* Entête de carte */}
                                    <div className="flex items-start justify-between gap-3 mb-4">
                                        <div className="flex items-center gap-2.5">
                                            <div className={`w-11 h-11 rounded-2xl flex items-center justify-center font-black ${
                                                isWorking
                                                    ? 'bg-emerald-100 text-emerald-700'
                                                    : isScan
                                                    ? 'bg-amber-100 text-amber-700'
                                                    : isStarting
                                                    ? 'bg-sky-100 text-sky-700'
                                                    : 'bg-gray-100 text-gray-500'
                                            }`}>
                                                {isStarting ? (
                                                    <RefreshCw className="w-5 h-5 animate-spin" />
                                                ) : (
                                                    <Smartphone className="w-5 h-5" />
                                                )}
                                            </div>
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <h4 className="font-black text-slate-900 text-base tracking-tight font-mono">
                                                        {session.name}
                                                    </h4>
                                                    {session.name === 'default' && (
                                                        <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-slate-900 text-white">
                                                            Principale
                                                        </span>
                                                    )}
                                                </div>
                                                <p className="text-[11px] text-gray-400 font-medium">
                                                    Session WhatsApp Engine
                                                </p>
                                            </div>
                                        </div>

                                        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                                            isWorking
                                                ? 'bg-emerald-100 text-emerald-800'
                                                : isScan
                                                ? 'bg-amber-100 text-amber-800 animate-pulse'
                                                : isStarting
                                                ? 'bg-sky-100 text-sky-800'
                                                : isFailed
                                                ? 'bg-rose-100 text-rose-800'
                                                : 'bg-gray-200 text-gray-700'
                                        }`}>
                                            {isWorking ? (
                                                <>
                                                    <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                                    En Ligne
                                                </>
                                            ) : isScan ? (
                                                <>
                                                    <QrCode className="w-3 h-3 text-amber-600" />
                                                    Scan Requis
                                                </>
                                            ) : isStarting ? (
                                                <>
                                                    <RefreshCw className="w-3 h-3 animate-spin text-sky-600" />
                                                    Démarrage
                                                </>
                                            ) : isFailed ? (
                                                <>
                                                    <XCircle className="w-3 h-3 text-rose-600" />
                                                    Échec
                                                </>
                                            ) : (
                                                <>
                                                    <Square className="w-3 h-3 text-gray-500" />
                                                    Arrêtée
                                                </>
                                            )}
                                        </span>
                                    </div>

                                    {/* Méta-données */}
                                    <div className="bg-white/80 rounded-2xl p-4 border border-gray-100 space-y-2.5 text-xs">
                                        <div className="flex items-center justify-between">
                                            <span className="font-bold text-gray-400 flex items-center gap-1.5">
                                                <Smartphone className="w-3.5 h-3.5" />
                                                Numéro :
                                            </span>
                                            <span className="font-mono font-black text-slate-800">
                                                {phone ? `+${phone}` : 'Non connecté'}
                                            </span>
                                        </div>

                                        <div className="flex items-center justify-between">
                                            <span className="font-bold text-gray-400 flex items-center gap-1.5">
                                                <User className="w-3.5 h-3.5" />
                                                Nom WhatsApp :
                                            </span>
                                            <span className="font-bold text-slate-800">
                                                {pushName || 'N/A'}
                                            </span>
                                        </div>

                                        {session.timestamps?.activity && (
                                            <div className="flex items-center justify-between">
                                                <span className="font-bold text-gray-400 flex items-center gap-1.5">
                                                    <Clock className="w-3.5 h-3.5" />
                                                    Dernière activité :
                                                </span>
                                                <span className="text-[11px] text-gray-600 font-medium">
                                                    {new Date(session.timestamps.activity).toLocaleString('fr-FR')}
                                                </span>
                                            </div>
                                        )}

                                        {session.me?.messageCapping && (
                                            <div className="flex items-center justify-between">
                                                <span className="font-bold text-gray-400 flex items-center gap-1.5">
                                                    <Activity className="w-3.5 h-3.5" />
                                                    Plafond messages :
                                                </span>
                                                <span className="text-[11px] text-slate-700 font-bold">
                                                    {session.me.messageCapping.totalQuota === -1
                                                        ? 'Illimité (Standard)'
                                                        : `${session.me.messageCapping.usedQuota} / ${session.me.messageCapping.totalQuota}`}
                                                </span>
                                            </div>
                                        )}

                                        {session.deliveryStats && (
                                            <div className="flex items-center justify-between pt-1 border-t border-gray-100">
                                                <span className="font-bold text-gray-400 flex items-center gap-1.5">
                                                    <BarChart2 className="w-3.5 h-3.5 text-emerald-600" />
                                                    Délivrabilité :
                                                </span>
                                                <span className="inline-flex items-center gap-1.5 text-[11px] font-black text-slate-900">
                                                    <span className={session.deliveryStats.successRate >= 90 ? 'text-emerald-600' : 'text-amber-600'}>
                                                        {session.deliveryStats.successRate}%
                                                    </span>
                                                    <span className="text-gray-400 font-normal">
                                                        ({session.deliveryStats.total} envoyés)
                                                    </span>
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Barre d'Actions de la session */}
                                <div className="flex items-center justify-between gap-2 pt-4 mt-4 border-t border-gray-100">
                                    <div className="flex items-center gap-1.5">
                                        {/* Bouton Démarrer si arrêtée ou failed */}
                                        {(isStopped || isFailed) && (
                                            <button
                                                type="button"
                                                onClick={() => handleStartSession(session.name)}
                                                disabled={actionRunning === session.name + '_start'}
                                                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-sm transition-all cursor-pointer disabled:opacity-50"
                                            >
                                                <Play className="w-3.5 h-3.5" />
                                                <span>Démarrer</span>
                                            </button>
                                        )}

                                        {/* Bouton Arrêter si active */}
                                        {isWorking && (
                                            <button
                                                type="button"
                                                onClick={() => handleStopSession(session.name)}
                                                disabled={actionRunning === session.name + '_stop'}
                                                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-800 font-bold text-xs rounded-xl transition-all cursor-pointer disabled:opacity-50"
                                            >
                                                <Square className="w-3.5 h-3.5" />
                                                <span>Arrêter</span>
                                            </button>
                                        )}

                                        {/* Bouton Redémarrer */}
                                        <button
                                            type="button"
                                            onClick={() => handleRestartSession(session.name)}
                                            disabled={actionRunning === session.name + '_restart'}
                                            className="p-2 bg-gray-50 hover:bg-gray-100 rounded-xl text-slate-600 transition-colors cursor-pointer disabled:opacity-50"
                                            title="Redémarrer la session"
                                        >
                                            <RotateCcw className={`w-3.5 h-3.5 ${actionRunning === session.name + '_restart' ? 'animate-spin text-emerald-600' : ''}`} />
                                        </button>

                                        {/* Bouton Voir QR Code */}
                                        <button
                                            type="button"
                                            onClick={() => handleOpenQrModal(session.name)}
                                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl transition-all cursor-pointer"
                                            title="Afficher le Code QR d'appairage"
                                        >
                                            <QrCode className="w-3.5 h-3.5" />
                                            <span>QR Code</span>
                                        </button>
                                    </div>

                                    {/* Bouton Supprimer (pas pour default) */}
                                    {session.name !== 'default' && (
                                        <button
                                            type="button"
                                            onClick={() => handleDeleteSession(session.name)}
                                            disabled={actionRunning === session.name + '_delete'}
                                            className="p-2 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-xl transition-colors cursor-pointer"
                                            title="Supprimer la session"
                                        >
                                            <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                    )}
                                </div>
                            </div>
                        )
                    })}
                </div>
            </div>

            {/* Modal Création de Session */}
            {isCreateModalOpen && (
                <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
                    <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-2xl border border-gray-100 space-y-6 relative">
                        <button
                            type="button"
                            onClick={() => setIsCreateModalOpen(false)}
                            className="absolute top-5 right-5 p-2 bg-gray-100 hover:bg-gray-200 rounded-full text-slate-600 transition-colors cursor-pointer"
                        >
                            <X className="w-4 h-4" />
                        </button>

                        <div>
                            <span className="text-[10px] font-black uppercase tracking-wider text-emerald-600">
                                WAHA Sessions Controller
                            </span>
                            <h3 className="text-xl font-black text-slate-900 mt-0.5">
                                Créer une Nouvelle Session
                            </h3>
                            <p className="text-xs text-gray-500 font-medium mt-1">
                                Ajoutez un compte WhatsApp distinct pour la boutique (ex: support, commandes, marketing).
                            </p>
                        </div>

                        <form onSubmit={handleCreateSession} className="space-y-4">
                            <div>
                                <label className="block text-xs font-black uppercase tracking-wider text-slate-700 mb-1.5">
                                    Nom de la session (identifiant unique)
                                </label>
                                <input
                                    type="text"
                                    value={newSessionName}
                                    onChange={(e) => setNewSessionName(e.target.value)}
                                    placeholder="ex: support_maroc, ventes_livres"
                                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl text-sm font-bold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
                                    required
                                />
                                <p className="text-[10px] text-gray-400 mt-1">
                                    Lettres minuscules, chiffres et underscores uniquement.
                                </p>
                            </div>

                            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-2xl border border-gray-100">
                                <input
                                    type="checkbox"
                                    id="autoStartCheckbox"
                                    checked={autoStart}
                                    onChange={(e) => setAutoStart(e.target.checked)}
                                    className="w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500 cursor-pointer"
                                />
                                <label htmlFor="autoStartCheckbox" className="text-xs font-bold text-slate-800 cursor-pointer">
                                    Démarrer la session immédiatement après la création
                                </label>
                            </div>

                            <div className="flex items-center justify-end gap-2 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setIsCreateModalOpen(false)}
                                    className="px-4 py-2.5 text-xs font-bold text-gray-500 hover:text-slate-800 transition-colors"
                                >
                                    Annuler
                                </button>
                                <button
                                    type="submit"
                                    disabled={isCreating}
                                    className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs rounded-2xl shadow transition-all cursor-pointer disabled:opacity-50"
                                >
                                    {isCreating && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                                    <span>{isCreating ? 'Création...' : 'Créer la session'}</span>
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal Affichage / Scan QR Code */}
            {qrModalSession && (
                <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
                    <div className="bg-white rounded-3xl max-w-sm w-full p-6 sm:p-8 shadow-2xl border border-gray-100 space-y-6 relative text-center">
                        <button
                            type="button"
                            onClick={() => setQrModalSession(null)}
                            className="absolute top-5 right-5 p-2 bg-gray-100 hover:bg-gray-200 rounded-full text-slate-600 transition-colors cursor-pointer"
                        >
                            <X className="w-4 h-4" />
                        </button>

                        <div>
                            <span className="text-[10px] font-black uppercase tracking-wider text-emerald-600">
                                Appairage WhatsApp
                            </span>
                            <h3 className="text-xl font-black text-slate-900 mt-0.5 font-mono">
                                Session : {qrModalSession}
                            </h3>
                            <p className="text-xs text-gray-500 font-medium mt-1">
                                Scannez ce code QR avec l&apos;application WhatsApp de votre téléphone (Appareils connectés).
                            </p>
                        </div>

                        {/* Bloc QR Code */}
                        <div className="bg-white p-4 rounded-3xl border border-gray-200 shadow-inner flex items-center justify-center min-h-[260px]">
                            {isLoadingQr ? (
                                <div className="flex flex-col items-center gap-2 text-gray-400">
                                    <RefreshCw className="w-8 h-8 animate-spin text-emerald-600" />
                                    <span className="text-xs font-bold">Génération du QR Code...</span>
                                </div>
                            ) : qrCodeData ? (
                                <Image
                                    src={qrCodeData}
                                    alt="WhatsApp QR Code"
                                    width={240}
                                    height={240}
                                    unoptimized
                                    className="rounded-2xl"
                                />
                            ) : (
                                <div className="text-xs text-amber-700 font-bold bg-amber-50 p-4 rounded-2xl border border-amber-200">
                                    La session est déjà connectée ou en attente d&apos;initialisation.
                                </div>
                            )}
                        </div>

                        <div className="text-[11px] text-gray-400 font-medium flex items-center justify-center gap-1.5">
                            <RefreshCw className="w-3 h-3 animate-spin text-emerald-600" />
                            <span>Actualisation automatique toutes les 3s...</span>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
