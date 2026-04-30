import "dotenv/config"
import * as fs from "fs"
import * as path from "path"
import matter from "gray-matter"
import bcrypt from "bcryptjs"
import { scrapeRecipe } from "../lib/scraper"
import { db } from "../lib/db"
import {
  users,
  recipes,
  mealPlans,
  mealPlanSlots,
  groceryLists,
  groceryItems,
  type Ingredient,
  type Instruction,
} from "../lib/db/schema"
import { slugify } from "../lib/utils"

const MEAL_PREP_DIR = path.join(__dirname, "../../meal-prep")

function parseMinutes(str?: string): number | undefined {
  if (!str) return undefined
  const m = str.match(/(\d+)/)
  return m ? parseInt(m[1]) : undefined
}

function extractSection(content: string, header: string): string {
  const regex = new RegExp(`## ${header}\\s*\\n([\\s\\S]*?)(?=\\n## |$)`, "i")
  const match = content.match(regex)
  return match ? match[1].trim() : ""
}

function parseIngredients(section: string): Ingredient[] {
  return section
    .split("\n")
    .map((l) => l.replace(/^[-*]\s*/, "").trim())
    .filter(Boolean)
    .filter((l) => !l.startsWith("#"))
    .map((name) => ({ name }))
}

function parseInstructions(section: string): Instruction[] {
  return section
    .split("\n")
    .map((l) => l.replace(/^\d+\.\s*/, "").trim())
    .filter(Boolean)
    .filter((l) => !l.startsWith("#"))
    .map((text, i) => ({ step: i + 1, text }))
}

async function seedUsers() {
  const userData = [
    {
      email: process.env.SEED_USER_1_EMAIL!,
      name: process.env.SEED_USER_1_NAME || "Zachary",
      password: process.env.SEED_USER_1_PASSWORD!,
    },
    {
      email: process.env.SEED_USER_2_EMAIL!,
      name: process.env.SEED_USER_2_NAME || "Belinda",
      password: process.env.SEED_USER_2_PASSWORD!,
    },
  ].filter((u) => u.email && u.password)

  for (const u of userData) {
    const passwordHash = await bcrypt.hash(u.password, 12)
    await db
      .insert(users)
      .values({ email: u.email, name: u.name, passwordHash })
      .onConflictDoUpdate({ target: users.email, set: { name: u.name } })
    console.log(`✓ User: ${u.email}`)
  }
}

