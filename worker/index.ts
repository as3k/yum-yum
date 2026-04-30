/// <reference lib="webworker" />

declare const self: ServiceWorkerGlobalScope

self.addEventListener("push", (event) => {
  const data = event.data?.json() ?? {}
  const title: string = data.title ?? "Yum Yum"
  const body: string = data.body ?? ""
  const url: string = data.url ?? "/plan"

  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      icon: "/icons/icon-192.png",
      badge: "/icons/icon-192.png",
      data: { url },
    })
  )
})

self.addEventListener("notificationclick", (event) => {
  event.notification.close()
  const url: string = event.notification.data?.url ?? "/plan"
  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clients) => {
        const existing = clients.find((c) => c.url.includes(url))
        if (existing) return existing.focus()
        return self.clients.openWindow(url)
      })
  )
})
