# Task Display & CRUD

| Field            | Value        |
| ---------------- | ------------ |
| **ID**           | 010          |
| **Status**       | 🔵 Ready     |
| **Progress**     | —            |
| **Created**      | 2026-01-05   |
| **Last Updated** | 2026-01-05   |

---

## Overview

Build the task list component for the Tasks page, enabling users to view tasks by scope and status,
create new tasks via inline input, and edit task titles inline. This is the core task interaction
layer for Now / Later / Backlog lists.

---

## References

Read these before implementing:

| Topic                  | Source                                 |
| ---------------------- | -------------------------------------- |
| Tasks page design      | `dev/specs/prd.md` §4.1                |
| Task data model        | `dev/specs/prd.md` §3                  |
| Task schema (Dexie)    | `dev/specs/trd.md` §4.1                |
| Adding task visual     | `dev/specs/visuals/tasklist-adding.png`|
| Existing tasks page    | `src/app/tasks/page.tsx`               |
| URL state (nuqs)       | `src/app/tasks/search-params.ts`       |

---

## Scope

### In Scope

- **Task List Component**: Display tasks for the selected scope and list type (now/later/backlog)
- **Triage Support**: Show tasks with `scopeId: null` when Triage is selected
- **Add Task Input**: Inline input at bottom of task list to create new tasks
- **Edit Task Title**: Click-to-edit inline title editing (same pattern as scope titles)
- **Empty State**: "No tasks" message when list is empty
- **Task Ordering**: Newest tasks appear at top (sorted by `createdAt` descending)

### Out of Scope

- Recurring & Recent list types (placeholder remains)
- Task actions (✓ done, → forward, ← back, × delete)
- `pendingAction` batch save system
- Drag-and-drop reordering
- Expandable notes / rich text content
- Activity indicator dots on tabs/scopes
- Unfocused scope warning UI
- Task metadata display (created at, moved from)

---

## Dependencies

- ✅ 002 Database Schema (`tasks` table exists)
- ✅ 009 Tasks Page Layout (tabs, scope selector, URL state)

---

## Files Created

Files this implementation will create or modify:

- [ ] `src/lib/task-mutations.ts` — Create: `createTask`, `updateTaskTitle` functions
- [ ] `src/hooks/use-tasks.ts` — Create: `useTasks` hook for fetching tasks
- [ ] `src/components/tasks/task-item.tsx` — Create: Task row with inline title editing
- [ ] `src/components/tasks/add-task-input.tsx` — Create: Inline input for adding tasks
- [ ] `src/components/tasks/task-list.tsx` — Create: Main task list component
- [ ] `src/app/tasks/page.tsx` — Modify: Use TaskList for now/later/backlog

---

## Implementation Plan

### Step 1: Create task-mutations.ts

**Do**: Create database mutation functions for creating and updating tasks.

**Create** `src/lib/task-mutations.ts`:

```typescript
import { db, type TaskStatus } from "@/lib/db"

/**
 * Create a new task in a specific scope and status
 */
export async function createTask(
  title: string,
  scopeId: string | null,
  status: TaskStatus
): Promise<string> {
  const id = crypto.randomUUID()
  const now = Date.now()

  await db.tasks.add({
    id,
    scopeId,
    title: title.trim(),
    status,
    insertedAt: now,
    insertedFrom: status,
    createdAt: now,
  })

  return id
}

/**
 * Update a task's title
 */
export async function updateTaskTitle(taskId: string, title: string): Promise<void> {
  await db.tasks.update(taskId, { title: title.trim() })
}
```

**Verify**:
- File created at `src/lib/task-mutations.ts`
- No TypeScript errors: `pnpm tsc --noEmit`

---

### Step 2: Create use-tasks.ts hook

**Do**: Create a Dexie live query hook for fetching tasks by scope and status.

**Create** `src/hooks/use-tasks.ts`:

```typescript
import { useLiveQuery } from "dexie-react-hooks"
import { db, type Task, type TaskStatus } from "@/lib/db"

/**
 * Get tasks for a specific scope and status, sorted by createdAt descending (newest first)
 *
 * @param scopeId - The scope ID, or "triage" for tasks with null scopeId
 * @param status - The task status (now, later, backlog)
 */
export function useTasks(
  scopeId: string | "triage",
  status: TaskStatus
): Task[] | undefined {
  return useLiveQuery(async () => {
    const actualScopeId = scopeId === "triage" ? null : scopeId

    const tasks = await db.tasks
      .where("status")
      .equals(status)
      .filter((task) => task.scopeId === actualScopeId)
      .toArray()

    // Sort by createdAt descending (newest first)
    return tasks.sort((a, b) => b.createdAt - a.createdAt)
  }, [scopeId, status])
}
```

