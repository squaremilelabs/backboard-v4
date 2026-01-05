# Task UI Updates: Recent List & Scope Toggle

| Field            | Value       |
| ---------------- | ----------- |
| **ID**           | 012         |
| **Status**       | 🔵 Ready    |
| **Progress**     | —           |
| **Created**      | 2026-01-05  |
| **Last Updated** | 2026-01-05  |

---

## Overview

Implement the Recent tasks list UI (showing done tasks from the last 7 days) and add a "Show unfocused scopes" toggle to the scope list sidebar.

---

## References

Read these before implementing:

| Topic                  | Source                                                 |
| ---------------------- | ------------------------------------------------------ |
| Task lifecycle         | `dev/specs/prd.md` §2.2                                |
| Done (Recent) list     | `dev/specs/prd.md` §2.2 - "Last 7 days; auto-purged"   |
| Tasks page design      | `dev/specs/prd.md` §4.1                                |
| Existing task list     | `src/components/tasks/task-list.tsx`                   |
| Existing scope list    | `src/components/tasks/scope-list.tsx`                  |
| Task scopes hook       | `src/hooks/use-task-scopes.ts`                         |

---

## Scope

### In Scope

**Recent Tasks List:**
- Reuse existing `TaskList` component with modifications for "recent" list type
- No add task input in recent list
- Only show scopes that have recent tasks (status=done within last 7 days)
- Task actions: |← (move to now), × (delete)
- Filter scopes in recent view to only those with done tasks

**Scope List Toggle:**
- Add "Show unfocused scopes" toggle at bottom of scope list
- Default state: OFF (current behavior)
- When OFF: Show scheduled scopes + any unscheduled scopes that have tasks (with red dot)
- When ON: Show ALL non-archived scopes regardless of scheduling
- Toggle state persists via URL param or local state
- Only applicable to Now/Later/Backlog lists (not Recurring/Recent)

### Out of Scope

- Recurring tasks list implementation
- Done task purge logic (background job)
- Drag-and-drop reordering
- Task notes/content expansion

---

## Dependencies

- ✅ 010 Task Display & CRUD
- ✅ 011 Task Actioning

---

## Files Created

Files this implementation will create or modify:

- [ ] `src/components/tasks/task-list.tsx` — Modify: Handle "recent" list type, conditionally hide add input
- [ ] `src/components/tasks/recent-task-list.tsx` — Create: Specialized component for Recent list
- [ ] `src/components/tasks/scope-list.tsx` — Modify: Add toggle at bottom
- [ ] `src/components/tasks/scope-toggle.tsx` — Create: Toggle component
- [ ] `src/hooks/use-task-scopes.ts` — Modify: Add filtering for recent scopes, add toggle support
- [ ] `src/app/tasks/page.tsx` — Modify: Render Recent list properly
- [ ] `src/app/tasks/search-params.ts` — Modify: Add showUnfocused param (optional)

---

## Implementation Plan

### Step 1: Add Recent List Support to use-task-scopes.ts

**Do**: Modify the hook to properly handle the "recent" list type - only return scopes that have done tasks within the last 7 days.

**Modify** `src/hooks/use-task-scopes.ts`:

1. Add a `useRecentScopes` function or modify `useTaskScopes` to filter scopes for recent:
   - When `listType === "recent"`, only include scopes that have tasks with `status: "done"` AND `completedAt > now - 7 days`
   - Triage should only appear if it has recent tasks

2. Add a date cutoff calculation for recent tasks:
```typescript
const recentCutoff = useMemo(() => {
  return Date.now() - 7 * 24 * 60 * 60 * 1000 // 7 days ago
}, [])
```

3. Modify `statusForQuery` handling to filter done tasks by `completedAt` for recent list

**Key changes:**
- For "recent" list: query `status === "done"` AND `completedAt >= recentCutoff`
- Only include scopes in the list that have matching tasks
- Triage visibility depends on having recent tasks

---

### Step 2: Create Recent Task List Component

