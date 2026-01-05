# Task Drag and Drop

| Field            | Value        |
| ---------------- | ------------ |
| **ID**           | 014          |
| **Status**       | 🔵 Ready     |
| **Progress**     | —            |
| **Created**      | 2026-01-05   |
| **Last Updated** | 2026-01-05   |

---

## Overview

Add drag-and-drop functionality for tasks: reordering within a list (priority) and moving tasks between scopes. This requires first refactoring to add a `Tasklist` entity that maintains task order via `taskIds[]` arrays, then implementing the drag-and-drop UI.

---

## References

Read these before implementing:

| Topic                    | Source                                    |
| ------------------------ | ----------------------------------------- |
| Task lifecycle           | `dev/specs/prd.md` §2.2                   |
| Tasklist concept (PRD)   | `dev/specs/prd.md` §3                     |
| Current DB schema        | `src/lib/db.ts`                           |
| Task mutations           | `src/lib/task-mutations.ts`               |
| Recurring task mutations | `src/lib/recurring-task-mutations.ts`     |
| Task hooks               | `src/hooks/use-tasks.ts`                  |
| Recurring task hooks     | `src/hooks/use-recurring-tasks.ts`        |
| Task list component      | `src/components/tasks/task-list.tsx`      |
| Task item component      | `src/components/tasks/task-item.tsx`      |
| Recurring task list      | `src/components/tasks/recurring-task-list.tsx` |
| Recurring task item      | `src/components/tasks/recurring-task-item.tsx` |

---

## Scope

### In Scope

**Part 1: Tasklist Entity Refactor**
- Add `Tasklist` interface and table to database schema
- Create helper function to derive tasklist ID from `scopeId` + `type`
- Update all task mutations to maintain `taskIds[]` ordering
- Update all recurring task mutations to maintain `taskIds[]` ordering
- Update hooks to fetch tasks in tasklist order
- Add migration logic to create initial tasklists from existing tasks

**Part 2: Drag and Drop**
- Install `@dnd-kit` library (modern, accessible, React 19 compatible)
- Implement drag-to-reorder within a task list
- Implement drag-to-change-scope (drop on scope in sidebar)
- Apply to: Now, Later, Backlog lists (regular tasks)
- Apply to: Recurring list (recurring tasks)
- Preserve order when batch moving tasks (e.g., "move to later")

### Out of Scope

- Drag-and-drop for Recent (done) tasks — read-only list
- Drag INTO Triage (only OUT of Triage is allowed per PRD)
- Cross-status drag (e.g., drag from Now to Later) — use action buttons
- Touch/mobile drag — future enhancement
- Keyboard reordering — future enhancement

---

## Dependencies

- ✅ 010 Task Display & CRUD
- ✅ 011 Task Actioning
- ✅ 013 Recurring Tasks Foundation

---

## Files Created/Modified

### Part 1: Tasklist Refactor

- [ ] `src/lib/db.ts` — Add Tasklist interface, update schema to v2
- [ ] `src/lib/tasklist-helpers.ts` — Create: ID derivation, CRUD helpers
- [ ] `src/lib/task-mutations.ts` — Update all mutations to maintain tasklists
- [ ] `src/lib/recurring-task-mutations.ts` — Update all mutations to maintain tasklists
- [ ] `src/hooks/use-tasks.ts` — Fetch in tasklist order
- [ ] `src/hooks/use-recurring-tasks.ts` — Fetch in tasklist order

### Part 2: Drag and Drop

- [ ] `package.json` — Add @dnd-kit dependencies
- [ ] `src/components/tasks/draggable-task-list.tsx` — Create: DnD wrapper for task lists
- [ ] `src/components/tasks/draggable-task-item.tsx` — Create: Draggable task row
- [ ] `src/components/tasks/draggable-recurring-task-item.tsx` — Create: Draggable recurring task row
- [ ] `src/components/tasks/task-list.tsx` — Integrate draggable components
- [ ] `src/components/tasks/recurring-task-list.tsx` — Integrate draggable components
- [ ] `src/components/tasks/scope-list.tsx` — Add drop targets for scope change

---

## Implementation Plan

### Step 1: Update Database Schema

**Do**: Add Tasklist interface and update Dexie schema to version 2.

**Modify** `src/lib/db.ts`:

1. Add the Tasklist interface after RecurringTask:

```typescript
export interface Tasklist {
  id: string              // Derived: `${scopeId ?? 'triage'}:${type}`
  scopeId: string | null  // null = Triage
  type: TasklistType      // 'now' | 'later' | 'backlog' | 'done' | 'recurring'
  taskIds: string[]       // Ordered array of task/recurring-task IDs
}
```

