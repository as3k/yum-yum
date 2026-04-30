import BottomNav from "@/components/bottom-nav"
import SideNav from "@/components/side-nav"
import SetTimezone from "@/components/set-timezone"
import UpdatePrompt from "@/components/update-prompt"

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <SetTimezone />
      {/* Status bar fade — gradient from bg over the safe area so scrolled content doesn't clash with iOS/Android top bar */}
      <div
        className="fixed top-0 left-0 right-0 z-30 pointer-events-none"
        style={{
          height: "calc(env(safe-area-inset-top) + 1.5rem)",
          background: "linear-gradient(to bottom, var(--background) 40%, transparent)",
        }}
      />
      <main
        className="flex-1"
        style={{
          paddingTop: "calc(env(safe-area-inset-top) + 5rem)",
          paddingBottom: "calc(5rem + env(safe-area-inset-bottom))",
        }}
      >
        {children}
      </main>
      <SideNav />
      <BottomNav />
      <UpdatePrompt />
    </div>
  )
}
