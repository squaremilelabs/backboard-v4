import {
  prependToTasklist,
  prependManyToTasklist,
  removeManyFromTasklist,
  moveTaskBetweenLists,
  reorderTasklist,
} from "./tasklist-helpers"
import { db, type Task, type TaskStatus } from "@/lib/db"

// Note: With Dexie Cloud's @id schema, IDs are auto-generated on add()
// The add() method returns the generated ID

/**
 * Create a new task in a specific scope and status
 */
export async function createTask(
  title: string,
  scopeId: string | null,
  status: TaskStatus
): Promise<string> {
  const now = Date.now()
  let id: string = ""

  await db.transaction("rw", [db.tasks, db.tasklists], async () => {
    // With @id schema, Dexie auto-generates the ID and returns it
    id = (await db.tasks.add({
      scopeId,
      title: title.trim(),
      status,
      insertedAt: now,
      insertedFrom: status,
      createdAt: now,
    } as Task)) as string

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
 * Move a single task to a new status (immediate action, no pending state)
 */
export async function moveTask(
  taskId: string,
  fromStatus: TaskStatus,
  toStatus: TaskStatus,
  scopeId: string | null
): Promise<void> {
  const now = Date.now()

  await db.transaction("rw", [db.tasks, db.tasklists], async () => {
    const updates: Partial<Task> = {
      status: toStatus,
      insertedAt: now,
      insertedFrom: fromStatus,
    }
    if (toStatus === "done") {
      updates.completedAt = now
    }
    await db.tasks.update(taskId, updates)

    // Move between tasklists
    await moveTaskBetweenLists(taskId, scopeId, fromStatus, scopeId, toStatus)
  })
}

/**
 * Delete a single task (immediate action)
 */
export async function deleteTask(
  taskId: string,
  status: TaskStatus,
  scopeId: string | null
): Promise<void> {
  await db.transaction("rw", [db.tasks, db.tasklists], async () => {
    await db.tasks.delete(taskId)
    await removeManyFromTasklist(scopeId, status, [taskId])
  })
}

/**
 * Move multiple tasks to a new status (batch action)
 * Preserves relative order by prepending in reverse order
 */
export async function batchMoveTasks(
  taskIds: string[],
  fromStatus: TaskStatus,
  toStatus: TaskStatus,
  scopeId: string | null
): Promise<void> {
  if (taskIds.length === 0) return

  const now = Date.now()

  await db.transaction("rw", [db.tasks, db.tasklists], async () => {
    // Update each task
    for (const taskId of taskIds) {
      const updates: Partial<Task> = {
        status: toStatus,
        insertedAt: now,
        insertedFrom: fromStatus,
      }
      if (toStatus === "done") {
        updates.completedAt = now
      }
      await db.tasks.update(taskId, updates)
    }

    // Remove from source list, add to destination (preserving relative order)
    await removeManyFromTasklist(scopeId, fromStatus, taskIds)
    await prependManyToTasklist(scopeId, toStatus, taskIds)
  })
}

/**
 * Delete multiple tasks (batch action)
 */
export async function batchDeleteTasks(
  taskIds: string[],
  status: TaskStatus,
  scopeId: string | null
): Promise<void> {
  if (taskIds.length === 0) return

  await db.transaction("rw", [db.tasks, db.tasklists], async () => {
    for (const taskId of taskIds) {
      await db.tasks.delete(taskId)
    }
    await removeManyFromTasklist(scopeId, status, taskIds)
  })
}

/**
 * Reorder multiple tasks within a tasklist (multi-drag)
 * Moves selected tasks to new positions as a group
 */
export async function reorderMultipleTasks(
  scopeId: string | null,
  status: TaskStatus,
  selectedIds: string[],
  allTaskIds: string[],
  overIndex: number
): Promise<void> {
  if (selectedIds.length === 0) return

  // Build new order: remove selected, insert at target position
  const remaining = allTaskIds.filter((id) => !selectedIds.includes(id))

  // Calculate insert position - if dropping after original positions, adjust
  const insertAt = Math.min(overIndex, remaining.length)

  // Insert selected items (preserving their relative order from original list)
  const orderedSelected = allTaskIds.filter((id) => selectedIds.includes(id))
  const newOrder = [
    ...remaining.slice(0, insertAt),
    ...orderedSelected,
    ...remaining.slice(insertAt),
  ]

  await reorderTasklist(scopeId, status, newOrder)
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

/**
 * Move all LATER tasks for a scope to NOW (pull from later)
 */
export async function moveAllFromLaterToNow(scopeId: string | null): Promise<void> {
  const tasks = await db.tasks
    .where("status")
    .equals("later")
    .filter((t) => t.scopeId === scopeId)
    .toArray()

  if (tasks.length === 0) return

  const now = Date.now()
  const taskIds = tasks.map((t) => t.id)

  await db.transaction("rw", [db.tasks, db.tasklists], async () => {
    for (const task of tasks) {
      await db.tasks.update(task.id, {
        status: "now",
        insertedAt: now,
        insertedFrom: "later",
      })
    }

    // Move all from later to now, preserving order
    await removeManyFromTasklist(scopeId, "later", taskIds)
    await prependManyToTasklist(scopeId, "now", taskIds)
  })
}
