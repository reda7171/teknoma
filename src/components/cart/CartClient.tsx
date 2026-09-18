'use client'

import { useCartStore } from '@/store/cart'
import Image from 'next/image'
import { Link } from '@/i18n/routing'
import { notifyRemoveFromCart, notifyClearCart, notifyCheckoutInitiated } from '@/lib/actions/cart-notify'
import CartBookmarksUpsell from '@/components/cart/CartBookmarksUpsell'
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

export default function CartClient({ minOrderAmount = 0, recommendedBooks = [], is3For4Active = false }: CartClientProps) {
    const { items, removeItem, updateQuantity, getTotalPrice, getTotalItems, clearCart, sessionId } = useCartStore()
    const [mounted, setMounted] = useState(false)
    const t = useTranslations('CartPage')
    const locale = useLocale()

    const handleRemove = async (item: any) => {
        removeItem(item.id)
        try {
            const newTotal = useCartStore.getState().getTotalPrice()
            await notifyRemoveFromCart(item.title, item.price, item.type, newTotal, sessionId || undefined)
        } catch (error) {
            console.error('Erreur notification', error)
        }
    }

    const handleCheckoutClick = () => {
        const value = getTotalPrice()
        const count = getTotalItems()
        notifyCheckoutInitiated(value, count, sessionId || undefined).catch(console.error)
    }

    const handleClearCart = async () => {
        const value = getTotalPrice()
        const count = getTotalItems()
        clearCart()
        try {
            if (count > 0) {
                await notifyClearCart(value, count, sessionId || undefined)
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
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-20 pb-20 sm:pb-40">
            <div className="flex items-center justify-between mb-8 sm:mb-16 px-2 sm:px-4">
                <h1 className="text-4xl sm:text-6xl font-black tracking-tighter flex items-center gap-4 sm:gap-6">
                    {t('Title')}<span className="text-gray-500">.</span>
                </h1>
                <div className="text-[9px] sm:text-[10px] rtl:text-sm font-black uppercase tracking-widest sm:tracking-[0.4em] text-gray-500">
                    {t('CollectionCount', { count: totalItems })}
                </div>
            </div>

            {items.length === 0 ? (
                <div className="bg-white rounded-3xl sm:rounded-[3rem] p-8 sm:p-16 md:p-32 text-center shadow-2xl shadow-black/5 border border-gray-100 mx-4 sm:mx-0">
                    <div className="w-24 h-24 sm:w-32 sm:h-32 bg-pixio-cream rounded-full flex items-center justify-center mx-auto mb-8 sm:mb-10 transition-transform hover:scale-110">
                        <ShoppingCart className="w-10 h-10 sm:w-12 sm:h-12 text-gray-500" />
                    </div>
                    <h2 className="text-3xl sm:text-4xl md:text-5xl font-black mb-4 sm:mb-6 tracking-tighter">{t('EmptyTitle')}<span className="text-gray-500">.</span></h2>
                    <p className="text-xs sm:text-sm md:text-base rtl:text-lg font-black uppercase tracking-widest rtl:tracking-normal text-gray-600 mb-10 sm:mb-16 max-w-md mx-auto leading-loose px-2">
                        {t('EmptyDesc')}
                    </p>
                    <div className="flex flex-col sm:flex-row gap-4 sm:gap-6 justify-center px-4 sm:px-0">
                        <Link
                            href="/books"
                            className="px-8 sm:px-12 py-5 sm:py-6 bg-black text-white text-[10px] sm:text-xs md:text-sm rtl:text-base font-black uppercase tracking-[0.2em] rtl:tracking-normal rounded-full hover:bg-gray-800 transition-all shadow-xl w-full sm:w-auto text-center"
                        >
                            {t('BrowseLibrary')}
                        </Link>
                        <Link
                            href="/packs"
                            className="px-8 sm:px-12 py-5 sm:py-6 bg-white text-black border-2 border-black/5 text-[10px] sm:text-xs md:text-sm rtl:text-base font-black uppercase tracking-[0.2em] rtl:tracking-normal rounded-full hover:border-black transition-all w-full sm:w-auto text-center"
                        >
                            {t('ViewBundles')}
                        </Link>
                    </div>
                </div>
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 sm:gap-16">
                    {/* Cart Items */}
                    <div className="lg:col-span-2 space-y-6 sm:space-y-8 px-4 sm:px-0">

                        {items.map((item) => (
                            <div
                                key={item.id}
                                className="bg-white rounded-3xl sm:rounded-[2.5rem] p-5 sm:p-8 border border-gray-100 shadow-sm hover:shadow-xl hover:shadow-black/5 transition-all flex flex-col sm:flex-row gap-6 sm:gap-10 group"
                            >
                                {/* Image */}
                                <div className="relative w-full sm:w-32 h-44 flex-shrink-0 bg-pixio-cream rounded-[2rem] overflow-hidden border border-gray-50 transition-transform group-hover:scale-105">
                                    <Image
                                        src={normalizeImage(item.image)}
                                        alt={item.title}
                                        fill
                                        className="object-cover"
                                        unoptimized
                                    />
                                    {item.type === 'PACK' && (
                                        <div className="absolute top-3 left-3">
                                            <span className="px-3 py-1 bg-black text-white text-[8px] font-black uppercase tracking-widest rounded-full">
                                                {t('BundleBadge')}
                                            </span>
                                        </div>
                                    )}
                                </div>

                                {/* Content */}
                                <div className="flex-1 flex flex-col justify-between py-2">
                                    <div>
                                        <div className="flex flex-col sm:flex-row justify-between items-start gap-2 sm:gap-6 mb-4">
                                            <h3 className="text-lg sm:text-xl font-black tracking-tighter uppercase leading-tight group-hover:text-gray-600 transition-colors">
                                                {item.title}
                                            </h3>
                                            <p className="text-lg sm:text-xl font-black tracking-tighter whitespace-nowrap">
                                                {item.price * item.quantity} {locale === 'ar' ? 'درهم' : 'MAD'}
                                            </p>
                                        </div>
                                        <div className="flex items-center gap-4 mb-8">
                                            <span className="text-[10px] rtl:text-sm font-black uppercase tracking-widest bg-pixio-cream px-4 py-2 rounded-xl text-black">
                                                {item.price} {locale === 'ar' ? 'درهم' : 'MAD'} / {t('ItemUnit')}
                                            </span>
                                            {item.booksCount && (
                                                <span className="text-[9px] rtl:text-sm font-black uppercase tracking-widest text-gray-500">
                                                    {t('VolumesIncluded', { count: item.booksCount })}
                                                </span>
                                            )}
                                        </div>
                                        {item.replacedBooks && Object.keys(item.replacedBooks).length > 0 && (
                                            <div className="mb-6 p-4 bg-gray-50 rounded-2xl border border-gray-100">
                                                <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mb-2">Livres remplacés :</p>
                                                <ul className="space-y-2">
                                                    {Object.values(item.replacedBooks).map((rb) => (
                                                        <li key={rb.id} className="text-xs text-black font-black flex items-center gap-3">
                                                            <div className="w-1.5 h-1.5 bg-black rounded-full" />
                                                            {rb.title}
                                                        </li>
                                                    ))}
                                                </ul>
                                            </div>
                                        )}
                                    </div>

                                    <div className="flex flex-wrap sm:flex-nowrap items-center justify-between gap-4 mt-4 sm:mt-0">
                                        <div className="flex items-center gap-4 bg-pixio-cream p-2 rounded-2xl w-full sm:w-auto justify-between sm:justify-start">
                                            <button
                                                onClick={() => updateQuantity(item.id, item.quantity - 1)}
                                                className="w-10 h-10 flex items-center justify-center bg-white rounded-xl hover:bg-black hover:text-white transition-all shadow-sm active:scale-95"
                                                aria-label="Decrease quantity"
                                            >
                                                <Minus className="w-3 h-3" />
                                            </button>
                                            <span className="w-10 text-center text-xs font-black uppercase tracking-widest">
                                                {item.quantity}
                                            </span>
                                            <button
                                                onClick={() => updateQuantity(item.id, item.quantity + 1)}
                                                className="w-10 h-10 flex items-center justify-center bg-white rounded-xl hover:bg-black hover:text-white transition-all shadow-sm active:scale-95"
                                                aria-label="Increase quantity"
                                            >
                                                <Plus className="w-3 h-3" />
                                            </button>
                                        </div>

                                        <button
                                            onClick={() => handleRemove(item)}
                                            className="flex items-center justify-center gap-2 text-gray-500 hover:text-red-500 text-[10px] font-black uppercase tracking-widest px-6 py-3 transition-colors rounded-full hover:bg-red-50 bg-gray-50 sm:bg-transparent w-full sm:w-auto"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                            <span className="inline">{t('DeleteItem')}</span>
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}

                        <div className="flex justify-start pt-10">
                            <button
                                onClick={handleClearCart}
                                className="text-gray-500 hover:text-red-500 text-[10px] rtl:text-sm rtl:tracking-normal font-black uppercase tracking-[0.3em] flex items-center gap-4 px-8 py-4 transition-all rounded-full border border-gray-100 hover:border-red-100 hover:bg-red-50 bg-white shadow-sm"
                            >
                                <Trash2 className="w-4 h-4" />
                                {t('ClearSelection')}
                            </button>
                        </div>
                    </div>

                    {/* Summary */}
                    <div className="lg:col-span-1">
                        <CartBookmarksUpsell />
                        
                        <div className="bg-white rounded-3xl sm:rounded-[3rem] p-6 sm:p-12 shadow-2xl shadow-black/5 border border-gray-50 sticky top-32 mt-6 lg:mt-0">
                            <h2 className="text-sm rtl:text-xl font-black uppercase tracking-[0.3em] mb-6 sm:mb-10 pb-6 border-b border-gray-50">
                                {t('SummaryTitle')}
                            </h2>

                            <div className="space-y-6 mb-12">
                                <div className="flex justify-between items-center">
                                    <span className="text-[10px] rtl:text-sm font-black uppercase tracking-widest text-gray-500">{t('Items')} ({totalItems})</span>
                                    <span className="text-xs font-black uppercase tracking-widest">{totalPrice} {locale === 'ar' ? 'درهم' : 'MAD'}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-[10px] rtl:text-sm font-black uppercase tracking-widest text-gray-500">{t('Shipping')}</span>
                                    <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">Calculé à l'étape suivante</span>
                                </div>

                                {finalTotal < 500 && (
                                    <div className="bg-pixio-cream/50 p-8 rounded-[2rem] border border-gray-50">
                                        <p className="text-[9px] rtl:text-sm font-black uppercase tracking-widest text-gray-500 mb-6 leading-relaxed"
                                            dangerouslySetInnerHTML={{ __html: t.raw('FreeShippingAd').replace('{amount}', (500 - finalTotal).toString()) }} />
                                        <div className="w-full bg-white h-2 rounded-full overflow-hidden shadow-inner">
                                            <div
                                                className="bg-black h-full rounded-full transition-all duration-1000"
                                                style={{ width: `${(finalTotal / 500) * 100}%` }}
                                            />
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="border-t border-gray-50 pt-6 sm:pt-8 mb-8 sm:mb-12">
                                {promo3for4Discount > 0 && (
                                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-baseline mb-4 gap-2 text-rose-500">
                                        <span className="text-xs font-black uppercase tracking-[0.3em]">{locale === 'ar' ? 'الكتاب الرابع مجاناً' : '4ème Livre Offert'}</span>
                                        <span className="text-xl sm:text-2xl font-black tracking-tighter">-{promo3for4Discount} {locale === 'ar' ? 'درهم' : 'MAD'}</span>
                                    </div>
                                )}
                                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-baseline mb-2 gap-2">
                                    <span className="text-xs font-black uppercase tracking-[0.3em]">{t('TotalValue')}</span>
                                    <span className="text-4xl sm:text-5xl font-black tracking-tighter">{finalTotal} {locale === 'ar' ? 'درهم' : 'MAD'}</span>
                                </div>
                                <p className="text-[9px] font-black uppercase tracking-widest text-gray-500 text-left sm:text-right">{t('TaxesNote')}</p>
                            </div>

                            {minOrderAmount > 0 && !isMinAmountReached && (
                                <div className="mb-10 p-6 bg-red-50 rounded-3xl border border-red-100 flex items-start gap-4 animate-pulse">
                                    <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                                    <p className="text-[10px] rtl:text-sm font-black uppercase tracking-widest text-red-600 leading-relaxed">
                                        {t('MinOrderWarning', { min: minOrderAmount })}
                                    </p>
                                </div>
                            )}

                            <div className="hidden md:block">
                                {isMinAmountReached ? (
                                    <Link
                                        href="/checkout"
                                        onClick={handleCheckoutClick}
                                        className="w-full h-24 relative flex items-center justify-center bg-black text-white text-[12px] font-black uppercase tracking-[0.4em] rounded-full hover:bg-gray-800 transition-all shadow-2xl hover:shadow-black/20 group active:scale-95 mb-10"
                                    >
                                        <span className="text-center">{t('BeginCheckout')}</span>
                                        <ArrowRight className="absolute right-8 top-1/2 -translate-y-1/2 w-5 h-5 group-hover:translate-x-2 transition-transform rtl:left-8 rtl:right-auto rtl:rotate-180 rtl:group-hover:-translate-x-2" />
                                    </Link>
                                ) : (
                                    <div
                                        className="w-full h-24 relative flex items-center justify-center bg-gray-100 text-gray-500 text-[12px] font-black uppercase tracking-[0.4em] rounded-full cursor-not-allowed mb-10"
                                    >
                                        <span className="text-center">{t('BeginCheckout')}</span>
                                        <ArrowRight className="absolute right-8 top-1/2 -translate-y-1/2 w-5 h-5 rtl:left-8 rtl:right-auto rtl:rotate-180" />
                                    </div>
                                )}
                            </div>

                            <Link
                                href="/books"
                                className="w-full text-center block text-[10px] rtl:text-sm font-black uppercase tracking-[0.3em] text-gray-500 hover:text-black transition-colors"
                            >
                                {t('ContinueShopping')}
                            </Link>

                            <div className="mt-16 flex items-center justify-center gap-8 text-gray-500">
                                <div className="flex items-center gap-3 text-[8px] rtl:text-sm rtl:tracking-normal font-black uppercase tracking-[0.2em]">
                                    <Shield className="w-4 h-4" />
                                    {t('Secure')}
                                </div>
                                <div className="flex items-center gap-3 text-[8px] rtl:text-sm rtl:tracking-normal font-black uppercase tracking-[0.2em]">
                                    <Truck className="w-4 h-4" />
                                    {t('FastShip')}
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
                                    <Link aria-label="Action ImageWithFallback" href={`/books/${book.id}`} className="relative aspect-[3/4] overflow-hidden rounded-[2rem] mb-8 block">
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
            <div className="md:hidden fixed bottom-0 left-0 right-0 z-[60]">
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
                        <span className="text-xl font-black">{totalPrice} {locale === 'ar' ? 'درهم' : 'MAD'}</span>
                    </div>
                    <div className="flex-1">
                        {isMinAmountReached ? (
                            <Link
                                href="/checkout"
                                onClick={handleCheckoutClick}
                                className="w-full h-14 relative flex items-center justify-center bg-black text-white text-[10px] rtl:text-sm font-black uppercase tracking-[0.2em] rtl:tracking-normal rounded-full hover:bg-gray-800 transition-all shadow-xl active:scale-95"
                            >
                                <span>{t('BeginCheckout')}</span>
                                <ArrowRight className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 rtl:left-4 rtl:right-auto rtl:rotate-180" />
                            </Link>
                        ) : (
                            <div className="w-full h-14 relative flex items-center justify-center bg-gray-100 text-gray-500 text-[10px] rtl:text-sm font-black uppercase tracking-[0.2em] rtl:tracking-normal rounded-full cursor-not-allowed">
                                <span>{t('BeginCheckout')}</span>
                                <ArrowRight className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 rtl:left-4 rtl:right-auto rtl:rotate-180" />
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}
