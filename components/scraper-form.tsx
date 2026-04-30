"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import { Loader2, ChevronDown } from "lucide-react"
import type { ParsedRecipe } from "@/lib/scraper"
import type { Violation } from "@/lib/fodmap-checker"
import ViolationsPanel from "./violations-panel"
import { saveRecipe } from "@/lib/actions"
import type { FodmapFlag, Ingredient, Instruction } from "@/lib/db/schema"

type Step = "url" | "review"

export default function ScraperForm() {
  const router = useRouter()
  const [step, setStep] = useState<Step>("url")
  const [url, setUrl] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [parsed, setParsed] = useState<ParsedRecipe | null>(null)
  const [violations, setViolations] = useState<Violation[]>([])
  const [skipped, setSkipped] = useState<Set<number>>(new Set())
  const [mealType, setMealType] = useState<"breakfast" | "lunch" | "dinner" | "snack">("dinner")
  const [saving, startSave] = useTransition()

  async function handleScrape(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError("")

    try {
      const res = await fetch("/api/recipes/scrape", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Scrape failed")

      setParsed(data.recipe)
      setViolations(data.violations)
      setStep("review")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong")
    } finally {
      setLoading(false)
    }
  }

  function handleFix(index: number, suggestion: string) {
    // Mark violation as addressed by noting suggestion applied
    setSkipped((prev) => new Set([...prev, index]))
  }

  function handleSkip(index: number) {
    setSkipped((prev) => new Set([...prev, index]))
  }

  const activeViolations = violations.filter((_, i) => !skipped.has(i))

  function handleSave() {
    if (!parsed) return
    startSave(async () => {
      const ingredients: Ingredient[] = parsed.ingredients.map((text) => ({ name: text }))
      const instructions: Instruction[] = parsed.instructions.map((text, i) => ({
        step: i + 1,
        text,
      }))
      const flags: FodmapFlag[] = violations.map((v, i) => ({
        ingredient: v.ingredient,
        type: v.type,
        suggestion: v.suggestion,
        skipped: skipped.has(i),
      }))

      const recipe = await saveRecipe({
        title: parsed.title,
        mealType,
        description: parsed.description,
        imageUrl: parsed.imageUrl,
        ingredients,
        instructions,
        prepTimeMin: parsed.prepTimeMin,
        cookTimeMin: parsed.cookTimeMin,
        totalTimeMin: parsed.totalTimeMin,
        servings: parsed.servings,
        sourceUrl: parsed.sourceUrl,
        tags: [],
        fodmapFlags: flags,
      })

      router.push(`/recipes/${recipe.slug}`)
    })
  }

  if (step === "url") {
    return (
      <form onSubmit={handleScrape} className="space-y-4">
        <div className="space-y-1.5">
          <label htmlFor="recipe-url" className="text-sm font-medium">
            Recipe URL
          </label>
          <input
            id="recipe-url"
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://fodmapeveryday.com/..."
            required
            className="w-full h-11 px-3 bg-muted border border-border rounded text-sm focus:outline-none focus:ring-1 focus:ring-foreground"
          />
        </div>

        {error && <p className="text-sm text-red-500">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="w-full h-11 bg-accent text-white text-sm font-medium rounded hover:opacity-80 transition-opacity disabled:opacity-40 flex items-center justify-center gap-2"
        >
          {loading && <Loader2 size={16} className="animate-spin" />}
          {loading ? "Grabbing it…" : "Import Recipe"}
        </button>
      </form>
    )
  }

  if (!parsed) return null

  return (
    <div className="space-y-6">
      {/* Preview */}
      <div className="border border-border rounded-lg overflow-hidden">
        {parsed.imageUrl && (
          <div className="relative w-full aspect-video bg-muted">
            <Image
              src={parsed.imageUrl}
              alt={parsed.title}
              fill
              className="object-cover"
              sizes="(max-width: 640px) 100vw, 640px"
            />
          </div>
        )}
        <div className="p-4 space-y-2">
          <h2 className="text-lg font-semibold">{parsed.title}</h2>
          {parsed.description && (
            <p className="text-sm text-muted-foreground line-clamp-2">{parsed.description}</p>
          )}
          <div className="flex gap-4 text-xs text-muted-foreground">
            {parsed.totalTimeMin && <span>{parsed.totalTimeMin}min</span>}
            {parsed.servings && <span>{parsed.servings} servings</span>}
            <span>{parsed.ingredients.length} ingredients</span>
            <span>{parsed.instructions.length} steps</span>
          </div>
        </div>
      </div>

      {/* Meal type selector */}
      <div className="space-y-1.5">
        <label className="text-sm font-medium">What kind of meal is this?</label>
        <div className="flex gap-2">
          {(["breakfast", "lunch", "dinner", "snack"] as const).map((type) => (
            <button
              key={type}
              onClick={() => setMealType(type)}
              className={`flex-1 h-10 rounded text-sm font-medium capitalize transition-colors ${
                mealType === type
                  ? "bg-accent text-white"
                  : "bg-muted text-muted-foreground hover:text-foreground"
              }`}
            >
              {type}
            </button>
          ))}
        </div>
      </div>

      {/* Violations */}
      {activeViolations.length > 0 && (
        <ViolationsPanel
          violations={activeViolations}
          onFix={(i, suggestion) => handleFix(violations.indexOf(activeViolations[i]), suggestion)}
          onSkip={(i) => handleSkip(violations.indexOf(activeViolations[i]))}
        />
      )}

      {activeViolations.length === 0 && violations.length > 0 && (
        <p className="text-sm text-muted-foreground text-center">All clear! Looking good.</p>
      )}

      {/* Actions */}
      <div className="flex gap-3">
        <button
          onClick={() => { setStep("url"); setParsed(null); setViolations([]); setSkipped(new Set()) }}
          className="flex-1 h-11 bg-muted text-muted-foreground text-sm font-medium rounded hover:text-foreground transition-colors"
        >
          Back
        </button>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex-1 h-11 bg-accent text-white text-sm font-medium rounded hover:opacity-80 transition-opacity disabled:opacity-40 flex items-center justify-center gap-2"
        >
          {saving && <Loader2 size={16} className="animate-spin" />}
          {saving ? "Saving…" : activeViolations.length > 0 ? "Save anyway" : "Save Recipe"}
        </button>
      </div>
    </div>
  )
}
