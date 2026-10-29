'use client'

import { useState, useEffect, useRef } from 'react'
import { Link } from '@/i18n/routing'
import { User, Settings, Package, LogOut, ChevronDown, BookOpen, Heart, ShieldCheck, Sparkles } from 'lucide-react'
import { logout } from '@/lib/actions/community-auth'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { useUIStore } from '@/store/ui'
import { useReadingListStore } from '@/store/reading-list'

interface UserDropdownProps {
    user?: {
        fullName?: string | null
        email: string
        image?: string | null
        role?: string | null
    } | null
    features?: {
        readingList?: boolean
    }
}

export default function UserDropdown({ user, features = {} }: UserDropdownProps) {
    const [isOpen, setIsOpen] = useState(false)
    const [loggingOut, setLoggingOut] = useState(false)
    const dropdownRef = useRef<HTMLDivElement>(null)
    const router = useRouter()
    const t = useTranslations('Navigation')
    const [mounted, setMounted] = useState(false)
    const readingList = useReadingListStore((state) => state.items)

    useEffect(() => {
        setMounted(true)
        useReadingListStore.persist.rehydrate()
    }, [])

    // Fermer le dropdown si on clique à l'extérieur
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false)
            }
        }

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside)
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside)
        }
    }, [isOpen])

    const { showNotification } = useUIStore()

    async function handleLogout() {
        setLoggingOut(true)
        await logout()
        showNotification(t('UserMenu.LogoutSuccess'), 'info')
        router.push('/community/login')
        router.refresh()
    }

    // Si pas d'utilisateur connecté, afficher le lien de connexion
    if (!user) {
        return (
            <div className="relative group">
                <Link
                    href="/community/login"
                    aria-label="Se connecter"
                    className="w-10 h-10 flex items-center justify-center hover:bg-gray-50 rounded-full transition-colors"
                >
                    <User className="w-6 h-6 text-gray-900 group-hover:text-black" />
                </Link>

                {/* Dropdown Menu on Hover */}
                <div className="absolute right-0 rtl:left-0 rtl:right-auto mt-2 w-72 bg-white rounded-2xl shadow-xl border border-gray-100 py-4 px-4 z-50 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200">
                    <div className="text-center mb-4">
                        <h3 className="font-black text-lg">{t('JoinCommunity')}</h3>
                        <p className="text-xs text-gray-500 mt-1">{t('LoginToEnjoy')}</p>
                    </div>
                    <div className="space-y-4">
                        <div className="flex flex-col items-center text-center gap-1">
                            <div className="bg-pixio-yellow/20 p-2 rounded-full text-yellow-600 mb-1"><Sparkles className="w-4 h-4" /></div>
                            <div>
                                <p className="text-sm font-bold">{t('ReadingTracking')}</p>
                                <p className="text-[11px] text-gray-500">{t('SaveProgress')}</p>
                            </div>
                        </div>
                        <div className="flex flex-col items-center text-center gap-1">
                            <div className="bg-blue-50 p-2 rounded-full text-blue-500 mb-1"><BookOpen className="w-4 h-4" /></div>
                            <div>
                                <p className="text-sm font-bold">{t('BookExchange')}</p>
                                <p className="text-[11px] text-gray-500">{t('SwapWithReaders')}</p>
                            </div>
                        </div>
                        <div className="flex flex-col items-center text-center gap-1">
                            <div className="bg-red-50 p-2 rounded-full text-red-500 mb-1"><Heart className="w-4 h-4" /></div>
                            <div>
                                <p className="text-sm font-bold">{t('Wishlist')}</p>
                                <p className="text-[11px] text-gray-500">{t('SaveFavorites')}</p>
                            </div>
                        </div>
                    </div>
                    <div className="mt-4 pt-4 border-t border-gray-100">
                        <Link href="/community/login" className="block w-full py-2 bg-black text-white text-center rounded-xl font-bold text-sm hover:bg-gray-800 transition-colors">
                            {t('RegisterLogin')}
                        </Link>
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div className="relative" ref={dropdownRef}>
            {/* Trigger Button */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-2 hover:bg-gray-50 rounded-full transition-colors p-1 pr-3"
            >
                <div className="w-10 h-10 rounded-full bg-gray-100 overflow-hidden border-2 border-transparent hover:border-black transition-all">
                    {user.image ? (
                        <img src={user.image} alt={user.fullName || 'User'} className="w-full h-full object-cover" />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center bg-black text-white font-black text-sm">
                            {user.fullName?.[0] || user.email[0].toUpperCase()}
                        </div>
                    )}
                </div>
                <ChevronDown className={`w-4 h-4 text-gray-600 transition-transform hidden md:block ${isOpen ? 'rotate-180' : ''}`} />
            </button>

            {/* Dropdown Menu */}
            {isOpen && (
                <div className="absolute right-0 rtl:left-0 rtl:right-auto mt-2 w-64 bg-white rounded-2xl shadow-xl border border-gray-100 py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                    {/* User Info */}
                    <div className="px-4 py-3 border-b border-gray-100">
                        <p className="text-sm font-black text-black truncate">{user.fullName || t('UserMenu.DefaultUser')}</p>
                        <p className="text-xs text-gray-400 truncate">{user.email}</p>
                    </div>

                    {/* Menu Items */}
                    <div className="py-2">
                        <Link
                            href="/community"
                            onClick={() => setIsOpen(false)}
                            className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors group"
                        >
                            <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center group-hover:bg-black transition-colors">
                                <User className="w-4 h-4 text-gray-600 group-hover:text-white" />
                            </div>
                            <span className="text-sm font-bold text-gray-700 group-hover:text-black">{t('UserMenu.Profile')}</span>
                        </Link>

                        {features?.readingList !== false && (
                            <Link
                                href="/community/reading-list"
                                onClick={() => setIsOpen(false)}
                                className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors group"
                            >
                                <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center group-hover:bg-black transition-colors">
                                    <BookOpen className="w-4 h-4 text-gray-600 group-hover:text-white" />
                                </div>
                                <div className="flex flex-col">
                                    <span className="text-sm font-bold text-gray-700 group-hover:text-black">{t('UserMenu.ReadingList')}</span>
                                    {mounted && readingList.length > 0 && (
                                        <span className="text-[10px] text-gray-400 font-medium">
                                            {t('UserMenu.ReadingProgress', {
                                                completed: readingList.filter(i => i.status === 'COMPLETED').length,
                                                total: readingList.length
                                            })}
                                        </span>
                                    )}
                                </div>
                            </Link>
                        )}

                        <Link
                            href="/orders"
                            onClick={() => setIsOpen(false)}
                            className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors group"
                        >
                            <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center group-hover:bg-black transition-colors">
                                <Package className="w-4 h-4 text-gray-600 group-hover:text-white" />
                            </div>
                            <span className="text-sm font-bold text-gray-700 group-hover:text-black">{t('UserMenu.Orders')}</span>
                        </Link>

                        {(['ADMIN', 'MANAGER', 'SELLER', 'INFLUENCER', 'CONFIRMATOR'].includes(user.role?.toUpperCase() || '') || user.email === 'contact@petsunivers.ma') && (
                            <Link
                                href={
                                    user.role?.toUpperCase() === 'SELLER' ? '/seller' :
                                        user.role?.toUpperCase() === 'INFLUENCER' ? '/influencer' :
                                            '/admin'
                                }
                                onClick={() => setIsOpen(false)}
                                className="flex items-center gap-3 px-4 py-3 hover:bg-blue-50 transition-colors group"
                            >
                                <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center group-hover:bg-blue-600 transition-colors">
                                    <ShieldCheck className="w-4 h-4 text-blue-600 group-hover:text-white" />
                                </div>
                                <span className="text-sm font-bold text-blue-700 group-hover:text-blue-800">{t('UserMenu.AdminPanel')}</span>
                            </Link>
                        )}

                        <Link
                            href="/wishlist"
                            onClick={() => setIsOpen(false)}
                            className="flex items-center gap-3 px-4 py-3 hover:bg-red-50 transition-colors group"
                        >
                            <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center group-hover:bg-red-500 transition-colors">
                                <Heart className="w-4 h-4 text-gray-600 group-hover:text-white" />
                            </div>
                            <span className="text-sm font-bold text-gray-700 group-hover:text-red-600">{t('UserMenu.Favorites')}</span>
                        </Link>

                        <Link
                            href="/community/profile/edit"
                            onClick={() => setIsOpen(false)}
                            className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors group"
                        >
                            <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center group-hover:bg-black transition-colors">
                                <Settings className="w-4 h-4 text-gray-600 group-hover:text-white" />
                            </div>
                            <span className="text-sm font-bold text-gray-700 group-hover:text-black">{t('UserMenu.Settings')}</span>
                        </Link>
                    </div>

                    {/* Logout */}
                    <div className="border-t border-gray-100 pt-2">
                        <button
                            onClick={handleLogout}
                            disabled={loggingOut}
                            className="w-full flex items-center gap-3 px-4 py-3 hover:bg-red-50 transition-colors group disabled:opacity-50"
                        >
                            <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center group-hover:bg-red-500 transition-colors">
                                <LogOut className="w-4 h-4 text-gray-600 group-hover:text-white" />
                            </div>
                            <span className="text-sm font-bold text-gray-700 group-hover:text-red-600">
                                {loggingOut ? t('UserMenu.LogoutLoading') : t('UserMenu.Logout')}
                            </span>
                        </button>
                    </div>
                </div>
            )}
        </div>
    )
}
