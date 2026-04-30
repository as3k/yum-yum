"use client"

import { AlertTriangle, Check, SkipForward } from "lucide-react"
import type { Violation } from "@/lib/fodmap-checker"

export default function ViolationsPanel({
  violations,
  onFix,
  onSkip,
}: {
  violations: Violation[]
  onFix: (index: number, suggestion: string) => void
  onSkip: (index: number) => void
}) {
  if (violations.length === 0) return null

  return (
    <div className="border border-border rounded-lg overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-3 bg-muted border-b border-border">
        <AlertTriangle size={14} className="shrink-0" />
        <span className="text-sm font-medium">
          {violations.length} thing{violations.length > 1 ? "s" : ""} to look at
        </span>
        <span className="text-xs text-muted-foreground">FODMAP / carb flags</span>
      </div>

      <div className="divide-y divide-border">
        {violations.map((v, i) => (
          <div key={i} className="px-4 py-3 space-y-1.5">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="text-sm font-medium truncate">{v.ingredient}</p>
                <p className="text-xs text-muted-foreground">{v.reason}</p>
              </div>
              <span
                className={`shrink-0 text-xs px-1.5 py-0.5 rounded ${
                  v.type === "fodmap"
                    ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                    : "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400"
                }`}
              >
                {v.type}
              </span>
            </div>

            {v.suggestion && (
              <p className="text-xs text-muted-foreground">
                Try this: <span className="text-foreground">{v.suggestion}</span>
              </p>
            )}

            <div className="flex gap-2 pt-0.5">
              {v.suggestion && (
                <button
                  onClick={() => onFix(i, v.suggestion!)}
                  className="flex items-center gap-1 text-xs font-medium px-2 py-1 bg-accent text-white rounded hover:opacity-80 transition-opacity"
                >
                  <Check size={11} />
                  Apply fix
                </button>
              )}
              <button
                onClick={() => onSkip(i)}
                className="flex items-center gap-1 text-xs font-medium px-2 py-1 bg-muted text-muted-foreground rounded hover:text-foreground transition-colors"
              >
                <SkipForward size={11} />
                Skip for now
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
