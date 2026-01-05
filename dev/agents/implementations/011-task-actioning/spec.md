# Task Actioning & Activity Indicators

| Field            | Value        |
| ---------------- | ------------ |
| **ID**           | 011          |
| **Status**       | ✅ Complete  |
| **Progress**     | Steps 1-13   |
| **Created**      | 2026-01-05   |
| **Last Updated** | 2026-01-05   |

---

## Overview

Implement the task action system (done, forward, back, delete) with pending action batch workflow, activity dot indicators throughout the UI (sidebar, tabs, scope list), and unfocused scope warning state.

---

## References

Read these before implementing:

| Topic                      | Source                                       |
| -------------------------- | -------------------------------------------- |
| Task actions design        | `dev/specs/prd.md` §4.1                      |
| Task status lifecycle      | `dev/specs/prd.md` §2.2                      |
| Unfocused scope warning    | `dev/specs/prd.md` §4.1 (see tasklist-unfocused) |
| Actions per status         | `dev/specs/visuals/task-actions-by-status.png` |
| Action icon key            | `dev/specs/visuals/task-actions.png`         |
| Pending actions visual     | `dev/specs/visuals/tasklist-actioning.png`   |
| Full tasks page design     | `dev/specs/visuals/page-tasks.png`           |
| Unfocused scope visual     | `dev/specs/visuals/tasklist-unfocused.png`   |

---

## Scope

### In Scope

**Task Actions:**
- Action buttons on task items based on current status
- Actions per status:
  - **Now**: ✓ done, → later, →| backlog, × delete
  - **Later**: ← now, → backlog, × delete
  - **Backlog**: |← now, ← later, × delete
  - **Done**: |← now, × delete
- Color-coded icons: gold (theme-gold) for Jobs, blue (theme-blue) for Projects, neutral for Triage

**Pending Action System:**
- Set `pendingAction` on task when action button clicked
- Visual states for pending tasks:
  - Background highlight (gold/blue/neutral based on scope type)
  - Action icon shown at right
  - Strikethrough text + faded appearance for delete
- "Clear" and "Save" buttons at bottom of task list when any pending actions exist
- Clear reverts all pending actions; Save commits them (status changes or deletion)

**Activity Dot Indicators:**
- **Sidebar "Tasks" nav item**: Show 1-2 dots if any NOW tasks exist
  - Gold dot if any NOW tasks belong to a Job
  - Blue dot if any NOW tasks belong to a Project
  - If neither, but triage has NOW tasks → neutral (gray) dot
- **Task list tabs**: 
  - "Now" tab: Same logic as sidebar Tasks item
  - "Later" tab: Neutral dot if any later tasks exist
  - "Backlog" tab: Neutral dot if any backlog tasks exist
- **Scope list items**: 
  - Show right-hand dot if scope has tasks in the current list
  - Dot color matches scope type (gold/blue) if scope is scheduled
  - **Red dot** if scope has tasks but is NOT scheduled for current context

**Unfocused Scope Warning:**
- When a scope has NOW tasks but no ScheduleSlot for today:
  - Show red "Not in focus today" label above task list
  - Show "Move all to later" button at bottom
  - Scope appears in scope list with red dot indicator
- "Move all to later" batch action moves all NOW tasks for that scope to Later

**Scope List Modifications:**
- Scopes with tasks in the current list appear regardless of scheduling
- If scope is NOT scheduled but HAS tasks → red dot indicator + unfocused state

### Out of Scope

- Recurring tasks and Recent list functionality
- Drag-and-drop task reordering
- Expandable notes / rich text content
- Task metadata display (created at, moved from)
- Keyboard shortcuts for actions
- Undo functionality after Save

---

## Dependencies

- ✅ 002 Database Schema (`tasks` table with `pendingAction` field)
- ✅ 009 Tasks Page Layout (tabs, scope selector, URL state)
- ✅ 010 Task Display & CRUD (task list, task item components)

---

## Files Created

Files this implementation will create or modify:

- [ ] `src/lib/task-mutations.ts` — Add: `setTaskPendingAction`, `commitPendingActions`, `clearPendingActions`, `moveAllToLater`
- [ ] `src/hooks/use-tasks.ts` — Modify: Add hooks for pending action counts, NOW task indicators
- [ ] `src/hooks/use-task-indicators.ts` — Create: Hook for computing dot indicator state
- [ ] `src/components/tasks/task-item.tsx` — Modify: Add action buttons, pending state visuals
- [ ] `src/components/tasks/task-action-buttons.tsx` — Create: Action button set component
- [ ] `src/components/tasks/task-list.tsx` — Modify: Add unfocused warning, pending actions footer
- [ ] `src/components/tasks/pending-actions-footer.tsx` — Create: Clear/Save buttons
- [ ] `src/components/tasks/unfocused-warning.tsx` — Create: Red warning label + move all button
- [ ] `src/components/tasks/scope-list.tsx` — Modify: Add right-hand dot indicators, include unscheduled scopes with tasks
- [ ] `src/hooks/use-task-scopes.ts` — Modify: Include unscheduled scopes that have tasks
- [ ] `src/components/tasks/task-list-tabs.tsx` — Modify: Add activity dots
- [ ] `src/components/layout/app-sidebar.tsx` — Modify: Add activity dots to Tasks nav item
- [ ] `src/components/ui/activity-dot.tsx` — Create: Reusable dot indicator component

---

## Implementation Plan

### Step 1: Create Activity Dot Component

**Do**: Create a reusable dot indicator component for consistent styling across the app.

**Create** `src/components/ui/activity-dot.tsx`:

