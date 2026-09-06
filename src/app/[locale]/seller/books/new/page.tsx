'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Link } from '@/i18n/routing'
import { useTranslations } from 'next-intl'
import { ArrowLeft, Save, Upload, Info, AlertTriangle, Search, BookOpen, Plus, Loader2, X } from 'lucide-react'
import { createSellerBook } from '@/lib/actions/seller/dashboard'

interface GoogleBook {
    id: string
    volumeInfo: {
        title: string
        authors?: string[]
        description?: string
        imageLinks?: { thumbnail?: string }
        industryIdentifiers?: { type: string; identifier: string }[]
        language?: string
    }
}

export default function NewSellerBookPage() {
    const router = useRouter()
    const t = useTranslations('Seller.NewBook')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const [title, setTitle] = useState('')
    const [author, setAuthor] = useState('')
    const [description, setDescription] = useState('')
    const [image, setImage] = useState('')
    const [language, setLanguage] = useState('fr')

    const [showGoogleModal, setShowGoogleModal] = useState(false)
    const [googleQuery, setGoogleQuery] = useState('')
    const [googleResults, setGoogleResults] = useState<GoogleBook[]>([])
    const [googleLoading, setGoogleLoading] = useState(false)
    const [googleError, setGoogleError] = useState<string | null>(null)

    async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault()
        setLoading(true)
        setError(null)

        const formData = new FormData(e.currentTarget)
        const data = {
            title: formData.get('title') as string,
            author: formData.get('author') as string,
            description: formData.get('description') as string,
            price: parseFloat(formData.get('price') as string),
            stock: parseInt(formData.get('stock') as string),
            image: formData.get('image') as string,
            category: formData.get('category') as string,
            language: formData.get('language') as string || 'fr',
        }

        const res = await createSellerBook(data)
        if (res.success) {
            router.push('/seller/books')
            router.refresh()
        } else {
            setError(t('ErrorAdd'))
            setLoading(false)
        }
    }

    const searchGoogleBooks = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!googleQuery.trim()) return
        setGoogleLoading(true)
        setGoogleError(null)
        setGoogleResults([])

        try {
            const res = await fetch(`/api/books/search?q=${encodeURIComponent(googleQuery)}`)
            const data = await res.json()
            if (!res.ok) throw new Error(data.error || t('SearchError'))

            if (data.items && data.items.length > 0) {
                setGoogleResults(data.items)
            } else {
                setGoogleError(t('SearchError'))
            }
        } catch (err: any) {
            setGoogleError(err.message || t('SearchError'))
        } finally {
            setGoogleLoading(false)
        }
    }

    const selectGoogleBook = (book: GoogleBook) => {
        const { title: gTitle, authors, description: gDesc, imageLinks, language: gLang } = book.volumeInfo
        setTitle(gTitle || '')
        setAuthor(authors && authors.length > 0 ? authors[0] : '')
        setDescription(gDesc || '')
        if (imageLinks?.thumbnail) {
            setImage(imageLinks.thumbnail.replace('http:', 'https:'))
        }
        if (gLang === 'fr' || gLang === 'ar' || gLang === 'en') {
            setLanguage(gLang)
        }
        setShowGoogleModal(false)
    }

    return (
        <div className="max-w-4xl mx-auto space-y-6 relative">
            {/* Header */}
            <div className="flex flex-col gap-4">
                <Link
                    href="/seller/books"
                    className="flex items-center gap-2 text-gray-400 font-bold text-sm hover:text-black transition-colors"
                >
                    <ArrowLeft className="w-4 h-4" /> {t('Back')}
                </Link>
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <h1 className="text-4xl font-black text-black tracking-tighter uppercase">{t('Title')}</h1>
                    <button
                        type="button"
                        onClick={() => setShowGoogleModal(true)}
                        className="bg-blue-50 text-blue-600 px-6 py-3 rounded-2xl font-bold text-sm hover:bg-blue-600 hover:text-white transition-all flex items-center justify-center gap-2 border border-blue-100"
                    >
                        <Search className="w-4 h-4" />
                        {t('GoogleSearch')}
                    </button>
                </div>
            </div>

            {error && (
                <div className="bg-red-50 border-2 border-red-100 p-6 rounded-[2rem] flex items-center gap-4 text-red-600 font-bold animate-pulse">
                    <AlertTriangle className="w-6 h-6" />
                    {error}
                </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
                {/* Section 1: Image & Infos de base */}
                <div className="bg-white rounded-3xl p-6 lg:p-8 shadow-xl shadow-black/5 border border-gray-100 grid grid-cols-1 md:grid-cols-3 gap-8">
                    <div className="md:col-span-1">
                        <label className="text-sm font-bold text-gray-500 block mb-4">{t('ImageLabel')}</label>
                        {image ? (
                            <div className="aspect-[3/4] bg-gray-50 rounded-3xl border-4 border-gray-100 flex items-center justify-center overflow-hidden">
                                <img src={image} alt="Preview" className="w-full h-full object-cover" />
                            </div>
                        ) : (
                            <div className="aspect-[3/4] bg-gray-50 rounded-3xl border-4 border-dashed border-gray-100 flex flex-col items-center justify-center text-center p-6 group hover:border-black/10 transition-all">
                                <Upload className="w-10 h-10 text-gray-200 mb-4 group-hover:scale-110 transition-transform" />
                                <p className="text-sm font-bold text-gray-400 leading-snug">{t('ImageHint')}</p>
                            </div>
                        )}
                        <input
                            name="image"
                            type="url"
                            required
                            value={image}
                            onChange={(e) => setImage(e.target.value)}
                            placeholder="https://image-url.jpg"
                            className="w-full mt-4 px-4 py-3 bg-gray-50 border-none rounded-xl text-xs font-bold focus:ring-2 focus:ring-black outline-none"
                        />
                    </div>

                    <div className="md:col-span-2 space-y-6">
                        <div>
                            <label className="text-sm font-bold text-gray-500 block mb-2">{t('TitleLabel')} *</label>
                            <input
                                name="title"
                                type="text"
                                required
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                className="w-full px-6 py-4 bg-gray-50 border-none rounded-2xl text-base font-bold text-black focus:ring-2 focus:ring-black outline-none placeholder-gray-200"
                                placeholder="Atomic Habits"
                            />
                        </div>
                        <div>
                            <label className="text-sm font-bold text-gray-500 block mb-2">{t('AuthorLabel')} *</label>
                            <input
                                name="author"
                                type="text"
                                required
                                value={author}
                                onChange={(e) => setAuthor(e.target.value)}
                                className="w-full px-6 py-4 bg-gray-50 border-none rounded-2xl text-sm font-bold text-black focus:ring-2 focus:ring-black outline-none placeholder-gray-200"
                                placeholder="James Clear"
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="text-sm font-bold text-gray-500 block mb-2">{t('CategoryLabel')}</label>
                                <select
                                    name="category"
                                    className="w-full px-6 py-4 bg-gray-50 border-none rounded-2xl text-sm font-bold text-black focus:ring-2 focus:ring-black outline-none appearance-none"
                                >
                                    <option value="Développement Personnel">{t('Categories.DevPerso')}</option>
                                    <option value="Business & Finance">{t('Categories.Business')}</option>
                                    <option value="Productivité">{t('Categories.Productivite')}</option>
                                    <option value="Psychologie">{t('Categories.Psychologie')}</option>
                                    <option value="Fiction">{t('Categories.Fiction')}</option>
                                </select>
                            </div>
                            <div>
                                <label className="text-sm font-bold text-gray-500 block mb-2">{t('LanguageLabel')}</label>
                                <select
                                    name="language"
                                    value={language}
                                    onChange={(e) => setLanguage(e.target.value)}
                                    className="w-full px-6 py-4 bg-gray-50 border-none rounded-2xl text-sm font-bold text-black focus:ring-2 focus:ring-black outline-none appearance-none"
                                >
                                    <option value="fr">{t('Languages.fr')}</option>
                                    <option value="ar">{t('Languages.ar')}</option>
                                    <option value="en">{t('Languages.en')}</option>
                                </select>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Section 2: Prix & Stock */}
                <div className="bg-[#0f172a] text-white rounded-3xl p-6 lg:p-8 shadow-2xl relative overflow-hidden">
                    <div className="absolute right-0 top-0 w-64 h-64 bg-blue-500/10 blur-3xl rounded-full" />
                    <div className="absolute left-0 bottom-0 w-48 h-48 bg-cyan-400/5 blur-3xl rounded-full" />
                    <div className="relative z-10 grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="text-sm font-bold text-slate-300 block mb-2">{t('PriceLabel')} *</label>
                            <div className="relative">
                                <input
                                    name="price"
                                    type="number"
                                    step="0.01"
                                    required
                                    className="w-full px-6 py-4 bg-white/5 border-2 border-white/10 rounded-2xl text-2xl font-black text-white focus:bg-white/10 focus:border-blue-400 outline-none transition-all placeholder-white/10"
                                    placeholder="0.00"
                                />
                                <span className="absolute right-6 top-1/2 -translate-y-1/2 font-black text-blue-400">درهم</span>
                            </div>
                        </div>
                        <div>
                            <label className="text-sm font-bold text-slate-300 block mb-2">{t('StockLabel')} *</label>
                            <input
                                name="stock"
                                type="number"
                                required
                                className="w-full px-6 py-4 bg-white/5 border-2 border-white/10 rounded-2xl text-2xl font-black text-white focus:bg-white/10 focus:border-blue-400 outline-none transition-all placeholder-white/10"
                                placeholder="1"
                            />
                        </div>
                    </div>
                </div>

                {/* Section 3: Description */}
                <div className="bg-white rounded-3xl p-6 lg:p-8 border border-gray-100 shadow-xl shadow-black/5">
                    <label className="text-sm font-bold text-gray-500 block mb-4">{t('DescriptionLabel')} *</label>
                    <textarea
                        name="description"
                        required
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        rows={6}
                        className="w-full px-6 py-4 bg-gray-50 border-none rounded-2xl text-sm font-medium text-black focus:ring-2 focus:ring-black outline-none placeholder-gray-200 resize-none"
                        placeholder={t('DescriptionPlaceholder')}
                    />

                    <div className="mt-6 p-4 bg-blue-50/50 rounded-2xl flex items-start gap-4">
                        <Info className="w-5 h-5 text-blue-500 shrink-0 mt-1" />
                        <p className="text-sm font-bold text-blue-700 leading-relaxed">{t('Info')}</p>
                    </div>
                </div>

                {/* Submit */}
                <div className="flex justify-end pt-6">
                    <button
                        type="submit"
                        disabled={loading}
                        className="bg-black text-white px-8 py-4 rounded-2xl font-bold text-sm flex items-center gap-4 hover:bg-pixio-yellow hover:text-black transition-all shadow-2xl active:scale-95 disabled:opacity-50"
                    >
                        {loading ? t('Submitting') : t('Submit')}
                        {!loading && <Save className="w-5 h-5" />}
                    </button>
                </div>
            </form>

            {/* Modal Google Books */}
            {showGoogleModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm overflow-y-auto">
                    <div className="bg-white rounded-[3rem] p-8 md:p-10 w-full max-w-4xl shadow-2xl relative my-auto">
                        <button
                            onClick={() => setShowGoogleModal(false)}
                            className="absolute top-6 right-6 p-2 bg-gray-100 text-gray-500 rounded-full hover:bg-black hover:text-white transition-all"
                        >
                            <X className="w-5 h-5" />
                        </button>

                        <h2 className="text-2xl font-black tracking-tight mb-6 flex items-center gap-3">
                            <Search className="w-6 h-6 text-blue-600" />
                            {t('QuickSearch')}
                        </h2>

                        <form onSubmit={searchGoogleBooks} className="mb-8">
                            <div className="relative">
                                <input
                                    type="text"
                                    value={googleQuery}
                                    onChange={(e) => setGoogleQuery(e.target.value)}
                                    placeholder={t('SearchPlaceholder')}
                                    className="block w-full pl-6 pr-32 py-4 text-sm font-bold bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-blue-600 outline-none"
                                />
                                <div className="absolute inset-y-2 right-2">
                                    <button
                                        type="submit"
                                        disabled={googleLoading || !googleQuery.trim()}
                                        className="h-full px-6 bg-blue-600 text-white font-bold text-sm rounded-xl hover:bg-blue-700 disabled:opacity-50 transition-colors flex items-center gap-2"
                                    >
                                        {googleLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : t('Search')}
                                    </button>
                                </div>
                            </div>
                        </form>

                        {googleError && (
                            <div className="p-4 mb-8 bg-red-50 text-red-600 rounded-xl text-sm font-bold border border-red-100">
                                {googleError}
                            </div>
                        )}

                        <div className="max-h-[50vh] overflow-y-auto pr-2">
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {googleResults.map((book) => {
                                    const info = book.volumeInfo
                                    const cover = info.imageLinks?.thumbnail?.replace('http:', 'https:')
                                    return (
                                        <div key={book.id} className="bg-white rounded-2xl border border-gray-100 p-4 hover:border-blue-200 transition-colors flex flex-col gap-4">
                                            <div className="flex items-start gap-4">
                                                {cover ? (
                                                    <img src={cover} alt={info.title} className="w-16 h-24 object-cover rounded-lg shadow-sm" />
                                                ) : (
                                                    <div className="w-16 h-24 bg-gray-50 rounded-lg flex items-center justify-center">
                                                        <BookOpen className="w-6 h-6 text-gray-300" />
                                                    </div>
                                                )}
                                                <div className="flex-1">
                                                    <h3 className="font-bold text-sm text-gray-900 line-clamp-2 leading-tight mb-1">{info.title}</h3>
                                                    <p className="text-xs font-bold text-gray-500 line-clamp-1">{info.authors?.join(', ')}</p>
                                                </div>
                                            </div>
                                            <button
                                                onClick={() => selectGoogleBook(book)}
                                                className="w-full py-3 bg-gray-50 text-black text-sm font-bold rounded-xl hover:bg-black hover:text-white transition-all flex items-center justify-center gap-2"
                                            >
                                                <Plus className="w-3 h-3" /> {t('SelectBook')}
                                            </button>
                                        </div>
                                    )
                                })}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
