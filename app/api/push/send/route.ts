import { NextRequest, NextResponse } from "next/server"
import webpush from "web-push"
import { db } from "@/lib/db"
import { pushSubscriptions } from "@/lib/db/schema"
import { eq } from "drizzle-orm"

webpush.setVapidDetails(
  `mailto:${process.env.VAPID_SUBJECT ?? "admin@example.com"}`,
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!
)

export async function POST(req: NextRequest) {
  const secret = req.headers.get("x-push-secret")
  if (secret !== process.env.PUSH_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { userId, title, body, url } = await req.json()

  const subs = userId
    ? await db.query.pushSubscriptions.findMany({ where: eq(pushSubscriptions.userId, userId) })
    : await db.query.pushSubscriptions.findMany()

  const results = await Promise.allSettled(
    subs.map((sub) =>
      webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        JSON.stringify({ title, body, url: url ?? "/plan" })
      )
    )
  )

  const failed = results.filter((r) => r.status === "rejected").length
  return NextResponse.json({ sent: results.length - failed, failed })
}
