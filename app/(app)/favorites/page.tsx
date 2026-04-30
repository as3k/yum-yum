import { db } from "@/lib/db"
import { recipes, userRecipeFavorites, userRecipeRatings } from "@/lib/db/schema"
import { eq, inArray } from "drizzle-orm"
import { auth } from "@/lib/auth"
import RecipeCard from "@/components/recipe-card"
import Link from "next/link"
import { ChevronLeft } from "lucide-react"

export default async function FavoritesPage() {
  const session = await auth()
  const userId = session?.user?.id

  if (!userId) {
    return (
      <div className="max-w-2xl mx-auto px-4 pt-10 text-center">
        <p className="text-muted-foreground text-sm">Sign in to see your saved favorites.</p>
      </div>
    )
  }

  const favorites = await db.query.userRecipeFavorites.findMany({
    where: eq(userRecipeFavorites.userId, userId),
    orderBy: (t, { desc }) => [desc(t.createdAt)],
  })

  if (favorites.length === 0) {
    return (
      <div className="max-w-2xl mx-auto px-4 pt-8 pb-6">
        <div className="mb-5">
          <Link href="/you" className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors mb-4">
            <ChevronLeft size={16} />
            You
          </Link>
          <h1 className="text-xl font-semibold tracking-tight">Favorites</h1>
        </div>
        <p className="text-muted-foreground text-sm">No favorites yet! Tap the heart on any recipe to save the good stuff.</p>
      </div>
    )
  }

  const recipeIds = favorites.map((f) => f.recipeId)

  const [favoriteRecipes, ratings] = await Promise.all([
    db.query.recipes.findMany({
      where: inArray(recipes.id, recipeIds),
    }),
    db.query.userRecipeRatings.findMany({
      where: eq(userRecipeRatings.userId, userId),
    }),
  ])

  const ratingMap = new Map(ratings.map((r) => [r.recipeId, r.rating]))
  const orderedRecipes = recipeIds
    .map((id) => favoriteRecipes.find((r) => r.id === id))
    .filter(Boolean) as typeof favoriteRecipes

  return (
    <div className="max-w-2xl mx-auto px-4 pt-8 pb-6">
      <div className="mb-5">
        <Link href="/you" className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors mb-4">
          <ChevronLeft size={16} />
          You
        </Link>
        <h1 className="text-xl font-semibold tracking-tight">Favorites</h1>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {orderedRecipes.map((recipe) => (
          <RecipeCard
            key={recipe.id}
            recipe={recipe}
            isFavorited={true}
            rating={ratingMap.get(recipe.id) ?? null}
          />
        ))}
      </div>
    </div>
  )
}
