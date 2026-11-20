import CatalogSkeleton from '@/components/books/CatalogSkeleton'

export default function BooksLoading() {
    return (
        <div className="min-h-screen bg-[#FDFBF7]">
            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-10 pb-4 pt-4 lg:py-8">
                {/* Header catalogue skeleton */}
                <div className="mb-4 lg:mb-6 space-y-2">
                    <div className="h-8 sm:h-10 w-48 sm:w-64 bg-gray-200 rounded-2xl shimmer-placeholder" />
                    <div className="h-4 w-32 bg-gray-100 rounded shimmer-placeholder" />
                </div>

                {/* Grille skeleton */}
                <div className="flex-1">
                    <CatalogSkeleton count={12} />
                </div>
            </main>
        </div>
    )
}
