import Link from "next/link"
import { AlertTriangle, Sparkles } from "lucide-react"
import type { NutritionData, FodmapFlag } from "@/lib/db/schema"

interface MealSlot {
  id: number
  mealType: string
  recipe: { id: number; title: string; slug: string; nutritionPerServing: NutritionData | null; fodmapFlags: FodmapFlag[] } | null
}

interface SnackIdea {
  id: number
  title: string
  slug: string
}

interface Props {
  today: string
  slots: MealSlot[]
  snackIdeas: SnackIdea[]
  calorieTarget: number | null
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

export default function TodayDashboard({ today, slots, snackIdeas, calorieTarget }: Props) {
  const slotMap = Object.fromEntries(slots.map((s) => [s.mealType, s]))
  const mealOrder = ["breakfast", "lunch", "snack", "dinner"]

  const nutritionSlots = slots.filter((s) => s.recipe?.nutritionPerServing)
  const totalCalories = nutritionSlots.reduce((sum, s) => sum + (s.recipe!.nutritionPerServing!.calories), 0)
  const totalProtein = nutritionSlots.reduce((sum, s) => sum + (s.recipe!.nutritionPerServing!.proteinG), 0)
  const totalCarbs = nutritionSlots.reduce((sum, s) => sum + (s.recipe!.nutritionPerServing!.carbsG), 0)
  const totalFat = nutritionSlots.reduce((sum, s) => sum + (s.recipe!.nutritionPerServing!.fatG), 0)

  const caloriePercent = calorieTarget && totalCalories
    ? Math.min(Math.round((totalCalories / calorieTarget) * 100), 100)
    : null

  const watchouts = slots.flatMap((s) =>
    (s.recipe?.fodmapFlags ?? [])
      .filter((f) => !f.skipped)
      .map((f) => ({ ...f, meal: s.mealType }))
  )

  const hasSnack = !!slotMap["snack"]?.recipe
  const [month, dayNum] = [
    new Date(today + "T00:00:00").toLocaleDateString("en-US", { month: "long" }),
    new Date(today + "T00:00:00").getDate(),
  ]

  return (
    <div className="space-y-4">
      <p className="text-xs text-muted-foreground">{month} {dayNum}</p>

      {/* Today's meals */}
      <div className="bg-muted rounded-2xl overflow-hidden">
        {mealOrder.map((type, i) => {
          const slot = slotMap[type]
          const recipe = slot?.recipe
          return (
            <div
              key={type}
              className={`flex items-center gap-3 px-5 py-3.5 ${i > 0 ? "border-t border-border/40" : ""}`}
            >
              <span className="text-base w-6 shrink-0">{MEAL_EMOJIS[type]}</span>
              <span className="text-xs text-muted-foreground w-16 shrink-0">{MEAL_LABELS[type]}</span>
              {recipe ? (
                <Link
                  href={`/recipes/${recipe.slug}`}
                  className="text-sm font-medium hover:text-accent transition-colors truncate"
                >
                  {recipe.title}
                </Link>
              ) : (
                <Link
                  href={`/plan?week=${today.slice(0, 8)}01`.replace("01", today.slice(8, 10))}
                  className="text-sm text-muted-foreground hover:text-accent transition-colors"
                >
                  — add to plan
                </Link>
              )}
            </div>
          )
        })}
      </div>

      {/* Nutrition */}
      {nutritionSlots.length > 0 && (
        <div className="bg-muted rounded-2xl p-5 space-y-3">
          <div className="flex items-end justify-between">
            <div>
              <p className="text-2xl font-bold tabular-nums">{totalCalories}</p>
              <p className="text-xs text-muted-foreground">
                calories today
                {calorieTarget && <span> of {calorieTarget} target</span>}
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

      {/* Watchouts */}
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
