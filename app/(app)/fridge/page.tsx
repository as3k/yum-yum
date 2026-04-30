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
    <div className="max-w-2xl mx-auto px-4 pt-2 pb-6">
      <p className="text-xs text-muted-foreground mb-6">Snap a photo to find recipes you can make now</p>
      <FridgeScanner recipes={recipes} recentScans={recentScans} />
    </div>
  )
}
