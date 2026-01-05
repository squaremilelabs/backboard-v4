import { db, type RecurringTask, type RecurringTaskAction, type FrequencyValue } from "@/lib/db"

/**
 * Create a new recurring task (starts as template with no frequency)
 */
export async function createRecurringTask(
  title: string,
  scopeId: string
): Promise<string> {
  const id = crypto.randomUUID()
  const now = Date.now()

  await db.recurringTasks.add({
    id,
    scopeId,
    title: title.trim(),
    frequency: [], // Empty = template mode
    createdAt: now,
  })

  return id
}

/**
 * Update a recurring task's title
 */
export async function updateRecurringTaskTitle(
  taskId: string,
  title: string
): Promise<void> {
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
  await db.recurringTasks.delete(taskId)
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

  await db.transaction("rw", [db.tasks, db.recurringTasks], async () => {
    for (const task of tasks) {
      if (task.pendingAction === "delete") {
        await db.recurringTasks.delete(task.id)
      } else if (task.pendingAction === "insert") {
        // Insert into Now list
        const id = crypto.randomUUID()
        const now = Date.now()
        await db.tasks.add({
          id,
          scopeId: task.scopeId,
          title: task.title,
          content: task.content,
          status: "now",
          insertedAt: now,
          insertedFrom: "recurring",
          createdAt: now,
        })
        // Clear the pending action (don't delete the recurring task)
        await db.recurringTasks.update(task.id, { pendingAction: null })
      }
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

  await db.transaction("rw", [db.tasks, db.recurringTasks], async () => {
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
