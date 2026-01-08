# Task Row Redesign

| Field            | Value        |
| ---------------- | ------------ |
| **ID**           | 019          |
| **Status**       | ✅ Complete  |
| **Progress**     | All steps    |
| **Created**      | 2026-01-07   |
| **Last Updated** | 2026-01-07   |

---

## Overview

Redesign the task row layout and actioning flow: checkbox on left for batch selection, grip on right, bottom action bar for batch operations with icon+label buttons, and smaller action button sizes. Deprecate the `pendingAction` field in favor of immediate batch actions. Add multi-task dragging (drag all selected at once) and make the "Show unfocused scopes" toggle persistent via localStorage.

---

## References

Read these before implementing:

| Topic                      | Source                                               |
| -------------------------- | ---------------------------------------------------- |
| Current task actioning     | `dev/agents/implementations/011-task-actioning/spec.md` |
| Task item component        | `src/components/tasks/task-item.tsx`                 |
| Task action buttons        | `src/components/tasks/task-action-buttons.tsx`       |
| Task mutations             | `src/lib/task-mutations.ts`                          |
| Database schema            | `src/lib/db.ts`                                      |

---

## Scope

### In Scope

**Task Row Layout Redesign:**
- Move checkbox to left side (for batch selection)
- Move drag grip to right side (before action buttons)
- Action buttons appear on hover (right side, after grip)
- Reduce action button size from `h-7 w-7` to `h-6 w-6`

**Batch Selection System:**
- React state for selected task IDs (persists across scope/list switches)
- Simple square checkbox on each task row
- Shift+click for range selection
- "Select all" checkbox in batch action bar header

**Batch Action Bar:**
- Fixed footer when 1+ tasks selected
- Shows: checkbox (select all), count label, action buttons with icon+label
- Actions: same as row actions but execute immediately on all selected
- Clear selection after successful action
- Actions based on current list type (now/later/backlog)

**Hover Row Actions:**
- Same actions as before, just smaller (`h-6 w-6`)
- Execute immediately on single task (no pending state)

**Order Preservation:**
- Batch moves prepend to destination list
- Preserve relative order within batch

**Multi-Task Dragging:**
- When dragging a selected task, all selected tasks move together
- Works for reordering within same list
- Works for scope changes (if cross-scope drag is supported)
- Visual indicator showing number of items being dragged (e.g., badge on drag overlay)
- If dragging an unselected task, only that task moves (normal single-drag)

**Persistent "Show Unfocused Scopes" Toggle:**
- Store toggle state in localStorage (`backboard:showUnfocused`)
- Persist across page navigations and browser sessions
- Default to `false` if not set

**`pendingAction` Deprecation:**
- Remove `pendingAction` from Task interface
- Create DB version 5 migration (remove field from schema)
- Remove `setTaskPendingAction`, `commitPendingActions`, `clearPendingActions`
- Remove `PendingActionsFooter` component
- Remove `usePendingActionCount` hook
- Clean up task-item pending state visuals

### Out of Scope

- Recurring tasks (separate component/flow)
- Recent/Done list changes (read-only lists)
- Cross-scope batch operations (actions apply to current scope only)
- Keyboard shortcuts for batch actions
- Undo functionality

---

## Dependencies

- ✅ 011 Task Actioning (being replaced)
- ✅ 014 Task Drag and Drop (grip position changes)

---

## Files Created

Files this implementation will create or modify:

- [x] `src/lib/db.ts` — Version 5 migration removing `pendingAction`
- [x] `src/lib/task-mutations.ts` — Remove pending action functions, add batch action functions
- [x] `src/hooks/use-tasks.ts` — Remove `usePendingActionCount`
- [x] `src/hooks/use-task-selection.tsx` — Create: selection state management
- [x] `src/components/tasks/task-item.tsx` — Redesign layout: checkbox left, grip right, smaller actions
- [x] `src/components/tasks/task-action-buttons.tsx` — Smaller buttons, remove PendingActionIndicator
- [x] `src/components/tasks/task-checkbox.tsx` — Create: simple checkbox component
- [x] `src/components/tasks/batch-action-bar.tsx` — Create: replaces PendingActionsFooter
- [x] `src/components/tasks/task-list.tsx` — Integrate batch action bar, remove pending footer
- [x] `src/components/tasks/sortable-task-list.tsx` — Pass selection props, handle multi-drag
- [x] `src/components/tasks/draggable-task-item.tsx` — Pass selection props, multi-drag visuals
- [x] `src/components/tasks/task-dnd-provider.tsx` — Update drag handlers for multi-select
- [x] `src/components/tasks/scope-selector.tsx` — Use persistent localStorage for toggle
- [x] `src/hooks/use-local-storage.ts` — Create: reusable localStorage hook
- [x] `src/components/tasks/pending-actions-footer.tsx` — Delete

---

## Implementation Plan

### Step 1: Create Task Selection Hook

**Do**: Create a React context/hook for managing selected task IDs that persists across scope/list switches.

**Create** `src/hooks/use-task-selection.ts`:

