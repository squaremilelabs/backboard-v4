# Local Sync Jobs

| Field            | Value           |
| ---------------- | --------------- |
| **ID**           | 015             |
| **Status**       | 🟢 In Progress  |
| **Progress**     | Step 8 of 9     |
| **Created**      | 2026-01-05      |
| **Last Updated** | 2026-01-05      |

---

## Overview

Implement client-side background jobs that run on app launch and via manual sync button. These jobs maintain data integrity: auto-inserting recurring tasks, populating schedule slots, and purging old data per the PRD's ephemeral design philosophy.

---

## References

Read these before implementing:

| Topic                    | Source                                            |
| ------------------------ | ------------------------------------------------- |
| Local sync concept       | `dev/specs/prd.md` §5                             |
| Sync job code            | `dev/specs/trd.md` §6 (reference implementation)  |
| Data lifecycle           | `dev/specs/prd.md` §6                             |
| RecurringTask schema     | `src/lib/db.ts`                                   |
| Existing insert function | `src/lib/recurring-task-mutations.ts`             |
| Tasklist helpers         | `src/lib/tasklist-helpers.ts`                     |
| App sidebar              | `src/components/layout/app-sidebar.tsx`           |
| Mobile nav               | `src/components/layout/mobile-nav.tsx`            |

---

## Scope

### In Scope

**Four Sync Jobs:**
1. **Recurring inserter** — Check RecurringTasks; if current time ≥ scheduled time and task hasn't been inserted today, insert into "Now"
2. **Schedule populator** — For each Job with DefaultScheduleSlots, ensure ScheduleSlots exist for the next 7 days
3. **Done purge** — Delete tasks with `status: done` where `completedAt < now - 7 days`
4. **Archive purge** — Delete Scopes where `archivedAt < now - 30 days` (and their associated tasks)

**Triggers:**
- Auto-run on app launch
- Manual "Sync" button in secondary nav (next to Archive)

**UI Feedback:**
- Sync button shows timestamp of last sync
- Brief indicator while syncing
- Toast notification showing results ("Synced: 3 tasks inserted, 2 purged" or "No changes")

**Idempotency:**
- All jobs safe to run multiple times
- `lastInsertedDate` prevents duplicate recurring task insertion
- Compound index checks prevent duplicate schedule slots

### Out of Scope

- Visibility change trigger (auto-sync when tab becomes visible)
- Cloud sync (Dexie Cloud) — separate implementation
- Authentication (Clerk) — separate implementation

---

## Dependencies

- ✅ 002 Database Schema (tables exist)
- ✅ 007 Scheduling Grids (DefaultScheduleSlots, ScheduleSlots)
- ✅ 013 Recurring Tasks Foundation (`insertRecurringTaskNow` function)
- ✅ 014 Task Drag and Drop (Tasklist ordering)

---

## Files Created/Modified

- [x] `package.json` — Add `sonner` for toast notifications
- [x] `src/lib/sync.ts` — Create: All sync job functions
- [x] `src/hooks/use-sync.ts` — Create: Hook for sync state and trigger
- [x] `src/components/layout/sync-button.tsx` — Create: Sync button with timestamp
- [x] `src/components/layout/app-sidebar.tsx` — Modify: Add SyncButton to secondary nav
- [x] `src/components/layout/mobile-nav.tsx` — Modify: Add SyncButton to mobile nav
- [x] `src/components/providers/sync-provider.tsx` — Create: Provider that runs sync on mount
- [x] `src/app/layout.tsx` — Modify: Add Toaster and SyncProvider

---

## Implementation Plan

### Step 1: Install sonner ✅

**Do**: Add sonner toast library for sync feedback.

**Commands**:
```bash
pnpm add sonner
```

**Verify**:
- `sonner` appears in `package.json` dependencies

---

### Step 2: Create sync.ts with all sync jobs ✅

**Do**: Create the core sync job functions based on TRD §6.

**Create** `src/lib/sync.ts`:

