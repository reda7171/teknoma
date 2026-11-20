'use client'

import { useState, useEffect, useTransition } from 'react'
import { 
    Sparkles, 
    Coins, 
    Cpu, 
    Layers, 
    Trash2, 
    RefreshCw, 
    Search, 
    Copy, 
    Check, 
    AlertTriangle, 
    XCircle,
    BookOpen,
    Database
} from 'lucide-react'
import { 
    getCoverCacheStats, 
    purgeCoverCacheItem, 
    clearAllCoverCache,
    preindexCatalogCovers,
    type CoverCacheStats, 
    type CoverCacheEntry 
} from '@/lib/actions/gemini-cache'

export default function GeminiCacheManager() {
    const [stats, setStats] = useState<CoverCacheStats | null>(null)
    const [loading, setLoading] = useState(true)
    const [searchQuery, setSearchQuery] = useState('')
    const [purgingKey, setPurgingKey] = useState<string | null>(null)
    const [copiedKey, setCopiedKey] = useState<string | null>(null)
    const [showConfirmClear, setShowConfirmClear] = useState(false)
    const [isIndexing, setIsIndexing] = useState(false)
    const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null)
    const [isPending, startTransition] = useTransition()

    const loadStats = async () => {
        try {
            setLoading(true)
            const data = await getCoverCacheStats()
            setStats(data)
        } catch {
            showFeedback('error', 'Erreur lors du chargement des statistiques du cache.')
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        loadStats()
    }, [])

    const showFeedback = (type: 'success' | 'error', message: string) => {
        setFeedback({ type, message })
        setTimeout(() => setFeedback(null), 4000)
    }

    const handleCopy = (text: string) => {
        navigator.clipboard.writeText(text)
        setCopiedKey(text)
        setTimeout(() => setCopiedKey(null), 2000)
    }

    const handlePreindexCatalog = () => {
        setIsIndexing(true)
        startTransition(async () => {
            const res = await preindexCatalogCovers()
            if (res.success) {
                showFeedback('success', res.message)
                await loadStats()
            } else {
                showFeedback('error', res.message)
            }
            setIsIndexing(false)
        })
    }

    const handlePurgeItem = (fingerprint: string, title: string) => {
        setPurgingKey(fingerprint)
        startTransition(async () => {
            const res = await purgeCoverCacheItem(fingerprint)
            if (res.success) {
                showFeedback('success', `Entrée "${title}" purgée du cache.`)
                await loadStats()
            } else {
                showFeedback('error', res.message || 'Erreur lors de la purge.')
            }
            setPurgingKey(null)
        })
    }

    const handleClearAll = () => {
        startTransition(async () => {
            const res = await clearAllCoverCache()
            if (res.success) {
                showFeedback('success', 'Tout le cache Gemini a été vidé avec succès.')
                setShowConfirmClear(false)
                await loadStats()
            } else {
                showFeedback('error', res.message || 'Erreur lors de la vidange du cache.')
            }
        })
    }

    const filteredEntries = (stats?.entries || []).filter((entry: CoverCacheEntry) => {
        const query = searchQuery.toLowerCase().trim()
        if (!query) return true
        return (
            entry.title.toLowerCase().includes(query) ||
            (entry.author && entry.author.toLowerCase().includes(query)) ||
            entry.fingerprint.toLowerCase().includes(query)
        )
    })

    return (
        <div className="space-y-6">
            {/* Notification Toast */}
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

            {/* Header & Actions */}
            <div className="bg-white p-6 rounded-2xl border border-gray-200/80 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <div className="flex items-center gap-2.5">
                        <span className="p-2 bg-black text-white rounded-xl">
                            <Sparkles className="w-5 h-5 text-amber-400" />
                        </span>
                        <div>
                            <h2 className="text-xl font-black text-slate-900 tracking-tight">
                                Cache de Reconnaissance Visuelle Gemini
                            </h2>
                            <p className="text-xs font-semibold text-gray-500 mt-0.5">
                                Empreintes cryptographiques SHA-256 stockées pour éviter la consommation répétée de crédits API
                            </p>
                        </div>
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                    <button
                        type="button"
                        onClick={handlePreindexCatalog}
                        disabled={loading || isIndexing || isPending}
                        className="flex items-center gap-2 px-4 py-2.5 bg-black hover:bg-slate-800 text-white font-bold text-xs rounded-xl transition-colors cursor-pointer disabled:opacity-50"
                        title="Pré-calculer et stocker les empreintes SHA-256 de tous les livres et packs du catalogue"
                    >
                        <Database className={`w-3.5 h-3.5 text-amber-400 ${isIndexing ? 'animate-spin' : ''}`} />
                        {isIndexing ? 'Indexation en cours...' : 'Indexer le catalogue'}
                    </button>

                    <button
                        type="button"
                        onClick={loadStats}
                        disabled={loading || isIndexing}
                        className="flex items-center gap-2 px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-slate-800 font-bold text-xs rounded-xl transition-colors cursor-pointer disabled:opacity-50"
                    >
                        <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                        Rafraîchir
                    </button>

                    <button
                        type="button"
                        onClick={() => setShowConfirmClear(true)}
                        disabled={!stats || stats.totalEntries === 0 || loading || isPending || isIndexing}
                        className="flex items-center gap-2 px-4 py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs rounded-xl border border-rose-200 transition-colors cursor-pointer disabled:opacity-50"
                    >
                        <Trash2 className="w-3.5 h-3.5" />
                        Vider tout le cache
                    </button>
                </div>
            </div>

            {/* Cartes KPI d'Économie */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white p-5 rounded-2xl border border-gray-200/80 shadow-sm">
                    <div className="flex items-center justify-between text-gray-400 mb-2">
                        <span className="text-xs font-bold uppercase tracking-wider text-gray-500">Couvertures en Cache</span>
                        <Layers className="w-4 h-4 text-slate-700" />
                    </div>
                    <div className="text-2xl font-black text-slate-900">
                        {loading ? '...' : stats?.totalEntries || 0}
                    </div>
                    <p className="text-[11px] font-medium text-gray-400 mt-1">Empreintes uniques SHA-256</p>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-gray-200/80 shadow-sm">
                    <div className="flex items-center justify-between text-gray-400 mb-2">
                        <span className="text-xs font-bold uppercase tracking-wider text-gray-500">Requêtes Évitées (Hits)</span>
                        <Cpu className="w-4 h-4 text-emerald-600" />
                    </div>
                    <div className="text-2xl font-black text-emerald-600">
                        {loading ? '...' : stats?.totalHits || 0}
                    </div>
                    <p className="text-[11px] font-medium text-gray-400 mt-1">Appels API Gemini évités</p>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-gray-200/80 shadow-sm">
                    <div className="flex items-center justify-between text-gray-400 mb-2">
                        <span className="text-xs font-bold uppercase tracking-wider text-gray-500">Tokens Économisés</span>
                        <Sparkles className="w-4 h-4 text-amber-500" />
                    </div>
                    <div className="text-2xl font-black text-amber-600">
                        {loading ? '...' : (stats?.estimatedTokensSaved || 0).toLocaleString()}
                    </div>
                    <p className="text-[11px] font-medium text-gray-400 mt-1">~1 500 tokens par image évitée</p>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-gray-200/80 shadow-sm">
                    <div className="flex items-center justify-between text-gray-400 mb-2">
                        <span className="text-xs font-bold uppercase tracking-wider text-gray-500">Économie Estimée ($)</span>
                        <Coins className="w-4 h-4 text-blue-600" />
                    </div>
                    <div className="text-2xl font-black text-blue-600">
                        {loading ? '...' : `$${(stats?.estimatedCostSavedUsd || 0).toFixed(4)}`}
                    </div>
                    <p className="text-[11px] font-medium text-gray-400 mt-1">Sur quota API Gemini Pay-as-you-go</p>
                </div>
            </div>

            {/* Recherche & Filtre */}
            <div className="bg-white p-4 rounded-2xl border border-gray-200/80 shadow-sm flex items-center gap-3">
                <Search className="w-4 h-4 text-gray-400 flex-shrink-0" />
                <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Filtrer par titre, auteur ou empreinte hash SHA-256..."
                    className="w-full text-xs font-semibold text-slate-800 placeholder-gray-400 bg-transparent outline-none"
                />
                {searchQuery && (
                    <button
                        type="button"
                        onClick={() => setSearchQuery('')}
                        className="text-xs text-gray-400 hover:text-gray-600 font-bold"
                    >
                        Effacer
                    </button>
                )}
            </div>

            {/* Table des Entrées du Cache */}
            <div className="bg-white rounded-2xl border border-gray-200/80 shadow-sm overflow-hidden">
                <div className="p-4 border-b border-gray-100 flex items-center justify-between">
                    <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider">
                        Couvertures mémorisées ({filteredEntries.length})
                    </h3>
                </div>

                {loading ? (
                    <div className="p-12 text-center text-xs font-bold text-gray-400">
                        Chargement des empreintes en cache...
                    </div>
                ) : filteredEntries.length === 0 ? (
                    <div className="p-12 text-center">
                        <BookOpen className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                        <p className="text-sm font-bold text-gray-500">
                            {searchQuery ? 'Aucun résultat ne correspond à votre recherche.' : 'Aucune couverture en cache actuellement.'}
                        </p>
                        <p className="text-xs text-gray-400 mt-1">
                            Les empreintes seront automatiquement enregistrées dès la première recherche d'un livre par image.
                        </p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse text-xs">
                            <thead>
                                <tr className="bg-gray-50/80 border-b border-gray-100 text-gray-500 font-black uppercase text-[10px] tracking-wider">
                                    <th className="py-3 px-4">Titre Détecté</th>
                                    <th className="py-3 px-4">Auteur</th>
                                    <th className="py-3 px-4">Empreinte SHA-256</th>
                                    <th className="py-3 px-4 text-center">Hits Évités</th>
                                    <th className="py-3 px-4">Date de Sauvegarde</th>
                                    <th className="py-3 px-4 text-right">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 font-medium text-slate-700">
                                {filteredEntries.map((entry: CoverCacheEntry) => (
                                    <tr key={entry.fingerprint} className="hover:bg-gray-50/60 transition-colors">
                                        <td className="py-3 px-4 font-bold text-slate-900">
                                            {entry.title}
                                        </td>
                                        <td className="py-3 px-4 text-gray-600">
                                            {entry.author || '—'}
                                        </td>
                                        <td className="py-3 px-4">
                                            <div className="flex items-center gap-1.5 font-mono text-[11px] text-gray-500">
                                                <span>{entry.fingerprint.substring(0, 12)}...{entry.fingerprint.substring(entry.fingerprint.length - 6)}</span>
                                                <button
                                                    type="button"
                                                    onClick={() => handleCopy(entry.fingerprint)}
                                                    className="p-1 hover:bg-gray-200 rounded text-gray-400 hover:text-gray-700 transition-colors cursor-pointer"
                                                    title="Copier le hash complet"
                                                >
                                                    {copiedKey === entry.fingerprint ? (
                                                        <Check className="w-3 h-3 text-emerald-600" />
                                                    ) : (
                                                        <Copy className="w-3 h-3" />
                                                    )}
                                                </button>
                                            </div>
                                        </td>
                                        <td className="py-3 px-4 text-center">
                                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full font-bold text-[11px] ${
                                                entry.hitCount > 0
                                                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                                    : 'bg-gray-100 text-gray-500'
                                            }`}>
                                                {entry.hitCount} {entry.hitCount === 1 ? 'hit' : 'hits'}
                                            </span>
                                        </td>
                                        <td className="py-3 px-4 text-gray-500 text-[11px]">
                                            {new Date(entry.timestamp).toLocaleString('fr-FR', {
                                                day: '2-digit',
                                                month: '2-digit',
                                                year: 'numeric',
                                                hour: '2-digit',
                                                minute: '2-digit'
                                            })}
                                        </td>
                                        <td className="py-3 px-4 text-right">
                                            <button
                                                type="button"
                                                onClick={() => handlePurgeItem(entry.fingerprint, entry.title)}
                                                disabled={purgingKey === entry.fingerprint || isPending}
                                                className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 hover:text-rose-800 rounded-lg border border-rose-200 transition-colors cursor-pointer disabled:opacity-50"
                                                title="Purger cette entrée du cache"
                                            >
                                                <Trash2 className="w-3.5 h-3.5" />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Modal de Confirmation Personnalisée (Vider tout le cache) */}
            {showConfirmClear && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-fade-in">
                    <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-gray-200">
                        <div className="flex items-center gap-3 text-rose-600 mb-3">
                            <div className="w-10 h-10 rounded-xl bg-rose-100 flex items-center justify-center flex-shrink-0">
                                <AlertTriangle className="w-5 h-5 text-rose-600" />
                            </div>
                            <h3 className="text-base font-black text-slate-900">
                                Vider tout le cache Gemini ?
                            </h3>
                        </div>

                        <p className="text-xs font-semibold text-gray-600 mb-6 leading-relaxed">
                            Cette action supprimera l'intégralité des empreintes d'images stockées. Les prochaines recherches par image solliciteront à nouveau l'API Gemini et consommeront vos crédits.
                        </p>

                        <div className="flex items-center justify-end gap-3">
                            <button
                                type="button"
                                onClick={() => setShowConfirmClear(false)}
                                disabled={isPending}
                                className="px-4 py-2 text-xs font-bold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors cursor-pointer"
                            >
                                Annuler
                            </button>
                            <button
                                type="button"
                                onClick={handleClearAll}
                                disabled={isPending}
                                className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl transition-colors cursor-pointer flex items-center gap-2"
                            >
                                {isPending ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                                Confirmer la purge
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
