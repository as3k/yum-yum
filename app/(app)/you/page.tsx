import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import YouPageClient from "@/components/you-page-client"
import Link from "next/link"
import { ChevronLeft } from "lucide-react"

export default async function YouPage() {
  const session = await auth()
  if (!session?.user?.id) redirect("/login")

  const firstName = session.user.name?.split(" ")[0] ?? "You"
  const email = session.user.email ?? ""

  return (
    <div className="max-w-2xl mx-auto px-4 pt-8 pb-6">
      <div className="flex items-center gap-2 mb-6">
        <Link href="/today" className="text-muted-foreground hover:text-foreground transition-colors -ml-3 p-2">
          <ChevronLeft size={20} />
        </Link>
        <h1 className="text-2xl font-bold tracking-tight">You</h1>
      </div>
      <YouPageClient firstName={firstName} email={email} />
    </div>
  )
}