```typescript
import { db, type Weekday, type RecurringTask, type TaskStatus } from "@/lib/db"
import { format, subDays, addDays, startOfWeek } from "date-fns"
import { prependToTasklist, removeFromTasklist, removeManyFromTasklist } from "./tasklist-helpers"

export interface SyncResult {
  recurringTasksInserted: number
  scheduleSlotsCreated: number
  tasksPurged: number
  scopesPurged: number
}

/**
 * Run all sync jobs
 * Safe to call multiple times - all operations are idempotent
 */
export async function runSyncJobs(): Promise<SyncResult> {
  const now = new Date()
  const today = format(now, "yyyy-MM-dd")

  const results = await Promise.all([
    insertRecurringTasks(now, today),
    populateScheduleSlots(today),
    purgeDoneTasks(now),
    purgeArchivedScopes(now),
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
  const id = crypto.randomUUID()
  const now = Date.now()

  await db.transaction("rw", [db.tasks, db.recurringTasks, db.tasklists], async () => {
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

    // Add to "now" tasklist
    await prependToTasklist(recurringTask.scopeId, "now", id)

    // Update lastInsertedDate to prevent re-insertion today
    await db.recurringTasks.update(recurringTask.id, { lastInsertedDate: today })
  })
}

/**
 * Populate schedule slots for the next 7 days from default schedule slots
 */
async function populateScheduleSlots(today: string): Promise<number> {
  // Get all default schedule slots
  const defaults = await db.defaultScheduleSlots.toArray()
  let createdCount = 0

  // Create slots for next 7 days
  for (let i = 0; i < 7; i++) {
    const date = addDays(new Date(today), i)
    const dateStr = format(date, "yyyy-MM-dd")
    const weekday = format(date, "eee").toLowerCase() as Weekday

    // Find defaults for this weekday
    const dayDefaults = defaults.filter((d) => d.weekday === weekday)

    for (const def of dayDefaults) {
      // Check if slot already exists using compound index
      const existing = await db.scheduleSlots
        .where("[date+scopeId]")
        .equals([dateStr, def.jobId])
        .first()

      if (!existing) {
        await db.scheduleSlots.add({
          id: crypto.randomUUID(),
          date: dateStr,
          weekday,
          scopeId: def.jobId,
        })
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
  const tasksToDelete = await db.tasks
    .where("completedAt")
    .below(cutoff)
    .toArray()

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
    [db.scopes, db.tasks, db.recurringTasks, db.scheduleSlots, db.monthSlots, db.defaultScheduleSlots, db.tasklists],
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
        const statuses: (TaskStatus | "recurring")[] = ["now", "later", "backlog", "done", "recurring"]
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
```

**Verify**:
- File created at `src/lib/sync.ts`
- No TypeScript errors: `pnpm tsc --noEmit`

---

### Step 3: Create use-sync.ts hook ✅

**Do**: Create a hook that manages sync state and provides a trigger function.

**Create** `src/hooks/use-sync.ts`:

