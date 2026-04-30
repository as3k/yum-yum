import BottomNav from "@/components/bottom-nav"
import ThemeToggle from "@/components/theme-toggle"
import SetTimezone from "@/components/set-timezone"

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <SetTimezone />
      <header className="sticky top-0 z-10 h-12 flex items-center justify-end px-4 border-b border-border bg-background">
        <ThemeToggle />
      </header>
      <main className="flex-1" style={{ paddingBottom: "calc(5rem + env(safe-area-inset-bottom))" }}>{children}</main>
      <BottomNav />
    </div>
  )
}