**Verify**:
- File created at `src/hooks/use-tasks.ts`
- No TypeScript errors

---

### Step 3: Create task-item.tsx

**Do**: Create the task item component with inline title editing.

**Create** `src/components/tasks/task-item.tsx`:

```typescript
"use client"

import { useState, useRef, useEffect } from "react"
import { updateTaskTitle } from "@/lib/task-mutations"
import { cn } from "@/lib/utils"
import { Input } from "@/components/ui/input"
import type { Task } from "@/lib/db"

interface TaskItemProps {
  task: Task
}

export function TaskItem({ task }: TaskItemProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [editValue, setEditValue] = useState(task.title)
  const inputRef = useRef<HTMLInputElement>(null)

  // Sync edit value when task changes externally
  useEffect(() => {
    if (!isEditing) {
      setEditValue(task.title)
    }
  }, [task.title, isEditing])

  // Focus input when entering edit mode
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus()
      inputRef.current.select()
    }
  }, [isEditing])

  const handleSave = async () => {
    const trimmed = editValue.trim()
    if (trimmed && trimmed !== task.title) {
      await updateTaskTitle(task.id, trimmed)
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

  return (
    <div
      className={cn(
        "group flex min-h-10 items-center gap-3 border-b px-4 py-2",
        "transition-colors hover:bg-muted/50"
      )}
    >
      {/* Checkbox placeholder - for future task actions */}
      <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded border border-muted-foreground/30">
        {/* Empty for now - will be action trigger later */}
      </div>

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

      {/* Action buttons placeholder - for future implementation */}
      {/* Will contain: done, forward, back, delete buttons */}
    </div>
  )
}
```

**Verify**:
- File created at `src/components/tasks/task-item.tsx`
- No TypeScript errors

---

### Step 4: Create add-task-input.tsx

**Do**: Create the inline input component for adding new tasks.

**Create** `src/components/tasks/add-task-input.tsx`:

```typescript
"use client"

import { useState, useRef } from "react"
import { Plus } from "lucide-react"
import { createTask } from "@/lib/task-mutations"
import { cn } from "@/lib/utils"
import { Input } from "@/components/ui/input"
import type { TaskStatus } from "@/lib/db"

interface AddTaskInputProps {
  scopeId: string | null
  status: TaskStatus
}

export function AddTaskInput({ scopeId, status }: AddTaskInputProps) {
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
      await createTask(trimmed, scopeId, status)
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
        <span>Add task</span>
      </button>
    )
  }

  return (
    <div className="flex items-center gap-3 px-4 py-2">
      {/* Checkbox placeholder to match TaskItem alignment */}
      <div className="flex h-5 w-5 shrink-0 items-center justify-center">
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
- File created at `src/components/tasks/add-task-input.tsx`
- No TypeScript errors

---

### Step 5: Create task-list.tsx

**Do**: Create the main task list component that combines tasks display with add input.

**Create** `src/components/tasks/task-list.tsx`:

```typescript
"use client"

import { useQueryState } from "nuqs"
import { searchParamsParsers } from "@/app/tasks/search-params"
import { useTasks } from "@/hooks/use-tasks"
import { useScopes } from "@/hooks/use-scopes"
import { TaskItem } from "./task-item"
import { AddTaskInput } from "./add-task-input"
import type { TaskStatus } from "@/lib/db"

export function TaskList() {
  const [listType] = useQueryState("list", searchParamsParsers.list)
  const [scopeId] = useQueryState("scope", searchParamsParsers.scope)

  // Only render for now/later/backlog
  const isActiveList = ["now", "later", "backlog"].includes(listType)

  // Get scope info for display
  const scopes = useScopes()
  const scopeName =
    scopeId === "triage"
      ? "Triage"
      : scopes?.find((s) => s.id === scopeId)?.title || "Unknown Scope"

  // Fetch tasks for this scope and status
  const tasks = useTasks(scopeId, listType as TaskStatus)

  // Loading state
  if (tasks === undefined) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-sm text-muted-foreground">Loading tasks...</p>
      </div>
    )
  }

  // Determine actual scopeId for creating tasks (null for triage)
  const actualScopeId = scopeId === "triage" ? null : scopeId

  return (
    <div className="flex h-full flex-col">
      {/* Scope header */}
      <div className="border-b px-4 py-3">
        <h2 className="text-sm font-medium">{scopeName}</h2>
      </div>

      {/* Task list */}
      <div className="flex-1 overflow-y-auto">
        {tasks.length === 0 ? (
          <div className="px-4 py-8 text-center">
            <p className="text-sm text-muted-foreground">No tasks</p>
          </div>
        ) : (
          <div className="flex flex-col">
            {tasks.map((task) => (
              <TaskItem key={task.id} task={task} />
            ))}
          </div>
        )}

        {/* Add task input */}
        {isActiveList && (
          <AddTaskInput scopeId={actualScopeId} status={listType as TaskStatus} />
        )}
      </div>
    </div>
  )
}
```

**Verify**:
- File created at `src/components/tasks/task-list.tsx`
- No TypeScript errors

---

### Step 6: Update tasks/page.tsx

**Do**: Replace the placeholder with TaskList for active list types, keep placeholder for recurring/recent.

**Modify** `src/app/tasks/page.tsx`:

Replace the entire file:

```typescript
"use client"

