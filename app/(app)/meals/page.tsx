import { db } from "@/lib/db"
import { meals, mealRecipes, recipes } from "@/lib/db/schema"
import { eq } from "drizzle-orm"
import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import Link from "next/link"
import { Plus, UtensilsCrossed } from "lucide-react"
import type { NutritionData } from "@/lib/db/schema"
import HeaderControls from "@/components/header-controls"

export default async function MealsPage() {
  const session = await auth()
  if (!session?.user?.id) redirect("/login")
  const householdId = session.user.householdId

  const allMeals = householdId
    ? await db.query.meals.findMany({
        where: eq(meals.householdId, householdId),
        orderBy: (meals, { desc }) => [desc(meals.createdAt)],
      })
    : []

  const mealIds = allMeals.map((m) => m.id)

  const mealRecipeRows =
    mealIds.length > 0
      ? await db
          .select({
            mealId: mealRecipes.mealId,
            recipeTitle: recipes.title,
            nutritionPerServing: recipes.nutritionPerServing,
          })
          .from(mealRecipes)
          .leftJoin(recipes, eq(mealRecipes.recipeId, recipes.id))
          .orderBy(mealRecipes.sortOrder)
      : []

  const mealData = allMeals.map((meal) => {
    const rows = mealRecipeRows.filter((r) => r.mealId === meal.id)
    const nutritionRows = rows.filter((r) => r.nutritionPerServing)
    const combined = nutritionRows.reduce(
      (acc, r) => {
        const n = r.nutritionPerServing as NutritionData
        return {
          calories: acc.calories + n.calories,
          proteinG: acc.proteinG + n.proteinG,
        }
      },
      { calories: 0, proteinG: 0 }
    )
    return { meal, rows, combined, hasNutrition: nutritionRows.length > 0 }
  })

  return (
    <div className="max-w-2xl mx-auto px-4 pt-8 pb-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-semibold tracking-tight">Meals</h1>
        <div className="flex items-center gap-2">
          <Link
            href="/meals/new"
            className="flex items-center gap-1.5 text-sm font-medium px-3 h-8 bg-accent text-white rounded hover:opacity-80 transition-opacity"
          >
            <Plus size={14} />
            New meal
          </Link>
          <HeaderControls />
        </div>
      </div>

      {mealData.length === 0 ? (
        <div className="pt-16 text-center space-y-2">
          <UtensilsCrossed size={32} className="mx-auto text-muted-foreground opacity-40" />
          <p className="text-muted-foreground text-sm">No meals yet!</p>
          <p className="text-muted-foreground text-xs">
            Combine recipes into meals to see combined nutrition.
          </p>
          <Link
            href="/meals/new"
            className="inline-block mt-2 text-sm font-medium underline underline-offset-2"
          >
            Build your first meal
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {mealData.map(({ meal, rows, combined, hasNutrition }) => (
            <Link
              key={meal.id}
              href={`/meals/${meal.id}`}
              className="block border border-border rounded-lg p-4 hover:bg-muted transition-colors"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-medium truncate">{meal.name}</p>
                  {meal.description && (
                    <p className="text-xs text-muted-foreground mt-0.5 truncate">{meal.description}</p>
                  )}
                  <p className="text-xs text-muted-foreground mt-1">
                    {rows.length === 0
                      ? "No recipes"
                      : rows.length === 1
                      ? "1 recipe"
                      : `${rows.length} recipes`}
                    {rows.length > 0 && (
                      <span className="ml-1">
                        · {rows.slice(0, 2).map((r) => r.recipeTitle).join(", ")}
                        {rows.length > 2 && ` +${rows.length - 2} more`}
                      </span>
                    )}
                  </p>
                </div>
                {hasNutrition && (
                  <div className="text-right shrink-0">
                    <p className="text-sm font-semibold tabular-nums">{combined.calories} cal</p>
                    <p className="text-xs text-muted-foreground">{combined.proteinG}g protein</p>
                  </div>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
