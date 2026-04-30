import { notFound } from "next/navigation"
import Image from "next/image"
import Link from "next/link"
import { ChevronLeft, Clock, Users, AlertTriangle, ChefHat } from "lucide-react"
import { db } from "@/lib/db"
import { recipes, userRecipeFavorites, userRecipeRatings } from "@/lib/db/schema"
import { eq, and } from "drizzle-orm"
import { auth } from "@/lib/auth"
import { formatTime } from "@/lib/utils"
import FavoriteButton from "@/components/favorite-button"
import StarRating from "@/components/star-rating"

export default async function RecipePage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const session = await auth()
  const userId = session?.user?.id

  const recipe = await db.query.recipes.findFirst({
    where: eq(recipes.slug, slug),
  })
  if (!recipe) notFound()

  const [favorite, rating] = await Promise.all([
    userId
      ? db.query.userRecipeFavorites.findFirst({
          where: and(
            eq(userRecipeFavorites.userId, userId),
            eq(userRecipeFavorites.recipeId, recipe.id)
          ),
        })
      : null,
    userId
      ? db.query.userRecipeRatings.findFirst({
          where: and(
            eq(userRecipeRatings.userId, userId),
            eq(userRecipeRatings.recipeId, recipe.id)
          ),
        })
      : null,
  ])

  const unfixedFlags = (recipe.fodmapFlags ?? []).filter((f) => !f.skipped)

  return (
    <div className="max-w-2xl mx-auto pb-4">
      {/* Back + actions */}
      <div className="flex items-center justify-between px-4 pt-4 mb-2">
        <Link
          href="/recipes"
          className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ChevronLeft size={16} />
          Recipes
        </Link>
        <div className="flex items-center gap-2">
          <Link
            href={`/recipes/${recipe.slug}/cook`}
            className="flex items-center gap-1.5 text-sm font-medium px-3 h-8 bg-foreground text-background rounded hover:opacity-80 transition-opacity"
          >
            <ChefHat size={14} />
            Cook
          </Link>
          <FavoriteButton
            recipeId={recipe.id}
            slug={recipe.slug}
            isFavorited={!!favorite}
          />
        </div>
      </div>

      {/* Image */}
      {recipe.imageUrl && (
        <div className="relative w-full aspect-video bg-muted mb-4">
          <Image
            src={recipe.imageUrl}
            alt={recipe.title}
            fill
            className="object-cover"
            priority
            sizes="(max-width: 768px) 100vw, 672px"
          />
        </div>
      )}

      <div className="px-4 space-y-6">
        {/* Title + meta */}
        <div>
          <h1 className="text-2xl font-semibold tracking-tight leading-tight">{recipe.title}</h1>
          {recipe.description && (
            <p className="text-sm text-muted-foreground mt-1 leading-relaxed">{recipe.description}</p>
          )}

          <div className="flex items-center flex-wrap gap-4 mt-3">
            {recipe.totalTimeMin && (
              <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <Clock size={14} />
                {formatTime(recipe.totalTimeMin)}
              </span>
            )}
            {recipe.servings && (
              <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <Users size={14} />
                {recipe.servings} servings
              </span>
            )}
            <span className="text-sm text-muted-foreground capitalize">{recipe.mealType}</span>
          </div>

          {/* Rating */}
          <div className="mt-3">
            <StarRating
              recipeId={recipe.id}
              slug={recipe.slug}
              currentRating={rating?.rating ?? null}
            />
          </div>
        </div>

        {/* FODMAP flags */}
        {unfixedFlags.length > 0 && (
          <div className="border border-border rounded-lg p-3 space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium">
              <AlertTriangle size={14} />
              FODMAP / Carb flags
            </div>
            {unfixedFlags.map((flag, i) => (
              <div key={i} className="text-xs text-muted-foreground leading-relaxed">
                <span className="font-medium text-foreground">{flag.ingredient}</span>
                {flag.suggestion && <span> → {flag.suggestion}</span>}
              </div>
            ))}
          </div>
        )}

        {/* Ingredients */}
        {recipe.ingredients && recipe.ingredients.length > 0 && (
          <div>
            <h2 className="text-base font-semibold mb-3">Ingredients</h2>
            <ul className="space-y-2">
              {recipe.ingredients.map((ing, i) => (
                <li key={i} className="text-sm flex gap-2">
                  <span className="text-muted-foreground shrink-0 mt-px">—</span>
                  <span>
                    {ing.quantity && <span>{ing.quantity} </span>}
                    {ing.unit && <span>{ing.unit} </span>}
                    {ing.name}
                    {ing.notes && <span className="text-muted-foreground"> ({ing.notes})</span>}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Instructions */}
        {recipe.instructions && recipe.instructions.length > 0 && (
          <div>
            <h2 className="text-base font-semibold mb-3">Instructions</h2>
            <ol className="space-y-3">
              {recipe.instructions.map((step, i) => (
                <li key={i} className="flex gap-3">
                  <span className="text-muted-foreground text-sm font-mono shrink-0 mt-0.5">
                    {i + 1}.
                  </span>
                  <p className="text-sm leading-relaxed">{step.text}</p>
                </li>
              ))}
            </ol>
          </div>
        )}

        {/* Storage */}
        {recipe.storageNotes && (
          <div>
            <h2 className="text-base font-semibold mb-2">Storage</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">{recipe.storageNotes}</p>
          </div>
        )}

        {/* Notes */}
        {recipe.notes && (
          <div>
            <h2 className="text-base font-semibold mb-2">Notes</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">{recipe.notes}</p>
          </div>
        )}

        {/* Source */}
        {recipe.sourceUrl && recipe.sourceUrl !== "original" && (
          <div className="pt-2 border-t border-border">
            <a
              href={recipe.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-2"
            >
              Original recipe →
            </a>
          </div>
        )}
      </div>
    </div>
  )
}
