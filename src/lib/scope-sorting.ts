import type { Scope, Weekday } from "./db"

/**
 * Weekday order for sorting (Monday = 0, Sunday = 6)
 */
const WEEKDAY_ORDER: Record<Weekday, number> = {
  mon: 0,
  tue: 1,
  wed: 2,
  thu: 3,
  fri: 4,
  sat: 5,
  sun: 6,
}

/**
 * Get the weekdays scheduled for a job from the defaultScheduleSlots set
 * @param jobId - The job ID to lookup
 * @param slotsSet - Set of "jobId:weekday" strings
 * @returns Array of weekdays scheduled for this job
 */
function getJobWeekdays(jobId: string, slotsSet: Set<string>): Weekday[] {
  const weekdays: Weekday[] = []
  for (const weekday of Object.keys(WEEKDAY_ORDER) as Weekday[]) {
    if (slotsSet.has(`${jobId}:${weekday}`)) {
      weekdays.push(weekday)
    }
  }
  return weekdays
}

/**
 * Get the months scheduled for a project from the monthSlots set
 * @param projectId - The project ID to lookup
 * @param slotsSet - Set of "projectId:month" strings
 * @param monthKeys - Array of month keys to check (e.g., ["2025-01", "2025-02"])
 * @returns Array of months scheduled for this project
 */
function getProjectMonths(projectId: string, slotsSet: Set<string>, monthKeys: string[]): string[] {
  return monthKeys.filter((month) => slotsSet.has(`${projectId}:${month}`))
}

/**
 * Sort jobs by their scheduled weekdays:
 * 1. Earliest weekday first (Mon before Tue)
 * 2. Most scheduled weekdays next (if same earliest, more days = first)
 * 3. If no weekdays scheduled, sort by createdAt (oldest first)
 */
export function sortJobsBySchedule(jobs: Scope[], defaultScheduleSlots: Set<string>): Scope[] {
  return [...jobs].sort((a, b) => {
    const aWeekdays = getJobWeekdays(a.id, defaultScheduleSlots)
    const bWeekdays = getJobWeekdays(b.id, defaultScheduleSlots)

    // If both have no weekdays, sort by createdAt
    if (aWeekdays.length === 0 && bWeekdays.length === 0) {
      return a.createdAt - b.createdAt
    }

    // Jobs with weekdays come before jobs without
    if (aWeekdays.length === 0) return 1
    if (bWeekdays.length === 0) return -1

    // Get earliest weekday for each
    const aEarliest = Math.min(...aWeekdays.map((w) => WEEKDAY_ORDER[w]))
    const bEarliest = Math.min(...bWeekdays.map((w) => WEEKDAY_ORDER[w]))

    // Sort by earliest weekday first
    if (aEarliest !== bEarliest) {
      return aEarliest - bEarliest
    }

    // If same earliest, more weekdays = first
    if (aWeekdays.length !== bWeekdays.length) {
      return bWeekdays.length - aWeekdays.length
    }

    // Fallback to createdAt
    return a.createdAt - b.createdAt
  })
}

/**
 * Sort projects by their scheduled months:
 * 1. Earliest month first (Jan before Feb)
 * 2. Most scheduled months next (if same earliest, more months = first)
 * 3. If no months scheduled, sort by createdAt (oldest first)
 */
export function sortProjectsBySchedule(
  projects: Scope[],
  monthSlots: Set<string>,
  monthKeys: string[]
): Scope[] {
  return [...projects].sort((a, b) => {
    const aMonths = getProjectMonths(a.id, monthSlots, monthKeys)
    const bMonths = getProjectMonths(b.id, monthSlots, monthKeys)

    // If both have no months, sort by createdAt
    if (aMonths.length === 0 && bMonths.length === 0) {
      return a.createdAt - b.createdAt
    }

    // Projects with months come before projects without
    if (aMonths.length === 0) return 1
    if (bMonths.length === 0) return -1

    // Get earliest month index for each (months are already sorted chronologically)
    const aEarliest = Math.min(...aMonths.map((m) => monthKeys.indexOf(m)))
    const bEarliest = Math.min(...bMonths.map((m) => monthKeys.indexOf(m)))

    // Sort by earliest month first
    if (aEarliest !== bEarliest) {
      return aEarliest - bEarliest
    }

    // If same earliest, more months = first
    if (aMonths.length !== bMonths.length) {
      return bMonths.length - aMonths.length
    }

    // Fallback to createdAt
    return a.createdAt - b.createdAt
  })
}

