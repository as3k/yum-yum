"use client"

import { useState, useTransition } from "react"
import Link from "next/link"
import { Plus, X, Sparkles, Loader2 } from "lucide-react"
import { setMealPlanSlot, removeMealPlanSlot, generateAIMealPlan } from "@/lib/actions"
import { getDayLabel } from "@/lib/utils"

type MealType = "breakfast" | "lunch" | "dinner" | "snack"

export type RecipeOption = {
  id: number
  title: string
  slug: string
  mealType: MealType
  isFavorited: boolean
}

export type EditableSlot = {
  id: number
  recipeId: number
  recipeTitle: string
  recipeSlug: string
} | null

export type EditableDay = {
  date: string
  breakfast: EditableSlot
  lunch: EditableSlot
  dinner: EditableSlot
  snack: EditableSlot
}

const MEAL_LABELS: Record<MealType, string> = {
  breakfast: "B",
  lunch: "L",
  dinner: "D",
  snack: "S",
}

const MEAL_ORDER: MealType[] = ["breakfast", "lunch", "dinner", "snack"]

export default function PlanEditor({
  weekStart,
  initialDays,
  allRecipes,
}: {
  weekStart: string
  initialDays: EditableDay[]
  allRecipes: RecipeOption[]
}) {
  const [days, setDays] = useState<EditableDay[]>(initialDays)
  const [editingSlot, setEditingSlot] = useState<{ date: string; mealType: MealType } | null>(null)
  const [search, setSearch] = useState("")
  const [generating, startGenerate] = useTransition()
  const [, startSave] = useTransition()
  const [error, setError] = useState("")

  function handlePickRecipe(recipe: RecipeOption) {
    if (!editingSlot) return
    const { date, mealType } = editingSlot
    setEditingSlot(null)
    setSearch("")

    startSave(async () => {
      const slot = await setMealPlanSlot(weekStart, date, mealType, recipe.id)
      setDays((prev) =>
        prev.map((day) =>
          day.date === date
            ? {
                ...day,
                [mealType]: {
                  id: slot.id,
                  recipeId: recipe.id,
                  recipeTitle: recipe.title,
                  recipeSlug: recipe.slug,
                },
              }
            : day
        )
      )
    })
  }

  function handleRemove(date: string, mealType: MealType, slotId: number) {
    startSave(async () => {
      await removeMealPlanSlot(slotId)
      setDays((prev) =>
        prev.map((day) => (day.date === date ? { ...day, [mealType]: null } : day))
      )
    })
  }

  function handleGenerate() {
    setError("")
    startGenerate(async () => {
      try {
        const result = await generateAIMealPlan(weekStart)
        setDays((prev) => {
          const next = prev.map((day) => ({ ...day }))
          for (const s of result.slots) {
            const idx = next.findIndex((d) => d.date === s.dayDate)
            if (idx >= 0) {
              next[idx] = {
                ...next[idx],
                [s.mealType]: {
                  id: s.id,
                  recipeId: s.recipeId,
                  recipeTitle: s.recipeTitle,
                  recipeSlug: s.recipeSlug,
                },
              }
            }
          }
          return next
        })
      } catch {
        setError("Generation failed. Check ANTHROPIC_API_KEY in Doppler.")
      }
    })
  }

  const visibleRecipes = allRecipes
    .filter((r) => r.title.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => {
      if (editingSlot) {
        const aMatch = a.mealType === editingSlot.mealType
        const bMatch = b.mealType === editingSlot.mealType
        if (aMatch !== bMatch) return aMatch ? -1 : 1
      }
      if (a.isFavorited !== b.isFavorited) return a.isFavorited ? -1 : 1
      return a.title.localeCompare(b.title)
    })

  return (
    <div className="space-y-4">
      <button
        onClick={handleGenerate}
        disabled={generating}
        className="w-full h-11 border border-border rounded-lg text-sm font-medium flex items-center justify-center gap-2 hover:bg-muted transition-colors disabled:opacity-40"
      >
        {generating ? (
          <>
            <Loader2 size={15} className="animate-spin" />
            Generating…
          </>
        ) : (
          <>
            <Sparkles size={15} />
            Generate with AI
          </>
        )}
      </button>

      {error && <p className="text-sm text-red-500">{error}</p>}

      <div className="space-y-2">
        {days.map((day) => (
          <div key={day.date} className="rounded-lg border border-border overflow-hidden">
            <div className="px-4 py-2.5 bg-muted border-b border-border">
              <span className="text-sm font-semibold">{getDayLabel(day.date)}</span>
            </div>
            <div className="divide-y divide-border">
              {MEAL_ORDER.map((mealType) => {
                const slot = day[mealType]
                return (
                  <div key={mealType} className="flex items-center gap-3 px-4 py-2.5 min-h-[44px]">
                    <span className="text-xs font-mono text-muted-foreground w-3 shrink-0">
                      {MEAL_LABELS[mealType]}
                    </span>
                    {slot ? (
                      <div className="flex-1 flex items-center justify-between gap-2 min-w-0">
                        <Link
                          href={`/recipes/${slot.recipeSlug}`}
                          className="text-sm hover:underline underline-offset-2 truncate"
                        >
                          {slot.recipeTitle}
                        </Link>
                        <button
                          onClick={() => handleRemove(day.date, mealType, slot.id)}
                          className="text-muted-foreground hover:text-foreground transition-colors shrink-0 p-1"
                          aria-label="Remove"
                        >
                          <X size={13} />
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setEditingSlot({ date: day.date, mealType })}
                        className="flex-1 flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors text-left py-1"
                      >
                        <Plus size={13} />
                        Add
                      </button>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Recipe picker — full screen overlay */}
      {editingSlot && (
        <div className="fixed inset-0 z-50 flex flex-col bg-background">
          <div className="flex items-center gap-3 px-4 h-14 border-b border-border shrink-0">
            <button
              onClick={() => {
                setEditingSlot(null)
                setSearch("")
              }}
              className="text-muted-foreground hover:text-foreground transition-colors"
              aria-label="Close"
            >
              <X size={18} />
            </button>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-muted-foreground capitalize">
                {getDayLabel(editingSlot.date)} · {editingSlot.mealType}
              </p>
              <p className="text-sm font-medium">Pick a recipe</p>
            </div>
          </div>

          <div className="px-4 py-3 border-b border-border shrink-0">
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search…"
              autoFocus
              className="w-full h-9 px-3 bg-muted border border-border rounded text-sm focus:outline-none focus:ring-1 focus:ring-foreground"
            />
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-border">
            {visibleRecipes.map((recipe) => (
              <button
                key={recipe.id}
                onClick={() => handlePickRecipe(recipe)}
                className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-muted transition-colors text-left"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm truncate">{recipe.title}</p>
                  <p className="text-xs text-muted-foreground capitalize">{recipe.mealType}</p>
                </div>
                {recipe.isFavorited && (
                  <span className="text-xs text-muted-foreground shrink-0">♥</span>
                )}
              </button>
            ))}
            {visibleRecipes.length === 0 && (
              <p className="px-4 py-8 text-center text-sm text-muted-foreground">No recipes found</p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
