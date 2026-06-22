const swUrl = new URL(self.location.href)
const appVersion = swUrl.searchParams.get('v') || 'dev'
const CACHE_NAME = `gestao-discursos-${appVersion}`
const APP_SHELL = [
  '/',
  '/manifest.webmanifest',
  '/favicon-32.png',
  '/apple-touch-icon.png',
  '/pwa-icon-192.png',
  '/pwa-icon-512.png',
  '/pwa-maskable-512.png',
]

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) =>
      cache.addAll(
        APP_SHELL.map((url) => new Request(url, { cache: 'reload' })),
      ),
    ),
  )
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) =>
        Promise.all(
          cacheNames
            .filter((cacheName) => cacheName !== CACHE_NAME)
            .map((cacheName) => caches.delete(cacheName)),
        ),
      ),
  )
  self.clients.claim()
})

self.addEventListener('fetch', (event) => {
  const request = event.request
  const url = new URL(request.url)

  if (request.method !== 'GET' || url.origin !== self.location.origin) {
    return
  }

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(new Request(request, { cache: 'reload' }))
        .then((response) => {
          const contentType = response.headers.get('content-type') || ''

          if (response.ok && contentType.includes('text/html')) {
            const responseCopy = response.clone()
            void caches.open(CACHE_NAME).then((cache) => cache.put('/', responseCopy))
          }

          return response
        })
        .catch(() => caches.match('/')),
    )
    return
  }

  if (url.pathname.startsWith('/assets/')) {
    event.respondWith(
      caches.match(request).then(
        (cachedResponse) =>
          cachedResponse ??
          fetch(request).then((response) => {
            const contentType = response.headers.get('content-type') || ''

            if (response.ok && !contentType.includes('text/html')) {
              const responseCopy = response.clone()
              void caches.open(CACHE_NAME).then((cache) => cache.put(request, responseCopy))
            }

            return response
          }),
      ),
    )
  }
})
