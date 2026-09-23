'use client'

import { useState } from 'react'
import { MessageSquare, X, MessageCircle, Mail, Filter } from 'lucide-react'

const getNotificationLinks = (order: any) => {
    const trackingLink = `https://riwaya.store/fr/track/${order.id}`
    let text = ''
    let subject = 'Suivi de votre commande Riwaya'
    
    switch (order.status) {
        case 'PENDING':
            text = `Bonjour ${order.fullName}, nous avons bien reçu votre commande sur Riwaya ! Vous pouvez suivre son avancement ici : ${trackingLink}`
            break
        case 'ABANDONED_CART':
            subject = `Finalisez votre commande et profitez de -20 DHS offerts ! 🎁`
            text = `Bonjour ${order.fullName},\n\nNous avons remarqué que vous n'avez pas terminé votre commande sur Riwaya.\n\nPour vous remercier de votre visite et vous encourager dans votre lecture, nous vous offrons une remise exceptionnelle de -20 DHS sur votre panier !\n\nAvez-vous besoin d'aide avec un livre ou le paiement à la livraison ? N'hésitez pas à nous répondre.\n\nL'équipe Riwaya.`
            break
        case 'CONFIRMED':
            text = `Bonjour ${order.fullName}, votre commande Riwaya est confirmée et en cours de préparation. Suivi : ${trackingLink}`
            break
        case 'SHIPPED':
            text = `Bonne nouvelle ${order.fullName}, votre commande a été expédiée${order.shippingCompanyName ? ` avec ${order.shippingCompanyName}` : ''}${order.trackingID ? ` (Suivi: ${order.trackingID})` : ''} ! Lien : ${trackingLink}`
            break
        case 'DELIVERED':
            text = `Bonjour ${order.fullName}, votre commande a été livrée ! Bonne lecture et n'hésitez pas à nous laisser un avis.`
            break
        case 'RETURNED':
            text = `Bonjour ${order.fullName}, nous vous informons que votre commande a été marquée comme retournée.`
            break
        case 'CANCELLED':
            text = `Bonjour ${order.fullName}, votre commande a été annulée. Si c'est une erreur, n'hésitez pas à nous contacter.`
            break
        default:
            text = `Bonjour ${order.fullName}, voici le lien de suivi de votre commande Riwaya : ${trackingLink}`
    }

    const phone = order.phone.replace(/^0+/, '').replace(/\s+/g, '')
    const waLink = `https://wa.me/212${phone}?text=${encodeURIComponent(text)}`
    const mailLink = order.email ? `mailto:${order.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(text)}` : null

    return { waLink, mailLink, text }
}

