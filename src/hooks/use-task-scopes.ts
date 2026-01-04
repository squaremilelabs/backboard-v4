"use client"

import { useMemo } from "react"
import { useLiveQuery } from "dexie-react-hooks"
import { db, type Scope, type ScheduleSlot, type MonthSlot } from "@/lib/db"
import type { TaskListType } from "@/app/tasks/search-params"

export interface TaskScope extends Scope {
  isFaded: boolean
}

/**
 * Get scopes for the tasks page with contextual fading
 *
 * Fading rules:
 * - "now": Fade scopes without ScheduleSlot for today
 * - "later": Fade Projects without MonthSlot for current month (Jobs never fade)
 * - "backlog", "recurring", "recent": No fading
 */
export function useTaskScopes(listType: TaskListType): TaskScope[] | undefined {
  // Get all non-archived scopes
  const scopes = useLiveQuery(() => db.scopes.filter((s) => !s.archivedAt).toArray())

  // Get today's date for "now" filtering
  const today = useMemo(() => {
    const date = new Date()
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`
  }, [])

  // Get current month for "later" filtering
  const currentMonth = useMemo(() => {
    const date = new Date()
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`
  }, [])

  // Get schedule slots for today (for "now" fading)
  const todaySlots = useLiveQuery(
    (): Promise<ScheduleSlot[]> =>
      listType === "now"
        ? db.scheduleSlots.where("date").equals(today).toArray()
        : Promise.resolve([]),
    [listType, today]
  )

  // Get month slots for current month (for "later" fading)
  const monthSlots = useLiveQuery(
    (): Promise<MonthSlot[]> =>
      listType === "later"
        ? db.monthSlots.where("month").equals(currentMonth).toArray()
        : Promise.resolve([]),
    [listType, currentMonth]
  )

  // Compute scopes with fading
  const taskScopes = useMemo(() => {
    if (!scopes) return undefined
    if (listType === "now" && !todaySlots) return undefined
    if (listType === "later" && !monthSlots) return undefined

    return scopes.map((scope) => {
      let isFaded = false

      if (listType === "now") {
        // Fade if scope doesn't have a schedule slot for today
        const hasSlotToday = todaySlots?.some((slot) => slot.scopeId === scope.id)
        isFaded = !hasSlotToday
      } else if (listType === "later") {
        // Fade Projects without MonthSlot for current month (Jobs never fade)
        if (scope.type === "project") {
          const hasMonthSlot = monthSlots?.some((slot) => slot.projectId === scope.id)
          isFaded = !hasMonthSlot
        }
      }
      // For "backlog", "recurring", "recent": isFaded remains false

      return {
        ...scope,
        isFaded,
      }
    })
  }, [scopes, listType, todaySlots, monthSlots])

  return taskScopes
}
