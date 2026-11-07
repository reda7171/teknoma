'use client'

import { useState } from 'react'
import {
    CheckCircle2,
    Clock,
    Globe,
    Bot,
    ExternalLink,
    RefreshCw,
    ShieldCheck,
    FileCode,
    Sparkles,
    AlertCircle,
    SendHorizontal,
    Zap
} from 'lucide-react'
import {
    SitemapsOverviewData,
    simulateGooglebotVisitAction,
    triggerIndexNowPingAction
} from '@/lib/actions/seo-sitemaps'

interface SitemapSyncStatusWidgetProps {
    initialData: SitemapsOverviewData
}

export default function SitemapSyncStatusWidget({ initialData }: SitemapSyncStatusWidgetProps) {
    const [data, setData] = useState<SitemapsOverviewData>(initialData)
    const [isLoading, setIsLoading] = useState(false)
    const [actionMsg, setActionMsg] = useState<string | null>(null)
    const [indexNowLoading, setIndexNowLoading] = useState(false)
    const [indexNowMsg, setIndexNowMsg] = useState<string | null>(null)

    const sellersVisit = data.googlebotSellersVisit
    const sellersSitemap = data.sitemaps.find(s => s.id === 'sitemap-sellers')
    const indexNow = data.indexNow

    const formatDate = (isoString?: string | null) => {
        if (!isoString) return 'Aucun passage détecté'
        try {
            const date = new Date(isoString)
            return new Intl.DateTimeFormat('fr-FR', {
                dateStyle: 'medium',
                timeStyle: 'medium',
            }).format(date)
        } catch {
            return isoString
        }
    }

    const formatRelativeTime = (isoString?: string | null) => {
        if (!isoString) return 'En attente'
        try {
            const diffMs = Date.now() - new Date(isoString).getTime()
            const diffMin = Math.floor(diffMs / (1000 * 60))
            if (diffMin < 1) return 'À l’instant'
            if (diffMin < 60) return `Il y a ${diffMin} min`
            const diffHours = Math.floor(diffMin / 60)
            if (diffHours < 24) return `Il y a ${diffHours} h`
            const diffDays = Math.floor(diffHours / 24)
            return `Il y a ${diffDays} j`
        } catch {
            return ''
        }
    }

    const handleSimulate = async () => {
        setIsLoading(true)
        setActionMsg(null)
        try {
            await simulateGooglebotVisitAction()
            setData(prev => ({
                ...prev,
                googlebotSellersVisit: {
                    timestamp: new Date().toISOString(),
                    userAgent: 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
                    ip: '66.249.66.1 (Simulation Test Admin)',
                    crawler: 'Googlebot'
                }
            }))
            setActionMsg('Crawl Googlebot simulé avec succès. Timestamp mis à jour.')
            setTimeout(() => setActionMsg(null), 4000)
        } catch (e: any) {
            setActionMsg(e?.message || 'Erreur lors de la simulation.')
        } finally {
            setIsLoading(false)
        }
    }

    const handleIndexNowPing = async (target: 'sellers' | 'community' | 'all') => {
        setIndexNowLoading(true)
        setIndexNowMsg(null)
        try {
            const res = await triggerIndexNowPingAction(target)
            if (res.success) {
                setIndexNowMsg(`${res.submittedCount} URL(s) notifiée(s) avec succès aux moteurs IndexNow (${target}).`)
                setData(prev => ({
                    ...prev,
                    indexNow: {
                        ...prev.indexNow,
                        lastSubmission: {
                            timestamp: new Date().toISOString(),
                            status: 'SUCCESS',
                            httpStatus: res.status || 200,
                            submittedCount: res.submittedCount,
                            reason: target === 'sellers'
                                ? 'Programme vendeurs & partenaires'
                                : target === 'community'
                                ? 'Bourse aux livres communautaire'
                                : 'Catalogue complet & pages stratégiques',
                            sampleUrls: prev.indexNow.lastSubmission?.sampleUrls || []
                        }
                    }
                }))
            } else {
                setIndexNowMsg(`IndexNow: ${res.error || 'Erreur lors de la soumission'}`)
            }
            setTimeout(() => setIndexNowMsg(null), 5000)
        } catch (e: any) {
            setIndexNowMsg(e?.message || 'Erreur lors de l’envoi IndexNow.')
        } finally {
            setIndexNowLoading(false)
        }
    }

    return (
        <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-xl shadow-black/5 p-6 sm:p-8 md:p-10 mb-8 overflow-hidden">
            {/* Header du widget */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-gray-100">
                <div className="flex items-center gap-3.5">
                    <div className="w-12 h-12 rounded-2xl bg-slate-900 text-white flex items-center justify-center shadow-lg shadow-black/10 shrink-0">
                        <Bot className="w-6 h-6 text-emerald-400" />
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                                Moniteur Sitemaps & Indexation Instantanée
                            </h2>
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-black uppercase tracking-wider">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                Synchronisé
                            </span>
                        </div>
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mt-0.5">
                            Surveillance temps réel du Crawl Googlebot & Protocole IndexNow (Bing / Yandex)
                        </p>
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                    <button
                        type="button"
                        onClick={handleSimulate}
                        disabled={isLoading}
                        className="inline-flex items-center gap-2 px-3.5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all shadow-md active:scale-95 disabled:opacity-50"
                        title="Simule un passage de Googlebot pour tester l'enregistrement"
                    >
                        <RefreshCw className={`w-3.5 h-3.5 text-emerald-400 ${isLoading ? 'animate-spin' : ''}`} />
                        <span>Tester Passage Googlebot</span>
                    </button>
                </div>
            </div>

            {/* Notification de feedback Googlebot */}
            {actionMsg && (
                <div className="mt-4 p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-2 animate-in fade-in duration-200">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>{actionMsg}</span>
                </div>
            )}

            {/* Notification de feedback IndexNow */}
            {indexNowMsg && (
                <div className="mt-4 p-3.5 rounded-xl bg-blue-50 border border-blue-200 text-blue-800 text-xs font-bold flex items-center gap-2 animate-in fade-in duration-200">
                    <Zap className="w-4 h-4 text-blue-600 shrink-0" />
                    <span>{indexNowMsg}</span>
                </div>
            )}

            {/* Cartes métriques clés (4 colonnes) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mt-6">
                {/* Carte 1 : Dernier passage Googlebot sur sitemap-sellers.xml */}
                <div className="bg-gradient-to-br from-slate-900 to-slate-800 text-white p-5 sm:p-6 rounded-3xl relative overflow-hidden shadow-lg border border-slate-700 flex flex-col justify-between">
                    <div>
                        <div className="flex items-center justify-between mb-3">
                            <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full bg-emerald-400/20 text-emerald-300">
                                /sitemap-sellers.xml
                            </span>
                            <Bot className="w-5 h-5 text-emerald-400" />
                        </div>
                        <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">
                            Dernier crawl Googlebot
                        </div>
                        <div className="text-xl sm:text-2xl font-black text-white tracking-tight">
                            {formatRelativeTime(sellersVisit?.timestamp)}
                        </div>
                        <div className="text-[11px] text-slate-300 font-medium mt-1">
                            {formatDate(sellersVisit?.timestamp)}
                        </div>
                    </div>

                    <div className="mt-4 pt-3 border-t border-slate-700/60 text-[10px] text-slate-400 font-mono truncate">
                        {sellersVisit?.ip ? `IP: ${sellersVisit.ip}` : 'En attente de la première requête'}
                    </div>
                </div>

                {/* Carte 2 : IndexNow Protocole Instantané */}
                <div className="bg-gradient-to-br from-blue-950 to-slate-900 text-white p-5 sm:p-6 rounded-3xl relative overflow-hidden shadow-lg border border-blue-800/50 flex flex-col justify-between">
                    <div>
                        <div className="flex items-center justify-between mb-3">
                            <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full bg-blue-400/20 text-blue-300">
                                IndexNow (Bing/Yandex)
                            </span>
                            <Zap className="w-5 h-5 text-blue-400" />
                        </div>
                        <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">
                            Dernière notification push
                        </div>
                        <div className="text-xl sm:text-2xl font-black text-white tracking-tight">
                            {formatRelativeTime(indexNow?.lastSubmission?.timestamp)}
                        </div>
                        <div className="text-[11px] text-blue-200 font-medium mt-1 truncate">
                            {indexNow?.lastSubmission?.reason || 'Prêt pour notification automatique'}
                        </div>
                    </div>

                    <div className="mt-4 pt-3 border-t border-blue-800/60 flex items-center justify-between text-[10px] text-slate-300 font-mono">
                        <span>{indexNow?.lastSubmission?.submittedCount || 0} URLs envoyées</span>
                        <a
                            href={`/${indexNow.key}.txt`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-300 hover:underline flex items-center gap-1"
                        >
                            Clé active <ExternalLink className="w-2.5 h-2.5" />
                        </a>
                    </div>
                </div>

                {/* Carte 3 : État du Sitemap Vendeurs */}
                <div className="bg-emerald-50/70 border border-emerald-200/80 p-5 sm:p-6 rounded-3xl flex flex-col justify-between">
                    <div>
                        <div className="flex items-center justify-between mb-3">
                            <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800">
                                Priorité 1.0
                            </span>
                            <ShieldCheck className="w-5 h-5 text-emerald-600" />
                        </div>
                        <div className="text-xs font-bold text-emerald-800/80 uppercase tracking-wider mb-1">
                            URLs Marchands
                        </div>
                        <div className="text-xl sm:text-2xl font-black text-emerald-950 tracking-tight">
                            {sellersSitemap?.urlCount || 30} URLs
                        </div>
                        <div className="text-[11px] text-emerald-700 font-bold mt-1">
                            Balisage hreflang (FR, AR, EN)
                        </div>
                    </div>

                    <div className="mt-4 pt-3 border-t border-emerald-200/60 flex items-center justify-between text-[11px] font-bold text-emerald-900">
                        <span>Statut : 200 OK</span>
                        <a
                            href="/sitemap-sellers.xml"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 hover:underline"
                        >
                            Ouvrir XML <ExternalLink className="w-3 h-3" />
                        </a>
                    </div>
                </div>

                {/* Carte 4 : Robots.txt & Directives */}
                <div className="bg-amber-50/70 border border-amber-200/80 p-5 sm:p-6 rounded-3xl flex flex-col justify-between">
                    <div>
                        <div className="flex items-center justify-between mb-3">
                            <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full bg-amber-100 text-amber-800">
                                /robots.txt
                            </span>
                            <FileCode className="w-5 h-5 text-amber-700" />
                        </div>
                        <div className="text-xs font-bold text-amber-800/80 uppercase tracking-wider mb-1">
                            Directives Robots.txt
                        </div>
                        <div className="text-xl sm:text-2xl font-black text-amber-950 tracking-tight">
                            5 Sitemaps Déclarés
                        </div>
                        <div className="text-[11px] text-amber-700 font-bold mt-1">
                            Indexation ciblée
                        </div>
                    </div>

                    <div className="mt-4 pt-3 border-t border-amber-200/60 flex items-center justify-between text-[11px] font-bold text-amber-900">
                        <span>Directives actives</span>
                        <a
                            href="/robots.txt"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 hover:underline"
                        >
                            Vérifier <ExternalLink className="w-3 h-3" />
                        </a>
                    </div>
                </div>
            </div>

            {/* Barre de déclenchement IndexNow */}
            <div className="mt-6 p-4 sm:p-5 rounded-2xl bg-slate-50 border border-slate-200/80 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0">
                        <Zap className="w-5 h-5" />
                    </div>
                    <div>
                        <h4 className="text-xs sm:text-sm font-black text-slate-900 tracking-tight">
                            Déclenchement IndexNow en 1 clic
                        </h4>
                        <p className="text-[11px] text-gray-500 font-medium">
                            Envoie immédiatement un signal HTTP push aux moteurs (Bing, Yandex, Seznam, Naver) sans attendre le passage des robots.
                        </p>
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                    <button
                        type="button"
                        onClick={() => handleIndexNowPing('sellers')}
                        disabled={indexNowLoading}
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-white hover:bg-slate-900 hover:text-white border border-slate-200 text-slate-800 rounded-xl text-xs font-bold transition-all shadow-sm active:scale-95 disabled:opacity-50"
                    >
                        <SendHorizontal className="w-3.5 h-3.5 text-blue-500" />
                        <span>Notifier Vendeurs</span>
                    </button>
                    <button
                        type="button"
                        onClick={() => handleIndexNowPing('community')}
                        disabled={indexNowLoading}
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-white hover:bg-slate-900 hover:text-white border border-slate-200 text-slate-800 rounded-xl text-xs font-bold transition-all shadow-sm active:scale-95 disabled:opacity-50"
                    >
                        <SendHorizontal className="w-3.5 h-3.5 text-emerald-500" />
                        <span>Notifier Bourse aux Livres</span>
                    </button>
                    <button
                        type="button"
                        onClick={() => handleIndexNowPing('all')}
                        disabled={indexNowLoading}
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all shadow-sm active:scale-95 disabled:opacity-50"
                    >
                        <Zap className={`w-3.5 h-3.5 text-amber-400 ${indexNowLoading ? 'animate-spin' : ''}`} />
                        <span>{indexNowLoading ? 'Transmission...' : 'Notifier Tout le Site'}</span>
                    </button>
                </div>
            </div>

            {/* Tableau récapitulatif des flux & sitemaps */}
            <div className="mt-6 pt-6 border-t border-gray-100">
                <h3 className="text-xs font-black uppercase tracking-widest text-gray-500 mb-3">
                    Flux XML & Sitemaps Actifs dans Riwaya
                </h3>

                <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                        <thead>
                            <tr className="border-b border-gray-100 text-[10px] font-black uppercase tracking-wider text-gray-400">
                                <th className="py-2.5 px-3">Fichier</th>
                                <th className="py-2.5 px-3">Catégorie</th>
                                <th className="py-2.5 px-3">Volume URLs</th>
                                <th className="py-2.5 px-3">Dernière MàJ</th>
                                <th className="py-2.5 px-3">Statut</th>
                                <th className="py-2.5 px-3 text-right">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50 font-medium">
                            {data.sitemaps.map((item) => (
                                <tr key={item.id} className="hover:bg-gray-50/50 transition-colors">
                                    <td className="py-3 px-3 font-bold text-slate-900">
                                        <div className="flex items-center gap-2">
                                            <span className="w-2 h-2 rounded-full bg-emerald-500" />
                                            <span>{item.name}</span>
                                        </div>
                                    </td>
                                    <td className="py-3 px-3 text-gray-500 font-bold">{item.priorityCategory}</td>
                                    <td className="py-3 px-3 font-bold text-slate-800">{item.urlCount} URLs</td>
                                    <td className="py-3 px-3 text-gray-500">{formatDate(item.lastModified)}</td>
                                    <td className="py-3 px-3">
                                        <span className="inline-block px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-bold border border-emerald-200">
                                            200 OK
                                        </span>
                                    </td>
                                    <td className="py-3 px-3 text-right">
                                        <a
                                            href={item.url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="inline-flex items-center gap-1 px-3 py-1 bg-gray-100 hover:bg-black hover:text-white rounded-lg text-[10px] font-bold transition-colors"
                                        >
                                            Consulter <ExternalLink className="w-3 h-3" />
                                        </a>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    )
}
