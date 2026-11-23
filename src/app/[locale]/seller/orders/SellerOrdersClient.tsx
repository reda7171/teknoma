'use client'

import React, { useState } from 'react'
import {
    ShoppingBag,
    Calendar,
    User,
    Phone,
    MapPin,
    Truck,
    PackageCheck,
    AlertCircle,
    CheckCircle2,
    X,
    MessageCircle,
    ExternalLink,
    Filter,
    Clock,
    Check,
    ChevronDown,
    Loader2
} from 'lucide-react'
import { OrderStatus } from '@prisma/client'
import { updateSellerOrderStatus } from '@/lib/actions/seller/dashboard'
import { normalizeImage } from '@/lib/utils'

interface OrderItem {
    id: string
    quantity: number
    price: number
    book?: {
        title: string
        image?: string | null
        price: number
    } | null
}

interface Order {
    id: string
    fullName: string
    phone: string
    address: string
    city: string
    total: number
    status: OrderStatus
    createdAt: string | Date
    trackingID?: string | null
    shippingCompany?: string | null
    deliveryNotes?: string | null
    items: OrderItem[]
}

interface SellerOrdersClientProps {
    initialOrders: Order[]
    locale: string
}

export default function SellerOrdersClient({ initialOrders, locale }: SellerOrdersClientProps) {
    const [orders, setOrders] = useState<Order[]>(initialOrders)
    const [filterStatus, setFilterStatus] = useState<string>('ALL')
    const [searchQuery, setSearchQuery] = useState('')

    // Modal expédition
    const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)
    const [modalAction, setModalAction] = useState<OrderStatus | null>(null)
    const [trackingID, setTrackingID] = useState('')
    const [shippingCompany, setShippingCompany] = useState('Amana Express')
    const [deliveryNotes, setDeliveryNotes] = useState('')
    const [isUpdating, setIsUpdating] = useState(false)
    const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

    const statusStyles: Record<string, { bg: string; text: string; border: string }> = {
        PENDING: { bg: 'bg-amber-50', text: 'text-amber-800', border: 'border-amber-200' },
        CONFIRMED: { bg: 'bg-blue-50', text: 'text-blue-800', border: 'border-blue-200' },
        SHIPPED: { bg: 'bg-sky-50', text: 'text-sky-800', border: 'border-sky-200' },
        IN_TRANSIT: { bg: 'bg-cyan-50', text: 'text-cyan-800', border: 'border-cyan-200' },
        OUT_FOR_DELIVERY: { bg: 'bg-teal-50', text: 'text-teal-800', border: 'border-teal-200' },
        DELIVERED: { bg: 'bg-emerald-50', text: 'text-emerald-800', border: 'border-emerald-200' },
        CANCELLED: { bg: 'bg-red-50', text: 'text-red-800', border: 'border-red-200' },
        RETURNED: { bg: 'bg-gray-50', text: 'text-gray-800', border: 'border-gray-200' },
        FAILED: { bg: 'bg-orange-50', text: 'text-orange-800', border: 'border-orange-200' },
    }

    const statusLabels: Record<string, string> = {
        PENDING: 'En attente',
        CONFIRMED: 'Confirmée',
        SHIPPED: 'Expédiée',
        IN_TRANSIT: 'En transit',
        OUT_FOR_DELIVERY: 'En cours de livraison',
        DELIVERED: 'Livrée',
        CANCELLED: 'Annulée',
        RETURNED: 'Retournée',
        FAILED: 'Échouée',
    }

    const filteredOrders = orders.filter((order) => {
        const matchesFilter = filterStatus === 'ALL' || order.status === filterStatus
        const q = searchQuery.toLowerCase().trim()
        const matchesSearch =
            !q ||
            order.fullName.toLowerCase().includes(q) ||
            order.phone.includes(q) ||
            order.city.toLowerCase().includes(q) ||
            order.id.toLowerCase().includes(q)
        return matchesFilter && matchesSearch
    })

    const handleOpenShipModal = (order: Order, targetStatus: OrderStatus) => {
        setSelectedOrder(order)
        setModalAction(targetStatus)
        setTrackingID(order.trackingID || '')
        setShippingCompany(order.shippingCompany || 'Amana Express')
        setDeliveryNotes(order.deliveryNotes || '')
    }

    const handleQuickStatusChange = async (orderId: string, newStatus: OrderStatus) => {
        setIsUpdating(true)
        setFeedback(null)
        try {
            await updateSellerOrderStatus(orderId, newStatus)
            setOrders((prev) =>
                prev.map((o) => (o.id === orderId ? { ...o, status: newStatus } : o))
            )
            setFeedback({
                type: 'success',
                message: `Statut de la commande mis à jour avec succès : ${statusLabels[newStatus] || newStatus}`
            })
        } catch (err: any) {
            setFeedback({
                type: 'error',
                message: err?.message || 'Erreur lors de la mise à jour du statut.'
            })
        } finally {
            setIsUpdating(false)
        }
    }

    const handleConfirmShipment = async () => {
        if (!selectedOrder || !modalAction) return
        setIsUpdating(true)
        setFeedback(null)
        try {
            await updateSellerOrderStatus(selectedOrder.id, modalAction, {
                trackingID,
                shippingCompany,
                deliveryNotes,
            })
            setOrders((prev) =>
                prev.map((o) =>
                    o.id === selectedOrder.id
                        ? {
                              ...o,
                              status: modalAction,
                              trackingID: trackingID || null,
                              shippingCompany: shippingCompany || null,
                              deliveryNotes: deliveryNotes || null,
                          }
                        : o
                )
            )
            setFeedback({
                type: 'success',
                message: `La commande #${selectedOrder.id.slice(-6).toUpperCase()} a été mise à jour vers : ${statusLabels[modalAction]}.`
            })
            setSelectedOrder(null)
            setModalAction(null)
        } catch (err: any) {
            setFeedback({
                type: 'error',
                message: err?.message || 'Impossible d\'enregistrer les informations d\'expédition.'
            })
        } finally {
            setIsUpdating(false)
        }
    }

    const formatWhatsAppUrl = (phone: string, orderId: string, clientName: string) => {
        const cleanPhone = phone.replace(/[^0-9]/g, '')
        const intlPhone = cleanPhone.startsWith('0') ? '212' + cleanPhone.slice(1) : cleanPhone
        const text = encodeURIComponent(
            `Bonjour ${clientName}, nous préparons l'expédition de votre commande Riwaya #${orderId.slice(-6).toUpperCase()}. Restez disponible pour la livraison. Merci pour votre confiance !`
        )
        return `https://wa.me/${intlPhone}?text=${text}`
    }

    return (
        <div className="space-y-8">
            {/* Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-4xl font-black text-black tracking-tighter uppercase">
                        Gestion des Commandes & Expéditions
                    </h1>
                    <p className="text-gray-400 font-bold text-xs mt-1">
                        Traitez vos commandes, renseignez les numéros de suivi et pilotez vos livraisons clients
                    </p>
                </div>
                <div className="flex items-center gap-4">
                    <div className="text-right">
                        <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Total commandes</p>
                        <p className="text-2xl font-black text-black tracking-tighter">{orders.length}</p>
                    </div>
                    <div className="w-12 h-12 bg-gray-100 rounded-2xl flex items-center justify-center">
                        <ShoppingBag className="w-6 h-6 text-black" />
                    </div>
                </div>
            </div>

            {/* Notification Feedback */}
            {feedback && (
                <div
                    className={`p-4 rounded-2xl flex items-center justify-between border ${
                        feedback.type === 'success'
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                            : 'bg-red-50 text-red-800 border-red-200'
                    }`}
                >
                    <div className="flex items-center gap-3">
                        {feedback.type === 'success' ? (
                            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                        ) : (
                            <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
                        )}
                        <span className="text-xs font-bold">{feedback.message}</span>
                    </div>
                    <button onClick={() => setFeedback(null)} className="p-1 hover:opacity-70">
                        <X className="w-4 h-4" />
                    </button>
                </div>
            )}

            {/* Filtres & Recherche */}
            <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-xl shadow-black/5 space-y-4">
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
                    {/* Barre de recherche */}
                    <div className="relative flex-1">
                        <input
                            type="text"
                            placeholder="Rechercher par client, téléphone, ville ou N° commande..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-4 py-3 text-xs font-bold text-black placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-black/10"
                        />
                        {searchQuery && (
                            <button
                                onClick={() => setSearchQuery('')}
                                className="absolute right-3 top-3 text-gray-400 hover:text-black"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        )}
                    </div>

                    <span className="text-xs font-black uppercase tracking-wider text-gray-400 shrink-0">
                        {filteredOrders.length} commande(s)
                    </span>
                </div>

                {/* Filtres statuts */}
                <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-hide">
                    {[
                        { key: 'ALL', label: 'Toutes' },
                        { key: 'PENDING', label: 'En attente' },
                        { key: 'CONFIRMED', label: 'Confirmées' },
                        { key: 'SHIPPED', label: 'Expédiées' },
                        { key: 'OUT_FOR_DELIVERY', label: 'En livraison' },
                        { key: 'DELIVERED', label: 'Livrées' },
                        { key: 'CANCELLED', label: 'Annulées' },
                    ].map((tab) => (
                        <button
                            key={tab.key}
                            onClick={() => setFilterStatus(tab.key)}
                            className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all whitespace-nowrap ${
                                filterStatus === tab.key
                                    ? 'bg-black text-white shadow-md'
                                    : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
                            }`}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Liste des commandes */}
            {filteredOrders.length === 0 ? (
                <div className="bg-white rounded-[2.5rem] p-24 text-center border-dashed border-4 border-gray-100">
                    <ShoppingBag className="w-16 h-16 text-gray-200 mx-auto mb-6" />
                    <p className="text-gray-400 font-bold text-sm">
                        {searchQuery || filterStatus !== 'ALL'
                            ? 'Aucune commande ne correspond à vos filtres actuels.'
                            : 'Aucune commande reçue pour le moment.'}
                    </p>
                </div>
            ) : (
                <div className="space-y-6">
                    {filteredOrders.map((order) => {
                        const style = statusStyles[order.status] || statusStyles.PENDING
                        const label = statusLabels[order.status] || order.status

                        return (
                            <div
                                key={order.id}
                                className="bg-white rounded-[2.5rem] overflow-hidden border border-gray-100 shadow-xl shadow-black/5 hover:border-black/10 transition-all"
                            >
                                <div className="p-8 md:p-10 flex flex-col lg:flex-row gap-8">
                                    {/* Colonne 1: Infos client & Commande */}
                                    <div className="w-full lg:w-1/3 flex flex-col gap-5 lg:pr-8 lg:border-r border-gray-100">
                                        <div className="flex items-center justify-between">
                                            <div className="text-xs font-black uppercase tracking-widest text-black">
                                                Commande #{order.id.slice(-6).toUpperCase()}
                                            </div>
                                            <span
                                                className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${style.bg} ${style.text} ${style.border}`}
                                            >
                                                {label}
                                            </span>
                                        </div>

                                        <div className="space-y-3">
                                            <div className="flex items-center gap-3 text-gray-500 font-bold text-xs">
                                                <Calendar className="w-4 h-4 text-gray-400 shrink-0" />
                                                <span>
                                                    {new Date(order.createdAt).toLocaleDateString('fr-FR', {
                                                        day: 'numeric',
                                                        month: 'short',
                                                        year: 'numeric',
                                                    })}
                                                    &nbsp;à&nbsp;
                                                    {new Date(order.createdAt).toLocaleTimeString('fr-FR', {
                                                        hour: '2-digit',
                                                        minute: '2-digit',
                                                    })}
                                                </span>
                                            </div>

                                            <div className="flex items-center gap-3 text-black font-black text-sm">
                                                <User className="w-4 h-4 text-gray-400 shrink-0" />
                                                <span className="truncate">{order.fullName}</span>
                                            </div>

                                            <div className="flex items-start gap-3 text-gray-600 font-bold text-xs">
                                                <MapPin className="w-4 h-4 text-gray-400 shrink-0 mt-0.5" />
                                                <span>
                                                    <strong className="text-black">{order.city}</strong>, {order.address}
                                                </span>
                                            </div>

                                            <div className="flex items-center justify-between pt-1">
                                                <a
                                                    href={`tel:${order.phone}`}
                                                    className="flex items-center gap-2 text-blue-600 font-black text-xs hover:underline"
                                                >
                                                    <Phone className="w-4 h-4 text-blue-400" />
                                                    {order.phone}
                                                </a>
                                                <a
                                                    href={formatWhatsAppUrl(order.phone, order.id, order.fullName)}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-700 hover:bg-emerald-100 font-black text-[10px] uppercase tracking-wider transition-colors"
                                                >
                                                    <MessageCircle className="w-3.5 h-3.5" /> WhatsApp
                                                </a>
                                            </div>
                                        </div>

                                        {/* Données d'expédition si renseignées */}
                                        {(order.trackingID || order.shippingCompany) && (
                                            <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100 space-y-1.5 text-xs">
                                                <div className="flex items-center gap-2 font-black text-black">
                                                    <Truck className="w-4 h-4 text-blue-600" />
                                                    <span>{order.shippingCompany || 'Transporteur local'}</span>
                                                </div>
                                                {order.trackingID && (
                                                    <div className="text-gray-600 font-mono text-[11px]">
                                                        N° Suivi : <strong className="text-black">{order.trackingID}</strong>
                                                    </div>
                                                )}
                                                {order.deliveryNotes && (
                                                    <p className="text-gray-500 italic text-[11px] pt-1">
                                                        "{order.deliveryNotes}"
                                                    </p>
                                                )}
                                            </div>
                                        )}

                                        <div className="mt-auto pt-4 border-t border-gray-100 flex items-baseline justify-between">
                                            <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">
                                                Total COD
                                            </span>
                                            <span className="text-2xl font-black text-black tracking-tight">
                                                {order.total.toFixed(2)}{' '}
                                                <span className="text-xs font-bold text-gray-500">MAD</span>
                                            </span>
                                        </div>
                                    </div>

                                    {/* Colonne 2: Articles commandés */}
                                    <div className="w-full lg:w-1/3 flex flex-col lg:px-6">
                                        <h3 className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-4">
                                            Livres commandés ({order.items.length})
                                        </h3>
                                        <div className="space-y-3 max-h-[280px] overflow-y-auto pr-2">
                                            {order.items.map((item) => (
                                                <div
                                                    key={item.id}
                                                    className="bg-gray-50 rounded-2xl p-3 flex items-center gap-3 border border-gray-100"
                                                >
                                                    <div className="w-12 h-16 rounded-xl bg-gray-200 overflow-hidden shrink-0">
                                                        {item.book?.image ? (
                                                            <img
                                                                src={normalizeImage(item.book.image)}
                                                                alt={item.book.title}
                                                                className="w-full h-full object-cover"
                                                            />
                                                        ) : (
                                                            <div className="w-full h-full flex items-center justify-center text-gray-400 text-[10px]">
                                                                Livre
                                                            </div>
                                                        )}
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-xs font-black text-black truncate">
                                                            {item.book?.title || 'Livre marketplace'}
                                                        </p>
                                                        <p className="text-[11px] font-bold text-gray-500 mt-0.5">
                                                            Qté : {item.quantity} × {item.price.toFixed(2)} MAD
                                                        </p>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Colonne 3: Actions d'expédition autonome */}
                                    <div className="w-full lg:w-1/3 flex flex-col justify-between lg:pl-6 lg:border-l border-gray-100">
                                        <div>
                                            <h3 className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-4">
                                                Gestion de l'expédition
                                            </h3>

                                            <div className="grid grid-cols-1 gap-2.5">
                                                {/* Bouton Confirmer */}
                                                {order.status === OrderStatus.PENDING && (
                                                    <button
                                                        onClick={() =>
                                                            handleQuickStatusChange(order.id, OrderStatus.CONFIRMED)
                                                        }
                                                        disabled={isUpdating}
                                                        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-black text-xs uppercase tracking-wider py-3 px-4 rounded-xl shadow-md transition-all flex items-center justify-center gap-2"
                                                    >
                                                        <Check className="w-4 h-4" /> Confirmer la commande
                                                    </button>
                                                )}

                                                {/* Bouton Expédier (ouvre modal tracking) */}
                                                {order.status !== OrderStatus.DELIVERED &&
                                                    order.status !== OrderStatus.CANCELLED && (
                                                        <button
                                                            onClick={() =>
                                                                handleOpenShipModal(order, OrderStatus.SHIPPED)
                                                            }
                                                            disabled={isUpdating}
                                                            className="w-full bg-black hover:bg-gray-800 text-white font-black text-xs uppercase tracking-wider py-3 px-4 rounded-xl shadow-md transition-all flex items-center justify-center gap-2"
                                                        >
                                                            <Truck className="w-4 h-4 text-emerald-400" />
                                                            {order.status === OrderStatus.SHIPPED
                                                                ? 'Modifier les infos d\'expédition'
                                                                : 'Expédier avec suivi'}
                                                        </button>
                                                    )}

                                                {/* Bouton Marquer Livrée */}
                                                {order.status === OrderStatus.SHIPPED && (
                                                    <button
                                                        onClick={() =>
                                                            handleQuickStatusChange(order.id, OrderStatus.DELIVERED)
                                                        }
                                                        disabled={isUpdating}
                                                        className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs uppercase tracking-wider py-3 px-4 rounded-xl shadow-md transition-all flex items-center justify-center gap-2"
                                                    >
                                                        <PackageCheck className="w-4 h-4" /> Marquer comme livrée
                                                    </button>
                                                )}

                                                {/* Bouton Annuler */}
                                                {order.status !== OrderStatus.DELIVERED &&
                                                    order.status !== OrderStatus.CANCELLED && (
                                                        <button
                                                            onClick={() =>
                                                                handleQuickStatusChange(order.id, OrderStatus.CANCELLED)
                                                            }
                                                            disabled={isUpdating}
                                                            className="w-full border border-red-200 text-red-600 hover:bg-red-50 font-black text-xs uppercase tracking-wider py-2.5 px-4 rounded-xl transition-all flex items-center justify-center gap-1.5"
                                                        >
                                                            <X className="w-3.5 h-3.5" /> Annuler la commande
                                                        </button>
                                                    )}
                                            </div>
                                        </div>

                                        <p className="text-[11px] text-gray-400 font-bold mt-4 leading-relaxed">
                                            💡 Les changements d'état vers "Expédiée" et "Livrée" actualisent
                                            automatiquement le tableau de bord et informent le client.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        )
                    })}
                </div>
            )}

            {/* Modal d'expédition & Numéro de suivi */}
            {selectedOrder && modalAction && (
                <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-3xl p-8 max-w-lg w-full shadow-2xl border border-gray-100 space-y-6">
                        <div className="flex items-center justify-between pb-4 border-b border-gray-100">
                            <div>
                                <h2 className="text-xl font-black text-black uppercase tracking-tight">
                                    Expédition de la commande
                                </h2>
                                <p className="text-xs text-gray-400 font-bold mt-0.5">
                                    #{selectedOrder.id.slice(-6).toUpperCase()} — {selectedOrder.fullName}
                                </p>
                            </div>
                            <button
                                onClick={() => {
                                    setSelectedOrder(null)
                                    setModalAction(null)
                                }}
                                className="p-2 text-gray-400 hover:text-black rounded-xl hover:bg-gray-100"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="text-xs font-black uppercase tracking-wider text-black block mb-2">
                                    Société de transport / Livreur
                                </label>
                                <select
                                    value={shippingCompany}
                                    onChange={(e) => setShippingCompany(e.target.value)}
                                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-xs font-bold text-black focus:outline-none focus:ring-2 focus:ring-black/10"
                                >
                                    <option value="Amana Express">Amana Express (Poste Maroc)</option>
                                    <option value="Cathedis">Cathedis Express</option>
                                    <option value="Ozone Express">Ozone Express</option>
                                    <option value="SDTM">SDTM Messagerie</option>
                                    <option value="Livreur propre">Livreur interne / Propre coursier</option>
                                    <option value="Autre">Autre transporteur</option>
                                </select>
                            </div>

                            <div>
                                <label className="text-xs font-black uppercase tracking-wider text-black block mb-2">
                                    Numéro de suivi (Tracking ID)
                                </label>
                                <input
                                    type="text"
                                    placeholder="Ex: MA123456789"
                                    value={trackingID}
                                    onChange={(e) => setTrackingID(e.target.value)}
                                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-xs font-bold text-black focus:outline-none focus:ring-2 focus:ring-black/10 font-mono"
                                />
                            </div>

                            <div>
                                <label className="text-xs font-black uppercase tracking-wider text-black block mb-2">
                                    Note d'expédition (Optionnelle)
                                </label>
                                <textarea
                                    rows={2}
                                    placeholder="Ex: Colis remis au centre de tri Casablanca"
                                    value={deliveryNotes}
                                    onChange={(e) => setDeliveryNotes(e.target.value)}
                                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-xs font-bold text-black focus:outline-none focus:ring-2 focus:ring-black/10"
                                />
                            </div>
                        </div>

                        <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100">
                            <button
                                type="button"
                                onClick={() => {
                                    setSelectedOrder(null)
                                    setModalAction(null)
                                }}
                                className="px-5 py-3 rounded-xl border border-gray-200 text-xs font-black uppercase tracking-wider hover:bg-gray-50 transition-colors"
                            >
                                Annuler
                            </button>
                            <button
                                type="button"
                                onClick={handleConfirmShipment}
                                disabled={isUpdating}
                                className="px-6 py-3 rounded-xl bg-black hover:bg-gray-800 text-white text-xs font-black uppercase tracking-wider shadow-lg flex items-center gap-2 disabled:opacity-50 transition-all"
                            >
                                {isUpdating ? (
                                    <>
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                        Enregistrement...
                                    </>
                                ) : (
                                    <>
                                        <Truck className="w-4 h-4" />
                                        Confirmer l'expédition
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
