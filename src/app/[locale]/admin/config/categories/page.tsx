import { getTranslations } from 'next-intl/server'
import { getCategoryTree } from '@/lib/actions/category-tree'
import CategoryTreeForm from './CategoryTreeForm'
import { prisma } from '@/lib/prisma'

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
    const t = await getTranslations('Admin')
    return {
        title: `Configuration Catégories | Admin | Tekno Store`
    }
}

export default async function AdminCategoriesPage() {
    const initialTree = await getCategoryTree()

    const categoryCountsRaw = await prisma.book.groupBy({
        by: ['category'],
        _count: { category: true },
        where: { category: { not: '' } }
    })

    const subCategoryCountsRaw = await prisma.book.groupBy({
        by: ['category', 'subCategory'],
        _count: { subCategory: true },
        where: { subCategory: { not: '' } }
    })

    const counts: Record<string, number> = {}

    // Process main category counts
    categoryCountsRaw.forEach(item => {
        if (item.category) {
            counts[item.category] = item._count.category
        }
    })

    // Process subcategory counts (we'll key them as "MainCat::SubCat" to avoid collisions)
    subCategoryCountsRaw.forEach(item => {
        if (item.category && item.subCategory) {
            counts[`${item.category}::${item.subCategory}`] = item._count.subCategory
        }
    })

    return (
        <div className="p-6">
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-gray-900">Gestion des Catégories</h1>
                <p className="text-sm text-gray-500 mt-1">
                    Gérez la hiérarchie des catégories et sous-catégories affichées sur le site.
                </p>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                <CategoryTreeForm initialTree={initialTree} counts={counts} />
            </div>
        </div>
    )
}
