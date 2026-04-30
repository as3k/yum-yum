"use client"

import { useEffect, useState } from "react"
import { RefreshCw } from "lucide-react"

export default function UpdatePrompt() {
  const [waitingSW, setWaitingSW] = useState<ServiceWorker | null>(null)

  useEffect(() => {
    if (!("serviceWorker" in navigator)) return

    navigator.serviceWorker.ready.then((reg) => {
      if (reg.waiting) {
        setWaitingSW(reg.waiting)
      }

      reg.addEventListener("updatefound", () => {
        const newWorker = reg.installing
        if (!newWorker) return
        newWorker.addEventListener("statechange", () => {
          if (newWorker.state === "installed" && navigator.serviceWorker.controller) {
            setWaitingSW(newWorker)
          }
        })
      })
    })

    let refreshing = false
    navigator.serviceWorker.addEventListener("controllerchange", () => {
      if (!refreshing) {
        refreshing = true
        window.location.reload()
      }
    })
  }, [])

  function handleUpdate() {
    waitingSW?.postMessage({ type: "SKIP_WAITING" })
  }

  if (!waitingSW) return null

  return (
    <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 w-[calc(100%-2rem)] max-w-sm">
      <div className="bg-foreground text-background rounded-2xl px-4 py-3 flex items-center gap-3 shadow-lg">
        <RefreshCw size={16} className="shrink-0" />
        <span className="text-sm flex-1">New version available</span>
        <button
          onClick={handleUpdate}
          className="text-sm font-semibold shrink-0 hover:opacity-70 transition-opacity"
        >
          Update
        </button>
      </div>
    </div>
  )
}
