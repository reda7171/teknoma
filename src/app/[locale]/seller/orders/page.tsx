import { getSellerOrders } from '@/lib/actions/seller/dashboard'
import { ShoppingBag, Calendar, User, Phone, MapPin, Eye } from 'lucide-react'
import { normalizeImage } from '@/lib/utils'
import { getTranslations } from 'next-intl/server'

export default async function SellerOrdersPage() {
    const [orders, t] = await Promise.all([
        getSellerOrders(),
        getTranslations('Seller.Orders')
    ])

    // Statuts basés sur les clés JSON — aucun texte hardcodé
    const statusStyles: Record<string, string> = {
        PENDING:           'bg-yellow-100 text-yellow-700 border-yellow-200',
        CONFIRMED:         'bg-blue-100 text-blue-700 border-blue-200',
        SHIPPED:           'bg-indigo-100 text-indigo-700 border-indigo-200',
        IN_TRANSIT:        'bg-cyan-100 text-cyan-700 border-cyan-200',
        OUT_FOR_DELIVERY:  'bg-teal-100 text-teal-700 border-teal-200',
        DELIVERED:         'bg-green-100 text-green-700 border-green-200',
        CANCELLED:         'bg-red-100 text-red-700 border-red-200',
        RETURNED:          'bg-gray-100 text-gray-700 border-gray-200',
        FAILED:            'bg-orange-100 text-orange-700 border-orange-200',
    }

    // Mappage statut → clé JSON
    const statusKey: Record<string, string> = {
        PENDING:           'StatusPending',
        CONFIRMED:         'StatusConfirmed',
        SHIPPED:           'StatusShipped',
        IN_TRANSIT:        'StatusInTransit',
        OUT_FOR_DELIVERY:  'StatusOutForDelivery',
        DELIVERED:         'StatusDelivered',
        CANCELLED:         'StatusCancelled',
        RETURNED:          'StatusReturned',
        FAILED:            'StatusFailed',
    }

    return (
        <div className="space-y-12">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-4xl font-black text-black tracking-tighter uppercase">{t('Title')}</h1>
                    <p className="text-gray-400 font-bold text-sm mt-2">{t('Subtitle')}</p>
                </div>
                <div className="flex items-center gap-6">
                    <div className="text-right">
                        <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">{t('TotalOrders')}</p>
                        <p className="text-2xl font-black text-black tracking-tighter">{orders.length}</p>
                    </div>
                    <div className="w-12 h-12 bg-pixio-cream rounded-full flex items-center justify-center">
                        <ShoppingBag className="w-6 h-6 text-black" />
                    </div>
                </div>
            </div>

            {/* Liste des commandes */}
            {orders.length === 0 ? (
                <div className="bg-white rounded-[2.5rem] p-24 text-center border-dashed border-4 border-gray-100">
                    <ShoppingBag className="w-16 h-16 text-gray-100 mx-auto mb-6" />
                    <p className="text-gray-400 font-bold text-sm">{t('Empty')}</p>
                </div>
            ) : (
                <div className="space-y-8">
                    {orders.map((order) => {
                        const styleClass = statusStyles[order.status] || statusStyles.PENDING
                        const labelKey = (statusKey[order.status] || 'StatusPending') as Parameters<typeof t>[0]

                        return (
                            <div key={order.id} className="bg-white rounded-[2.5rem] overflow-hidden border border-gray-100 shadow-xl shadow-black/5 hover:border-black/5 transition-all group">
                                <div className="p-8 md:p-10 flex flex-col md:flex-row gap-10">

                                    {/* Infos commande */}
                                    <div className="w-full md:w-1/3 flex flex-col gap-6 pr-10 border-r border-gray-50 border-dashed">
                                        <div className="flex items-center justify-between">
                                            <div className="text-xs font-black uppercase tracking-widest text-black">
                                                {t('OrderId')} #{order.id.slice(-6).toUpperCase()}
                                            </div>
                                            <div className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest border ${styleClass}`}>
                                                {t(labelKey)}
                                            </div>
                                        </div>

                                        <div className="space-y-4">
                                            <div className="flex items-center gap-4 text-gray-500 font-bold text-sm">
                                                <Calendar className="w-4 h-4 text-gray-300" />
                                                {new Date(order.createdAt).toLocaleDateString('fr-FR')}
                                                &nbsp;
                                                {new Date(order.createdAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                                            </div>
                                            <div className="flex items-center gap-4 text-gray-900 font-black text-sm">
                                                <User className="w-4 h-4 text-gray-300" />
                                                {order.fullName}
                                            </div>
                                            <div className="flex items-center gap-4 text-gray-500 font-bold text-xs">
                                                <MapPin className="w-4 h-4 text-gray-300" />
                                                {order.city}, {order.address.slice(0, 30)}…
                                            </div>
                                            <div className="flex items-center gap-4 text-blue-600 font-black text-xs underline decoration-2 underline-offset-4 decoration-blue-100">
                                                <Phone className="w-4 h-4 text-blue-200" />
                                                {order.phone}
                                            </div>
                                        </div>

                                        <div className="mt-auto pt-6 border-t border-gray-50">
                                            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-300 mb-1">{t('Total')}</p>
                                            <div className="text-3xl font-black text-black tracking-tighter">
                                                {order.total.toFixed(2)} <span className="text-sm">درهم</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Articles */}
                                    <div className="w-full md:w-2/3">
                                        <h3 className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-6">
                                            {t('Articles')} ({order.items.length})
                                        </h3>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 max-h-[400px] overflow-y-auto pr-4 scrollbar-hide">
                                            {order.items.map((item) => (
                                                <div key={item.id} className="bg-gray-50 rounded-2xl p-4 flex gap-4 hover:shadow-lg transition-all group/item">
                                                    <div className="w-16 h-20 rounded-xl overflow-hidden bg-white shadow-sm shrink-0">
                                                        <img
                                                            src={normalizeImage(item.book?.image || '')}
                                                            alt={item.book?.title || ''}
                                                            className="w-full h-full object-cover group-hover/item:scale-110 transition-transform duration-500"
                                                        />
                                                    </div>
                                                    <div className="flex flex-col justify-center min-w-0">
                                                        <h4 className="text-xs font-black text-black truncate group-hover/item:text-amber-600 transition-colors">
                                                            {item.book?.title}
                                                        </h4>
                                                        <p className="text-[10px] font-bold text-gray-400 mt-1 uppercase tracking-tight">
                                                            {item.quantity} x {item.price.toFixed(2)} درهم
                                                        </p>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>

                                        <div className="flex justify-end gap-3 mt-10">
                                            <button className="bg-gray-50 text-gray-700 px-6 py-4 rounded-xl font-bold text-sm hover:bg-black hover:text-white transition-all shadow-sm">
                                                {t('ChangeStatus')}
                                            </button>
                                            <button className="bg-black text-white px-8 py-4 rounded-xl font-bold text-sm flex items-center gap-3 hover:bg-pixio-yellow hover:text-black transition-all shadow-xl active:scale-95 group/btn">
                                                {t('Ship')} <Eye className="w-4 h-4 group-hover/btn:translate-x-1 transition-transform" />
                                            </button>
                                        </div>
                                    </div>

                                </div>
                            </div>
                        )
                    })}
                </div>
            )}
        </div>
    )
}
