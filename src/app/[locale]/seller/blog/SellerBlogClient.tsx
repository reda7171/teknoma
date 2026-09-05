'use client'

import { useState } from 'react'
import { Link } from '@/i18n/routing'
import { PenLine, Eye, CheckCircle, Trash2, BookOpen, Edit, Clock } from 'lucide-react'
import { deleteSellerPost } from '@/lib/actions/seller/blog'
import { useTranslations } from 'next-intl'

interface Post {
    id: string
    title: string
    slug: string
    published: boolean
    createdAt: Date
    viewCount: number
    category: string | null
    coverImage: string | null
    excerpt: string | null
}

export default function SellerBlogClient({ initialPosts, locale }: { initialPosts: Post[]; locale: string }) {
    const t = useTranslations('Seller.Blog')
    const [posts, setPosts] = useState(initialPosts)
    const [loadingId, setLoadingId] = useState<string | null>(null)

    const dateLocale = locale === 'ar' ? 'ar-MA' : locale === 'en' ? 'en-US' : 'fr-FR'

    const handleDelete = async (id: string) => {
        if (!confirm(t('Delete') + ' ?')) return
        setLoadingId(id)
        const res = await deleteSellerPost(id)
        if (res.success) {
            setPosts(prev => prev.filter(p => p.id !== id))
        }
        setLoadingId(null)
    }

    if (posts.length === 0) {
        return (
            <div className="bg-white rounded-[3rem] border border-gray-100 shadow-xl shadow-black/5 p-20 text-center flex flex-col items-center gap-6">
                <BookOpen className="w-16 h-16 text-gray-200" />
                <div>
                    <p className="font-black text-black uppercase tracking-tight text-lg">{t('Empty')}</p>
                    <p className="text-gray-400 font-medium text-sm mt-1">{t('EmptyHint')}</p>
                </div>
                <Link
                    href="/seller/blog/new"
                    className="bg-black text-white px-6 py-3 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-gray-800 transition-all flex items-center gap-2"
                >
                    <PenLine className="w-4 h-4" /> {t('Write')}
                </Link>
            </div>
        )
    }

    return (
        <div className="space-y-4">
            {posts.map(post => (
                <div key={post.id} className="bg-white rounded-[2rem] border border-gray-100 shadow-xl shadow-black/5 p-6 flex flex-col md:flex-row items-start md:items-center gap-6 group hover:border-gray-200 transition-colors">
                    {/* Cover */}
                    {post.coverImage ? (
                        <img src={post.coverImage} alt={post.title} className="w-20 h-20 object-cover rounded-2xl shrink-0" />
                    ) : (
                        <div className="w-20 h-20 bg-gray-50 rounded-2xl flex items-center justify-center shrink-0">
                            <BookOpen className="w-8 h-8 text-gray-200" />
                        </div>
                    )}

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 mb-2">
                            <h3 className="font-black text-black text-base leading-tight truncate">{post.title}</h3>
                            {post.published ? (
                                <span className="shrink-0 inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 text-[10px] font-black uppercase tracking-widest rounded-lg">
                                    <CheckCircle className="w-3 h-3" /> {t('StatusPublished')}
                                </span>
                            ) : (
                                <span className="shrink-0 inline-flex items-center gap-1 px-2 py-1 bg-orange-100 text-orange-700 text-[10px] font-black uppercase tracking-widest rounded-lg">
                                    <Clock className="w-3 h-3" /> {t('StatusPending')}
                                </span>
                            )}
                        </div>
                        <p className="text-gray-400 text-xs font-bold truncate">{post.excerpt}</p>
                        <div className="flex items-center gap-4 mt-3 text-[10px] font-black text-gray-400 uppercase tracking-wider">
                            <span>{new Date(post.createdAt).toLocaleDateString(dateLocale)}</span>
                            {post.category && <span>{post.category}</span>}
                            {post.published && <span className="flex items-center gap-1"><Eye className="w-3 h-3" /> {post.viewCount} {t('Views')}</span>}
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                        {!post.published && (
                            <Link
                                href={`/seller/blog/${post.id}/edit`}
                                className="p-3 bg-blue-50 text-blue-600 rounded-xl hover:bg-blue-600 hover:text-white transition-all border border-blue-100"
                                title={t('Edit')}
                            >
                                <Edit className="w-4 h-4" />
                            </Link>
                        )}
                        {post.published && (
                            <Link
                                href={`/blog/${post.slug}`}
                                target="_blank"
                                className="p-3 bg-gray-50 text-gray-600 rounded-xl hover:bg-gray-600 hover:text-white transition-all border border-gray-100"
                                title={t('View')}
                            >
                                <Eye className="w-4 h-4" />
                            </Link>
                        )}
                        {!post.published && (
                            <button
                                onClick={() => handleDelete(post.id)}
                                disabled={loadingId === post.id}
                                className="p-3 bg-red-50 text-red-600 rounded-xl hover:bg-red-600 hover:text-white transition-all border border-red-100 disabled:opacity-50"
                                title={t('Delete')}
                            >
                                <Trash2 className="w-4 h-4" />
                            </button>
                        )}
                    </div>
                </div>
            ))}
        </div>
    )
}