2. Add the tasklists table to the class:

```typescript
class BackboardDB extends Dexie {
  tasks!: Table<Task>
  recurringTasks!: Table<RecurringTask>
  tasklists!: Table<Tasklist>  // ADD THIS
  scopes!: Table<Scope>
  // ... rest unchanged
```

3. Update the schema version:

```typescript
this.version(1).stores({
  tasks: "id, scopeId, status, createdAt, completedAt",
  recurringTasks: "id, scopeId",
  scopes: "id, type, archivedAt",
  scheduleSlots: "id, date, scopeId, [date+scopeId]",
  monthSlots: "id, month, projectId, [month+projectId]",
  defaultScheduleSlots: "id, weekday, jobId, [weekday+jobId]",
  appMeta: "id",
})

this.version(2).stores({
  tasks: "id, scopeId, status, createdAt, completedAt",
  recurringTasks: "id, scopeId",
  tasklists: "id, scopeId, type",  // ADD THIS
  scopes: "id, type, archivedAt",
  scheduleSlots: "id, date, scopeId, [date+scopeId]",
  monthSlots: "id, month, projectId, [month+projectId]",
  defaultScheduleSlots: "id, weekday, jobId, [weekday+jobId]",
  appMeta: "id",
}).upgrade(async tx => {
  // Migration: create tasklists from existing tasks
  const tasks = await tx.table('tasks').toArray()
  const recurringTasks = await tx.table('recurringTasks').toArray()
  
  // Group tasks by scopeId + status
  const tasklistMap = new Map<string, { scopeId: string | null, type: string, taskIds: string[] }>()
  
  for (const task of tasks) {
    const id = `${task.scopeId ?? 'triage'}:${task.status}`
    if (!tasklistMap.has(id)) {
      tasklistMap.set(id, { scopeId: task.scopeId, type: task.status, taskIds: [] })
    }
    // Add to end (we'll sort by createdAt desc after)
    tasklistMap.get(id)!.taskIds.push(task.id)
  }
  
  // Group recurring tasks by scopeId
  for (const task of recurringTasks) {
    const id = `${task.scopeId}:recurring`
    if (!tasklistMap.has(id)) {
      tasklistMap.set(id, { scopeId: task.scopeId, type: 'recurring', taskIds: [] })
    }
    tasklistMap.get(id)!.taskIds.push(task.id)
  }
  
  // Sort each tasklist by createdAt descending (to match current behavior)
  const allTasks = [...tasks, ...recurringTasks]
  const taskCreatedAt = new Map(allTasks.map(t => [t.id, t.createdAt]))
  
  for (const [id, data] of tasklistMap) {
    data.taskIds.sort((a, b) => (taskCreatedAt.get(b) ?? 0) - (taskCreatedAt.get(a) ?? 0))
    await tx.table('tasklists').add({ id, ...data })
  }
})
```

**Verify**:
- Run `pnpm dev` — app should start without errors
- Check browser DevTools → Application → IndexedDB → backboard → tasklists table exists
- Existing tasks should still display (migration runs automatically)

---

### Step 2: Create Tasklist Helper Functions

**Do**: Create helper functions for tasklist operations.

**Create** `src/lib/tasklist-helpers.ts`:

