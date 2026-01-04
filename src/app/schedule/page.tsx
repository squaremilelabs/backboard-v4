"use client"

import { useMemo } from "react"
import { ContentPanel } from "@/components/layout/content-panel"
import { ScheduleGridHeader } from "@/components/schedule/schedule-grid-header"
import { ScheduleGridRow } from "@/components/schedule/schedule-grid-row"
import { useScheduleScopes } from "@/hooks/use-scopes"
import { useScheduleSlots, useDefaultScheduleSlots, getNext7Days } from "@/hooks/use-schedule-slots"

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

  const hasContent = scopeData && (scopeData.jobs.length > 0 || scopeData.projectGroups.length > 0)

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
                {scopeData.jobs.map((job) => (
                  <ScheduleGridRow
                    key={job.id}
                    scope={job}
                    scheduleSlots={scheduleSlots}
                    defaultScheduleSlots={defaultScheduleSlots}
                  />
                ))}

                {/* Then projects, grouped by parent/children */}
                {scopeData.projectGroups.map(({ parent, parentIsActive, children }) => (
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
