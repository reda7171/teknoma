'use client'

import React, { useState, useEffect, useCallback } from 'react'
import Image from 'next/image'
import {
    QrCode,
    Smartphone,
    Camera,
    KeyRound,
    RefreshCw,
    Copy,
    Check,
    RotateCcw,
    CheckCircle2,
    AlertTriangle,
    XCircle,
    Square,
    Play,
    Shield,
    Terminal,
    Info,
    ExternalLink
} from 'lucide-react'
import {
    getWahaSessions,
    getWahaSessionQrCode,
    getWahaSessionQrFormatted,
    requestWahaPairingCode,
    getWahaSessionScreenshot,
    getWahaPasskeyChallenge,
    confirmWahaPasskey,
    startWahaSession,
    restartWahaSessionByName,
    type WahaSessionItem
} from '@/lib/actions/whatsapp-gateway'

interface Props {
    sessions: WahaSessionItem[]
    onShowFeedback: (message: string, type: 'success' | 'error') => void
    onRefreshSessions?: () => void
}

type PairingMode = 'qr' | 'code' | 'screenshot' | 'passkey'

export function WhatsAppPairingView({ sessions, onShowFeedback, onRefreshSessions }: Props) {
    const [selectedSessionName, setSelectedSessionName] = useState<string>(
        sessions.length > 0 ? sessions[0].name : 'default'
    )
    const [mode, setMode] = useState<PairingMode>('qr')

    // QR State
    const [qrImage, setQrImage] = useState<string | null>(null)
    const [qrRaw, setQrRaw] = useState<string | null>(null)
    const [qrFormat, setQrFormat] = useState<'image' | 'raw'>('image')
    const [isLoadingQr, setIsLoadingQr] = useState(false)
    const [autoRefreshQr, setAutoRefreshQr] = useState(true)

    // Code State
    const [phoneNumber, setPhoneNumber] = useState('')
    const [pairingCode, setPairingCode] = useState<string | null>(null)
    const [isRequestingCode, setIsRequestingCode] = useState(false)
    const [isCopied, setIsCopied] = useState(false)

    // Screenshot State
    const [screenshotUrl, setScreenshotUrl] = useState<string | null>(null)
    const [isLoadingScreenshot, setIsLoadingScreenshot] = useState(false)
    const [screenshotError, setScreenshotError] = useState<string | null>(null)

    // Passkey State
    const [passkeyChallenge, setPasskeyChallenge] = useState<any | null>(null)
    const [passkeyConfirmCode, setPasskeyConfirmCode] = useState('')
    const [isLoadingPasskey, setIsLoadingPasskey] = useState(false)

    // Session Actions State
    const [isActionRunning, setIsActionRunning] = useState(false)

    const activeSession = sessions.find((s) => s.name === selectedSessionName) || sessions[0] || null
    const isWorking = activeSession?.status === 'WORKING'
    const isStopped = activeSession?.status === 'STOPPED'
    const isFailed = activeSession?.status === 'FAILED'

    // Charger le QR code
    const fetchQrCode = useCallback(async (sessionName: string, format: 'image' | 'raw') => {
        setIsLoadingQr(true)
        try {
            const res = await getWahaSessionQrFormatted(sessionName, format)
            if (res.success && res.data) {
                if (format === 'image') {
                    setQrImage(res.data)
                } else {
                    setQrRaw(res.data)
                }
            } else {
                // Fallback extractWahaQr
                const fallback = await getWahaSessionQrCode(sessionName)
                if (fallback.success && fallback.qr) {
                    setQrImage(fallback.qr)
                } else if (!isWorking) {
                    setQrImage(null)
                    setQrRaw(null)
                }
            }
        } catch {
            // Ignorer
        } finally {
            setIsLoadingQr(false)
        }
    }, [isWorking])

    // Effet de chargement initial ou changement de session / format
    useEffect(() => {
        if (mode === 'qr' && !isWorking) {
            fetchQrCode(selectedSessionName, qrFormat)
        }
    }, [selectedSessionName, mode, qrFormat, isWorking, fetchQrCode])

    // Rafraîchissement automatique du QR si session non connectée
    useEffect(() => {
        if (!autoRefreshQr || mode !== 'qr' || isWorking) return
        const timer = setInterval(() => {
            fetchQrCode(selectedSessionName, qrFormat)
        }, 6000)
        return () => clearInterval(timer)
    }, [autoRefreshQr, mode, selectedSessionName, qrFormat, isWorking, fetchQrCode])

    // Demander le code d'appairage par téléphone (8 chiffres)
    const handleRequestPairingCode = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!phoneNumber.trim()) {
            onShowFeedback('Veuillez renseigner un numéro de téléphone valide', 'error')
            return
        }

        setIsRequestingCode(true)
        setPairingCode(null)
        try {
            const res = await requestWahaPairingCode(selectedSessionName, phoneNumber)
            if (res.success && res.code) {
                setPairingCode(res.code)
                onShowFeedback('Code d\'appairage généré avec succès !', 'success')
            } else {
                onShowFeedback(res.error || 'Erreur génération du code d\'appairage', 'error')
            }
        } catch {
            onShowFeedback('Erreur réseau lors de la demande du code', 'error')
        } finally {
            setIsRequestingCode(false)
        }
    }

    // Capture d'écran WAHA en direct
    const handleCaptureScreenshot = async () => {
        setIsLoadingScreenshot(true)
        setScreenshotError(null)
        try {
            const res = await getWahaSessionScreenshot(selectedSessionName)
            if (res.success && res.screenshot) {
                setScreenshotUrl(res.screenshot)
                onShowFeedback('Capture d\'écran récupérée avec succès !', 'success')
            } else {
                setScreenshotError(res.error || 'Impossible de capturer l\'écran')
                onShowFeedback(res.error || 'Erreur capture d\'écran', 'error')
            }
        } catch {
            onShowFeedback('Erreur lors de la capture d\'écran', 'error')
        } finally {
            setIsLoadingScreenshot(false)
        }
    }

    // Récupérer le Challenge Passkey
    const handleGetPasskeyChallenge = async () => {
        setIsLoadingPasskey(true)
        try {
            const res = await getWahaPasskeyChallenge(selectedSessionName)
            if (res.success) {
                setPasskeyChallenge(res.challenge)
                onShowFeedback('Passkey challenge récupéré !', 'success')
            } else {
                onShowFeedback(res.error || 'Erreur récupération passkey challenge', 'error')
            }
        } catch {
            onShowFeedback('Erreur de communication passkey', 'error')
        } finally {
            setIsLoadingPasskey(false)
        }
    }

    // Confirmer le Passkey
    const handleConfirmPasskey = async (e: React.FormEvent) => {
        e.preventDefault()
        setIsLoadingPasskey(true)
        try {
            const res = await confirmWahaPasskey(selectedSessionName, passkeyConfirmCode || undefined)
            if (res.success) {
                onShowFeedback('Passkey confirmé avec succès !', 'success')
                setPasskeyConfirmCode('')
            } else {
                onShowFeedback(res.error || 'Erreur confirmation passkey', 'error')
            }
        } catch {
            onShowFeedback('Erreur confirmation passkey', 'error')
        } finally {
            setIsLoadingPasskey(false)
        }
    }

    // Démarrer la session
    const handleStartSession = async () => {
        setIsActionRunning(true)
        try {
            const res = await startWahaSession(selectedSessionName)
            if (res.success) {
                onShowFeedback(`Session "${selectedSessionName}" démarrée !`, 'success')
                if (onRefreshSessions) onRefreshSessions()
            } else {
                onShowFeedback(res.error || 'Erreur démarrage', 'error')
            }
        } finally {
            setIsActionRunning(false)
        }
    }

    // Redémarrer la session
    const handleRestartSession = async () => {
        setIsActionRunning(true)
        try {
            const res = await restartWahaSessionByName(selectedSessionName)
            if (res.success) {
                onShowFeedback(`Session "${selectedSessionName}" relancée !`, 'success')
                if (onRefreshSessions) onRefreshSessions()
                fetchQrCode(selectedSessionName, qrFormat)
            } else {
                onShowFeedback(res.error || 'Erreur redémarrage', 'error')
            }
        } finally {
            setIsActionRunning(false)
        }
    }

    // Copier le code dans le presse-papier
    const handleCopyCode = (text: string) => {
        navigator.clipboard.writeText(text)
        setIsCopied(true)
        onShowFeedback('Code copié dans le presse-papier', 'success')
        setTimeout(() => setIsCopied(false), 2000)
    }

    return (
        <div className="space-y-6">
            {/* Barre de Sélection de la Session & Statut */}
            <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-black">
                        <Smartphone className="w-6 h-6" />
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <h3 className="text-base font-black text-slate-900">
                                Appairage WhatsApp (Pairing)
                            </h3>
                            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                                isWorking
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : isStopped
                                    ? 'bg-gray-100 text-gray-700'
                                    : isFailed
                                    ? 'bg-rose-100 text-rose-800'
                                    : 'bg-amber-100 text-amber-800 animate-pulse'
                            }`}>
                                {isWorking ? 'Connecté' : isStopped ? 'Arrêté' : isFailed ? 'Échec' : 'En Attente Scan/Code'}
                            </span>
                        </div>
                        <p className="text-xs text-gray-500 font-medium mt-0.5">
                            Connectez votre téléphone via QR Code, Code à 8 chiffres ou Passkey WebAuthn.
                        </p>
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                    {/* Sélecteur de session */}
                    <div className="flex items-center gap-2">
                        <label className="text-xs font-black uppercase tracking-wider text-gray-500">
                            Session :
                        </label>
                        <select
                            value={selectedSessionName}
                            onChange={(e) => setSelectedSessionName(e.target.value)}
                            className="bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        >
                            {sessions.map((sess) => (
                                <option key={sess.name} value={sess.name}>
                                    {sess.name} ({sess.status})
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Actions rapides de session */}
                    {isStopped && (
                        <button
                            type="button"
                            onClick={handleStartSession}
                            disabled={isActionRunning}
                            className="inline-flex items-center gap-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all cursor-pointer disabled:opacity-50"
                        >
                            <Play className="w-3.5 h-3.5" />
                            <span>Démarrer</span>
                        </button>
                    )}

                    <button
                        type="button"
                        onClick={handleRestartSession}
                        disabled={isActionRunning}
                        className="inline-flex items-center gap-1.5 px-3 py-2 bg-gray-100 hover:bg-gray-200 text-slate-700 rounded-xl text-xs font-bold transition-all cursor-pointer disabled:opacity-50"
                        title="Redémarrer la session"
                    >
                        <RotateCcw className={`w-3.5 h-3.5 ${isActionRunning ? 'animate-spin' : ''}`} />
                        <span>Relancer</span>
                    </button>
                </div>
            </div>

            {/* Navigation des Sous-Modes d'Appairage */}
            <div className="flex flex-wrap items-center gap-2 p-1.5 bg-gray-100/90 rounded-2xl border border-gray-200/80 w-fit">
                <button
                    type="button"
                    onClick={() => setMode('qr')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl font-black text-xs transition-all cursor-pointer ${
                        mode === 'qr'
                            ? 'bg-white text-slate-900 shadow-sm'
                            : 'text-gray-500 hover:text-slate-900'
                    }`}
                >
                    <QrCode className="w-4 h-4 text-emerald-600" />
                    <span>1. Code QR (Scanner)</span>
                </button>

                <button
                    type="button"
                    onClick={() => setMode('code')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl font-black text-xs transition-all cursor-pointer ${
                        mode === 'code'
                            ? 'bg-white text-slate-900 shadow-sm'
                            : 'text-gray-500 hover:text-slate-900'
                    }`}
                >
                    <Smartphone className="w-4 h-4 text-emerald-600" />
                    <span>2. Code Téléphone (8 Chiffres)</span>
                </button>

                <button
                    type="button"
                    onClick={() => setMode('screenshot')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl font-black text-xs transition-all cursor-pointer ${
                        mode === 'screenshot'
                            ? 'bg-white text-slate-900 shadow-sm'
                            : 'text-gray-500 hover:text-slate-900'
                    }`}
                >
                    <Camera className="w-4 h-4 text-emerald-600" />
                    <span>3. Capture d&apos;écran (Debug)</span>
                </button>

                <button
                    type="button"
                    onClick={() => setMode('passkey')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl font-black text-xs transition-all cursor-pointer ${
                        mode === 'passkey'
                            ? 'bg-white text-slate-900 shadow-sm'
                            : 'text-gray-500 hover:text-slate-900'
                    }`}
                >
                    <KeyRound className="w-4 h-4 text-emerald-600" />
                    <span>4. Passkey / WebAuthn</span>
                </button>
            </div>

            {/* CONTENU MODE 1 : CODE QR */}
            {mode === 'qr' && (
                <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6 sm:p-8 space-y-6">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-gray-100">
                        <div>
                            <h4 className="text-base font-black text-slate-900 flex items-center gap-2">
                                <QrCode className="w-5 h-5 text-emerald-600" />
                                Appairage par Code QR WhatsApp
                            </h4>
                            <p className="text-xs text-gray-500 font-medium mt-0.5">
                                Scannez ce code depuis WhatsApp sur votre smartphone (Menu &gt; Appareils connectés &gt; Connecter un appareil).
                            </p>
                        </div>

                        <div className="flex items-center gap-2">
                            {/* Format Image vs Raw */}
                            <div className="flex items-center bg-gray-100 p-1 rounded-xl text-xs font-bold text-gray-600">
                                <button
                                    type="button"
                                    onClick={() => setQrFormat('image')}
                                    className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                                        qrFormat === 'image' ? 'bg-white text-slate-900 shadow-sm' : ''
                                    }`}
                                >
                                    Image PNG
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setQrFormat('raw')}
                                    className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                                        qrFormat === 'raw' ? 'bg-white text-slate-900 shadow-sm' : ''
                                    }`}
                                >
                                    Texte Brut (Raw)
                                </button>
                            </div>

                            <button
                                type="button"
                                onClick={() => fetchQrCode(selectedSessionName, qrFormat)}
                                disabled={isLoadingQr}
                                className="inline-flex items-center gap-1.5 px-3 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 rounded-xl text-xs font-black transition-all cursor-pointer"
                            >
                                <RefreshCw className={`w-3.5 h-3.5 ${isLoadingQr ? 'animate-spin' : ''}`} />
                                <span>Actualiser</span>
                            </button>
                        </div>
                    </div>

                    {isWorking ? (
                        <div className="bg-emerald-50/80 border border-emerald-200 rounded-3xl p-8 text-center max-w-md mx-auto">
                            <div className="w-16 h-16 bg-emerald-600 text-white rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg shadow-emerald-600/20">
                                <CheckCircle2 className="w-9 h-9" />
                            </div>
                            <h4 className="text-lg font-black text-slate-900 mb-1">
                                Session &quot;{selectedSessionName}&quot; Déjà Connectée
                            </h4>
                            <p className="text-xs text-slate-600 font-medium leading-relaxed mb-4">
                                Cette session est active et reliée au compte WhatsApp{' '}
                                <strong className="text-slate-900 font-mono">
                                    {activeSession?.me?.id ? `+${activeSession.me.id.split('@')[0]}` : 'Opérationnel'}
                                </strong>.
                            </p>
                            <button
                                type="button"
                                onClick={handleRestartSession}
                                className="inline-flex items-center gap-2 px-4 py-2 bg-slate-900 hover:bg-black text-white rounded-xl text-xs font-bold transition-all cursor-pointer"
                            >
                                <RotateCcw className="w-3.5 h-3.5" />
                                <span>Relancer la session pour réappairer</span>
                            </button>
                        </div>
                    ) : (
                        <div className="flex flex-col md:flex-row items-center justify-center gap-8 max-w-2xl mx-auto pt-4">
                            {/* Affichage Image ou Raw */}
                            <div className="p-4 bg-white border-2 border-slate-900 rounded-3xl shadow-xl shrink-0 flex items-center justify-center min-w-[280px] min-h-[280px]">
                                {isLoadingQr ? (
                                    <div className="text-center p-8">
                                        <RefreshCw className="w-10 h-10 text-emerald-600 animate-spin mx-auto mb-3" />
                                        <p className="text-xs font-bold text-gray-500">Génération du QR WAHA...</p>
                                    </div>
                                ) : qrFormat === 'image' && qrImage ? (
                                    <Image
                                        src={qrImage}
                                        alt="WhatsApp QR Code"
                                        width={260}
                                        height={260}
                                        unoptimized
                                        className="rounded-2xl"
                                    />
                                ) : qrFormat === 'raw' && qrRaw ? (
                                    <div className="max-w-[260px] p-3 bg-gray-50 rounded-xl text-[10px] font-mono break-all text-slate-700">
                                        <p className="font-bold text-gray-400 mb-1 uppercase">Chaîne QR Raw :</p>
                                        <div className="max-h-40 overflow-y-auto">{qrRaw}</div>
                                        <button
                                            type="button"
                                            onClick={() => handleCopyCode(qrRaw)}
                                            className="mt-2 inline-flex items-center gap-1 px-2.5 py-1 bg-white border border-gray-200 rounded-lg font-bold text-slate-700"
                                        >
                                            <Copy className="w-3 h-3" />
                                            <span>Copier la chaîne</span>
                                        </button>
                                    </div>
                                ) : (
                                    <div className="text-center p-6 max-w-xs">
                                        <AlertTriangle className="w-8 h-8 text-amber-500 mx-auto mb-2" />
                                        <p className="text-xs font-bold text-slate-800 mb-1">
                                            QR non disponible actuellement
                                        </p>
                                        <p className="text-[11px] text-gray-500 mb-4">
                                            La session peut être arrêtée ou en cours d&apos;initialisation.
                                        </p>
                                        <button
                                            type="button"
                                            onClick={handleRestartSession}
                                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 text-white rounded-xl text-xs font-bold cursor-pointer"
                                        >
                                            <RotateCcw className="w-3 h-3" />
                                            <span>Relancer la session</span>
                                        </button>
                                    </div>
                                )}
                            </div>

                            {/* Instructions */}
                            <div className="space-y-4 text-left">
                                <h5 className="text-sm font-black text-slate-900 flex items-center gap-2">
                                    <Smartphone className="w-4 h-4 text-emerald-600" />
                                    Procédure de connexion :
                                </h5>
                                <ol className="space-y-3 text-xs font-semibold text-slate-700">
                                    <li className="flex items-start gap-2.5">
                                        <span className="w-5 h-5 rounded-full bg-emerald-600 text-white text-[11px] font-black flex items-center justify-center shrink-0">1</span>
                                        <span>Ouvrez <strong>WhatsApp</strong> sur votre smartphone.</span>
                                    </li>
                                    <li className="flex items-start gap-2.5">
                                        <span className="w-5 h-5 rounded-full bg-emerald-600 text-white text-[11px] font-black flex items-center justify-center shrink-0">2</span>
                                        <span>Accédez à <strong>Réglages / Menu (⋮)</strong> &gt; <strong>Appareils connectés</strong>.</span>
                                    </li>
                                    <li className="flex items-start gap-2.5">
                                        <span className="w-5 h-5 rounded-full bg-emerald-600 text-white text-[11px] font-black flex items-center justify-center shrink-0">3</span>
                                        <span>Appuyez sur <strong>Connecter un appareil</strong> et cadrez ce QR code.</span>
                                    </li>
                                </ol>
                                <div className="pt-2 flex items-center gap-2">
                                    <input
                                        type="checkbox"
                                        id="autoRefresh"
                                        checked={autoRefreshQr}
                                        onChange={(e) => setAutoRefreshQr(e.target.checked)}
                                        className="rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                                    />
                                    <label htmlFor="autoRefresh" className="text-xs text-gray-500 cursor-pointer">
                                        Rafraîchissement automatique toutes les 6 secondes
                                    </label>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* CONTENU MODE 2 : CODE D'APPAIRAGE PAR TÉLÉPHONE (8 CHIFFRES) */}
            {mode === 'code' && (
                <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6 sm:p-8 space-y-6">
                    <div className="pb-4 border-b border-gray-100">
                        <h4 className="text-base font-black text-slate-900 flex items-center gap-2">
                            <Smartphone className="w-5 h-5 text-emerald-600" />
                            Appairage par Code Téléphone (Sans Scanner de QR)
                        </h4>
                        <p className="text-xs text-gray-500 font-medium mt-0.5">
                            Permet d&apos;associer votre compte WhatsApp sans scanner d&apos;écran en demandant un code officiel de liaison à 8 chiffres (WAHA Auth request-code).
                        </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
                        {/* Formulaire de demande de code */}
                        <form onSubmit={handleRequestPairingCode} className="space-y-4">
                            <div>
                                <label className="block text-xs font-black uppercase tracking-wider text-slate-700 mb-1.5">
                                    Numéro de Téléphone WhatsApp
                                </label>
                                <div className="relative">
                                    <input
                                        type="text"
                                        value={phoneNumber}
                                        onChange={(e) => setPhoneNumber(e.target.value)}
                                        placeholder="Ex: 0666038129 ou 212666038129"
                                        className="w-full pl-4 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl text-sm font-bold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                    />
                                </div>
                                <p className="text-[11px] text-gray-400 mt-1.5">
                                    Format international ou marocain local accepté (06... / 07... / 212...).
                                </p>
                            </div>

                            <button
                                type="submit"
                                disabled={isRequestingCode}
                                className="w-full inline-flex items-center justify-center gap-2 px-5 py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl text-xs font-black tracking-wider uppercase shadow-md shadow-emerald-600/20 transition-all cursor-pointer disabled:opacity-50"
                            >
                                <Smartphone className={`w-4 h-4 ${isRequestingCode ? 'animate-spin' : ''}`} />
                                <span>{isRequestingCode ? 'Génération du code...' : 'Demander le Code d\'Appairage (8 Chiffres)'}</span>
                            </button>
                        </form>

                        {/* Résultat du Code & Instructions */}
                        <div className="bg-slate-50 border border-slate-200 rounded-3xl p-6 space-y-4">
                            <h5 className="text-xs font-black uppercase tracking-wider text-slate-600">
                                Code d&apos;authentification généré :
                            </h5>

                            {pairingCode ? (
                                <div className="space-y-3">
                                    <div className="bg-white border-2 border-slate-900 rounded-2xl p-4 text-center">
                                        <div className="text-2xl sm:text-3xl font-black font-mono tracking-widest text-emerald-600 select-all">
                                            {pairingCode}
                                        </div>
                                    </div>

                                    <button
                                        type="button"
                                        onClick={() => handleCopyCode(pairingCode)}
                                        className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 bg-slate-900 hover:bg-black text-white rounded-xl text-xs font-bold transition-all cursor-pointer"
                                    >
                                        {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                                        <span>{isCopied ? 'Code copié !' : 'Copier le code'}</span>
                                    </button>
                                </div>
                            ) : (
                                <div className="border border-dashed border-gray-300 rounded-2xl p-6 text-center text-xs text-gray-400">
                                    Saisissez votre numéro ci-contre pour générer le code d&apos;appairage.
                                </div>
                            )}

                            <div className="pt-2 border-t border-gray-200 space-y-2 text-xs text-slate-600">
                                <p className="font-bold text-slate-800">
                                    Comment entrer ce code sur votre téléphone :
                                </p>
                                <ol className="list-decimal pl-4 space-y-1 text-[11px] text-gray-600">
                                    <li>Ouvrez WhatsApp &gt; <strong>Appareils connectés</strong> &gt; <strong>Connecter un appareil</strong>.</li>
                                    <li>Cliquez sur <strong>&quot;Associer avec un numéro de téléphone&quot;</strong> en bas de l&apos;écran.</li>
                                    <li>Saisissez ce code à 8 chiffres pour valider la liaison sans scanner de QR.</li>
                                </ol>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* CONTENU MODE 3 : CAPTURE D'ÉCRAN LIVE */}
            {mode === 'screenshot' && (
                <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6 sm:p-8 space-y-6">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-gray-100">
                        <div>
                            <h4 className="text-base font-black text-slate-900 flex items-center gap-2">
                                <Camera className="w-5 h-5 text-emerald-600" />
                                Capture d&apos;Écran en Direct de la Session (WAHA Screenshot)
                            </h4>
                            <p className="text-xs text-gray-500 font-medium mt-0.5">
                                Capture l&apos;état visuel de l&apos;instance WhatsApp Web (supporté sur les moteurs Chromium WEBJS / WPP).
                            </p>
                        </div>

                        <button
                            type="button"
                            onClick={handleCaptureScreenshot}
                            disabled={isLoadingScreenshot}
                            className="inline-flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black shadow-sm transition-all cursor-pointer disabled:opacity-50"
                        >
                            <Camera className={`w-3.5 h-3.5 ${isLoadingScreenshot ? 'animate-spin' : ''}`} />
                            <span>{isLoadingScreenshot ? 'Capture en cours...' : 'Prendre une capture'}</span>
                        </button>
                    </div>

                    {screenshotError ? (
                        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6 text-xs text-amber-900 space-y-2">
                            <div className="flex items-center gap-2 font-black text-amber-800">
                                <Info className="w-4 h-4 text-amber-600" />
                                Note sur le moteur WhatsApp WAHA :
                            </div>
                            <p className="leading-relaxed">
                                {screenshotError}
                            </p>
                        </div>
                    ) : screenshotUrl ? (
                        <div className="border-2 border-slate-900 rounded-3xl overflow-hidden shadow-xl max-w-2xl mx-auto bg-black">
                            <Image
                                src={screenshotUrl}
                                alt="Capture d'écran WhatsApp Web"
                                width={800}
                                height={600}
                                unoptimized
                                className="w-full h-auto object-contain"
                            />
                        </div>
                    ) : (
                        <div className="bg-gray-50 border border-dashed border-gray-200 rounded-3xl p-12 text-center text-xs text-gray-500">
                            <Camera className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                            <p className="font-bold text-slate-700 mb-1">Aucune capture d&apos;écran chargée</p>
                            <p className="text-gray-400 mb-4">
                                Cliquez sur &quot;Prendre une capture&quot; pour inspecter le rendu WhatsApp Web de la session &quot;{selectedSessionName}&quot;.
                            </p>
                            <button
                                type="button"
                                onClick={handleCaptureScreenshot}
                                disabled={isLoadingScreenshot}
                                className="inline-flex items-center gap-2 px-4 py-2 bg-slate-900 hover:bg-black text-white rounded-xl text-xs font-bold transition-all cursor-pointer"
                            >
                                <Camera className="w-3.5 h-3.5" />
                                <span>Capturer l&apos;écran maintenant</span>
                            </button>
                        </div>
                    )}
                </div>
            )}

            {/* CONTENU MODE 4 : PASSKEY / WEBAUTHN */}
            {mode === 'passkey' && (
                <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6 sm:p-8 space-y-6">
                    <div className="pb-4 border-b border-gray-100">
                        <h4 className="text-base font-black text-slate-900 flex items-center gap-2">
                            <KeyRound className="w-5 h-5 text-emerald-600" />
                            Appairage Avancé Passkey (WebAuthn)
                        </h4>
                        <p className="text-xs text-gray-500 font-medium mt-0.5">
                            Gestion des défis d&apos;authentification WebAuthn pour les sessions WhatsApp nécessitant une confirmation par clé de sécurité ou code passkey.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
                        {/* Défi Passkey */}
                        <div className="bg-slate-50 border border-slate-200 rounded-3xl p-6 space-y-4">
                            <div className="flex items-center justify-between">
                                <h5 className="text-xs font-black uppercase tracking-wider text-slate-700">
                                    Défi WebAuthn (Challenge) :
                                </h5>
                                <button
                                    type="button"
                                    onClick={handleGetPasskeyChallenge}
                                    disabled={isLoadingPasskey}
                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-200 hover:bg-gray-100 rounded-xl text-xs font-bold text-slate-700 transition-all cursor-pointer"
                                >
                                    <RefreshCw className={`w-3 h-3 ${isLoadingPasskey ? 'animate-spin' : ''}`} />
                                    <span>Vérifier le défi</span>
                                </button>
                            </div>

                            {passkeyChallenge ? (
                                <pre className="bg-slate-900 text-emerald-400 p-4 rounded-2xl text-[11px] font-mono overflow-x-auto max-h-48">
                                    {JSON.stringify(passkeyChallenge, null, 2)}
                                </pre>
                            ) : (
                                <p className="text-xs text-gray-400 italic">
                                    Aucun défi passkey en attente sur la session &quot;{selectedSessionName}&quot;.
                                </p>
                            )}
                        </div>

                        {/* Confirmation manuelle du Passkey */}
                        <form onSubmit={handleConfirmPasskey} className="bg-slate-50 border border-slate-200 rounded-3xl p-6 space-y-4">
                            <h5 className="text-xs font-black uppercase tracking-wider text-slate-700">
                                Confirmer l&apos;Appairage Passkey :
                            </h5>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 mb-1">
                                    Code de confirmation passkey (optionnel) :
                                </label>
                                <input
                                    type="text"
                                    value={passkeyConfirmCode}
                                    onChange={(e) => setPasskeyConfirmCode(e.target.value)}
                                    placeholder="Ex: 1234"
                                    className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                />
                            </div>
                            <button
                                type="submit"
                                disabled={isLoadingPasskey}
                                className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black transition-all cursor-pointer disabled:opacity-50"
                            >
                                <Check className="w-3.5 h-3.5" />
                                <span>Confirmer l&apos;Appairage Passkey</span>
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    )
}
