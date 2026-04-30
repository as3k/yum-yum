"use client"

import { Heart } from "lucide-react"
import { useTransition } from "react"
import { toggleFavorite } from "@/lib/actions"

export default function FavoriteButton({
  recipeId,
  slug,
  isFavorited,
}: {
  recipeId: number
  slug: string
  isFavorited: boolean
}) {
  const [isPending, startTransition] = useTransition()

  return (
    <button
      onClick={(e) => {
        e.preventDefault()
        startTransition(() => toggleFavorite(recipeId, slug))
      }}
      disabled={isPending}
      className="shrink-0 p-1 -mr-1 text-muted-foreground hover:text-foreground transition-colors disabled:opacity-40"
      aria-label={isFavorited ? "Remove from favorites" : "Add to favorites"}
    >
      <Heart
        size={18}
        strokeWidth={1.5}
        className={isFavorited ? "fill-foreground text-foreground" : ""}
      />
    </button>
  )
}
