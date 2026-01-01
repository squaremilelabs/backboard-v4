"use client"

import { useIsMobile } from "@/hooks/use-media-query"

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const

// Get next 6 months starting from current month
function getNext6Months(): string[] {
  const months: string[] = []
  const now = new Date()
  for (let i = 0; i < 6; i++) {
    const date = new Date(now.getFullYear(), now.getMonth() + i, 1)
    months.push(date.toLocaleString("en-US", { month: "short" }))
  }
  return months
}

interface ScopeGridHeaderProps {
  type: "jobs" | "projects"
}

export function ScopeGridHeader({ type }: ScopeGridHeaderProps) {
  const isMobile = useIsMobile()

  // Don't show header on mobile (no grid columns)
  if (isMobile) {
    return null
  }

  const isJobs = type === "jobs"
  const columns = isJobs ? WEEKDAYS : getNext6Months()

  return (
    <div className="flex shrink-0 items-center border-b text-sm text-muted-foreground">
      {/* Title column header - fixed width, sticky */}
      <div className="sticky left-0 z-10 w-2xs shrink-0 px-4 py-3 font-medium">
        {isJobs ? "Jobs" : "Projects"}
      </div>

      {/* Column headers */}
      <div className="flex flex-1 items-center">
        {columns.map((label) => (
          <div key={label} className="flex-1 px-1 py-2 text-center">
            {label}
          </div>
        ))}
      </div>
    </div>
  )
}
