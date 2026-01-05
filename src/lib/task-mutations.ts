import { db, type TaskStatus } from "@/lib/db"

/**
 * Create a new task in a specific scope and status
 */
export async function createTask(
  title: string,
  scopeId: string | null,
  status: TaskStatus
): Promise<string> {
  const id = crypto.randomUUID()
  const now = Date.now()

  await db.tasks.add({
    id,
    scopeId,
    title: title.trim(),
    status,
    insertedAt: now,
    insertedFrom: status,
    createdAt: now,
  })

  return id
}

/**
 * Update a task's title
 */
export async function updateTaskTitle(taskId: string, title: string): Promise<void> {
  await db.tasks.update(taskId, { title: title.trim() })
}

/**
 * Set a pending action on a task
 */
export async function setTaskPendingAction(
  taskId: string,
  action: TaskStatus | "delete" | null
): Promise<void> {
  await db.tasks.update(taskId, { pendingAction: action })
}

/**
 * Commit all pending actions for a specific scope and status.
 * - Status changes: Update task.status, set insertedFrom to previous status
 * - Delete: Remove task from database
 */
export async function commitPendingActions(
  scopeId: string | null,
  currentStatus: TaskStatus
): Promise<void> {
  const tasks = await db.tasks
    .where("status")
    .equals(currentStatus)
    .filter((t) => t.scopeId === scopeId && t.pendingAction != null)
    .toArray()

  const now = Date.now()

  await db.transaction("rw", db.tasks, async () => {
    for (const task of tasks) {
      if (task.pendingAction === "delete") {
        await db.tasks.delete(task.id)
      } else if (task.pendingAction) {
        const updates: Partial<typeof task> = {
          status: task.pendingAction,
          pendingAction: null,
          insertedAt: now,
          insertedFrom: currentStatus,
        }
        // Set completedAt when moving to done
        if (task.pendingAction === "done") {
          updates.completedAt = now
        }
        await db.tasks.update(task.id, updates)
      }
    }
  })
}

/**
 * Clear all pending actions for a specific scope and status
 */
export async function clearPendingActions(
  scopeId: string | null,
  currentStatus: TaskStatus
): Promise<void> {
  const tasks = await db.tasks
    .where("status")
    .equals(currentStatus)
    .filter((t) => t.scopeId === scopeId && t.pendingAction != null)
    .toArray()

  await db.transaction("rw", db.tasks, async () => {
    for (const task of tasks) {
      await db.tasks.update(task.id, { pendingAction: null })
    }
  })
}

/**
 * Move all NOW tasks for a scope to Later (unfocused scope bulk action)
 */
export async function moveAllToLater(scopeId: string | null): Promise<void> {
  const tasks = await db.tasks
    .where("status")
    .equals("now")
    .filter((t) => t.scopeId === scopeId)
    .toArray()

  const now = Date.now()

  await db.transaction("rw", db.tasks, async () => {
    for (const task of tasks) {
      await db.tasks.update(task.id, {
        status: "later",
        pendingAction: null,
        insertedAt: now,
        insertedFrom: "now",
      })
    }
  })
}
