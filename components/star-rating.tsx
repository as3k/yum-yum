"use client"

import { useTransition } from "react"
import { setRating } from "@/lib/actions"

export default function StarRating({
  recipeId,
  slug,
  currentRating,
}: {
  recipeId: number
  slug: string
  currentRating: number | null
}) {
  const [isPending, startTransition] = useTransition()

  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          onClick={() => startTransition(() => setRating(recipeId, star, slug))}
          disabled={isPending}
          className="text-xl leading-none transition-opacity disabled:opacity-40 hover:scale-110"
          aria-label={`Rate ${star} star${star > 1 ? "s" : ""}`}
        >
          {currentRating && star <= currentRating ? "★" : "☆"}
        </button>
      ))}
    </div>
  )
}
