# MVP Wrapup Features

| Field            | Value        |
| ---------------- | ------------ |
| **ID**           | 017          |
| **Status**       | ✅ Complete  |
| **Progress**     | All steps    |
| **Created**      | 2026-01-05   |
| **Last Updated** | 2026-01-05   |

---

## Overview

Four small MVP polish features: (1) "Move X from Later" bulk action when Now list is empty but Later has tasks, (2) User unschedule protection to prevent sync from re-adding manually removed schedule slots, (3) Minimal Archive page with unarchive functionality, (4) Add "Show unfocused scopes" toggle to mobile scope selector popover.

---

## References

Read these before implementing:

| Topic                       | Source                                        |
| --------------------------- | --------------------------------------------- |
| Task lifecycle              | `dev/specs/prd.md` §2.2                       |
| Archive page concept        | `dev/specs/prd.md` §4.5                       |
| Sync jobs (schedule pop)    | `src/lib/sync.ts` `populateScheduleSlots()`   |
| Schedule slot mutations     | `src/lib/schedule-mutations.ts`               |
| Task mutations              | `src/lib/task-mutations.ts`                   |
| Task list component         | `src/components/tasks/task-list.tsx`          |
| Scope hooks                 | `src/hooks/use-scopes.ts`                     |
| Scope mutations             | `src/lib/scope-mutations.ts`                  |
| Existing archive page       | `src/app/archive/page.tsx`                    |
| Database schema             | `src/lib/db.ts`                               |
| Design themes               | `src/app/globals.css` (theme-gold, theme-blue)|
| Desktop scope list          | `src/components/tasks/scope-list.tsx`         |
| Mobile scope selector       | `src/components/tasks/scope-selector.tsx`     |
| Scope toggle component      | `src/components/tasks/scope-toggle.tsx`       |

---

## Scope

### In Scope

**Feature 1: "Move from Later" Button**
- When viewing NOW list for a scope with zero tasks, but LATER has tasks, show a button
- Button text: "Move X from Later" where X is the count of Later tasks
- Clicking moves all Later tasks to Now (batch operation)
- Appears below the empty state message

**Feature 2: User Unschedule Protection**
- When a user manually toggles OFF a schedule slot for today, track that removal
- Create new `excludedScheduleSlots` table: `{ id, date, scopeId }` 
- On schedule slot toggle-off: add to exclusion table
- On schedule slot toggle-on: remove from exclusion table (if exists)
- Modify `populateScheduleSlots()` in sync.ts: skip creating slots that exist in exclusion table
- Cleanup: Remove stale exclusions (date < today) during sync

**Feature 3: Archive Page**
- Flat list of all archived scopes (jobs + projects mixed)
- Sorted by `archivedAt` descending (most recently archived first)
- Each item shows: colored dot (gold=job, blue=project), title, unarchive button
- "Unarchive" button restores the scope (sets `archivedAt` to undefined)
- Empty state when no archived scopes
- Minimal, clean UI - no need for sections or grouping

**Feature 4: Mobile Scope Selector Toggle**
- Add "Show unfocused scopes" toggle to mobile `ScopeSelector` popover
- Same behavior as desktop: only visible for now/later/backlog lists
- Toggle appears at bottom of popover (below the scope list)
- State synced with desktop toggle (both should show same scopes)

### Out of Scope

- Archive confirmation dialog (user can re-archive easily)
- Search/filter on archive page
- Bulk unarchive
- Viewing archived scope's tasks (they remain in DB until 30-day purge)
- "Move from Backlog" button (only Later→Now)
- Exclusion tracking for future dates (only today matters)

---

## Dependencies

- ✅ 015 Local Sync Jobs (sync functionality to modify)
- ✅ 010 Task Display CRUD (task list UI patterns)
- ✅ 005 Scope Management (scope mutations)

---

## Files Created/Modified

