"use client"

import Link from "next/link"
import { Settings } from "lucide-react"
import ThemeToggle from "./theme-toggle"
import NotificationPrompt from "./notification-prompt"

export default function HeaderControls() {
  return (
    <div className="flex items-center gap-1 shrink-0">
      <NotificationPrompt />
      <Link
        href="/settings"
        className="flex items-center justify-center w-8 h-8 text-muted-foreground hover:text-foreground transition-colors"
        aria-label="Settings"
      >
        <Settings size={16} />
      </Link>
      <ThemeToggle />
    </div>
  )
}
