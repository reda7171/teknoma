'use client'

import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import { Eye, Search, Trash2, Phone, CheckCircle2, XCircle, Plus, MessageCircle, Mail, Truck } from 'lucide-react'
import { bulkDeleteOrders, syncDeliveryStatus, updateOrderStatus, togglePaymentStatus } from '@/lib/actions/admin-orders'
import { updateReturnRecoveryStatus } from '@/lib/actions/return-reminders'
import { useRouter } from 'next/navigation'
import ExportOrdersButton from '@/components/admin/ExportOrdersButton'

const ADMIN_TIME_ZONE = 'Africa/Casablanca'

const formatAdminDate = (value: Date | string) => new Intl.DateTimeFormat('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    timeZone: ADMIN_TIME_ZONE
}).format(new Date(value))

const getNotificationLinks = (order: any) => {
    const trackingLink = `https://tekno.ma/fr/track/${order.id}`
    let text = ''

    switch (order.status) {
        case 'PENDING':
            text = `Bonjour ${order.fullName}, nous avons bien reçu votre commande sur Tekno Store ! Vous pouvez suivre son avancement ici : ${trackingLink}`
            break
        case 'CONFIRMED':
            text = `Bonjour ${order.fullName}, votre commande Tekno Store est confirmée et en cours de préparation. Suivi : ${trackingLink}`
            break
        case 'SHIPPED':
            text = `Bonne nouvelle ${order.fullName}, votre commande a été expédiée${order.shippingCompanyName ? ` avec ${order.shippingCompanyName}` : ''}${order.trackingID ? ` (Suivi: ${order.trackingID})` : ''} ! Lien : ${trackingLink}`
            break
        case 'DELIVERED':
            text = `Bonjour ${order.fullName}, votre commande a été livrée ! Bonne lecture et n'hésitez pas à nous laisser un avis.`
            break
        default:
            text = `Bonjour ${order.fullName}, voici le lien de suivi de votre commande Tekno Store : ${trackingLink}`
    }

    const phone = order.phone.replace(/^0+/, '').replace(/\s+/g, '')
    const waLink = `https://wa.me/212${phone}?text=${encodeURIComponent(text)}`
    const mailLink = order.email ? `mailto:${order.email}?subject=${encodeURIComponent('Suivi de votre commande Tekno Store')}&body=${encodeURIComponent(text)}` : null

    return { waLink, mailLink }
}

const getCompanyReturnWaLink = (order: any) => {
    const companyName = order.shippingCompanyName || 'Société de livraison'
    const daysSince = Math.floor((Date.now() - new Date(order.createdAt).getTime()) / (1000 * 60 * 60 * 24))
    const formattedDate = formatAdminDate(order.createdAt)
    const trackingText = order.trackingID ? `N° Suivi : ${order.trackingID}` : `Commande #${order.id.slice(0, 8)}`

    const message = `Bonjour ${companyName},\n\nJe vous contacte concernant le colis en retour de notre commande Tekno Store :\n- ${trackingText}\n- Client : ${order.fullName} (${order.city})\n- Date commande : ${formattedDate} (il y a ${daysSince} jours)\n- Montant : ${order.total} DH\n\nCe colis est marqué en retour depuis plus d'une semaine. Pourriez-vous s'il vous plaît nous confirmer où se trouve le colis et quand il nous sera retourné à notre dépôt ?\n\nMerci de votre collaboration.\nL'équipe Tekno Store.`

    if (order.shippingCompanySupportPhone) {
        let clean = order.shippingCompanySupportPhone.replace(/\D/g, '')
        if (clean.startsWith('0')) clean = '212' + clean.slice(1)
        else if (!clean.startsWith('212')) clean = '212' + clean
        return `https://wa.me/${clean}?text=${encodeURIComponent(message)}`
    }
    return `https://wa.me/?text=${encodeURIComponent(message)}`
}

