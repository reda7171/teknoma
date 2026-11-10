import Link from 'next/link'
import { AlertTriangle, BookOpen, FileText, ExternalLink, CheckCircle2 } from 'lucide-react'

export interface AuditBookIssue {
    id: string
    title: string
    author: string
    language: string
    reasons: string[]
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

export default function CatalogBlogQualityAudit({
    bookIssues,
    postIssues,
    totalBooksChecked,
    totalPostsChecked,
}: CatalogBlogQualityAuditProps) {
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
                <div className="flex items-center gap-3">
                    <span className="px-3.5 py-2 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs font-black">
                        {bookIssues.length} livres à optimiser
                    </span>
                    <span className="px-3.5 py-2 rounded-xl bg-rose-50 border border-rose-200 text-rose-900 text-xs font-black">
                        {postIssues.length} articles à corriger
                    </span>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Livres à optimiser */}
                <div className="bg-gray-50/70 rounded-3xl p-5 border border-gray-100">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-xs font-black uppercase tracking-widest text-black flex items-center gap-2">
                            <BookOpen className="w-4 h-4 text-amber-600" />
                            Top Livres à Enrichir / Nettoyer
                        </h3>
                        <Link href="/fr/admin/books" className="text-[10px] font-black uppercase tracking-wider text-gray-500 hover:text-black">
                            Tout voir
                        </Link>
                    </div>

                    {bookIssues.length === 0 ? (
                        <div className="flex items-center gap-2 text-xs font-bold text-emerald-700 bg-emerald-50 p-4 rounded-2xl border border-emerald-100">
                            <CheckCircle2 className="w-4 h-4 shrink-0" />
                            Aucune anomalie critique détectée sur les livres prioritaires.
                        </div>
                    ) : (
                        <div className="space-y-2.5 max-h-80 overflow-y-auto pr-1">
                            {bookIssues.map((book) => (
                                <div key={book.id} className="bg-white p-3.5 rounded-2xl border border-gray-100 flex items-center justify-between gap-3">
                                    <div className="min-w-0 flex-1">
                                        <p className="text-xs font-black text-black truncate">{book.title}</p>
                                        <p className="text-[10px] font-bold text-gray-500 truncate">{book.author} · {book.language.toUpperCase()}</p>
                                        <div className="flex flex-wrap gap-1 mt-1.5">
                                            {book.reasons.map((reason, idx) => (
                                                <span key={idx} className="px-2 py-0.5 rounded-md bg-amber-50 text-amber-800 border border-amber-200 text-[9px] font-black">
                                                    {reason}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                    <Link
                                        href={`/fr/admin/books/${book.id}/edit`}
                                        className="shrink-0 inline-flex items-center gap-1 px-3 py-1.5 bg-black text-white rounded-xl text-[10px] font-black uppercase tracking-wider hover:bg-gray-800"
                                    >
                                        Éditer
                                        <ExternalLink className="w-3 h-3" />
                                    </Link>
                                </div>
                            ))}
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

