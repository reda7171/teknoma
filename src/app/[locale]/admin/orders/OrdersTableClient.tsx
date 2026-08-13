'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Eye, Search, Trash2, Phone, CheckCircle2, XCircle } from 'lucide-react'
import { bulkDeleteOrders, syncDeliveryStatus, updateOrderStatus, togglePaymentStatus } from '@/lib/actions/admin-orders'
import { useRouter } from 'next/navigation'

interface OrderItem {
    id: string
    quantity: number
    price: number
    costPrice?: number
    book?: { title: string }
    pack?: { name: string }
}

interface Order {
    id: string
    createdAt: Date
    fullName: string
    phone: string
    city: string
    total: number
    status: string
    trackingID?: string | null
    shippingCompany?: string | null
    shippingCompanyName?: string | null
    shippingCompanySupportPhone?: string | null
    deliveryStatus?: string | null
    paymentMethod?: string | null
    isPaid: boolean
    invoiceNumber?: string | null
    expense?: { title: string } | null
    items: OrderItem[]
}

interface OrdersTableClientProps {
    orders: Order[]
    locale: string
    statusColors: Record<string, string>
    statusLabels: Record<string, string>
    searchTerm: string
    shippingFilter?: string
    paymentFilter?: string
    cityFilter?: string
    deliveryInvoices?: any[]
}

