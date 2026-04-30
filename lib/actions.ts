"use server"

import { and, eq, desc, lte } from "drizzle-orm"
import { revalidatePath } from "next/cache"
import OpenAI from "openai"
import { auth } from "./auth"
import { db } from "./db"
import {
  groceryItems,
  mealPlans,
  mealPlanSlots,
  meals,
  mealRecipes,
  recipes,
  userRecipeFavorites,
  userRecipeRatings,
  pushSubscriptions,
  userPreferences,
  type FodmapFlag,
  type Ingredient,
  type Instruction,
  type NutritionData,
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
  nutritionPerServing?: NutritionData | null
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
      nutritionPerServing: data.nutritionPerServing ?? null,
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

export async function updateRecipe(
  id: number,
  data: {
    title: string
    mealType: MealType
    description?: string
    imageUrl?: string
    prepTimeMin?: number
    cookTimeMin?: number
    totalTimeMin?: number
    servings?: number
    storageNotes?: string
    notes?: string
    ingredients: Ingredient[]
    instructions: Instruction[]
  }
) {
  const session = await auth()
  if (!session?.user?.id) throw new Error("Unauthorized")

  const existing = await db.query.recipes.findFirst({ where: eq(recipes.id, id) })
  if (!existing) throw new Error("Recipe not found")

  const newSlug = slugify(data.title)

  await db.update(recipes).set({
    slug: newSlug,
    title: data.title,
    mealType: data.mealType,
    description: data.description ?? null,
    imageUrl: data.imageUrl ?? null,
    ingredients: data.ingredients,
    instructions: data.instructions,
    prepTimeMin: data.prepTimeMin ?? null,
    cookTimeMin: data.cookTimeMin ?? null,
    totalTimeMin: data.totalTimeMin ?? null,
    servings: data.servings ?? null,
    storageNotes: data.storageNotes ?? null,
    notes: data.notes ?? null,
    updatedAt: new Date(),
  }).where(eq(recipes.id, id))

  revalidatePath(`/recipes/${newSlug}`)
  if (existing.slug !== newSlug) revalidatePath(`/recipes/${existing.slug}`)
  revalidatePath("/recipes")
  return newSlug
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

export async function generateAIMealPlan(weekStart: string, context?: string) {
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

  const client = new OpenAI()
  const response = await client.chat.completions.create({
    model: "gpt-4o-mini",
    tools: [
      {
        type: "function",
        function: {
          name: "create_meal_plan",
          description: "Create a structured weekly meal plan",
          parameters: {
            type: "object",
            properties: {
              reasoning: {
                type: "string",
                description: "2-3 warm, friendly sentences explaining the plan — mention why you picked certain meals, what's exciting about the mix, and any fun themes. Write like an enthusiastic nutritionist who genuinely loves food.",
              },
              slots: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    dayDate: { type: "string", description: "YYYY-MM-DD" },
                    mealType: { type: "string", enum: ["breakfast", "lunch", "dinner", "snack"] },
                    recipeId: { type: "integer" },
                  },
                  required: ["dayDate", "mealType", "recipeId"],
                },
              },
            },
            required: ["reasoning", "slots"],
          },
        },
      },
    ],
    tool_choice: { type: "function", function: { name: "create_meal_plan" } },
    messages: [
      {
        role: "system",
        content: "You are a meal planner for two people with ADHD who follow a low-FODMAP, low-carb diet. Always plan budget-conscious meals — prefer low-cost ingredients and avoid expensive proteins or specialty items unless they're already in the recipe list. Only use recipe IDs from the provided list.",
      },
      {
        role: "user",
        content: `Available recipes:
${JSON.stringify(recipeList, null, 2)}

Week to plan: ${weekDates[0]} through ${weekDates[6]}
Days: ${weekDates.join(", ")}

Guidelines:
- Both people have ADHD — balance comfort (favorites) with novelty (new/untried)
- Favorites (isFavorite: true): include 2-3 of these across the week for predictability
- Avoid exact repeats of last week (usedLastWeek: true) but some overlap is fine
- Each day needs breakfast, lunch, dinner
- Add 3-4 snacks across the week (not every day, just where it makes sense)
- Recipes should match their mealType but use your judgement

Create a complete meal plan for the week.${context ? `\n\nAdditional context from the user this week:\n${context}` : ""}`,
      },
    ],
  })

  const toolCall = response.choices[0]?.message?.tool_calls?.[0]
  if (!toolCall || toolCall.type !== "function") throw new Error("AI did not return a meal plan")

  const { slots, reasoning } = JSON.parse(toolCall.function.arguments) as {
    reasoning: string
    slots: { dayDate: string; mealType: string; recipeId: number }[]
  }

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
  return { slots: savedSlots, reasoning }
}

export type DiscoveryResult = {
  recipe: RecipeToSave
  nutrition: {
    calories: number
    carbsG: number
    fiberG: number
    fatG: number
    proteinG: number
  } | null
  healthNotes: string[]
}

