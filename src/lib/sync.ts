import { format, subDays, addDays } from "date-fns"
import { prependToTasklist, removeManyFromTasklist } from "./tasklist-helpers"
import {
  db,
  type Weekday,
  type RecurringTask,
  type TaskStatus,
  type Task,
  type ScheduleSlot,
} from "@/lib/db"

// Note: With Dexie Cloud's @id schema, IDs are auto-generated on add()

export interface SyncResult {
  recurringTasksInserted: number
  scheduleSlotsCreated: number
  tasksPurged: number
  scopesPurged: number
  scheduleSlotsArchived: number
  monthSlotsArchived: number
}

/**
 * Run all sync jobs
 * Safe to call multiple times - all operations are idempotent
 */
export async function runSyncJobs(): Promise<SyncResult> {
  const now = new Date()
  const today = format(now, "yyyy-MM-dd")
  const currentMonth = format(now, "yyyy-MM")

  const results = await Promise.all([
    insertRecurringTasks(now, today),
    populateScheduleSlots(today),
    purgeDoneTasks(now),
    purgeArchivedScopes(now),
    purgeStaleScheduleSlots(today),
    purgeStaleMonthSlots(currentMonth),
  ])

  // Update last synced timestamp
  const existingMeta = await db.appMeta.get("app")
  await db.appMeta.put({
    id: "app",
    lastSyncedAt: Date.now(),
    timezone: existingMeta?.timezone ?? Intl.DateTimeFormat().resolvedOptions().timeZone,
  })

  return {
    recurringTasksInserted: results[0],
    scheduleSlotsCreated: results[1],
    tasksPurged: results[2],
    scopesPurged: results[3],
    scheduleSlotsArchived: results[4],
    monthSlotsArchived: results[5],
  }
}

/**
 * Get the timestamp of the last sync
 */
export async function getLastSyncedAt(): Promise<number | null> {
  const meta = await db.appMeta.get("app")
  return meta?.lastSyncedAt ?? null
}

/**
 * Insert recurring tasks that are scheduled for today and haven't been inserted yet
 */
async function insertRecurringTasks(now: Date, today: string): Promise<number> {
  const currentWeekday = format(now, "eee").toLowerCase() as Weekday
  const currentTime = format(now, "HH:mm")

  const recurringTasks = await db.recurringTasks.toArray()
  let insertedCount = 0

  for (const rt of recurringTasks) {
    // Skip if already inserted today
    if (rt.lastInsertedDate === today) continue

    // Skip if no frequency set (template mode)
    if (rt.frequency.length === 0) continue

    // Check if any frequency matches today and time has passed
    const shouldInsert = rt.frequency.some(
      (f) => f.weekday === currentWeekday && f.time <= currentTime
    )

    if (shouldInsert) {
      await insertRecurringTaskToNow(rt, today)
      insertedCount++
    }
  }

  return insertedCount
}

/**
 * Insert a recurring task into the Now list
 * Updates lastInsertedDate to prevent duplicate insertion
 */
async function insertRecurringTaskToNow(
  recurringTask: RecurringTask,
  today: string
): Promise<void> {
  const now = Date.now()

  await db.transaction("rw", [db.tasks, db.recurringTasks, db.tasklists], async () => {
    // Create new task from template - Dexie auto-generates the ID
    const id = (await db.tasks.add({
      scopeId: recurringTask.scopeId,
      title: recurringTask.title,
      content: recurringTask.content,
      status: "now",
      insertedAt: now,
      insertedFrom: "recurring",
      createdAt: now,
    } as Task)) as string

    // Add to "now" tasklist
    await prependToTasklist(recurringTask.scopeId, "now", id)

    // Update lastInsertedDate to prevent re-insertion today
    await db.recurringTasks.update(recurringTask.id, { lastInsertedDate: today })
  })
}

/**
 * Populate schedule slots for the next 7 days from default schedule slots
 * Respects user exclusions (manually removed today's slots)
 * Also cleans up stale exclusions (dates before today)
 */
async function populateScheduleSlots(today: string): Promise<number> {
  // Clean up stale exclusions first (dates before today)
  const staleExclusions = await db.excludedScheduleSlots.where("date").below(today).toArray()

  if (staleExclusions.length > 0) {
    await db.excludedScheduleSlots.bulkDelete(staleExclusions.map((e) => e.id))
  }

  // Get all default schedule slots
  const defaults = await db.defaultScheduleSlots.toArray()

  // Get current exclusions (only today matters since we're populating forward)
  const exclusions = await db.excludedScheduleSlots.toArray()
  const exclusionSet = new Set(exclusions.map((e) => `${e.date}:${e.scopeId}`))

  let createdCount = 0

  // Create slots for next 7 days
  for (let i = 0; i < 7; i++) {
    const date = addDays(new Date(today), i)
    const dateStr = format(date, "yyyy-MM-dd")
    const weekday = format(date, "eee").toLowerCase() as Weekday

    // Find defaults for this weekday
    const dayDefaults = defaults.filter((d) => d.weekday === weekday)

    for (const def of dayDefaults) {
      // Skip if user excluded this slot
      const exclusionKey = `${dateStr}:${def.jobId}`
      if (exclusionSet.has(exclusionKey)) {
        continue
      }

      // Check if slot already exists using compound index
      const existing = await db.scheduleSlots
        .where("[date+scopeId]")
        .equals([dateStr, def.jobId])
        .first()

      if (!existing) {
        // With @id schema, Dexie auto-generates the ID
        await db.scheduleSlots.add({
          date: dateStr,
          weekday,
          scopeId: def.jobId,
        } as ScheduleSlot)
        createdCount++
      }
    }
  }

  return createdCount
}

