"use client"

import { useMemo } from "react"
import { useLiveQuery } from "dexie-react-hooks"
import { db, type Scope, type ScheduleSlot, type MonthSlot } from "@/lib/db"
import type { TaskListType } from "@/app/tasks/search-params"

export interface TaskScope extends Scope {
  isFaded: boolean
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
}

/**
 * Get scopes for the tasks page with contextual filtering
 *
 * Filtering rules (scopes not meeting criteria are omitted):
 * - "now": Only show scopes with ScheduleSlot for today
 * - "later": Only show Projects with MonthSlot for current month (Jobs always shown)
 * - "backlog", "recurring", "recent": Show all scopes
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

  // Compute scopes with filtering and grouping
  const taskScopeData = useMemo((): TaskScopeData | undefined => {
    if (!scopes) return undefined
    if (listType === "now" && !todaySlots) return undefined
    if (listType === "later" && !monthSlots) return undefined

    // Helper to check if a scope should be included
    const shouldInclude = (scope: Scope): boolean => {
      if (listType === "now") {
        // Only include scopes with a schedule slot for today
        return todaySlots?.some((slot) => slot.scopeId === scope.id) ?? false
      } else if (listType === "later") {
        // Jobs are always included, Projects need a MonthSlot for current month
        if (scope.type === "job") return true
        return monthSlots?.some((slot) => slot.projectId === scope.id) ?? false
      }
      // For "backlog", "recurring", "recent": include all
      return true
    }

    // Split into jobs and projects, filtering by inclusion rules
    const jobs: TaskScope[] = scopes
      .filter((s) => s.type === "job" && shouldInclude(s))
      .map((scope) => ({ ...scope, isFaded: false }))

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
          parent: { ...parent, isFaded: !parentIncluded },
          children: includedChildren.map((child) => ({
            project: { ...child, isFaded: false },
          })),
        }
      })
      .filter((group): group is TaskScopeGroup => group !== null)

    return { jobs, projectGroups }
  }, [scopes, listType, todaySlots, monthSlots])

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
