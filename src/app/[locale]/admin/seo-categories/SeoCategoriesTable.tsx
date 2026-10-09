'use client'

import { useState } from 'react'
import { Link } from '@/i18n/routing'
import { Edit, Trash2, Eye, EyeOff, Home, BookOpen } from 'lucide-react'
import { saveSeoCategory, deleteSeoCategory } from '@/lib/actions/seo-categories'

export default function SeoCategoriesTable({ categories }: { categories: any[] }) {
    const [loading, setLoading] = useState<string | null>(null)
    const [search, setSearch] = useState('')

    async function handleToggleStatus(category: any) {
        setLoading(category.id)
        const result = await saveSeoCategory(category.id, { ...category, isActive: !category.isActive })
        setLoading(null)
        if (!result.success) alert(result.error)
        else window.location.reload()
    }

    async function handleToggleHome(category: any) {
        setLoading(category.id)
        const result = await saveSeoCategory(category.id, { ...category, showOnHome: !category.showOnHome })
        setLoading(null)
        if (!result.success) alert(result.error)
        else window.location.reload()
    }

    async function handleDelete(id: string, title: string) {
        if (!confirm(`Êtes-vous sûr de vouloir supprimer "${title}" ?`)) return
        setLoading(id)
        const result = await deleteSeoCategory(id)
        setLoading(null)
        if (!result.success) alert(result.error)
        else window.location.reload()
    }

    const filtered = categories.filter(c => 
        c.title.toLowerCase().includes(search.toLowerCase()) || 
        c.slug.toLowerCase().includes(search.toLowerCase()) ||
        (c.keyword && c.keyword.toLowerCase().includes(search.toLowerCase())) ||
        (c.searchQuery && c.searchQuery.toLowerCase().includes(search.toLowerCase()))
    )

    return (
        <div>
            {/* Toolbar */}
            <div className="p-4 border-b border-gray-200 flex items-center justify-between bg-white">
                <input
                    type="text"
                    placeholder="Rechercher une catégorie..."
                    className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none w-64"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                />
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
                            <th className="px-6 py-4">Page d'accueil</th>
                            <th className="px-6 py-4 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filtered.map((category) => (
                            <tr key={category.id} className="bg-white border-b hover:bg-gray-50">
                                <td className="px-6 py-4">
                                    <div className="font-medium text-gray-900">{category.title}</div>
                                    <div className="text-xs text-gray-500">/{category.locale}/seo/{category.slug}</div>
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