### Feature 1: Move from Later
- [x] `src/hooks/use-tasks.ts` — Add: `useLaterTaskCount()` hook
- [x] `src/lib/task-mutations.ts` — Add: `moveAllFromLaterToNow()` function  
- [x] `src/components/tasks/task-list.tsx` — Add: "Move from Later" button in empty state

### Feature 2: Unschedule Protection
- [x] `src/lib/db.ts` — Add: `excludedScheduleSlots` table (version 4)
- [x] `src/lib/schedule-mutations.ts` — Modify: `toggleScheduleSlot()` to manage exclusions
- [x] `src/lib/sync.ts` — Modify: `populateScheduleSlots()` to respect exclusions + cleanup

### Feature 3: Archive Page
- [x] `src/hooks/use-scopes.ts` — Add: `useArchivedScopes()` hook
- [x] `src/lib/scope-mutations.ts` — Add: `unarchiveScope()` function
- [x] `src/app/archive/page.tsx` — Rebuild: Functional archive list with unarchive

### Feature 4: Mobile Scope Selector Toggle
- [x] `src/components/tasks/scope-selector.tsx` — Add: showUnfocused state and ScopeToggle

---

## Implementation Plan

### Step 1: Add `useLaterTaskCount()` hook ✅

**Do**: Create a hook to count tasks in the Later list for a given scope.

**Modify** `src/hooks/use-tasks.ts`:

Add this new hook after `useRecentTasks()`:

```typescript
/**
 * Count tasks in the Later list for a specific scope
 */
export function useLaterTaskCount(scopeId: string | "triage"): number | undefined {
  return useLiveQuery(async () => {
    const actualScopeId = scopeId === "triage" ? null : scopeId

    return db.tasks
      .where("status")
      .equals("later")
      .filter((task) => task.scopeId === actualScopeId)
      .count()
  }, [scopeId])
}
```

**Verify**:
- No TypeScript errors: `pnpm tsc --noEmit`

---

### Step 2: Add `moveAllFromLaterToNow()` mutation ✅

**Do**: Create a function to batch move all Later tasks to Now for a scope.

**Modify** `src/lib/task-mutations.ts`:

Add this new function at the end of the file:

```typescript
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
        pendingAction: null,
        insertedAt: now,
        insertedFrom: "later",
      })
    }

    // Move all from later to now, preserving order
    await removeManyFromTasklist(scopeId, "later", taskIds)
    await prependManyToTasklist(scopeId, "now", taskIds)
  })
}
```

**Verify**:
- No TypeScript errors: `pnpm tsc --noEmit`

---

### Step 3: Update TaskList component with "Move from Later" button ✅

**Do**: Add a button that appears when Now is empty but Later has tasks.

**Modify** `src/components/tasks/task-list.tsx`:

1. Add imports at the top:
```typescript
import { useLaterTaskCount } from "@/hooks/use-tasks"
import { moveAllFromLaterToNow } from "@/lib/task-mutations"
import { ArrowUp } from "lucide-react"
```

2. Inside `TaskList` component, after getting `tasks`, add:
```typescript
  // Count Later tasks (only check when viewing NOW list)
  const laterTaskCount = useLaterTaskCount(scopeId)
  
  // Show "Move from Later" when: NOW list + empty + Later has tasks
  const showMoveFromLater = isNowList && tasks?.length === 0 && (laterTaskCount ?? 0) > 0
```

3. Replace the empty state `<div>` (currently around line 69-71) with:
```typescript
        {tasks.length === 0 ? (
          <div className="px-4 py-8 text-center">
            <p className="text-sm text-muted-foreground">No tasks</p>
            {showMoveFromLater && (
              <button
                onClick={() => moveAllFromLaterToNow(actualScopeId)}
                className={cn(
                  "mt-4 inline-flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium",
                  "bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
                )}
              >
                <ArrowUp className="h-4 w-4" />
                Move {laterTaskCount} from Later
              </button>
            )}
          </div>
        ) : (
```

