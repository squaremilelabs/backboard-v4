import { useLiveQuery } from "dexie-react-hooks"
import { db, type Task, type TaskStatus } from "@/lib/db"

/**
 * Get tasks for a specific scope and status, sorted by createdAt descending (newest first)
 *
 * @param scopeId - The scope ID, or "triage" for tasks with null scopeId
 * @param status - The task status (now, later, backlog)
 */
export function useTasks(scopeId: string | "triage", status: TaskStatus): Task[] | undefined {
  return useLiveQuery(async () => {
    const actualScopeId = scopeId === "triage" ? null : scopeId

    const tasks = await db.tasks
      .where("status")
      .equals(status)
      .filter((task) => task.scopeId === actualScopeId)
      .toArray()

    // Sort by createdAt descending (newest first)
    return tasks.sort((a, b) => b.createdAt - a.createdAt)
  }, [scopeId, status])
}

/**
 * Count tasks with pending actions for a specific scope and status
 */
export function usePendingActionCount(
  scopeId: string | "triage",
  status: TaskStatus
): number | undefined {
  return useLiveQuery(async () => {
    const actualScopeId = scopeId === "triage" ? null : scopeId

    const count = await db.tasks
      .where("status")
      .equals(status)
      .filter((task) => task.scopeId === actualScopeId && task.pendingAction != null)
      .count()

    return count
  }, [scopeId, status])
}

/**
 * Check if a scope has a schedule slot for today
 */
export function useIsScopeScheduledToday(scopeId: string | null): boolean | undefined {
  return useLiveQuery(async () => {
    if (scopeId === null) return true // Triage is always "in focus"

    const today = new Date()
    const dateStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`

    const slot = await db.scheduleSlots.where("[date+scopeId]").equals([dateStr, scopeId]).first()

    return slot !== undefined
  }, [scopeId])
}

/**
 * Get recent tasks (done within last 7 days) for a specific scope
 * Sorted by completedAt descending (most recent first)
 */
export function useRecentTasks(scopeId: string | "triage"): Task[] | undefined {
  return useLiveQuery(async () => {
    const actualScopeId = scopeId === "triage" ? null : scopeId
    const recentCutoff = Date.now() - 7 * 24 * 60 * 60 * 1000

    const tasks = await db.tasks
      .where("status")
      .equals("done")
      .filter((task) => task.scopeId === actualScopeId && (task.completedAt ?? 0) >= recentCutoff)
      .toArray()

    // Sort by completedAt descending (most recent first)
    return tasks.sort((a, b) => (b.completedAt ?? 0) - (a.completedAt ?? 0))
  }, [scopeId])
}
