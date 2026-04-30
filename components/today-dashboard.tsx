import Link from "next/link"
import { AlertTriangle, Sparkles } from "lucide-react"
import type { NutritionData, FodmapFlag } from "@/lib/db/schema"
import SwapSlotPicker from "./swap-slot-picker"
import AddSlotPicker from "./add-slot-picker"

interface MealSlot {
  id: number
  mealType: string
  recipe: {
    id: number
    title: string
    slug: string
    nutritionPerServing: NutritionData | null
    fodmapFlags: FodmapFlag[]
    storageNotes: string | null
    maxStorageDays: number | null
  } | null
}

interface SwapRecipe {
  id: number
  title: string
  mealType: string
}

interface SnackIdea {
  id: number
  title: string
  slug: string
}

interface Props {
  today: string
  weekStart: string
  slots: MealSlot[]
  snackIdeas: SnackIdea[]
  calorieTarget: number | null
  weekCalories: { date: string; calories: number }[]
  swapRecipes: SwapRecipe[]
}

const MEAL_LABELS: Record<string, string> = {
  breakfast: "Breakfast",
  lunch: "Lunch",
  snack: "Snack",
  dinner: "Dinner",
}

const MEAL_EMOJIS: Record<string, string> = {
  breakfast: "🍳",
  lunch: "🥗",
  snack: "🍎",
  dinner: "🍽",
}

const DAY_LABELS = ["M", "T", "W", "T", "F", "S", "S"]

function parseStorageDays(notes?: string | null): number | null {
  if (!notes) return null
  const m = notes.match(/(\d+)(?:\s*[-–]\s*(\d+))?\s*days?/i)
  if (!m) return null
  return m[2] ? Math.floor((parseInt(m[1]) + parseInt(m[2])) / 2) : parseInt(m[1])
}

function storageStatus(recipe: MealSlot["recipe"], daysIntoWeek: number) {
  if (!recipe) return null
  const maxDays = recipe.maxStorageDays ?? parseStorageDays(recipe.storageNotes)
  if (!maxDays) return null
  const daysLeft = maxDays - daysIntoWeek
  if (daysLeft <= 0) return { label: "may have expired", color: "text-red-500 bg-red-500/10" }
  if (daysLeft === 1) return { label: "use today!", color: "text-orange-500 bg-orange-500/10" }
  if (daysLeft === 2) return { label: `${daysLeft} days left`, color: "text-amber-500 bg-amber-500/10" }
  return null
}

