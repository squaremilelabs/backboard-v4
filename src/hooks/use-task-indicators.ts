import { useLiveQuery } from "dexie-react-hooks"
import { db, type TaskStatus } from "@/lib/db"
import type { DotVariant } from "@/components/ui/activity-dot"

interface TaskIndicators {
  /** Dots to show for NOW tasks (sidebar + Now tab) */
  nowDots: DotVariant[]
  /** Whether Later tab should show a neutral dot */
  hasLaterTasks: boolean
  /** Whether Backlog tab should show a neutral dot */
  hasBacklogTasks: boolean
}

/**
 * Compute activity dot indicators based on task data.
 * - NOW: gold dot if job tasks, blue dot if project tasks, neutral if only triage
 * - LATER/BACKLOG: neutral dot if any tasks exist
 */
export function useTaskIndicators(): TaskIndicators | undefined {
  // Get all NOW tasks with their scope types
  const nowData = useLiveQuery(async () => {
    const nowTasks = await db.tasks.where("status").equals("now").toArray()

    // Get unique scope IDs (excluding null/triage)
    const scopeIds = [...new Set(nowTasks.map((t) => t.scopeId).filter(Boolean))] as string[]

    // Get scope types
    const scopes = await db.scopes.where("id").anyOf(scopeIds).toArray()
    const scopeTypes = new Map(scopes.map((s) => [s.id, s.type]))

    let hasJobTasks = false
    let hasProjectTasks = false
    let hasTriageTasks = false

    for (const task of nowTasks) {
      if (task.scopeId === null) {
        hasTriageTasks = true
      } else {
        const type = scopeTypes.get(task.scopeId)
        if (type === "job") hasJobTasks = true
        if (type === "project") hasProjectTasks = true
      }
    }

    return { hasJobTasks, hasProjectTasks, hasTriageTasks }
  })

  // Check if Later tasks exist
  const hasLaterTasks = useLiveQuery(async () => {
    const count = await db.tasks.where("status").equals("later").count()
    return count > 0
  })

  // Check if Backlog tasks exist
  const hasBacklogTasks = useLiveQuery(async () => {
    const count = await db.tasks.where("status").equals("backlog").count()
    return count > 0
  })

  if (nowData === undefined || hasLaterTasks === undefined || hasBacklogTasks === undefined) {
    return undefined
  }

  // Compute NOW dots
  const nowDots: DotVariant[] = []
  if (nowData.hasJobTasks) nowDots.push("gold")
  if (nowData.hasProjectTasks) nowDots.push("blue")
  if (nowDots.length === 0 && nowData.hasTriageTasks) {
    nowDots.push("neutral")
  }

  return {
    nowDots,
    hasLaterTasks,
    hasBacklogTasks,
  }
}

/**
 * Get task counts by scope for the current list type.
 * Returns Map<scopeId | "triage", count>
 */
export function useTaskCountsByScope(status: TaskStatus): Map<string, number> | undefined {
  return useLiveQuery(async () => {
    const tasks = await db.tasks.where("status").equals(status).toArray()
    const counts = new Map<string, number>()

    for (const task of tasks) {
      const key = task.scopeId ?? "triage"
      counts.set(key, (counts.get(key) ?? 0) + 1)
    }

    return counts
  }, [status])
}
