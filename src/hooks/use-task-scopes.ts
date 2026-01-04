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
 * Get scopes for the tasks page with contextual fading
 *
 * Fading rules:
 * - "now": Fade scopes without ScheduleSlot for today
 * - "later": Fade Projects without MonthSlot for current month (Jobs never fade)
 * - "backlog", "recurring", "recent": No fading
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

  // Get schedule slots for today (for "now" fading)
  const todaySlots = useLiveQuery(
    (): Promise<ScheduleSlot[]> =>
      listType === "now"
        ? db.scheduleSlots.where("date").equals(today).toArray()
        : Promise.resolve([]),
    [listType, today]
  )

  // Get month slots for current month (for "later" fading)
  const monthSlots = useLiveQuery(
    (): Promise<MonthSlot[]> =>
      listType === "later"
        ? db.monthSlots.where("month").equals(currentMonth).toArray()
        : Promise.resolve([]),
    [listType, currentMonth]
  )

  // Compute scopes with fading and grouping
  const taskScopeData = useMemo((): TaskScopeData | undefined => {
    if (!scopes) return undefined
    if (listType === "now" && !todaySlots) return undefined
    if (listType === "later" && !monthSlots) return undefined

    // Helper to compute fading for a scope
    const computeFaded = (scope: Scope): boolean => {
      if (listType === "now") {
        const hasSlotToday = todaySlots?.some((slot) => slot.scopeId === scope.id)
        return !hasSlotToday
      } else if (listType === "later") {
        if (scope.type === "project") {
          const hasMonthSlot = monthSlots?.some((slot) => slot.projectId === scope.id)
          return !hasMonthSlot
        }
      }
      return false
    }

    // Split into jobs and projects
    const jobs: TaskScope[] = scopes
      .filter((s) => s.type === "job")
      .map((scope) => ({ ...scope, isFaded: computeFaded(scope) }))

    const projects = scopes.filter((s) => s.type === "project")

    // Group projects by parent
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

    // Build project groups
    const projectGroups: TaskScopeGroup[] = parentProjects.map((parent) => {
      const children = childrenByParent[parent.id] || []
      return {
        parent: { ...parent, isFaded: computeFaded(parent) },
        children: children.map((child) => ({
          project: { ...child, isFaded: computeFaded(child) },
        })),
      }
    })

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
