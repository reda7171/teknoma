'use client'

import { useCartStore } from '@/store/cart'
import Image from 'next/image'
import { Link } from '@/i18n/routing'
import { notifyRemoveFromCart, notifyClearCart, notifyCheckoutInitiated } from '@/lib/actions/cart-notify'
import { withExponentialRetry } from '@/lib/retry'

import { ArrowRight, Minus, Plus, Trash2, ShoppingCart, Shield, Truck, AlertCircle, Sparkles } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useTranslations, useLocale } from 'next-intl'
import { normalizeImage } from '@/lib/utils'
import AddToCartButton from '@/components/AddToCartButton'
import ImageWithFallback from '@/components/ImageWithFallback'
import { calculate3For4Discount } from '@/lib/utils'

interface CartClientProps {
    minOrderAmount?: number
    recommendedBooks?: any[]
    is3For4Active?: boolean
}

const formatPrice = (value: number) => Math.round(Number(value) || 0).toString()

export default function CartClient({ minOrderAmount = 0, recommendedBooks = [], is3For4Active = false }: CartClientProps) {
    const { items, removeItem, updateQuantity, getTotalPrice, getTotalItems, clearCart, sessionId } = useCartStore()
    const [mounted, setMounted] = useState(false)
    const t = useTranslations('CartPage')
    const locale = useLocale()

    const handleRemove = async (item: any) => {
        removeItem(item.id)
        try {
            const newTotal = useCartStore.getState().getTotalPrice()
            await withExponentialRetry(
                () => notifyRemoveFromCart(item.title, item.price, item.type, newTotal, sessionId || undefined),
                { maxRetries: 2, baseDelayMs: 300 }
            )
        } catch (error) {
            console.error('Erreur notification', error)
        }
    }

    const handleCheckoutClick = () => {
        const value = getTotalPrice()
        const count = getTotalItems()
        withExponentialRetry(
            () => notifyCheckoutInitiated(value, count, sessionId || undefined),
            { maxRetries: 2, baseDelayMs: 300 }
        ).catch(console.error)
    }

    const handleClearCart = async () => {
        const value = getTotalPrice()
        const count = getTotalItems()
        clearCart()
        try {
            if (count > 0) {
                await withExponentialRetry(
                    () => notifyClearCart(value, count, sessionId || undefined),
                    { maxRetries: 2, baseDelayMs: 300 }
                )
            }
        } catch (error) {
            console.error('Erreur notification', error)
        }
    }

    useEffect(() => {
        setMounted(true)
    }, [])

    if (!mounted) return null

    const totalPrice = getTotalPrice()
    const totalItems = getTotalItems()

    const promo3for4Discount = is3For4Active ? calculate3For4Discount(items) : 0
    const finalTotal = Math.max(0, totalPrice - promo3for4Discount)

    const isMinAmountReached = finalTotal >= minOrderAmount

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-10 md:py-20 pb-24 sm:pb-32 md:pb-40">
            <div className="flex items-center justify-between mb-6 sm:mb-10 px-1 sm:px-2">
                <h1 className="text-3xl sm:text-4xl font-sans font-black tracking-tight text-[#1A1C1F] flex items-center gap-3">
                    {t('Title')}<span className="text-[#75C300]">.</span>
                </h1>
                <div className="text-xs font-bold uppercase tracking-wider text-gray-500 bg-white border border-gray-200 px-3.5 py-1.5 rounded-full">
                    {t('CollectionCount', { count: totalItems })}
                </div>
            </div>

            {items.length === 0 ? (
                <div className="bg-white rounded-3xl p-8 sm:p-16 text-center border border-gray-200 shadow-sm mx-auto max-w-xl">
                    <div className="w-20 h-20 bg-gray-50 rounded-2xl flex items-center justify-center mx-auto mb-6 text-gray-400">
                        <ShoppingCart className="w-10 h-10" />
                    </div>
                    <h2 className="text-2xl sm:text-3xl font-sans font-black mb-3 tracking-tight text-[#1A1C1F]">{t('EmptyTitle')}</h2>
                    <p className="text-xs sm:text-sm text-gray-500 mb-8 max-w-md mx-auto leading-relaxed">
                        {t('EmptyDesc')}
                    </p>
                    <div className="flex justify-center">
                        <Link
                            href="/products"
                            className="inline-flex items-center gap-2 rounded-full bg-[#75C300] px-7 py-3.5 text-xs font-bold text-[#1A1C1F] shadow-sm hover:bg-[#68ad00] transition-colors"
                        >
                            {t('BrowseLibrary')}
                        </Link>
                    </div>
                </div>
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Cart Items */}
                    <div className="lg:col-span-2 space-y-4">
                        {items.map((item) => (
                            <div
                                key={item.id}
                                className="bg-white rounded-2xl p-4 sm:p-5 border border-gray-200 shadow-xs hover:border-gray-300 transition-all flex flex-col sm:flex-row gap-4 sm:gap-6 group"
                            >
                                {/* Image */}
                                <div className="relative w-24 h-24 sm:w-28 sm:h-28 flex-shrink-0 bg-gray-50 rounded-xl overflow-hidden border border-gray-100 p-2 mx-auto sm:mx-0">
                                    <Image
                                        src={normalizeImage(item.image)}
                                        alt={item.title}
                                        fill
                                        className="object-contain"
                                        unoptimized
                                    />
                                    {item.type === 'PACK' && (
                                        <div className="absolute top-2 left-2">
                                            <span className="px-2 py-0.5 bg-black text-white text-[8px] font-black uppercase tracking-wider rounded-md">
                                                {t('BundleBadge')}
                                            </span>
                                        </div>
                                    )}
                                </div>

                                {/* Content */}
                                <div className="flex-1 flex flex-col justify-between min-w-0">
                                    <div>
                                        <div className="flex flex-col sm:flex-row justify-between items-start gap-2 mb-2">
                                            <h3 className="text-sm sm:text-base font-bold text-[#1A1C1F] leading-snug line-clamp-2">
                                                {item.title}
                                            </h3>
                                            <p className="text-base sm:text-lg font-black text-[#1A1C1F] whitespace-nowrap">
                                                {formatPrice(item.price * item.quantity)} {locale === 'ar' ? 'درهم' : 'MAD'}
                                            </p>
                                        </div>

                                        <div className="flex items-center gap-2 mb-4 flex-wrap">
                                            <span className="text-[11px] font-semibold text-gray-500 bg-gray-100 px-2.5 py-0.5 rounded-md">
                                                {formatPrice(item.price)} {locale === 'ar' ? 'درهم' : 'MAD'} / {t('ItemUnit')}
                                            </span>
                                            {item.booksCount && (
                                                <span className="text-[10px] font-medium text-gray-400">
                                                    {t('VolumesIncluded', { count: item.booksCount })}
                                                </span>
                                            )}
                                        </div>

                                        {item.replacedBooks && Object.keys(item.replacedBooks).length > 0 && (
                                            <div className="mb-4 p-3 bg-gray-50 rounded-xl border border-gray-100">
                                                <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider mb-1.5">Produits remplacés :</p>
                                                <ul className="space-y-1">
                                                    {Object.values(item.replacedBooks).map((rb) => (
                                                        <li key={rb.id} className="text-xs text-black font-semibold flex items-center gap-2">
                                                            <div className="w-1.5 h-1.5 bg-[#75C300] rounded-full" />
                                                            {rb.title}
                                                        </li>
                                                    ))}
                                                </ul>
                                            </div>
                                        )}
                                    </div>

                                    {/* Actions: Quantity + Delete */}
                                    <div className="flex items-center justify-between gap-4 pt-3 border-t border-gray-100">
                                        <div className="inline-flex items-center rounded-xl border border-gray-200 bg-gray-50 p-1">
                                            <button
                                                type="button"
                                                onClick={() => updateQuantity(item.id, item.quantity - 1)}
                                                className="flex h-7 w-7 items-center justify-center rounded-lg bg-white text-gray-700 shadow-xs hover:bg-[#1A1C1F] hover:text-white transition-all active:scale-95"
                                                aria-label="Diminuer la quantité"
                                            >
                                                <Minus className="w-3 h-3" />
                                            </button>
                                            <span className="w-8 text-center text-xs font-bold text-[#1A1C1F]">
                                                {item.quantity}
                                            </span>
                                            <button
                                                type="button"
                                                onClick={() => updateQuantity(item.id, item.quantity + 1)}
                                                className="flex h-7 w-7 items-center justify-center rounded-lg bg-white text-gray-700 shadow-xs hover:bg-[#1A1C1F] hover:text-white transition-all active:scale-95"
                                                aria-label="Augmenter la quantité"
                                            >
                                                <Plus className="w-3 h-3" />
                                            </button>
                                        </div>

                                        <button
                                            type="button"
                                            onClick={() => handleRemove(item)}
                                            className="inline-flex items-center gap-1.5 text-xs font-medium text-gray-400 hover:text-red-600 transition-colors py-1.5 px-3 rounded-lg hover:bg-red-50"
                                        >
                                            <Trash2 className="w-3.5 h-3.5" />
                                            <span>{t('DeleteItem')}</span>
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}

                        {/* Clean bottom bar */}
                        <div className="flex items-center justify-between pt-4 px-1">
                            <Link
                                href="/products"
                                className="inline-flex items-center gap-2 text-xs font-bold text-gray-600 hover:text-[#1976D2] transition-colors"
                            >
                                <span>← {t('ContinueShopping')}</span>
                            </Link>

                            <button
                                type="button"
                                onClick={handleClearCart}
                                className="inline-flex items-center gap-2 text-xs font-semibold text-gray-400 hover:text-red-600 transition-colors px-3 py-2 rounded-xl hover:bg-red-50"
                            >
                                <Trash2 className="w-3.5 h-3.5" />
                                <span>{t('ClearSelection')}</span>
                            </button>
                        </div>
                    </div>

                    {/* Summary */}
                    <div className="lg:col-span-1">
                        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-gray-200 shadow-sm sticky top-28">
                            <h2 className="text-xs font-black uppercase tracking-wider text-[#1A1C1F] pb-4 border-b border-gray-100">
                                {t('SummaryTitle')}
                            </h2>

                            <div className="space-y-3.5 py-5 border-b border-gray-100 text-xs">
                                <div className="flex justify-between items-center text-gray-600">
                                    <span className="font-medium">{t('Items')} ({totalItems})</span>
                                    <span className="font-bold text-[#1A1C1F]">{formatPrice(totalPrice)} {locale === 'ar' ? 'درهم' : 'MAD'}</span>
                                </div>
                                <div className="flex justify-between items-center text-gray-600">
                                    <span className="font-medium">{t('Shipping')}</span>
                                    <span className="font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded text-[11px]">
                                        Calculé à l'étape suivante
                                    </span>
                                </div>

                                {finalTotal < 500 && (
                                    <div className="mt-4 p-4 bg-gray-50 rounded-2xl border border-gray-100">
                                        <p
                                            className="text-[11px] font-medium text-gray-600 mb-2 leading-relaxed"
                                            dangerouslySetInnerHTML={{ __html: t.raw('FreeShippingAd').replace('{amount}', formatPrice(500 - finalTotal)) }}
                                        />
                                        <div className="w-full bg-gray-200 h-2 rounded-full overflow-hidden">
                                            <div
                                                className="bg-[#75C300] h-full rounded-full transition-all duration-500"
                                                style={{ width: `${Math.min(100, (finalTotal / 500) * 100)}%` }}
                                            />
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Total */}
                            <div className="py-5">
                                {promo3for4Discount > 0 && (
                                    <div className="flex justify-between items-baseline mb-2 text-rose-500 text-xs font-bold">
                                        <span>{locale === 'ar' ? 'الكتاب الرابع مجاناً' : '4ème Article Offert'}</span>
                                        <span>-{formatPrice(promo3for4Discount)} {locale === 'ar' ? 'درهم' : 'MAD'}</span>
                                    </div>
                                )}
                                <div className="flex justify-between items-baseline">
                                    <span className="text-xs font-bold uppercase tracking-wider text-gray-500">{t('TotalValue')}</span>
                                    <div className="text-right">
                                        <span className="text-3xl font-black text-[#1A1C1F] tracking-tight">
                                            {formatPrice(finalTotal)} <span className="text-base font-bold">{locale === 'ar' ? 'درهم' : 'MAD'}</span>
                                        </span>
                                        <p className="text-[10px] text-gray-400 mt-0.5">{t('TaxesNote')}</p>
                                    </div>
                                </div>
                            </div>

                            {minOrderAmount > 0 && !isMinAmountReached && (
                                <div className="mb-4 p-4 bg-red-50 rounded-2xl border border-red-100 flex items-start gap-3">
                                    <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                                    <p className="text-xs font-medium text-red-600">
                                        {t('MinOrderWarning', { min: minOrderAmount })}
                                    </p>
                                </div>
                            )}

                            {/* Checkout Button */}
                            <div className="mb-4">
                                {isMinAmountReached ? (
                                    <Link
                                        href="/checkout"
                                        onClick={handleCheckoutClick}
                                        className="w-full flex items-center justify-center gap-2.5 rounded-2xl bg-[#75C300] hover:bg-[#68ad00] text-[#1A1C1F] py-4 px-6 text-sm font-black uppercase tracking-wider shadow-sm hover:shadow-md transition-all active:scale-[0.98] group"
                                    >
                                        <span>{t('BeginCheckout')}</span>
                                        <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform rtl:rotate-180 rtl:group-hover:-translate-x-1" />
                                    </Link>
                                ) : (
                                    <div
                                        className="w-full flex items-center justify-center gap-2.5 rounded-2xl bg-gray-200 text-gray-400 py-4 px-6 text-sm font-bold uppercase tracking-wider cursor-not-allowed"
                                    >
                                        <span>{t('BeginCheckout')}</span>
                                    </div>
                                )}
                            </div>

                            <div className="pt-4 border-t border-gray-100 flex items-center justify-center gap-6 text-gray-400 text-xs">
                                <div className="flex items-center gap-1.5">
                                    <Shield className="w-3.5 h-3.5 text-[#75C300]" />
                                    <span className="text-[11px] font-semibold text-gray-600">{t('Secure')}</span>
                                </div>
                                <div className="flex items-center gap-1.5">
                                    <Truck className="w-3.5 h-3.5 text-[#1976D2]" />
                                    <span className="text-[11px] font-semibold text-gray-600">{t('FastShip')}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Recommendations Section */}
            {recommendedBooks.length > 0 && (
                <div className="mt-32">
                    <div className="flex flex-col md:flex-row items-end justify-between mb-16 gap-8 px-4">
                        <div className="space-y-4">
                            <div className="inline-flex items-center gap-2 px-4 py-2 bg-black text-white rounded-full">
                                <Sparkles className="w-4 h-4 text-pixio-yellow" />
                                <span className="text-[10px] rtl:text-sm rtl:tracking-normal font-black uppercase tracking-[0.3em]">{t('RecommendedForYou')}</span>
                            </div>
                            <h2 className="text-4xl md:text-6xl font-black text-black tracking-tighter rtl:tracking-normal">
                                {t('CompleteYourCollection')}<span className="text-gray-500">.</span>
                            </h2>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10">
                        {recommendedBooks
                            .filter(book => !items.some(item => item.id === book.id))
                            .slice(0, 4)
                            .map((book) => (
                                <div key={book.id} className="group relative bg-white rounded-[2.5rem] p-6 overflow-hidden hover:shadow-2xl transition-all duration-500 border border-gray-100 flex flex-col h-full">
                                    <Link aria-label={book.title} href={`/books/${book.id}`} className="relative aspect-[3/4] overflow-hidden rounded-[2rem] mb-8 block">
                                        <ImageWithFallback
                                            src={book.image}
                                            alt={book.title}
                                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                                        />
                                    </Link>
                                    <div className="flex-grow flex flex-col">
                                        <h3 className="text-lg font-black text-black leading-tight mb-2 line-clamp-1">
                                            {book.title}
                                        </h3>
                                        <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-6">
                                            {book.author}
                                        </p>
                                        <div className="mt-auto flex items-center justify-between gap-4 pt-6 border-t border-gray-50">
                                            <span className="text-xl font-black text-black">{book.price} {locale === 'ar' ? 'درهم' : 'MAD'}</span>
                                            <AddToCartButton
                                                product={{
                                                    id: book.id,
                                                    title: book.title,
                                                    price: book.price,
                                                    image: book.image,
                                                    type: 'BOOK'
                                                }}
                                                showIcon={false}
                                                className="!px-6 !py-3 !w-auto !rounded-xl text-[9px] uppercase font-black"
                                            />
                                        </div>
                                    </div>
                                </div>
                            ))}
                    </div>
                </div>
            )}
            {/* Fixed Mobile Checkout Area */}
            <div className="md:hidden fixed bottom-0 left-0 right-0 z-[150] pb-safe">
                {minOrderAmount > 0 && !isMinAmountReached && (
                    <div className="bg-red-50 border-t border-red-100 px-4 py-3 flex items-center gap-3 shadow-lg">
                        <AlertCircle className="w-6 h-6 text-red-500 shrink-0" />
                        <p className="text-[10px] rtl:text-xs font-bold text-red-700 leading-tight">
                            Le montant minimum de commande est de {minOrderAmount} {locale === 'ar' ? 'درهم' : 'MAD'}. Veuillez ajouter plus d'articles pour continuer.
                        </p>
                    </div>
                )}
                <div className="bg-white border-t border-gray-100 p-4 shadow-[0_-10px_40px_rgba(0,0,0,0.05)] flex items-center justify-between gap-4">
                    <div className="flex flex-col">
                        <span className="text-[10px] rtl:text-sm font-black uppercase tracking-widest text-gray-500">{t('TotalValue')}</span>
                        <span className="text-xl font-black">{formatPrice(totalPrice)} {locale === 'ar' ? 'درهم' : 'MAD'}</span>
                    </div>
                    <div className="flex-1">
                        {isMinAmountReached ? (
                            <Link
                                href="/checkout"
                                onClick={handleCheckoutClick}
                                className="w-full h-12 flex items-center justify-center gap-2 bg-[#75C300] hover:bg-[#68ad00] text-[#1A1C1F] text-xs font-black uppercase tracking-wider rounded-xl transition-all shadow-sm active:scale-95"
                            >
                                <span>{t('BeginCheckout')}</span>
                                <ArrowRight className="w-4 h-4 rtl:rotate-180" />
                            </Link>
                        ) : (
                            <div className="w-full h-12 flex items-center justify-center gap-2 bg-gray-200 text-gray-400 text-xs font-bold uppercase tracking-wider rounded-xl cursor-not-allowed">
                                <span>{t('BeginCheckout')}</span>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}
