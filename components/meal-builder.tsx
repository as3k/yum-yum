"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Plus, Minus, Loader2, Search, Trash2 } from "lucide-react"
import { createMeal, updateMeal, deleteMeal } from "@/lib/actions"
import type { NutritionData } from "@/lib/db/schema"
import { formatTime } from "@/lib/utils"

type Recipe = {
  id: number
  title: string
  mealType: "breakfast" | "lunch" | "dinner" | "snack"
  totalTimeMin: number | null
  nutritionPerServing: NutritionData | null
}

export default function MealBuilder({
  allRecipes,
  mealId,
  initialName = "",
  initialDescription = "",
  initialRecipeIds = [],
}: {
  allRecipes: Recipe[]
  mealId?: number
  initialName?: string
  initialDescription?: string
  initialRecipeIds?: number[]
}) {
  const router = useRouter()
  const [saving, startSave] = useTransition()
  const [deleting, startDelete] = useTransition()
  const [name, setName] = useState(initialName)
  const [description, setDescription] = useState(initialDescription)
  const [selectedIds, setSelectedIds] = useState<number[]>(initialRecipeIds)
  const [search, setSearch] = useState("")
  const [error, setError] = useState("")

  const selectedRecipes = selectedIds
    .map((id) => allRecipes.find((r) => r.id === id))
    .filter(Boolean) as Recipe[]

  const filteredRecipes = allRecipes
    .filter((r) => !selectedIds.includes(r.id))
    .filter((r) => r.title.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => a.title.localeCompare(b.title))

  function toggle(id: number) {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    )
  }

  function remove(id: number) {
    setSelectedIds((prev) => prev.filter((x) => x !== id))
  }

  // Combined nutrition (only recipes with data)
  const nutritionRecipes = selectedRecipes.filter((r) => r.nutritionPerServing)
  const combined = nutritionRecipes.reduce(
    (acc, r) => ({
      calories: acc.calories + r.nutritionPerServing!.calories,
      carbsG: acc.carbsG + r.nutritionPerServing!.carbsG,
      fiberG: acc.fiberG + r.nutritionPerServing!.fiberG,
      fatG: acc.fatG + r.nutritionPerServing!.fatG,
      proteinG: acc.proteinG + r.nutritionPerServing!.proteinG,
    }),
    { calories: 0, carbsG: 0, fiberG: 0, fatG: 0, proteinG: 0 }
  )

  function handleSave() {
    if (!name.trim()) { setError("Give your meal a name!"); return }
    setError("")
    startSave(async () => {
      try {
        if (mealId) {
          await updateMeal(mealId, name.trim(), description.trim() || undefined, selectedIds)
          router.push(`/meals/${mealId}`)
        } else {
          const meal = await createMeal(name.trim(), description.trim() || undefined, selectedIds)
          router.push(`/meals/${meal.id}`)
        }
      } catch {
        setError("Couldn't save — try again!")
      }
    })
  }

  function handleDelete() {
    if (!mealId) return
    startDelete(async () => {
      await deleteMeal(mealId)
      router.push("/meals")
    })
  }

  return (
    <div className="space-y-6 pb-10">
      {/* Name */}
      <div className="space-y-1.5">
        <label className="text-sm font-medium">Meal name</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Sunday dinner, quick lunch, date night…"
          className="w-full h-11 px-3 bg-muted border border-border rounded text-sm focus:outline-none focus:ring-1 focus:ring-foreground"
        />
      </div>

      {/* Description */}
      <div className="space-y-1.5">
        <label className="text-sm font-medium">Notes <span className="text-muted-foreground font-normal">(optional)</span></label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={2}
          placeholder="Occasion, notes, why these go well together…"
          className="w-full px-3 py-2.5 bg-muted border border-border rounded text-sm focus:outline-none focus:ring-1 focus:ring-foreground resize-none"
        />
      </div>

      {/* Selected recipes */}
      {selectedRecipes.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-medium">In this meal</p>
          <div className="space-y-1.5">
            {selectedRecipes.map((recipe) => (
              <div key={recipe.id} className="flex items-center gap-3 px-3 py-2.5 border border-border rounded-lg">
                <div className="flex-1 min-w-0">
                  <p className="text-sm truncate">{recipe.title}</p>
                  <p className="text-xs text-muted-foreground capitalize">
                    {recipe.mealType}
                    {recipe.totalTimeMin && ` · ${formatTime(recipe.totalTimeMin)}`}
                    {recipe.nutritionPerServing && ` · ${recipe.nutritionPerServing.calories} cal`}
                  </p>
                </div>
                <button
                  onClick={() => remove(recipe.id)}
                  className="text-muted-foreground hover:text-foreground transition-colors shrink-0 p-1"
                >
                  <Minus size={14} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Combined nutrition */}
      {nutritionRecipes.length > 0 && (
        <div className="border border-border rounded-lg p-4 space-y-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Combined nutrition
            {nutritionRecipes.length < selectedRecipes.length && (
              <span className="font-normal ml-1">({nutritionRecipes.length} of {selectedRecipes.length} recipes have data)</span>
            )}
          </p>
          <div className="grid grid-cols-5 gap-2 text-center">
            {[
              { label: "Cal", value: combined.calories },
              { label: "Carbs", value: `${combined.carbsG}g` },
              { label: "Fiber", value: `${combined.fiberG}g` },
              { label: "Fat", value: `${combined.fatG}g` },
              { label: "Protein", value: `${combined.proteinG}g` },
            ].map(({ label, value }) => (
              <div key={label}>
                <p className="text-base font-semibold tabular-nums">{value}</p>
                <p className="text-xs text-muted-foreground">{label}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Add recipes */}
      <div className="space-y-2">
        <p className="text-sm font-medium">Add recipes</p>
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search recipes…"
            className="w-full h-9 pl-8 pr-3 bg-muted border border-border rounded text-sm focus:outline-none focus:ring-1 focus:ring-foreground"
          />
        </div>
        <div className="border border-border rounded-lg divide-y divide-border max-h-64 overflow-y-auto">
          {filteredRecipes.length === 0 ? (
            <p className="px-4 py-6 text-sm text-muted-foreground text-center">
              {allRecipes.length === selectedIds.length ? "All recipes added!" : "Nothing found"}
            </p>
          ) : (
            filteredRecipes.map((recipe) => (
              <button
                key={recipe.id}
                onClick={() => toggle(recipe.id)}
                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted transition-colors text-left"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm truncate">{recipe.title}</p>
                  <p className="text-xs text-muted-foreground capitalize">
                    {recipe.mealType}
                    {recipe.nutritionPerServing && ` · ${recipe.nutritionPerServing.calories} cal`}
                  </p>
                </div>
                <Plus size={14} className="text-muted-foreground shrink-0" />
              </button>
            ))
          )}
        </div>
      </div>

      {error && <p className="text-sm text-red-500">{error}</p>}

      <button
        onClick={handleSave}
        disabled={saving}
        className="w-full h-12 bg-foreground text-background text-sm font-medium rounded hover:opacity-80 transition-opacity disabled:opacity-40 flex items-center justify-center gap-2"
      >
        {saving ? (
          <><Loader2 size={15} className="animate-spin" /> Saving…</>
        ) : mealId ? "Save changes" : "Create meal"}
      </button>

      {mealId && (
        <button
          onClick={handleDelete}
          disabled={deleting}
          className="w-full h-10 text-sm text-muted-foreground hover:text-red-500 transition-colors disabled:opacity-40"
        >
          {deleting ? "Deleting…" : "Delete this meal"}
        </button>
      )}
    </div>
  )
}
