export default function BookLoadingSkeleton() {
    return (
        <div className="min-h-screen bg-pixio-cream" aria-busy="true" aria-label="Chargement du livre">
            {/* Header skeleton */}
            <div className="bg-white/80 backdrop-blur-md border-b border-gray-100 h-16 sm:h-20" />

            {/* SubNav skeleton */}
            <div className="border-b border-gray-100 bg-white/50 h-12 flex items-center px-4 sm:px-8">
                <div className="max-w-7xl mx-auto w-full flex items-center gap-2">
                    <div className="h-3 w-16 bg-slate-200 rounded-full animate-pulse" />
                    <span className="text-gray-300">/</span>
                    <div className="h-3 w-16 bg-slate-200 rounded-full animate-pulse" />
                    <span className="text-gray-300">/</span>
                    <div className="h-3 w-32 bg-slate-200 rounded-full animate-pulse" />
                </div>
            </div>

            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 md:pt-10 pb-64 md:pb-40">
                {/* Search skeleton */}
                <div className="mb-6 md:mb-10 max-w-xl mx-auto">
                    <div className="h-12 bg-white rounded-full border border-gray-100 shadow-sm animate-pulse" />
                </div>

                {/* Product Detail Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-20 mb-10 md:mb-32">
                    {/* Left: Book Cover Skeleton */}
                    <div className="lg:sticky lg:top-24 lg:self-start">
                        <div className="bg-white rounded-[2rem] md:rounded-[3rem] p-4 sm:p-6 md:p-10 shadow-2xl shadow-black/5 border border-gray-100">
                            <div className="relative aspect-[3/4] max-w-sm mx-auto w-full rounded-[2rem] overflow-hidden bg-slate-100 border border-slate-200/50 shadow-xl">
                                <div className="absolute inset-0 bg-gradient-to-tr from-slate-200 via-slate-100 to-slate-200 animate-pulse" />
                                <div className="absolute inset-0 flex items-center justify-center">
                                    <div className="w-16 h-20 border-2 border-slate-300/60 rounded-lg animate-pulse opacity-40" />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Right: Book Details Skeleton */}
                    <div className="flex flex-col gap-8 md:gap-12">
                        {/* Title & Badges */}
                        <div className="space-y-4 md:space-y-6">
                            <div className="flex items-center gap-3">
                                <div className="h-7 w-24 bg-slate-200 rounded-full animate-pulse" />
                                <div className="h-7 w-20 bg-slate-100 rounded-full animate-pulse" />
                            </div>
                            <div className="h-10 sm:h-14 w-4/5 bg-slate-200 rounded-2xl animate-pulse" />
                            <div className="h-6 w-1/3 bg-slate-100 rounded-xl animate-pulse" />
                        </div>

                        {/* Rating Skeleton */}
                        <div className="flex items-center gap-4">
                            <div className="h-10 w-28 bg-white rounded-2xl border border-gray-100 shadow-sm animate-pulse" />
                            <div className="h-4 w-32 bg-slate-200 rounded-full animate-pulse" />
                        </div>

                        {/* Price Card Skeleton */}
                        <div className="bg-white border border-gray-100 rounded-[2rem] md:rounded-[3rem] p-5 md:p-10 shadow-2xl shadow-black/5 space-y-4">
                            <div className="h-12 sm:h-16 w-40 bg-slate-200 rounded-2xl animate-pulse" />
                            <div className="flex gap-4">
                                <div className="h-4 w-32 bg-slate-100 rounded-full animate-pulse" />
                                <div className="h-4 w-36 bg-slate-100 rounded-full animate-pulse" />
                            </div>
                        </div>

                        {/* Trust Badges Skeleton */}
                        <div className="grid grid-cols-3 gap-2 sm:gap-6 py-6 border-y border-gray-100">
                            {[0, 1, 2].map((i) => (
                                <div key={i} className="flex flex-col items-center gap-2">
                                    <div className="w-14 h-14 bg-slate-100 rounded-2xl animate-pulse" />
                                    <div className="h-3 w-16 bg-slate-100 rounded-full animate-pulse" />
                                </div>
                            ))}
                        </div>

                        {/* Actions Skeleton */}
                        <div className="grid grid-cols-2 gap-3 pt-2">
                            <div className="h-14 bg-emerald-100/60 rounded-full border border-emerald-200/40 animate-pulse" />
                            <div className="h-14 bg-slate-200 rounded-full animate-pulse" />
                        </div>
                    </div>
                </div>
            </main>
        </div>
    )
}
