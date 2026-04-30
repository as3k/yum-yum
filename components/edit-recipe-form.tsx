"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import { Plus, Trash2, Loader2, GripVertical } from "lucide-react"
import { updateRecipe } from "@/lib/actions"
import type { Ingredient, Instruction } from "@/lib/db/schema"

type MealType = "breakfast" | "lunch" | "dinner" | "snack"

type RecipeData = {
  id: number
  slug: string
  title: string
  mealType: MealType
  description: string | null
  imageUrl: string | null
  prepTimeMin: number | null
  cookTimeMin: number | null
  totalTimeMin: number | null
  servings: number | null
  storageNotes: string | null
  notes: string | null
  ingredients: Ingredient[]
  instructions: Instruction[]
}

export default function EditRecipeForm({ recipe }: { recipe: RecipeData }) {
  const router = useRouter()
  const [saving, startSave] = useTransition()
  const [error, setError] = useState("")

  const [title, setTitle] = useState(recipe.title)
  const [mealType, setMealType] = useState<MealType>(recipe.mealType)
  const [description, setDescription] = useState(recipe.description ?? "")
  const [imageUrl, setImageUrl] = useState(recipe.imageUrl ?? "")
  const [prepTimeMin, setPrepTimeMin] = useState(recipe.prepTimeMin?.toString() ?? "")
  const [cookTimeMin, setCookTimeMin] = useState(recipe.cookTimeMin?.toString() ?? "")
  const [totalTimeMin, setTotalTimeMin] = useState(recipe.totalTimeMin?.toString() ?? "")
  const [servings, setServings] = useState(recipe.servings?.toString() ?? "")
  const [storageNotes, setStorageNotes] = useState(recipe.storageNotes ?? "")
  const [notes, setNotes] = useState(recipe.notes ?? "")
  const [ingredients, setIngredients] = useState<Ingredient[]>(
    recipe.ingredients.length > 0 ? recipe.ingredients : [{ name: "" }]
  )
  const [instructions, setInstructions] = useState<Instruction[]>(
    recipe.instructions.length > 0 ? recipe.instructions : [{ step: 1, text: "" }]
  )

  // ── Ingredient helpers ───────────────────────────────────────────────────────
  function updateIngredient(i: number, field: keyof Ingredient, value: string) {
    setIngredients((prev) => prev.map((ing, idx) => idx === i ? { ...ing, [field]: value } : ing))
  }
  function addIngredient() {
    setIngredients((prev) => [...prev, { name: "" }])
  }
  function removeIngredient(i: number) {
    setIngredients((prev) => prev.filter((_, idx) => idx !== i))
  }

  // ── Instruction helpers ──────────────────────────────────────────────────────
  function updateInstruction(i: number, text: string) {
    setInstructions((prev) => prev.map((ins, idx) => idx === i ? { ...ins, text } : ins))
  }
  function addInstruction() {
    setInstructions((prev) => [...prev, { step: prev.length + 1, text: "" }])
  }
  function removeInstruction(i: number) {
    setInstructions((prev) =>
      prev.filter((_, idx) => idx !== i).map((ins, idx) => ({ ...ins, step: idx + 1 }))
    )
  }

  function handleSave() {
    if (!title.trim()) { setError("Title is required!"); return }
    setError("")
    startSave(async () => {
      try {
        const newSlug = await updateRecipe(recipe.id, {
          title: title.trim(),
          mealType,
          description: description.trim() || undefined,
          imageUrl: imageUrl.trim() || undefined,
          prepTimeMin: prepTimeMin ? parseInt(prepTimeMin) : undefined,
          cookTimeMin: cookTimeMin ? parseInt(cookTimeMin) : undefined,
          totalTimeMin: totalTimeMin ? parseInt(totalTimeMin) : undefined,
          servings: servings ? parseInt(servings) : undefined,
          storageNotes: storageNotes.trim() || undefined,
          notes: notes.trim() || undefined,
          ingredients: ingredients.filter((i) => i.name.trim()),
          instructions: instructions.filter((i) => i.text.trim()),
        })
        router.push(`/recipes/${newSlug}`)
      } catch {
        setError("Couldn't save — try again!")
      }
    })
  }

  const imagePreview = imageUrl.startsWith("http") ? imageUrl : null

  return (
    <div className="space-y-7 pb-10">
      {/* Image */}
      <div className="space-y-2">
        <label className="text-sm font-medium">Photo</label>
        {imagePreview && (
          <div className="relative w-full aspect-video bg-muted rounded-lg overflow-hidden mb-2">
            <Image src={imagePreview} alt="Preview" fill className="object-cover" sizes="(max-width: 640px) 100vw, 640px" />
          </div>
        )}
        <input
          type="url"
          value={imageUrl}
          onChange={(e) => setImageUrl(e.target.value)}
          placeholder="Paste an image URL…"
          className="w-full h-11 px-3 bg-muted border border-border rounded text-sm focus:outline-none focus:ring-1 focus:ring-foreground"
        />
        <p className="text-xs text-muted-foreground">Paste any image URL. Unsplash, Imgur, etc.</p>
      </div>

      {/* Title */}
      <div className="space-y-1.5">
        <label className="text-sm font-medium">Title</label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full h-11 px-3 bg-muted border border-border rounded text-sm focus:outline-none focus:ring-1 focus:ring-foreground"
        />
      </div>

      {/* Meal type */}
      <div className="space-y-1.5">
        <label className="text-sm font-medium">Meal type</label>
        <div className="grid grid-cols-4 gap-2">
          {(["breakfast", "lunch", "dinner", "snack"] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setMealType(t)}
              className={`h-10 rounded text-sm font-medium capitalize transition-colors ${
                mealType === t ? "bg-foreground text-background" : "bg-muted text-muted-foreground hover:text-foreground"
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* Description */}
      <div className="space-y-1.5">
        <label className="text-sm font-medium">Description</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          placeholder="A short description of this recipe…"
          className="w-full px-3 py-2.5 bg-muted border border-border rounded text-sm focus:outline-none focus:ring-1 focus:ring-foreground resize-none"
        />
      </div>

      {/* Times + Servings */}
      <div className="space-y-1.5">
        <label className="text-sm font-medium">Time & servings</label>
        <div className="grid grid-cols-2 gap-2">
          {[
            { label: "Prep (min)", value: prepTimeMin, set: setPrepTimeMin },
            { label: "Cook (min)", value: cookTimeMin, set: setCookTimeMin },
            { label: "Total (min)", value: totalTimeMin, set: setTotalTimeMin },
            { label: "Servings", value: servings, set: setServings },
          ].map(({ label, value, set }) => (
            <div key={label} className="space-y-1">
              <p className="text-xs text-muted-foreground">{label}</p>
              <input
                type="number"
                value={value}
                onChange={(e) => set(e.target.value)}
                min="0"
                className="w-full h-10 px-3 bg-muted border border-border rounded text-sm focus:outline-none focus:ring-1 focus:ring-foreground"
              />
            </div>
          ))}
        </div>
      </div>

      {/* Ingredients */}
      <div className="space-y-2">
        <label className="text-sm font-medium">Ingredients</label>
        <div className="space-y-2">
          {ingredients.map((ing, i) => (
            <div key={i} className="flex gap-2">
              <input
                type="text"
                value={ing.quantity ?? ""}
                onChange={(e) => updateIngredient(i, "quantity", e.target.value)}
                placeholder="Qty"
                className="w-14 h-10 px-2 bg-muted border border-border rounded text-sm focus:outline-none focus:ring-1 focus:ring-foreground text-center"
              />
              <input
                type="text"
                value={ing.unit ?? ""}
                onChange={(e) => updateIngredient(i, "unit", e.target.value)}
                placeholder="Unit"
                className="w-16 h-10 px-2 bg-muted border border-border rounded text-sm focus:outline-none focus:ring-1 focus:ring-foreground"
              />
              <input
                type="text"
                value={ing.name}
                onChange={(e) => updateIngredient(i, "name", e.target.value)}
                placeholder="Ingredient name"
                className="flex-1 h-10 px-3 bg-muted border border-border rounded text-sm focus:outline-none focus:ring-1 focus:ring-foreground"
              />
              <button
                type="button"
                onClick={() => removeIngredient(i)}
                disabled={ingredients.length === 1}
                className="w-10 h-10 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors disabled:opacity-25 shrink-0"
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={addIngredient}
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors py-1"
        >
          <Plus size={14} />
          Add ingredient
        </button>
      </div>

      {/* Instructions */}
      <div className="space-y-2">
        <label className="text-sm font-medium">Instructions</label>
        <div className="space-y-2">
          {instructions.map((ins, i) => (
            <div key={i} className="flex gap-2 items-start">
              <span className="text-sm font-mono text-muted-foreground w-5 shrink-0 mt-2.5">{i + 1}.</span>
              <textarea
                value={ins.text}
                onChange={(e) => updateInstruction(i, e.target.value)}
                placeholder={`Step ${i + 1}…`}
                rows={2}
                className="flex-1 px-3 py-2.5 bg-muted border border-border rounded text-sm focus:outline-none focus:ring-1 focus:ring-foreground resize-none"
              />
              <button
                type="button"
                onClick={() => removeInstruction(i)}
                disabled={instructions.length === 1}
                className="w-10 h-10 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors disabled:opacity-25 shrink-0 mt-0.5"
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={addInstruction}
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors py-1"
        >
          <Plus size={14} />
          Add step
        </button>
      </div>

      {/* Storage notes */}
      <div className="space-y-1.5">
        <label className="text-sm font-medium">Storage notes</label>
        <textarea
          value={storageNotes}
          onChange={(e) => setStorageNotes(e.target.value)}
          rows={2}
          placeholder="How to store leftovers…"
          className="w-full px-3 py-2.5 bg-muted border border-border rounded text-sm focus:outline-none focus:ring-1 focus:ring-foreground resize-none"
        />
      </div>

      {/* Notes */}
      <div className="space-y-1.5">
        <label className="text-sm font-medium">Notes</label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
          placeholder="Tips, substitutions, variations…"
          className="w-full px-3 py-2.5 bg-muted border border-border rounded text-sm focus:outline-none focus:ring-1 focus:ring-foreground resize-none"
        />
      </div>

      {error && <p className="text-sm text-red-500">{error}</p>}

      <button
        onClick={handleSave}
        disabled={saving}
        className="w-full h-12 bg-foreground text-background text-sm font-medium rounded hover:opacity-80 transition-opacity disabled:opacity-40 flex items-center justify-center gap-2"
      >
        {saving ? (
          <>
            <Loader2 size={15} className="animate-spin" />
            Saving changes…
          </>
        ) : (
          "Save changes"
        )}
      </button>
    </div>
  )
}