```typescript
"use client"

import { createContext, useContext, useState, useCallback, type ReactNode } from "react"

interface TaskSelectionContextValue {
  selectedIds: Set<string>
  isSelected: (taskId: string) => boolean
  toggle: (taskId: string) => void
  select: (taskId: string) => void
  deselect: (taskId: string) => void
  selectMany: (taskIds: string[]) => void
  selectAll: (taskIds: string[]) => void
  deselectAll: () => void
  toggleAll: (taskIds: string[]) => void
  count: number
}

const TaskSelectionContext = createContext<TaskSelectionContextValue | null>(null)

export function TaskSelectionProvider({ children }: { children: ReactNode }) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  const isSelected = useCallback((taskId: string) => selectedIds.has(taskId), [selectedIds])

  const toggle = useCallback((taskId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(taskId)) {
        next.delete(taskId)
      } else {
        next.add(taskId)
      }
      return next
    })
  }, [])

  const select = useCallback((taskId: string) => {
    setSelectedIds((prev) => new Set(prev).add(taskId))
  }, [])

  const deselect = useCallback((taskId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      next.delete(taskId)
      return next
    })
  }, [])

  const selectMany = useCallback((taskIds: string[]) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      for (const id of taskIds) next.add(id)
      return next
    })
  }, [])

  const selectAll = useCallback((taskIds: string[]) => {
    setSelectedIds(new Set(taskIds))
  }, [])

  const deselectAll = useCallback(() => {
    setSelectedIds(new Set())
  }, [])

  const toggleAll = useCallback((taskIds: string[]) => {
    setSelectedIds((prev) => {
      const allSelected = taskIds.every((id) => prev.has(id))
      if (allSelected) {
        // Deselect all from this list
        const next = new Set(prev)
        for (const id of taskIds) next.delete(id)
        return next
      } else {
        // Select all from this list
        const next = new Set(prev)
        for (const id of taskIds) next.add(id)
        return next
      }
    })
  }, [])

  return (
    <TaskSelectionContext.Provider
      value={{
        selectedIds,
        isSelected,
        toggle,
        select,
        deselect,
        selectMany,
        selectAll,
        deselectAll,
        toggleAll,
        count: selectedIds.size,
      }}
    >
      {children}
    </TaskSelectionContext.Provider>
  )
}

export function useTaskSelection() {
  const context = useContext(TaskSelectionContext)
  if (!context) {
    throw new Error("useTaskSelection must be used within TaskSelectionProvider")
  }
  return context
}
```

**Verify**:
- File created at `src/hooks/use-task-selection.ts`
- No TypeScript errors: `pnpm tsc --noEmit`

---

### Step 2: Create Task Checkbox Component

**Do**: Create a simple checkbox component for task selection.

**Create** `src/components/tasks/task-checkbox.tsx`:

```typescript
"use client"

import { cn } from "@/lib/utils"

interface TaskCheckboxProps {
  checked: boolean
  onChange: () => void
  className?: string
}

export function TaskCheckbox({ checked, onChange, className }: TaskCheckboxProps) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      onClick={(e) => {
        e.stopPropagation()
        onChange()
      }}
      className={cn(
        "flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors",
        "border-muted-foreground/50 hover:border-foreground",
        checked && "border-primary bg-primary",
        className
      )}
    >
      {checked && (
        <svg
          className="h-3 w-3 text-primary-foreground"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={3}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
      )}
    </button>
  )
}
```

**Verify**:
- File created at `src/components/tasks/task-checkbox.tsx`
- No TypeScript errors

---

### Step 3: Add Batch Action Mutations

**Do**: Add mutation functions for batch task operations (immediate, no pending state).

**Modify** `src/lib/task-mutations.ts` — Add these functions and remove pending action functions:

```typescript
// ADD these new batch action functions:

/**
 * Move multiple tasks to a new status (batch action)
 * Preserves relative order by prepending in reverse order
 */
export async function batchMoveTasks(
  taskIds: string[],
  fromStatus: TaskStatus,
  toStatus: TaskStatus,
  scopeId: string | null
): Promise<void> {
  if (taskIds.length === 0) return

  const now = Date.now()

  await db.transaction("rw", [db.tasks, db.tasklists], async () => {
    // Update each task
    for (const taskId of taskIds) {
      const updates: Partial<Task> = {
        status: toStatus,
        insertedAt: now,
        insertedFrom: fromStatus,
      }
      if (toStatus === "done") {
        updates.completedAt = now
      }
      await db.tasks.update(taskId, updates)
    }

    // Remove from source list, add to destination (preserving relative order)
    await removeManyFromTasklist(scopeId, fromStatus, taskIds)
    await prependManyToTasklist(scopeId, toStatus, taskIds)
  })
}

/**
 * Delete multiple tasks (batch action)
 */
export async function batchDeleteTasks(
  taskIds: string[],
  status: TaskStatus,
  scopeId: string | null
): Promise<void> {
  if (taskIds.length === 0) return

  await db.transaction("rw", [db.tasks, db.tasklists], async () => {
    for (const taskId of taskIds) {
      await db.tasks.delete(taskId)
    }
    await removeManyFromTasklist(scopeId, status, taskIds)
  })
}

/**
 * Move a single task to a new status (immediate action, no pending state)
 */
export async function moveTask(
  taskId: string,
  fromStatus: TaskStatus,
  toStatus: TaskStatus,
  scopeId: string | null
): Promise<void> {
  const now = Date.now()

  await db.transaction("rw", [db.tasks, db.tasklists], async () => {
    const updates: Partial<Task> = {
      status: toStatus,
      insertedAt: now,
      insertedFrom: fromStatus,
    }
    if (toStatus === "done") {
      updates.completedAt = now
    }
    await db.tasks.update(taskId, updates)

    // Move between tasklists
    await moveTaskBetweenLists(taskId, scopeId, fromStatus, scopeId, toStatus)
  })
}

/**
 * Delete a single task (immediate action)
 */
export async function deleteTask(
  taskId: string,
  status: TaskStatus,
  scopeId: string | null
): Promise<void> {
  await db.transaction("rw", [db.tasks, db.tasklists], async () => {
    await db.tasks.delete(taskId)
    await removeManyFromTasklist(scopeId, status, [taskId])
  })
}

// REMOVE these functions (no longer needed):
// - setTaskPendingAction
// - commitPendingActions
// - clearPendingActions
```

