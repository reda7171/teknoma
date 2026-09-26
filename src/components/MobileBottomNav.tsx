'use client'

import { Link, usePathname } from '@/i18n/routing'
import { Home, BookOpen, Package, ShoppingCart, AlignJustify } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useCartStore } from '@/store/cart'
import { useUIStore } from '@/store/ui'
import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'

interface MobileBottomNavProps {
    onMenuClick: () => void
}

export default function MobileBottomNav({ onMenuClick }: MobileBottomNavProps) {
    const pathname = usePathname()
    const t = useTranslations('Navigation')
    const { toggleCart } = useUIStore()
    const totalItems = useCartStore((state) => state.items.reduce((total, item) => total + item.quantity, 0))
    const [mounted, setMounted] = useState(false)
    const [isCartAnimating, setIsCartAnimating] = useState(false)

    useEffect(() => { setMounted(true) }, [])

    useEffect(() => {
        if (totalItems > 0 && mounted) {
            setIsCartAnimating(true)
            const timer = setTimeout(() => setIsCartAnimating(false), 400)
            return () => clearTimeout(timer)
        }
    }, [totalItems, mounted])

    const navItems = [
        { href: '/', icon: Home, label: t('Home') },
        { href: '/books', icon: BookOpen, label: t('Books') },
    ]

    return (
        <>
            <nav
                aria-label="Navigation principale"
                className="md:hidden fixed bottom-4 left-4 right-4 z-[160] rounded-3xl"
                style={{
                    background: 'rgba(255,255,255,0.92)',
                    backdropFilter: 'blur(20px)',
                    WebkitBackdropFilter: 'blur(20px)',
                    border: '1px solid rgba(0,0,0,0.07)',
                    boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
                    paddingBottom: 'env(safe-area-inset-bottom)',
                }}
            >
                <div className="flex items-center justify-around px-1 py-1">

                    {/* Liens statiques */}
                    {navItems.map((item) => {
                        const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href))
                        const Icon = item.icon
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                aria-label={item.label}
                                aria-current={isActive ? 'page' : undefined}
                                className="flex flex-col flex-1 items-center justify-center gap-1 py-2 touch-manipulation"
                                style={{ WebkitTapHighlightColor: 'transparent' }}
                            >
                                {/* Icone avec fond actif */}
                                <span
                                    className="relative flex items-center justify-center transition-all duration-200"
                                    style={{
                                        width: 44,
                                        height: 32,
                                        transform: isActive ? 'scale(1)' : 'scale(0.95)',
                                    }}
                                >
                                    {isActive && (
                                        <motion.div
                                            layoutId="mobileNavIndicator"
                                            className="absolute inset-0 bg-black rounded-2xl"
                                            transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                                        />
                                    )}
                                    <Icon
                                        className="relative z-10 w-[18px] h-[18px] transition-all duration-200"
                                        style={{
                                            color: isActive ? '#fff' : '#9ca3af',
                                            strokeWidth: isActive ? 2.5 : 2,
                                        }}
                                    />
                                </span>
                                <span
                                    className="text-xs font-bold transition-all duration-200"
                                    style={{ color: isActive ? '#000' : '#9ca3af' }}
                                >
                                    {item.label}
                                </span>
                            </Link>
                        )
                    })}

                    {/* Panier */}
                    <button
                        onClick={toggleCart}
                        aria-label={`${t('Cart')}${mounted && totalItems > 0 ? ` (${totalItems})` : ''}`}
                        className="flex flex-col flex-1 items-center justify-center gap-1 py-2 touch-manipulation"
                        style={{ WebkitTapHighlightColor: 'transparent' }}
                    >
                        <span
                            className="relative flex items-center justify-center rounded-2xl transition-all duration-200"
                            style={{
                                width: 44,
                                height: 32,
                                background: 'transparent',
                            }}
                        >
                            <ShoppingCart
                                className="w-[18px] h-[18px] transition-all duration-200"
                                style={{
                                    color: isCartAnimating ? '#2563eb' : '#9ca3af',
                                    strokeWidth: 2,
                                    transform: isCartAnimating ? 'rotate(-10deg) scale(1.15)' : 'none',
                                    transition: 'transform 0.3s, color 0.2s',
                                }}
                            />
                            {mounted && totalItems > 0 && (
                                <span
                                    className="absolute -top-1 -right-1 flex items-center justify-center text-white font-black rounded-full border-2 border-white transition-all duration-300"
                                    style={{
                                        fontSize: 9,
                                        minWidth: 18,
                                        height: 18,
                                        background: isCartAnimating ? '#2563eb' : '#ef4444',
                                        transform: isCartAnimating ? 'scale(1.2)' : 'scale(1)',
                                        padding: '0 3px',
                                    }}
                                >
                                    {totalItems}
                                </span>
                            )}
                        </span>
                        <span className="text-xs font-bold" style={{ color: '#9ca3af' }}>
                            {t('Cart')}
                        </span>
                    </button>

                    {/* Menu */}
                    <button
                        onClick={onMenuClick}
                        aria-label={t('Menu')}
                        aria-expanded={false}
                        className="flex flex-col flex-1 items-center justify-center gap-1 py-2 touch-manipulation"
                        style={{ WebkitTapHighlightColor: 'transparent' }}
                    >
                        <span
                            className="flex items-center justify-center rounded-2xl"
                            style={{ width: 44, height: 32 }}
                        >
                            <AlignJustify className="w-[18px] h-[18px]" style={{ color: '#9ca3af', strokeWidth: 2 }} />
                        </span>
                        <span className="text-xs font-bold" style={{ color: '#9ca3af' }}>
                            {t('Menu')}
                        </span>
                    </button>

                </div>
            </nav>
        </>
    )
}
