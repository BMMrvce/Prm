const CACHE_NAME = 'kala2-shell-v8'
// Pages require a session (the proxy redirects to /login), so only static assets are precached.
const APP_SHELL = ['/manifest.webmanifest', '/brand/icon-192.png', '/brand/icon-512.png']

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

// Reminders from the server (meetings, deadlines, morning digest). See src/lib/push.ts.
self.addEventListener('push', (event) => {
  let payload = {}
  try {
    payload = event.data ? event.data.json() : {}
  } catch {
    payload = { title: 'ಸKala²', body: event.data ? event.data.text() : '' }
  }
  event.waitUntil(
    self.registration.showNotification(payload.title || 'ಸKala²', {
      body: payload.body || '',
      icon: '/brand/icon-192.png',
      badge: '/brand/icon-192.png',
      tag: payload.tag,
      renotify: Boolean(payload.tag),
      data: { url: payload.url || '/' },
    }),
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const target = new URL(event.notification.data?.url || '/', self.location.origin)
  event.waitUntil(
    (async () => {
      // Meeting links open in a new window; app pages reuse an open ಸKala² window.
      if (target.origin !== self.location.origin) return self.clients.openWindow(target.href)
      const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true })
      const existing = windows.find((client) => 'focus' in client)
      if (existing) {
        await existing.focus()
        return existing.navigate(target.href).catch(() => undefined)
      }
      return self.clients.openWindow(target.href)
    })(),
  )
})