After removing the deprecated functions, update imports to remove unused ones.

**Verify**:
- Functions added/removed in `src/lib/task-mutations.ts`
- No TypeScript errors

---

### Step 4: Update Database Schema (Version 5)

**Do**: Add version 5 migration that removes `pendingAction` from the schema. Note: Dexie doesn't require explicit field removal, but we clean up the type.

**Modify** `src/lib/db.ts`:

1. Remove `pendingAction` from the `Task` interface:

```typescript
export interface Task {
  id: string
  scopeId: string | null
  title: string
  content?: string
  status: TaskStatus
  // REMOVED: pendingAction?: TaskStatus | "delete" | null
  insertedAt: number
  insertedFrom: TasklistType
  createdAt: number
  completedAt?: number
}
```

2. Add version 5 (no schema change needed, just type cleanup):

```typescript
// Version 5: Remove pendingAction field (batch actions replace pending state)
// No actual schema migration needed - Dexie is schema-less for non-indexed fields
// This just documents the change and bumps version for sync consistency
this.version(5).stores({
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
- `pendingAction` removed from Task interface
- Version 5 added to db.ts
- No TypeScript errors

---

### Step 5: Update use-tasks.ts Hook

**Do**: Remove `usePendingActionCount` hook (no longer needed).

**Modify** `src/hooks/use-tasks.ts`:

Remove the `usePendingActionCount` function entirely.

**Verify**:
- Function removed from `src/hooks/use-tasks.ts`
- No TypeScript errors

---

### Step 6: Update Task Action Buttons

**Do**: Reduce button size and update to use immediate actions.

**Modify** `src/components/tasks/task-action-buttons.tsx`:

```typescript
"use client"

import { Check, ArrowRight, ArrowRightToLine, ArrowLeft, ArrowLeftToLine, X } from "lucide-react"
import { moveTask, deleteTask } from "@/lib/task-mutations"
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"
import type { Task, TaskStatus } from "@/lib/db"

interface TaskActionButtonsProps {
  task: Task
  currentStatus: TaskStatus
  scopeId: string | null
}

type ActionConfig = {
  icon: React.ComponentType<{ className?: string }>
  targetStatus: TaskStatus | "delete"
  title: string
  variant: "primary" | "secondary" | "muted"
}

const actionsPerStatus: Record<TaskStatus, ActionConfig[]> = {
  now: [
    { icon: Check, targetStatus: "done", title: "Done", variant: "primary" },
    { icon: ArrowRight, targetStatus: "later", title: "Later", variant: "secondary" },
    { icon: ArrowRightToLine, targetStatus: "backlog", title: "Backlog", variant: "secondary" },
    { icon: X, targetStatus: "delete", title: "Delete", variant: "muted" },
  ],
  later: [
    { icon: ArrowLeft, targetStatus: "now", title: "Now", variant: "primary" },
    { icon: ArrowRight, targetStatus: "backlog", title: "Backlog", variant: "secondary" },
    { icon: X, targetStatus: "delete", title: "Delete", variant: "muted" },
  ],
  backlog: [
    { icon: ArrowLeftToLine, targetStatus: "now", title: "Now", variant: "primary" },
    { icon: ArrowLeft, targetStatus: "later", title: "Later", variant: "secondary" },
    { icon: X, targetStatus: "delete", title: "Delete", variant: "muted" },
  ],
  done: [
    { icon: ArrowLeftToLine, targetStatus: "now", title: "Now", variant: "primary" },
    { icon: X, targetStatus: "delete", title: "Delete", variant: "muted" },
  ],
}

const variantClasses: Record<string, string> = {
  primary: "text-primary hover:text-primary",
  secondary: "text-muted-foreground hover:text-foreground",
  muted: "text-muted-foreground hover:text-foreground",
}

