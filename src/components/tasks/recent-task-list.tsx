"use client"

import { useQueryState } from "nuqs"
import { TaskItem } from "./task-item"
import { BatchActionBar } from "./batch-action-bar"
import { searchParamsParsers } from "@/app/tasks/search-params"
import { useRecentTasks } from "@/hooks/use-tasks"
import { useScope } from "@/hooks/use-scopes"
import { cn } from "@/lib/utils"

export function RecentTaskList() {
  const [scopeId] = useQueryState("scope", searchParamsParsers.scope)

  // Get scope info for theme
  const scope = useScope(scopeId === "triage" ? null : scopeId)

  // Determine theme class based on scope type
  const themeClass =
    scopeId === "triage"
      ? ""
      : scope?.type === "job"
        ? "theme-gold"
        : scope?.type === "project"
          ? "theme-blue"
          : ""

  // Fetch recent tasks (done within last 7 days) for this scope
  const tasks = useRecentTasks(scopeId)
  const actualScopeId = scopeId === "triage" ? null : scopeId

  // Loading state
  if (tasks === undefined) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-sm text-muted-foreground">Loading tasks...</p>
      </div>
    )
  }

  const taskIds = tasks.map((t) => t.id)

  return (
    <div className={cn("flex h-full flex-col", themeClass)}>
      {/* Task list - NO add input for recent */}
      <div className="flex-1 overflow-y-auto">
        {tasks.length === 0 ? (
          <div className="px-4 py-8 text-center">
            <p className="text-sm text-muted-foreground">No recent tasks</p>
          </div>
        ) : (
          <div className="flex flex-col">
            {tasks.map((task) => (
              <TaskItem
                key={task.id}
                task={task}
                currentStatus="done"
                scopeId={actualScopeId}
                themeClass={themeClass}
              />
            ))}
          </div>
        )}
      </div>

      {/* Batch action bar */}
      <BatchActionBar taskIds={taskIds} currentStatus="done" scopeId={actualScopeId} />
    </div>
  )
}