export default function NotificationCenterButton({ orders, statusLabels }: { orders: any[], statusLabels: any }) {
    const [showModal, setShowModal] = useState(false)
    const [filterStatus, setFilterStatus] = useState<string>('ALL')

    const filteredOrders = filterStatus === 'ALL' 
        ? orders 
        : orders.filter(o => o.status === filterStatus)

    return (
        <>
            <button
                onClick={() => setShowModal(true)}
                className="flex items-center gap-2 px-4 py-2 bg-green-100 text-green-700 hover:bg-green-200 rounded-xl font-bold text-xs uppercase tracking-widest transition-colors shadow-sm"
                title="Notifier les clients"
            >
                <MessageSquare className="w-4 h-4" />
                <span className="hidden sm:inline">Notifier Clients</span>
            </button>

            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-3xl shadow-xl w-full max-w-4xl max-h-[85vh] overflow-hidden flex flex-col animate-in fade-in zoom-in duration-200">
                        {/* Header */}
                        <div className="flex justify-between items-center p-6 border-b border-gray-100">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center text-green-600">
                                    <MessageSquare className="w-6 h-6" />
                                </div>
                                <div>
                                    <h3 className="text-xl font-black text-gray-900">Centre de Notifications</h3>
                                    <p className="text-sm text-gray-500 font-medium">
                                        Envoyez rapidement des messages de suivi à vos clients
                                    </p>
                                </div>
                            </div>
                            <button onClick={() => setShowModal(false)} className="p-2 bg-gray-50 hover:bg-gray-100 rounded-full text-gray-400 transition-colors">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        
                        {/* Filters */}
                        <div className="px-6 py-4 bg-gray-50 border-b border-gray-100 flex items-center gap-2 overflow-x-auto">
                            <Filter className="w-4 h-4 text-gray-400 mr-2" />
                            <button 
                                onClick={() => setFilterStatus('ALL')}
                                className={`px-4 py-1.5 rounded-full text-sm font-bold whitespace-nowrap transition-colors ${filterStatus === 'ALL' ? 'bg-black text-white' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'}`}
                            >
                                Toutes
                            </button>
                            {Object.entries(statusLabels).map(([key, label]) => (
                                <button 
                                    key={key}
                                    onClick={() => setFilterStatus(key)}
                                    className={`px-4 py-1.5 rounded-full text-sm font-bold whitespace-nowrap transition-colors ${filterStatus === key ? 'bg-black text-white' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'}`}
                                >
                                    {label as string}
                                </button>
                            ))}
                        </div>

                        {/* List */}
                        <div className="p-6 overflow-y-auto flex-1 bg-gray-50/30">
                            {filteredOrders.length > 0 ? (
                                <div className="space-y-4">
                                    {filteredOrders.map((order: any, idx: number) => {
                                        const { waLink, mailLink, text } = getNotificationLinks(order)
                                        return (
                                            <div key={idx} className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex flex-col gap-4 hover:border-green-200 transition-colors">
                                                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                                                    <div>
                                                        <div className="flex items-center gap-2 mb-1">
                                                            <span className="text-sm font-black text-gray-900">{order.fullName}</span>
                                                            <span className="text-xs font-bold text-gray-500 bg-gray-100 px-2 py-0.5 rounded-md">
                                                                {statusLabels[order.status as keyof typeof statusLabels] || order.status}
                                                            </span>
                                                        </div>
                                                        <p className="text-xs text-gray-500 font-medium font-mono">{order.id.split('-')[0].toUpperCase()} • {order.phone}</p>
                                                    </div>
                                                    
                                                    <div className="flex items-center gap-2 w-full sm:w-auto">
                                                        <a
                                                            href={waLink}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-green-50 text-green-600 hover:bg-green-100 hover:text-green-700 px-4 py-2 rounded-xl font-bold text-sm transition-colors"
                                                        >
                                                            <MessageCircle className="w-4 h-4" />
                                                            WhatsApp
                                                        </a>
                                                        {mailLink && (
                                                            <a
                                                                href={mailLink}
                                                                className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-blue-50 text-blue-600 hover:bg-blue-100 hover:text-blue-700 px-4 py-2 rounded-xl font-bold text-sm transition-colors"
                                                                title="Envoyer un email"
                                                            >
                                                                <Mail className="w-4 h-4" />
                                                                Email
                                                            </a>
                                                        )}
                                                    </div>
                                                </div>
                                                <div className="bg-gray-50 p-3 rounded-xl border border-gray-100">
                                                    <p className="text-xs text-gray-600 italic">"{text}"</p>
                                                </div>
                                            </div>
                                        )
                                    })}
                                </div>
                            ) : (
                                <div className="text-center py-16">
                                    <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                        <MessageSquare className="w-8 h-8 text-gray-300" />
                                    </div>
                                    <h4 className="text-gray-900 font-bold mb-1">Aucune commande</h4>
                                    <p className="text-gray-500 text-sm">Il n'y a aucune commande dans cette catégorie.</p>
                                </div>
                            )}
                        </div>
                        
                        {/* Footer */}
                        <div className="p-4 border-t border-gray-100 bg-white flex justify-end">
                            <button 
                                onClick={() => setShowModal(false)}
                                className="px-6 py-2 bg-gray-900 text-white font-bold rounded-xl hover:bg-black transition-colors"
                            >
                                Fermer
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    )
}
