"use client"

import { useState } from "react"
import RecipeDiscovery from "./recipe-discovery"
import ScraperForm from "./scraper-form"

export default function AddRecipeTabs() {
  const [tab, setTab] = useState<"search" | "url">("search")

  return (
    <div className="space-y-5">
      <div className="flex gap-1 p-1 bg-muted rounded-lg">
        <button
          onClick={() => setTab("search")}
          className={`flex-1 h-8 rounded text-sm font-medium transition-colors ${
            tab === "search"
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          Search
        </button>
        <button
          onClick={() => setTab("url")}
          className={`flex-1 h-8 rounded text-sm font-medium transition-colors ${
            tab === "url"
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          Paste URL
        </button>
      </div>
      {tab === "search" ? <RecipeDiscovery /> : <ScraperForm />}
    </div>
  )
}