export default function TodayDashboard({
  today,
  weekStart,
  slots,
  snackIdeas,
  calorieTarget,
  weekCalories,
  swapRecipes,
}: Props) {
  const slotMap = Object.fromEntries(slots.map((s) => [s.mealType, s]))
  const mealOrder = ["breakfast", "lunch", "snack", "dinner"]

  const d1 = new Date(weekStart + "T00:00:00")
  const d2 = new Date(today + "T00:00:00")
  const daysIntoWeek = Math.round((d2.getTime() - d1.getTime()) / 86400000)

  const nutritionSlots = slots.filter((s) => s.recipe?.nutritionPerServing)
  const totalCalories = nutritionSlots.reduce((sum, s) => sum + s.recipe!.nutritionPerServing!.calories, 0)
  const totalProtein = nutritionSlots.reduce((sum, s) => sum + s.recipe!.nutritionPerServing!.proteinG, 0)
  const totalCarbs = nutritionSlots.reduce((sum, s) => sum + s.recipe!.nutritionPerServing!.carbsG, 0)
  const totalFat = nutritionSlots.reduce((sum, s) => sum + s.recipe!.nutritionPerServing!.fatG, 0)

  const caloriePercent = calorieTarget && totalCalories
    ? Math.min(Math.round((totalCalories / calorieTarget) * 100), 100)
    : null

  const watchouts = slots.flatMap((s) =>
    (s.recipe?.fodmapFlags ?? [])
      .filter((f) => !f.skipped)
      .map((f) => ({ ...f, meal: s.mealType }))
  )

  const hasSnack = !!slotMap["snack"]?.recipe

  // Weekly nutrition bars
  const maxWeekCal = Math.max(calorieTarget ?? 0, ...weekCalories.map((d) => d.calories), 1)
  const weekDates = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart + "T00:00:00")
    d.setDate(d.getDate() + i)
    return [d.getFullYear(), String(d.getMonth() + 1).padStart(2, "0"), String(d.getDate()).padStart(2, "0")].join("-")
  })

  return (
    <div className="space-y-4">
      {/* Today's meals */}
      <div className="bg-muted rounded-2xl overflow-hidden">
        {mealOrder.map((type, i) => {
          const slot = slotMap[type]
          const recipe = slot?.recipe
          const storage = storageStatus(recipe ?? null, daysIntoWeek)
          return (
            <div
              key={type}
              className={`flex items-center gap-3 px-5 py-3.5 ${i > 0 ? "border-t border-border/40" : ""}`}
            >
              <span className="text-base w-6 shrink-0">{MEAL_EMOJIS[type]}</span>
              <span className="text-xs text-muted-foreground w-16 shrink-0">{MEAL_LABELS[type]}</span>
              <div className="flex-1 min-w-0 flex items-center gap-2 flex-wrap">
                {recipe ? (
                  <>
                    <Link
                      href={`/recipes/${recipe.slug}`}
                      className="text-sm font-medium hover:text-accent transition-colors truncate"
                    >
                      {recipe.title}
                    </Link>
                    {storage && (
                      <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full shrink-0 ${storage.color}`}>
                        {storage.label}
                      </span>
                    )}
                  </>
                ) : (
                  <AddSlotPicker
                    weekStart={weekStart}
                    today={today}
                    mealType={type}
                    recipes={swapRecipes}
                  />
                )}
              </div>
              {recipe && slot && (
                <SwapSlotPicker
                  slotId={slot.id}
                  currentRecipeId={recipe.id}
                  mealType={type}
                  recipes={swapRecipes}
                />
              )}
            </div>
          )
        })}
      </div>

      {/* Today nutrition */}
      {nutritionSlots.length > 0 && (
        <div className="bg-muted rounded-2xl p-5 space-y-3">
          <div className="flex items-end justify-between">
            <div>
              <p className="text-2xl font-bold tabular-nums">{totalCalories}</p>
              <p className="text-xs text-muted-foreground">
                cal today{calorieTarget ? ` · target ${calorieTarget}` : ""}
              </p>
            </div>
            <div className="text-right space-y-0.5">
              <p className="text-xs text-muted-foreground">{totalProtein}g protein</p>
              <p className="text-xs text-muted-foreground">{totalCarbs}g carbs</p>
              <p className="text-xs text-muted-foreground">{totalFat}g fat</p>
            </div>
          </div>
          {caloriePercent !== null && (
            <div className="space-y-1">
              <div className="h-2 bg-background rounded-full overflow-hidden">
                <div
                  className="h-full bg-accent rounded-full transition-all"
                  style={{ width: `${caloriePercent}%` }}
                />
              </div>
              <p className="text-xs text-muted-foreground text-right">{caloriePercent}% of daily goal</p>
            </div>
          )}
        </div>
      )}

      {/* Weekly nutrition bars */}
      {weekCalories.some((d) => d.calories > 0) && (
        <div className="bg-muted rounded-2xl p-4">
          <p className="text-xs text-muted-foreground mb-3">This week</p>
          <div className="flex items-end gap-1.5 h-12">
            {weekDates.map((date, i) => {
              const cal = weekCalories.find((d) => d.date === date)?.calories ?? 0
              const height = cal > 0 ? Math.max(10, Math.round((cal / maxWeekCal) * 100)) : 0
              const isToday = date === today
              return (
                <div key={date} className="flex-1 flex flex-col items-center gap-1">
                  <div className="w-full flex items-end justify-center" style={{ height: "2.5rem" }}>
                    <div
                      className={`w-full rounded-sm transition-all ${isToday ? "bg-accent" : "bg-accent/30"}`}
                      style={{ height: `${height}%` }}
                    />
                  </div>
                  <span className={`text-[10px] ${isToday ? "text-accent font-semibold" : "text-muted-foreground"}`}>
                    {DAY_LABELS[i]}
                  </span>
                </div>
              )
            })}
          </div>
          {calorieTarget && (
            <p className="text-xs text-muted-foreground mt-1 text-right">target {calorieTarget} cal</p>
          )}
        </div>
      )}

      {/* FODMAP watchouts */}
      {watchouts.length > 0 && (
        <div className="bg-muted rounded-2xl p-4 space-y-2">
          <div className="flex items-center gap-2 text-sm font-medium">
            <AlertTriangle size={14} className="text-amber-500" />
            FODMAP heads up
          </div>
          {watchouts.map((w, i) => (
            <p key={i} className="text-xs text-muted-foreground leading-relaxed">
              <span className="capitalize text-foreground font-medium">{w.meal}</span>
              {" · "}
              <span className="text-foreground">{w.ingredient}</span>
              {w.suggestion && <span> → {w.suggestion}</span>}
            </p>
          ))}
        </div>
      )}

      {/* Snack ideas */}
      {!hasSnack && snackIdeas.length > 0 && (
        <div className="bg-muted rounded-2xl p-4 space-y-2">
          <div className="flex items-center gap-2 text-sm font-medium">
            <Sparkles size={14} className="text-accent" />
            Snack ideas
          </div>
          <div className="flex flex-wrap gap-2">
            {snackIdeas.slice(0, 4).map((s) => (
              <Link
                key={s.id}
                href={`/recipes/${s.slug}`}
                className="text-xs bg-background rounded-full px-3 py-1.5 hover:text-accent transition-colors"
              >
                {s.title}
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
