'use client'

import React, { useState, useEffect } from 'react'
import Image from 'next/image'
import {
    QrCode,
    CheckCircle2,
    XCircle,
    RefreshCw,
    Send,
    LogOut,
    Check,
    Smartphone,
    Terminal,
    Info,
    MessageSquareText,
    Save,
    RotateCcw,
    Sparkles,
    History,
    Monitor,
    Radio,
    Megaphone,
    MessageCircle,
    ContactRound,
    Braces
} from 'lucide-react'
import {
    getWhatsAppGatewayStatus,
    sendWhatsAppMessageViaGateway,
    restartWhatsAppSession,
    disconnectWhatsAppGateway,
    updateWhatsAppGatewaySetting,
    updateWhatsAppTemplate,
    type WhatsAppGatewayStatusResponse,
    type WhatsAppLogsResponse,
    type WahaSessionItem
} from '@/lib/actions/whatsapp-gateway'
import { DEFAULT_WHATSAPP_TEMPLATES } from '@/lib/constants/whatsapp-templates'
import { WhatsAppLogsView } from './WhatsAppLogsView'
import { WhatsAppSessionsView } from './WhatsAppSessionsView'
import { WhatsAppPairingView } from './WhatsAppPairingView'
import { WhatsAppStatusView } from './WhatsAppStatusView'
import { WhatsAppChannelsView } from './WhatsAppChannelsView'
import { WhatsAppChatsView } from './WhatsAppChatsView'
import { WhatsAppContactsView } from './WhatsAppContactsView'
import { WhatsAppApiExplorer } from './WhatsAppApiExplorer'

interface Props {
    initialStatus: WhatsAppGatewayStatusResponse
    initialSettings: {
        autoPromoLead: boolean
        autoOrderConfirm: boolean
        autoWelcome?: boolean
    }
    initialTemplates: {
        whatsapp_template_promo_lead: string
        whatsapp_template_order_confirm: string
        whatsapp_template_abandoned_cart: string
        whatsapp_template_welcome?: string
    }
    initialLogsData?: WhatsAppLogsResponse
    initialSessions?: WahaSessionItem[]
}

type TemplateKey = 'whatsapp_template_promo_lead' | 'whatsapp_template_order_confirm' | 'whatsapp_template_abandoned_cart' | 'whatsapp_template_welcome'

const TEMPLATE_CONFIG: Record<TemplateKey, {
    label: string
    description: string
    variables: { code: string; label: string; sample: string }[]
}> = {
    whatsapp_template_promo_lead: {
        label: 'Lead Panier (Code Promo -10%)',
        description: 'Envoyé immédiatement dès que le client saisit son numéro dans le pop-up panier.',
        variables: [
            { code: '{promoCode}', label: 'Code promo', sample: 'TEKNO10' },
            { code: '{discount}', label: 'Pourcentage', sample: '10' },
            { code: '{siteUrl}', label: 'URL Boutique', sample: 'https://tekno.ma' },
        ]
    },
    whatsapp_template_order_confirm: {
        label: 'Confirmation Commande COD',
        description: 'Envoyé au client après validation de sa commande avec le récapitulatif.',
        variables: [
            { code: '{customerName}', label: 'Nom client', sample: 'Yassine Alami' },
            { code: '{orderId}', label: 'N° Commande', sample: 'ORD-8942' },
            { code: '{total}', label: 'Total DH', sample: '180' },
            { code: '{itemsList}', label: 'Liste articles', sample: '• L\'Alchimiste (1x)\n• Père Riche Père Pauvre (1x)' },
            { code: '{city}', label: 'Ville', sample: 'Casablanca' },
            { code: '{trackingUrl}', label: 'Lien suivi', sample: 'https://tekno.ma/fr/tracking?id=RW-4921' },
        ]
    },
    whatsapp_template_abandoned_cart: {
        label: 'Relance Panier Abandonné',
        description: 'Message de rappel pour inciter à finaliser les articles laissés au panier.',
        variables: [
            { code: '{customerName}', label: 'Nom client', sample: 'Cher lecteur' },
            { code: '{itemsList}', label: 'Livres du panier', sample: '• L\'art de la guerre (1x)' },
            { code: '{promoCode}', label: 'Code promo', sample: 'TEKNO10' },
            { code: '{cartUrl}', label: 'Lien panier direct', sample: 'https://tekno.ma/fr/cart' },
        ]
    },
    whatsapp_template_welcome: {
        label: 'Accueil Client Automatique',
        description: 'Réponse automatique immédiate envoyée à tout client qui contacte votre WhatsApp.',
        variables: [
            { code: '{customerName}', label: 'Nom client', sample: 'Cher lecteur' },
            { code: '{siteUrl}', label: 'URL Boutique', sample: 'https://tekno.ma' },
        ]
    }
}

