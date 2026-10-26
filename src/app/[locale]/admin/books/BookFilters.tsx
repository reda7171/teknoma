'use client'

import { useState, useEffect } from 'react'
import { Search, Filter, X, ChevronDown, SlidersHorizontal, Eye, EyeOff, Package, Globe, TrendingUp } from 'lucide-react'
import { Link, useRouter, usePathname } from '@/i18n/routing'

interface ActiveFilters {
    search: string;
    status: string;
    type: string;
    lang: string;
    sort: string;
    jumia: string;
    condition: string;
    category?: string;
    subCategory?: string;
    seoScore?: string;
    linked?: string;
    limit?: string | number;
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
        const currentUrlParams = new URLSearchParams(typeof window !== 'undefined' ? window.location.search : '')
        const params = new URLSearchParams()
        
        if (newFilters.search?.trim()) params.set('search', newFilters.search.trim())
        if (newFilters.status) params.set('status', newFilters.status)
        if (newFilters.type) params.set('type', newFilters.type)
        if (newFilters.lang) params.set('lang', newFilters.lang)
        if (newFilters.sort) params.set('sort', newFilters.sort)
        if (newFilters.jumia) params.set('jumia', newFilters.jumia)
        if (newFilters.condition) params.set('condition', newFilters.condition)
        if (newFilters.category) params.set('category', newFilters.category)
        if (newFilters.subCategory) params.set('subCategory', newFilters.subCategory)
        if (newFilters.seoScore) params.set('seoScore', newFilters.seoScore)
        if (newFilters.linked) params.set('linked', newFilters.linked)
        
        const effectiveLimit = newFilters.limit || currentUrlParams.get('limit')
        if (effectiveLimit && effectiveLimit.toString() !== '20') {
            params.set('limit', effectiveLimit.toString())
        }
        
