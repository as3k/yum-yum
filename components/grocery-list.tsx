"use client"

import { useOptimistic, useTransition } from "react"
import { toggleGroceryItem, uncheckAllGroceryItems } from "@/lib/actions"

type GroceryItem = {
  id: number
  name: string
  quantity: string | null
  unit: string | null
  category: string | null
  checked: boolean
}

type Group = {
  category: string
  items: GroceryItem[]
}

export default function GroceryList({
  grouped,
  listId,
}: {
  grouped: Group[]
  listId: number
}) {
  const allItems = grouped.flatMap((g) => g.items)

  const [optimisticItems, setOptimistic] = useOptimistic(
    allItems,
    (state, { id, checked }: { id: number; checked: boolean }) =>
      state.map((item) => (item.id === id ? { ...item, checked } : item))
  )

  const [isPending, startTransition] = useTransition()

  function getItems(category: string) {
    return optimisticItems.filter((i) => (i.category ?? "Other") === category)
  }

  return (
    <div className="space-y-6">
      {grouped.map(({ category }) => {
        const items = getItems(category)
        const allChecked = items.every((i) => i.checked)

        return (
          <div key={category}>
            <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-2">
              {category}
            </h2>
            <div className="border border-border rounded-lg divide-y divide-border">
              {items.map((item) => (
                <label
                  key={item.id}
                  className="flex items-center gap-3 px-4 py-3 cursor-pointer select-none"
                >
                  <input
                    type="checkbox"
                    checked={item.checked}
                    onChange={() => {
                      startTransition(() => {
                        setOptimistic({ id: item.id, checked: !item.checked })
                        toggleGroceryItem(item.id)
                      })
                    }}
                    className="w-4 h-4 rounded border-border accent-foreground shrink-0"
                  />
                  <span
                    className={`text-sm flex-1 ${
                      item.checked ? "line-through text-muted-foreground" : ""
                    }`}
                  >
                    {item.quantity && <span className="text-muted-foreground mr-1">{item.quantity}{item.unit ? ` ${item.unit}` : ""}</span>}
                    {item.name}
                  </span>
                </label>
              ))}
            </div>
          </div>
        )
      })}

      <button
        onClick={() => startTransition(() => uncheckAllGroceryItems(listId))}
        disabled={isPending}
        className="w-full py-3 text-sm text-muted-foreground hover:text-foreground transition-colors disabled:opacity-40"
      >
        Start fresh
      </button>
    </div>
  )
}
