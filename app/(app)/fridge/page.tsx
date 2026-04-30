import FridgeScanner from "@/components/fridge-scanner"
import { db } from "@/lib/db"
import { fridgeScans } from "@/lib/db/schema"
import { desc, eq } from "drizzle-orm"
import { auth } from "@/lib/auth"
import Link from "next/link"
import { ChevronLeft } from "lucide-react"

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
      <div className="mb-6">
        <div className="flex items-center gap-2">
          <Link href="/today" className="text-muted-foreground hover:text-foreground transition-colors -ml-3 p-2">
            <ChevronLeft size={20} />
          </Link>
          <h1 className="text-2xl font-bold tracking-tight">My Fridge</h1>
        </div>
        <p className="text-xs text-muted-foreground mt-0.5 ml-6">Snap a photo to find recipes you can make now</p>
      </div>
      <FridgeScanner recipes={recipes} recentScans={recentScans} />
    </div>
  )
}
