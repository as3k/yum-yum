"use client"

import { useState, useTransition } from "react"
import { saveUserPreferences } from "@/lib/actions"

interface Props {
  initialValues: {
    calorieTarget: number | null
    breakfastTime: string
    lunchTime: string
    snackTime: string
    dinnerTime: string
    reminderLeadMin: number
  }
}

export default function SettingsForm({ initialValues }: Props) {
  const [values, setValues] = useState(initialValues)
  const [saved, setSaved] = useState(false)
  const [pending, startTransition] = useTransition()

  function set(key: keyof typeof values, value: string | number | null) {
    setValues((v) => ({ ...v, [key]: value }))
    setSaved(false)
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    startTransition(async () => {
      await saveUserPreferences(values)
      setSaved(true)
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Nutrition */}
      <section>
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-3">Nutrition</h2>
        <div className="bg-muted rounded-2xl p-4 space-y-4">
          <label className="flex items-center justify-between gap-4">
            <span className="text-sm">Daily calorie target</span>
            <input
              type="number"
              min={500}
              max={6000}
              step={50}
              value={values.calorieTarget ?? ""}
              onChange={(e) => set("calorieTarget", e.target.value ? parseInt(e.target.value) : null)}
              placeholder="e.g. 2200"
              className="w-28 text-right bg-background border border-border rounded-lg px-3 h-9 text-sm focus:outline-none focus:ring-2 focus:ring-accent/50"
            />
          </label>
        </div>
      </section>

      {/* Meal times */}
      <section>
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-3">Meal times</h2>
        <div className="bg-muted rounded-2xl p-4 space-y-4">
          {(
            [
              { key: "breakfastTime", label: "Breakfast" },
              { key: "lunchTime", label: "Lunch" },
              { key: "snackTime", label: "Snack" },
              { key: "dinnerTime", label: "Dinner" },
            ] as const
          ).map(({ key, label }) => (
            <label key={key} className="flex items-center justify-between gap-4">
              <span className="text-sm">{label}</span>
              <input
                type="time"
                value={values[key]}
                onChange={(e) => set(key, e.target.value)}
                className="bg-background border border-border rounded-lg px-3 h-9 text-sm focus:outline-none focus:ring-2 focus:ring-accent/50"
              />
            </label>
          ))}
        </div>
      </section>

      {/* Reminders */}
      <section>
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-3">Reminders</h2>
        <div className="bg-muted rounded-2xl p-4 space-y-4">
          <label className="flex items-center justify-between gap-4">
            <div>
              <span className="text-sm">Notify me before meals</span>
              <p className="text-xs text-muted-foreground mt-0.5">Minutes before each meal time</p>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min={0}
                max={120}
                step={5}
                value={values.reminderLeadMin}
                onChange={(e) => set("reminderLeadMin", parseInt(e.target.value) || 0)}
                className="w-20 text-right bg-background border border-border rounded-lg px-3 h-9 text-sm focus:outline-none focus:ring-2 focus:ring-accent/50"
              />
              <span className="text-sm text-muted-foreground">min</span>
            </div>
          </label>
        </div>
      </section>

      <button
        type="submit"
        disabled={pending}
        className="w-full h-11 bg-accent text-white rounded-xl font-medium text-sm hover:opacity-80 transition-opacity disabled:opacity-50"
      >
        {saved ? "Saved ✓" : pending ? "Saving…" : "Save settings"}
      </button>
    </form>
  )
}