```typescript
import { db, type TasklistType } from "@/lib/db"

/**
 * Derive tasklist ID from scopeId and type
 */
export function getTasklistId(scopeId: string | null, type: TasklistType): string {
  return `${scopeId ?? "triage"}:${type}`
}

/**
 * Get or create a tasklist
 */
export async function getOrCreateTasklist(
  scopeId: string | null,
  type: TasklistType
): Promise<string[]> {
  const id = getTasklistId(scopeId, type)
  const existing = await db.tasklists.get(id)
  
  if (existing) {
    return existing.taskIds
  }
  
  // Create empty tasklist
  await db.tasklists.add({
    id,
    scopeId,
    type,
    taskIds: [],
  })
  
  return []
}

/**
 * Prepend a task ID to a tasklist (adds to top)
 */
export async function prependToTasklist(
  scopeId: string | null,
  type: TasklistType,
  taskId: string
): Promise<void> {
  const id = getTasklistId(scopeId, type)
  const tasklist = await db.tasklists.get(id)
  
  if (tasklist) {
    await db.tasklists.update(id, {
      taskIds: [taskId, ...tasklist.taskIds.filter(id => id !== taskId)],
    })
  } else {
    await db.tasklists.add({
      id,
      scopeId,
      type,
      taskIds: [taskId],
    })
  }
}

/**
 * Prepend multiple task IDs to a tasklist (adds to top, preserving their relative order)
 */
export async function prependManyToTasklist(
  scopeId: string | null,
  type: TasklistType,
  taskIds: string[]
): Promise<void> {
  if (taskIds.length === 0) return
  
  const id = getTasklistId(scopeId, type)
  const tasklist = await db.tasklists.get(id)
  
  const taskIdSet = new Set(taskIds)
  
  if (tasklist) {
    // Remove these IDs from current list, then prepend
    const filtered = tasklist.taskIds.filter(id => !taskIdSet.has(id))
    await db.tasklists.update(id, {
      taskIds: [...taskIds, ...filtered],
    })
  } else {
    await db.tasklists.add({
      id,
      scopeId,
      type,
      taskIds,
    })
  }
}

/**
 * Remove a task ID from a tasklist
 */
export async function removeFromTasklist(
  scopeId: string | null,
  type: TasklistType,
  taskId: string
): Promise<void> {
  const id = getTasklistId(scopeId, type)
  const tasklist = await db.tasklists.get(id)
  
  if (tasklist) {
    await db.tasklists.update(id, {
      taskIds: tasklist.taskIds.filter(id => id !== taskId),
    })
  }
}

/**
 * Remove multiple task IDs from a tasklist
 */
export async function removeManyFromTasklist(
  scopeId: string | null,
  type: TasklistType,
  taskIds: string[]
): Promise<void> {
  if (taskIds.length === 0) return
  
  const id = getTasklistId(scopeId, type)
  const tasklist = await db.tasklists.get(id)
  
  if (tasklist) {
    const taskIdSet = new Set(taskIds)
    await db.tasklists.update(id, {
      taskIds: tasklist.taskIds.filter(id => !taskIdSet.has(id)),
    })
  }
}

/**
 * Reorder tasks within a tasklist
 */
export async function reorderTasklist(
  scopeId: string | null,
  type: TasklistType,
  taskIds: string[]
): Promise<void> {
  const id = getTasklistId(scopeId, type)
  await db.tasklists.update(id, { taskIds })
}

/**
 * Move a task from one tasklist to another
 * Removes from source, prepends to destination
 */
export async function moveTaskBetweenLists(
  taskId: string,
  fromScopeId: string | null,
  fromType: TasklistType,
  toScopeId: string | null,
  toType: TasklistType
): Promise<void> {
  await removeFromTasklist(fromScopeId, fromType, taskId)
  await prependToTasklist(toScopeId, toType, taskId)
}

/**
 * Get ordered task IDs for a tasklist
 */
export async function getTasklistOrder(
  scopeId: string | null,
  type: TasklistType
): Promise<string[]> {
  const id = getTasklistId(scopeId, type)
  const tasklist = await db.tasklists.get(id)
  return tasklist?.taskIds ?? []
}
```

**Verify**:
- File created at `src/lib/tasklist-helpers.ts`
- No TypeScript errors: `pnpm tsc --noEmit`

---

### Step 3: Update Task Mutations

**Do**: Update task mutations to maintain tasklist ordering.

**Modify** `src/lib/task-mutations.ts`:

1. Add import at top:
```typescript
import {
  prependToTasklist,
  prependManyToTasklist,
  removeFromTasklist,
  removeManyFromTasklist,
  moveTaskBetweenLists,
} from "./tasklist-helpers"
```

2. Update `createTask`:
```typescript
export async function createTask(
  title: string,
  scopeId: string | null,
  status: TaskStatus
): Promise<string> {
  const id = crypto.randomUUID()
  const now = Date.now()

  await db.transaction("rw", [db.tasks, db.tasklists], async () => {
    await db.tasks.add({
      id,
      scopeId,
      title: title.trim(),
      status,
      insertedAt: now,
      insertedFrom: status,
      createdAt: now,
    })
    
    // Add to tasklist (at top)
    await prependToTasklist(scopeId, status, id)
  })

  return id
}
```

