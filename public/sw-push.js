// Service Worker pour les notifications Web Push
// Ce fichier est servi par next-pwa automatiquement

self.addEventListener('push', (event) => {
    if (!event.data) return

    let payload
    try {
        payload = event.data.json()
    } catch {
        payload = { title: 'Riwaya', body: event.data.text() }
    }

    const options = {
        body: payload.body || '',
        icon: payload.icon || '/icons/icon-192x192.png',
        badge: '/icons/icon-72x72.png',
        data: { url: payload.url || '/' },
        vibrate: [200, 100, 200],
        requireInteraction: false,
        tag: 'riwaya-promo',
    }

    event.waitUntil(
        self.registration.showNotification(payload.title || 'Riwaya', options)
    )
})

self.addEventListener('notificationclick', (event) => {
    event.notification.close()
    const url = event.notification.data?.url || '/'

    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
            for (const client of clientList) {
                if (client.url === url && 'focus' in client) {
                    return client.focus()
                }
            }
            if (clients.openWindow) {
                return clients.openWindow(url)
            }
        })
    )
})
