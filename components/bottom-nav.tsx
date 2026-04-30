"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Calendar, BookOpen, User } from "lucide-react"

const links = [
  { href: "/plan", icon: Calendar, label: "Plan" },
  { href: "/recipes", icon: BookOpen, label: "Recipes" },
  { href: "/you", icon: User, label: "You" },
]

export default function BottomNav() {
  const pathname = usePathname()

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-20 bg-background border-t border-border" style={{ paddingBottom: "env(safe-area-inset-bottom)" }}>
      <div className="flex items-center justify-around h-16 max-w-lg mx-auto px-2">
        {links.map(({ href, icon: Icon, label }) => {
          const active = pathname === href || pathname.startsWith(href + "/")
          return (
            <Link
              key={href}
              href={href}
              className={`flex flex-col items-center gap-1 flex-1 py-2 transition-colors ${
                active ? "text-accent" : "text-muted-foreground"
              }`}
            >
              <Icon size={20} strokeWidth={active ? 2.5 : 1.5} />
              <span className="text-[11px] font-medium">{label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
