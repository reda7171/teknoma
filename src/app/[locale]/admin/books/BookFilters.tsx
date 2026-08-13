'use client'

import { useState, useEffect } from 'react'
import { Search, Filter, X, ChevronDown, SlidersHorizontal, Eye, EyeOff, Package, Globe } from 'lucide-react'
import { Link, useRouter, usePathname } from '@/i18n/routing'

interface ActiveFilters {
    search: string;
    status: string;
    type: string;
    lang: string;
    sort: string;
    jumia: string;
    category?: string;
    subCategory?: string;
}

interface BookFiltersProps {
    activeFilters: ActiveFilters;
    totalCount: number;
    categories: string[];
    categoryTree?: Record<string, string[]>;
}

export default function BookFilters({
    activeFilters,
    totalCount,
    categories,
    categoryTree
}: BookFiltersProps) {
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
        if (newFilters.status) params.set('status', newFilters.status)
        if (newFilters.type) params.set('type', newFilters.type)
        if (newFilters.lang) params.set('lang', newFilters.lang)
        if (newFilters.sort) params.set('sort', newFilters.sort)
        if (newFilters.jumia) params.set('jumia', newFilters.jumia)
        if (newFilters.category) params.set('category', newFilters.category)
        if (newFilters.subCategory) params.set('subCategory', newFilters.subCategory)
        
        params.set('page', '1')
        router.push(`${pathname}?${params.toString()}`)
    }

    const clearFilters = () => {
        setLocalSearch('')
        router.push(pathname)
    }

    const hasActiveFilters = Object.values(activeFilters).some(v => v !== '')

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
                    {totalCount} Livres trouvés
                </div>
            </div>

            {/* Filters Panel */}
            {isOpen && (
                <div className="bg-white p-8 rounded-3xl border border-gray-200 shadow-xl animate-in slide-in-from-top-4 duration-300">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-8">
                        {/* Search */}
                        <div className="space-y-3">
                            <label className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-gray-500">
                                <Search className="w-3 h-3" />
                                Recherche
                            </label>
                            <form onSubmit={(e) => { e.preventDefault(); handleApplyFilters({ search: localSearch }); }} className="relative">
                                <input
                                    type="text"
                                    placeholder="Titre, auteur, catégorie..."
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
                                Statut & Image
                            </label>
                            <div className="flex flex-wrap gap-2">
                                {[
                                    { id: '', label: 'Tous' },
                                    { id: 'active', label: 'Actifs' },
                                    { id: 'inactive', label: 'Inactifs' },
                                    { id: 'no-image', label: 'Sans Image' }
                                ].map((f) => (
                                    <button
                                        key={f.id}
                                        onClick={() => handleApplyFilters({ status: f.id })}
                                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                                            activeFilters.status === f.id && !['in-stock', 'out-of-stock'].includes(activeFilters.status)
                                            ? 'bg-black text-white' 
                                            : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                                        }`}
                                    >
                                        {f.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Type de produit Filter */}
                        <div className="space-y-3">
                            <label className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-gray-500">
                                <Package className="w-3 h-3" />
                                Type de produit
                            </label>
                            <div className="flex flex-wrap gap-2">
                                {[
                                    { id: '', label: 'Tous' },
                                    { id: 'book', label: 'Livres' },
                                    { id: 'pack', label: 'Packs' },
                                    { id: 'kids', label: 'Enfants (Kids)' },
                                    { id: 'usb', label: 'Clés USB' },
                                    { id: 'bookmarks', label: 'Marque-pages' }
                                ].map((f) => (
                                    <button
                                        key={f.id}
                                        onClick={() => handleApplyFilters({ type: f.id })}
                                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                                            activeFilters.type === f.id
                                            ? 'bg-black text-white' 
                                            : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                                        }`}
                                    >
                                        {f.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Stock Filter */}
                        <div className="space-y-3">
                            <label className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-gray-500">
                                <Package className="w-3 h-3" />
                                Stock
                            </label>
                            <div className="flex flex-wrap gap-2">
                                {[
                                    { id: 'in-stock', label: 'En Stock' },
                                    { id: 'out-of-stock', label: 'Rupture' }
                                ].map((f) => (
                                    <button
                                        key={f.id}
                                        onClick={() => handleApplyFilters({ status: activeFilters.status === f.id ? '' : f.id })}
                                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                                            activeFilters.status === f.id 
                                            ? 'bg-black text-white' 
                                            : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                                        }`}
                                    >
                                        {f.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Language Filter */}
                        <div className="space-y-3">
                            <label className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-gray-500">
                                <Globe className="w-3 h-3" />
                                Langue
                            </label>
                            <div className="flex flex-wrap gap-2">
                                {[
                                    { id: 'fr', label: 'Français' },
                                    { id: 'ar', label: 'العربية' },
                                    { id: 'en', label: 'English' }
                                ].map((f) => (
                                    <button
                                        key={f.id}
                                        onClick={() => handleApplyFilters({ lang: activeFilters.lang === f.id ? '' : f.id })}
                                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                                            activeFilters.lang === f.id 
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
                        <div className="space-y-3 lg:col-span-2 xl:col-span-3">
                            <label className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-gray-500">
                                <Search className="w-3 h-3" />
                                Catégorie
                            </label>
                            <div className="flex flex-wrap gap-2">
                                <button
                                    onClick={() => handleApplyFilters({ category: '' })}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                                        !activeFilters.category 
                                        ? 'bg-black text-white' 
                                        : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                                    }`}
                                >
                                    Toutes
                                </button>
                                {categories.map((cat) => (
                                    <button
                                        key={cat}
                                        onClick={() => handleApplyFilters({ category: activeFilters.category === cat ? '' : cat, subCategory: '' })}
                                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                                            activeFilters.category === cat 
                                            ? 'bg-black text-white' 
                                            : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                                        }`}
                                    >
                                        {cat}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* SubCategory Filter */}
                        {activeFilters.category && categoryTree && categoryTree[activeFilters.category]?.length > 0 && (
                            <div className="space-y-3 lg:col-span-2 xl:col-span-3">
                                <label className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-gray-500">
                                    <Search className="w-3 h-3" />
                                    Sous-catégorie
                                </label>
                                <div className="flex flex-wrap gap-2">
                                    <button
                                        onClick={() => handleApplyFilters({ subCategory: '' })}
                                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                                            !activeFilters.subCategory 
                                            ? 'bg-black text-white' 
                                            : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                                        }`}
                                    >
                                        Toutes
                                    </button>
                                    {categoryTree[activeFilters.category].map((subCat) => (
                                        <button
                                            key={subCat}
                                            onClick={() => handleApplyFilters({ subCategory: activeFilters.subCategory === subCat ? '' : subCat })}
                                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                                                activeFilters.subCategory === subCat 
                                                ? 'bg-black text-white' 
                                                : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                                            }`}
                                        >
                                            {subCat}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Jumia Filter */}
                        <div className="space-y-3">
                            <label className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-gray-500">
                                <span className="text-[#f68b1e] font-black mr-1 text-[12px] leading-none">J</span>
                                Jumia
                            </label>
                            <div className="flex flex-wrap gap-2">
                                {[
                                    { id: 'synced', label: 'Synchronisé' },
                                    { id: 'not-synced', label: 'Non Synchronisé' },
                                    { id: 'has-sku', label: 'Avec SKU' },
                                    { id: 'no-sku', label: 'Sans SKU' }
                                ].map((f) => (
                                    <button
                                        key={f.id}
                                        onClick={() => handleApplyFilters({ jumia: activeFilters.jumia === f.id ? '' : f.id })}
                                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                                            activeFilters.jumia === f.id 
                                            ? 'bg-[#f68b1e] text-white' 
                                            : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                                        }`}
                                    >
                                        {f.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Sorting */}
                        <div className="space-y-3">
                            <label className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-gray-500">
                                <SlidersHorizontal className="w-3 h-3" />
                                Tri par
                            </label>
                            <div className="grid grid-cols-2 gap-2">
                                {[
                                    { id: 'price-asc', label: 'Prix Croissant' },
                                    { id: 'price-desc', label: 'Prix Décroissant' },
                                    { id: 'stock-asc', label: 'Stock Faible' },
                                    { id: 'stock-desc', label: 'Stock Élevé' },
                                    { id: 'title-asc', label: 'Nom (A-Z)' },
                                    { id: 'title-desc', label: 'Nom (Z-A)' }
                                ].map((f) => (
                                    <button
                                        key={f.id}
                                        onClick={() => handleApplyFilters({ sort: f.id })}
                                        className={`px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all ${
                                            activeFilters.sort === f.id 
                                            ? 'bg-blue-600 text-white' 
                                            : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                                        }`}
                                    >
                                        {f.label}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
