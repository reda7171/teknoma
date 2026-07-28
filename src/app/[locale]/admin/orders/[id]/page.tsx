import { getOrderById } from '@/lib/actions/admin-orders'
import { prisma } from '@/lib/prisma'
import { getSetting } from '@/lib/actions/site-settings'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { normalizeImage } from '@/lib/utils'
import ImageWithFallback from '@/components/ImageWithFallback'
import { ArrowLeft, User, Phone, MapPin, Calendar, Clock, Package, ShoppingBag, Truck } from 'lucide-react'
import OrderStatusUpdater from '@/components/admin/OrderStatusUpdater'
import DeliverySyncButton from '@/components/admin/DeliverySyncButton'
import OrderEditModal from '@/components/admin/OrderEditModal'
import DeleteOrderButton from '@/components/admin/DeleteOrderButton'
import OrderItemsEditor from '@/components/admin/OrderItemsEditor'
import { isAuthenticated } from '@/lib/actions/auth'
import { redirect } from 'next/navigation'

export default async function OrderDetailsPage({
    params,
}: {
    params: Promise<{ id: string; locale: string }>
}) {
    const { id, locale } = await params

    const isAuth = await isAuthenticated()
    if (!isAuth) {
        redirect(`/${locale}/admin/login`)
    }

    const order = await getOrderById(id)

    if (!order) {
        notFound()
    }

    let shippingCompany = null
    if (order.shippingCompany) {
        shippingCompany = await prisma.shippingCompany.findUnique({
            where: { id: order.shippingCompany }
        })
    }

    const activeCompanies = await prisma.shippingCompany.findMany({
        where: { isActive: true },
        select: { id: true, name: true }
    })
    
    const defaultCompanyId = await getSetting('DEFAULT_SHIPPING_COMPANY_ID')

    return (
        <div className="space-y-8">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-1">
                    <Link
                        href={`/${locale}/admin/orders`}
                        className="inline-flex items-center text-sm text-gray-500 hover:text-gray-900 transition-colors"
                    >
                        <ArrowLeft className="w-4 h-4 mr-1" />
                        Retour aux commandes
                    </Link>
                    <h1 className="text-3xl font-black text-gray-900">
                        Commande <span className="text-blue-600">#{order.id.slice(0, 8)}</span>
                    </h1>
                </div>
                <div className="flex items-center gap-3">
                    <DeleteOrderButton orderId={order.id} />
                    <OrderEditModal order={{
                        id: order.id,
                        fullName: order.fullName,
                        phone: order.phone,
                        address: order.address,
                        city: order.city,
                        total: order.total,
                        comment: order.comment
                    }} />
                    <OrderStatusUpdater orderId={order.id} currentStatus={order.status} />
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Main: Items */}
                <div className="lg:col-span-2 space-y-6">
                    <OrderItemsEditor 
                        orderId={order.id}
                        initialItems={order.items}
                        locale={locale}
                        shippingFees={order.shippingFees}
                        discount={order.discount}
                    />

                    {/* Commentaire */}
                    {order.comment && (
                        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
                            <h3 className="text-lg font-bold text-gray-900 mb-2">Commentaire client</h3>
                            <p className="text-gray-600 italic">"{order.comment}"</p>
                        </div>
                    )}
                </div>

                {/* Sidebar: Customer Info */}
                <div className="space-y-6">
                    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
                        <h2 className="text-lg font-bold text-gray-900 mb-6 flex items-center gap-2">
                            <User className="w-5 h-5 text-gray-400" />
                            Client
                        </h2>
                        <div className="space-y-4">
                            <div className="flex items-start gap-3">
                                <div className="p-2 bg-blue-50 rounded-lg shrink-0">
                                    <User className="w-5 h-5 text-blue-600" />
                                </div>
                                <div>
                                    <p className="text-xs text-gray-500 uppercase font-black">Nom & Prénom</p>
                                    <p className="font-bold text-gray-900">{order.fullName}</p>
                                </div>
                            </div>
                            <div className="flex items-start gap-3">
                                <div className="p-2 bg-blue-50 rounded-lg shrink-0">
                                    <Phone className="w-5 h-5 text-blue-600" />
                                </div>
                                <div>
                                    <p className="text-xs text-gray-500 uppercase font-black">Téléphone</p>
                                    <p className="font-bold text-gray-900">{order.phone}</p>
                                </div>
                            </div>

                            {/* Méthode de paiement */}
                            {(order as any).paymentMethod && (
                                <div className="flex items-start gap-3">
                                    <div className="p-2 bg-emerald-50 rounded-lg shrink-0">
                                        <ShoppingBag className="w-5 h-5 text-emerald-600" />
                                    </div>
                                    <div>
                                        <p className="text-xs text-gray-500 uppercase font-black">Mode de paiement</p>
                                        <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-black uppercase tracking-wider mt-1 ${
                                            (order as any).paymentMethod === 'COD'           ? 'bg-amber-100 text-amber-800' :
                                            (order as any).paymentMethod === 'BANK_TRANSFER' ? 'bg-teal-100 text-teal-800' :
                                            (order as any).paymentMethod === 'STRIPE'        ? 'bg-indigo-100 text-indigo-800' :
                                            (order as any).paymentMethod === 'PAYPAL'        ? 'bg-blue-100 text-blue-800' :
                                            (order as any).paymentMethod === 'CMI'           ? 'bg-orange-100 text-orange-800' :
                                            'bg-gray-100 text-gray-700'
                                        }`}>
                                            {(order as any).paymentMethod === 'COD'           ? 'Paiement à la livraison' :
                                             (order as any).paymentMethod === 'BANK_TRANSFER' ? 'Virement Bancaire' :
                                             (order as any).paymentMethod === 'STRIPE'        ? 'Carte Bancaire (Stripe)' :
                                             (order as any).paymentMethod === 'PAYPAL'        ? 'PayPal' :
                                             (order as any).paymentMethod === 'CMI'           ? 'CMI' :
                                             (order as any).paymentMethod}
                                        </span>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Livraison WithYou */}
                    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 overflow-hidden">
                        <h2 className="text-lg font-bold text-gray-900 mb-6 flex items-center gap-2">
                            <Truck className="w-5 h-5 text-gray-400" />
                            Expédition
                        </h2>

                        {shippingCompany && (
                            <div className="mb-6 p-4 bg-gray-50 rounded-xl border border-gray-100 flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    {shippingCompany.logo ? (
                                        <img 
                                            src={shippingCompany.logo} 
                                            alt={shippingCompany.name} 
                                            className="w-10 h-10 object-contain rounded bg-white border border-gray-200 p-1"
                                        />
                                    ) : (
                                        <div className="w-10 h-10 bg-gray-200 rounded flex items-center justify-center text-gray-500 font-bold text-xs">
                                            {shippingCompany.name.substring(0, 2).toUpperCase()}
                                        </div>
                                    )}
                                    <div>
                                        <p className="text-sm font-bold text-gray-900">{shippingCompany.name}</p>
                                        <p className="text-xs text-gray-500">Transporteur</p>
                                    </div>
                                </div>
                                {shippingCompany.supportPhone && (
                                    <a 
                                        href={`tel:${shippingCompany.supportPhone}`}
                                        className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-lg text-sm font-bold transition-colors"
                                        title={shippingCompany.supportPhone}
                                    >
                                        <Phone className="w-4 h-4" />
                                        Support
                                    </a>
                                )}
                            </div>
                        )}

                        <DeliverySyncButton
                            orderId={order.id}
                            trackingID={(order as any).trackingID}
                            deliveryStatus={(order as any).deliveryStatus}
                            shippingCompanyId={order.shippingCompany}
                            companies={activeCompanies}
                            defaultCompanyId={defaultCompanyId}
                        />
                    </div>

                    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
                        <h2 className="text-lg font-bold text-gray-900 mb-6 flex items-center gap-2">
                            <MapPin className="w-5 h-5 text-gray-400" />
                            Livraison
                        </h2>
                        <div className="space-y-4">
                            <div>
                                <p className="text-xs text-gray-500 uppercase font-black">Ville</p>
                                <p className="font-bold text-gray-900">{order.city}</p>
                            </div>
                            <div>
                                <p className="text-xs text-gray-500 uppercase font-black">Adresse</p>
                                <p className="text-sm font-medium text-gray-900 leading-relaxed">
                                    {order.address}
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
                        <h2 className="text-lg font-bold text-gray-900 mb-6 flex items-center gap-2">
                            <Calendar className="w-5 h-5 text-gray-400" />
                            Historique
                        </h2>
                        <div className="space-y-4">
                            <div className="flex items-center gap-3">
                                <Clock className="w-4 h-4 text-gray-400" />
                                <div>
                                    <p className="text-xs text-gray-500 font-bold uppercase">Créée le</p>
                                    <p className="text-sm text-gray-900">
                                        {new Date(order.createdAt).toLocaleString('fr-FR')}
                                    </p>
                                </div>
                            </div>
                            {order.updatedAt && (
                                <div className="flex items-center gap-3">
                                    <Clock className="w-4 h-4 text-gray-400" />
                                    <div>
                                        <p className="text-xs text-gray-500 font-bold uppercase">Mise à jour le</p>
                                        <p className="text-sm text-gray-900">
                                            {new Date(order.updatedAt).toLocaleString('fr-FR')}
                                        </p>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Tracking & UTM */}
                    {((order as any).utmSource || (order as any).fbclid || (order as any).ttclid) && (
                        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
                            <h2 className="text-lg font-bold text-gray-900 mb-6 flex items-center gap-2">
                                <span className="text-gray-400">📊</span>
                                Acquisition (Tracking)
                            </h2>
                            <div className="space-y-4">
                                {(order as any).utmSource && (
                                    <div>
                                        <p className="text-xs text-gray-500 font-bold uppercase">Source / Medium</p>
                                        <p className="text-sm font-medium text-gray-900">
                                            {(order as any).utmSource} / {(order as any).utmMedium || 'none'}
                                        </p>
                                    </div>
                                )}
                                {(order as any).utmCampaign && (
                                    <div>
                                        <p className="text-xs text-gray-500 font-bold uppercase">Campagne</p>
                                        <p className="text-sm font-medium text-gray-900">{(order as any).utmCampaign}</p>
                                    </div>
                                )}
                                {(order as any).fbclid && (
                                    <div>
                                        <p className="text-xs text-gray-500 font-bold uppercase">Meta Click ID (fbclid)</p>
                                        <p className="text-xs text-gray-900 truncate" title={(order as any).fbclid}>
                                            {(order as any).fbclid}
                                        </p>
                                    </div>
                                )}
                                {(order as any).ttclid && (
                                    <div>
                                        <p className="text-xs text-gray-500 font-bold uppercase">TikTok Click ID</p>
                                        <p className="text-xs text-gray-900 truncate" title={(order as any).ttclid}>
                                            {(order as any).ttclid}
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
