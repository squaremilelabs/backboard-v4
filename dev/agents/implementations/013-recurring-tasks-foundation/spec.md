# Recurring Tasks Foundation

| Field            | Value        |
| ---------------- | ------------ |
| **ID**           | 013          |
| **Status**       | ✅ Complete  |
| **Progress**     | 10/10        |
| **Created**      | 2026-01-05   |
| **Last Updated** | 2026-01-05   |

---

## Overview

Implement the Recurring Tasks list UI, enabling users to create, view, edit, and manage recurring task templates. Recurring tasks can have multiple frequencies (weekday + time combinations) or no frequency (template mode for manual insertion).

---

## References

Read these before implementing:

| Topic                  | Source                                       |
| ---------------------- | -------------------------------------------- |
| Recurring task concept | `dev/specs/prd.md` §2.2                      |
| RecurringTask schema   | `dev/specs/prd.md` §3                        |
| Database schema        | `src/lib/db.ts` (RecurringTask interface)    |
| Task lifecycle         | `dev/specs/prd.md` §2.2                      |
| Existing task list     | `src/components/tasks/task-list.tsx`         |
| Existing task item     | `src/components/tasks/task-item.tsx`         |
| Tasks page             | `src/app/tasks/page.tsx`                     |
| Task scopes hook       | `src/hooks/use-task-scopes.ts`               |

---

## Scope

### In Scope

**Recurring Task List:**
- Display recurring tasks grouped by scope when on "Recurring" tab
- Similar visual style to regular task lists
- No Triage (recurring tasks must belong to a Job or Project)

**Recurring Task Item:**
- Title display with click-to-edit inline editing
- Day indicator: circles showing frequency days (M T W T F S S)
  - Filled circles for active days, empty for inactive
  - Clicking indicator opens frequency picker popover
- Tasks with no frequency show as "Template" (different visual treatment)
- Action buttons:
  - "Insert now" (duplicate into Now list) — always available
  - Delete — always available

**Frequency Picker (Popover):**
- Weekday toggles (Mon–Sun)
- Time picker (HH:mm format)
- Timezone display (auto-detected, editable via dropdown)
- Support multiple frequencies per task
- Add/remove frequency entries

**Add Recurring Task:**
- Inline input at top of each scope's task list
- Creates with empty frequency (template mode) by default