```typescript
import { cn } from "@/lib/utils"

export type DotVariant = "gold" | "blue" | "neutral" | "red"

interface ActivityDotProps {
  variant: DotVariant
  className?: string
}

const variantClasses: Record<DotVariant, string> = {
  gold: "bg-[oklch(0.72_0.155_85)]",
  blue: "bg-[oklch(0.6_0.1_220)]",
  neutral: "bg-muted-foreground",
  red: "bg-destructive",
}

export function ActivityDot({ variant, className }: ActivityDotProps) {
  return (
    <span
      className={cn(
        "inline-block h-2 w-2 shrink-0 rounded-full",
        variantClasses[variant],
        className
      )}
    />
  )
}

interface ActivityDotsProps {
  variants: DotVariant[]
  className?: string
}

export function ActivityDots({ variants, className }: ActivityDotsProps) {
  if (variants.length === 0) return null

  return (
    <span className={cn("inline-flex items-center gap-0.5", className)}>
      {variants.map((variant, i) => (
        <ActivityDot key={`${variant}-${i}`} variant={variant} />
      ))}
    </span>
  )
}
```

**Verify**:
- File created at `src/components/ui/activity-dot.tsx`
- No TypeScript errors: `pnpm tsc --noEmit`

---

### Step 2: Create Task Indicator Hook

**Do**: Create a hook that computes what dots to show based on task data.

**Create** `src/hooks/use-task-indicators.ts`:

```typescript
import { useLiveQuery } from "dexie-react-hooks"
import { db, type TaskStatus } from "@/lib/db"
import type { DotVariant } from "@/components/ui/activity-dot"

interface TaskIndicators {
  /** Dots to show for NOW tasks (sidebar + Now tab) */
  nowDots: DotVariant[]
  /** Whether Later tab should show a neutral dot */
  hasLaterTasks: boolean
  /** Whether Backlog tab should show a neutral dot */
  hasBacklogTasks: boolean
}

/**
 * Compute activity dot indicators based on task data.
 * - NOW: gold dot if job tasks, blue dot if project tasks, neutral if only triage
 * - LATER/BACKLOG: neutral dot if any tasks exist
 */
export function useTaskIndicators(): TaskIndicators | undefined {
  // Get all NOW tasks with their scope types
  const nowData = useLiveQuery(async () => {
    const nowTasks = await db.tasks.where("status").equals("now").toArray()
    
    // Get unique scope IDs (excluding null/triage)
    const scopeIds = [...new Set(nowTasks.map((t) => t.scopeId).filter(Boolean))] as string[]
    
    // Get scope types
    const scopes = await db.scopes.where("id").anyOf(scopeIds).toArray()
    const scopeTypes = new Map(scopes.map((s) => [s.id, s.type]))
    
    let hasJobTasks = false
    let hasProjectTasks = false
    let hasTriageTasks = false
    
    for (const task of nowTasks) {
      if (task.scopeId === null) {
        hasTriageTasks = true
      } else {
        const type = scopeTypes.get(task.scopeId)
        if (type === "job") hasJobTasks = true
        if (type === "project") hasProjectTasks = true
      }
    }
    
    return { hasJobTasks, hasProjectTasks, hasTriageTasks }
  })

  // Check if Later tasks exist
  const hasLaterTasks = useLiveQuery(async () => {
    const count = await db.tasks.where("status").equals("later").count()
    return count > 0
  })

  // Check if Backlog tasks exist
  const hasBacklogTasks = useLiveQuery(async () => {
    const count = await db.tasks.where("status").equals("backlog").count()
    return count > 0
  })

  if (nowData === undefined || hasLaterTasks === undefined || hasBacklogTasks === undefined) {
    return undefined
  }

  // Compute NOW dots
  const nowDots: DotVariant[] = []
  if (nowData.hasJobTasks) nowDots.push("gold")
  if (nowData.hasProjectTasks) nowDots.push("blue")
  if (nowDots.length === 0 && nowData.hasTriageTasks) {
    nowDots.push("neutral")
  }

  return {
    nowDots,
    hasLaterTasks,
    hasBacklogTasks,
  }
}

/**
 * Get task counts by scope for the current list type.
 * Returns Map<scopeId | "triage", count>
 */
export function useTaskCountsByScope(status: TaskStatus): Map<string, number> | undefined {
  return useLiveQuery(async () => {
    const tasks = await db.tasks.where("status").equals(status).toArray()
    const counts = new Map<string, number>()
    
    for (const task of tasks) {
      const key = task.scopeId ?? "triage"
      counts.set(key, (counts.get(key) ?? 0) + 1)
    }
    
    return counts
  }, [status])
}
```

**Verify**:
- File created at `src/hooks/use-task-indicators.ts`
- No TypeScript errors

---

### Step 3: Update task-mutations.ts

**Do**: Add mutation functions for pending actions and batch operations.

**Modify** `src/lib/task-mutations.ts` — Add these functions:

```typescript
import { db, type TaskStatus } from "@/lib/db"

// ... existing createTask and updateTaskTitle functions ...

/**
 * Set a pending action on a task
 */
export async function setTaskPendingAction(
  taskId: string,
  action: TaskStatus | "delete" | null
): Promise<void> {
  await db.tasks.update(taskId, { pendingAction: action })
}

/**
 * Commit all pending actions for a specific scope and status.
 * - Status changes: Update task.status, set insertedFrom to previous status
 * - Delete: Remove task from database
 */
export async function commitPendingActions(
  scopeId: string | null,
  currentStatus: TaskStatus
): Promise<void> {
  const tasks = await db.tasks
    .where("status")
    .equals(currentStatus)
    .filter((t) => t.scopeId === scopeId && t.pendingAction != null)
    .toArray()

  const now = Date.now()
  
  await db.transaction("rw", db.tasks, async () => {
    for (const task of tasks) {
      if (task.pendingAction === "delete") {
        await db.tasks.delete(task.id)
      } else if (task.pendingAction) {
        const updates: Partial<typeof task> = {
          status: task.pendingAction,
          pendingAction: null,
          insertedAt: now,
          insertedFrom: currentStatus,
        }
        // Set completedAt when moving to done
        if (task.pendingAction === "done") {
          updates.completedAt = now
        }
        await db.tasks.update(task.id, updates)
      }
    }
  })
}

/**
 * Clear all pending actions for a specific scope and status
 */
export async function clearPendingActions(
  scopeId: string | null,
  currentStatus: TaskStatus
): Promise<void> {
  const tasks = await db.tasks
    .where("status")
    .equals(currentStatus)
    .filter((t) => t.scopeId === scopeId && t.pendingAction != null)
    .toArray()

  await db.transaction("rw", db.tasks, async () => {
    for (const task of tasks) {
      await db.tasks.update(task.id, { pendingAction: null })
    }
  })
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

  const now = Date.now()

  await db.transaction("rw", db.tasks, async () => {
    for (const task of tasks) {
      await db.tasks.update(task.id, {
        status: "later",
        pendingAction: null,
        insertedAt: now,
        insertedFrom: "now",
      })
    }
  })
}
```

