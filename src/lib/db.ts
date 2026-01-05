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

// =============================================================================
// Database
// =============================================================================

class BackboardDB extends Dexie {
  tasks!: Table<Task>
  recurringTasks!: Table<RecurringTask>
  scopes!: Table<Scope>
  scheduleSlots!: Table<ScheduleSlot>
  monthSlots!: Table<MonthSlot>
  defaultScheduleSlots!: Table<DefaultScheduleSlot>
  appMeta!: Table<AppMeta>

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

    // Configure Dexie Cloud only if URL is provided
    // Without URL: pure local database (no sync)
    // With URL: sync-ready (requireAuth: false allows anonymous local usage)
    const cloudUrl = process.env.NEXT_PUBLIC_DEXIE_CLOUD_URL
    if (cloudUrl) {
      this.cloud.configure({
        databaseUrl: cloudUrl,
        requireAuth: false,
      })
    }
  }
}

export const db = new BackboardDB()
