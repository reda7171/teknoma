// Service Worker Tekno Store — Cache stratégique pour PWA
const CACHE_NAME = 'tekno-v3'
const OFFLINE_URL = '/offline.html'

// Ressources pré-cachées au moment de l'installation
const PRECACHE_ASSETS = [
  '/',
  '/offline.html',
  '/logo.png',
  '/android-chrome-192x192.png',
  '/android-chrome-512x512.png',
  '/site.webmanifest',
]

// Installation — pré-cache les ressources critiques
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(PRECACHE_ASSETS)
    })
  )
  self.skipWaiting()
})

// Activation — nettoie les anciens caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    )
  )
  self.clients.claim()
})

// Fetch — stratégie Network First pour les pages, Cache First pour les assets
self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)

  // Ignorer les requêtes non-GET et les extensions non-web
  if (request.method !== 'GET') return
  if (url.protocol === 'chrome-extension:') return
  if (url.origin !== self.location.origin) return
  if (url.pathname.startsWith('/api/')) return // API toujours en réseau
  if (url.pathname.startsWith('/_next/')) return // Chunks Next toujours gérés par le navigateur
  if (url.pathname.split('/').includes('admin')) return // Admin localisé toujours en réseau

  // Images : Cache First
  if (request.destination === 'image') {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached
        return fetch(request)
          .then((response) => {
            if (response.ok) {
              const clone = response.clone()
              caches.open(CACHE_NAME).then((c) => c.put(request, clone))
            }
            return response
          })
          .catch(() => caches.match('/logo.png'))
      })
    )
    return
  }

  // Fonts & scripts statiques : Stale While Revalidate
  if (
    request.destination === 'script' ||
    request.destination === 'style' ||
    request.destination === 'font'
  ) {
    event.respondWith(
      caches.match(request).then((cached) => {
        const fetchPromise = fetch(request).then((response) => {
          if (response.ok) {
            const clone = response.clone()
            caches.open(CACHE_NAME).then((c) => c.put(request, clone))
          }
          return response
        })
        return cached || fetchPromise
      })
    )
    return
  }

  // Pages HTML : Network First → Cache → Offline
  if (request.headers.get('accept')?.includes('text/html')) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok) {
            const clone = response.clone()
            caches.open(CACHE_NAME).then((c) => c.put(request, clone))
          }
          return response
        })
        .catch(() => {
          return caches.match(request).then(
            (cached) => cached || caches.match(OFFLINE_URL)
          )
        })
    )
    return
  }
})

// Notifications push (préparé pour plus tard)
self.addEventListener('push', (event) => {
  if (!event.data) return
  const data = event.data.json()
  self.registration.showNotification(data.title || 'Tekno Store', {
    body: data.body || '',
    icon: '/android-chrome-192x192.png',
    badge: '/favicon-32x32.png',
    data: { url: data.url || '/' },
  })
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url = event.notification.data?.url || '/'
  event.waitUntil(clients.openWindow(url))
})
