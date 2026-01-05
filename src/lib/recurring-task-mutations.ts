import {
  prependToTasklist,
  removeFromTasklist,
  moveTaskBetweenLists,
  reorderTasklist,
} from "./tasklist-helpers"
import { db, type RecurringTask, type RecurringTaskAction, type FrequencyValue } from "@/lib/db"

/**
 * Create a new recurring task (starts as template with no frequency)
 */
export async function createRecurringTask(title: string, scopeId: string): Promise<string> {
  const id = crypto.randomUUID()
  const now = Date.now()

  await db.transaction("rw", [db.recurringTasks, db.tasklists], async () => {
    await db.recurringTasks.add({
      id,
      scopeId,
      title: title.trim(),
      frequency: [], // Empty = template mode
      createdAt: now,
    })

    await prependToTasklist(scopeId, "recurring", id)
  })

  return id
}

/**
 * Update a recurring task's title
 */
export async function updateRecurringTaskTitle(taskId: string, title: string): Promise<void> {
  await db.recurringTasks.update(taskId, { title: title.trim() })
}

/**
 * Update a recurring task's frequency
 */
export async function updateRecurringTaskFrequency(
  taskId: string,
  frequency: FrequencyValue[]
): Promise<void> {
  await db.recurringTasks.update(taskId, { frequency })
}

/**
 * Delete a recurring task
 */
export async function deleteRecurringTask(taskId: string): Promise<void> {
  const task = await db.recurringTasks.get(taskId)
  if (!task) return

  await db.transaction("rw", [db.recurringTasks, db.tasklists], async () => {
    await db.recurringTasks.delete(taskId)
    await removeFromTasklist(task.scopeId, "recurring", taskId)
  })
}

/**
 * Set pending action on a recurring task
 */
export async function setRecurringTaskPendingAction(
  taskId: string,
  action: RecurringTaskAction | null
): Promise<void> {
  await db.recurringTasks.update(taskId, { pendingAction: action })
}

/**
 * Commit all pending actions for a scope's recurring tasks
 */
export async function commitRecurringTaskPendingActions(scopeId: string): Promise<void> {
  const tasks = await db.recurringTasks
    .where("scopeId")
    .equals(scopeId)
    .filter((t) => t.pendingAction != null)
    .toArray()

  const now = Date.now()
  const toDelete: string[] = []
  const toInsert: RecurringTask[] = []

  for (const task of tasks) {
    if (task.pendingAction === "delete") {
      toDelete.push(task.id)
    } else if (task.pendingAction === "insert") {
      toInsert.push(task)
    }
  }

  await db.transaction("rw", [db.tasks, db.recurringTasks, db.tasklists], async () => {
    // Handle deletes
    for (const taskId of toDelete) {
      await db.recurringTasks.delete(taskId)
    }
    if (toDelete.length > 0) {
      // Remove from recurring tasklist
      for (const taskId of toDelete) {
        await removeFromTasklist(scopeId, "recurring", taskId)
      }
    }

    // Handle inserts
    for (const recurringTask of toInsert) {
      const newTaskId = crypto.randomUUID()
      await db.tasks.add({
        id: newTaskId,
        scopeId: recurringTask.scopeId,
        title: recurringTask.title,
        content: recurringTask.content,
        status: "now",
        insertedAt: now,
        insertedFrom: "recurring",
        createdAt: now,
      })

      // Add to "now" tasklist
      await prependToTasklist(recurringTask.scopeId, "now", newTaskId)

      // Clear pending action
      await db.recurringTasks.update(recurringTask.id, { pendingAction: null })
    }
  })
}

/**
 * Clear all pending actions for a scope's recurring tasks
 */
export async function clearRecurringTaskPendingActions(scopeId: string): Promise<void> {
  const tasks = await db.recurringTasks
    .where("scopeId")
    .equals(scopeId)
    .filter((t) => t.pendingAction != null)
    .toArray()

  await db.transaction("rw", db.recurringTasks, async () => {
    for (const task of tasks) {
      await db.recurringTasks.update(task.id, { pendingAction: null })
    }
  })
}

/**
 * Insert a recurring task into the Now list (manual trigger or sync job)
 * Creates a new Task from the RecurringTask template
 *
 * @param recurringTask - The recurring task to insert from
 * @param updateLastInserted - If true, updates lastInsertedDate (for sync job).
 *                             For manual insertion, this should be false.
 */
export async function insertRecurringTaskNow(
  recurringTask: RecurringTask,
  updateLastInserted: boolean = false
): Promise<string> {
  const id = crypto.randomUUID()
  const now = Date.now()

  await db.transaction("rw", [db.tasks, db.recurringTasks, db.tasklists], async () => {
    // Create new task from template
    await db.tasks.add({
      id,
      scopeId: recurringTask.scopeId,
      title: recurringTask.title,
      content: recurringTask.content,
      status: "now",
      insertedAt: now,
      insertedFrom: "recurring",
      createdAt: now,
    })

    // Add to "now" tasklist
    await prependToTasklist(recurringTask.scopeId, "now", id)

    // Update lastInsertedDate if requested (for sync job)
    if (updateLastInserted) {
      const today = new Date().toISOString().split("T")[0] // YYYY-MM-DD
      await db.recurringTasks.update(recurringTask.id, { lastInsertedDate: today })
    }
  })

  return id
}

/**
 * Get user's timezone (from appMeta or browser default)
 */
export async function getUserTimezone(): Promise<string> {
  const meta = await db.appMeta.get("app")
  return meta?.timezone ?? Intl.DateTimeFormat().resolvedOptions().timeZone
}

/**
 * Update user's default timezone
 */
export async function setUserTimezone(timezone: string): Promise<void> {
  await db.appMeta.put({
    id: "app",
    lastSyncedAt: Date.now(),
    timezone,
  })
}

/**
 * Change a recurring task's scope
 */
export async function changeRecurringTaskScope(taskId: string, newScopeId: string): Promise<void> {
  const task = await db.recurringTasks.get(taskId)
  if (!task) return
  if (task.scopeId === newScopeId) return

  await db.transaction("rw", [db.recurringTasks, db.tasklists], async () => {
    await db.recurringTasks.update(taskId, { scopeId: newScopeId })
    await moveTaskBetweenLists(taskId, task.scopeId, "recurring", newScopeId, "recurring")
  })
}

/**
 * Reorder recurring tasks within a tasklist
 */
export async function reorderRecurringTasks(scopeId: string, taskIds: string[]): Promise<void> {
  await reorderTasklist(scopeId, "recurring", taskIds)
}
