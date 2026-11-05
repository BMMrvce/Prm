const CACHE_NAME = 'workbench-shell-v4'
// Pages require a session (the proxy redirects to /login), so only static assets are precached.
const APP_SHELL = ['/manifest.webmanifest', '/icons/workbench-192.png', '/icons/workbench-512.png']

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)))
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))),
      ),
  )
  self.clients.claim()
})

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET' || !event.request.url.startsWith(self.location.origin)) return
  // Never cache API responses: they carry live mail content.
  if (new URL(event.request.url).pathname.startsWith('/api/')) return
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Don't cache login redirects or errors as if they were the page.
        if (response.ok && !response.redirected) {
          const copy = response.clone()
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy))
        }
        return response
      })
      .catch(() => caches.match(event.request)),
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      const existing = clients.find((client) => 'focus' in client)
      return existing ? existing.focus() : self.clients.openWindow('/')
    }),
  )
})
