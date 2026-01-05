"use client"

import { useLiveQuery } from "dexie-react-hooks"
import { db, type Scope, type ScopeType } from "@/lib/db"

export function useScopes(type?: ScopeType) {
  return useLiveQuery(() => {
    if (type) {
      return db.scopes
        .where("type")
        .equals(type)
        .filter((scope) => !scope.archivedAt)
        .toArray()
    }
    // Return all non-archived scopes if no type specified
    return db.scopes.filter((scope) => !scope.archivedAt).toArray()
  }, [type])
}

export function useScope(id: string | null) {
  return useLiveQuery(() => (id ? db.scopes.get(id) : undefined), [id])
}

/**
 * Schedule page scope data
 */
export interface ScheduleScopeData {
  jobs: Scope[]
  // Parent projects with their children
  projectGroups: Array<{
    parent: Scope
    parentIsActive: boolean // Has MonthSlot for current months
    children: Array<{
      project: Scope
      isActive: boolean
    }>
  }>
}

/**
 * Get scopes for the Schedule page:
 * - All non-archived Jobs
 * - Projects grouped by parent/child, including parents even if not active
 *   (parent shows if it OR any child is active)
 */
export function useScheduleScopes(activeMonths: string[]): ScheduleScopeData | undefined {
  return useLiveQuery(async () => {
    // Get all non-archived scopes
    const allScopes = await db.scopes.filter((s) => !s.archivedAt).toArray()

    // Get active project IDs from month slots
    const monthSlots = await db.monthSlots.toArray()
    const activeProjectIds = new Set(
      monthSlots.filter((ms) => activeMonths.includes(ms.month)).map((ms) => ms.projectId)
    )

    // Split into jobs and projects
    const jobs = allScopes.filter((s) => s.type === "job")
    const projects = allScopes.filter((s) => s.type === "project")

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

    // Build project groups - include parent if it or any child is active
    const projectGroups: ScheduleScopeData["projectGroups"] = []
    for (const parent of parentProjects) {
      const children = childrenByParent[parent.id] || []
      const parentIsActive = activeProjectIds.has(parent.id)
      const activeChildren = children.filter((c) => activeProjectIds.has(c.id))

      // Include this group if parent is active OR any child is active
      if (parentIsActive || activeChildren.length > 0) {
        projectGroups.push({
          parent,
          parentIsActive,
          children: children.map((c) => ({
            project: c,
            isActive: activeProjectIds.has(c.id),
          })),
        })
      }
    }

    return { jobs, projectGroups }
  }, [activeMonths.join(",")])
}

/**
 * Get all archived scopes, sorted by archivedAt descending (most recent first)
 */
export function useArchivedScopes(): Scope[] | undefined {
  return useLiveQuery(async () => {
    const archived = await db.scopes
      .filter((scope) => scope.archivedAt !== undefined && scope.archivedAt > 0)
      .toArray()

    // Sort by archivedAt descending (most recently archived first)
    return archived.sort((a, b) => (b.archivedAt ?? 0) - (a.archivedAt ?? 0))
  }, [])
}
