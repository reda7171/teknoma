'use client'

import React from 'react'
import { Link } from '@/i18n/routing'
import { usePathname } from 'next/navigation'
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
} from 'lucide-react'

export default function SellerSidebar({ user }: { user: any }) {
    const pathname = usePathname()
    const t = useTranslations('Seller.Sidebar')

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

    return (
        <aside className="fixed inset-y-0 left-0 w-64 bg-white border-r border-gray-200 z-50">
            <div className="flex flex-col h-full">
                {/* Logo */}
                <div className="flex items-center justify-between h-16 px-6 border-b border-gray-200">
                    <Link href="/" className="text-2xl font-black text-gray-900 uppercase tracking-tighter">
                        {t('Logo')} <span className="text-blue-600">{t('LogoSub')}</span>
                    </Link>
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
                                className={`
                                    flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-colors
                                    ${isActive
                                        ? 'bg-blue-50 text-blue-700'
                                        : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                                    }
                                `}
                            >
                                <Icon className={`w-5 h-5 mr-3 ${isActive ? 'text-blue-700' : 'text-gray-400'}`} />
                                {item.name}
                            </Link>
                        )
                    })}

                    <div className="pt-4 mt-4 border-t border-gray-100">
                        <Link
                            href="/seller/books/new"
                            className="flex items-center px-4 py-3 text-sm font-medium text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                        >
                            <PlusCircle className="w-5 h-5 mr-3" />
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
                        <div className="ml-3 overflow-hidden">
                            <p className="text-sm font-medium text-gray-900 truncate">{user?.fullName || 'Vendeur'}</p>
                            <p className="text-xs text-gray-500 truncate">{user?.email}</p>
                        </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                        <LanguageSwitcher upward />
                        <button
                            onClick={handleLogout}
                            className="flex-1 flex items-center justify-center px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 hover:text-red-700 rounded-lg transition-colors border border-red-100"
                        >
                            <LogOut className="w-4 h-4 mr-2 shrink-0" />
                            <span className="truncate">{t('Logout')}</span>
                        </button>
                    </div>
                </div>
            </div>
        </aside>
    )
}
