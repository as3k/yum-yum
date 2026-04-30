import * as cheerio from "cheerio"

export interface ParsedRecipe {
  title: string
  description?: string
  imageUrl?: string
  ingredients: string[]
  instructions: string[]
  prepTimeMin?: number
  cookTimeMin?: number
  totalTimeMin?: number
  servings?: number
  sourceUrl: string
}

function parseDuration(duration?: string): number | undefined {
  if (!duration) return undefined
  const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/)
  if (!match) return undefined
  const hours = parseInt(match[1] || "0")
  const minutes = parseInt(match[2] || "0")
  return hours * 60 + minutes || undefined
}

function extractImage(image: unknown): string | undefined {
  if (!image) return undefined
  if (typeof image === "string") return image
  if (Array.isArray(image)) {
    const first = image[0]
    if (typeof first === "string") return first
    if (first && typeof first === "object" && "url" in first) return (first as { url: string }).url
  }
  if (typeof image === "object" && image !== null && "url" in image) {
    return (image as { url: string }).url
  }
  return undefined
}

function extractInstructions(raw: unknown): string[] {
  if (!raw) return []
  if (typeof raw === "string") return [raw]
  if (Array.isArray(raw)) {
    return raw.flatMap((item) => {
      if (typeof item === "string") return [item]
      if (item && typeof item === "object") {
        if ("text" in item) return [(item as { text: string }).text]
        if ("itemListElement" in item) return extractInstructions((item as { itemListElement: unknown[] }).itemListElement)
      }
      return []
    })
  }
  return []
}

function parseJsonLdRecipe(recipe: Record<string, unknown>, url: string): ParsedRecipe {
  return {
    title: (recipe.name as string) || "Untitled Recipe",
    description: recipe.description as string | undefined,
    imageUrl: extractImage(recipe.image),
    ingredients: (recipe.recipeIngredient as string[]) || [],
    instructions: extractInstructions(recipe.recipeInstructions),
    prepTimeMin: parseDuration(recipe.prepTime as string),
    cookTimeMin: parseDuration(recipe.cookTime as string),
    totalTimeMin: parseDuration(recipe.totalTime as string),
    servings: parseInt(
      (typeof recipe.recipeYield === "string"
        ? recipe.recipeYield
        : Array.isArray(recipe.recipeYield)
        ? recipe.recipeYield[0]
        : "") || "0"
    ) || undefined,
    sourceUrl: url,
  }
}

function findRecipeInLd(data: unknown): Record<string, unknown> | null {
  if (!data || typeof data !== "object") return null
  const obj = data as Record<string, unknown>
  if (obj["@type"] === "Recipe") return obj
  if (Array.isArray(obj["@type"]) && (obj["@type"] as string[]).includes("Recipe")) return obj
  if (obj["@graph"] && Array.isArray(obj["@graph"])) {
    for (const item of obj["@graph"] as unknown[]) {
      const found = findRecipeInLd(item)
      if (found) return found
    }
  }
  return null
}

function parseFallback($: cheerio.CheerioAPI, url: string): ParsedRecipe {
  const title =
    $('h1.recipe-title, h1.wprm-recipe-name, h1.tasty-recipes-title, h1')
      .first()
      .text()
      .trim() ||
    $('meta[property="og:title"]').attr("content") ||
    "Untitled Recipe"

  const description =
    $('meta[property="og:description"]').attr("content") ||
    $('.recipe-description, .wprm-recipe-summary').first().text().trim() ||
    undefined

  const imageUrl =
    $('meta[property="og:image"]').attr("content") ||
    $('.recipe-image img, .wprm-recipe-image img').first().attr("src") ||
    undefined

  const ingredients: string[] = []
  $(".wprm-recipe-ingredient, .tasty-recipe-ingredients li, .recipe-ingredient, .ingredients li").each((_, el) => {
    const text = $(el).text().trim()
    if (text) ingredients.push(text)
  })

  const instructions: string[] = []
  $(".wprm-recipe-instruction-text, .tasty-recipe-instructions li, .recipe-instruction, .instructions li").each((_, el) => {
    const text = $(el).text().trim()
    if (text) instructions.push(text)
  })

  return { title, description, imageUrl, ingredients, instructions, sourceUrl: url }
}

export async function scrapeRecipe(url: string): Promise<ParsedRecipe> {
  const res = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/120 Safari/537.36",
      Accept: "text/html,application/xhtml+xml",
    },
    signal: AbortSignal.timeout(15000),
  })

  if (!res.ok) throw new Error(`Failed to fetch: ${res.status} ${res.statusText}`)

  const html = await res.text()
  const $ = cheerio.load(html)

  const ldScripts = $('script[type="application/ld+json"]')
  for (let i = 0; i < ldScripts.length; i++) {
    try {
      const raw = JSON.parse($(ldScripts[i]).html() || "")
      const recipe = findRecipeInLd(raw)
      if (recipe) return parseJsonLdRecipe(recipe, url)
    } catch {
      // skip malformed JSON-LD
    }
  }

  return parseFallback($, url)
}
