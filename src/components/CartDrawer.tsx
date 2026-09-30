'use client'

import { useCartStore } from '@/store/cart'
import { normalizeImage } from '@/lib/utils'
// import Link from 'next/link' <-- remove standard next link
import { X, Minus, Plus, ShoppingCart, Trash2, ArrowRight } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link } from '@/i18n/routing'
import { useTranslations, useLocale } from 'next-intl'
import { notifyRemoveFromCart, notifyClearCart, notifyCheckoutInitiated } from '@/lib/actions/cart-notify'
import CartBookmarksUpsell from '@/components/cart/CartBookmarksUpsell'
import InstantOfferPopup from '@/components/cart/InstantOfferPopup'
import { usePathname } from 'next/navigation'
import { calculate3For4Discount } from '@/lib/utils'

interface CartDrawerProps {
    isOpen: boolean
    onClose: () => void
    is3For4Active?: boolean
}

export default function CartDrawer({ isOpen, onClose, is3For4Active = false }: CartDrawerProps) {
    const { items, removeItem, updateQuantity, getTotalPrice, getTotalItems, clearCart, sessionId } = useCartStore()
    const [mounted, setMounted] = useState(false)
    const t = useTranslations('Cart');
    const locale = useLocale();
    const pathname = usePathname()

    // Fermer le panier à chaque changement de page
    useEffect(() => {
        if (isOpen) onClose()
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [pathname])

    // Swipe to close states
    const [touchStart, setTouchStart] = useState<number | null>(null)
    const [touchEnd, setTouchEnd] = useState<number | null>(null)

    // Éviter les problèmes d'hydratation avec localStorage
    useEffect(() => {
        setMounted(true)
    }, [])

    if (!mounted) return null

    const totalPrice = getTotalPrice()
    const totalItems = getTotalItems()

    const handleRemove = async (item: any) => {
        removeItem(item.id)
        try {
            const newTotal = useCartStore.getState().getTotalPrice()
            await notifyRemoveFromCart(item.title, item.price, item.type, newTotal, sessionId || undefined)
        } catch (error) {
            console.error('Erreur notification', error)
        }
    }

    const handleClearCart = async () => {
        const value = getTotalPrice()
        const count = getTotalItems()
        clearCart()
        try {
            if (count > 0) {
                await notifyClearCart(value, count, sessionId || undefined)
            }
        } catch (error) {
            console.error('Erreur notification', error)
        }
    }
    
    const promo3for4Discount = is3For4Active ? calculate3For4Discount(items) : 0
    const finalTotal = Math.max(0, totalPrice - promo3for4Discount)


    const handleCheckoutClick = () => {
        const value = getTotalPrice()
        const count = getTotalItems()
        notifyCheckoutInitiated(value, count, sessionId || undefined).catch(console.error)
        onClose()
    }

    // Swipe handlers
    const minSwipeDistance = 50 

    const onTouchStartEvent = (e: React.TouchEvent) => {
        setTouchEnd(null)
        setTouchStart(e.targetTouches[0].clientX)
    }

    const onTouchMoveEvent = (e: React.TouchEvent) => setTouchEnd(e.targetTouches[0].clientX)

    const onTouchEndEvent = () => {
        if (!touchStart || !touchEnd) return
        const distance = touchStart - touchEnd
        const isLeftSwipe = distance > minSwipeDistance
        const isRightSwipe = distance < -minSwipeDistance
        
        const isRTL = document.documentElement.dir === 'rtl'
        if (isRTL && isLeftSwipe) {
            onClose()
        } else if (!isRTL && isRightSwipe) {
            onClose()
        }
    }

    return (
        <>
            {/* Overlay */}
            {isOpen && (
                <div
                    className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[170] transition-opacity"
                    onClick={onClose}
                />
            )}
            
            <InstantOfferPopup />

            {/* Drawer */}
            <div
                onTouchStart={onTouchStartEvent}
                onTouchMove={onTouchMoveEvent}
                onTouchEnd={onTouchEndEvent}
                className={`fixed top-0 right-0 rtl:left-0 rtl:right-auto h-full w-full sm:w-[520px] bg-white shadow-[0_0_100px_rgba(0,0,0,0.1)] z-[180] transform transition-transform duration-500 ease-in-out ${isOpen ? 'translate-x-0 pointer-events-auto' : 'translate-x-full rtl:-translate-x-full pointer-events-none'
                    }`}
            >
                <div className="flex flex-col h-full">
                    {/* Header - Style Pixio */}
                    <div className="flex items-center justify-between p-4 sm:p-8 border-b border-gray-50">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-black rounded-2xl flex items-center justify-center">
                                <ShoppingCart className="w-6 h-6 text-white" />
                            </div>
                            <div>
                                <h2 className="text-2xl font-black text-black tracking-tight">{t('Title')}</h2>
                                <p className="text-[10px] rtl:text-sm font-black uppercase tracking-[0.2em] text-gray-500">
                                    {t('SelectedItems', { count: totalItems })}
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            aria-label="Fermer le panier"
                            className="w-10 h-10 flex items-center justify-center hover:bg-gray-50 rounded-full transition-colors"
                        >
                            <X className="w-6 h-6 text-black" />
                        </button>
                    </div>

                    {/* Content */}
                    <div className="flex-1 overflow-y-auto custom-scrollbar bg-pixio-cream/30">
                        {items.length === 0 ? (
                            // Empty State - Style Pixio
                            <div className="flex flex-col items-center justify-center h-full p-6 sm:p-12 text-center space-y-8">
                                <div className="relative">
                                    <div className="w-32 h-32 bg-white rounded-full flex items-center justify-center shadow-2xl relative z-10">
                                        <ShoppingCart className="w-12 h-12 text-gray-200" />
                                    </div>
                                    <div className="absolute inset-0 bg-pixio-pink rounded-full blur-2xl opacity-20 scale-150"></div>
                                </div>
                                <div className="space-y-3">
                                    <h3 className="text-2xl font-black text-black tracking-tight">{t('EmptyTitle')}</h3>
                                    <p
                                        className="text-gray-500 font-medium"
                                        dangerouslySetInnerHTML={{ __html: t.raw('EmptyDesc') }}
                                    />
                                </div>
                                <Link
                                    href="/books"
                                    onClick={onClose}
                                    className="inline-flex items-center gap-3 px-10 py-5 bg-black text-white font-black text-xs uppercase tracking-widest rounded-full hover:bg-gray-800 transition-all shadow-xl hover:shadow-black/20"
                                >
                                    <span>{t('DiscoverBooks')}</span>
                                    <ArrowRight className="w-4 h-4 rtl:rotate-180" />
                                </Link>
                            </div>
                        ) : (
                            // Cart Items - Styled Cards
                            <div className="p-4 sm:p-8 space-y-4 sm:space-y-6">
                                {items.map((item) => (
                                    <div
                                        key={item.id}
                                        className="flex gap-4 sm:gap-6 p-4 sm:p-6 bg-white rounded-[2rem] border border-gray-100 shadow-sm transition-all hover:border-black group/item"
                                    >
                                        {/* Image */}
                                        <div className="relative w-20 h-28 sm:w-24 sm:h-32 flex-shrink-0 bg-pixio-cream rounded-2xl overflow-hidden border border-gray-50 group-hover:scale-105 transition-transform">
                                            {item.image && typeof item.image === 'string' && item.image.trim().length > 5 ? (
                                                <img
                                                    src={normalizeImage(item.image)}
                                                    alt={item.title}
                                                    className="w-full h-full object-cover"
                                                    onError={(e) => { (e.target as HTMLImageElement).src = '/book-placeholder.png' }}
                                                />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center bg-gray-100 text-gray-300">
                                                    <ShoppingCart className="w-8 h-8" />
                                                </div>
                                            )}
                                            {item.type === 'PACK' && (
                                                <div className="absolute top-2 left-2">
                                                    <span className="px-2 py-0.5 bg-black text-white text-[8px] font-black uppercase tracking-widest rounded-md">
                                                        {t('Set')}
                                                    </span>
                                                </div>
                                            )}
                                        </div>

                                        {/* Info */}
                                        <div className="flex-1 min-w-0 flex flex-col justify-between">
                                            <div>
                                                <div className="flex justify-between items-start gap-2">
                                                    <h3 className="font-black text-black tracking-tight line-clamp-2 leading-none group-hover:underline">
                                                        {item.title}
                                                    </h3>
                                                    <button
                                                        onClick={() => handleRemove(item)}
                                                        className="p-1 text-gray-300 hover:text-black transition-colors"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </div>
                                                <div className="flex items-center gap-4 mt-3">
                                                    <p className="text-sm font-black text-black">
                                                        {item.price} <span className="text-[10px] text-gray-500">{locale === 'ar' ? 'درهم' : 'MAD'}</span>
                                                    </p>
                                                    {item.booksCount && (
                                                        <span className="text-[10px] font-black uppercase tracking-widest text-gray-400 px-2 py-0.5 bg-gray-50 rounded-full">
                                                            {item.booksCount} {t('Titles')}
                                                        </span>
                                                    )}
                                                </div>
                                                {item.replacedBooks && Object.keys(item.replacedBooks).length > 0 && (
                                                    <div className="mt-2 p-2 bg-gray-50 rounded-lg border border-gray-100">
                                                        <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mb-1">Livres remplacés :</p>
                                                        <ul className="space-y-1">
                                                            {Object.values(item.replacedBooks).map((rb) => (
                                                                <li key={rb.id} className="text-[10px] text-black font-black flex items-center gap-2">
                                                                    <div className="w-1 h-1 bg-black rounded-full" />
                                                                    {rb.title}
                                                                </li>
                                                            ))}
                                                        </ul>
                                                    </div>
                                                )}
                                            </div>

                                            {/* Quantity Controls - Style Pixio */}
                                            <div className="flex items-center justify-between mt-4">
                                                <div className="flex items-center p-1 bg-pixio-cream rounded-full border border-gray-100">
                                                    <button
                                                        onClick={() => updateQuantity(item.id, item.quantity - 1)}
                                                        className="w-8 h-8 flex items-center justify-center bg-white rounded-full shadow-sm hover:bg-black hover:text-white transition-all disabled:opacity-50 disabled:hover:bg-white disabled:hover:text-black"
                                                        disabled={item.quantity <= 1}
                                                    >
                                                        <Minus className="w-3 h-3" />
                                                    </button>
                                                    <span className="w-10 text-center text-xs font-black text-black">
                                                        {item.quantity}
                                                    </span>
                                                    <button
                                                        onClick={() => updateQuantity(item.id, item.quantity + 1)}
                                                        className="w-8 h-8 flex items-center justify-center bg-white rounded-full shadow-sm hover:bg-black hover:text-white transition-all"
                                                    >
                                                        <Plus className="w-3 h-3" />
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}

                                {/* Upsell Marque-pages */}
                                {items.length > 0 && (
                                    <div className="hidden sm:block">
                                        <CartBookmarksUpsell />
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Footer - Style Pixio Summary */}
                    {items.length > 0 && (
                        <div className="p-4 md:p-8 bg-white border-t border-gray-50 space-y-6 md:space-y-8 pb-24 md:pb-safe">
                            {/* Summary */}
                            <div className="space-y-4">
                                {promo3for4Discount > 0 && (
                                    <div className="flex justify-between items-center text-rose-500 mb-2">
                                        <span className="text-sm font-black uppercase tracking-widest">{locale === 'ar' ? 'الكتاب الرابع مجاناً' : '4ème Livre Offert'}</span>
                                        <span className="text-xl font-black">-{promo3for4Discount} {locale === 'ar' ? 'درهم' : 'MAD'}</span>
                                    </div>
                                )}
                                <div className="flex justify-between items-center pt-2">
                                    <span className="text-sm sm:text-base font-black uppercase tracking-[0.2em] text-black">{t('OrderTotal')}</span>
                                    <span className="text-4xl font-black text-black tracking-tighter">{finalTotal} {locale === 'ar' ? 'درهم' : 'MAD'}</span>
                                </div>
                                <div className="text-center">
                                    <span className="text-xs sm:text-sm font-black uppercase tracking-widest text-gray-400">{t('DeliveryCalculatedNextStep')}</span>
                                </div>
                            </div>

                            {/* Checkout Button */}
                            <div className="space-y-4">
                                <Link
                                    href="/checkout"
                                    onClick={(e) => {
                                        const value = getTotalPrice()
                                        const count = getTotalItems()
                                        notifyCheckoutInitiated(value, count, sessionId || undefined).catch(console.error)
                                        // Ne pas appeler onClose ici pour éviter d'annuler la navigation du Link
                                    }}
                                    className="flex items-center justify-center gap-3 w-full py-4 sm:py-6 min-h-[56px] bg-black text-white font-black text-xs sm:text-sm uppercase tracking-[0.2em] rounded-full hover:bg-gray-800 transition-all shadow-xl hover:shadow-black/20"
                                >
                                    <span>{t('ProceedToCheckout')}</span>
                                    <ArrowRight className="w-4 h-4 rtl:rotate-180" />
                                </Link>

                                <button
                                    onClick={onClose}
                                    className="flex items-center justify-center w-full py-4 sm:py-6 min-h-[56px] bg-white border-2 border-black text-black font-black text-xs sm:text-sm uppercase tracking-[0.2em] rounded-full hover:bg-gray-50 transition-all"
                                >
                                    {t('KeepExploring')}
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </>
    )
}
