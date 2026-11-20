'use client'

import { useState } from 'react'
import { Link } from '@/i18n/routing'
import { Edit, Trash2, Eye, EyeOff, Home, BookOpen, Search, RotateCcw, ExternalLink } from 'lucide-react'
import { saveSeoCategory, deleteSeoCategory } from '@/lib/actions/seo-categories'

export default function SeoCategoriesTable({ categories }: { categories: any[] }) {
    const [categoryRows, setCategoryRows] = useState(categories)
    const [loading, setLoading] = useState<string | null>(null)
    const [search, setSearch] = useState('')
    const [localeFilter, setLocaleFilter] = useState('all')
    const [statusFilter, setStatusFilter] = useState('all')
    const [homeFilter, setHomeFilter] = useState('all')
    const [booksFilter, setBooksFilter] = useState('all')

    async function handleToggleStatus(category: any) {
        const nextStatus = !category.isActive
        setLoading(category.id)
        setCategoryRows(current => current.map(item =>
            item.id === category.id ? { ...item, isActive: nextStatus } : item
        ))
        const result = await saveSeoCategory(category.id, { ...category, isActive: nextStatus })
        setLoading(null)
        if (!result.success) {
            setCategoryRows(current => current.map(item =>
                item.id === category.id ? { ...item, isActive: category.isActive } : item
            ))
            alert(result.error)
        }
    }

    async function handleToggleHome(category: any) {
        const nextShowOnHome = !category.showOnHome
        setLoading(category.id)
        setCategoryRows(current => current.map(item =>
            item.id === category.id ? { ...item, showOnHome: nextShowOnHome } : item
        ))
        const result = await saveSeoCategory(category.id, { ...category, showOnHome: nextShowOnHome })
        setLoading(null)
        if (!result.success) {
            setCategoryRows(current => current.map(item =>
                item.id === category.id ? { ...item, showOnHome: category.showOnHome } : item
            ))
            alert(result.error)
        }
    }

    async function handleDelete(id: string, title: string) {
        if (!confirm(`Êtes-vous sûr de vouloir supprimer "${title}" ?`)) return
        setLoading(id)
        const result = await deleteSeoCategory(id)
        setLoading(null)
        if (!result.success) alert(result.error)
        else setCategoryRows(current => current.filter(item => item.id !== id))
    }

    const filtered = categoryRows.filter(category => {
        const query = search.trim().toLocaleLowerCase()
        const matchesSearch = !query || [category.title, category.slug, category.keyword, category.searchQuery]
            .some(value => value?.toLocaleLowerCase().includes(query))
        const matchesLocale = localeFilter === 'all' || category.locale === localeFilter
        const matchesStatus = statusFilter === 'all' || (statusFilter === 'active' ? category.isActive : !category.isActive)
        const matchesHome = homeFilter === 'all' || (homeFilter === 'shown' ? category.showOnHome : !category.showOnHome)
        const bookCount = category._count?.books || 0
        const matchesBooks = booksFilter === 'all' || (booksFilter === 'assigned' ? bookCount > 0 : bookCount === 0)

        return matchesSearch && matchesLocale && matchesStatus && matchesHome && matchesBooks
    })

    const hasActiveFilters = Boolean(search) || localeFilter !== 'all' || statusFilter !== 'all' || homeFilter !== 'all' || booksFilter !== 'all'

    const resetFilters = () => {
        setSearch('')
        setLocaleFilter('all')
        setStatusFilter('all')
        setHomeFilter('all')
        setBooksFilter('all')
    }

    return (
        <div>
            {/* Toolbar */}
            <div className="space-y-3 border-b border-gray-200 bg-white p-4">
                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-[minmax(260px,1fr)_repeat(4,minmax(140px,auto))_auto]">
                    <label className="relative block">
                        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                        <input
                            type="search"
                            placeholder="Titre, slug ou mot-clé..."
                            className="w-full rounded-lg border border-gray-300 py-2 pl-9 pr-3 outline-none focus:border-transparent focus:ring-2 focus:ring-blue-500"
                            value={search}
                            onChange={(event) => setSearch(event.target.value)}
                        />
                    </label>
                    <select aria-label="Filtrer par langue" value={localeFilter} onChange={(event) => setLocaleFilter(event.target.value)} className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium">
                        <option value="all">Toutes les langues</option>
                        <option value="fr">Français</option>
                        <option value="ar">Arabe</option>
                        <option value="en">Anglais</option>
                    </select>
                    <select aria-label="Filtrer par statut" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium">
                        <option value="all">Tous les statuts</option>
                        <option value="active">Actives</option>
                        <option value="inactive">Inactives</option>
                    </select>
                    <select aria-label="Filtrer par accueil" value={homeFilter} onChange={(event) => setHomeFilter(event.target.value)} className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium">
                        <option value="all">Accueil : tout</option>
                        <option value="shown">Affichées</option>
                        <option value="hidden">Masquées</option>
                    </select>
                    <select aria-label="Filtrer par livres" value={booksFilter} onChange={(event) => setBooksFilter(event.target.value)} className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium">
                        <option value="all">Livres : tout</option>
                        <option value="assigned">Avec livres</option>
                        <option value="empty">Sans livre</option>
                    </select>
                    <button type="button" onClick={resetFilters} disabled={!hasActiveFilters} className="inline-flex items-center justify-center gap-2 rounded-lg border border-gray-300 px-3 py-2 text-sm font-bold text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40">
                        <RotateCcw className="h-4 w-4" /> Réinitialiser
                    </button>
                </div>
                <p className="text-xs font-medium text-gray-500">{filtered.length} collection(s) affichée(s) sur {categoryRows.length}</p>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-gray-500">
                    <thead className="text-xs text-gray-700 uppercase bg-gray-50 border-b border-gray-200">
                        <tr>
                            <th className="px-6 py-4">Catégorie</th>
                            <th className="px-6 py-4">Locale</th>
                            <th className="px-6 py-4">Livres</th>
                            <th className="px-6 py-4">Mots-clés (Auto)</th>
                            <th className="px-6 py-4">Statut</th>
                            <th className="px-6 py-4">Page d&apos;accueil</th>
                            <th className="px-6 py-4">Aperçu client</th>
                            <th className="px-6 py-4 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filtered.map((category) => (
                            <tr key={category.id} className="bg-white border-b hover:bg-gray-50">
                                <td className="px-6 py-4">
                                    <Link
                                        href={`/admin/seo-categories/${category.id}`}
                                        className="font-bold text-gray-900 hover:text-blue-600 hover:underline transition-colors flex items-center gap-1.5 group"
                                        title="Modifier cette collection"
                                    >
                                        <span>{category.title}</span>
                                        <Edit className="w-3.5 h-3.5 text-gray-400 group-hover:text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                                    </Link>
                                    <div className="text-xs text-gray-500">/{category.locale}/collection/{category.slug}</div>
                                </td>
                                <td className="px-6 py-4">
                                    <span className="px-2 py-1 bg-gray-100 rounded text-xs font-medium uppercase">
                                        {category.locale}
                                    </span>
                                </td>
                                <td className="px-6 py-4">
                                    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${
                                        (category._count?.books || 0) > 0 
                                            ? 'bg-blue-50 text-blue-700 border border-blue-200' 
                                            : 'bg-amber-50 text-amber-700 border border-amber-200'
                                    }`}>
                                        <BookOpen className="w-3.5 h-3.5 mr-1" />
                                        {category._count?.books || 0}
                                    </span>
                                </td>
                                <td className="px-6 py-4 text-xs">
                                    {category.searchQuery || '-'}
                                </td>
                                <td className="px-6 py-4">
                                    <button
                                        onClick={() => handleToggleStatus(category)}
                                        disabled={loading === category.id}
                                        className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                                            category.isActive 
                                                ? 'bg-green-100 text-green-800' 
                                                : 'bg-red-100 text-red-800'
                                        }`}
                                    >
                                        {category.isActive ? <Eye className="w-3 h-3 mr-1" /> : <EyeOff className="w-3 h-3 mr-1" />}
                                        {category.isActive ? 'Actif' : 'Inactif'}
                                    </button>
                                </td>
                                <td className="px-6 py-4">
                                    <button
                                        onClick={() => handleToggleHome(category)}
                                        disabled={loading === category.id}
                                        className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                                            category.showOnHome 
                                                ? 'bg-blue-100 text-blue-800' 
                                                : 'bg-gray-100 text-gray-800'
                                        }`}
                                    >
                                        <Home className="w-3 h-3 mr-1" />
                                        {category.showOnHome ? 'Affiché' : 'Masqué'}
                                    </button>
                                </td>
                                <td className="px-6 py-4">
                                    <a
                                        href={`/${category.locale}/collection/${encodeURIComponent(category.slug)}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center gap-1.5 rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-2 text-xs font-bold text-indigo-700 transition-colors hover:bg-indigo-100"
                                        title="Ouvrir la collection comme un client"
                                    >
                                        <ExternalLink className="h-3.5 w-3.5" />
                                        Voir
                                    </a>
                                </td>
                                <td className="px-6 py-4 text-right space-x-2">
                                    <Link aria-label="Modifier"
                                        href={`/admin/seo-categories/${category.id}`}
                                        className="inline-flex items-center justify-center p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                    >
                                        <Edit className="w-4 h-4" />
                                    </Link>
                                    <button
                                        onClick={() => handleDelete(category.id, category.title)}
                                        className="inline-flex items-center justify-center p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                {filtered.length === 0 && (
                    <div className="text-center py-12 text-gray-500">
                        Aucune catégorie trouvée
                    </div>
                )}
            </div>
        </div>
    )
}