export function TaskActionButtons({ task, currentStatus, scopeId }: TaskActionButtonsProps) {
  const actions = actionsPerStatus[currentStatus] || []

  const handleAction = async (targetStatus: TaskStatus | "delete") => {
    if (targetStatus === "delete") {
      await deleteTask(task.id, currentStatus, scopeId)
    } else {
      await moveTask(task.id, currentStatus, targetStatus, scopeId)
    }
  }

  return (
    <div className="flex items-center gap-0.5">
      {actions.map(({ icon: Icon, targetStatus, title, variant }) => (
        <Tooltip key={targetStatus}>
          <TooltipTrigger asChild>
            <button
              onClick={() => handleAction(targetStatus)}
              className={cn(
                "flex h-6 w-6 items-center justify-center rounded transition-colors",
                "hover:bg-muted",
                variantClasses[variant]
              )}
            >
              <Icon className="h-3.5 w-3.5" />
            </button>
          </TooltipTrigger>
          <TooltipContent side="bottom">{title}</TooltipContent>
        </Tooltip>
      ))}
    </div>
  )
}

// Export action configs for batch action bar
export { actionsPerStatus }
export type { ActionConfig }
```

**Verify**:
- Button size reduced to `h-6 w-6`, icon to `h-3.5 w-3.5`
- `PendingActionIndicator` removed
- Actions execute immediately
- No TypeScript errors

---

### Step 7: Redesign Task Item Component

**Do**: Redesign layout with checkbox on left, grip on right.

**Modify** `src/components/tasks/task-item.tsx`:

```typescript
"use client"

import { useState, useRef, useEffect } from "react"
import { GripVertical } from "lucide-react"
import { TaskActionButtons } from "./task-action-buttons"
import { TaskCheckbox } from "./task-checkbox"
import { useTaskSelection } from "@/hooks/use-task-selection"
import { updateTaskTitle } from "@/lib/task-mutations"
import { cn } from "@/lib/utils"
import { Input } from "@/components/ui/input"
import type { Task, TaskStatus } from "@/lib/db"

interface TaskItemProps {
  task: Task
  currentStatus: TaskStatus
  scopeId: string | null
  themeClass?: string
  dragHandleProps?: React.HTMLAttributes<HTMLDivElement>
}

export function TaskItem({
  task,
  currentStatus,
  scopeId,
  themeClass,
  dragHandleProps,
}: TaskItemProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [editValue, setEditValue] = useState(task.title)
  const inputRef = useRef<HTMLInputElement>(null)
  const [isHovered, setIsHovered] = useState(false)

  const { isSelected, toggle } = useTaskSelection()
  const checked = isSelected(task.id)

  // Focus input when entering edit mode
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus()
      inputRef.current.select()
    }
  }, [isEditing])

  const startEditing = () => {
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
        "group flex min-h-10 items-center gap-2 px-3 py-2",
        "transition-colors",
        checked && "bg-muted/50",
        !checked && "hover:bg-muted/30",
        themeClass
      )}
    >
      {/* Checkbox (left) */}
      <TaskCheckbox checked={checked} onChange={() => toggle(task.id)} />

      {/* Task title - editable (center, flex-1) */}
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
              "hover:bg-muted"
            )}
          >
            {task.title}
          </span>
        )}
      </div>

      {/* Right side: action buttons (on hover) + drag grip */}
      <div className="flex items-center gap-1">
        {/* Action buttons (show on hover) */}
        <div className={cn("transition-opacity", isHovered ? "opacity-100" : "opacity-0")}>
          <TaskActionButtons task={task} currentStatus={currentStatus} scopeId={scopeId} />
        </div>

        {/* Drag handle (always visible but muted) */}
        <div
          {...dragHandleProps}
          className={cn(
            "flex h-6 w-6 shrink-0 cursor-grab items-center justify-center rounded",
            "hover:bg-muted active:cursor-grabbing"
          )}
        >
          <GripVertical className="h-3.5 w-3.5 text-muted-foreground/50" />
        </div>
      </div>
    </div>
  )
}
```

**Verify**:
- Layout updated: checkbox left, grip right
- Action buttons smaller (`h-6 w-6`)
- Selection state integrated
- No TypeScript errors

---

### Step 8: Create Batch Action Bar

**Do**: Create the batch action bar component that replaces PendingActionsFooter.

**Create** `src/components/tasks/batch-action-bar.tsx`:

```typescript
"use client"

import { Check, ArrowRight, ArrowRightToLine, ArrowLeft, ArrowLeftToLine, X } from "lucide-react"
import { TaskCheckbox } from "./task-checkbox"
import { useTaskSelection } from "@/hooks/use-task-selection"
import { batchMoveTasks, batchDeleteTasks } from "@/lib/task-mutations"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import type { TaskStatus } from "@/lib/db"

interface BatchActionBarProps {
  taskIds: string[] // All task IDs in current list (for select all)
  currentStatus: TaskStatus
  scopeId: string | null
}

type BatchAction = {
  icon: React.ComponentType<{ className?: string }>
  label: string
  targetStatus: TaskStatus | "delete"
  variant: "default" | "secondary" | "destructive"
}