export async function discoverRecipes(query: string): Promise<DiscoveryResult[]> {
  const session = await auth()
  if (!session?.user?.id) throw new Error("Unauthorized")

  const client = new OpenAI()
  const response = await client.chat.completions.create({
    model: "gpt-4o-mini",
    tools: [
      {
        type: "function",
        function: {
          name: "suggest_recipes",
          description: "Suggest recipes matching the user's request",
          parameters: {
            type: "object",
            properties: {
              recipes: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    title: { type: "string" },
                    mealType: { type: "string", enum: ["breakfast", "lunch", "dinner", "snack"] },
                    description: { type: "string" },
                    totalTimeMin: { type: "integer" },
                    prepTimeMin: { type: "integer" },
                    cookTimeMin: { type: "integer" },
                    servings: { type: "integer" },
                    sourceUrl: { type: "string", description: "Real recipe URL if you know one" },
                    tags: { type: "array", items: { type: "string" } },
                    ingredients: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: {
                          name: { type: "string" },
                          quantity: { type: "string" },
                          unit: { type: "string" },
                          notes: { type: "string" },
                        },
                        required: ["name"],
                      },
                    },
                    instructions: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: {
                          step: { type: "integer" },
                          text: { type: "string" },
                        },
                        required: ["step", "text"],
                      },
                    },
                    estimatedNutritionPerServing: {
                      type: "object",
                      description: "Estimated macros per serving",
                      properties: {
                        calories: { type: "integer" },
                        carbsG: { type: "integer" },
                        fiberG: { type: "integer" },
                        fatG: { type: "integer" },
                        proteinG: { type: "integer" },
                      },
                      required: ["calories", "carbsG", "fiberG", "fatG", "proteinG"],
                    },
                    healthNotes: {
                      type: "array",
                      items: { type: "string" },
                      description: "2-4 honest, warm health observations per serving: blood sugar impact, diabetic suitability, nutrients to celebrate, anything to eat sparingly. Be direct but kind.",
                    },
                  },
                  required: ["title", "mealType", "description", "ingredients", "instructions", "estimatedNutritionPerServing", "healthNotes"],
                },
              },
            },
            required: ["recipes"],
          },
        },
      },
    ],
    tool_choice: { type: "function", function: { name: "suggest_recipes" } },
    messages: [
      {
        role: "system",
        content:
          "You are a nutritionist and meal planner specializing in low-FODMAP, low-carb, budget-friendly cooking. Suggest 3-5 practical, delicious recipes matching the user's request. Only suggest recipes that are naturally low-FODMAP or easily adapted. Avoid: garlic, onion (only green onion tops are ok), wheat flour, regular dairy (lactose-free or dairy-free alternatives are fine), high-sugar ingredients. Prefer whole foods, simple techniques, and affordable ingredients. Include realistic full ingredient lists and clear step-by-step instructions. Always estimate macros and provide honest health context.",
      },
      {
        role: "user",
        content: query,
      },
    ],
  })

  const toolCall = response.choices[0]?.message?.tool_calls?.[0]
  if (!toolCall || toolCall.type !== "function") throw new Error("No recipes returned")

  const { recipes } = JSON.parse(toolCall.function.arguments) as {
    recipes: Array<{
      title: string
      mealType: string
      description?: string
      totalTimeMin?: number
      prepTimeMin?: number
      cookTimeMin?: number
      servings?: number
      sourceUrl?: string
      tags?: string[]
      ingredients: Array<{ name: string; quantity?: string; unit?: string; notes?: string }>
      instructions: Array<{ step: number; text: string }>
      estimatedNutritionPerServing?: { calories: number; carbsG: number; fiberG: number; fatG: number; proteinG: number }
      healthNotes?: string[]
    }>
  }

  return recipes.map((r) => ({
    recipe: {
      title: r.title,
      mealType: r.mealType as MealType,
      description: r.description,
      totalTimeMin: r.totalTimeMin,
      prepTimeMin: r.prepTimeMin,
      cookTimeMin: r.cookTimeMin,
      servings: r.servings,
      sourceUrl: r.sourceUrl,
      tags: r.tags ?? [],
      fodmapFlags: [],
      nutritionPerServing: r.estimatedNutritionPerServing ?? null,
      ingredients: r.ingredients.map((ing) => ({
        name: ing.name,
        quantity: ing.quantity,
        unit: ing.unit,
        notes: ing.notes,
      })),
      instructions: r.instructions.map((ins) => ({
        step: ins.step,
        text: ins.text,
      })),
    },
    nutrition: r.estimatedNutritionPerServing ?? null,
    healthNotes: r.healthNotes ?? [],
  }))
}

