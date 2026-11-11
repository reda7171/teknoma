'use client'

import { useState, useMemo, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
    AlertTriangle,
    BookOpen,
    FileText,
    ExternalLink,
    CheckCircle2,
    Sparkles,
    Filter,
    Loader2,
} from 'lucide-react'

export interface AuditBookIssue {
    id: string
    title: string
    author: string
    language: string
    reasons: string[]
    descriptionLength?: number
    isShortDescription?: boolean
}

export interface AuditPostIssue {
    id: string
    title: string
    slug: string
    language: string
    reasons: string[]
}

interface CatalogBlogQualityAuditProps {
    bookIssues: AuditBookIssue[]
    postIssues: AuditPostIssue[]
    totalBooksChecked: number
    totalPostsChecked: number
}

type BookIssueFilter = 'ALL' | 'SHORT_DESC' | 'MISSING_ISBN' | 'DUPLICATE'

const SHORT_DESC_REASON = 'Description < 150 car.'
const MISSING_ISBN_REASON = 'ISBN manquant'
const DUPLICATE_REASON = 'Titre en doublon'

export default function CatalogBlogQualityAudit({
    bookIssues,
    postIssues,
    totalBooksChecked,
    totalPostsChecked,
}: CatalogBlogQualityAuditProps) {
    const router = useRouter()
    const [booksList, setBooksList] = useState<AuditBookIssue[]>(bookIssues)
    const [bookFilter, setBookFilter] = useState<BookIssueFilter>('ALL')
    const [enrichingIds, setEnrichingIds] = useState<string[]>([])
    const [isBatchEnriching, setIsBatchEnriching] = useState(false)
    const [enrichBanner, setEnrichBanner] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

    useEffect(() => {
        setBooksList(bookIssues)
    }, [bookIssues])

    const isShortBook = (book: AuditBookIssue) =>
        Boolean(book.isShortDescription || book.reasons.includes(SHORT_DESC_REASON))

    const shortBooks = useMemo(() => booksList.filter(isShortBook), [booksList])
    const isbnCount = useMemo(
        () => booksList.filter((b) => b.reasons.includes(MISSING_ISBN_REASON)).length,
        [booksList]
    )
    const dupCount = useMemo(
        () => booksList.filter((b) => b.reasons.includes(DUPLICATE_REASON)).length,
        [booksList]
    )

    const filteredBooks = useMemo(() => {
        if (bookFilter === 'SHORT_DESC') return booksList.filter(isShortBook)
        if (bookFilter === 'MISSING_ISBN') return booksList.filter((b) => b.reasons.includes(MISSING_ISBN_REASON))
        if (bookFilter === 'DUPLICATE') return booksList.filter((b) => b.reasons.includes(DUPLICATE_REASON))
        return booksList
    }, [booksList, bookFilter])

    const applyEnrichmentResults = (enriched: Array<{ bookId: string; descriptionLength: number }>) => {
        if (!enriched.length) return
        const enrichedMap = new Map(enriched.map((item) => [item.bookId, item.descriptionLength]))

        setBooksList((prev) =>
            prev
                .map((b) => {
                    if (!enrichedMap.has(b.id)) return b
                    const nextReasons = b.reasons.filter((r) => r !== SHORT_DESC_REASON)
                    return {
                        ...b,
                        reasons: nextReasons,
                        descriptionLength: enrichedMap.get(b.id),
                        isShortDescription: false,
                    }
                })
                .filter((b) => b.reasons.length > 0)
        )
    }

    const handleEnrichBooks = async (targetIds: string[], isBatch = false) => {
        if (targetIds.length === 0) return
        setEnrichBanner(null)
        if (isBatch) setIsBatchEnriching(true)
        setEnrichingIds(targetIds)

        try {
            const res = await fetch('/api/admin/books/enrich-seo', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ bookIds: targetIds.slice(0, 5) }),
            })
            const data = await res.json()

            if (!res.ok) {
                setEnrichBanner({
                    type: 'error',
                    text: data.error || 'Échec lors de l\'enrichissement IA.',
                })
                return
            }

            const enrichedCount = Array.isArray(data.enriched) ? data.enriched.length : 0
            const failedCount = Array.isArray(data.failed) ? data.failed.length : 0

            if (enrichedCount > 0) {
                applyEnrichmentResults(data.enriched)
                setEnrichBanner({
                    type: 'success',
                    text: `${enrichedCount} fiche${enrichedCount > 1 ? 's' : ''} enrichie${enrichedCount > 1 ? 's' : ''} automatiquement via IA SEO${failedCount > 0 ? ` (${failedCount} ignorée${failedCount > 1 ? 's' : ''})` : ''}.`,
                })
                router.refresh()
            } else {
                setEnrichBanner({
                    type: 'error',
                    text: data.failed?.[0]?.error || 'Aucune fiche n\'a pu être enrichie.',
                })
            }
        } catch {
            setEnrichBanner({
                type: 'error',
                text: 'Erreur réseau lors de la requête d\'enrichissement IA.',
            })
        } finally {
            setIsBatchEnriching(false)
            setEnrichingIds([])
        }
    }

    return (
        <div className="bg-white rounded-[3rem] border border-gray-100 shadow-xl shadow-black/5 p-6 sm:p-8 md:p-10 space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-100 pb-5">
                <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-600 mb-1">
                        Audit Qualité SEO & Contenu
                    </p>
                    <h2 className="text-2xl font-black text-black tracking-tight">
                        Anomalies prioritaires Catalogue & Blog
                    </h2>
                    <p className="text-xs font-bold text-gray-500 mt-1">
                        Analyse sur {totalBooksChecked} livres actifs et {totalPostsChecked} articles publiés (descriptions courtes, ISBN manquants, doublons, articles sans lien produit)
                    </p>
                </div>
                <div className="flex items-center gap-3 flex-wrap">
                    <span className="px-3.5 py-2 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs font-black">
                        {booksList.length} livres à optimiser
                    </span>
                    <span className="px-3.5 py-2 rounded-xl bg-rose-50 border border-rose-200 text-rose-900 text-xs font-black">
                        {postIssues.length} articles à corriger
                    </span>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Livres à optimiser avec filtre & enrichissement IA */}
                <div className="bg-gray-50/70 rounded-3xl p-5 border border-gray-100 flex flex-col gap-3.5">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                        <h3 className="text-xs font-black uppercase tracking-widest text-black flex items-center gap-2">
                            <BookOpen className="w-4 h-4 text-amber-600" />
                            Top Livres à Enrichir / Nettoyer
                        </h3>
                        <div className="flex items-center gap-2 flex-wrap">
                            {shortBooks.length > 0 && (
                                <button
                                    type="button"
                                    disabled={isBatchEnriching || enrichingIds.length > 0}
                                    onClick={() => {
                                        setBookFilter('SHORT_DESC')
                                        handleEnrichBooks(shortBooks.slice(0, 5).map((b) => b.id), true)
                                    }}
                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-black uppercase tracking-wider transition-all disabled:opacity-50"
                                >
                                    {isBatchEnriching ? (
                                        <Loader2 className="w-3 h-3 animate-spin" />
                                    ) : (
                                        <Sparkles className="w-3 h-3" />
                                    )}
                                    {isBatchEnriching
                                        ? 'Enrichissement IA...'
                                        : `Enrichir IA (${Math.min(5, shortBooks.length)}/${shortBooks.length} courtes)`}
                                </button>
                            )}
                            <Link href="/fr/admin/books" className="text-[10px] font-black uppercase tracking-wider text-gray-500 hover:text-black">
                                Tout voir
                            </Link>
                        </div>
                    </div>

                    {/* Filtres rapides anomalies livres */}
                    {booksList.length > 0 && (
                        <div className="flex items-center gap-1.5 flex-wrap">
                            <Filter className="w-3.5 h-3.5 text-gray-500 mr-0.5 shrink-0" />
                            {[
                                { key: 'ALL' as const, label: `Tous (${booksList.length})` },
                                { key: 'SHORT_DESC' as const, label: `Fiches courtes IA (${shortBooks.length})` },
                                { key: 'MISSING_ISBN' as const, label: `ISBN (${isbnCount})` },
                                { key: 'DUPLICATE' as const, label: `Doublons (${dupCount})` },
                            ].map((pill) => (
                                <button
                                    key={pill.key}
                                    type="button"
                                    onClick={() => setBookFilter(pill.key)}
                                    className={`px-2.5 py-1 rounded-xl text-[10px] font-black transition-all border ${
                                        bookFilter === pill.key
                                            ? 'bg-black text-white border-black'
                                            : 'bg-white text-gray-700 border-gray-200 hover:border-gray-300'
                                    }`}
                                >
                                    {pill.label}
                                </button>
                            ))}
                        </div>
                    )}

                    {enrichBanner && (
                        <div
                            className={`px-3.5 py-2.5 rounded-2xl text-xs font-bold border ${
                                enrichBanner.type === 'success'
                                    ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                    : 'bg-rose-50 text-rose-800 border-rose-200'
                            }`}
                        >
                            {enrichBanner.text}
                        </div>
                    )}

                    {filteredBooks.length === 0 ? (
                        <div className="flex items-center gap-2 text-xs font-bold text-emerald-700 bg-emerald-50 p-4 rounded-2xl border border-emerald-100">
                            <CheckCircle2 className="w-4 h-4 shrink-0" />
                            Aucune anomalie pour ce filtre sur les livres prioritaires.
                        </div>
                    ) : (
                        <div className="space-y-2.5 max-h-80 overflow-y-auto pr-1">
                            {filteredBooks.map((book) => {
                                const canAiEnrich = isShortBook(book)
                                const isLoadingBook = enrichingIds.includes(book.id)

                                return (
                                    <div key={book.id} className="bg-white p-3.5 rounded-2xl border border-gray-100 flex items-center justify-between gap-3">
                                        <div className="min-w-0 flex-1">
                                            <p className="text-xs font-black text-black truncate">{book.title}</p>
                                            <p className="text-[10px] font-bold text-gray-500 truncate">
                                                {book.author} · {book.language.toUpperCase()}
                                                {typeof book.descriptionLength === 'number' ? ` · ${book.descriptionLength} car.` : ''}
                                            </p>
                                            <div className="flex flex-wrap gap-1 mt-1.5">
                                                {book.reasons.map((reason, idx) => (
                                                    <span key={idx} className="px-2 py-0.5 rounded-md bg-amber-50 text-amber-800 border border-amber-200 text-[9px] font-black">
                                                        {reason}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-1.5 shrink-0">
                                            {canAiEnrich && (
                                                <button
                                                    type="button"
                                                    disabled={enrichingIds.length > 0 || isBatchEnriching}
                                                    onClick={() => handleEnrichBooks([book.id], false)}
                                                    className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-amber-500 hover:bg-amber-600 text-black rounded-xl text-[10px] font-black uppercase tracking-wider transition-all disabled:opacity-50"
                                                    title="Générer une description SEO complète avec Gemini"
                                                >
                                                    {isLoadingBook ? (
                                                        <Loader2 className="w-3 h-3 animate-spin" />
                                                    ) : (
                                                        <Sparkles className="w-3 h-3" />
                                                    )}
                                                    Enrichir IA
                                                </button>
                                            )}
                                            <Link
                                                href={`/fr/admin/books/${book.id}/edit`}
                                                className="inline-flex items-center gap-1 px-3 py-1.5 bg-black text-white rounded-xl text-[10px] font-black uppercase tracking-wider hover:bg-gray-800"
                                            >
                                                Éditer
                                                <ExternalLink className="w-3 h-3" />
                                            </Link>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    )}
                </div>

                {/* Articles de blog à corriger */}
                <div className="bg-gray-50/70 rounded-3xl p-5 border border-gray-100">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-xs font-black uppercase tracking-widest text-black flex items-center gap-2">
                            <FileText className="w-4 h-4 text-rose-600" />
                            Articles Blog à Corriger / Lier
                        </h3>
                        <Link href="/fr/admin/posts" className="text-[10px] font-black uppercase tracking-wider text-gray-500 hover:text-black">
                            Tout voir
                        </Link>
                    </div>

                    {postIssues.length === 0 ? (
                        <div className="flex items-center gap-2 text-xs font-bold text-emerald-700 bg-emerald-50 p-4 rounded-2xl border border-emerald-100">
                            <CheckCircle2 className="w-4 h-4 shrink-0" />
                            Tous les articles analysés sont liés et cohérents.
                        </div>
                    ) : (
                        <div className="space-y-2.5 max-h-80 overflow-y-auto pr-1">
                            {postIssues.map((post) => (
                                <div key={post.id} className="bg-white p-3.5 rounded-2xl border border-gray-100 flex items-center justify-between gap-3">
                                    <div className="min-w-0 flex-1">
                                        <p className="text-xs font-black text-black truncate">{post.title}</p>
                                        <p className="text-[10px] font-mono text-gray-500 truncate">/{post.language}/blog/{post.slug}</p>
                                        <div className="flex flex-wrap gap-1 mt-1.5">
                                            {post.reasons.map((reason, idx) => (
                                                <span key={idx} className="px-2 py-0.5 rounded-md bg-rose-50 text-rose-800 border border-rose-200 text-[9px] font-black flex items-center gap-1">
                                                    <AlertTriangle className="w-2.5 h-2.5 shrink-0" />
                                                    {reason}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                    <Link
                                        href={`/fr/admin/posts/${post.id}`}
                                        className="shrink-0 inline-flex items-center gap-1 px-3 py-1.5 bg-black text-white rounded-xl text-[10px] font-black uppercase tracking-wider hover:bg-gray-800"
                                    >
                                        Corriger
                                        <ExternalLink className="w-3 h-3" />
                                    </Link>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