**Do**: Create a specialized component for the Recent list that reuses TaskItem but omits the add input.

**Create** `src/components/tasks/recent-task-list.tsx`:

```typescript
"use client"

import { useQueryState } from "nuqs"
import { TaskItem } from "./task-item"
import { PendingActionsFooter } from "./pending-actions-footer"
import { searchParamsParsers } from "@/app/tasks/search-params"
import { useRecentTasks, usePendingActionCount } from "@/hooks/use-tasks"
import { useScope } from "@/hooks/use-scopes"
import { cn } from "@/lib/utils"

export function RecentTaskList() {
  const [scopeId] = useQueryState("scope", searchParamsParsers.scope)

  // Get scope info for theme
  const scope = useScope(scopeId === "triage" ? null : scopeId)

  // Determine theme class based on scope type
  const themeClass =
    scopeId === "triage"
      ? ""
      : scope?.type === "job"
        ? "theme-gold"
        : scope?.type === "project"
          ? "theme-blue"
          : ""

  // Fetch recent tasks (done within last 7 days) for this scope
  const tasks = useRecentTasks(scopeId)

  // Get pending action count
  const actualScopeId = scopeId === "triage" ? null : scopeId
  const pendingCount = usePendingActionCount(scopeId, "done")

  // Loading state
  if (tasks === undefined) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-sm text-muted-foreground">Loading tasks...</p>
      </div>
    )
  }

  return (
    <div className={cn("flex h-full flex-col", themeClass)}>
      {/* Task list - NO add input for recent */}
      <div className="flex-1 overflow-y-auto">
        {tasks.length === 0 ? (
          <div className="px-4 py-8 text-center">
            <p className="text-sm text-muted-foreground">No recent tasks</p>
          </div>
        ) : (
          <div className="flex flex-col">
            {tasks.map((task) => (
              <TaskItem
                key={task.id}
                task={task}
                currentStatus="done"
                themeClass={themeClass}
              />
            ))}
          </div>
        )}
      </div>

      {/* Pending actions footer */}
      {pendingCount !== undefined && pendingCount > 0 && (
        <PendingActionsFooter
          scopeId={actualScopeId}
          currentStatus="done"
          pendingCount={pendingCount}
        />
      )}
    </div>
  )
}
```

---

### Step 3: Add useRecentTasks Hook

**Do**: Add a hook to fetch done tasks within the 7-day window.

**Modify** `src/hooks/use-tasks.ts` — Add:

```typescript
/**
 * Get recent tasks (done within last 7 days) for a specific scope
 */
export function useRecentTasks(scopeId: string | "triage"): Task[] | undefined {
  return useLiveQuery(async () => {
    const actualScopeId = scopeId === "triage" ? null : scopeId
    const recentCutoff = Date.now() - 7 * 24 * 60 * 60 * 1000

    const tasks = await db.tasks
      .where("status")
      .equals("done")
      .filter((task) => 
        task.scopeId === actualScopeId && 
        (task.completedAt ?? 0) >= recentCutoff
      )
      .toArray()

    // Sort by completedAt descending (most recent first)
    return tasks.sort((a, b) => (b.completedAt ?? 0) - (a.completedAt ?? 0))
  }, [scopeId])
}
```

---

### Step 4: Update Tasks Page to Use Recent List

**Do**: Modify the tasks page to render `RecentTaskList` when on the recent tab.

**Modify** `src/app/tasks/page.tsx`:

1. Import `RecentTaskList`
2. Change the content area logic:
```typescript
// Show appropriate list based on type
const isActiveList = ["now", "later", "backlog"].includes(listType)
const isRecentList = listType === "recent"

// In the render:
{isActiveList ? <TaskList /> : isRecentList ? <RecentTaskList /> : <TaskContentPlaceholder />}
```

---

### Step 5: Update use-task-scopes.ts for Recent Filtering

**Do**: Modify the task counts query to filter by completedAt for recent list.

**Modify** `src/hooks/use-task-scopes.ts`:

Update the `taskData` query to handle recent list filtering:

