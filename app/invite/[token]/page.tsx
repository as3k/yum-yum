import { db } from "@/lib/db"
import { waitlist } from "@/lib/db/schema"
import { eq } from "drizzle-orm"
import ActivateForm from "./activate-form"

export default async function InvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params

  const entry = await db.query.waitlist.findFirst({
    where: eq(waitlist.inviteToken, token),
  })

  if (!entry || entry.status !== "approved") {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 bg-background">
        <div className="w-full max-w-sm text-center space-y-3">
          <h1 className="text-xl font-semibold">Invalid invite link</h1>
          <p className="text-sm text-muted-foreground">This link is invalid, already used, or expired.</p>
        </div>
      </div>
    )
  }

  if (entry.tokenExpiresAt && entry.tokenExpiresAt < new Date()) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 bg-background">
        <div className="w-full max-w-sm text-center space-y-3">
          <h1 className="text-xl font-semibold">Invite expired</h1>
          <p className="text-sm text-muted-foreground">This invite link has expired. Contact us to get a new one.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-background">
      <div className="w-full max-w-sm space-y-8">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Set your password</h1>
          <p className="text-muted-foreground mt-1 text-sm">Welcome, {entry.name ?? entry.email}! Choose a password to activate your account.</p>
        </div>
        <ActivateForm token={token} />
      </div>
    </div>
  )
}
