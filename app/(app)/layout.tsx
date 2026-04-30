import BottomNav from "@/components/bottom-nav"
import SetTimezone from "@/components/set-timezone"
import UpdatePrompt from "@/components/update-prompt"

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <SetTimezone />
      <main
        className="flex-1"
        style={{
          paddingTop: "env(safe-area-inset-top)",
          paddingBottom: "calc(5rem + env(safe-area-inset-bottom))",
        }}
      >
        {children}
      </main>
      <BottomNav />
      <UpdatePrompt />
    </div>
  )
}