async function seedRecipes() {
  const dirs = ["breakfast", "lunch", "dinner"] as const
  const inserted: { slug: string; id: number; title: string }[] = []

  for (const dir of dirs) {
    const dirPath = path.join(MEAL_PREP_DIR, "recipes", dir)
    if (!fs.existsSync(dirPath)) continue

    const files = fs.readdirSync(dirPath).filter((f) => f.endsWith(".md"))

    for (const file of files) {
      const raw = fs.readFileSync(path.join(dirPath, file), "utf-8")
      const { data, content } = matter(raw)

      const slug = slugify(data.title || file.replace(".md", ""))
      const ingredientSection = extractSection(content, "Ingredients")
      const instructionSection = extractSection(content, "Instructions")
      const storageSection = extractSection(content, "Storage")
      const notesSection = extractSection(content, "Notes")

      // Description: first non-empty line after frontmatter before first ##
      const descMatch = content.match(/^([^#\n][^\n]+)/)
      const description = descMatch ? descMatch[1].trim() : undefined

      let imageUrl: string | undefined = data.image_url || undefined
      if (data.source) {
        try {
          const scraped = await scrapeRecipe(data.source)
          if (scraped.imageUrl) imageUrl = scraped.imageUrl
        } catch {
          // keep frontmatter fallback
        }
      }

      const [recipe] = await db
        .insert(recipes)
        .values({
          slug,
          title: data.title || slug,
          mealType: dir,
          tags: data.tags || [],
          description,
          prepTimeMin: parseMinutes(data.prep_time),
          cookTimeMin: parseMinutes(data.cook_time),
          totalTimeMin: parseMinutes(data.total_time),
          servings: parseInt(data.servings) || undefined,
          costEstimate: data.cost_estimate || "budget",
          sourceUrl: data.source,
          imageUrl,
          ingredients: parseIngredients(ingredientSection),
          instructions: parseInstructions(instructionSection),
          storageNotes: storageSection || undefined,
          notes: notesSection || undefined,
          fodmapFlags: [],
          addedDate: data.added || new Date().toISOString().split("T")[0],
        })
        .onConflictDoUpdate({ target: recipes.slug, set: { title: data.title, imageUrl } })
        .returning({ id: recipes.id, slug: recipes.slug })

      inserted.push({ slug: recipe.slug, id: recipe.id, title: data.title })
      console.log(`✓ Recipe: ${data.title}`)
    }
  }

  return inserted
}

async function seedMealPlan(
  recipeMap: Map<string, number>
) {
  const planFile = path.join(MEAL_PREP_DIR, "meal-plans", "week-2026-04-30.md")
  if (!fs.existsSync(planFile)) return null

  const content = fs.readFileSync(planFile, "utf-8")

  // Parse week start from filename
  const weekStart = "2026-04-30"

  const [plan] = await db
    .insert(mealPlans)
    .values({ weekStart })
    .onConflictDoUpdate({ target: mealPlans.weekStart, set: { weekStart } })
    .returning()

  // Parse the markdown table rows
  const tableMatch = content.match(/\| Day \|[\s\S]*?\n((?:\|[^\n]+\n?)+)/)
  if (!tableMatch) return plan

  const rows = tableMatch[1]
    .split("\n")
    .filter((l) => l.startsWith("|") && !l.startsWith("|---"))
    .map((l) => l.split("|").map((c) => c.trim()).filter(Boolean))

  // Date map for this week
  const DATE_MAP: Record<string, string> = {
    "Thu Apr 30": "2026-04-30",
    "Fri May 1": "2026-05-01",
    "Sat May 2": "2026-05-02",
    "Sun May 3": "2026-05-03",
    "Mon May 4": "2026-05-04",
    "Tue May 5": "2026-05-05",
    "Wed May 6": "2026-05-06",
  }

  const RECIPE_SLUG_MAP: Record<string, string> = {
    "Egg Muffins": "egg-muffins-spinach-peppers-bacon",
    "Overnight Oats": "overnight-oats-almond-milk",
    "Tuna Salad": "low-fodmap-tuna-salad",
    "Turkey Lettuce Wraps": "asian-turkey-lettuce-wraps",
    "Chicken Cacciatore": "one-pan-chicken-cacciatore",
    "Coconut Chicken Curry": "coconut-chicken-curry",
    "Lemon-Dill Baked Salmon": "lemon-dill-baked-salmon-with-vegetables",
  }

  for (const row of rows) {
    if (row.length < 4) continue
    const [dayCell, breakfastCell, lunchCell, dinnerCell] = row
    const dayKey = dayCell.replace(/\*\*/g, "").replace(/⭐.*$/, "").trim()
    const date = DATE_MAP[dayKey]
    if (!date) continue

    const mealCells: [string, "breakfast" | "lunch" | "dinner"][] = [
      [breakfastCell, "breakfast"],
      [lunchCell, "lunch"],
      [dinnerCell, "dinner"],
    ]

    for (const [cell, mealType] of mealCells) {
      if (!cell || cell === "—") continue
      const recipeName = Object.keys(RECIPE_SLUG_MAP).find((k) =>
        cell.toLowerCase().includes(k.toLowerCase())
      )
      if (!recipeName) continue
      const slug = RECIPE_SLUG_MAP[recipeName]
      const recipeId = recipeMap.get(slug)

      await db.insert(mealPlanSlots).values({
        mealPlanId: plan.id,
        dayDate: date,
        mealType,
        recipeId: recipeId ?? null,
      })
    }
  }

  console.log("✓ Meal plan: week-2026-04-30")
  return plan
}

async function seedGroceryList(planId: number) {
  const listFile = path.join(MEAL_PREP_DIR, "grocery-lists", "week-2026-04-30.md")
  if (!fs.existsSync(listFile)) return

  const content = fs.readFileSync(listFile, "utf-8")
  const weekStart = "2026-04-30"

  const [list] = await db
    .insert(groceryLists)
    .values({ mealPlanId: planId, weekStart })
    .returning()

  // Parse sections (## Category) and checkboxes (- [ ] item)
  const sections = content.split(/^## /m).slice(1)

  for (const section of sections) {
    const lines = section.split("\n")
    const category = lines[0].trim()
    if (!category || category.includes("Estimated") || category.includes("Store")) continue

    const itemLines = lines.filter((l) => l.match(/^- \[[ x]\]/))
    for (const line of itemLines) {
      const itemText = line.replace(/^- \[[ x]\]\s*/, "").trim()
      if (!itemText) continue

      // Try to extract quantity: "3 red bell peppers" → qty="3", name="red bell peppers"
      const qtyMatch = itemText.match(/^([\d–\-\/]+(?:\s+\w+)?)\s+(.+)$/)
      let name = itemText
      let quantity: string | undefined

      if (qtyMatch && !isNaN(parseFloat(qtyMatch[1]))) {
        quantity = qtyMatch[1]
        name = qtyMatch[2]
      }

      // Strip notes in parentheses from name
      name = name.replace(/\s*—.*$/, "").replace(/\s*\(.*?\)$/, "").trim()

      await db.insert(groceryItems).values({
        groceryListId: list.id,
        name,
        quantity: quantity ?? null,
        category,
        checked: false,
      })
    }
  }

  console.log("✓ Grocery list: week-2026-04-30")
}

async function main() {
  console.log("Seeding database…\n")

  await seedUsers()
  const insertedRecipes = await seedRecipes()
  const recipeMap = new Map(insertedRecipes.map((r) => [r.slug, r.id]))

  const plan = await seedMealPlan(recipeMap)
  if (plan) {
    await seedGroceryList(plan.id)
  }

  console.log("\nDone!")
  process.exit(0)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
