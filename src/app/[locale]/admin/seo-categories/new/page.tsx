import { requirePageRole } from '@/lib/page-authorization'
import SeoCategoryForm from '../SeoCategoryForm'
import { getSeoCategoryBookOptions } from '@/lib/db/books'

export default async function NewSeoCategoryPage() {
    await requirePageRole(["ADMIN","MANAGER"])

    const books = await getSeoCategoryBookOptions()

    return (
        <div>
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-gray-900">Nouvelle Catégorie SEO</h1>
                <p className="mt-2 text-sm text-gray-600">
                    Créez une nouvelle page d'atterrissage ou une bannière pour l'accueil
                </p>
            </div>

            <div className="bg-white rounded-lg border border-gray-200">
                <SeoCategoryForm books={books} />
            </div>
        </div>
    )
}