/**
 * Purge done tasks older than 7 days
 */
async function purgeDoneTasks(now: Date): Promise<number> {
  const cutoff = subDays(now, 7).getTime()

  // Find tasks to delete
  const tasksToDelete = await db.tasks.where("completedAt").below(cutoff).toArray()

  if (tasksToDelete.length === 0) return 0

  // Group by scopeId for tasklist cleanup
  const tasksByScope = new Map<string | null, string[]>()
  for (const task of tasksToDelete) {
    const key = task.scopeId
    if (!tasksByScope.has(key)) {
      tasksByScope.set(key, [])
    }
    tasksByScope.get(key)!.push(task.id)
  }

  await db.transaction("rw", [db.tasks, db.tasklists], async () => {
    // Delete tasks
    await db.tasks.bulkDelete(tasksToDelete.map((t) => t.id))

    // Remove from tasklists
    for (const [scopeId, taskIds] of tasksByScope) {
      await removeManyFromTasklist(scopeId, "done", taskIds)
    }
  })

  return tasksToDelete.length
}

/**
 * Purge archived scopes older than 30 days
 * Also deletes associated tasks, recurring tasks, and schedule slots
 */
async function purgeArchivedScopes(now: Date): Promise<number> {
  const cutoff = subDays(now, 30).getTime()

  // Find scopes to delete (archivedAt is set and older than cutoff)
  const scopesToDelete = await db.scopes
    .where("archivedAt")
    .below(cutoff)
    .filter((s) => s.archivedAt !== undefined && s.archivedAt > 0)
    .toArray()

  if (scopesToDelete.length === 0) return 0

  await db.transaction(
    "rw",
    [
      db.scopes,
      db.tasks,
      db.recurringTasks,
      db.scheduleSlots,
      db.monthSlots,
      db.defaultScheduleSlots,
      db.tasklists,
    ],
    async () => {
      for (const scope of scopesToDelete) {
        // Delete tasks for this scope
        const tasks = await db.tasks.where("scopeId").equals(scope.id).toArray()
        if (tasks.length > 0) {
          await db.tasks.bulkDelete(tasks.map((t) => t.id))
        }

        // Delete recurring tasks for this scope
        const recurringTasks = await db.recurringTasks.where("scopeId").equals(scope.id).toArray()
        if (recurringTasks.length > 0) {
          await db.recurringTasks.bulkDelete(recurringTasks.map((t) => t.id))
        }

        // Delete schedule slots for this scope
        await db.scheduleSlots.where("scopeId").equals(scope.id).delete()

        // Delete default schedule slots for this scope (if it's a job)
        if (scope.type === "job") {
          await db.defaultScheduleSlots.where("jobId").equals(scope.id).delete()
        }

        // Delete month slots for this scope (if it's a project)
        if (scope.type === "project") {
          await db.monthSlots.where("projectId").equals(scope.id).delete()
        }

        // Delete tasklists for this scope
        const statuses: (TaskStatus | "recurring")[] = [
          "now",
          "later",
          "backlog",
          "done",
          "recurring",
        ]
        for (const status of statuses) {
          const tasklistId = `${scope.id}:${status}`
          await db.tasklists.delete(tasklistId)
        }

        // Delete the scope itself
        await db.scopes.delete(scope.id)
      }
    }
  )

  return scopesToDelete.length
}

/**
 * Purge schedule slots with dates before today
 */
async function purgeStaleScheduleSlots(today: string): Promise<number> {
  // Find all schedule slots with date before today
  const staleSlots = await db.scheduleSlots.where("date").below(today).toArray()

  if (staleSlots.length === 0) return 0

  await db.scheduleSlots.bulkDelete(staleSlots.map((s) => s.id))

  return staleSlots.length
}

/**
 * Purge month slots with months before current month
 */
async function purgeStaleMonthSlots(currentMonth: string): Promise<number> {
  // Find all month slots with month before current month
  const staleSlots = await db.monthSlots.where("month").below(currentMonth).toArray()

  if (staleSlots.length === 0) return 0

  await db.monthSlots.bulkDelete(staleSlots.map((s) => s.id))

  return staleSlots.length
}
