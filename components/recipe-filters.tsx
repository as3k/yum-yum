"use client"

import Link from "next/link"
import { useSearchParams } from "next/navigation"

const FILTERS = [
  { label: "All", value: "" },
  { label: "Breakfast", value: "breakfast" },
  { label: "Lunch", value: "lunch" },
  { label: "Dinner", value: "dinner" },
]

export default function RecipeFilters({ active }: { active?: string }) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
      {FILTERS.map(({ label, value }) => {
        const isActive = (active ?? "") === value
        return (
          <Link
            key={value}
            href={value ? `/recipes?meal=${value}` : "/recipes"}
            className={`shrink-0 px-3 h-8 rounded text-sm font-medium transition-colors ${
              isActive
                ? "bg-accent text-white"
                : "bg-muted text-muted-foreground hover:text-foreground"
            }`}
          >
            {label}
          </Link>
        )
      })}
    </div>
  )
}
