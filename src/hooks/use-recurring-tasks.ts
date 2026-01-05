"use client"

import { useLiveQuery } from "dexie-react-hooks"
import { db, type RecurringTask } from "@/lib/db"
import { getTasklistId } from "@/lib/tasklist-helpers"

/**
 * Get all recurring tasks for a specific scope, in tasklist order
 */
export function useRecurringTasks(scopeId: string): RecurringTask[] | undefined {
  return useLiveQuery(async () => {
    const tasklistId = getTasklistId(scopeId, "recurring")

    // Get tasklist for ordering
    const tasklist = await db.tasklists.get(tasklistId)
    const orderedIds = tasklist?.taskIds ?? []

    // Get all recurring tasks for this scope
    const tasks = await db.recurringTasks.where("scopeId").equals(scopeId).toArray()

    // Create lookup map
    const taskMap = new Map(tasks.map((t) => [t.id, t]))

    // Return tasks in tasklist order
    const orderedTasks: RecurringTask[] = []
    const seenIds = new Set<string>()

    for (const id of orderedIds) {
      const task = taskMap.get(id)
      if (task) {
        orderedTasks.push(task)
        seenIds.add(id)
      }
    }

    // Add any orphaned tasks at the end
    const orphanedTasks = tasks
      .filter((t) => !seenIds.has(t.id))
      .sort((a, b) => b.createdAt - a.createdAt)

    return [...orderedTasks, ...orphanedTasks]
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
