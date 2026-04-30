import Link from "next/link"
import Image from "next/image"
import { Clock } from "lucide-react"
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

const MEAL_EMOJI: Record<string, string> = {
  breakfast: "🌅",
  lunch: "🥗",
  dinner: "🍽️",
  snack: "🍎",
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
    <div className="rounded-2xl bg-muted overflow-hidden">
      <Link href={`/recipes/${recipe.slug}`} className="block">
        {recipe.imageUrl ? (
          <div className="relative w-full aspect-video">
            <Image
              src={recipe.imageUrl}
              alt={recipe.title}
              fill
              className="object-cover"
              sizes="(max-width: 640px) 100vw, 50vw"
            />
          </div>
        ) : (
          <div className="w-full aspect-video flex items-center justify-center" style={{ background: "rgba(124,95,245,0.08)" }}>
            <span className="text-4xl">{MEAL_EMOJI[recipe.mealType] ?? "🍽️"}</span>
          </div>
        )}
      </Link>

      <div className="p-4">
        <div className="flex items-start justify-between gap-2">
          <Link href={`/recipes/${recipe.slug}`} className="flex-1 min-w-0">
            <h3 className="text-sm font-semibold leading-snug hover:text-accent transition-colors truncate">
              {recipe.title}
            </h3>
          </Link>
          <FavoriteButton recipeId={recipe.id} slug={recipe.slug} isFavorited={isFavorited} />
        </div>

        <div className="flex items-center gap-2 mt-1.5 flex-wrap">
          {recipe.totalTimeMin && (
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <Clock size={11} />
              {formatTime(recipe.totalTimeMin)}
            </span>
          )}
          {rating && (
            <span className="text-xs text-amber-400">{"★".repeat(rating)}</span>
          )}
          <span className="text-[10px] font-semibold text-muted-foreground capitalize bg-background px-2 py-0.5 rounded-full">
            {recipe.mealType}
          </span>
        </div>
      </div>
    </div>
  )
}
