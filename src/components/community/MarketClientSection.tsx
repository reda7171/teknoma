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

                {/* Filtres intégrés à la carte sur grand écran */}
                <div className="hidden md:block absolute top-5 left-1/2 -translate-x-1/2 w-[60rem] max-w-[calc(100%-3rem)] z-20">
                    <MarketFiltersClient onPendingChange={setIsPending} embedded />
                </div>
            </div>

            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-12 pb-24 sm:pb-32 w-full">
                {/* Filtres mobiles placés au-dessus du contenu pour éviter de masquer la carte ou le modal de déblocage */}
                <div className="block md:hidden -mt-6 mb-6 relative z-10">
                    <MarketFiltersClient onPendingChange={setIsPending} embedded />
                </div>

                <div className="mb-6 sm:mb-12 text-center md:text-start">
                    <h1 className="text-2xl sm:text-4xl lg:text-5xl font-black text-black tracking-tighter mb-2 sm:mb-4 uppercase">
                        {t('Title')}
                    </h1>
                    <p className="text-gray-500 font-medium text-xs sm:text-base max-w-2xl mx-auto md:mx-0">
                        {t('Subtitle')}
                    </p>
                </div>

                {/* Content Container */}
                <div className="relative min-h-[400px] sm:min-h-[500px] w-full">
                {/* Overlay Skeleton during transitions */}
                {isPending && (
                    <div className="absolute inset-0 bg-pixio-cream/60 z-20 backdrop-blur-[2px] animate-in fade-in duration-300">
                        <BookGridSkeleton />
                    </div>
                )}

                <div className={`transition-opacity duration-300 ${isPending ? 'opacity-30 pointer-events-none' : 'opacity-100'}`}>
                    {/* Smart Matches Section (Hidden if searching/filtering) */}
                    {smartMatches.length > 0 && !search && !city && (
                        <div className="mb-8 sm:mb-16">
                            <div className="flex items-center gap-3 mb-4 sm:mb-8">
                                <div className="w-9 h-9 sm:w-10 sm:h-10 bg-black text-white rounded-xl sm:rounded-2xl flex items-center justify-center shadow-lg transform -rotate-3 shrink-0">
                                    <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 text-pixio-yellow" />
                                </div>
                                <div>
                                    <h2 className="text-lg sm:text-2xl font-black text-black tracking-tight uppercase">{t('MatchesForYou')}</h2>
                                    <p className="text-[9px] sm:text-[10px] font-black uppercase tracking-widest text-gray-400">{t('BasedOnWishlist')}</p>
                                </div>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6 lg:gap-8">
                                {smartMatches.map((book: any) => (
                                    <MarketBookCard key={book.id} book={book} isSmartMatch isBlurred={isBlurred} />
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Main Grid Title */}
                    <div className="flex items-center gap-3 mb-4 sm:mb-8">
                        <div className="w-2 h-6 sm:h-8 bg-black rounded-full" />
                        <h2 className="text-lg sm:text-2xl font-black text-black tracking-tight uppercase">{t('AllBooks')}</h2>
                    </div>

                    {/* Main Grid */}
                    {initialBooks.length > 0 ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6 lg:gap-8">
                            {initialBooks.map((book: any) => (
                                <MarketBookCard key={book.id} book={book} isBlurred={isBlurred} />
                            ))}
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center py-16 sm:py-24 bg-white rounded-3xl sm:rounded-[3rem] border-dashed border-2 border-gray-100 shadow-inner px-4 text-center">
                            <div className="w-16 h-16 sm:w-20 sm:h-20 bg-gray-50 rounded-full flex items-center justify-center mb-4 sm:mb-6">
                                <Frown className="w-8 h-8 sm:w-10 sm:h-10 text-gray-200" />
                            </div>
                            <h2 className="text-xl sm:text-2xl font-black text-black mb-2 uppercase">{t('NoResults')}</h2>
                            <p className="text-gray-400 font-bold max-w-sm text-center text-xs sm:text-sm">
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
