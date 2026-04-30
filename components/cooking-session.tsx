"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { ChevronLeft, ChevronRight, Play, Pause, RotateCcw, Check, X } from "lucide-react"
import type { Ingredient, Instruction } from "@/lib/db/schema"

type Phase = "ingredients" | "steps"

function formatTimer(s: number) {
  const m = Math.floor(s / 60)
  const sec = s % 60
  return `${m}:${sec.toString().padStart(2, "0")}`
}

export default function CookingSession({
  slug,
  title,
  ingredients,
  instructions,
}: {
  slug: string
  title: string
  ingredients: Ingredient[]
  instructions: Instruction[]
}) {
  const router = useRouter()
  const [phase, setPhase] = useState<Phase>("ingredients")
  const [checked, setChecked] = useState<Set<number>>(new Set())
  const [stepIndex, setStepIndex] = useState(0)
  const [seconds, setSeconds] = useState(0)
  const [running, setRunning] = useState(false)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    if (running) {
      intervalRef.current = setInterval(() => setSeconds((s) => s + 1), 1000)
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [running])

  function goToStep(index: number) {
    setStepIndex(index)
    setSeconds(0)
    setRunning(false)
  }

  function toggleIngredient(i: number) {
    setChecked((prev) => {
      const next = new Set(prev)
      if (next.has(i)) next.delete(i)
      else next.add(i)
      return next
    })
  }

  if (phase === "ingredients") {
    const remaining = ingredients.length - checked.size
    return (
      <div className="fixed inset-0 z-50 flex flex-col bg-background overflow-y-auto">
        <div className="sticky top-0 z-10 flex items-center gap-3 px-4 h-14 border-b border-border bg-background shrink-0">
          <button
            onClick={() => router.back()}
            className="text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Exit cook mode"
          >
            <X size={18} />
          </button>
          <div className="flex-1 min-w-0">
            <p className="text-xs text-muted-foreground">Cooking</p>
            <p className="text-sm font-medium truncate">{title}</p>
          </div>
          <span className="text-xs px-2 py-1 bg-muted rounded text-muted-foreground">
            Ingredients
          </span>
        </div>

        <div className="flex-1 px-4 pt-4 pb-2">
          <p className="text-xs text-muted-foreground mb-3">Gather everything first, then we cook!</p>
          <div className="space-y-2">
            {ingredients.map((ing, i) => (
              <button
                key={i}
                onClick={() => toggleIngredient(i)}
                className={`w-full flex items-center gap-3 p-3 rounded-lg border text-left transition-colors ${
                  checked.has(i)
                    ? "border-border bg-muted opacity-50"
                    : "border-border bg-background"
                }`}
              >
                <div
                  className={`w-5 h-5 rounded border shrink-0 flex items-center justify-center transition-colors ${
                    checked.has(i)
                      ? "bg-foreground border-foreground"
                      : "border-muted-foreground"
                  }`}
                >
                  {checked.has(i) && <Check size={11} className="text-background" />}
                </div>
                <span className={`text-sm leading-snug ${checked.has(i) ? "line-through text-muted-foreground" : ""}`}>
                  {ing.quantity && `${ing.quantity} `}
                  {ing.unit && `${ing.unit} `}
                  {ing.name}
                  {ing.notes && <span className="text-muted-foreground"> ({ing.notes})</span>}
                </span>
              </button>
            ))}
          </div>
        </div>

        <div className="sticky bottom-0 px-4 pt-3 pb-8 bg-background border-t border-border shrink-0">
          {remaining > 0 && (
            <p className="text-xs text-center text-muted-foreground mb-3">
              {remaining} more to grab
            </p>
          )}
          <button
            onClick={() => {
              setPhase("steps")
              setStepIndex(0)
            }}
            className="w-full h-12 bg-foreground text-background text-sm font-medium rounded flex items-center justify-center gap-2 hover:opacity-80 transition-opacity"
          >
            {checked.size === ingredients.length ? "Ready! Let's cook" : "Skip ahead to steps"}
            <ChevronRight size={16} />
          </button>
        </div>
      </div>
    )
  }

  const step = instructions[stepIndex]
  const isFirst = stepIndex === 0
  const isLast = stepIndex === instructions.length - 1

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background">
      <div className="sticky top-0 z-10 flex items-center gap-3 px-4 h-14 border-b border-border bg-background shrink-0">
        <button
          onClick={() => setPhase("ingredients")}
          className="text-muted-foreground hover:text-foreground transition-colors"
          aria-label="Back to ingredients"
        >
          <ChevronLeft size={18} />
        </button>
        <div className="flex-1 min-w-0">
          <p className="text-xs text-muted-foreground">
            Step {stepIndex + 1} of {instructions.length}
          </p>
          <p className="text-sm font-medium truncate">{title}</p>
        </div>
        <button
          onClick={() => router.back()}
          className="text-muted-foreground hover:text-foreground transition-colors"
          aria-label="Exit cook mode"
        >
          <X size={18} />
        </button>
      </div>

      {/* Progress bar */}
      <div className="h-0.5 bg-muted shrink-0">
        <div
          className="h-full bg-foreground transition-all duration-300"
          style={{ width: `${((stepIndex + 1) / instructions.length) * 100}%` }}
        />
      </div>

      {/* Step content */}
      <div className="flex-1 overflow-y-auto px-6 py-8 flex flex-col min-h-0">
        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-4">
          Step {stepIndex + 1}
        </p>
        <p className="text-xl leading-relaxed flex-1">{step.text}</p>

        {/* Timer */}
        <div className="mt-10 flex items-center gap-3 bg-muted rounded-2xl p-4">
          <span className="text-4xl font-mono font-semibold tabular-nums flex-1 tracking-tight">
            {formatTimer(seconds)}
          </span>
          <button
            onClick={() => setRunning((r) => !r)}
            className="w-12 h-12 rounded-full bg-foreground text-background flex items-center justify-center hover:opacity-80 transition-opacity"
            aria-label={running ? "Pause timer" : "Start timer"}
          >
            {running ? <Pause size={18} /> : <Play size={18} className="ml-0.5" />}
          </button>
          <button
            onClick={() => {
              setSeconds(0)
              setRunning(false)
            }}
            className="w-12 h-12 rounded-full border border-border bg-background text-muted-foreground hover:text-foreground flex items-center justify-center transition-colors"
            aria-label="Reset timer"
          >
            <RotateCcw size={15} />
          </button>
        </div>
      </div>

      {/* Navigation */}
      <div className="shrink-0 px-4 pt-3 pb-8 border-t border-border flex gap-3">
        <button
          onClick={() => goToStep(stepIndex - 1)}
          disabled={isFirst}
          className="flex-1 h-12 border border-border rounded text-sm font-medium disabled:opacity-25 flex items-center justify-center gap-1 hover:bg-muted transition-colors"
        >
          <ChevronLeft size={16} />
          Back
        </button>
        {isLast ? (
          <button
            onClick={() => router.push(`/recipes/${slug}`)}
            className="flex-1 h-12 bg-foreground text-background rounded text-sm font-medium flex items-center justify-center gap-2 hover:opacity-80 transition-opacity"
          >
            <Check size={16} />
            All done! Great work
          </button>
        ) : (
          <button
            onClick={() => goToStep(stepIndex + 1)}
            className="flex-1 h-12 bg-foreground text-background rounded text-sm font-medium flex items-center justify-center gap-1 hover:opacity-80 transition-opacity"
          >
            Next
            <ChevronRight size={16} />
          </button>
        )}
      </div>
    </div>
  )
}
