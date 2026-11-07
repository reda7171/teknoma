'use client'

import React, { useEffect, useState, useRef } from 'react'
import { usePathname } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { useCartStore } from '@/store/cart'
import { submitPromoLead } from '@/lib/actions/promo-leads'
import { Tag, X, Check, Copy, Phone, Mail, Sparkles, Percent, ShieldCheck } from 'lucide-react'
import dynamic from 'next/dynamic'
const Confetti = dynamic(() => import('react-confetti'), { ssr: false })

const POPUP_DISMISS_KEY = 'riwaya_promo_popup_dismissed_until'
const POPUP_SUBSCRIBED_KEY = 'riwaya_promo_subscribed'
const POPUP_SAVED_PHONE_KEY = 'riwaya_user_phone'
const DELAY_AFTER_ADD_MS = 3000 // 3 secondes après l'ajout au panier
const DISMISS_DAYS = 7 // Ne pas réafficher avant 7 jours si fermé sans soumission

export default function CartPromoLeadPopup() {
    const pathname = usePathname()
    const isExcludedRoute = Boolean(
        pathname?.includes('/admin') ||
        pathname?.includes('/seller') ||
        pathname?.includes('/checkout') ||
        pathname?.includes('/community') ||
        pathname?.includes('/reading-list') ||
        pathname?.includes('/profile')
    )

    const t = useTranslations('CartPromoPopup')
    const items = useCartStore((state) => state.items)
    const getTotalPrice = useCartStore((state) => state.getTotalPrice)
    const applyDiscount = useCartStore((state) => state.applyDiscount)

    const [isOpen, setIsOpen] = useState(false)
    const [phone, setPhone] = useState('')
    const [email, setEmail] = useState('')
    const [isLoading, setIsLoading] = useState(false)
    const [errorMessage, setErrorMessage] = useState<string | null>(null)
    const [successData, setSuccessData] = useState<{ promoCode: string; discount: number } | null>(null)
    const [copied, setCopied] = useState(false)
    const [isApplied, setIsApplied] = useState(false)
    const [showConfetti, setShowConfetti] = useState(false)
    const [windowDimensions, setWindowDimensions] = useState({ width: 0, height: 0 })

    const previousItemsCount = useRef<number>(0)
    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

    // Mesure de la taille d'écran pour les confettis
    useEffect(() => {
        if (showConfetti && typeof window !== 'undefined') {
            setWindowDimensions({ width: window.innerWidth, height: window.innerHeight })
            const handleResize = () => setWindowDimensions({ width: window.innerWidth, height: window.innerHeight })
            window.addEventListener('resize', handleResize)
            return () => window.removeEventListener('resize', handleResize)
        }
    }, [showConfetti])

    // Détection de l'ajout au panier
    useEffect(() => {
        if (isExcludedRoute) return

        const currentCount = items.reduce((sum, item) => sum + item.quantity, 0)
        const hasAddedItem = currentCount > previousItemsCount.current && currentCount > 0
        previousItemsCount.current = currentCount

        if (!hasAddedItem) return

        // Vérifier si déjà abonné
        try {
            const isSubscribed = localStorage.getItem(POPUP_SUBSCRIBED_KEY)
            if (isSubscribed === 'true') return

            const dismissedUntil = localStorage.getItem(POPUP_DISMISS_KEY)
            if (dismissedUntil && Number(dismissedUntil) > Date.now()) return
        } catch {
            return
        }

        // Annuler tout timer précédent
        if (timerRef.current) clearTimeout(timerRef.current)

        // Déclencher après 3 secondes
        timerRef.current = setTimeout(() => {
            // Vérifier à nouveau avant d'ouvrir
            try {
                const isSubscribed = localStorage.getItem(POPUP_SUBSCRIBED_KEY)
                const dismissedUntil = localStorage.getItem(POPUP_DISMISS_KEY)
                if (isSubscribed === 'true' || (dismissedUntil && Number(dismissedUntil) > Date.now())) return
            } catch {
                // Ignore storage errors
            }
            setIsOpen(true)
        }, DELAY_AFTER_ADD_MS)

        return () => {
            if (timerRef.current) clearTimeout(timerRef.current)
        }
    }, [items])

    const handleDismiss = () => {
        try {
            const expireTimestamp = Date.now() + DISMISS_DAYS * 24 * 60 * 60 * 1000
            localStorage.setItem(POPUP_DISMISS_KEY, expireTimestamp.toString())
        } catch {
            // Ignore
        }
        setIsOpen(false)
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setErrorMessage(null)

        const cleanPhone = phone.trim()
        const cleanEmail = email.trim()

        if (!cleanPhone && !cleanEmail) {
            setErrorMessage(t('ErrorRequiredField'))
            return
        }

        setIsLoading(true)

        try {
            const res = await submitPromoLead({
                phone: cleanPhone || undefined,
                email: cleanEmail || undefined,
                source: 'cart_popup_10pct'
            })

            if (res.success && res.promoCode) {
                try {
                    localStorage.setItem(POPUP_SUBSCRIBED_KEY, 'true')
                    if (cleanPhone) localStorage.setItem(POPUP_SAVED_PHONE_KEY, cleanPhone)
                    if (cleanEmail) localStorage.setItem('riwaya_user_email', cleanEmail)
                    localStorage.setItem('riwaya_pending_coupon', res.promoCode)
                } catch {
                    // Ignore
                }

                setSuccessData({ promoCode: res.promoCode, discount: res.discount })
                setShowConfetti(true)
                setTimeout(() => setShowConfetti(false), 4500)
            } else {
                setErrorMessage(res.error || t('GenericError'))
            }
        } catch {
            setErrorMessage(t('GenericError'))
        } finally {
            setIsLoading(false)
        }
    }

    const handleCopy = () => {
        if (!successData?.promoCode) return
        navigator.clipboard.writeText(successData.promoCode)
        setCopied(true)
        setTimeout(() => setCopied(false), 2500)
    }

    const handleApplyDirectly = () => {
        if (!successData) return
        const currentTotal = getTotalPrice()
        const discountVal = Math.round(currentTotal * (successData.discount / 100))
        applyDiscount(discountVal)
        setIsApplied(true)
        setTimeout(() => {
            setIsOpen(false)
        }, 1200)
    }

    if (isExcludedRoute || !isOpen) return null

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-fade-in">
            {showConfetti && windowDimensions.width > 0 && (
                <Confetti
                    width={windowDimensions.width}
                    height={windowDimensions.height}
                    numberOfPieces={120}
                    recycle={false}
                    colors={['#059669', '#10B981', '#F59E0B', '#3B82F6', '#1E293B']}
                />
            )}

            <div className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden text-slate-800">
                {/* Bouton fermeture */}
                <button
                    onClick={handleDismiss}
                    aria-label={t('Dismiss')}
                    className="absolute top-4 right-4 z-10 p-2 text-slate-400 hover:text-slate-700 bg-slate-100/80 hover:bg-slate-200 rounded-full transition-all"
                >
                    <X className="w-5 h-5" />
                </button>

                {/* Bandeau d'en-tête */}
                <div className="bg-gradient-to-r from-emerald-600 via-emerald-700 to-teal-800 p-6 sm:p-8 text-white text-center relative overflow-hidden">
                    <div className="absolute -top-12 -right-12 w-36 h-36 bg-white/10 rounded-full blur-2xl pointer-events-none" />
                    <div className="absolute -bottom-8 -left-8 w-32 h-32 bg-amber-400/20 rounded-full blur-xl pointer-events-none" />

                    <div className="inline-flex items-center gap-2 px-3 py-1 bg-amber-400 text-slate-900 rounded-full text-xs font-black uppercase tracking-wider mb-3 shadow-sm">
                        <Sparkles className="w-3.5 h-3.5 fill-slate-900" />
                        {t('Badge')}
                    </div>

                    <h3 className="text-2xl sm:text-3xl font-black tracking-tight leading-tight mb-2">
                        {successData ? t('SuccessTitle') : t('Title')}
                    </h3>

                    <p className="text-emerald-100 text-xs sm:text-sm font-medium max-w-sm mx-auto leading-relaxed">
                        {successData ? t('SuccessSubtitle') : t('Subtitle')}
                    </p>
                </div>

                {/* Corps de la modale */}
                <div className="p-6 sm:p-8">
                    {!successData ? (
                        <form onSubmit={handleSubmit} className="space-y-4">
                            {/* Champ Téléphone WhatsApp */}
                            <div>
                                <label className="block text-xs font-black uppercase tracking-wider text-slate-700 mb-1.5">
                                    {t('PhoneLabel')} <span className="text-emerald-600">*</span>
                                </label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                                        <Phone className="w-4 h-4 text-emerald-600" />
                                    </div>
                                    <input
                                        type="tel"
                                        value={phone}
                                        onChange={(e) => setPhone(e.target.value)}
                                        placeholder={t('PhonePlaceholder')}
                                        required
                                        className="w-full pl-10 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all placeholder:text-slate-400"
                                    />
                                </div>
                            </div>

                            {/* Champ Email optionnel */}
                            <div>
                                <label className="block text-xs font-black uppercase tracking-wider text-slate-700 mb-1.5">
                                    {t('EmailLabel')}
                                </label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                                        <Mail className="w-4 h-4 text-slate-400" />
                                    </div>
                                    <input
                                        type="email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        placeholder={t('EmailPlaceholder')}
                                        className="w-full pl-10 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-medium text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all placeholder:text-slate-400"
                                    />
                                </div>
                            </div>

                            {errorMessage && (
                                <p className="text-rose-600 text-xs font-bold bg-rose-50 border border-rose-100 rounded-xl px-3.5 py-2.5">
                                    {errorMessage}
                                </p>
                            )}

                            {/* Bouton de validation */}
                            <button
                                type="submit"
                                disabled={isLoading}
                                className="w-full mt-2 inline-flex items-center justify-center gap-2 py-4 px-6 bg-emerald-600 hover:bg-emerald-700 active:scale-[0.99] text-white font-black text-sm sm:text-base rounded-2xl shadow-lg shadow-emerald-600/25 transition-all cursor-pointer disabled:opacity-70"
                            >
                                <Percent className="w-5 h-5" />
                                <span>{isLoading ? t('Submitting') : t('SubmitButton')}</span>
                            </button>

                            {/* Note de réassurance */}
                            <div className="pt-2 flex items-center justify-center gap-1.5 text-[11px] font-semibold text-slate-500">
                                <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                                <span>{t('SecurityNote')}</span>
                            </div>

                            {/* Lien de désistement */}
                            <div className="text-center pt-1">
                                <button
                                    type="button"
                                    onClick={handleDismiss}
                                    className="text-xs text-slate-400 hover:text-slate-600 font-semibold transition-colors underline-offset-4 hover:underline"
                                >
                                    {t('Dismiss')}
                                </button>
                            </div>
                        </form>
                    ) : (
                        <div className="space-y-5 text-center">
                            {/* Bloc code promo */}
                            <div className="p-4 sm:p-5 bg-emerald-50/80 border-2 border-dashed border-emerald-300 rounded-2xl">
                                <span className="text-[11px] font-black uppercase tracking-wider text-emerald-800 block mb-1">
                                    {t('YourCode')}
                                </span>
                                <div className="flex items-center justify-center gap-3 mt-2">
                                    <span className="font-mono font-black text-2xl sm:text-3xl text-emerald-700 tracking-wider">
                                        {successData.promoCode}
                                    </span>
                                    <button
                                        type="button"
                                        onClick={handleCopy}
                                        className="p-2.5 bg-white hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-xl shadow-sm transition-all"
                                        title={t('CopyCode')}
                                    >
                                        {copied ? <Check className="w-5 h-5 text-emerald-600" /> : <Copy className="w-5 h-5" />}
                                    </button>
                                </div>
                                {copied && (
                                    <p className="text-xs font-bold text-emerald-700 mt-2 animate-fade-in">
                                        {t('Copied')}
                                    </p>
                                )}
                            </div>

                            {/* Boutons d'action */}
                            <div className="space-y-2.5">
                                <button
                                    type="button"
                                    onClick={handleApplyDirectly}
                                    disabled={isApplied}
                                    className="w-full inline-flex items-center justify-center gap-2 py-4 px-6 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-sm sm:text-base rounded-2xl shadow-lg shadow-emerald-600/25 transition-all cursor-pointer"
                                >
                                    {isApplied ? (
                                        <>
                                            <Check className="w-5 h-5" />
                                            <span>{t('Applied')}</span>
                                        </>
                                    ) : (
                                        <>
                                            <Tag className="w-5 h-5" />
                                            <span>{t('ApplyToCart')}</span>
                                        </>
                                    )}
                                </button>

                                <button
                                    type="button"
                                    onClick={() => setIsOpen(false)}
                                    className="w-full py-3 text-xs font-bold text-slate-500 hover:text-slate-800 transition-colors"
                                >
                                    {t('ContinueShopping')}
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