        params.set('page', '1')
        router.push(`${pathname}?${params.toString()}`)
    }

    const clearFilters = () => {
        setLocalSearch('')
        const currentUrlParams = new URLSearchParams(typeof window !== 'undefined' ? window.location.search : '')
        const effectiveLimit = activeFilters.limit || currentUrlParams.get('limit')
        const params = new URLSearchParams()
        if (effectiveLimit && effectiveLimit.toString() !== '20') {
            params.set('limit', effectiveLimit.toString())
        }
        router.push(params.toString() ? `${pathname}?${params.toString()}` : pathname)
    }

    const hasActiveFilters = [
        activeFilters.search,
        activeFilters.status,
        activeFilters.type,
        activeFilters.lang,
        activeFilters.sort,
        activeFilters.jumia,
        activeFilters.condition,
        activeFilters.category,
        activeFilters.subCategory,
        activeFilters.seoScore,
        activeFilters.linked
    ].some(v => !!v)

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
                                    { id: 'active', label: 'Actifs' },
                                    { id: 'inactive', label: 'Inactifs' },
                                    { id: 'no-image', label: 'Sans Image' }
                                ].map((f) => {
                                    const currentStatus = activeFilters.status ? activeFilters.status.split(',') : []
                                    const isActive = currentStatus.includes(f.id)
                                    return (
                                        <button
                                            key={f.id}
                                            onClick={() => {
                                                let newStatus = [...currentStatus]
                                                if (newStatus.includes(f.id)) {
                                                    newStatus = newStatus.filter(s => s !== f.id)
                                                } else {
                                                    // Handle exclusive active/inactive
                                                    if (f.id === 'active') newStatus = [...newStatus.filter(s => s !== 'inactive'), f.id]
                                                    else if (f.id === 'inactive') newStatus = [...newStatus.filter(s => s !== 'active'), f.id]
                                                    else newStatus.push(f.id)
                                                }
                                                handleApplyFilters({ status: newStatus.join(',') })
                                            }}
                                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                                                isActive
                                                ? 'bg-black text-white' 
                                                : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                                            }`}
                                        >
                                            {f.label}
                                        </button>
                                    )
                                })}
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
                                ].map((f) => {
                                    const currentTypes = activeFilters.type ? activeFilters.type.split(',') : []
                                    const isActive = f.id === '' ? currentTypes.length === 0 : currentTypes.includes(f.id)

                                    return (
                                        <button
                                            key={f.id}
                                            onClick={() => {
                                                if (f.id === '') {
                                                    handleApplyFilters({ type: '' })
                                                } else {
                                                    let newTypes = [...currentTypes]
                                                    if (newTypes.includes(f.id)) {
                                                        newTypes = newTypes.filter(t => t !== f.id)
                                                    } else {
                                                        newTypes.push(f.id)
                                                    }
                                                    handleApplyFilters({ type: newTypes.join(',') })
                                                }
                                            }}
                                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                                                isActive
                                                ? 'bg-black text-white' 
                                                : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                                            }`}
                                        >
                                            {f.label}
                                        </button>
                                    )
                                })}
                            </div>
                        </div>

                        {/* État du livre */}
                        <div className="space-y-3">
                            <label className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-gray-500">
                                <Package className="w-3 h-3" />
                                État du livre
                            </label>
                            <div className="flex flex-wrap gap-2">
                                {[
                                    { id: '', label: 'Tous' },
                                    { id: 'new', label: 'Livres neufs' },
                                    { id: 'old', label: "Livres d’occasion" }
                                ].map(filter => (
                                    <button
                                        key={filter.id}
                                        onClick={() => handleApplyFilters({ condition: filter.id })}
                                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                                            activeFilters.condition === filter.id
                                                ? 'bg-emerald-600 text-white'
                                                : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                                        }`}
                                    >
                                        {filter.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Score SEO Filter */}
                        <div className="space-y-3">
                            <label className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-gray-500">
                                <TrendingUp className="w-3 h-3 text-emerald-600" />
                                Score SEO
                            </label>
                            <div className="flex flex-wrap gap-2">
                                {[
                                    { id: '', label: 'Tous' },
                                    { id: 'lte80', label: 'Score SEO ≤ 80' },
                                    { id: 'gt80', label: 'Score SEO > 80' }
                                ].map((f) => {
                                    const isActive = f.id === '' ? !activeFilters.seoScore : activeFilters.seoScore === f.id
                                    return (
                                        <button
                                            key={f.id}
                                            onClick={() => handleApplyFilters({ seoScore: f.id })}
                                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                                                isActive
                                                    ? (f.id === 'lte80' ? 'bg-amber-600 text-white shadow-sm' : f.id === 'gt80' ? 'bg-emerald-600 text-white shadow-sm' : 'bg-black text-white')
                                                    : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                                            }`}
                                        >
                                            {f.label}
                                        </button>
                                    )
                                })}
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
                                ].map((f) => {
                                    const currentStatus = activeFilters.status ? activeFilters.status.split(',') : []
                                    const isActive = currentStatus.includes(f.id)
                                    return (
                                        <button
                                            key={f.id}
                                            onClick={() => {
                                                let newStatus = [...currentStatus]
                                                if (newStatus.includes(f.id)) {
                                                    newStatus = newStatus.filter(s => s !== f.id)
                                                } else {
                                                    // Exclusive in-stock / out-of-stock
                                                    if (f.id === 'in-stock') newStatus = [...newStatus.filter(s => s !== 'out-of-stock'), f.id]
                                                    else if (f.id === 'out-of-stock') newStatus = [...newStatus.filter(s => s !== 'in-stock'), f.id]
                                                    else newStatus.push(f.id)
                                                }
                                                handleApplyFilters({ status: newStatus.join(',') })
                                            }}
                                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                                                isActive 
                                                ? 'bg-black text-white' 
                                                : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                                            }`}
                                        >
                                            {f.label}
                                        </button>
                                    )
                                })}
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
                                ].map((f) => {
                                    const currentLangs = activeFilters.lang ? activeFilters.lang.split(',') : []
                                    const isActive = currentLangs.includes(f.id)
                                    return (
                                        <button
                                            key={f.id}
                                            onClick={() => {
                                                let newLangs = [...currentLangs]
                                                if (newLangs.includes(f.id)) {
                                                    newLangs = newLangs.filter(l => l !== f.id)
                                                } else {
                                                    newLangs.push(f.id)
                                                }
                                                handleApplyFilters({ lang: newLangs.join(',') })
                                            }}
                                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                                                isActive 
                                                ? 'bg-black text-white' 
                                                : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                                            }`}
                                        >
                                            {f.label}
                                        </button>
                                    )
                                })}
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
                                {categories.map((cat) => {
                                    const currentCats = activeFilters.category ? activeFilters.category.split(',') : []
                                    const isActive = currentCats.includes(cat)
                                    return (
                                        <button
                                            key={cat}
                                            onClick={() => {
                                                let newCats = [...currentCats]
                                                if (newCats.includes(cat)) {
                                                    newCats = newCats.filter(c => c !== cat)
                                                } else {
                                                    newCats.push(cat)
                                                }
                                                handleApplyFilters({ category: newCats.join(','), subCategory: '' })
                                            }}
                                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                                                isActive 
                                                ? 'bg-black text-white' 
                                                : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                                            }`}
                                        >
                                            {cat}
                                        </button>
                                    )
                                })}
                            </div>
                        </div>

                        {/* SubCategory Filter */}
                        {activeFilters.category && categoryTree && (
                            (() => {
                                const selectedCategories = activeFilters.category.split(',');
                                let availableSubCategories: string[] = [];
                                selectedCategories.forEach(cat => {
                                    if (categoryTree[cat]) {
                                        availableSubCategories.push(...categoryTree[cat]);
                                    }
                                });
                                
                                if (availableSubCategories.length === 0) return null;

                                return (
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
                                            {availableSubCategories.map((subCat) => {
                                                const currentSubCats = activeFilters.subCategory ? activeFilters.subCategory.split(',') : []
                                                const isActive = currentSubCats.includes(subCat)
                                                return (
                                                    <button
                                                        key={subCat}
                                                        onClick={() => {
                                                            let newSubCats = [...currentSubCats]
                                                            if (newSubCats.includes(subCat)) {
                                                                newSubCats = newSubCats.filter(c => c !== subCat)
                                                            } else {
                                                                newSubCats.push(subCat)
                                                            }
                                                            handleApplyFilters({ subCategory: newSubCats.join(',') })
                                                        }}
                                                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                                                            isActive 
                                                            ? 'bg-black text-white' 
                                                            : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                                                        }`}
                                                    >
                                                        {subCat}
                                                    </button>
                                                )
                                            })}
                                        </div>
                                    </div>
                                )
                            })()
                        )}

                        {/* SEO collection link filter */}
                        <div className="space-y-3">
                            <label className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-gray-500">
                                <Globe className="w-3 h-3 text-violet-600" />
                                Collection SEO
                            </label>
                            <div className="flex flex-wrap gap-2">
                                {[
                                    { id: '', label: 'Tous' },
                                    { id: 'linked', label: 'Linké' },
                                    { id: 'unlinked', label: 'Non linké' }
                                ].map((filter) => (
                                    <button
                                        key={filter.id}
                                        onClick={() => handleApplyFilters({ linked: filter.id })}
                                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                                            activeFilters.linked === filter.id
                                                ? 'bg-violet-600 text-white shadow-sm'
                                                : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                                        }`}
                                    >
                                        {filter.label}
                                    </button>
                                ))}
                            </div>
                        </div>

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
                                ].map((f) => {
                                    const currentJumiaArray = activeFilters.jumia ? activeFilters.jumia.split(',') : [];
                                    const isActive = currentJumiaArray.includes(f.id);
                                    
                                    return (
                                        <button
                                            key={f.id}
                                            onClick={() => {
                                                let newJumiaArray;
                                                if (isActive) {
                                                    newJumiaArray = currentJumiaArray.filter(i => i !== f.id);
                                                } else {
                                                    // Handle exclusive filters (can't be synced and not-synced at same time)
                                                    if (f.id === 'synced') newJumiaArray = [...currentJumiaArray.filter(i => i !== 'not-synced'), f.id];
                                                    else if (f.id === 'not-synced') newJumiaArray = [...currentJumiaArray.filter(i => i !== 'synced'), f.id];
                                                    else if (f.id === 'has-sku') newJumiaArray = [...currentJumiaArray.filter(i => i !== 'no-sku'), f.id];
                                                    else if (f.id === 'no-sku') newJumiaArray = [...currentJumiaArray.filter(i => i !== 'has-sku'), f.id];
                                                    else newJumiaArray = [...currentJumiaArray, f.id];
                                                }
                                                handleApplyFilters({ jumia: newJumiaArray.join(',') });
                                            }}
                                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                                                isActive 
                                                ? 'bg-[#f68b1e] text-white ring-2 ring-[#f68b1e] ring-offset-1' 
                                                : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                                            }`}
                                        >
                                            {f.label}
                                        </button>
                                    )
                                })}
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
                                    { id: 'created-desc', label: 'Date (Nouveau)' },
                                    { id: 'created-asc', label: 'Date (Ancien)' },
                                    { id: 'price-asc', label: 'Prix Croissant' },
                                    { id: 'price-desc', label: 'Prix Décroissant' },
                                    { id: 'stock-asc', label: 'Stock Faible' },
                                    { id: 'stock-desc', label: 'Stock Élevé' },
                                    { id: 'title-asc', label: 'Titre (A-Z)' },
                                    { id: 'title-desc', label: 'Titre (Z-A)' },
                                    { id: 'seo-asc', label: 'Score SEO Croissant' },
                                    { id: 'seo-desc', label: 'Score SEO Décroissant' }
                                ].map((f) => {
                                    const isSelected = activeFilters.sort === f.id ||
                                        (f.id === 'title-asc' && activeFilters.sort === 'a-z') ||
                                        (f.id === 'title-desc' && activeFilters.sort === 'z-a')
                                    return (
                                        <button
                                            key={f.id}
                                            onClick={() => handleApplyFilters({ sort: f.id })}
                                            className={`px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all ${
                                                isSelected 
                                                ? 'bg-blue-600 text-white shadow-sm' 
                                                : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                                            }`}
                                        >
                                            {f.label}
                                        </button>
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