```typescript
"use client"

import { useState, useCallback, useEffect } from "react"
import { useLiveQuery } from "dexie-react-hooks"
import { db } from "@/lib/db"
import { runSyncJobs, type SyncResult } from "@/lib/sync"

interface UseSyncReturn {
  isSyncing: boolean
  lastSyncedAt: number | null
  lastResult: SyncResult | null
  sync: () => Promise<SyncResult>
}

/**
 * Hook for managing sync state and triggering sync jobs
 */
export function useSync(): UseSyncReturn {
  const [isSyncing, setIsSyncing] = useState(false)
  const [lastResult, setLastResult] = useState<SyncResult | null>(null)

  // Live query for last synced timestamp
  const lastSyncedAt = useLiveQuery(async () => {
    const meta = await db.appMeta.get("app")
    return meta?.lastSyncedAt ?? null
  })

  const sync = useCallback(async (): Promise<SyncResult> => {
    setIsSyncing(true)
    try {
      const result = await runSyncJobs()
      setLastResult(result)
      return result
    } finally {
      setIsSyncing(false)
    }
  }, [])

  return {
    isSyncing,
    lastSyncedAt: lastSyncedAt ?? null,
    lastResult,
    sync,
  }
}

/**
 * Format sync result as a human-readable message
 */
export function formatSyncResult(result: SyncResult): string {
  const parts: string[] = []

  if (result.recurringTasksInserted > 0) {
    parts.push(
      `${result.recurringTasksInserted} recurring task${result.recurringTasksInserted === 1 ? "" : "s"} inserted`
    )
  }

  if (result.scheduleSlotsCreated > 0) {
    parts.push(
      `${result.scheduleSlotsCreated} schedule slot${result.scheduleSlotsCreated === 1 ? "" : "s"} created`
    )
  }

  if (result.tasksPurged > 0) {
    parts.push(
      `${result.tasksPurged} old task${result.tasksPurged === 1 ? "" : "s"} purged`
    )
  }

  if (result.scopesPurged > 0) {
    parts.push(
      `${result.scopesPurged} archived scope${result.scopesPurged === 1 ? "" : "s"} purged`
    )
  }

  if (parts.length === 0) {
    return "Everything up to date"
  }

  return parts.join(", ")
}

/**
 * Format timestamp as relative time (e.g., "2 min ago", "Just now")
 */
export function formatLastSynced(timestamp: number | null): string {
  if (!timestamp) return "Never"

  const now = Date.now()
  const diff = now - timestamp
  const seconds = Math.floor(diff / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)

  if (seconds < 10) return "Just now"
  if (seconds < 60) return `${seconds}s ago`
  if (minutes < 60) return `${minutes}m ago`
  if (hours < 24) return `${hours}h ago`

  // Format as date for older timestamps
  return new Date(timestamp).toLocaleDateString()
}
```

**Verify**:
- File created at `src/hooks/use-sync.ts`
- No TypeScript errors

---

### Step 4: Create sync-button.tsx component ✅

**Do**: Create the sync button component with timestamp display.

**Create** `src/components/layout/sync-button.tsx`:

```typescript
"use client"

import { RefreshCw } from "lucide-react"
import { toast } from "sonner"
import { useSync, formatSyncResult, formatLastSynced } from "@/hooks/use-sync"
import { cn } from "@/lib/utils"

interface SyncButtonProps {
  className?: string
  variant?: "sidebar" | "mobile"
}

export function SyncButton({ className, variant = "sidebar" }: SyncButtonProps) {
  const { isSyncing, lastSyncedAt, sync } = useSync()

  const handleSync = async () => {
    const result = await sync()
    const message = formatSyncResult(result)
    
    // Show toast with result
    const hasChanges =
      result.recurringTasksInserted > 0 ||
      result.scheduleSlotsCreated > 0 ||
      result.tasksPurged > 0 ||
      result.scopesPurged > 0

    if (hasChanges) {
      toast.success("Synced", { description: message })
    } else {
      toast.info("Synced", { description: message })
    }
  }

  if (variant === "mobile") {
    return (
      <button
        onClick={handleSync}
        disabled={isSyncing}
        className={cn(
          "flex w-full items-center justify-between rounded-md px-3 py-2 text-sm font-medium transition-colors",
          "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
          "disabled:pointer-events-none disabled:opacity-50",
          className
        )}
      >
        <span className="flex items-center gap-2">
          <RefreshCw className={cn("h-4 w-4", isSyncing && "animate-spin")} />
          <span>Sync</span>
        </span>
        <span className="text-xs text-muted-foreground/70">
          {formatLastSynced(lastSyncedAt)}
        </span>
      </button>
    )
  }

  // Sidebar variant
  return (
    <button
      onClick={handleSync}
      disabled={isSyncing}
      className={cn(
        "flex w-full items-center justify-between rounded-xl border-2 border-transparent px-3 py-1.5",
        "text-sm text-muted-foreground transition-colors",
        "hover:bg-background hover:text-foreground",
        "disabled:pointer-events-none disabled:opacity-50",
        className
      )}
    >
      <span className="flex items-center gap-2">
        <RefreshCw className={cn("h-4 w-4", isSyncing && "animate-spin")} />
        <span>Sync</span>
      </span>
      <span className="text-xs text-muted-foreground/70">
        {formatLastSynced(lastSyncedAt)}
      </span>
    </button>
  )
}
```

