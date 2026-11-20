'use client'

import { useState, useMemo, useEffect } from 'react'
import { Book as BookType } from '@prisma/client'
import { X, Search, Check, ShoppingBag, Plus, Loader2 } from 'lucide-react'
import { useTranslations, useLocale } from 'next-intl'
import { useCartStore } from '@/store/cart'
import { useUIStore } from '@/store/ui'
import ImageWithFallback from '@/components/ImageWithFallback'
import Image from 'next/image'
import { getLocalizedTitle } from '@/lib/i18n-utils'
import { getAvailableBooksForCustomPack } from '@/lib/actions/packs'

interface CustomPackBuilderProps {
    availableBooks?: any[]
    initialOpen?: boolean
}

export default function CustomPackBuilder({ availableBooks = [], initialOpen = false }: CustomPackBuilderProps) {
    const t = useTranslations('Packs')
    const tCommon = useTranslations('Common')
    const locale = useLocale()
    const [isOpen, setIsOpen] = useState(initialOpen)
    const [books, setBooks] = useState<any[]>(availableBooks)
    const [isLoading, setIsLoading] = useState(false)
    const [searchQuery, setSearchQuery] = useState('')
    const [selectedBooks, setSelectedBooks] = useState<any[]>([])
    
    const addItem = useCartStore((state) => state.addItem)
    const showNotification = useUIStore((state) => state.showNotification)

    useEffect(() => {
        if (availableBooks && availableBooks.length > 0) {
            setBooks(availableBooks)
        }
    }, [availableBooks])

    useEffect(() => {
        if (isOpen && books.length === 0 && !isLoading) {
            setIsLoading(true)
            getAvailableBooksForCustomPack()
                .then((res) => {
                    if (res && res.length > 0) {
                        setBooks(res)
                    }
                })
                .catch((err) => console.error('Error fetching custom pack books:', err))
                .finally(() => setIsLoading(false))
        }
    }, [isOpen, books.length, isLoading])

    const filteredBooks = useMemo(() => {
        if (!searchQuery.trim()) return books
        const query = searchQuery.toLowerCase().trim()
        return books.filter(b => {
            const locTitle = getLocalizedTitle(b, locale).toLowerCase()
            const origTitle = (b.title || '').toLowerCase()
            const author = (b.author || '').toLowerCase()
            return locTitle.includes(query) || origTitle.includes(query) || author.includes(query)
        })
    }, [books, searchQuery, locale])

    const toggleBook = (book: any) => {
        setSelectedBooks(prev => {
            const isSelected = prev.some(b => b.id === book.id)
            if (isSelected) {
                return prev.filter(b => b.id !== book.id)
            } else {
                return [...prev, book]
            }
        })
    }

    const discountPercentage = selectedBooks.length >= 5 ? 15 : selectedBooks.length >= 3 ? 10 : 0
    const subtotal = selectedBooks.reduce((sum, b) => sum + b.price, 0)
    const discountAmount = (subtotal * discountPercentage) / 100
    const rawFinalPrice = subtotal - discountAmount
    const finalPrice = Math.round(rawFinalPrice * 2) / 2

    const handleAddToCart = () => {
        if (selectedBooks.length < 3) return

        const roundToHalfDirham = (value: number) => Math.round(value * 2) / 2
        let remainingTotal = finalPrice

        selectedBooks.forEach((book, index) => {
            let itemPrice: number
            if (index === selectedBooks.length - 1) {
                itemPrice = roundToHalfDirham(remainingTotal)
            } else {
                itemPrice = roundToHalfDirham((book.price / subtotal) * finalPrice)
                remainingTotal = roundToHalfDirham(remainingTotal - itemPrice)
            }
            
            const bookTitle = getLocalizedTitle(book, locale)
            addItem({
                id: book.id,
                title: `${t('CustomPack.CartPrefix')} ${bookTitle}`,
                price: itemPrice,
                image: book.image || '',
                type: 'BOOK'
            })
        })
        
        showNotification(tCommon('AddedToCartSuccess'), 'success')
        setIsOpen(false)
        setSelectedBooks([])
    }

    return (
        <>
            {/* Banner */}
            <div className="relative bg-gray-900 p-8 md:p-12 rounded-[2.5rem] shadow-2xl mb-12 flex flex-col md:flex-row items-center justify-between gap-8 overflow-hidden group">
                <div className="absolute inset-0">
                    <Image src="/images/custom_pack.png" alt="Custom Pack Builder" fill priority sizes="(max-width: 768px) 100vw, 100vw" className="object-cover opacity-40 group-hover:opacity-50 transition-opacity duration-700" />
                    <div className="absolute inset-0 bg-gradient-to-r from-black/90 via-black/60 to-transparent rtl:bg-gradient-to-l"></div>
                </div>
                
                <div className="relative z-10 text-center md:text-left rtl:md:text-right space-y-4 max-w-xl">
                    <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/10 rounded-full text-white/90 text-sm font-bold uppercase tracking-widest backdrop-blur-sm">
                        <SparklesIcon className="w-4 h-4 text-yellow-400" />
                        {t('Exclusive')}
                    </div>
                    <h2 className="text-3xl md:text-4xl font-black text-white">{t('CustomPack.BannerTitle')}</h2>
                    <p className="text-gray-200 font-medium text-base md:text-lg">{t('CustomPack.BannerDesc')}</p>
                </div>
                
                <button 
                    onClick={() => setIsOpen(true)}
                    className="relative z-10 bg-white text-black px-8 py-4 rounded-full font-black uppercase tracking-widest text-base hover:scale-105 transition-transform shadow-[0_0_40px_rgba(255,255,255,0.3)] flex items-center gap-3 shrink-0"
                >
                    <Plus className="w-5 h-5" />
                    {t('CustomPack.BannerBtn')}
                </button>
            </div>

            {/* Modal */}
            {isOpen && (
                <div className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center bg-black/60 sm:p-4 md:p-6 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white w-full max-w-5xl h-[100dvh] sm:h-[92dvh] md:h-[85vh] rounded-none sm:rounded-[2rem] shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom-8 duration-300">
                        
                        {/* Header */}
                        <div className="flex items-center justify-between gap-3 px-4 py-3 sm:p-6 border-b border-gray-100 shrink-0 pt-[max(0.75rem,env(safe-area-inset-top))]">
                            <div className="min-w-0">
                                <h3 className="text-lg sm:text-2xl font-black text-black truncate">{t('CustomPack.ModalTitle')}</h3>
                                <p className="text-gray-500 text-xs sm:text-sm font-medium mt-0.5 sm:mt-1">{t('CustomPack.SelectBooks')}</p>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                                <span className="lg:hidden min-w-9 h-9 px-2 bg-black text-white rounded-full flex items-center justify-center text-sm font-black" aria-label={t('CustomPack.Selected')}>
                                    {selectedBooks.length}
                                </span>
                            <button 
                                onClick={() => setIsOpen(false)}
                                aria-label="Close"
                                className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center text-gray-500 hover:bg-gray-200 transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>
                            </div>
                        </div>

                        {/* Content */}
                        <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
                            {/* Left: Book List */}
                            <div className="flex-1 min-h-0 flex flex-col border-b lg:border-b-0 lg:border-r rtl:lg:border-r-0 rtl:lg:border-l border-gray-100 overflow-hidden">
                                <div className="px-3 py-2.5 sm:p-6 border-b border-gray-100 bg-white shrink-0">
                                    <div className="relative">
                                        <Search className="absolute left-4 rtl:left-auto rtl:right-4 top-1/2 -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5 text-gray-400" />
                                        <input 
                                            type="text" 
                                            placeholder={t('CustomPack.SearchPlaceholder')}
                                            value={searchQuery}
                                            onChange={(e) => setSearchQuery(e.target.value)}
                                            className="w-full pl-11 pr-4 rtl:pr-11 rtl:pl-4 py-2.5 sm:py-3 bg-gray-50 rounded-xl sm:rounded-2xl border-none text-sm focus:ring-2 focus:ring-black outline-none transition-all"
                                        />
                                    </div>
                                </div>
                                <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-3 sm:p-6 scrollbar-thin scrollbar-thumb-gray-200">
                                    {isLoading ? (
                                        <div className="grid grid-cols-3 sm:grid-cols-3 lg:grid-cols-4 gap-2.5 sm:gap-4 pb-2 animate-pulse">
                                            {[...Array(8)].map((_, i) => (
                                                <div key={i} className="rounded-xl sm:rounded-2xl border-2 border-transparent bg-gray-50 overflow-hidden">
                                                    <div className="aspect-[2/3] bg-gray-200" />
                                                    <div className="p-2 sm:p-3 space-y-2">
                                                        <div className="h-3 bg-gray-200 rounded w-3/4 mx-auto" />
                                                        <div className="h-2 bg-gray-200 rounded w-1/2 mx-auto" />
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    ) : filteredBooks.length === 0 ? (
                                        <div className="text-center py-12">
                                            <p className="text-gray-400 font-medium">{t('CustomPack.NoBooksFound')}</p>
                                        </div>
                                    ) : (
                                        <div className="grid grid-cols-3 sm:grid-cols-3 lg:grid-cols-4 gap-2.5 sm:gap-4 pb-2">
                                            {filteredBooks.map(book => {
                                                const isSelected = selectedBooks.some(b => b.id === book.id)
                                                const displayTitle = getLocalizedTitle(book, locale)
                                                return (
                                                    <div 
                                                        key={book.id}
                                                        onClick={() => toggleBook(book)}
                                                        className={`relative group cursor-pointer rounded-xl sm:rounded-2xl border-2 transition-all overflow-hidden active:scale-[0.98] ${
                                                            isSelected ? 'border-black bg-gray-50 shadow-md' : 'border-transparent hover:border-gray-200'
                                                        }`}
                                                    >
                                                        <div className="aspect-[2/3] relative bg-gray-100">
                                                            <ImageWithFallback 
                                                                src={book.image || ''} 
                                                                alt={displayTitle}
                                                                className="absolute inset-0 w-full h-full object-cover mix-blend-multiply"
                                                            />
                                                            {isSelected && (
                                                                <div className="absolute inset-0 bg-black/20 flex items-center justify-center backdrop-blur-[2px]">
                                                                    <div className="w-8 h-8 sm:w-10 sm:h-10 bg-white rounded-full flex items-center justify-center shadow-lg">
                                                                        <Check className="w-5 h-5 sm:w-6 sm:h-6 text-black" />
                                                                    </div>
                                                                </div>
                                                            )}
                                                        </div>
                                                        <div className="p-2 sm:p-3 text-center">
                                                            <p className="text-[10px] sm:text-xs font-bold text-black line-clamp-2 leading-tight mb-1 min-h-6 sm:min-h-8">{displayTitle}</p>
                                                            <p className="hidden sm:block text-[10px] text-gray-500 truncate">{book.author}</p>
                                                            <p className="text-xs font-black text-black mt-2">{book.price} درهم</p>
                                                        </div>
                                                    </div>
                                                )
                                            })}
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Right: Summary */}
                            <div className="w-full lg:w-96 bg-gray-50 flex flex-col p-3 sm:p-4 lg:p-6 shrink-0 h-auto overflow-visible pb-[max(0.75rem,env(safe-area-inset-bottom))]">
                                <h4 className="hidden lg:flex text-lg font-black text-black mb-6 items-center justify-between">
                                    {t('CustomPack.Selected')}
                                    <span className="w-8 h-8 bg-black text-white rounded-full flex items-center justify-center text-sm">
                                        {selectedBooks.length}
                                    </span>
                                </h4>
                                
                                <div className="hidden lg:block flex-1 overflow-y-auto space-y-3 mb-6 scrollbar-none">
                                    {selectedBooks.length === 0 ? (
                                        <div className="h-full flex flex-col items-center justify-center text-gray-400 space-y-3">
                                            <ShoppingBag className="w-12 h-12 opacity-20" />
                                            <p className="text-sm font-medium text-center">{t('CustomPack.SelectBooks')}</p>
                                        </div>
                                    ) : (
                                        selectedBooks.map(book => {
                                            const displayTitle = getLocalizedTitle(book, locale)
                                            return (
                                                <div key={`selected-${book.id}`} className="flex items-center gap-3 bg-white p-3 rounded-xl shadow-sm">
                                                    <div className="w-12 h-16 relative bg-gray-100 rounded-md overflow-hidden shrink-0">
                                                        <ImageWithFallback src={book.image || ''} alt={displayTitle} className="absolute inset-0 w-full h-full object-cover" />
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-xs font-bold text-black truncate">{displayTitle}</p>
                                                        <p className="text-[10px] text-gray-500 truncate">{book.author}</p>
                                                        <p className="text-sm font-black text-black mt-1">{book.price} درهم</p>
                                                    </div>
                                                    <button 
                                                        onClick={() => toggleBook(book)}
                                                        className="w-8 h-8 bg-gray-50 rounded-full flex items-center justify-center text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                                                    >
                                                        <X className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            )
                                        })
                                    )}
                                </div>

                                <div className="bg-white p-3 sm:p-4 lg:p-5 rounded-2xl shadow-sm space-y-2.5 lg:space-y-4">
                                    <div className="flex justify-between items-center text-xs sm:text-sm font-medium text-gray-500">
                                        <span>{t('RegularPrice')}</span>
                                        <span>{subtotal.toFixed(2)} درهم</span>
                                    </div>
                                    
                                    {discountPercentage > 0 && (
                                        <div className="flex justify-between items-center text-sm font-bold text-green-500">
                                            <span>{discountPercentage === 15 ? t('CustomPack.Discount15') : t('CustomPack.Discount10')}</span>
                                            <span>-{discountAmount.toFixed(2)} درهم</span>
                                        </div>
                                    )}

                                    <div className="h-px bg-gray-100 w-full" />
                                    
                                    <div className="flex justify-between items-center text-base sm:text-lg font-black text-black">
                                        <span>{t('PackPrice')}</span>
                                        <span>{finalPrice.toFixed(2)} درهم</span>
                                    </div>

                                    {/* Next tier hint */}
                                    {selectedBooks.length < 3 ? (
                                        <p className="text-[11px] sm:text-xs text-center text-gray-500 font-medium bg-gray-50 py-1.5 sm:py-2 rounded-lg">
                                            {t('CustomPack.AddMoreFor10', { count: 3 - selectedBooks.length })}
                                        </p>
                                    ) : selectedBooks.length < 5 ? (
                                        <p className="text-[11px] sm:text-xs text-center text-gray-500 font-medium bg-gray-50 py-1.5 sm:py-2 rounded-lg">
                                            {t('CustomPack.AddMoreFor15', { count: 5 - selectedBooks.length })}
                                        </p>
                                    ) : null}

                                    <button
                                        onClick={handleAddToCart}
                                        disabled={selectedBooks.length < 3}
                                        className={`w-full py-3 sm:py-4 rounded-xl font-black uppercase tracking-wide sm:tracking-widest text-[11px] sm:text-xs transition-all ${
                                            selectedBooks.length >= 3 
                                                ? 'bg-black text-white hover:shadow-lg hover:-translate-y-1' 
                                                : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                        }`}
                                    >
                                        {t('CustomPack.AddToCart', { price: finalPrice.toFixed(2) })}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </>
    )
}

function SparklesIcon(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" />
      <path d="M5 3v4" />
      <path d="M19 17v4" />
      <path d="M3 5h4" />
      <path d="M17 19h4" />
    </svg>
  )
}
