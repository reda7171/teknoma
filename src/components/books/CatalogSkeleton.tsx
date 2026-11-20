import React from 'react'

interface CatalogSkeletonProps {
    count?: number
}

export default function CatalogSkeleton({ count = 8 }: CatalogSkeletonProps) {
    return (
        <div 
            className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4 lg:gap-5"
            aria-hidden="true"
        >
            {Array.from({ length: count }).map((_, i) => (
                <div
                    key={i}
                    className="bg-white rounded-3xl overflow-hidden border border-gray-100 shadow-sm h-full flex flex-col p-3 sm:p-4"
                >
                    {/* Conteneur image ratio 3/4 exact de BookCard */}
                    <div className="relative aspect-[3/4] w-full rounded-2xl bg-gray-100 shimmer-placeholder mb-3 sm:mb-4" />

                    {/* Titre & Auteur */}
                    <div className="space-y-2 flex-1 px-1">
                        <div className="h-4 bg-gray-200 rounded-md w-4/5 shimmer-placeholder" />
                        <div className="h-3 bg-gray-100 rounded-md w-3/5 shimmer-placeholder" />
                    </div>

                    {/* Prix et bouton d'action */}
                    <div className="mt-4 pt-3 flex flex-col items-center gap-2.5 w-full">
                        <div className="h-6 bg-gray-200 rounded-lg w-20 shimmer-placeholder" />
                        <div className="h-11 sm:h-12 bg-gray-900/10 rounded-2xl w-full shimmer-placeholder" />
                    </div>
                </div>
            ))}
        </div>
    )
}