export default function OrdersTableClient({
    orders,
    locale,
    statusColors,
    statusLabels,
    searchTerm,
    shippingFilter = '',
    paymentFilter = '',
    cityFilter = '',
    deliveryInvoices = []
}: OrdersTableClientProps) {
    const router = useRouter()
    const [selectedIds, setSelectedIds] = useState<string[]>([])
    const [isDeleting, setIsDeleting] = useState(false)
    const [syncingId, setSyncingId] = useState<string | null>(null)
    
    // Modal state for Invoice Selection
    const [showInvoiceModal, setShowInvoiceModal] = useState(false)
    const [selectedOrderForInvoice, setSelectedOrderForInvoice] = useState<string | null>(null)
    const [selectedInvoiceId, setSelectedInvoiceId] = useState<string>('')

    const handleSyncDelivery = async (id: string) => {
        setSyncingId(id)
        try {
            const res = await syncDeliveryStatus(id)
            if (res.success) {
                router.refresh()
            } else {
                alert(res.error || 'Erreur lors de la synchronisation')
            }
        } catch (error) {
            alert('Erreur serveur')
        } finally {
            setSyncingId(null)
        }
    }

    const handleStatusChange = async (orderId: string, newStatus: string) => {
        if (!confirm('Voulez-vous vraiment changer le statut de cette commande ?')) return
        try {
            const res = await updateOrderStatus(orderId, newStatus as any)
            if (res.success) {
                router.refresh()
            } else {
                alert(res.error || 'Erreur lors de la mise à jour')
            }
        } catch (error) {
            alert('Erreur serveur')
        }
    }

    const handlePaymentToggle = async (orderId: string, currentPaidStatus: boolean) => {
        const newPaidStatus = !currentPaidStatus
        
        if (newPaidStatus) {
            setSelectedOrderForInvoice(orderId)
            setSelectedInvoiceId('')
            setShowInvoiceModal(true)
        } else {
            if (!confirm('Voulez-vous vraiment marquer cette commande comme non payée ?')) return
            await executePaymentToggle(orderId, false)
        }
    }

    const executePaymentToggle = async (orderId: string, newPaidStatus: boolean, expenseId?: string | null) => {
        try {
            const res = await togglePaymentStatus(orderId, newPaidStatus, expenseId)
            if (res.success) {
                setShowInvoiceModal(false)
                setSelectedOrderForInvoice(null)
                router.refresh()
            } else {
                alert(res.error || 'Erreur lors de la mise à jour')
            }
        } catch (error) {
            alert('Erreur serveur')
        }
    }

    const filteredOrders = orders.filter(order => {
        const matchesSearch = order.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
            order.phone.includes(searchTerm) ||
            order.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
            order.city.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesShipping = shippingFilter ? order.shippingCompany === shippingFilter : true;
        const matchesPayment = paymentFilter ? order.paymentMethod === paymentFilter : true;
        const matchesCity = cityFilter ? order.city?.trim() === cityFilter : true;

        return matchesSearch && matchesShipping && matchesPayment && matchesCity;
    })

    const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.checked) {
            setSelectedIds(filteredOrders.map(o => o.id))
        } else {
            setSelectedIds([])
        }
    }

    const handleSelectOne = (id: string) => {
        if (selectedIds.includes(id)) {
            setSelectedIds(prev => prev.filter(i => i !== id))
        } else {
            setSelectedIds(prev => [...prev, id])
        }
    }

    const handleDeleteBulk = async () => {
        if (!selectedIds.length) return
        if (!confirm(`Êtes-vous sûr de vouloir supprimer ${selectedIds.length} commandes ? cette action est irréversible.`)) return

        setIsDeleting(true)
        try {
            const res = await bulkDeleteOrders(selectedIds)
            if (res.success) {
                setSelectedIds([])
                router.refresh()
            } else {
                alert(res.error || 'Erreur lors de la suppression')
            }
        } catch (error) {
            alert('Une erreur est survenue')
        } finally {
            setIsDeleting(false)
        }
    }

    return (
        <div className="space-y-4">
            <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-wrap gap-4 items-center justify-between">
                <div className="flex items-center gap-4">
                    <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">
                        Total: <span className="text-gray-900 font-black">{filteredOrders.length}</span> / {orders.length}
                    </p>
                    {selectedIds.length > 0 && (
                        <button
                            onClick={handleDeleteBulk}
                            disabled={isDeleting}
                            className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-xl font-bold text-sm hover:bg-red-700 transition-colors disabled:opacity-50"
                        >
                            <Trash2 className="w-4 h-4" />
                            Supprimer ({selectedIds.length})
                        </button>
                    )}
                </div>
            </div>

            {/* Liste */}
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-x-auto">
                <table className="w-full min-w-[900px]">
                    <thead className="bg-gray-50 border-b border-gray-200">
                        <tr>
                            <th className="px-6 py-4 text-left">
                                <input
                                    type="checkbox"
                                    onChange={handleSelectAll}
                                    checked={selectedIds.length > 0 && selectedIds.length === filteredOrders.length}
                                    className="rounded border-gray-300 text-black focus:ring-black"
                                />
                            </th>
                            <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Commande</th>
                            <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Client</th>
                            <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Ville</th>
                            <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Articles</th>
                            <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Total</th>
                            <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Marge Nette</th>
                            <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Livraison</th>
                            <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Paiement</th>
                            <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Statut</th>
                            <th className="px-6 py-4 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                        {filteredOrders.length === 0 ? (
                            <tr>
                                <td colSpan={10} className="px-6 py-12 text-center text-gray-500">
                                    Aucune commande trouvée.
                                </td>
                            </tr>
                        ) : (
                            filteredOrders.map((order) => (
                                <tr key={order.id} className={`hover:bg-gray-50 transition-colors ${selectedIds.includes(order.id) ? 'bg-blue-50/50' : ''}`}>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <input
                                            type="checkbox"
                                            checked={selectedIds.includes(order.id)}
                                            onChange={() => handleSelectOne(order.id)}
                                            className="rounded border-gray-300 text-black focus:ring-black"
                                        />
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="flex items-center gap-2">
                                            <div className="text-sm font-black text-gray-900">#{order.id.slice(0, 8)}</div>
                                            {order.trackingID && (
                                                <div className="w-4 h-4 rounded-full bg-blue-100 flex items-center justify-center cursor-pointer" title={`Expédié: ${order.trackingID}\nCliquez pour synchroniser`} onClick={() => handleSyncDelivery(order.id)}>
                                                    <Search className={`w-2.5 h-2.5 text-blue-600 ${syncingId === order.id ? 'animate-spin' : ''}`} />
                                                </div>
                                            )}
                                        </div>
                                        <div className="text-xs text-gray-500">{new Date(order.createdAt).toLocaleString('fr-FR')}</div>
                                    </td>
                                    <td className="px-6 py-4 max-w-[150px] truncate" title={order.fullName || ''}>
                                        <div className="text-sm font-semibold text-gray-900 truncate">{order.fullName}</div>
                                        <div className="text-xs text-gray-500 truncate">{order.phone}</div>
                                    </td>
                                    <td className="px-6 py-4 max-w-[150px] truncate text-sm text-gray-600" title={order.city || ''}>
                                        {order.city}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="text-sm text-gray-900 font-bold">
                                            {order.items.reduce((s: number, i: any) => s + i.quantity, 0)} article{order.items.reduce((s: number, i: any) => s + i.quantity, 0) > 1 ? 's' : ''}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-blue-600">
                                        {order.total} درهم
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        {(() => {
                                            const itemCosts = order.items.reduce((sum, item) => sum + ((item as any).costPrice || 0) * item.quantity, 0);
                                            const netProfit = order.total - itemCosts - 2.65;
                                            return (
                                                <span className={`text-sm font-black px-2 py-1 rounded-lg ${netProfit >= 0 ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                                                    {netProfit > 0 ? '+' : ''}{netProfit.toFixed(2)} درهم
                                                </span>
                                            );
                                        })()}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        {order.shippingCompany ? (
                                            <div className="flex flex-col gap-1">
                                                <div className="flex items-center gap-2">
                                                    {(order as any).shippingCompanyLogo && (
                                                        <img
                                                            src={(order as any).shippingCompanyLogo}
                                                            alt={order.shippingCompanyName || ''}
                                                            className="w-6 h-6 object-contain rounded"
                                                        />
                                                    )}
                                                    <span className="text-xs font-bold uppercase text-gray-700 bg-gray-100 px-2 py-0.5 rounded-md inline-block w-fit">
                                                        {order.shippingCompanyName || order.shippingCompany}
                                                    </span>
                                                </div>
                                                {order.deliveryStatus && (
                                                    <span className="text-[10px] text-blue-600 font-semibold bg-blue-50 px-2 py-0.5 rounded-md inline-block w-fit">
                                                        {order.deliveryStatus}
                                                    </span>
                                                )}
                                                {order.shippingCompanySupportPhone && (
                                                    <a
                                                        href={`tel:${order.shippingCompanySupportPhone}`}
                                                        className="flex items-center gap-1 text-[10px] font-bold text-orange-600 bg-orange-50 px-2 py-0.5 rounded-md w-fit hover:bg-orange-100 transition-colors"
                                                        title={`Appeler le support ${order.shippingCompanyName}`}
                                                    >
                                                        <Phone className="w-2.5 h-2.5" />
                                                        {order.shippingCompanySupportPhone}
                                                    </a>
                                                )}
                                            </div>
                                        ) : (
                                            <span className="text-xs text-gray-400">—</span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="flex flex-col gap-1">
                                            {order.paymentMethod ? (
                                                <span className={`px-2.5 py-1 inline-flex w-fit text-[10px] leading-5 font-black rounded-lg uppercase tracking-wider ${order.paymentMethod === 'COD' ? 'bg-amber-100 text-amber-800' :
                                                        order.paymentMethod === 'BANK_TRANSFER' ? 'bg-teal-100 text-teal-800' :
                                                            order.paymentMethod === 'STRIPE' ? 'bg-indigo-100 text-indigo-800' :
                                                                order.paymentMethod === 'PAYPAL' ? 'bg-blue-100 text-blue-800' :
                                                                    order.paymentMethod === 'CMI' ? 'bg-orange-100 text-orange-800' :
                                                                        'bg-gray-100 text-gray-700'
                                                    }`}>
                                                    {order.paymentMethod === 'BANK_TRANSFER' ? 'Virement' : order.paymentMethod}
                                                </span>
                                            ) : (
                                                <span className="w-fit px-2.5 py-1 inline-flex text-xs text-gray-400 bg-gray-100 rounded-lg">COD</span>
                                            )}
                                            
                                            <button 
                                                onClick={() => handlePaymentToggle(order.id, !!order.isPaid)}
                                                className={`flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md w-fit cursor-pointer transition-colors ${
                                                    order.isPaid 
                                                    ? 'bg-green-100 text-green-700 hover:bg-green-200' 
                                                    : 'bg-red-50 text-red-600 hover:bg-red-100'
                                                }`}
                                                title="Cliquez pour changer le statut de paiement"
                                            >
                                                {order.isPaid ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                                                {order.isPaid ? 'Payé' : 'Non payé'}
                                            </button>
                                            
                                            {order.isPaid && (order.expense?.title || order.invoiceNumber) && (
                                                <span className="text-[9px] font-medium text-gray-500 truncate w-fit max-w-[120px]" title={`Facture: ${order.expense?.title || order.invoiceNumber}`}>
                                                    Fac: {order.expense?.title || order.invoiceNumber}
                                                </span>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <select
                                            value={order.status}
                                            onChange={(e) => handleStatusChange(order.id, e.target.value)}
                                            className={`px-3 py-1 appearance-none text-xs leading-5 font-bold rounded-full border-0 cursor-pointer outline-none focus:ring-2 focus:ring-black transition-colors ${statusColors[order.status as keyof typeof statusColors]}`}
                                            title="Changer le statut"
                                        >
                                            {Object.entries(statusLabels).map(([val, label]) => (
                                                <option key={val} value={val} className="bg-white text-black font-medium">
                                                    {label}
                                                </option>
                                            ))}
                                        </select>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right flex items-center justify-end gap-2">
                                        <a
                                            href={`https://wa.me/212${order.phone.replace(/^0+/, '')}?text=Bonjour ${order.fullName}, votre commande a bien été reçue sur Riwaya.`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="inline-flex items-center gap-1 text-green-600 hover:text-green-900 font-bold text-sm bg-green-50 px-3 py-1 rounded-lg transition-colors"
                                        >
                                            <span className="text-sm">💬</span> WhatsApp
                                        </a>
                                        <Link
                                            href={`/${locale}/admin/orders/${order.id}`}
                                            className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-900 font-bold text-sm bg-blue-50 px-3 py-1 rounded-lg transition-colors"
                                        >
                                            <Eye className="w-4 h-4" />
                                            Détails
                                        </Link>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* Modal de sélection de facture */}
            {showInvoiceModal && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
                        <h3 className="text-lg font-bold text-gray-900 mb-4">Lier à une facture de livraison</h3>
                        <p className="text-sm text-gray-600 mb-4">Sélectionnez la facture correspondante pour marquer cette commande comme payée.</p>
                        
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">Facture Société de Livraison (Optionnel)</label>
                                <select 
                                    className="w-full px-3 py-2 border rounded-lg bg-gray-50 focus:bg-white outline-none"
                                    value={selectedInvoiceId}
                                    onChange={e => setSelectedInvoiceId(e.target.value)}
                                >
                                    <option value="">-- Ne pas lier à une facture --</option>
                                    {deliveryInvoices.map(inv => (
                                        <option key={inv.id} value={inv.id}>
                                            {inv.title} {inv.description ? `- ${inv.description} ` : ''}- {new Date(inv.date).toLocaleDateString('fr-FR')} ({inv.amount} درهم)
                                        </option>
                                    ))}
                                </select>
                            </div>
                            
                            <div className="flex gap-3 justify-end pt-4">
                                <button
                                    onClick={() => {
                                        setShowInvoiceModal(false)
                                        setSelectedOrderForInvoice(null)
                                    }}
                                    className="px-4 py-2 text-sm font-bold text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                                >
                                    Annuler
                                </button>
                                <button
                                    onClick={() => selectedOrderForInvoice && executePaymentToggle(selectedOrderForInvoice, true, selectedInvoiceId || null)}
                                    className="px-4 py-2 text-sm font-bold text-white bg-black hover:bg-gray-800 rounded-lg transition-colors"
                                >
                                    Confirmer et marquer Payé
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
