'use client'

import { useState, useEffect } from 'react'
import { Link } from '@/i18n/routing'
import { X, Cookie, ShieldCheck, Settings2 } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { usePathname } from 'next/navigation'

export default function CookieConsent() {
    const [isVisible, setIsVisible] = useState(false)
    const t = useTranslations('CookieConsent')
    const pathname = usePathname()

    useEffect(() => {
        const consent = localStorage.getItem('cookie-consent')
        // Robust check for admin pages (handles /admin, /fr/admin, /ar/admin etc)
        const isAdminPage = pathname?.split('/').some(segment => segment === 'admin')

        if (!consent && !isAdminPage) {
            const timer = setTimeout(() => {
                setIsVisible(true)
            }, 1500) // Slight delay for better UX
            return () => clearTimeout(timer)
        }
    }, [pathname])

    const handleAccept = () => {
        localStorage.setItem('cookie-consent', 'accepted')
        setIsVisible(false)
    }

    const handleDecline = () => {
        localStorage.setItem('cookie-consent', 'declined')
        setIsVisible(false)
    }

    if (!isVisible) return null

    return (
        <div className="fixed bottom-0 left-0 right-0 z-[100] pointer-events-auto bg-white border-t border-gray-100 shadow-[0_-10px_40px_rgba(0,0,0,0.08)]">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-5 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 lg:gap-8">
                
                {/* Text & Icon */}
                <div className="flex items-start lg:items-center gap-4 flex-1 rtl:text-right">
                    <div className="w-10 h-10 bg-black rounded-xl flex items-center justify-center shrink-0 shadow-lg shadow-black/10 hidden sm:flex">
                        <Cookie className="w-5 h-5 text-white" />
                    </div>
                    <div className="pr-8 lg:pr-0">
                        <h3 className="text-sm font-black uppercase tracking-[0.15em] text-black mb-1 rtl:tracking-normal">
                            {t('Title')}
                        </h3>
                        <p className="text-xs font-medium text-gray-600 leading-relaxed max-w-3xl">
                            {t.rich('Description', {
                                link: (chunks) => (
                                    <Link href="/privacy" className="text-black font-bold underline underline-offset-4 decoration-1 hover:decoration-2 transition-all">
                                        {chunks}
                                    </Link>
                                )
                            })}
                        </p>
                    </div>
                </div>
                
                {/* Buttons */}
                <div className="flex flex-col sm:flex-row items-center gap-3 w-full lg:w-auto shrink-0">
                    <button 
                        onClick={handleAccept}
                        className="w-full sm:w-auto px-8 py-3 bg-black text-white text-[11px] font-black uppercase tracking-[0.15em] rtl:tracking-normal rounded-xl hover:bg-gray-900 transition-all active:scale-95 shadow-xl shadow-black/5"
                    >
                        {t('Accept')}
                    </button>
                    <button 
                        onClick={handleDecline}
                        className="w-full sm:w-auto px-8 py-3 border border-gray-200 text-black text-[11px] font-black uppercase tracking-[0.15em] rtl:tracking-normal rounded-xl hover:bg-gray-50 transition-all active:scale-95"
                    >
                        {t('LearnMore')}
                    </button>
                    <button 
                        className="hidden sm:flex text-[10px] font-bold text-gray-400 uppercase tracking-widest hover:text-black transition-colors items-center gap-2 px-2"
                        aria-label="Paramètres des cookies"
                    >
                        <Settings2 className="w-3 h-3" />
                    </button>
                </div>
                
                {/* Close button - absolute on mobile, static on desktop */}
                <button 
                    onClick={() => setIsVisible(false)}
                    aria-label="Fermer le bandeau des cookies"
                    className="absolute top-4 right-4 rtl:left-4 rtl:right-auto lg:static text-gray-400 hover:text-black transition-all hover:rotate-90 p-1"
                >
                    <X className="w-5 h-5" />
                </button>
            </div>
        </div>
    )
}
