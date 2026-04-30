import { db } from "@/lib/db"
import { recipes, userRecipeFavorites, userRecipeRatings } from "@/lib/db/schema"
import { eq } from "drizzle-orm"
import { auth } from "@/lib/auth"
import RecipeCard from "@/components/recipe-card"
import RecipeFilters from "@/components/recipe-filters"
import Link from "next/link"
import { ChevronLeft } from "lucide-react"

export default async function RecipesPage({
  searchParams,
}: {
  searchParams: Promise<{ meal?: string }>
}) {
  const { meal } = await searchParams
  const session = await auth()
  const userId = session?.user?.id

  const allRecipes = await db.query.recipes.findMany({
    orderBy: (r, { asc }) => [asc(r.mealType), asc(r.title)],
  })

  const favorites = userId
    ? await db.query.userRecipeFavorites.findMany({
        where: eq(userRecipeFavorites.userId, userId),
      })
    : []

  const ratings = userId
    ? await db.query.userRecipeRatings.findMany({
        where: eq(userRecipeRatings.userId, userId),
      })
    : []

  const favoriteIds = new Set(favorites.map((f) => f.recipeId))
  const ratingMap = new Map(ratings.map((r) => [r.recipeId, r.rating]))

  const filtered =
    meal && ["breakfast", "lunch", "dinner"].includes(meal)
      ? allRecipes.filter((r) => r.mealType === meal)
      : allRecipes

  return (
    <div className="max-w-2xl mx-auto px-4 pt-8 pb-6">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          <Link href="/today" className="text-muted-foreground hover:text-foreground transition-colors -ml-3 p-2">
            <ChevronLeft size={20} />
          </Link>
          <h1 className="text-xl font-semibold tracking-tight">Recipes</h1>
        </div>
        <a href="/recipes/add" className="flex items-center gap-1.5 text-sm font-medium px-3 h-8 bg-accent text-white rounded hover:opacity-80 transition-opacity">
          + Add recipe
        </a>
      </div>
      <RecipeFilters active={meal} />

      {filtered.length === 0 ? (
        <p className="text-muted-foreground text-sm text-center mt-10">No recipes yet — add your first one!</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
          {filtered.map((recipe) => (
            <RecipeCard
              key={recipe.id}
              recipe={recipe}
              isFavorited={favoriteIds.has(recipe.id)}
              rating={ratingMap.get(recipe.id) ?? null}
            />
          ))}
        </div>
      )}
    </div>
  )
}
