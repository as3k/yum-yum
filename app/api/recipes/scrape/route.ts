import { NextRequest } from "next/server"
import { auth } from "@/lib/auth"
import { scrapeRecipe } from "@/lib/scraper"
import { checkViolations } from "@/lib/fodmap-checker"

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 })
  }

  const body = await req.json()
  const { url } = body

  if (!url || typeof url !== "string") {
    return Response.json({ error: "url is required" }, { status: 400 })
  }

  let parsedUrl: URL
  try {
    parsedUrl = new URL(url)
    if (!["http:", "https:"].includes(parsedUrl.protocol)) throw new Error()
  } catch {
    return Response.json({ error: "Invalid URL" }, { status: 400 })
  }

  try {
    const parsed = await scrapeRecipe(url)
    const violations = checkViolations(parsed.ingredients)

    return Response.json({ recipe: parsed, violations })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to scrape recipe"
    return Response.json({ error: message }, { status: 422 })
  }
}