**Verify**:
- File created at `src/components/layout/sync-button.tsx`
- No TypeScript errors

---

### Step 5: Create sync-provider.tsx ✅

**Do**: Create a provider component that runs sync on app mount.

**Create** `src/components/providers/sync-provider.tsx`:

```typescript
"use client"

import { useEffect, useRef } from "react"
import { Toaster, toast } from "sonner"
import { runSyncJobs } from "@/lib/sync"
import { formatSyncResult } from "@/hooks/use-sync"

interface SyncProviderProps {
  children: React.ReactNode
}

export function SyncProvider({ children }: SyncProviderProps) {
  const hasRunRef = useRef(false)

  useEffect(() => {
    // Only run once on mount
    if (hasRunRef.current) return
    hasRunRef.current = true

    const runInitialSync = async () => {
      try {
        const result = await runSyncJobs()
        const message = formatSyncResult(result)

        // Only show toast if there were changes
        const hasChanges =
          result.recurringTasksInserted > 0 ||
          result.scheduleSlotsCreated > 0 ||
          result.tasksPurged > 0 ||
          result.scopesPurged > 0

        if (hasChanges) {
          toast.success("Synced on startup", { description: message })
        }
      } catch (error) {
        console.error("Sync failed:", error)
        toast.error("Sync failed", {
          description: "Could not complete background sync",
        })
      }
    }

    runInitialSync()
  }, [])

  return (
    <>
      {children}
      <Toaster position="bottom-right" richColors closeButton />
    </>
  )
}
```

**Verify**:
- File created at `src/components/providers/sync-provider.tsx`
- No TypeScript errors

---

### Step 6: Update app-sidebar.tsx ✅

**Do**: Add the SyncButton to the sidebar's secondary navigation area.

**Modify** `src/components/layout/app-sidebar.tsx`:

1. Add import:
```typescript
import { SyncButton } from "./sync-button"
```

2. Update the secondary navigation section to include the SyncButton above Archive:

Find this block:
```typescript
{/* Secondary navigation (Archive) */}
<nav className="px-3 pt-6 pb-3">
  {secondaryNavItems.map((item) => (
    <NavItem
      key={item.href}
      href={item.href}
      label={item.label}
      isActive={pathname === item.href || pathname.startsWith(item.href + "/")}
    />
  ))}
</nav>
```

Replace with:
```typescript
{/* Secondary navigation (Sync + Archive) */}
<nav className="space-y-1 px-3 pt-6 pb-3">
  <SyncButton />
  {secondaryNavItems.map((item) => (
    <NavItem
      key={item.href}
      href={item.href}
      label={item.label}
      isActive={pathname === item.href || pathname.startsWith(item.href + "/")}
    />
  ))}
</nav>
```

**Verify**:
- SyncButton appears above Archive in sidebar
- No TypeScript errors

---

### Step 7: Update mobile-nav.tsx ✅

**Do**: Add the SyncButton to the mobile navigation.

**Modify** `src/components/layout/mobile-nav.tsx`:

1. Add import:
```typescript
import { SyncButton } from "./sync-button"
```

2. Update the secondary navigation section to include SyncButton:

Find this block:
```typescript
{/* Secondary navigation (Archive) */}
<nav className="border-t p-4">
  {secondaryNavItems.map((item) => (
    <NavItem
      key={item.href}
      href={item.href}
      label={item.label}
      isActive={pathname === item.href || pathname.startsWith(item.href + "/")}
      onClick={closeSheet}
    />
  ))}
</nav>
```

