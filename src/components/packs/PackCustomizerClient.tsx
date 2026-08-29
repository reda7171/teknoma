'use client'

import { useState, useEffect } from 'react'
import { Sparkles, Check, AlertCircle, RefreshCw, Clock, TrendingUp, CheckCircle2, ShoppingCart, MessageCircle, Package } from 'lucide-react'
import { useTranslations, useLocale } from 'next-intl'
import { useCartStore } from '@/store/cart'
import { useUIStore } from '@/store/ui'
import BookReplacementModal from './BookReplacementModal'
import { Link } from '@/i18n/routing'
import { fbPixelEvents } from '@/lib/facebook-pixel'
import { notifyAddToCart } from '@/lib/actions/cart-notify'

interface Book {
    id: string
    title: string
    author: string
    image: string
    price: number
    stock: number
}

interface Pack {
    id: string
    name: string
    price: number
    image: string | null
    shippingFees: number
    books: { book: Book }[]
}

interface Props {
    pack: Pack
    whatsappPhone?: string
    priceData?: {
        totalOriginalPrice: number
        hasDiscount: boolean
        savings: number
        savingsPercent: number
        displayPrice: string
    }
}

export default function PackCustomizerClient({ pack, whatsappPhone, priceData }: Props) {
    const t = useTranslations('PackDetail')
    const tCommon = useTranslations('Common')
    const locale = useLocale()

    const addItem = useCartStore((state) => state.addItem)
    const openCart = useUIStore((state) => state.openCart)
    const showNotification = useUIStore((state) => state.showNotification)
    const sessionId = useCartStore((state) => state.sessionId)
    const setSessionId = useCartStore((state) => state.setSessionId)

    const [replacedBooks, setReplacedBooks] = useState<Record<string, { id: string, title: string }>>({})
    const [replacementModalOpen, setReplacementModalOpen] = useState(false)
    const [selectedBookForReplacement, setSelectedBookForReplacement] = useState<string | null>(null)
    const [addUpsell, setAddUpsell] = useState(false)
    const [timeLeft, setTimeLeft] = useState({ hours: 48, minutes: 0, seconds: 0 })
    const [isAdding, setIsAdding] = useState(false)

    const hasMissingBooks = pack.books.some(pb => pb.book.stock <= 0 && !replacedBooks[pb.book.id])
    const allBooksMissing = pack.books.length > 0 && pack.books.every(pb => pb.book.stock <= 0 && !replacedBooks[pb.book.id])

    // Timer Logic
    useEffect(() => {
        const timer = setInterval(() => {
            setTimeLeft(prev => {
                if (prev.seconds > 0) return { ...prev, seconds: prev.seconds - 1 }
                if (prev.minutes > 0) return { ...prev, minutes: prev.minutes - 1, seconds: 59 }
                if (prev.hours > 0) return { ...prev, hours: prev.hours - 1, minutes: 59, seconds: 59 }
                return prev
            })
        }, 1000)
        return () => clearInterval(timer)
    }, [])

    const handleReplace = (originalBookId: string) => {
        setSelectedBookForReplacement(originalBookId)
        setReplacementModalOpen(true)
    }

    const onSelectReplacement = (newBook: Book) => {
        if (selectedBookForReplacement) {
            setReplacedBooks(prev => ({
                ...prev,
                [selectedBookForReplacement]: { id: newBook.id, title: newBook.title }
            }))
        }
    }

    const handleCheckout = async () => {
        if (hasMissingBooks || isAdding) return;
        setIsAdding(true);

        try {
            // 1. Ajouter le pack au panier
            addItem({
                type: 'PACK',
                id: pack.id,
                title: pack.name,
                price: pack.price,
                image: pack.image || pack.books[0]?.book.image || '',
                shippingFees: pack.shippingFees,
                replacedBooks: Object.keys(replacedBooks).length > 0 ? replacedBooks : undefined,
            });

            // 2. Si upsell coché, ajouter le livre upsell
            if (addUpsell) {
                addItem({
                    type: 'BOOK',
                    id: '88a0b2df-d1a9-4592-897d-a99ad4fb1576',
                    title: 'فاتتني صلاة',
                    price: 25,
                    image: '/uploads/books/فاتتني-صلاة.jpg',
                    shippingFees: 0,
                });
            }

            // Fire Confetti
            const confetti = (await import('canvas-confetti')).default;
            confetti({
                particleCount: 80,
                spread: 60,
                origin: { y: 0.8 },
                colors: ['#000000', '#10b981', '#3b82f6', '#f59e0b'],
                zIndex: 9999
            });

            fbPixelEvents.addToCart({
                id: pack.id,
                title: pack.name,
                price: pack.price + (addUpsell ? 25 : 0),
                quantity: 1
            });

            let currentSessionId = sessionId
            if (!currentSessionId) {
                currentSessionId = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)
                setSessionId(currentSessionId)
            }
            notifyAddToCart(pack.name, pack.price + (addUpsell ? 25 : 0), 'PACK', currentSessionId).catch(console.error)

            showNotification(tCommon('AddedToCartSuccess'), 'success')
            
            // Ouvrir le panier pour un 1-click checkout feeling
            openCart();
        } catch (err) {
            console.error('Erreur ajout panier', err);
            showNotification(tCommon('AddedToCartError'), 'error');
        } finally {
            setIsAdding(false);
        }
    }

    const handleWhatsApp = () => {
        if (!whatsappPhone || hasMissingBooks) return;
        let text = `Bonjour, je souhaite commander le pack : ${pack.name}\n`
        text += `Prix : ${pack.price + (addUpsell ? 25 : 0)} MAD\n`
        if (addUpsell) {
            text += `+ Inclus : فاتتني صلاة (25 MAD)\n`
        }
        if (Object.keys(replacedBooks).length > 0) {
            text += `\nLivres modifiés :\n`
            Object.values(replacedBooks).forEach(r => {
                text += `- ${r.title}\n`
            })
        }
        window.open(`https://wa.me/${whatsappPhone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(text)}`, '_blank')
    }

    return (
        <>
            {/* PRICE BLOCK DYNAMIQUE */}
            {priceData && (
                <div className="bg-pixio-cream/50 rounded-[2.5rem] p-10 mb-8 border border-gray-50">
                    {priceData.hasDiscount && (
                        <div className="flex items-center gap-6 mb-4">
                            <span className="text-gray-300 text-xl line-through font-black tracking-tighter">
                                {priceData.totalOriginalPrice} {locale === 'ar' ? 'درهم' : 'MAD'}
                            </span>
                            <span className="text-black font-black bg-pixio-yellow px-4 py-2 rounded-xl text-[10px] rtl:text-xs uppercase tracking-widest rtl:tracking-normal">
                                {t('SavingsOff', { amount: priceData.savings })}
                            </span>
                        </div>
                    )}
                    <div className="flex items-baseline gap-3">
                        <span className="text-7xl font-black text-black tracking-tighter leading-none">
                            {parseFloat(priceData.displayPrice) + (addUpsell ? 25 : 0)}
                        </span>
                        <span className="text-2xl text-gray-300 font-black uppercase tracking-widest">
                            {locale === 'ar' ? 'درهم' : 'MAD'}
                        </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-3 sm:gap-4 mt-4">
                        <div className="flex items-center gap-2">
                            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                            <p className="text-[9px] rtl:text-xs rtl:tracking-normal font-black text-gray-500 uppercase tracking-widest">
                                {locale === 'ar' ? 'شامل للضرائب' : locale === 'en' ? 'Taxes Included' : 'Taxes incluses'}
                            </p>
                        </div>
                        <span className="hidden sm:inline text-gray-300">•</span>
                        <div className="flex items-center gap-2">
                            <Package className="w-4 h-4 text-blue-500" />
                            <p className="text-[9px] rtl:text-xs rtl:tracking-normal font-black text-gray-500 uppercase tracking-widest">
                                {locale === 'ar' ? 'الدفع عند الاستلام' : locale === 'en' ? 'Cash on Delivery' : 'Paiement à la livraison'}
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {/* POURQUOI CE PACK */}
            <div className="bg-blue-50/50 rounded-[2rem] p-8 mb-8 border border-blue-100/50">
                <h3 className="text-sm font-black uppercase tracking-widest rtl:tracking-normal text-blue-900 mb-6 flex items-center gap-3">
                    <Sparkles className="w-4 h-4 text-blue-500" />
                    {locale === 'ar' ? 'لماذا هذه الباقة؟' : 'Pourquoi ce pack ?'}
                </h3>
                <ul className="space-y-4">
                    <li className="flex items-start gap-3">
                        <CheckCircle2 className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
                        <span className="text-blue-900 font-medium">{locale === 'ar' ? 'تساعدك على الخشوع وفهم الصلاة بعمق.' : 'Retrouver la concentration et le Khouchou3.'}</span>
                    </li>
                    <li className="flex items-start gap-3">
                        <CheckCircle2 className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
                        <span className="text-blue-900 font-medium">{locale === 'ar' ? 'تقربك من القرآن وتسهل تدبر معانيه.' : 'Comprendre le Coran facilement.'}</span>
                    </li>
                    <li className="flex items-start gap-3">
                        <CheckCircle2 className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
                        <span className="text-blue-900 font-medium">{locale === 'ar' ? 'تزكية النفس وبناء عادات إيجابية يومية.' : 'Purifier son âme au quotidien.'}</span>
                    </li>
                </ul>
            </div>

            {/* URGENCE / TIMER */}
            <div className="flex flex-col sm:flex-row gap-4 mb-8">
                <div className="flex-1 bg-red-50 text-red-600 rounded-2xl p-4 flex items-center gap-3 border border-red-100">
                    <Clock className="w-5 h-5 animate-pulse" />
                    <div>
                        <p className="text-[10px] font-black uppercase tracking-widest">{locale === 'ar' ? 'ينتهي العرض قريباً' : 'L\'offre se termine bientôt'}</p>
                        <p className="font-bold text-lg tabular-nums tracking-tight">
                            {String(timeLeft.hours).padStart(2, '0')}:{String(timeLeft.minutes).padStart(2, '0')}:{String(timeLeft.seconds).padStart(2, '0')}
                        </p>
                    </div>
                </div>
                <div className="flex-1 bg-orange-50 text-orange-600 rounded-2xl p-4 flex items-center gap-3 border border-orange-100">
                    <TrendingUp className="w-5 h-5" />
                    <div>
                        <p className="text-[10px] font-black uppercase tracking-widest">{locale === 'ar' ? 'طلب مرتفع جداً' : 'Forte demande'}</p>
                        <p className="font-bold text-lg">{locale === 'ar' ? 'تبقى 7 باقات فقط!' : 'Plus que 7 packs !'}</p>
                    </div>
                </div>
            </div>

            <div className="mb-8">
                <h3 className="text-[10px] rtl:text-sm font-black uppercase tracking-[0.3em] rtl:tracking-normal text-black mb-6 flex items-center gap-4">
                    <Sparkles className="w-4 h-4 text-black" />
                    {t('BundleContent') || 'Contenu du pack'}
                </h3>
                <ul className="space-y-4">
                    {pack.books.map((pb) => {
                        const isMissing = pb.book.stock <= 0
                        const replacement = replacedBooks[pb.book.id]

                        return (
                            <li key={pb.book.id} className="flex flex-col gap-2">
                                <div className="flex items-start gap-4">
                                    <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${replacement ? 'bg-black text-white' : isMissing ? 'bg-red-100 text-red-500' : 'bg-black text-white'}`}>
                                        {isMissing && !replacement ? <AlertCircle className="w-3.5 h-3.5" /> : <Check className="w-3.5 h-3.5" />}
                                    </div>
                                    <div className="flex-1 w-full">
                                        <div className="flex flex-wrap items-center justify-between gap-3 w-full">
                                            {replacement ? (
                                                <div className="flex flex-wrap items-center gap-3">
                                                    <Link href={`/books/${replacement.id}`} className="text-xs rtl:text-sm font-black uppercase tracking-widest rtl:tracking-normal text-black hover:underline cursor-pointer block w-fit">
                                                        {replacement.title}
                                                    </Link>
                                                    <button 
                                                        onClick={() => handleReplace(pb.book.id)}
                                                        className="text-xs md:text-sm text-gray-700 bg-gray-100 hover:bg-black hover:text-white hover:scale-105 font-black uppercase tracking-widest flex items-center gap-2 px-3 py-1.5 rounded-full transition-all shrink-0"
                                                    >
                                                        <RefreshCw className="w-3 h-3" />
                                                        {t('Change') || 'Changer'}
                                                    </button>
                                                </div>
                                            ) : (
                                                <Link href={`/books/${pb.book.id}`} className={`text-xs rtl:text-sm font-black uppercase tracking-widest rtl:tracking-normal hover:underline cursor-pointer block w-fit ${isMissing ? 'text-red-500 hover:text-red-600' : 'text-gray-400 hover:text-black'}`}>
                                                    {pb.book.title}
                                                </Link>
                                            )}
                                            
                                            {isMissing && !replacement && (
                                                <div className="flex flex-wrap items-center gap-2 shrink-0">
                                                    <span className="text-xs md:text-sm text-red-500 font-bold uppercase tracking-widest bg-red-50 px-2 py-1 rounded-md">
                                                        {t('OutOfStock') || 'En rupture'}
                                                    </span>
                                                    <button 
                                                        onClick={() => handleReplace(pb.book.id)}
                                                        className="text-xs md:text-sm text-white bg-black hover:bg-gray-700 hover:scale-105 font-black uppercase tracking-widest flex items-center gap-2 px-3 py-1.5 rounded-full transition-all shadow-sm shrink-0"
                                                    >
                                                        <RefreshCw className="w-3 h-3" />
                                                        {t('Replace') || 'Remplacer'}
                                                    </button>
                                                </div>
                                            )}
                                        </div>

                                        {replacement && (
                                            <Link href={`/books/${pb.book.id}`} className="text-[10px] text-gray-400 mt-1 line-through hover:text-gray-600 block w-fit">
                                                {pb.book.title}
                                            </Link>
                                        )}
                                    </div>
                                </div>
                            </li>
                        )
                    })}
                </ul>
            </div>

            {/* UPSELL ORDER BUMP */}
            <div className={`p-6 rounded-[2rem] border-2 transition-all duration-300 cursor-pointer mb-12 ${addUpsell ? 'border-pixio-yellow bg-yellow-50' : 'border-gray-100 bg-white hover:border-gray-200 shadow-lg hover:shadow-xl'}`} onClick={() => setAddUpsell(!addUpsell)}>
                <div className="flex items-start gap-4">
                    <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center shrink-0 mt-1 transition-colors ${addUpsell ? 'border-pixio-yellow bg-pixio-yellow text-black' : 'border-gray-300 text-transparent'}`}>
                        <Check className="w-5 h-5" />
                    </div>
                    <div>
                        <div className="flex flex-wrap items-center gap-3 mb-2">
                            <span className="bg-red-500 text-white text-[10px] font-black uppercase tracking-widest rtl:tracking-normal px-2 py-1 rounded">
                                {locale === 'ar' ? 'عرض خاص حصري' : 'Offre spéciale'}
                            </span>
                        </div>
                        <h4 className="text-lg font-black text-black mb-1 rtl:tracking-normal">
                            {locale === 'ar' ? "إضافة 'فاتتني صلاة' بـ 25 درهم فقط" : "Ajouter 'فاتتني صلاة' pour 25 MAD"}
                        </h4>
                        <p className="text-sm text-gray-500 rtl:leading-relaxed">
                            {locale === 'ar' ? 'الكتاب المثالي للمبتدئين في الصلاة. يضيف قيمة كبيرة لباقتك ولن تجده بهذا السعر بمفرده.' : 'Le livre idéal pour débuter la prière. Complète parfaitement ce pack !'}
                        </p>
                    </div>
                </div>
            </div>

            <div className="space-y-4">
                {hasMissingBooks && (
                    <div className="p-4 bg-red-50 border border-red-100 rounded-2xl mb-4">
                        <p className="text-sm md:text-base text-red-600 font-bold flex items-center gap-2">
                            <AlertCircle className="w-4 h-4" />
                            {t('PleaseReplaceOutOfStock') || 'Veuillez remplacer le(s) livre(s) en rupture de stock pour continuer.'}
                        </p>
                    </div>
                )}
                
                <div className={`flex flex-col gap-3 ${allBooksMissing ? 'opacity-50 pointer-events-none' : ''}`}>
                    {/* PRIMARY BUTTON - 1 CLICK CHECKOUT */}
                    <button
                        onClick={handleCheckout}
                        disabled={hasMissingBooks || isAdding}
                        className="w-full flex items-center justify-center gap-3 font-black rounded-full transition-all duration-300 py-6 px-8 bg-black text-white hover:bg-gray-800 hover:scale-[1.02] shadow-2xl hover:shadow-black/20 text-sm md:text-base uppercase tracking-[0.2em] rtl:tracking-normal"
                    >
                        {isAdding ? <RefreshCw className="w-5 h-5 animate-spin" /> : <ShoppingCart className="w-5 h-5" />}
                        {locale === 'ar' ? 'أتمم الطلب الآن' : 'Commander maintenant'}
                    </button>

                    {/* SECONDARY BUTTON - WHATSAPP */}
                    {whatsappPhone && (
                        <button
                            onClick={handleWhatsApp}
                            disabled={hasMissingBooks}
                            className="w-full flex items-center justify-center gap-3 font-bold rounded-full transition-all duration-300 py-4 px-8 bg-white border-2 border-gray-200 text-gray-700 hover:bg-gray-50 hover:border-gray-300 text-xs md:text-sm uppercase tracking-widest rtl:tracking-normal"
                        >
                            <MessageCircle className="w-5 h-5 text-green-500" />
                            {locale === 'ar' ? 'الطلب عبر واتساب' : 'Commander via WhatsApp'}
                        </button>
                    )}
                </div>
            </div>

            {selectedBookForReplacement && (
                <BookReplacementModal
                    isOpen={replacementModalOpen}
                    onClose={() => setReplacementModalOpen(false)}
                    originalBookId={selectedBookForReplacement}
                    onSelectReplacement={onSelectReplacement}
                />
            )}
        </>
    )
}
