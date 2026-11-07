'use client'

import React, { Component, ReactNode, useState } from 'react'
import { AlertCircle, RotateCcw, ShoppingBag, ShieldCheck, ArrowLeft } from 'lucide-react'
import { useCartStore } from '@/store/cart'
import { useTranslations, useLocale } from 'next-intl'
import { Link } from '@/i18n/routing'
import Image from 'next/image'

interface Props {
    children: ReactNode
    fallback?: ReactNode
}

interface State {
    hasError: boolean
    error: Error | null
    retryCount: number
}

function CheckoutErrorFallback({
    error,
    onReset
}: {
    error: Error | null
    onReset: () => void
}) {
    const t = useTranslations('Checkout')
    const locale = useLocale()
    const { items, getTotalPrice, getTotalItems } = useCartStore()
    const totalItems = getTotalItems()
    const totalPrice = getTotalPrice()
    const [isReloading, setIsReloading] = useState(false)

    const handleReload = () => {
        setIsReloading(true)
        try {
            onReset()
        } finally {
            // Si après réinitialisation l'erreur persiste, recharger la page proprement
            setTimeout(() => {
                if (typeof window !== 'undefined') {
                    window.location.reload()
                }
            }, 300)
        }
    }

    return (
        <div className="max-w-4xl mx-auto px-4 py-12 md:py-16">
            <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-2xl shadow-black/5 p-6 sm:p-10 md:p-12 text-center">
                {/* Badge Panier Sécurisé */}
                <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-black uppercase tracking-wider mb-6">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    <ShieldCheck className="w-4 h-4 text-emerald-600" />
                    <span>{t('CartPreservedBadge')}</span>
                </div>

                {/* Icône et Titre */}
                <div className="w-16 h-16 sm:w-20 sm:h-20 bg-amber-50 text-amber-600 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-sm border border-amber-100">
                    <AlertCircle className="w-8 h-8 sm:w-10 sm:h-10" />
                </div>

                <h1 className="text-2xl sm:text-3xl md:text-4xl font-black text-slate-900 tracking-tight mb-3">
                    {t('CheckoutErrorTitle')}
                </h1>

                <p className="text-gray-500 font-medium text-sm sm:text-base max-w-xl mx-auto mb-8 leading-relaxed">
                    {t('CheckoutErrorDesc')}
                </p>

                {/* Récapitulatif visuel des articles préservés */}
                {items.length > 0 && (
                    <div className="bg-slate-50/80 border border-slate-200/80 rounded-2xl p-4 sm:p-6 mb-8 text-left max-w-xl mx-auto">
                        <div className="flex items-center justify-between pb-3 border-b border-slate-200/60 mb-4">
                            <span className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
                                <ShoppingBag className="w-4 h-4 text-black" />
                                {t('ItemsInCart', { count: totalItems })}
                            </span>
                            <span className="text-sm font-black text-slate-900">
                                {totalPrice} DH
                            </span>
                        </div>

                        <div className="space-y-2.5 max-h-48 overflow-y-auto pr-1">
                            {items.map((item) => (
                                <div key={item.id} className="flex items-center justify-between text-xs py-1">
                                    <div className="flex items-center gap-2.5 min-w-0 pr-2">
                                        {item.image && (
                                            <div className="w-8 h-10 relative rounded bg-gray-100 shrink-0 overflow-hidden">
                                                <Image
                                                    src={item.image}
                                                    alt={item.title}
                                                    fill
                                                    sizes="32px"
                                                    className="object-cover"
                                                />
                                            </div>
                                        )}
                                        <span className="font-bold text-slate-800 truncate">
                                            {item.title}
                                        </span>
                                        <span className="text-gray-400 font-mono">
                                            ×{item.quantity}
                                        </span>
                                    </div>
                                    <span className="font-bold text-slate-900 shrink-0">
                                        {item.price * item.quantity} DH
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Boutons d'action */}
                <div className="flex flex-col sm:flex-row items-center justify-center gap-3.5 max-w-md mx-auto">
                    <button
                        type="button"
                        onClick={handleReload}
                        disabled={isReloading}
                        className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-4 bg-black text-white font-black text-sm rounded-2xl hover:bg-slate-800 transition-all shadow-lg shadow-black/10 active:scale-95 disabled:opacity-50"
                    >
                        <RotateCcw className={`w-4 h-4 ${isReloading ? 'animate-spin' : ''}`} />
                        <span>{t('ReloadOrder')}</span>
                    </button>

                    <Link
                        href="/cart"
                        className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-4 bg-white border-2 border-slate-200 text-slate-900 font-bold text-sm rounded-2xl hover:bg-slate-50 transition-all shadow-sm active:scale-95"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        <span>{t('BackToCart')}</span>
                    </Link>
                </div>
            </div>
        </div>
    )
}

export default class CheckoutErrorBoundary extends Component<Props, State> {
    constructor(props: Props) {
        super(props)
        this.state = {
            hasError: false,
            error: null,
            retryCount: 0
        }
    }

    static getDerivedStateFromError(error: Error): Partial<State> {
        return {
            hasError: true,
            error
        }
    }

    componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
        // Enregistrement silencieux ou monitoring sans perturber l'expérience utilisateur
        if (process.env.NODE_ENV === 'development') {
            console.error('[CheckoutErrorBoundary] Erreur interceptée dans le tunnel de commande:', error, errorInfo)
        }
    }

    handleReset = () => {
        this.setState(prev => ({
            hasError: false,
            error: null,
            retryCount: prev.retryCount + 1
        }))
    }

    render() {
        if (this.state.hasError) {
            if (this.props.fallback) {
                return this.props.fallback
            }
            return (
                <CheckoutErrorFallback
                    error={this.state.error}
                    onReset={this.handleReset}
                />
            )
        }

        return this.props.children
    }
}

export { CheckoutErrorFallback }

