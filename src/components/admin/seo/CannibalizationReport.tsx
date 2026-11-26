'use client'

import { useState, useEffect } from 'react'
import { analyzeSeoCannibalization, CannibalizationIssue } from '@/lib/actions/seo-analysis'
import { AlertTriangle, ExternalLink, RefreshCw, Book, Package, FileText, Folder } from 'lucide-react'
import Link from 'next/link'

export default function CannibalizationReport() {
    const [issues, setIssues] = useState<CannibalizationIssue[]>([])
    const [loading, setLoading] = useState(true)

    const fetchIssues = async () => {
        setLoading(true)
        try {
            const data = await analyzeSeoCannibalization()
            setIssues(data)
        } catch (error) {
            console.error('Failed to analyze SEO cannibalization', error)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchIssues()
    }, [])

    const getIcon = (type: string) => {
        switch (type) {
            case 'BOOK': return <Book className="w-4 h-4 text-blue-500" />
            case 'PACK': return <Package className="w-4 h-4 text-purple-500" />
            case 'POST': return <FileText className="w-4 h-4 text-green-500" />
            case 'CATEGORY': return <Folder className="w-4 h-4 text-orange-500" />
            default: return null
        }
    }

    return (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between">
                <div>
                    <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                        <AlertTriangle className="w-6 h-6 text-red-500" />
                        Cannibalisation SEO
                    </h2>
                    <p className="text-sm text-gray-500 mt-1">
                        Détection automatique des pages qui se concurrencent sur les mêmes mots-clés.
                    </p>
                </div>
                <button
                    onClick={fetchIssues}
                    disabled={loading}
                    className="flex items-center gap-2 px-4 py-2 bg-gray-50 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors disabled:opacity-50"
                >
                    <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                    Analyser
                </button>
            </div>

            <div className="p-6">
                {loading ? (
                    <div className="space-y-4">
                        {[1, 2, 3].map((i) => (
                            <div key={i} className="animate-pulse bg-gray-50 h-24 rounded-xl"></div>
                        ))}
                    </div>
                ) : issues.length === 0 ? (
                    <div className="text-center py-12">
                        <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-4">
                            <AlertTriangle className="w-8 h-8 text-green-500" />
                        </div>
                        <h3 className="text-lg font-bold text-gray-900">Aucun conflit détecté !</h3>
                        <p className="text-gray-500 mt-2">Votre architecture SEO est propre.</p>
                    </div>
                ) : (
                    <div className="space-y-6">
                        {issues.map((issue, idx) => (
                            <div key={idx} className="border border-red-100 rounded-xl p-4 bg-red-50/30">
                                <h3 className="text-lg font-bold text-red-900 mb-4 flex items-center gap-2">
                                    Mot-clé en conflit : <span className="px-3 py-1 bg-red-100 text-red-700 rounded-lg text-sm">{issue.keyword}</span>
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {issue.entities.map((entity, eIdx) => (
                                        <div key={eIdx} className="bg-white p-4 rounded-lg border border-gray-100 shadow-sm flex flex-col justify-between">
                                            <div>
                                                <div className="flex items-center gap-2 text-xs font-bold text-gray-500 mb-2">
                                                    {getIcon(entity.type)}
                                                    {entity.type}
                                                </div>
                                                <p className="font-semibold text-gray-900 truncate" title={entity.title}>
                                                    {entity.title}
                                                </p>
                                            </div>
                                            <div className="mt-4 flex items-center gap-2">
                                                <Link
                                                    href={entity.url}
                                                    target="_blank"
                                                    className="text-xs text-blue-600 hover:underline flex items-center gap-1"
                                                >
                                                    <ExternalLink className="w-3 h-3" /> Voir la page
                                                </Link>
                                                {/* Lien vers l'édition selon le type */}
                                                {entity.type === 'BOOK' && (
                                                    <Link href={`/admin/products/${entity.id}/edit`} className="text-xs bg-gray-100 px-2 py-1 rounded hover:bg-gray-200 ml-auto">Éditer SEO</Link>
                                                )}
                                                {entity.type === 'PACK' && (
                                                    <Link href={`/admin/packs/${entity.id}/edit`} className="text-xs bg-gray-100 px-2 py-1 rounded hover:bg-gray-200 ml-auto">Éditer SEO</Link>
                                                )}
                                                {entity.type === 'POST' && (
                                                    <Link href={`/admin/posts/${entity.id}`} className="text-xs bg-gray-100 px-2 py-1 rounded hover:bg-gray-200 ml-auto">Éditer SEO</Link>
                                                )}
                                                {entity.type === 'CATEGORY' && (
                                                    <Link href={`/admin/seo-categories/${entity.id}`} className="text-xs bg-gray-100 px-2 py-1 rounded hover:bg-gray-200 ml-auto">Éditer SEO</Link>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    )
}
