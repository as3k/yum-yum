import { notFound } from "next/navigation"
import Link from "next/link"
import { ChevronLeft } from "lucide-react"
import { db } from "@/lib/db"
import { recipes } from "@/lib/db/schema"
import { eq } from "drizzle-orm"
import EditRecipeForm from "@/components/edit-recipe-form"

export default async function EditRecipePage({
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
    <div className="max-w-2xl mx-auto px-4 pt-6 pb-4">
      <div className="mb-5">
        <Link
          href={`/recipes/${slug}`}
          className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors mb-4"
        >
          <ChevronLeft size={16} />
          Back to recipe
        </Link>
        <h1 className="text-xl font-semibold tracking-tight">Edit Recipe</h1>
      </div>
      <EditRecipeForm
        recipe={{
          id: recipe.id,
          slug: recipe.slug,
          title: recipe.title,
          mealType: recipe.mealType as "breakfast" | "lunch" | "dinner" | "snack",
          description: recipe.description ?? null,
          imageUrl: recipe.imageUrl ?? null,
          prepTimeMin: recipe.prepTimeMin ?? null,
          cookTimeMin: recipe.cookTimeMin ?? null,
          totalTimeMin: recipe.totalTimeMin ?? null,
          servings: recipe.servings ?? null,
          storageNotes: recipe.storageNotes ?? null,
          notes: recipe.notes ?? null,
          ingredients: recipe.ingredients ?? [],
          instructions: recipe.instructions ?? [],
        }}
      />
    </div>
  )
}