const batchActionsPerStatus: Record<TaskStatus, BatchAction[]> = {
  now: [
    { icon: Check, label: "Done", targetStatus: "done", variant: "default" },
    { icon: ArrowRight, label: "Later", targetStatus: "later", variant: "secondary" },
    { icon: ArrowRightToLine, label: "Backlog", targetStatus: "backlog", variant: "secondary" },
    { icon: X, label: "Delete", targetStatus: "delete", variant: "destructive" },
  ],
  later: [
    { icon: ArrowLeft, label: "Now", targetStatus: "now", variant: "default" },
    { icon: ArrowRight, label: "Backlog", targetStatus: "backlog", variant: "secondary" },
    { icon: X, label: "Delete", targetStatus: "delete", variant: "destructive" },
  ],
  backlog: [
    { icon: ArrowLeftToLine, label: "Now", targetStatus: "now", variant: "default" },
    { icon: ArrowLeft, label: "Later", targetStatus: "later", variant: "secondary" },
    { icon: X, label: "Delete", targetStatus: "delete", variant: "destructive" },
  ],
  done: [
    { icon: ArrowLeftToLine, label: "Now", targetStatus: "now", variant: "default" },
    { icon: X, label: "Delete", targetStatus: "delete", variant: "destructive" },
  ],
}

export function BatchActionBar({ taskIds, currentStatus, scopeId }: BatchActionBarProps) {
  const { selectedIds, toggleAll, deselectAll, count } = useTaskSelection()

  // Get selected IDs that are in the current list
  const selectedInList = taskIds.filter((id) => selectedIds.has(id))
  const selectedCount = selectedInList.length

  if (selectedCount === 0) return null

  const allSelected = taskIds.length > 0 && taskIds.every((id) => selectedIds.has(id))
  const actions = batchActionsPerStatus[currentStatus] || []

  const handleAction = async (targetStatus: TaskStatus | "delete") => {
    if (targetStatus === "delete") {
      await batchDeleteTasks(selectedInList, currentStatus, scopeId)
    } else {
      await batchMoveTasks(selectedInList, currentStatus, targetStatus, scopeId)
    }
    deselectAll()
  }

  return (
    <div className="flex items-center gap-4 border-t bg-background px-4 py-3">
      {/* Select all checkbox */}
      <div className="flex items-center gap-2">
        <TaskCheckbox
          checked={allSelected}
          onChange={() => toggleAll(taskIds)}
        />
        <span className="text-sm text-muted-foreground">
          {selectedCount} selected
        </span>
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Action buttons */}
      <div className="flex items-center gap-2">
        {actions.map(({ icon: Icon, label, targetStatus, variant }) => (
          <Button
            key={targetStatus}
            variant={variant === "destructive" ? "destructive" : variant === "default" ? "default" : "outline"}
            size="sm"
            onClick={() => handleAction(targetStatus)}
            className="gap-1.5"
          >
            <Icon className="h-4 w-4" />
            {label}
          </Button>
        ))}
      </div>

      {/* Cancel button */}
      <Button variant="ghost" size="sm" onClick={deselectAll}>
        Cancel
      </Button>
    </div>
  )
}
```

**Verify**:
- File created at `src/components/tasks/batch-action-bar.tsx`
- Actions show icon + label
- Executes batch operations immediately
- No TypeScript errors

---

### Step 9: Update Task List Component

**Do**: Replace PendingActionsFooter with BatchActionBar and add TaskSelectionProvider.

**Modify** `src/components/tasks/task-list.tsx`:

```typescript
"use client"

