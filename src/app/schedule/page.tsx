"use client"

import { useMemo, useState, useEffect, useRef } from "react"
import { ContentPanel } from "@/components/layout/content-panel"
import { ScheduleGridHeader } from "@/components/schedule/schedule-grid-header"
import { ScheduleGridRow } from "@/components/schedule/schedule-grid-row"
import { useScheduleScopes, type ScheduleScopeData } from "@/hooks/use-scopes"
import {
  useScheduleSlots,
  useDefaultScheduleSlots,
  useMonthSlots,
  getNext7Days,
} from "@/hooks/use-schedule-slots"
import {
  sortJobsBySchedule,
  sortProjectGroupsBySchedule,
  type ProjectGroup,
} from "@/lib/scope-sorting"
import type { Scope } from "@/lib/db"

export default function SchedulePage() {
  // Get the months covered by the 7-day range
  const activeMonths = useMemo(() => {
    const days = getNext7Days()
    const months = new Set(days.map((d) => d.month))
    return Array.from(months)
  }, [])

  const scopeData = useScheduleScopes(activeMonths)
  const scheduleSlots = useScheduleSlots()
  const defaultScheduleSlots = useDefaultScheduleSlots()
  const monthSlots = useMonthSlots()

  // Store the initial sorted order - only computed once on first data load
  const [sortedJobIds, setSortedJobIds] = useState<string[] | null>(null)
  const [sortedProjectGroups, setSortedProjectGroups] = useState<ProjectGroup[] | null>(null)
  const initialSortDoneRef = useRef(false)

  // Compute initial sort order when data first loads
  useEffect(() => {
    if (
      initialSortDoneRef.current ||
      scopeData === undefined ||
      defaultScheduleSlots === undefined ||
      monthSlots === undefined
    ) {
      return
    }

    // Sort jobs by default schedule slots (weekday-based)
    const sortedJobs = sortJobsBySchedule(scopeData.jobs, defaultScheduleSlots)
    setSortedJobIds(sortedJobs.map((j) => j.id))

    // Sort project groups by month slots
    const sorted = sortProjectGroupsBySchedule(scopeData.projectGroups, monthSlots, activeMonths)
    setSortedProjectGroups(sorted)
    initialSortDoneRef.current = true
  }, [scopeData, defaultScheduleSlots, monthSlots, activeMonths])

  const hasContent = scopeData && (scopeData.jobs.length > 0 || scopeData.projectGroups.length > 0)

  // Create a lookup map for jobs
  const jobMap = useMemo(() => {
    if (!scopeData) return new Map<string, Scope>()
    return new Map(scopeData.jobs.map((j) => [j.id, j]))
  }, [scopeData])

  // Get display jobs in sorted order
  const displayJobs = useMemo(() => {
    if (!scopeData) return []
    if (!sortedJobIds) return scopeData.jobs

    const sorted = sortedJobIds
      .map((id) => jobMap.get(id))
      .filter((j): j is Scope => j !== undefined)

    // Include any new jobs not in the sorted list
    const newJobs = scopeData.jobs.filter((j) => !sortedJobIds.includes(j.id))
    return [...sorted, ...newJobs]
  }, [scopeData, sortedJobIds, jobMap])

  // Get display project groups in sorted order
  const displayProjectGroups = useMemo(() => {
    if (!scopeData) return []
    if (!sortedProjectGroups) return scopeData.projectGroups

    // Map sorted groups back to current data
    const groupMap = new Map(scopeData.projectGroups.map((g) => [g.parent.id, g]))
    const sorted = sortedProjectGroups
      .map((g) => groupMap.get(g.parent.id))
      .filter((g): g is ScheduleScopeData["projectGroups"][number] => g !== undefined)

    // Include any new groups not in the sorted list
    const sortedParentIds = new Set(sortedProjectGroups.map((g) => g.parent.id))
    const newGroups = scopeData.projectGroups.filter((g) => !sortedParentIds.has(g.parent.id))

    return [...sorted, ...newGroups]
  }, [scopeData, sortedProjectGroups])

  return (
    <ContentPanel>
      <div className="flex h-full flex-col">
        {/* Single scroll container for both header and content */}
        <div className="flex-1 overflow-auto">
          <div className="min-w-fit">
            {/* Sticky header row */}
            <ScheduleGridHeader />

            {/* Content rows */}
            {scopeData === undefined ? (
              <div className="p-4 text-sm text-muted-foreground">Loading...</div>
            ) : !hasContent ? (
              <div className="p-4 text-sm text-muted-foreground">
                No scopes to schedule. Create Jobs or activate Projects for this month.
              </div>
            ) : (
              <div className="flex flex-col">
                {/* Jobs first */}
                {displayJobs.map((job) => (
                  <ScheduleGridRow
                    key={job.id}
                    scope={job}
                    scheduleSlots={scheduleSlots}
                    defaultScheduleSlots={defaultScheduleSlots}
                  />
                ))}

                {/* Then projects, grouped by parent/children */}
                {displayProjectGroups.map(({ parent, parentIsActive, children }) => (
                  <div key={parent.id}>
                    {/* Parent project row */}
                    <ScheduleGridRow
                      scope={parent}
                      scheduleSlots={scheduleSlots}
                      showCells={parentIsActive}
                    />
                    {/* Child project rows */}
                    {children.map(({ project, isActive }) => (
                      <ScheduleGridRow
                        key={project.id}
                        scope={project}
                        scheduleSlots={scheduleSlots}
                        isNested
                        showCells={isActive}
                      />
                    ))}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </ContentPanel>
  )
}
