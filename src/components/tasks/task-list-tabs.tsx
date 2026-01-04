"use client"

import { useQueryState } from "nuqs"
import { searchParamsParsers, type TaskListType } from "@/app/tasks/search-params"
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

  return (
    <div className="flex items-center gap-1 border-b bg-background px-3">
      {LIST_TYPES.map(({ value, label }) => {
        const isActive = activeListType === value

        return (
          <button
            key={value}
            onClick={() => setActiveListType(value)}
            className={cn(
              "relative flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors",
              isActive ? "text-foreground" : "text-muted-foreground hover:text-foreground"
            )}
          >
            {label}

            {/* Activity dots - placeholder for future implementation */}
            {/* TODO: Show colored dots when scope has tasks in this list */}

            {/* Active indicator bar */}
            {isActive && <span className="absolute right-0 bottom-0 left-0 h-0.5 bg-primary" />}
          </button>
        )
      })}
    </div>
  )
}
