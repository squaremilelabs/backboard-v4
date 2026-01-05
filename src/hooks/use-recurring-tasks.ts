"use client"

import { useLiveQuery } from "dexie-react-hooks"
import { db, type RecurringTask } from "@/lib/db"

/**
 * Get all recurring tasks for a specific scope
 */
export function useRecurringTasks(scopeId: string): RecurringTask[] | undefined {
  return useLiveQuery(async () => {
    const tasks = await db.recurringTasks
      .where("scopeId")
      .equals(scopeId)
      .toArray()

    // Sort by createdAt descending (newest first)
    return tasks.sort((a, b) => b.createdAt - a.createdAt)
  }, [scopeId])
}

/**
 * Get pending action count for a scope's recurring tasks
 */
export function useRecurringTaskPendingCount(scopeId: string): number {
  const count = useLiveQuery(async () => {
    const tasks = await db.recurringTasks
      .where("scopeId")
      .equals(scopeId)
      .filter((t) => t.pendingAction != null)
      .count()
    return tasks
  }, [scopeId])

  return count ?? 0
}

/**
 * Get recurring task counts by scope (for activity indicators)
 */
export function useRecurringTaskCounts(): Map<string, number> | undefined {
  return useLiveQuery(async () => {
    const tasks = await db.recurringTasks.toArray()
    const counts = new Map<string, number>()

    for (const task of tasks) {
      counts.set(task.scopeId, (counts.get(task.scopeId) ?? 0) + 1)
    }

    return counts
  })
}

/**
 * Get the user's timezone setting
 */
export function useUserTimezone(): string {
  const timezone = useLiveQuery(async () => {
    const meta = await db.appMeta.get("app")
    return meta?.timezone
  })

  // Default to browser timezone if not set
  return timezone ?? Intl.DateTimeFormat().resolvedOptions().timeZone
}
