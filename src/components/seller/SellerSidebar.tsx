'use client'

import React, { useState } from 'react'
import { Link } from '@/i18n/routing'
import { usePathname, useParams } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { logout as adminLogout } from '@/lib/actions/auth'
import LanguageSwitcher from '@/components/LanguageSwitcher'
import {
    LayoutDashboard,
    BookOpen,
    ShoppingCart,
    LogOut,
    PlusCircle,
    PenLine,
    Menu,
    X,
    FileSpreadsheet
} from 'lucide-react'

export default function SellerSidebar({ user }: { user: any }) {
    const pathname = usePathname()
    const params = useParams()
    const locale = (params?.locale as string) || 'fr'
    const isRtl = locale === 'ar'
    const t = useTranslations('Seller.Sidebar')
    const [mobileOpen, setMobileOpen] = useState(false)

    const navigation = [
        { name: t('Dashboard'), href: '/seller', icon: LayoutDashboard },
        { name: t('MyBooks'), href: '/seller/books', icon: BookOpen },
        { name: t('MyOrders'), href: '/seller/orders', icon: ShoppingCart },
        { name: t('MyBlog'), href: '/seller/blog', icon: PenLine },
    ]

    async function handleLogout() {
        await adminLogout()
        window.location.href = '/admin/login'
    }

    const sidebarContent = (
        <div className="flex flex-col h-full">
            {/* Logo */}
            <div className="flex items-center justify-between h-16 px-6 border-b border-gray-200">
                <Link href="/" className="text-2xl font-black text-gray-900 uppercase tracking-tighter">
                    {t('Logo')} <span className="text-blue-600">{t('LogoSub')}</span>
                </Link>
                {/* Fermer sur mobile */}
                <button
                    className="md:hidden p-1 text-gray-400 hover:text-black transition-colors"
                    onClick={() => setMobileOpen(false)}
                >
                    <X className="w-5 h-5" />
                </button>
            </div>

            {/* Navigation */}
            <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
                {navigation.map((item) => {
                    const isActive = pathname === item.href || pathname.endsWith(item.href)
                    const Icon = item.icon
                    return (
                        <Link
                            key={item.name}
                            href={item.href}
                            onClick={() => setMobileOpen(false)}
                            className={`
                                flex items-center px-4 py-3 text-sm rounded-lg transition-colors
                                ${isRtl ? 'font-black' : 'font-medium'}
                                ${isActive
                                    ? 'bg-blue-50 text-blue-700'
                                    : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                                }
                            `}
                        >
                            <Icon className={`w-5 h-5 ${isRtl ? 'ml-3' : 'mr-3'} ${isActive ? 'text-blue-700' : 'text-gray-400'}`} />
                            {item.name}
                        </Link>
                    )
                })}

                <div className="pt-4 mt-4 border-t border-gray-100 space-y-1">
                    <Link
                        href="/seller/books/import"
                        onClick={() => setMobileOpen(false)}
                        className={`flex items-center px-4 py-3 text-sm text-blue-600 hover:bg-blue-50 rounded-lg transition-colors ${isRtl ? 'font-black' : 'font-medium'}`}
                    >
                        <FileSpreadsheet className={`w-5 h-5 ${isRtl ? 'ml-3' : 'mr-3'}`} />
                        {t('ImportBooks')}
                    </Link>
                    <Link
                        href="/seller/books/new"
                        onClick={() => setMobileOpen(false)}
                        className={`flex items-center px-4 py-3 text-sm text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors ${isRtl ? 'font-black' : 'font-medium'}`}
                    >
                        <PlusCircle className={`w-5 h-5 ${isRtl ? 'ml-3' : 'mr-3'}`} />
                        {t('NewBook')}
                    </Link>
                </div>
            </nav>

            {/* User Section */}
            <div className="p-4 border-t border-gray-200">
                <div className="flex items-center mb-4">
                    <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
                        <span className="text-sm font-medium text-blue-700">
                            {user?.fullName?.substring(0, 2).toUpperCase() || 'SE'}
                        </span>
                    </div>
                    <div className={`${isRtl ? 'mr-3' : 'ml-3'} overflow-hidden`}>
                        <p className="text-sm font-medium text-gray-900 truncate">{user?.fullName || 'Vendeur'}</p>
                        <p className="text-xs text-gray-500 truncate">{user?.email}</p>
                    </div>
                </div>

                <div className="flex flex-col gap-2">
                    <LanguageSwitcher upward />
                    <button
                        onClick={handleLogout}
                        className="w-full flex items-center justify-center px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 hover:text-red-700 rounded-lg transition-colors border border-red-100"
                    >
                        <LogOut className={`w-4 h-4 shrink-0 ${isRtl ? 'ml-2' : 'mr-2'}`} />
                        <span>{t('Logout')}</span>
                    </button>
                </div>
            </div>
        </div>
    )

    return (
        <>
            {/* Bouton hamburger mobile */}
            <button
                className="fixed top-4 z-[60] md:hidden p-2 bg-white rounded-xl shadow-lg border border-gray-100"
                style={isRtl ? { left: '1rem' } : { right: '1rem' }}
                onClick={() => setMobileOpen(true)}
            >
                <Menu className="w-5 h-5 text-black" />
            </button>

            {/* Overlay mobile */}
            {mobileOpen && (
                <div
                    className="fixed inset-0 bg-black/40 z-[55] md:hidden"
                    onClick={() => setMobileOpen(false)}
                />
            )}

            {/* Sidebar desktop — toujours visible */}
            <aside
                className={`fixed inset-y-0 w-64 bg-white z-50 hidden md:block ${
                    isRtl
                        ? 'right-0 border-l border-gray-200 font-[family-name:var(--font-cairo)]'
                        : 'left-0 border-r border-gray-200'
                }`}
                dir={isRtl ? 'rtl' : 'ltr'}
            >
                {sidebarContent}
            </aside>

            {/* Sidebar mobile — slide in/out */}
            <aside
                className={`fixed inset-y-0 w-72 bg-white z-[60] md:hidden transition-transform duration-300 ease-in-out ${
                    isRtl
                        ? `right-0 border-l border-gray-200 font-[family-name:var(--font-cairo)] ${mobileOpen ? 'translate-x-0' : 'translate-x-full'}`
                        : `left-0 border-r border-gray-200 ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}`
                }`}
                dir={isRtl ? 'rtl' : 'ltr'}
            >
                {sidebarContent}
            </aside>
        </>
    )
}
