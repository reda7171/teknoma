'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { Bell, ShoppingCart, X, ExternalLink, Star, RotateCcw, BookOpen, AlertTriangle, Truck, MessageCircle } from 'lucide-react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { getPendingReturnReminders, type ReturnReminder } from '@/lib/actions/return-reminders'

interface OrderNotif {
    id: string
    type: 'order' | 'cart' | 'review' | 'return' | 'reservation'
    fullName: string
    total?: number
    city?: string
    phone?: string
    status?: string
    rating?: number
    bookTitle?: string
    whatsapp?: string
    createdAt: string
}

export default function OrderNotifications() {
    const { locale } = useParams()
    const lang = typeof locale === 'string' ? locale : 'fr'
    const [notifications, setNotifications] = useState<OrderNotif[]>([])
    const [returnReminders, setReturnReminders] = useState<ReturnReminder[]>([])
    const [activeTab, setActiveTab] = useState<'all' | 'returns'>('all')
    const [open, setOpen] = useState(false)
    const [unread, setUnread] = useState(0)
    const [connected, setConnected] = useState(false)
    const audioRef = useRef<AudioContext | null>(null)

    const refreshReminders = useCallback(() => {
        getPendingReturnReminders()
            .then(data => setReturnReminders(data))
            .catch(() => {})
    }, [])

    useEffect(() => {
        refreshReminders()
        const timer = setInterval(refreshReminders, 60000)
        return () => clearInterval(timer)
    }, [refreshReminders])

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
            if (order.type === 'reservation') {
                title = '📖 Nouvelle Réservation Livre !'
                body = `${order.whatsapp || 'Anonyme'} — ${order.bookTitle || 'Livre'}` 
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

    // Polling court : évite les connexions SSE multiples et les réponses
    // interrompues qui faisaient planter le runtime WASM de Next.js.
    useEffect(() => {
        // Demander permission notification navigateur (si disponible)
        if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'default') {
            Notification.requestPermission()
        }

        let cancelled = false
        let lastPollAt = new Date().toISOString()

        const poll = async () => {
            try {
                const response = await fetch(`/api/admin/notifications/stream?since=${encodeURIComponent(lastPollAt)}`, {
                    cache: 'no-store'
                })
                if (!response.ok) throw new Error(`HTTP ${response.status}`)
                const payload = await response.json()
                if (cancelled) return
                lastPollAt = payload.now
                setConnected(true)

                for (const data of payload.events || []) {
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
                    if (data.type === 'new_reservations' && data.reservations?.length > 0) {
                        const newReservations = data.reservations.map((r: any) => ({
                            ...r,
                            type: 'reservation',
                            fullName: r.whatsapp || 'Anonyme',
                            bookTitle: r.book?.title || 'Livre'
                        }))
                        setNotifications(prev => {
                            const existingIds = new Set(prev.map(n => n.id))
                            const fresh = newReservations.filter((o: OrderNotif) => !existingIds.has(o.id))
                            if (fresh.length === 0) return prev
                            fresh.forEach((o: OrderNotif) => sendBrowserNotif(o))
                            playSound()
                            setUnread(u => u + fresh.length)
                            return [...fresh, ...prev].slice(0, 20)
                        })
                    }
                }
            } catch {
                if (!cancelled) setConnected(false)
            }
        }

        void poll()
        const timer = setInterval(() => void poll(), 15000)
        return () => {
            cancelled = true
            clearInterval(timer)
        }
    }, [playSound, sendBrowserNotif])

    const handleOpen = () => {
        setOpen(o => !o)
        setUnread(0)
    }

    const removeNotif = (id: string) => {
        setNotifications(prev => prev.filter(n => n.id !== id))
    }

    const totalAlerts = unread + returnReminders.length

    return (
        <div className="relative">
            {/* Cloche */}
            <button
                onClick={handleOpen}
                className="relative p-2 rounded-xl hover:bg-white/10 transition-colors"
                title="Notifications commandes & retours"
            >
                <Bell className={`w-5 h-5 ${totalAlerts > 0 ? (returnReminders.length > 0 ? 'text-amber-400' : 'text-orange-400') + ' animate-[wiggle_0.5s_ease-in-out_infinite]' : 'text-white/70'}`} />
                {totalAlerts > 0 && (
                    <span className={`absolute -top-0.5 -right-0.5 min-w-4 h-4 px-1 ${returnReminders.length > 0 ? 'bg-amber-500' : 'bg-orange-500'} text-white text-[9px] font-black rounded-full flex items-center justify-center animate-bounce shadow-md`}>
                        {totalAlerts > 9 ? '9+' : totalAlerts}
                    </span>
                )}
                {/* Indicateur connexion */}
                <span className={`absolute bottom-1 right-1 w-1.5 h-1.5 rounded-full ${connected ? 'bg-green-400' : 'bg-red-400'}`} />
            </button>

            {/* Dropdown / Modal */}
            {open && (
                <>
                    {/* Backdrop */}
                    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[90]" onClick={() => setOpen(false)} />
                    
                    {/* Modal Content */}
                    <div 
                        role="dialog"
                        aria-modal="true"
                        aria-label="Notifications"
                        className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[92vw] max-w-[440px] bg-white rounded-2xl shadow-2xl border border-gray-100 z-[100] overflow-hidden"
                    >
                    <div className="px-4 py-3 bg-gray-900 flex flex-col gap-2.5">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <Bell className="w-4 h-4 text-orange-400" />
                                <span className="text-white font-black text-sm">Centre de Notifications</span>
                            </div>
                            <button
                                onClick={() => setOpen(false)}
                                className="text-gray-400 hover:text-white p-1 rounded-lg transition-colors"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        {/* Onglets Activité vs Retours > 7j */}
                        <div className="flex items-center gap-1.5 bg-gray-800/80 p-1 rounded-xl">
                            <button
                                onClick={() => setActiveTab('all')}
                                className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-black transition-all ${
                                    activeTab === 'all'
                                        ? 'bg-white text-gray-900 shadow-sm'
                                        : 'text-gray-400 hover:text-white'
                                }`}
                            >
                                Activité ({notifications.length})
                            </button>
                            <button
                                onClick={() => setActiveTab('returns')}
                                className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-black transition-all flex items-center justify-center gap-1.5 ${
                                    activeTab === 'returns'
                                        ? 'bg-amber-500 text-white shadow-sm'
                                        : 'text-amber-400/90 hover:text-amber-300'
                                }`}
                            >
                                <Truck className="w-3.5 h-3.5" />
                                <span>Retours &gt; 7j ({returnReminders.length})</span>
                            </button>
                        </div>

                        <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
                            <Link
                                href={`/${lang}/admin/abandoned-carts`}
                                className="text-[10px] px-2 py-0.5 rounded bg-red-500/20 text-red-400 hover:bg-red-500/30 font-bold transition-colors"
                                onClick={() => setOpen(false)}
                            >
                                Paniers
                            </Link>
                            <Link
                                href={`/${lang}/admin/reviews`}
                                className="text-[10px] px-2 py-0.5 rounded bg-yellow-500/20 text-yellow-400 hover:bg-yellow-500/30 font-bold transition-colors"
                                onClick={() => setOpen(false)}
                            >
                                Avis Clients
                            </Link>
                            <Link
                                href={`/${lang}/admin/orders`}
                                className="text-[10px] px-2 py-0.5 rounded bg-orange-500/20 text-orange-400 hover:bg-orange-500/30 font-bold transition-colors flex items-center gap-1"
                                onClick={() => setOpen(false)}
                            >
                                Commandes <ExternalLink className="w-2.5 h-2.5" />
                            </Link>
                            <Link
                                href={`/${lang}/admin/reservations`}
                                className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 font-bold transition-colors flex items-center gap-1"
                                onClick={() => setOpen(false)}
                            >
                                Réservations <ExternalLink className="w-2.5 h-2.5" />
                            </Link>
                        </div>
                    </div>

                    {/* Contenu selon onglet */}
                    {activeTab === 'returns' ? (
                        <div className="max-h-80 overflow-y-auto divide-y divide-gray-100 p-3 space-y-2.5">
                            {returnReminders.length === 0 ? (
                                <div className="py-10 text-center text-gray-400 text-sm">
                                    <RotateCcw className="w-8 h-8 mx-auto mb-2 opacity-30 text-emerald-500" />
                                    Aucun retour en attente (&gt; 7 jours)
                                </div>
                            ) : (
                                returnReminders.map(reminder => (
                                    <div key={reminder.id} className="p-3 bg-amber-50/60 hover:bg-amber-50 rounded-xl border border-amber-200 transition-colors flex flex-col gap-2">
                                        <div className="flex items-center justify-between gap-1">
                                            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-slate-900 text-white rounded-md text-[10px] font-black">
                                                <Truck className="w-3 h-3 text-amber-400" />
                                                {reminder.shippingCompanyName}
                                            </span>
                                            <span className="text-[10px] font-black text-amber-800 bg-amber-100 border border-amber-300 px-1.5 py-0.5 rounded">
                                                Il y a {reminder.daysSinceOrder}j
                                            </span>
                                        </div>
                                        <div>
                                            <p className="text-xs font-black text-slate-900 truncate">
                                                {reminder.fullName} — {reminder.city}
                                            </p>
                                            <p className="text-[11px] text-slate-600 font-medium">
                                                {reminder.trackingID ? `Suivi : ${reminder.trackingID}` : `Commande #${reminder.id.slice(0, 8)}`} • <span className="font-bold text-slate-900">{reminder.total} DH</span>
                                            </p>
                                        </div>
                                        <div className="flex items-center gap-2 pt-1">
                                            <a
                                                href={reminder.whatsappLink}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-black uppercase tracking-wider rounded-lg shadow-sm transition-colors"
                                                title="Contacter le transporteur sur WhatsApp avec message pré-rempli"
                                            >
                                                <MessageCircle className="w-3.5 h-3.5" />
                                                <span>WhatsApp {reminder.shippingCompanyName}</span>
                                            </a>
                                            <Link
                                                href={`/${lang}/admin/orders/${reminder.id}`}
                                                onClick={() => setOpen(false)}
                                                className="px-2.5 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-[11px] font-bold rounded-lg"
                                                title="Voir détails commande"
                                            >
                                                <ExternalLink className="w-3.5 h-3.5" />
                                            </Link>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    ) : (
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
                                            order.type === 'reservation' ? 'bg-emerald-100' :
                                            'bg-orange-100'
                                        }`}>
                                            {order.type === 'cart' && <ShoppingCart className="w-4 h-4 text-red-600" />}
                                            {order.type === 'review' && <Star className="w-4 h-4 text-yellow-600" />}
                                            {order.type === 'return' && <RotateCcw className="w-4 h-4 text-purple-600" />}
                                            {order.type === 'reservation' && <BookOpen className="w-4 h-4 text-emerald-600" />}
                                            {order.type === 'order' && <ShoppingCart className="w-4 h-4 text-orange-600" />}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2">
                                                <p className="text-sm font-black text-gray-900 truncate">{order.type === 'reservation' ? (order.whatsapp || 'Anonyme') : (order.fullName || 'Anonyme')}</p>
                                                {order.type === 'cart' && <span className="text-[9px] bg-red-100 text-red-600 px-1.5 py-0.5 rounded-md font-black uppercase">Abandon</span>}
                                                {order.type === 'review' && <span className="text-[9px] bg-yellow-100 text-yellow-600 px-1.5 py-0.5 rounded-md font-black uppercase">Avis</span>}
                                                {order.type === 'return' && <span className="text-[9px] bg-purple-100 text-purple-600 px-1.5 py-0.5 rounded-md font-black uppercase">Retour</span>}
                                                {order.type === 'reservation' && <span className="text-[9px] bg-emerald-100 text-emerald-600 px-1.5 py-0.5 rounded-md font-black uppercase">Réservation</span>}
                                            </div>
                                            {order.type === 'review' ? (
                                                <p className="text-xs text-gray-500 font-medium truncate">{order.rating} ⭐ — En attente de modération</p>
                                            ) : order.type === 'return' ? (
                                                <p className="text-xs text-gray-500 font-medium truncate">{order.city || '-'} — Retournée</p>
                                            ) : order.type === 'reservation' ? (
                                                <p className="text-xs text-gray-500 font-medium truncate">📖 {order.bookTitle || 'Livre'}</p>
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
                    )}
                    </div>
                </>
            )}
        </div>
    )
}
