'use client'

import { useCartStore } from '@/store/cart'
import { normalizeImage } from '@/lib/utils'
import { useRouter } from '@/i18n/routing'
import { useEffect, useState, useRef } from 'react'
import { useForm } from 'react-hook-form'
import { createOrder } from '@/lib/actions/orders'
import { ArrowLeft, CheckCircle, Package, Truck, Wallet, Ticket, Loader2, ArrowRight, Gift, ShieldCheck, Headset, X, Building2, QrCode, Zap, Globe, Plane, MapPin, AlertTriangle } from 'lucide-react'
import InternationalPhoneInput from './InternationalPhoneInput'
import { Country, COUNTRIES, DEFAULT_COUNTRY } from '@/lib/constants/countries'
import { Link } from '@/i18n/routing'
import CouponInput from '@/components/CouponInput'
import { useTranslations, useLocale } from 'next-intl'
import { useUIStore } from '@/store/ui'
import { fbPixelEvents } from '@/lib/facebook-pixel'
import { getActiveGifts } from '@/lib/actions/gifts'
import { getWithYouCities } from '@/lib/actions/delivery'
import { calculate3For4Discount } from '@/lib/utils'
import { trackPurchase } from '@/lib/tracking'
import { getSavedDeliveryProfile, saveDeliveryProfile, clearSavedDeliveryProfile, SavedDeliveryProfile } from '@/lib/delivery-storage'
import { withExponentialRetry } from '@/lib/retry'

interface CheckoutForm {
    fullName: string
    email: string
    phone: string
    address: string
    city: string
    comment?: string
    paymentMethod: 'COD' | 'STRIPE' | 'PAYPAL' | 'CMI' | 'BANK_TRANSFER'
}

