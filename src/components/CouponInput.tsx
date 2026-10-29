'use client'

import { useState, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { validateCoupon } from '@/lib/actions/coupons'
import { Ticket, X, Check, Loader2 } from 'lucide-react'

interface CouponInputProps {
    cartTotal: number
    onApplied: (coupon: any) => void
    onRemoved: () => void
}

export default function CouponInput({ cartTotal, onApplied, onRemoved }: CouponInputProps) {
    const t = useTranslations('Checkout')
    const [code, setCode] = useState('')
    const [isLoading, setIsLoading] = useState(false)
    const [appliedCoupon, setAppliedCoupon] = useState<any>(null)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        try {
            const pending = localStorage.getItem('petsunivers_pending_coupon')
            if (pending && cartTotal > 0 && !appliedCoupon) {
                validateCoupon(pending, cartTotal).then((res) => {
                    if (res.success) {
                        setAppliedCoupon(res.coupon)
                        onApplied(res.coupon)
                    }
                }).catch(() => {})
            }
        } catch {}
    }, [cartTotal, onApplied])

    const handleApply = async () => {
        if (!code.trim()) return
        setIsLoading(true)
        setError(null)

        try {
            const res = await validateCoupon(code, cartTotal)
            if (res.success) {
                setAppliedCoupon(res.coupon)
                onApplied(res.coupon)
                setCode('')
            } else {
                setError(res.error || t('UnknownError'))
            }
        } catch (e) {
            setError(t('GenericError'))
        } finally {
            setIsLoading(false)
        }
    }

    const handleRemove = () => {
        setAppliedCoupon(null)
        onRemoved()
    }

    if (appliedCoupon) {
        return (
            <div className="bg-blue-50 border-2 border-blue-200 p-4 rounded-xl flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="bg-blue-600 text-white p-2 rounded-lg">
                        <Ticket className="w-5 h-5" />
                    </div>
                    <div>
                        <p className="text-sm font-black text-blue-900 uppercase">{appliedCoupon.code}</p>
                        <p className="text-xs text-blue-600 font-bold">
                            {/* Réduction appliquée */}
                            {appliedCoupon.type === 'PERCENTAGE' ? `${appliedCoupon.discount}%` : `${appliedCoupon.discount} درهم`}
                        </p>
                    </div>
                </div>
                <button aria-label="Fermer"
                    onClick={handleRemove}
                    className="p-1 hover:bg-blue-100 rounded-full text-blue-600 transition-colors"
                >
                    <X className="w-5 h-5" />
                </button>
            </div>
        )
    }

    return (
        <div className="space-y-2">
            <div className="flex gap-2">
                <div className="relative flex-1">
                    <Ticket className="absolute left-3 rtl:left-auto rtl:right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                        value={code}
                        onChange={(e) => setCode(e.target.value.toUpperCase())}
                        placeholder={t('PromoCodePlaceholder')}
                        className="w-full pl-10 rtl:pl-4 rtl:pr-10 pr-4 py-3 bg-gray-100 border-2 border-transparent rounded-xl font-black focus:border-blue-500 focus:bg-white outline-none transition-all uppercase placeholder:font-bold placeholder:text-gray-400 text-sm"
                        disabled={isLoading}
                    />
                </div>
                <button
                    onClick={handleApply}
                    disabled={isLoading || !code}
                    className="bg-gray-900 text-white px-6 py-3 rounded-xl font-black text-sm uppercase hover:bg-blue-600 transition-all disabled:opacity-50 flex items-center gap-2"
                >
                    {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                    {t('Apply')}
                </button>
            </div>
            {error && <p className="text-xs text-red-600 font-bold italic ml-2">⚠️ {error}</p>}
        </div>
    )
}