3. Update `commitPendingActions`:
```typescript
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
  
  // Group tasks by their pending action for batch operations
  const toDelete: string[] = []
  const toMove: Map<TaskStatus, string[]> = new Map()
  
  for (const task of tasks) {
    if (task.pendingAction === "delete") {
      toDelete.push(task.id)
    } else if (task.pendingAction) {
      const targetStatus = task.pendingAction
      if (!toMove.has(targetStatus)) {
        toMove.set(targetStatus, [])
      }
      toMove.get(targetStatus)!.push(task.id)
    }
  }

  await db.transaction("rw", [db.tasks, db.tasklists], async () => {
    // Handle deletes
    for (const taskId of toDelete) {
      await db.tasks.delete(taskId)
    }
    if (toDelete.length > 0) {
      await removeManyFromTasklist(scopeId, currentStatus, toDelete)
    }
    
    // Handle moves (preserving order within each destination)
    for (const [targetStatus, taskIds] of toMove) {
      for (const taskId of taskIds) {
        const task = tasks.find(t => t.id === taskId)!
        const updates: Partial<typeof task> = {
          status: targetStatus,
          pendingAction: null,
          insertedAt: now,
          insertedFrom: currentStatus,
        }
        if (targetStatus === "done") {
          updates.completedAt = now
        }
        await db.tasks.update(taskId, updates)
      }
      
      // Remove from source, add to destination (preserving relative order)
      await removeManyFromTasklist(scopeId, currentStatus, taskIds)
      await prependManyToTasklist(scopeId, targetStatus, taskIds)
    }
  })
}
```

4. Update `moveAllToLater`:
```typescript
export async function moveAllToLater(scopeId: string | null): Promise<void> {
  const tasks = await db.tasks
    .where("status")
    .equals("now")
    .filter((t) => t.scopeId === scopeId)
    .toArray()

  if (tasks.length === 0) return

  const now = Date.now()
  const taskIds = tasks.map(t => t.id)

  await db.transaction("rw", [db.tasks, db.tasklists], async () => {
    for (const task of tasks) {
      await db.tasks.update(task.id, {
        status: "later",
        pendingAction: null,
        insertedAt: now,
        insertedFrom: "now",
      })
    }
    
    // Move all from now to later, preserving order
    await removeManyFromTasklist(scopeId, "now", taskIds)
    await prependManyToTasklist(scopeId, "later", taskIds)
  })
}
```

5. Add new function for changing task scope:
```typescript
/**
 * Change a task's scope (move to different Job/Project)
 */
export async function changeTaskScope(
  taskId: string,
  newScopeId: string | null
): Promise<void> {
  const task = await db.tasks.get(taskId)
  if (!task) return
  if (task.scopeId === newScopeId) return // No change

  await db.transaction("rw", [db.tasks, db.tasklists], async () => {
    // Update task
    await db.tasks.update(taskId, { scopeId: newScopeId })
    
    // Move between tasklists
    await moveTaskBetweenLists(
      taskId,
      task.scopeId,
      task.status,
      newScopeId,
      task.status
    )
  })
}
```

**Verify**:
- No TypeScript errors
- Create a task → check tasklist in IndexedDB contains the task ID
- Commit pending actions → task IDs move between tasklists

---

### Step 4: Update Recurring Task Mutations

**Do**: Update recurring task mutations to maintain tasklist ordering.

**Modify** `src/lib/recurring-task-mutations.ts`:

1. Add import at top:
```typescript
import {
  prependToTasklist,
  removeFromTasklist,
  moveTaskBetweenLists,
} from "./tasklist-helpers"
```

2. Update `createRecurringTask`:
```typescript
export async function createRecurringTask(
  title: string,
  scopeId: string
): Promise<string> {
  const id = crypto.randomUUID()
  const now = Date.now()

  await db.transaction("rw", [db.recurringTasks, db.tasklists], async () => {
    await db.recurringTasks.add({
      id,
      scopeId,
      title: title.trim(),
      frequency: [],
      createdAt: now,
    })
    
    await prependToTasklist(scopeId, "recurring", id)
  })

  return id
}
```

3. Update `deleteRecurringTask`:
```typescript
export async function deleteRecurringTask(taskId: string): Promise<void> {
  const task = await db.recurringTasks.get(taskId)
  if (!task) return

  await db.transaction("rw", [db.recurringTasks, db.tasklists], async () => {
    await db.recurringTasks.delete(taskId)
    await removeFromTasklist(task.scopeId, "recurring", taskId)
  })
}
```