export function WhatsAppGatewayClient({ initialStatus, initialSettings, initialTemplates, initialLogsData, initialSessions }: Props) {
    const [mainTab, setMainTab] = useState<'gateway' | 'pairing' | 'sessions' | 'statuses' | 'channels' | 'chats' | 'contacts' | 'api' | 'logs'>('gateway')
    const [statusData, setStatusData] = useState<WhatsAppGatewayStatusResponse>(initialStatus)
    const [settings, setSettings] = useState({
        autoPromoLead: initialSettings.autoPromoLead,
        autoOrderConfirm: initialSettings.autoOrderConfirm,
        autoWelcome: initialSettings.autoWelcome ?? true
    })
    const [templates, setTemplates] = useState<Record<TemplateKey, string>>({
        whatsapp_template_promo_lead: initialTemplates.whatsapp_template_promo_lead,
        whatsapp_template_order_confirm: initialTemplates.whatsapp_template_order_confirm,
        whatsapp_template_abandoned_cart: initialTemplates.whatsapp_template_abandoned_cart,
        whatsapp_template_welcome: initialTemplates.whatsapp_template_welcome || DEFAULT_WHATSAPP_TEMPLATES.whatsapp_template_welcome
    })
    const [activeTemplateTab, setActiveTemplateTab] = useState<TemplateKey>('whatsapp_template_promo_lead')
    const [isSavingTemplate, setIsSavingTemplate] = useState(false)
    const [isRefreshing, setIsRefreshing] = useState(false)
    const [isRestarting, setIsRestarting] = useState(false)
    const [testPhone, setTestPhone] = useState('')
    const [testSession, setTestSession] = useState('default')
    const [testMessage, setTestMessage] = useState('Salam ! Test de connexion WhatsApp depuis tekno.ma réussi avec succès.')
    const [isSendingTest, setIsSendingTest] = useState(false)
    const [feedback, setFeedback] = useState<{ message: string; type: 'success' | 'error' } | null>(null)
    const [isDisconnecting, setIsDisconnecting] = useState(false)

    const showFeedback = (message: string, type: 'success' | 'error' = 'success') => {
        setFeedback({ message, type })
        setTimeout(() => setFeedback(null), 4000)
    }

    const refreshStatus = async () => {
        setIsRefreshing(true)
        try {
            const data = await getWhatsAppGatewayStatus()
            setStatusData(data)
        } catch {
            // Ignore
        } finally {
            setIsRefreshing(false)
        }
    }

    // Polling automatique si en attente de scan QR ou en cours de connexion
    useEffect(() => {
        if (statusData.status === 'SCAN_QR' || statusData.status === 'CONNECTING' || statusData.status === 'INITIALIZING') {
            const interval = setInterval(async () => {
                const data = await getWhatsAppGatewayStatus()
                setStatusData(data)
                if (data.status === 'CONNECTED') {
                    showFeedback('WhatsApp connecté avec succès !', 'success')
                }
            }, 3000)
            return () => clearInterval(interval)
        }
    }, [statusData.status])

    const handleRestartSession = async () => {
        setIsRestarting(true)
        showFeedback('Redémarrage de la session WhatsApp en cours...', 'success')
        const res = await restartWhatsAppSession()
        if (res.success) {
            showFeedback('Session relancée avec succès ! Recherche du code QR...', 'success')
            await refreshStatus()
        } else {
            showFeedback(res.error || 'Erreur lors du redémarrage', 'error')
        }
        setIsRestarting(false)
    }

    const handleSendTest = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!testPhone.trim()) {
            showFeedback('Veuillez saisir un numéro de téléphone de test', 'error')
            return
        }

        setIsSendingTest(true)
        const res = await sendWhatsAppMessageViaGateway(testPhone, testMessage, {
            session: testSession,
            type: 'TEST'
        })
        if (res.success) {
            showFeedback('Message de test envoyé avec succès sur WhatsApp !', 'success')
            setTestPhone('')
        } else {
            showFeedback(res.error || 'Erreur lors de l\'envoi du message', 'error')
        }
        setIsSendingTest(false)
    }

    const handleToggleSetting = async (key: 'whatsapp_auto_promo_lead' | 'whatsapp_auto_order_confirm' | 'whatsapp_auto_welcome', current: boolean) => {
        const next = !current
        if (key === 'whatsapp_auto_promo_lead') {
            setSettings(prev => ({ ...prev, autoPromoLead: next }))
        } else if (key === 'whatsapp_auto_order_confirm') {
            setSettings(prev => ({ ...prev, autoOrderConfirm: next }))
        } else if (key === 'whatsapp_auto_welcome') {
            setSettings(prev => ({ ...prev, autoWelcome: next }))
        }
        await updateWhatsAppGatewaySetting(key, next)
        showFeedback('Paramètre d\'automatisation mis à jour', 'success')
    }

    const handleSaveTemplate = async () => {
        setIsSavingTemplate(true)
        const currentContent = templates[activeTemplateTab]
        const res = await updateWhatsAppTemplate(activeTemplateTab, currentContent)
        if (res.success) {
            showFeedback('Modèle WhatsApp enregistré avec succès !', 'success')
        } else {
            showFeedback('Erreur lors de l\'enregistrement du modèle', 'error')
        }
        setIsSavingTemplate(false)
    }

    const handleResetDefaultTemplate = () => {
        const defaultText = DEFAULT_WHATSAPP_TEMPLATES[activeTemplateTab]
        setTemplates(prev => ({ ...prev, [activeTemplateTab]: defaultText }))
        showFeedback('Modèle rétabli par défaut (cliquez sur Enregistrer pour confirmer)', 'success')
    }

    const insertVariable = (variableCode: string) => {
        const currentText = templates[activeTemplateTab]
        setTemplates(prev => ({ ...prev, [activeTemplateTab]: currentText + ' ' + variableCode }))
    }

    const getSimulatedPreview = () => {
        let text = templates[activeTemplateTab] || ''
        const config = TEMPLATE_CONFIG[activeTemplateTab]
        for (const v of config.variables) {
            text = text.replaceAll(v.code, v.sample)
        }
        return text
    }

    const handleDisconnect = async () => {
        if (!confirm('Voulez-vous déconnecter cette session WhatsApp ?')) return
        setIsDisconnecting(true)
        const res = await disconnectWhatsAppGateway()
        if (res.success) {
            showFeedback('Session WhatsApp déconnectée', 'success')
            await refreshStatus()
        } else {
            showFeedback(res.error || 'Erreur lors de la déconnexion', 'error')
        }
        setIsDisconnecting(false)
    }

    const isConnected = statusData.status === 'CONNECTED'
    const isScanReady = statusData.status === 'SCAN_QR' && !!statusData.qr
    const isConnecting = statusData.status === 'CONNECTING' || statusData.status === 'INITIALIZING' || (statusData.status === 'SCAN_QR' && !statusData.qr)

    return (
        <div className="space-y-8">
            {/* Feedback Toast */}
            {feedback && (
                <div className={`fixed top-6 right-6 z-50 flex items-center gap-2 px-5 py-3 rounded-2xl shadow-xl text-sm font-bold border animate-fade-in ${
                    feedback.type === 'success'
                        ? 'bg-slate-900 text-white border-slate-700'
                        : 'bg-rose-950 text-rose-100 border-rose-800'
                }`}>
                    {feedback.type === 'success' ? (
                        <Check className="w-4 h-4 text-emerald-400" />
                    ) : (
                        <XCircle className="w-4 h-4 text-rose-400" />
                    )}
                    <span>{feedback.message}</span>
                </div>
            )}

            {/* Onglets Principaux : Passerelle & Modèles vs Appairage vs Sessions WAHA vs Journal des Envois */}
            <div className="flex flex-wrap items-center gap-2 p-1.5 bg-gray-100/90 rounded-2xl border border-gray-200/80 w-fit">
                <button type="button" onClick={() => setMainTab('contacts')} className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-black text-xs uppercase tracking-wider transition-all cursor-pointer ${mainTab === 'contacts' ? 'bg-white text-slate-900 shadow-sm' : 'text-gray-500 hover:text-slate-900'}`}>
                    <ContactRound className="w-4 h-4 text-emerald-600" /><span>Contacts</span>
                </button>
                <button type="button" onClick={() => setMainTab('api')} className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-black text-xs uppercase tracking-wider transition-all cursor-pointer ${mainTab === 'api' ? 'bg-white text-slate-900 shadow-sm' : 'text-gray-500 hover:text-slate-900'}`}>
                    <Braces className="w-4 h-4 text-emerald-600" /><span>API complète</span>
                </button>
                <button type="button" onClick={() => setMainTab('chats')} className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-black text-xs uppercase tracking-wider transition-all cursor-pointer ${mainTab === 'chats' ? 'bg-white text-slate-900 shadow-sm' : 'text-gray-500 hover:text-slate-900'}`}>
                    <MessageCircle className="w-4 h-4 text-emerald-600" /><span>Chats</span>
                </button>
                <button
                    type="button"
                    onClick={() => setMainTab('channels')}
                    className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-black text-xs uppercase tracking-wider transition-all cursor-pointer ${mainTab === 'channels' ? 'bg-white text-slate-900 shadow-sm' : 'text-gray-500 hover:text-slate-900'}`}
                >
                    <Megaphone className="w-4 h-4 text-emerald-600" />
                    <span>Chaînes</span>
                </button>
                <button
                    type="button"
                    onClick={() => setMainTab('statuses')}
                    className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-black text-xs uppercase tracking-wider transition-all cursor-pointer ${
                        mainTab === 'statuses'
                            ? 'bg-white text-slate-900 shadow-sm'
                            : 'text-gray-500 hover:text-slate-900'
                    }`}
                >
                    <Radio className="w-4 h-4 text-emerald-600" />
                    <span>Statuts</span>
                </button>
                <button
                    type="button"
                    onClick={() => setMainTab('gateway')}
                    className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-black text-xs uppercase tracking-wider transition-all cursor-pointer ${
                        mainTab === 'gateway'
                            ? 'bg-white text-slate-900 shadow-sm'
                            : 'text-gray-500 hover:text-slate-900'
                    }`}
                >
                    <Smartphone className="w-4 h-4 text-emerald-600" />
                    <span>Passerelle & Modèles</span>
                </button>
                <button
                    type="button"
                    onClick={() => setMainTab('pairing')}
                    className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-black text-xs uppercase tracking-wider transition-all cursor-pointer ${
                        mainTab === 'pairing'
                            ? 'bg-white text-slate-900 shadow-sm'
                            : 'text-gray-500 hover:text-slate-900'
                    }`}
                >
                    <QrCode className="w-4 h-4 text-emerald-600" />
                    <span>Appairage (Pairing)</span>
                </button>
                <button
                    type="button"
                    onClick={() => setMainTab('sessions')}
                    className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-black text-xs uppercase tracking-wider transition-all cursor-pointer ${
                        mainTab === 'sessions'
                            ? 'bg-white text-slate-900 shadow-sm'
                            : 'text-gray-500 hover:text-slate-900'
                    }`}
                >
                    <Monitor className="w-4 h-4 text-emerald-600" />
                    <span>Sessions WAHA</span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] bg-slate-900 text-white font-black">
                        {initialSessions?.length ?? 0}
                    </span>
                </button>
                <button
                    type="button"
                    onClick={() => setMainTab('logs')}
                    className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-black text-xs uppercase tracking-wider transition-all cursor-pointer ${
                        mainTab === 'logs'
                            ? 'bg-white text-slate-900 shadow-sm'
                            : 'text-gray-500 hover:text-slate-900'
                    }`}
                >
                    <History className="w-4 h-4 text-emerald-600" />
                    <span>Journal des Envois</span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] bg-emerald-100 text-emerald-800 font-black">
                        {initialLogsData?.stats?.total ?? 0}
                    </span>
                </button>
            </div>

            {mainTab === 'pairing' ? (
                <WhatsAppPairingView
                    sessions={initialSessions || []}
                    onShowFeedback={showFeedback}
                    onRefreshSessions={refreshStatus}
                />
            ) : mainTab === 'sessions' ? (
                <WhatsAppSessionsView
                    initialSessions={initialSessions || []}
                    onShowFeedback={showFeedback}
                />
            ) : mainTab === 'statuses' ? (
                <WhatsAppStatusView
                    sessions={initialSessions || []}
                    onShowFeedback={showFeedback}
                />
            ) : mainTab === 'channels' ? (
                <WhatsAppChannelsView
                    sessions={initialSessions || []}
                    onShowFeedback={showFeedback}
                />
            ) : mainTab === 'chats' ? (
                <WhatsAppChatsView
                    sessions={initialSessions || []}
                    onShowFeedback={showFeedback}
                />
            ) : mainTab === 'contacts' ? (
                <WhatsAppContactsView
                    sessions={initialSessions || []}
                    onShowFeedback={showFeedback}
                />
            ) : mainTab === 'api' ? (
                <WhatsAppApiExplorer sessions={initialSessions || []} />
            ) : mainTab === 'logs' ? (
                <WhatsAppLogsView
                    initialLogs={initialLogsData?.logs || []}
                    initialStats={initialLogsData?.stats || { total: 0, sent: 0, failed: 0, delivered: 0 }}
                    initialTotal={initialLogsData?.total || 0}
                    onShowFeedback={showFeedback}
                />
            ) : (
                <>
                    {/* Carte Statut & Actions */}
                    <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6 sm:p-8">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-gray-100">
                    <div className="flex items-center gap-4">
                        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center font-black ${
                            isConnected
                                ? 'bg-emerald-50 text-emerald-600'
                                : isScanReady
                                ? 'bg-amber-50 text-amber-600'
                                : isConnecting
                                ? 'bg-sky-50 text-sky-600'
                                : 'bg-gray-100 text-gray-500'
                        }`}>
                            {isConnecting ? (
                                <RefreshCw className="w-7 h-7 animate-spin text-sky-600" />
                            ) : (
                                <QrCode className="w-7 h-7" />
                            )}
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <span className="text-base font-black text-slate-900">
                                    {isConnected ? 'Session Active' : isScanReady ? 'En attente de scan' : isConnecting ? 'Initialisation en cours' : 'Passerelle Hors Ligne'}
                                </span>
                                <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-black uppercase tracking-wider ${
                                    isConnected
                                        ? 'bg-emerald-100 text-emerald-800'
                                        : isScanReady
                                        ? 'bg-amber-100 text-amber-800'
                                        : isConnecting
                                        ? 'bg-sky-100 text-sky-800'
                                        : 'bg-gray-200 text-gray-700'
                                }`}>
                                    {isConnected ? (
                                        <>
                                            <CheckCircle2 className="w-3 h-3 text-emerald-700" />
                                            Connecté
                                        </>
                                    ) : isScanReady ? (
                                        <>
                                            <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
                                            Scan QR
                                        </>
                                    ) : isConnecting ? (
                                        <>
                                            <RefreshCw className="w-3 h-3 animate-spin text-sky-600" />
                                            Démarrage
                                        </>
                                    ) : (
                                        'Hors Ligne'
                                    )}
                                </span>
                            </div>
                            <p className="text-xs text-gray-500 font-medium mt-0.5">
                                {isConnected && statusData.user
                                    ? `Connecté au numéro : ${statusData.user.phone} (${statusData.user.name})`
                                    : isScanReady
                                    ? 'Scannez le code QR ci-dessous avec l\'application WhatsApp de votre téléphone'
                                    : isConnecting
                                    ? 'Démarrage du moteur WhatsApp Web (Chromium)... Le QR code va s\'afficher automatiquement.'
                                    : (statusData.error || 'Le conteneur WhatsApp sera activé sur votre serveur VPS via docker-compose')}
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <button
                            onClick={refreshStatus}
                            disabled={isRefreshing}
                            className="inline-flex items-center gap-1.5 px-3.5 py-2.5 bg-gray-50 hover:bg-gray-100 text-slate-700 rounded-xl text-xs font-black transition-all cursor-pointer"
                        >
                            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
                            <span>Actualiser</span>
                        </button>

                        <button
                            onClick={handleRestartSession}
                            disabled={isRestarting}
                            className="inline-flex items-center gap-1.5 px-3.5 py-2.5 bg-sky-50 hover:bg-sky-100 text-sky-800 rounded-xl text-xs font-black transition-all cursor-pointer disabled:opacity-50"
                        >
                            <RotateCcw className={`w-3.5 h-3.5 ${isRestarting ? 'animate-spin' : ''}`} />
                            <span>{isRestarting ? 'Relance...' : 'Relancer la session'}</span>
                        </button>

                        {isConnected && (
                            <button
                                onClick={handleDisconnect}
                                disabled={isDisconnecting}
                                className="inline-flex items-center gap-1.5 px-3.5 py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-xl text-xs font-black transition-all cursor-pointer"
                            >
                                <LogOut className="w-3.5 h-3.5" />
                                <span>Déconnecter</span>
                            </button>
                        )}
                    </div>
                </div>

                {/* Zone QR Code ou Confirmation */}
                <div className="pt-8">
                    {isConnected ? (
                        <div className="bg-emerald-50/70 border border-emerald-200 rounded-3xl p-8 text-center max-w-lg mx-auto">
                            <div className="w-16 h-16 bg-emerald-600 text-white rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg shadow-emerald-600/20">
                                <CheckCircle2 className="w-9 h-9" />
                            </div>
                            <h4 className="text-xl font-black text-slate-900 mb-1">
                                WhatsApp Connecté & Opérationnel
                            </h4>
                            <p className="text-xs text-slate-600 font-medium max-w-xs mx-auto leading-relaxed mb-4">
                                Vos messages et relances automatiques seront envoyés directement depuis votre numéro{' '}
                                <strong className="text-slate-900">{statusData.user?.phone}</strong> sans aucun frais d&apos;API.
                            </p>
                        </div>
                    ) : isScanReady ? (
                        <div className="flex flex-col md:flex-row items-center justify-center gap-8 max-w-2xl mx-auto">
                            {/* QR Image */}
                            <div className="p-4 bg-white border-2 border-slate-900 rounded-3xl shadow-xl shrink-0">
                                <Image
                                    src={statusData.qr!}
                                    alt="WhatsApp Web QR Code"
                                    width={260}
                                    height={260}
                                    unoptimized
                                    className="rounded-2xl"
                                />
                            </div>

                            {/* Instructions étape par étape */}
                            <div className="space-y-4 text-left">
                                <h4 className="text-lg font-black text-slate-900 flex items-center gap-2">
                                    <Smartphone className="w-5 h-5 text-emerald-600" />
                                    Comment connecter votre compte :
                                </h4>
                                <ol className="space-y-3 text-xs font-semibold text-slate-700">
                                    <li className="flex items-start gap-2.5">
                                        <span className="w-5 h-5 rounded-full bg-emerald-600 text-white text-[11px] font-black flex items-center justify-center shrink-0">1</span>
                                        <span>Ouvrez <strong>WhatsApp</strong> sur votre téléphone portable.</span>
                                    </li>
                                    <li className="flex items-start gap-2.5">
                                        <span className="w-5 h-5 rounded-full bg-emerald-600 text-white text-[11px] font-black flex items-center justify-center shrink-0">2</span>
                                        <span>Allez dans <strong>Réglages / Menu (⋮)</strong> &gt; <strong>Appareils connectés</strong>.</span>
                                    </li>
                                    <li className="flex items-start gap-2.5">
                                        <span className="w-5 h-5 rounded-full bg-emerald-600 text-white text-[11px] font-black flex items-center justify-center shrink-0">3</span>
                                        <span>Appuyez sur <strong>Connecter un appareil</strong> et scannez ce QR code.</span>
                                    </li>
                                </ol>
                                <p className="text-[11px] text-gray-400 font-medium italic">
                                    Ce code se rafraîchit automatiquement en temps réel.
                                </p>
                            </div>
                        </div>
                    ) : isConnecting ? (
                        <div className="bg-sky-50/70 border border-sky-200 rounded-3xl p-8 text-center max-w-lg mx-auto">
                            <div className="w-16 h-16 bg-white border-2 border-sky-400 text-sky-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-sm">
                                <RefreshCw className="w-8 h-8 animate-spin text-sky-600" />
                            </div>
                            <h4 className="text-xl font-black text-slate-900 mb-2">
                                Initialisation de WhatsApp Web...
                            </h4>
                            <p className="text-xs text-slate-600 font-medium max-w-sm mx-auto leading-relaxed mb-6">
                                Le conteneur WAHA charge le navigateur Chromium et génère votre QR code en direct. Cela prend généralement entre 10 et 20 secondes. Cette page s&apos;actualisera automatiquement.
                            </p>
                            <div className="flex items-center justify-center gap-2">
                                <button
                                    onClick={refreshStatus}
                                    disabled={isRefreshing}
                                    className="inline-flex items-center gap-2 px-4 py-2 bg-slate-900 hover:bg-black text-white rounded-xl text-xs font-bold transition-all cursor-pointer"
                                >
                                    <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
                                    <span>Vérifier le QR maintenant</span>
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="bg-slate-50 border border-slate-200 rounded-3xl p-8 text-center max-w-xl mx-auto">
                            <div className="w-14 h-14 bg-slate-200 text-slate-600 rounded-2xl flex items-center justify-center mx-auto mb-4 font-black">
                                <Terminal className="w-7 h-7" />
                            </div>
                            <h4 className="text-lg font-black text-slate-900 mb-2">
                                Passerelle non détectée
                            </h4>
                            <p className="text-xs text-slate-600 font-medium leading-relaxed mb-6">
                                Le conteneur Docker est configuré dans votre <code className="bg-slate-200 px-1.5 py-0.5 rounded text-slate-800">docker-compose.yml</code>. Sur votre serveur VPS, vérifiez que le conteneur est lancé :
                            </p>
                            <div className="bg-slate-900 text-emerald-400 p-4 rounded-2xl font-mono text-xs text-left overflow-x-auto shadow-inner mb-6">
                                <span className="text-slate-500"># Sur votre VPS :</span><br />
                                docker compose up -d whatsapp
                            </div>
                            <div className="flex items-center justify-center gap-3">
                                <button
                                    onClick={handleRestartSession}
                                    disabled={isRestarting}
                                    className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all cursor-pointer disabled:opacity-50"
                                >
                                    <RotateCcw className={`w-3.5 h-3.5 ${isRestarting ? 'animate-spin' : ''}`} />
                                    <span>Tenter de démarrer la session</span>
                                </button>
                                <button
                                    onClick={refreshStatus}
                                    disabled={isRefreshing}
                                    className="inline-flex items-center gap-1.5 px-3 py-2 bg-gray-200 hover:bg-gray-300 text-slate-700 rounded-xl text-xs font-bold transition-all cursor-pointer"
                                >
                                    <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
                                    <span>Actualiser</span>
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Éditeur de Modèles de Messages WhatsApp Personnalisés */}
            <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6 sm:p-8 space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-gray-100">
                    <div>
                        <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
                            <MessageSquareText className="w-5 h-5 text-emerald-600" />
                            Modèles de Messages Personnalisés
                        </h3>
                        <p className="text-xs text-gray-500 font-medium mt-0.5">
                            Personnalisez le contenu de chaque relance automatique avec les variables dynamiques de la commande.
                        </p>
                    </div>

                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={handleResetDefaultTemplate}
                            className="inline-flex items-center gap-1.5 px-3 py-2 bg-gray-50 hover:bg-gray-100 text-slate-600 rounded-xl text-xs font-bold transition-all cursor-pointer"
                        >
                            <RotateCcw className="w-3.5 h-3.5" />
                            <span>Par défaut</span>
                        </button>

                        <button
                            type="button"
                            onClick={handleSaveTemplate}
                            disabled={isSavingTemplate}
                            className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black shadow-sm transition-all cursor-pointer disabled:opacity-50"
                        >
                            <Save className="w-3.5 h-3.5" />
                            <span>{isSavingTemplate ? 'Enregistrement...' : 'Enregistrer le modèle'}</span>
                        </button>
                    </div>
                </div>

                {/* Onglets des Templates */}
                <div className="flex flex-wrap gap-2">
                    {(Object.keys(TEMPLATE_CONFIG) as TemplateKey[]).map((key) => {
                        const active = activeTemplateTab === key
                        return (
                            <button
                                key={key}
                                onClick={() => setActiveTemplateTab(key)}
                                className={`px-4 py-2.5 rounded-2xl text-xs font-black transition-all cursor-pointer ${
                                    active
                                        ? 'bg-slate-900 text-white shadow-md'
                                        : 'bg-gray-100 text-slate-600 hover:bg-gray-200'
                                }`}
                            >
                                {TEMPLATE_CONFIG[key].label}
                            </button>
                        )
                    })}
                </div>

                {/* Description de l'onglet actif */}
                <p className="text-xs font-semibold text-slate-500">
                    {TEMPLATE_CONFIG[activeTemplateTab].description}
                </p>

                {/* Insertion de Variables Dynamiques */}
                <div className="space-y-2">
                    <span className="text-[11px] font-black uppercase tracking-wider text-gray-400 block">
                        Cliquez sur une variable pour l&apos;insérer dans votre texte :
                    </span>
                    <div className="flex flex-wrap gap-2">
                        {TEMPLATE_CONFIG[activeTemplateTab].variables.map((v) => (
                            <button
                                key={v.code}
                                type="button"
                                onClick={() => insertVariable(v.code)}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-xl text-xs font-mono font-bold transition-all cursor-pointer"
                                title={`Exemple : ${v.sample}`}
                            >
                                <Sparkles className="w-3 h-3 text-emerald-600" />
                                <span>{v.code}</span>
                                <span className="text-[10px] text-emerald-600 font-sans font-medium">({v.label})</span>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Éditeur et Prévisualisation WhatsApp */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-2">
                    {/* Éditeur Textarea */}
                    <div>
                        <label className="block text-xs font-black uppercase tracking-wider text-slate-700 mb-2">
                            Texte du message
                        </label>
                        <textarea
                            value={templates[activeTemplateTab]}
                            onChange={(e) => setTemplates(prev => ({ ...prev, [activeTemplateTab]: e.target.value }))}
                            rows={8}
                            className="w-full p-4 bg-gray-50 border border-gray-200 rounded-2xl text-xs sm:text-sm font-medium text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono leading-relaxed"
                        />
                        <p className="text-[11px] text-gray-400 mt-1.5">
                            Astuce WhatsApp : mettez les mots importants entre astérisques pour les mettre en gras (ex : *TEKNO10*).
                        </p>
                    </div>

                    {/* Aperçu Message WhatsApp Réaliste */}
                    <div>
                        <label className="block text-xs font-black uppercase tracking-wider text-slate-700 mb-2">
                            Aperçu client en direct
                        </label>
                        <div className="bg-[#EFEAE2] p-4 sm:p-6 rounded-2xl border border-stone-300 min-h-[220px] flex items-end">
                            <div className="bg-white rounded-2xl rounded-bl-sm p-4 shadow-sm border border-stone-200 text-slate-900 text-xs sm:text-sm whitespace-pre-wrap leading-relaxed max-w-sm">
                                {getSimulatedPreview()}
                                <div className="text-[10px] text-stone-400 text-right mt-1.5 font-sans">
                                    12:30 ✓✓
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Paramètres d'automatisation */}
            <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6 sm:p-8 space-y-6">
                <div>
                    <h3 className="text-lg font-black text-slate-900">
                        Automatisations des Messages
                    </h3>
                    <p className="text-xs text-gray-500 font-medium mt-0.5">
                        Définissez quelles notifications envoyer automatiquement dès que la passerelle est connectée.
                    </p>
                </div>

                <div className="divide-y divide-gray-100">
                    <div className="py-4 flex items-center justify-between gap-4">
                        <div>
                            <p className="text-sm font-black text-slate-900">
                                Envoi automatique du Code Promo (-10%) aux Leads Panier
                            </p>
                            <p className="text-xs text-slate-500 font-medium mt-0.5">
                                Dès qu&apos;un client saisit son numéro dans le pop-up, il reçoit instantanément le code promo TEKNO10 sur son WhatsApp.
                            </p>
                        </div>
                        <button
                            type="button"
                            onClick={() => handleToggleSetting('whatsapp_auto_promo_lead', settings.autoPromoLead)}
                            className={`w-12 h-7 flex items-center rounded-full p-1 transition-colors duration-200 cursor-pointer ${
                                settings.autoPromoLead ? 'bg-emerald-600' : 'bg-gray-200'
                            }`}
                        >
                            <div className={`bg-white w-5 h-5 rounded-full shadow-md transform transition-transform duration-200 ${
                                settings.autoPromoLead ? 'translate-x-5' : 'translate-x-0'
                            }`} />
                        </button>
                    </div>

                    <div className="py-4 flex items-center justify-between gap-4">
                        <div>
                            <p className="text-sm font-black text-slate-900">
                                Envoi automatique des Confirmations de Commande COD
                            </p>
                            <p className="text-xs text-slate-500 font-medium mt-0.5">
                                Confirme la réception de la commande par message WhatsApp avec le récapitulatif et l&apos;adresse de livraison.
                            </p>
                        </div>
                        <button
                            type="button"
                            onClick={() => handleToggleSetting('whatsapp_auto_order_confirm', settings.autoOrderConfirm)}
                            className={`w-12 h-7 flex items-center rounded-full p-1 transition-colors duration-200 cursor-pointer ${
                                settings.autoOrderConfirm ? 'bg-emerald-600' : 'bg-gray-200'
                            }`}
                        >
                            <div className={`bg-white w-5 h-5 rounded-full shadow-md transform transition-transform duration-200 ${
                                settings.autoOrderConfirm ? 'translate-x-5' : 'translate-x-0'
                            }`} />
                        </button>
                    </div>

                    <div className="py-4 flex items-center justify-between gap-4">
                        <div>
                            <p className="text-sm font-black text-slate-900">
                                Réponse automatique d&apos;accueil aux messages entrants
                            </p>
                            <p className="text-xs text-slate-500 font-medium mt-0.5">
                                Répond instantanément avec le message d&apos;accueil lorsqu&apos;un client vous contacte (limité à 1 envoi par 24h par contact).
                            </p>
                        </div>
                        <button
                            type="button"
                            onClick={() => handleToggleSetting('whatsapp_auto_welcome', settings.autoWelcome ?? true)}
                            className={`w-12 h-7 flex items-center rounded-full p-1 transition-colors duration-200 cursor-pointer ${
                                (settings.autoWelcome ?? true) ? 'bg-emerald-600' : 'bg-gray-200'
                            }`}
                        >
                            <div className={`bg-white w-5 h-5 rounded-full shadow-md transform transition-transform duration-200 ${
                                (settings.autoWelcome ?? true) ? 'translate-x-5' : 'translate-x-0'
                            }`} />
                        </button>
                    </div>
                </div>
            </div>

            {/* Formulaire de Test d'Envoi Direct */}
            <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6 sm:p-8">
                <div className="mb-6">
                    <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
                        <Send className="w-5 h-5 text-emerald-600" />
                        Tester l&apos;Envoi WhatsApp Direct
                    </h3>
                    <p className="text-xs text-gray-500 font-medium mt-0.5">
                        Envoyez un message d&apos;essai vers votre propre téléphone pour vérifier le bon acheminement.
                    </p>
                </div>

                <form onSubmit={handleSendTest} className="space-y-4 max-w-xl">
                    <div>
                        <label className="block text-xs font-black uppercase tracking-wider text-slate-700 mb-1.5">
                            Numéro destinataire (Maroc 06/07 ou International)
                        </label>
                        <input
                            type="tel"
                            value={testPhone}
                            onChange={(e) => setTestPhone(e.target.value)}
                            placeholder="06 XX XX XX XX"
                            className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl text-sm font-bold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        />
                    </div>

                    {initialSessions && initialSessions.length > 1 && (
                        <div>
                            <label className="block text-xs font-black uppercase tracking-wider text-slate-700 mb-1.5">
                                Session WAHA émettrice
                            </label>
                            <select
                                value={testSession}
                                onChange={(e) => setTestSession(e.target.value)}
                                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl text-xs font-bold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
                            >
                                {initialSessions.map(s => (
                                    <option key={s.name} value={s.name}>
                                        {s.name} ({s.status}) {s.me?.pushName ? `- ${s.me.pushName}` : ''}
                                    </option>
                                ))}
                            </select>
                        </div>
                    )}

                    <div>
                        <label className="block text-xs font-black uppercase tracking-wider text-slate-700 mb-1.5">
                            Message à envoyer
                        </label>
                        <textarea
                            value={testMessage}
                            onChange={(e) => setTestMessage(e.target.value)}
                            rows={3}
                            className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl text-sm font-medium text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={isSendingTest || !isConnected}
                        className="inline-flex items-center gap-2 py-3 px-6 bg-emerald-600 hover:bg-emerald-700 active:scale-[0.99] text-white font-black text-sm rounded-2xl shadow-md transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <Send className="w-4 h-4" />
                        <span>{isSendingTest ? 'Envoi en cours...' : 'Envoyer le message test'}</span>
                    </button>
                    {!isConnected && (
                        <p className="text-xs text-amber-700 font-bold bg-amber-50 p-3 rounded-xl border border-amber-200 flex items-center gap-2">
                            <Info className="w-4 h-4 shrink-0" />
                            <span>La passerelle doit être connectée pour envoyer des messages réels.</span>
                        </p>
                    )}
                </form>
            </div>
                </>
            )}
        </div>
    )
}
