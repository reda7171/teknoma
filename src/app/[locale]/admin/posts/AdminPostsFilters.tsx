'use client'

import { useState, useEffect } from 'react'
import { Search, X, Eye, Tag, User } from 'lucide-react'
import { useRouter, usePathname } from '@/i18n/routing'

interface ActiveFilters {
    search: string;
    published: string;
    category: string;
    authorId: string;
    bookId?: string;
    lang: string;
    sort: string;
    dateFrom: string;
    dateTo: string;
}

interface AdminPostsFiltersProps {
    activeFilters: ActiveFilters;
    categories: string[];
    authors: { id: string, fullName: string }[];
    books?: { id: string, title: string }[];
    totalCount: number;
}

export default function AdminPostsFilters({
    activeFilters,
    categories,
    authors,
    books = [],
    totalCount
}: AdminPostsFiltersProps) {
    const [isOpen, setIsOpen] = useState(false)
    const [localSearch, setLocalSearch] = useState(activeFilters.search)
    const router = useRouter()
    const pathname = usePathname()
    const [mounted, setMounted] = useState(false)

    useEffect(() => {
        setMounted(true)
    }, [])

    useEffect(() => {
        if (!mounted) return

        const timer = setTimeout(() => {
            if (localSearch !== activeFilters.search) {
                handleApplyFilters({ search: localSearch })
            }
        }, 500)

        return () => clearTimeout(timer)
    }, [localSearch, mounted])

    const handleApplyFilters = (updates: Partial<ActiveFilters>) => {
        const newFilters = { ...activeFilters, ...updates }
        const params = new URLSearchParams()
        
        if (newFilters.search?.trim()) params.set('search', newFilters.search.trim())
        if (newFilters.published && newFilters.published !== 'all') params.set('published', newFilters.published)
        if (newFilters.category && newFilters.category !== 'all') params.set('category', newFilters.category)
        if (newFilters.authorId && newFilters.authorId !== 'all') params.set('authorId', newFilters.authorId)
        if (newFilters.bookId && newFilters.bookId !== 'all') params.set('bookId', newFilters.bookId)
        if (newFilters.lang) params.set('lang', newFilters.lang)
        if (newFilters.sort && newFilters.sort !== 'newest') params.set('sort', newFilters.sort)
        if (newFilters.dateFrom) params.set('dateFrom', newFilters.dateFrom)
        if (newFilters.dateTo) params.set('dateTo', newFilters.dateTo)
        
        params.set('page', '1')
        router.push(`${pathname}?${params.toString()}`)
    }

    const clearFilters = () => {
        setLocalSearch('')
        const params = new URLSearchParams()
        if (activeFilters.lang) params.set('lang', activeFilters.lang) // keep lang
        router.push(`${pathname}?${params.toString()}`)
    }

    const hasActiveFilters = Boolean(
        activeFilters.search || 
        (activeFilters.published && activeFilters.published !== 'all') || 
        (activeFilters.category && activeFilters.category !== 'all') || 
        (activeFilters.authorId && activeFilters.authorId !== 'all') ||
        (activeFilters.bookId && activeFilters.bookId !== 'all') ||
        (activeFilters.sort && activeFilters.sort !== 'newest') ||
        activeFilters.dateFrom ||
        activeFilters.dateTo
    )

    return (
        <div className="w-full space-y-4">
            {/* Toggle Button */}
            <div className="flex items-center justify-between bg-white p-4 rounded-2xl border border-gray-200 shadow-sm">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => setIsOpen(!isOpen)}
                        className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold text-sm transition-all ${
                            isOpen || hasActiveFilters
                            ? 'bg-black text-white shadow-lg'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                    >
                        <Search className="w-4 h-4" />
                        {isOpen ? 'Fermer la recherche' : 'Recherche & Filtres'}
                    </button>
                    
                    {hasActiveFilters && (
                        <button
                            onClick={clearFilters}
                            className="text-xs font-bold text-red-500 hover:underline flex items-center gap-1"
                        >
                            <X className="w-3 h-3" />
                            Réinitialiser
                        </button>
                    )}
                </div>

                <div className="hidden md:flex items-center gap-2 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                    <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                    {totalCount} Articles trouvés
                </div>
            </div>

            {/* Filters Panel */}
            {isOpen && (
                <div className="bg-white p-8 rounded-3xl border border-gray-200 shadow-xl animate-in slide-in-from-top-4 duration-300">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                        {/* Search */}
                        <div className="space-y-3">
                            <label className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-gray-500">
                                <Search className="w-3 h-3" />
                                Recherche
                            </label>
                            <form onSubmit={(e) => { e.preventDefault(); handleApplyFilters({ search: localSearch }); }} className="relative">
                                <input
                                    type="text"
                                    placeholder="Titre de l'article..."
                                    value={localSearch}
                                    onChange={(e) => setLocalSearch(e.target.value)}
                                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl focus:bg-white focus:ring-2 focus:ring-black focus:border-transparent outline-none transition-all font-bold text-sm"
                                />
                            </form>
                        </div>

                        {/* Status Filter */}
                        <div className="space-y-3">
                            <label className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-gray-500">
                                <Eye className="w-3 h-3" />
                                Statut
                            </label>
                            <div className="flex flex-wrap gap-2">
                                {[
                                    { id: 'all', label: 'Tous' },
                                    { id: 'true', label: 'Publiés' },
                                    { id: 'false', label: 'Brouillons' }
                                ].map((f) => (
                                    <button
                                        key={f.id}
                                        onClick={() => handleApplyFilters({ published: f.id })}
                                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                                            (activeFilters.published === f.id) || (!activeFilters.published && f.id === 'all')
                                            ? 'bg-black text-white' 
                                            : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                                        }`}
                                    >
                                        {f.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Category Filter */}
                        <div className="space-y-3">
                            <label className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-gray-500">
                                <Tag className="w-3 h-3" />
                                Catégorie
                            </label>
                            <select
                                value={activeFilters.category || 'all'}
                                onChange={(e) => handleApplyFilters({ category: e.target.value })}
                                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl focus:bg-white focus:ring-2 focus:ring-black focus:border-transparent outline-none transition-all font-bold text-sm"
                            >
                                <option value="all">Toutes les catégories</option>
                                {categories.map(cat => (
                                    <option key={cat} value={cat}>{cat}</option>
                                ))}
                            </select>
                        </div>

                        {/* Author Filter */}
                        <div className="space-y-3">
                            <label className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-gray-500">
                                <User className="w-3 h-3" />
                                Auteur
                            </label>
                            <select
                                value={activeFilters.authorId || 'all'}
                                onChange={(e) => handleApplyFilters({ authorId: e.target.value })}
                                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl focus:bg-white focus:ring-2 focus:ring-black focus:border-transparent outline-none transition-all font-bold text-sm"
                            >
                                <option value="all">Tous les auteurs</option>
                                {authors.map(author => (
                                    <option key={author.id} value={author.id}>{author.fullName}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6 pt-4 border-t border-gray-100">
                        {/* Book Filter */}
                        <div className="space-y-3">
                            <label className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-gray-500">
                                <Tag className="w-3 h-3" /> {/* Or Book icon if you prefer */}
                                Livre lié
                            </label>
                            <select
                                value={activeFilters.bookId || 'all'}
                                onChange={(e) => handleApplyFilters({ bookId: e.target.value })}
                                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl focus:bg-white focus:ring-2 focus:ring-black focus:border-transparent outline-none transition-all font-bold text-sm"
                            >
                                <option value="all">Tous les livres</option>
                                {books.map(book => (
                                    <option key={book.id} value={book.id}>{book.title}</option>
                                ))}
                            </select>
                        </div>

                        {/* Sort Filter */}
                        <div className="space-y-3">
                            <label className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-gray-500">
                                Trier par
                            </label>
                            <select
                                value={activeFilters.sort || 'newest'}
                                onChange={(e) => handleApplyFilters({ sort: e.target.value })}
                                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl focus:bg-white focus:ring-2 focus:ring-black focus:border-transparent outline-none transition-all font-bold text-sm"
                            >
                                <option value="newest">Plus récent</option>
                                <option value="oldest">Plus ancien</option>
                                <option value="views_desc">Vues décroissantes</option>
                                <option value="views_asc">Vues croissantes</option>
                            </select>
                        </div>

                        {/* Date From */}
                        <div className="space-y-3">
                            <label className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-gray-500">
                                Date de début
                            </label>
                            <input
                                type="date"
                                value={activeFilters.dateFrom || ''}
                                onChange={(e) => handleApplyFilters({ dateFrom: e.target.value })}
                                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl focus:bg-white focus:ring-2 focus:ring-black focus:border-transparent outline-none transition-all font-bold text-sm"
                            />
                        </div>

                        {/* Date To */}
                        <div className="space-y-3">
                            <label className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-gray-500">
                                Date de fin
                            </label>
                            <input
                                type="date"
                                value={activeFilters.dateTo || ''}
                                onChange={(e) => handleApplyFilters({ dateTo: e.target.value })}
                                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl focus:bg-white focus:ring-2 focus:ring-black focus:border-transparent outline-none transition-all font-bold text-sm"
                            />
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
