import { db } from "@/lib/db"
import { mealPlans, mealPlanSlots, recipes, userRecipeFavorites } from "@/lib/db/schema"
import { desc, eq, lte } from "drizzle-orm"
import Link from "next/link"
import WeekGrid from "@/components/week-grid"
import PlanEditor, { type EditableDay, type RecipeOption } from "@/components/plan-editor"
import { formatWeekRange, getNextWeekStart, getWeekDates, todayStr, getMondayOfWeek } from "@/lib/utils"
import { auth } from "@/lib/auth"
import { cookies } from "next/headers"
import { Calendar } from "lucide-react"

export default async function PlanPage({
  searchParams,
}: {
  searchParams: Promise<{ week?: string }>
}) {
  const { week: weekParam } = await searchParams
  const tz = decodeURIComponent((await cookies()).get("tz")?.value ?? "")
  const today = todayStr(tz || undefined)

  // Current/most-recent plan
  const currentPlan = await db.query.mealPlans.findFirst({
    where: lte(mealPlans.weekStart, today),
    orderBy: [desc(mealPlans.weekStart)],
  })

  // Snap to Monday of current week as fallback
  const todayDate = new Date(today + "T00:00:00")
  const monday = getMondayOfWeek(todayDate)
  const thisWeekMonday = [
    monday.getFullYear(),
    String(monday.getMonth() + 1).padStart(2, "0"),
    String(monday.getDate()).padStart(2, "0"),
  ].join("-")

  const currentWeekStart = currentPlan?.weekStart ?? thisWeekMonday
  const nextWeekStart = getNextWeekStart(currentWeekStart)

  // Editable when: next week tab OR current week tab with no existing plan
  const isEditing =
    weekParam === nextWeekStart ||
    (weekParam === currentWeekStart && !currentPlan)

  // ── Editable view ──────────────────────────────────────────────────────────
  if (isEditing && weekParam) {
    const session = await auth()
    const userId = session?.user?.id

    const [existingPlan, allRecipes, favorites] = await Promise.all([
      db.query.mealPlans.findFirst({ where: eq(mealPlans.weekStart, weekParam) }),
      db.query.recipes.findMany(),
      userId ? db.query.userRecipeFavorites.findMany() : Promise.resolve([]),
    ])

    const existingSlots = existingPlan
      ? await db
          .select({
            id: mealPlanSlots.id,
            dayDate: mealPlanSlots.dayDate,
            mealType: mealPlanSlots.mealType,
            recipeId: mealPlanSlots.recipeId,
            recipeTitle: recipes.title,
            recipeSlug: recipes.slug,
          })
          .from(mealPlanSlots)
          .leftJoin(recipes, eq(mealPlanSlots.recipeId, recipes.id))
          .where(eq(mealPlanSlots.mealPlanId, existingPlan.id))
      : []

    const favoriteIds = new Set(favorites.map((f) => f.recipeId))

    const recipeOptions: RecipeOption[] = allRecipes.map((r) => ({
      id: r.id,
      title: r.title,
      slug: r.slug,
      mealType: r.mealType as RecipeOption["mealType"],
      isFavorited: favoriteIds.has(r.id),
    }))

    const weekDates = getWeekDates(weekParam)
    const slot = (date: string, type: string) =>
      existingSlots.find((s) => s.dayDate === date && s.mealType === type && s.recipeId)

    const initialDays: EditableDay[] = weekDates.map((date) => ({
      date,
      breakfast: slot(date, "breakfast")
        ? { id: slot(date, "breakfast")!.id, recipeId: slot(date, "breakfast")!.recipeId!, recipeTitle: slot(date, "breakfast")!.recipeTitle ?? "", recipeSlug: slot(date, "breakfast")!.recipeSlug ?? "" }
        : null,
      lunch: slot(date, "lunch")
        ? { id: slot(date, "lunch")!.id, recipeId: slot(date, "lunch")!.recipeId!, recipeTitle: slot(date, "lunch")!.recipeTitle ?? "", recipeSlug: slot(date, "lunch")!.recipeSlug ?? "" }
        : null,
      dinner: slot(date, "dinner")
        ? { id: slot(date, "dinner")!.id, recipeId: slot(date, "dinner")!.recipeId!, recipeTitle: slot(date, "dinner")!.recipeTitle ?? "", recipeSlug: slot(date, "dinner")!.recipeSlug ?? "" }
        : null,
      snack: slot(date, "snack")
        ? { id: slot(date, "snack")!.id, recipeId: slot(date, "snack")!.recipeId!, recipeTitle: slot(date, "snack")!.recipeTitle ?? "", recipeSlug: slot(date, "snack")!.recipeSlug ?? "" }
        : null,
    }))

    const isThisWeek = weekParam === currentWeekStart

    return (
      <div className="max-w-2xl mx-auto px-4 pt-6 pb-4">
        <PlanHeader
          currentWeekStart={currentWeekStart}
          nextWeekStart={nextWeekStart}
          activeWeek={weekParam}
          noCurrentPlan={!currentPlan}
        />
        <div className="flex items-center justify-between mb-5">
          <h1 className="text-xl font-semibold tracking-tight">
            {isThisWeek ? "This Week" : "Next Week"}
          </h1>
          <span className="text-sm text-muted-foreground">{formatWeekRange(weekParam)}</span>
        </div>
        <PlanEditor
          weekStart={weekParam}
          initialDays={initialDays}
          allRecipes={recipeOptions}
        />
      </div>
    )
  }

  // ── Empty state (no plan, not in edit mode) ────────────────────────────────
  if (!currentPlan) {
    return (
      <div className="max-w-2xl mx-auto px-4 pt-6 pb-4">
        <PlanHeader
          currentWeekStart={currentWeekStart}
          nextWeekStart={nextWeekStart}
          activeWeek={currentWeekStart}
          noCurrentPlan={true}
        />
        <div className="pt-16 text-center space-y-3">
          <Calendar size={32} className="mx-auto text-muted-foreground opacity-40" />
          <p className="text-muted-foreground text-sm">Nothing planned yet!</p>
          <Link
            href={`/plan?week=${currentWeekStart}`}
            className="inline-flex items-center gap-1.5 text-sm font-medium px-4 h-9 bg-foreground text-background rounded hover:opacity-80 transition-opacity"
          >
            Plan this week
          </Link>
        </div>
      </div>
    )
  }

  // ── Current week read-only view ────────────────────────────────────────────
  const slots = await db
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
      },
    })
    .from(mealPlanSlots)
    .leftJoin(recipes, eq(mealPlanSlots.recipeId, recipes.id))
    .where(eq(mealPlanSlots.mealPlanId, currentPlan.id))

  const dates = [...new Set(slots.map((s) => s.dayDate))].sort()
  const days = dates.map((date) => ({
    date,
    breakfast: slots.find((s) => s.dayDate === date && s.mealType === "breakfast") as (typeof slots)[0] | undefined,
    lunch: slots.find((s) => s.dayDate === date && s.mealType === "lunch") as (typeof slots)[0] | undefined,
    dinner: slots.find((s) => s.dayDate === date && s.mealType === "dinner") as (typeof slots)[0] | undefined,
    snack: slots.find((s) => s.dayDate === date && s.mealType === "snack") as (typeof slots)[0] | undefined,
  }))

  return (
    <div className="max-w-2xl mx-auto px-4 pt-6 pb-4">
      <PlanHeader
        currentWeekStart={currentWeekStart}
        nextWeekStart={nextWeekStart}
        activeWeek={currentWeekStart}
        noCurrentPlan={false}
      />
      <div className="flex items-center justify-between mb-5">
        <h1 className="text-xl font-semibold tracking-tight">This Week</h1>
        <span className="text-sm text-muted-foreground">{formatWeekRange(currentPlan.weekStart)}</span>
      </div>
      <WeekGrid days={days} today={today} />
    </div>
  )
}

function PlanHeader({
  currentWeekStart,
  nextWeekStart,
  activeWeek,
  noCurrentPlan,
}: {
  currentWeekStart: string
  nextWeekStart: string
  activeWeek: string
  noCurrentPlan: boolean
}) {
  return (
    <div className="flex gap-1 mb-6 p-1 bg-muted rounded-lg">
      <Link
        href={noCurrentPlan ? `/plan?week=${currentWeekStart}` : "/plan"}
        className={`flex-1 h-8 rounded text-sm font-medium flex items-center justify-center transition-colors ${
          activeWeek === currentWeekStart
            ? "bg-background text-foreground shadow-sm"
            : "text-muted-foreground hover:text-foreground"
        }`}
      >
        This Week
      </Link>
      <Link
        href={`/plan?week=${nextWeekStart}`}
        className={`flex-1 h-8 rounded text-sm font-medium flex items-center justify-center transition-colors ${
          activeWeek === nextWeekStart
            ? "bg-background text-foreground shadow-sm"
            : "text-muted-foreground hover:text-foreground"
        }`}
      >
        Next Week
      </Link>
    </div>
  )
}
