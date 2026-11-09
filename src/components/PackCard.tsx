'use client'

import { Link } from '@/i18n/routing'
import { useState } from 'react'
import { Package, ShoppingCart, Sparkles, ArrowRight, Check } from 'lucide-react'
import { useCartStore } from '@/store/cart'
import { useTranslations, useLocale } from 'next-intl'
import { useUIStore } from '@/store/ui'
import WishlistButton from '@/components/WishlistButton'
import { normalizeImage } from '@/lib/utils'
import ImageWithFallback from '@/components/ImageWithFallback'
import { notifyAddToCart } from '@/lib/actions/cart-notify'
import { fbPixelEvents } from '@/lib/facebook-pixel'
import { ga4TrackAddToCart, ga4TrackSelectItem } from '@/lib/tracking'
import { getLocalizedPackTitle } from '@/lib/i18n-utils'

interface PackCardProps {
    id: string
    name: string
    nameFr?: string | null
    nameEn?: string | null
    language?: string | null
    description?: string | null
    price: number
    originalPrice?: number | null
    image: string | null
    shippingFees?: number
    priority?: boolean
    books: Array<{
        book: {
            id: string
            title: string
            author: string
            price: number
            image: string
        }
    }>
}

export default function PackCard({
    id,
    name,
    nameFr,
    nameEn,
    language,
    price,
    originalPrice,
    image,
    books,
    shippingFees,
    priority = false,
}: PackCardProps) {
    const t = useTranslations('Packs')
    const tCommon = useTranslations('Common')
    const locale = useLocale()
    const addItem = useCartStore((state) => state.addItem)
    const sessionId = useCartStore((state) => state.sessionId)
    const setSessionId = useCartStore((state) => state.setSessionId)
    const { openCart, showNotification } = useUIStore()
    const [isAdded, setIsAdded] = useState(false)
    const totalOriginalPrice = Math.round(originalPrice || books.reduce((sum: number, pb: any) => sum + pb.book.price, 0))
    const displayPrice = Math.round(price)
    const savings = totalOriginalPrice - displayPrice
    const savingsPercent = Math.round((savings / totalOriginalPrice) * 100)
    const hasDiscount = savings > 0 && savingsPercent > 0

    const displayName = getLocalizedPackTitle({ name, nameFr, nameEn, language, books }, locale);

    const handleSelectPack = () => {
        ga4TrackSelectItem({
            listId: 'packs_catalog',
            listName: 'Catalogue Packs',
            item: {
                item_id: id,
                item_name: displayName,
                price: displayPrice,
                item_category: 'Pack'
            }
        })
    }

    return (
        <div className="group relative bg-[#FDFBF7] rounded-[2rem] overflow-hidden border border-gray-100 hover:border-black shadow-sm hover:shadow-2xl transition-all duration-500">
            {/* Savings Badge - Style Pixio */}
            {hasDiscount && (
                <div className="absolute top-6 right-6 z-10 pointer-events-none">
                    <div className="bg-pixio-pink text-black px-4 py-2 rounded-full shadow-lg border border-black/5 rotate-12 group-hover:rotate-0 transition-transform">
                        <p className="text-xs font-black uppercase tracking-widest rtl:tracking-normal text-center leading-none">{t('Save')}</p>
                        <p className="text-xl font-black leading-none text-center">-{savingsPercent}%</p>
                    </div>
                </div>
            )}

            {/* Pack Icon Badge */}
            <div className="absolute top-6 left-6 z-10">
                <div className="bg-black text-white p-2.5 rounded-2xl shadow-lg group-hover:-translate-y-1 transition-transform">
                    <Package className="w-5 h-5" />
                </div>
            </div>

            {/* Wishlist Button */}
            <div className="absolute top-20 left-6 z-10">
                <WishlistButton
                    item={{
                        id,
                        title: displayName,
                        price: displayPrice,
                        image: image || (books && books.length > 0 ? books[0].book.image : '/images/placeholder.jpg'),
                        type: 'PACK',
                        slug: `/packs/${id}`
                    }}
                    className="bg-white text-black rounded-2xl shadow-lg hover:scale-110 transition-transform w-[40px] h-[40px]"
                />
            </div>

            {/* Image Section */}
            <Link href={`/packs/${id}`} prefetch={false} onClick={handleSelectPack} className="block">
                <div className="relative h-64 bg-gray-50 overflow-hidden">
                    {image ? (
                        <ImageWithFallback
                            src={image}
                            alt={`Pack ${displayName} - Riwaya Selection`}
                            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                            priority={priority}
                            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                        />
                    ) : (
                        <div className="absolute inset-0 flex items-center justify-center bg-pixio-yellow/30 p-8">
                            <div className="grid grid-cols-2 gap-3 transform group-hover:scale-105 transition-transform">
                                {books.slice(0, 4).map((pb: any, idx: number) => (
                                    <div key={pb.book.id} className={`relative w-20 h-28 rounded-xl overflow-hidden shadow-2xl border-2 border-white ${idx % 2 === 0 ? '-rotate-6' : 'rotate-6'}`}>
                                        <ImageWithFallback
                                            src={pb.book.image}
                                            alt={`${pb.book.title} - Inclus dans le pack ${displayName}`}
                                            className="w-full h-full object-cover"
                                            sizes="80px"
                                        />
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </Link>

            {/* Content */}
            <div className="p-8">
                <Link href={`/packs/${id}`} prefetch={false} onClick={handleSelectPack}>
                    <div className="flex flex-col items-center text-center mb-6">
                        <span className="text-xs rtl:text-sm font-black uppercase tracking-[0.2em] rtl:tracking-normal text-gray-600 mb-2">{t('Exclusive')}</span>
                        <h3 className="text-3xl md:text-2xl font-black text-black tracking-tighter mb-2 group-hover:translate-y-1 transition-transform">
                            {displayName}
                        </h3>
                        <div className="flex items-center gap-2 px-3 py-1 bg-white rounded-full border border-gray-100 shadow-sm">
                            <Sparkles className="w-3 h-3 text-yellow-500" />
                            <span className="text-xs font-black text-black uppercase tracking-widest rtl:tracking-normal">{books.length} {t('Includes')}</span>
                        </div>
                    </div>
                </Link>

                {/* Price Section - Style Pixio */}
                <div className="bg-white rounded-[1.5rem] p-6 border border-gray-50 shadow-sm space-y-4">
                    {hasDiscount && (
                        <div className="flex items-center justify-between text-xs rtl:text-sm font-black uppercase tracking-widest rtl:tracking-normal">
                            <span className="text-gray-600">{t('RegularPrice')}</span>
                            <span className="text-gray-500 line-through">{totalOriginalPrice} {locale === 'ar' ? 'درهم' : 'MAD'}</span>
                        </div>
                    )}

                    <div className="flex items-center justify-between">
                        <span className="text-xs rtl:text-sm font-black uppercase tracking-widest rtl:tracking-normal text-black">{t('PackPrice')}</span>
                        <span className="text-4xl md:text-3xl font-black text-black tracking-tighter">
                            {displayPrice} <span className="text-xs font-black text-gray-600 uppercase tracking-widest rtl:tracking-normal">{locale === 'ar' ? 'درهم' : 'MAD'}</span>
                        </span>
                    </div>

                    {/* Add to Cart Button */}
                    <button
                        disabled={isAdded}
                        className={`w-full flex items-center justify-center gap-3 font-black text-sm rtl:text-base uppercase tracking-[0.2em] rtl:tracking-normal py-5 px-6 rounded-full transition-all duration-300 relative z-10 ${
                            isAdded
                                ? 'bg-green-500 text-white scale-105 shadow-xl'
                                : 'bg-black text-white hover:bg-gray-800 shadow-xl hover:shadow-black/20 group/btn'
                        }`}
                        onClick={(e) => {
                            e.preventDefault()
                            if (isAdded) return;
                            try {
                                addItem({
                                    type: 'PACK',
                                    id,
                                    title: displayName,
                                    price: displayPrice,
                                    image: image || (books.length > 0 ? books[0].book.image : '/images/placeholder-pack.jpg'),
                                    booksCount: books.length,
                                    shippingFees,
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
                                    title: displayName,
                                    price: displayPrice,
                                    quantity: 1
                                })

                                // GA4 Ecommerce: Add to Cart
                                ga4TrackAddToCart({
                                    items: [{
                                        id,
                                        title: displayName,
                                        price: displayPrice,
                                        quantity: 1,
                                        category: 'Pack'
                                    }],
                                    value: displayPrice
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
                                
                                notifyAddToCart(displayName, displayPrice, 'PACK', currentSessionId, currentTotal, itemsText, discount).catch(console.error)

                                showNotification(tCommon('AddedToCartSuccess'), 'success')
                                
                                setIsAdded(true)
                                setTimeout(() => setIsAdded(false), 2000)
                            } catch (error) {
                                console.error('Failed to add pack to cart:', error)
                                showNotification(tCommon('AddedToCartError'), 'error')
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
                                <span>{t('AddSelection')}</span>
                                <ArrowRight className="w-4 h-4 transition-transform group-hover/btn:translate-x-1 rtl:group-hover/btn:-translate-x-1 rtl:rotate-180" />
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    )
}
