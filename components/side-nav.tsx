"use client"

import { useState, useEffect, useRef } from "react"
import Link from "next/link"

import { usePathname } from "next/navigation"
import { X, Refrigerator, ShoppingCart, Heart } from "lucide-react"

const links = [
  { href: "/fridge", icon: Refrigerator, label: "My Fridge", sublabel: "What can I make?" },
  { href: "/grocery", icon: ShoppingCart, label: "Shopping List", sublabel: "This week's groceries" },
  { href: "/favorites", icon: Heart, label: "Saved Recipes", sublabel: "Your favorites" },
]

const PAGE_TITLES: Record<string, string> = {
  "/today": "Today 🌱",
  "/plan": "This Week",
  "/recipes": "Cookbook",
  "/you": "Profile",
  "/fridge": "My Fridge",
  "/grocery": "Shopping List",
  "/favorites": "Saved Recipes",
  "/settings": "Settings",
}

const PAGE_ACTIONS: Record<string, { label: string; href: string }> = {
  "/recipes": { label: "Add recipe", href: "/recipes/add" },
}

export default function SideNav() {
  const [open, setOpen] = useState(false)
  const [visible, setVisible] = useState(true)
  const lastScrollY = useRef(0)
  const pathname = usePathname()

  const pageTitle = Object.entries(PAGE_TITLES).find(([key]) =>
    pathname === key || pathname.startsWith(key + "/")
  )?.[1] ?? ""

  const pageAction = Object.entries(PAGE_ACTIONS).find(([key]) =>
    pathname === key || pathname.startsWith(key + "/")
  )?.[1] ?? null

  useEffect(() => {
    const onScroll = () => {
      const y = window.scrollY
      if (y < 10) {
        setVisible(true)
      } else if (y > lastScrollY.current) {
        setVisible(false)
      } else {
        setVisible(true)
      }
      lastScrollY.current = y
    }
    window.addEventListener("scroll", onScroll, { passive: true })
    return () => window.removeEventListener("scroll", onScroll)
  }, [])

  return (
    <>
      {/* Top bar — page title + burger, hides on scroll down */}
      <div
        className={`fixed left-0 right-0 z-40 flex items-center justify-between px-4 transition-all duration-300 ${visible || open ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-3 pointer-events-none"}`}
        style={{ top: "calc(env(safe-area-inset-top) + 0.5rem)" }}
      >
        <span className="text-sm font-semibold text-foreground">{pageTitle}</span>
        <div className="flex items-center gap-1">
          {pageAction && (
            <Link
              href={pageAction.href}
              className="text-sm font-medium text-accent px-2 py-1"
            >
              {pageAction.label}
            </Link>
          )}
        <button
          onClick={() => setOpen(true)}
          className="flex flex-col items-center justify-center gap-[5px] w-10 h-10"
          aria-label="Open menu"
        >
          <span className="w-5 h-[2px] bg-foreground rounded-full" />
          <span className="w-5 h-[2px] bg-foreground rounded-full" />
        </button>
        </div>
      </div>

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