**Verify**:
- Functions added to `src/lib/task-mutations.ts`
- No TypeScript errors

---

### Step 4: Create Task Action Buttons Component

**Do**: Create the action buttons component that renders different buttons based on task status.

**Create** `src/components/tasks/task-action-buttons.tsx`:

```typescript
"use client"

import { Check, ArrowRight, ChevronsRight, ArrowLeft, ChevronsLeft, X } from "lucide-react"
import { setTaskPendingAction } from "@/lib/task-mutations"
import { cn } from "@/lib/utils"
import type { Task, TaskStatus } from "@/lib/db"

interface TaskActionButtonsProps {
  task: Task
  currentStatus: TaskStatus
}

type ActionConfig = {
  icon: React.ComponentType<{ className?: string }>
  action: TaskStatus | "delete"
  title: string
}

// Action configurations per status
const actionsPerStatus: Record<TaskStatus, ActionConfig[]> = {
  now: [
    { icon: Check, action: "done", title: "Mark done" },
    { icon: ArrowRight, action: "later", title: "Move to Later" },
    { icon: ChevronsRight, action: "backlog", title: "Move to Backlog" },
    { icon: X, action: "delete", title: "Delete" },
  ],
  later: [
    { icon: ArrowLeft, action: "now", title: "Move to Now" },
    { icon: ArrowRight, action: "backlog", title: "Move to Backlog" },
    { icon: X, action: "delete", title: "Delete" },
  ],
  backlog: [
    { icon: ChevronsLeft, action: "now", title: "Move to Now" },
    { icon: ArrowLeft, action: "later", title: "Move to Later" },
    { icon: X, action: "delete", title: "Delete" },
  ],
  done: [
    { icon: ChevronsLeft, action: "now", title: "Move to Now" },
    { icon: X, action: "delete", title: "Delete" },
  ],
}

export function TaskActionButtons({ task, currentStatus }: TaskActionButtonsProps) {
  const actions = actionsPerStatus[currentStatus] || []

  const handleAction = async (action: TaskStatus | "delete") => {
    // Toggle off if same action clicked again
    const newAction = task.pendingAction === action ? null : action
    await setTaskPendingAction(task.id, newAction)
  }

  return (
    <div className="flex items-center gap-0.5">
      {actions.map(({ icon: Icon, action, title }) => {
        const isActive = task.pendingAction === action

        return (
          <button
            key={action}
            onClick={() => handleAction(action)}
            title={title}
            className={cn(
              "flex h-7 w-7 items-center justify-center rounded transition-colors",
              "text-muted-foreground hover:text-foreground",
              "hover:bg-secondary",
              isActive && "bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground"
            )}
          >
            <Icon className="h-4 w-4" />
          </button>
        )
      })}
    </div>
  )
}

/**
 * Single action indicator for pending state (shown when task has pendingAction)
 */
export function PendingActionIndicator({ action }: { action: TaskStatus | "delete" }) {
  const config = Object.values(actionsPerStatus)
    .flat()
    .find((a) => a.action === action)

  if (!config) return null

  const Icon = config.icon

  return (
    <span className="flex h-7 w-7 items-center justify-center rounded bg-primary text-primary-foreground">
      <Icon className="h-4 w-4" />
    </span>
  )
}
```

**Verify**:
- File created at `src/components/tasks/task-action-buttons.tsx`
- No TypeScript errors

---

### Step 5: Update Task Item Component

**Do**: Add action buttons and pending state visuals to the task item.

**Modify** `src/components/tasks/task-item.tsx`:

```typescript
"use client"

import { useState, useRef, useEffect } from "react"
import { GripVertical } from "lucide-react"
import { updateTaskTitle } from "@/lib/task-mutations"
import { cn } from "@/lib/utils"
import { Input } from "@/components/ui/input"
import { TaskActionButtons, PendingActionIndicator } from "./task-action-buttons"
import type { Task, TaskStatus } from "@/lib/db"

interface TaskItemProps {
  task: Task
  currentStatus: TaskStatus
  themeClass?: string
}

export function TaskItem({ task, currentStatus, themeClass }: TaskItemProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [editValue, setEditValue] = useState(task.title)
  const inputRef = useRef<HTMLInputElement>(null)
  const [isHovered, setIsHovered] = useState(false)

  const hasPendingAction = task.pendingAction != null
  const isPendingDelete = task.pendingAction === "delete"

  // Focus input when entering edit mode
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus()
      inputRef.current.select()
    }
  }, [isEditing])

  const startEditing = () => {
    if (isPendingDelete) return // Don't allow editing if pending delete
    setEditValue(task.title)
    setIsEditing(true)
  }

  const handleSave = async () => {
    const trimmed = editValue.trim()
    if (trimmed && trimmed !== task.title) {
      await updateTaskTitle(task.id, trimmed)
    }
    setIsEditing(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSave()
    } else if (e.key === "Escape") {
      setIsEditing(false)
    }
  }

  return (
    <div
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={cn(
        "group flex min-h-10 items-center gap-2 px-4 py-2",
        "transition-colors",
        // Pending action background (uses theme colors)
        hasPendingAction && !isPendingDelete && "bg-secondary",
        // Pending delete: faded background
        isPendingDelete && "bg-muted/50",
        // Hover state (only when no pending action)
        !hasPendingAction && "hover:bg-muted/50",
        // Apply theme for colored actions
        themeClass
      )}
    >
      {/* Drag handle - for future drag-and-drop */}
      <GripVertical className="h-4 w-4 shrink-0 cursor-grab text-muted-foreground/50" />

      {/* Task title - editable */}
      <div className="min-w-0 flex-1">
        {isEditing ? (
          <Input
            ref={inputRef}
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onBlur={handleSave}
            onKeyDown={handleKeyDown}
            className="h-7 px-2 py-1"
          />
        ) : (
          <span
            onClick={startEditing}
            className={cn(
              "block cursor-text truncate text-sm",
              "-mx-1 rounded px-1",
              !isPendingDelete && "hover:bg-muted",
              // Strikethrough for pending delete
              isPendingDelete && "text-muted-foreground line-through"
            )}
          >
            {task.title}
          </span>
        )}
      </div>

      {/* Action buttons or pending indicator */}
      {hasPendingAction ? (
        <PendingActionIndicator action={task.pendingAction!} />
      ) : (
        <div className={cn("transition-opacity", isHovered ? "opacity-100" : "opacity-0")}>
          <TaskActionButtons task={task} currentStatus={currentStatus} />
        </div>
      )}
    </div>
  )
}
```

