"use server"

import { and, eq, desc, lte } from "drizzle-orm"
import { revalidatePath } from "next/cache"
import Anthropic from "@anthropic-ai/sdk"
import { auth } from "./auth"
import { db } from "./db"
import {
  groceryItems,
  mealPlans,
  mealPlanSlots,
  recipes,
  userRecipeFavorites,
  userRecipeRatings,
  type FodmapFlag,
  type Ingredient,
  type Instruction,
} from "./db/schema"
import { slugify, getWeekDates, getNextWeekStart } from "./utils"

type MealType = "breakfast" | "lunch" | "dinner" | "snack"

export async function toggleFavorite(recipeId: number, slug: string) {
  const session = await auth()
  if (!session?.user?.id) throw new Error("Unauthorized")
  const userId = session.user.id

  const existing = await db.query.userRecipeFavorites.findFirst({
    where: and(
      eq(userRecipeFavorites.userId, userId),
      eq(userRecipeFavorites.recipeId, recipeId)
    ),
  })

  if (existing) {
    await db
      .delete(userRecipeFavorites)
      .where(
        and(
          eq(userRecipeFavorites.userId, userId),
          eq(userRecipeFavorites.recipeId, recipeId)
        )
      )
  } else {
    await db.insert(userRecipeFavorites).values({ userId, recipeId })
  }

  revalidatePath("/favorites")
  revalidatePath(`/recipes/${slug}`)
  revalidatePath("/recipes")
}

export async function setRating(recipeId: number, rating: number, slug: string) {
  const session = await auth()
  if (!session?.user?.id) throw new Error("Unauthorized")
  const userId = session.user.id

  await db
    .insert(userRecipeRatings)
    .values({ userId, recipeId, rating })
    .onConflictDoUpdate({
      target: [userRecipeRatings.userId, userRecipeRatings.recipeId],
      set: { rating },
    })

  revalidatePath(`/recipes/${slug}`)
  revalidatePath("/recipes")
  revalidatePath("/favorites")
}

export async function toggleGroceryItem(id: number) {
  const item = await db.query.groceryItems.findFirst({
    where: eq(groceryItems.id, id),
  })
  if (!item) return

  await db
    .update(groceryItems)
    .set({
      checked: !item.checked,
      checkedAt: !item.checked ? new Date() : null,
    })
    .where(eq(groceryItems.id, id))

  revalidatePath("/grocery")
}

export async function uncheckAllGroceryItems(listId: number) {
  await db
    .update(groceryItems)
    .set({ checked: false, checkedAt: null })
    .where(eq(groceryItems.groceryListId, listId))

  revalidatePath("/grocery")
}

export interface RecipeToSave {
  title: string
  mealType: MealType
  description?: string
  imageUrl?: string
  ingredients: Ingredient[]
  instructions: Instruction[]
  prepTimeMin?: number
  cookTimeMin?: number
  totalTimeMin?: number
  servings?: number
  sourceUrl?: string
  tags: string[]
  fodmapFlags: FodmapFlag[]
}

export async function saveRecipe(data: RecipeToSave) {
  const session = await auth()
  if (!session?.user?.id) throw new Error("Unauthorized")

  const slug = slugify(data.title)

  const [recipe] = await db
    .insert(recipes)
    .values({
      slug,
      title: data.title,
      mealType: data.mealType,
      description: data.description,
      imageUrl: data.imageUrl,
      ingredients: data.ingredients,
      instructions: data.instructions,
      prepTimeMin: data.prepTimeMin,
      cookTimeMin: data.cookTimeMin,
      totalTimeMin: data.totalTimeMin,
      servings: data.servings,
      sourceUrl: data.sourceUrl,
      tags: data.tags,
      fodmapFlags: data.fodmapFlags,
      addedDate: new Date().toISOString().split("T")[0],
    })
    .onConflictDoUpdate({
      target: recipes.slug,
      set: {
        title: data.title,
        updatedAt: new Date(),
      },
    })
    .returning()

  revalidatePath("/recipes")
  return recipe
}

async function getOrCreateMealPlan(weekStart: string) {
  const existing = await db.query.mealPlans.findFirst({
    where: eq(mealPlans.weekStart, weekStart),
  })
  if (existing) return existing
  const [created] = await db.insert(mealPlans).values({ weekStart }).returning()
  return created
}

export async function setMealPlanSlot(
  weekStart: string,
  dayDate: string,
  mealType: MealType,
  recipeId: number
) {
  const plan = await getOrCreateMealPlan(weekStart)
  const [slot] = await db
    .insert(mealPlanSlots)
    .values({ mealPlanId: plan.id, dayDate, mealType, recipeId })
    .onConflictDoUpdate({
      target: [mealPlanSlots.mealPlanId, mealPlanSlots.dayDate, mealPlanSlots.mealType],
      set: { recipeId },
    })
    .returning()
  revalidatePath("/plan")
  return slot
}

