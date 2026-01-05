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
