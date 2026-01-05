"use client"

import { forwardRef } from "react"
import { cn } from "@/lib/utils"
import type { FrequencyValue, Weekday } from "@/lib/db"

const WEEKDAYS: { key: Weekday; label: string }[] = [
  { key: "mon", label: "M" },
  { key: "tue", label: "T" },
  { key: "wed", label: "W" },
  { key: "thu", label: "T" },
  { key: "fri", label: "F" },
  { key: "sat", label: "S" },
  { key: "sun", label: "S" },
]

// Short labels for display
const WEEKDAY_LABELS: Record<Weekday, string> = {
  mon: "M",
  tue: "T",
  wed: "W",
  thu: "T",
  fri: "F",
  sat: "S",
  sun: "S",
}

interface FrequencyIndicatorProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  frequency: FrequencyValue[]
}

export const FrequencyIndicator = forwardRef<HTMLButtonElement, FrequencyIndicatorProps>(
  function FrequencyIndicator({ frequency, className, ...props }, ref) {
    // Get unique active weekdays from frequency (preserve order: mon-sun)
    const activeDays = new Set(frequency.map((f) => f.weekday))
    const orderedActiveDays = WEEKDAYS.filter(({ key }) => activeDays.has(key))

    // If no frequency, show "Ad hoc" indicator
    if (frequency.length === 0) {
      return (
        <button
          ref={ref}
          type="button"
          className={cn(
            "flex items-center rounded-md px-2 py-1 text-xs",
            "text-muted-foreground transition-colors hover:bg-muted hover:text-foreground",
            className
          )}
          {...props}
        >
          <span>Ad hoc</span>
        </button>
      )
    }

    return (
      <button
        ref={ref}
        type="button"
        className={cn(
          "flex items-center gap-0.5 rounded-md px-1.5 py-1",
          "transition-colors hover:bg-muted",
          className
        )}
        {...props}
      >
        {orderedActiveDays.map(({ key }) => (
          <span
            key={key}
            className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] font-medium text-primary-foreground"
          >
            {WEEKDAY_LABELS[key]}
          </span>
        ))}
      </button>
    )
  }
)

export { WEEKDAYS }
