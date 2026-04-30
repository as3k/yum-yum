import { db } from "@/lib/db"
import { meals, mealRecipes, recipes } from "@/lib/db/schema"
import { eq } from "drizzle-orm"
import { notFound } from "next/navigation"
import Link from "next/link"
import { ChevronLeft, Pencil } from "lucide-react"
import type { NutritionData } from "@/lib/db/schema"
import { formatTime } from "@/lib/utils"

export default async function MealPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const mealId = parseInt(id)
  if (isNaN(mealId)) notFound()

  const meal = await db.query.meals.findFirst({
    where: eq(meals.id, mealId),
  })
  if (!meal) notFound()

  const rows = await db
    .select({
      recipeId: recipes.id,
      title: recipes.title,
      slug: recipes.slug,
      mealType: recipes.mealType,
      totalTimeMin: recipes.totalTimeMin,
      nutritionPerServing: recipes.nutritionPerServing,
    })
    .from(mealRecipes)
    .leftJoin(recipes, eq(mealRecipes.recipeId, recipes.id))
    .where(eq(mealRecipes.mealId, mealId))
    .orderBy(mealRecipes.sortOrder)

  const nutritionRows = rows.filter((r) => r.nutritionPerServing)
  const combined = nutritionRows.reduce(
    (acc, r) => {
      const n = r.nutritionPerServing as NutritionData
      return {
        calories: acc.calories + n.calories,
        carbsG: acc.carbsG + n.carbsG,
        fiberG: acc.fiberG + n.fiberG,
        fatG: acc.fatG + n.fatG,
        proteinG: acc.proteinG + n.proteinG,
      }
    },
    { calories: 0, carbsG: 0, fiberG: 0, fatG: 0, proteinG: 0 }
  )

  return (
    <div className="max-w-2xl mx-auto px-4 pt-6 pb-4">
      <div className="flex items-center justify-between mb-6">
        <Link
          href="/meals"
          className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ChevronLeft size={16} />
          Meals
        </Link>
        <Link
          href={`/meals/${mealId}/edit`}
          className="flex items-center gap-1.5 text-sm font-medium px-3 h-8 border border-border rounded hover:bg-muted transition-colors"
        >
          <Pencil size={14} />
          Edit
        </Link>
      </div>

      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{meal.name}</h1>
          {meal.description && (
            <p className="text-sm text-muted-foreground mt-1">{meal.description}</p>
          )}
        </div>

        {/* Combined nutrition */}
        {nutritionRows.length > 0 && (
          <div className="border border-border rounded-lg p-4 space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Combined nutrition
              {nutritionRows.length < rows.length && (
                <span className="font-normal ml-1">
                  ({nutritionRows.length} of {rows.length} recipes have data)
                </span>
              )}
            </p>
            <div className="grid grid-cols-5 gap-2 text-center">
              {[
                { label: "Cal", value: combined.calories },
                { label: "Carbs", value: `${combined.carbsG}g` },
                { label: "Fiber", value: `${combined.fiberG}g` },
                { label: "Fat", value: `${combined.fatG}g` },
                { label: "Protein", value: `${combined.proteinG}g` },
              ].map(({ label, value }) => (
                <div key={label}>
                  <p className="text-base font-semibold tabular-nums">{value}</p>
                  <p className="text-xs text-muted-foreground">{label}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Recipes */}
        <div className="space-y-2">
          <p className="text-sm font-medium">Recipes in this meal</p>
          {rows.length === 0 ? (
            <p className="text-sm text-muted-foreground">No recipes added yet.</p>
          ) : (
            <div className="space-y-2">
              {rows.map((r) => (
                <Link
                  key={r.recipeId}
                  href={`/recipes/${r.slug}`}
                  className="flex items-center gap-3 px-4 py-3 border border-border rounded-lg hover:bg-muted transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{r.title}</p>
                    <p className="text-xs text-muted-foreground capitalize">
                      {r.mealType}
                      {r.totalTimeMin && ` · ${formatTime(r.totalTimeMin)}`}
                      {r.nutritionPerServing && ` · ${(r.nutritionPerServing as NutritionData).calories} cal`}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
