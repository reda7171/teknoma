'use client'

import { useState } from 'react'
import { ShoppingCart, Check } from 'lucide-react'
import { useCartStore } from '@/store/cart'
import { useUIStore } from '@/store/ui'
import { useTranslations } from 'next-intl'
import { fbPixelEvents } from '@/lib/facebook-pixel'
import { notifyAddToCart } from '@/lib/actions/cart-notify'

interface AddToCartButtonProps {
    product: {
        id: string
        title: string
        price: number
        image: string
        type: 'BOOK' | 'PACK' | 'ACCESSORY'
        shippingFees?: number
        replacedBooks?: Record<string, { id: string, title: string }>
    }
    variant?: 'primary' | 'secondary'
    className?: string
    showIcon?: boolean
    disabled?: boolean
}

export default function AddToCartButton({
    product,
    variant = 'primary',
    className = '',
    showIcon = true,
    disabled = false
}: AddToCartButtonProps) {
    const addItem = useCartStore((state) => state.addItem)
    const openCart = useUIStore((state) => state.openCart)
    const showNotification = useUIStore((state) => state.showNotification)
    const sessionId = useCartStore((state) => state.sessionId)
    const setSessionId = useCartStore((state) => state.setSessionId)
    const t = useTranslations('Common');
    const [isAdded, setIsAdded] = useState(false)

    return (
        <button
            disabled={disabled || isAdded}
            className={`w-full flex items-center justify-center gap-2 sm:gap-3 font-black text-base sm:text-sm uppercase tracking-[0.1em] sm:tracking-widest rounded-full transition-all duration-300 py-4 px-4 sm:py-5 sm:px-8 ${
                disabled 
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed border-none' 
                    : isAdded
                        ? 'bg-green-500 text-white scale-105 shadow-xl'
                        : `active:scale-95 shadow-lg hover:shadow-black/20 hover:-translate-y-0.5 ${
                            variant === 'primary'
                                ? 'bg-black text-white hover:bg-gray-800'
                                : 'bg-white text-black border-2 border-black hover:bg-gray-50'
                        }`
            } ${className}`}
            onClick={() => {
                if (disabled || isAdded) return;
                try {

                    addItem({
                        type: product.type,
                        id: product.id,
                        title: product.title,
                        price: product.price,
                        image: product.image,
                        shippingFees: product.shippingFees,
                        replacedBooks: product.replacedBooks,
                    })

                    // Fire Confetti
                    import('canvas-confetti').then((confetti) => {
                        confetti.default({
                            particleCount: 80,
                            spread: 60,
                            origin: { y: 0.8 },
                            colors: ['#000000', '#10b981', '#3b82f6', '#f59e0b'],
                            zIndex: 9999
                        });
                    });

                    // Facebook Pixel Tracking
                    fbPixelEvents.addToCart({
                        id: product.id,
                        title: product.title,
                        price: product.price,
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

                    notifyAddToCart(product.title, product.price, product.type, currentSessionId, currentTotal, itemsText, discount).catch(console.error)

                    showNotification(t('AddedToCartSuccess'), 'success')
                    
                    setIsAdded(true)
                    setTimeout(() => setIsAdded(false), 2000)
                } catch (error) {
                    console.error('Failed to add to cart:', error)
                    showNotification(t('AddedToCartError'), 'error')
                }
            }}
        >
            {isAdded ? (
                <>
                    <Check className="w-5 h-5 sm:w-6 sm:h-6 animate-bounce" />
                    <span className="uppercase tracking-widest text-sm font-black">Ajouté</span>
                </>
            ) : (
                <>
                    {showIcon && <ShoppingCart className="w-5 h-5 sm:w-6 sm:h-6 rtl:flip" />}
                    <span className="uppercase tracking-widest text-sm font-black">{t('AddToCart')}</span>
                </>
            )}
        </button>
    )
}
