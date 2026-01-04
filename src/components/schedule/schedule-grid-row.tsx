"use client"

import { getNext7Days } from "@/hooks/use-schedule-slots"
import { toggleScheduleSlot } from "@/lib/schedule-mutations"
import { cn } from "@/lib/utils"
import { ScheduleCell } from "@/components/scopes/schedule-cell"
import type { Scope } from "@/lib/db"

interface ScheduleGridRowProps {
  scope: Scope
  scheduleSlots?: Set<string>
  /** Default schedule slots for jobs (jobId:weekday keys) */
  defaultScheduleSlots?: Set<string>
  /** Whether this is a nested child project */
  isNested?: boolean
  /** Whether to show grid cells (false for inactive parent projects) */
  showCells?: boolean
}

export function ScheduleGridRow({
  scope,
  scheduleSlots,
  defaultScheduleSlots,
  isNested = false,
  showCells = true,
}: ScheduleGridRowProps) {
  const days = getNext7Days()
  const isJob = scope.type === "job"

  // Jobs: filled dot, Projects: parent = hollow, child = filled
  const dotClass = isJob
    ? "bg-primary"
    : isNested
      ? "bg-primary"
      : "border-2 border-primary bg-transparent"

  // Theme wrapper for color context
  const themeClass = isJob ? "theme-gold" : "theme-blue"

  return (
    <div className={cn("group flex min-w-0 items-center", themeClass)}>
      {/* Title cell - fixed width, sticky on scroll */}
      <div className="sticky left-0 z-10 flex w-2xs shrink-0 items-center gap-2 bg-background px-4 py-2">
        {/* Indentation for nested items */}
        {isNested && <div className="w-4 shrink-0" />}

        {/* Scope type indicator dot */}
        <div className={cn("h-2.5 w-2.5 shrink-0 rounded-full", dotClass)} />

        {/* Title */}
        <span className="truncate text-sm">{scope.title}</span>
      </div>

      {/* Grid cells - only shown if showCells is true */}
      <div className="flex flex-1 items-center px-2">
        {days.map(({ key: date, weekday }) => {
          if (!showCells) {
            // Empty placeholder to maintain grid alignment
            return <div key={date} className="min-w-20 flex-1 px-1 py-1" />
          }

          const slotKey = `${scope.id}:${date}`
          const isActive = scheduleSlots?.has(slotKey) ?? false

          // For jobs: check if default-scheduled on this weekday but not selected
          const defaultKey = `${scope.id}:${weekday}`
          const isDefaultScheduled = isJob && (defaultScheduleSlots?.has(defaultKey) ?? false)
          const isDefault = isDefaultScheduled && !isActive

          // Determine cell state
          let state: "empty" | "active" | "default" = "empty"
          if (isActive) {
            state = "active"
          } else if (isDefault) {
            state = "default"
          }

          return (
            <div key={date} className="min-w-20 flex-1 px-1 py-1">
              <ScheduleCell state={state} onClick={() => toggleScheduleSlot(scope.id, date)} />
            </div>
          )
        })}
      </div>
    </div>
  )
}
