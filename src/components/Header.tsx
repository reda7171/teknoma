'use client'

import { Link, usePathname } from '@/i18n/routing'
import {
    BookOpen, ShoppingCart, Search, Menu, X, User,
    Home, Book, Users, Package, FileText, Newspaper,
    Monitor, Baby, Usb, UsersRound, ChevronDown, ChevronRight, LayoutGrid, Heart, Check
} from 'lucide-react'
import Image from 'next/image'
import { useState, useEffect } from 'react'
import CartDrawer from './CartDrawer'
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
    }
    megaMenu?: any[]
    siteLogo?: string | null
}

export default function Header({ user, notificationDropdown, navigation, megaMenu = [], features = {}, siteLogo = null }: HeaderProps = { user: null }) {
    const getIconForUrl = (url: string, className = "w-4 h-4") => {
        if (url === '/') return <Home className={className} />
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
    const locale = useLocale()
    const t = useTranslations('Navigation')
    const tCat = useTranslations('Categories')
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
    const [mobileSearchOpen, setMobileSearchOpen] = useState(false)
    const { isCartOpen, openCart, closeCart } = useUIStore()
    const totalItems = useCartStore((state) => state.items.reduce((total, item) => total + item.quantity, 0))
    const [mounted, setMounted] = useState(false)

    // Éviter les problèmes d'hydratation
    useEffect(() => {
        setMounted(true)
    }, [])

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
        ...(features.packs === true ? [{ href: '/packs', label: t('Packs') }] : []),
        ...(features.deposerListe === true ? [{ href: '/deposer-liste', label: t('DeposerListe') }] : []),
        { href: '/blog', label: t('Journal'), isJournal: true },
        ...(features.digital === true ? [{ href: '/livres-numeriques', label: t('Digital') }] : []),
        ...(features.kids === true ? [{ href: '/mon-enfant', label: t('Kids') }] : []),
        ...(features.usb === true ? [{ href: '/cle-usb', label: t('UsbKey') }] : []),
        ...(features.exchange === true ? [{ href: '/community/market', label: t('Community') }] : []),
        { href: '/sell-book', label: locale === 'ar' ? 'بيع كتاب' : locale === 'en' ? 'Sell' : 'Vendre' },
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

    if (features.deposerListe === true && !finalNavItems.some((i: any) => i.href.includes('deposer-liste'))) {
        finalNavItems = [{ href: '/deposer-liste', label: t('DeposerListe'), isJournal: false }, ...finalNavItems]
    }

    // Toujours afficher le Journal si absent du menu personnalisé
    if (!finalNavItems.some((i: any) => i.href.includes('/blog') || i.isJournal)) {
        finalNavItems = [...finalNavItems, { href: '/blog', label: t('Journal'), isJournal: true }]
    }

    return (
        <>
            <header className="fixed top-0 left-0 right-0 z-50 bg-white shadow-sm">
                <div className="w-full px-4 sm:px-6 lg:px-8 xl:px-12">
                    <div className="flex items-center justify-between h-20">
                        {/* Logo - Dynamique ou Style Pixio */}
                        <Link href="/" className="flex items-center gap-2 group shrink-0 lg:ltr:mr-8 lg:rtl:ml-8 xl:ltr:mr-16 xl:rtl:ml-16" dir="ltr">
                            {siteLogo ? (
                                <div className="relative group-hover:scale-105 transition-transform duration-300">
                                    <Image
                                        src={siteLogo}
                                        alt="Riwaya Logo"
                                        width={200}
                                        height={64}
                                        className="h-8 w-auto object-contain"
                                        priority
                                    />
                                    {/* Effet premium : reflet luxury diagonal */}
                                    <span aria-hidden="true" style={{
                                        position: 'absolute',
                                        inset: 0,
                                        background: 'linear-gradient(115deg, transparent 20%, rgba(255,255,255,0.08) 35%, rgba(255,220,80,0.5) 45%, rgba(255,255,255,0.9) 50%, rgba(255,220,80,0.5) 55%, rgba(255,255,255,0.08) 65%, transparent 80%)',
                                        backgroundSize: '300% 100%',
                                        backgroundPosition: '-300% center',
                                        animation: 'logo-premium-shine 4s cubic-bezier(0.4,0,0.2,1) infinite',
                                        mixBlendMode: 'screen',
                                        borderRadius: '2px',
                                        pointerEvents: 'none',
                                    }} />
                                    <style>{`
                                    @keyframes logo-premium-shine {
                                        0%   { background-position: -300% center; opacity: 0; }
                                        10%  { opacity: 1; }
                                        35%  { background-position: 300% center; opacity: 0; }
                                        100% { background-position: 300% center; opacity: 0; }
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
                        <nav className="hidden lg:flex flex-1 justify-center items-center gap-4 xl:gap-8">
                            {/* Navigation Items - Only render client side after mounting */}
                            {mounted && finalNavItems.slice(0, 8).map((item: any) => {
                                const isActive = pathname === item.href || (item.href !== '/' && item.href !== '#categories' && pathname.startsWith(item.href))
                                const isSpecial = item.href.includes('/mon-enfant') || item.href.includes('/cle-usb') || item.href.includes('/livres-numeriques') || item.isJournal || item.href.includes('/deposer-liste')

                                if (item.isCategoryMenu) {
                                    return (
                                        <div key="categories" className="relative group/category">
                                            <button className={`font-black text-[13px] rtl:text-[15px] uppercase tracking-widest rtl:tracking-normal transition-colors relative flex items-center gap-1.5 ${isActive ? 'text-black' : 'text-gray-900 hover:text-black'}`}>
                                                <LayoutGrid className="w-4 h-4" />
                                                <span>{item.label}</span>
                                                <ChevronDown className="w-4 h-4 transition-transform group-hover/category:rotate-180" />
                                            </button>
                                            <div className="absolute top-full left-1/2 rtl:left-auto rtl:right-1/2 -translate-x-1/2 rtl:translate-x-1/2 mt-4 w-[850px] bg-white shadow-2xl shadow-black/10 rounded-2xl border border-gray-100 opacity-0 invisible group-hover/category:opacity-100 group-hover/category:visible group-hover/category:translate-y-0 translate-y-2 transition-all duration-300 z-50 flex min-h-[450px]">
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
                                                                                <Link href={mainCatItem.url} className="text-[11px] font-bold uppercase tracking-wider text-gray-400 hover:text-black transition-colors bg-white px-3 py-1.5 rounded-full shadow-sm border border-gray-100">
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
                                    const vibrantText = isKids ? 'text-pink-500' : isDigital ? 'text-amber-500' : isJournal ? 'text-black' : isDeposer ? 'text-green-500' : 'text-blue-500'
                                    const vibrantBorder = isKids ? 'border-pink-500/20 hover:border-pink-500' : isDigital ? 'border-amber-400/20 hover:border-amber-400' : isJournal ? 'border-gray-200 hover:border-black' : isDeposer ? 'border-green-500/20 hover:border-green-500' : 'border-blue-500/20 hover:border-blue-500'

                                    const finalBg = isJournal ? 'bg-[#FDFBF7]' : vibrantBg
                                    const finalText = isJournal ? 'text-black' : vibrantText

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

                                return (
                                    <Link
                                        key={item.href}
                                        href={item.href}
                                        className={`font-black text-[13px] rtl:text-[15px] uppercase tracking-widest rtl:tracking-normal transition-colors relative group flex items-center gap-1.5 ${isActive ? 'text-black border-b-2 border-black pb-1' : 'text-gray-900 hover:text-black'}`}
                                    >
                                        {getIconForUrl(item.href, "w-4 h-4")}
                                        <span>{item.label}</span>
                                        {!isActive && (
                                            <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-0 h-0.5 bg-black group-hover:w-4 transition-all duration-300" />
                                        )}
                                    </Link>
                                )
                            })}
                        </nav>

                        {/* Actions */}
                        <div className="flex items-center gap-4 shrink-0">
                            <div className="hidden lg:block">
                                <LanguageSwitcher />
                            </div>

                            {/* Desktop Only Actions */}
                            <div className="hidden md:flex items-center gap-4">
                                {mounted && notificationDropdown}
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
                                {mounted && <UserDropdown user={user} features={features} />}
                                <button
                                    onClick={() => setMobileMenuOpen(true)}
                                    className="w-10 h-10 border-2 border-transparent hover:bg-gray-50 rounded-full flex items-center justify-center transition-all ml-2 rtl:ml-0 rtl:mr-2"
                                    aria-label="Menu principal"
                                >
                                    <Menu className="w-6 h-6 text-gray-900" />
                                </button>
                            </div>

                            {/* Mobile Actions: Login + Search */}
                            <div className="flex md:hidden items-center gap-2">
                                {mounted && (
                                    <div className="scale-90 origin-right rtl:origin-left">
                                        <UserDropdown user={user} features={features} />
                                    </div>
                                )}
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
                            </div>
                        </div>
                    </div>
                </div>


            </header>

            {/* Global Menu Drawer (Mobile & Desktop) */}
            {mobileMenuOpen && (
                <div
                    className="fixed inset-0 bg-black/50 z-[140] transition-opacity"
                    onClick={() => setMobileMenuOpen(false)}
                />
            )}
            <div
                className={`fixed inset-y-0 right-0 rtl:right-auto rtl:left-0 w-full md:w-96 bg-white z-[150] transform transition-transform duration-300 ease-in-out shadow-2xl ${mobileMenuOpen ? 'translate-x-0' : 'translate-x-full rtl:-translate-x-full'
                    }`}
                suppressHydrationWarning
            >
                <div className="flex items-center justify-between p-4 border-b border-gray-100">
                    <span className={`text-2xl font-black tracking-tighter flex items-center cursor-pointer group ${locale === 'ar' ? 'font-[family-name:var(--font-cairo)]' : ''}`}>
                        {(locale === 'ar' ? ['ر', 'و', 'ا', 'ية'] : 'riwaya'.split('')).map((char, i) => (
                            <span key={i} className="inline-block animate-bounce" style={{ animationDelay: `${i * 100}ms` }}>
                                {char}
                            </span>
                        ))}
                        <span className="text-[#10b981] inline-block animate-bounce" style={{ animationDelay: `${(locale === 'ar' ? 4 : 6) * 100}ms` }}>.</span>
                        <span className="ml-1 rtl:ml-0 rtl:mr-1 inline-block animate-bounce" style={{ animationDelay: `${(locale === 'ar' ? 5 : 7) * 100}ms` }}>🇲🇦</span>
                    </span>
                    <button
                        onClick={() => setMobileMenuOpen(false)}
                        aria-label="Fermer le menu"
                        className="w-10 h-10 flex items-center justify-center bg-gray-50 rounded-full"
                    >
                        <X className="w-6 h-6 text-black" />
                    </button>
                </div>
                <div className="overflow-y-auto h-[calc(100vh-73px)] pb-24">
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
                                            {megaMenu.map((mainCatItem: any) => {
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
                            const vibrantText = isKids ? 'text-pink-600' : isDigital ? 'text-amber-600' : isJournal ? 'text-black' : isDeposer ? 'text-green-600' : 'text-blue-600'
                            const vibrantActiveBg = isKids ? 'bg-pink-500' : isDigital ? 'bg-amber-400' : isJournal ? 'bg-black' : isDeposer ? 'bg-green-500' : 'bg-blue-500'
                            const vibrantActiveText = isJournal ? 'text-white' : 'text-white'

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
                                    onClick={() => setMobileMenuOpen(false)}
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
                        <div className="py-4">
                            <LanguageSwitcher />
                        </div>
                    </nav>
                </div>
            </div>

            {/* Cart Drawer */}
            <CartDrawer isOpen={isCartOpen} onClose={closeCart} />

            {/* Mobile Bottom Navigation */}
            <MobileBottomNav onMenuClick={() => setMobileMenuOpen(true)} />

            {/* Spacer pour compenser le header fixe (h-20 = 80px) */}
            <div className="h-20" />
            {/* Barre de recherche - hors du header fixe, défile avec la page */}
            {(!pathname.includes('/mon-enfant') &&
                !pathname.includes('/cle-usb') &&
                !pathname.includes('/community/login') &&
                !pathname.includes('/community/register') &&
                !pathname.includes('/community/profile/edit') &&
                !pathname.includes('/cart') &&
                !pathname.includes('/checkout')) && (
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