**Verify**:
- File updated at `src/components/tasks/task-item.tsx`
- No TypeScript errors

---

### Step 6: Create Pending Actions Footer

**Do**: Create the Clear/Save buttons component for batch operations.

**Create** `src/components/tasks/pending-actions-footer.tsx`:

```typescript
"use client"

import { Button } from "@/components/ui/button"
import { commitPendingActions, clearPendingActions } from "@/lib/task-mutations"
import type { TaskStatus } from "@/lib/db"

interface PendingActionsFooterProps {
  scopeId: string | null
  currentStatus: TaskStatus
  pendingCount: number
}

export function PendingActionsFooter({
  scopeId,
  currentStatus,
  pendingCount,
}: PendingActionsFooterProps) {
  if (pendingCount === 0) return null

  const handleClear = async () => {
    await clearPendingActions(scopeId, currentStatus)
  }

  const handleSave = async () => {
    await commitPendingActions(scopeId, currentStatus)
  }

  return (
    <div className="flex items-center justify-end gap-3 border-t px-4 py-3">
      <Button variant="ghost" onClick={handleClear}>
        Clear
      </Button>
      <Button onClick={handleSave}>Save</Button>
    </div>
  )
}
```

**Verify**:
- File created at `src/components/tasks/pending-actions-footer.tsx`
- No TypeScript errors

---

### Step 7: Create Unfocused Warning Component

**Do**: Create the warning label and "Move all to later" button for unfocused scopes.

**Create** `src/components/tasks/unfocused-warning.tsx`:

```typescript
"use client"

import { Button } from "@/components/ui/button"
import { moveAllToLater } from "@/lib/task-mutations"

interface UnfocusedWarningProps {
  scopeId: string | null
}

export function UnfocusedWarningLabel() {
  return (
    <div className="px-4 py-2">
      <span className="inline-block rounded-md bg-destructive/10 px-2 py-1 text-xs font-medium text-destructive">
        Not in focus today
      </span>
    </div>
  )
}

export function MoveAllToLaterButton({ scopeId }: UnfocusedWarningProps) {
  const handleClick = async () => {
    await moveAllToLater(scopeId)
  }

  return (
    <div className="flex items-center justify-end border-t px-4 py-3">
      <Button variant="outline" onClick={handleClick}>
        Move all to later
      </Button>
    </div>
  )
}
```

**Verify**:
- File created at `src/components/tasks/unfocused-warning.tsx`
- No TypeScript errors

---

### Step 8: Update use-tasks.ts Hook

**Do**: Add a hook to count pending actions for a scope/status.

**Modify** `src/hooks/use-tasks.ts` — Add this function:

```typescript
import { useLiveQuery } from "dexie-react-hooks"
import { db, type Task, type TaskStatus } from "@/lib/db"

// ... existing useTasks function ...

/**
 * Count tasks with pending actions for a specific scope and status
 */
export function usePendingActionCount(
  scopeId: string | "triage",
  status: TaskStatus
): number | undefined {
  return useLiveQuery(async () => {
    const actualScopeId = scopeId === "triage" ? null : scopeId

    const count = await db.tasks
      .where("status")
      .equals(status)
      .filter((task) => task.scopeId === actualScopeId && task.pendingAction != null)
      .count()

    return count
  }, [scopeId, status])
}

/**
 * Check if a scope has a schedule slot for today
 */
export function useIsScopeScheduledToday(scopeId: string | null): boolean | undefined {
  return useLiveQuery(async () => {
    if (scopeId === null) return true // Triage is always "in focus"
    
    const today = new Date()
    const dateStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`
    
    const slot = await db.scheduleSlots
      .where("[date+scopeId]")
      .equals([dateStr, scopeId])
      .first()
    
    return slot !== undefined
  }, [scopeId])
}
```

**Verify**:
- Functions added to `src/hooks/use-tasks.ts`
- No TypeScript errors

---

### Step 9: Update Task List Component

**Do**: Integrate unfocused warning and pending actions footer.

**Modify** `src/components/tasks/task-list.tsx`:

```typescript
"use client"

import { useQueryState } from "nuqs"
import { TaskItem } from "./task-item"
import { AddTaskInput } from "./add-task-input"
import { PendingActionsFooter } from "./pending-actions-footer"
import { UnfocusedWarningLabel, MoveAllToLaterButton } from "./unfocused-warning"
import { searchParamsParsers } from "@/app/tasks/search-params"
import { useTasks, usePendingActionCount, useIsScopeScheduledToday } from "@/hooks/use-tasks"
import { useScope } from "@/hooks/use-scopes"
import { cn } from "@/lib/utils"
import type { TaskStatus } from "@/lib/db"