```typescript
// Get task counts and pending action counts by scope for current list
const taskData = useLiveQuery(async () => {
  if (!statusForQuery) {
    return {
      counts: new Map<string, number>(),
      pendingCounts: new Map<string, number>(),
    }
  }

  let tasks = await db.tasks.where("status").equals(statusForQuery).toArray()
  
  // For "recent" list, filter to only tasks completed within last 7 days
  if (listType === "recent") {
    const recentCutoff = Date.now() - 7 * 24 * 60 * 60 * 1000
    tasks = tasks.filter((task) => (task.completedAt ?? 0) >= recentCutoff)
  }

  const counts = new Map<string, number>()
  const pendingCounts = new Map<string, number>()

  for (const task of tasks) {
    const key = task.scopeId ?? "triage"
    counts.set(key, (counts.get(key) ?? 0) + 1)
    if (task.pendingAction != null) {
      pendingCounts.set(key, (pendingCounts.get(key) ?? 0) + 1)
    }
  }

  return { counts, pendingCounts }
}, [statusForQuery, listType])
```

---

### Step 6: Create Scope Toggle Component

**Do**: Create a toggle component for "Show unfocused scopes".

**Create** `src/components/tasks/scope-toggle.tsx`:

```typescript
"use client"

import { cn } from "@/lib/utils"

interface ScopeToggleProps {
  checked: boolean
  onChange: (checked: boolean) => void
}

export function ScopeToggle({ checked, onChange }: ScopeToggleProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-xs text-muted-foreground transition-colors hover:text-foreground"
    >
      <span>Show unfocused scopes</span>
      <span
        className={cn(
          "relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full transition-colors",
          checked ? "bg-primary" : "bg-muted"
        )}
      >
        <span
          className={cn(
            "pointer-events-none inline-block h-4 w-4 rounded-full bg-background shadow-sm transition-transform",
            checked ? "translate-x-4" : "translate-x-0.5"
          )}
        />
      </span>
    </button>
  )
}
```

---

### Step 7: Add Toggle State Management

**Do**: Add state management for the toggle. Use local React state (not URL) since this is a UI preference.

**Modify** `src/components/tasks/scope-list.tsx`:

1. Add state for toggle:
```typescript
const [showUnfocused, setShowUnfocused] = useState(false)
```

2. Pass the toggle state to `useTaskScopes`:
```typescript
const scopeData = useTaskScopes(activeListType, showUnfocused)
```

3. Only show toggle for Now/Later/Backlog lists (not Recurring/Recent)

---

### Step 8: Update useTaskScopes to Accept showAll Parameter

**Do**: Modify the hook to accept a parameter that shows all scopes regardless of scheduling.

**Modify** `src/hooks/use-task-scopes.ts`:

1. Update function signature:
```typescript
export function useTaskScopes(
  listType: TaskListType, 
  showAllScopes: boolean = false
): TaskScopeData | undefined
```

2. Update `shouldInclude` logic:
```typescript
const shouldInclude = (scope: Scope): boolean => {
  // When showAllScopes is true, include all non-archived scopes
  if (showAllScopes) return true
  // Otherwise: include if scheduled OR has tasks in current list
  return isScheduled(scope) || hasTasks(scope.id)
}
```

3. For "recent" list, ALWAYS use task-based filtering (showAllScopes is ignored):
```typescript
const shouldInclude = (scope: Scope): boolean => {
  // For recent list: ONLY show scopes with recent tasks
  if (listType === "recent") {
    return hasTasks(scope.id)
  }
  // When showAllScopes is true, include all non-archived scopes
  if (showAllScopes) return true
  // Otherwise: include if scheduled OR has tasks in current list
  return isScheduled(scope) || hasTasks(scope.id)
}
```

---

### Step 9: Integrate Toggle into Scope List

**Do**: Add the toggle to the bottom of the scope list.

**Modify** `src/components/tasks/scope-list.tsx`:

