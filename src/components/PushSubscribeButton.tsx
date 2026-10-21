'use client'

import { useState, useEffect } from 'react'
import { Bell, BellOff, Loader2 } from 'lucide-react'

// Convertir clé VAPID base64 -> Uint8Array
function urlBase64ToUint8Array(base64String: string) {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
    const rawData = window.atob(base64)
    return Uint8Array.from([...rawData].map(c => c.charCodeAt(0)))
}

export default function PushSubscribeButton() {
    const [status, setStatus] = useState<'idle' | 'subscribed' | 'denied' | 'loading' | 'unsupported'>('idle')

    useEffect(() => {
        if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
            setStatus('unsupported')
            return
        }
        if (Notification.permission === 'denied') {
            setStatus('denied')
        } else {
            // Vérifier si déjà abonné
            navigator.serviceWorker.ready.then(reg =>
                reg.pushManager.getSubscription()
            ).then(sub => {
                if (sub) setStatus('subscribed')
            })
        }
    }, [])

    const subscribe = async () => {
        if (!('serviceWorker' in navigator)) return
        setStatus('loading')

        try {
            // Récupérer la clé VAPID
            const res = await fetch('/api/push/vapid-key')
            const { publicKey } = await res.json()

            // Enregistrer le service worker
            const reg = await navigator.serviceWorker.register('/sw-push.js', { scope: '/' })
            await navigator.serviceWorker.ready

            // Demander permission + s'abonner
            const permission = await Notification.requestPermission()
            if (permission !== 'granted') {
                setStatus('denied')
                return
            }

            const subscription = await reg.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: urlBase64ToUint8Array(publicKey)
            })

            const subJson = subscription.toJSON()

            // Envoyer au serveur
            await fetch('/api/push/subscribe', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    endpoint: subJson.endpoint,
                    keys: subJson.keys,
                    userAgent: navigator.userAgent
                })
            })

            setStatus('subscribed')
        } catch (err) {
            console.error('Push subscription error:', err)
            setStatus('idle')
        }
    }

    const unsubscribe = async () => {
        setStatus('loading')
        try {
            const reg = await navigator.serviceWorker.ready
            const sub = await reg.pushManager.getSubscription()
            if (sub) {
                await fetch('/api/push/subscribe', {
                    method: 'DELETE',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ endpoint: sub.endpoint })
                })
                await sub.unsubscribe()
            }
            setStatus('idle')
        } catch {
            setStatus('subscribed')
        }
    }

    if (status === 'unsupported') return null

    return (
        <button
            onClick={status === 'subscribed' ? unsubscribe : subscribe}
            disabled={status === 'loading' || status === 'denied'}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-transform duration-200 active:scale-95 ${
                status === 'subscribed'
                    ? 'bg-emerald-100 text-emerald-700 hover:bg-red-50 hover:text-red-600'
                    : status === 'denied'
                    ? 'bg-red-50 text-red-400 cursor-not-allowed'
                    : 'bg-gray-900 text-white hover:bg-black'
            }`}
            title={
                status === 'denied' ? 'Notifications bloquées dans le navigateur' :
                status === 'subscribed' ? 'Vous recevrez nos promotions (Cliquez pour désactiver)' :
                'Activer les notifications promo'
            }
        >
            {status === 'loading' ? (
                <Loader2 className="w-4 h-4 animate-spin" />
            ) : status === 'subscribed' ? (
                <Bell className="w-4 h-4 fill-emerald-600" />
            ) : status === 'denied' ? (
                <BellOff className="w-4 h-4" />
            ) : (
                <Bell className="w-4 h-4" />
            )}
            {status === 'subscribed' ? 'Notifié ✓' : status === 'denied' ? 'Bloqué' : 'Notifications'}
        </button>
    )
}