export function TaskList() {
  const [listType] = useQueryState("list", searchParamsParsers.list)
  const [scopeId] = useQueryState("scope", searchParamsParsers.scope)

  // Only render for now/later/backlog
  const isActiveList = ["now", "later", "backlog"].includes(listType)
  const isNowList = listType === "now"

  // Get scope info for theme
  const scope = useScope(scopeId === "triage" ? null : scopeId)

  // Determine theme class based on scope type
  const themeClass =
    scopeId === "triage"
      ? "" // No theme for triage
      : scope?.type === "job"
        ? "theme-gold"
        : scope?.type === "project"
          ? "theme-blue"
          : ""

  // Fetch tasks for this scope and status
  const tasks = useTasks(scopeId, listType as TaskStatus)
  
  // Get pending action count
  const pendingCount = usePendingActionCount(scopeId, listType as TaskStatus)
  
  // Check if scope is scheduled for today (only relevant for NOW list)
  const actualScopeId = scopeId === "triage" ? null : scopeId
  const isScheduledToday = useIsScopeScheduledToday(actualScopeId)
  
  // Show unfocused warning if: NOW list + has tasks + not scheduled today
  const showUnfocusedWarning = isNowList && 
    tasks !== undefined && 
    tasks.length > 0 && 
    isScheduledToday === false

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
      {/* Unfocused warning (above task list) */}
      {showUnfocusedWarning && <UnfocusedWarningLabel />}
      
      {/* Task list with add input at top */}
      <div className="flex-1 overflow-y-auto">
        {/* Add task input - always at top */}
        {isActiveList && <AddTaskInput scopeId={actualScopeId} status={listType as TaskStatus} />}

        {tasks.length === 0 ? (
          <div className="px-4 py-8 text-center">
            <p className="text-sm text-muted-foreground">No tasks</p>
          </div>
        ) : (
          <div className="flex flex-col">
            {tasks.map((task) => (
              <TaskItem 
                key={task.id} 
                task={task} 
                currentStatus={listType as TaskStatus}
                themeClass={themeClass}
              />
            ))}
          </div>
        )}
      </div>

      {/* Footer: either pending actions or unfocused bulk action */}
      {pendingCount !== undefined && pendingCount > 0 ? (
        <PendingActionsFooter
          scopeId={actualScopeId}
          currentStatus={listType as TaskStatus}
          pendingCount={pendingCount}
        />
      ) : showUnfocusedWarning ? (
        <MoveAllToLaterButton scopeId={actualScopeId} />
      ) : null}
    </div>
  )
}
```

**Verify**:
- File updated at `src/components/tasks/task-list.tsx`
- No TypeScript errors

---

### Step 10: Update use-task-scopes.ts

**Do**: Modify to include unscheduled scopes that have tasks, with unfocused flag.

**Modify** `src/hooks/use-task-scopes.ts` — Replace the entire file:

```typescript
"use client"

import { useMemo } from "react"
import { useLiveQuery } from "dexie-react-hooks"
import { db, type Scope, type ScheduleSlot, type MonthSlot, type TaskStatus } from "@/lib/db"
import type { TaskListType } from "@/app/tasks/search-params"

export interface TaskScope extends Scope {
  isFaded: boolean
  isUnfocused: boolean // Has tasks but not scheduled
  hasTasksInList: boolean // Whether scope has tasks in current list
}

export interface TaskScopeChild {
  project: TaskScope
}

export interface TaskScopeGroup {
  parent: TaskScope
  children: TaskScopeChild[]
}

export interface TaskScopeData {
  jobs: TaskScope[]
  projectGroups: TaskScopeGroup[]
  triageHasTasks: boolean
}

/**
 * Get scopes for the tasks page with contextual filtering
 *
 * Filtering rules:
 * - "now": Show scheduled scopes + unscheduled scopes that have NOW tasks
 * - "later": Jobs always shown + Projects with MonthSlot + any scope with Later tasks
 * - "backlog", "recurring", "recent": Show all scopes + any with tasks
 *
 * Returns scopes sorted: Jobs first, then Projects grouped by parent/child
 */
