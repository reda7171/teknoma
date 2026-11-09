'use client'

import React, { useState, useEffect, useRef } from 'react'
import { BookFilters } from '@/lib/db/books'
import { fetchBooks } from '@/lib/actions/books'
import BookCard from '@/components/BookCard'
import AdBanner from '@/components/AdBanner'
import { Book } from '@prisma/client'
import { Link } from '@/i18n/routing'
import { Package, ArrowRight, Sparkles, Gamepad2, Baby, BookOpen } from 'lucide-react'
import ImageWithFallback from '@/components/ImageWithFallback'
import { useTranslations, useLocale } from 'next-intl'
import { getLocalizedTitle, generateBookUrl } from '@/lib/i18n-utils'
import { ga4TrackViewItemList } from '@/lib/tracking'

interface InfiniteBookListProps {
    initialBooks: Book[]
    initialFilters: BookFilters
    adsense?: {
        enabled: boolean
        publisherId: string
        slotId: string
    }
    packsCTA?: any[]
    boardGames?: any[]
    kidsProducts?: any[]
}

export default function InfiniteBookList({ initialBooks, initialFilters, adsense, packsCTA = [], boardGames = [], kidsProducts = [] }: InfiniteBookListProps) {
    const [books, setBooks] = useState<Book[]>(initialBooks)
    const [page, setPage] = useState(2)
    const [hasMore, setHasMore] = useState(true)
    const [loading, setLoading] = useState(false)
    const tCommon = useTranslations('Common')
    const tCTA = useTranslations('CTA')
    const locale = useLocale()
    const observerTarget = useRef<HTMLDivElement>(null)

    // Pack aléatoire sélectionné uniquement côté client pour éviter l'hydratation mismatch
    const [randomPack, setRandomPack] = useState<any>(null)
    useEffect(() => {
        if (packsCTA && packsCTA.length > 0) {
            setRandomPack(packsCTA[Math.floor(Math.random() * packsCTA.length)])
        }
    }, [packsCTA])

    // Reset state when initialBooks changes (filtering)
    useEffect(() => {
        setBooks(initialBooks)
        setPage(2)
        setHasMore(initialBooks.length >= (initialFilters.limit || 12))

        if (initialBooks && initialBooks.length > 0) {
            ga4TrackViewItemList({
                listId: (initialFilters.category as string) || 'books_catalog',
                listName: (initialFilters.category as string) || 'Catalogue Livres',
                items: initialBooks.map((b, idx) => ({
                    item_id: b.id,
                    item_name: b.title,
                    price: b.price,
                    item_brand: b.author,
                    item_category: b.category || 'Livres',
                    index: idx
                }))
            })
        }
    }, [initialBooks, initialFilters])

    useEffect(() => {
        const observer = new IntersectionObserver(
            async (entries) => {
                if (entries[0].isIntersecting && hasMore && !loading) {
                    setLoading(true)
                    try {
                        const nextFilters = { ...initialFilters, page: page, limit: initialFilters.limit || 12 }
                        const result = await fetchBooks(nextFilters)

                        if (result.success && result.data) {
                            if (result.data.length < (initialFilters.limit || 12)) {
                                setHasMore(false)
                            }
                            // Avoid duplicates just in case
                            setBooks(prev => {
                                const newBooks = result.data.filter((newBook: Book) => !prev.some(b => b.id === newBook.id))
                                return [...prev, ...newBooks]
                            })
                            setPage(prev => prev + 1)
                        } else {
                            setHasMore(false)
                        }
                    } catch (e) {
                        console.error(e)
                        setHasMore(false)
                    } finally {
                        setLoading(false)
                    }
                }
            },
            { threshold: 0.1 }
        )

        if (observerTarget.current) {
            observer.observe(observerTarget.current)
        }

        return () => {
            if (observerTarget.current) {
                observer.unobserve(observerTarget.current)
            }
        }
    }, [hasMore, loading, page, initialFilters])

    return (
        <>
            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4 lg:gap-5">
                {books.map((book, index) => {
                    // Afficher une pub tous les 8 livres (après la 2ème ligne sur desktop)
                    const showAd = adsense?.enabled && adsense?.publisherId && adsense?.slotId && index > 0 && index % 8 === 0

                    // Afficher un CTA pack tous les 12 livres (index 11, 23, 35...)
                    const isCtaPosition = index > 0 && (index + 1) % 12 === 0;
                    const ctaIndex = Math.floor(index / 12);
                    let ctaBlock = null;

                    if (isCtaPosition) {
                        const usedBooksCount = books.filter(b => b.condition === 'USED').length;
                        const showUsedCTA = usedBooksCount > 4;

                        const ctaTypesList = [];
                        if (randomPack) ctaTypesList.push('PACK');
                        ctaTypesList.push('CUSTOM');
                        ctaTypesList.push('BOARD_GAMES');
                        ctaTypesList.push('KIDS');
                        if (showUsedCTA) ctaTypesList.push('USED');

                        const ctaType = ctaTypesList[ctaIndex % ctaTypesList.length];

                        if (ctaType === 'PACK' && randomPack) {
                            const pack = randomPack;
                            ctaBlock = (
                                <div className="col-span-2 md:col-span-3 xl:col-span-4 bg-gradient-to-r from-gray-900 via-slate-900 to-black rounded-[2.5rem] p-6 md:p-10 text-white relative overflow-hidden flex flex-col md:flex-row items-center justify-between gap-6 md:gap-10 shadow-2xl my-4 border border-slate-800">
                                    <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
                                    <div className="absolute bottom-0 left-0 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2"></div>

                                    <div className="flex-1 relative z-10 text-center md:text-left">
                                        <div className="inline-flex items-center gap-2 bg-white/10 px-4 py-2 rounded-full backdrop-blur-md mb-4 border border-white/10">
                                            <Sparkles className="w-4 h-4 text-amber-300" />
                                            <span className="text-xs font-bold uppercase tracking-widest text-amber-100">{tCommon('SpecialOffer')}</span>
                                        </div>
                                        <h3 className="text-2xl md:text-4xl font-black mb-3">{pack.name}</h3>
                                        <div className="flex items-center justify-center md:justify-start gap-3 mb-6">
                                            <span className="text-3xl md:text-4xl font-black text-amber-300">{pack.price} {tCommon('Currency')}</span>
                                        </div>
                                        <Link
                                            href={`/packs/${pack.id}`}
                                            className="inline-flex items-center gap-2 bg-amber-400 text-slate-950 px-8 py-4 rounded-xl font-black uppercase tracking-widest text-xs hover:bg-amber-300 transition-all hover:scale-105 active:scale-95 shadow-xl"
                                        >
                                            {tCommon('DiscoverPack')}
                                            <ArrowRight className="w-4 h-4" />
                                        </Link>
                                    </div>

                                    <div className="flex -space-x-4 md:-space-x-8 relative z-10 items-center justify-center">
                                        {pack.books.slice(0, 4).map((pb: any, i: number) => {
                                            const displayTitle = getLocalizedTitle(pb.book, locale);
                                            const bookUrl = generateBookUrl(pb.book, locale);
                                            return (
                                            <Link aria-label={displayTitle} href={bookUrl} key={pb.id} className="w-24 h-36 md:w-32 md:h-48 rounded-xl overflow-hidden shadow-2xl border-2 border-white/20 transform transition-transform hover:-translate-y-4 hover:rotate-2 relative z-10" style={{ zIndex: 10 - i }}>
                                                <ImageWithFallback
                                                    src={pb.book.image || ''}
                                                    alt={displayTitle}
                                                    className="w-full h-full object-cover"
                                                />
                                            </Link>
                                            );
                                        })}
                                    </div>
                                </div>
                            );
                        } else if (ctaType === 'BOARD_GAMES') {
                            ctaBlock = (
                                <div className="col-span-2 md:col-span-3 xl:col-span-4 bg-gradient-to-r from-amber-50 to-orange-50 rounded-[2.5rem] p-6 md:p-10 border border-amber-200 relative overflow-hidden flex flex-col md:flex-row items-center justify-between gap-6 shadow-sm my-4">
                                    <div className="absolute top-0 right-0 w-64 h-64 bg-white/50 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
                                    <div className="flex-1 text-center md:text-left relative z-10">
                                        <div className="inline-flex items-center gap-2 bg-amber-500/10 px-4 py-2 rounded-full mb-4">
                                            <Gamepad2 className="w-4 h-4 text-amber-600" />
                                            <span className="text-xs font-bold uppercase tracking-widest text-amber-800">{tCommon('Navigation.BoardGames')}</span>
                                        </div>
                                        <h3 className="text-2xl md:text-3xl font-black mb-3 text-slate-900">{tCTA('BoardGamesTitle')}</h3>
                                        <p className="text-slate-600 text-sm font-medium mb-6 max-w-md mx-auto md:mx-0">
                                            {tCTA('BoardGamesDesc')}
                                        </p>
                                        <Link
                                            href="/jeux-societe"
                                            className="inline-flex items-center gap-2 bg-amber-500 text-white px-8 py-4 rounded-xl font-black uppercase tracking-widest text-xs hover:bg-amber-600 transition-all shadow-xl hover:scale-105 active:scale-95"
                                        >
                                            {tCTA('DiscoverBoardGames')}
                                            <ArrowRight className="w-4 h-4" />
                                        </Link>
                                    </div>
                                    <div className="hidden md:flex items-center justify-center relative w-64 h-48 z-10">
                                        <div className="absolute inset-0 bg-white/40 rounded-[2.5rem] rotate-6 shadow-inner" />
                                        {boardGames.length > 0 ? (
                                            <div className="relative w-full h-full flex items-center justify-center">
                                                {boardGames.slice(0, 3).map((game, i) => (
                                                    <Link aria-label={game.name}
                                                        href={`/jeux-societe/${game.id}`}
                                                        key={game.id}
                                                        className="absolute w-28 h-28 rounded-xl overflow-hidden shadow-xl border-2 border-white transform transition-transform hover:-translate-y-4"
                                                        style={{
                                                            left: `${(i * 30)}%`,
                                                            zIndex: 10 - i,
                                                            transform: `rotate(${i === 0 ? -5 : i === 1 ? 5 : -3}deg)`
                                                        }}
                                                    >
                                                        <ImageWithFallback
                                                            src={game.images[0] || ''}
                                                            alt={game.name}
                                                            className="w-full h-full object-cover"
                                                        />
                                                    </Link>
                                                ))}
                                            </div>
                                        ) : (
                                            <Gamepad2 className="w-24 h-24 text-amber-500 drop-shadow-md" />
                                        )}
                                    </div>
                                </div>
                            );
                        } else if (ctaType === 'KIDS') {
                            ctaBlock = (
                                <div className="col-span-2 md:col-span-3 xl:col-span-4 bg-gradient-to-r from-pink-100 to-rose-50 rounded-[2.5rem] p-6 md:p-10 border border-pink-200 relative overflow-hidden flex flex-col md:flex-row items-center justify-between gap-6 shadow-sm my-4">
                                    <div className="absolute bottom-0 left-0 w-64 h-64 bg-white/50 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2"></div>
                                    <div className="flex-1 text-center md:text-left relative z-10">
                                        <div className="inline-flex items-center gap-2 bg-pink-500/10 px-4 py-2 rounded-full mb-4">
                                            <Baby className="w-4 h-4 text-pink-600" />
                                            <span className="text-xs font-bold uppercase tracking-widest text-pink-700">{tCommon('Navigation.KidsWorld')}</span>
                                        </div>
                                        <h3 className="text-2xl md:text-3xl font-black mb-3 text-pink-900">{tCTA('KidsWorldTitle')}</h3>
                                        <p className="text-pink-800/80 text-sm font-medium mb-6 max-w-md mx-auto md:mx-0">
                                            {tCTA('KidsWorldDesc')}
                                        </p>
                                        <Link
                                            href="/mon-enfant"
                                            className="inline-flex items-center gap-2 bg-pink-500 text-white px-8 py-4 rounded-xl font-black uppercase tracking-widest text-xs hover:bg-pink-600 transition-all shadow-xl hover:scale-105 active:scale-95"
                                        >
                                            {tCTA('DiscoverKidsWorld')}
                                            <ArrowRight className="w-4 h-4" />
                                        </Link>
                                    </div>
                                    <div className="hidden md:flex items-center justify-center relative w-64 h-48 z-10">
                                        <div className="absolute inset-0 bg-white/40 rounded-[2.5rem] rotate-6 shadow-inner" />
                                        {kidsProducts.length > 0 ? (
                                            <div className="relative w-full h-full flex items-center justify-center">
                                                {kidsProducts.slice(0, 3).map((prod, i) => (
                                                    <Link aria-label={prod.name}
                                                        href={`/mon-enfant/${prod.id}`}
                                                        key={prod.id}
                                                        className="absolute w-28 h-28 rounded-xl overflow-hidden shadow-xl border-2 border-white transform transition-transform hover:-translate-y-4"
                                                        style={{
                                                            left: `${(i * 30)}%`,
                                                            zIndex: 10 - i,
                                                            transform: `rotate(${i === 0 ? -5 : i === 1 ? 5 : -3}deg)`
                                                        }}
                                                    >
                                                        <ImageWithFallback
                                                            src={prod.images[0] || ''}
                                                            alt={prod.name}
                                                            className="w-full h-full object-cover"
                                                        />
                                                    </Link>
                                                ))}
                                            </div>
                                        ) : (
                                            <Baby className="w-24 h-24 text-pink-500 drop-shadow-md relative z-10" />
                                        )}
                                    </div>
                                </div>
                            );
                        } else if (ctaType === 'USED') {
                            ctaBlock = (
                                <div className="col-span-2 md:col-span-3 xl:col-span-4 bg-gradient-to-r from-amber-100 to-yellow-50 rounded-[2.5rem] p-6 md:p-10 border border-amber-200 relative overflow-hidden flex flex-col md:flex-row items-center justify-between gap-6 shadow-sm my-4">
                                    <div className="absolute top-0 right-0 w-64 h-64 bg-white/50 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
                                    <div className="flex-1 text-center md:text-left relative z-10">
                                        <div className="inline-flex items-center gap-2 bg-amber-500/10 px-4 py-2 rounded-full mb-4">
                                            <BookOpen className="w-4 h-4 text-amber-600" />
                                            <span className="text-xs font-bold uppercase tracking-widest text-amber-700">{tCommon('Navigation.UsedBooks')}</span>
                                        </div>
                                        <h3 className="text-2xl md:text-3xl font-black mb-3 text-amber-900">{tCTA('UsedBooksTitle')}</h3>
                                        <p className="text-amber-800/80 text-sm font-medium mb-6 max-w-md mx-auto md:mx-0">
                                            {tCTA('UsedBooksDesc')}
                                        </p>
                                        <Link
                                            href="/books?usedOnly=true"
                                            className="inline-flex items-center gap-2 bg-amber-600 text-white px-8 py-4 rounded-xl font-black uppercase tracking-widest text-xs hover:bg-amber-700 transition-all shadow-xl hover:scale-105 active:scale-95"
                                        >
                                            {tCTA('BrowseUsedBooks')}
                                            <ArrowRight className="w-4 h-4" />
                                        </Link>
                                    </div>
                                    <div className="hidden md:flex items-center justify-center relative w-48 h-48 z-10">
                                        <div className="absolute inset-0 bg-white/40 rounded-[2.5rem] rotate-6 shadow-inner" />
                                        <BookOpen className="w-24 h-24 text-amber-500 drop-shadow-md" />
                                    </div>
                                </div>
                            );
                        } else {
                            ctaBlock = (
                                <div className="col-span-2 md:col-span-3 xl:col-span-4 bg-pixio-cream rounded-[2.5rem] p-6 md:p-10 border border-black/5 relative overflow-hidden flex flex-col md:flex-row items-center justify-between gap-6 shadow-sm my-4">
                                    <div className="flex-1 text-center md:text-left">
                                        <div className="inline-flex items-center gap-2 bg-black/5 px-4 py-2 rounded-full mb-4">
                                            <Package className="w-4 h-4 text-black" />
                                            <span className="text-xs font-bold uppercase tracking-widest text-black">{tCTA('CustomPack')}</span>
                                        </div>
                                        <h3 className="text-2xl md:text-3xl font-black mb-3 text-black">{tCTA('CustomPackTitle')}</h3>
                                        <p className="text-gray-600 text-sm font-medium mb-6 max-w-md mx-auto md:mx-0">
                                            {tCTA('CustomPackDesc')}
                                        </p>
                                        <Link
                                            href="/packs/create"
                                            className="inline-flex items-center gap-2 bg-black text-white px-8 py-4 rounded-xl font-black uppercase tracking-widest text-xs hover:bg-gray-900 transition-all shadow-xl hover:scale-105 active:scale-95"
                                        >
                                            {tCTA('CreatePack')}
                                            <ArrowRight className="w-4 h-4" />
                                        </Link>
                                    </div>
                                    <div className="hidden md:flex items-center justify-center relative w-48 h-48">
                                        <div className="absolute inset-0 border-4 border-dashed border-black/10 rounded-full animate-spin-slow"></div>
                                        <Package className="w-20 h-20 text-black/20" />
                                    </div>
                                </div>
                            );
                        }
                    }

                    return (
                        <React.Fragment key={book.id}>
                            <BookCard {...book} priority={index < 2} />
                            {ctaBlock}
                            {showAd && (
                                <div className="col-span-2 md:col-span-3 xl:col-span-4 py-4">
                                    <AdBanner publisherId={adsense.publisherId} slotId={adsense.slotId} />
                                </div>
                            )}
                        </React.Fragment>
                    )
                })}
            </div>

            {hasMore && (
                <div ref={observerTarget} className="mt-10">
                    {loading && (
                        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4 lg:gap-5">
                            {[1, 2, 3, 4].map((i) => (
                                <div key={i} className="bg-white rounded-[2rem] overflow-hidden border border-gray-100/50 shadow-sm h-full flex flex-col p-4 animate-pulse lg:animate-none">
                                    <div className="aspect-square bg-gray-100 rounded-[1.5rem] mb-6"></div>
                                    <div className="space-y-3 px-2">
                                        <div className="h-4 bg-gray-100 rounded-full w-3/4 mx-auto"></div>
                                        <div className="h-3 bg-gray-100 rounded-full w-1/2 mx-auto"></div>
                                        <div className="h-8 bg-gray-100 rounded-full w-full mt-4"></div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* Navigation crawlable pour les robots d'indexation (Googlebot) conforme aux règles Google Search Central Pagination */}
            <noscript>
                <nav aria-label="Pagination catalogue" className="mt-8 text-center p-6 bg-white rounded-3xl border border-gray-100 shadow-sm">
                    <p className="text-xs font-bold text-gray-600 mb-3">Accéder aux pages suivantes du catalogue</p>
                    <div className="flex justify-center items-center gap-3">
                        {page > 2 && (
                            <a href={`?page=${page - 1}`} className="px-5 py-2.5 bg-gray-100 text-black hover:bg-gray-200 rounded-xl text-xs font-black uppercase tracking-wider">
                                Page précédente
                            </a>
                        )}
                        {hasMore && (
                            <a href={`?page=${page}`} className="px-5 py-2.5 bg-black text-white hover:bg-gray-800 rounded-xl text-xs font-black uppercase tracking-wider shadow-sm">
                                Page suivante
                            </a>
                        )}
                    </div>
                </nav>
            </noscript>

            {!hasMore && books.length > 0 && (
                <div className="text-center p-10 text-gray-700 text-xs rtl:text-lg font-black uppercase rtl:uppercase-none tracking-widest rtl:tracking-normal">
                    {tCommon('EndOfCollection')}
                </div>
            )}
        </>
    )
}
