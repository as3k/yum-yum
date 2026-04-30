import { db } from "@/lib/db"
import { mealPlans, mealPlanSlots, recipes, userRecipeFavorites } from "@/lib/db/schema"
import { desc, eq, lte } from "drizzle-orm"
import Link from "next/link"
import WeekGrid from "@/components/week-grid"
import PlanEditor, { type EditableDay, type RecipeOption } from "@/components/plan-editor"
import { formatWeekRange, getNextWeekStart, getWeekDates } from "@/lib/utils"
import { auth } from "@/lib/auth"

export default async function PlanPage({
  searchParams,
}: {
  searchParams: Promise<{ week?: string }>
}) {
  const { week: weekParam } = await searchParams
  const today = new Date().toISOString().split("T")[0]

  // Current/most-recent plan
  const currentPlan = await db.query.mealPlans.findFirst({
    where: lte(mealPlans.weekStart, today),
    orderBy: [desc(mealPlans.weekStart)],
  })

  const currentWeekStart = currentPlan?.weekStart ?? today
  const nextWeekStart = getNextWeekStart(currentWeekStart)
  const isNextWeek = weekParam === nextWeekStart

  // ── Next week view (editable) ───────────────────────────────────────────────
  if (isNextWeek) {
    const session = await auth()
    const userId = session?.user?.id

    const [nextPlan, allRecipes, favorites] = await Promise.all([
      db.query.mealPlans.findFirst({ where: eq(mealPlans.weekStart, nextWeekStart) }),
      db.query.recipes.findMany(),
      userId ? db.query.userRecipeFavorites.findMany() : Promise.resolve([]),
    ])

    const existingSlots = nextPlan
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
          .where(eq(mealPlanSlots.mealPlanId, nextPlan.id))
      : []

    const favoriteIds = new Set(favorites.map((f) => f.recipeId))

    const recipeOptions: RecipeOption[] = allRecipes.map((r) => ({
      id: r.id,
      title: r.title,
      slug: r.slug,
      mealType: r.mealType as RecipeOption["mealType"],
      isFavorited: favoriteIds.has(r.id),
    }))

    const weekDates = getWeekDates(nextWeekStart)
    const initialDays: EditableDay[] = weekDates.map((date) => ({
      date,
      breakfast:
        existingSlots.find((s) => s.dayDate === date && s.mealType === "breakfast" && s.recipeId)
          ? {
              id: existingSlots.find((s) => s.dayDate === date && s.mealType === "breakfast")!.id,
              recipeId: existingSlots.find((s) => s.dayDate === date && s.mealType === "breakfast")!.recipeId!,
              recipeTitle: existingSlots.find((s) => s.dayDate === date && s.mealType === "breakfast")!.recipeTitle ?? "",
              recipeSlug: existingSlots.find((s) => s.dayDate === date && s.mealType === "breakfast")!.recipeSlug ?? "",
            }
          : null,
      lunch:
        existingSlots.find((s) => s.dayDate === date && s.mealType === "lunch" && s.recipeId)
          ? {
              id: existingSlots.find((s) => s.dayDate === date && s.mealType === "lunch")!.id,
              recipeId: existingSlots.find((s) => s.dayDate === date && s.mealType === "lunch")!.recipeId!,
              recipeTitle: existingSlots.find((s) => s.dayDate === date && s.mealType === "lunch")!.recipeTitle ?? "",
              recipeSlug: existingSlots.find((s) => s.dayDate === date && s.mealType === "lunch")!.recipeSlug ?? "",
            }
          : null,
      dinner:
        existingSlots.find((s) => s.dayDate === date && s.mealType === "dinner" && s.recipeId)
          ? {
              id: existingSlots.find((s) => s.dayDate === date && s.mealType === "dinner")!.id,
              recipeId: existingSlots.find((s) => s.dayDate === date && s.mealType === "dinner")!.recipeId!,
              recipeTitle: existingSlots.find((s) => s.dayDate === date && s.mealType === "dinner")!.recipeTitle ?? "",
              recipeSlug: existingSlots.find((s) => s.dayDate === date && s.mealType === "dinner")!.recipeSlug ?? "",
            }
          : null,
      snack:
        existingSlots.find((s) => s.dayDate === date && s.mealType === "snack" && s.recipeId)
          ? {
              id: existingSlots.find((s) => s.dayDate === date && s.mealType === "snack")!.id,
              recipeId: existingSlots.find((s) => s.dayDate === date && s.mealType === "snack")!.recipeId!,
              recipeTitle: existingSlots.find((s) => s.dayDate === date && s.mealType === "snack")!.recipeTitle ?? "",
              recipeSlug: existingSlots.find((s) => s.dayDate === date && s.mealType === "snack")!.recipeSlug ?? "",
            }
          : null,
    }))

    return (
      <div className="max-w-2xl mx-auto px-4 pt-6 pb-4">
        <PlanHeader
          currentWeekStart={currentWeekStart}
          nextWeekStart={nextWeekStart}
          activeWeek={nextWeekStart}
        />
        <div className="flex items-center justify-between mb-5">
          <h1 className="text-xl font-semibold tracking-tight">Next Week</h1>
          <span className="text-sm text-muted-foreground">{formatWeekRange(nextWeekStart)}</span>
        </div>
        <PlanEditor
          weekStart={nextWeekStart}
          initialDays={initialDays}
          allRecipes={recipeOptions}
        />
      </div>
    )
  }

  // ── Current week view (read-only) ───────────────────────────────────────────
  if (!currentPlan) {
    return (
      <div className="max-w-2xl mx-auto px-4 pt-6 pb-4">
        <PlanHeader
          currentWeekStart={currentWeekStart}
          nextWeekStart={nextWeekStart}
          activeWeek={currentWeekStart}
        />
        <div className="pt-10 text-center">
          <p className="text-muted-foreground text-sm">No meal plan yet.</p>
          <p className="text-muted-foreground text-xs mt-1">
            Switch to Next Week to build your first plan.
          </p>
        </div>
      </div>
    )
  }

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
}: {
  currentWeekStart: string
  nextWeekStart: string
  activeWeek: string
}) {
  return (
    <div className="flex gap-1 mb-6 p-1 bg-muted rounded-lg">
      <Link
        href="/plan"
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
