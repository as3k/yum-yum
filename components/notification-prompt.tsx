"use client"

import { useState, useEffect } from "react"
import { Bell, BellOff, X } from "lucide-react"
import { subscribeToPush, unsubscribeFromPush } from "@/lib/actions"

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/")
  const rawData = atob(base64)
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)))
}

export default function NotificationPrompt() {
  const [permission, setPermission] = useState<NotificationPermission | "loading">("loading")
  const [dismissed, setDismissed] = useState(false)
  const [pending, setPending] = useState(false)

  useEffect(() => {
    if (typeof Notification === "undefined" || !("serviceWorker" in navigator)) {
      setPermission("denied")
      return
    }
    setPermission(Notification.permission)
    if (localStorage.getItem("push-dismissed") === "1") setDismissed(true)
  }, [])

  async function handleEnable() {
    setPending(true)
    try {
      const result = await Notification.requestPermission()
      setPermission(result)
      if (result !== "granted") return

      const reg = await navigator.serviceWorker.ready
      const existing = await reg.pushManager.getSubscription()
      const sub = existing ?? await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      })

      await subscribeToPush({
        endpoint: sub.endpoint,
        keys: {
          p256dh: btoa(String.fromCharCode(...new Uint8Array(sub.getKey("p256dh")!))),
          auth: btoa(String.fromCharCode(...new Uint8Array(sub.getKey("auth")!))),
        },
      })
    } finally {
      setPending(false)
    }
  }

  async function handleDisable() {
    setPending(true)
    try {
      const reg = await navigator.serviceWorker.ready
      const sub = await reg.pushManager.getSubscription()
      if (sub) {
        await unsubscribeFromPush(sub.endpoint)
        await sub.unsubscribe()
      }
      setPermission("default")
    } finally {
      setPending(false)
    }
  }

  function handleDismiss() {
    localStorage.setItem("push-dismissed", "1")
    setDismissed(true)
  }

  if (permission === "loading" || dismissed) return null

  if (permission === "granted") {
    return (
      <button
        onClick={handleDisable}
        disabled={pending}
        className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
        title="Disable notifications"
      >
        <BellOff size={14} />
        Notifications on
      </button>
    )
  }

  if (permission === "denied") return null

  return (
    <div className="flex items-center gap-2 bg-muted rounded-xl px-3 py-2">
      <Bell size={14} className="text-accent shrink-0" />
      <span className="text-xs text-muted-foreground flex-1">Get meal reminders</span>
      <button
        onClick={handleEnable}
        disabled={pending}
        className="text-xs font-medium text-accent hover:opacity-80 disabled:opacity-50"
      >
        Enable
      </button>
      <button onClick={handleDismiss} className="text-muted-foreground hover:text-foreground">
        <X size={12} />
      </button>
    </div>
  )
}
