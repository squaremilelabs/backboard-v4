"use client"

import { useQueryState } from "nuqs"
import { searchParamsParsers, type TaskListType } from "@/app/tasks/search-params"
import { useTaskIndicators } from "@/hooks/use-task-indicators"
import { ActivityDots } from "@/components/ui/activity-dot"
import { cn } from "@/lib/utils"

const LIST_TYPES: Array<{ value: TaskListType; label: string }> = [
  { value: "now", label: "Now" },
  { value: "later", label: "Later" },
  { value: "backlog", label: "Backlog" },
  { value: "recurring", label: "Recurring" },
  { value: "recent", label: "Recent" },
]

export function TaskListTabs() {
  const [activeListType, setActiveListType] = useQueryState("list", searchParamsParsers.list)
  const indicators = useTaskIndicators()

  return (
    <div className="flex w-full overflow-x-auto border-b bg-background px-3">
      {LIST_TYPES.map(({ value, label }) => {
        const isActive = activeListType === value

        // Determine dots for this tab
        let dots: import("@/components/ui/activity-dot").DotVariant[] = []
        if (indicators) {
          if (value === "now") {
            dots = indicators.nowDots
          } else if (value === "later" && indicators.hasLaterTasks) {
            dots = ["neutral"]
          } else if (value === "backlog" && indicators.hasBacklogTasks) {
            dots = ["neutral"]
          }
        }

        return (
          <button
            key={value}
            onClick={() => setActiveListType(value)}
            className={cn(
              "relative flex min-w-fit flex-1 shrink-0 items-center justify-center gap-2 px-4 py-3",
              "text-sm font-medium transition-colors",
              isActive ? "text-foreground" : "text-muted-foreground hover:text-foreground"
            )}
          >
            {label}

            {/* Activity dots */}
            {dots.length > 0 && <ActivityDots variants={dots} />}

            {/* Active indicator bar */}
            {isActive && <span className="absolute right-0 bottom-0 left-0 h-0.5 bg-primary" />}
          </button>
        )
      })}
    </div>
  )
}
