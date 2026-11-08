import { requirePageRole } from '@/lib/page-authorization'
import { getSeoCategories } from '@/lib/actions/seo-categories'
import Link from 'next/link'
import { Plus } from 'lucide-react'
import SeoCategoriesTable from './SeoCategoriesTable'

export default async function SeoCategoriesPage() {
    await requirePageRole(["ADMIN","MANAGER"])

    const categories = await getSeoCategories()

    return (
        <div>
            {/* Header */}
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Catégories SEO</h1>
                    <p className="mt-2 text-sm text-gray-600">
                        Gérez les bannières de la page d'accueil et les pages d'atterrissage SEO
                    </p>
                </div>
                <Link
                    href="/admin/seo-categories/new"
                    className="inline-flex items-center px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
                >
                    <Plus className="w-5 h-5 mr-2" />
                    Créer une catégorie
                </Link>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                <div className="bg-white rounded-lg border border-gray-200 p-4">
                    <p className="text-sm font-medium text-gray-600">Total Catégories</p>
                    <p className="mt-2 text-2xl font-bold text-gray-900">{categories.length}</p>
                </div>
                <div className="bg-white rounded-lg border border-gray-200 p-4">
                    <p className="text-sm font-medium text-gray-600">Affichées sur l'accueil</p>
                    <p className="mt-2 text-2xl font-bold text-blue-600">
                        {categories.filter(c => c.showOnHome).length}
                    </p>
                </div>
                <div className="bg-white rounded-lg border border-gray-200 p-4">
                    <p className="text-sm font-medium text-gray-600">Actives</p>
                    <p className="mt-2 text-2xl font-bold text-green-600">
                        {categories.filter(c => c.isActive).length}
                    </p>
                </div>
                <div className="bg-white rounded-lg border border-gray-200 p-4">
                    <p className="text-sm font-medium text-gray-600">Livres Affectés</p>
                    <p className="mt-2 text-2xl font-bold text-indigo-600">
                        {categories.reduce((acc, c: any) => acc + (c._count?.books || 0), 0)}
                    </p>
                </div>
            </div>

            {/* Table */}
            <div className="bg-white rounded-lg border border-gray-200">
                <SeoCategoriesTable categories={categories} />
            </div>
        </div>
    )
}
