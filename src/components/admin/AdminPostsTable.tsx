'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Edit, FileText, User, ExternalLink, Trash2, Copy, Check, X, Loader2 } from 'lucide-react'
import DeletePostButton from '@/components/admin/DeletePostButton'
import ShareToN8nButton from '@/components/admin/ShareToN8nButton'
import { deletePostsBulk, updatePost } from '@/lib/actions/blog'
import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { ArrowUp, ArrowDown } from 'lucide-react'

interface AdminPostsTableProps {
    posts: any[]
    locale: string
    adminUsers?: { id: string; fullName: string }[]
}

export default function AdminPostsTable({ posts, locale, adminUsers = [] }: AdminPostsTableProps) {
    const router = useRouter()
    const searchParams = useSearchParams()
    const pathname = usePathname()
    const [selectedIds, setSelectedIds] = useState<string[]>([])
    const [isDeleting, setIsDeleting] = useState(false)
    const [isCopied, setIsCopied] = useState(false)
    const [editingAuthorId, setEditingAuthorId] = useState<string | null>(null)
    const [selectedUserId, setSelectedUserId] = useState<string>('')
    const [isUpdatingAuthor, setIsUpdatingAuthor] = useState(false)

    const handleUpdateAuthor = async (id: string) => {
        setIsUpdatingAuthor(true)
        try {
            const res = await updatePost(id, { 
                authorId: selectedUserId || null,
                authorName: ''
            })
            if (res.success) {
                setEditingAuthorId(null)
                router.refresh()
            } else {
                alert(res.error || 'Erreur')
            }
        } catch (error) {
            alert('Erreur lors de la modification')
        } finally {
            setIsUpdatingAuthor(false)
        }
    }

    const currentSort = searchParams.get('sort') || 'newest'

    const handleSort = (column: string) => {
        const params = new URLSearchParams(searchParams.toString())
        let newSort = ''
        if (column === 'seo') {
            newSort = currentSort === 'seo_desc' ? 'seo_asc' : 'seo_desc'
        } else if (column === 'status') {
            newSort = currentSort === 'status_desc' ? 'status_asc' : 'status_desc'
        } else if (column === 'views') {
            newSort = currentSort === 'views_desc' ? 'views_asc' : 'views_desc'
        }
        params.set('sort', newSort)
        router.push(`${pathname}?${params.toString()}`)
    }

    const SortIcon = ({ column }: { column: string }) => {
        if (currentSort === `${column}_asc`) return <ArrowUp className="w-3 h-3 ml-1 inline" />
        if (currentSort === `${column}_desc`) return <ArrowDown className="w-3 h-3 ml-1 inline" />
        return null
    }

    const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.checked) {
            setSelectedIds(posts.map(post => post.id))
        } else {
            setSelectedIds([])
        }
    }

    const handleSelect = (id: string) => {
        setSelectedIds(prev =>
            prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
        )
    }

    const handleBulkDelete = async () => {
        if (!confirm(`Êtes-vous sûr de vouloir supprimer ces ${selectedIds.length} articles ?`)) return

        setIsDeleting(true)
        try {
            const res = await deletePostsBulk(selectedIds)
            if (res.success) {
                setSelectedIds([])
                router.refresh()
            } else {
                alert(res.error || 'Erreur lors de la suppression')
            }
        } catch (error) {
            alert('Erreur lors de la suppression')
        } finally {
            setIsDeleting(false)
        }
    }

    const handleBulkCopyLinks = () => {
        const selectedPosts = posts.filter(p => selectedIds.includes(p.id))
        const links = selectedPosts.map(p => `${window.location.origin}/${locale}/blog/${p.slug}`)
        navigator.clipboard.writeText(links.join('\\n')).then(() => {
            setIsCopied(true)
            setTimeout(() => setIsCopied(false), 2000)
        })
    }

    return (
        <div className="bg-white rounded-[3rem] border border-gray-100 shadow-xl shadow-black/5 overflow-hidden">
            {selectedIds.length > 0 && (
                <div className="bg-blue-50 px-8 py-4 flex items-center justify-between border-b border-blue-100">
                    <span className="text-sm font-bold text-blue-600">
                        {selectedIds.length} article(s) sélectionné(s)
                    </span>
                    <div className="flex items-center gap-3">
                        <button
                            onClick={handleBulkCopyLinks}
                            className="bg-black text-white px-6 py-2 rounded-full text-[10px] font-black uppercase tracking-widest hover:bg-gray-800 transition-all flex items-center gap-2"
                        >
                            {isCopied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                            {isCopied ? 'Copié !' : 'Copier les liens'}
                        </button>
                        <button
                            onClick={handleBulkDelete}
                            disabled={isDeleting}
                            className="bg-red-600 text-white px-6 py-2 rounded-full text-[10px] font-black uppercase tracking-widest hover:bg-red-700 transition-all flex items-center gap-2 disabled:opacity-50"
                        >
                            <Trash2 className="w-3 h-3" />
                            {isDeleting ? 'Suppression...' : 'Supprimer'}
                        </button>
                    </div>
                </div>
            )}

            <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                    <thead className="bg-gray-50/50 text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">
                        <tr>
                            <th className="px-8 py-6 w-12">
                                <input
                                    type="checkbox"
                                    checked={selectedIds.length > 0 && selectedIds.length === posts.length}
                                    onChange={handleSelectAll}
                                    className="w-4 h-4 rounded border-gray-300 text-black focus:ring-black"
                                />
                            </th>
                            <th className="px-8 py-6">Contenu</th>
                            <th className="px-8 py-6">Auteur</th>
                            <th className="px-8 py-6">Livre lié</th>
                            <th className="px-8 py-6 cursor-pointer hover:bg-gray-100 transition-colors" onClick={() => handleSort('seo')}>
                                Score SEO <SortIcon column="seo" />
                            </th>
                            <th className="px-8 py-6 cursor-pointer hover:bg-gray-100 transition-colors" onClick={() => handleSort('status')}>
                                Statut <SortIcon column="status" />
                            </th>
                            <th className="px-8 py-6 text-center">
                                Terminée
                            </th>
                            <th className="px-8 py-6 cursor-pointer hover:bg-gray-100 transition-colors" onClick={() => handleSort('views')}>
                                Vues <SortIcon column="views" />
                            </th>
                            <th className="px-8 py-6">Date</th>
                            <th className="px-8 py-6 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {posts.length === 0 ? (
                            <tr>
                                <td colSpan={6} className="px-8 py-24 text-center text-gray-400">
                                    <div className="flex flex-col items-center justify-center">
                                        <FileText className="w-16 h-16 mb-4 opacity-10" />
                                        <p className="font-black uppercase tracking-widest text-[10px]">Aucun article pour le moment</p>
                                    </div>
                                </td>
                            </tr>
                        ) : (
                            posts.map((post) => (
                                <tr key={post.id} className={`hover:bg-gray-50/50 transition-colors group ${selectedIds.includes(post.id) ? 'bg-gray-50/80' : ''}`}>
                                    <td className="px-8 py-6 w-12">
                                        <input
                                            type="checkbox"
                                            checked={selectedIds.includes(post.id)}
                                            onChange={() => handleSelect(post.id)}
                                            className="w-4 h-4 rounded border-gray-300 text-black focus:ring-black"
                                        />
                                    </td>
                                    <td className="px-8 py-6">
                                        <div className="flex items-center gap-4">
                                            {post.coverImage ? (
                                                <div className="relative w-10 h-10 rounded-xl overflow-hidden flex-shrink-0 bg-gray-100 border border-gray-100 shadow-sm">
                                                <Image
                                                        src={post.coverImage?.startsWith('http') ? post.coverImage : `https://riwaya.store${post.coverImage}`}
                                                        alt={post.title}
                                                        fill
                                                        className="object-cover"
                                                        sizes="40px"
                                                        unoptimized
                                                    />
                                                </div>
                                            ) : (
                                                <div className="w-10 h-10 rounded-xl bg-gray-50 border border-gray-100 flex items-center justify-center flex-shrink-0 shadow-sm">
                                                    <FileText className="w-4 h-4 text-gray-300" />
                                                </div>
                                            )}
                                            <div>
                                                <Link href={`/${locale}/admin/posts/${post.id}`} className="font-black text-black line-clamp-1 max-w-md uppercase tracking-tight group-hover:text-blue-600 transition-colors hover:underline">
                                                    {post.title}
                                                </Link>
                                                <div className="text-[10px] text-gray-400 font-bold mt-1 tracking-wider">/{post.slug}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-8 py-6">
                                        {editingAuthorId === post.id ? (
                                            <div className="flex items-center gap-2">
                                                <select
                                                    value={selectedUserId}
                                                    onChange={(e) => setSelectedUserId(e.target.value)}
                                                    onKeyDown={(e) => {
                                                        if (e.key === 'Enter') handleUpdateAuthor(post.id)
                                                        if (e.key === 'Escape') setEditingAuthorId(null)
                                                    }}
                                                    className="w-40 text-xs px-2 py-1.5 border border-blue-500 rounded focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                                                    disabled={isUpdatingAuthor}
                                                    autoFocus
                                                >
                                                    <option value="" disabled>Sélectionner...</option>
                                                    {adminUsers.map(u => (
                                                        <option key={u.id} value={u.id}>{u.fullName}</option>
                                                    ))}
                                                    <option value="">Sans Auteur</option>
                                                </select>
                                                <button onClick={() => handleUpdateAuthor(post.id)} disabled={isUpdatingAuthor} className="text-green-600 hover:bg-green-50 p-1 rounded transition-colors">
                                                    {isUpdatingAuthor ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                                                </button>
                                                <button onClick={() => setEditingAuthorId(null)} disabled={isUpdatingAuthor} className="text-gray-400 hover:bg-gray-100 p-1 rounded transition-colors">
                                                    <X className="w-3.5 h-3.5" />
                                                </button>
                                            </div>
                                        ) : (
                                            <div 
                                                className="flex items-center gap-3 cursor-pointer hover:bg-gray-50 p-1.5 -ml-1.5 rounded-lg transition-colors group/author"
                                                onClick={() => {
                                                    setEditingAuthorId(post.id)
                                                    setSelectedUserId(post.author?.id || '')
                                                }}
                                                title="Cliquez pour modifier l'auteur"
                                            >
                                                <div className="w-8 h-8 rounded-xl bg-gray-100 flex items-center justify-center text-[10px] font-black text-gray-500 uppercase flex-shrink-0 group-hover/author:bg-blue-50 group-hover/author:text-blue-600 transition-colors">
                                                    {(post.authorName || post.author?.fullName)?.[0] || <User className="w-4 h-4" />}
                                                </div>
                                                <span className="text-gray-600 font-bold text-xs border-b border-dashed border-gray-300 pb-0.5 group-hover/author:border-blue-400 group-hover/author:text-blue-600 transition-colors">
                                                    {post.authorName || post.author?.fullName || 'Sans Auteur'}
                                                </span>
                                            </div>
                                        )}
                                    </td>
                                    <td className="px-8 py-6">
                                        {post._count?.books > 0 ? (
                                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-blue-50 text-blue-600 border border-blue-100">
                                                <Check className="w-3 h-3" />
                                                Oui ({post._count.books})
                                            </span>
                                        ) : (
                                            <span className="inline-flex items-center px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-gray-50 text-gray-400 border border-gray-100">
                                                Non
                                            </span>
                                        )}
                                    </td>
                                    <td className="px-4 py-4">
                                        {(() => {
                                            const contentStr = post.content || '';

                                            // Images
                                            const htmlImgs = (contentStr.match(/<img[^>]*>/gi) || []).length;
                                            const mdImgs = (contentStr.match(/!\[.*?\]\(.*?\)/g) || []).length;
                                            const imageCount = htmlImgs + mdImgs;

                                            // Liens
                                            const htmlLinks = (contentStr.match(/<a\s[^>]*href=/gi) || []).length;
                                            const mdLinks = (contentStr.match(/(?<!!)\[.*?\]\(.*?\)/g) || []).length;
                                            const linkCount = htmlLinks + mdLinks;

                                            // Mots
                                            const plainText = contentStr
                                                .replace(/<[^>]*>?/gm, ' ')
                                                .replace(/&nbsp;/g, ' ')
                                                .replace(/&[a-z]+;/g, ' ')
                                                .replace(/[#*`_]/g, ' ');
                                            const wordCount = plainText.split(/\s+/).filter(Boolean).length;

                                            // Score
                                            let score = Math.min(50, Math.floor(wordCount / 10));
                                            if (imageCount > 0) score += 25;
                                            if (linkCount > 0) score += 25;
                                            score = Math.min(100, score);

                                            const scoreColor = score >= 80
                                                ? 'bg-emerald-50 text-emerald-600 border-emerald-100'
                                                : score >= 50
                                                ? 'bg-amber-50 text-amber-600 border-amber-100'
                                                : 'bg-red-50 text-red-600 border-red-100';

                                            return (
                                                <div className="flex flex-col gap-1.5 min-w-[130px]">
                                                    {/* Score SEO */}
                                                    <span className={`inline-flex items-center justify-center px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${scoreColor}`}>
                                                        {score}/100
                                                    </span>
                                                    {/* Stats */}
                                                    <div className="flex items-center gap-2 flex-wrap">
                                                        <span className={`text-[9px] font-black px-2 py-0.5 rounded-full border ${imageCount > 0 ? 'bg-blue-50 text-blue-500 border-blue-100' : 'bg-gray-50 text-gray-300 border-gray-100'}`}>
                                                            🖼 {imageCount}
                                                        </span>
                                                        <span className={`text-[9px] font-black px-2 py-0.5 rounded-full border ${wordCount >= 500 ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : wordCount >= 200 ? 'bg-amber-50 text-amber-600 border-amber-100' : 'bg-gray-50 text-gray-400 border-gray-100'}`}>
                                                            📝 {wordCount}
                                                        </span>
                                                        <span className={`text-[9px] font-black px-2 py-0.5 rounded-full border ${linkCount > 0 ? 'bg-indigo-50 text-indigo-500 border-indigo-100' : 'bg-gray-50 text-gray-300 border-gray-100'}`}>
                                                            🔗 {linkCount}
                                                        </span>
                                                    </div>
                                                </div>
                                            )
                                        })()}
                                    </td>
                                    <td className="px-8 py-6">
                                        <select
                                            value={post.published ? 'published' : 'draft'}
                                            onChange={async (e) => {
                                                const isPublished = e.target.value === 'published';
                                                try {
                                                    const res = await updatePost(post.id, { published: isPublished });
                                                    if (res.success) {
                                                        router.refresh();
                                                    } else {
                                                        alert(res.error || 'Erreur lors de la mise à jour');
                                                    }
                                                } catch (err) {
                                                    alert('Erreur lors de la mise à jour');
                                                }
                                            }}
                                            className={`outline-none text-[10px] font-black uppercase tracking-widest rounded-full px-4 py-1.5 border appearance-none cursor-pointer text-center ${
                                                post.published 
                                                ? 'bg-emerald-50 text-emerald-600 border-emerald-100' 
                                                : 'bg-gray-100 text-gray-500 border-gray-200'
                                            }`}
                                        >
                                            <option value="published" className="bg-white text-emerald-600">Publié</option>
                                            <option value="draft" className="bg-white text-gray-500">Brouillon</option>
                                        </select>
                                    </td>
                                    <td className="px-8 py-6">
                                        <select
                                            value={post.isCompleted ? 'true' : 'false'}
                                            onChange={async (e) => {
                                                const isCompleted = e.target.value === 'true';
                                                try {
                                                    const res = await updatePost(post.id, { isCompleted });
                                                    if (res.success) {
                                                        router.refresh();
                                                    } else {
                                                        alert(res.error || 'Erreur lors de la mise à jour');
                                                    }
                                                } catch (err) {
                                                    alert('Erreur lors de la mise à jour');
                                                }
                                            }}
                                            className={`outline-none text-[10px] font-black uppercase tracking-widest rounded-full px-4 py-1.5 border appearance-none cursor-pointer text-center ${
                                                post.isCompleted 
                                                ? 'bg-blue-50 text-blue-600 border-blue-100' 
                                                : 'bg-gray-100 text-gray-500 border-gray-200'
                                            }`}
                                        >
                                            <option value="true" className="bg-white text-blue-600">Oui</option>
                                            <option value="false" className="bg-white text-gray-500">Non</option>
                                        </select>
                                    </td>
                                    <td className="px-8 py-6 text-gray-400 font-bold text-xs">
                                        {post.viewCount || 0}
                                    </td>
                                    <td className="px-8 py-6 text-gray-400 font-bold text-xs uppercase">
                                        {new Date(post.createdAt).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })}
                                    </td>
                                    <td className="px-8 py-6 text-right">
                                        <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <a
                                                href={`/${locale}/blog/${post.slug}`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="p-3 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-xl transition-all"
                                                title="Voir l'article"
                                            >
                                                <ExternalLink className="w-4 h-4" />
                                            </a>
                                            <Link
                                                href={`/${locale}/admin/posts/${post.id}`}
                                                className="p-3 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all"
                                            >
                                                <Edit className="w-4 h-4" />
                                            </Link>
                                            <ShareToN8nButton postId={post.id} />
                                            <DeletePostButton id={post.id} />
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
