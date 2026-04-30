import { db } from "@/lib/db"
import { userPreferences } from "@/lib/db/schema"
import { eq } from "drizzle-orm"
import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import SettingsForm from "@/components/settings-form"
import Link from "next/link"
import { ChevronLeft } from "lucide-react"

export default async function SettingsPage() {
  const session = await auth()
  if (!session?.user?.id) redirect("/login")

  const prefs = await db.query.userPreferences.findFirst({
    where: eq(userPreferences.userId, session.user.id),
  })

  return (
    <div className="max-w-2xl mx-auto px-4 pt-8 pb-6">
      <div className="mb-6">
        <Link href="/you" className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors mb-4">
          <ChevronLeft size={16} />
          You
        </Link>
        <h1 className="text-xl font-semibold tracking-tight">Meal preferences</h1>
      </div>
      <SettingsForm
        initialValues={{
          calorieTarget: prefs?.calorieTarget ?? null,
          breakfastTime: prefs?.breakfastTime ?? "08:00",
          lunchTime: prefs?.lunchTime ?? "12:30",
          snackTime: prefs?.snackTime ?? "15:00",
          dinnerTime: prefs?.dinnerTime ?? "18:30",
          reminderLeadMin: prefs?.reminderLeadMin ?? 30,
        }}
      />
    </div>
  )
}
