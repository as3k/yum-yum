import Link from "next/link"
import Image from "next/image"
import { Heart, Clock } from "lucide-react"
import { formatTime } from "@/lib/utils"
import FavoriteButton from "./favorite-button"

type Recipe = {
  id: number
  slug: string
  title: string
  mealType: "breakfast" | "lunch" | "dinner" | "snack"
  tags: string[] | null
  totalTimeMin: number | null
  imageUrl: string | null
  description: string | null
}

export default function RecipeCard({
  recipe,
  isFavorited,
  rating,
}: {
  recipe: Recipe
  isFavorited: boolean
  rating: number | null
}) {
  return (
    <div className="border border-border rounded-lg overflow-hidden bg-background">
      <Link href={`/recipes/${recipe.slug}`} className="block">
        {recipe.imageUrl ? (
          <div className="relative w-full aspect-video bg-muted">
            <Image
              src={recipe.imageUrl}
              alt={recipe.title}
              fill
              className="object-cover"
              sizes="(max-width: 640px) 100vw, 50vw"
            />
          </div>
        ) : (
          <div className="w-full aspect-video bg-muted flex items-center justify-center">
            <span className="text-2xl text-muted-foreground">
              {recipe.mealType === "breakfast" ? "☀️" : recipe.mealType === "lunch" ? "🥗" : "🍽️"}
            </span>
          </div>
        )}
      </Link>

      <div className="p-3">
        <div className="flex items-start justify-between gap-2">
          <Link href={`/recipes/${recipe.slug}`} className="flex-1 min-w-0">
            <h3 className="text-sm font-semibold leading-snug hover:underline underline-offset-2 truncate">
              {recipe.title}
            </h3>
          </Link>
          <FavoriteButton recipeId={recipe.id} slug={recipe.slug} isFavorited={isFavorited} />
        </div>

        <div className="flex items-center gap-3 mt-2">
          {recipe.totalTimeMin && (
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <Clock size={12} />
              {formatTime(recipe.totalTimeMin)}
            </span>
          )}
          {rating && (
            <span className="text-xs text-muted-foreground">{"★".repeat(rating)}{"☆".repeat(5 - rating)}</span>
          )}
          <span className="text-xs text-muted-foreground capitalize">{recipe.mealType}</span>
        </div>
      </div>
    </div>
  )
}
