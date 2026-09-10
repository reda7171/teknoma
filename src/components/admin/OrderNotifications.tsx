'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { Bell, ShoppingCart, X, ExternalLink, Star, RotateCcw } from 'lucide-react'
import Link from 'next/link'
import { useParams } from 'next/navigation'

interface OrderNotif {
    id: string
    type: 'order' | 'cart' | 'review' | 'return'
    fullName: string
    total?: number
    city?: string
    phone?: string
    status?: string
    rating?: number
    createdAt: string
}

export default function OrderNotifications() {
    const { locale } = useParams()
    const lang = typeof locale === 'string' ? locale : 'fr'
    const [notifications, setNotifications] = useState<OrderNotif[]>([])
    const [open, setOpen] = useState(false)
    const [unread, setUnread] = useState(0)
    const [connected, setConnected] = useState(false)
    const audioRef = useRef<AudioContext | null>(null)

    // Son de notification
    const playSound = useCallback(() => {
        try {
            const ctx = new (window.AudioContext || (window as any).webkitAudioContext)()
            const oscillator = ctx.createOscillator()
            const gain = ctx.createGain()
            oscillator.connect(gain)
            gain.connect(ctx.destination)
            oscillator.frequency.setValueAtTime(880, ctx.currentTime)
            oscillator.frequency.exponentialRampToValueAtTime(440, ctx.currentTime + 0.3)
            gain.gain.setValueAtTime(0.3, ctx.currentTime)
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5)
            oscillator.start(ctx.currentTime)
            oscillator.stop(ctx.currentTime + 0.5)
        } catch {}
    }, [])

    // Notification navigateur
    const sendBrowserNotif = useCallback((order: OrderNotif) => {
        if (typeof window === 'undefined' || !('Notification' in window)) return
        if (Notification.permission === 'granted') {
            let title = '🛒 Nouvelle commande !'
            let body = `${order.fullName || 'Anonyme'}`
            
            if (order.type === 'cart') title = '🛒 Panier Abandonné !'
            if (order.type === 'review') {
                title = '⭐ Nouvel Avis Client !'
                body = `${order.fullName} a laissé un avis (${order.rating} ⭐️)`
            }
            if (order.type === 'return') {
                title = '🔄 Commande Retournée !'
                body = `La commande de ${order.fullName} a été retournée.`
            }
            
            if (order.type === 'order' || order.type === 'cart') {
                body += ` — ${order.total} درهم — ${order.city || order.phone || ''}`
            }

            new Notification(title, {
                body,
                icon: '/favicon.ico'
            })
        }
    }, [])

    // SSE connexion
    useEffect(() => {
        // Demander permission notification navigateur (si disponible)
        if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'default') {
            Notification.requestPermission()
        }

        let es: EventSource
        let reconnectTimer: ReturnType<typeof setTimeout>

        function connect() {
            es = new EventSource('/api/admin/notifications/stream')

            es.onopen = () => setConnected(true)
            es.onerror = () => {
                setConnected(false)
                es.close()
                // Reconnexion après 10s
                reconnectTimer = setTimeout(connect, 10000)
            }

            es.onmessage = (e) => {
                try {
                    const data = JSON.parse(e.data)
                    if (data.type === 'new_orders' && data.orders?.length > 0) {
                        const newOrders = data.orders.map((o: any) => ({ ...o, type: 'order' }))
                        setNotifications(prev => {
                            const existingIds = new Set(prev.map(n => n.id))
                            const fresh = newOrders.filter((o: OrderNotif) => !existingIds.has(o.id))
                            if (fresh.length === 0) return prev
                            fresh.forEach((o: OrderNotif) => sendBrowserNotif(o))
                            playSound()
                            setUnread(u => u + fresh.length)
                            return [...fresh, ...prev].slice(0, 20)
                        })
                    }
                    if (data.type === 'new_carts' && data.carts?.length > 0) {
                        const newCarts = data.carts.map((c: any) => ({ ...c, type: 'cart' }))
                        setNotifications(prev => {
                            const existingIds = new Set(prev.map(n => n.id))
                            const fresh = newCarts.filter((o: OrderNotif) => !existingIds.has(o.id))
                            if (fresh.length === 0) return prev
                            fresh.forEach((o: OrderNotif) => sendBrowserNotif(o))
                            playSound()
                            setUnread(u => u + fresh.length)
                            return [...fresh, ...prev].slice(0, 20)
                        })
                    }
                    if (data.type === 'new_reviews' && data.reviews?.length > 0) {
                        const newReviews = data.reviews.map((r: any) => ({ ...r, type: 'review' }))
                        setNotifications(prev => {
                            const existingIds = new Set(prev.map(n => n.id))
                            const fresh = newReviews.filter((o: OrderNotif) => !existingIds.has(o.id))
                            if (fresh.length === 0) return prev
                            fresh.forEach((o: OrderNotif) => sendBrowserNotif(o))
                            playSound()
                            setUnread(u => u + fresh.length)
                            return [...fresh, ...prev].slice(0, 20)
                        })
                    }
                    if (data.type === 'returned_orders' && data.orders?.length > 0) {
                        const newReturns = data.orders.map((o: any) => ({ ...o, type: 'return', createdAt: o.updatedAt }))
                        setNotifications(prev => {
                            const existingIds = new Set(prev.map(n => n.id))
                            const fresh = newReturns.filter((o: OrderNotif) => !existingIds.has(o.id))
                            if (fresh.length === 0) return prev
                            fresh.forEach((o: OrderNotif) => sendBrowserNotif(o))
                            playSound()
                            setUnread(u => u + fresh.length)
                            return [...fresh, ...prev].slice(0, 20)
                        })
                    }
                } catch {}
            }
        }

        connect()
        return () => {
            es?.close()
            clearTimeout(reconnectTimer)
        }
    }, [playSound, sendBrowserNotif])

    const handleOpen = () => {
        setOpen(o => !o)
        setUnread(0)
    }

    const removeNotif = (id: string) => {
        setNotifications(prev => prev.filter(n => n.id !== id))
    }

    return (
        <div className="relative">
            {/* Cloche */}
            <button
                onClick={handleOpen}
                className="relative p-2 rounded-xl hover:bg-white/10 transition-colors"
                title="Notifications commandes"
            >
                <Bell className={`w-5 h-5 ${unread > 0 ? 'text-orange-400 animate-[wiggle_0.5s_ease-in-out_infinite]' : 'text-white/70'}`} />
                {unread > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-orange-500 text-white text-[9px] font-black rounded-full flex items-center justify-center animate-bounce">
                        {unread > 9 ? '9+' : unread}
                    </span>
                )}
                {/* Indicateur connexion */}
                <span className={`absolute bottom-1 right-1 w-1.5 h-1.5 rounded-full ${connected ? 'bg-green-400' : 'bg-red-400'}`} />
            </button>

            {/* Dropdown */}
            {open && (
                <div className="absolute right-0 top-12 w-[85vw] max-w-[320px] sm:w-80 bg-white rounded-2xl shadow-2xl border border-gray-100 z-50 overflow-hidden">
                    <div className="px-4 py-3 bg-gray-900 flex flex-col gap-2">
                        <div className="flex items-center gap-2">
                            <Bell className="w-4 h-4 text-orange-400" />
                            <span className="text-white font-black text-sm">Activité récente</span>
                        </div>
                        <div className="flex items-center gap-1.5 flex-wrap">
                            <Link
                                href={`/${lang}/admin/abandoned-carts`}
                                className="text-[10px] px-2 py-1 rounded bg-red-500/20 text-red-400 hover:bg-red-500/30 font-bold transition-colors"
                                onClick={() => setOpen(false)}
                            >
                                Paniers
                            </Link>
                            <Link
                                href={`/${lang}/admin/reviews`}
                                className="text-[10px] px-2 py-1 rounded bg-yellow-500/20 text-yellow-400 hover:bg-yellow-500/30 font-bold transition-colors"
                                onClick={() => setOpen(false)}
                            >
                                Avis Clients
                            </Link>
                            <Link
                                href={`/${lang}/admin/orders`}
                                className="text-[10px] px-2 py-1 rounded bg-orange-500/20 text-orange-400 hover:bg-orange-500/30 font-bold transition-colors flex items-center gap-1"
                                onClick={() => setOpen(false)}
                            >
                                Commandes <ExternalLink className="w-3 h-3" />
                            </Link>
                        </div>
                    </div>

                    <div className="max-h-72 overflow-y-auto divide-y divide-gray-50">
                        {notifications.length === 0 ? (
                            <div className="py-10 text-center text-gray-400 text-sm">
                                <Bell className="w-8 h-8 mx-auto mb-2 opacity-30" />
                                Aucune nouvelle commande
                            </div>
                        ) : (
                            notifications.map(order => (
                                <div key={order.id} className="flex items-start gap-3 px-4 py-3 hover:bg-gray-50 transition-colors group">
                                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
                                        order.type === 'cart' ? 'bg-red-100' :
                                        order.type === 'review' ? 'bg-yellow-100' :
                                        order.type === 'return' ? 'bg-purple-100' :
                                        'bg-orange-100'
                                    }`}>
                                        {order.type === 'cart' && <ShoppingCart className="w-4 h-4 text-red-600" />}
                                        {order.type === 'review' && <Star className="w-4 h-4 text-yellow-600" />}
                                        {order.type === 'return' && <RotateCcw className="w-4 h-4 text-purple-600" />}
                                        {order.type === 'order' && <ShoppingCart className="w-4 h-4 text-orange-600" />}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2">
                                            <p className="text-sm font-black text-gray-900 truncate">{order.fullName || 'Anonyme'}</p>
                                            {order.type === 'cart' && <span className="text-[9px] bg-red-100 text-red-600 px-1.5 py-0.5 rounded-md font-black uppercase">Abandon</span>}
                                            {order.type === 'review' && <span className="text-[9px] bg-yellow-100 text-yellow-600 px-1.5 py-0.5 rounded-md font-black uppercase">Avis</span>}
                                            {order.type === 'return' && <span className="text-[9px] bg-purple-100 text-purple-600 px-1.5 py-0.5 rounded-md font-black uppercase">Retour</span>}
                                        </div>
                                        {order.type === 'review' ? (
                                            <p className="text-xs text-gray-500 font-medium truncate">{order.rating} ⭐ — En attente de modération</p>
                                        ) : order.type === 'return' ? (
                                            <p className="text-xs text-gray-500 font-medium truncate">{order.city || '-'} — Retournée</p>
                                        ) : (
                                            <p className="text-xs text-gray-500 font-medium truncate">{order.city || order.phone || '-'} — <span className={`${order.type === 'cart' ? 'text-red-600' : 'text-orange-600'} font-black`}>{order.total} درهم</span></p>
                                        )}
                                        <p className="text-[10px] text-gray-400 mt-0.5">
                                            {new Date(order.createdAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                                        </p>
                                    </div>
                                    <button
                                        onClick={() => removeNotif(order.id)}
                                        className="p-1 opacity-0 group-hover:opacity-100 text-gray-400 hover:text-gray-600 transition-all"
                                    >
                                        <X className="w-3 h-3" />
                                    </button>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            )}
        </div>
    )
}
