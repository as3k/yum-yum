"use client"

import { useRef, useState } from "react"
import { Camera, X, Loader2, RefrigeratorIcon, Sparkles, ChevronRight } from "lucide-react"
import Link from "next/link"
import Image from "next/image"
import { suggestFromFridge } from "@/lib/actions"
import type { DiscoveryResult } from "@/lib/actions"

interface MatchedRecipe {
  id: number
  title: string
  slug: string
  mealType: string
  imageUrl: string | null
  matchCount: number
  matchedIngredients: string[]
}

export default function FridgeScanner() {
  const inputRef = useRef<HTMLInputElement>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [scanning, setScanning] = useState(false)
  const [ingredients, setIngredients] = useState<string[]>([])
  const [matching, setMatching] = useState<MatchedRecipe[]>([])
  const [error, setError] = useState("")
  const [suggesting, setSuggesting] = useState(false)
  const [suggestions, setSuggestions] = useState<DiscoveryResult[]>([])

  async function handleFile(file: File) {
    setPreview(URL.createObjectURL(file))
    setScanning(true)
    setIngredients([])
    setMatching([])
    setSuggestions([])
    setError("")

    try {
      const form = new FormData()
      form.append("image", file)
      const res = await fetch("/api/fridge/analyze", { method: "POST", body: form })
      if (!res.ok) throw new Error("Analysis failed")
      const data = await res.json()
      setIngredients(data.ingredients ?? [])
      setMatching(data.matchingRecipes ?? [])
    } catch {
      setError("Couldn't read the photo — try again.")
    } finally {
      setScanning(false)
    }
  }

  function removeIngredient(i: number) {
    setIngredients((prev) => prev.filter((_, idx) => idx !== i))
  }

  async function handleSuggest() {
    if (ingredients.length === 0) return
    setSuggesting(true)
    try {
      const results = await suggestFromFridge(ingredients)
      setSuggestions(results)
    } catch {
      setError("Couldn't get suggestions — try again.")
    } finally {
      setSuggesting(false)
    }
  }

  function reset() {
    setPreview(null)
    setIngredients([])
    setMatching([])
    setSuggestions([])
    setError("")
    if (inputRef.current) inputRef.current.value = ""
  }

  const hasResults = ingredients.length > 0

  return (
    <div className="space-y-5">
      {/* Camera trigger */}
      {!preview ? (
        <button
          onClick={() => inputRef.current?.click()}
          className="w-full aspect-video bg-muted rounded-2xl flex flex-col items-center justify-center gap-3 text-muted-foreground hover:text-foreground transition-colors border-2 border-dashed border-border"
        >
          <Camera size={36} strokeWidth={1.5} />
          <span className="text-sm font-medium">Snap your fridge</span>
          <span className="text-xs opacity-60">Tap to open camera or choose a photo</span>
        </button>
      ) : (
        <div className="relative w-full aspect-video bg-muted rounded-2xl overflow-hidden">
          <Image src={preview} alt="Fridge" fill className="object-cover" sizes="(max-width: 640px) 100vw, 640px" />
          {scanning && (
            <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center gap-2">
              <Loader2 size={28} className="animate-spin text-white" />
              <p className="text-white text-sm">Analyzing contents…</p>
            </div>
          )}
          {!scanning && (
            <button
              onClick={reset}
              className="absolute top-3 right-3 w-8 h-8 bg-black/60 rounded-full flex items-center justify-center text-white hover:bg-black/80 transition-colors"
            >
              <X size={14} />
            </button>
          )}
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) handleFile(file)
        }}
      />

      {error && <p className="text-sm text-red-500">{error}</p>}

      {/* Ingredient list */}
      {hasResults && (
        <div className="space-y-3">
          <p className="text-sm font-medium">What I found ({ingredients.length} items)</p>
          <div className="flex flex-wrap gap-2">
            {ingredients.map((ing, i) => (
              <span
                key={i}
                className="flex items-center gap-1.5 text-xs bg-muted px-3 py-1.5 rounded-full"
              >
                {ing}
                <button
                  onClick={() => removeIngredient(i)}
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  <X size={11} />
                </button>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Matching recipes */}
      {matching.length > 0 && (
        <div className="space-y-3">
          <p className="text-sm font-medium">Recipes you can make</p>
          <div className="space-y-1">
            {matching.map((r) => (
              <Link
                key={r.id}
                href={`/recipes/${r.slug}`}
                className="flex items-center justify-between px-4 py-3 bg-muted rounded-xl hover:bg-muted/80 transition-colors"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{r.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {r.matchedIngredients.slice(0, 3).join(", ")}
                    {r.matchedIngredients.length > 3 ? ` +${r.matchedIngredients.length - 3} more` : ""}
                  </p>
                </div>
                <ChevronRight size={14} className="text-muted-foreground shrink-0 ml-3" />
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* No matches but has ingredients */}
      {hasResults && matching.length === 0 && (
        <p className="text-sm text-muted-foreground">No exact recipe matches — try the AI suggestions below.</p>
      )}

      {/* AI suggestions */}
      {hasResults && suggestions.length === 0 && (
        <button
          onClick={handleSuggest}
          disabled={suggesting || ingredients.length === 0}
          className="w-full h-11 bg-accent text-white text-sm font-medium rounded-xl hover:opacity-80 transition-opacity disabled:opacity-40 flex items-center justify-center gap-2"
        >
          {suggesting ? (
            <>
              <Loader2 size={15} className="animate-spin" />
              Getting ideas…
            </>
          ) : (
            <>
              <Sparkles size={15} />
              Get AI recipe ideas
            </>
          )}
        </button>
      )}

      {suggestions.length > 0 && (
        <div className="space-y-3">
          <p className="text-sm font-medium">AI recipe ideas</p>
          <div className="space-y-3">
            {suggestions.map((s, i) => (
              <div key={i} className="bg-muted rounded-xl p-4 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-medium">{s.recipe.title}</p>
                  <span className="text-xs text-muted-foreground capitalize shrink-0">{s.recipe.mealType}</span>
                </div>
                {s.recipe.description && (
                  <p className="text-xs text-muted-foreground leading-relaxed">{s.recipe.description}</p>
                )}
                {s.nutrition && (
                  <p className="text-xs text-muted-foreground">
                    {s.nutrition.calories} cal · {s.nutrition.proteinG}g protein · {s.nutrition.carbsG}g carbs
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty state */}
      {!preview && (
        <div className="text-center py-4 space-y-1">
          <p className="text-xs text-muted-foreground">AI scans your fridge and finds recipes you can cook right now</p>
        </div>
      )}
    </div>
  )
}