/**
 * Sort project groups (parent + children) for Schedule page
 * Maintains nesting - children stay with their parent
 * Sorting is based on the parent's schedule OR earliest child's schedule
 */
export interface ProjectGroup {
  parent: Scope
  parentIsActive: boolean
  children: Array<{
    project: Scope
    isActive: boolean
  }>
}

function getProjectGroupEarliestMonth(
  group: ProjectGroup,
  monthSlots: Set<string>,
  monthKeys: string[]
): number {
  // Check parent first
  const parentMonths = getProjectMonths(group.parent.id, monthSlots, monthKeys)
  if (parentMonths.length > 0) {
    return Math.min(...parentMonths.map((m) => monthKeys.indexOf(m)))
  }

  // Then check children
  let earliestChild = Infinity
  for (const child of group.children) {
    if (child.isActive) {
      const childMonths = getProjectMonths(child.project.id, monthSlots, monthKeys)
      if (childMonths.length > 0) {
        earliestChild = Math.min(earliestChild, ...childMonths.map((m) => monthKeys.indexOf(m)))
      }
    }
  }

  return earliestChild === Infinity ? monthKeys.length : earliestChild
}

function getProjectGroupTotalMonths(
  group: ProjectGroup,
  monthSlots: Set<string>,
  monthKeys: string[]
): number {
  let total = 0
  // Count parent months
  total += getProjectMonths(group.parent.id, monthSlots, monthKeys).length
  // Count children months
  for (const child of group.children) {
    total += getProjectMonths(child.project.id, monthSlots, monthKeys).length
  }
  return total
}

/**
 * Sort project groups by their scheduled months:
 * 1. Earliest month first (considering parent OR any active child)
 * 2. Most total scheduled months next
 * 3. Fallback to parent createdAt
 *
 * Also sorts children within each group by schedule
 */
export function sortProjectGroupsBySchedule(
  groups: ProjectGroup[],
  monthSlots: Set<string>,
  monthKeys: string[]
): ProjectGroup[] {
  // First, sort children within each group
  const groupsWithSortedChildren = groups.map((group) => ({
    ...group,
    children: [...group.children].sort((a, b) => {
      const aMonths = getProjectMonths(a.project.id, monthSlots, monthKeys)
      const bMonths = getProjectMonths(b.project.id, monthSlots, monthKeys)

      // Active before inactive
      if (a.isActive !== b.isActive) {
        return a.isActive ? -1 : 1
      }

      if (aMonths.length === 0 && bMonths.length === 0) {
        return a.project.createdAt - b.project.createdAt
      }
      if (aMonths.length === 0) return 1
      if (bMonths.length === 0) return -1

      const aEarliest = Math.min(...aMonths.map((m) => monthKeys.indexOf(m)))
      const bEarliest = Math.min(...bMonths.map((m) => monthKeys.indexOf(m)))

      if (aEarliest !== bEarliest) return aEarliest - bEarliest
      if (aMonths.length !== bMonths.length) return bMonths.length - aMonths.length

      return a.project.createdAt - b.project.createdAt
    }),
  }))

  // Then sort the groups themselves
  return groupsWithSortedChildren.sort((a, b) => {
    const aEarliest = getProjectGroupEarliestMonth(a, monthSlots, monthKeys)
    const bEarliest = getProjectGroupEarliestMonth(b, monthSlots, monthKeys)

    if (aEarliest !== bEarliest) return aEarliest - bEarliest

    const aTotal = getProjectGroupTotalMonths(a, monthSlots, monthKeys)
    const bTotal = getProjectGroupTotalMonths(b, monthSlots, monthKeys)

    if (aTotal !== bTotal) return bTotal - aTotal

    return a.parent.createdAt - b.parent.createdAt
  })
}
