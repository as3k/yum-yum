"use client"

import { useState, useTransition } from "react"
import { Loader2 } from "lucide-react"
import { estimateNutrition } from "@/lib/actions"
import type { NutritionData } from "@/lib/db/schema"

export default function NutritionPanel({
  recipeId,
  slug,
  initialNutrition,
}: {
  recipeId: number
  slug: string
  initialNutrition: NutritionData | null | undefined
}) {
  const [nutrition, setNutrition] = useState<NutritionData | null>(initialNutrition ?? null)
  const [estimating, startEstimate] = useTransition()
  const [error, setError] = useState("")

  function handleEstimate() {
    setError("")
    startEstimate(async () => {
      try {
        const result = await estimateNutrition(recipeId, slug)
        setNutrition(result)
      } catch {
        setError("Couldn't estimate right now. Try again!")
      }
    })
  }

  if (nutrition) {
    return (
      <div className="border border-border rounded-lg p-4 space-y-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Estimated nutrition · per serving
        </p>
        <div className="grid grid-cols-5 gap-2 text-center">
          {[
            { label: "Cal", value: nutrition.calories },
            { label: "Carbs", value: `${nutrition.carbsG}g` },
            { label: "Fiber", value: `${nutrition.fiberG}g` },
            { label: "Fat", value: `${nutrition.fatG}g` },
            { label: "Protein", value: `${nutrition.proteinG}g` },
          ].map(({ label, value }) => (
            <div key={label}>
              <p className="text-base font-semibold tabular-nums">{value}</p>
              <p className="text-xs text-muted-foreground">{label}</p>
            </div>
          ))}
        </div>
        {error && <p className="text-xs text-red-500">{error}</p>}
      </div>
    )
  }

  return (
    <div>
      {error && <p className="text-xs text-red-500 mb-2">{error}</p>}
      <button
        onClick={handleEstimate}
        disabled={estimating}
        className="w-full h-10 border border-border rounded text-sm font-medium text-muted-foreground hover:text-foreground transition-colors disabled:opacity-40 flex items-center justify-center gap-2"
      >
        {estimating ? (
          <>
            <Loader2 size={13} className="animate-spin" />
            Estimating nutrition…
          </>
        ) : (
          "Estimate nutrition"
        )}
      </button>
    </div>
  )
}