4. Update `commitRecurringTaskPendingActions`:
```typescript
export async function commitRecurringTaskPendingActions(scopeId: string): Promise<void> {
  const tasks = await db.recurringTasks
    .where("scopeId")
    .equals(scopeId)
    .filter((t) => t.pendingAction != null)
    .toArray()

  const now = Date.now()
  const toDelete: string[] = []
  const toInsert: RecurringTask[] = []

  for (const task of tasks) {
    if (task.pendingAction === "delete") {
      toDelete.push(task.id)
    } else if (task.pendingAction === "insert") {
      toInsert.push(task)
    }
  }

  await db.transaction("rw", [db.tasks, db.recurringTasks, db.tasklists], async () => {
    // Handle deletes
    for (const taskId of toDelete) {
      await db.recurringTasks.delete(taskId)
    }
    if (toDelete.length > 0) {
      // Remove from recurring tasklist
      for (const taskId of toDelete) {
        await removeFromTasklist(scopeId, "recurring", taskId)
      }
    }

    // Handle inserts
    for (const recurringTask of toInsert) {
      const newTaskId = crypto.randomUUID()
      await db.tasks.add({
        id: newTaskId,
        scopeId: recurringTask.scopeId,
        title: recurringTask.title,
        content: recurringTask.content,
        status: "now",
        insertedAt: now,
        insertedFrom: "recurring",
        createdAt: now,
      })
      
      // Add to "now" tasklist
      await prependToTasklist(recurringTask.scopeId, "now", newTaskId)
      
      // Clear pending action
      await db.recurringTasks.update(recurringTask.id, { pendingAction: null })
    }
  })
}
```

5. Update `insertRecurringTaskNow`:
```typescript
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

    // Update lastInsertedDate if requested (for sync job)
    if (updateLastInserted) {
      const today = new Date().toISOString().split("T")[0] // YYYY-MM-DD
      await db.recurringTasks.update(recurringTask.id, { lastInsertedDate: today })
    }
  })

  return id
}
```

6. Add function for changing recurring task scope:
```typescript
/**
 * Change a recurring task's scope
 */
export async function changeRecurringTaskScope(
  taskId: string,
  newScopeId: string
): Promise<void> {
  const task = await db.recurringTasks.get(taskId)
  if (!task) return
  if (task.scopeId === newScopeId) return

  await db.transaction("rw", [db.recurringTasks, db.tasklists], async () => {
    await db.recurringTasks.update(taskId, { scopeId: newScopeId })
    await moveTaskBetweenLists(
      taskId,
      task.scopeId,
      "recurring",
      newScopeId,
      "recurring"
    )
  })
}
```

**Verify**:
- No TypeScript errors
- Create recurring task → check tasklist contains the ID
- Delete recurring task → ID removed from tasklist

---

### Step 5: Update Task Hooks

**Do**: Update hooks to fetch tasks in tasklist order.

**Modify** `src/hooks/use-tasks.ts`:

```typescript
import { useLiveQuery } from "dexie-react-hooks"
import { db, type Task, type TaskStatus } from "@/lib/db"
import { getTasklistId } from "@/lib/tasklist-helpers"

/**
 * Get tasks for a specific scope and status, in tasklist order
 */
export function useTasks(scopeId: string | "triage", status: TaskStatus): Task[] | undefined {
  return useLiveQuery(async () => {
    const actualScopeId = scopeId === "triage" ? null : scopeId
    const tasklistId = getTasklistId(actualScopeId, status)
    
    // Get tasklist for ordering
    const tasklist = await db.tasklists.get(tasklistId)
    const orderedIds = tasklist?.taskIds ?? []
    
    // Get all tasks for this scope+status
    const tasks = await db.tasks
      .where("status")
      .equals(status)
      .filter((task) => task.scopeId === actualScopeId)
      .toArray()
    
    // Create lookup map
    const taskMap = new Map(tasks.map(t => [t.id, t]))
    
    // Return tasks in tasklist order
    // Include any tasks not in tasklist at the end (safety net)
    const orderedTasks: Task[] = []
    const seenIds = new Set<string>()
    
    for (const id of orderedIds) {
      const task = taskMap.get(id)
      if (task) {
        orderedTasks.push(task)
        seenIds.add(id)
      }
    }
    
    // Add any orphaned tasks at the end (sorted by createdAt desc)
    const orphanedTasks = tasks
      .filter(t => !seenIds.has(t.id))
      .sort((a, b) => b.createdAt - a.createdAt)
    
    return [...orderedTasks, ...orphanedTasks]
  }, [scopeId, status])
}

// ... rest of the hooks unchanged (usePendingActionCount, useIsScopeScheduledToday, useRecentTasks)
```

**Verify**:
- Tasks display in correct order
- No TypeScript errors

---

### Step 6: Update Recurring Task Hooks

**Do**: Update recurring task hooks to fetch in tasklist order.

**Modify** `src/hooks/use-recurring-tasks.ts`:

Update the `useRecurringTasks` function:

```typescript
import { useLiveQuery } from "dexie-react-hooks"
import { db, type RecurringTask } from "@/lib/db"
import { getTasklistId } from "@/lib/tasklist-helpers"

/**
 * Get all recurring tasks for a specific scope, in tasklist order
 */
export function useRecurringTasks(scopeId: string): RecurringTask[] | undefined {
  return useLiveQuery(async () => {
    const tasklistId = getTasklistId(scopeId, "recurring")
    
    // Get tasklist for ordering
    const tasklist = await db.tasklists.get(tasklistId)
    const orderedIds = tasklist?.taskIds ?? []
    
    // Get all recurring tasks for this scope
    const tasks = await db.recurringTasks
      .where("scopeId")
      .equals(scopeId)
      .toArray()
    
    // Create lookup map
    const taskMap = new Map(tasks.map(t => [t.id, t]))
    
    // Return tasks in tasklist order
    const orderedTasks: RecurringTask[] = []
    const seenIds = new Set<string>()
    
    for (const id of orderedIds) {
      const task = taskMap.get(id)
      if (task) {
        orderedTasks.push(task)
        seenIds.add(id)
      }
    }
    
    // Add any orphaned tasks at the end
    const orphanedTasks = tasks
      .filter(t => !seenIds.has(t.id))
      .sort((a, b) => b.createdAt - a.createdAt)
    
    return [...orderedTasks, ...orphanedTasks]
  }, [scopeId])
}

// ... rest unchanged (useRecurringTaskPendingCount, useRecurringTaskCounts, useUserTimezone)
```

**Verify**:
- Recurring tasks display in correct order
- No TypeScript errors

---

### Step 7: Install @dnd-kit

**Do**: Install the drag-and-drop library.

**Commands**:
```bash
pnpm add @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities
```

**Verify**:
- Dependencies added to package.json
- No install errors

---

### Step 8: Create Reorder Mutation

**Do**: Add a mutation function for reordering tasks within a list.

**Modify** `src/lib/task-mutations.ts`:

Add at the end:
```typescript
import { reorderTasklist } from "./tasklist-helpers"

/**
 * Reorder tasks within a tasklist
 */
export async function reorderTasks(
  scopeId: string | null,
  status: TaskStatus,
  taskIds: string[]
): Promise<void> {
  await reorderTasklist(scopeId, status, taskIds)
}
```

**Modify** `src/lib/recurring-task-mutations.ts`:

Add at the end:
```typescript
import { reorderTasklist } from "./tasklist-helpers"

/**
 * Reorder recurring tasks within a tasklist
 */
export async function reorderRecurringTasks(
  scopeId: string,
  taskIds: string[]
): Promise<void> {
  await reorderTasklist(scopeId, "recurring", taskIds)
}
```

**Verify**:
- No TypeScript errors

---

### Step 9: Create Draggable Task Item

**Do**: Create a wrapper component that makes task items draggable.

**Create** `src/components/tasks/draggable-task-item.tsx`:

```typescript
"use client"

import { useSortable } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { TaskItem } from "./task-item"
import type { Task, TaskStatus } from "@/lib/db"

interface DraggableTaskItemProps {
  task: Task
  currentStatus: TaskStatus
  themeClass?: string
}

export function DraggableTaskItem({ task, currentStatus, themeClass }: DraggableTaskItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id })

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
        themeClass={themeClass}
        dragHandleProps={{ ...attributes, ...listeners }}
      />
    </div>
  )
}
```

**Verify**:
- File created
- No TypeScript errors (will have error until Step 10)

---

### Step 10: Update TaskItem for Drag Handle

**Do**: Update TaskItem to accept drag handle props.

**Modify** `src/components/tasks/task-item.tsx`:

1. Update the props interface:
```typescript
interface TaskItemProps {
  task: Task
  currentStatus: TaskStatus
  themeClass?: string
  dragHandleProps?: React.HTMLAttributes<HTMLDivElement>
}
```

2. Update the component signature:
```typescript
export function TaskItem({ task, currentStatus, themeClass, dragHandleProps }: TaskItemProps) {
```

3. Update the GripVertical div to use drag handle props:
```typescript
{/* Drag handle */}
<div
  {...dragHandleProps}
  className="flex h-8 w-8 shrink-0 cursor-grab items-center justify-center rounded hover:bg-muted active:cursor-grabbing"
>
  <GripVertical className="h-4 w-4 text-muted-foreground/50" />
</div>
```

**Verify**:
- No TypeScript errors
- Drag handle visible on task items

---

### Step 11: Create Draggable Task List Wrapper

**Do**: Create the DnD context wrapper for task lists.

**Create** `src/components/tasks/sortable-task-list.tsx`:

