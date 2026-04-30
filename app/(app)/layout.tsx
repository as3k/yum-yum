import BottomNav from "@/components/bottom-nav"
import ThemeToggle from "@/components/theme-toggle"
import SetTimezone from "@/components/set-timezone"
import NotificationPrompt from "@/components/notification-prompt"

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <SetTimezone />
      <header className="sticky top-0 z-10 flex items-center justify-end gap-2 px-4 border-b border-border bg-background" style={{ paddingTop: "env(safe-area-inset-top)", minHeight: "calc(3rem + env(safe-area-inset-top))" }}>
        <NotificationPrompt />
        <ThemeToggle />
      </header>
      <main className="flex-1" style={{ paddingBottom: "calc(5rem + env(safe-area-inset-bottom))" }}>{children}</main>
      <BottomNav />
    </div>
  )
}
