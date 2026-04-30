import { db } from "@/lib/db"
import { recipes } from "@/lib/db/schema"
import { asc } from "drizzle-orm"
import Link from "next/link"
import { ChevronLeft } from "lucide-react"
import MealBuilder from "@/components/meal-builder"

export default async function NewMealPage() {
  const allRecipes = await db
    .select({
      id: recipes.id,
      title: recipes.title,
      mealType: recipes.mealType,
      totalTimeMin: recipes.totalTimeMin,
      nutritionPerServing: recipes.nutritionPerServing,
    })
    .from(recipes)
    .orderBy(asc(recipes.title))

  return (
    <div className="max-w-2xl mx-auto px-4 pt-8 pb-6">
      <div className="mb-6">
        <Link
          href="/meals"
          className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ChevronLeft size={16} />
          Meals
        </Link>
        <h1 className="text-xl font-semibold tracking-tight mt-3">New meal</h1>
      </div>
      <MealBuilder allRecipes={allRecipes} />
    </div>
  )
}
