"use client"

import { getNext7Days } from "@/hooks/use-schedule-slots"

export function ScheduleGridHeader() {
  const days = getNext7Days()

  return (
    <div
      className="sticky top-0 z-20 flex shrink-0 items-center border-b bg-background text-sm
        text-muted-foreground"
    >
      {/* Title column header - fixed width */}
      <div className="w-64 shrink-0 bg-background px-4 py-3 font-medium">Schedule</div>

      {/* Date column headers */}
      <div className="flex flex-1 items-center px-2">
        {days.map(({ key, label }) => (
          <div key={key} className="min-w-20 flex-1 px-1 py-2 text-center">
            {label}
          </div>
        ))}
      </div>
    </div>
  )
}
