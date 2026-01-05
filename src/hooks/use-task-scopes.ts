"use client"

import { useMemo } from "react"
import { useLiveQuery } from "dexie-react-hooks"
import { db, type Scope, type ScheduleSlot, type MonthSlot, type TaskStatus } from "@/lib/db"
import type { TaskListType } from "@/app/tasks/search-params"

export interface TaskScope extends Scope {
  isFaded: boolean
  isUnfocused: boolean // Has tasks but not scheduled
  hasTasksInList: boolean // Whether scope has tasks in current list
  hasPendingActions: boolean // Whether scope has unsaved pending actions
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
  triageHasPendingActions: boolean
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

  // Get task counts and pending action counts by scope for current list
  const taskData = useLiveQuery(async () => {
    if (!statusForQuery) {
      return {
        counts: new Map<string, number>(),
        pendingCounts: new Map<string, number>(),
      }
    }

    const tasks = await db.tasks.where("status").equals(statusForQuery).toArray()
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
  }, [statusForQuery])

  // Compute scopes with filtering and grouping
  const taskScopeData = useMemo((): TaskScopeData | undefined => {
    if (!scopes) return undefined
    if (listType === "now" && !todaySlots) return undefined
    if (listType === "later" && !monthSlots) return undefined
    if (!taskData) return undefined

    const { counts: taskCounts, pendingCounts } = taskData
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

    // Helper to check if scope has pending actions
    const hasPending = (scopeId: string): boolean => {
      return (pendingCounts.get(scopeId) ?? 0) > 0
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
        hasPendingActions: hasPending(scope.id),
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
            hasPendingActions: hasPending(parent.id),
          },
          children: includedChildren.map((child) => ({
            project: {
              ...child,
              isFaded: false,
              isUnfocused: !isScheduled(child) && hasTasks(child.id),
              hasTasksInList: hasTasks(child.id),
              hasPendingActions: hasPending(child.id),
            },
          })),
        }
      })
      .filter((group): group is TaskScopeGroup => group !== null)

    // Check if triage has tasks and pending actions
    const triageHasTasks = hasTasks("triage")
    const triageHasPendingActions = hasPending("triage")

    return { jobs, projectGroups, triageHasTasks, triageHasPendingActions }
  }, [scopes, listType, todaySlots, monthSlots, taskData])

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
