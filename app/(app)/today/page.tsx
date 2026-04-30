import { db } from "@/lib/db"
import { mealPlans, mealPlanSlots, recipes, userPreferences } from "@/lib/db/schema"
import { desc, eq, lte } from "drizzle-orm"
import Link from "next/link"
import TodayDashboard from "@/components/today-dashboard"
import { todayStr, getMondayOfWeek, getNextWeekStart } from "@/lib/utils"
import { auth } from "@/lib/auth"
import { cookies } from "next/headers"
import { Calendar, ChevronRight } from "lucide-react"

const MEAL_TYPES = ["breakfast", "lunch", "snack", "dinner"] as const

function timeOfDayGreeting(hour: number) {
  if (hour < 12) return "Good morning"
  if (hour < 17) return "Good afternoon"
  if (hour < 21) return "Good evening"
  return "Good night"
}

export default async function TodayPage() {
  const session = await auth()
  const firstName = session?.user?.name?.split(" ")[0] ?? "there"
  const userId = session?.user?.id

  const tz = decodeURIComponent((await cookies()).get("tz")?.value ?? "")
  const today = todayStr(tz || undefined)

  const serverNow = new Date()
  const nowHour = tz
    ? parseInt(serverNow.toLocaleString("en-US", { timeZone: tz, hour: "numeric", hour12: false })) % 24
    : serverNow.getUTCHours()

  const currentPlan = await db.query.mealPlans.findFirst({
    where: lte(mealPlans.weekStart, today),
    orderBy: [desc(mealPlans.weekStart)],
  })

  const todayDate = new Date(today + "T00:00:00")
  const monday = getMondayOfWeek(todayDate)
  const thisWeekMonday = [
    monday.getFullYear(),
    String(monday.getMonth() + 1).padStart(2, "0"),
    String(monday.getDate()).padStart(2, "0"),
  ].join("-")
  const rawWeekStart = currentPlan?.weekStart ?? thisWeekMonday
  const normalizedMonday = getMondayOfWeek(new Date(rawWeekStart + "T00:00:00"))
  const currentWeekStart = [
    normalizedMonday.getFullYear(),
    String(normalizedMonday.getMonth() + 1).padStart(2, "0"),
    String(normalizedMonday.getDate()).padStart(2, "0"),
  ].join("-")
  const nextWeekStart = getNextWeekStart(currentWeekStart)

  // Full date label
  const todayDateObj = new Date(today + "T12:00:00")
  const dayName = todayDateObj.toLocaleDateString("en-US", { weekday: "long" })
  const dateFull = todayDateObj.toLocaleDateString("en-US", { month: "long", day: "numeric" })

  if (!currentPlan) {
    return (
      <div className="max-w-2xl mx-auto px-4 pt-8 pb-6 space-y-6">
        <div>
          <p className="text-xs text-muted-foreground">{dayName}, {dateFull}</p>
          <h1 className="text-2xl font-bold tracking-tight">{timeOfDayGreeting(nowHour)}, {firstName} 🌱</h1>
        </div>
        <div className="bg-muted rounded-2xl p-6 text-center space-y-3">
          <Calendar size={28} className="mx-auto text-muted-foreground opacity-40" />
          <p className="text-sm text-muted-foreground">No meals planned this week</p>
          <Link
            href={`/plan?week=${currentWeekStart}`}
            className="inline-flex items-center gap-1.5 text-sm font-medium px-4 h-9 bg-accent text-white rounded-xl hover:opacity-80 transition-opacity"
          >
            Plan this week
          </Link>
        </div>
      </div>
    )
  }

  const [slots, prefs, snackIdeas, swapRecipes] = await Promise.all([
    db
      .select({
        id: mealPlanSlots.id,
        dayDate: mealPlanSlots.dayDate,
        mealType: mealPlanSlots.mealType,
        notes: mealPlanSlots.notes,
        recipe: {
          id: recipes.id,
          title: recipes.title,
          slug: recipes.slug,
          totalTimeMin: recipes.totalTimeMin,
          nutritionPerServing: recipes.nutritionPerServing,
          fodmapFlags: recipes.fodmapFlags,
          storageNotes: recipes.storageNotes,
          maxStorageDays: recipes.maxStorageDays,
        },
      })
      .from(mealPlanSlots)
      .leftJoin(recipes, eq(mealPlanSlots.recipeId, recipes.id))
      .where(eq(mealPlanSlots.mealPlanId, currentPlan.id)),
    userId ? db.query.userPreferences.findFirst({ where: eq(userPreferences.userId, userId) }) : null,
    db.query.recipes.findMany({ where: eq(recipes.mealType, "snack"), orderBy: (r, { asc }) => [asc(r.title)], limit: 6 }),
    db.query.recipes.findMany({ columns: { id: true, title: true, mealType: true }, orderBy: (r, { asc }) => [asc(r.title)] }),
  ])

  const todaySlots = slots
    .filter((s) => s.dayDate === today)
    .map((s) => ({
      id: s.id,
      mealType: s.mealType,
      recipe: s.recipe?.id ? {
        id: s.recipe.id,
        title: s.recipe.title ?? "",
        slug: s.recipe.slug ?? "",
        nutritionPerServing: s.recipe.nutritionPerServing as import("@/lib/db/schema").NutritionData | null,
        fodmapFlags: (s.recipe.fodmapFlags ?? []) as import("@/lib/db/schema").FodmapFlag[],
        storageNotes: s.recipe.storageNotes ?? null,
        maxStorageDays: s.recipe.maxStorageDays ?? null,
      } : null,
    }))

  const weekCalories = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(currentWeekStart + "T00:00:00")
    d.setDate(d.getDate() + i)
    const date = [d.getFullYear(), String(d.getMonth() + 1).padStart(2, "0"), String(d.getDate()).padStart(2, "0")].join("-")
    const daySlots = slots.filter((s) => s.dayDate === date && s.recipe?.nutritionPerServing)
    const calories = daySlots.reduce((sum, s) => {
      const n = s.recipe?.nutritionPerServing as import("@/lib/db/schema").NutritionData | null
      return sum + (n?.calories ?? 0)
    }, 0)
    return { date, calories }
  })

  const slotMap = Object.fromEntries(todaySlots.map((s) => [s.mealType, s]))
  const plannedCount = MEAL_TYPES.filter((t) => slotMap[t]?.recipe).length
  const heroSubline = plannedCount === 4
    ? "All 4 meals planned today"
    : plannedCount === 0
    ? "No meals planned yet"
    : `${plannedCount} of 4 meals planned`

  return (
    <div className="max-w-2xl mx-auto px-4 pt-8 pb-6 space-y-6">
      {/* Hero */}
      <div className="space-y-0.5">
        <p className="text-xs text-muted-foreground">{dayName}, {dateFull}</p>
        <h1 className="text-2xl font-bold tracking-tight">{timeOfDayGreeting(nowHour)}, {firstName} 🌱</h1>
        <p className="text-sm text-muted-foreground">{heroSubline}</p>
      </div>

      <TodayDashboard
        today={today}
        weekStart={currentWeekStart}
        slots={todaySlots}
        snackIdeas={snackIdeas.map((r) => ({ id: r.id, title: r.title, slug: r.slug }))}
        calorieTarget={prefs?.calorieTarget ?? null}
        weekCalories={weekCalories}
        swapRecipes={swapRecipes.map((r) => ({ id: r.id, title: r.title, mealType: r.mealType }))}
      />

      {/* See this week link */}
      <Link
        href="/plan"
        className="flex items-center justify-between px-4 py-3 bg-muted rounded-xl hover:bg-muted/80 transition-colors"
      >
        <div>
          <p className="text-sm font-medium">This week's plan</p>
          <p className="text-xs text-muted-foreground">See all 7 days</p>
        </div>
        <ChevronRight size={15} className="text-muted-foreground shrink-0" />
      </Link>
    </div>
  )
}
