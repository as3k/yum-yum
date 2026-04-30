import { db } from "@/lib/db"
import { meals, mealRecipes, recipes } from "@/lib/db/schema"
import { eq, asc } from "drizzle-orm"
import { notFound } from "next/navigation"
import Link from "next/link"
import { ChevronLeft } from "lucide-react"
import MealBuilder from "@/components/meal-builder"

export default async function EditMealPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const mealId = parseInt(id)
  if (isNaN(mealId)) notFound()

  const [meal, allRecipes, existingLinks] = await Promise.all([
    db.query.meals.findFirst({ where: eq(meals.id, mealId) }),
    db
      .select({
        id: recipes.id,
        title: recipes.title,
        mealType: recipes.mealType,
        totalTimeMin: recipes.totalTimeMin,
        nutritionPerServing: recipes.nutritionPerServing,
      })
      .from(recipes)
      .orderBy(asc(recipes.title)),
    db.query.mealRecipes.findMany({
      where: eq(mealRecipes.mealId, mealId),
      orderBy: [asc(mealRecipes.sortOrder)],
    }),
  ])

  if (!meal) notFound()

  const initialRecipeIds = existingLinks.map((r) => r.recipeId)

  return (
    <div className="max-w-2xl mx-auto px-4 pt-6 pb-4">
      <div className="mb-6">
        <Link
          href={`/meals/${mealId}`}
          className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ChevronLeft size={16} />
          Back
        </Link>
        <h1 className="text-xl font-semibold tracking-tight mt-3">Edit meal</h1>
      </div>
      <MealBuilder
        allRecipes={allRecipes}
        mealId={mealId}
        initialName={meal.name}
        initialDescription={meal.description ?? ""}
        initialRecipeIds={initialRecipeIds}
      />
    </div>
  )
}
