'use client'

import { Package, Truck, CheckCircle2, Clock, MapPin, ChevronLeft, ChevronRight, XCircle, ShoppingBag, FileText } from 'lucide-react'
import Link from 'next/link'
import ImageWithFallback from '@/components/ImageWithFallback'
import { normalizeImage } from '@/lib/utils'
import { downloadOrderInvoicePdf } from '@/lib/utils/invoiceGenerator'

interface OrderTrackingClientProps {
    order: any
    shippingCompany: any
    locale: string
}

export default function OrderTrackingClient({ order, shippingCompany, locale }: OrderTrackingClientProps) {
    const t = {
        fr: {
            backToStore: "Retour à la boutique",
            trackingTitle: "Suivi de commande",
            order: "Commande",
            placedOn: "Passée le",
            cancelled: "Commande Annulée",
            cancelledDesc: "Cette commande a été annulée.",
            returned: "Commande Retournée",
            returnedDesc: "Cette commande a été retournée.",
            steps: {
                PENDING: "Commande Reçue",
                CONFIRMED: "En Préparation",
                SHIPPED: "Expédiée",
                DELIVERED: "Livrée"
            },
            shippingCompany: "Transporteur",
            trackingNumber: "N° de Suivi",
            trackOnSite: "Suivre sur leur site",
            orderDetails: "Détails des articles",
            quantity: "Qté",
            subtotal: "Sous-total",
            shipping: "Livraison",
            discount: "Remise",
            total: "Total",
            needHelp: "Besoin d'aide avec votre commande ?",
            contactUs: "Contactez-nous",
            dhs: "Dhs",
            downloadInvoice: "Télécharger la Facture (PDF)",
            paid: "Acompte Réglé",
            remainingBalance: "Reste à payer (Livraison)"
        },
        ar: {
            backToStore: "العودة إلى المتجر",
            trackingTitle: "تتبع الطلب",
            order: "طلب",
            placedOn: "تم في",
            cancelled: "تم إلغاء الطلب",
            cancelledDesc: "تم إلغاء هذا الطلب.",
            returned: "تم إرجاع الطلب",
            returnedDesc: "تم إرجاع هذا الطلب.",
            steps: {
                PENDING: "تم الاستلام",
                CONFIRMED: "قيد التحضير",
                SHIPPED: "تم الشحن",
                DELIVERED: "تم التوصيل"
            },
            shippingCompany: "شركة الشحن",
            trackingNumber: "رقم التتبع",
            trackOnSite: "تتبع على الموقع",
            orderDetails: "تفاصيل المنتجات",
            quantity: "الكمية",
            subtotal: "المجموع الفرعي",
            shipping: "التوصيل",
            discount: "تخفيض",
            total: "المجموع الكلي",
            needHelp: "تحتاج إلى مساعدة في طلبك؟",
            contactUs: "اتصل بنا",
            dhs: "درهم",
            downloadInvoice: "تحميل الفاتورة (PDF)",
            paid: "المبلغ المدفوع",
            remainingBalance: "المتبقي للدفع عند الاستلام"
        },
        en: {
            backToStore: "Back to store",
            trackingTitle: "Order Tracking",
            order: "Order",
            placedOn: "Placed on",
            cancelled: "Order Cancelled",
            cancelledDesc: "This order has been cancelled.",
            returned: "Order Returned",
            returnedDesc: "This order has been returned.",
            steps: {
                PENDING: "Received",
                CONFIRMED: "In Prep",
                SHIPPED: "Shipped",
                DELIVERED: "Delivered"
            },
            shippingCompany: "Carrier",
            trackingNumber: "Tracking No",
            trackOnSite: "Track on site",
            orderDetails: "Order details",
            quantity: "Qty",
            subtotal: "Subtotal",
            shipping: "Shipping",
            discount: "Discount",
            total: "Total",
            needHelp: "Need help with your order?",
            contactUs: "Contact us",
            dhs: "Dhs",
            downloadInvoice: "Download Invoice (PDF)",
            paid: "Amount Paid",
            remainingBalance: "Remaining Due (COD)"
        }
    }[locale as 'fr' | 'ar' | 'en'] || {
        backToStore: "Retour à la boutique",
        trackingTitle: "Suivi de commande",
        order: "Commande",
        placedOn: "Passée le",
        cancelled: "Commande Annulée",
        cancelledDesc: "Cette commande a été annulée.",
        returned: "Commande Retournée",
        returnedDesc: "Cette commande a été retournée.",
        steps: {
            PENDING: "Commande Reçue",
            CONFIRMED: "En Préparation",
            SHIPPED: "Expédiée",
            DELIVERED: "Livrée"
        },
        shippingCompany: "Transporteur",
        trackingNumber: "N° de Suivi",
        trackOnSite: "Suivre sur leur site",
        orderDetails: "Détails des articles",
        quantity: "Qté",
        subtotal: "Sous-total",
        shipping: "Livraison",
        discount: "Remise",
        total: "Total",
        needHelp: "Besoin d'aide avec votre commande ?",
        contactUs: "Contactez-nous",
        dhs: "Dhs",
        downloadInvoice: "Télécharger la Facture (PDF)",
        paid: "Acompte Réglé",
        remainingBalance: "Reste à payer (Livraison)"
    }

    const isRtl = locale === 'ar'
    const statusOrder = ['PENDING', 'CONFIRMED', 'SHIPPED', 'DELIVERED']
    const currentIndex = statusOrder.indexOf(order.status)
    const isCancelled = order.status === 'CANCELLED'
    const isReturned = order.status === 'RETURNED'

    const paidAmount = Number(order.paidAmount) || (order.isPaid ? Number(order.total) : 0)
    const remainingAmount = order.remainingAmount !== null && order.remainingAmount !== undefined
        ? Number(order.remainingAmount)
        : (order.isPaid ? 0 : Math.max(0, Number(order.total) - paidAmount))

    const handleDownloadInvoice = () => {
        downloadOrderInvoicePdf(order, locale)
    }

    const getStepStatus = (stepIndex: number) => {
        if (isCancelled || isReturned) {
            if (stepIndex === 0) return 'completed'
            return 'inactive'
        }
        if (currentIndex > stepIndex) return 'completed'
        if (currentIndex === stepIndex) return 'current'
        return 'inactive'
    }

    const steps = [
        { id: 'PENDING', title: t.steps.PENDING, icon: Clock },
        { id: 'CONFIRMED', title: t.steps.CONFIRMED, icon: Package },
        { id: 'SHIPPED', title: t.steps.SHIPPED, icon: Truck },
        { id: 'DELIVERED', title: t.steps.DELIVERED, icon: CheckCircle2 },
    ]

    return (
        <div className="min-h-screen bg-gray-50/50 py-8 px-4 sm:px-6 lg:px-8 font-sans" dir={isRtl ? 'rtl' : 'ltr'}>
            <div className="max-w-3xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-8 duration-700 ease-out">

                {/* Header */}
                <div className="relative flex items-center justify-center py-4 mb-4">
                    <Link
                        href={`/${locale}`}
                        className={`absolute ${isRtl ? 'right-0' : 'left-0'} text-gray-500 hover:text-gray-900 flex items-center gap-1 sm:gap-2 font-medium transition-colors`}
                    >
                        {isRtl ? <ChevronRight className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
                        <span className="hidden sm:inline">{t.backToStore}</span>
                        <span className="sm:hidden text-sm">Retour</span>
                    </Link>
                    <img src="/logo.png" alt="Tekno Store" className="h-12 sm:h-16 w-auto object-contain" />
                </div>

                <div className="bg-white rounded-[2rem] shadow-xl shadow-gray-200/50 border border-gray-100/60 p-6 sm:p-10 relative overflow-hidden backdrop-blur-xl">
                    {/* Decorative gradient top bar */}
                    <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600"></div>

                    <div className="mb-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="text-center sm:text-start">
                            <h1 className="text-3xl font-black text-gray-900 tracking-tight">{t.trackingTitle}</h1>
                            <p className="text-gray-500 mt-2 text-sm sm:text-base">
                                {t.order} <span className="font-mono font-bold text-gray-900 bg-gray-100 px-2 py-0.5 rounded-md">#{order.id.split('-')[0].toUpperCase()}</span>
                                {' • '}
                                {t.placedOn} {new Date(order.createdAt).toLocaleDateString(locale === 'ar' ? 'ar-MA' : 'fr-FR')}
                            </p>
                        </div>
                        <button
                            type="button"
                            onClick={handleDownloadInvoice}
                            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold rounded-xl shadow-md shadow-blue-500/10 text-sm transition-all self-center sm:self-auto shrink-0"
                            title={t.downloadInvoice}
                        >
                            <FileText className="w-4 h-4" />
                            <span>{t.downloadInvoice}</span>
                        </button>
                    </div>

                    {/* Alert for Cancelled/Returned */}
                    {(isCancelled || isReturned) && (
                        <div className="mb-8 p-5 bg-red-50/80 text-red-800 rounded-2xl border border-red-100 flex items-center gap-4">
                            <XCircle className="w-8 h-8 text-red-500 shrink-0" />
                            <div>
                                <p className="font-black text-lg">{isCancelled ? t.cancelled : t.returned}</p>
                                <p className="text-sm text-red-700/80 mt-1">{isCancelled ? t.cancelledDesc : t.returnedDesc}</p>
                            </div>
                        </div>
                    )}

                    {/* Progress Bar */}
                    {!isCancelled && !isReturned && (
                        <div className="relative mb-12 sm:mb-16 mt-8 hidden sm:block">
                            <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                <div
                                    className={`h-full bg-gradient-to-r from-blue-600 to-indigo-600 transition-all duration-1000 ease-in-out ${isRtl ? 'origin-right' : 'origin-left'}`}
                                    style={{
                                        width: `${(Math.max(0, currentIndex) / (steps.length - 1)) * 100}%`,
                                        transform: isRtl ? 'scaleX(-1)' : 'none'
                                    }}
                                ></div>
                            </div>

                            <div className="relative flex justify-between">
                                {steps.map((step, index) => {
                                    const status = getStepStatus(index)
                                    const Icon = step.icon

                                    return (
                                        <div key={step.id} className="flex flex-col items-center">
                                            <div className={`relative w-12 h-12 rounded-full flex items-center justify-center z-10 transition-all duration-500 shadow-sm ${
                                                status === 'completed' ? 'bg-gradient-to-br from-blue-600 to-indigo-600 text-white shadow-blue-500/30' :
                                                status === 'current' ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-500/40 ring-4 ring-indigo-600/30 ring-offset-2' :
                                                'bg-white border-2 border-gray-100 text-gray-300'
                                            }`}>
                                                {status === 'current' && (
                                                    <span className="absolute inset-0 rounded-full animate-ping bg-indigo-500 opacity-75"></span>
                                                )}
                                                <Icon className="w-5 h-5 relative z-10" />
                                            </div>
                                            <p className={`mt-4 text-[10px] sm:text-xs font-black uppercase tracking-widest ${
                                                status === 'inactive' ? 'text-gray-300' :
                                                status === 'current' ? 'text-indigo-600 animate-pulse' : 'text-gray-900'
                                            }`}>
                                                {step.title}
                                            </p>
                                        </div>
                                    )
                                })}
                            </div>
                        </div>
                    )}

                    {/* Mobile Progress List (Visible only on small screens) */}
                    {!isCancelled && !isReturned && (
                        <div className="sm:hidden mb-10 space-y-6 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-slate-200 before:to-transparent">
                            {steps.map((step, index) => {
                                const status = getStepStatus(index)
                                const Icon = step.icon

                                return (
                                    <div key={step.id} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                                        <div className={`relative flex items-center justify-center w-10 h-10 rounded-full z-10 shrink-0 shadow-sm ${
                                            status === 'completed' ? 'border-2 border-indigo-600 text-indigo-600 bg-indigo-50' :
                                            status === 'current' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/40 ring-4 ring-indigo-600/30' :
                                            'border-2 border-gray-200 text-gray-300 bg-white'
                                        } ${isRtl ? 'ml-4' : 'mr-4'}`}>
                                            {status === 'current' && (
                                                <span className="absolute inset-0 rounded-full animate-ping bg-indigo-500 opacity-75"></span>
                                            )}
                                            <Icon className="w-4 h-4 relative z-10" />
                                        </div>
                                        <div className={`w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-4 rounded-2xl border ${status === 'current' ? 'border-indigo-200 bg-indigo-50/50' : 'border-gray-100 bg-white'} shadow-sm transition-colors`}>
                                            <h3 className={`font-black text-xs uppercase tracking-widest ${
                                                status === 'inactive' ? 'text-gray-400' :
                                                status === 'current' ? 'text-indigo-600 animate-pulse' : 'text-gray-900'
                                            }`}>{step.title}</h3>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    )}

                    {/* Shipping Info */}
                    {shippingCompany && order.trackingID && (
                        <div className="bg-gradient-to-br from-gray-50 to-white rounded-[1.5rem] p-5 sm:p-6 mb-10 flex flex-col sm:flex-row items-center gap-6 justify-between border border-gray-100 shadow-sm transition-all hover:shadow-md">
                            <div className="flex items-center gap-4 w-full sm:w-auto">
                                {shippingCompany.logo ? (
                                    <div className="w-14 h-14 bg-white rounded-xl shadow-sm border border-gray-100 p-2 shrink-0 flex items-center justify-center">
                                        <img src={shippingCompany.logo} alt={shippingCompany.name} className="max-w-full max-h-full object-contain" />
                                    </div>
                                ) : (
                                    <div className="w-14 h-14 bg-gray-100 rounded-xl shrink-0 flex items-center justify-center">
                                        <Truck className="w-6 h-6 text-gray-400" />
                                    </div>
                                )}
                                <div className="flex-1">
                                    <p className="text-xs text-gray-500 font-bold uppercase tracking-wider">{t.shippingCompany}</p>
                                    <p className="font-black text-gray-900 text-lg">{shippingCompany.name}</p>
                                </div>
                            </div>

                            <div className="flex flex-col sm:items-end w-full sm:w-auto gap-2">
                                <div>
                                    <p className="text-xs text-gray-500 font-bold uppercase tracking-wider mb-1">{t.trackingNumber}</p>
                                    <p className="font-mono font-bold text-indigo-700 bg-indigo-50 px-3 py-1.5 rounded-lg border border-indigo-100/50 inline-block">
                                        {order.trackingID}
                                    </p>
                                </div>
                                {shippingCompany.trackingUrl && (
                                    <a
                                        href={shippingCompany.trackingUrl.replace('{trackingID}', order.trackingID)}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="mt-2 w-full sm:w-auto inline-flex justify-center items-center gap-2 bg-black text-white px-5 py-3 rounded-xl font-bold text-sm hover:bg-gray-800 transition-colors whitespace-nowrap shadow-md shadow-black/10"
                                    >
                                        {t.trackOnSite}
                                    </a>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Order Items */}
                    <div className="pt-2">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-700">
                                <ShoppingBag className="w-4 h-4" />
                            </div>
                            <h3 className="font-black text-gray-900 uppercase tracking-widest text-sm">{t.orderDetails}</h3>
                        </div>

                        <div className="space-y-3">
                            {order.items.map((item: any) => (
                                <div key={item.id} className="group flex items-center gap-4 p-4 rounded-2xl bg-white border border-gray-100 shadow-sm hover:shadow-md transition-all hover:border-gray-200">
                                    <div className="w-16 h-20 bg-gray-50 rounded-xl overflow-hidden shrink-0 shadow-inner">
                                        {(item.book?.image || item.pack?.image || item.extraProduct?.image) ? (
                                            <ImageWithFallback src={normalizeImage(item.book?.image || item.pack?.image || item.extraProduct?.image)} alt="Produit" fallback="/placeholder.png" className="w-full h-full object-cover transition-transform group-hover:scale-105 duration-500" />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center text-gray-300">
                                                <Package className="w-6 h-6" />
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="font-bold text-gray-900 leading-snug truncate">{item.book?.title || item.pack?.name || item.extraProduct?.name || 'Produit'}</p>
                                        <p className="text-xs text-gray-500 font-medium mt-1 bg-gray-100 inline-block px-2 py-0.5 rounded-md">{t.quantity}: {item.quantity}</p>
                                    </div>
                                    <div className="font-black text-gray-900 whitespace-nowrap">
                                        {(item.price * item.quantity).toFixed(2)} <span className="text-xs text-gray-500 font-bold">{t.dhs}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Totals */}
                    <div className="mt-8 bg-gray-50/80 rounded-[1.5rem] p-6 border border-gray-100">
                        <div className="space-y-3">
                            <div className="flex justify-between text-sm">
                                <span className="text-gray-500 font-medium">{t.subtotal}</span>
                                <span className="font-bold text-gray-900">{(order.subtotal || order.total - order.shippingFees + order.discount).toFixed(2)} {t.dhs}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-gray-500 font-medium">{t.shipping}</span>
                                <span className="font-bold text-gray-900">{order.shippingFees.toFixed(2)} {t.dhs}</span>
                            </div>
                            {order.discount > 0 && (
                                <div className="flex justify-between text-sm text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-lg -mx-3">
                                    <span className="font-bold">{t.discount}</span>
                                    <span className="font-black">-{order.discount.toFixed(2)} {t.dhs}</span>
                                </div>
                            )}
                        </div>
                        <div className="flex justify-between items-end pt-5 mt-5 border-t border-gray-200">
                            <span className="text-sm font-bold text-gray-900 uppercase tracking-widest">{t.total}</span>
                            <div className="text-right">
                                <span className="text-3xl font-black text-gray-900">{order.total.toFixed(2)}</span>
                                <span className="text-sm font-bold text-gray-500 ml-1">{t.dhs}</span>
                            </div>
                        </div>

                        {/* Breakdown: Acompte & Reste à payer */}
                        <div className="mt-4 pt-4 border-t border-gray-200/80 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                            <div className="p-3 bg-white rounded-xl border border-gray-100 flex items-center justify-between">
                                <span className="text-gray-500 font-bold">{t.paid}</span>
                                <span className="font-black text-emerald-600 text-sm">+{paidAmount.toFixed(2)} {t.dhs}</span>
                            </div>
                            <div className={`p-3 rounded-xl border flex items-center justify-between ${
                                remainingAmount > 0
                                    ? 'bg-amber-50/80 border-amber-200/70 text-amber-950'
                                    : 'bg-emerald-50 border-emerald-200 text-emerald-950'
                            }`}>
                                <span className="font-bold">{t.remainingBalance}</span>
                                <span className="font-black text-sm">{remainingAmount.toFixed(2)} {t.dhs}</span>
                            </div>
                        </div>

                        {/* Bottom Action Button */}
                        <div className="mt-5 pt-4 border-t border-gray-200 flex justify-center">
                            <button
                                type="button"
                                onClick={handleDownloadInvoice}
                                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 bg-white hover:bg-gray-50 text-gray-900 font-bold rounded-xl border border-gray-200 shadow-sm transition-all text-sm"
                            >
                                <FileText className="w-4 h-4 text-blue-600" />
                                <span>{t.downloadInvoice}</span>
                            </button>
                        </div>
                    </div>
                </div>

                {/* Need help? */}
                <div className="text-center pb-8">
                    <p className="text-sm text-gray-500">
                        {t.needHelp}{' '}
                        <a href="mailto:Contact.tekno.ma@gmail.com" className="font-bold text-indigo-600 hover:text-indigo-700 transition-colors">
                            {t.contactUs}
                        </a>
                    </p>
                </div>
            </div>
        </div>
    )
}