export default function CheckoutClient({ 
    user,
    minOrderAmount = 0,
    paymentSettings,
    is3For4Active
}: { 
    user?: { fullName?: string | null; email: string; phone?: string | null; image?: string | null; credits?: number } | null;
    minOrderAmount?: number;
    paymentSettings?: { stripeEnabled?: boolean; codEnabled?: boolean; paypalEnabled?: boolean; cmiEnabled?: boolean; bankTransferEnabled?: boolean; bankTransferAccounts?: { bankName: string; accountName: string; rib: string; logo?: string; qrCode?: string }[] }
    is3For4Active?: boolean;
}) {
    const router = useRouter()
    const { items, getTotalPrice, clearCart, discount: instantOfferDiscount, sessionId, updateQuantity } = useCartStore()
    const { showNotification } = useUIStore()
    const [mounted, setMounted] = useState(false)
    const [hasHydrated, setHasHydrated] = useState(false)
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [isSuccess, setIsSuccess] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [coupon, setCoupon] = useState<any>(null)
    const [gifts, setGifts] = useState<any[]>([])
    const [selectedBankIndex, setSelectedBankIndex] = useState<number | null>(null)
    const [useCredits, setUseCredits] = useState(false)
    const [savedProfile, setSavedProfile] = useState<SavedDeliveryProfile | null>(null)
    const [rememberDetails, setRememberDetails] = useState(true)
    const [shippingMethod, setShippingMethod] = useState<'STANDARD' | 'AMANA_WORLDWIDE'>('STANDARD')
    const [destinationCountry, setDestinationCountry] = useState<Country>(DEFAULT_COUNTRY)
    const isWorldwide = shippingMethod === 'AMANA_WORLDWIDE'
    const t = useTranslations('Checkout')
    const locale = useLocale()

    // Calculs financiers globaux initialisés avant les hooks et retours anticipés (évite l'erreur ReferenceError TDZ)
    const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0)
    const hasOnlyDigital = items.length > 0 && items.every(item => item.type === 'DIGITAL')
    const hasFreeShippingItem = items.some(item => item.shippingFees === 0)
    const shippingFee = (hasOnlyDigital) ? 0 : isWorldwide ? 200 : (hasFreeShippingItem || subtotal >= 500) ? 0 : 30

    let discountAmount = 0
    if (coupon) {
        if (coupon.type === 'PERCENTAGE') {
            discountAmount = (subtotal * coupon.discount) / 100
        } else {
            discountAmount = coupon.discount
        }
    }
    const instantDiscount = instantOfferDiscount || 0
    const promo3for4Discount = is3For4Active ? calculate3For4Discount(items) : 0
    const totalDiscountAmount = discountAmount + instantDiscount + promo3for4Discount

    const finalTotalBeforeCredits = Math.max(0, subtotal - totalDiscountAmount + shippingFee)
    const creditsToUse = useCredits && user?.credits ? Math.min(user.credits, finalTotalBeforeCredits) : 0
    const finalTotal = Math.max(0, finalTotalBeforeCredits - creditsToUse)

    const handleApplySavedProfile = () => {
        if (!savedProfile) return
        setValue('fullName', savedProfile.fullName)
        setValue('phone', savedProfile.phone)
        setValue('city', savedProfile.city)
        setValue('address', savedProfile.address)
        if (savedProfile.email) setValue('email', savedProfile.email)
        showNotification(t('ProfileAutoFilled'), 'success')
    }

    const handleClearSavedProfile = () => {
        clearSavedDeliveryProfile()
        setSavedProfile(null)
    }

    // Pré-remplir le formulaire si l'utilisateur est connecté
    const defaultValues: Partial<CheckoutForm> = user ? {
        email: user.email,
        fullName: user.fullName || '',
        phone: user.phone || '',
        paymentMethod: paymentSettings?.codEnabled !== false ? 'COD' : 'STRIPE'
    } : {
        paymentMethod: paymentSettings?.codEnabled !== false ? 'COD' : 'STRIPE'
    }

    const { register, handleSubmit, getValues, setValue, watch, formState: { errors } } = useForm<CheckoutForm>({
        defaultValues
    })

    const [allCities, setAllCities] = useState<string[]>([])
    const [filteredCities, setFilteredCities] = useState<string[]>([])
    const [showCities, setShowCities] = useState(false)
    const watchedCity = watch('city')
    const watchedPhone = watch('phone')

    useEffect(() => {
        register('phone', {
            required: t('Errors.PhoneRequired')
        })
    }, [register, t])

    const [abandonedCartId, setAbandonedCartId] = useState<string | null>(null)
    const abandonedCartIdRef = useRef<string | null>(null)
    const isSubmittingRef = useRef(false)
    const isSuccessRef = useRef(false)

    useEffect(() => {
        abandonedCartIdRef.current = abandonedCartId
    }, [abandonedCartId])

    useEffect(() => {
        isSubmittingRef.current = isSubmitting
    }, [isSubmitting])

    useEffect(() => {
        isSuccessRef.current = isSuccess
    }, [isSuccess])

    useEffect(() => {
        if (user && (user.phone || user.email) && items.length > 0) {
            const timer = setTimeout(() => {
                saveAbandonedCart()
            }, 1000)
            return () => clearTimeout(timer)
        }
    }, [user, items.length])

    const saveAbandonedCart = async (useBeaconIfAvailable = false) => {
        const data = getValues()
        if (!data.phone && !data.email) return
        if (isSubmittingRef.current || isSuccessRef.current) return

        const payload = {
            id: abandonedCartIdRef.current,
            phone: data.phone,
            email: data.email,
            fullName: data.fullName,
            city: data.city,
            address: data.address,
            comment: data.comment,
            shippingMethod,
            destinationCountry: destinationCountry ? {
                code: destinationCountry.code,
                name: destinationCountry.name,
                nameAr: destinationCountry.nameAr,
                dialCode: destinationCountry.dialCode,
                flag: destinationCountry.flag,
            } : null,
            shippingFee,
            paymentMethod: data.paymentMethod,
            selectedBank: selectedBankIndex !== null && paymentSettings?.bankTransferAccounts ? paymentSettings.bankTransferAccounts[selectedBankIndex].bankName : null,
            sessionId,
            items,
            total: finalTotal
        }

        // Transmission garantie via navigator.sendBeacon lors de la fermeture ou du masquage de l'onglet
        if (useBeaconIfAvailable && typeof navigator !== 'undefined' && typeof navigator.sendBeacon === 'function') {
            try {
                const blob = new Blob([JSON.stringify(payload)], { type: 'application/json' })
                navigator.sendBeacon('/api/abandoned-cart', blob)
                return
            } catch {}
        }

        try {
            const result = await withExponentialRetry(async () => {
                const res = await fetch('/api/abandoned-cart', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                })
                if (!res.ok && res.status >= 500) {
                    throw new Error(`Server error ${res.status}`)
                }
                return res.json()
            }, { maxRetries: 2, baseDelayMs: 300 })

            if (result?.success && result?.id) {
                setAbandonedCartId(result.id)
                abandonedCartIdRef.current = result.id
            }
        } catch (e) {
            console.error('Failed to save abandoned cart', e)
        }
    }

    // Capture garantie via navigator.sendBeacon lors d'une fermeture brutale ou changement d'onglet mobile
    useEffect(() => {
        const handleUnloadBeacon = () => {
            saveAbandonedCart(true)
        }

        const handleVisibilityChange = () => {
            if (document.visibilityState === 'hidden') {
                saveAbandonedCart(true)
            }
        }

        window.addEventListener('pagehide', handleUnloadBeacon)
        document.addEventListener('visibilitychange', handleVisibilityChange)

        return () => {
            window.removeEventListener('pagehide', handleUnloadBeacon)
            document.removeEventListener('visibilitychange', handleVisibilityChange)
        }
    }, [sessionId, items, finalTotal, selectedBankIndex, paymentSettings, getValues])

    const registerWithTracker = (name: keyof CheckoutForm, options?: any) => {
        const reg = register(name, options)
        return {
            ...reg,
            onBlur: async (e: any) => {
                reg.onBlur(e)
                await saveAbandonedCart()
            }
        }
    }

    useEffect(() => {
        setMounted(true)
        if (useCartStore.persist?.hasHydrated()) {
            setHasHydrated(true)
        } else {
            const unsub = useCartStore.persist?.onFinishHydration?.(() => {
                setHasHydrated(true)
            })
            const timer = setTimeout(() => setHasHydrated(true), 300)
            return () => {
                if (unsub) unsub()
                clearTimeout(timer)
            }
        }
        // Charger le profil de livraison sauvegardé
        const profile = getSavedDeliveryProfile()
        if (profile) {
            setSavedProfile(profile)
            if (!getValues('fullName') && !getValues('phone')) {
                setValue('fullName', profile.fullName)
                setValue('phone', profile.phone)
                setValue('city', profile.city)
                setValue('address', profile.address)
                if (profile.email && !getValues('email')) {
                    setValue('email', profile.email)
                }
            }
        }
        // Préremplissage automatique depuis le pop-up promo si le champ téléphone est vide
        if (!getValues('phone')) {
            try {
                const promoPhone = localStorage.getItem('riwaya_user_phone')
                if (promoPhone) {
                    setValue('phone', promoPhone, { shouldValidate: true })
                }
            } catch {}
        }
        if (!getValues('email')) {
            try {
                const promoEmail = localStorage.getItem('riwaya_user_email')
                if (promoEmail) {
                    setValue('email', promoEmail, { shouldValidate: true })
                }
            } catch {}
        }
        // Fetch active gifts with retry
        withExponentialRetry(() => getActiveGifts(), { maxRetries: 3 }).then(setGifts).catch(console.error)
        // Fetch cities from WithYou with retry
        withExponentialRetry(() => getWithYouCities(), { maxRetries: 3 }).then(setAllCities).catch(console.error)
    }, [])

    useEffect(() => {
        if (watchedCity && watchedCity.length > 0) {
            const filtered = allCities.filter(c => 
                c.toLowerCase().includes(watchedCity.toLowerCase())
            )
            setFilteredCities(filtered.slice(0, 8)) // Limiter à 8 suggestions
            setShowCities(filtered.length > 0)
        } else {
            setFilteredCities([])
            setShowCities(false)
        }
    }, [watchedCity, allCities])

    useEffect(() => {
        if (mounted && items.length > 0) {
            // Facebook Pixel: InitiateCheckout
            fbPixelEvents.initiateCheckout({
                items: items.map(item => ({
                    id: item.id,
                    price: item.price,
                    quantity: item.quantity
                })),
                total: finalTotal
            })
        }
    }, [mounted])

    useEffect(() => {
        if (mounted && hasHydrated && !isSuccess) {
            if (items.length === 0 || (minOrderAmount > 0 && finalTotal < minOrderAmount)) {
                router.replace('/cart')
            }
        }
    }, [mounted, hasHydrated, items.length, minOrderAmount, finalTotal, router, isSuccess])

    if (!mounted || !hasHydrated) {
        return (
            <div className="min-h-[60vh] flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-black" />
            </div>
        )
    }

    if (items.length === 0) {
        return null
    }

    // Sélectionner le meilleur cadeau éligible
    const eligibleGift = gifts
        .filter(g => g.minAmount <= subtotal)
        .sort((a, b) => b.minAmount - a.minAmount)[0]

    const onSubmit = async (data: CheckoutForm) => {
        setIsSubmitting(true)
        isSubmittingRef.current = true
        setError(null)
        fbPixelEvents.addPaymentInfo()

        if (minOrderAmount > 0 && finalTotal < minOrderAmount) {
            const minAmountMsg = locale === 'ar' 
                ? `الحد الأدنى للطلب هو ${minOrderAmount} درهم.` 
                : locale === 'en' 
                ? `The minimum order amount is ${minOrderAmount} درهم.` 
                : `Le montant minimum du panier pour commander est de ${minOrderAmount} درهم.`
                
            setError(minAmountMsg)
            showNotification(minAmountMsg, 'error')
            setIsSubmitting(false)
            isSubmittingRef.current = false
            return
        }

        try {
            const orderItems = [
                ...items.map(item => ({
                    productId: item.id,
                    quantity: item.quantity,
                    type: item.type,
                    price: Number(item.price)
                })),
                // Ajouter le cadeau éligible s'il existe
                ...(eligibleGift ? [{
                    productId: eligibleGift.id,
                    quantity: 1,
                    type: 'GIFT' as const,
                    price: 0
                }] : [])
            ]



            const totalItems = items.reduce((acc, item) => acc + item.quantity, 0)
            let finalComment = data.comment || ''

            const getCookie = (name: string) => {
                if (typeof document === 'undefined') return undefined
                const match = document.cookie.match(new RegExp('(?:^|;\\s*)' + name.replace(/([\.$?*|{}\(\)\[\]\\\/\+^])/g, '\\$1') + '=([^;]*)'))
                return match ? decodeURIComponent(match[1]) : undefined
            }
            const clientFbp = getCookie('_fbp')
            const clientFbc = getCookie('_fbc') || (localStorage.getItem('fbclid') ? `fb.1.${Date.now()}.${localStorage.getItem('fbclid')}` : undefined)
            const gaMatch = typeof document !== 'undefined' ? document.cookie.match(/(?:^|;\s*)_ga=GA\d\.\d\.(\d+\.\d+)/) : null
            const clientGaId = gaMatch ? gaMatch[1] : undefined
            const clientGclid = localStorage.getItem('gclid') || undefined

            const result = await withExponentialRetry(
                () => createOrder({
                    fullName: data.fullName,
                    email: data.email,
                    phone: data.phone,
                    address: data.address,
                    city: isWorldwide ? (data.city ? `${data.city}, ${destinationCountry.name}` : destinationCountry.name) : data.city,
                    shippingCompany: isWorldwide ? 'Amana International' : undefined,
                    comment: finalComment,
                    items: orderItems,
                    couponCode: coupon?.code,
                    discount: totalDiscountAmount,
                    useCredits: useCredits,
                    utmSource: localStorage.getItem('utm_source') || undefined,
                    utmMedium: localStorage.getItem('utm_medium') || undefined,
                    utmCampaign: localStorage.getItem('utm_campaign') || undefined,
                    fbclid: localStorage.getItem('fbclid') || undefined,
                    ttclid: localStorage.getItem('ttclid') || undefined,
                    gclid: clientGclid,
                    gaClientId: clientGaId,
                    fbp: clientFbp,
                    fbc: clientFbc,
                    paymentMethod: data.paymentMethod,
                }),
                { maxRetries: 3, baseDelayMs: 400, maxDelayMs: 2500 }
            )

            if (result.success) {
                // Suivi des conversions : Google Analytics 4 & Meta Pixel
                trackPurchase({
                    id: result.orderId,
                    total: finalTotal,
                    shippingFee: shippingFee,
                    paymentMethod: data.paymentMethod,
                    items: items.map(item => ({
                        id: item.id,
                        title: item.title,
                        price: Number(item.price),
                        quantity: item.quantity,
                        category: item.type,
                    }))
                })

                // Facebook Pixel legacy event
                fbPixelEvents.purchase({
                    id: result.orderId,
                    total: finalTotal,
                    items: items.map(item => ({
                        id: item.id,
                        price: item.price,
                        quantity: item.quantity
                    }))
                })

                // Delete the abandoned cart now that it's complete
                if (abandonedCartId) {
                    fetch('/api/abandoned-cart', {
                        method: 'DELETE',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ id: abandonedCartId })
                    }).catch(() => {})
                }

                // Sauvegarder les coordonnées pour le prochain passage
                if (rememberDetails) {
                    saveDeliveryProfile({
                        fullName: data.fullName,
                        phone: data.phone,
                        city: data.city,
                        address: data.address,
                        email: data.email
                    })
                }

                setIsSuccess(true)
                isSuccessRef.current = true
                if (data.paymentMethod === 'STRIPE' || data.paymentMethod === 'PAYPAL' || data.paymentMethod === 'CMI') {
                    const endpointMap = {
                        'STRIPE': '/api/checkout/stripe',
                        'PAYPAL': '/api/checkout/paypal',
                        'CMI': '/api/checkout/cmi'
                    }
                    try {
                        const res = await fetch(endpointMap[data.paymentMethod], {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ orderId: result.orderId })
                        })
                        const paymentData = await res.json()
                        if (res.ok && paymentData.url) {
                            window.location.href = paymentData.url
                            return // Prevent clearCart yet, user will be redirected
                        } else if (res.ok && paymentData.formHtml) {
                            // CMI Returns HTML form to be submitted
                            const div = document.createElement('div')
                            div.innerHTML = paymentData.formHtml
                            document.body.appendChild(div)
                            const form = div.querySelector('form')
                            if (form) {
                                form.submit()
                                return
                            }
                            throw new Error('Erreur de génération du formulaire CMI')
                        } else {
                            throw new Error(paymentData.error || `Erreur ${data.paymentMethod}`)
                        }
                    } catch (err) {
                        console.error(`Erreur redirection ${data.paymentMethod}:`, err)
                        showNotification('Erreur lors de la redirection vers le paiement sécurisé.', 'error')
                        setIsSubmitting(false)
                        return
                    }
                }

                clearCart()
                setCoupon(null)
                setIsSuccess(true)
                isSuccessRef.current = true
                if (user) {
                    showNotification('Commande reussi...', 'success')
                    router.push('/orders')
                } else {
                    showNotification(t('OrderSuccess'), 'success')
                    router.push(`/checkout/success/${result.orderId}`)
                }
            } else {
                setError(result.error || t('Errors.UnexpectedError'))
                showNotification(result.error || t('Errors.UnexpectedError'), 'error')
            }
        } catch (e: any) {
            setError(e.message || t('Errors.UnexpectedError'))
            showNotification(e.message || t('Errors.UnexpectedError'), 'error')
        } finally {
            setIsSubmitting(false)
        }
    }

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10 lg:py-16">
            <Link
                href="/"
                className="inline-flex items-center text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-black mb-4 sm:mb-8 lg:mb-12 transition-colors group rtl:flex-row-reverse"
            >
                <ArrowLeft className="w-3 h-3 mr-2 transition-transform group-hover:-translate-x-1 rtl:ml-2 rtl:mr-0 rtl:rotate-180 rtl:group-hover:translate-x-1" />
                {t('BackToSelection')}
            </Link>

            <h1 className="text-3xl sm:text-5xl font-black text-black mb-6 sm:mb-10 lg:mb-16 tracking-tighter">{t('YourDetails')}<span className="text-gray-200">.</span></h1>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-16 pb-24 lg:pb-0">
                {/* Formulaire Principal */}
                <div className="lg:col-span-2 space-y-6 sm:space-y-10 lg:space-y-12">
                    <form id="checkout-form" onSubmit={handleSubmit(onSubmit)} className="space-y-6 sm:space-y-10 lg:space-y-12">
                        <div className="bg-white rounded-2xl sm:rounded-[2.5rem] p-5 sm:p-8 lg:p-10 shadow-sm border border-gray-100">
                            <h2 className="text-xl sm:text-2xl font-black text-black mb-6 sm:mb-10 flex items-center gap-3 sm:gap-4">
                                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-black text-white rounded-xl sm:rounded-2xl flex items-center justify-center text-xs sm:text-sm shadow-xl">01</div>
                                {t('ShippingInfo')}
                            </h2>

                            {savedProfile && (
                                <div className="mb-8 p-4 sm:p-5 bg-gradient-to-r from-emerald-50 via-white to-emerald-50 rounded-2xl border border-emerald-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-sm">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-black text-xs shrink-0 shadow-md">
                                            <Zap className="w-5 h-5 text-white" />
                                        </div>
                                        <div>
                                            <p className="text-xs font-black text-black">
                                                {t('SavedProfileTitle')} : <span className="text-emerald-700">{savedProfile.fullName} ({savedProfile.city})</span>
                                            </p>
                                            <p className="text-[11px] text-gray-500 font-mono">
                                                {savedProfile.phone}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2 w-full sm:w-auto">
                                        <button
                                            type="button"
                                            onClick={handleApplySavedProfile}
                                            className="flex-1 sm:flex-none px-4 py-2.5 bg-emerald-600 text-white rounded-xl text-xs font-bold hover:bg-emerald-700 active:scale-95 transition-all shadow-sm"
                                        >
                                            {t('UseSavedProfile')}
                                        </button>
                                        <button
                                            type="button"
                                            onClick={handleClearSavedProfile}
                                            className="px-3 py-2 text-xs font-bold text-gray-400 hover:text-red-500 transition-colors"
                                        >
                                            {t('ClearSavedProfile')}
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* Mode de livraison : Maroc Standard vs Worldwide by Amana */}
                            <div className="mb-8 space-y-3">
                                <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">
                                    {t('ShippingMethod')}
                                </label>
                                <div className="grid grid-cols-2 gap-2.5 sm:gap-4">
                                    {/* Option 1: Maroc Standard */}
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setShippingMethod('STANDARD')
                                            setDestinationCountry(DEFAULT_COUNTRY)
                                            setTimeout(saveAbandonedCart, 100)
                                        }}
                                        className={`p-3.5 sm:p-5 rounded-xl sm:rounded-2xl border-2 text-left rtl:text-right transition-all relative flex flex-col justify-between h-full ${
                                            shippingMethod === 'STANDARD'
                                                ? 'border-black bg-white shadow-md'
                                                : 'border-transparent bg-pixio-cream/50 hover:bg-white/80'
                                        }`}
                                    >
                                        <div>
                                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 sm:gap-2 mb-2">
                                                <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
                                                    <Truck className="w-4 h-4 sm:w-5 sm:h-5 text-black shrink-0" />
                                                    <span className="font-black text-xs sm:text-sm text-black truncate">{t('MoroccoShipping')}</span>
                                                </div>
                                                <span className="text-[10px] sm:text-xs font-black px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-full bg-emerald-100 text-emerald-800 w-fit shrink-0">
                                                    {(hasFreeShippingItem || subtotal >= 500) ? t('Free') : '30 DH'}
                                                </span>
                                            </div>
                                            <p className="text-[10px] sm:text-xs text-gray-500 font-medium leading-relaxed line-clamp-2 sm:line-clamp-none">
                                                {t('MoroccoShippingDesc')}
                                            </p>
                                        </div>
                                    </button>

                                    {/* Option 2: Worldwide by Amana */}
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setShippingMethod('AMANA_WORLDWIDE')
                                            setTimeout(saveAbandonedCart, 100)
                                        }}
                                        className={`p-3.5 sm:p-5 rounded-xl sm:rounded-2xl border-2 text-left rtl:text-right transition-all relative flex flex-col justify-between h-full ${
                                            shippingMethod === 'AMANA_WORLDWIDE'
                                                ? 'border-black bg-white shadow-md'
                                                : 'border-transparent bg-pixio-cream/50 hover:bg-white/80'
                                        }`}
                                    >
                                        <div>
                                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 sm:gap-2 mb-2">
                                                <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
                                                    <Globe className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600 shrink-0" />
                                                    <span className="font-black text-xs sm:text-sm text-black truncate">{t('WorldwideAmana')}</span>
                                                </div>
                                                <span className="text-[10px] sm:text-xs font-black px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-full bg-blue-100 text-blue-800 font-mono w-fit shrink-0">
                                                    {t('WorldwideShippingFeeBadge')}
                                                </span>
                                            </div>
                                            <p className="text-[10px] sm:text-xs text-gray-500 font-medium leading-relaxed line-clamp-2 sm:line-clamp-none">
                                                {t('WorldwideAmanaDesc')}
                                            </p>
                                        </div>
                                    </button>
                                </div>
                            </div>

                            <div className="space-y-3 mb-8">
                                <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">{t('FullName')}</label>
                                <input
                                    {...registerWithTracker('fullName', { required: t('Errors.FullNameRequired') })}
                                    className="w-full px-6 py-5 bg-pixio-cream/50 border-2 border-gray-200 rounded-[1.5rem] focus:bg-white focus:border-black outline-none transition-all font-black text-black"
                                />
                                {errors.fullName && <p className="text-red-500 text-[10px] font-black uppercase mt-1 ml-1">{errors.fullName.message}</p>}
                            </div>

                            <div className="hidden">
                                <input
                                    {...register('email')}
                                    type="hidden"
                                />
                            </div>

                            {/* Téléphone avec détection de drapeau par indicatif ou sélecteur de pays */}
                            <div className="space-y-3 mb-8">
                                <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">{t('MobileNumber')}</label>
                                <InternationalPhoneInput
                                    id="phone"
                                    value={watchedPhone || ''}
                                    onChange={(val) => {
                                        setValue('phone', val, { shouldValidate: true })
                                    }}
                                    onCountryChange={(country) => {
                                        setDestinationCountry(country)
                                        if (country.code !== 'MA') {
                                            setShippingMethod('AMANA_WORLDWIDE')
                                        }
                                        setTimeout(saveAbandonedCart, 100)
                                    }}
                                    error={errors.phone?.message}
                                />
                                {errors.phone && <p className="text-red-500 text-[10px] font-black uppercase mt-1 ml-1">{errors.phone.message}</p>}
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
                                <div className="space-y-3 relative city-suggestion-container">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">{t('City')}</label>
                                    <input
                                        {...registerWithTracker('city', { required: t('Errors.CityRequired') })}
                                        placeholder={isWorldwide ? 'Ex: Paris, Bruxelles, Montréal...' : t('ChooseCity')}
                                        autoComplete="off"
                                        onFocus={() => {
                                            if (!isWorldwide && watchedCity && filteredCities.length > 0) setShowCities(true)
                                        }}
                                        className="w-full px-6 py-5 bg-pixio-cream/50 border-2 border-gray-200 rounded-[1.5rem] focus:bg-white focus:border-black outline-none transition-all font-black text-black"
                                    />
                                    
                                    {!isWorldwide && showCities && (
                                        <div className="absolute z-[999] left-0 right-0 top-full mt-2 bg-white rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.2)] border border-gray-100 overflow-hidden max-h-[250px] overflow-y-auto custom-scrollbar">
                                            {filteredCities.map((city, idx) => (
                                                <button
                                                    key={idx}
                                                    type="button"
                                                    onMouseDown={(e) => {
                                                        // Utiliser onMouseDown au lieu de onClick pour éviter les conflits de blur
                                                        e.preventDefault()
                                                        setValue('city', city)
                                                        setShowCities(false)
                                                    }}
                                                    className="w-full px-6 py-4 text-left hover:bg-pixio-cream font-black text-xs uppercase tracking-widest transition-colors border-b border-gray-50 last:border-none"
                                                >
                                                    {city}
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                    
                                    {errors.city && <p className="text-red-500 text-[10px] font-black uppercase mt-1 ml-1">{errors.city.message}</p>}
                                </div>
                                <div className="space-y-3">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">{t('FullAddress')}</label>
                                    <input
                                        {...register('address', { required: t('Errors.AddressRequired') })}
                                        className="w-full px-6 py-5 bg-pixio-cream/50 border-2 border-gray-200 rounded-[1.5rem] focus:bg-white focus:border-black outline-none transition-all font-black text-black"
                                    />
                                    {errors.address && <p className="text-red-500 text-[10px] font-black uppercase mt-1 ml-1">{errors.address.message}</p>}
                                </div>
                            </div>

                            <div className="space-y-3">
                                <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">{t('NoteOptional')}</label>
                                <textarea
                                    {...register('comment')}
                                    className="w-full px-6 py-5 bg-pixio-cream/50 border-2 border-gray-200 rounded-[1.5rem] focus:bg-white focus:border-black outline-none transition-all font-black text-black min-h-[120px]"
                                />
                            </div>

                            <label className="flex items-center gap-3 mt-6 pt-4 border-t border-gray-100 text-xs font-black text-gray-700 cursor-pointer select-none">
                                <input
                                    type="checkbox"
                                    checked={rememberDetails}
                                    onChange={(e) => setRememberDetails(e.target.checked)}
                                    className="w-4 h-4 rounded text-black focus:ring-black accent-black cursor-pointer"
                                />
                                <span>{t('RememberDeliveryInfo')}</span>
                            </label>
                        </div>

                        <div className="bg-white rounded-2xl sm:rounded-[2.5rem] p-5 sm:p-8 lg:p-10 shadow-sm border border-gray-100">
                            <h2 className="text-xl sm:text-2xl font-black text-black mb-6 sm:mb-10 flex items-center gap-3 sm:gap-4">
                                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-black text-white rounded-xl sm:rounded-2xl flex items-center justify-center text-xs sm:text-sm shadow-xl">02</div>
                                {t('PaymentMethod')}
                            </h2>

                            <div className="space-y-4">
                            {paymentSettings?.stripeEnabled && (
                                <label className={`flex items-center p-4 border rounded-2xl cursor-pointer transition-all ${watch('paymentMethod') === 'STRIPE' ? 'border-pixio-primary bg-amber-50' : 'border-pixio-border hover:border-pixio-primary'}`}>
                                    <input 
                                        type="radio" 
                                        value="STRIPE" 
                                        {...register('paymentMethod', { onChange: () => setTimeout(saveAbandonedCart, 100) })}
                                        className="w-4 h-4 text-pixio-primary bg-white border-gray-300 focus:ring-pixio-primary"
                                    />
                                    <div className="ml-3 flex flex-col">
                                        <span className="font-bold text-pixio-dark">Carte Bancaire (Stripe)</span>
                                        <span className="text-sm text-pixio-gray">Payez maintenant avec votre carte de manière sécurisée</span>
                                    </div>
                                    <svg className="w-8 h-8 ml-auto opacity-50" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
                                        <path d="M20 40C31.0457 40 40 31.0457 40 20C40 8.95431 31.0457 0 20 0C8.95431 0 0 8.95431 0 20C0 31.0457 8.95431 40 20 40Z" fill="#6772E5"/>
                                        <path fillRule="evenodd" clipRule="evenodd" d="M19.3491 14.8879C19.3491 13.9171 20.3016 13.2952 21.4394 13.2952C23.3618 13.2952 25.1091 14.072 26.3533 14.8879L28.1887 11.2355C26.4795 9.87556 24.1166 9.09875 21.4394 9.09875C17.0784 9.09875 13.9312 11.6631 13.9312 15.8981C13.9312 21.6486 21.7891 21.2601 21.7891 24.3685C21.7891 25.4564 20.6901 26.1947 19.3491 26.1947C16.9423 26.1947 14.8849 25.029 13.3308 23.941L11.5342 27.671C13.5546 29.2251 16.3012 30.2354 19.3491 30.2354C23.9018 30.2354 27.2469 27.671 27.2469 23.3971C27.2469 17.4135 19.3491 17.9575 19.3491 14.8879Z" fill="white"/>
                                    </svg>
                                </label>
                            )}

                            {paymentSettings?.paypalEnabled && (
                                <label className={`flex items-center p-4 border rounded-2xl cursor-pointer transition-all ${watch('paymentMethod') === 'PAYPAL' ? 'border-pixio-primary bg-amber-50' : 'border-pixio-border hover:border-pixio-primary'}`}>
                                    <input 
                                        type="radio" 
                                        value="PAYPAL" 
                                        {...register('paymentMethod', { onChange: () => setTimeout(saveAbandonedCart, 100) })}
                                        className="w-4 h-4 text-pixio-primary bg-white border-gray-300 focus:ring-pixio-primary"
                                    />
                                    <div className="ml-3 flex flex-col">
                                        <span className="font-bold text-pixio-dark">PayPal</span>
                                        <span className="text-xs text-pixio-gray">Paiement en USD après conversion du total MAD. Le montant sera affiché sur PayPal avant validation.</span>
                                        <a href="https://www.exchangerate-api.com" target="_blank" rel="noreferrer" className="text-xs text-pixio-gray underline">Taux de change : ExchangeRate-API</a>
                                        <span className="text-sm text-pixio-gray">Payez de manière sécurisée via votre compte PayPal</span>
                                    </div>
                                    <svg className="w-8 h-8 ml-auto opacity-50" viewBox="0 0 124 32" fill="none" xmlns="http://www.w3.org/2000/svg">
                                        <path d="M46.2 10.6C45.3 5.4 41 2.8 35.1 2.8H26.5C25.4 2.8 24.5 3.5 24.3 4.5L20.1 31C19.9 31.8 20.6 32.5 21.4 32.5H26.3C27.4 32.5 28.3 31.7 28.5 30.7L29.6 23.7C29.8 22.7 30.7 22 31.8 22H33.8C39.4 22 43.6 19.4 44.8 14.2C45 13 45.1 11.8 45.1 10.6H46.2ZM39.5 14.2C38.6 17.6 35.6 17.6 32.2 17.6H31.1L32 11.5H33C35.9 11.5 38.3 11.5 39.5 14.2Z" fill="#253B80"/>
                                        <path d="M68.3 10.9L65.4 16.4L63.3 11.4C62.9 10.5 62 9.9 61 9.9H55.4C54.4 9.9 53.9 11 54.4 11.9L60.5 24.1L55.5 31.6C54.9 32.4 55.5 33.6 56.5 33.6H62C62.8 33.6 63.5 33.2 63.9 32.5L74.4 11.6C74.9 10.7 74.3 9.6 73.3 9.6H69.9C69.3 9.6 68.7 10.1 68.3 10.9Z" fill="#253B80"/>
                                        <path d="M22 10.6C21.1 5.4 16.8 2.8 10.9 2.8H2.3C1.2 2.8 0.3 3.5 0.1 4.5L0 5.4L2.9 5.4H11.5C14.4 5.4 16.8 5.4 17.7 8.1C18.6 11.5 15.6 11.5 12.2 11.5H11.1L9.1 24.1L10.3 24.1H12.3C17.9 24.1 22.1 21.5 23.3 16.3C23.5 15.1 23.6 13.9 23.6 12.7L22 10.6Z" fill="#179BD7"/>
                                    </svg>
                                </label>
                            )}

                            {paymentSettings?.cmiEnabled && (
                                <label className={`flex items-center p-4 border rounded-2xl cursor-pointer transition-all ${watch('paymentMethod') === 'CMI' ? 'border-pixio-primary bg-amber-50' : 'border-pixio-border hover:border-pixio-primary'}`}>
                                    <input 
                                        type="radio" 
                                        value="CMI" 
                                        {...register('paymentMethod', { onChange: () => setTimeout(saveAbandonedCart, 100) })}
                                        className="w-4 h-4 text-pixio-primary bg-white border-gray-300 focus:ring-pixio-primary"
                                    />
                                    <div className="ml-3 flex flex-col">
                                        <span className="font-bold text-pixio-dark">Carte Bancaire Marocaine (CMI)</span>
                                        <span className="text-sm text-pixio-gray">Payez de manière sécurisée via le Centre Monétique Interbancaire</span>
                                    </div>
                                    <div className="ml-auto opacity-50 font-black text-gray-500 text-lg">
                                        CMI
                                    </div>
                                </label>
                            )}

                            {paymentSettings?.codEnabled && (
                                <label className={`relative flex items-center p-4 sm:p-6 md:p-8 border-2 rounded-2xl sm:rounded-[2rem] cursor-pointer transition-all shadow-2xl shadow-black/5 ${watch('paymentMethod') === 'COD' ? 'border-black bg-pixio-cream/50' : 'border-transparent bg-pixio-cream/30 hover:border-black/50'}`}>
                                    <input 
                                        type="radio" 
                                        value="COD" 
                                        {...register('paymentMethod', { onChange: () => setTimeout(saveAbandonedCart, 100) })}
                                        className="sr-only"
                                    />
                                    <div className="w-12 h-12 sm:w-16 sm:h-16 bg-white border border-gray-100 text-black rounded-xl sm:rounded-2xl flex items-center justify-center shrink-0">
                                        <Wallet className="w-6 h-6 sm:w-8 sm:h-8" />
                                    </div>
                                    <div className="ml-4 sm:ml-8 rtl:mr-4 sm:rtl:mr-8 rtl:ml-0">
                                        <p className="font-black text-black text-base sm:text-xl tracking-tight">
                                            {hasOnlyDigital ? 'Paiement à distance (Virement/CashPlus)' : t('CashOnDelivery')}
                                        </p>
                                        <p className="text-[10px] sm:text-xs font-bold text-gray-400 uppercase tracking-widest mt-1">
                                            {hasOnlyDigital ? 'Nous vous contacterons via WhatsApp pour le règlement.' : t('PayWhenReceive')}
                                        </p>
                                    </div>
                                    <div className="ml-auto rtl:mr-auto rtl:ml-0">
                                        <div className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center transition-colors ${watch('paymentMethod') === 'COD' ? 'bg-black text-white' : 'bg-gray-200 text-gray-400'}`}>
                                            <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5" />
                                        </div>
                                    </div>
                                </label>
                            )}

                            {paymentSettings?.bankTransferEnabled && (
                                <div>
                                    <label className={`relative flex items-center p-4 sm:p-6 md:p-8 border-2 rounded-2xl sm:rounded-[2rem] cursor-pointer transition-all shadow-2xl shadow-black/5 ${watch('paymentMethod') === 'BANK_TRANSFER' ? 'border-teal-600 bg-teal-50/30' : 'border-transparent bg-pixio-cream/30 hover:border-teal-400'}`}>
                                        <input 
                                            type="radio" 
                                            value="BANK_TRANSFER" 
                                            {...register('paymentMethod', { onChange: () => setTimeout(saveAbandonedCart, 100) })}
                                            className="sr-only"
                                        />
                                        <div className="w-12 h-12 sm:w-16 sm:h-16 bg-teal-50 border border-teal-100 text-teal-600 rounded-xl sm:rounded-2xl flex items-center justify-center shrink-0">
                                            <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6 sm:w-8 sm:h-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23"></line><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>
                                        </div>
                                        <div className="ml-4 sm:ml-8 rtl:mr-4 sm:rtl:mr-8 rtl:ml-0">
                                            <p className="font-black text-black text-base sm:text-xl tracking-tight">{t('BankTransfer')}</p>
                                            <p className="text-[10px] sm:text-xs font-bold text-gray-400 uppercase tracking-widest mt-1">{t('TransferAmountToBank')}</p>
                                        </div>
                                        <div className="ml-auto rtl:mr-auto rtl:ml-0">
                                            <div className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center transition-colors ${watch('paymentMethod') === 'BANK_TRANSFER' ? 'bg-teal-600 text-white' : 'bg-gray-200 text-gray-400'}`}>
                                                <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5" />
                                            </div>
                                        </div>
                                    </label>

                                    {/* Liste des banques sous forme de boutons au lieu d'affichage direct */}
                                    {watch('paymentMethod') === 'BANK_TRANSFER' && paymentSettings?.bankTransferAccounts && paymentSettings.bankTransferAccounts.length > 0 && (
                                        <div className="mt-6 space-y-4">
                                            <p className="text-sm font-bold text-gray-700">Veuillez choisir votre banque :</p>
                                            <div className="grid grid-cols-2 gap-4">
                                                {paymentSettings.bankTransferAccounts.map((account, index) => (
                                                    <button
                                                        key={index}
                                                        type="button"
                                                        onClick={() => {
                                                            setSelectedBankIndex(index);
                                                            setTimeout(saveAbandonedCart, 100);
                                                        }}
                                                        className={`p-4 rounded-xl border-2 transition-all flex items-center justify-between group ${
                                                            selectedBankIndex === index 
                                                                ? 'border-teal-600 bg-teal-50/50' 
                                                                : 'border-slate-200 hover:border-teal-200 hover:bg-slate-50'
                                                        }`}
                                                    >
                                                        {account.logo ? (
                                                            <div className="h-10 flex items-center justify-center">
                                                                <img src={normalizeImage(account.logo)} alt={account.bankName} className="max-h-full object-contain" onError={(e) => (e.target as HTMLImageElement).style.display = 'none'} />
                                                            </div>
                                                        ) : (
                                                            <Building2 className="w-8 h-8 text-teal-600" />
                                                        )}
                                                        <span className="text-sm font-black text-slate-800 text-center">{account.bankName}</span>
                                                    </button>
                                                ))}
                                            </div>
                                            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest px-1 mt-4">{t('OrderProcessedAfterTransfer')}</p>
                                        </div>
                                    )}
                                </div>
                            )}
                            </div>
                        </div>
                    </form>
                </div>

                {/* Résumé Panier & Code Promo */}
                <div className="lg:col-span-1">
                    <div className="bg-white rounded-2xl sm:rounded-[2.5rem] p-5 sm:p-8 lg:p-10 shadow-xl border border-gray-100 lg:sticky lg:top-24 space-y-6 sm:space-y-10">
                        <div>
                            <h2 className="text-xl font-black text-black tracking-tight mb-4 sm:mb-8">{t('SelectionSummary')}</h2>
                            {items.some((item) => item.quantity > 1) && (
                                <div className="mb-4 p-3 rounded-xl bg-amber-50 border border-amber-200/90 flex flex-wrap items-center justify-between gap-2">
                                    <div className="flex items-center gap-1.5 text-xs font-bold text-amber-900">
                                        <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                                        <span>{t('TwoCopiesWarning')}</span>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            items.forEach((item) => {
                                                if (item.quantity > 1) updateQuantity(item.id, 1)
                                            })
                                        }}
                                        className="text-[10px] font-black text-amber-900 bg-amber-100 hover:bg-amber-200 active:scale-95 px-2.5 py-1 rounded-lg border border-amber-300 transition-all cursor-pointer whitespace-nowrap"
                                    >
                                        {t('ReduceToOneCopy')}
                                    </button>
                                </div>
                            )}
                            <div className="space-y-6 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                                {items.map((item) => (
                                    <div key={item.id} className="flex gap-5 group">
                                        <div className="relative w-20 h-24 rounded-2xl overflow-hidden bg-pixio-cream shrink-0 border border-gray-50 group-hover:scale-105 transition-transform">
                                            {item.image ? (
                                                <img
                                                    src={normalizeImage(item.image)}
                                                    alt={item.title}
                                                    className="w-full h-full object-cover"
                                                    onError={(e) => { (e.target as HTMLImageElement).src = '/book-placeholder.png' }}
                                                />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center bg-gray-100">
                                                    <Package className="w-6 h-6 text-gray-300" />
                                                </div>
                                            )}
                                            <div className="absolute -top-1 -right-1 rtl:-left-1 rtl:right-auto w-7 h-7 bg-black text-white text-[10px] font-black rounded-xl flex items-center justify-center shadow-2xl">
                                                {item.quantity}
                                            </div>
                                        </div>
                                        <div className="flex-1 py-1">
                                            <p className="text-sm font-black text-black line-clamp-2 leading-tight tracking-tight">{item.title}</p>
                                            <p className="text-[10px] font-black text-gray-300 uppercase tracking-widest mt-2">{item.price} درهم</p>
                                            {item.quantity > 1 && (
                                                <div className="mt-2 p-2 rounded-xl bg-amber-50 border border-amber-200/90 flex flex-wrap items-center justify-between gap-1.5">
                                                    <span className="inline-flex items-center gap-1 text-amber-900 text-[10px] font-bold">
                                                        <Zap className="w-2.5 h-2.5 text-amber-600 shrink-0" />
                                                        {t('TwoCopiesSelected')} (×{item.quantity})
                                                    </span>
                                                    <button
                                                        type="button"
                                                        onClick={() => updateQuantity(item.id, 1)}
                                                        className="text-[10px] font-black text-amber-900 bg-amber-100 hover:bg-amber-200 active:scale-95 px-2 py-0.5 rounded-md border border-amber-300 transition-all cursor-pointer whitespace-nowrap"
                                                    >
                                                        {t('ReduceToOneCopy')}
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))}

                                {eligibleGift && (
                                    <div className="flex gap-5 group border-2 border-indigo-100 p-3 rounded-2xl bg-indigo-50/30 animate-pulse">
                                        <div className="relative w-20 h-24 rounded-2xl overflow-hidden bg-white shrink-0 border border-indigo-100 flex items-center justify-center">
                                            {eligibleGift.image ? (
                                                <img
                                                    src={normalizeImage(eligibleGift.image)}
                                                    alt={eligibleGift.name}
                                                    className="w-full h-full object-cover"
                                                    onError={(e) => { (e.target as HTMLImageElement).src = '/book-placeholder.png' }}
                                                />
                                            ) : (
                                                <Package className="w-8 h-8 text-indigo-300" />
                                            )}
                                            <div className="absolute -top-1 -right-1 rtl:-left-1 rtl:right-auto px-2 h-6 bg-indigo-600 text-white text-[10px] font-black rounded-xl flex items-center justify-center shadow-xl uppercase tracking-tighter">
                                                Offert
                                            </div>
                                        </div>
                                        <div className="flex-1 py-1">
                                            <p className="text-sm font-black text-indigo-900 line-clamp-2 leading-tight tracking-tight">{eligibleGift.name}</p>
                                            <p className="text-[10px] font-black text-indigo-300 uppercase tracking-widest mt-2">{eligibleGift.minAmount > 0 ? `Palier: ${eligibleGift.minAmount} درهم` : 'Cadeau de bienvenue'}</p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Section Coupon */}
                        <div className="pt-6 sm:pt-10 border-t border-gray-50">
                            <p className="text-[10px] rtl:text-sm font-black uppercase text-gray-400 tracking-[0.2em] rtl:tracking-normal mb-4 sm:mb-6">{t('PromotionalCode')}</p>
                            <CouponInput
                                cartTotal={subtotal}
                                onApplied={setCoupon}
                                onRemoved={() => setCoupon(null)}
                            />
                        </div>

                        {/* Totaux */}
                        <div className="space-y-4 sm:space-y-5 pt-6 sm:pt-10 border-t border-gray-50">
                            <div className="flex justify-between items-center text-[11px] rtl:text-sm font-black uppercase tracking-widest rtl:tracking-normal text-gray-400">
                                <span>{t('SelectionSummary')}</span>
                                <span className="text-black">{subtotal.toFixed(0)} {locale === 'ar' ? 'درهم' : 'MAD'}</span>
                            </div>
                            {discountAmount > 0 && (
                                <div className="flex justify-between items-center text-[11px] rtl:text-sm font-black uppercase tracking-widest rtl:tracking-normal text-pixio-pink bg-black px-4 py-3 rounded-2xl">
                                    <span className="flex items-center gap-2">
                                        <Ticket className="w-4 h-4" /> {t('CodeApplied')}
                                    </span>
                                    <span>-{discountAmount.toFixed(0)} {locale === 'ar' ? 'درهم' : 'MAD'}</span>
                                </div>
                            )}
                            {instantDiscount > 0 && (
                                <div className="flex justify-between items-center text-[11px] rtl:text-sm font-black uppercase tracking-widest rtl:tracking-normal text-green-800 bg-green-100 px-4 py-3 rounded-2xl">
                                    <span className="flex items-center gap-2">
                                        <Gift className="w-4 h-4" /> Offre Instantanée
                                    </span>
                                    <span>-{instantDiscount.toFixed(0)} {locale === 'ar' ? 'درهم' : 'MAD'}</span>
                                </div>
                            )}
                            {promo3for4Discount > 0 && (
                                <div className="flex justify-between items-center text-[11px] rtl:text-sm font-black uppercase tracking-widest rtl:tracking-normal text-rose-800 bg-rose-100 px-4 py-3 rounded-2xl">
                                    <span className="flex items-center gap-2">
                                        <Ticket className="w-4 h-4" /> {locale === 'ar' ? 'الكتاب الرابع مجاناً' : '4ème Livre Offert'}
                                    </span>
                                    <span>-{promo3for4Discount.toFixed(0)} {locale === 'ar' ? 'درهم' : 'MAD'}</span>
                                </div>
                            )}
                            <div className="flex justify-between items-center text-[11px] rtl:text-sm font-black uppercase tracking-widest rtl:tracking-normal text-gray-400">
                                <span>{isWorldwide ? t('WorldwideAmana') : t('DeliveryFee')}</span>
                                {shippingFee === 0 ? (
                                    <span className="text-black bg-pixio-yellow px-2 py-1 rounded-md">{t('Free')}</span>
                                ) : (
                                    <span className="text-black">{shippingFee} {locale === 'ar' ? 'درهم' : 'MAD'}</span>
                                )}
                            </div>
                            
                            {user?.credits && user.credits > 0 ? (
                                    <div className="flex items-center justify-between p-4 bg-amber-50 rounded-2xl border border-amber-100 mt-4">
                                        <div className="flex items-center gap-3">
                                            <Wallet className="w-6 h-6 text-amber-500" />
                                            <div>
                                                <p className="text-[10px] rtl:text-sm font-black uppercase tracking-widest rtl:tracking-normal text-amber-900">{locale === 'ar' ? 'استخدام الرصيد' : 'Utiliser mon solde'}</p>
                                                <p className="text-[10px] font-bold text-amber-600">{user.credits} {locale === 'ar' ? 'درهم' : 'MAD'} {locale === 'ar' ? 'متاح' : 'disponible'}</p>
                                            </div>
                                        </div>
                                    <label className="relative inline-flex items-center cursor-pointer">
                                        <input type="checkbox" className="sr-only peer" checked={useCredits} onChange={(e) => setUseCredits(e.target.checked)} />
                                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] rtl:after:right-[2px] rtl:after:left-auto after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-500"></div>
                                    </label>
                                </div>
                            ) : null}

                            {creditsToUse > 0 && (
                                <div className="flex justify-between items-center text-[11px] rtl:text-sm font-black uppercase tracking-widest rtl:tracking-normal text-amber-800 bg-amber-100 px-4 py-3 rounded-2xl mt-2">
                                    <span className="flex items-center gap-2">
                                        <Wallet className="w-4 h-4" /> {locale === 'ar' ? 'خصم الرصيد' : 'Solde appliqué'}
                                    </span>
                                    <span>-{creditsToUse.toFixed(0)} {locale === 'ar' ? 'درهم' : 'MAD'}</span>
                                </div>
                            )}

                            <div className="pt-6 border-t border-gray-50">
                                <p className="text-[10px] rtl:text-sm font-black uppercase text-gray-400 tracking-widest rtl:tracking-normal mb-1">{t('TotalAmount')}</p>
                                <div className="flex items-baseline justify-between">
                                    <p className="text-4xl font-black text-black tracking-tighter leading-none">{finalTotal.toFixed(0)}</p>
                                    <p className="text-[10px] rtl:text-sm font-black text-gray-400 uppercase tracking-widest rtl:tracking-normal">{locale === 'ar' ? 'درهم' : 'MAD'}</p>
                                </div>
                            </div>
                        </div>

                        {error && (
                            <div className="p-5 bg-black text-white rounded-[1.5rem] font-black text-[10px] uppercase tracking-widest text-center shadow-2xl">
                                {error}
                            </div>
                        )}

                        <button
                            form="checkout-form"
                            type="submit"
                            onClick={() => {
                                const formEl = document.getElementById('checkout-form') as HTMLFormElement | null
                                if (formEl && typeof formEl.requestSubmit === 'function') {
                                    formEl.requestSubmit()
                                } else {
                                    handleSubmit(onSubmit)()
                                }
                            }}
                            disabled={isSubmitting}
                            className="w-full bg-black text-white font-black py-6 rounded-full shadow-[0_20px_40px_rgba(0,0,0,0.2)] hover:bg-gray-800 active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center gap-3 uppercase tracking-[0.2em] text-xs rtl:text-lg rtl:tracking-normal animate-bounce-light"
                        >
                            {isSubmitting ? (
                                <>
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                    {t('Processing')}
                                </>
                            ) : (
                                <>
                                    {t('CompletePurchase')}
                                    <ArrowRight className="w-5 h-5 rtl:rotate-180" />
                                </>
                            )}
                        </button>

                        <div className="space-y-4 mt-6">
                            <div className="flex items-center gap-5 p-5 bg-pixio-cream/50 rounded-2xl border border-gray-50">
                                <Truck className="w-8 h-8 text-black shrink-0" />
                                <div>
                                    <p className="text-sm rtl:text-base font-black text-black uppercase tracking-widest rtl:tracking-normal leading-tight">{t('FastShippingTitle')}</p>
                                    <p className="text-xs text-gray-500 mt-1">{t('DeliveryMorocco')}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-5 p-5 bg-pixio-cream/50 rounded-2xl border border-gray-50">
                                <ShieldCheck className="w-8 h-8 text-black shrink-0" />
                                <div>
                                    <p className="text-sm rtl:text-base font-black text-black uppercase tracking-widest rtl:tracking-normal leading-tight">{t('SecurePaymentTitle')}</p>
                                    <p className="text-xs text-gray-500 mt-1">{t('CashOrCard')}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-5 p-5 bg-pixio-cream/50 rounded-2xl border border-gray-50">
                                <Headset className="w-8 h-8 text-black shrink-0" />
                                <div>
                                    <p className="text-sm rtl:text-base font-black text-black uppercase tracking-widest rtl:tracking-normal leading-tight">{t('CustomerServiceTitle')}</p>
                                    <p className="text-xs text-gray-500 mt-1">{t('WhatsAppSupport')}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Barre flottante mobile pour valider la commande immédiatement */}
            <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-gray-200 p-4 shadow-[0_-10px_25px_rgba(0,0,0,0.1)] flex items-center justify-between gap-4">
                <div>
                    <span className="text-[10px] font-black uppercase text-gray-400 tracking-wider block">{t('TotalAmount')}</span>
                    <span className="text-xl font-black text-black">{finalTotal.toFixed(0)} {locale === 'ar' ? 'درهم' : 'MAD'}</span>
                </div>
                <button
                    form="checkout-form"
                    type="submit"
                    onClick={() => {
                        const formEl = document.getElementById('checkout-form') as HTMLFormElement | null
                        if (formEl && typeof formEl.requestSubmit === 'function') {
                            formEl.requestSubmit()
                        } else {
                            handleSubmit(onSubmit)()
                        }
                    }}
                    disabled={isSubmitting}
                    className="flex-1 bg-black text-white font-black py-3.5 px-6 rounded-full shadow-lg hover:bg-gray-800 active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center gap-2 uppercase tracking-wider text-xs"
                >
                    {isSubmitting ? (
                        <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            <span>{t('Processing')}</span>
                        </>
                    ) : (
                        <>
                            <span>{t('CompletePurchase')}</span>
                            <ArrowRight className="w-4 h-4 rtl:rotate-180" />
                        </>
                    )}
                </button>
            </div>

            {/* Modal Banque Sélectionnée */}
            {selectedBankIndex !== null && paymentSettings?.bankTransferAccounts && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => setSelectedBankIndex(null)}>
                    <div className="bg-white rounded-3xl w-full max-w-md max-h-[90vh] overflow-y-auto custom-scrollbar shadow-2xl relative animate-in fade-in zoom-in duration-200" onClick={(e) => e.stopPropagation()}>
                        <button 
                            onClick={() => setSelectedBankIndex(null)}
                            className="absolute top-4 right-4 rtl:left-4 rtl:right-auto p-2 bg-slate-100 hover:bg-slate-200 rounded-full transition-colors z-10"
                        >
                            <X className="w-5 h-5 text-slate-500" />
                        </button>
                        
                        <div className="p-6 md:p-8">
                            <h3 className="text-xl font-black text-slate-900 mb-6 text-center">
                                {t('BankInfoModalTitle')}
                            </h3>
                            
                            <div className="space-y-6">
                                <div className="flex flex-col items-center justify-center gap-3">
                                    {paymentSettings.bankTransferAccounts[selectedBankIndex].logo ? (
                                        <div className="h-16 flex items-center justify-center">
                                            <img src={normalizeImage(paymentSettings.bankTransferAccounts[selectedBankIndex].logo)} alt={paymentSettings.bankTransferAccounts[selectedBankIndex].bankName} className="max-h-full object-contain" onError={(e) => (e.target as HTMLImageElement).style.display = 'none'} />
                                        </div>
                                    ) : (
                                        <>
                                            <Building2 className="w-12 h-12 text-teal-600" />
                                            <span className="text-lg font-black text-slate-800">{paymentSettings.bankTransferAccounts[selectedBankIndex].bankName}</span>
                                        </>
                                    )}
                                </div>
                                
                                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 space-y-3">
                                    <div>
                                        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">{t('AccountHolder')}</p>
                                        <p className="font-black text-slate-900">{paymentSettings.bankTransferAccounts[selectedBankIndex].accountName}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">{t('RibIban')}</p>
                                        <p className="font-mono font-black text-slate-900 tracking-wider text-sm md:text-base break-all select-all">{paymentSettings.bankTransferAccounts[selectedBankIndex].rib}</p>
                                    </div>
                                </div>
                                
                                {paymentSettings.bankTransferAccounts[selectedBankIndex].qrCode && (
                                    <div className="border-t border-slate-100 pt-6">
                                        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 text-center">{t('ScanToPay')}</p>
                                        <div className="flex justify-center">
                                            <div className="p-3 bg-white border border-slate-200 rounded-2xl shadow-sm">
                                                <img src={normalizeImage(paymentSettings.bankTransferAccounts[selectedBankIndex].qrCode)} alt="QR Code" className="w-48 h-48 object-contain" onError={(e) => (e.target as HTMLImageElement).style.display = 'none'} />
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                            
                            <div className="mt-8">
                                <button
                                    onClick={() => setSelectedBankIndex(null)}
                                    className="w-full py-4 bg-teal-600 text-white rounded-xl font-black tracking-widest text-sm uppercase hover:bg-teal-700 transition-colors"
                                >
                                    {t('Close')}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
