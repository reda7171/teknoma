'use client'

import { useEffect, useState } from 'react'
import { useCartStore } from '@/store/cart'

export default function StickyBottomActions({ children, productId }: { children: React.ReactNode, productId?: string }) {
    const [isHidden, setIsHidden] = useState(false)
    const cartItems = useCartStore(state => state.items)
    const isInCart = productId ? cartItems.some(item => item.id === productId) : false

    useEffect(() => {
        const footer = document.getElementById('main-footer')
        if (!footer) return

        const observer = new IntersectionObserver(
            ([entry]) => {
                setIsHidden(entry.isIntersecting)
            },
            {
                root: null,
                threshold: 0,
                rootMargin: '0px'
            }
        )

        observer.observe(footer)

        return () => {
            observer.disconnect()
        }
    }, [])

    if (isInCart) return null

    return (
        <div className={`fixed bottom-0 left-0 right-0 z-[150] px-4 py-3 bg-white border-t border-gray-200/80 shadow-[0_-8px_30px_rgba(0,0,0,0.1)] pb-[calc(0.75rem+env(safe-area-inset-bottom))] grid grid-cols-2 gap-3 md:flex md:flex-col md:relative md:bottom-auto md:left-auto md:right-auto md:z-auto md:p-0 md:bg-transparent md:border-none md:shadow-none md:space-y-4 md:gap-0 transition-all duration-300 ease-in-out ${isHidden ? 'translate-y-full md:translate-y-0 opacity-0 md:opacity-100 pointer-events-none md:pointer-events-auto' : 'translate-y-0 opacity-100 pointer-events-auto'}`}>
            {children}
        </div>
    )
}
