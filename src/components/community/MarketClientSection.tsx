'use client'

import { useState } from 'react'
import MarketFiltersClient from './MarketFiltersClient'
import MarketMap from './MarketMap'
import MarketBookCard from './MarketBookCard'
import BookGridSkeleton from './BookGridSkeleton'
import { Frown, Sparkles } from 'lucide-react'
import { useTranslations } from 'next-intl'

interface MarketClientSectionProps {
    initialBooks: any[]
    smartMatches: any[]
    search?: string
    city?: string
    isBlurred?: boolean
    isLoggedIn?: boolean
}

export default function MarketClientSection({ initialBooks, smartMatches, search, city, isBlurred, isLoggedIn }: MarketClientSectionProps) {
    const [isPending, setIsPending] = useState(false)
    const t = useTranslations('Community.Market')

    return (
        <div className="w-full flex-grow">
            <div className="relative w-full">
                <MarketMap books={initialBooks} isBlurred={isBlurred} isLoggedIn={isLoggedIn} />

                {/* Filtres intégrés à la carte */}
                <div className="absolute top-3 sm:top-5 left-4 right-4 z-20 md:left-1/2 md:right-auto md:w-[60rem] md:max-w-[calc(100%-3rem)] md:-translate-x-1/2">
                    <MarketFiltersClient onPendingChange={setIsPending} embedded />
                </div>
            </div>

            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 pb-24 sm:pb-32 w-full">
                <div className="mb-8 sm:mb-12 text-center md:text-start">
                    <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-black tracking-tighter mb-3 sm:mb-4 uppercase">
                        {t('Title')}
                    </h1>
                    <p className="text-gray-500 font-medium max-w-2xl mx-auto md:mx-0">
                        {t('Subtitle')}
                    </p>
                </div>

                {/* Content Container */}
                <div className="relative min-h-[500px] w-full">
                {/* Overlay Skeleton during transitions */}
                {isPending && (
                    <div className="absolute inset-0 bg-pixio-cream/60 z-20 backdrop-blur-[2px] animate-in fade-in duration-300">
                        <BookGridSkeleton />
                    </div>
                )}

                <div className={`transition-opacity duration-300 ${isPending ? 'opacity-30 pointer-events-none' : 'opacity-100'}`}>
                    {/* Smart Matches Section (Hidden if searching/filtering) */}
                    {smartMatches.length > 0 && !search && !city && (
                        <div className="mb-12 sm:mb-16">
                            <div className="flex items-center gap-3 mb-6 sm:mb-8">
                                <div className="w-10 h-10 bg-black text-white rounded-2xl flex items-center justify-center shadow-lg transform -rotate-3">
                                    <Sparkles className="w-5 h-5 text-pixio-yellow" />
                                </div>
                                <div>
                                    <h2 className="text-xl sm:text-2xl font-black text-black tracking-tight uppercase">{t('MatchesForYou')}</h2>
                                    <p className="text-[9px] sm:text-[10px] font-black uppercase tracking-widest text-gray-400">{t('BasedOnWishlist')}</p>
                                </div>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 sm:gap-8">
                                {smartMatches.map((book: any) => (
                                    <MarketBookCard key={book.id} book={book} isSmartMatch isBlurred={isBlurred} />
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Main Grid Title */}
                    <div className="flex items-center gap-3 mb-6 sm:mb-8">
                        <div className="w-2 h-6 sm:h-8 bg-black rounded-full" />
                        <h2 className="text-xl sm:text-2xl font-black text-black tracking-tight uppercase">{t('AllBooks')}</h2>
                    </div>

                    {/* Main Grid */}
                    {initialBooks.length > 0 ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
                            {initialBooks.map((book: any) => (
                                <MarketBookCard key={book.id} book={book} isBlurred={isBlurred} />
                            ))}
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center py-24 bg-white rounded-[3rem] border-dashed border-2 border-gray-100 shadow-inner">
                            <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mb-6">
                                <Frown className="w-10 h-10 text-gray-200" />
                            </div>
                            <h2 className="text-2xl font-black text-black mb-2 uppercase">{t('NoResults')}</h2>
                            <p className="text-gray-400 font-bold max-w-sm text-center text-sm">
                                {t('TryFilters')}
                            </p>
                        </div>
                    )}
                </div>
                </div>
            </main>
        </div>
    )
}
