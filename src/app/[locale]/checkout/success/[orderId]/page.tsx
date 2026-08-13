import { getOrderById } from '@/lib/actions/orders'
import Header from '@/components/HeaderWithUser'
import Link from 'next/link'
import { ArrowLeft, CheckCircle, Package, Truck, Wallet, Ticket, Loader2, ArrowRight } from 'lucide-react'
import { notFound } from 'next/navigation'
import Footer from '@/components/Footer'
import { getTranslations } from 'next-intl/server'
import Script from 'next/script'
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
            <script dangerouslySetInnerHTML={{
                __html: `
                    window.renderOptIn = function() {
                        window.gapi.load('surveyoptin', function() {
                            window.gapi.surveyoptin.render({
                                "merchant_id": 5826844744,
                                "order_id": "${order.id}",
                                ${order.email ? `"email": "${order.email}",` : ''}
                                "delivery_country": "MA",
                                "estimated_delivery_date": "${estimatedDeliveryDateStr}",
                                "products": ${JSON.stringify(products)}
                            });
                        });
                    }
                `
            }} />
            <script src="https://apis.google.com/js/platform.js?onload=renderOptIn" async defer></script>
            <Header />

            <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-20 pb-32">
                <div className="bg-white rounded-[3rem] p-12 md:p-20 shadow-2xl shadow-black/5 text-center relative overflow-hidden">
                    {/* Background Decorative Element */}
                    <div className="absolute top-0 right-0 w-64 h-64 bg-pixio-yellow/30 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>

                    <div className="relative z-10 text-center flex flex-col items-center">
                        <div className="w-24 h-24 bg-black rounded-full flex items-center justify-center mb-10 shadow-2xl">
                            <CheckCircle className="w-10 h-10 text-white" />
                        </div>

                        <h1 className="text-5xl font-black text-black mb-4 tracking-tighter">{t('OrderConfirmed')}<span className="text-gray-200">.</span></h1>
                        <p className="text-gray-400 font-bold uppercase tracking-[0.2em] text-[10px] mb-12">
                            {t('ThankYou', { name: order.fullName.split(' ')[0] })}
                        </p>

                        <div className="w-full bg-pixio-cream/50 rounded-[2rem] p-8 md:p-10 mb-12 text-left border border-gray-100 flex flex-col gap-10">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                                <div>
                                    <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">{t('OrderReference')}</p>
                                    <p className="text-xl font-black text-black tracking-tight">#{order.id.slice(0, 8).toUpperCase()}</p>
                                </div>
                                <div>
                                    <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">{t('OrderDate')}</p>
                                    <p className="text-lg font-black text-black tracking-tight">
                                        {new Date(order.createdAt).toLocaleDateString('fr-FR', {
                                            month: 'long',
                                            day: 'numeric',
                                            year: 'numeric'
                                        })}
                                    </p>
                                </div>
                            </div>

                            <div className="pt-8 border-t border-gray-100">
                                <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-black mb-6">Récapitulatif de la commande</h3>
                                <div className="space-y-4 mb-8">
                                    {order.items.map((item: any) => (
                                        <div key={item.id} className="flex justify-between items-center bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
                                            <div className="flex items-center gap-4">
                                                {item.book?.image || item.pack?.image || item.digitalProduct?.image ? (
                                                    <div className="w-12 h-16 relative rounded-lg overflow-hidden flex-shrink-0 bg-gray-100">
                                                        <img 
                                                            src={item.book?.image || item.pack?.image || item.digitalProduct?.image} 
                                                            alt={item.book?.title || item.pack?.name || item.digitalProduct?.title}
                                                            className="object-cover w-full h-full"
                                                        />
                                                    </div>
                                                ) : (
                                                    <div className="w-12 h-16 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
                                                        <Package className="w-5 h-5 text-gray-400" />
                                                    </div>
                                                )}
                                                <div>
                                                    <p className="text-sm font-bold text-gray-900 line-clamp-1">{item.book?.title || item.pack?.name || item.digitalProduct?.title}</p>
                                                    <p className="text-xs font-bold text-gray-400">Quantité : {item.quantity}</p>
                                                </div>
                                            </div>
                                            <p className="text-sm font-black text-black whitespace-nowrap ml-4">{item.price * item.quantity} درهم</p>
                                        </div>
                                    ))}
                                </div>
                                
                                <div className="flex justify-between items-center mb-2">
                                    <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Sous-total</p>
                                    <p className="text-sm font-bold text-black">{order.subtotal} درهم</p>
                                </div>
                                <div className="flex justify-between items-center mb-2">
                                    <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Livraison</p>
                                    <p className="text-sm font-bold text-black">{order.shippingFees === 0 ? 'Gratuite' : `${order.shippingFees} درهم`}</p>
                                </div>
                                {order.discount > 0 && (
                                    <div className="flex justify-between items-center mb-4">
                                        <p className="text-[10px] font-black uppercase tracking-widest text-green-500">Réduction</p>
                                        <p className="text-sm font-bold text-green-500">-{order.discount} درهم</p>
                                    </div>
                                )}
                                
                                <div className="flex justify-between items-end pt-4 border-t border-gray-100 border-dashed">
                                    <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1">{t('TotalPaid')}</p>
                                    <p className="text-3xl sm:text-4xl font-black text-black tracking-tighter">{order.total} <span className="text-[10px] uppercase font-black text-gray-400 ml-1">درهم</span></p>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-black">{t('NextSteps')}</h3>
                                <div className="space-y-4">
                                    <div className="flex items-center gap-4">
                                        <div className="w-2 h-2 bg-black rounded-full"></div>
                                        <p className="text-xs font-bold text-gray-500 uppercase tracking-widest leading-relaxed">{t('AgentContact')}</p>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <div className="w-2 h-2 bg-black rounded-full"></div>
                                        <p className="text-xs font-bold text-gray-500 uppercase tracking-widest leading-relaxed">{t('PrepareAmount')}</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <Link
                            href="/"
                            className="inline-flex items-center justify-center gap-4 px-12 py-6 bg-black text-white font-black text-xs uppercase tracking-[0.3em] rounded-full hover:bg-gray-800 transition-all shadow-2xl hover:shadow-black/20 group"
                        >
                            <span>{t('BackHome')}</span>
                            <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                        </Link>
                    </div>
                </div>
            </div>
            <Footer />
        </div>
    )
}
