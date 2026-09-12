'use client'

import { Link } from '@/i18n/routing'
import { useState } from 'react'
import { ShoppingCart, Star, ArrowRight, Check } from 'lucide-react'
import { useCartStore } from '@/store/cart'
import { useTranslations, useLocale } from 'next-intl'
import { useUIStore } from '@/store/ui'
import { notifyAddToCart } from '@/lib/actions/cart-notify'
import { fbPixelEvents } from '@/lib/facebook-pixel'
import WishlistButton from '@/components/WishlistButton'
import AddToReadingListButton from '@/components/AddToReadingListButton'
import ImageWithFallback from '@/components/ImageWithFallback'
import { generateBookUrl } from '@/lib/i18n-utils'

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
    condition?: string | null
    variant?: 'default' | 'compact' | 'featured'
    priority?: boolean
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
    condition,
    variant = 'default',
    priority = false,
}: BookCardProps) {
    const t = useTranslations('Common');
    const locale = useLocale();
    const isCompact = variant === 'compact'
    const isFeatured = variant === 'featured'
    const isUsed = condition === 'USED' || condition === 'GOOD'
    const addItem = useCartStore((state) => state.addItem)
    const sessionId = useCartStore((state) => state.sessionId)
    const setSessionId = useCartStore((state) => state.setSessionId)
    const { openCart, showNotification } = useUIStore()
    const [isAdded, setIsAdded] = useState(false)

    const displayTitle = locale === 'fr' && titleFr ? titleFr : locale === 'en' && titleEn ? titleEn : title;
    // Générer l'URL avec le slug dynamique
    const bookUrl = generateBookUrl({ id, title, titleFr, titleEn }, locale);

    return (
        <div className={`group relative bg-white rounded-3xl overflow-hidden transition-all duration-500 border border-gray-100 hover:border-gray-200 shadow-sm hover:shadow-2xl h-full flex flex-col ${isFeatured ? 'scale-105 z-10 border-black shadow-xl' : ''}`}>
            {/* Image Container */}
            <Link href={bookUrl} className="block relative">
                <div className={`relative bg-white overflow-hidden ${isCompact ? 'aspect-[3/4]' : isFeatured ? 'aspect-[3/4]' : 'aspect-[3/4]'}`}>
                    <ImageWithFallback
                        src={image}
                        alt={`${displayTitle} - Livre par ${author}`}
                        className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-700"
                        priority={priority}
                    />

                    {/* Action Buttons */}
                    <div className="absolute top-4 right-4 z-20 flex flex-col gap-2">
                        <WishlistButton
                            item={{ id, title: displayTitle, price, image, type: 'BOOK', slug: bookUrl, author }}
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
                <Link href={bookUrl} className="block w-full after:absolute after:inset-0 after:z-0">
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
                        {price} <span className="text-[10px] rtl:text-xs font-black text-gray-500 uppercase tracking-widest rtl:tracking-normal">{locale === 'ar' ? 'درهم' : 'MAD'}</span>
                    </p>

                    {stock > 0 && (
                        <button
                            disabled={isAdded}
                            className={`w-full flex items-center justify-center gap-2 font-black text-[11px] rtl:text-sm uppercase tracking-widest rtl:tracking-normal rounded-2xl transition-all duration-300 relative z-10 min-h-[52px] ${
                                isAdded
                                    ? 'bg-green-500 text-white scale-105 shadow-xl'
                                    : 'bg-gray-900 text-white hover:bg-black shadow-lg hover:shadow-black/20 hover:-translate-y-0.5 group/btn'
                            } ${isCompact ? 'py-3' : 'py-4'}`}
                            onClick={(e) => {
                                e.preventDefault()
                                if (isAdded) return;
                                try {
                                    addItem({
                                        type: 'BOOK',
                                        id,
                                        title: displayTitle,
                                        price,
                                        image,
                                    })
                                    
                                    // Fire Confetti
                                    import('canvas-confetti').then((confetti) => {
                                        confetti.default({
                                            particleCount: 50,
                                            spread: 60,
                                            origin: { y: 0.8 },
                                            colors: ['#000000', '#10b981', '#3b82f6', '#f59e0b'],
                                            zIndex: 9999
                                        });
                                    });

                                    // Facebook Pixel Tracking
                                    fbPixelEvents.addToCart({
                                        id,
                                        title: displayTitle,
                                        price,
                                        quantity: 1
                                    })

                                    // Telegram Notification
                                    let currentSessionId = sessionId
                                    if (!currentSessionId) {
                                        currentSessionId = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)
                                        setSessionId(currentSessionId)
                                    }
                                    
                                    const { items, discount } = useCartStore.getState()
                                    const currentTotal = items.reduce((sum, item) => sum + (item.price * item.quantity), 0)
                                    const itemsText = items.map(i => `${i.quantity}x ${i.title}`).join(', ')
                                    
                                    notifyAddToCart(displayTitle, price, 'BOOK', currentSessionId, currentTotal, itemsText, discount).catch(console.error)

                                    showNotification(t('AddedToCartSuccess'), 'success')
                                    
                                    setIsAdded(true)
                                    setTimeout(() => setIsAdded(false), 2000)
                                } catch (error) {
                                    console.error('Failed to add book to cart:', error)
                                    showNotification(t('AddedToCartError'), 'error')
                                }
                            }}
                        >
                            {isAdded ? (
                                <>
                                    <span>Ajouté</span>
                                    <Check className="w-4 h-4 animate-bounce" />
                                </>
                            ) : (
                                <>
                                    <span>{t('AddToCart')}</span>
                                    <ArrowRight className="w-4 h-4 transition-transform group-hover/btn:translate-x-1 rtl:group-hover/btn:-translate-x-1 rtl:rotate-180" />
                                </>
                            )}
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

            {/* Ribbon Occasion - livres d'occasion ou bon état */}
            {isUsed && stock > 0 && (
                <div className="absolute top-0 right-0 w-32 h-32 overflow-hidden z-20 pointer-events-none">
                    <div className="absolute top-8 -right-9 w-44 py-2 bg-gradient-to-r from-amber-700 via-amber-500 to-amber-700 text-white text-[9px] font-black uppercase tracking-[0.2em] text-center rotate-45 shadow-[0_6px_15px_rgba(0,0,0,0.4)] border-y border-white/20">
                        {locale === 'ar' ? 'مستعمل' : 'Occasion'}
                    </div>
                </div>
            )}

            {/* Out of Stock Ribbon - Top Most Layer */}
            {stock === 0 && (
                <div className="absolute top-0 left-0 w-36 h-36 overflow-hidden z-30 pointer-events-none">
                    <div className="absolute top-8 -left-11 w-48 py-2.5 bg-gradient-to-r from-red-800 via-red-600 to-red-800 text-white text-[10px] rtl:text-sm rtl:tracking-normal rtl:uppercase-none font-black uppercase tracking-[0.25em] text-center -rotate-45 shadow-[0_10px_20px_rgba(0,0,0,0.5)] border-y border-white/10 backdrop-blur-md ring-1 ring-black/20">
                        {t('OutOfStock')}
                    </div>
                </div>
            )}
        </div>
    )
}
