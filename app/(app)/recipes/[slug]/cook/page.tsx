import { notFound } from "next/navigation"
import { db } from "@/lib/db"
import { recipes } from "@/lib/db/schema"
import { eq } from "drizzle-orm"
import CookingSession from "@/components/cooking-session"

export default async function CookPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const recipe = await db.query.recipes.findFirst({
    where: eq(recipes.slug, slug),
  })
  if (!recipe) notFound()

  return (
    <CookingSession
      slug={recipe.slug}
      title={recipe.title}
      ingredients={recipe.ingredients ?? []}
      instructions={recipe.instructions ?? []}
    />
  )
}
