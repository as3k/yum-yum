import { NextRequest, NextResponse } from "next/server"
import OpenAI from "openai"
import { auth } from "@/lib/auth"

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

  return NextResponse.json({ ingredients })
}
