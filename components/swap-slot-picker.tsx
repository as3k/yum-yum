"use client"

import { useState, useTransition } from "react"
import { ArrowLeftRight, X } from "lucide-react"
import { swapMealSlot } from "@/lib/actions"

interface Recipe {
  id: number
  title: string
  mealType: string
}

interface Props {
  slotId: number
  currentRecipeId: number
  mealType: string
  recipes: Recipe[]
}

export default function SwapSlotPicker({ slotId, currentRecipeId, mealType, recipes }: Props) {
  const [open, setOpen] = useState(false)
  const [pending, startTransition] = useTransition()

  const options = recipes.filter((r) => r.mealType === mealType && r.id !== currentRecipeId)

  function handleSwap(recipeId: number) {
    startTransition(async () => {
      await swapMealSlot(slotId, recipeId)
      setOpen(false)
    })
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center justify-center w-7 h-7 rounded-lg text-muted-foreground hover:text-accent hover:bg-background transition-colors shrink-0"
        title="Swap recipe"
      >
        <ArrowLeftRight size={13} />
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center"
          onClick={() => setOpen(false)}
        >
          <div className="absolute inset-0 bg-black/40" />
          <div
            className="relative bg-background rounded-t-2xl w-full max-w-lg mx-auto max-h-[70vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 pt-5 pb-3 shrink-0">
              <p className="font-semibold text-sm capitalize">Swap {mealType}</p>
              <button onClick={() => setOpen(false)} className="text-muted-foreground hover:text-foreground">
                <X size={18} />
              </button>
            </div>
            <div className="overflow-y-auto pb-6">
              {options.length === 0 ? (
                <p className="text-sm text-muted-foreground px-5 py-4">No other {mealType} recipes yet.</p>
              ) : (
                options.map((r) => (
                  <button
                    key={r.id}
                    onClick={() => handleSwap(r.id)}
                    disabled={pending}
                    className="w-full text-left px-5 py-3.5 text-sm hover:bg-muted transition-colors disabled:opacity-50 border-t border-border/30 first:border-t-0"
                  >
                    {r.title}
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
