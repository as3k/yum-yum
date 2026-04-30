import { NextRequest, NextResponse } from "next/server"
import OpenAI from "openai"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import type { Ingredient } from "@/lib/db/schema"

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const form = await req.formData()
  const file = form.get("image") as File | null
  if (!file) return NextResponse.json({ error: "No image" }, { status: 400 })

  const bytes = await file.arrayBuffer()
  const base64 = Buffer.from(bytes).toString("base64")
  const mimeType = (file.type || "image/jpeg") as "image/jpeg" | "image/png" | "image/webp" | "image/gif"

  const client = new OpenAI()
  const response = await client.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "user",
        content: [
          {
            type: "image_url",
            image_url: { url: `data:${mimeType};base64,${base64}`, detail: "low" },
          },
          {
            type: "text",
            text: "List every distinct food ingredient or item you can identify in this fridge photo. Return ONLY a JSON array of strings, each being a simple ingredient name (no quantities, no locations). Example: [\"chicken breast\", \"broccoli\", \"eggs\", \"cheddar cheese\"]. If you cannot identify the image as a fridge or food items, return an empty array.",
          },
        ],
      },
    ],
    max_tokens: 500,
  })

  let ingredients: string[] = []
  try {
    const text = response.choices[0]?.message?.content ?? "[]"
    const match = text.match(/\[[\s\S]*\]/)
    ingredients = match ? JSON.parse(match[0]) : []
  } catch {
    ingredients = []
  }

  // Match against existing recipes
  const allRecipes = await db.query.recipes.findMany({
    columns: { id: true, title: true, slug: true, mealType: true, imageUrl: true, ingredients: true },
  })

  const fridgeLower = ingredients.map((i) => i.toLowerCase())

  const scored = allRecipes.map((r) => {
    const recipeIngredients = (r.ingredients as Ingredient[] ?? []).map((i) => i.name.toLowerCase())
    const matched = recipeIngredients.filter((name) =>
      fridgeLower.some((fi) => name.includes(fi) || fi.includes(name))
    )
    return { ...r, matchCount: matched.length, matchedIngredients: matched }
  })

  const matching = scored
    .filter((r) => r.matchCount > 0)
    .sort((a, b) => b.matchCount - a.matchCount)
    .slice(0, 6)
    .map(({ ingredients: _ing, ...r }) => r)

  return NextResponse.json({ ingredients, matchingRecipes: matching })
}
