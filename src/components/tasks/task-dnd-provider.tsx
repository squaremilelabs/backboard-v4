"use client"

import { createContext, useContext, useCallback, useMemo, useRef, type ReactNode } from "react"
import {
  DndContext,
  pointerWithin,
  rectIntersection,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
  type CollisionDetection,
} from "@dnd-kit/core"
import { sortableKeyboardCoordinates } from "@dnd-kit/sortable"
import { reorderTasks, changeTaskScope } from "@/lib/task-mutations"
import { reorderRecurringTasks, changeRecurringTaskScope } from "@/lib/recurring-task-mutations"
import type { Task, TaskStatus, RecurringTask } from "@/lib/db"

/**
 * Custom collision detection that prioritizes scope drop targets.
 * When pointer is within a scope droppable, that wins.
 * Otherwise, fall back to rect intersection for sortable items.
 */
const scopePriorityCollision: CollisionDetection = (args) => {
  // First, check if pointer is within any scope droppables
  const pointerCollisions = pointerWithin(args)
  const scopeCollision = pointerCollisions.find((c) => (c.id as string).startsWith("scope-drop-"))

  // If pointer is over a scope, prioritize that
  if (scopeCollision) {
    return [scopeCollision]
  }

  // Otherwise, use rect intersection for sortable items
  return rectIntersection(args)
}

// Context for registering task lists (so drag end handler knows the current tasks)
interface TaskDndContextValue {
  registerTaskList: (scopeId: string | null, status: TaskStatus, tasks: Task[]) => void
  unregisterTaskList: (scopeId: string | null, status: TaskStatus) => void
  registerRecurringTaskList: (scopeId: string, tasks: RecurringTask[]) => void
  unregisterRecurringTaskList: (scopeId: string) => void
}

const TaskDndContext = createContext<TaskDndContextValue | null>(null)

export function useTaskDnd() {
  const ctx = useContext(TaskDndContext)
  if (!ctx) {
    throw new Error("useTaskDnd must be used within TaskDndProvider")
  }
  return ctx
}

interface TaskDndProviderProps {
  children: ReactNode
}

// Track registered task lists
type TaskListKey = `task:${string}:${TaskStatus}`
type RecurringListKey = `recurring:${string}`

interface TaskListEntry {
  scopeId: string | null
  status: TaskStatus
  tasks: Task[]
}

interface RecurringListEntry {
  scopeId: string
  tasks: RecurringTask[]
}

export function TaskDndProvider({ children }: TaskDndProviderProps) {
  // Use refs to avoid re-renders when lists register/unregister
  const taskListsRef = useRef(new Map<TaskListKey, TaskListEntry>())
  const recurringListsRef = useRef(new Map<RecurringListKey, RecurringListEntry>())

  // Track the currently dragged task
  const activeRef = useRef<{ taskId: string | null; type: "task" | "recurring" | null }>({
    taskId: null,
    type: null,
  })

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

  const registerTaskList = useCallback(
    (scopeId: string | null, status: TaskStatus, tasks: Task[]) => {
      const key: TaskListKey = `task:${scopeId ?? "triage"}:${status}`
      taskListsRef.current.set(key, { scopeId, status, tasks })
    },
    []
  )

  const unregisterTaskList = useCallback((scopeId: string | null, status: TaskStatus) => {
    const key: TaskListKey = `task:${scopeId ?? "triage"}:${status}`
    taskListsRef.current.delete(key)
  }, [])

  const registerRecurringTaskList = useCallback((scopeId: string, tasks: RecurringTask[]) => {
    const key: RecurringListKey = `recurring:${scopeId}`
    recurringListsRef.current.set(key, { scopeId, tasks })
  }, [])

  const unregisterRecurringTaskList = useCallback((scopeId: string) => {
    const key: RecurringListKey = `recurring:${scopeId}`
    recurringListsRef.current.delete(key)
  }, [])

  const handleDragStart = useCallback((event: DragStartEvent) => {
    const taskId = event.active.id as string
    // Determine if this is a regular task or recurring task
    // by checking which list contains it
    for (const entry of taskListsRef.current.values()) {
      if (entry.tasks.some((t) => t.id === taskId)) {
        activeRef.current.taskId = taskId
        activeRef.current.type = "task"
        return
      }
    }
    for (const entry of recurringListsRef.current.values()) {
      if (entry.tasks.some((t) => t.id === taskId)) {
        activeRef.current.taskId = taskId
        activeRef.current.type = "recurring"
        return
      }
    }
  }, [])

  const handleDragEnd = useCallback(async (event: DragEndEvent) => {
    const { active, over } = event
    const taskId = active.id as string
    const taskType = activeRef.current.type

    // Reset active
    activeRef.current.taskId = null
    activeRef.current.type = null

    if (!over) return

    const overId = over.id as string

    // Check if dropped on a scope (scope drop target IDs start with "scope-drop-")
    if (overId.startsWith("scope-drop-")) {
      const newScopeId = over.data.current?.scopeId as string | null

      if (taskType === "task") {
        // Find which list this task belongs to
        for (const entry of taskListsRef.current.values()) {
          const task = entry.tasks.find((t) => t.id === taskId)
          if (task) {
            // Don't move if same scope
            if (task.scopeId === newScopeId) return
            // Can't move to triage (per PRD)
            if (newScopeId === null) return
            await changeTaskScope(taskId, newScopeId)
            return
          }
        }
      } else if (taskType === "recurring") {
        // Recurring tasks can't go to triage
        if (newScopeId === null) return
        for (const entry of recurringListsRef.current.values()) {
          const task = entry.tasks.find((t) => t.id === taskId)
          if (task) {
            if (task.scopeId === newScopeId) return
            await changeRecurringTaskScope(taskId, newScopeId)
            return
          }
        }
      }
      return
    }

    // Otherwise, it's a reorder within a list
    if (active.id === over.id) return

    if (taskType === "task") {
      // Find the list containing this task
      for (const entry of taskListsRef.current.values()) {
        const oldIndex = entry.tasks.findIndex((t) => t.id === active.id)
        const newIndex = entry.tasks.findIndex((t) => t.id === over.id)

        if (oldIndex !== -1 && newIndex !== -1) {
          const newTaskIds = entry.tasks.map((t) => t.id)
          const [movedId] = newTaskIds.splice(oldIndex, 1)
          newTaskIds.splice(newIndex, 0, movedId)
          await reorderTasks(entry.scopeId, entry.status, newTaskIds)
          return
        }
      }
    } else if (taskType === "recurring") {
      for (const entry of recurringListsRef.current.values()) {
        const oldIndex = entry.tasks.findIndex((t) => t.id === active.id)
        const newIndex = entry.tasks.findIndex((t) => t.id === over.id)

        if (oldIndex !== -1 && newIndex !== -1) {
          const newTaskIds = entry.tasks.map((t) => t.id)
          const [movedId] = newTaskIds.splice(oldIndex, 1)
          newTaskIds.splice(newIndex, 0, movedId)
          await reorderRecurringTasks(entry.scopeId, newTaskIds)
          return
        }
      }
    }
  }, [])

  const contextValue = useMemo(
    (): TaskDndContextValue => ({
      registerTaskList,
      unregisterTaskList,
      registerRecurringTaskList,
      unregisterRecurringTaskList,
    }),
    [registerTaskList, unregisterTaskList, registerRecurringTaskList, unregisterRecurringTaskList]
  )

  return (
    <TaskDndContext.Provider value={contextValue}>
      <DndContext
        sensors={sensors}
        collisionDetection={scopePriorityCollision}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        {children}
      </DndContext>
    </TaskDndContext.Provider>
  )
}
