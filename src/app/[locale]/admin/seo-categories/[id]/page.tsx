import { requirePageRole } from '@/lib/page-authorization'
import SeoCategoryForm from '../SeoCategoryForm'
import { getSeoCategory } from '@/lib/actions/seo-categories'
import { getSeoCategoryBookOptions } from '@/lib/db/books'
import { notFound } from 'next/navigation'

export default async function EditSeoCategoryPage({ params }: { params: Promise<{ id: string }> }) {
    await requirePageRole(["ADMIN","MANAGER"])

    const { id } = await params
    const [category, books] = await Promise.all([
        getSeoCategory(id),
        getSeoCategoryBookOptions()
    ])

    if (!category) notFound()

    return (
        <div>
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-gray-900">Modifier la Catégorie SEO</h1>
                <p className="mt-2 text-sm text-gray-600">
                    {category.title}
                </p>
            </div>

            <div className="bg-white rounded-lg border border-gray-200">
                <SeoCategoryForm category={category} books={books} />
            </div>
        </div>
    )
}
