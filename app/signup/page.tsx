"use client"

import { useState } from "react"
import { submitWaitlist } from "@/lib/actions"
import Link from "next/link"

export default function SignupPage() {
  const [pending, setPending] = useState(false)
  const [error, setError] = useState("")

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setPending(true)
    setError("")
    const fd = new FormData(e.currentTarget)
    try {
      await submitWaitlist(fd)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong")
      setPending(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-background">
      <div className="w-full max-w-sm space-y-8">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Request access</h1>
          <p className="text-muted-foreground mt-1 text-sm">We'll reach out when a spot opens up.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label htmlFor="name" className="text-sm font-medium">Name</label>
            <input
              id="name"
              name="name"
              type="text"
              required
              autoComplete="name"
              className="w-full h-11 px-3 bg-muted border border-border rounded text-sm focus:outline-none focus:ring-1 focus:ring-foreground"
            />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="email" className="text-sm font-medium">Email</label>
            <input
              id="email"
              name="email"
              type="email"
              required
              autoComplete="email"
              className="w-full h-11 px-3 bg-muted border border-border rounded text-sm focus:outline-none focus:ring-1 focus:ring-foreground"
            />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="message" className="text-sm font-medium">
              Why do you want in? <span className="text-muted-foreground font-normal">(optional)</span>
            </label>
            <textarea
              id="message"
              name="message"
              rows={3}
              className="w-full px-3 py-2 bg-muted border border-border rounded text-sm focus:outline-none focus:ring-1 focus:ring-foreground resize-none"
            />
          </div>

          {error && <p className="text-sm text-red-500">{error}</p>}

          <button
            type="submit"
            disabled={pending}
            className="w-full h-11 bg-accent text-white text-sm font-medium rounded hover:opacity-80 transition-opacity disabled:opacity-40"
          >
            {pending ? "Submitting…" : "Request access"}
          </button>
        </form>

        <p className="text-center text-sm text-muted-foreground">
          Already have an account?{" "}
          <Link href="/login" className="underline underline-offset-2 text-foreground">Sign in</Link>
        </p>
      </div>
    </div>
  )
}