function normalizeForSearch(str: string): string {
    return String(str || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[\u064B-\u0652]/g, '')
        .replace(/[أإآ]/g, 'ا')
        .replace(/ة/g, 'ه')
        .replace(/ى/g, 'ي')
        .toLowerCase()
        .trim()
}

interface OrderItem {
    id: string
    quantity: number
    price: number
    costPrice?: number
    book?: { title: string; titleFr?: string | null; titleEn?: string | null }
    pack?: { name: string; nameFr?: string | null; nameEn?: string | null }
    extraProduct?: { name: string }
}

interface Order {
    id: string
    createdAt: Date
    createdAtFormatted: string
    fullName: string
    email?: string | null
    phone: string
    city: string
    total: number
    status: string
    salesChannel: string
    trackingID?: string | null
    shippingCompany?: string | null
    shippingCompanyName?: string | null
    shippingCompanySupportPhone?: string | null
    deliveryStatus?: string | null
    paymentMethod?: string | null
    isPaid: boolean
    invoiceNumber?: string | null
    expense?: { title: string } | null
    isRecovered?: boolean | null
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
    productTitleFilter?: string
    salesChannelFilter?: string
    deliveryInvoices?: any[]
    selectedIds?: string[]
    onSelectionChange?: (ids: string[]) => void
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
    productTitleFilter = '',
    salesChannelFilter = '',
    deliveryInvoices = [],
    selectedIds: propsSelectedIds,
    onSelectionChange
}: OrdersTableClientProps) {
    const router = useRouter()
    const [localOrders, setLocalOrders] = useState<Order[]>(orders)
    const [internalSelectedIds, setInternalSelectedIds] = useState<string[]>([])
    const selectedIds = propsSelectedIds ?? internalSelectedIds

    const updateSelectedIds = (updater: string[] | ((prev: string[]) => string[])) => {
        const next = typeof updater === 'function' ? updater(selectedIds) : updater
        if (onSelectionChange) {
            onSelectionChange(next)
        } else {
            setInternalSelectedIds(next)
        }
    }

    const selectedOrders = useMemo(() => {
        return localOrders.filter(o => selectedIds.includes(o.id))
    }, [localOrders, selectedIds])

    const [isDeleting, setIsDeleting] = useState(false)
    const [syncingId, setSyncingId] = useState<string | null>(null)

    useEffect(() => {
        setLocalOrders(orders)
    }, [orders])

    // Modal state for Invoice Selection
    const [showInvoiceModal, setShowInvoiceModal] = useState(false)
    const [selectedOrderForInvoice, setSelectedOrderForInvoice] = useState<string | null>(null)
    const [selectedInvoiceId, setSelectedInvoiceId] = useState<string>('')
    const [invoiceSearch, setInvoiceSearch] = useState<string>('')

    const handleSyncDelivery = async (id: string) => {
        setSyncingId(id)
        try {
            const res = await syncDeliveryStatus(id)
            if (res.success) {
                setLocalOrders(prev => prev.map(o => o.id === id ? {
                    ...o,
                    deliveryStatus: res.status ?? o.deliveryStatus,
                    status: (res.internalStatus as any) ?? o.status
                } : o))
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
                setLocalOrders(prev => prev.map(o => o.id === orderId ? {
                    ...o,
                    status: newStatus
                } : o))
                router.refresh()
            } else {
                alert(res.error || 'Erreur lors de la mise à jour')
            }
        } catch (error) {
            alert('Erreur serveur')
        }
    }

    const [togglingRecoveryId, setTogglingRecoveryId] = useState<string | null>(null)

    const handleToggleRecovery = async (orderId: string, currentStatus?: boolean | null) => {
        const nextStatus = !currentStatus
        setTogglingRecoveryId(orderId)
        try {
            const res = await updateReturnRecoveryStatus(orderId, nextStatus)
            if (res.success) {
                setLocalOrders(prev => prev.map(o => o.id === orderId ? {
                    ...o,
                    isRecovered: nextStatus
                } : o))
            }
        } catch (error) {
            console.error('Error updating recovery status:', error)
        } finally {
            setTogglingRecoveryId(null)
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
                setLocalOrders(prev => prev.map(o => o.id === orderId ? {
                    ...o,
                    isPaid: newPaidStatus
                } : o))
                router.refresh()
            } else {
                alert(res.error || 'Erreur lors de la mise à jour')
            }
        } catch (error) {
            alert('Erreur serveur')
        }
    }

    const filteredOrders = localOrders.filter(order => {
        const normSearch = normalizeForSearch(searchTerm)
        const normProductFilter = normalizeForSearch(productTitleFilter)

        const itemTitles = (order.items || []).map(i => [
            i.book?.title,
            i.book?.titleFr,
            i.book?.titleEn,
            i.pack?.name,
            i.pack?.nameFr,
            i.pack?.nameEn,
            i.extraProduct?.name
        ].filter(Boolean).join(' ')).join(' ')

        const normItemTitles = normalizeForSearch(itemTitles)

        const matchesSearch = !normSearch ? true : (
            normalizeForSearch(order.fullName).includes(normSearch) ||
            order.phone.includes(searchTerm) ||
            order.id.toLowerCase().includes(normSearch) ||
            normalizeForSearch(order.city).includes(normSearch) ||
            normItemTitles.includes(normSearch)
        )

        const matchesProductTitle = !normProductFilter ? true : normItemTitles.includes(normProductFilter)
        const matchesShipping = shippingFilter ? order.shippingCompany === shippingFilter : true
        const matchesPayment = paymentFilter ? order.paymentMethod === paymentFilter : true
        const matchesCity = cityFilter ? order.city?.trim() === cityFilter : true
        const matchesSalesChannel = salesChannelFilter ? order.salesChannel === salesChannelFilter : true

        return matchesSearch && matchesProductTitle && matchesShipping && matchesPayment && matchesCity && matchesSalesChannel
    })

    const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.checked) {
            updateSelectedIds(filteredOrders.map(o => o.id))
        } else {
            updateSelectedIds([])
        }
    }

    const handleSelectOne = (id: string) => {
        if (selectedIds.includes(id)) {
            updateSelectedIds(selectedIds.filter(i => i !== id))
        } else {
            updateSelectedIds([...selectedIds, id])
        }
    }

    const handleDeleteBulk = async () => {
        if (!selectedIds.length) return
        if (!confirm(`Êtes-vous sûr de vouloir supprimer ${selectedIds.length} commandes ? cette action est irréversible.`)) return

        setIsDeleting(true)
        try {
            const res = await bulkDeleteOrders(selectedIds)
            if (res.success) {
                setLocalOrders(prev => prev.filter(o => !selectedIds.includes(o.id)))
                updateSelectedIds([])
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
                        Total: <span className="text-gray-900 font-black">{filteredOrders.length}</span> / {localOrders.length}
                    </p>
                    {selectedIds.length > 0 && (
                        <div className="flex items-center gap-2">
                            <ExportOrdersButton orders={selectedOrders} totalSelected={selectedIds.length} />
                            <button
                                onClick={handleDeleteBulk}
                                disabled={isDeleting}
                                className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-xl font-bold text-sm hover:bg-red-700 transition-colors disabled:opacity-50"
                            >
                                <Trash2 className="w-4 h-4" />
                                Supprimer ({selectedIds.length})
                            </button>
                        </div>
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
                                        <Link href={`/${locale}/admin/orders/${order.id}`} className="group flex flex-col gap-0.5">
                                            <div className="flex items-center gap-2">
                                                <div className="text-sm font-black text-gray-900 group-hover:text-blue-600 transition-colors">#{order.id.slice(0, 8)}</div>
                                                {order.trackingID && (
                                                    <div className="w-4 h-4 rounded-full bg-blue-100 flex items-center justify-center cursor-pointer hover:bg-blue-200 transition-colors" title={`Expédié: ${order.trackingID}\nCliquez pour synchroniser`} onClick={(e) => { e.preventDefault(); handleSyncDelivery(order.id) }}>
                                                        <Search className={`w-2.5 h-2.5 text-blue-600 ${syncingId === order.id ? 'animate-spin' : ''}`} />
                                                    </div>
                                                )}
                                            </div>
                                            {order.trackingID && (
                                                <div className="mt-1 p-1 bg-blue-50/70 border border-blue-100/80 rounded flex flex-col text-[11px] leading-snug w-fit">

                                                    <span className="font-mono text-gray-900 font-bold">
                                                        ID: {order.trackingID}
                                                    </span>
                                                </div>
                                            )}
                                            <div className="text-xs text-gray-400 group-hover:text-blue-400 transition-colors mt-0.5">{order.createdAtFormatted}</div>
                                            <div className="mt-1">
                                                <span className="inline-flex rounded-md bg-gray-100 px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wide text-gray-600">
                                                    {{
                                                        TEKNO_STORE: 'Store',
                                                        TEKNO_MA: 'tekno.ma',
                                                        ADMIN_POS: 'POS',
                                                        MOBILE_APP: 'Mobile',
                                                        ADMIN_IMPORT: 'Import'
                                                    }[order.salesChannel] || order.salesChannel}
                                                </span>
                                            </div>
                                        </Link>
                                    </td>
                                    <td className="px-6 py-4 max-w-[150px] truncate" title={order.fullName || ''}>
                                        <div className="text-sm font-semibold text-gray-900 truncate">{order.fullName}</div>
                                        <div className="text-xs text-gray-500 truncate">{order.phone}</div>
                                    </td>
                                    <td className="px-6 py-4 max-w-[150px] truncate text-sm text-gray-600" title={order.city || ''}>
                                        {order.city}
                                    </td>
                                    <td className="px-6 py-4 max-w-[220px]">
                                        <div className="text-sm text-gray-900 font-bold">
                                            {order.items.reduce((s: number, i: any) => s + i.quantity, 0)} article{order.items.reduce((s: number, i: any) => s + i.quantity, 0) > 1 ? 's' : ''}
                                        </div>
                                        <div className="text-[11px] text-gray-500 truncate" title={order.items.map((i: any) => `${i.quantity}x ${i.book?.title || i.pack?.name || i.extraProduct?.name || 'Article'}`).join(', ')}>
                                            {order.items.map((i: any) => i.book?.title || i.pack?.name || i.extraProduct?.name || 'Article').filter(Boolean).join(', ')}
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
                                                className={`flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md w-fit cursor-pointer transition-colors ${order.isPaid
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
                                        {(() => {
                                            const isOldReturn = order.status === 'RETURNED' && (Date.now() - new Date(order.createdAt).getTime()) >= 7 * 24 * 60 * 60 * 1000
                                            return (
                                                <div className="flex flex-col">
                                                    <select aria-label="Champ de sélection"
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
                                                    {isOldReturn && (
                                                        <span className="block text-[9px] font-black text-amber-800 bg-amber-50 border border-amber-300 px-1.5 py-0.5 rounded text-center mt-1">
                                                            ⚠️ Retour &gt; 7j
                                                        </span>
                                                    )}
                                                    {(isOldReturn || order.status === 'RETURNED') && (
                                                        <button
                                                            type="button"
                                                            disabled={togglingRecoveryId === order.id}
                                                            onClick={() => handleToggleRecovery(order.id, order.isRecovered)}
                                                            className={`block text-[9px] font-black px-1.5 py-0.5 rounded text-center mt-1 border transition-all cursor-pointer ${
                                                                order.isRecovered
                                                                    ? 'text-emerald-800 bg-emerald-50 border-emerald-300 hover:bg-emerald-100'
                                                                    : 'text-rose-800 bg-rose-50 border-rose-300 hover:bg-rose-100'
                                                            } ${togglingRecoveryId === order.id ? 'opacity-50 cursor-wait' : ''}`}
                                                            title={locale === 'ar' ? 'انقر لتغيير حالة الاسترداد' : locale === 'en' ? 'Click to toggle recovery status' : 'Cliquer pour basculer : Récupéré / Non Récupéré'}
                                                        >
                                                            {order.isRecovered
                                                                ? (locale === 'ar' ? '✓ تم الاسترداد' : locale === 'en' ? '✓ Recovered' : '✓ Récupéré')
                                                                : (locale === 'ar' ? '✗ لم يسترد' : locale === 'en' ? '✗ Not Recovered' : '✗ Non Récupéré')}
                                                        </button>
                                                    )}
                                                </div>
                                            )
                                        })()}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right flex items-center justify-end gap-2">
                                        <div className="flex items-center gap-1">
                                            {(() => {
                                                const links = getNotificationLinks(order)
                                                const isOldReturn = order.status === 'RETURNED' && (Date.now() - new Date(order.createdAt).getTime()) >= 7 * 24 * 60 * 60 * 1000
                                                return (
                                                    <>
                                                        {isOldReturn && (
                                                            <a
                                                                href={getCompanyReturnWaLink(order)}
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                                title={`Relancer la société de livraison sur WhatsApp (${order.shippingCompanyName || 'Livreur'})`}
                                                                className="flex items-center justify-center w-8 h-8 rounded-lg bg-amber-500 hover:bg-amber-600 text-white shadow-sm transition-colors"
                                                            >
                                                                <Truck className="w-4 h-4" />
                                                            </a>
                                                        )}
                                                        <a
                                                            href={links.waLink}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            title="Notifier par WhatsApp"
                                                            className="flex items-center justify-center w-8 h-8 rounded-lg bg-green-50 text-green-600 hover:bg-green-100 transition-colors"
                                                        >
                                                            <MessageCircle className="w-4 h-4" />
                                                        </a>
                                                        {links.mailLink && (
                                                            <a
                                                                href={links.mailLink}
                                                                title="Notifier par Email"
                                                                className="flex items-center justify-center w-8 h-8 rounded-lg bg-gray-50 text-gray-600 hover:bg-gray-100 transition-colors"
                                                            >
                                                                <Mail className="w-4 h-4" />
                                                            </a>
                                                        )}
                                                    </>
                                                )
                                            })()}
                                        </div>
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
                                <input
                                    type="text"
                                    placeholder="Chercher une facture (ex: titre, description)..."
                                    className="w-full px-3 py-2 border rounded-lg bg-gray-50 focus:bg-white outline-none mb-2"
                                    value={invoiceSearch}
                                    onChange={e => setInvoiceSearch(e.target.value)}
                                />
                                <select aria-label="Champ de sélection"
                                    className="w-full px-3 py-2 border rounded-lg bg-gray-50 focus:bg-white outline-none"
                                    value={selectedInvoiceId}
                                    onChange={e => setSelectedInvoiceId(e.target.value)}
                                >
                                    <option value="">-- Ne pas lier à une facture --</option>
                                    {deliveryInvoices.filter(inv =>
                                        inv.title.toLowerCase().includes(invoiceSearch.toLowerCase()) ||
                                        (inv.description && inv.description.toLowerCase().includes(invoiceSearch.toLowerCase()))
                                    ).map(inv => (
                                        <option key={inv.id} value={inv.id}>
                                            {inv.title} {inv.description ? `- ${inv.description} ` : ''}- {formatAdminDate(inv.date)} ({inv.amount} درهم)
                                        </option>
                                    ))}
                                </select>
                                <div className="mt-2 text-right">
                                    <Link href="/fr/admin/finance" target="_blank" className="inline-flex items-center gap-1 text-xs font-bold text-blue-600 hover:text-blue-800 transition-colors bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg">
                                        <Plus className="w-3 h-3" /> Nouvelle facture de livraison
                                    </Link>
                                </div>
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
