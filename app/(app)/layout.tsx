import BottomNav from "@/components/bottom-nav"
import ThemeToggle from "@/components/theme-toggle"
import SetTimezone from "@/components/set-timezone"
import NotificationPrompt from "@/components/notification-prompt"
import UpdatePrompt from "@/components/update-prompt"
import Link from "next/link"
import { Settings } from "lucide-react"

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <SetTimezone />
      <header className="sticky top-0 z-10 flex items-center justify-end gap-2 px-4 border-b border-border bg-background" style={{ paddingTop: "env(safe-area-inset-top)", minHeight: "calc(3rem + env(safe-area-inset-top))" }}>
        <NotificationPrompt />
        <Link href="/settings" className="flex items-center justify-center w-8 h-8 text-muted-foreground hover:text-foreground transition-colors">
          <Settings size={16} />
        </Link>
        <ThemeToggle />
      </header>
      <main className="flex-1" style={{ paddingBottom: "calc(5rem + env(safe-area-inset-bottom))" }}>{children}</main>
      <BottomNav />
      <UpdatePrompt />
    </div>
  )
}
