"use client"

import { CalendarDays } from "lucide-react"

interface GridPlaceholderProps {
  type: "jobs" | "projects"
}

export function GridPlaceholder({ type }: GridPlaceholderProps) {
  const message =
    type === "jobs" ? "Weekly schedule template coming soon" : "6-month timeline coming soon"

  return (
    <div className="flex h-full flex-col items-center justify-center text-muted-foreground">
      <CalendarDays className="mb-4 h-12 w-12 opacity-50" />
      <p className="text-sm">{message}</p>
    </div>
  )
}
