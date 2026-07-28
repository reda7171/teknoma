'use client'

import { useCartStore } from '@/store/cart'
import { normalizeImage } from '@/lib/utils'
import { useRouter } from '@/i18n/routing'
import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { createOrder } from '@/lib/actions/orders'
import { ArrowLeft, CheckCircle, Package, Truck, Wallet, Ticket, Loader2, ArrowRight } from 'lucide-react'
import { Link } from '@/i18n/routing'
import CouponInput from '@/components/CouponInput'
import { useTranslations, useLocale } from 'next-intl'
import { useUIStore } from '@/store/ui'
import { fbPixelEvents } from '@/lib/facebook-pixel'
import { getActiveGifts } from '@/lib/actions/gifts'
import { getWithYouCities } from '@/lib/actions/delivery'

interface CheckoutForm {
    firstName: string
    lastName: string
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
    paymentSettings
}: { 
    user?: { fullName?: string | null; email: string; image?: string | null } | null;
    minOrderAmount?: number;
    paymentSettings?: { stripeEnabled?: boolean; codEnabled?: boolean; paypalEnabled?: boolean; cmiEnabled?: boolean; bankTransferEnabled?: boolean; bankTransferAccounts?: { bankName: string; accountName: string; rib: string }[] }
}) {
    const router = useRouter()
    const { items, getTotalPrice, clearCart } = useCartStore()
    const { showNotification } = useUIStore()
    const [mounted, setMounted] = useState(false)
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [coupon, setCoupon] = useState<any>(null)
    const [gifts, setGifts] = useState<any[]>([])
    const t = useTranslations('Checkout')
    const locale = useLocale()

    // Pré-remplir le formulaire si l'utilisateur est connecté
    const defaultValues: Partial<CheckoutForm> = user ? {
        email: user.email,
        firstName: user.fullName?.split(' ')[0] || '',
        lastName: user.fullName?.split(' ').slice(1).join(' ') || '',
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

    const [abandonedCartId, setAbandonedCartId] = useState<string | null>(null)

    const saveAbandonedCart = async () => {
        const data = getValues()
        if (!data.phone && !data.email) return

        try {
            const res = await fetch('/api/abandoned-cart', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    id: abandonedCartId,
                    phone: data.phone,
                    email: data.email,
                    fullName: `${data.firstName || ''} ${data.lastName || ''}`.trim(),
                    items,
                    total: finalTotal
                })
            })
            const result = await res.json()
            if (result.success && result.id) {
                setAbandonedCartId(result.id)
            }
        } catch (e) {
            console.error('Failed to save abandoned cart', e)
        }
    }

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
        // Fetch active gifts
        getActiveGifts().then(setGifts)
        // Fetch cities from WithYou
        getWithYouCities().then(setAllCities)
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

    const [isSuccess, setIsSuccess] = useState(false)

    useEffect(() => {
        if (mounted && !isSuccess) {
            const currentSubtotal = getTotalPrice()
            const hasOnlyDigital = items.length > 0 && items.every(item => item.type === 'DIGITAL')
            const hasFreeShippingItem = items.some(item => item.shippingFees === 0)
            const shippingFee = (hasOnlyDigital || hasFreeShippingItem || currentSubtotal >= 500) ? 0 : 30
            let discountAmount = 0
            if (coupon) {
                if (coupon.type === 'PERCENTAGE') {
                    discountAmount = (currentSubtotal * coupon.discount) / 100
                } else {
                    discountAmount = coupon.discount
                }
            }
            const currentFinalTotal = Math.max(0, currentSubtotal - discountAmount + shippingFee)

            if (items.length === 0 || (minOrderAmount > 0 && currentFinalTotal < minOrderAmount)) {
                router.replace('/cart')
            }
        }
    }, [mounted, items, minOrderAmount, router, isSuccess, getTotalPrice, coupon])

    if (!mounted) return null

    if (items.length === 0) {
        return null
    }

    const subtotal = getTotalPrice()
    const hasOnlyDigital = items.length > 0 && items.every(item => item.type === 'DIGITAL')
    const hasFreeShippingItem = items.some(item => item.shippingFees === 0)
    const shippingFee = (hasOnlyDigital || hasFreeShippingItem || subtotal >= 500) ? 0 : 30

    let discountAmount = 0
    if (coupon) {
        if (coupon.type === 'PERCENTAGE') {
            discountAmount = (subtotal * coupon.discount) / 100
        } else {
            discountAmount = coupon.discount
        }
    }

    const finalTotal = Math.max(0, subtotal - discountAmount + shippingFee)

    // Sélectionner le meilleur cadeau éligible
    const eligibleGift = gifts
        .filter(g => g.minAmount <= subtotal)
        .sort((a, b) => b.minAmount - a.minAmount)[0]

    const onSubmit = async (data: CheckoutForm) => {
        setIsSubmitting(true)
        setError(null)
        fbPixelEvents.addPaymentInfo()

        if (minOrderAmount > 0 && finalTotal < minOrderAmount) {
            const minAmountMsg = locale === 'ar' 
                ? `الحد الأدنى للطلب هو ${minOrderAmount} درهم.` 
                : locale === 'en' 
                ? `The minimum order amount is ${minOrderAmount} MAD.` 
                : `Le montant minimum du panier pour commander est de ${minOrderAmount} MAD.`
                
            setError(minAmountMsg)
            showNotification(minAmountMsg, 'error')
            setIsSubmitting(false)
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
            const roulettePrize = localStorage.getItem('roulette_prize')
            if (roulettePrize && totalItems >= 4) {
                finalComment = finalComment 
                    ? `${finalComment}\n\n[Cadeau Roulette : ${roulettePrize}]` 
                    : `[Cadeau Roulette : ${roulettePrize}]`
            }

            const result = await createOrder({
                fullName: `${data.firstName} ${data.lastName}`,
                email: data.email,
                phone: data.phone,
                address: data.address,
                city: data.city,
                comment: finalComment,
                items: orderItems,
                couponCode: coupon?.code,
                discount: discountAmount,
                utmSource: localStorage.getItem('utm_source') || undefined,
                utmMedium: localStorage.getItem('utm_medium') || undefined,
                utmCampaign: localStorage.getItem('utm_campaign') || undefined,
                fbclid: localStorage.getItem('fbclid') || undefined,
                ttclid: localStorage.getItem('ttclid') || undefined,
                paymentMethod: data.paymentMethod,
            })

            if (result.success) {
                // Facebook Pixel: Purchase
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

                localStorage.removeItem('roulette_prize')
                localStorage.removeItem('roulette_closed')

                setIsSuccess(true)
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
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
            <Link
                href="/"
                className="inline-flex items-center text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-black mb-12 transition-colors group rtl:flex-row-reverse"
            >
                <ArrowLeft className="w-3 h-3 mr-2 transition-transform group-hover:-translate-x-1 rtl:ml-2 rtl:mr-0 rtl:rotate-180 rtl:group-hover:translate-x-1" />
                {t('BackToSelection')}
            </Link>

            <h1 className="text-5xl font-black text-black mb-16 tracking-tighter">{t('YourDetails')}<span className="text-gray-200">.</span></h1>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-16">
                {/* Formulaire Principal */}
                <div className="lg:col-span-2 space-y-12">
                    <form id="checkout-form" onSubmit={handleSubmit(onSubmit)} className="space-y-12">
                        <div className="bg-white rounded-[2.5rem] p-10 shadow-sm border border-gray-100">
                            <h2 className="text-2xl font-black text-black mb-10 flex items-center gap-4">
                                <div className="w-12 h-12 bg-black text-white rounded-2xl flex items-center justify-center text-sm shadow-xl">01</div>
                                {t('ShippingInfo')}
                            </h2>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
                                <div className="space-y-3">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">{t('FirstName')}</label>
                                    <input
                                        {...registerWithTracker('firstName', { required: t('Errors.FirstNameRequired') })}
                                        className="w-full px-6 py-5 bg-pixio-cream/50 border-2 border-transparent rounded-[1.5rem] focus:bg-white focus:border-black outline-none transition-all font-black text-black"
                                    />
                                    {errors.firstName && <p className="text-red-500 text-[10px] font-black uppercase mt-1 ml-1">{errors.firstName.message}</p>}
                                </div>
                                <div className="space-y-3">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">{t('LastName')}</label>
                                    <input
                                        {...registerWithTracker('lastName', { required: t('Errors.LastNameRequired') })}
                                        className="w-full px-6 py-5 bg-pixio-cream/50 border-2 border-transparent rounded-[1.5rem] focus:bg-white focus:border-black outline-none transition-all font-black text-black"
                                    />
                                    {errors.lastName && <p className="text-red-500 text-[10px] font-black uppercase mt-1 ml-1">{errors.lastName.message}</p>}
                                </div>
                            </div>

                            <div className="hidden">
                                <input
                                    {...register('email')}
                                    type="hidden"
                                />
                            </div>

                            <div className="space-y-3 mb-8">
                                <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">{t('MobileNumber')}</label>
                                <input
                                    {...registerWithTracker('phone', {
                                        required: t('Errors.PhoneRequired'),
                                        pattern: {
                                            value: /^(06|07|05)[0-9]{8}$/,
                                            message: t('Errors.PhoneInvalid')
                                        }
                                    })}
                                    className="w-full px-6 py-5 bg-pixio-cream/50 border-2 border-transparent rounded-[1.5rem] focus:bg-white focus:border-black outline-none transition-all font-black text-black"
                                />
                                {errors.phone && <p className="text-red-500 text-[10px] font-black uppercase mt-1 ml-1">{errors.phone.message}</p>}
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
                                <div className="space-y-3 relative city-suggestion-container">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">{t('City')}</label>
                                    <input
                                        {...registerWithTracker('city', { required: t('Errors.CityRequired') })}
                                        placeholder={t('ChooseCity')}
                                        autoComplete="off"
                                        onFocus={() => {
                                            if (watchedCity && filteredCities.length > 0) setShowCities(true)
                                        }}
                                        className="w-full px-6 py-5 bg-pixio-cream/50 border-2 border-transparent rounded-[1.5rem] focus:bg-white focus:border-black outline-none transition-all font-black text-black"
                                    />
                                    
                                    {showCities && (
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
                                        className="w-full px-6 py-5 bg-pixio-cream/50 border-2 border-transparent rounded-[1.5rem] focus:bg-white focus:border-black outline-none transition-all font-black text-black"
                                    />
                                    {errors.address && <p className="text-red-500 text-[10px] font-black uppercase mt-1 ml-1">{errors.address.message}</p>}
                                </div>
                            </div>

                            <div className="space-y-3">
                                <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">{t('NoteOptional')}</label>
                                <textarea
                                    {...register('comment')}
                                    className="w-full px-6 py-5 bg-pixio-cream/50 border-2 border-transparent rounded-[1.5rem] focus:bg-white focus:border-black outline-none transition-all font-black text-black min-h-[120px]"
                                />
                            </div>
                        </div>

                        <div className="bg-white rounded-[2.5rem] p-10 shadow-sm border border-gray-100">
                            <h2 className="text-2xl font-black text-black mb-10 flex items-center gap-4">
                                <div className="w-12 h-12 bg-black text-white rounded-2xl flex items-center justify-center text-sm shadow-xl">02</div>
                                {t('PaymentMethod')}
                            </h2>

                            {paymentSettings?.stripeEnabled && (
                                <label className={`flex items-center p-4 border rounded-2xl cursor-pointer transition-all ${watch('paymentMethod') === 'STRIPE' ? 'border-pixio-primary bg-amber-50' : 'border-pixio-border hover:border-pixio-primary'}`}>
                                    <input 
                                        type="radio" 
                                        value="STRIPE" 
                                        {...register('paymentMethod')}
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
                                        {...register('paymentMethod')}
                                        className="w-4 h-4 text-pixio-primary bg-white border-gray-300 focus:ring-pixio-primary"
                                    />
                                    <div className="ml-3 flex flex-col">
                                        <span className="font-bold text-pixio-dark">PayPal</span>
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
                                        {...register('paymentMethod')}
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
                                <label className={`relative flex items-center p-8 border-2 rounded-[2rem] cursor-pointer transition-all shadow-2xl shadow-black/5 ${watch('paymentMethod') === 'COD' ? 'border-black bg-pixio-cream/50' : 'border-transparent bg-pixio-cream/30 hover:border-black/50'}`}>
                                    <input 
                                        type="radio" 
                                        value="COD" 
                                        {...register('paymentMethod')}
                                        className="sr-only"
                                    />
                                    <div className="w-16 h-16 bg-white border border-gray-100 text-black rounded-2xl flex items-center justify-center shrink-0">
                                        <Wallet className="w-8 h-8" />
                                    </div>
                                    <div className="ml-8">
                                        <p className="font-black text-black text-xl tracking-tight">
                                            {hasOnlyDigital ? 'Paiement à distance (Virement/CashPlus)' : t('CashOnDelivery')}
                                        </p>
                                        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-1">
                                            {hasOnlyDigital ? 'Nous vous contacterons via WhatsApp pour le règlement.' : t('PayWhenReceive')}
                                        </p>
                                    </div>
                                    <div className="ml-auto rtl:mr-auto rtl:ml-0">
                                        <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${watch('paymentMethod') === 'COD' ? 'bg-black text-white' : 'bg-gray-200 text-gray-400'}`}>
                                            <CheckCircle className="w-5 h-5" />
                                        </div>
                                    </div>
                                </label>
                            )}

                            {paymentSettings?.bankTransferEnabled && (
                                <div>
                                    <label className={`relative flex items-center p-8 border-2 rounded-[2rem] cursor-pointer transition-all shadow-2xl shadow-black/5 ${watch('paymentMethod') === 'BANK_TRANSFER' ? 'border-teal-600 bg-teal-50/30' : 'border-transparent bg-pixio-cream/30 hover:border-teal-400'}`}>
                                        <input 
                                            type="radio" 
                                            value="BANK_TRANSFER" 
                                            {...register('paymentMethod')}
                                            className="sr-only"
                                        />
                                        <div className="w-16 h-16 bg-teal-50 border border-teal-100 text-teal-600 rounded-2xl flex items-center justify-center shrink-0">
                                            <svg xmlns="http://www.w3.org/2000/svg" className="w-8 h-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23"></line><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>
                                        </div>
                                        <div className="ml-8">
                                            <p className="font-black text-black text-xl tracking-tight">Virement Bancaire</p>
                                            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-1">Transférez le montant sur notre compte bancaire</p>
                                        </div>
                                        <div className="ml-auto rtl:mr-auto rtl:ml-0">
                                            <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${watch('paymentMethod') === 'BANK_TRANSFER' ? 'bg-teal-600 text-white' : 'bg-gray-200 text-gray-400'}`}>
                                                <CheckCircle className="w-5 h-5" />
                                            </div>
                                        </div>
                                    </label>

                                    {/* Coordonnées bancaires affichées si sélectionné */}
                                    {watch('paymentMethod') === 'BANK_TRANSFER' && paymentSettings?.bankTransferAccounts && paymentSettings.bankTransferAccounts.length > 0 && (
                                        <div className="mt-4 space-y-3">
                                            {paymentSettings.bankTransferAccounts.map((account, idx) => (
                                                <div key={idx} className="p-5 bg-teal-50 border border-teal-100 rounded-2xl">
                                                    <p className="text-xs font-black uppercase tracking-widest text-teal-600 mb-3">{account.bankName}</p>
                                                    <div className="space-y-1">
                                                        <p className="text-sm font-bold text-gray-700">Titulaire : <span className="font-black text-black">{account.accountName}</span></p>
                                                        <p className="text-sm font-bold text-gray-700">RIB / IBAN : <span className="font-mono font-black text-black tracking-wider">{account.rib}</span></p>
                                                    </div>
                                                </div>
                                            ))}
                                            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest px-1">Votre commande sera traitée après confirmation du virement.</p>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </form>
                </div>

                {/* Résumé Panier & Code Promo */}
                <div className="lg:col-span-1">
                    <div className="bg-white rounded-[2.5rem] p-10 shadow-xl border border-gray-100 sticky top-24 space-y-10">
                        <div>
                            <h2 className="text-xl font-black text-black tracking-tight mb-8">{t('SelectionSummary')}</h2>
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
                                            <p className="text-[10px] font-black text-gray-300 uppercase tracking-widest mt-2">{item.price} MAD</p>
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
                                            <p className="text-[10px] font-black text-indigo-300 uppercase tracking-widest mt-2">{eligibleGift.minAmount > 0 ? `Palier: ${eligibleGift.minAmount} MAD` : 'Cadeau de bienvenue'}</p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Section Coupon */}
                        <div className="pt-10 border-t border-gray-50">
                            <p className="text-[10px] rtl:text-sm font-black uppercase text-gray-400 tracking-[0.2em] rtl:tracking-normal mb-6">{t('PromotionalCode')}</p>
                            <CouponInput
                                cartTotal={subtotal}
                                onApplied={setCoupon}
                                onRemoved={() => setCoupon(null)}
                            />
                        </div>

                        {/* Totaux */}
                        <div className="space-y-5 pt-10 border-t border-gray-50">
                            <div className="flex justify-between items-center text-[11px] rtl:text-sm font-black uppercase tracking-widest rtl:tracking-normal text-gray-400">
                                <span>{t('SelectionSummary')}</span>
                                <span className="text-black">{subtotal.toFixed(0)} MAD</span>
                            </div>
                            {discountAmount > 0 && (
                                <div className="flex justify-between items-center text-[11px] rtl:text-sm font-black uppercase tracking-widest rtl:tracking-normal text-pixio-pink bg-black px-4 py-3 rounded-2xl">
                                    <span className="flex items-center gap-2">
                                        <Ticket className="w-4 h-4" /> {t('CodeApplied')}
                                    </span>
                                    <span>-{discountAmount.toFixed(0)} MAD</span>
                                </div>
                            )}
                            <div className="flex justify-between items-center text-[11px] rtl:text-sm font-black uppercase tracking-widest rtl:tracking-normal text-gray-400">
                                <span>{t('DeliveryFee')}</span>
                                {shippingFee === 0 ? (
                                    <span className="text-black bg-pixio-yellow px-2 py-1 rounded-md">{t('Free')}</span>
                                ) : (
                                    <span className="text-black">{shippingFee} MAD</span>
                                )}
                            </div>
                            <div className="pt-6 border-t border-gray-50">
                                <p className="text-[10px] rtl:text-sm font-black uppercase text-gray-400 tracking-widest rtl:tracking-normal mb-1">{t('TotalAmount')}</p>
                                <div className="flex items-baseline justify-between">
                                    <p className="text-4xl font-black text-black tracking-tighter leading-none">{finalTotal.toFixed(0)}</p>
                                    <p className="text-[10px] rtl:text-sm font-black text-gray-400 uppercase tracking-widest rtl:tracking-normal">MAD</p>
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
                            disabled={isSubmitting}
                            className="w-full bg-black text-white font-black py-6 rounded-full shadow-[0_20px_40px_rgba(0,0,0,0.2)] hover:bg-gray-800 active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center gap-3 uppercase tracking-[0.2em] text-xs"
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

                        <div className="flex items-center gap-4 p-5 bg-pixio-cream/50 rounded-[1.5rem] border border-gray-50">
                            <Truck className="w-5 h-5 text-black" />
                            <p className="text-[9px] rtl:text-xs font-black text-black/40 uppercase tracking-widest rtl:tracking-normal leading-loose rtl:leading-relaxed" dangerouslySetInnerHTML={{ __html: t.raw('FastDelivery') }} />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
