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
