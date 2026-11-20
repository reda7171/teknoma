'use client'

import { useState } from 'react'
import { Check, X, Eye, Clock, CheckCircle, BookOpen } from 'lucide-react'

interface Post {
    id: string
    title: string
    excerpt: string | null
    content: string
    published: boolean
    createdAt: Date
    category: string | null
    coverImage: string | null
    author: { fullName: string | null; email: string }
}

export default function SellerPostsApprovalClient({ posts: initial }: { posts: Post[] }) {
    const [posts, setPosts] = useState(initial)
    const [loadingId, setLoadingId] = useState<string | null>(null)
    const [previewPost, setPreviewPost] = useState<Post | null>(null)

    const handleApprove = async (id: string) => {
        setLoadingId(id)
        const res = await fetch(`/api/admin/seller-posts/${id}/approve`, { method: 'POST' })
        if (res.ok) {
            setPosts(prev => prev.filter(p => p.id !== id))
        } else {
            alert('Erreur lors de l\'approbation.')
        }
        setLoadingId(null)
    }

    const handleReject = async (id: string) => {
        if (!confirm('Rejeter et supprimer cet article ?')) return
        setLoadingId(id)
        const res = await fetch(`/api/admin/seller-posts/${id}/reject`, { method: 'DELETE' })
        if (res.ok) {
            setPosts(prev => prev.filter(p => p.id !== id))
        } else {
            alert('Erreur lors du rejet.')
        }
        setLoadingId(null)
    }

    if (posts.length === 0) {
        return (
            <div className="bg-white rounded-2xl border border-gray-200 p-16 text-center flex flex-col items-center gap-4">
                <CheckCircle className="w-16 h-16 text-green-200" />
                <div>
                    <p className="font-bold text-gray-900 text-lg">Tout est approuvé !</p>
                    <p className="text-gray-500 text-sm mt-1">Aucun article en attente de modération.</p>
                </div>
            </div>
        )
    }

    return (
        <>
            <div className="space-y-4">
                {posts.map(post => (
                    <div key={post.id} className="bg-white rounded-2xl border border-gray-200 p-6 flex flex-col md:flex-row items-start gap-4 hover:border-gray-300 transition-colors">
                        {/* Cover */}
                        {post.coverImage ? (
                            <img src={post.coverImage} alt={post.title} className="w-16 h-16 object-cover rounded-xl shrink-0" />
                        ) : (
                            <div className="w-16 h-16 bg-gray-50 rounded-xl flex items-center justify-center shrink-0">
                                <BookOpen className="w-7 h-7 text-gray-300" />
                            </div>
                        )}

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-orange-100 text-orange-700 text-[10px] font-black uppercase tracking-widest rounded">
                                    <Clock className="w-3 h-3" /> En attente
                                </span>
                                {post.category && <span className="text-[10px] font-bold text-gray-400 uppercase">{post.category}</span>}
                            </div>
                            <h3 className="font-bold text-gray-900 text-base leading-tight">{post.title}</h3>
                            <p className="text-sm text-gray-500 mt-1 line-clamp-2">{post.excerpt}</p>
                            <div className="flex items-center gap-4 mt-2 text-xs text-gray-400 font-medium">
                                <span>Par : <strong>{post.author.fullName || post.author.email}</strong></span>
                                <span>{new Date(post.createdAt).toLocaleDateString('fr-FR')}</span>
                                <span>{Math.round(post.content.length / 5)} mots (~)</span>
                            </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-2 shrink-0">
                            <button
                                onClick={() => setPreviewPost(post)}
                                className="p-2.5 bg-gray-50 text-gray-600 rounded-xl hover:bg-gray-200 transition-colors border border-gray-200"
                                title="Prévisualiser"
                            >
                                <Eye className="w-4 h-4" />
                            </button>
                            <button
                                onClick={() => handleApprove(post.id)}
                                disabled={loadingId === post.id}
                                className="p-2.5 bg-green-50 text-green-600 rounded-xl hover:bg-green-600 hover:text-white transition-colors border border-green-200 disabled:opacity-50"
                                title="Approuver"
                            >
                                <Check className="w-4 h-4" />
                            </button>
                            <button
                                onClick={() => handleReject(post.id)}
                                disabled={loadingId === post.id}
                                className="p-2.5 bg-red-50 text-red-600 rounded-xl hover:bg-red-600 hover:text-white transition-colors border border-red-200 disabled:opacity-50"
                                title="Rejeter"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                ))}
            </div>

            {/* Modal Prévisualisation */}
            {previewPost && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                    <div className="bg-white rounded-3xl w-full max-w-3xl max-h-[90vh] overflow-y-auto shadow-2xl">
                        <div className="sticky top-0 bg-white border-b border-gray-100 px-8 py-4 flex items-center justify-between">
                            <span className="font-black uppercase tracking-tight text-sm">Prévisualisation</span>
                            <div className="flex gap-2">
                                <button onClick={() => { handleApprove(previewPost.id); setPreviewPost(null) }} className="px-4 py-2 bg-green-600 text-white text-xs font-black uppercase rounded-xl hover:bg-green-700 flex items-center gap-2">
                                    <Check className="w-3 h-3" /> Approuver
                                </button>
                                <button onClick={() => { handleReject(previewPost.id); setPreviewPost(null) }} className="px-4 py-2 bg-red-600 text-white text-xs font-black uppercase rounded-xl hover:bg-red-700 flex items-center gap-2">
                                    <X className="w-3 h-3" /> Rejeter
                                </button>
                                <button onClick={() => setPreviewPost(null)} className="px-4 py-2 bg-gray-100 text-gray-600 text-xs font-black uppercase rounded-xl hover:bg-gray-200">
                                    Fermer
                                </button>
                            </div>
                        </div>
                        <div className="p-8 space-y-6">
                            {previewPost.coverImage && <img src={previewPost.coverImage} alt={previewPost.title} className="w-full h-56 object-cover rounded-2xl" />}
                            <h1 className="text-3xl font-black text-black leading-tight">{previewPost.title}</h1>
                            {previewPost.excerpt && <p className="text-gray-500 italic font-medium">{previewPost.excerpt}</p>}
                            <div className="prose prose-sm max-w-none text-gray-700 whitespace-pre-wrap leading-relaxed border-t border-gray-100 pt-6">
                                {previewPost.content}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </>
    )
}
