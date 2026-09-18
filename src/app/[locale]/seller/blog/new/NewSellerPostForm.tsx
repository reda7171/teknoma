'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Link } from '@/i18n/routing'
import { ArrowLeft, PenLine, AlertTriangle, Eye, ChevronDown } from 'lucide-react'
import { createSellerPost } from '@/lib/actions/seller/blog'
import { useTranslations } from 'next-intl'
import type { CategoryTree } from '@/lib/constants/categories'

interface Props {
    categoryTree: CategoryTree
}

export default function NewSellerPostForm({ categoryTree }: Props) {
    const t = useTranslations('Seller.NewPost')
    const router = useRouter()
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [preview, setPreview] = useState(false)

    const [title, setTitle] = useState('')
    const [excerpt, setExcerpt] = useState('')
    const [content, setContent] = useState('')
    const [coverImage, setCoverImage] = useState('')
    const [category, setCategory] = useState('')
    const [subCategory, setSubCategory] = useState('')

    const mainCategories = Object.keys(categoryTree)
    const subCategories = category ? (categoryTree[category] || []) : []

    const handleCategoryChange = (val: string) => {
        setCategory(val)
        setSubCategory('')
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!title.trim() || !content.trim()) {
            setError(t('ErrorRequired'))
            return
        }
        setLoading(true)
        setError(null)

        const finalCategory = subCategory ? `${category} > ${subCategory}` : category

        const res = await createSellerPost({
            title,
            excerpt,
            content,
            coverImage: coverImage || undefined,
            category: finalCategory || undefined
        })
        if (res.success) {
            router.push('/seller/blog')
        } else {
            setError(res.error || t('ErrorRequired'))
            setLoading(false)
        }
    }

    return (
        <div className="max-w-4xl mx-auto space-y-10">
            {/* Header */}
            <div className="flex flex-col gap-4">
                <Link href="/seller/blog" className="flex items-center gap-2 text-gray-400 font-bold text-xs uppercase tracking-widest hover:text-black transition-colors">
                    <ArrowLeft className="w-4 h-4" /> {t('Back')}
                </Link>
                <div className="flex items-center justify-between">
                    <h1 className="text-4xl font-black text-black tracking-tighter uppercase">{t('Title')}</h1>
                    <button
                        type="button"
                        onClick={() => setPreview(!preview)}
                        className="bg-gray-100 text-gray-600 px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-black hover:text-white transition-all flex items-center gap-2"
                    >
                        <Eye className="w-4 h-4" /> {preview ? t('Edit') : t('Preview')}
                    </button>
                </div>
            </div>

            {error && (
                <div className="bg-red-50 border-2 border-red-100 p-6 rounded-3xl flex items-center gap-4 text-red-600 font-bold">
                    <AlertTriangle className="w-5 h-5 shrink-0" /> {error}
                </div>
            )}

            {preview ? (
                <div className="bg-white rounded-[3rem] p-10 border border-gray-100 shadow-xl shadow-black/5 space-y-6">
                    {coverImage && <img src={coverImage} alt={title} className="w-full h-64 object-cover rounded-3xl" />}
                    {category && (
                        <div className="flex items-center gap-2">
                            <span className="inline-block px-3 py-1 bg-gray-100 text-gray-600 text-xs font-black uppercase tracking-widest rounded-lg">{category}</span>
                            {subCategory && <span className="inline-block px-3 py-1 bg-gray-50 text-gray-400 text-xs font-black uppercase tracking-widest rounded-lg">{subCategory}</span>}
                        </div>
                    )}
                    <h1 className="text-3xl font-black text-black leading-tight">{title || t('TitleLabel')}</h1>
                    <p className="text-gray-500 font-medium text-base italic">{excerpt}</p>
                    <div className="text-gray-700 whitespace-pre-wrap font-medium leading-relaxed border-t border-gray-100 pt-6 text-sm">
                        {content || t('ContentPlaceholder')}
                    </div>
                </div>
            ) : (
                <form onSubmit={handleSubmit} className="space-y-8">
                    <div className="bg-white rounded-[3rem] p-10 border border-gray-100 shadow-xl shadow-black/5 space-y-8">
                        {/* Titre */}
                        <div>
                            <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 block mb-3">{t('TitleLabel')} *</label>
                            <input
                                type="text"
                                value={title}
                                onChange={e => setTitle(e.target.value)}
                                required
                                className="w-full px-6 py-4 bg-gray-50 border-none rounded-2xl text-2xl font-black text-black focus:ring-2 focus:ring-black outline-none placeholder-gray-200"
                                placeholder={t('TitleLabel') + '...'}
                            />
                        </div>

                        {/* Résumé */}
                        <div>
                            <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 block mb-3">{t('ExcerptLabel')}</label>
                            <input
                                type="text"
                                value={excerpt}
                                onChange={e => setExcerpt(e.target.value)}
                                className="w-full px-6 py-4 bg-gray-50 border-none rounded-2xl text-sm font-bold text-black focus:ring-2 focus:ring-black outline-none placeholder-gray-200"
                                placeholder={t('ExcerptLabel') + '...'}
                            />
                        </div>

                        {/* Catégorie + Sous-catégorie */}
                        <div className="grid grid-cols-2 gap-6">
                            <div>
                                <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 block mb-3">{t('CategoryLabel')}</label>
                                <div className="relative">
                                    <select aria-label="Champ de sélection"
                                        value={category}
                                        onChange={e => handleCategoryChange(e.target.value)}
                                        className="w-full px-6 py-4 bg-gray-50 border-none rounded-2xl text-sm font-bold text-black focus:ring-2 focus:ring-black outline-none appearance-none pr-10"
                                    >
                                        <option value="">--</option>
                                        {mainCategories.map(c => <option key={c} value={c}>{c}</option>)}
                                    </select>
                                    <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                                </div>
                            </div>
                            <div>
                                <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 block mb-3">{t('SubCategoryLabel')}</label>
                                <div className="relative">
                                    <select aria-label="Champ de sélection"
                                        value={subCategory}
                                        onChange={e => setSubCategory(e.target.value)}
                                        disabled={!category || subCategories.length === 0}
                                        className="w-full px-6 py-4 bg-gray-50 border-none rounded-2xl text-sm font-bold text-black focus:ring-2 focus:ring-black outline-none appearance-none pr-10 disabled:opacity-40"
                                    >
                                        <option value="">--</option>
                                        {subCategories.map(s => <option key={s} value={s}>{s}</option>)}
                                    </select>
                                    <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                                </div>
                            </div>
                        </div>

                        {/* Cover image */}
                        <div>
                            <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 block mb-3">{t('CoverLabel')}</label>
                            <input
                                type="url"
                                value={coverImage}
                                onChange={e => setCoverImage(e.target.value)}
                                className="w-full px-6 py-4 bg-gray-50 border-none rounded-2xl text-sm font-bold text-black focus:ring-2 focus:ring-black outline-none placeholder-gray-200"
                                placeholder="https://..."
                            />
                            {coverImage && <img src={coverImage} alt="preview" className="mt-3 h-28 rounded-2xl object-cover" />}
                        </div>
                    </div>

                    {/* Contenu */}
                    <div className="bg-white rounded-[3rem] p-10 border border-gray-100 shadow-xl shadow-black/5">
                        <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 block mb-4">{t('ContentLabel')} *</label>
                        <textarea
                            value={content}
                            onChange={e => setContent(e.target.value)}
                            required
                            rows={18}
                            className="w-full px-8 py-6 bg-gray-50 border-none rounded-[2rem] text-sm font-medium text-black focus:ring-2 focus:ring-black outline-none placeholder-gray-200 resize-none leading-relaxed"
                            placeholder={t('ContentPlaceholder')}
                        />
                        <p className="text-[10px] text-gray-400 font-bold mt-3 uppercase tracking-widest">{content.length}</p>
                    </div>

                    {/* Submit */}
                    <div className="flex items-center justify-between pt-4">
                        <p className="text-xs text-gray-400 font-bold">{t('ApprovalNotice')}</p>
                        <button
                            type="submit"
                            disabled={loading}
                            className="bg-black text-white px-12 py-6 rounded-[2rem] font-black text-xs uppercase tracking-widest flex items-center gap-4 hover:bg-gray-800 transition-all shadow-2xl active:scale-95 disabled:opacity-50"
                        >
                            {loading ? t('Submitting') : t('Submit')}
                            {!loading && <PenLine className="w-5 h-5" />}
                        </button>
                    </div>
                </form>
            )}
        </div>
    )
}