**Verify**:
- No TypeScript errors
- Button appears when Now is empty but Later has tasks
- Clicking button moves tasks from Later to Now

---

### Step 4: Add `excludedScheduleSlots` table to database ✅

**Do**: Add a new table to track schedule slots that the user explicitly removed.

**Modify** `src/lib/db.ts`:

1. Add the interface after `AppMeta`:
```typescript
export interface ExcludedScheduleSlot {
  id: string
  date: string // YYYY-MM-DD
  scopeId: string
}
```

2. Add the table declaration in the `BackboardDB` class (after `appMeta`):
```typescript
  excludedScheduleSlots!: Table<ExcludedScheduleSlot>
```

3. Add version 4 after version 3:
```typescript
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
```

**Verify**:
- No TypeScript errors: `pnpm tsc --noEmit`

---

### Step 5: Update `toggleScheduleSlot()` to manage exclusions ✅

**Do**: When toggling off a schedule slot for today, add an exclusion. When toggling on, remove any exclusion.

**Modify** `src/lib/schedule-mutations.ts`:

1. Add import for format at the top:
```typescript
import { format } from "date-fns"
```

2. Replace the `toggleScheduleSlot` function with:
```typescript
export async function toggleScheduleSlot(
  scopeId: string,
  date: string // YYYY-MM-DD
): Promise<void> {
  const today = format(new Date(), "yyyy-MM-dd")
  const isToday = date === today

  // Check if slot exists
  const existing = await db.scheduleSlots.where("[date+scopeId]").equals([date, scopeId]).first()

  if (existing) {
    // Removing a slot - delete it
    await db.scheduleSlots.delete(existing.id)
    
    // If removing today's slot, add exclusion to prevent sync re-adding it
    if (isToday) {
      const existingExclusion = await db.excludedScheduleSlots
        .where("[date+scopeId]")
        .equals([date, scopeId])
        .first()
      
      if (!existingExclusion) {
        await db.excludedScheduleSlots.add({
          date,
          scopeId,
        } as ExcludedScheduleSlot)
      }
    }
  } else {
    // Adding a slot - create it
    const dateObj = new Date(date + "T00:00:00")
    const weekdayIndex = dateObj.getDay() // 0 = Sunday
    const weekdays: Weekday[] = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"]
    const weekday = weekdays[weekdayIndex]

    await db.scheduleSlots.add({
      date,
      weekday,
      scopeId,
    } as ScheduleSlot)
    
    // If adding today's slot, remove any exclusion
    if (isToday) {
      const existingExclusion = await db.excludedScheduleSlots
        .where("[date+scopeId]")
        .equals([date, scopeId])
        .first()
      
      if (existingExclusion) {
        await db.excludedScheduleSlots.delete(existingExclusion.id)
      }
    }
  }
}
```

3. Add `ExcludedScheduleSlot` to the imports from db:
```typescript
import {
  db,
  type Weekday,
  type DefaultScheduleSlot,
  type MonthSlot,
  type ScheduleSlot,
  type ExcludedScheduleSlot,
} from "@/lib/db"
```

**Verify**:
- No TypeScript errors: `pnpm tsc --noEmit`

---

### Step 6: Update `populateScheduleSlots()` to respect exclusions ✅

**Do**: Modify the sync function to skip creating slots that the user explicitly excluded.

**Modify** `src/lib/sync.ts`:

1. Update the `populateScheduleSlots` function:
```typescript
/**
 * Populate schedule slots for the next 7 days from default schedule slots
 * Respects user exclusions (manually removed today's slots)
 * Also cleans up stale exclusions (dates before today)
 */
async function populateScheduleSlots(today: string): Promise<number> {
  // Clean up stale exclusions first (dates before today)
  const staleExclusions = await db.excludedScheduleSlots
    .where("date")
    .below(today)
    .toArray()
  
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
```

**Verify**:
- No TypeScript errors: `pnpm tsc --noEmit`
- Sync no longer re-adds slots the user removed for today

