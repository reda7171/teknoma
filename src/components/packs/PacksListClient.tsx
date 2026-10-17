'use client'

import { useState, useMemo, useEffect } from 'react'
import PackCard from '@/components/PackCard'
import { Package, Sparkles, ChevronDown } from 'lucide-react'
import { useTranslations } from 'next-intl'
import CustomPackBuilder from './CustomPackBuilder'

interface PacksListClientProps {
    packs: any[]
    availableBooks: any[]
    openCustomBuilder?: boolean
}

const ITEMS_PER_PAGE = 9

export default function PacksListClient({ packs, availableBooks, openCustomBuilder = false }: PacksListClientProps) {
    const t = useTranslations('PacksPage')
    const tCommon = useTranslations('Common')
    const [filterAvailable, setFilterAvailable] = useState(false)
    const [visibleCount, setVisibleCount] = useState(ITEMS_PER_PAGE)

    const filteredPacks = useMemo(() => {
        if (!filterAvailable) return packs
        
        return packs.filter(pack => {
            // A pack is considered available if it has at least one book in stock
            // This allows partial packs to be shown if the user wants to replace missing books.
            return pack.books.some((pb: any) => pb.book.stock > 0)
        })
    }, [packs, filterAvailable])

    // Reset pagination when filter changes
    useEffect(() => {
        setVisibleCount(ITEMS_PER_PAGE)
    }, [filterAvailable])

    const displayedPacks = useMemo(() => {
        return filteredPacks.slice(0, visibleCount)
    }, [filteredPacks, visibleCount])

    if (packs.length === 0) {
        return (
            <div className="text-center py-20 bg-white rounded-[3rem] border border-gray-100 shadow-sm">
                <div className="w-24 h-24 bg-pixio-cream rounded-full flex items-center justify-center mx-auto mb-8">
                    <Package className="w-10 h-10 text-black/10" />
                </div>
                <h3 className="text-3xl md:text-4xl font-black text-black mb-4">{t('NoCollections')}</h3>
                <p className="text-gray-500 font-bold uppercase tracking-widest text-sm md:text-base">{t('Curating')}</p>
            </div>
        )
    }

    return (
        <>
            {/* Custom Pack Builder */}
            <CustomPackBuilder availableBooks={availableBooks} initialOpen={openCustomBuilder} />

            {/* Filter */}
            <div className="flex justify-end mb-10">
                <button
                    onClick={() => setFilterAvailable(!filterAvailable)}
                    className={`flex items-center gap-3 px-6 py-4 rounded-full font-black text-sm md:text-base uppercase tracking-widest transition-all whitespace-nowrap shadow-xl ${
                        filterAvailable 
                            ? 'bg-black text-white' 
                            : 'bg-white text-gray-700 hover:text-black'
                    }`}
                >
                    <div className={`w-3 h-3 rounded-full ${filterAvailable ? 'bg-green-400' : 'bg-gray-400'}`}></div>
                    {tCommon('Available')}
                </button>
            </div>

            {/* Benefits Banner */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-20">
                <div className="bg-white p-10 rounded-[2.5rem] border border-gray-100 shadow-sm flex flex-col items-center text-center gap-6 group hover:-translate-y-2 transition-transform">
                    <div className="w-16 h-16 bg-pixio-beige rounded-full flex items-center justify-center shrink-0">
                        <span className="text-2xl font-black text-black tracking-tighter">%</span>
                    </div>
                    <div className="space-y-2">
                        <h3 className="text-lg md:text-xl font-black uppercase tracking-widest text-black">{t('Benefits.HighSavings.Title')}</h3>
                        <p className="text-sm md:text-base font-bold text-gray-700 uppercase tracking-widest leading-loose">{t('Benefits.HighSavings.Desc')}</p>
                    </div>
                </div>
                <div className="bg-white p-10 rounded-[2.5rem] border border-gray-100 shadow-sm flex flex-col items-center text-center gap-6 group hover:-translate-y-2 transition-transform">
                    <div className="w-16 h-16 bg-pixio-pink rounded-full flex items-center justify-center shrink-0">
                        <Sparkles className="w-8 h-8 text-black" />
                    </div>
                    <div className="space-y-2">
                        <h3 className="text-lg md:text-xl font-black uppercase tracking-widest text-black">{t('Benefits.CuratedMix.Title')}</h3>
                        <p className="text-sm md:text-base font-bold text-gray-700 uppercase tracking-widest leading-loose">{t('Benefits.CuratedMix.Desc')}</p>
                    </div>
                </div>
                <div className="bg-white p-10 rounded-[2.5rem] border border-gray-100 shadow-sm flex flex-col items-center text-center gap-6 group hover:-translate-y-2 transition-transform">
                    <div className="w-16 h-16 bg-pixio-yellow rounded-full flex items-center justify-center shrink-0">
                        <Package className="w-8 h-8 text-black" />
                    </div>
                    <div className="space-y-2">
                        <h3 className="text-lg md:text-xl font-black uppercase tracking-widest text-black">{t('Benefits.ExpressPack.Title')}</h3>
                        <p className="text-sm md:text-base font-bold text-gray-700 uppercase tracking-widest leading-loose">{t('Benefits.ExpressPack.Desc')}</p>
                    </div>
                </div>
            </div>

            {/* Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
                {displayedPacks.length > 0 ? (
                    displayedPacks.map((pack, idx) => (
                        <PackCard
                            key={pack.id}
                            {...pack}
                            priority={idx < 3}
                            books={pack.books.map((pb: any) => ({
                                book: {
                                    ...pb.book,
                                    price: pb.book.price
                                }
                            }))}
                        />
                    ))
                ) : (
                    <div className="col-span-full text-center py-20 bg-white rounded-[3rem] border border-gray-100 shadow-sm">
                        <Package className="w-16 h-16 text-gray-400 mx-auto mb-6" />
                        <h3 className="text-2xl font-black text-black mb-4">Aucun pack disponible</h3>
                        <p className="text-gray-600 font-bold uppercase tracking-widest text-xs">Veuillez modifier vos filtres</p>
                    </div>
                )}
            </div>

            {/* Pagination / Load More */}
            {filteredPacks.length > visibleCount && (
                <div className="flex flex-col items-center justify-center mt-16 gap-3">
                    <button
                        onClick={() => setVisibleCount((prev) => prev + ITEMS_PER_PAGE)}
                        className="flex items-center gap-3 px-8 py-4 rounded-full font-black text-sm md:text-base uppercase tracking-widest bg-black text-white hover:bg-gray-800 transition-all shadow-xl hover:shadow-black/20 hover:-translate-y-0.5 active:translate-y-0 cursor-pointer"
                    >
                        <span>{tCommon('ShowMore')}</span>
                        <ChevronDown className="w-4 h-4 animate-bounce" />
                        <span className="text-xs bg-white/20 px-2.5 py-1 rounded-full font-bold">
                            +{Math.min(ITEMS_PER_PAGE, filteredPacks.length - visibleCount)}
                        </span>
                    </button>
                    <p className="text-xs font-bold text-gray-600 uppercase tracking-widest">
                        {displayedPacks.length} / {filteredPacks.length}
                    </p>
                </div>
            )}
        </>
    )
}