import { ArrowUp } from "lucide-react"
import { useQueryState } from "nuqs"
import { SortableTaskList } from "./sortable-task-list"
import { AddTaskInput } from "./add-task-input"
import { BatchActionBar } from "./batch-action-bar"
import { UnfocusedWarningLabel, MoveAllToLaterButton } from "./unfocused-warning"
import { searchParamsParsers } from "@/app/tasks/search-params"
import {
  useTasks,
  useIsScopeScheduledToday,
  useLaterTaskCount,
} from "@/hooks/use-tasks"
import { useScope } from "@/hooks/use-scopes"
import { moveAllFromLaterToNow } from "@/lib/task-mutations"
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
      ? ""
      : scope?.type === "job"
        ? "theme-gold"
        : scope?.type === "project"
          ? "theme-blue"
          : ""

  // Fetch tasks for this scope and status
  const tasks = useTasks(scopeId, listType as TaskStatus)

  // Check if scope is scheduled for today (only relevant for NOW list)
  const actualScopeId = scopeId === "triage" ? null : scopeId
  const isScheduledToday = useIsScopeScheduledToday(actualScopeId)

  // Show unfocused warning if: NOW list + has tasks + not scheduled today
  const showUnfocusedWarning =
    isNowList && tasks !== undefined && tasks.length > 0 && isScheduledToday === false

  // Count Later tasks (only check when viewing NOW list)
  const laterTaskCount = useLaterTaskCount(scopeId)

  // Show "Move from Later" when: NOW list + empty + Later has tasks
  const showMoveFromLater = isNowList && tasks?.length === 0 && (laterTaskCount ?? 0) > 0

  // Loading state
  if (tasks === undefined) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-sm text-muted-foreground">Loading tasks...</p>
      </div>
    )
  }

  const taskIds = tasks.map((t) => t.id)

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
            {showMoveFromLater && (
              <button
                onClick={() => moveAllFromLaterToNow(actualScopeId)}
                className={cn(
                  "mt-4 inline-flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium",
                  "bg-primary/10 text-primary transition-colors hover:bg-primary/20"
                )}
              >
                <ArrowUp className="h-4 w-4" />
                Move {laterTaskCount} from Later
              </button>
            )}
          </div>
        ) : (
          <SortableTaskList
            tasks={tasks}
            scopeId={actualScopeId}
            status={listType as TaskStatus}
            themeClass={themeClass}
          />
        )}
      </div>

      {/* Footer: batch action bar or unfocused bulk action */}
      {isActiveList && (
        <BatchActionBar
          taskIds={taskIds}
          currentStatus={listType as TaskStatus}
          scopeId={actualScopeId}
        />
      )}
      {showUnfocusedWarning && <MoveAllToLaterButton scopeId={actualScopeId} />}
    </div>
  )
}
```

**Verify**:
- `PendingActionsFooter` replaced with `BatchActionBar`
- `usePendingActionCount` removed from imports
- No TypeScript errors

---

### Step 10: Update Sortable Task List

**Do**: Pass `scopeId` through to TaskItem.

**Modify** `src/components/tasks/sortable-task-list.tsx`:

```typescript
"use client"

import { useEffect } from "react"
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable"
import { DraggableTaskItem } from "./draggable-task-item"
import { useTaskDnd } from "./task-dnd-provider"
import type { Task, TaskStatus } from "@/lib/db"

interface SortableTaskListProps {
  tasks: Task[]
  scopeId: string | null
  status: TaskStatus
  themeClass?: string
}

export function SortableTaskList({ tasks, scopeId, status, themeClass }: SortableTaskListProps) {
  const { registerTaskList, unregisterTaskList } = useTaskDnd()

  useEffect(() => {
    registerTaskList(scopeId, status, tasks)
    return () => unregisterTaskList(scopeId, status)
  }, [scopeId, status, tasks, registerTaskList, unregisterTaskList])

  const taskIds = tasks.map((t) => t.id)

  return (
    <SortableContext items={taskIds} strategy={verticalListSortingStrategy}>
      <div className="flex flex-col">
        {tasks.map((task) => (
          <DraggableTaskItem
            key={task.id}
            task={task}
            currentStatus={status}
            scopeId={scopeId}
            themeClass={themeClass}
          />
        ))}
      </div>
    </SortableContext>
  )
}
```

**Verify**:
- `scopeId` passed to `DraggableTaskItem`
- No TypeScript errors

---

### Step 11: Update Draggable Task Item

**Do**: Pass `scopeId` through to TaskItem.

**Modify** `src/components/tasks/draggable-task-item.tsx`:

```typescript
"use client"

import { useSortable } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { TaskItem } from "./task-item"
import type { Task, TaskStatus } from "@/lib/db"

interface DraggableTaskItemProps {
  task: Task
  currentStatus: TaskStatus
  scopeId: string | null
  themeClass?: string
}

export function DraggableTaskItem({
  task,
  currentStatus,
  scopeId,
  themeClass,
}: DraggableTaskItemProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: task.id,
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <div ref={setNodeRef} style={style}>
      <TaskItem
        task={task}
        currentStatus={currentStatus}
        scopeId={scopeId}
        themeClass={themeClass}
        dragHandleProps={{ ...attributes, ...listeners }}
      />
    </div>
  )
}
```

**Verify**:
- `scopeId` prop added and passed through
- No TypeScript errors

---

### Step 12: Add TaskSelectionProvider to Layout

**Do**: Wrap the tasks page with TaskSelectionProvider.

**Modify** `src/app/tasks/page.tsx` — Wrap content with provider:

```typescript
// Add import at top:
import { TaskSelectionProvider } from "@/hooks/use-task-selection"

// Wrap the return content with the provider
export default function TasksPage() {
  return (
    <TaskSelectionProvider>
      {/* existing content */}
    </TaskSelectionProvider>
  )
}
```

Alternatively, if the provider should be higher (e.g., in layout), add it to `src/app/layout.tsx`.

**Verify**:
- `TaskSelectionProvider` wraps task content
- Selection state accessible in task components
- No TypeScript errors

---

### Step 13: Create useLocalStorage Hook

**Do**: Create a reusable hook for localStorage-backed state.

**Create** `src/hooks/use-local-storage.ts`:

```typescript
"use client"

import { useState, useEffect, useCallback } from "react"

