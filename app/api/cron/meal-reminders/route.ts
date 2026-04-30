import { NextRequest, NextResponse } from "next/server"
import webpush from "web-push"
import { db } from "@/lib/db"
import { userPreferences, pushSubscriptions } from "@/lib/db/schema"
import { eq } from "drizzle-orm"

const MEAL_TIMES = ["breakfastTime", "lunchTime", "snackTime", "dinnerTime"] as const
const MEAL_LABELS: Record<string, string> = {
  breakfastTime: "Breakfast",
  lunchTime: "Lunch",
  snackTime: "Snack",
  dinnerTime: "Dinner",
}
const MEAL_EMOJIS: Record<string, string> = {
  breakfastTime: "🍳",
  lunchTime: "🥗",
  snackTime: "🍎",
  dinnerTime: "🍽",
}

export async function GET(req: NextRequest) {
  if (req.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const pubKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
  const privKey = process.env.VAPID_PRIVATE_KEY
  if (!pubKey || !privKey) return NextResponse.json({ ok: true, sent: 0, reason: "vapid not configured" })
  webpush.setVapidDetails(`mailto:${process.env.VAPID_SUBJECT ?? "admin@example.com"}`, pubKey, privKey)

  const now = new Date()
  const nowMinutes = now.getHours() * 60 + now.getMinutes()

  const allPrefs = await db.query.userPreferences.findMany()

  let sent = 0
  for (const prefs of allPrefs) {
    const lead = prefs.reminderLeadMin ?? 30
    for (const key of MEAL_TIMES) {
      const timeStr = prefs[key]
      if (!timeStr) continue
      const [h, m] = timeStr.split(":").map(Number)
      const mealMinutes = h * 60 + m
      const targetMinutes = mealMinutes - lead

      // Fire if we're within a 15-min window of the target reminder time
      if (Math.abs(nowMinutes - targetMinutes) > 7) continue

      const subs = await db.query.pushSubscriptions.findMany({
        where: eq(pushSubscriptions.userId, prefs.userId),
      })

      const label = MEAL_LABELS[key]
      const emoji = MEAL_EMOJIS[key]
      const body = lead > 0
        ? `${label} in ${lead} min ${emoji}`
        : `${label} time! ${emoji}`

      await Promise.allSettled(
        subs.map((sub) =>
          webpush.sendNotification(
            { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
            JSON.stringify({ title: "Yum Yum 🌱", body, url: "/plan" })
          )
        )
      )
      sent += subs.length
    }
  }

  return NextResponse.json({ ok: true, sent })
}
