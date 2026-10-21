'use client'

import { Link, usePathname } from '@/i18n/routing'
import { 
    BookOpen, Search, Menu, X, Home, Book, Users, Package, FileText, Newspaper, 
    Monitor, Baby, Usb, UsersRound
} from 'lucide-react'
import Image from 'next/image'
import { useState, useEffect } from 'react'
import PredictiveSearch from '@/components/PredictiveSearch'
import LanguageSwitcher from '@/components/LanguageSwitcher'
import { useTranslations } from 'next-intl'

interface HeaderProps {
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

export default function BlogHeader({ navigation, features = {}, siteLogo = null }: HeaderProps) {
    const pathname = usePathname()
    const t = useTranslations('Navigation')
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
    const [mobileSearchOpen, setMobileSearchOpen] = useState(false)
    const [mounted, setMounted] = useState(false)

    useEffect(() => {
        setMounted(true)
    }, [])

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

    const defaultNavItems = [
        { href: '/', label: t('Home') },
        { href: '/books', label: t('Books') },
        { href: '/blog', label: t('Journal'), isJournal: true },
    ]

    const navItems = navigation && navigation.length > 0
        ? navigation
            .filter((item) => {
                const url = item.url.toLowerCase()
                const label = item.label.toLowerCase()

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
                isJournal: item.url.includes('/blog') 
            }))
        : defaultNavItems

    let finalNavItems = navItems
    if (!finalNavItems.some((i: any) => i.href.includes('/blog') || i.isJournal)) {
        finalNavItems = [...finalNavItems, { href: '/blog', label: t('Journal'), isJournal: true }]
    }

    return (
        <>
        <header className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-md shadow-sm border-b border-gray-100">
            <div className="w-full px-4 sm:px-6 lg:px-8 xl:px-12">
                <div className="flex items-center justify-between h-16 md:h-20">
                    
                    {/* Mobile: Menu on the left */}
                    <div className="flex items-center md:hidden w-1/3">
                        <button 
                            onClick={() => setMobileMenuOpen(true)}
                            className="w-10 h-10 -ml-2 rounded-full flex items-center justify-center transition-colors hover:bg-gray-50"
                            aria-label="Menu principal"
                        >
                            <Menu className="w-6 h-6 text-gray-900" />
                        </button>
                    </div>

                    {/* Logo - Center on mobile, Left on Desktop */}
                    <div className="flex justify-center md:justify-start w-1/3 md:w-auto shrink-0 md:ltr:mr-12 md:rtl:ml-12">
                        <Link href="/" className="flex items-center gap-2 group" dir="ltr">
                            {siteLogo ? (
                                <Image 
                                    src={siteLogo} 
                                    alt="Riwaya Logo"
                                    width={96}
                                    height={32}
                                    sizes="96px"
                                    quality={75}
                                    className="h-7 md:h-8 w-auto object-contain transition-transform group-hover:scale-105"
                                    priority
                                />
                            ) : (
                                <>
                                    <div className="w-7 h-7 md:w-8 md:h-8 bg-black rounded-lg flex items-center justify-center group-hover:rotate-12 transition-transform">
                                        <BookOpen className="w-4 h-4 md:w-5 md:h-5 text-white" />
                                    </div>
                                    <span className="text-xl md:text-2xl font-black text-black tracking-tighter">
                                        riwaya<span className="text-[#10b981]">.</span>
                                    </span>
                                </>
                            )}
                        </Link>
                    </div>

                    {/* Desktop Navigation */}
                    <nav className="hidden md:flex items-center gap-8 min-w-max">
                        {mounted && finalNavItems.slice(0, 6).map((item: any) => {
                            const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href))
                            return (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    className={`font-bold text-[13px] uppercase tracking-widest transition-colors relative group flex items-center gap-1.5 ${isActive ? 'text-black border-b-2 border-black pb-1' : 'text-gray-500 hover:text-black'}`}
                                >
                                    <span>{item.label}</span>
                                </Link>
                            )
                        })}
                    </nav>

                    {/* Right Actions: Lang & Search */}
                    <div className="flex items-center justify-end w-auto gap-2 md:gap-4 shrink-0">
                        <LanguageSwitcher />
                        <button
                            onClick={() => setMobileSearchOpen(!mobileSearchOpen)}
                            aria-label="Recherche"
                            className="w-10 h-10 -mr-2 md:mr-0 flex items-center justify-center hover:bg-gray-50 rounded-full transition-colors"
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

            {/* Mobile Menu Drawer */}
            {mobileMenuOpen && (
                <div 
                    className="fixed inset-0 bg-black/50 z-[55] transition-opacity md:hidden"
                    onClick={() => setMobileMenuOpen(false)}
                />
            )}
            <div 
                className={`fixed inset-y-0 right-0 rtl:right-auto rtl:left-0 w-[80%] max-w-sm bg-white z-[60] transform transition-transform duration-300 ease-in-out shadow-2xl md:hidden ${
                    mobileMenuOpen ? 'translate-x-0' : 'translate-x-full rtl:-translate-x-full'
                }`}
            >
                <div className="flex items-center justify-between p-4 border-b border-gray-100">
                    <span className="text-lg font-black tracking-tighter">riwaya<span className="text-[#10b981]">.</span></span>
                    <div className="flex items-center gap-2">
                        <LanguageSwitcher />
                        <button 
                            onClick={() => setMobileMenuOpen(false)}
                            className="w-10 h-10 flex items-center justify-center bg-gray-50 rounded-full"
                        >
                            <X className="w-6 h-6 text-black" />
                        </button>
                    </div>
                </div>
                <div className="overflow-y-auto h-[calc(100vh-73px)] pb-24">
                    <nav className="flex flex-col space-y-2 p-4">
                        {finalNavItems.map((item: any) => {
                            const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href))
                            return (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    className={`px-5 py-3.5 rounded-2xl transition-colors font-bold text-sm flex items-center ${
                                        isActive
                                            ? 'text-black bg-gray-50'
                                            : 'text-gray-600 hover:bg-gray-50'
                                    }`}
                                    onClick={() => setMobileMenuOpen(false)}
                                >
                                    <span className="flex items-center gap-3">
                                        {getIconForUrl(item.href, "w-5 h-5")}
                                        <span>{item.label}</span>
                                    </span>
                                </Link>
                            )
                        })}
                    </nav>
                </div>
            </div>
        </header>

        {/* Spacer */}
        <div className="h-16 md:h-20" />

        {/* Predictive Search Bar */}
        {mobileSearchOpen && (
            <div className="py-3 bg-[#FDFBF7] shadow-sm border-b border-gray-100">
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
