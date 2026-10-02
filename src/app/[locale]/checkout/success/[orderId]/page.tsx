import { getOrderById } from '@/lib/actions/orders'
import Header from '@/components/HeaderWithUser'
import Link from 'next/link'
import { ArrowLeft, CheckCircle, Package, Truck, Wallet, Ticket, Loader2, ArrowRight, FileText } from 'lucide-react'
import { notFound } from 'next/navigation'
import Footer from '@/components/Footer'
import { getTranslations } from 'next-intl/server'
import GoogleReviewsOptIn from '@/components/GoogleReviewsOptIn'

export default async function OrderSuccessPage({
    params,
}: {
    params: Promise<{ orderId: string }>
}) {
    const { orderId } = await params
    const order = await getOrderById(orderId)
    const t = await getTranslations('Checkout.Success')
    const tCommon = await getTranslations('Common')

    if (!order) {
        notFound()
    }

    const estimatedDeliveryDate = new Date(order.createdAt)
    estimatedDeliveryDate.setDate(estimatedDeliveryDate.getDate() + 3)
    const estimatedDeliveryDateStr = estimatedDeliveryDate.toISOString().split('T')[0]

    const products = order.items
        .filter((item: any) => item.book?.isbn)
        .map((item: any) => ({ gtin: item.book.isbn }))

    return (
        <div className="min-h-screen bg-pixio-cream">
            <GoogleReviewsOptIn 
                orderId={order.id} 
                email={order.email} 
                estimatedDeliveryDate={estimatedDeliveryDateStr} 
                products={products} 
            />
            <Header />

            <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-20 pb-24 md:pb-32">
                <div className="bg-white rounded-3xl md:rounded-[3rem] p-6 sm:p-12 md:p-20 shadow-2xl shadow-black/5 text-center relative overflow-hidden">
                    {/* Background Decorative Element */}
                    <div className="absolute top-0 right-0 w-64 h-64 bg-pixio-yellow/30 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>

                    <div className="relative z-10 text-center flex flex-col items-center">
                        <div className="w-16 h-16 md:w-24 md:h-24 bg-black rounded-full flex items-center justify-center mb-6 md:mb-10 shadow-2xl">
                            <CheckCircle className="w-8 h-8 md:w-10 md:h-10 text-white" />
                        </div>

                        <h1 className="text-4xl sm:text-5xl md:text-6xl font-black text-black mb-3 md:mb-4 tracking-tighter">{t('OrderConfirmed')}<span className="text-gray-200">.</span></h1>
                        <p className="text-gray-400 font-bold uppercase tracking-[0.2em] text-xs sm:text-sm mb-8 md:mb-12">
                            {t('ThankYou', { name: order.fullName.split(' ')[0] })}
                        </p>

                        <div className="w-full bg-pixio-cream/50 rounded-2xl md:rounded-[2rem] p-5 sm:p-8 md:p-10 mb-8 md:mb-12 text-left border border-gray-100 flex flex-col gap-8 md:gap-10">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 md:gap-10">
                                <div>
                                    <p className="text-xs sm:text-sm font-black uppercase tracking-widest text-gray-400 mb-2">{t('OrderReference')}</p>
                                    <p className="text-xl sm:text-2xl font-black text-black tracking-tight">#{order.id.slice(0, 8).toUpperCase()}</p>
                                </div>
                                <div>
                                    <p className="text-xs sm:text-sm font-black uppercase tracking-widest text-gray-400 mb-2">{t('OrderDate')}</p>
                                    <p className="text-lg sm:text-xl font-black text-black tracking-tight">
                                        {new Date(order.createdAt).toLocaleDateString('fr-FR', {
                                            month: 'long',
                                            day: 'numeric',
                                            year: 'numeric'
                                        })}
                                    </p>
                                </div>
                            </div>

                            <div className="pt-8 border-t border-gray-100">
                                <h3 className="text-xs sm:text-sm font-black uppercase tracking-[0.2em] text-black mb-6">Récapitulatif de la commande</h3>
                                <div className="space-y-4 mb-8">
                                    {order.items.map((item: any) => (
                                        <div key={item.id} className="flex justify-between items-center bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
                                            <div className="flex items-center gap-4">
                                                {item.book?.image || item.pack?.image || item.extraProduct?.image || item.digitalProduct?.image ? (
                                                    <div className="w-12 h-16 relative rounded-lg overflow-hidden flex-shrink-0 bg-gray-100">
                                                        <img 
                                                            src={item.book?.image || item.pack?.image || item.extraProduct?.image || item.digitalProduct?.image} 
                                                            alt={item.book?.title || item.pack?.name || item.extraProduct?.name || item.digitalProduct?.title}
                                                            className="object-cover w-full h-full"
                                                        />
                                                    </div>
                                                ) : (
                                                    <div className="w-12 h-16 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
                                                        <Package className="w-5 h-5 text-gray-400" />
                                                    </div>
                                                )}
                                                <div>
                                                    <p className="text-base font-bold text-gray-900 line-clamp-1">{item.book?.title || item.pack?.name || item.extraProduct?.name || item.digitalProduct?.title}</p>
                                                    <p className="text-sm font-bold text-gray-400">Quantité : {item.quantity}</p>
                                                </div>
                                            </div>
                                            <p className="text-base font-black text-black whitespace-nowrap ml-4">{item.price * item.quantity} درهم</p>
                                        </div>
                                    ))}
                                </div>
                                
                                <div className="flex justify-between items-center mb-2">
                                    <p className="text-xs sm:text-sm font-black uppercase tracking-widest text-gray-400">Sous-total</p>
                                    <p className="text-base font-bold text-black">{order.subtotal} درهم</p>
                                </div>
                                <div className="flex justify-between items-center mb-2">
                                    <p className="text-xs sm:text-sm font-black uppercase tracking-widest text-gray-400">Livraison</p>
                                    <p className="text-base font-bold text-black">{order.shippingFees === 0 ? 'Gratuite' : `${order.shippingFees} درهم`}</p>
                                </div>
                                {order.discount > 0 && (
                                    <div className="flex justify-between items-center mb-4">
                                        <p className="text-xs sm:text-sm font-black uppercase tracking-widest text-green-500">Réduction</p>
                                        <p className="text-base font-bold text-green-500">-{order.discount} درهم</p>
                                    </div>
                                )}
                                
                                <div className="flex justify-between items-end pt-4 border-t border-gray-100 border-dashed">
                                    <p className="text-xs sm:text-sm font-black uppercase tracking-widest text-gray-400 mb-1">{t('TotalPaid')}</p>
                                    <p className="text-4xl sm:text-5xl font-black text-black tracking-tighter">{order.total} <span className="text-xs uppercase font-black text-gray-400 ml-1">درهم</span></p>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <h3 className="text-xs sm:text-sm font-black uppercase tracking-[0.2em] text-black">{t('NextSteps')}</h3>
                                <div className="space-y-4">
                                    <div className="flex items-center gap-4">
                                        <div className="w-2 h-2 bg-black rounded-full"></div>
                                        <p className="text-sm sm:text-base font-bold text-gray-500 uppercase tracking-widest leading-relaxed">{t('AgentContact')}</p>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <div className="w-2 h-2 bg-black rounded-full"></div>
                                        <p className="text-sm sm:text-base font-bold text-gray-500 uppercase tracking-widest leading-relaxed">{t('PrepareAmount')}</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 w-full">
                            <a
                                href={`/api/orders/${order.id}/invoice?print=1`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-6 py-4 bg-gray-100 hover:bg-gray-200 text-gray-900 font-bold text-xs sm:text-sm rounded-full transition-all border border-gray-200"
                            >
                                <FileText className="w-4 h-4 text-blue-600" />
                                <span>Télécharger la Facture (PDF)</span>
                            </a>
                            <Link
                                href={`/track/${order.id}`}
                                className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-6 py-4 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs sm:text-sm rounded-full transition-all shadow-lg shadow-blue-500/20"
                            >
                                <Truck className="w-4 h-4" />
                                <span>Suivre ma commande</span>
                            </Link>
                            <Link
                                href="/"
                                className="w-full sm:w-auto inline-flex items-center justify-center gap-3 px-8 py-4 bg-black text-white font-black text-xs sm:text-sm uppercase tracking-[0.2em] rounded-full hover:bg-gray-800 transition-all shadow-xl hover:shadow-black/20 group"
                            >
                                <span>{t('BackHome')}</span>
                                <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                            </Link>
                        </div>
                    </div>
                </div>
            </div>
            <Footer />
        </div>
    )
}
