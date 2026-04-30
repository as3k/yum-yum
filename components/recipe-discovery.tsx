"use client"

import { useState, useTransition } from "react"
import { Search, Loader2, Plus, Check, Clock, Users, ChevronLeft, ChevronRight } from "lucide-react"
import { discoverRecipes, saveRecipe } from "@/lib/actions"
import type { DiscoveryResult } from "@/lib/actions"
import { formatTime } from "@/lib/utils"

type View = "search" | "results" | "detail"

export default function RecipeDiscovery() {
  const [query, setQuery] = useState("")
  const [results, setResults] = useState<DiscoveryResult[]>([])
  const [view, setView] = useState<View>("search")
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [searching, startSearch] = useTransition()
  const [saved, setSaved] = useState<Set<number>>(new Set())
  const [saving, setSaving] = useState<Set<number>>(new Set())
  const [error, setError] = useState("")

  function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    if (!query.trim()) return
    setError("")
    setResults([])
    setSaved(new Set())
    startSearch(async () => {
      try {
        const found = await discoverRecipes(query)
        setResults(found)
        setView("results")
      } catch {
        setError("Couldn't find anything this time. Try a different search!")
      }
    })
  }

  function searchAgain() {
    setView("search")
    setResults([])
    setSaved(new Set())
    setError("")
  }

  async function handleSave(index: number) {
    const { recipe } = results[index]
    setSaving((prev) => new Set([...prev, index]))
    try {
      await saveRecipe(recipe)
      setSaved((prev) => new Set([...prev, index]))
    } finally {
      setSaving((prev) => {
        const next = new Set(prev)
        next.delete(index)
        return next
      })
    }
  }

  // ── Search form ──────────────────────────────────────────────────────────────
  if (view === "search") {
    return (
      <form onSubmit={handleSearch} className="space-y-3">
        <div className="space-y-1.5">
          <label className="text-sm font-medium">What sounds good?</label>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Find Korean BBQ, snacks with mango, quick breakfasts…"
            className="w-full h-11 px-3 bg-muted border border-border rounded text-sm focus:outline-none focus:ring-1 focus:ring-foreground"
            autoFocus
          />
        </div>
        {error && <p className="text-sm text-red-500">{error}</p>}
        <button
          type="submit"
          disabled={searching || !query.trim()}
          className="w-full h-11 bg-accent text-white text-sm font-medium rounded hover:opacity-80 transition-opacity disabled:opacity-40 flex items-center justify-center gap-2"
        >
          {searching ? (
            <>
              <Loader2 size={15} className="animate-spin" />
              Finding good stuff…
            </>
          ) : (
            <>
              <Search size={15} />
              Find Recipes
            </>
          )}
        </button>
      </form>
    )
  }

  // ── Results list ─────────────────────────────────────────────────────────────
  if (view === "results") {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">
            {results.length} recipe{results.length !== 1 ? "s" : ""} for "{query}"
          </p>
          <button
            onClick={searchAgain}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            Search again
          </button>
        </div>

        {results.map(({ recipe, healthNotes }, i) => (
          <button
            key={i}
            onClick={() => { setSelectedIndex(i); setView("detail") }}
            className="w-full border border-border rounded-lg p-4 text-left hover:bg-muted transition-colors space-y-2"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-semibold leading-snug">{recipe.title}</p>
                {recipe.description && (
                  <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                    {recipe.description}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {saved.has(i) && (
                  <span className="text-xs text-muted-foreground">Saved</span>
                )}
                <span className="text-xs px-2 py-0.5 bg-muted rounded capitalize text-muted-foreground">
                  {recipe.mealType}
                </span>
                <ChevronRight size={14} className="text-muted-foreground" />
              </div>
            </div>
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              {recipe.totalTimeMin && (
                <span className="flex items-center gap-1">
                  <Clock size={11} />
                  {formatTime(recipe.totalTimeMin)}
                </span>
              )}
              {recipe.servings && (
                <span className="flex items-center gap-1">
                  <Users size={11} />
                  serves {recipe.servings}
                </span>
              )}
              <span>{recipe.ingredients.length} ingredients</span>
            </div>
            {healthNotes.length > 0 && (
              <p className="text-xs text-muted-foreground line-clamp-1 italic">{healthNotes[0]}</p>
            )}
          </button>
        ))}
      </div>
    )
  }

  // ── Detail view ──────────────────────────────────────────────────────────────
  const selected = results[selectedIndex]
  if (!selected) return null
  const { recipe, nutrition, healthNotes } = selected
  const isSaved = saved.has(selectedIndex)
  const isSaving = saving.has(selectedIndex)

  return (
    <div className="space-y-5">
      <button
        onClick={() => setView("results")}
        className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ChevronLeft size={15} />
        Back to results
      </button>

      {/* Title + meta */}
      <div>
        <div className="flex items-start justify-between gap-3 mb-1">
          <h2 className="text-lg font-semibold leading-snug">{recipe.title}</h2>
          <span className="shrink-0 text-xs px-2 py-0.5 bg-muted rounded capitalize text-muted-foreground mt-0.5">
            {recipe.mealType}
          </span>
        </div>
        {recipe.description && (
          <p className="text-sm text-muted-foreground leading-relaxed">{recipe.description}</p>
        )}
        <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
          {recipe.totalTimeMin && (
            <span className="flex items-center gap-1">
              <Clock size={12} />
              {formatTime(recipe.totalTimeMin)}
            </span>
          )}
          {recipe.servings && (
            <span className="flex items-center gap-1">
              <Users size={12} />
              serves {recipe.servings}
            </span>
          )}
        </div>
      </div>

      {/* Nutrition panel */}
      {nutrition && (
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
        </div>
      )}

      {/* Health notes */}
      {healthNotes.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Good to know
          </p>
          <ul className="space-y-1.5">
            {healthNotes.map((note, i) => (
              <li key={i} className="text-sm text-muted-foreground flex gap-2">
                <span className="shrink-0 mt-px">·</span>
                <span>{note}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Ingredients */}
      {recipe.ingredients.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold mb-2">Ingredients</h3>
          <ul className="space-y-1.5">
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
      {recipe.instructions.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold mb-2">Instructions</h3>
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

      <button
        onClick={() => handleSave(selectedIndex)}
        disabled={isSaving || isSaved}
        className={`w-full h-12 text-sm font-medium rounded flex items-center justify-center gap-2 transition-all ${
          isSaved
            ? "bg-muted text-muted-foreground"
            : "bg-accent text-white hover:opacity-80"
        } disabled:opacity-60`}
      >
        {isSaving ? (
          <>
            <Loader2 size={15} className="animate-spin" />
            Saving…
          </>
        ) : isSaved ? (
          <>
            <Check size={15} />
            Saved to your recipes!
          </>
        ) : (
          <>
            <Plus size={15} />
            Add to my recipes
          </>
        )}
      </button>
    </div>
  )
}