export function useLocalStorage<T>(key: string, defaultValue: T): [T, (value: T) => void] {
  // Initialize with default, then sync with localStorage on mount
  const [value, setValue] = useState<T>(defaultValue)
  const [isHydrated, setIsHydrated] = useState(false)

  // Read from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(key)
      if (stored !== null) {
        setValue(JSON.parse(stored))
      }
    } catch {
      // Ignore parse errors, use default
    }
    setIsHydrated(true)
  }, [key])

  // Write to localStorage when value changes (after hydration)
  const setStoredValue = useCallback(
    (newValue: T) => {
      setValue(newValue)
      try {
        localStorage.setItem(key, JSON.stringify(newValue))
      } catch {
        // Ignore write errors (e.g., quota exceeded)
      }
    },
    [key]
  )

  return [value, setStoredValue]
}
```

**Verify**:
- File created at `src/hooks/use-local-storage.ts`
- No TypeScript errors

---

### Step 14: Update ScopeSelector for Persistent Toggle

**Do**: Replace `useState` with `useLocalStorage` for the "Show unfocused scopes" toggle.

**Modify** `src/components/tasks/scope-selector.tsx`:

```typescript
// Change import:
// BEFORE: import { useState } from "react"
// AFTER:
import { useState } from "react"
import { useLocalStorage } from "@/hooks/use-local-storage"

// Change state declaration:
// BEFORE: const [showUnfocused, setShowUnfocused] = useState(false)
// AFTER:
const [showUnfocused, setShowUnfocused] = useLocalStorage("backboard:showUnfocused", false)
```

**Verify**:
- Toggle state persists across page navigations
- Toggle state persists across browser sessions
- Default is `false` on first load
- No TypeScript errors

---

### Step 15: Add Multi-Drag Batch Mutation

**Do**: Add mutation function for reordering multiple tasks at once.

**Modify** `src/lib/task-mutations.ts` — Add this function:

```typescript
/**
 * Reorder multiple tasks within a tasklist (multi-drag)
 * Moves selected tasks to new positions as a group
 */
export async function reorderMultipleTasks(
  scopeId: string | null,
  status: TaskStatus,
  selectedIds: string[],
  allTaskIds: string[],
  overIndex: number
): Promise<void> {
  if (selectedIds.length === 0) return

  // Build new order: remove selected, insert at target position
  const remaining = allTaskIds.filter((id) => !selectedIds.includes(id))
  
  // Calculate insert position - if dropping after original positions, adjust
  const insertAt = Math.min(overIndex, remaining.length)
  
  // Insert selected items (preserving their relative order from original list)
  const orderedSelected = allTaskIds.filter((id) => selectedIds.includes(id))
  const newOrder = [
    ...remaining.slice(0, insertAt),
    ...orderedSelected,
    ...remaining.slice(insertAt),
  ]

  await reorderTasklist(scopeId, status, newOrder)
}
```

**Verify**:
- Function added to `src/lib/task-mutations.ts`
- No TypeScript errors

---

### Step 16: Update Task DnD Provider for Multi-Drag

**Do**: Update the drag-and-drop provider to handle multi-task dragging.

**Modify** `src/components/tasks/task-dnd-provider.tsx`:

Add selection context integration and update `handleDragEnd`:

```typescript
// Add import
import { useTaskSelection } from "@/hooks/use-task-selection"
import { reorderMultipleTasks } from "@/lib/task-mutations"

// Inside TaskDndProvider component, add:
const { selectedIds, isSelected, deselectAll } = useTaskSelection()

// Update handleDragEnd to handle multi-drag:
const handleDragEnd = useCallback(
  async (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return

    const activeId = String(active.id)
    
    // Find which list the dragged item belongs to
    let sourceList: { scopeId: string | null; status: TaskStatus; tasks: Task[] } | null = null
    for (const [key, data] of taskLists.current.entries()) {
      if (data.tasks.some((t) => t.id === activeId)) {
        sourceList = data
        break
      }
    }
    
    if (!sourceList) return
    
    const { scopeId, status, tasks } = sourceList
    const taskIds = tasks.map((t) => t.id)
    const overIndex = taskIds.indexOf(String(over.id))
    
    if (overIndex === -1) return

    // Check if this is a multi-drag (active item is selected and there are other selections)
    const draggingSelected = isSelected(activeId) && selectedIds.size > 1
    
    if (draggingSelected) {
      // Multi-drag: move all selected items
      const selectedInList = taskIds.filter((id) => selectedIds.has(id))
      await reorderMultipleTasks(scopeId, status, selectedInList, taskIds, overIndex)
      deselectAll() // Clear selection after multi-drag
    } else {
      // Single drag: normal reorder
      const oldIndex = taskIds.indexOf(activeId)
      if (oldIndex === -1) return
      
      const newOrder = arrayMove(taskIds, oldIndex, overIndex)
      await reorderTasks(scopeId, status, newOrder)
    }
  },
  [isSelected, selectedIds, deselectAll]
)
```

**Verify**:
- Multi-drag works when dragging a selected item with other selections
- Single drag works when dragging an unselected item
- No TypeScript errors

---

### Step 17: Update Draggable Task Item for Multi-Drag Visual

**Do**: Add visual indicator when multiple items are being dragged.

**Modify** `src/components/tasks/draggable-task-item.tsx`:

```typescript
"use client"

