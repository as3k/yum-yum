import { db } from "@/lib/db"
import { groceryLists, groceryItems } from "@/lib/db/schema"
import { desc, eq } from "drizzle-orm"
import { formatWeekRange } from "@/lib/utils"
import GroceryList from "@/components/grocery-list"

export default async function GroceryPage() {
  const list = await db.query.groceryLists.findFirst({
    orderBy: [desc(groceryLists.weekStart)],
  })

  if (!list) {
    return (
      <div className="max-w-2xl mx-auto px-4 pt-10 text-center">
        <p className="text-muted-foreground text-sm">No grocery list yet — plan a week first!</p>
      </div>
    )
  }

  const items = await db.query.groceryItems.findMany({
    where: eq(groceryItems.groceryListId, list.id),
    orderBy: (t, { asc }) => [asc(t.category), asc(t.name)],
  })

  // Group by category
  const categories = [...new Set(items.map((i) => i.category ?? "Other"))].sort()
  const grouped = categories.map((cat) => ({
    category: cat,
    items: items.filter((i) => (i.category ?? "Other") === cat),
  }))

  const totalCount = items.length
  const checkedCount = items.filter((i) => i.checked).length

  return (
    <div className="max-w-2xl mx-auto px-4 pt-6 pb-4">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Grocery List</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {formatWeekRange(list.weekStart)} · {checkedCount} of {totalCount} grabbed
          </p>
        </div>
      </div>
      <GroceryList grouped={grouped} listId={list.id} />
    </div>
  )
}