---

### Step 7: Add `useArchivedScopes()` hook ✅

**Do**: Create a hook to fetch all archived scopes, sorted by archive date.

**Modify** `src/hooks/use-scopes.ts`:

Add this new hook at the end of the file:

```typescript
/**
 * Get all archived scopes, sorted by archivedAt descending (most recent first)
 */
export function useArchivedScopes(): Scope[] | undefined {
  return useLiveQuery(async () => {
    const archived = await db.scopes
      .filter((scope) => scope.archivedAt !== undefined && scope.archivedAt > 0)
      .toArray()
    
    // Sort by archivedAt descending (most recently archived first)
    return archived.sort((a, b) => (b.archivedAt ?? 0) - (a.archivedAt ?? 0))
  }, [])
}
```

**Verify**:
- No TypeScript errors: `pnpm tsc --noEmit`

---

### Step 8: Add `unarchiveScope()` mutation ✅

**Do**: Create a function to restore an archived scope.

**Modify** `src/lib/scope-mutations.ts`:

Add this new function at the end of the file:

```typescript
export async function unarchiveScope(id: string): Promise<void> {
  await db.scopes.update(id, { archivedAt: undefined })
}
```

**Verify**:
- No TypeScript errors: `pnpm tsc --noEmit`

---

### Step 9: Rebuild Archive page ✅

**Do**: Replace the placeholder archive page with a functional list of archived scopes.

**Replace** `src/app/archive/page.tsx` with:

```typescript
"use client"

import { ArchiveRestore } from "lucide-react"
import { ContentPanel } from "@/components/layout/content-panel"
import { useArchivedScopes } from "@/hooks/use-scopes"
import { unarchiveScope } from "@/lib/scope-mutations"
import { ActivityDot } from "@/components/ui/activity-dot"
import { cn } from "@/lib/utils"

export default function ArchivePage() {
  const archivedScopes = useArchivedScopes()

  if (archivedScopes === undefined) {
    return (
      <ContentPanel>
        <div className="flex h-full items-center justify-center">
          <p className="text-sm text-muted-foreground">Loading...</p>
        </div>
      </ContentPanel>
    )
  }

  return (
    <ContentPanel>
      <div className="flex h-full flex-col">
        {/* Header */}
        <div className="border-b px-6 py-4">
          <h1 className="text-lg font-semibold">Archive</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Archived items are automatically deleted after 30 days
          </p>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {archivedScopes.length === 0 ? (
            <div className="flex h-full items-center justify-center">
              <p className="text-sm text-muted-foreground">No archived items</p>
            </div>
          ) : (
            <div className="divide-y">
              {archivedScopes.map((scope) => (
                <ArchivedScopeItem
                  key={scope.id}
                  id={scope.id}
                  title={scope.title}
                  type={scope.type}
                  archivedAt={scope.archivedAt!}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </ContentPanel>
  )
}

interface ArchivedScopeItemProps {
  id: string
  title: string
  type: "job" | "project"
  archivedAt: number
}

function ArchivedScopeItem({ id, title, type, archivedAt }: ArchivedScopeItemProps) {
  const handleUnarchive = async () => {
    await unarchiveScope(id)
  }

  // Format date
  const archiveDate = new Date(archivedAt)
  const dateStr = archiveDate.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: archiveDate.getFullYear() !== new Date().getFullYear() ? "numeric" : undefined,
  })

  return (
    <div className="flex items-center gap-3 px-6 py-3 hover:bg-muted/50">
      {/* Type indicator dot */}
      <div className={type === "job" ? "theme-gold" : "theme-blue"}>
        <ActivityDot variant={type === "job" ? "gold" : "blue"} />
      </div>

      {/* Title and date */}
      <div className="flex-1 min-w-0">
        <p className="truncate font-medium">{title}</p>
        <p className="text-xs text-muted-foreground">Archived {dateStr}</p>
      </div>

      {/* Unarchive button */}
      <button
        onClick={handleUnarchive}
        className={cn(
          "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm",
          "text-muted-foreground hover:bg-muted hover:text-foreground",
          "transition-colors"
        )}
      >
        <ArchiveRestore className="h-4 w-4" />
        <span>Unarchive</span>
      </button>
    </div>
  )
}
```

