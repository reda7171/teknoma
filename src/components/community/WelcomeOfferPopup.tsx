'use client'

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { Gift, X, Copy, Check, Sparkles } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useUIStore } from '@/store/ui'
import { Link } from '@/i18n/routing'

export default function WelcomeOfferPopup() {
    const searchParams = useSearchParams()
    const t = useTranslations('GmailReward')
    const { isGmailRewardOpen, closeGmailReward } = useUIStore()
    const [isOpen, setIsOpen] = useState(false)
    const [copied, setCopied] = useState(false)

    useEffect(() => {
        const isTriggered = Boolean(
            searchParams?.get('gmail_reward') === 'true' ||
            searchParams?.get('welcome') === 'true' ||
            searchParams?.get('reward') === '10'
        )

        const hasSessionReward = typeof window !== 'undefined' && window.sessionStorage?.getItem('riwaya_gmail_reward') === 'true'
        if (hasSessionReward) {
            window.sessionStorage.removeItem('riwaya_gmail_reward')
        }

        if (isTriggered || isGmailRewardOpen || hasSessionReward) {
            const timer = setTimeout(() => setIsOpen(true), 400)
            return () => clearTimeout(timer)
        }
    }, [searchParams, isGmailRewardOpen])

    const handleClose = () => {
        setIsOpen(false)
        closeGmailReward()
        if (typeof window !== 'undefined' && searchParams) {
            const newParams = new URLSearchParams(searchParams.toString())
            newParams.delete('gmail_reward')
            newParams.delete('welcome')
            newParams.delete('reward')
            const newUrl = window.location.pathname + (newParams.toString() ? `?${newParams.toString()}` : '')
            window.history.replaceState(null, '', newUrl)
        }
    }

    const copyCode = () => {
        if (typeof navigator !== 'undefined' && navigator.clipboard) {
            navigator.clipboard.writeText('WELCOME10')
            setCopied(true)
            setTimeout(() => setCopied(false), 2500)
        }
    }

    if (!isOpen) return null

    return (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
            {/* Backdrop */}
            <div 
                className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300"
                onClick={handleClose}
            />

            {/* Modal */}
            <div className="relative w-full max-w-md bg-white rounded-[2.5rem] p-8 shadow-2xl animate-in zoom-in-95 duration-300 overflow-hidden text-center border border-gray-100">
                
                {/* Decorative background circle */}
                <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-amber-100/70 rounded-full blur-3xl pointer-events-none" />

                <button 
                    aria-label="Fermer" 
                    onClick={handleClose}
                    className="absolute top-6 right-6 rtl:left-6 rtl:right-auto p-2 bg-gray-50 text-gray-400 hover:text-black rounded-full hover:bg-gray-100 transition-colors z-10"
                >
                    <X className="w-5 h-5" />
                </button>

                <div className="relative z-10 flex flex-col items-center pt-2">
                    <div className="w-20 h-20 bg-amber-100 rounded-full flex items-center justify-center mb-5 shadow-lg shadow-amber-200/50">
                        <Gift className="w-10 h-10 text-amber-700" />
                    </div>

                    <div className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-amber-50 border border-amber-200 rounded-full text-amber-900 text-xs font-black uppercase tracking-wider mb-3">
                        <Sparkles className="w-4 h-4 text-amber-600" />
                        <span>{t('Badge')}</span>
                    </div>

                    <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-black mb-1">
                        {t('Title')}
                    </h2>
                    <p className="text-sm font-bold text-amber-700 mb-3">
                        {t('Subtitle')}
                    </p>
                    
                    <p className="text-gray-600 font-medium text-xs sm:text-sm mb-6 max-w-xs mx-auto leading-relaxed">
                        {t('Description')}
                    </p>

                    <div className="w-full bg-pixio-cream border-2 border-dashed border-amber-300 rounded-2xl p-4 flex items-center justify-between gap-4">
                        <div className="text-start rtl:text-right">
                            <span className="block text-[10px] font-bold uppercase tracking-wider text-gray-400">
                                {t('CodeLabel')}
                            </span>
                            <span className="text-xl sm:text-2xl font-black text-black tracking-widest font-mono">
                                WELCOME10
                            </span>
                        </div>
                        <button 
                            onClick={copyCode}
                            aria-label="Copier le code"
                            className={`flex items-center justify-center px-4 py-2.5 rounded-xl font-bold text-xs transition-all ${
                                copied 
                                ? 'bg-green-600 text-white' 
                                : 'bg-black text-white hover:bg-gray-800'
                            }`}
                        >
                            {copied ? (
                                <span className="flex items-center gap-1">
                                    <Check className="w-4 h-4" />
                                    <span>{t('Copied')}</span>
                                </span>
                            ) : (
                                <span className="flex items-center gap-1">
                                    <Copy className="w-4 h-4" />
                                    <span>Copier</span>
                                </span>
                            )}
                        </button>
                    </div>

                    <Link 
                        href="/books"
                        onClick={handleClose}
                        className="mt-6 w-full bg-black hover:bg-gray-800 text-white font-black py-4 rounded-2xl transition-all shadow-md active:scale-95 text-xs sm:text-sm uppercase tracking-wider"
                    >
                        {t('ShopNow')}
                    </Link>
                </div>
            </div>
        </div>
    )
}