import { useQueryState } from "nuqs"
import { searchParamsParsers } from "@/app/tasks/search-params"
import { ContentPanel } from "@/components/layout/content-panel"
import { TaskListTabs } from "@/components/tasks/task-list-tabs"
import { ScopeList } from "@/components/tasks/scope-list"
import { ScopeSelector } from "@/components/tasks/scope-selector"
import { TaskList } from "@/components/tasks/task-list"
import { TaskContentPlaceholder } from "@/components/tasks/task-content-placeholder"
import { useIsMobile } from "@/hooks/use-media-query"

export default function TasksPage() {
  const isMobile = useIsMobile()
  const [listType] = useQueryState("list", searchParamsParsers.list)

  // Show TaskList for now/later/backlog, placeholder for recurring/recent
  const isActiveList = ["now", "later", "backlog"].includes(listType)

  return (
    <ContentPanel>
      <div className="flex h-full flex-col overflow-hidden">
        {/* Tabs (horizontal navigation) */}
        <TaskListTabs />

        {/* Two-column layout: Scope selector + Content */}
        <div className="flex flex-1 overflow-hidden">
          {/* Left: Scope selector sidebar (desktop) */}
          {!isMobile && (
            <aside className="w-64 shrink-0 overflow-y-auto border-r">
              <ScopeList />
            </aside>
          )}

          {/* Right: Main content area */}
          <main className="flex flex-1 flex-col overflow-hidden">
            {/* Mobile: Scope selector dropdown */}
            {isMobile && (
              <div className="border-b p-3">
                <ScopeSelector />
              </div>
            )}

            {/* Content area */}
            <div className="flex-1 overflow-hidden">
              {isActiveList ? <TaskList /> : <TaskContentPlaceholder />}
            </div>
          </main>
        </div>
      </div>
    </ContentPanel>
  )
}
```

**Verify**:
- File updated
- No TypeScript errors

---

### Step 7: Verify Build

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

### Step 8: Visual Verification

**Do**: Test in browser.

**Commands**:

```bash
pnpm dev
```

**Checklist**:

1. **Task Display**:
   - [ ] Navigate to Tasks page → Now tab
   - [ ] Select a scope from sidebar
   - [ ] Tasks for that scope/status are displayed (or empty state)
   - [ ] Select Triage → shows tasks with null scopeId

2. **Add Task**:
   - [ ] Click "+ Add task" button at bottom
   - [ ] Input field appears
   - [ ] Type title, press Enter → task created
   - [ ] New task appears at TOP of list
   - [ ] Input stays focused for rapid entry
   - [ ] Press Escape → input closes without saving
   - [ ] Click away with empty input → closes

3. **Edit Task Title**:
   - [ ] Click on task title → enters edit mode
   - [ ] Edit title, press Enter → saves
   - [ ] Press Escape → reverts changes
   - [ ] Click away → saves

4. **List Type Switching**:
   - [ ] Switch to Later tab → shows Later tasks for scope
   - [ ] Switch to Backlog tab → shows Backlog tasks for scope
   - [ ] Switch to Recurring → shows placeholder
   - [ ] Switch to Recent → shows placeholder

5. **Scope Switching**:
   - [ ] Click different scope in sidebar → tasks update
   - [ ] URL updates with new scope
   - [ ] Triage shows its own tasks

6. **Empty State**:
   - [ ] Scope with no tasks shows "No tasks" message
   - [ ] Add task input still visible below

7. **Data Persistence**:
   - [ ] Refresh page → tasks persist
   - [ ] Check IndexedDB → tasks table has records

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

- [ ] Tasks page shows task list for selected scope/status
- [ ] Can add new tasks via inline input
- [ ] Can edit task titles inline
- [ ] New tasks appear at top of list
- [ ] Triage works (tasks with null scopeId)
- [ ] Recurring/Recent tabs show placeholder
- [ ] Tasks persist in IndexedDB
- [ ] No console errors
