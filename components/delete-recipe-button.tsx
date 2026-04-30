"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Trash2 } from "lucide-react"
import { deleteRecipe } from "@/lib/actions"

const STORAGE_KEY = "skip-delete-recipe-confirm"

export default function DeleteRecipeButton({ id, slug }: { id: number; slug: string }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [skipNext, setSkipNext] = useState(false)
  const [pending, startTransition] = useTransition()

  function handleClick() {
    if (typeof window !== "undefined" && localStorage.getItem(STORAGE_KEY) === "1") {
      doDelete()
    } else {
      setOpen(true)
    }
  }

  function doDelete() {
    startTransition(async () => {
      await deleteRecipe(id, slug)
      router.push("/recipes")
    })
  }

  function handleConfirm() {
    if (skipNext) localStorage.setItem(STORAGE_KEY, "1")
    setOpen(false)
    doDelete()
  }

  return (
    <>
      <button
        onClick={handleClick}
        disabled={pending}
        className="flex items-center gap-1.5 text-sm font-medium px-3 h-8 border border-border rounded hover:bg-destructive/10 hover:text-destructive hover:border-destructive/40 transition-colors disabled:opacity-50"
      >
        <Trash2 size={14} />
        Delete
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-background border border-border rounded-xl shadow-xl p-6 w-full max-w-sm mx-4 space-y-4">
            <h2 className="text-base font-semibold">Delete recipe?</h2>
            <p className="text-sm text-muted-foreground">This can't be undone.</p>

            <label className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer select-none">
              <input
                type="checkbox"
                checked={skipNext}
                onChange={(e) => setSkipNext(e.target.checked)}
                className="rounded"
              />
              Don't show me this again
            </label>

            <div className="flex gap-2 justify-end pt-1">
              <button
                onClick={() => setOpen(false)}
                className="px-4 h-8 text-sm border border-border rounded hover:bg-muted transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirm}
                className="px-4 h-8 text-sm bg-destructive text-destructive-foreground rounded hover:opacity-80 transition-opacity"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
