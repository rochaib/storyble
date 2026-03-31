/// <reference lib="webworker" />
declare const self: ServiceWorkerGlobalScope

self.addEventListener('push', (event: PushEvent) => {
  if (!event.data) return

  let payload: { title?: string; body?: string; icon?: string }
  try {
    payload = event.data.json()
  } catch {
    payload = { title: 'Fold & Pass', body: event.data.text() }
  }

  const title = payload.title ?? 'Fold & Pass'
  const options: NotificationOptions = {
    body: payload.body ?? "It's your turn!",
    icon: payload.icon ?? '/icons/icon-192.png',
    badge: '/icons/icon-192.png',
    tag: 'fold-pass-turn',         // replaces previous notification if still showing
    renotify: true,
  }

  event.waitUntil(self.registration.showNotification(title, options))
})

self.addEventListener('notificationclick', (event: NotificationEvent) => {
  event.notification.close()
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clients => {
      const focused = clients.find(c => c.url.includes('/game/') && 'focus' in c)
      if (focused) return (focused as WindowClient).focus()
      return self.clients.openWindow('/')
    })
  )
})
