'use client'

import { useState, useEffect } from 'react'
import { MessageCircle, ShoppingCart, CheckCircle2, Star, Clock, Phone } from 'lucide-react'
import { getFollowUpData, incrementFollowUp } from '@/lib/actions/followUp'
import Link from 'next/link'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'

export default function FollowUpClient({ locale }: { locale: string }) {
    const [data, setData] = useState<{
        pendingOrders: any[],
        abandonedCarts: any[],
        deliveredOrders: any[]
    } | null>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        getFollowUpData().then(res => {
            setData(res)
            setLoading(false)
        })
    }, [])

    const getWhatsAppLink = (phone: string, type: 'pending' | 'abandoned' | 'review', fullName: string) => {
        // Nettoyer le numéro de téléphone (enlever les espaces, le 0 au début si +212, etc.)
        let cleanPhone = phone.replace(/\s+/g, '')
        if (cleanPhone.startsWith('0')) {
            cleanPhone = '212' + cleanPhone.substring(1) // Supposant le Maroc par défaut
        } else if (!cleanPhone.startsWith('+') && !cleanPhone.startsWith('212')) {
            cleanPhone = '212' + cleanPhone
        }
        cleanPhone = cleanPhone.replace('+', '')

        let message = ''
        const name = fullName ? fullName.split(' ')[0] : 'Client'

        switch (type) {
            case 'pending':
                message = `Bonjour ${name}, c'est l'équipe Riwaya 👋. Nous avons bien reçu votre commande sur notre site. Pouvez-vous nous confirmer que tout est correct pour lancer la livraison ?`
                break
            case 'abandoned':
                message = `Bonjour ${name}, c'est Riwaya 👋. Nous avons remarqué que vous avez laissé des articles dans votre panier. Avez-vous rencontré un problème lors de votre commande ? Nous sommes là pour vous aider !`
                break
            case 'review':
                message = `Bonjour ${name}, c'est Riwaya 👋. Vous avez récemment reçu votre commande. Nous espérons que vous en êtes satisfait ! Pouvez-vous nous laisser un petit avis sur le site ? Ça nous aiderait énormément.`
                break
        }

        return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`
    }

    const handleFollowUp = async (order: any, type: 'pending' | 'abandoned' | 'review') => {
        window.open(getWhatsAppLink(order.phone, type, order.fullName || ''), '_blank')
        
        if (type !== 'abandoned') { // Cart has no order.id for now since we disabled it
            await incrementFollowUp(order.id)
            setData(prev => {
                if (!prev) return prev
                return {
                    ...prev,
                    pendingOrders: type === 'pending' 
                        ? prev.pendingOrders.map(o => o.id === order.id ? { ...o, followUpCount: (o.followUpCount || 0) + 1 } : o)
                        : prev.pendingOrders,
                    deliveredOrders: type === 'review' 
                        ? prev.deliveredOrders.map(o => o.id === order.id ? { ...o, followUpCount: (o.followUpCount || 0) + 1 } : o)
                        : prev.deliveredOrders,
                }
            })
        }
    }

    if (loading) {
        return <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-black"></div></div>
    }

    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-3xl font-black text-black tracking-tight flex items-center gap-3">
                    <MessageCircle className="w-8 h-8 text-blue-600" />
                    Centre de Relance (Follow-up)
                </h1>
                <p className="text-gray-500 mt-2 text-sm font-medium">Relancez vos clients facilement via WhatsApp pour finaliser les ventes et obtenir des avis.</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* 1. Pending Orders (Confirmation) */}
                <div className="bg-white rounded-3xl border border-yellow-100 shadow-sm overflow-hidden flex flex-col">
                    <div className="bg-yellow-50 p-6 border-b border-yellow-100 flex items-center gap-4">
                        <div className="w-12 h-12 bg-yellow-200 text-yellow-700 rounded-2xl flex items-center justify-center shrink-0">
                            <Clock className="w-6 h-6" />
                        </div>
                        <div>
                            <h2 className="font-black text-gray-900 text-lg">À confirmer (COD)</h2>
                            <p className="text-xs font-bold text-yellow-700 uppercase tracking-widest">{data?.pendingOrders.length} Commandes</p>
                        </div>
                    </div>
                    <div className="p-0 flex-1 overflow-y-auto max-h-[500px]">
                        {data?.pendingOrders.map(order => (
                            <div key={order.id} className="p-4 border-b border-gray-50 hover:bg-gray-50 transition-colors flex flex-col gap-3">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <p className="font-bold text-gray-900 text-sm">{order.fullName}</p>
                                        <p className="text-xs text-gray-500">{order.city}</p>
                                    </div>
                                    <p className="font-black text-blue-600 text-sm">{order.total} MAD</p>
                                </div>
                                <div className="flex items-center justify-between mt-2">
                                    <div className="flex flex-col gap-1">
                                        <p className="text-[10px] text-gray-400 font-medium">Il y a {Math.floor((new Date().getTime() - new Date(order.createdAt).getTime()) / (1000 * 60 * 60))}h</p>
                                        {order.followUpCount ? (
                                            <span className="text-[10px] font-bold text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded w-max">
                                                Relancé {order.followUpCount}x
                                            </span>
                                        ) : null}
                                    </div>
                                    <button 
                                        onClick={() => handleFollowUp(order, 'pending')}
                                        className="flex items-center gap-1.5 px-3 py-1.5 bg-green-500 text-white rounded-lg text-[10px] font-black uppercase tracking-wider hover:bg-green-600 transition-colors"
                                    >
                                        <MessageCircle className="w-3 h-3" /> Relancer
                                    </button>
                                </div>
                            </div>
                        ))}
                        {data?.pendingOrders.length === 0 && (
                            <div className="p-8 text-center text-gray-400 text-sm font-medium">Aucune commande en attente.</div>
                        )}
                    </div>
                </div>

                {/* 2. Abandoned Carts */}
                <div className="bg-white rounded-3xl border border-red-100 shadow-sm overflow-hidden flex flex-col">
                    <div className="bg-red-50 p-6 border-b border-red-100 flex items-center gap-4">
                        <div className="w-12 h-12 bg-red-200 text-red-700 rounded-2xl flex items-center justify-center shrink-0">
                            <ShoppingCart className="w-6 h-6" />
                        </div>
                        <div>
                            <h2 className="font-black text-gray-900 text-lg">Paniers Abandonnés</h2>
                            <p className="text-xs font-bold text-red-700 uppercase tracking-widest">{data?.abandonedCarts.length} Paniers (&gt;24h)</p>
                        </div>
                    </div>
                    <div className="p-0 flex-1 overflow-y-auto max-h-[500px]">
                        {data?.abandonedCarts.map(cart => (
                            <div key={cart.id} className="p-4 border-b border-gray-50 hover:bg-gray-50 transition-colors flex flex-col gap-3">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <p className="font-bold text-gray-900 text-sm">{cart.fullName || 'Client inconnu'}</p>
                                        <p className="text-xs text-gray-500 flex items-center gap-1"><Phone className="w-3 h-3"/> {cart.phone}</p>
                                    </div>
                                    <p className="font-black text-blue-600 text-sm">{cart.total} MAD</p>
                                </div>
                                <div className="flex items-center justify-between mt-2">
                                    <p className="text-[10px] text-gray-400 font-medium">{format(new Date(cart.createdAt), 'dd MMM yyyy', { locale: fr })}</p>
                                    {cart.phone && (
                                        <button 
                                            onClick={() => handleFollowUp(cart, 'abandoned')}
                                            className="flex items-center gap-1.5 px-3 py-1.5 bg-green-500 text-white rounded-lg text-[10px] font-black uppercase tracking-wider hover:bg-green-600 transition-colors"
                                        >
                                            <MessageCircle className="w-3 h-3" /> Relancer
                                        </button>
                                    )}
                                </div>
                            </div>
                        ))}
                        {data?.abandonedCarts.length === 0 && (
                            <div className="p-8 text-center text-gray-400 text-sm font-medium">Aucun panier abandonné récent.</div>
                        )}
                    </div>
                </div>

                {/* 3. Review Requests (Delivered Orders) */}
                <div className="bg-white rounded-3xl border border-green-100 shadow-sm overflow-hidden flex flex-col">
                    <div className="bg-green-50 p-6 border-b border-green-100 flex items-center gap-4">
                        <div className="w-12 h-12 bg-green-200 text-green-700 rounded-2xl flex items-center justify-center shrink-0">
                            <Star className="w-6 h-6" />
                        </div>
                        <div>
                            <h2 className="font-black text-gray-900 text-lg">Demande d'Avis</h2>
                            <p className="text-xs font-bold text-green-700 uppercase tracking-widest">{data?.deliveredOrders.length} Livrées (3-15j)</p>
                        </div>
                    </div>
                    <div className="p-0 flex-1 overflow-y-auto max-h-[500px]">
                        {data?.deliveredOrders.map(order => (
                            <div key={order.id} className="p-4 border-b border-gray-50 hover:bg-gray-50 transition-colors flex flex-col gap-3">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <p className="font-bold text-gray-900 text-sm">{order.fullName}</p>
                                        <p className="text-xs text-gray-500">{order.city}</p>
                                    </div>
                                    <div className="flex items-center gap-1 text-[10px] font-bold text-green-600 bg-green-50 px-2 py-0.5 rounded-full">
                                        <CheckCircle2 className="w-3 h-3" /> Livrée
                                    </div>
                                </div>
                                <div className="flex items-center justify-between mt-2">
                                    <div className="flex flex-col gap-1">
                                        <p className="text-[10px] text-gray-400 font-medium">Le {format(new Date(order.updatedAt), 'dd MMM', { locale: fr })}</p>
                                        {order.followUpCount ? (
                                            <span className="text-[10px] font-bold text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded w-max">
                                                Relancé {order.followUpCount}x
                                            </span>
                                        ) : null}
                                    </div>
                                    <button 
                                        onClick={() => handleFollowUp(order, 'review')}
                                        className="flex items-center gap-1.5 px-3 py-1.5 bg-green-500 text-white rounded-lg text-[10px] font-black uppercase tracking-wider hover:bg-green-600 transition-colors"
                                    >
                                        <MessageCircle className="w-3 h-3" /> Demander avis
                                    </button>
                                </div>
                            </div>
                        ))}
                        {data?.deliveredOrders.length === 0 && (
                            <div className="p-8 text-center text-gray-400 text-sm font-medium">Aucune commande récemment livrée.</div>
                        )}
                    </div>
                </div>

            </div>
        </div>
    )
}
