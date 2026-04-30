import Link from "next/link"

export default function SignupPendingPage() {
  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-background">
      <div className="w-full max-w-sm text-center space-y-4">
        <div className="text-4xl">🍽️</div>
        <h1 className="text-2xl font-semibold tracking-tight">You're on the list!</h1>
        <p className="text-muted-foreground text-sm">
          We'll email you when your spot is ready. Keep an eye on your inbox.
        </p>
        <Link href="/login" className="inline-block text-sm text-muted-foreground underline underline-offset-2">
          Back to sign in
        </Link>
      </div>
    </div>
  )
}