**Verify**:
- No TypeScript errors: `pnpm tsc --noEmit`
- Archive page shows list of archived scopes
- Clicking Unarchive restores scope (it should reappear in Jobs/Projects pages)

---

### Step 10: Add toggle to mobile ScopeSelector ✅

**Do**: Add the "Show unfocused scopes" toggle to the mobile scope selector popover.

**Modify** `src/components/tasks/scope-selector.tsx`:

1. Add imports at the top:
```typescript
import { ScopeToggle } from "./scope-toggle"
```

2. Inside `ScopeSelector` component, add state for showUnfocused:
```typescript
  const [showUnfocused, setShowUnfocused] = useState(false)

  // Show toggle only for now/later/backlog (not recurring/recent)
  const showToggle = ["now", "later", "backlog"].includes(activeListType)
```

3. Update the `useTaskScopes` call to pass `showUnfocused`:
```typescript
  const scopeData = useTaskScopes(activeListType, showUnfocused)
```

4. Add the toggle inside the PopoverContent, after CommandList and before closing Command tag:
```typescript
          </CommandList>
          
          {/* Toggle at bottom - only for now/later/backlog */}
          {showToggle && (
            <div className="border-t p-2">
              <ScopeToggle checked={showUnfocused} onChange={setShowUnfocused} />
            </div>
          )}
        </Command>
```

**Verify**:
- No TypeScript errors: `pnpm tsc --noEmit`
- Toggle appears in mobile scope selector popover
- Toggling shows/hides unfocused scopes

---

### Step 11: Test and verify all features

**Do**: Verify all functionality works correctly.

**Commands**:
```bash
pnpm tsc --noEmit
pnpm lint
```

**Manual Testing Checklist**:

1. **Move from Later Button**:
   - [ ] Create a job with tasks in Later
   - [ ] Go to Tasks page, select the job, view Now list
   - [ ] Empty Now → button appears "Move X from Later"
   - [ ] Click button → tasks move to Now
   - [ ] Button disappears after move

2. **Unschedule Protection**:
   - [ ] Create a job with default schedule for today's weekday
   - [ ] Run sync → schedule slot appears on Schedule page
   - [ ] Toggle OFF the slot for today
   - [ ] Run sync again → slot stays removed (not re-added)
   - [ ] Toggle ON the slot again → sync can maintain it now
   - [ ] Verify old exclusions are cleaned up (only today matters)

3. **Archive Page**:
   - [ ] Archive a job from Jobs page
   - [ ] Archive a project from Projects page
   - [ ] Go to Archive page → see both items with correct dots
   - [ ] Items sorted by most recently archived first
   - [ ] Click Unarchive → scope returns to Jobs/Projects page
   - [ ] Empty state shows when no archived items

4. **Mobile Scope Selector Toggle**:
   - [ ] On mobile, open Tasks page → scope selector dropdown
   - [ ] Toggle visible for now/later/backlog lists
   - [ ] Toggle NOT visible for recurring/recent lists
   - [ ] Toggling shows/hides unfocused scopes in the list
   - [ ] Selected scope persists after toggle

**Verify**:
- All tests pass
- No console errors
- No TypeScript errors
- Lint passes

---

## Notes

- The exclusion tracking only applies to today's date since sync only needs to respect "I don't want this today" decisions. Future dates are managed through the Schedule page normally.
- Stale exclusions (past dates) are cleaned up during sync to prevent table growth.
- The Archive page intentionally doesn't show nested project relationships - it's a flat list for simplicity.
- Unarchive immediately restores the scope; tasks remain in whatever state they were in.
