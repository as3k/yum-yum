import { db } from "@/lib/db"
import { waitlist } from "@/lib/db/schema"
import { desc } from "drizzle-orm"
import { approveWaitlistEntry, rejectWaitlistEntry } from "@/lib/actions"
import Link from "next/link"

export default async function WaitlistPage() {
  const entries = await db.query.waitlist.findMany({
    orderBy: [desc(waitlist.createdAt)],
  })

  const pending = entries.filter((e) => e.status === "pending")
  const approved = entries.filter((e) => e.status === "approved")
  const others = entries.filter((e) => e.status !== "pending" && e.status !== "approved")

  return (
    <div className="max-w-3xl mx-auto px-4 pt-8 pb-12">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-semibold">Waitlist</h1>
        <Link href="/today" className="text-sm text-muted-foreground hover:text-foreground transition-colors">← App</Link>
      </div>

      <Section title="Pending" count={pending.length}>
        {pending.map((entry) => (
          <EntryRow key={entry.id} entry={entry} showActions />
        ))}
        {pending.length === 0 && <p className="text-sm text-muted-foreground py-3">All clear</p>}
      </Section>

      <Section title="Approved (awaiting signup)" count={approved.length}>
        {approved.map((entry) => (
          <EntryRow key={entry.id} entry={entry} />
        ))}
        {approved.length === 0 && <p className="text-sm text-muted-foreground py-3">None</p>}
      </Section>

      <Section title="Rejected / Activated" count={others.length}>
        {others.map((entry) => (
          <EntryRow key={entry.id} entry={entry} />
        ))}
        {others.length === 0 && <p className="text-sm text-muted-foreground py-3">None</p>}
      </Section>
    </div>
  )
}

function Section({ title, count, children }: { title: string; count: number; children: React.ReactNode }) {
  return (
    <div className="mb-8">
      <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide mb-3">
        {title} {count > 0 && <span className="text-foreground">({count})</span>}
      </h2>
      <div className="rounded-lg border border-border divide-y divide-border">{children}</div>
    </div>
  )
}

function EntryRow({
  entry,
  showActions,
}: {
  entry: typeof waitlist.$inferSelect
  showActions?: boolean
}) {
  return (
    <div className="flex items-start justify-between gap-4 px-4 py-3">
      <div className="min-w-0">
        <p className="text-sm font-medium">{entry.name ?? "—"}</p>
        <p className="text-xs text-muted-foreground">{entry.email}</p>
        {entry.message && (
          <p className="text-xs text-muted-foreground mt-1 italic">"{entry.message}"</p>
        )}
        <p className="text-xs text-muted-foreground mt-1">
          {new Date(entry.createdAt).toLocaleDateString()} · {entry.status}
        </p>
      </div>
      {showActions && (
        <div className="flex gap-2 shrink-0 pt-0.5">
          <form action={approveWaitlistEntry.bind(null, entry.id)}>
            <button
              type="submit"
              className="h-7 px-3 bg-accent text-white text-xs font-medium rounded hover:opacity-80 transition-opacity"
            >
              Approve
            </button>
          </form>
          <form action={rejectWaitlistEntry.bind(null, entry.id)}>
            <button
              type="submit"
              className="h-7 px-3 border border-border text-xs font-medium rounded hover:bg-muted transition-colors"
            >
              Reject
            </button>
          </form>
        </div>
      )}
    </div>
  )
}
