'use client'

import { Link, usePathname } from '@/i18n/routing'
import { Home, BookOpen, Package, ShoppingCart, Menu } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useCartStore } from '@/store/cart'
import { useUIStore } from '@/store/ui'
import { useEffect, useState } from 'react'

interface MobileBottomNavProps {
    onMenuClick: () => void
}

export default function MobileBottomNav({ onMenuClick }: MobileBottomNavProps) {
    const pathname = usePathname()
    const t = useTranslations('Navigation')
    const { openCart } = useUIStore()
    const totalItems = useCartStore((state) => state.items.reduce((total, item) => total + item.quantity, 0))
    const [mounted, setMounted] = useState(false)

    useEffect(() => {
        setMounted(true)
    }, [])

    const [isCartAnimating, setIsCartAnimating] = useState(false)

    useEffect(() => {
        if (totalItems > 0 && mounted) {
            setIsCartAnimating(true)
            const timer = setTimeout(() => setIsCartAnimating(false), 300)
            return () => clearTimeout(timer)
        }
    }, [totalItems, mounted])

    const navItems = [
        { href: '/', icon: Home, label: t('Home') },
        { href: '/books', icon: BookOpen, label: t('Books') },
        { href: '/packs', icon: Package, label: t('Packs') },
    ]

    return (
        <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-[120] pb-safe">
            <div className="flex items-center justify-around h-16 px-2">
                {navItems.map((item) => {
                    const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href))
                    const Icon = item.icon
                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={`flex flex-col items-center justify-center w-full h-full space-y-1 ${
                                isActive ? 'text-black' : 'text-gray-500 hover:text-black'
                            }`}
                        >
                            <Icon className={`w-5 h-5 ${isActive ? 'stroke-[2.5px]' : 'stroke-2'}`} />
                            <span className="text-[10px] font-medium">{item.label}</span>
                        </Link>
                    )
                })}

                <button
                    onClick={openCart}
                    className="flex flex-col items-center justify-center w-full h-full space-y-1 text-gray-500 hover:text-black relative"
                >
                    <div className={`relative transition-all duration-300 ${isCartAnimating ? 'scale-110 -rotate-12' : 'animate-cart-vibrate'}`}>
                        <ShoppingCart className={`w-5 h-5 stroke-2 transition-colors ${isCartAnimating ? 'text-blue-600' : ''}`} />
                        {mounted && totalItems > 0 && (
                            <span className={`absolute -top-1.5 -right-2 text-white text-[9px] font-black rounded-full w-4 h-4 flex items-center justify-center border-2 border-white transition-all duration-300 ${isCartAnimating ? 'scale-125 bg-blue-600' : 'bg-red-500'}`}>
                                {totalItems}
                            </span>
                        )}
                    </div>
                    <span className="text-[10px] font-medium">{t('Cart')}</span>
                </button>

                <button
                    onClick={onMenuClick}
                    className="flex flex-col items-center justify-center w-full h-full space-y-1 text-gray-500 hover:text-black"
                >
                    <Menu className="w-5 h-5 stroke-2" />
                    <span className="text-[10px] font-medium">{t('Menu')}</span>
                </button>
            </div>
        </div>
    )
}
