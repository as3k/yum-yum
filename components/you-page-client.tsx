"use client"

import { useTheme } from "next-themes"
import { useEffect, useState } from "react"
import { Sun, Moon, Bell, BellOff, Heart, SlidersHorizontal, ChevronRight, Refrigerator, ShoppingCart, Users } from "lucide-react"
import Link from "next/link"
import { subscribeToPush, unsubscribeFromPush } from "@/lib/actions"

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? ""

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/")
  return Uint8Array.from([...atob(base64)].map((c) => c.charCodeAt(0)))
}

function RowLink({ href, icon: Icon, label, sublabel }: { href: string; icon: React.ElementType; label: string; sublabel?: string }) {
  return (
    <Link href={href} className="flex items-center gap-4 px-5 py-3.5 hover:bg-muted/50 transition-colors">
      <span className="w-8 h-8 rounded-xl bg-muted flex items-center justify-center shrink-0">
        <Icon size={16} className="text-foreground" />
      </span>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium">{label}</p>
        {sublabel && <p className="text-xs text-muted-foreground">{sublabel}</p>}
      </div>
      <ChevronRight size={15} className="text-muted-foreground shrink-0" />
    </Link>
  )
}

function RowToggle({ icon: Icon, label, sublabel, checked, onChange, disabled }: {
  icon: React.ElementType
  label: string
  sublabel?: string
  checked: boolean
  onChange: () => void
  disabled?: boolean
}) {
  return (
    <button
      onClick={onChange}
      disabled={disabled}
      className="w-full flex items-center gap-4 px-5 py-3.5 hover:bg-muted/50 transition-colors disabled:opacity-50"
    >
      <span className="w-8 h-8 rounded-xl bg-muted flex items-center justify-center shrink-0">
        <Icon size={16} className="text-foreground" />
      </span>
      <div className="flex-1 min-w-0 text-left">
        <p className="text-sm font-medium">{label}</p>
        {sublabel && <p className="text-xs text-muted-foreground">{sublabel}</p>}
      </div>
      <div className={`w-11 h-6 rounded-full transition-colors shrink-0 relative ${checked ? "bg-accent" : "bg-muted"}`}>
        <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${checked ? "translate-x-5" : "translate-x-0.5"}`} />
      </div>
    </button>
  )
}

export default function YouPageClient({ firstName, email }: { firstName: string; email: string }) {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  const [notifPermission, setNotifPermission] = useState<NotificationPermission | "unsupported">("default")
  const [notifPending, setNotifPending] = useState(false)

  useEffect(() => {
    setMounted(true)
    if (typeof Notification === "undefined" || !("serviceWorker" in navigator)) {
      setNotifPermission("unsupported")
      return
    }
    setNotifPermission(Notification.permission)
    if (Notification.permission === "granted") {
      navigator.serviceWorker.ready.then(async (reg) => {
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
      }).catch(() => {})
    }
  }, [])

  async function toggleNotifications() {
    if (notifPermission === "unsupported") return
    setNotifPending(true)
    try {
      if (notifPermission === "granted") {
        const reg = await navigator.serviceWorker.ready
        const sub = await reg.pushManager.getSubscription()
        if (sub) { await unsubscribeFromPush(sub.endpoint); await sub.unsubscribe() }
        setNotifPermission("default")
      } else {
        const result = await Notification.requestPermission()
        setNotifPermission(result)
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
      }
    } finally {
      setNotifPending(false)
    }
  }

  const isDark = mounted ? theme === "dark" : false
  const notifOn = notifPermission === "granted"

  return (
    <div className="space-y-6 pb-4">
      {/* Profile header */}
      <div className="px-5 py-4 bg-muted rounded-2xl flex items-center gap-4">
        <div className="w-14 h-14 rounded-full bg-accent/20 flex items-center justify-center shrink-0">
          <span className="text-2xl font-bold text-accent">{firstName[0]?.toUpperCase()}</span>
        </div>
        <div>
          <p className="text-lg font-bold">{firstName}</p>
          <p className="text-xs text-muted-foreground">{email}</p>
        </div>
      </div>

      {/* Appearance */}
      <div>
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-1 mb-1">Appearance</p>
        <div className="bg-muted rounded-2xl overflow-hidden divide-y divide-border/40">
          {mounted && (
            <RowToggle
              icon={isDark ? Moon : Sun}
              label="Dark mode"
              sublabel={isDark ? "Dark theme active" : "Light theme active"}
              checked={isDark}
              onChange={() => setTheme(isDark ? "light" : "dark")}
            />
          )}
        </div>
      </div>

      {/* Notifications */}
      {notifPermission !== "unsupported" && (
        <div>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-1 mb-1">Notifications</p>
          <div className="bg-muted rounded-2xl overflow-hidden divide-y divide-border/40">
            <RowToggle
              icon={notifOn ? Bell : BellOff}
              label="Meal reminders"
              sublabel={notifPermission === "denied" ? "Blocked in system settings" : notifOn ? "Push notifications enabled" : "Get reminded before meals"}
              checked={notifOn}
              onChange={toggleNotifications}
              disabled={notifPending || notifPermission === "denied"}
            />
          </div>
        </div>
      )}

      {/* My stuff */}
      <div>
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-1 mb-1">My stuff</p>
        <div className="bg-muted rounded-2xl overflow-hidden divide-y divide-border/40">
          <RowLink href="/fridge" icon={Refrigerator} label="My Fridge" sublabel="What can I make?" />
          <RowLink href="/grocery" icon={ShoppingCart} label="Shopping List" sublabel="This week's groceries" />
          <RowLink href="/favorites" icon={Heart} label="Saved Recipes" sublabel="Your favorites" />
          <RowLink href="/settings" icon={SlidersHorizontal} label="Meal preferences" sublabel="Calorie target, meal times, reminders" />
          <RowLink href="/settings/household" icon={Users} label="Household" sublabel="Invite code, members" />
        </div>
      </div>
    </div>
  )
}
