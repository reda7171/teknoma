'use client'

import { useState } from 'react'
import { User, Clock, ExternalLink, Check, Trash2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { approveComment, deleteComment, deleteComments } from '@/lib/actions/comments'

interface CommentProps {
    id: string
    content: string
    isApproved: boolean
    createdAt: Date
    authorName?: string
    user?: {
        fullName: string
        email: string
    }
    post: {
        title: string
        slug: string
    }
}

export default function CommentsTable({ comments }: { comments: CommentProps[] }) {
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
    const [isDeleting, setIsDeleting] = useState(false)
    const router = useRouter()

    const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.checked) {
            setSelectedIds(new Set(comments.map(c => c.id)))
        } else {
            setSelectedIds(new Set())
        }
    }

    const handleSelect = (id: string, checked: boolean) => {
        const newSelected = new Set(selectedIds)
        if (checked) {
            newSelected.add(id)
        } else {
            newSelected.delete(id)
        }
        setSelectedIds(newSelected)
    }

    const handleBulkDelete = async () => {
        if (selectedIds.size === 0) return
        if (!confirm(`Êtes-vous sûr de vouloir supprimer ${selectedIds.size} commentaire(s) ?`)) return

        setIsDeleting(true)
        const res = await deleteComments(Array.from(selectedIds))
        setIsDeleting(false)

        if (res.success) {
            setSelectedIds(new Set())
            router.refresh()
        } else {
            alert(res.error)
        }
    }

    return (
        <div className="space-y-4">
            {selectedIds.size > 0 && (
                <div className="flex items-center justify-between bg-blue-50 border border-blue-100 rounded-xl p-4">
                    <span className="text-sm font-bold text-blue-800">
                        {selectedIds.size} commentaire(s) sélectionné(s)
                    </span>
                    <button
                        onClick={handleBulkDelete}
                        disabled={isDeleting}
                        className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg text-xs font-black uppercase tracking-wider hover:bg-red-700 transition-colors disabled:opacity-50"
                    >
                        <Trash2 className="w-4 h-4" />
                        {isDeleting ? 'Suppression...' : 'Supprimer'}
                    </button>
                </div>
            )}

            <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-gray-50/50 border-b border-gray-100">
                            <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-gray-400 w-12">
                                <input
                                    type="checkbox"
                                    checked={comments.length > 0 && selectedIds.size === comments.length}
                                    onChange={handleSelectAll}
                                    className="w-4 h-4 rounded border-gray-300 text-black focus:ring-black cursor-pointer"
                                />
                            </th>
                            <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-gray-400">Auteur</th>
                            <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-gray-400">Commentaire</th>
                            <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-gray-400">Article</th>
                            <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-gray-400">Statut</th>
                            <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-gray-400 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                        {comments.length === 0 ? (
                            <tr>
                                <td colSpan={6} className="px-6 py-20 text-center text-gray-400 font-medium">
                                    Aucun commentaire trouvé.
                                </td>
                            </tr>
                        ) : (
                            comments.map((comment) => (
                                <tr key={comment.id} className={`hover:bg-gray-50/50 transition-colors ${selectedIds.has(comment.id) ? 'bg-gray-50/50' : ''}`}>
                                    <td className="px-6 py-5">
                                        <input
                                            type="checkbox"
                                            checked={selectedIds.has(comment.id)}
                                            onChange={(e) => handleSelect(comment.id, e.target.checked)}
                                            className="w-4 h-4 rounded border-gray-300 text-black focus:ring-black cursor-pointer"
                                        />
                                    </td>
                                    <td className="px-6 py-5">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 bg-pixio-cream rounded-full flex items-center justify-center">
                                                <User className="w-4 h-4 text-black" />
                                            </div>
                                            <div>
                                                <p className="text-sm font-black text-black">
                                                    {comment.user?.fullName || comment.authorName || 'Anonyme'}
                                                </p>
                                                <p className="text-[10px] font-bold text-gray-400">
                                                    {comment.user?.email || 'Visiteur'}
                                                </p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-5">
                                        <p className="text-sm text-gray-600 line-clamp-2 max-w-md font-medium italic">
                                            "{comment.content}"
                                        </p>
                                        <p className="text-[10px] text-gray-400 mt-1 font-bold flex items-center gap-1">
                                            <Clock className="w-3 h-3" />
                                            {new Date(comment.createdAt).toLocaleString('fr-FR')}
                                        </p>
                                    </td>
                                    <td className="px-6 py-5">
                                        <a 
                                            href={`/blog/${comment.post.slug}`} 
                                            target="_blank"
                                            rel="noreferrer"
                                            className="inline-flex items-center gap-2 text-xs font-black text-blue-600 hover:underline"
                                        >
                                            {comment.post.title}
                                            <ExternalLink className="w-3 h-3" />
                                        </a>
                                    </td>
                                    <td className="px-6 py-5">
                                        {comment.isApproved ? (
                                            <span className="inline-flex items-center px-2.5 py-1 bg-green-50 text-green-700 text-[10px] font-black uppercase rounded-full border border-green-100">
                                                Approuvé
                                            </span>
                                        ) : (
                                            <span className="inline-flex items-center px-2.5 py-1 bg-amber-50 text-amber-700 text-[10px] font-black uppercase rounded-full border border-amber-100">
                                                En attente
                                            </span>
                                        )}
                                    </td>
                                    <td className="px-6 py-5 text-right">
                                        <div className="flex items-center justify-end gap-2">
                                            {!comment.isApproved && (
                                                <button
                                                    onClick={async () => {
                                                        await approveComment(comment.id)
                                                        router.refresh()
                                                    }}
                                                    className="p-2 bg-green-500 text-white rounded-xl hover:bg-green-600 transition-colors shadow-lg shadow-green-500/20"
                                                >
                                                    <Check className="w-4 h-4" />
                                                </button>
                                            )}
                                            <button
                                                onClick={async () => {
                                                    if (confirm('Voulez-vous supprimer ce commentaire ?')) {
                                                        await deleteComment(comment.id)
                                                        router.refresh()
                                                    }
                                                }}
                                                className="p-2 bg-red-500 text-white rounded-xl hover:bg-red-600 transition-colors shadow-lg shadow-red-500/20"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    )
}
