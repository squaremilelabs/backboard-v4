import {
  prependToTasklist,
  prependManyToTasklist,
  removeManyFromTasklist,
  moveTaskBetweenLists,
  reorderTasklist,
} from "./tasklist-helpers"
import { db, type Task, type TaskStatus } from "@/lib/db"

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

  await db.transaction("rw", [db.tasks, db.tasklists], async () => {
    await db.tasks.add({
      id,
      scopeId,
      title: title.trim(),
      status,
      insertedAt: now,
      insertedFrom: status,
      createdAt: now,
    })

    // Add to tasklist (at top)
    await prependToTasklist(scopeId, status, id)
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

  // Group tasks by their pending action for batch operations
  const toDelete: string[] = []
  const toMove: Map<TaskStatus, string[]> = new Map()

  for (const task of tasks) {
    if (task.pendingAction === "delete") {
      toDelete.push(task.id)
    } else if (task.pendingAction) {
      const targetStatus = task.pendingAction
      if (!toMove.has(targetStatus)) {
        toMove.set(targetStatus, [])
      }
      toMove.get(targetStatus)!.push(task.id)
    }
  }

  await db.transaction("rw", [db.tasks, db.tasklists], async () => {
    // Handle deletes
    for (const taskId of toDelete) {
      await db.tasks.delete(taskId)
    }
    if (toDelete.length > 0) {
      await removeManyFromTasklist(scopeId, currentStatus, toDelete)
    }

    // Handle moves (preserving order within each destination)
    for (const [targetStatus, taskIds] of toMove) {
      for (const taskId of taskIds) {
        const updates: Partial<Task> = {
          status: targetStatus,
          pendingAction: null,
          insertedAt: now,
          insertedFrom: currentStatus,
        }
        if (targetStatus === "done") {
          updates.completedAt = now
        }
        await db.tasks.update(taskId, updates)
      }

      // Remove from source, add to destination (preserving relative order)
      await removeManyFromTasklist(scopeId, currentStatus, taskIds)
      await prependManyToTasklist(scopeId, targetStatus, taskIds)
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

  if (tasks.length === 0) return

  const now = Date.now()
  const taskIds = tasks.map((t) => t.id)

  await db.transaction("rw", [db.tasks, db.tasklists], async () => {
    for (const task of tasks) {
      await db.tasks.update(task.id, {
        status: "later",
        pendingAction: null,
        insertedAt: now,
        insertedFrom: "now",
      })
    }

    // Move all from now to later, preserving order
    await removeManyFromTasklist(scopeId, "now", taskIds)
    await prependManyToTasklist(scopeId, "later", taskIds)
  })
}

/**
 * Change a task's scope (move to different Job/Project)
 */
export async function changeTaskScope(taskId: string, newScopeId: string | null): Promise<void> {
  const task = await db.tasks.get(taskId)
  if (!task) return
  if (task.scopeId === newScopeId) return // No change

  await db.transaction("rw", [db.tasks, db.tasklists], async () => {
    // Update task
    await db.tasks.update(taskId, { scopeId: newScopeId })

    // Move between tasklists
    await moveTaskBetweenLists(taskId, task.scopeId, task.status, newScopeId, task.status)
  })
}

/**
 * Reorder tasks within a tasklist
 */
export async function reorderTasks(
  scopeId: string | null,
  status: TaskStatus,
  taskIds: string[]
): Promise<void> {
  await reorderTasklist(scopeId, status, taskIds)
}
