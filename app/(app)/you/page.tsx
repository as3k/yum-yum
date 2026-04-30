import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import YouPageClient from "@/components/you-page-client"

export default async function YouPage() {
  const session = await auth()
  if (!session?.user?.id) redirect("/login")

  const firstName = session.user.name?.split(" ")[0] ?? "You"
  const email = session.user.email ?? ""

  return (
    <div className="max-w-2xl mx-auto px-4 pt-2 pb-6">
      <YouPageClient firstName={firstName} email={email} />
    </div>
  )
}
