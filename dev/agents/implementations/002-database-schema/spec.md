# Database Schema (Dexie.js)

| Field | Value |
|-------|-------|
| **ID** | 002 |
| **Status** | 🟢 In Progress |
| **Progress** | Step 3 of 5 complete |
| **Created** | 2025-12-27 |
| **Last Updated** | 2025-12-27 |

---

## Overview

Set up the Dexie.js database with complete schema, TypeScript types, and indexes. This establishes the local-first data layer that all features will build upon. Includes Dexie Cloud addon pre-configured for future sync capability.

---

## References

Read these before implementing:

| Topic | Source |
|-------|--------|
| Database schema & types | `dev/specs/trd.md` §4.1 — copy types and schema |
| Index explanations | `dev/specs/trd.md` §4.2 |
| Dexie Cloud setup | `dev/specs/trd.md` §5.1 — configure addon with `requireAuth: false` |
| Data model (product view) | `dev/specs/prd.md` §3 |

---

## Scope

### In Scope
- Install `dexie`, `dexie-cloud-addon`, and `dexie-react-hooks` packages
- Create TypeScript types for all entities (Task, RecurringTask, Scope, ScheduleSlot, MonthSlot, DefaultScheduleSlot, AppMeta)
- Create BackboardDB class extending Dexie with all tables
- Define schema with appropriate indexes per TRD §4.2
- Configure Dexie Cloud addon with `requireAuth: false` (anonymous local usage)
- Export `db` instance from `src/lib/db.ts`
- Add placeholder `NEXT_PUBLIC_DEXIE_CLOUD_URL` to `.env.example`

### Out of Scope
- Sync jobs (recurring inserter, schedule populator, purge logic) — separate implementation
- `useLiveQuery` hooks — built alongside UI components
- Clerk authentication integration — separate implementation
- Actual Dexie Cloud account/URL setup — deferred until auth implementation
- Seed data or migrations

---

## Dependencies

- `001-initial-project-setup` ✅ Complete

---

## Files Created

Exact files this implementation will create or modify:

- [x] `src/lib/db.ts` — Database class, types, and schema
- [x] `.env.example` — Add Dexie Cloud URL placeholder (modify existing)
- [ ] `package.json` — New dependencies (modified by pnpm)

---

## Implementation Plan

### Step 1: Install Dexie Packages

**Do**: Install Dexie.js, the cloud addon, and React hooks.

**Commands**:
```bash
pnpm add dexie dexie-cloud-addon dexie-react-hooks
```

**Verify**: 
- `package.json` dependencies include `dexie`, `dexie-cloud-addon`, `dexie-react-hooks`
- Run `pnpm list dexie` shows version 4.x

---

### Step 2: Create Database File with Types

**Do**: Create `src/lib/db.ts` with all TypeScript types from TRD §4.1. Include the type definitions at the top of the file.

**Create file** `src/lib/db.ts`:

```typescript
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

export interface RecurringTask {
  id: string
  scopeId: string
  title: string
  content?: string
  frequency: FrequencyValue[]
  createdAt: number
  lastInsertedDate?: string // YYYY-MM-DD, prevents duplicate insertion
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
```

**Verify**: 
- File exists at `src/lib/db.ts`
- No TypeScript errors: `pnpm exec tsc --noEmit`

---

### Step 3: Update Environment Template

**Do**: Add Dexie Cloud URL placeholder to `.env.example`.

**Modify file** `.env.example` — append to existing content:

```bash
# Dexie Cloud (configured for future sync)
# Get your database URL from https://dexie.cloud after creating an account
# NEXT_PUBLIC_DEXIE_CLOUD_URL=https://your-db.dexie.cloud
```

**Verify**: 
- `.env.example` contains the Dexie Cloud URL comment

---

### Step 4: Verify Build

**Do**: Ensure the project builds successfully with the new database module.

**Commands**:
```bash
pnpm build
```

**Verify**: 
- Build exits with code 0
- No errors related to `src/lib/db.ts`

---

### Step 5: Verify Database Import

**Do**: Create a quick smoke test by temporarily importing the database in a page to ensure it initializes. Then remove the test code.

**Test** (manual verification):
1. Add to `src/app/tasks/page.tsx` temporarily:
   ```typescript
   import { db } from "@/lib/db"
   console.log("DB tables:", db.tables.map(t => t.name))
   ```
2. Run `pnpm dev`
3. Open browser console at `http://localhost:3000/tasks`
4. Confirm log shows: `DB tables: ['tasks', 'recurringTasks', 'scopes', 'scheduleSlots', 'monthSlots', 'defaultScheduleSlots', 'appMeta']`
5. **Remove the test code** from tasks/page.tsx

**Verify**: 
- Console shows all 7 table names
- Test code is removed after verification

---

## Verification

Run these checks after implementation is complete:

| Check | Command | Expected Result |
|-------|---------|-----------------|
| TypeScript compiles | `pnpm exec tsc --noEmit` | Exit code 0, no errors |
| Build succeeds | `pnpm build` | Exit code 0 |
| Lint passes | `pnpm lint` | Exit code 0 (warnings OK) |

Manual checks:
- [ ] `src/lib/db.ts` exports `db` instance
- [ ] `src/lib/db.ts` exports all type definitions
- [ ] Database initializes in browser without errors (check console)
- [ ] IndexedDB database "backboard" appears in browser DevTools → Application → IndexedDB
- [ ] No Dexie Cloud connection errors in console (since `NEXT_PUBLIC_DEXIE_CLOUD_URL` is not set)

---

## Notes for Implementer

### Dexie Cloud Behavior
- **Without `NEXT_PUBLIC_DEXIE_CLOUD_URL`**: Database works purely locally. No sync, no cloud connection attempts.
- **With `NEXT_PUBLIC_DEXIE_CLOUD_URL`**: Cloud sync is enabled with `requireAuth: false` (anonymous usage allowed).

### Why the Cloud Addon is Included
Even though we're not using cloud sync yet, including the addon from day 1 means:
1. No database migration needed when sync is added later
2. The schema is sync-compatible from the start
3. Dexie Cloud features like access control can be added incrementally

### Types are Exported
All types (`Task`, `Scope`, `TaskStatus`, etc.) are exported so other modules can import them:
```typescript
import { db, type Task, type Scope } from "@/lib/db"
```

