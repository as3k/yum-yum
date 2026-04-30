import { db } from "@/lib/db"
import { userPreferences } from "@/lib/db/schema"
import { eq } from "drizzle-orm"
import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import SettingsForm from "@/components/settings-form"

export default async function SettingsPage() {
  const session = await auth()
  if (!session?.user?.id) redirect("/login")

  const prefs = await db.query.userPreferences.findFirst({
    where: eq(userPreferences.userId, session.user.id),
  })

  return (
    <div className="max-w-2xl mx-auto px-4 pt-8 pb-6">
      <h1 className="text-xl font-semibold tracking-tight mb-6">Settings</h1>
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
