import { db } from "@/lib/db"
import { recipes, userRecipeFavorites, userRecipeRatings } from "@/lib/db/schema"
import { eq } from "drizzle-orm"
import { auth } from "@/lib/auth"
import RecipeCard from "@/components/recipe-card"
import RecipeFilters from "@/components/recipe-filters"

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
    <div className="max-w-2xl mx-auto px-4 pt-6 pb-4">
      <div className="flex items-center justify-between mb-5">
        <h1 className="text-xl font-semibold tracking-tight">Recipes</h1>
        <a
          href="/recipes/add"
          className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
        >
          + Add
        </a>
      </div>

      <RecipeFilters active={meal} />

      {filtered.length === 0 ? (
        <p className="text-muted-foreground text-sm text-center mt-10">No recipes yet.</p>
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