```typescript
"use client"

import { useCallback } from "react"
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core"
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable"
import { DraggableTaskItem } from "./draggable-task-item"
import { reorderTasks } from "@/lib/task-mutations"
import type { Task, TaskStatus } from "@/lib/db"

interface SortableTaskListProps {
  tasks: Task[]
  scopeId: string | null
  status: TaskStatus
  themeClass?: string
}

export function SortableTaskList({ tasks, scopeId, status, themeClass }: SortableTaskListProps) {
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // 8px movement before drag starts
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  const handleDragEnd = useCallback(
    async (event: DragEndEvent) => {
      const { active, over } = event
      
      if (!over || active.id === over.id) {
        return
      }

      // Calculate new order
      const oldIndex = tasks.findIndex((t) => t.id === active.id)
      const newIndex = tasks.findIndex((t) => t.id === over.id)
      
      if (oldIndex === -1 || newIndex === -1) return

      // Create new array with reordered IDs
      const newTaskIds = tasks.map((t) => t.id)
      const [movedId] = newTaskIds.splice(oldIndex, 1)
      newTaskIds.splice(newIndex, 0, movedId)

      // Persist new order
      await reorderTasks(scopeId, status, newTaskIds)
    },
    [tasks, scopeId, status]
  )

  const taskIds = tasks.map((t) => t.id)

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <SortableContext items={taskIds} strategy={verticalListSortingStrategy}>
        <div className="flex flex-col">
          {tasks.map((task) => (
            <DraggableTaskItem
              key={task.id}
              task={task}
              currentStatus={status}
              themeClass={themeClass}
            />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  )
}
```

**Verify**:
- File created
- No TypeScript errors

---

### Step 12: Integrate Sortable List into TaskList

**Do**: Update TaskList to use the sortable wrapper.

**Modify** `src/components/tasks/task-list.tsx`:

1. Add import:
```typescript
import { SortableTaskList } from "./sortable-task-list"
```

2. Replace the task mapping section with the sortable list:

Find this block:
```typescript
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
```

Replace with:
```typescript
{tasks.length === 0 ? (
  <div className="px-4 py-8 text-center">
    <p className="text-sm text-muted-foreground">No tasks</p>
  </div>
) : (
  <SortableTaskList
    tasks={tasks}
    scopeId={actualScopeId}
    status={listType as TaskStatus}
    themeClass={themeClass}
  />
)}
```

**Verify**:
- Tasks can be reordered via drag-and-drop
- Order persists after page refresh

---

### Step 13: Create Draggable Recurring Task Item

**Do**: Create draggable wrapper for recurring task items.

**Create** `src/components/tasks/draggable-recurring-task-item.tsx`:

```typescript
"use client"

import { useSortable } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { RecurringTaskItem } from "./recurring-task-item"
import type { RecurringTask } from "@/lib/db"

interface DraggableRecurringTaskItemProps {
  task: RecurringTask
  themeClass?: string
}

export function DraggableRecurringTaskItem({ task, themeClass }: DraggableRecurringTaskItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <div ref={setNodeRef} style={style}>
      <RecurringTaskItem
        task={task}
        themeClass={themeClass}
        dragHandleProps={{ ...attributes, ...listeners }}
      />
    </div>
  )
}
```

**Verify**:
- File created

---

### Step 14: Update RecurringTaskItem for Drag Handle

**Do**: Update RecurringTaskItem to accept drag handle props.

**Modify** `src/components/tasks/recurring-task-item.tsx`:

1. Update interface:
```typescript
interface RecurringTaskItemProps {
  task: RecurringTask
  themeClass?: string
  dragHandleProps?: React.HTMLAttributes<HTMLDivElement>
}
```

2. Update component signature:
```typescript
export function RecurringTaskItem({ task, themeClass, dragHandleProps }: RecurringTaskItemProps) {
```

3. Update the GripVertical to use drag handle props:
```typescript
{/* Drag handle */}
<div
  {...dragHandleProps}
  className="flex h-8 w-8 shrink-0 cursor-grab items-center justify-center rounded hover:bg-muted active:cursor-grabbing"
>
  <GripVertical className="h-4 w-4 text-muted-foreground/50" />
</div>
```

**Verify**:
- No TypeScript errors

---

### Step 15: Create Sortable Recurring Task List

**Do**: Create sortable wrapper for recurring task lists.

**Create** `src/components/tasks/sortable-recurring-task-list.tsx`:

