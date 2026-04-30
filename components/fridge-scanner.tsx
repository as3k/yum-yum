"use client"

import { useRef, useState, KeyboardEvent } from "react"
import { Camera, X, Loader2, Sparkles, ChevronRight, Plus, Search } from "lucide-react"
import Link from "next/link"
import Image from "next/image"
import { suggestFromFridge } from "@/lib/actions"
import type { DiscoveryResult } from "@/lib/actions"
import type { Ingredient } from "@/lib/db/schema"

interface RecipeProp {
  id: number
  title: string
  slug: string
  mealType: string
  imageUrl: string | null
  ingredients: unknown
}

interface MatchedRecipe {
  id: number
  title: string
  slug: string
  mealType: string
  matchCount: number
  matchedIngredients: string[]
}

function matchRecipes(fridgeItems: string[], recipes: RecipeProp[]): MatchedRecipe[] {
  const fridgeLower = fridgeItems.map((i) => i.toLowerCase())
  return recipes
    .map((r) => {
      const recipeIngs = ((r.ingredients as Ingredient[]) ?? []).map((i) => i.name.toLowerCase())
      const matched = recipeIngs.filter((name) =>
        fridgeLower.some((fi) => name.includes(fi) || fi.includes(name))
      )
      return { id: r.id, title: r.title, slug: r.slug, mealType: r.mealType, matchCount: matched.length, matchedIngredients: matched }
    })
    .filter((r) => r.matchCount > 0)
    .sort((a, b) => b.matchCount - a.matchCount)
    .slice(0, 8)
}

export default function FridgeScanner({ recipes }: { recipes: RecipeProp[] }) {
  const inputRef = useRef<HTMLInputElement>(null)
  const addInputRef = useRef<HTMLInputElement>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [scanning, setScanning] = useState(false)
  const [ingredients, setIngredients] = useState<string[]>([])
  const [addText, setAddText] = useState("")
  const [error, setError] = useState("")

  // Step 2: results
  const [matching, setMatching] = useState<MatchedRecipe[] | null>(null)
  const [suggesting, setSuggesting] = useState(false)
  const [suggestions, setSuggestions] = useState<DiscoveryResult[]>([])

  async function handleFile(file: File) {
    setPreview(URL.createObjectURL(file))
    setScanning(true)
    setIngredients([])
    setMatching(null)
    setSuggestions([])
    setError("")

    try {
      const form = new FormData()
      form.append("image", file)
      const res = await fetch("/api/fridge/analyze", { method: "POST", body: form })
      if (!res.ok) throw new Error()
      const data = await res.json()
      setIngredients(data.ingredients ?? [])
    } catch {
      setError("Couldn't read the photo — try again.")
    } finally {
      setScanning(false)
    }
  }

  function removeIngredient(i: number) {
    setIngredients((prev) => prev.filter((_, idx) => idx !== i))
    setMatching(null)
    setSuggestions([])
  }

  function addIngredient() {
    const val = addText.trim()
    if (!val) return
    if (!ingredients.map((i) => i.toLowerCase()).includes(val.toLowerCase())) {
      setIngredients((prev) => [...prev, val])
      setMatching(null)
      setSuggestions([])
    }
    setAddText("")
    addInputRef.current?.focus()
  }

  function handleAddKey(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") addIngredient()
  }

  function findRecipes() {
    setMatching(matchRecipes(ingredients, recipes))
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
    setAddText("")
    setMatching(null)
    setSuggestions([])
    setError("")
    if (inputRef.current) inputRef.current.value = ""
  }

  const hasIngredients = ingredients.length > 0
  const didSearch = matching !== null

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
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) handleFile(file)
        }}
      />

      {error && <p className="text-sm text-red-500">{error}</p>}

      {/* Ingredient list + add input */}
      {hasIngredients && (
        <div className="space-y-3">
          <p className="text-sm font-medium">
            What I found
            <span className="text-muted-foreground font-normal ml-1">({ingredients.length} items)</span>
          </p>

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

          {/* Add ingredient */}
          <div className="flex gap-2">
            <input
              ref={addInputRef}
              type="text"
              value={addText}
              onChange={(e) => setAddText(e.target.value)}
              onKeyDown={handleAddKey}
              placeholder="Add missing item…"
              className="flex-1 h-9 px-3 bg-muted border border-border rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-foreground"
            />
            <button
              onClick={addIngredient}
              disabled={!addText.trim()}
              className="w-9 h-9 flex items-center justify-center bg-muted border border-border rounded-lg text-muted-foreground hover:text-foreground transition-colors disabled:opacity-30"
            >
              <Plus size={15} />
            </button>
          </div>

          {/* Find recipes CTA */}
          {!didSearch && (
            <button
              onClick={findRecipes}
              className="w-full h-11 bg-foreground text-background text-sm font-medium rounded-xl hover:opacity-80 transition-opacity flex items-center justify-center gap-2"
            >
              <Search size={15} />
              Find recipes with these ingredients
            </button>
          )}
        </div>
      )}

      {/* Matching recipes */}
      {didSearch && (
        <div className="space-y-3">
          {matching!.length > 0 ? (
            <>
              <p className="text-sm font-medium">Recipes you can make</p>
              <div className="space-y-1">
                {matching!.map((r) => (
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
            </>
          ) : (
            <p className="text-sm text-muted-foreground">No matching recipes — try the AI suggestions below.</p>
          )}

          {/* AI suggestions */}
          {suggestions.length === 0 ? (
            <button
              onClick={handleSuggest}
              disabled={suggesting}
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
          ) : (
            <div className="space-y-3">
              <p className="text-sm font-medium">AI recipe ideas</p>
              {suggestions.map((s, i) => (
                <div key={i} className="bg-muted rounded-xl p-4 space-y-1.5">
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
          )}
        </div>
      )}

      {/* Empty state prompt */}
      {!preview && (
        <p className="text-center text-xs text-muted-foreground py-2">
          AI scans your fridge, you confirm what's there, then we find recipes you can cook right now
        </p>
      )}
    </div>
  )
}
