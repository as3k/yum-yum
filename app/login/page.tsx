"use client"

import { signIn } from "next-auth/react"
import { useRouter, useSearchParams } from "next/navigation"
import { useState } from "react"

export default function LoginPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const activated = searchParams.get("activated") === "1"
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError("")

    const fd = new FormData(e.currentTarget)
    const result = await signIn("credentials", {
      email: fd.get("email"),
      password: fd.get("password"),
      redirect: false,
    })

    if (result?.error) {
      setError("Hmm, those don't match. Give it another go!")
      setLoading(false)
    } else {
      router.push("/today")
      router.refresh()
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-background">
      <div className="w-full max-w-sm space-y-10">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">YumYum</h1>
          <p className="text-muted-foreground mt-1 text-sm">Ready to eat well this week?</p>
        </div>

        {activated && (
          <div className="rounded-lg bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 px-4 py-3">
            <p className="text-sm text-green-800 dark:text-green-200 font-medium">Account activated! Sign in to get started.</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label htmlFor="email" className="text-sm font-medium text-foreground">
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              autoComplete="email"
              className="w-full h-11 px-3 bg-muted border border-border rounded text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-foreground"
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="password" className="text-sm font-medium text-foreground">
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              autoComplete="current-password"
              className="w-full h-11 px-3 bg-muted border border-border rounded text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-foreground"
            />
          </div>

          {error && (
            <p className="text-sm text-red-500 dark:text-red-400">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full h-11 bg-accent text-white text-sm font-medium rounded transition-opacity hover:opacity-80 disabled:opacity-40"
          >
            {loading ? "On my way…" : "Let's go"}
          </button>
        </form>

        <p className="text-center text-sm text-muted-foreground">
          Don't have an account?{" "}
          <a href="/signup" className="underline underline-offset-2 text-foreground">Request access</a>
        </p>
      </div>
    </div>
  )
}