```typescript
"use client"

import { useCallback } from "react"
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core"
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable"
import { DraggableRecurringTaskItem } from "./draggable-recurring-task-item"
import { reorderRecurringTasks } from "@/lib/recurring-task-mutations"
import type { RecurringTask } from "@/lib/db"

interface SortableRecurringTaskListProps {
  tasks: RecurringTask[]
  scopeId: string
  themeClass?: string
}

export function SortableRecurringTaskList({
  tasks,
  scopeId,
  themeClass,
}: SortableRecurringTaskListProps) {
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  const handleDragEnd = useCallback(
    async (event: DragEndEvent) => {
      const { active, over } = event
      
      if (!over || active.id === over.id) {
        return
      }

      const oldIndex = tasks.findIndex((t) => t.id === active.id)
      const newIndex = tasks.findIndex((t) => t.id === over.id)
      
      if (oldIndex === -1 || newIndex === -1) return

      const newTaskIds = tasks.map((t) => t.id)
      const [movedId] = newTaskIds.splice(oldIndex, 1)
      newTaskIds.splice(newIndex, 0, movedId)

      await reorderRecurringTasks(scopeId, newTaskIds)
    },
    [tasks, scopeId]
  )

  const taskIds = tasks.map((t) => t.id)

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <SortableContext items={taskIds} strategy={verticalListSortingStrategy}>
        <div className="flex flex-col">
          {tasks.map((task) => (
            <DraggableRecurringTaskItem
              key={task.id}
              task={task}
              themeClass={themeClass}
            />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  )
}
```

**Verify**:
- File created
- No TypeScript errors

---

### Step 16: Integrate Sortable List into RecurringTaskList

**Do**: Update RecurringTaskList to use the sortable wrapper.

**Modify** `src/components/tasks/recurring-task-list.tsx`:

1. Add import:
```typescript
import { SortableRecurringTaskList } from "./sortable-recurring-task-list"
```

2. Replace the task mapping in `RecurringTaskListContent`:

Find this block:
```typescript
{tasks.length === 0 ? (
  <div className="px-4 py-8 text-center">
    <p className="text-sm text-muted-foreground">No recurring tasks</p>
    ...
  </div>
) : (
  <div className="flex flex-col">
    {tasks.map((task) => (
      <RecurringTaskItem key={task.id} task={task} themeClass={themeClass} />
    ))}
  </div>
)}
```

Replace with:
```typescript
{tasks.length === 0 ? (
  <div className="px-4 py-8 text-center">
    <p className="text-sm text-muted-foreground">No recurring tasks</p>
    <p className="mt-1 text-xs text-muted-foreground/70">
      Add a recurring task to create templates that repeat on schedule
    </p>
  </div>
) : (
  <SortableRecurringTaskList
    tasks={tasks}
    scopeId={scopeId}
    themeClass={themeClass}
  />
)}
```

**Verify**:
- Recurring tasks can be reordered via drag-and-drop
- Order persists after page refresh

---

### Step 17: Add Scope Drop Targets

**Do**: Make scope items in the sidebar accept dropped tasks to change scope.

**Modify** `src/components/tasks/scope-list.tsx`:

1. Add imports:
```typescript
import { useDroppable } from "@dnd-kit/core"
```

2. Create a droppable scope item wrapper:
```typescript
interface DroppableScopeProps {
  scopeId: string
  children: React.ReactNode
}

function DroppableScope({ scopeId, children }: DroppableScopeProps) {
  const { isOver, setNodeRef } = useDroppable({
    id: `scope-drop-${scopeId}`,
    data: { scopeId },
  })

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "transition-colors",
        isOver && "bg-primary/10 ring-2 ring-primary ring-inset"
      )}
    >
      {children}
    </div>
  )
}
```

3. Wrap scope items in the list with DroppableScope (for Jobs and Projects, not Triage).

**Note**: This requires the DndContext to be higher in the component tree. The full implementation involves:
- Moving DndContext up to a shared parent
- Handling the scope change on drop
- This is a more complex change that may need additional refinement.

For now, the reordering functionality is complete. Scope drag-and-drop can be added as a follow-up enhancement.

**Verify**:
- All drag-and-drop reordering works
- No TypeScript errors
- `pnpm lint` passes

---

## Testing Checklist

After implementation, verify:

- [ ] Creating a task adds it to the top of the list
- [ ] Dragging a task up/down reorders the list
- [ ] Order persists after page refresh
- [ ] Order persists after browser close/reopen
- [ ] Batch actions (e.g., "Save" with multiple pending) preserve relative order
- [ ] "Move all to later" preserves relative order
- [ ] Recurring tasks can be reordered
- [ ] Recurring task order persists
- [ ] Recent (done) tasks are NOT draggable
- [ ] No console errors during drag operations