export function useTaskScopes(listType: TaskListType): TaskScopeData | undefined {
  // Get all non-archived scopes
  const scopes = useLiveQuery(() => db.scopes.filter((s) => !s.archivedAt).toArray())

  // Get today's date for "now" filtering
  const today = useMemo(() => {
    const date = new Date()
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`
  }, [])

  // Get current month for "later" filtering
  const currentMonth = useMemo(() => {
    const date = new Date()
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`
  }, [])

  // Get schedule slots for today (for "now" filtering)
  const todaySlots = useLiveQuery(
    (): Promise<ScheduleSlot[]> =>
      listType === "now"
        ? db.scheduleSlots.where("date").equals(today).toArray()
        : Promise.resolve([]),
    [listType, today]
  )

  // Get month slots for current month (for "later" filtering)
  const monthSlots = useLiveQuery(
    (): Promise<MonthSlot[]> =>
      listType === "later"
        ? db.monthSlots.where("month").equals(currentMonth).toArray()
        : Promise.resolve([]),
    [listType, currentMonth]
  )

  // Map task status for querying
  const statusForQuery: TaskStatus | null = 
    listType === "now" || listType === "later" || listType === "backlog"
      ? listType
      : listType === "recent" 
        ? "done"
        : null

  // Get task counts by scope for current list
  const taskCounts = useLiveQuery(async () => {
    if (!statusForQuery) return new Map<string, number>()
    
    const tasks = await db.tasks.where("status").equals(statusForQuery).toArray()
    const counts = new Map<string, number>()
    
    for (const task of tasks) {
      const key = task.scopeId ?? "triage"
      counts.set(key, (counts.get(key) ?? 0) + 1)
    }
    
    return counts
  }, [statusForQuery])

  // Compute scopes with filtering and grouping
  const taskScopeData = useMemo((): TaskScopeData | undefined => {
    if (!scopes) return undefined
    if (listType === "now" && !todaySlots) return undefined
    if (listType === "later" && !monthSlots) return undefined
    if (!taskCounts) return undefined

    const todaySlotsSet = new Set(todaySlots?.map((s) => s.scopeId) ?? [])
    const monthSlotsSet = new Set(monthSlots?.map((s) => s.projectId) ?? [])

    // Helper to check if a scope is scheduled
    const isScheduled = (scope: Scope): boolean => {
      if (listType === "now") {
        return todaySlotsSet.has(scope.id)
      } else if (listType === "later") {
        if (scope.type === "job") return true
        return monthSlotsSet.has(scope.id)
      }
      return true // For backlog/recurring/recent, all are considered "scheduled"
    }

    // Helper to check if scope has tasks in current list
    const hasTasks = (scopeId: string): boolean => {
      return (taskCounts.get(scopeId) ?? 0) > 0
    }

    // Helper to check if a scope should be included
    const shouldInclude = (scope: Scope): boolean => {
      // Include if scheduled OR has tasks in current list
      return isScheduled(scope) || hasTasks(scope.id)
    }

    // Split into jobs and projects, filtering by inclusion rules
    const jobs: TaskScope[] = scopes
      .filter((s) => s.type === "job" && shouldInclude(s))
      .map((scope) => ({
        ...scope,
        isFaded: false,
        isUnfocused: !isScheduled(scope) && hasTasks(scope.id),
        hasTasksInList: hasTasks(scope.id),
      }))

    const projects = scopes.filter((s) => s.type === "project")

    // Group projects by parent, filtering by inclusion rules
    const parentProjects = projects.filter((p) => !p.parentId)
    const childrenByParent: Record<string, Scope[]> = {}
    for (const p of projects) {
      if (p.parentId) {
        if (!childrenByParent[p.parentId]) {
          childrenByParent[p.parentId] = []
        }
        childrenByParent[p.parentId].push(p)
      }
    }

    // Build project groups, only including groups where parent or children pass filter
    const projectGroups: TaskScopeGroup[] = parentProjects
      .map((parent) => {
        const children = childrenByParent[parent.id] || []
        const includedChildren = children.filter(shouldInclude)
        const parentIncluded = shouldInclude(parent)

        // Include group if parent is included OR any children are included
        if (!parentIncluded && includedChildren.length === 0) {
          return null
        }

        return {
          parent: {
            ...parent,
            isFaded: !parentIncluded,
            isUnfocused: !isScheduled(parent) && hasTasks(parent.id),
            hasTasksInList: hasTasks(parent.id),
          },
          children: includedChildren.map((child) => ({
            project: {
              ...child,
              isFaded: false,
              isUnfocused: !isScheduled(child) && hasTasks(child.id),
              hasTasksInList: hasTasks(child.id),
            },
          })),
        }
      })
      .filter((group): group is TaskScopeGroup => group !== null)

    // Check if triage has tasks
    const triageHasTasks = hasTasks("triage")

    return { jobs, projectGroups, triageHasTasks }
  }, [scopes, listType, todaySlots, monthSlots, taskCounts])

  return taskScopeData
}

/**
 * Find a scope by ID from TaskScopeData
 */
export function findTaskScope(data: TaskScopeData | undefined, scopeId: string): TaskScope | null {
  if (!data) return null

  // Check jobs
  const job = data.jobs.find((j) => j.id === scopeId)
  if (job) return job

  // Check project groups
  for (const group of data.projectGroups) {
    if (group.parent.id === scopeId) return group.parent
    for (const child of group.children) {
      if (child.project.id === scopeId) return child.project
    }
  }

  return null
}
```

**Verify**:
- File updated at `src/hooks/use-task-scopes.ts`
- No TypeScript errors

---

### Step 11: Update Scope List Component

**Do**: Add right-hand dot indicators and handle unfocused state.

**Modify** `src/components/tasks/scope-list.tsx`:

```typescript
"use client"

import { useQueryState } from "nuqs"
import { searchParamsParsers } from "@/app/tasks/search-params"
import { useTaskScopes, type TaskScope } from "@/hooks/use-task-scopes"
import { ActivityDot, type DotVariant } from "@/components/ui/activity-dot"
import { cn } from "@/lib/utils"

export function ScopeList() {
  const [activeListType] = useQueryState("list", searchParamsParsers.list)
  const [activeScopeId, setActiveScopeId] = useQueryState("scope", searchParamsParsers.scope)

  const scopeData = useTaskScopes(activeListType)

  // Show Triage in Now/Later/Backlog only
  const showTriage = ["now", "later", "backlog"].includes(activeListType)

  if (!scopeData) {
    return <div className="p-4 text-sm text-muted-foreground">Loading...</div>
  }

  return (
    <div className="flex flex-col gap-0.5 p-2">
      {/* Triage (special fixed item at top) */}
      {showTriage && (
        <button
          onClick={() => setActiveScopeId("triage")}
          className={cn(
            "flex items-center gap-2 rounded-md px-3 py-2 text-left text-sm transition-colors",
            activeScopeId === "triage"
              ? "bg-muted font-medium"
              : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
          )}
        >
          <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-muted-foreground" />
          <span className="flex-1 truncate">Triage</span>
          {scopeData.triageHasTasks && (
            <ActivityDot variant="neutral" className="ml-auto" />
          )}
        </button>
      )}

      {/* Jobs (theme-gold) */}
      {scopeData.jobs.map((job) => (
        <ScopeButton
          key={job.id}
          scope={job}
          isActive={activeScopeId === job.id}
          onClick={() => setActiveScopeId(job.id)}
          themeClass="theme-gold"
          dotVariant="gold"
        />
      ))}

      {/* Projects (theme-blue) - grouped by parent/child */}
      {scopeData.projectGroups.map((group) => (
        <div key={group.parent.id}>
          {/* Parent project */}
          <ScopeButton
            scope={group.parent}
            isActive={activeScopeId === group.parent.id}
            onClick={() => setActiveScopeId(group.parent.id)}
            themeClass="theme-blue"
            dotVariant="blue"
          />
          {/* Child projects (indented) */}
          {group.children.map((child) => (
            <ScopeButton
              key={child.project.id}
              scope={child.project}
              isActive={activeScopeId === child.project.id}
              onClick={() => setActiveScopeId(child.project.id)}
              themeClass="theme-blue"
              dotVariant="blue"
              isChild
            />
          ))}
        </div>
      ))}
    </div>
  )
}

