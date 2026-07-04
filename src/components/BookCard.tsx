'use client'

import { Link } from '@/i18n/routing'
import { ShoppingCart, Star, ArrowRight } from 'lucide-react'
import { useCartStore } from '@/store/cart'
import { useTranslations, useLocale } from 'next-intl'
import { useUIStore } from '@/store/ui'
import WishlistButton from '@/components/WishlistButton'
import AddToReadingListButton from '@/components/AddToReadingListButton'
import ImageWithFallback from '@/components/ImageWithFallback'

interface BookCardProps {
    id: string
    title: string
    titleFr?: string | null
    titleEn?: string | null
    author: string
    price: number
    image: string
    category?: string | null
    language?: string | null
    stock: number
    variant?: 'default' | 'compact' | 'featured'
}

export default function BookCard({
    id,
    title,
    titleFr,
    titleEn,
    author,
    price,
    image,
    category,
    language,
    stock,
    variant = 'default',
}: BookCardProps) {
    const t = useTranslations('Common');
    const locale = useLocale();
    const isCompact = variant === 'compact'
    const isFeatured = variant === 'featured'
    const addItem = useCartStore((state) => state.addItem)
    const { openCart, showNotification } = useUIStore()

    const displayTitle = locale === 'fr' && titleFr ? titleFr : locale === 'en' && titleEn ? titleEn : title;

    return (
        <div className={`group relative bg-white rounded-3xl overflow-hidden transition-all duration-500 border border-gray-100 hover:border-gray-200 shadow-sm hover:shadow-2xl h-full flex flex-col ${isFeatured ? 'scale-105 z-10 border-black shadow-xl' : ''}`}>
            {/* Image Container */}
            <Link href={`/books/${id}`} className="block relative">
                <div className={`relative bg-white overflow-hidden ${isCompact ? 'aspect-[3/4]' : isFeatured ? 'aspect-[3/4]' : 'aspect-[3/4]'}`}>
                    <ImageWithFallback
                        src={image}
                        alt={`${displayTitle} - Livre par ${author}`}
                        className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-700"
                    />

                    {/* Action Buttons */}
                    <div className="absolute top-4 right-4 z-20 flex flex-col gap-2">
                        <WishlistButton
                            item={{ id, title: displayTitle, price, image, type: 'BOOK', slug: `/books/${id}`, author }}
                            className="bg-white/80 backdrop-blur-sm hover:bg-white shadow-sm"
                        />
                        <AddToReadingListButton
                            bookId={id}
                            title={displayTitle}
                            author={author}
                            cover={image}
                            className="bg-white/80 backdrop-blur-sm hover:bg-white shadow-sm"
                        />
                    </div>

                    {/* Stock Badge - Déplacé en bas à droite */}
                    {stock <= 5 && stock > 0 && (
                        <div className="absolute bottom-4 right-4">
                            <span className="px-4 py-1.5 bg-white text-orange-700 text-[9px] rtl:text-xs font-black uppercase tracking-[0.15em] rtl:tracking-normal rounded-full shadow-lg border border-orange-200">
                                {stock} {t('Remaining')}
                            </span>
                        </div>
                    )}
                    {/* Category Label */}
                    {category && !isCompact && (
                        <div className="absolute bottom-4 left-4">
                            <span className="px-4 py-1.5 bg-white/95 backdrop-blur-sm text-black text-[9px] rtl:text-xs font-black uppercase tracking-[0.15em] rtl:tracking-normal rounded-full shadow-lg border border-gray-100 opacity-0 group-hover:opacity-100 transition-all duration-300">
                                {category}
                            </span>
                        </div>
                    )}
                    {/* Badge langue AR/FR/EN */}
                    {language && (
                        <div className="absolute top-3 left-3 z-20">
                            <span className={`px-2 py-0.5 text-[9px] font-black uppercase tracking-widest rounded-md shadow-sm ${
                                language === 'ar' ? 'bg-emerald-600 text-white' :
                                language === 'fr' ? 'bg-blue-600 text-white' :
                                language === 'en' ? 'bg-amber-500 text-white' :
                                'bg-black text-white'
                            }`}>
                                {language.toUpperCase()}
                            </span>
                        </div>
                    )}
                </div>
            </Link>

            {/* Content */}
            <div className={`text-center flex flex-col items-center flex-grow bg-white ${isCompact ? 'p-4' : 'px-4 py-6'}`}>
                <Link href={`/books/${id}`} className="block w-full after:absolute after:inset-0 after:z-0">
                    <h3 className={`font-black text-gray-900 tracking-tight line-clamp-2 transition-colors group-hover:text-black ${isCompact ? 'text-sm mb-1 uppercase' : isFeatured ? 'text-xl mb-2' : 'text-base mb-1.5'
                        }`}>
                        {displayTitle}
                    </h3>
                    <p className={`text-gray-500 font-bold ${isCompact ? 'text-[10px] rtl:text-xs' : 'text-xs rtl:text-sm'}`}>
                        {t('By')} {author}
                    </p>
                </Link>

                {/* Price & Action */}
                <div className="mt-auto flex flex-col items-center gap-4 w-full pt-4">
                    <p className={`font-black text-gray-900 leading-none ${isCompact ? 'text-base' : isFeatured ? 'text-2xl' : 'text-xl'}`}>
                        {price} <span className="text-[10px] rtl:text-xs font-black text-gray-500 uppercase tracking-widest rtl:tracking-normal">MAD</span>
                    </p>

                    {stock > 0 && (
                        <button
                            className={`w-full flex items-center justify-center gap-2 bg-gray-900 text-white font-black text-[11px] rtl:text-sm uppercase tracking-widest rtl:tracking-normal rounded-2xl hover:bg-black transition-all shadow-lg hover:shadow-black/20 hover:-translate-y-0.5 group/btn relative z-10 min-h-[52px] ${isCompact
                                ? 'py-3'
                                : isFeatured
                                    ? 'py-4'
                                    : 'py-4'
                                }`}
                            onClick={(e) => {
                                e.preventDefault()
                                try {
                                    addItem({
                                        type: 'BOOK',
                                        id,
                                        title: displayTitle,
                                        price,
                                        image,
                                    })
                                    openCart()
                                    showNotification(t('AddedToCartSuccess'), 'success')
                                } catch (error) {
                                    console.error('Failed to add book to cart:', error)
                                    showNotification(t('AddedToCartError'), 'error')
                                }
                            }}
                        >
                            <span>{t('AddToCart')}</span>
                            <ArrowRight className="w-4 h-4 transition-transform group-hover/btn:translate-x-1 rtl:group-hover/btn:-translate-x-1 rtl:rotate-180" />
                        </button>
                    )}
                </div>
            </div>

            {/* Featured Badge */}
            {isFeatured && (
                <div className="absolute top-6 left-6">
                    <div className="bg-pixio-yellow text-black px-5 py-2 rounded-full text-[9px] rtl:text-xs font-black uppercase tracking-[0.2em] rtl:tracking-normal border border-yellow-300 shadow-xl">
                        ✨ {t('BestSeller')}
                    </div>
                </div>
            )}

            {/* Out of Stock Ribbon - Top Most Layer */}
            {stock === 0 && (
                <div className="absolute top-0 left-0 w-36 h-36 overflow-hidden z-30 pointer-events-none">
                    <div className="absolute top-8 -left-11 w-48 py-2.5 bg-gradient-to-r from-red-800 via-red-600 to-red-800 text-white text-[10px] rtl:text-xs font-black uppercase tracking-[0.25em] rtl:tracking-normal text-center -rotate-45 shadow-[0_10px_20px_rgba(0,0,0,0.5)] border-y border-white/10 backdrop-blur-md ring-1 ring-black/20">
                        {t('OutOfStock')}
                    </div>
                </div>
            )}
        </div>
    )
}
