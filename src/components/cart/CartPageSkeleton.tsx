import React from 'react'

export default function CartPageSkeleton() {
    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-10 md:py-20 pb-24 sm:pb-32 md:pb-40" aria-hidden="true">
            {/* Titre */}
            <div className="flex items-center justify-between mb-4 sm:mb-10 md:mb-16 px-2 sm:px-4">
                <div className="h-10 sm:h-14 w-48 sm:w-72 bg-gray-200 rounded-2xl shimmer-placeholder" />
                <div className="h-4 w-28 bg-gray-100 rounded-lg shimmer-placeholder" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 sm:gap-16">
                {/* Liste des cartes panier */}
                <div className="lg:col-span-2 space-y-6 px-4 sm:px-0">
                    {[1, 2, 3].map((i) => (
                        <div
                            key={i}
                            className="bg-white rounded-3xl sm:rounded-[2.5rem] p-5 sm:p-8 border border-gray-100 shadow-sm flex flex-col sm:flex-row gap-6 sm:gap-10"
                        >
                            {/* Image placeholder avec ratio fixe */}
                            <div className="relative w-full sm:w-32 h-44 flex-shrink-0 bg-gray-100 rounded-[2rem] shimmer-placeholder" />

                            {/* Détails */}
                            <div className="flex-1 flex flex-col justify-between py-1">
                                <div className="space-y-3">
                                    <div className="h-6 w-3/4 bg-gray-200 rounded-lg shimmer-placeholder" />
                                    <div className="h-4 w-1/3 bg-gray-100 rounded shimmer-placeholder" />
                                </div>
                                <div className="flex items-center justify-between pt-6">
                                    <div className="h-7 w-28 bg-gray-200 rounded-lg shimmer-placeholder" />
                                    <div className="h-10 w-28 bg-gray-100 rounded-full shimmer-placeholder" />
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Résumé commande droite */}
                <div className="lg:col-span-1 px-4 sm:px-0">
                    <div className="bg-white rounded-3xl sm:rounded-[2.5rem] p-6 sm:p-10 border border-gray-100 shadow-sm space-y-6">
                        <div className="h-6 w-36 bg-gray-200 rounded-lg shimmer-placeholder" />
                        <div className="space-y-4 pt-4 border-t border-gray-100">
                            <div className="flex justify-between">
                                <div className="h-4 w-20 bg-gray-100 rounded shimmer-placeholder" />
                                <div className="h-4 w-16 bg-gray-100 rounded shimmer-placeholder" />
                            </div>
                            <div className="flex justify-between">
                                <div className="h-4 w-24 bg-gray-100 rounded shimmer-placeholder" />
                                <div className="h-4 w-20 bg-gray-100 rounded shimmer-placeholder" />
                            </div>
                            <div className="flex justify-between pt-4 border-t border-gray-100">
                                <div className="h-6 w-24 bg-gray-200 rounded shimmer-placeholder" />
                                <div className="h-6 w-28 bg-gray-200 rounded shimmer-placeholder" />
                            </div>
                        </div>
                        <div className="h-14 w-full bg-gray-900 rounded-full shimmer-placeholder mt-6" />
                    </div>
                </div>
            </div>
        </div>
    )
}
