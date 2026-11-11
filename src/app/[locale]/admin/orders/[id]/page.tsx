import { requirePageRole } from '@/lib/page-authorization'
import { getOrderById } from '@/lib/actions/admin-orders'
import { prisma } from '@/lib/prisma'
import { getSetting } from '@/lib/server/site-settings'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { normalizeImage } from '@/lib/utils'
import ImageWithFallback from '@/components/ImageWithFallback'
import { ArrowLeft, User, Phone, MapPin, Calendar, Clock, Package, ShoppingBag, Truck } from 'lucide-react'
import OrderStatusUpdater from '@/components/admin/OrderStatusUpdater'
import ReturnRecoveryBadgeButton from '@/components/admin/ReturnRecoveryBadgeButton'
import { getJsonBooleanMap, RECOVERY_STATUSES_KEY } from '@/lib/server/order-stock'
import DeliverySyncButton from '@/components/admin/DeliverySyncButton'
import OrderEditModal from '@/components/admin/OrderEditModal'
import DeleteOrderButton from '@/components/admin/DeleteOrderButton'
import OrderItemsEditor from '@/components/admin/OrderItemsEditor'
import OrderInvoiceModal from '@/components/admin/OrderInvoiceModal'
import OrderNavArrows from '@/components/admin/OrderNavArrows'
import { Receipt, CheckCircle2, AlertCircle } from 'lucide-react'
import { isAuthenticated } from '@/lib/actions/auth'
import { redirect } from 'next/navigation'

export default async function OrderDetailsPage({
    params,
}: {
    params: Promise<{ id: string; locale: string }>
}) {
    await requirePageRole(["ADMIN","MANAGER","CONFIRMATOR"])

    const { id, locale } = await params

    const isAuth = await isAuthenticated()
    if (!isAuth) {
        redirect(`/${locale}/admin/login`)
    }

    const order = await getOrderById(id)

    if (!order) {
        notFound()
    }

    const [prevOrder, nextOrder] = await Promise.all([
        prisma.order.findFirst({
            where: {
                OR: [
                    { createdAt: { gt: order.createdAt } },
                    { createdAt: order.createdAt, id: { gt: order.id } }
                ]
            },
            orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
            select: { id: true, fullName: true, total: true }
        }),
        prisma.order.findFirst({
            where: {
                OR: [
                    { createdAt: { lt: order.createdAt } },
                    { createdAt: order.createdAt, id: { lt: order.id } }
                ]
            },
            orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
            select: { id: true, fullName: true, total: true }
        })
    ])

    const paidAmount = Number((order as any).paidAmount) || (order.isPaid ? Number(order.total) : 0)
    const remainingAmount = (order as any).remainingAmount !== null && (order as any).remainingAmount !== undefined
        ? Number((order as any).remainingAmount)
        : (order.isPaid ? 0 : Math.max(0, Number(order.total) - paidAmount))
    const isFullyPaid = order.isPaid || remainingAmount <= 0

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

    const warehouses = await prisma.warehouse.findMany({
        where: { active: true },
        select: { id: true, name: true, location: true },
        orderBy: { name: 'asc' }
    })

    const recoveryMap = await getJsonBooleanMap(prisma, RECOVERY_STATUSES_KEY)
    const isReturnRecovered = recoveryMap[order.id] === true

    return (
        <div className="space-y-8 relative">
            <OrderNavArrows prevOrder={prevOrder} nextOrder={nextOrder} locale={locale} />

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
                <div className="flex flex-wrap items-center gap-3">
                    <OrderInvoiceModal order={order} locale={locale} />
                    <DeleteOrderButton orderId={order.id} />
                    <OrderEditModal order={{
                        id: order.id,
                        fullName: order.fullName,
                        phone: order.phone,
                        address: order.address,
                        city: order.city,
                        total: order.total,
                        comment: order.comment,
                        shippingCompany: order.shippingCompany,
                        shippingFees: order.shippingFees
                    }}
                    companies={activeCompanies}
                    />
                    <OrderStatusUpdater orderId={order.id} currentStatus={order.status} />
                    {order.status === 'RETURNED' && (
                        <ReturnRecoveryBadgeButton orderId={order.id} initialRecovered={isReturnRecovered} />
                    )}
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

                {/* Sidebar */}
                <div className="space-y-6">
                    {/* Facturation & Reste à payer */}
                    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 relative overflow-hidden">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                                <Receipt className="w-5 h-5 text-emerald-600" />
                                Facturation & Reste
                            </h2>
                            <span className={`px-2.5 py-1 rounded-full text-xs font-black uppercase tracking-wider ${
                                isFullyPaid
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : paidAmount > 0
                                        ? 'bg-amber-100 text-amber-800'
                                        : 'bg-red-100 text-red-800'
                            }`}>
                                {isFullyPaid ? 'Soldé' : (paidAmount > 0 ? 'Acompte' : 'Non Réglé')}
                            </span>
                        </div>

                        <div className="space-y-3 divide-y divide-gray-100 text-sm">
                            {(order as any).invoiceNumber && (
                                <div className="flex justify-between items-center pt-2">
                                    <span className="text-gray-500 font-medium">N° Facture</span>
                                    <span className="font-mono font-bold text-gray-900 bg-gray-50 px-2 py-0.5 rounded border border-gray-200">
                                        {(order as any).invoiceNumber}
                                    </span>
                                </div>
                            )}

                            <div className="flex justify-between items-center pt-2">
                                <span className="text-gray-500 font-medium">Total Commande</span>
                                <span className="font-bold text-gray-900">{order.total.toFixed(2)} DH</span>
                            </div>

                            <div className="flex justify-between items-center pt-2">
                                <span className="text-gray-500 font-medium">Montant Réglé (Acompte)</span>
                                <span className="font-bold text-emerald-600">+{paidAmount.toFixed(2)} DH</span>
                            </div>

                            <div className="pt-3">
                                <div className={`p-3 rounded-xl border flex items-center justify-between ${
                                    remainingAmount > 0
                                        ? 'bg-red-50 border-red-200 text-red-950'
                                        : 'bg-emerald-50 border-emerald-200 text-emerald-950'
                                }`}>
                                    <div>
                                        <p className="text-xs uppercase tracking-wider font-black opacity-80">Reste à encaisser</p>
                                        <p className="text-xl font-black">{remainingAmount.toFixed(2)} DH</p>
                                    </div>
                                    {remainingAmount > 0 ? (
                                        <AlertCircle className="w-6 h-6 text-red-500 shrink-0" />
                                    ) : (
                                        <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0" />
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="mt-4 pt-3 border-t border-gray-100">
                            <OrderInvoiceModal
                                order={order}
                                locale={locale}
                                triggerText="Éditer la facture & le reste"
                                triggerClassName="w-full justify-center flex items-center gap-2 px-4 py-2.5 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700 transition shadow-sm text-sm"
                            />
                        </div>
                    </div>

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