**Insertion Logic:**
- `insertRecurringTaskNow()` function that:
  - Creates a new Task from RecurringTask template
  - Sets `status: "now"`, `insertedFrom: "recurring"`
  - Does NOT update `lastInsertedDate` (that's for auto-sync)
- This logic will be reused by the future sync job

**Scope List Behavior (Recurring tab):**
- Show ALL non-archived Jobs & Projects
- No Triage shown (recurring tasks require a scope)
- Scopes with recurring tasks show activity dot

### Out of Scope

- **Sync job** that auto-inserts recurring tasks when scheduled time passes
- Rich text content/notes for recurring tasks
- Drag-and-drop reordering
- Batch actions / pending action system (recurring tasks have immediate actions)

---

## Dependencies

- ✅ 002 Database Schema (`recurringTasks` table exists)
- ✅ 009 Tasks Page Layout (tabs, scope selector)
- ✅ 010 Task Display & CRUD (patterns to follow)
- ✅ 011 Task Actioning (action button patterns)

---

## Files Created

Files this implementation will create or modify:

- [x] `src/lib/recurring-task-mutations.ts` — Create: CRUD + insert now functions
- [x] `src/hooks/use-recurring-tasks.ts` — Create: Dexie live query hooks
- [x] `src/components/tasks/recurring-task-list.tsx` — Create: Main list component
- [x] `src/components/tasks/recurring-task-item.tsx` — Create: Task row with day indicator
- [x] `src/components/tasks/add-recurring-task-input.tsx` — Create: Inline input
- [x] `src/components/tasks/frequency-indicator.tsx` — Create: Day circles + popover trigger
- [x] `src/components/tasks/frequency-picker.tsx` — Create: Popover with weekday/time picker
- [x] `src/hooks/use-task-scopes.ts` — Modify: Handle "recurring" list type properly
- [x] `src/app/tasks/page.tsx` — Modify: Render RecurringTaskList for recurring tab
- [x] `src/lib/db.ts` — Modify: Added RecurringTaskAction type and pendingAction field
- [x] `src/components/tasks/scope-list.tsx` — Modify: Handle recurring tab auto-select

---

## Implementation Plan

### Step 1: Create recurring-task-mutations.ts ✅

**Do**: Create mutation functions for recurring tasks CRUD and insertion.

**Create** `src/lib/recurring-task-mutations.ts`:

```typescript
import { db, type RecurringTask, type FrequencyValue } from "@/lib/db"

/**
 * Create a new recurring task (starts as template with no frequency)
 */
export async function createRecurringTask(
  title: string,
  scopeId: string
): Promise<string> {
  const id = crypto.randomUUID()
  const now = Date.now()

  await db.recurringTasks.add({
    id,
    scopeId,
    title: title.trim(),
    frequency: [], // Empty = template mode
    createdAt: now,
  })

  return id
}

/**
 * Update a recurring task's title
 */
export async function updateRecurringTaskTitle(
  taskId: string,
  title: string
): Promise<void> {
  await db.recurringTasks.update(taskId, { title: title.trim() })
}

/**
 * Update a recurring task's frequency
 */
export async function updateRecurringTaskFrequency(
  taskId: string,
  frequency: FrequencyValue[]
): Promise<void> {
  await db.recurringTasks.update(taskId, { frequency })
}

/**
 * Delete a recurring task
 */
export async function deleteRecurringTask(taskId: string): Promise<void> {
  await db.recurringTasks.delete(taskId)
}

/**
 * Insert a recurring task into the Now list (manual trigger or sync job)
 * Creates a new Task from the RecurringTask template
 * 
 * @param recurringTask - The recurring task to insert from
 * @param updateLastInserted - If true, updates lastInsertedDate (for sync job).
 *                             For manual insertion, this should be false.
 */
export async function insertRecurringTaskNow(
  recurringTask: RecurringTask,
  updateLastInserted: boolean = false
): Promise<string> {
  const id = crypto.randomUUID()
  const now = Date.now()

  await db.transaction("rw", [db.tasks, db.recurringTasks], async () => {
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

    // Update lastInsertedDate if requested (for sync job)
    if (updateLastInserted) {
      const today = new Date().toISOString().split("T")[0] // YYYY-MM-DD
      await db.recurringTasks.update(recurringTask.id, { lastInsertedDate: today })
    }
  })

  return id
}

/**
 * Get user's timezone (from appMeta or browser default)
 */
export async function getUserTimezone(): Promise<string> {
  const meta = await db.appMeta.get("app")
  return meta?.timezone ?? Intl.DateTimeFormat().resolvedOptions().timeZone
}

/**
 * Update user's default timezone
 */
export async function setUserTimezone(timezone: string): Promise<void> {
  await db.appMeta.put({
    id: "app",
    lastSyncedAt: Date.now(),
    timezone,
  })
}
```

**Verify**:
- File created at `src/lib/recurring-task-mutations.ts`
- No TypeScript errors: `pnpm tsc --noEmit`

---

### Step 2: Create use-recurring-tasks.ts hook ✅

**Do**: Create Dexie live query hooks for recurring tasks.

**Create** `src/hooks/use-recurring-tasks.ts`:

```typescript
import { useLiveQuery } from "dexie-react-hooks"
import { db, type RecurringTask } from "@/lib/db"

/**
 * Get all recurring tasks for a specific scope
 */
export function useRecurringTasks(scopeId: string): RecurringTask[] | undefined {
  return useLiveQuery(async () => {
    const tasks = await db.recurringTasks
      .where("scopeId")
      .equals(scopeId)
      .toArray()

    // Sort by createdAt descending (newest first)
    return tasks.sort((a, b) => b.createdAt - a.createdAt)
  }, [scopeId])
}

/**
 * Get recurring task counts by scope (for activity indicators)
 */
export function useRecurringTaskCounts(): Map<string, number> | undefined {
  return useLiveQuery(async () => {
    const tasks = await db.recurringTasks.toArray()
    const counts = new Map<string, number>()

    for (const task of tasks) {
      counts.set(task.scopeId, (counts.get(task.scopeId) ?? 0) + 1)
    }

    return counts
  })
}

/**
 * Get the user's timezone setting
 */
export function useUserTimezone(): string {
  const timezone = useLiveQuery(async () => {
    const meta = await db.appMeta.get("app")
    return meta?.timezone
  })

  // Default to browser timezone if not set
  return timezone ?? Intl.DateTimeFormat().resolvedOptions().timeZone
}
```

**Verify**:
- File created at `src/hooks/use-recurring-tasks.ts`
- No TypeScript errors

---

### Step 3: Create frequency-indicator.tsx ✅

**Do**: Create the day circles component that shows which days a recurring task runs.

**Create** `src/components/tasks/frequency-indicator.tsx`:

```typescript
"use client"

import { cn } from "@/lib/utils"
import type { FrequencyValue, Weekday } from "@/lib/db"

const WEEKDAYS: { key: Weekday; label: string }[] = [
  { key: "mon", label: "M" },
  { key: "tue", label: "T" },
  { key: "wed", label: "W" },
  { key: "thu", label: "T" },
  { key: "fri", label: "F" },
  { key: "sat", label: "S" },
  { key: "sun", label: "S" },
]

interface FrequencyIndicatorProps {
  frequency: FrequencyValue[]
  onClick?: () => void
  className?: string
}

export function FrequencyIndicator({ frequency, onClick, className }: FrequencyIndicatorProps) {
  // Get active weekdays from frequency
  const activeDays = new Set(frequency.map((f) => f.weekday))

  // If no frequency, show template indicator
  if (frequency.length === 0) {
    return (
      <button
        type="button"
        onClick={onClick}
        className={cn(
          "flex items-center gap-1 rounded-md px-2 py-1 text-xs",
          "text-muted-foreground transition-colors hover:bg-muted hover:text-foreground",
          className
        )}
      >
        <span className="text-muted-foreground/70">Template</span>
      </button>
    )
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex items-center gap-0.5 rounded-md px-1.5 py-1",
        "transition-colors hover:bg-muted",
        className
      )}
    >
      {WEEKDAYS.map(({ key, label }) => {
        const isActive = activeDays.has(key)
        return (
          <span
            key={key}
            className={cn(
              "flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-medium",
              isActive
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground/50"
            )}
          >
            {label}
          </span>
        )
      })}
    </button>
  )
}

export { WEEKDAYS }
```

**Verify**:
- File created at `src/components/tasks/frequency-indicator.tsx`
- No TypeScript errors

---

### Step 4: Create frequency-picker.tsx ✅

**Do**: Create the popover component for editing recurring task frequency.

**Create** `src/components/tasks/frequency-picker.tsx`:

```typescript
"use client"

import { useState, useEffect } from "react"
import { Plus, Trash2, Clock } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { WEEKDAYS } from "./frequency-indicator"
import { cn } from "@/lib/utils"
import type { FrequencyValue, Weekday } from "@/lib/db"

// Common timezone options
const TIMEZONE_OPTIONS = [
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "America/Anchorage",
  "Pacific/Honolulu",
  "Europe/London",
  "Europe/Paris",
  "Europe/Berlin",
  "Asia/Tokyo",
  "Asia/Shanghai",
  "Asia/Singapore",
  "Australia/Sydney",
  "UTC",
]

interface FrequencyPickerProps {
  frequency: FrequencyValue[]
  userTimezone: string
  onFrequencyChange: (frequency: FrequencyValue[]) => void
  onTimezoneChange: (timezone: string) => void
  trigger: React.ReactNode
}

export function FrequencyPicker({
  frequency,
  userTimezone,
  onFrequencyChange,
  onTimezoneChange,
  trigger,
}: FrequencyPickerProps) {
  const [open, setOpen] = useState(false)
  const [localFrequency, setLocalFrequency] = useState<FrequencyValue[]>(frequency)
  const [localTimezone, setLocalTimezone] = useState(userTimezone)

  // Sync local state when props change
  useEffect(() => {
    setLocalFrequency(frequency)
  }, [frequency])

  useEffect(() => {
    setLocalTimezone(userTimezone)
  }, [userTimezone])

  const handleSave = () => {
    onFrequencyChange(localFrequency)
    if (localTimezone !== userTimezone) {
      onTimezoneChange(localTimezone)
    }
    setOpen(false)
  }

  const handleCancel = () => {
    setLocalFrequency(frequency)
    setLocalTimezone(userTimezone)
    setOpen(false)
  }

  const addFrequency = () => {
    const newEntry: FrequencyValue = {
      weekday: "mon",
      time: "09:00",
      timezone: localTimezone,
    }
    setLocalFrequency([...localFrequency, newEntry])
  }

  const removeFrequency = (index: number) => {
    setLocalFrequency(localFrequency.filter((_, i) => i !== index))
  }

  const updateFrequency = (index: number, updates: Partial<FrequencyValue>) => {
    setLocalFrequency(
      localFrequency.map((f, i) =>
        i === index ? { ...f, ...updates, timezone: localTimezone } : f
      )
    )
  }

  const toggleWeekday = (index: number, weekday: Weekday) => {
    updateFrequency(index, { weekday })
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>{trigger}</PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="flex flex-col">
          {/* Header */}
          <div className="border-b px-4 py-3">
            <h4 className="text-sm font-medium">Schedule</h4>
            <p className="text-xs text-muted-foreground">
              Set when this task should repeat
            </p>
          </div>

          {/* Timezone selector */}
          <div className="border-b px-4 py-3">
            <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
              Timezone
            </label>
            <select
              value={localTimezone}
              onChange={(e) => setLocalTimezone(e.target.value)}
              className={cn(
                "w-full rounded-md border bg-background px-3 py-1.5 text-sm",
                "focus:outline-none focus:ring-2 focus:ring-ring"
              )}
            >
              {/* Add current timezone if not in list */}
              {!TIMEZONE_OPTIONS.includes(localTimezone) && (
                <option value={localTimezone}>{localTimezone}</option>
              )}
              {TIMEZONE_OPTIONS.map((tz) => (
                <option key={tz} value={tz}>
                  {tz.replace(/_/g, " ")}
                </option>
              ))}
            </select>
          </div>

          {/* Frequency entries */}
          <div className="max-h-64 overflow-y-auto px-4 py-3">
            {localFrequency.length === 0 ? (
              <div className="py-4 text-center text-sm text-muted-foreground">
                No schedule set (template mode)
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {localFrequency.map((entry, index) => (
                  <FrequencyEntry
                    key={index}
                    entry={entry}
                    onWeekdayChange={(weekday) => toggleWeekday(index, weekday)}
                    onTimeChange={(time) => updateFrequency(index, { time })}
                    onRemove={() => removeFrequency(index)}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Add frequency button */}
          <div className="border-t px-4 py-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={addFrequency}
              className="w-full justify-start gap-2"
            >
              <Plus className="h-4 w-4" />
              Add schedule
            </Button>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-2 border-t px-4 py-3">
            <Button type="button" variant="ghost" size="sm" onClick={handleCancel}>
              Cancel
            </Button>
            <Button type="button" size="sm" onClick={handleSave}>
              Save
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}

interface FrequencyEntryProps {
  entry: FrequencyValue
  onWeekdayChange: (weekday: Weekday) => void
  onTimeChange: (time: string) => void
  onRemove: () => void
}

function FrequencyEntry({
  entry,
  onWeekdayChange,
  onTimeChange,
  onRemove,
}: FrequencyEntryProps) {
  return (
    <div className="flex flex-col gap-2 rounded-lg border p-2">
      {/* Weekday selector */}
      <div className="flex items-center justify-between">
        <div className="flex gap-0.5">
          {WEEKDAYS.map(({ key, label }) => {
            const isActive = entry.weekday === key
            return (
              <button
                key={key}
                type="button"
                onClick={() => onWeekdayChange(key)}
                className={cn(
                  "flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium transition-colors",
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:bg-muted/80"
                )}
              >
                {label}
              </button>
            )
          })}
        </div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onRemove}
          className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>

      {/* Time input */}
      <div className="flex items-center gap-2">
        <Clock className="h-4 w-4 text-muted-foreground" />
        <Input
          type="time"
          value={entry.time}
          onChange={(e) => onTimeChange(e.target.value)}
          className="h-7 w-auto px-2 text-sm"
        />
      </div>
    </div>
  )
}
```

**Verify**:
- File created at `src/components/tasks/frequency-picker.tsx`
- No TypeScript errors

---

### Step 5: Create recurring-task-item.tsx ✅

**Do**: Create the recurring task row component with day indicator and actions.

**Create** `src/components/tasks/recurring-task-item.tsx`:

```typescript
"use client"

import { useState, useRef, useEffect } from "react"
import { Play, Trash2 } from "lucide-react"
import {
  updateRecurringTaskTitle,
  updateRecurringTaskFrequency,
  deleteRecurringTask,
  insertRecurringTaskNow,
  setUserTimezone,
} from "@/lib/recurring-task-mutations"
import { useUserTimezone } from "@/hooks/use-recurring-tasks"
import { Input } from "@/components/ui/input"
import { FrequencyIndicator } from "./frequency-indicator"
import { FrequencyPicker } from "./frequency-picker"
import { cn } from "@/lib/utils"
import type { RecurringTask, FrequencyValue } from "@/lib/db"

interface RecurringTaskItemProps {
  task: RecurringTask
  themeClass?: string
}

export function RecurringTaskItem({ task, themeClass }: RecurringTaskItemProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [editValue, setEditValue] = useState(task.title)
  const inputRef = useRef<HTMLInputElement>(null)
  const [isHovered, setIsHovered] = useState(false)
  const userTimezone = useUserTimezone()

  // Focus input when entering edit mode
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus()
      inputRef.current.select()
    }
  }, [isEditing])

  // Sync edit value when task changes externally
  useEffect(() => {
    if (!isEditing) {
      setEditValue(task.title)
    }
  }, [task.title, isEditing])

  const handleSave = async () => {
    const trimmed = editValue.trim()
    if (trimmed && trimmed !== task.title) {
      await updateRecurringTaskTitle(task.id, trimmed)
    } else {
      setEditValue(task.title)
    }
    setIsEditing(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSave()
    } else if (e.key === "Escape") {
      setEditValue(task.title)
      setIsEditing(false)
    }
  }

  const handleFrequencyChange = async (frequency: FrequencyValue[]) => {
    await updateRecurringTaskFrequency(task.id, frequency)
  }

  const handleTimezoneChange = async (timezone: string) => {
    await setUserTimezone(timezone)
  }

  const handleInsertNow = async () => {
    await insertRecurringTaskNow(task, false) // false = don't update lastInsertedDate
  }

  const handleDelete = async () => {
    await deleteRecurringTask(task.id)
  }

  return (
    <div
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={cn(
        "group flex min-h-10 items-center gap-2 px-4 py-2",
        "transition-colors hover:bg-muted/50",
        themeClass
      )}
    >
      {/* Frequency indicator */}
      <FrequencyPicker
        frequency={task.frequency}
        userTimezone={userTimezone}
        onFrequencyChange={handleFrequencyChange}
        onTimezoneChange={handleTimezoneChange}
        trigger={<FrequencyIndicator frequency={task.frequency} />}
      />

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
            onClick={() => setIsEditing(true)}
            className={cn(
              "block cursor-text truncate text-sm",
              "-mx-1 rounded px-1 hover:bg-muted"
            )}
          >
            {task.title}
          </span>
        )}
      </div>

      {/* Action buttons */}
      <div
        className={cn(
          "flex items-center gap-0.5 transition-opacity",
          isHovered ? "opacity-100" : "opacity-0"
        )}
      >
        {/* Insert now button */}
        <button
          type="button"
          onClick={handleInsertNow}
          title="Insert into Now"
          className={cn(
            "flex h-7 w-7 items-center justify-center rounded transition-colors",
            "text-muted-foreground hover:bg-secondary hover:text-foreground"
          )}
        >
          <Play className="h-4 w-4" />
        </button>

        {/* Delete button */}
        <button
          type="button"
          onClick={handleDelete}
          title="Delete"
          className={cn(
            "flex h-7 w-7 items-center justify-center rounded transition-colors",
            "text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
          )}
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}
```

**Verify**:
- File created at `src/components/tasks/recurring-task-item.tsx`
- No TypeScript errors

---

### Step 6: Create add-recurring-task-input.tsx ✅

**Do**: Create inline input for adding new recurring tasks.

**Create** `src/components/tasks/add-recurring-task-input.tsx`:

```typescript
"use client"

import { useState, useRef } from "react"
import { Plus } from "lucide-react"
import { createRecurringTask } from "@/lib/recurring-task-mutations"
import { cn } from "@/lib/utils"
import { Input } from "@/components/ui/input"

interface AddRecurringTaskInputProps {
  scopeId: string
}

export function AddRecurringTaskInput({ scopeId }: AddRecurringTaskInputProps) {
  const [isAdding, setIsAdding] = useState(false)
  const [value, setValue] = useState("")
  const inputRef = useRef<HTMLInputElement>(null)

  const handleStartAdding = () => {
    setIsAdding(true)
    // Focus after state update
    setTimeout(() => inputRef.current?.focus(), 0)
  }

  const handleSave = async () => {
    const trimmed = value.trim()
    if (trimmed) {
      await createRecurringTask(trimmed, scopeId)
      setValue("")
      // Keep input focused for rapid entry
      inputRef.current?.focus()
    } else {
      setIsAdding(false)
      setValue("")
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSave()
    } else if (e.key === "Escape") {
      setIsAdding(false)
      setValue("")
    }
  }

  const handleBlur = () => {
    // Small delay to allow Enter key to fire first
    setTimeout(() => {
      if (!value.trim()) {
        setIsAdding(false)
        setValue("")
      }
    }, 100)
  }

  if (!isAdding) {
    return (
      <button
        onClick={handleStartAdding}
        className={cn(
          "flex w-full items-center gap-3 px-4 py-3 text-sm",
          "text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground"
        )}
      >
        <Plus className="h-4 w-4" />
        <span>Add recurring task</span>
      </button>
    )
  }

  return (
    <div className="flex items-center gap-3 px-4 py-2">
      {/* Plus icon to match alignment */}
      <div className="flex shrink-0 items-center justify-center">
        <Plus className="h-4 w-4 text-muted-foreground" />
      </div>

      {/* Input */}
      <Input
        ref={inputRef}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={handleBlur}
        placeholder="Task title..."
        className="h-7 flex-1 px-2 py-1"
      />
    </div>
  )
}
```

**Verify**:
- File created at `src/components/tasks/add-recurring-task-input.tsx`
- No TypeScript errors

---

### Step 7: Create recurring-task-list.tsx ✅

**Do**: Create the main recurring task list component.

**Create** `src/components/tasks/recurring-task-list.tsx`:

```typescript
"use client"

import { useQueryState } from "nuqs"
import { searchParamsParsers } from "@/app/tasks/search-params"
import { useRecurringTasks } from "@/hooks/use-recurring-tasks"
import { useScope } from "@/hooks/use-scopes"
import { RecurringTaskItem } from "./recurring-task-item"
import { AddRecurringTaskInput } from "./add-recurring-task-input"
import { cn } from "@/lib/utils"

export function RecurringTaskList() {
  const [scopeId] = useQueryState("scope", searchParamsParsers.scope)

  // Recurring tasks require a scope - no triage allowed
  // If triage is selected, show a message
  if (scopeId === "triage") {
    return (
      <div className="flex h-full items-center justify-center px-4">
        <p className="text-center text-sm text-muted-foreground">
          Recurring tasks must belong to a Job or Project.
          <br />
          Select a scope from the sidebar.
        </p>
      </div>
    )
  }

  return <RecurringTaskListContent scopeId={scopeId} />
}

function RecurringTaskListContent({ scopeId }: { scopeId: string }) {
  // Get scope info for theme
  const scope = useScope(scopeId)

  // Determine theme class based on scope type
  const themeClass =
    scope?.type === "job"
      ? "theme-gold"
      : scope?.type === "project"
        ? "theme-blue"
        : ""

  // Fetch recurring tasks for this scope
  const tasks = useRecurringTasks(scopeId)

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
      {/* Task list with add input at top */}
      <div className="flex-1 overflow-y-auto">
        {/* Add recurring task input - always at top */}
        <AddRecurringTaskInput scopeId={scopeId} />

        {tasks.length === 0 ? (
          <div className="px-4 py-8 text-center">
            <p className="text-sm text-muted-foreground">No recurring tasks</p>
            <p className="mt-1 text-xs text-muted-foreground/70">
              Add a recurring task to create templates that repeat on schedule
            </p>
          </div>
        ) : (
          <div className="flex flex-col">
            {tasks.map((task) => (
              <RecurringTaskItem key={task.id} task={task} themeClass={themeClass} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
```

**Verify**:
- File created at `src/components/tasks/recurring-task-list.tsx`
- No TypeScript errors

---

### Step 8: Update use-task-scopes.ts for Recurring

**Do**: Modify the hook to properly handle the "recurring" list type - show all non-archived scopes (no Triage).

**Modify** `src/hooks/use-task-scopes.ts`:

Find the `statusForQuery` computation and update:

```typescript
// Map task status for querying
const statusForQuery: TaskStatus | null =
  listType === "now" || listType === "later" || listType === "backlog"
    ? listType
    : listType === "recent"
      ? "done"
      : null // "recurring" has no task status to query
```

Find the `taskData` query and update it to also query recurring task counts when on recurring list:

After the existing taskData query, add a new query for recurring task counts:

```typescript
// Get recurring task counts by scope (only for recurring list)
const recurringData = useLiveQuery(
  async () => {
    if (listType !== "recurring") {
      return { counts: new Map<string, number>() }
    }

    const recurringTasks = await db.recurringTasks.toArray()
    const counts = new Map<string, number>()

    for (const task of recurringTasks) {
      counts.set(task.scopeId, (counts.get(task.scopeId) ?? 0) + 1)
    }

    return { counts }
  },
  [listType]
)
```

Update the `taskScopeData` memo to use recurring counts when appropriate:

In the `hasTasks` helper function:
```typescript
const hasTasks = (scopeId: string): boolean => {
  if (listType === "recurring") {
    return (recurringData?.counts.get(scopeId) ?? 0) > 0
  }
  return (taskData?.counts.get(scopeId) ?? 0) > 0
}
```

Update the `shouldInclude` logic for recurring list to include ALL scopes:
```typescript
const shouldInclude = (scope: Scope): boolean => {
  // For recent list: ONLY show scopes with recent tasks
  if (listType === "recent") {
    return hasTasks(scope.id)
  }
  // For recurring list: show ALL non-archived scopes
  if (listType === "recurring") {
    return true
  }
  // When showAllScopes is true, include all non-archived scopes
  if (showAllScopes) return true
  // Otherwise: include if scheduled OR has tasks in current list
  return isScheduled(scope) || hasTasks(scope.id)
}
```

Update the dependencies array for `useMemo`:
```typescript
}, [scopes, listType, todaySlots, monthSlots, taskData, recurringData, showAllScopes])
```

**Full file replacement recommended** - see Step 8 details in implementation.

**Verify**:
- File updated at `src/hooks/use-task-scopes.ts`
- No TypeScript errors

---

### Step 9: Update tasks/page.tsx

**Do**: Add RecurringTaskList rendering for the recurring tab.

**Modify** `src/app/tasks/page.tsx`:

1. Add import:
```typescript
import { RecurringTaskList } from "@/components/tasks/recurring-task-list"
```

2. Update the content area logic:
```typescript
// Show appropriate list based on type
const isActiveList = ["now", "later", "backlog"].includes(listType)
const isRecentList = listType === "recent"
const isRecurringList = listType === "recurring"
```

3. Update the render:
```typescript
{/* Content area */}
<div className="flex-1 overflow-hidden">
  {isActiveList ? (
    <TaskList />
  ) : isRecentList ? (
    <RecentTaskList />
  ) : isRecurringList ? (
    <RecurringTaskList />
  ) : (
    <TaskContentPlaceholder />
  )}
</div>
```

**Verify**:
- File updated
- No TypeScript errors

---

### Step 10: Update ScopeList for Recurring Tab

**Do**: Ensure scope list doesn't show Triage when on Recurring tab.

**Modify** `src/components/tasks/scope-list.tsx`:

Find the `showTriage` logic and update:
```typescript
// Show Triage in Now/Later/Backlog only (not Recurring or Recent)
const showTriage = ["now", "later", "backlog"].includes(activeListType)
```

This should already be correct based on implementation 012, but verify.

**Verify**:
- Logic confirmed in `src/components/tasks/scope-list.tsx`