import { useSortable } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { TaskItem } from "./task-item"
import { useTaskSelection } from "@/hooks/use-task-selection"
import { cn } from "@/lib/utils"
import type { Task, TaskStatus } from "@/lib/db"

interface DraggableTaskItemProps {
  task: Task
  currentStatus: TaskStatus
  scopeId: string | null
  themeClass?: string
}

export function DraggableTaskItem({
  task,
  currentStatus,
  scopeId,
  themeClass,
}: DraggableTaskItemProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: task.id,
  })

  const { selectedIds, isSelected } = useTaskSelection()
  const isThisSelected = isSelected(task.id)
  
  // Count how many selected items are being dragged with this one
  const selectedCount = selectedIds.size
  const showDragCount = isDragging && isThisSelected && selectedCount > 1

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <div ref={setNodeRef} style={style} className="relative">
      <TaskItem
        task={task}
        currentStatus={currentStatus}
        scopeId={scopeId}
        themeClass={themeClass}
        dragHandleProps={{ ...attributes, ...listeners }}
      />
      
      {/* Multi-drag count badge */}
      {showDragCount && (
        <span
          className={cn(
            "absolute -top-2 -right-2 z-10",
            "flex h-5 min-w-5 items-center justify-center rounded-full",
            "bg-primary text-xs font-medium text-primary-foreground",
            "px-1.5"
          )}
        >
          {selectedCount}
        </span>
      )}
    </div>
  )
}
```

**Verify**:
- Badge shows count when dragging multiple selected items
- Badge doesn't show for single drags
- No TypeScript errors

---

### Step 18: Delete PendingActionsFooter

**Do**: Remove the deprecated component file.

**Delete** `src/components/tasks/pending-actions-footer.tsx`

**Verify**:
- File deleted
- No import errors remain in codebase

---

### Step 19: Verify Build

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

### Step 20: Visual Verification

**Do**: Test in browser.

**Commands**:

```bash
pnpm dev
```

**Checklist**:

1. **Task Row Layout**:
   - [ ] Checkbox on left side
   - [ ] Task title in center (editable on click)
   - [ ] Drag grip on right side (visible, muted)
   - [ ] Action buttons appear on hover (right of grip)
   - [ ] Action buttons are smaller (24px)

2. **Single Task Actions**:
   - [ ] Hover shows action buttons
   - [ ] Click action → task moves/deletes immediately
   - [ ] No pending state visual

3. **Batch Selection**:
   - [ ] Click checkbox → task selected (background highlight)
   - [ ] Click again → deselected
   - [ ] Selection persists when switching scopes
   - [ ] Selection persists when switching list types

4. **Batch Action Bar**:
   - [ ] Appears when 1+ tasks selected
   - [ ] Shows "X selected" count
   - [ ] Shows action buttons with icon + label
   - [ ] "Select all" checkbox toggles all tasks
   - [ ] Cancel clears selection

5. **Batch Actions**:
   - [ ] Select multiple tasks → click "Done" → all move to done
   - [ ] Select multiple → click "Later" → all move to later
   - [ ] Select multiple → click "Delete" → all deleted
   - [ ] Selection clears after action
   - [ ] Order preserved in destination list

6. **Different List Types**:
   - [ ] Now list: Done, Later, Backlog, Delete actions
   - [ ] Later list: Now, Backlog, Delete actions
   - [ ] Backlog list: Now, Later, Delete actions

7. **Edge Cases**:
   - [ ] Empty list shows no batch bar
   - [ ] Switching away and back preserves selection
   - [ ] Drag and drop still works with checkbox visible

8. **Multi-Task Dragging**:
   - [ ] Select 3+ tasks → drag one → all selected move together
   - [ ] Badge shows count (e.g., "3") on drag overlay
   - [ ] Relative order of selected tasks preserved
   - [ ] Dragging unselected task moves only that task
   - [ ] Selection clears after multi-drag drop

9. **Persistent "Show Unfocused Scopes" Toggle**:
   - [ ] Toggle is OFF by default on fresh browser
   - [ ] Enable toggle → navigate to Schedule page → return to Tasks → toggle still ON
   - [ ] Enable toggle → close browser → reopen → toggle still ON
   - [ ] localStorage has key `backboard:showUnfocused` with value `true`

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

- [ ] Task row layout: checkbox left, grip right
- [ ] Action buttons smaller (h-6 w-6)
- [ ] Hover shows action buttons on row
- [ ] Clicking action executes immediately (no pending)
- [ ] Checkbox toggles selection
- [ ] Batch action bar appears with selections
- [ ] Batch actions execute on all selected
- [ ] Selection persists across scope/list switches
- [ ] Order preserved on batch moves
- [ ] Multi-drag moves all selected tasks together
- [ ] Multi-drag shows count badge
- [ ] "Show unfocused scopes" toggle persists across navigation
- [ ] "Show unfocused scopes" toggle persists across browser sessions
- [ ] No console errors
- [ ] pendingAction removed from Task type
