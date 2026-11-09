'use client'

import { useState } from 'react'
import { Sparkles, X, Check, Copy, Download, Send, ArrowRight, Loader2, Target, DollarSign, Layers, Globe, ShoppingBag, Search } from 'lucide-react'
import { generateGoogleAdsCampaignWithGemini, launchGoogleAdsApiCampaign, triggerWeeklyGoogleAdsTelegramReportAction, GoogleAdsCampaignPlan } from '@/lib/actions/google-ads'
import { toast } from 'sonner'

interface GoogleAdsGeneratorModalProps {
    isOpen: boolean
    onClose: () => void
}

export default function GoogleAdsGeneratorModal({ isOpen, onClose }: GoogleAdsGeneratorModalProps) {
    const [step, setStep] = useState<'SETUP' | 'ANALYZING' | 'RESULT'>('SETUP')
    const [campaignType, setCampaignType] = useState<'SEARCH' | 'PERFORMANCE_MAX'>('SEARCH')
    const [customFocus, setCustomFocus] = useState('')
    const [budgetMad, setBudgetMad] = useState(150)
    const [campaignPlan, setCampaignPlan] = useState<GoogleAdsCampaignPlan | null>(null)
    const [activeTab, setActiveTab] = useState<'preview' | 'keywords' | 'script' | 'csv'>('preview')
    const [copiedScript, setCopiedScript] = useState(false)
    const [copiedCsv, setCopiedCsv] = useState(false)
    const [copiedFeed, setCopiedFeed] = useState(false)
    const [launchingApi, setLaunchingApi] = useState(false)
    const [sendingReport, setSendingReport] = useState(false)

    if (!isOpen) return null

    const handleSendWeeklyReport = async () => {
        setSendingReport(true)
        try {
            const res = await triggerWeeklyGoogleAdsTelegramReportAction()
            if (res.success && res.summary) {
                toast.success(`Rapport envoyé sur Telegram : ${res.summary.totalDeliveredOrders} commandes (${res.summary.totalRevenueMad.toFixed(0)} MAD)`)
            } else {
                toast.error(res.error || 'Erreur lors de l envoi Telegram')
            }
        } catch {
            toast.error('Erreur technique Telegram')
        } finally {
            setSendingReport(false)
        }
    }

    const handleGenerate = async () => {
        setStep('ANALYZING')
        try {
            const res = await generateGoogleAdsCampaignWithGemini({
                customFocus: customFocus.trim() || undefined,
                dailyBudgetMad: budgetMad,
                campaignType
            })

            if (res.success && res.data) {
                setCampaignPlan(res.data)
                setStep('RESULT')
                toast.success('Campagne Google Ads générée avec succès par Gemini !')
            } else {
                toast.error(res.error || 'Erreur lors de la génération IA')
                setStep('SETUP')
            }
        } catch {
            toast.error('Erreur technique lors de l analyse IA')
            setStep('SETUP')
        }
    }

    const handleCopyScript = () => {
        if (!campaignPlan) return
        navigator.clipboard.writeText(campaignPlan.googleAdsScript)
        setCopiedScript(true)
        toast.success('Script Google Ads copié dans le presse-papiers !')
        setTimeout(() => setCopiedScript(false), 2500)
    }

    const handleDownloadCsv = () => {
        if (!campaignPlan) return
        const blob = new Blob([campaignPlan.editorCsv], { type: 'text/csv;charset=utf-8;' })
        const url = URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = url
        link.setAttribute('download', `GoogleAds_${campaignPlan.campaignName.replace(/[^a-zA-Z0-9]/g, '_')}.csv`)
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        setCopiedCsv(true)
        toast.success('Fichier CSV Google Ads Editor téléchargé !')
        setTimeout(() => setCopiedCsv(false), 2500)
    }

    const handleLaunchApi = async () => {
        if (!campaignPlan) return
        setLaunchingApi(true)
        try {
            const res = await launchGoogleAdsApiCampaign(campaignPlan)
            if (res.success) {
                toast.success(res.message)
            } else {
                toast.info(res.message)
            }
        } catch {
            toast.error('Erreur lors du lancement API')
        } finally {
            setLaunchingApi(false)
        }
    }

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
            <div className="relative w-full max-w-4xl bg-white rounded-3xl shadow-2xl border border-gray-100 overflow-hidden flex flex-col my-8 max-h-[90vh]">
                {/* Header */}
                <div className="flex items-center justify-between px-8 py-6 border-b border-gray-100 bg-slate-900 text-white">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-amber-400 text-slate-900 flex items-center justify-center font-black">
                            <Sparkles className="w-5 h-5" />
                        </div>
                        <div>
                            <h2 className="text-xl font-black tracking-tight">
                                Automatisation Google Ads avec Gemini
                            </h2>
                            <p className="text-xs text-slate-300 font-medium">
                                Analyse automatique du store, des packs et création d annonces Search à fort ROI
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Body Content */}
                <div className="p-8 overflow-y-auto flex-1 space-y-6">
                    {step === 'SETUP' && (
                        <div className="space-y-6">
                            <div className="p-6 bg-slate-50 rounded-2xl border border-slate-100 flex items-start gap-4">
                                <div className="p-3 bg-emerald-100 text-emerald-800 rounded-xl mt-0.5">
                                    <Target className="w-5 h-5" />
                                </div>
                                <div>
                                    <h4 className="text-sm font-bold text-slate-900">
                                        Analyse intelligente du catalogue Riwaya
                                    </h4>
                                    <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                                        L API Gemini inspecte vos meilleures ventes de livres, vos packs en promotion et vos catégories les plus consultées pour générer des annonces percutantes ciblées sur le marché marocain (Paiement à la livraison, livraison rapide).
                                    </p>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="block text-xs font-black uppercase tracking-wider text-slate-700">
                                    Type de Campagne Google Ads
                                </label>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <button
                                        type="button"
                                        onClick={() => setCampaignType('SEARCH')}
                                        className={`p-4 rounded-2xl border text-left transition-all ${
                                            campaignType === 'SEARCH'
                                                ? 'bg-slate-900 border-slate-900 text-white shadow-md'
                                                : 'bg-white border-slate-200 text-slate-800 hover:border-slate-300'
                                        }`}
                                    >
                                        <div className="flex items-center gap-2 mb-1.5">
                                            <Search className={`w-4 h-4 ${campaignType === 'SEARCH' ? 'text-amber-400' : 'text-slate-500'}`} />
                                            <span className="text-sm font-black">Search Ads</span>
                                        </div>
                                        <p className={`text-xs ${campaignType === 'SEARCH' ? 'text-slate-300' : 'text-slate-500'}`}>
                                            Mots-clés ciblés, annonces Responsive Search et sitelinks avec intention d achat forte.
                                        </p>
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() => setCampaignType('PERFORMANCE_MAX')}
                                        className={`p-4 rounded-2xl border text-left transition-all ${
                                            campaignType === 'PERFORMANCE_MAX'
                                                ? 'bg-slate-900 border-slate-900 text-white shadow-md'
                                                : 'bg-white border-slate-200 text-slate-800 hover:border-slate-300'
                                        }`}
                                    >
                                        <div className="flex items-center gap-2 mb-1.5">
                                            <ShoppingBag className={`w-4 h-4 ${campaignType === 'PERFORMANCE_MAX' ? 'text-amber-400' : 'text-slate-500'}`} />
                                            <span className="text-sm font-black">Performance Max (PMax)</span>
                                        </div>
                                        <p className={`text-xs ${campaignType === 'PERFORMANCE_MAX' ? 'text-slate-300' : 'text-slate-500'}`}>
                                            Flux Google Merchant Center synchronisé, Asset Groups et diffusion multi-canaux automatique.
                                        </p>
                                    </button>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="block text-xs font-black uppercase tracking-wider text-slate-700">
                                    Orientation stratégique (Optionnel)
                                </label>
                                <input
                                    type="text"
                                    value={customFocus}
                                    onChange={(e) => setCustomFocus(e.target.value)}
                                    placeholder={campaignType === 'PERFORMANCE_MAX' ? 'Ex: Mise en avant des Bestsellers + Packs avec flux Shopping Merchant' : 'Ex: Focus Bestsellers Psychologie & Développement Personnel, ou Packs 9 livres'}
                                    className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-slate-900 text-slate-900 font-medium"
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="block text-xs font-black uppercase tracking-wider text-slate-700">
                                    Budget Quotidien Recommandé (MAD)
                                </label>
                                <div className="relative">
                                    <input
                                        type="number"
                                        min={50}
                                        max={5000}
                                        value={budgetMad}
                                        onChange={(e) => setBudgetMad(Number(e.target.value))}
                                        className="w-full pl-4 pr-16 py-3 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-slate-900 text-slate-900 font-bold"
                                    />
                                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-500">
                                        MAD / jour
                                    </span>
                                </div>
                            </div>

                            <div className="pt-4 flex flex-col sm:flex-row items-center justify-between gap-4">
                                <button
                                    type="button"
                                    disabled={sendingReport}
                                    onClick={handleSendWeeklyReport}
                                    className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-3.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold rounded-2xl text-xs transition-colors"
                                >
                                    {sendingReport ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4 text-blue-600" />}
                                    <span>Envoyer Rapport Telegram Hebdomadaire</span>
                                </button>

                                <button
                                    onClick={handleGenerate}
                                    className="w-full sm:w-auto inline-flex items-center justify-center gap-3 px-8 py-4 bg-slate-900 hover:bg-black text-white font-bold rounded-2xl shadow-xl transition-all duration-200 hover:-translate-y-0.5"
                                >
                                    <Sparkles className="w-5 h-5 text-amber-400" />
                                    <span>Analyser le Store & Créer la Campagne</span>
                                    <ArrowRight className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    )}

                    {step === 'ANALYZING' && (
                        <div className="py-20 flex flex-col items-center justify-center text-center space-y-4">
                            <div className="w-16 h-16 rounded-3xl bg-slate-900 text-amber-400 flex items-center justify-center shadow-xl animate-bounce-light">
                                <Loader2 className="w-8 h-8 animate-spin" />
                            </div>
                            <h3 className="text-xl font-black text-slate-900 tracking-tight">
                                Gemini analyse votre store Riwaya...
                            </h3>
                            <p className="text-sm text-slate-500 max-w-md">
                                Extraction des meilleures ventes, formulation des Responsive Search Ads, calcul des mots-clés à haute intention et génération du script de déploiement.
                            </p>
                        </div>
                    )}

                    {step === 'RESULT' && campaignPlan && (
                        <div className="space-y-6">
                            {/* Summary banner */}
                            <div className="p-5 bg-emerald-50 rounded-2xl border border-emerald-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                                <div>
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className="inline-block px-2.5 py-0.5 rounded-full bg-emerald-200 text-emerald-800 text-[10px] font-black uppercase tracking-wider">
                                            Campagne Prête
                                        </span>
                                        <span className="inline-block px-2.5 py-0.5 rounded-full bg-slate-900 text-white text-[10px] font-black uppercase tracking-wider">
                                            {campaignPlan.campaignType === 'PERFORMANCE_MAX' ? 'Performance Max' : 'Search Ads'}
                                        </span>
                                    </div>
                                    <h3 className="text-base font-black text-emerald-950">
                                        {campaignPlan.campaignName}
                                    </h3>
                                    <p className="text-xs text-emerald-800 mt-0.5">
                                        {campaignPlan.strategySummary}
                                    </p>
                                </div>
                                <div className="text-right sm:shrink-0 bg-white px-4 py-2 rounded-xl border border-emerald-200 shadow-sm">
                                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Budget Cible</span>
                                    <span className="text-base font-black text-slate-900">{campaignPlan.dailyBudgetMad} MAD/j</span>
                                </div>
                            </div>

                            {/* Navigation Tabs */}
                            <div className="flex border-b border-slate-200 gap-2">
                                <button
                                    onClick={() => setActiveTab('preview')}
                                    className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-colors ${activeTab === 'preview' ? 'border-slate-900 text-slate-900' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
                                >
                                    Aperçu Annonces & Assets
                                </button>
                                <button
                                    onClick={() => setActiveTab('keywords')}
                                    className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-colors ${activeTab === 'keywords' ? 'border-slate-900 text-slate-900' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
                                >
                                    {campaignPlan.campaignType === 'PERFORMANCE_MAX' ? 'Signaux d\'Audience' : `Mots-clés & Négatifs (${campaignPlan.adGroups.reduce((acc, g) => acc + g.keywords.length, 0)})`}
                                </button>
                                <button
                                    onClick={() => setActiveTab('script')}
                                    className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-colors ${activeTab === 'script' ? 'border-slate-900 text-slate-900' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
                                >
                                    Script Google Ads (1 Clic)
                                </button>
                                <button
                                    onClick={() => setActiveTab('csv')}
                                    className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-colors ${activeTab === 'csv' ? 'border-slate-900 text-slate-900' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
                                >
                                    Export Google Ads Editor
                                </button>
                            </div>

                            {/* Tab Content: Preview */}
                            {activeTab === 'preview' && (
                                <div className="space-y-6">
                                    {/* Performance Max Merchant Feed Callout */}
                                    {campaignPlan.campaignType === 'PERFORMANCE_MAX' && (
                                        <div className="p-5 bg-amber-50 rounded-2xl border border-amber-200 space-y-3">
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-2">
                                                    <ShoppingBag className="w-5 h-5 text-amber-700" />
                                                    <span className="text-sm font-black text-amber-950">Flux Google Merchant Center</span>
                                                </div>
                                                <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-black uppercase">
                                                    Flux XML Actif (Auto-synchronisé)
                                                </span>
                                            </div>
                                            <p className="text-xs text-amber-900 leading-relaxed">
                                                Ce flux XML fournit automatiquement à Google Ads tous les livres et packs actifs avec prix en MAD, disponibilité en stock et éligibilité au paiement à la livraison (COD).
                                            </p>
                                            <div className="flex items-center gap-2">
                                                <code className="flex-1 px-3 py-2 bg-white rounded-xl border border-amber-200 text-xs text-slate-800 font-mono select-all">
                                                    {campaignPlan.merchantFeedUrl || 'https://riwaya.store/api/feeds/google-merchant'}
                                                </code>
                                                <button
                                                    onClick={() => {
                                                        navigator.clipboard.writeText(campaignPlan.merchantFeedUrl || 'https://riwaya.store/api/feeds/google-merchant')
                                                        setCopiedFeed(true)
                                                        toast.success('Lien du flux copié !')
                                                        setTimeout(() => setCopiedFeed(false), 2000)
                                                    }}
                                                    className="px-4 py-2 bg-amber-400 hover:bg-amber-300 text-slate-900 font-bold text-xs rounded-xl shadow transition-colors flex items-center gap-1.5 shrink-0"
                                                >
                                                    {copiedFeed ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                                                    <span>{copiedFeed ? 'Copié' : 'Copier'}</span>
                                                </button>
                                            </div>
                                        </div>
                                    )}

                                    {/* Long Headlines for Performance Max */}
                                    {campaignPlan.longHeadlines && campaignPlan.longHeadlines.length > 0 && (
                                        <div className="p-5 bg-white rounded-2xl border border-slate-200 space-y-3">
                                            <h4 className="text-xs font-black uppercase tracking-wider text-slate-700">
                                                Titres Longs Performance Max (Max 90 caractères)
                                            </h4>
                                            <div className="grid grid-cols-1 gap-2">
                                                {campaignPlan.longHeadlines.map((lh, lIdx) => (
                                                    <div key={lIdx} className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs font-semibold text-slate-800 flex items-center justify-between">
                                                        <span>{lh}</span>
                                                        <span className="text-[10px] text-slate-400 font-mono">{lh.length}/90</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {campaignPlan.adGroups.map((group, idx) => (
                                        <div key={idx} className="p-6 bg-white rounded-2xl border border-slate-200 shadow-sm space-y-4">
                                            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                                                <h4 className="text-sm font-black text-slate-900 flex items-center gap-2">
                                                    <Layers className="w-4 h-4 text-slate-500" />
                                                    {campaignPlan.campaignType === 'PERFORMANCE_MAX' ? `Asset Group : ${group.name}` : `Groupe : ${group.name}`}
                                                </h4>
                                                <span className="text-xs text-slate-500 font-medium">
                                                    {group.ad.headlines.length} titres • {group.ad.descriptions.length} descriptions
                                                </span>
                                            </div>

                                            {/* Google SERP / Ad Simulation */}
                                            <div className="p-5 bg-slate-50 rounded-xl border border-slate-200 font-sans space-y-1.5">
                                                <div className="flex items-center gap-2 text-xs text-slate-600">
                                                    <span className="font-bold text-black">Sponsorisé</span>
                                                    <span>•</span>
                                                    <span className="text-slate-700">riwaya.store/{group.ad.path1 || 'livres'}/{group.ad.path2 || 'maroc'}</span>
                                                </div>
                                                <div className="text-blue-800 hover:underline text-lg font-medium leading-snug cursor-pointer">
                                                    {group.ad.headlines[0] || 'Riwaya Librairie'} | {group.ad.headlines[1] || 'Paiement à la Livraison'} | {group.ad.headlines[2] || 'Livraison Rapide Maroc'}
                                                </div>
                                                <p className="text-xs text-slate-600 leading-relaxed">
                                                    {group.ad.descriptions[0] || 'Commandez vos livres favoris au Maroc.'} {group.ad.descriptions[1] || 'Paiement à la livraison sécurisé.'}
                                                </p>
                                                {/* Sitelinks simulation */}
                                                <div className="grid grid-cols-2 gap-2 pt-2 text-xs">
                                                    {campaignPlan.sitelinks.slice(0, 2).map((sl, sIdx) => (
                                                        <div key={sIdx} className="text-blue-800 font-semibold cursor-pointer">
                                                            {sl.text}
                                                            <span className="block text-[10px] text-slate-500 font-normal">{sl.line1}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* Tab Content: Keywords / Audience Signals */}
                            {activeTab === 'keywords' && (
                                <div className="space-y-6">
                                    {/* Audience Signals for Performance Max */}
                                    {campaignPlan.audienceSignals && campaignPlan.audienceSignals.length > 0 && (
                                        <div className="p-6 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
                                            <h4 className="text-sm font-black text-slate-900">Signaux d Audience Cibles (Audience Signals)</h4>
                                            <p className="text-xs text-slate-500">Segments d affinité, intentions d achat et démographies optimisés pour le Maroc :</p>
                                            <div className="flex flex-wrap gap-2 pt-2">
                                                {campaignPlan.audienceSignals.map((sig, sIdx) => (
                                                    <span key={sIdx} className="px-3.5 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 shadow-sm">
                                                        {sig}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {campaignPlan.adGroups.map((group, idx) => (
                                        <div key={idx} className="p-6 bg-slate-50 rounded-2xl border border-slate-200 space-y-4">
                                            <h4 className="text-sm font-black text-slate-900">Groupe : {group.name}</h4>
                                            {group.keywords.length > 0 && (
                                                <div>
                                                    <label className="text-xs font-bold text-slate-500 block mb-2">Mots-clés cibles (Broad / Phrase / Exact) :</label>
                                                    <div className="flex flex-wrap gap-2">
                                                        {group.keywords.map((kw, kIdx) => (
                                                            <span key={kIdx} className="px-3 py-1 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-800">
                                                                {kw}
                                                            </span>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                            {group.negativeKeywords.length > 0 && (
                                                <div>
                                                    <label className="text-xs font-bold text-red-600 block mb-2">Mots-clés négatifs (Exclusions de budget) :</label>
                                                    <div className="flex flex-wrap gap-2">
                                                        {group.negativeKeywords.map((nkw, nkIdx) => (
                                                            <span key={nkIdx} className="px-3 py-1 bg-red-50 border border-red-200 rounded-lg text-xs font-semibold text-red-700">
                                                                {nkw}
                                                            </span>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* Tab Content: Script */}
                            {activeTab === 'script' && (
                                <div className="space-y-4">
                                    <div className="p-4 bg-slate-100 rounded-xl text-xs text-slate-700 leading-relaxed">
                                        Copiez ce code JavaScript et collez-le dans votre compte <strong>Google Ads &gt; Outils &amp; Paramètres &gt; Scripts</strong>, puis cliquez sur <strong>Exécuter</strong> pour configurer la campagne en 30 secondes.
                                    </div>
                                    <pre className="p-4 bg-slate-950 text-slate-100 rounded-2xl text-xs font-mono overflow-x-auto max-h-72">
                                        {campaignPlan.googleAdsScript}
                                    </pre>
                                    <button
                                        onClick={handleCopyScript}
                                        className="inline-flex items-center gap-2 px-6 py-3 bg-slate-900 hover:bg-black text-white text-xs font-bold rounded-xl shadow-md transition-colors"
                                    >
                                        {copiedScript ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                                        <span>{copiedScript ? 'Script Copié !' : 'Copier le Script Google Ads'}</span>
                                    </button>
                                </div>
                            )}

                            {/* Tab Content: CSV */}
                            {activeTab === 'csv' && (
                                <div className="space-y-4">
                                    <div className="p-4 bg-slate-100 rounded-xl text-xs text-slate-700 leading-relaxed">
                                        Fichier CSV standard compatible avec l application <strong>Google Ads Editor</strong>. Téléchargez le fichier et utilisez le menu <em>Compte &gt; Importer &gt; Depuis un fichier CSV</em>.
                                    </div>
                                    <pre className="p-4 bg-slate-950 text-slate-100 rounded-2xl text-xs font-mono overflow-x-auto max-h-72">
                                        {campaignPlan.editorCsv}
                                    </pre>
                                    <button
                                        onClick={handleDownloadCsv}
                                        className="inline-flex items-center gap-2 px-6 py-3 bg-slate-900 hover:bg-black text-white text-xs font-bold rounded-xl shadow-md transition-colors"
                                    >
                                        {copiedCsv ? <Check className="w-4 h-4 text-emerald-400" /> : <Download className="w-4 h-4" />}
                                        <span>Télécharger Google Ads Editor CSV</span>
                                    </button>
                                </div>
                            )}

                            {/* Action Buttons */}
                            <div className="pt-6 border-t border-slate-100 flex flex-wrap items-center justify-between gap-4">
                                <button
                                    onClick={() => setStep('SETUP')}
                                    className="px-6 py-3 border border-slate-200 text-slate-700 text-xs font-bold rounded-xl hover:bg-slate-50 transition-colors"
                                >
                                    Régénérer avec d autres critères
                                </button>
                                <div className="flex items-center gap-3">
                                    <button
                                        onClick={handleDownloadCsv}
                                        className="inline-flex items-center gap-2 px-5 py-3 bg-slate-100 hover:bg-slate-200 text-slate-900 text-xs font-bold rounded-xl transition-colors"
                                    >
                                        <Download className="w-4 h-4" />
                                        <span>Export CSV</span>
                                    </button>
                                    <button
                                        onClick={handleLaunchApi}
                                        disabled={launchingApi}
                                        className="inline-flex items-center gap-2 px-6 py-3 bg-slate-900 hover:bg-black text-white text-xs font-bold rounded-xl shadow-lg transition-all"
                                    >
                                        {launchingApi ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4 text-amber-400" />}
                                        <span>Lancer via API Google Ads</span>
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}