Replace with:
```typescript
{/* Secondary navigation (Sync + Archive) */}
<nav className="space-y-1 border-t p-4">
  <SyncButton variant="mobile" />
  {secondaryNavItems.map((item) => (
    <NavItem
      key={item.href}
      href={item.href}
      label={item.label}
      isActive={pathname === item.href || pathname.startsWith(item.href + "/")}
      onClick={closeSheet}
    />
  ))}
</nav>
```

**Verify**:
- SyncButton appears in mobile nav sheet
- No TypeScript errors

---

### Step 8: Update layout.tsx ✅

**Do**: Wrap the app with SyncProvider to enable toasts and auto-sync on mount.

**Modify** `src/app/layout.tsx`:

1. Add import:
```typescript
import { SyncProvider } from "@/components/providers/sync-provider"
```

2. Wrap PageShell with SyncProvider:

Change:
```typescript
<NuqsAdapter>
  <PageShell>{children}</PageShell>
</NuqsAdapter>
```

To:
```typescript
<NuqsAdapter>
  <SyncProvider>
    <PageShell>{children}</PageShell>
  </SyncProvider>
</NuqsAdapter>
```

**Verify**:
- App starts without errors
- Toast appears in bottom-right when changes occur on startup
- `pnpm dev` works

---

### Step 9: Verify and test

**Do**: Verify all functionality works correctly.

**Commands**:
```bash
pnpm tsc --noEmit
pnpm lint
```

**Manual Testing Checklist**:

1. **App Launch Sync**:
   - [ ] Open app → sync runs automatically
   - [ ] Toast appears if there are changes
   - [ ] No toast if everything is up to date

2. **Manual Sync Button**:
   - [ ] Click Sync in sidebar → shows spinning icon
   - [ ] Toast shows result message
   - [ ] Timestamp updates to "Just now"
   - [ ] Multiple clicks don't create duplicates

3. **Recurring Task Insertion**:
   - [ ] Create a recurring task with today's weekday, time in the past
   - [ ] Click Sync → task appears in Now list
   - [ ] Click Sync again → no duplicate created

4. **Schedule Slot Population**:
   - [ ] Create a Job with DefaultScheduleSlot for today
   - [ ] Click Sync → Schedule page shows the slot
   - [ ] Click Sync again → no duplicate slots

5. **Done Task Purge**:
   - [ ] Mark a task as done
   - [ ] Manually set `completedAt` to 8+ days ago in IndexedDB
   - [ ] Click Sync → task is purged

6. **Archive Scope Purge**:
   - [ ] Archive a scope
   - [ ] Manually set `archivedAt` to 31+ days ago in IndexedDB
   - [ ] Click Sync → scope and its tasks are purged

**Verify**:
- All tests pass
- No console errors
- No TypeScript errors
- Lint passes

---

## Testing Scenarios

### Scenario 1: Fresh App Launch
1. User opens app for first time today
2. Recurring tasks scheduled for today (before current time) should be inserted
3. Schedule slots for next 7 days should be populated
4. Old done tasks (>7 days) should be purged
5. Old archived scopes (>30 days) should be purged

### Scenario 2: Multiple Syncs Per Day
1. User syncs at 9am → recurring task for 8am is inserted
2. User syncs at 10am → same recurring task NOT inserted again (lastInsertedDate check)
3. User syncs at 3pm after 2pm recurring task time → that task IS inserted

### Scenario 3: DefaultScheduleSlot Changes
1. User has Job A scheduled for Mon/Wed
2. User adds Friday to Job A's default schedule
3. User clicks Sync → Friday's ScheduleSlot is created for next 7 days

### Scenario 4: Idempotency
1. User clicks Sync 10 times rapidly
2. No duplicate tasks created
3. No duplicate schedule slots created
4. Same result each time

---

## Notes

- The TRD §6 code is a reference implementation; this spec adapts it to integrate with the Tasklist system from impl 014
- Toast notifications use sonner for a polished UX
- The sync button shows relative time (e.g., "2m ago") that updates on sync
- Archive purge cascades to delete all related entities (tasks, recurring tasks, slots, tasklists)
