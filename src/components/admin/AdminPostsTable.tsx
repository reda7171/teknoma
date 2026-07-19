'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Edit, FileText, User, ExternalLink, Trash2, Copy, Check } from 'lucide-react'
import DeletePostButton from '@/components/admin/DeletePostButton'
import ShareToN8nButton from '@/components/admin/ShareToN8nButton'
import { deletePostsBulk } from '@/lib/actions/blog'
import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { ArrowUp, ArrowDown } from 'lucide-react'

interface AdminPostsTableProps {
    posts: any[]
    locale: string
}

export default function AdminPostsTable({ posts, locale }: AdminPostsTableProps) {
    const router = useRouter()
    const searchParams = useSearchParams()
    const pathname = usePathname()
    const [selectedIds, setSelectedIds] = useState<string[]>([])
    const [isDeleting, setIsDeleting] = useState(false)
    const [isCopied, setIsCopied] = useState(false)

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
                                                        src={post.coverImage}
                                                        alt={post.title}
                                                        fill
                                                        className="object-cover"
                                                        sizes="40px"
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
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-xl bg-gray-100 flex items-center justify-center text-[10px] font-black text-gray-500 uppercase">
                                                {(post.authorName || post.author?.fullName)?.[0] || <User className="w-4 h-4" />}
                                            </div>
                                            <span className="text-gray-600 font-bold text-xs">{post.authorName || post.author?.fullName}</span>
                                        </div>
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
                                    <td className="px-8 py-6">
                                        {(() => {
                                            let score = 0;
                                            let wordCount = 0;
                                            let hasImage = false;
                                            let hasLink = false;
                                            
                                            const contentStr = post.content || '';
                                            
                                            if (contentStr.includes('<img') || /!\[.*?\]\(.*?\)/.test(contentStr)) {
                                                hasImage = true;
                                            }
                                            
                                            if (contentStr.includes('<a href=') || /(?<!!)\[.*?\]\(.*?\)/.test(contentStr)) {
                                                hasLink = true;
                                            }
                                            
                                            const plainText = contentStr.replace(/<[^>]*>?/gm, '').replace(/[#*`_]/g, '');
                                            wordCount = plainText.split(/\s+/).filter(Boolean).length;
                                            
                                            score += Math.min(50, Math.floor(wordCount / 10)); // up to 50 pts for words (500 words = max)
                                            if (hasImage) score += 25;
                                            if (hasLink) score += 25;
                                            
                                            const scoreColor = score >= 80 ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : score >= 50 ? 'bg-amber-50 text-amber-600 border-amber-100' : 'bg-red-50 text-red-600 border-red-100';
                                            
                                            return (
                                                <div className="flex flex-col gap-1">
                                                    <span className={`inline-flex items-center justify-center px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${scoreColor}`}>
                                                        {score}/100
                                                    </span>
                                                    <span className="text-[9px] text-gray-400 font-bold uppercase tracking-wider text-center mt-1">
                                                        {wordCount} Mots
                                                    </span>
                                                </div>
                                            )
                                        })()}
                                    </td>
                                    <td className="px-8 py-6">
                                        {post.published ? (
                                            <span className="inline-flex items-center px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest bg-emerald-50 text-emerald-600 border border-emerald-100">
                                                Publié
                                            </span>
                                        ) : (
                                            <span className="inline-flex items-center px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest bg-gray-100 text-gray-500 border border-gray-200">
                                                Brouillon
                                            </span>
                                        )}
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