interface ScopeButtonProps {
  scope: TaskScope
  isActive: boolean
  onClick: () => void
  themeClass: "theme-gold" | "theme-blue"
  dotVariant: "gold" | "blue"
  isChild?: boolean
}

function ScopeButton({ scope, isActive, onClick, themeClass, dotVariant, isChild }: ScopeButtonProps) {
  // Jobs: filled dot, Projects: parent = filled, child = outlined
  const isProject = scope.type === "project"
  const dotClass = isProject && isChild ? "border-2 border-primary bg-transparent" : "bg-primary"

  // isFaded means this parent is only shown for visual grouping (not selectable)
  const isDisabled = scope.isFaded

  // Determine right-hand indicator dot variant
  // Red if unfocused (has tasks but not scheduled), otherwise scope color if has tasks
  const indicatorVariant: DotVariant | null = scope.hasTasksInList
    ? scope.isUnfocused
      ? "red"
      : dotVariant
    : null

  if (isDisabled) {
    // Render as non-interactive label for visual grouping
    return (
      <div
        className={cn(
          "flex items-center gap-2 rounded-md px-3 py-2 text-left text-sm",
          "text-muted-foreground",
          isChild && "pl-6"
        )}
      >
        <span className={cn(themeClass, "opacity-50")}>
          <span className={cn("block h-2.5 w-2.5 shrink-0 rounded-full", dotClass)} />
        </span>
        <span className="flex-1 truncate">{scope.title}</span>
        {indicatorVariant && <ActivityDot variant={indicatorVariant} />}
      </div>
    )
  }

  return (
    <button
      onClick={onClick}
      className={cn(
        "flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm transition-colors",
        isActive ? "bg-muted font-medium" : "text-foreground hover:bg-muted hover:text-foreground",
        isChild && "pl-6" // Indent children
      )}
    >
      <span className={themeClass}>
        <span className={cn("block h-2.5 w-2.5 shrink-0 rounded-full", dotClass)} />
      </span>
      <span className="flex-1 truncate">{scope.title}</span>
      {indicatorVariant && <ActivityDot variant={indicatorVariant} />}
    </button>
  )
}
```

**Verify**:
- File updated at `src/components/tasks/scope-list.tsx`
- No TypeScript errors

---

### Step 12: Update Task List Tabs

**Do**: Add activity dots to the tabs based on task indicators.

**Modify** `src/components/tasks/task-list-tabs.tsx`:

```typescript
"use client"

import { useQueryState } from "nuqs"
import { searchParamsParsers, type TaskListType } from "@/app/tasks/search-params"
import { useTaskIndicators } from "@/hooks/use-task-indicators"
import { ActivityDots } from "@/components/ui/activity-dot"
import { cn } from "@/lib/utils"

const LIST_TYPES: Array<{ value: TaskListType; label: string }> = [
  { value: "now", label: "Now" },
  { value: "later", label: "Later" },
  { value: "backlog", label: "Backlog" },
  { value: "recurring", label: "Recurring" },
  { value: "recent", label: "Recent" },
]

export function TaskListTabs() {
  const [activeListType, setActiveListType] = useQueryState("list", searchParamsParsers.list)
  const indicators = useTaskIndicators()

  return (
    <div className="flex items-center gap-1 border-b bg-background px-3">
      {LIST_TYPES.map(({ value, label }) => {
        const isActive = activeListType === value

        // Determine dots for this tab
        let dots: import("@/components/ui/activity-dot").DotVariant[] = []
        if (indicators) {
          if (value === "now") {
            dots = indicators.nowDots
          } else if (value === "later" && indicators.hasLaterTasks) {
            dots = ["neutral"]
          } else if (value === "backlog" && indicators.hasBacklogTasks) {
            dots = ["neutral"]
          }
        }

        return (
          <button
            key={value}
            onClick={() => setActiveListType(value)}
            className={cn(
              "relative flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors",
              isActive ? "text-foreground" : "text-muted-foreground hover:text-foreground"
            )}
          >
            {label}

            {/* Activity dots */}
            {dots.length > 0 && <ActivityDots variants={dots} />}

            {/* Active indicator bar */}
            {isActive && <span className="absolute right-0 bottom-0 left-0 h-0.5 bg-primary" />}
          </button>
        )
      })}
    </div>
  )
}
```

**Verify**:
- File updated at `src/components/tasks/task-list-tabs.tsx`
- No TypeScript errors

---

### Step 13: Update App Sidebar

**Do**: Add activity dots to the Tasks navigation item.

**Modify** `src/components/layout/app-sidebar.tsx`:

```typescript
"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useTaskIndicators } from "@/hooks/use-task-indicators"
import { ActivityDots, type DotVariant } from "@/components/ui/activity-dot"
import { cn } from "@/lib/utils"

const mainNavItems = [
  { href: "/tasks", label: "Tasks" },
  { href: "/schedule", label: "Schedule" },
  { href: "/projects", label: "Projects" },
  { href: "/jobs", label: "Jobs" },
]

const secondaryNavItems = [{ href: "/archive", label: "Archive" }]

