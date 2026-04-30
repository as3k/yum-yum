"use client"

import { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { X, Refrigerator, ShoppingCart, Menu } from "lucide-react"

const links = [
  { href: "/fridge", icon: Refrigerator, label: "Fridge", sublabel: "What can I make?" },
  { href: "/grocery", icon: ShoppingCart, label: "Grocery", sublabel: "This week's list" },
]

export default function SideNav() {
  const [open, setOpen] = useState(false)
  const pathname = usePathname()

  return (
    <>
      {/* Burger button — fixed top right, above status bar gradient */}
      <button
        onClick={() => setOpen(true)}
        className="fixed z-40 flex flex-col items-center justify-center gap-[5px] w-10 h-10"
        style={{ top: "calc(env(safe-area-inset-top) + 0.75rem)", right: "1rem" }}
        aria-label="Open menu"
      >
        <span className="w-5 h-[2px] bg-foreground rounded-full" />
        <span className="w-5 h-[2px] bg-foreground rounded-full" />
      </button>

      {/* Backdrop */}
      {open && (
        <div
          className="fixed inset-0 z-50 bg-black/40"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Drawer */}
      <div
        className={`fixed top-0 right-0 bottom-0 z-50 w-72 bg-background flex flex-col shadow-2xl transition-transform duration-300 ease-in-out ${open ? "translate-x-0" : "translate-x-full"}`}
        style={{ paddingTop: "env(safe-area-inset-top)", paddingBottom: "calc(5rem + env(safe-area-inset-bottom))" }}
      >
        <div className="flex items-center justify-between px-5 py-4">
          <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">More</p>
          <button
            onClick={() => setOpen(false)}
            className="w-8 h-8 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 px-3 space-y-1">
          {links.map(({ href, icon: Icon, label, sublabel }) => {
            const active = pathname === href || pathname.startsWith(href + "/")
            return (
              <Link
                key={href}
                href={href}
                onClick={() => setOpen(false)}
                className={`flex items-center gap-4 px-4 py-3.5 rounded-xl transition-colors ${active ? "bg-accent/10 text-accent" : "hover:bg-muted text-foreground"}`}
              >
                <Icon size={20} strokeWidth={active ? 2.5 : 1.5} className="shrink-0" />
                <div>
                  <p className="text-sm font-medium">{label}</p>
                  <p className="text-xs text-muted-foreground">{sublabel}</p>
                </div>
              </Link>
            )
          })}
        </div>
      </div>
    </>
  )
}
