'use client'

import { Link, usePathname } from '@/i18n/routing'
import {
    BookOpen, ShoppingCart, Search, Menu, X, User,
    Home, Book, Users, Package, FileText, Newspaper, Gamepad2, Recycle,
    Monitor, Baby, Usb, UsersRound, ChevronDown, ChevronRight, LayoutGrid, Heart, Check
} from 'lucide-react'
import Image from 'next/image'
import dynamic from 'next/dynamic'
import { useState, useEffect, useRef } from 'react'
import { useCartStore } from '@/store/cart'
import PredictiveSearch from './PredictiveSearch'
import LanguageSwitcher from './LanguageSwitcher'
import { useTranslations, useLocale } from 'next-intl'
import { useUIStore } from '@/store/ui'
import UserDropdown from './UserDropdown'
import MobileBottomNav from './MobileBottomNav'
import { getWishlist } from '@/lib/actions/community-wishlist'
import { getReadingList } from '@/lib/actions/reading-list'
import { useWishlistStore } from '@/store/wishlist'
import { useReadingListStore } from '@/store/reading-list'

// The drawer is only useful after an explicit cart interaction. Keeping it out
// of the initial header bundle avoids shipping its order UI on every page view.
const CartDrawer = dynamic(() => import('./CartDrawer'), { ssr: false })

interface HeaderProps {
    user?: {
        fullName?: string | null
        email: string
        image?: string | null
    } | null
    notificationDropdown?: React.ReactNode
    navigation?: {
        id: string
        label: string
        url: string
    }[]
    features?: {
        seller?: boolean
        exchange?: boolean
        usb?: boolean
        kids?: boolean
        readingList?: boolean
        digital?: boolean
        packs?: boolean
        deposerListe?: boolean
        threeForFour?: boolean
    }
    megaMenu?: any[]
    seoCollections?: {
        id: string
        slug: string
        title: string
        h1: string
    }[]
    siteLogo?: string | null
}

