'use client'

import Link from 'next/link'
import { usePathname, useRouter, useParams } from 'next/navigation'
import { useState, useEffect, useMemo } from 'react'
import { logout, isAuthenticated, getAdminRole } from '@/lib/actions/auth'
import { getSettingsByCategory } from '@/lib/actions/site-settings'
import {
    LayoutDashboard,
    BookOpen,
    Package,
    ShoppingCart,
    ShoppingBag,
    Users,
    LogOut,
    Repeat,
    AlertCircle,
    ShieldCheck,
    Ticket,
    MessageSquare,
    BarChart3,
    GripVertical,
    FileText,
    Banknote,
    TrendingUp,
    Settings,
    Crown,
    Gift,
    Share2,
    Store,
    Download,
    Monitor,
    ExternalLink,
    Menu,
    X,
    Languages,
    Search,
    Truck,
    Wrench,
    Sparkles,
    MessageCircle,
    Bookmark,
    Usb,
    Library,
    Database,
    ChevronDown,
    PanelLeftClose,
    PanelLeftOpen,
    Globe,
    Headset,
    Calendar
} from 'lucide-react'

import OrderNotifications from '@/components/admin/OrderNotifications'
import LanguageSwitcher from '@/components/LanguageSwitcher'

export default function AdminLayout({
    children,
}: {
    children: React.ReactNode
}) {
    const { locale } = useParams()
    const lang = typeof locale === 'string' ? locale : 'fr'
    const [featureSettings, setFeatureSettings] = useState<Record<string, string>>({})
    const [sidebarOpen, setSidebarOpen] = useState(false)
    const [sidebarCollapsed, setSidebarCollapsed] = useState(true) // Collapsed by default
    const [userRole, setUserRole] = useState<string | null>(null)
    const [expandedMenus, setExpandedMenus] = useState<Record<string, boolean>>({
        'Configuration': false 
    })

    useEffect(() => {
        getSettingsByCategory('features')
            .then(setFeatureSettings)
            .catch(console.error)
            
        getAdminRole().then(setUserRole).catch(console.error)
    }, [])

    const toggleMenu = (name: string) => {
        if (sidebarCollapsed) {
            setSidebarCollapsed(false)
        }
        setExpandedMenus(prev => ({
            ...prev,
            [name]: !prev[name]
        }))
    }

    const features = useMemo(() => ({
        seller: featureSettings['feature_seller'] !== 'false',
        exchange: false,
        usb: false,
        kids: false,
        readingList: featureSettings['feature_reading_list'] !== 'false',
        digital: featureSettings['feature_digital_books'] !== 'false',
        packs: featureSettings['feature_packs'] !== 'false',
        pos: featureSettings['feature_pos'] !== 'false',
    }), [featureSettings])

    const allNavigation = useMemo(() => [
        {
            name: 'Tableau de Bord',
            href: `/${lang}/admin`,
            icon: LayoutDashboard,
            children: [
                { name: 'Vue Globale', href: `/${lang}/admin`, icon: LayoutDashboard },
                { name: 'Planning & Tâches', href: `/${lang}/admin/planning`, icon: Calendar },
            ]
        },
        {
            name: 'Catalogue',
            href: `/${lang}/admin/books`,
            icon: BookOpen,
            children: [
                { name: 'Livres Physiques', href: `/${lang}/admin/books`, icon: BookOpen },
                { name: 'Livres Numériques', href: `/${lang}/admin/digital-products`, icon: Download, featureKey: 'feature_digital_books' },
                { name: 'Packs & Lots', href: `/${lang}/admin/packs`, icon: Package, featureKey: 'feature_packs' },
                { name: 'Auteurs & Éditeurs', href: `/${lang}/admin/authors`, icon: Users },
                { name: 'Marque-pages', href: `/${lang}/admin/accessories/bookmarks`, icon: Bookmark },
                { name: 'Bibliothèques', href: `/${lang}/admin/accessories/library`, icon: Library },
                { name: 'Clés USB', href: `/${lang}/admin/accessories/usb`, icon: Usb },
                { name: 'Produits enfants', href: `/${lang}/admin/accessories/kids`, icon: Sparkles },
            ]
        },
        {
            name: 'Ventes & Opérations',
            href: `/${lang}/admin/orders`,
            icon: ShoppingCart,
            children: [
                { name: 'Commandes Web', href: `/${lang}/admin/orders`, icon: ShoppingCart },
                { name: 'Commandes Jumia', href: `/${lang}/admin/jumia-orders`, icon: ShoppingBag },
                { name: 'Point de Vente (POS)', href: `/${lang}/admin/pos`, icon: Monitor, featureKey: 'feature_pos' },
                { name: 'Centre d\'Appels', href: `/${lang}/admin/call-center`, icon: Headset },
                { name: 'Réservations', href: `/${lang}/admin/reservations`, icon: Bookmark },
                { name: 'Échanges', href: `/${lang}/admin/exchanges`, icon: Repeat },
                { name: 'Achats Fournisseurs', href: `/${lang}/admin/supplier-order`, icon: ShoppingBag },
            ]
        },
        {
            name: 'CRM & Utilisateurs',
            href: `/${lang}/admin/customers`,
            icon: Users,
            children: [
                { name: 'Clients', href: `/${lang}/admin/customers`, icon: Users },
                { name: 'Vendeurs / Partenaires', href: `/${lang}/admin/vendeurs`, icon: Store, featureKey: 'feature_seller' },
                { name: 'Équipe / Staff', href: `/${lang}/admin/users`, icon: ShieldCheck },
            ]
        },
        {
            name: 'Communauté & Avis',
            href: `/${lang}/admin/reviews`,
            icon: MessageSquare,
            children: [
                { name: 'Avis Clients', href: `/${lang}/admin/reviews`, icon: MessageSquare },
                { name: 'Commentaires', href: `/${lang}/admin/comments`, icon: MessageCircle },
                { name: 'Demandes de Livres', href: `/${lang}/admin/requested-books`, icon: Search },
                { name: 'Signalements', href: `/${lang}/admin/reports`, icon: AlertCircle },
                { name: 'Blog & Actualités', href: `/${lang}/admin/posts`, icon: FileText },
            ]
        },
        {
            name: 'Marketing & Promos',
            href: `/${lang}/admin/marketing`,
            icon: Sparkles,
            children: [
                { name: 'Campagnes & Offres', href: `/${lang}/admin/marketing`, icon: Sparkles },
                { name: 'Codes Promo', href: `/${lang}/admin/coupons`, icon: Ticket },
                { name: 'Affiliation', href: `/${lang}/admin/affiliates`, icon: Share2 },
                { name: 'Cartes Cadeaux', href: `/${lang}/admin/gifts`, icon: Gift },
            ]
        },
        {
            name: 'Rapports & Analyse',
            href: `/${lang}/admin/analytics`,
            icon: BarChart3,
            children: [
                { name: 'Statistiques', href: `/${lang}/admin/analytics`, icon: BarChart3 },
                { name: 'Revenus & Finances', href: `/${lang}/admin/finance`, icon: Banknote },
                { name: 'Trafic & Acquisition', href: `/${lang}/admin/traffic`, icon: TrendingUp },
            ]
        },
        {
            name: 'Système & Config',
            href: `/${lang}/admin/config`,
            icon: Settings,
            children: [
                { name: 'Paramètres Généraux', href: `/${lang}/admin/settings`, icon: Settings },
                { name: 'Navigation Site', href: `/${lang}/admin/menus`, icon: GripVertical },
                { name: 'Page d\'Accueil', href: `/${lang}/admin/config/homepage`, icon: LayoutDashboard },
                { name: 'Formulaires', href: `/${lang}/admin/config/form`, icon: Settings },
                { name: 'API Livraison', href: `/${lang}/admin/config/delivery`, icon: Truck },
                { name: 'Sociétés de Livraison', href: `/${lang}/admin/config/shipping-companies`, icon: Truck },
                { name: 'API & Intégrations', href: `/${lang}/admin/config/api`, icon: Sparkles },
                { name: 'Config Jumia', href: `/${lang}/admin/config/jumia`, icon: ShoppingBag },
                { name: 'Config n8n', href: `/${lang}/admin/config/n8n`, icon: Repeat },
                { name: 'Telegram Bot', href: `/${lang}/admin/config/telegram`, icon: MessageCircle },
                { name: 'Config POS', href: `/${lang}/admin/config/pos`, icon: Monitor, featureKey: 'feature_pos' },
                { name: 'Google Adsense', href: `/${lang}/admin/config/adsense`, icon: Banknote },
                { name: 'SEO', href: `/${lang}/admin/seo`, icon: Search },
                { name: 'GEO (IA)', href: `/${lang}/admin/geo`, icon: Globe },
                { name: 'Traductions', href: `/${lang}/admin/translations`, icon: Languages },
                { name: 'Audit Log', href: `/${lang}/admin/audit`, icon: ShieldCheck },
                { name: 'Base de données', href: `/${lang}/admin/database`, icon: Database },
            ]
        }
    ], [lang])

    const isFeatureEnabled = (key: string) => {
        // @ts-ignore
        return !!features[key.replace('feature_', '')]
    }

    const navigation = useMemo(() => {
        let filteredNav = allNavigation.map(item => ({
            ...item,
            // @ts-ignore
            children: item.children ? item.children.filter(child => !child.featureKey || isFeatureEnabled(child.featureKey)) : []
        })).filter(item =>
            // @ts-ignore
            !item.featureKey || isFeatureEnabled(item.featureKey)
        )

        if (userRole === 'CONFIRMATOR') {
            filteredNav = filteredNav.filter(item => item.name === 'Ventes & Opérations' || item.name === 'Tableau de Bord')
            filteredNav = filteredNav.map(item => {
                if (item.name === 'Ventes & Opérations') {
                    return {
                        ...item,
                        children: item.children.filter(child => child.name === 'Commandes Web')
                    }
                }
                return item
            })
        }
        
        return filteredNav
    }, [allNavigation, features, userRole])

    const pathname = usePathname()
    const router = useRouter()

    useEffect(() => {
        navigation.forEach(item => {
            if (item.children && item.children.some(child => pathname === child.href)) {
                setExpandedMenus(prev => {
                    if (prev[item.name]) return prev;
                    return { ...prev, [item.name]: true };
                })
                // Open sidebar if child is active to show it
                setSidebarCollapsed(false);
            }
        })
    }, [pathname, navigation])

    useEffect(() => {
        setSidebarOpen(false)

        if (!pathname?.endsWith('/admin/login')) {
            isAuthenticated().then(isAuth => {
                if (!isAuth) {
                    router.push(`/${lang}/admin/login`)
                }
            }).catch(console.error)
        }
    }, [pathname, lang, router])

    async function handleLogout() {
        await logout()
        router.push(`/${lang}/admin/login`)
        router.refresh()
    }

    const isLoginPage = pathname?.endsWith('/admin/login')

    if (isLoginPage) {
        return (
            <div className="min-h-screen bg-gray-50">
                <main>
                    {children}
                </main>
            </div>
        )
    }

    const renderSidebarContent = (isCollapsed: boolean) => (
        <div className="flex flex-col h-full overflow-hidden">
            {/* Logo & Toggle */}
            <div className={`flex items-center ${isCollapsed ? 'justify-center flex-col py-4 gap-4' : 'justify-between px-5 md:px-8'} h-16 md:h-20 shrink-0`}>
                <div className="flex items-center gap-3">
                    <div className="w-9 h-9 bg-black rounded-xl flex items-center justify-center shrink-0">
                        <span className="text-white text-lg font-black italic">R</span>
                    </div>
                    {!isCollapsed && <h1 className="text-lg font-black text-slate-900 tracking-tight">Riwaya<span className="text-blue-600">.</span></h1>}
                </div>
                
                <div className="flex items-center gap-2">
                    {!isCollapsed && <OrderNotifications />}
                    
                    {/* Bouton fermer sur mobile */}
                    <button
                        onClick={() => setSidebarOpen(false)}
                        className="md:hidden p-1.5 rounded-lg text-slate-500 hover:bg-slate-100"
                    >
                        <X className="w-5 h-5" />
                    </button>

                    {/* Toggle Desktop */}
                    <button
                        onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                        className={`hidden md:flex p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 transition-colors ${isCollapsed ? 'mt-2' : ''}`}
                        title={isCollapsed ? "Agrandir" : "Réduire"}
                    >
                        {isCollapsed ? <PanelLeftOpen className="w-5 h-5" /> : <PanelLeftClose className="w-5 h-5" />}
                    </button>
                </div>
            </div>

            {/* Navigation */}
            <nav className={`flex-1 ${isCollapsed ? 'px-2' : 'px-3 md:px-4'} pb-6 space-y-1 overflow-y-auto custom-scrollbar`} suppressHydrationWarning>
                {!isCollapsed && <div className="mb-4 px-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-4">Menu Principal</div>}
                {isCollapsed && <div className="h-4"></div>}
                
                {navigation.map((item) => {
                    // @ts-ignore
                    const hasChildren = item.children && item.children.length > 0
                    const isExact = pathname === item.href
                    const isParent = hasChildren 
                        // @ts-ignore
                        ? item.children.some(child => pathname === child.href || pathname.startsWith(child.href + '/'))
                        : pathname.startsWith(item.href + '/') && item.href !== `/${lang}/admin`
                    const isActive = isExact || isParent
                    const Icon = item.icon

                    return (
                        <div key={item.name} className="space-y-1 relative group/nav">
                            {hasChildren ? (
                                <div
                                    onClick={() => toggleMenu(item.name)}
                                    className={`
                                        flex items-center py-2.5 text-sm font-semibold rounded-xl transition-all duration-200 cursor-pointer
                                        ${isCollapsed ? 'justify-center px-0' : 'px-4'}
                                        ${isActive
                                            ? 'bg-blue-600 text-white shadow-md shadow-blue-200'
                                            : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                                        }
                                    `}
                                    title={isCollapsed ? item.name : undefined}
                                >
                                    <Icon className={`w-5 h-5 transition-colors ${isCollapsed ? '' : 'mr-3'} ${isActive ? 'text-white' : 'text-slate-400 group-hover/nav:text-slate-600'}`} />
                                    {!isCollapsed && <span className="flex-1">{item.name}</span>}
                                    {!isCollapsed && <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${expandedMenus[item.name] ? 'rotate-180' : ''}`} />}
                                </div>
                            ) : (
                                <Link
                                    href={item.href}
                                    className={`
                                        flex items-center py-2.5 text-sm font-semibold rounded-xl transition-all duration-200
                                        ${isCollapsed ? 'justify-center px-0' : 'px-4'}
                                        ${isActive
                                            ? 'bg-blue-600 text-white shadow-md shadow-blue-200'
                                            : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                                        }
                                    `}
                                    title={isCollapsed ? item.name : undefined}
                                >
                                    <Icon className={`w-5 h-5 transition-colors ${isCollapsed ? '' : 'mr-3'} ${isActive ? 'text-white' : 'text-slate-400 group-hover/nav:text-slate-600'}`} />
                                    {!isCollapsed && <span className="flex-1">{item.name}</span>}
                                    {!isCollapsed && isActive && !hasChildren && (
                                        <div className="w-1.5 h-1.5 rounded-full bg-white/40 animate-pulse ml-2" />
                                    )}
                                </Link>
                            )}

                            {/* Tooltip for collapsed mode on hover */}
                            {isCollapsed && (
                                <div className="absolute left-full top-1/2 -translate-y-1/2 ml-2 px-3 py-1.5 bg-gray-900 text-white text-xs font-bold rounded-lg opacity-0 invisible group-hover/nav:opacity-100 group-hover/nav:visible transition-all whitespace-nowrap z-50 shadow-xl pointer-events-none">
                                    {item.name}
                                </div>
                            )}

                            {!isCollapsed && hasChildren && expandedMenus[item.name] && (
                                <div className="ml-4 mt-1 space-y-1 border-l-2 border-slate-100 pl-4 py-1">
                                    {/* @ts-ignore */}
                                    {item.children.map((child) => {
                                        const isChildActive = pathname === child.href
                                        const ChildIcon = child.icon

                                        return (
                                            <Link
                                                key={child.name}
                                                href={child.href}
                                                className={`
                                                    flex items-center px-4 py-2 text-xs font-semibold rounded-lg transition-all
                                                    ${isChildActive
                                                        ? 'text-blue-600 bg-blue-50/50'
                                                        : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'
                                                    }
                                                `}
                                            >
                                                <ChildIcon className={`w-4 h-4 mr-3 ${isChildActive ? 'text-blue-600' : 'text-slate-400'}`} />
                                                {child.name}
                                            </Link>
                                        )
                                    })}
                                </div>
                            )}
                        </div>
                    )
                })}
            </nav>

            {/* User Section */}
            <div className={`p-4 ${isCollapsed ? 'md:p-2' : 'md:p-6'} bg-slate-50/50 border-t border-slate-100 shrink-0`}>
                {!isCollapsed && (
                    <>
                        <div className="flex items-center justify-between mb-4">
                            <LanguageSwitcher upward={true} />
                        </div>
                        <div className="flex items-center gap-3 mb-4 p-2 rounded-2xl bg-white border border-slate-100 shadow-sm">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center shadow-lg shadow-blue-100 shrink-0">
                                <span className="text-sm font-bold text-white tracking-widest">AD</span>
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-bold text-slate-900 truncate">Administrateur</p>
                                <p className="text-[10px] text-slate-500 font-medium truncate">admin@riwaya.store</p>
                            </div>
                        </div>

                        <a
                            href={`/${lang}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center justify-center w-full px-4 py-2.5 mb-2 text-sm font-bold text-emerald-700 hover:text-white hover:bg-emerald-600 rounded-xl transition-all border border-emerald-200 bg-emerald-50"
                        >
                            <ExternalLink className="w-4 h-4 mr-2" />
                            Voir le site
                        </a>
                    </>
                )}

                <button
                    onClick={handleLogout}
                    className={`flex items-center justify-center w-full py-2.5 text-sm font-bold text-slate-600 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all border border-slate-200 bg-white ${isCollapsed ? 'px-0' : 'px-4'}`}
                    title={isCollapsed ? "Déconnexion" : undefined}
                >
                    <LogOut className={`w-4 h-4 ${isCollapsed ? '' : 'mr-2'}`} />
                    {!isCollapsed && "Déconnexion"}
                </button>
            </div>
        </div>
    )

    return (
        <div className="min-h-screen bg-[#F8FAFC]">
            {/* Overlay mobile */}
            {sidebarOpen && (
                <div
                    className="fixed inset-0 bg-black/40 z-40 md:hidden"
                    onClick={() => setSidebarOpen(false)}
                />
            )}

            {/* Sidebar desktop (fixe) */}
            {!pathname?.endsWith('/admin/pos') && (
                <aside className={`hidden md:flex fixed inset-y-0 left-0 bg-white border-r border-slate-200/60 shadow-sm z-50 flex-col transition-all duration-300 ${sidebarCollapsed ? 'w-20' : 'w-64 lg:w-72'}`}>
                    {renderSidebarContent(sidebarCollapsed)}
                </aside>
            )}

            {/* Sidebar mobile (drawer) */}
            <aside className={`md:hidden fixed inset-y-0 left-0 w-72 bg-white border-r border-slate-200/60 shadow-xl z-50 flex flex-col transition-transform duration-300 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
                {renderSidebarContent(false)}
            </aside>

            {/* Main Content */}
            <div className={`transition-all duration-300 ${pathname?.endsWith('/admin/pos') ? 'pl-0' : sidebarCollapsed ? 'md:pl-20' : 'md:pl-64 lg:pl-72'}`}>
                {/* Topbar mobile */}
                {!pathname?.endsWith('/admin/pos') && (
                    <div className="md:hidden sticky top-0 z-30 flex items-center justify-between px-4 py-3 bg-white border-b border-slate-200 shadow-sm">
                        <button
                            onClick={() => setSidebarOpen(true)}
                            className="p-2 rounded-xl text-slate-600 hover:bg-slate-100 transition-colors"
                        >
                            <Menu className="w-5 h-5" />
                        </button>
                        <div className="flex items-center gap-2">
                            <div className="w-7 h-7 bg-black rounded-lg flex items-center justify-center">
                                <span className="text-white text-sm font-black italic">R</span>
                            </div>
                            <span className="text-base font-black text-slate-900">Riwaya<span className="text-blue-600">.</span></span>
                        </div>
                        <div className="flex items-center gap-2">
                            <LanguageSwitcher />
                            <OrderNotifications />
                        </div>
                    </div>
                )}

                <main className={pathname?.endsWith('/admin/pos') ? "w-full h-screen" : "p-4 md:p-8 lg:p-10 w-full min-h-screen"}>
                    {children}
                </main>
            </div>
        </div>
    )
}