```typescript
"use client"

import { useEffect, useMemo, useState } from "react"
import { useQueryState } from "nuqs"
import { searchParamsParsers } from "@/app/tasks/search-params"
import { useTaskScopes, findTaskScope, type TaskScope } from "@/hooks/use-task-scopes"
import { ActivityDot, type DotVariant } from "@/components/ui/activity-dot"
import { ScopeToggle } from "./scope-toggle"
import { cn } from "@/lib/utils"

export function ScopeList() {
  const [activeListType] = useQueryState("list", searchParamsParsers.list)
  const [activeScopeId, setActiveScopeId] = useQueryState("scope", searchParamsParsers.scope)
  const [showUnfocused, setShowUnfocused] = useState(false)

  // Show toggle only for now/later/backlog (not recurring/recent)
  const showToggle = ["now", "later", "backlog"].includes(activeListType)
  
  // For recent list, we never use showUnfocused (only show scopes with tasks)
  const effectiveShowUnfocused = activeListType === "recent" ? false : showUnfocused
  
  const scopeData = useTaskScopes(activeListType, effectiveShowUnfocused)

  // ... rest of existing component ...

  return (
    <div className="flex h-full flex-col">
      <div className="flex-1 overflow-y-auto">
        <div className="flex flex-col gap-0.5 p-2">
          {/* Existing scope list items */}
          {/* ... Triage, Jobs, Projects ... */}
        </div>
      </div>

      {/* Toggle at bottom - only for now/later/backlog */}
      {showToggle && (
        <div className="border-t px-2 py-2">
          <ScopeToggle checked={showUnfocused} onChange={setShowUnfocused} />
        </div>
      )}
    </div>
  )
}
```

---

### Step 10: Update Scope List Auto-Selection for Recent

**Do**: Ensure the scope auto-selection logic handles the case where Recent list has no scopes gracefully.

**Modify** `src/components/tasks/scope-list.tsx`:

Update the auto-selection effect to handle Recent list where Triage might be the only option or no scopes exist:

```typescript
// Auto-switch to first available scope if current is not in list
useEffect(() => {
  if (scopeData && !currentScopeInList) {
    // For Recent list: select first scope with tasks, or stay on triage
    if (activeListType === "recent") {
      if (scopeData.triageHasTasks) {
        setActiveScopeId("triage")
      } else if (scopeData.jobs.length > 0) {
        setActiveScopeId(scopeData.jobs[0].id)
      } else if (scopeData.projectGroups.length > 0) {
        const firstGroup = scopeData.projectGroups[0]
        if (!firstGroup.parent.isFaded) {
          setActiveScopeId(firstGroup.parent.id)
        } else if (firstGroup.children.length > 0) {
          setActiveScopeId(firstGroup.children[0].project.id)
        }
      }
    } else {
      // Existing logic for other list types
      if (showTriage) {
        setActiveScopeId("triage")
      } else if (scopeData.jobs.length > 0) {
        setActiveScopeId(scopeData.jobs[0].id)
      } else if (scopeData.projectGroups.length > 0) {
        setActiveScopeId(scopeData.projectGroups[0].parent.id)
      }
    }
  }
}, [scopeData, currentScopeInList, showTriage, setActiveScopeId, activeListType])
```

---

## Verification

| Check      | Command             | Expected Result   |
| ---------- | ------------------- | ----------------- |
| TypeScript | `pnpm tsc --noEmit` | No errors         |
| Linting    | `pnpm lint`         | No errors         |
| Build      | `pnpm build`        | Exits with code 0 |

Manual checks:

- [ ] Recent tab shows only scopes with done tasks from last 7 days
- [ ] Recent list has no "add task" input
- [ ] Recent tasks can be moved back to Now or deleted
- [ ] Toggle appears at bottom of scope list in Now/Later/Backlog views
- [ ] Toggle is hidden in Recurring and Recent views
- [ ] Toggle OFF: Only scheduled scopes + unscheduled with tasks (red dot) shown
- [ ] Toggle ON: All non-archived scopes shown
- [ ] Unfocused scopes still show red dot indicator when toggle is ON
