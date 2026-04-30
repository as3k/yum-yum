"use client"

import Link from "next/link"
import { useState } from "react"
import { ChevronDown } from "lucide-react"
import { getDayLabel } from "@/lib/utils"

type Slot = {
  id: number
  dayDate: string
  mealType: "breakfast" | "lunch" | "dinner" | "snack"
  notes: string | null
  recipe: {
    id: number
    title: string
    slug: string
    totalTimeMin: number | null
  } | null
}

type DayPlan = {
  date: string
  breakfast: Slot | undefined
  lunch: Slot | undefined
  dinner: Slot | undefined
  snack: Slot | undefined
}

const MEAL_LABELS = { breakfast: "B", lunch: "L", dinner: "D", snack: "S" } as const
const MEAL_ORDER = ["breakfast", "lunch", "dinner", "snack"] as const

export default function WeekGrid({ days, today }: { days: DayPlan[]; today: string }) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set())

  return (
    <div className="space-y-2">
      {days.map((day) => {
        const isToday = day.date === today
        const isPast = day.date < today
        const isOpen = !isPast || isToday || expanded.has(day.date)
        const hasSnack = !!day.snack?.recipe

        return (
          <div
            key={day.date}
            className={`rounded-2xl overflow-hidden ${isToday ? "ring-2 ring-accent/40 bg-muted" : "bg-muted"}`}
          >
            <div
              className={`px-5 py-4 flex items-center gap-2.5 ${isPast && !isToday ? "cursor-pointer select-none" : ""}`}
              onClick={isPast && !isToday ? () => setExpanded((s) => {
                const next = new Set(s)
                next.has(day.date) ? next.delete(day.date) : next.add(day.date)
                return next
              }) : undefined}
            >
              <span className={`text-sm font-bold tracking-tight flex-1 ${isToday ? "text-accent" : isPast ? "text-muted-foreground" : ""}`}>
                {getDayLabel(day.date)}
              </span>
              {isToday && (
                <span className="text-[10px] font-bold bg-accent text-white px-2 py-0.5 rounded-full uppercase tracking-wide">
                  Today
                </span>
              )}
              {isPast && !isToday && (
                <ChevronDown
                  size={15}
                  className={`text-muted-foreground transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
                />
              )}
            </div>

            {isOpen && (
              <div className="px-5 pb-5 space-y-3.5">
                {MEAL_ORDER.filter((m) => m !== "snack" || hasSnack).map((mealType) => {
                  const slot = day[mealType]
                  return (
                    <div key={mealType} className="flex items-center gap-3">
                      <span className="text-[10px] font-bold text-muted-foreground w-3 shrink-0 uppercase">
                        {MEAL_LABELS[mealType]}
                      </span>
                      {slot?.recipe ? (
                        <Link
                          href={`/recipes/${slot.recipe.slug}`}
                          className={`flex-1 text-sm truncate hover:text-accent transition-colors ${isToday ? "font-medium" : ""}`}
                        >
                          {slot.recipe.title}
                        </Link>
                      ) : (
                        <span className="flex-1 text-sm text-muted-foreground/50">—</span>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
