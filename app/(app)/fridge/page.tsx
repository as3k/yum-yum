import HeaderControls from "@/components/header-controls"
import FridgeScanner from "@/components/fridge-scanner"
import { db } from "@/lib/db"
import { fridgeScans } from "@/lib/db/schema"
import { desc, eq } from "drizzle-orm"
import { auth } from "@/lib/auth"

export default async function FridgePage() {
  const session = await auth()
  const userId = session?.user?.id

  const [recipes, recentScans] = await Promise.all([
    db.query.recipes.findMany({
      columns: { id: true, title: true, slug: true, mealType: true, imageUrl: true, ingredients: true },
    }),
    userId
      ? db.select().from(fridgeScans).where(eq(fridgeScans.userId, userId)).orderBy(desc(fridgeScans.scannedAt)).limit(5)
      : Promise.resolve([]),
  ])

  return (
    <div className="max-w-2xl mx-auto px-4 pt-8 pb-6">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">What's in my fridge?</h1>
          <p className="text-xs text-muted-foreground mt-0.5">Snap a photo to find recipes you can make now</p>
        </div>
        <HeaderControls />
      </div>
      <FridgeScanner recipes={recipes} recentScans={recentScans} />
    </div>
  )
}
