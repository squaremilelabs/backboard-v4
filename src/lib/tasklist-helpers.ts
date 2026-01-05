import { db, type TasklistType } from "@/lib/db"

/**
 * Derive tasklist ID from scopeId and type
 */
export function getTasklistId(scopeId: string | null, type: TasklistType): string {
  return `${scopeId ?? "triage"}:${type}`
}

/**
 * Get or create a tasklist
 */
export async function getOrCreateTasklist(
  scopeId: string | null,
  type: TasklistType
): Promise<string[]> {
  const id = getTasklistId(scopeId, type)
  const existing = await db.tasklists.get(id)

  if (existing) {
    return existing.taskIds
  }

  // Create empty tasklist
  await db.tasklists.add({
    id,
    scopeId,
    type,
    taskIds: [],
  })

  return []
}

/**
 * Prepend a task ID to a tasklist (adds to top)
 */
export async function prependToTasklist(
  scopeId: string | null,
  type: TasklistType,
  taskId: string
): Promise<void> {
  const id = getTasklistId(scopeId, type)
  const tasklist = await db.tasklists.get(id)

  if (tasklist) {
    await db.tasklists.update(id, {
      taskIds: [taskId, ...tasklist.taskIds.filter((tid) => tid !== taskId)],
    })
  } else {
    await db.tasklists.add({
      id,
      scopeId,
      type,
      taskIds: [taskId],
    })
  }
}

/**
 * Prepend multiple task IDs to a tasklist (adds to top, preserving their relative order)
 */
export async function prependManyToTasklist(
  scopeId: string | null,
  type: TasklistType,
  taskIds: string[]
): Promise<void> {
  if (taskIds.length === 0) return

  const id = getTasklistId(scopeId, type)
  const tasklist = await db.tasklists.get(id)

  const taskIdSet = new Set(taskIds)

  if (tasklist) {
    // Remove these IDs from current list, then prepend
    const filtered = tasklist.taskIds.filter((tid) => !taskIdSet.has(tid))
    await db.tasklists.update(id, {
      taskIds: [...taskIds, ...filtered],
    })
  } else {
    await db.tasklists.add({
      id,
      scopeId,
      type,
      taskIds,
    })
  }
}

/**
 * Remove a task ID from a tasklist
 */
export async function removeFromTasklist(
  scopeId: string | null,
  type: TasklistType,
  taskId: string
): Promise<void> {
  const id = getTasklistId(scopeId, type)
  const tasklist = await db.tasklists.get(id)

  if (tasklist) {
    await db.tasklists.update(id, {
      taskIds: tasklist.taskIds.filter((tid) => tid !== taskId),
    })
  }
}

/**
 * Remove multiple task IDs from a tasklist
 */
export async function removeManyFromTasklist(
  scopeId: string | null,
  type: TasklistType,
  taskIds: string[]
): Promise<void> {
  if (taskIds.length === 0) return

  const id = getTasklistId(scopeId, type)
  const tasklist = await db.tasklists.get(id)

  if (tasklist) {
    const taskIdSet = new Set(taskIds)
    await db.tasklists.update(id, {
      taskIds: tasklist.taskIds.filter((tid) => !taskIdSet.has(tid)),
    })
  }
}

/**
 * Reorder tasks within a tasklist
 */
export async function reorderTasklist(
  scopeId: string | null,
  type: TasklistType,
  taskIds: string[]
): Promise<void> {
  const id = getTasklistId(scopeId, type)
  await db.tasklists.update(id, { taskIds })
}

/**
 * Move a task from one tasklist to another
 * Removes from source, prepends to destination
 */
export async function moveTaskBetweenLists(
  taskId: string,
  fromScopeId: string | null,
  fromType: TasklistType,
  toScopeId: string | null,
  toType: TasklistType
): Promise<void> {
  await removeFromTasklist(fromScopeId, fromType, taskId)
  await prependToTasklist(toScopeId, toType, taskId)
}

/**
 * Get ordered task IDs for a tasklist
 */
export async function getTasklistOrder(
  scopeId: string | null,
  type: TasklistType
): Promise<string[]> {
  const id = getTasklistId(scopeId, type)
  const tasklist = await db.tasklists.get(id)
  return tasklist?.taskIds ?? []
}
