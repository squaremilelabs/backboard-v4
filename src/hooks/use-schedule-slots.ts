import { useLiveQuery } from "dexie-react-hooks"
import { db, type Weekday } from "@/lib/db"

/**
 * Get all DefaultScheduleSlots as a Set of "jobId:weekday" keys for O(1) lookup
 */
export function useDefaultScheduleSlots(): Set<string> | undefined {
  const slots = useLiveQuery(() => db.defaultScheduleSlots.toArray())

  if (slots === undefined) return undefined

  return new Set(slots.map((s) => `${s.jobId}:${s.weekday}`))
}

/**
 * Get all MonthSlots as a Set of "projectId:month" keys for O(1) lookup
 */
export function useMonthSlots(): Set<string> | undefined {
  const slots = useLiveQuery(() => db.monthSlots.toArray())

  if (slots === undefined) return undefined

  return new Set(slots.map((s) => `${s.projectId}:${s.month}`))
}

/**
 * Get MonthSlots grouped by month for calculating parent inheritance
 * Returns Map<month, Set<projectId>>
 */
export function useMonthSlotsByMonth(): Map<string, Set<string>> | undefined {
  const slots = useLiveQuery(() => db.monthSlots.toArray())

  if (slots === undefined) return undefined

  const byMonth = new Map<string, Set<string>>()
  for (const slot of slots) {
    if (!byMonth.has(slot.month)) {
      byMonth.set(slot.month, new Set())
    }
    byMonth.get(slot.month)!.add(slot.projectId)
  }
  return byMonth
}

/**
 * Weekday constants for iteration
 */
export const WEEKDAYS: Weekday[] = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"]
export const WEEKDAY_LABELS: Record<Weekday, string> = {
  mon: "Mon",
  tue: "Tue",
  wed: "Wed",
  thu: "Thu",
  fri: "Fri",
  sat: "Sat",
  sun: "Sun",
}

/**
 * Get next 6 months as YYYY-MM strings and short labels
 */
export function getNext6Months(): Array<{ key: string; label: string }> {
  const months: Array<{ key: string; label: string }> = []
  const now = new Date()
  for (let i = 0; i < 6; i++) {
    const date = new Date(now.getFullYear(), now.getMonth() + i, 1)
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`
    const label = date.toLocaleString("en-US", { month: "short" })
    months.push({ key, label })
  }
  return months
}

/**
 * Get all ScheduleSlots as a Set of "scopeId:date" keys for O(1) lookup
 */
export function useScheduleSlots(): Set<string> | undefined {
  const slots = useLiveQuery(() => db.scheduleSlots.toArray())

  if (slots === undefined) return undefined

  return new Set(slots.map((s) => `${s.scopeId}:${s.date}`))
}

/**
 * Get next 7 days starting from today
 * Returns array of { key: "YYYY-MM-DD", label: "Mon, Jan 5", month: "YYYY-MM", weekday: Weekday }
 */
export function getNext7Days(): Array<{
  key: string
  label: string
  month: string
  weekday: Weekday
}> {
  const days: Array<{ key: string; label: string; month: string; weekday: Weekday }> = []
  const now = new Date()
  const weekdayMap: Weekday[] = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"]

  for (let i = 0; i < 7; i++) {
    const date = new Date(now.getFullYear(), now.getMonth(), now.getDate() + i)
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`
    const month = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`
    const label = date.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
    })
    const weekday = weekdayMap[date.getDay()]
    days.push({ key, label, month, weekday })
  }

  return days
}
