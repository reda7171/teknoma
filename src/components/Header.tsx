'use client'

import { Link, usePathname } from '@/i18n/routing'
import { 
    BookOpen, ShoppingCart, Search, Menu, X, User,
    Home, Book, Users, Package, FileText, Newspaper, 
    Monitor, Baby, Usb, UsersRound
} from 'lucide-react'
import { useState, useEffect } from 'react'
import CartDrawer from './CartDrawer'
import { useCartStore } from '@/store/cart'
import PredictiveSearch from './PredictiveSearch'
import LanguageSwitcher from './LanguageSwitcher'
import { useTranslations } from 'next-intl'
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
    siteLogo?: string | null
}

export default function Header({ user, notificationDropdown, navigation, features = {}, siteLogo = null }: HeaderProps = { user: null }) {
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
    const t = useTranslations('Navigation')
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
            .map(item => ({ href: item.url, label: t(item.label as any), isJournal: item.url.includes('/blog') }))
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
                    <Link href="/" className="flex items-center gap-2 group shrink-0 lg:ltr:mr-32 lg:rtl:ml-32 xl:ltr:mr-48 xl:rtl:ml-48" dir="ltr">
                        {siteLogo ? (
                            <img 
                                src={siteLogo} 
                                alt="Riwaya Logo" 
                                className="h-8 w-auto object-contain transition-transform group-hover:scale-105"
                            />
                        ) : (
                            <>
                                <div className="w-8 h-8 bg-black rounded-lg flex items-center justify-center group-hover:rotate-12 transition-transform">
                                    <BookOpen className="w-5 h-5 text-white" />
                                </div>
                                <span className="text-2xl font-black text-black tracking-tighter">
                                    riwaya<span className="text-[#10b981]">.</span>
                                </span>
                            </>
                        )}
                    </Link>

                    {/* Desktop Navigation - Elegant & Clean */}
                    <nav className="hidden lg:flex items-center gap-6 xl:gap-10 min-w-max h-8">
                        {/* Navigation Items - Only render client side after mounting */}
                        {mounted && finalNavItems.slice(0, 6).map((item: any) => {
                            const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href))
                            const isSpecial = item.href.includes('/mon-enfant') || item.href.includes('/cle-usb') || item.href.includes('/livres-numeriques') || item.isJournal || item.href.includes('/deposer-liste')

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
                                        className={`font-black text-[11px] rtl:text-sm uppercase tracking-widest rtl:tracking-normal whitespace-nowrap shrink-0 transition-all px-5 py-2.5 rounded-[2rem] border-2 flex items-center gap-2 ${
                                            isActive 
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
                                <div className={`w-10 h-10 border-2 border-transparent group-hover:border-black rounded-full flex items-center justify-center transition-all duration-300 ${isCartAnimating ? 'scale-110 -rotate-12 bg-blue-50' : ''}`}>
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

                        {/* Mobile Menu Button -> Replaced by Search Icon on mobile */}
                        <button
                            onClick={() => setMobileSearchOpen(!mobileSearchOpen)}
                            aria-label="Recherche mobile"
                            className="md:hidden w-10 h-10 flex items-center justify-center hover:bg-gray-50 rounded-full transition-colors"
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



            {/* Global Menu Drawer (Mobile & Desktop) */}
            {mobileMenuOpen && (
                <div 
                    className="fixed inset-0 bg-black/50 z-[55] transition-opacity"
                    onClick={() => setMobileMenuOpen(false)}
                />
            )}
            <div 
                className={`fixed inset-y-0 right-0 rtl:right-auto rtl:left-0 w-full md:w-96 bg-white z-[60] transform transition-transform duration-300 ease-in-out shadow-2xl ${
                    mobileMenuOpen ? 'translate-x-0' : 'translate-x-full rtl:-translate-x-full'
                }`}
                suppressHydrationWarning
            >
                <div className="flex items-center justify-between p-4 border-b border-gray-100">
                    <span className="text-lg font-black tracking-tighter">riwaya<span className="text-[#10b981]">.</span></span>
                    <button 
                        onClick={() => setMobileMenuOpen(false)}
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
                                    className={`px-5 py-4 rounded-[1.5rem] transition-colors font-bold text-sm min-h-[52px] flex items-center ${
                                        isSpecial 
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
        </header>
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
