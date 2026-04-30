"use client"

import { useState } from "react"
import { joinHousehold, regenerateInviteCode } from "@/lib/actions"
import { Check, Copy, RefreshCw, Users } from "lucide-react"

type Member = { name: string; email: string; role: string }

interface Props {
  household: { id: string; name: string; inviteCode: string } | null
  members: Member[]
  isOwner: boolean
}

export default function HouseholdSettingsClient({ household, members, isOwner }: Props) {
  const [copied, setCopied] = useState(false)
  const [joinCode, setJoinCode] = useState("")
  const [joinError, setJoinError] = useState("")
  const [joinSuccess, setJoinSuccess] = useState("")
  const [joining, setJoining] = useState(false)
  const [regenerating, setRegenerating] = useState(false)

  async function handleCopy() {
    if (!household) return
    await navigator.clipboard.writeText(household.inviteCode)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  async function handleJoin(e: React.FormEvent) {
    e.preventDefault()
    if (!joinCode.trim()) return
    setJoining(true)
    setJoinError("")
    setJoinSuccess("")
    try {
      await joinHousehold(joinCode.trim())
      setJoinSuccess("Joined! Sign out and back in to see shared content.")
      setJoinCode("")
    } catch (err) {
      setJoinError(err instanceof Error ? err.message : "Failed to join")
    } finally {
      setJoining(false)
    }
  }

  async function handleRegenerate() {
    if (!confirm("Generate a new invite code? The current code will stop working.")) return
    setRegenerating(true)
    try {
      await regenerateInviteCode()
    } finally {
      setRegenerating(false)
    }
  }

  if (!household) {
    return (
      <div className="space-y-6">
        <div className="rounded-lg border border-border p-4 bg-muted/30">
          <div className="flex items-center gap-2 mb-2">
            <Users size={16} className="text-muted-foreground" />
            <p className="text-sm font-medium">No household</p>
          </div>
          <p className="text-sm text-muted-foreground">You're not part of a household yet. Enter an invite code to join one.</p>
        </div>
        <JoinForm
          joinCode={joinCode}
          setJoinCode={setJoinCode}
          joining={joining}
          joinError={joinError}
          joinSuccess={joinSuccess}
          onSubmit={handleJoin}
        />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-border p-4">
        <p className="text-xs text-muted-foreground uppercase tracking-wide mb-3">Invite code</p>
        <div className="flex items-center gap-3">
          <code className="flex-1 text-2xl font-mono font-bold tracking-widest">{household.inviteCode}</code>
          <button
            onClick={handleCopy}
            className="flex items-center gap-1.5 h-8 px-3 rounded border border-border text-sm hover:bg-muted transition-colors"
          >
            {copied ? <Check size={14} className="text-green-600" /> : <Copy size={14} />}
            {copied ? "Copied" : "Copy"}
          </button>
          {isOwner && (
            <button
              onClick={handleRegenerate}
              disabled={regenerating}
              className="h-8 w-8 flex items-center justify-center rounded border border-border hover:bg-muted transition-colors disabled:opacity-50"
              title="Regenerate code"
            >
              <RefreshCw size={14} className={regenerating ? "animate-spin" : ""} />
            </button>
          )}
        </div>
        <p className="text-xs text-muted-foreground mt-2">Share this code with people you want to invite</p>
      </div>

      <div>
        <h2 className="text-sm font-medium mb-3">Members</h2>
        <div className="rounded-lg border border-border divide-y divide-border">
          {members.map((member) => (
            <div key={member.email} className="flex items-center justify-between px-4 py-3">
              <div>
                <p className="text-sm font-medium">{member.name}</p>
                <p className="text-xs text-muted-foreground">{member.email}</p>
              </div>
              <span className="text-xs text-muted-foreground capitalize">{member.role}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="pt-2 border-t border-border space-y-3">
        <div>
          <h2 className="text-sm font-medium">Join a different household</h2>
          <p className="text-xs text-muted-foreground mt-0.5">Entering a new code will move you to that household.</p>
        </div>
        <JoinForm
          joinCode={joinCode}
          setJoinCode={setJoinCode}
          joining={joining}
          joinError={joinError}
          joinSuccess={joinSuccess}
          onSubmit={handleJoin}
        />
      </div>
    </div>
  )
}

function JoinForm({
  joinCode,
  setJoinCode,
  joining,
  joinError,
  joinSuccess,
  onSubmit,
}: {
  joinCode: string
  setJoinCode: (v: string) => void
  joining: boolean
  joinError: string
  joinSuccess: string
  onSubmit: (e: React.FormEvent) => void
}) {
  return (
    <div className="space-y-2">
      <form onSubmit={onSubmit} className="flex gap-2">
        <input
          value={joinCode}
          onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
          placeholder="Enter code (e.g. X7K2P)"
          maxLength={8}
          className="flex-1 h-9 px-3 rounded border border-border bg-background text-sm font-mono"
        />
        <button
          type="submit"
          disabled={joining || !joinCode.trim()}
          className="h-9 px-4 bg-accent text-white rounded text-sm font-medium hover:opacity-80 transition-opacity disabled:opacity-50"
        >
          {joining ? "Joining…" : "Join"}
        </button>
      </form>
      {joinError && <p className="text-sm text-red-500">{joinError}</p>}
      {joinSuccess && <p className="text-sm text-green-600">{joinSuccess}</p>}
    </div>
  )
}