export async function removeMealPlanSlot(slotId: number) {
  await db.delete(mealPlanSlots).where(eq(mealPlanSlots.id, slotId))
  revalidatePath("/plan")
}

export async function generateAIMealPlan(weekStart: string) {
  const session = await auth()
  if (!session?.user?.id) throw new Error("Unauthorized")

  const today = new Date().toISOString().split("T")[0]

  // Fetch context in parallel
  const [allRecipes, favorites, lastWeekPlan] = await Promise.all([
    db.query.recipes.findMany(),
    db.query.userRecipeFavorites.findMany(),
    db.query.mealPlans.findFirst({
      where: lte(mealPlans.weekStart, today),
      orderBy: [desc(mealPlans.weekStart)],
    }),
  ])

  const favoriteIds = new Set(favorites.map((f) => f.recipeId))

  let lastWeekRecipeIds = new Set<number>()
  if (lastWeekPlan) {
    const lastSlots = await db.query.mealPlanSlots.findMany({
      where: eq(mealPlanSlots.mealPlanId, lastWeekPlan.id),
    })
    lastWeekRecipeIds = new Set(lastSlots.map((s) => s.recipeId).filter(Boolean) as number[])
  }

  const recipeList = allRecipes.map((r) => ({
    id: r.id,
    title: r.title,
    mealType: r.mealType,
    tags: r.tags,
    description: r.description,
    isFavorite: favoriteIds.has(r.id),
    usedLastWeek: lastWeekRecipeIds.has(r.id),
  }))

  const weekDates = getWeekDates(weekStart)

  const client = new Anthropic()
  const response = await client.messages.create({
    model: "claude-opus-4-7",
    max_tokens: 2000,
    tools: [
      {
        name: "create_meal_plan",
        description: "Create a structured weekly meal plan",
        input_schema: {
          type: "object" as const,
          properties: {
            slots: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  dayDate: { type: "string", description: "YYYY-MM-DD" },
                  mealType: { type: "string", enum: ["breakfast", "lunch", "dinner", "snack"] },
                  recipeId: { type: "number" },
                },
                required: ["dayDate", "mealType", "recipeId"],
              },
            },
          },
          required: ["slots"],
        },
      },
    ],
    tool_choice: { type: "tool", name: "create_meal_plan" },
    messages: [
      {
        role: "user",
        content: `You are a meal planner for two people with ADHD who follow a low-FODMAP, low-carb diet.

Available recipes:
${JSON.stringify(recipeList, null, 2)}

Week to plan: ${weekDates[0]} through ${weekDates[6]}
Days: ${weekDates.join(", ")}

Guidelines:
- Both people have ADHD — balance comfort (favorites) with novelty (new/untried)
- Favorites (isFavorite: true): include 2-3 of these across the week for predictability
- Avoid exact repeats of last week (usedLastWeek: true) but some overlap is fine
- Each day needs breakfast, lunch, dinner
- Add 3-4 snacks across the week (not every day, just where it makes sense)
- Recipes should match their mealType but use your judgement (e.g. egg muffins for breakfast)
- Only use recipe IDs from the provided list

Create a complete meal plan for the week.`,
      },
    ],
  })

  const toolUse = response.content.find((c) => c.type === "tool_use")
  if (!toolUse || toolUse.type !== "tool_use") throw new Error("AI did not return a meal plan")

  const { slots } = toolUse.input as { slots: { dayDate: string; mealType: string; recipeId: number }[] }

  // Save to DB
  const plan = await getOrCreateMealPlan(weekStart)
  const recipeMap = new Map(allRecipes.map((r) => [r.id, r]))

  const savedSlots = []
  for (const s of slots) {
    const recipe = recipeMap.get(s.recipeId)
    if (!recipe) continue
    const [slot] = await db
      .insert(mealPlanSlots)
      .values({
        mealPlanId: plan.id,
        dayDate: s.dayDate,
        mealType: s.mealType as MealType,
        recipeId: s.recipeId,
      })
      .onConflictDoUpdate({
        target: [mealPlanSlots.mealPlanId, mealPlanSlots.dayDate, mealPlanSlots.mealType],
        set: { recipeId: s.recipeId },
      })
      .returning()
    savedSlots.push({
      id: slot.id,
      dayDate: s.dayDate,
      mealType: s.mealType as MealType,
      recipeId: s.recipeId,
      recipeTitle: recipe.title,
      recipeSlug: recipe.slug,
    })
  }

  revalidatePath("/plan")
  return { slots: savedSlots }
}
