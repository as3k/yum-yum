import { db } from "@/lib/db"
import { households, householdMembers, users } from "@/lib/db/schema"
import { eq } from "drizzle-orm"
import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import Link from "next/link"
import { ChevronLeft } from "lucide-react"
import HouseholdSettingsClient from "@/components/household-settings-client"

export default async function HouseholdSettingsPage() {
  const session = await auth()
  if (!session?.user?.id) redirect("/login")

  const userId = session.user.id
  const householdId = session.user.householdId

  let householdData: { id: string; name: string; inviteCode: string } | null = null
  let members: Array<{ name: string; email: string; role: string; userId: string }> = []
  let isOwner = false

  if (householdId) {
    const [household, memberRows] = await Promise.all([
      db.query.households.findFirst({ where: eq(households.id, householdId) }),
      db
        .select({
          name: users.name,
          email: users.email,
          role: householdMembers.role,
          userId: householdMembers.userId,
        })
        .from(householdMembers)
        .innerJoin(users, eq(householdMembers.userId, users.id))
        .where(eq(householdMembers.householdId, householdId)),
    ])

    if (household) {
      householdData = { id: household.id, name: household.name, inviteCode: household.inviteCode }
    }
    members = memberRows
    isOwner = memberRows.find((m) => m.userId === userId)?.role === "owner"
  }

  return (
    <div className="max-w-2xl mx-auto px-4 pt-8 pb-6">
      <div className="mb-6">
        <Link
          href="/you"
          className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors mb-4"
        >
          <ChevronLeft size={16} />
          You
        </Link>
        <h1 className="text-xl font-semibold tracking-tight">Household</h1>
      </div>
      <HouseholdSettingsClient
        household={householdData}
        members={members.map(({ name, email, role }) => ({ name, email, role }))}
        isOwner={isOwner}
      />
    </div>
  )
}