interface NavItemProps {
  href: string
  label: string
  isActive: boolean
  dots?: DotVariant[]
}

function NavItem({ href, label, isActive, dots }: NavItemProps) {
  return (
    <Link
      href={href}
      className={cn(
        "flex items-center justify-between rounded-xl border-2 border-transparent px-3 py-1.5 text-sm transition-colors",
        isActive
          ? "border-border bg-background font-bold text-foreground"
          : "text-muted-foreground hover:bg-background hover:text-foreground"
      )}
    >
      <span>{label}</span>
      {dots && dots.length > 0 && <ActivityDots variants={dots} />}
    </Link>
  )
}

export function AppSidebar() {
  const pathname = usePathname()
  const indicators = useTaskIndicators()

  // Get dots for Tasks nav item (same as NOW tab)
  const tasksDots = indicators?.nowDots ?? []

  return (
    <aside className="flex h-full w-52 flex-col">
      {/* Logotype */}
      <div className="flex h-12 items-center px-3">
        <span className="text-sm font-semibold">Backboard</span>
      </div>

      {/* Main navigation */}
      <nav className="flex-1 space-y-1">
        {mainNavItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + "/")
          const dots = item.href === "/tasks" ? tasksDots : undefined

          return (
            <NavItem
              key={item.href}
              href={item.href}
              label={item.label}
              isActive={isActive}
              dots={dots}
            />
          )
        })}
      </nav>

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
    </aside>
  )
}
```

**Verify**:
- File updated at `src/components/layout/app-sidebar.tsx`
- No TypeScript errors

---

### Step 14: Verify Build

**Do**: Ensure everything compiles and builds.

**Commands**:

```bash
pnpm tsc --noEmit
pnpm lint
pnpm build
```

**Verify**:
- No TypeScript errors
- No lint errors
- Build succeeds with exit code 0

---

### Step 15: Visual Verification

**Do**: Test in browser.

**Commands**:

```bash
pnpm dev
```

**Checklist**:

1. **Task Actions - Now List**:
   - [ ] Hover over task → action buttons appear (✓ → →| ×)
   - [ ] Click checkmark → task gets pending "done" state (highlighted, icon shown)
   - [ ] Click → → task gets pending "later" state
   - [ ] Click →| → task gets pending "backlog" state
   - [ ] Click × → task gets pending "delete" state (strikethrough)
   - [ ] Click same action again → pending state clears (toggle)
   - [ ] Gold background for Job tasks, blue for Project tasks

2. **Task Actions - Later List**:
   - [ ] Actions are: ← (now), → (backlog), × (delete)
   - [ ] Actions work correctly

3. **Task Actions - Backlog List**:
   - [ ] Actions are: |← (now), ← (later), × (delete)
   - [ ] Actions work correctly

4. **Pending Actions Footer**:
   - [ ] "Clear" and "Save" buttons appear when any pending actions exist
   - [ ] Click "Clear" → all pending actions revert
   - [ ] Click "Save" → pending actions are committed (tasks move/delete)

5. **Activity Dots - Sidebar**:
   - [ ] "Tasks" nav item shows gold dot if any NOW job tasks
   - [ ] "Tasks" nav item shows blue dot if any NOW project tasks
   - [ ] "Tasks" nav item shows both dots if both exist
   - [ ] "Tasks" nav item shows neutral dot if only triage NOW tasks
   - [ ] "Tasks" nav item shows no dots if no NOW tasks

6. **Activity Dots - Tabs**:
   - [ ] "Now" tab has same dots as sidebar Tasks item
   - [ ] "Later" tab shows neutral dot if any later tasks
   - [ ] "Backlog" tab shows neutral dot if any backlog tasks

7. **Activity Dots - Scope List**:
   - [ ] Scopes with tasks show right-hand dot indicator
   - [ ] Gold dot for scheduled Jobs with tasks
   - [ ] Blue dot for scheduled Projects with tasks
   - [ ] Red dot for unscheduled scopes with tasks
   - [ ] Triage shows neutral dot if has tasks

8. **Unfocused Scope Warning**:
   - [ ] Create a Job, add NOW tasks, but don't schedule it for today
   - [ ] Job appears in scope list with RED dot
   - [ ] Select the Job → "Not in focus today" label appears above task list
   - [ ] "Move all to later" button appears at bottom
   - [ ] Click "Move all to later" → all NOW tasks move to Later

9. **Scope List - Unscheduled Scopes**:
   - [ ] Create a scope, don't schedule it, add tasks
   - [ ] Scope appears in list (even though not scheduled)
   - [ ] Scope shows red dot indicator
   - [ ] Selecting it shows unfocused warning (for NOW list)

10. **Theme Colors**:
    - [ ] Job tasks have gold-tinted pending action backgrounds
    - [ ] Project tasks have blue-tinted pending action backgrounds
    - [ ] Triage tasks have neutral pending action backgrounds

---

## Verification

Run these checks after implementation is complete:

| Check      | Command             | Expected Result   |
| ---------- | ------------------- | ----------------- |
| TypeScript | `pnpm tsc --noEmit` | No errors         |
| Linting    | `pnpm lint`         | No errors         |
| Build      | `pnpm build`        | Exits with code 0 |
| Dev server | `pnpm dev`          | Starts without errors |

Manual checks:

- [ ] Task action buttons appear on hover
- [ ] Pending action states display correctly (background, icon, strikethrough)
- [ ] Clear/Save footer appears with pending actions
- [ ] Clear reverts all pending; Save commits them
- [ ] Activity dots on sidebar Tasks item match NOW task scope types
- [ ] Activity dots on tabs show correctly
- [ ] Scope list right-hand dots indicate task presence
- [ ] Red dots for unscheduled scopes with tasks
- [ ] Unfocused warning label and "Move all to later" button work
- [ ] Theme colors (gold/blue) apply correctly to pending states
- [ ] No console errors
