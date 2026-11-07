'use client'

import { useState, useEffect } from 'react'
import { useRouter } from '@/i18n/routing'
import { useTranslations } from 'next-intl'
import { LayoutGrid, Sparkles } from 'lucide-react'

interface CatalogViewSwitcherProps {
    activeParams?: Record<string, string | undefined>
}

const CATALOG_STORAGE_KEY = 'riwaya_catalog_filters'

export default function CatalogViewSwitcher({ activeParams = {} }: CatalogViewSwitcherProps) {
    const t = useTranslations('BooksPage')
    const router = useRouter()
    const [mounted, setMounted] = useState(false)
    const [savedPreferences, setSavedPreferences] = useState<Record<string, string> | null>(null)

    // Vérifie si des critères spécifiques sont actuellement appliqués dans l'URL
    const hasActiveFilters = Boolean(
        activeParams.language ||
        activeParams.category ||
        activeParams.subCategory ||
        activeParams.inStock !== undefined ||
        activeParams.isUsed === 'true' ||
        activeParams.usedOnly === 'true' ||
        activeParams.newArrivals === 'true' ||
        activeParams.author
    )

    useEffect(() => {
        setMounted(true)
        try {
            const raw = localStorage.getItem(CATALOG_STORAGE_KEY)
            if (raw) {
                const parsed = JSON.parse(raw)
                if (parsed && typeof parsed === 'object' && Object.keys(parsed).length > 0) {
                    setSavedPreferences(parsed)
                }
            }
        } catch {}
    }, [activeParams])

    // Basculer vers la vue par défaut (catalogue complet sans filtre d'URL)
    const handleSelectDefaultView = () => {
        router.push('/books')
    }

    // Basculer vers la vue personnalisée mémorisée
    const handleSelectCustomView = () => {
        if (savedPreferences && Object.keys(savedPreferences).length > 0) {
            const newParams = new URLSearchParams()
            if (savedPreferences.language) newParams.set('language', savedPreferences.language)
            if (savedPreferences.category) newParams.set('category', savedPreferences.category)
            if (savedPreferences.subCategory) newParams.set('subCategory', savedPreferences.subCategory)
            if (savedPreferences.inStock !== undefined) newParams.set('inStock', savedPreferences.inStock)
            if (savedPreferences.isUsed) newParams.set('isUsed', 'true')
            if (savedPreferences.newArrivals) newParams.set('newArrivals', 'true')
            if (savedPreferences.author) newParams.set('author', savedPreferences.author)

            const queryStr = newParams.toString()
            router.push(`/books${queryStr ? `?${queryStr}` : ''}`)
        } else {
            // Si aucune préférence n'est encore enregistrée, activer un filtre recommandé (en stock)
            router.push('/books?inStock=true')
        }
    }

    if (!mounted) return null

    return (
        <div className="inline-flex items-center p-1 bg-gray-100/90 backdrop-blur-sm rounded-2xl border border-gray-200/60 shadow-sm gap-1 mb-4 select-none touch-pan-y">
            {/* 1. Vue par défaut */}
            <button
                type="button"
                onClick={handleSelectDefaultView}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-black transition-all ${
                    !hasActiveFilters
                        ? 'bg-white text-black shadow-md shadow-black/5'
                        : 'text-gray-800 hover:text-black hover:bg-white/50'
                }`}
                aria-pressed={!hasActiveFilters}
            >
                <LayoutGrid className={`w-3.5 h-3.5 ${!hasActiveFilters ? 'text-black' : 'text-gray-700'}`} />
                <span>{t('DefaultView')}</span>
            </button>

            {/* 2. Ma vue personnalisée */}
            <button
                type="button"
                onClick={handleSelectCustomView}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-black transition-all ${
                    hasActiveFilters
                        ? 'bg-black text-white shadow-md shadow-black/20'
                        : 'text-gray-800 hover:text-black hover:bg-white/50'
                }`}
                aria-pressed={hasActiveFilters}
            >
                <Sparkles className={`w-3.5 h-3.5 ${hasActiveFilters ? 'text-amber-400 fill-amber-400' : 'text-gray-700'}`} />
                <span>{t('CustomView')}</span>
                {savedPreferences && Object.keys(savedPreferences).length > 0 && (
                    <span className={`w-1.5 h-1.5 rounded-full ${hasActiveFilters ? 'bg-emerald-400 animate-pulse' : 'bg-gray-600'}`} />
                )}
            </button>
        </div>
    )
}

