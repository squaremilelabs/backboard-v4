import Dexie, { type Table } from "dexie"
import dexieCloud from "dexie-cloud-addon"

// =============================================================================
// Types
// =============================================================================

export type TaskStatus = "now" | "later" | "backlog" | "done"
export type TasklistType = TaskStatus | "recurring"
export type ScopeType = "job" | "project"
export type Weekday = "mon" | "tue" | "wed" | "thu" | "fri" | "sat" | "sun"

export interface Task {
  id: string
  scopeId: string | null // null = Triage
  title: string
  content?: string
  status: TaskStatus
  pendingAction?: TaskStatus | "delete" | null
  insertedAt: number
  insertedFrom: TasklistType // For undo & metadata display
  createdAt: number
  completedAt?: number // For 7-day purge
}

export interface FrequencyValue {
  weekday: Weekday
  time: string // HH:mm
  timezone: string // e.g., America/New_York
}

export type RecurringTaskAction = "delete" | "insert"

export interface RecurringTask {
  id: string
  scopeId: string
  title: string
  content?: string
  frequency: FrequencyValue[]
  createdAt: number
  lastInsertedDate?: string // YYYY-MM-DD, prevents duplicate insertion
  pendingAction?: RecurringTaskAction | null
}

export interface Tasklist {
  id: string // Derived: `${scopeId ?? 'triage'}:${type}`
  scopeId: string | null // null = Triage
  type: TasklistType // 'now' | 'later' | 'backlog' | 'done' | 'recurring'
  taskIds: string[] // Ordered array of task/recurring-task IDs
}

export interface Scope {
  id: string
  type: ScopeType
  title: string
  content?: string
  parentId?: string // Only for projects, 1 level nesting
  createdAt: number
  archivedAt?: number // Timestamp if archived, undefined if active
}

export interface ScheduleSlot {
  id: string
  date: string // YYYY-MM-DD
  weekday: Weekday
  scopeId: string
}

export interface MonthSlot {
  id: string
  month: string // YYYY-MM
  projectId: string
}

export interface DefaultScheduleSlot {
  id: string
  weekday: Weekday
  jobId: string
}

export interface AppMeta {
  id: string // Always 'app'
  lastSyncedAt: number
  timezone: string
}

export interface ExcludedScheduleSlot {
  id: string
  date: string // YYYY-MM-DD
  scopeId: string
}

// =============================================================================
// Database
// =============================================================================

class BackboardDB extends Dexie {
  tasks!: Table<Task>
  recurringTasks!: Table<RecurringTask>
  tasklists!: Table<Tasklist>
  scopes!: Table<Scope>
  scheduleSlots!: Table<ScheduleSlot>
  monthSlots!: Table<MonthSlot>
  defaultScheduleSlots!: Table<DefaultScheduleSlot>
  appMeta!: Table<AppMeta>
  excludedScheduleSlots!: Table<ExcludedScheduleSlot>

  constructor() {
    super("backboard", { addons: [dexieCloud] })

    this.version(1).stores({
      // Primary key first, then indexed fields
      tasks: "id, scopeId, status, createdAt, completedAt",
      recurringTasks: "id, scopeId",
      scopes: "id, type, archivedAt",
      scheduleSlots: "id, date, scopeId, [date+scopeId]",
      monthSlots: "id, month, projectId, [month+projectId]",
      defaultScheduleSlots: "id, weekday, jobId, [weekday+jobId]",
      appMeta: "id",
    })

    this.version(2)
      .stores({
        tasks: "id, scopeId, status, createdAt, completedAt",
        recurringTasks: "id, scopeId",
        tasklists: "id, scopeId, type",
        scopes: "id, type, archivedAt",
        scheduleSlots: "id, date, scopeId, [date+scopeId]",
        monthSlots: "id, month, projectId, [month+projectId]",
        defaultScheduleSlots: "id, weekday, jobId, [weekday+jobId]",
        appMeta: "id",
      })
      .upgrade(async (tx) => {
        // Migration: create tasklists from existing tasks
        const tasks = await tx.table("tasks").toArray()
        const recurringTasks = await tx.table("recurringTasks").toArray()

        // Group tasks by scopeId + status
        const tasklistMap = new Map<
          string,
          { scopeId: string | null; type: string; taskIds: string[] }
        >()

        for (const task of tasks) {
          const id = `${task.scopeId ?? "triage"}:${task.status}`
          if (!tasklistMap.has(id)) {
            tasklistMap.set(id, { scopeId: task.scopeId, type: task.status, taskIds: [] })
          }
          tasklistMap.get(id)!.taskIds.push(task.id)
        }

        // Group recurring tasks by scopeId
        for (const task of recurringTasks) {
          const id = `${task.scopeId}:recurring`
          if (!tasklistMap.has(id)) {
            tasklistMap.set(id, { scopeId: task.scopeId, type: "recurring", taskIds: [] })
          }
          tasklistMap.get(id)!.taskIds.push(task.id)
        }

        // Sort each tasklist by createdAt descending (to match current behavior)
        const allTasks = [...tasks, ...recurringTasks]
        const taskCreatedAt = new Map(allTasks.map((t) => [t.id, t.createdAt]))

        for (const [id, data] of tasklistMap) {
          data.taskIds.sort((a, b) => (taskCreatedAt.get(b) ?? 0) - (taskCreatedAt.get(a) ?? 0))
          await tx.table("tasklists").add({ id, ...data })
        }
      })

    // Version 3: Cloud-compatible schema with @id auto-generated keys
    // BREAKING CHANGE: This clears existing data due to ID format change
    // But enables: anonymous data → user's private realm on sign-in
    this.version(3).stores({
      tasks: "@id, scopeId, status, createdAt, completedAt",
      recurringTasks: "@id, scopeId",
      tasklists: "id, scopeId, type", // Keep manual ID (derived key pattern)
      scopes: "@id, type, archivedAt",
      scheduleSlots: "@id, date, scopeId, [date+scopeId]",
      monthSlots: "@id, month, projectId, [month+projectId]",
      defaultScheduleSlots: "@id, weekday, jobId, [weekday+jobId]",
      appMeta: "id", // Keep manual ID (singleton record)
    })

    // Version 4: Add excludedScheduleSlots for user unschedule protection
    this.version(4).stores({
      tasks: "@id, scopeId, status, createdAt, completedAt",
      recurringTasks: "@id, scopeId",
      tasklists: "id, scopeId, type",
      scopes: "@id, type, archivedAt",
      scheduleSlots: "@id, date, scopeId, [date+scopeId]",
      monthSlots: "@id, month, projectId, [month+projectId]",
      defaultScheduleSlots: "@id, weekday, jobId, [weekday+jobId]",
      appMeta: "id",
      excludedScheduleSlots: "@id, date, scopeId, [date+scopeId]",
    })

    // Configure Dexie Cloud only if URL is provided
    // Without URL: pure local database (no sync)
    // With URL: sync-ready (requireAuth: false allows anonymous local usage)
    const cloudUrl = process.env.NEXT_PUBLIC_DEXIE_CLOUD_URL
    if (cloudUrl) {
      this.cloud.configure({
        databaseUrl: cloudUrl,
        requireAuth: false,
        customLoginGui: true, // We provide our own login dialog
      })
    }
  }
}

export const db = new BackboardDB()
