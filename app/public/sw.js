// ZenOS Service Worker — network-first for navigations, cache-first for hashed assets
const CACHE_NAME = 'zenos-v1'

self.addEventListener('install', () => {
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  )
  self.clients.claim()
})

self.addEventListener('fetch', (event) => {
  const { request } = event

  // API calls: always network
  if (request.url.includes('/api/')) {
    event.respondWith(fetch(request))
    return
  }

  // Navigation requests (HTML): network-first so deploys take effect immediately
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(() => caches.match(request))
    )
    return
  }

  // Hashed static assets (Vite output): cache-first
  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached
      return fetch(request).then((response) => {
        if (response.ok && request.url.match(/\/assets\/.*\.[a-f0-9]+\./)) {
          const clone = response.clone()
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone))
        }
        return response
      })
    })
  )
})