export default function Header({ user, notificationDropdown, navigation, megaMenu = [], seoCollections = [], features = {}, siteLogo = null }: HeaderProps = { user: null }) {
    const getIconForUrl = (url: string, className = "w-4 h-4") => {
        if (url === '/') return <Home className={className} />
        if (url.includes('usedOnly=true')) return <Recycle className={className} />
        if (url.includes('/jeux-societe')) return <Gamepad2 className={className} />
        if (url.includes('/books')) return <Book className={className} />
        if (url.includes('/authors')) return <Users className={className} />
        if (url.includes('/packs')) return <Package className={className} />
        if (url.includes('/deposer-liste')) return <FileText className={className} />
        if (url.includes('/blog')) return <Newspaper className={className} />
        if (url.includes('/livres-numeriques')) return <Monitor className={className} />
        if (url.includes('/mon-enfant')) return <Baby className={className} />
        if (url.includes('/cle-usb')) return <Usb className={className} />
        if (url.includes('/community')) return <UsersRound className={className} />
        return null
    }

    const pathname = usePathname()
    const showSearch = (!pathname.includes('/mon-enfant') &&
        !pathname.includes('/cle-usb') &&
        !pathname.includes('/community/login') &&
        !pathname.includes('/community/register') &&
        !pathname.includes('/community/profile/edit') &&
        !pathname.includes('/community/market') &&
        !pathname.includes('/cart') &&
        !pathname.includes('/blog/') &&
        !pathname.includes('/checkout') &&
        !pathname.includes('/books/'))
    const locale = useLocale()
    const t = useTranslations('Navigation')
    const tCat = useTranslations('Categories')
    const [mobileSearchOpen, setMobileSearchOpen] = useState(false)
    const {
        isCartOpen,
        openCart,
        closeCart,
        isMobileMenuOpen,
        openMobileMenu,
        closeMobileMenu,
        setMobileMenuOpen
    } = useUIStore()
    const totalItems = useCartStore((state) => state.items.reduce((total, item) => total + item.quantity, 0))
    const [mounted, setMounted] = useState(false)

    // Fermer le menu mobile et la recherche lors des changements de page
    useEffect(() => {
        closeMobileMenu()
        setMobileSearchOpen(false)
    }, [pathname, closeMobileMenu])

    // Gestionnaires tactiles natifs avec touch-pan-y pour optimiser l'INP sur mobile
    const menuTouchStartX = useRef<number | null>(null)
    const menuTouchStartY = useRef<number | null>(null)

    const handleMenuTouchStart = (e: React.TouchEvent) => {
        menuTouchStartX.current = e.targetTouches[0]?.clientX ?? null
        menuTouchStartY.current = e.targetTouches[0]?.clientY ?? null
    }

    const handleMenuTouchEnd = (e: React.TouchEvent) => {
        if (menuTouchStartX.current === null || menuTouchStartY.current === null) return
        const endX = e.changedTouches[0]?.clientX
        const endY = e.changedTouches[0]?.clientY
        if (typeof endX !== 'number' || typeof endY !== 'number') return

        const deltaX = endX - menuTouchStartX.current
        const deltaY = endY - menuTouchStartY.current
        menuTouchStartX.current = null
        menuTouchStartY.current = null

        // Ignorer si le geste est principalement vertical
        if (Math.abs(deltaY) > Math.abs(deltaX)) return

        const isRTL = typeof document !== 'undefined' && document.documentElement.dir === 'rtl'
        if ((!isRTL && deltaX > 50) || (isRTL && deltaX < -50)) {
            closeMobileMenu()
        }
    }

    // Éviter les problèmes d'hydratation et synchroniser l'état d'authentification
    useEffect(() => {
        setMounted(true)
        const isAuth = Boolean(user)
        useUIStore.getState().setIsAuthenticated(isAuth)
        if (typeof document !== 'undefined') {
            if (isAuth) {
                document.cookie = 'riwaya_authenticated=1; path=/; max-age=2592000; SameSite=Lax'
            } else if (document.cookie.includes('riwaya_authenticated=1')) {
                document.cookie = 'riwaya_authenticated=; path=/; max-age=0; SameSite=Lax'
            }
        }
    }, [user])

    const [isCartAnimating, setIsCartAnimating] = useState(false)

    // Animation du panier lors de l'ajout
    useEffect(() => {
        if (totalItems > 0 && mounted) {
            setIsCartAnimating(true)
            const timer = setTimeout(() => setIsCartAnimating(false), 300)
            return () => clearTimeout(timer)
        }
    }, [totalItems, mounted])

    // Synchronisation des données utilisateur (Favoris & Liste de lecture)
    useEffect(() => {
        const syncUserData = async () => {
            if (user) {
                try {
                    // On ne déclenche la synchro que si on est monté côté client
                    // Fetch en parallèle
                    const [wishlistData, readingListData] = await Promise.all([
                        getWishlist(),
                        features.readingList !== false ? getReadingList() : Promise.resolve([])
                    ])

                    // Mapper et mettre à jour le store Wishlist
                    const mappedWishlist: any[] = wishlistData.map((w: any) => {
                        if (w.book) {
                            return {
                                id: w.book.id,
                                type: 'BOOK',
                                title: w.book.title,
                                image: w.book.image,
                                price: w.book.price,
                                author: w.book.author,
                                slug: `/books/${w.book.id}`,
                                category: w.book.category || undefined
                            }
                        }
                        if (w.pack) {
                            return {
                                id: w.pack.id,
                                type: 'PACK',
                                title: w.pack.name,
                                image: w.pack.image,
                                price: w.pack.price,
                                slug: `/packs/${w.pack.id}`
                            }
                        }
                        return null
                    }).filter(Boolean)

                    // Fusionner avec les favoris locaux (éviter doublons)
                    const localItems = useWishlistStore.getState().items
                    const mergedItems = [...mappedWishlist]

                    localItems.forEach(localItem => {
                        if (!mergedItems.find(mi => mi.id === localItem.id)) {
                            mergedItems.push(localItem)
                        }
                    })

                    useWishlistStore.setState({ items: mergedItems })

                    // Mapper et mettre à jour le store ReadingList
                    const mappedReadingList: any[] = readingListData.map((r: any) => ({
                        id: r.bookId || r.id, // Important: ID du livre si possible
                        title: r.title,
                        author: r.author,
                        cover: r.cover || '',
                        totalPages: r.totalPages,
                        currentPage: r.currentPage,
                        status: r.status,
                        addedAt: r.createdAt // string conversion might be needed if Date
                    }))
                    useReadingListStore.setState({ items: mappedReadingList })

                } catch (error) {
                    console.error("Erreur lors de la synchro des données utilisateur:", error)
                }
            } else {
                // Si pas d'utilisateur (logout), on efface les stores locaux pour éviter le partage de session
                useWishlistStore.getState().clearWishlist()
                useReadingListStore.getState().clearReadingList()
            }
        }

        syncUserData()
    }, [user]) // Se déclenche à chaque changement d'utilisateur (Login/Logout)

    const displayItems = mounted ? totalItems : 0
    const defaultNavItems = [
        { href: '/', label: t('Home') },
        { href: '/books', label: t('Books') },
        { href: '/authors', label: t('Authors') },
        { href: '/quotes', label: t('Quotes') },
        ...(features.packs === true ? [{ href: '/packs', label: t('Packs') }] : []),
        ...(features.deposerListe === true ? [{ href: '/deposer-liste', label: t('DeposerListe') }] : []),
        { href: '/blog', label: t('Journal'), isJournal: true },
        ...(features.digital === true ? [{ href: '/livres-numeriques', label: t('Digital') }] : []),
        ...(features.kids === true ? [{ href: '/mon-enfant', label: t('Kids') }] : []),
        ...(features.usb === true ? [{ href: '/cle-usb', label: t('UsbKey') }] : []),
        ...(features.exchange === true ? [{ href: '/community/market', label: t('Community') }] : []),
        ...(features.seller === true ? [{ href: '/sell-book', label: t('SellBook') }] : []),
    ]

    const navItems = navigation && navigation.length > 0
        ? navigation
            .filter((item) => {
                const url = item.url.toLowerCase()
                const label = item.label.toLowerCase()

                // Filtrer les items selon les features désactivées (vérifie URL et Label)
                if ((url.includes('packs') || label.includes('packs')) && features.packs !== true) return false
                if ((url.includes('enfant') || label.includes('enfant')) && features.kids !== true) return false
                if ((url.includes('usb') || url.includes('fameux') || label.includes('usb') || label.includes('fameux')) && features.usb !== true) return false
                if ((url.includes('numerique') || url.includes('pdf') || label.includes('pdf')) && features.digital !== true) return false
                if ((url.includes('community') || url.includes('echange') || label.includes('echange')) && features.exchange !== true) return false
                if ((url.includes('vendeur') || label.includes('vendeur')) && features.seller !== true) return false
                if ((url.includes('reading') || url.includes('lecture') || label.includes('lecture')) && features.readingList !== true) return false
                if ((url.includes('deposer') || label.includes('deposer')) && features.deposerListe !== true) return false

                return true
            })
            .map(item => ({
                href: item.url,
                label: t.has(item.label as any) ? t(item.label as any) : item.label,
                isJournal: item.url.includes('/blog'),
                isCategoryMenu: item.url === '#categories' || item.url === '#collections' || item.url === '#*collections'
            }))
        : defaultNavItems

    let finalNavItems = navigation && navigation.length > 0 && !navItems.some(i => i.href.includes('authors'))
        ? [...navItems, { href: '/authors', label: t('Authors'), isJournal: false }]
        : navItems




    return (
        <>
            <header className="fixed top-0 left-0 right-0 z-50 bg-white shadow-sm">
                <div className="w-full px-4 sm:px-6 lg:px-8 xl:px-12">
                    <div className="flex items-center justify-between h-20">
                        {/* Logo - Dynamique ou Style Pixio */}
                        <Link 
                            href="/" 
                            onClick={(e) => {
                                const path = window.location.pathname;
                                if (path === '/' || path === '/fr' || path === '/ar' || path === '/en') {
                                    e.preventDefault();
                                    window.scrollTo({ top: 0, behavior: 'smooth' });
                                }
                            }}
                            className="flex items-center gap-2 group shrink-0 lg:ltr:mr-8 lg:rtl:ml-8 xl:ltr:mr-16 xl:rtl:ml-16" 
                            dir="ltr"
                        >
                            {siteLogo ? (
                                <div className="relative group-hover:scale-105 transition-transform duration-300">
                                    <Image
                                        src={siteLogo}
                                        alt="Riwaya Logo"
                                        width={96}
                                        height={32}
                                        sizes="96px"
                                        quality={75}
                                        className="h-8 w-auto object-contain"
                                        priority
                                    />
                                    {/* Effet premium : reflet luxury diagonal (100% composited GPU) */}
                                    <span aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden rounded-[2px]">
                                        <span
                                            style={{
                                                position: 'absolute',
                                                top: 0,
                                                bottom: 0,
                                                left: '-50%',
                                                width: '200%',
                                                background: 'linear-gradient(115deg, transparent 20%, rgba(255,255,255,0.08) 35%, rgba(255,220,80,0.5) 45%, rgba(255,255,255,0.9) 50%, rgba(255,220,80,0.5) 55%, rgba(255,255,255,0.08) 65%, transparent 80%)',
                                                mixBlendMode: 'screen',
                                                willChange: 'transform, opacity',
                                                animation: 'logo-premium-shine 4s cubic-bezier(0.4,0,0.2,1) infinite',
                                            }}
                                        />
                                    </span>
                                    <style>{`
                                    @keyframes logo-premium-shine {
                                        0%   { transform: translateX(-100%); opacity: 0; }
                                        10%  { opacity: 1; }
                                        35%  { transform: translateX(100%); opacity: 0; }
                                        100% { transform: translateX(100%); opacity: 0; }
                                    }
                                `}</style>
                                </div>
                            ) : (
                                <>
                                    <div className="w-8 h-8 bg-black rounded-lg flex items-center justify-center group-hover:rotate-12 transition-transform">
                                        <BookOpen className="w-5 h-5 text-white" />
                                    </div>
                                    <span className={`text-2xl lg:text-3xl font-black tracking-tighter text-black flex items-center ${locale === 'ar' ? 'font-[family-name:var(--font-cairo)]' : ''}`}>
                                        {(locale === 'ar' ? ['ر', 'و', 'ا', 'ية'] : 'riwaya'.split('')).map((char, i) => (
                                            <span key={i} className="inline-block animate-bounce" style={{ animationDelay: `${i * 100}ms` }}>
                                                {char}
                                            </span>
                                        ))}
                                        <span className="text-[#10b981] inline-block animate-bounce" style={{ animationDelay: `${(locale === 'ar' ? 4 : 6) * 100}ms` }}>.</span>
                                    </span>
                                </>
                            )}
                        </Link>

                        {/* Desktop Navigation - Elegant & Clean */}
                        <nav className="hidden 2xl:flex flex-1 justify-center items-center gap-4 xl:gap-8">
                            {/* Navigation Items - Server Side Rendered */}
                            {finalNavItems.slice(0, 8).map((item: any) => {
                                const isActive = pathname === item.href || (item.href !== '/' && item.href !== '#categories' && pathname.startsWith(item.href))
                                const isSpecial = item.href.includes('/mon-enfant') || item.href.includes('/cle-usb') || item.href.includes('/livres-numeriques') || item.isJournal || item.href.includes('/deposer-liste')

                                if (item.isCategoryMenu) {
                                    return (
                                        <div key="categories" className="relative group/category">
                                            <button 
                                                className={`font-black text-[13px] rtl:text-[15px] uppercase tracking-widest rtl:tracking-normal transition-colors relative flex items-center gap-1.5 px-3 py-2 -mx-3 ${isActive ? 'text-black' : 'text-gray-900 hover:text-black'}`}
                                                aria-label={item.label}
                                            >
                                                <LayoutGrid className="w-4 h-4" />
                                                <span>{item.label}</span>
                                                <ChevronDown className="w-4 h-4 transition-transform group-hover/category:rotate-180" />
                                            </button>
                                            <div className="absolute top-full left-1/2 rtl:left-auto rtl:right-1/2 -translate-x-1/2 rtl:translate-x-1/2 mt-4 w-[850px] bg-white shadow-2xl shadow-black/10 rounded-2xl border border-gray-100 opacity-0 invisible group-hover/category:opacity-100 group-hover/category:visible group-hover/category:translate-y-0 translate-y-2 transition-all duration-300 z-50 flex min-h-[450px]">
                                                {seoCollections.length > 0 ? (
                                                    <div className="w-full p-7">
                                                        <div className="flex items-center justify-between mb-5 pb-4 border-b border-gray-100">
                                                            <div>
                                                                <h3 className="text-xl font-black text-gray-900">
                                                                    {locale === 'ar' ? 'استكشف مجموعاتنا' : locale === 'en' ? 'Explore our collections' : 'Explorez nos collections'}
                                                                </h3>
                                                                <p className="mt-1 text-xs font-medium text-gray-400">
                                                                    {locale === 'ar' ? 'مختارات موضوعية من مكتبة رواية' : locale === 'en' ? 'Curated selections from Riwaya' : 'Sélections thématiques de la librairie Riwaya'}
                                                                </p>
                                                            </div>
                                                            <LayoutGrid className="w-8 h-8 text-gray-200" />
                                                        </div>
                                                        <div className="grid grid-cols-3 gap-2 max-h-[340px] overflow-y-auto pr-1 rtl:pr-0 rtl:pl-1">
                                                            {seoCollections.map(collection => (
                                                                <Link
                                                                    key={collection.id}
                                                                    href={`/collection/${collection.slug}`}
                                                                    className="group/collection flex items-center gap-3 rounded-xl border border-gray-100 px-3 py-3 text-sm font-bold text-gray-700 transition-all hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
                                                                >
                                                                    <span className="h-2 w-2 flex-none rounded-full bg-gray-300 transition-colors group-hover/collection:bg-blue-500" />
                                                                    <span className="line-clamp-2">{collection.h1 || collection.title}</span>
                                                                </Link>
                                                            ))}
                                                        </div>
                                                    </div>
                                                ) : (
                                                <>
                                                {/* Left Column - Main Categories */}
                                                <div className="w-1/3 bg-gray-50/50 p-3 border-r border-gray-100 rtl:border-l rtl:border-r-0 relative z-20 rounded-l-2xl rtl:rounded-r-2xl rtl:rounded-l-none">
                                                    <ul className="space-y-1">
                                                        {megaMenu.map((mainCatItem: any, index: number) => {
                                                            const mainCat = mainCatItem.label;
                                                            const subCats = mainCatItem.children || [];
                                                            const colors = [
                                                                { bg: 'hover:bg-blue-50', text: 'group-hover/mega-item:text-blue-600', border: 'hover:border-blue-500', dot: 'group-hover/link:bg-blue-500', rightBg: 'bg-gradient-to-br from-white to-blue-50/30' },
                                                                { bg: 'hover:bg-indigo-50', text: 'group-hover/mega-item:text-indigo-600', border: 'hover:border-indigo-500', dot: 'group-hover/link:bg-indigo-500', rightBg: 'bg-gradient-to-br from-white to-indigo-50/30' },
                                                                { bg: 'hover:bg-purple-50', text: 'group-hover/mega-item:text-purple-600', border: 'hover:border-purple-500', dot: 'group-hover/link:bg-purple-500', rightBg: 'bg-gradient-to-br from-white to-purple-50/30' },
                                                                { bg: 'hover:bg-pink-50', text: 'group-hover/mega-item:text-pink-600', border: 'hover:border-pink-500', dot: 'group-hover/link:bg-pink-500', rightBg: 'bg-gradient-to-br from-white to-pink-50/30' },
                                                                { bg: 'hover:bg-amber-50', text: 'group-hover/mega-item:text-amber-600', border: 'hover:border-amber-500', dot: 'group-hover/link:bg-amber-500', rightBg: 'bg-gradient-to-br from-white to-amber-50/30' },
                                                                { bg: 'hover:bg-teal-50', text: 'group-hover/mega-item:text-teal-600', border: 'hover:border-teal-500', dot: 'group-hover/link:bg-teal-500', rightBg: 'bg-gradient-to-br from-white to-teal-50/30' },
                                                                { bg: 'hover:bg-emerald-50', text: 'group-hover/mega-item:text-emerald-600', border: 'hover:border-emerald-500', dot: 'group-hover/link:bg-emerald-500', rightBg: 'bg-gradient-to-br from-white to-emerald-50/30' },
                                                                { bg: 'hover:bg-sky-50', text: 'group-hover/mega-item:text-sky-600', border: 'hover:border-sky-500', dot: 'group-hover/link:bg-sky-500', rightBg: 'bg-gradient-to-br from-white to-sky-50/30' },
                                                                { bg: 'hover:bg-rose-50', text: 'group-hover/mega-item:text-rose-600', border: 'hover:border-rose-500', dot: 'group-hover/link:bg-rose-500', rightBg: 'bg-gradient-to-br from-white to-rose-50/30' }
                                                            ];
                                                            const c = colors[index % colors.length];

                                                            return (
                                                                <li key={mainCatItem.id} className="group/mega-item">
                                                                    <Link href={mainCatItem.url} className={`w-full flex items-center justify-between px-4 py-3 text-sm font-bold text-gray-600 ${c.bg} ${c.text} hover:shadow-sm rounded-xl transition-all border-l-4 border-transparent rtl:border-l-0 rtl:border-r-4 ${c.border}`}>
                                                                        {tCat.has(mainCat as any) ? tCat(mainCat as any) : mainCat}
                                                                        {subCats.length > 0 && <ChevronRight className="w-4 h-4 rtl:rotate-180 opacity-0 group-hover/mega-item:opacity-100 group-hover/mega-item:translate-x-1 rtl:group-hover/mega-item:-translate-x-1 transition-all" />}
                                                                    </Link>

                                                                    {/* Right Column - Subcategories (Shows on hover of this li) */}
                                                                    {subCats.length > 0 && (
                                                                        <div className={`absolute top-0 left-full rtl:left-auto rtl:right-full w-[200%] h-full opacity-0 invisible group-hover/mega-item:opacity-100 group-hover/mega-item:visible group-hover/mega-item:z-10 z-0 p-8 transition-all duration-300 cursor-default rounded-r-2xl rtl:rounded-l-2xl rtl:rounded-r-none ${c.rightBg}`}>
                                                                            <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-200/50">
                                                                                <h3 className={`text-xl font-black ${c.text.replace('group-hover/mega-item:', '')}`}>{tCat.has(mainCat as any) ? tCat(mainCat as any) : mainCat}</h3>
                                                                                <Link href={mainCatItem.url} className="text-[11px] font-bold uppercase tracking-wider text-gray-700 hover:text-black transition-colors bg-white px-3 py-1.5 rounded-full shadow-sm border border-gray-100">
                                                                                    Voir tout
                                                                                </Link>
                                                                            </div>
                                                                            <div className="grid grid-cols-2 gap-x-8 gap-y-4">
                                                                                {subCats.map((sub: any) => (
                                                                                    <Link
                                                                                        key={sub.id}
                                                                                        href={sub.url}
                                                                                        className="group/link flex items-center gap-3 text-[13px] font-bold text-gray-700 hover:text-black transition-colors"
                                                                                    >
                                                                                        <span className={`w-1.5 h-1.5 rounded-full bg-gray-300 transition-colors ${c.dot}`} />
                                                                                        {tCat.has(sub.label as any) ? tCat(sub.label as any) : sub.label}
                                                                                    </Link>
                                                                                ))}
                                                                            </div>
                                                                        </div>
                                                                    )}
                                                                </li>
                                                            );
                                                        })}
                                                    </ul>
                                                </div>

                                                {/* Default State (When not hovering any specific category) */}
                                                <div className="absolute top-0 right-0 rtl:left-0 rtl:right-auto bottom-0 w-2/3 bg-white p-8 flex flex-col items-center justify-center text-center z-0 rounded-r-2xl rtl:rounded-l-2xl rtl:rounded-r-none pointer-events-none">
                                                    <div className="w-16 h-16 bg-gray-50 rounded-2xl flex items-center justify-center mb-4">
                                                        <LayoutGrid className="w-8 h-8 text-gray-300" />
                                                    </div>
                                                    <h3 className="text-lg font-black text-gray-900 mb-2">Explorez nos catégories</h3>
                                                    <p className="text-sm text-gray-400 max-w-sm">
                                                        Survolez une catégorie pour découvrir toutes nos sous-catégories et trouver votre prochaine lecture.
                                                    </p>
                                                </div>
                                                </>
                                                )}
                                            </div>
                                        </div>
                                    )
                                }

                                if (isSpecial) {
                                    const isKids = item.href.includes('/mon-enfant')
                                    const isDigital = item.href.includes('/livres-numeriques')
                                    const isJournal = item.isJournal
                                    const isDeposer = item.href.includes('/deposer-liste')

                                    const vibrantBg = isKids ? 'bg-pink-500' : isDigital ? 'bg-amber-400' : isJournal ? 'bg-black' : isDeposer ? 'bg-green-500' : 'bg-blue-500'
                                    const vibrantText = isKids ? 'text-pink-700' : isDigital ? 'text-amber-800' : isJournal ? 'text-black' : isDeposer ? 'text-emerald-700' : 'text-blue-700'
                                    const vibrantBorder = isKids ? 'border-pink-500/20 hover:border-pink-500' : isDigital ? 'border-amber-400/20 hover:border-amber-400' : isJournal ? 'border-gray-200 hover:border-black' : isDeposer ? 'border-green-500/20 hover:border-green-500' : 'border-blue-500/20 hover:border-blue-500'

                                    const finalBg = isJournal ? 'bg-[#FDFBF7]' : vibrantBg
                                    const finalText = isJournal ? 'text-black' : vibrantText

                                    if (isKids) {
                                        return (
                                            <div key={item.href} className="relative group/kids inline-block">
                                                <Link
                                                    href={item.href}
                                                    className={`font-black text-[11px] rtl:text-sm uppercase tracking-widest rtl:tracking-normal whitespace-nowrap shrink-0 transition-all px-5 py-2.5 rounded-[2rem] border-2 flex items-center gap-2 cursor-pointer ${isActive
                                                            ? `${vibrantBg} text-black border-transparent shadow-[0_10px_20px_rgba(0,0,0,0.15)]`
                                                            : `bg-white ${vibrantText} ${vibrantBorder} hover:${vibrantBg} hover:text-black shadow-sm`
                                                        }`}
                                                >
                                                    <span>{item.label}</span>
                                                    <ChevronDown className="w-3 h-3 ml-1 transition-transform group-hover/kids:rotate-180" />
                                                    <span className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-black' : vibrantBg}`} />
                                                </Link>
                                                
                                                <div className="absolute top-full left-1/2 -translate-x-1/2 mt-4 w-48 bg-white shadow-2xl shadow-black/10 rounded-2xl border border-pink-100 opacity-0 invisible group-hover/kids:opacity-100 group-hover/kids:visible group-hover/kids:translate-y-0 translate-y-2 transition-all duration-300 z-50 flex flex-col overflow-hidden">
                                                    <Link href="/mon-enfant" className="px-4 py-3 text-sm font-bold text-gray-700 hover:text-pink-600 hover:bg-pink-50 transition-colors border-b border-pink-50 flex items-center gap-2">
                                                        <Baby className="w-4 h-4" />
                                                        {locale === 'ar' ? 'كتب' : locale === 'en' ? 'Books' : 'Livres'}
                                                    </Link>
                                                    <Link href="/jeux-societe" className="px-4 py-3 text-sm font-bold text-gray-700 hover:text-pink-600 hover:bg-pink-50 transition-colors flex items-center gap-2">
                                                        <Gamepad2 className="w-4 h-4" />
                                                        {locale === 'ar' ? 'ألعاب الطاولة' : locale === 'en' ? 'Board Games' : 'Jeux de Société'}
                                                    </Link>
                                                </div>
                                            </div>
                                        )
                                    }

                                    return (
                                        <Link
                                            key={item.href}
                                            href={item.href}
                                            className={`font-black text-[11px] rtl:text-sm uppercase tracking-widest rtl:tracking-normal whitespace-nowrap shrink-0 transition-all px-5 py-2.5 rounded-[2rem] border-2 flex items-center gap-2 ${isActive
                                                    ? `${isJournal ? 'bg-black text-white' : `${vibrantBg} text-black`} border-transparent shadow-[0_10px_20px_rgba(0,0,0,0.15)]`
                                                    : `${isJournal ? 'bg-[#FDFBF7] text-black border-gray-100 hover:border-black' : `bg-white ${vibrantText} ${vibrantBorder} hover:${vibrantBg} hover:text-black`} shadow-sm`
                                                }`}
                                        >
                                            <span>{item.label}</span>
                                            {isJournal && <span className="flex h-2 w-2 relative">
                                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                                                <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                                            </span>}
                                            {/* Optional subtle dot marker */}
                                            <span className={`w-1.5 h-1.5 rounded-full ${isActive ? (isJournal ? 'bg-white' : 'bg-black') : vibrantBg}`} />
                                        </Link>
                                    )
                                }

                                if (item.href === '/books') {
                                    return (
                                        <div key={item.href} className="relative group/books inline-block">
                                            <Link href="/books" className={`font-black text-[11px] rtl:text-sm uppercase tracking-widest rtl:tracking-normal whitespace-nowrap shrink-0 transition-all px-5 py-2.5 rounded-[2rem] border-2 flex items-center gap-2 cursor-pointer ${isActive ? 'bg-blue-500 text-black border-transparent shadow-[0_10px_20px_rgba(0,0,0,0.15)]' : 'bg-white text-blue-700 border-blue-500/20 hover:border-blue-500 hover:bg-blue-500 hover:text-black shadow-sm'}`}>
                                                <span>{item.label}</span>
                                                <ChevronDown className="w-3 h-3 ml-1 transition-transform group-hover/books:rotate-180" />
                                                <span className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-black' : 'bg-blue-700'}`} />
                                            </Link>
                                            
                                            <div className="absolute top-full left-1/2 -translate-x-1/2 mt-4 w-48 bg-white shadow-2xl shadow-black/10 rounded-2xl border border-blue-100 opacity-0 invisible group-hover/books:opacity-100 group-hover/books:visible group-hover/books:translate-y-0 translate-y-2 transition-all duration-300 z-50 flex flex-col overflow-hidden">
                                                <Link href="/books" className="px-4 py-3 text-sm font-bold text-gray-700 hover:text-blue-600 hover:bg-blue-50 transition-colors border-b border-blue-50 flex items-center gap-2">
                                                    <Book className="w-4 h-4" />
                                                    {locale === 'ar' ? 'جديد' : locale === 'en' ? 'New Books' : 'Livres Neufs'}
                                                </Link>
                                                <Link href="/books?usedOnly=true" className="px-4 py-3 text-sm font-bold text-gray-700 hover:text-blue-600 hover:bg-blue-50 transition-colors flex items-center gap-2">
                                                    <Recycle className="w-4 h-4" />
                                                    {locale === 'ar' ? 'مستعمل' : locale === 'en' ? 'Used Books' : 'Livres Occasion'}
                                                </Link>
                                            </div>
                                        </div>
                                    )
                                }

                                return (
                                    <Link
                                        key={item.href}
                                        href={item.href}
                                        className={`font-black text-[13px] rtl:text-[15px] uppercase tracking-widest rtl:tracking-normal transition-colors relative group flex items-center gap-1.5 px-3 py-2 -mx-3 rounded-lg ${isActive ? 'text-black' : 'text-gray-900 hover:text-black hover:bg-gray-50'}`}
                                    >
                                        {getIconForUrl(item.href, "w-4 h-4")}
                                        <span>{item.label}</span>
                                        {!isActive && (
                                            <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-0 h-0.5 bg-black group-hover:w-4 transition-all duration-300" />
                                        )}
                                    </Link>
                                )
                            })}
                            {features.seller === true && !user && (
                                <Link 
                                    href="/devenir-vendeur" 
                                    className="hidden xl:inline-flex bg-gradient-to-r from-[#FFDC50] to-yellow-400 text-black px-5 py-2 rounded-full text-[13px] rtl:text-[15px] font-black tracking-widest rtl:tracking-normal uppercase hover:scale-105 active:scale-95 shadow-[0_4px_14px_rgba(255,220,80,0.4)] hover:shadow-[0_6px_20px_rgba(255,220,80,0.6)] transition-all duration-300 relative overflow-hidden group items-center"
                                >
                                    <span className="relative z-10">{locale === 'ar' ? 'كن بائعاً' : locale === 'en' ? 'Become a seller' : 'Devenir vendeur'}</span>
                                    <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-out z-0"></div>
                                </Link>
                            )}
                        </nav>

                        {/* Actions */}
                        <div className="flex items-center gap-4 shrink-0">
                            <div className="hidden md:block">
                                <LanguageSwitcher />
                            </div>

                            {/* Desktop Only Actions */}
                            <div className="hidden md:flex items-center gap-4">
                                {notificationDropdown}
                                <button onClick={openCart} className="relative group" aria-label="Ouvrir le panier">
                                    <div className={`w-10 h-10 border-2 border-transparent group-hover:border-black rounded-full flex items-center justify-center transition-all duration-300 ${isCartAnimating ? 'scale-110 -rotate-12 bg-blue-50' : 'animate-cart-vibrate'}`}>
                                        <ShoppingCart className={`w-6 h-6 transition-colors ${isCartAnimating ? 'text-blue-600' : 'text-gray-900'}`} />
                                        {mounted && totalItems > 0 && (
                                            <span className={`absolute -top-0.5 -right-0.5 text-white text-[9px] font-black rounded-full w-4 h-4 flex items-center justify-center transition-all duration-300 ${isCartAnimating ? 'scale-125 bg-blue-600' : 'bg-black'}`}>
                                                {totalItems}
                                            </span>
                                        )}
                                    </div>
                                </button>
                                <UserDropdown user={user} features={features} />
                                <button
                                    onClick={openMobileMenu}
                                    className="w-10 h-10 border-2 border-transparent hover:bg-gray-50 rounded-full flex 2xl:hidden items-center justify-center transition-all ml-2 rtl:ml-0 rtl:mr-2"
                                    aria-label="Menu principal"
                                >
                                    <Menu className="w-6 h-6 text-gray-900" />
                                </button>
                            </div>

                            {/* Mobile Actions: Language + Cart + Login + Search */}
                            <div className="flex md:hidden items-center gap-1.5 sm:gap-2">
                                <LanguageSwitcher />
                                <button onClick={openCart} className="relative group p-1" aria-label="Ouvrir le panier">
                                    <div className={`w-9 h-9 border-2 border-transparent hover:border-black rounded-full flex items-center justify-center transition-all duration-300 ${isCartAnimating ? 'scale-110 -rotate-12 bg-blue-50' : 'animate-cart-vibrate'}`}>
                                        <ShoppingCart className={`w-5 h-5 transition-colors ${isCartAnimating ? 'text-blue-600' : 'text-gray-900'}`} />
                                        {mounted && totalItems > 0 && (
                                            <span className={`absolute -top-0.5 -right-0.5 text-white text-[9px] font-black rounded-full w-4 h-4 flex items-center justify-center transition-all duration-300 ${isCartAnimating ? 'scale-125 bg-blue-600' : 'bg-black'}`}>
                                                {totalItems}
                                            </span>
                                        )}
                                    </div>
                                </button>
                                <div className="scale-90 origin-right rtl:origin-left">
                                    <UserDropdown user={user} features={features} />
                                </div>
                                {showSearch && (
                                    <button
                                        onClick={() => setMobileSearchOpen(!mobileSearchOpen)}
                                        aria-label="Recherche mobile"
                                        className="w-10 h-10 flex items-center justify-center hover:bg-gray-50 rounded-full transition-colors"
                                    >
                                        {mobileSearchOpen ? (
                                            <X className="w-6 h-6 text-black" />
                                        ) : (
                                            <Search className="w-6 h-6 text-black" />
                                        )}
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                </div>


            </header>

            {/* Global Menu Drawer (Mobile & Desktop) */}
            {isMobileMenuOpen && (
                <div
                    className="fixed inset-0 bg-black/50 z-[140] transition-opacity"
                    onClick={closeMobileMenu}
                />
            )}
            <div
                onTouchStart={handleMenuTouchStart}
                onTouchEnd={handleMenuTouchEnd}
                className={`fixed inset-y-0 right-0 rtl:right-auto rtl:left-0 w-[85vw] md:w-96 bg-white z-[150] flex flex-col transform transition-transform duration-300 ease-in-out shadow-2xl touch-pan-y ${isMobileMenuOpen ? 'translate-x-0 pointer-events-auto' : 'translate-x-full rtl:-translate-x-full pointer-events-none'
                    }`}
                suppressHydrationWarning
            >
                <div className="flex-shrink-0 flex items-center justify-between p-4 border-b border-gray-100">
                    <span className={`text-2xl font-black tracking-tighter flex items-center cursor-pointer group ${locale === 'ar' ? 'font-[family-name:var(--font-cairo)]' : ''}`}>
                        {(locale === 'ar' ? ['ر', 'و', 'ا', 'ية'] : 'riwaya'.split('')).map((char, i) => (
                            <span key={i} className="inline-block animate-bounce" style={{ animationDelay: `${i * 100}ms` }}>
                                {char}
                            </span>
                        ))}
                        <span className="text-[#10b981] inline-block animate-bounce" style={{ animationDelay: `${(locale === 'ar' ? 4 : 6) * 100}ms` }}>.</span>
                        <span className="ml-1 rtl:ml-0 rtl:mr-1 inline-block animate-bounce" style={{ animationDelay: `${(locale === 'ar' ? 5 : 7) * 100}ms` }}>🇲🇦</span>
                    </span>
                    <div className="flex items-center gap-2">
                        <LanguageSwitcher />
                        <button
                            onClick={closeMobileMenu}
                            aria-label="Fermer le menu"
                            className="w-10 h-10 flex items-center justify-center bg-gray-50 rounded-full"
                        >
                            <X className="w-6 h-6 text-black" />
                        </button>
                    </div>
                </div>
                <div className="flex-1 overflow-y-auto pb-24 overscroll-contain">
                    {mounted && isMobileMenuOpen && (
                    <nav className="flex flex-col space-y-3 p-4" suppressHydrationWarning>
                        {/* Mobile Actions First */}
                        <div className="pb-4 mb-2 border-b border-gray-100">
                            <div className="flex items-center justify-around gap-4">
                                {notificationDropdown && (
                                    <div className="flex flex-col items-center gap-1">
                                        {notificationDropdown}
                                    </div>
                                )}
                                <div className="flex flex-col items-center gap-1">
                                    <UserDropdown user={user} features={features} />
                                </div>
                            </div>
                        </div>

                        {/* Navigation Links */}
                        {finalNavItems.map((item: any) => {
                            if (item.isCategoryMenu) {
                                return (
                                    <details key="categories-mobile" className="group/mobile-cat">
                                        <summary className="flex items-center justify-between px-5 py-4 rounded-[1.5rem] bg-gray-50 text-gray-900 font-bold text-sm cursor-pointer list-none hover:bg-gray-100 transition-colors">
                                            <div className="flex items-center gap-2">
                                                <LayoutGrid className="w-5 h-5" />
                                                <span className="uppercase tracking-widest rtl:tracking-normal text-[11px] rtl:text-sm font-black">{item.label}</span>
                                            </div>
                                            <ChevronDown className="w-5 h-5 transition-transform group-open/mobile-cat:rotate-180" />
                                        </summary>
                                        <div className="mt-2 pl-4 pr-2 space-y-2">
                                            {seoCollections.length > 0 ? seoCollections.map(collection => (
                                                <Link
                                                    key={collection.id}
                                                    href={`/collection/${collection.slug}`}
                                                    className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-bold text-gray-700 transition-colors hover:bg-blue-50 hover:text-blue-700"
                                                    onClick={() => setMobileMenuOpen(false)}
                                                >
                                                    <span className="h-2 w-2 flex-none rounded-full bg-blue-400" />
                                                    <span>{collection.h1 || collection.title}</span>
                                                </Link>
                                            )) : megaMenu.map((mainCatItem: any) => {
                                                const mainCat = mainCatItem.label;
                                                const subCats = mainCatItem.children || [];
                                                return (
                                                    <details key={mainCatItem.id} className="group/mobile-sub">
                                                        <summary className="flex items-center justify-between px-4 py-3 rounded-xl text-sm font-bold text-gray-700 hover:bg-gray-50 cursor-pointer list-none">
                                                            {tCat.has(mainCat as any) ? tCat(mainCat as any) : mainCat}
                                                            {subCats.length > 0 && <ChevronDown className="w-4 h-4 transition-transform group-open/mobile-sub:rotate-180" />}
                                                        </summary>
                                                        {subCats.length > 0 && (
                                                            <div className="mt-1 pl-4 rtl:pl-0 rtl:pr-4 space-y-1">
                                                                {subCats.map((sub: any) => (
                                                                    <Link key={sub.id} href={sub.url} className="block px-4 py-2.5 text-sm text-gray-600 hover:text-black hover:bg-gray-50 rounded-lg transition-colors" onClick={() => setMobileMenuOpen(false)}>
                                                                        {tCat.has(sub.label as any) ? tCat(sub.label as any) : sub.label}
                                                                    </Link>
                                                                ))}
                                                            </div>
                                                        )}
                                                    </details>
                                                )
                                            })}
                                        </div>
                                    </details>
                                )
                            }

                            const isSpecial = item.href.includes('/mon-enfant') || item.href.includes('/cle-usb') || item.isJournal || item.href.includes('/deposer-liste')
                            const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href))

                            const isKids = item.href.includes('/mon-enfant')
                            const isDigital = item.href.includes('/livres-numeriques')
                            const isJournal = item.isJournal
                            const isDeposer = item.href.includes('/deposer-liste')

                            const vibrantBg = isKids ? 'bg-pink-50' : isDigital ? 'bg-amber-50' : isJournal ? 'bg-[#FDFBF7]' : isDeposer ? 'bg-green-50' : 'bg-blue-50'
                            const vibrantText = isKids ? 'text-pink-800' : isDigital ? 'text-amber-900' : isJournal ? 'text-black' : isDeposer ? 'text-emerald-800' : 'text-blue-800'
                            const vibrantActiveBg = isKids ? 'bg-pink-500' : isDigital ? 'bg-amber-400' : isJournal ? 'bg-black' : isDeposer ? 'bg-green-500' : 'bg-blue-500'
                            const vibrantActiveText = isJournal ? 'text-white' : 'text-white'

                            if (isKids) {
                                return (
                                    <details key={item.href} className="group/mobile-kids">
                                        <summary className={`px-5 py-4 rounded-[1.5rem] transition-colors font-bold text-sm min-h-[52px] flex items-center cursor-pointer list-none ${isActive
                                                ? `${vibrantActiveBg} ${vibrantActiveText} shadow-md`
                                                : `${vibrantBg} ${vibrantText} border-2 border-transparent hover:border-gray-200`
                                            }`}>
                                            <div className="flex justify-between items-center w-full">
                                                <span className="flex items-center gap-2 uppercase tracking-widest rtl:tracking-normal text-[11px] rtl:text-sm font-black">
                                                    {getIconForUrl(item.href, "w-5 h-5")}
                                                    <span>{item.label}</span>
                                                </span>
                                                <ChevronDown className="w-5 h-5 transition-transform group-open/mobile-kids:rotate-180" />
                                            </div>
                                        </summary>
                                        <div className="mt-2 pl-4 pr-2 space-y-2">
                                            <Link href="/mon-enfant" className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold text-gray-700 hover:text-pink-600 hover:bg-pink-50 transition-colors" onClick={() => setMobileMenuOpen(false)}>
                                                <Baby className="w-4 h-4" />
                                                {locale === 'ar' ? 'كتب' : locale === 'en' ? 'Books' : 'Livres'}
                                            </Link>
                                            <Link href="/jeux-societe" className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold text-gray-700 hover:text-pink-600 hover:bg-pink-50 transition-colors" onClick={() => setMobileMenuOpen(false)}>
                                                <Gamepad2 className="w-4 h-4" />
                                                {locale === 'ar' ? 'ألعاب الطاولة' : locale === 'en' ? 'Board Games' : 'Jeux de Société'}
                                            </Link>
                                        </div>
                                    </details>
                                )
                            }

                            if (item.href === '/books') {
                                return (
                                    <details key={item.href} className="group/mobile-books">
                                        <summary className={`px-5 py-4 rounded-[1.5rem] transition-colors font-bold text-sm min-h-[52px] flex items-center cursor-pointer list-none ${isActive ? 'text-black bg-gray-50 border-2 border-transparent' : 'text-gray-900 hover:bg-gray-50 border-2 border-transparent'}`}>
                                            <div className="flex justify-between items-center w-full">
                                                <span className="flex items-center gap-2 uppercase tracking-widest rtl:tracking-normal text-[11px] rtl:text-sm font-black">
                                                    {getIconForUrl(item.href, "w-5 h-5")}
                                                    <span>{item.label}</span>
                                                </span>
                                                <ChevronDown className="w-5 h-5 transition-transform group-open/mobile-books:rotate-180" />
                                            </div>
                                        </summary>
                                        <div className="mt-2 pl-4 pr-2 space-y-2">
                                            <Link href="/books" className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold text-gray-700 hover:text-blue-600 hover:bg-blue-50 transition-colors" onClick={() => setMobileMenuOpen(false)}>
                                                <Book className="w-4 h-4" />
                                                {locale === 'ar' ? 'جديد' : locale === 'en' ? 'New Books' : 'Livres Neufs'}
                                            </Link>
                                            <Link href="/books?usedOnly=true" className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold text-gray-700 hover:text-green-600 hover:bg-green-50 transition-colors" onClick={() => setMobileMenuOpen(false)}>
                                                <Recycle className="w-4 h-4" />
                                                {locale === 'ar' ? 'مستعمل' : locale === 'en' ? 'Used Books' : 'Livres Occasion'}
                                            </Link>
                                        </div>
                                    </details>
                                )
                            }

                            return (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    className={`px-5 py-4 rounded-[1.5rem] transition-colors font-bold text-sm min-h-[52px] flex items-center ${isSpecial
                                            ? isActive
                                                ? `${vibrantActiveBg} ${vibrantActiveText} shadow-md`
                                                : `${vibrantBg} ${vibrantText} border-2 border-transparent hover:border-gray-200`
                                            : isActive
                                                ? 'text-black bg-gray-50'
                                                : 'text-gray-900 hover:bg-gray-50'
                                        }`}
                                    onClick={closeMobileMenu}
                                >
                                    <div className="flex justify-between items-center w-full">
                                        <span className={`flex items-center gap-2 ${isSpecial ? 'uppercase tracking-widest rtl:tracking-normal text-[11px] rtl:text-sm font-black' : ''}`}>
                                            {getIconForUrl(item.href, "w-5 h-5")}
                                            <span>{item.label}</span>
                                            {isJournal && <span className="ml-2 inline-flex h-2 w-2 rounded-full bg-red-500 animate-pulse" />}
                                        </span>
                                        {isSpecial && <span className={`w-2 h-2 rounded-full ${isActive ? 'bg-white' : vibrantActiveBg}`} />}
                                    </div>
                                </Link>
                            )
                        })}
                    </nav>
                    )}
                </div>
            </div>

            {isCartOpen && (
                <CartDrawer
                    isOpen
                    onClose={closeCart}
                    is3For4Active={features.threeForFour === true}
                />
            )}

            {/* Mobile Bottom Navigation */}
            <MobileBottomNav />

            {/* Spacer pour compenser le header fixe (h-20 = 80px) */}
            <div className="h-20" />
            {/* Barre de recherche - hors du header fixe, défile avec la page */}
            {showSearch && (
                    <div className={`${mobileSearchOpen ? 'block' : 'hidden'} md:block py-3 bg-[#FDFBF7] shadow-sm`} suppressHydrationWarning>
                        <div className="w-full px-4 sm:px-6 lg:px-8 xl:px-12">
                            <div className="max-w-3xl mx-auto">
                                <PredictiveSearch />
                            </div>
                        </div>
                    </div>
                )}
        </>
    )
}
