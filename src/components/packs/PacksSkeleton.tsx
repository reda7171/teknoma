import React from 'react'

export default function PacksSkeleton() {
    return (
        <div className="min-h-screen bg-[#FDFBF7]" aria-hidden="true">
            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
                {/* Header Skeleton */}
                <div className="text-center max-w-2xl mx-auto mb-10 space-y-3">
                    <div className="h-10 sm:h-12 w-48 sm:w-64 bg-gray-200 rounded-2xl mx-auto shimmer-placeholder" />
                    <div className="h-4 w-72 sm:w-96 bg-gray-100 rounded-lg mx-auto shimmer-placeholder" />
                </div>

                {/* Packs Grid Skeleton */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
                    {[1, 2, 3, 4, 5, 6].map((i) => (
                        <div
                            key={i}
                            className="bg-white rounded-3xl overflow-hidden border border-gray-100 shadow-sm p-4 sm:p-6 flex flex-col"
                        >
                            <div className="aspect-[4/3] w-full bg-gray-100 rounded-2xl shimmer-placeholder mb-5" />
                            <div className="space-y-3 flex-1">
                                <div className="h-6 bg-gray-200 rounded-lg w-3/4 shimmer-placeholder" />
                                <div className="h-4 bg-gray-100 rounded-md w-1/2 shimmer-placeholder" />
                            </div>
                            <div className="mt-6 pt-4 border-t border-gray-50 flex items-center justify-between">
                                <div className="h-7 w-20 bg-gray-200 rounded-lg shimmer-placeholder" />
                                <div className="h-11 w-32 bg-gray-900/10 rounded-xl shimmer-placeholder" />
                            </div>
                        </div>
                    ))}
                </div>
            </main>
        </div>
    )
}