export async function estimateNutrition(recipeId: number, slug: string) {
  const session = await auth()
  if (!session?.user?.id) throw new Error("Unauthorized")

  const recipe = await db.query.recipes.findFirst({ where: eq(recipes.id, recipeId) })
  if (!recipe) throw new Error("Recipe not found")

  const ingredientList = (recipe.ingredients ?? [])
    .map((i) => [i.quantity, i.unit, i.name].filter(Boolean).join(" "))
    .join("\n")

  const client = new OpenAI()
  const response = await client.chat.completions.create({
    model: "gpt-4o-mini",
    tools: [
      {
        type: "function",
        function: {
          name: "estimate_nutrition",
          parameters: {
            type: "object",
            properties: {
              calories: { type: "integer" },
              carbsG: { type: "integer" },
              fiberG: { type: "integer" },
              fatG: { type: "integer" },
              proteinG: { type: "integer" },
            },
            required: ["calories", "carbsG", "fiberG", "fatG", "proteinG"],
          },
        },
      },
    ],
    tool_choice: { type: "function", function: { name: "estimate_nutrition" } },
    messages: [
      {
        role: "system",
        content: "Estimate macros per serving. Be realistic — use standard portions. Return integers.",
      },
      {
        role: "user",
        content: `Recipe: ${recipe.title}\nServings: ${recipe.servings ?? 2}\n\nIngredients:\n${ingredientList}`,
      },
    ],
  })

  const toolCall = response.choices[0]?.message?.tool_calls?.[0]
  if (!toolCall || toolCall.type !== "function") throw new Error("No nutrition returned")

  const nutrition = JSON.parse(toolCall.function.arguments) as NutritionData

  await db.update(recipes).set({ nutritionPerServing: nutrition }).where(eq(recipes.id, recipeId))
  revalidatePath(`/recipes/${slug}`)
  return nutrition
}

export async function createMeal(name: string, description: string | undefined, recipeIds: number[]) {
  const session = await auth()
  if (!session?.user?.id) throw new Error("Unauthorized")

  const [meal] = await db.insert(meals).values({ name, description: description || null }).returning()
  if (recipeIds.length > 0) {
    await db.insert(mealRecipes).values(
      recipeIds.map((recipeId, i) => ({ mealId: meal.id, recipeId, sortOrder: i }))
    )
  }
  revalidatePath("/meals")
  return meal
}

export async function updateMeal(id: number, name: string, description: string | undefined, recipeIds: number[]) {
  const session = await auth()
  if (!session?.user?.id) throw new Error("Unauthorized")

  await db.update(meals).set({ name, description: description || null }).where(eq(meals.id, id))
  await db.delete(mealRecipes).where(eq(mealRecipes.mealId, id))
  if (recipeIds.length > 0) {
    await db.insert(mealRecipes).values(
      recipeIds.map((recipeId, i) => ({ mealId: id, recipeId, sortOrder: i }))
    )
  }
  revalidatePath("/meals")
  revalidatePath(`/meals/${id}`)
}

export async function deleteMeal(id: number) {
  const session = await auth()
  if (!session?.user?.id) throw new Error("Unauthorized")

  await db.delete(meals).where(eq(meals.id, id))
  revalidatePath("/meals")
}

export async function deleteRecipe(id: number, slug: string) {
  const session = await auth()
  if (!session?.user?.id) throw new Error("Unauthorized")

  await db.delete(recipes).where(eq(recipes.id, id))
  revalidatePath("/recipes")
  revalidatePath(`/recipes/${slug}`)
  revalidatePath("/favorites")
}

export async function subscribeToPush(subscription: {
  endpoint: string
  keys: { p256dh: string; auth: string }
}) {
  const session = await auth()
  if (!session?.user?.id) throw new Error("Unauthorized")

  await db
    .insert(pushSubscriptions)
    .values({
      userId: session.user.id,
      endpoint: subscription.endpoint,
      p256dh: subscription.keys.p256dh,
      auth: subscription.keys.auth,
    })
    .onConflictDoNothing()
}

export async function unsubscribeFromPush(endpoint: string) {
  const session = await auth()
  if (!session?.user?.id) throw new Error("Unauthorized")

  await db
    .delete(pushSubscriptions)
    .where(
      and(
        eq(pushSubscriptions.userId, session.user.id),
        eq(pushSubscriptions.endpoint, endpoint)
      )
    )
}

export async function saveUserPreferences(prefs: {
  calorieTarget?: number | null
  breakfastTime?: string
  lunchTime?: string
  snackTime?: string
  dinnerTime?: string
  reminderLeadMin?: number
}) {
  const session = await auth()
  if (!session?.user?.id) throw new Error("Unauthorized")

  await db
    .insert(userPreferences)
    .values({ userId: session.user.id, ...prefs })
    .onConflictDoUpdate({
      target: userPreferences.userId,
      set: { ...prefs, updatedAt: new Date() },
    })

  revalidatePath("/settings")
  revalidatePath("/plan")
}
