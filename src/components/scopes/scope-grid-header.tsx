"use client"

import { WEEKDAY_LABELS, WEEKDAYS, getNext6Months } from "@/hooks/use-schedule-slots"

interface ScopeGridHeaderProps {
  type: "jobs" | "projects"
}

export function ScopeGridHeader({ type }: ScopeGridHeaderProps) {
  const isJobs = type === "jobs"

  const columns = isJobs
    ? WEEKDAYS.map((w) => ({ key: w, label: WEEKDAY_LABELS[w] }))
    : getNext6Months()

  return (
    <div
      className="sticky top-0 z-20 flex shrink-0 items-center border-b bg-background text-sm
        text-muted-foreground"
    >
      {/* Title column header - fixed width, sticky */}
      <div className="sticky left-0 z-10 w-64 shrink-0 bg-background px-4 py-3 font-medium">
        {isJobs ? "Jobs" : "Projects"}
      </div>

      {/* Column headers - min width enforced */}
      <div className="flex flex-1 items-center px-2">
        {columns.map(({ key, label }) => (
          <div key={key} className="min-w-18 flex-1 px-1 py-2 text-center">
            {label}
          </div>
        ))}
      </div>
    </div>
  )
}
