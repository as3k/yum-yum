import Link from "next/link"
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
  return (
    <div className="space-y-2">
      {days.map((day) => {
        const isToday = day.date === today
        const hasSnack = !!day.snack?.recipe
        return (
          <div
            key={day.date}
            className={`rounded-lg border overflow-hidden ${
              isToday ? "border-foreground" : "border-border"
            }`}
          >
            <div className="px-4 py-2.5 bg-muted border-b border-border flex items-center gap-2">
              <span className="text-sm font-semibold">{getDayLabel(day.date)}</span>
              {isToday && (
                <span className="text-xs text-muted-foreground font-normal">Today</span>
              )}
            </div>
            <div className="divide-y divide-border">
              {MEAL_ORDER.filter((m) => m !== "snack" || hasSnack).map((mealType) => {
                const slot = day[mealType]
                return (
                  <div key={mealType} className="flex items-center gap-3 px-4 py-3">
                    <span className="text-xs font-mono text-muted-foreground w-3 shrink-0">
                      {MEAL_LABELS[mealType]}
                    </span>
                    {slot?.recipe ? (
                      <Link
                        href={`/recipes/${slot.recipe.slug}`}
                        className="flex-1 text-sm hover:underline underline-offset-2"
                      >
                        {slot.recipe.title}
                      </Link>
                    ) : (
                      <span className="flex-1 text-sm text-muted-foreground">—</span>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )
      })}
    </div>
  )
}
