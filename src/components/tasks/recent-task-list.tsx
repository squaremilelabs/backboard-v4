"use client"

import { useQueryState } from "nuqs"
import { TaskItem } from "./task-item"
import { PendingActionsFooter } from "./pending-actions-footer"
import { searchParamsParsers } from "@/app/tasks/search-params"
import { useRecentTasks, usePendingActionCount } from "@/hooks/use-tasks"
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

  // Get pending action count
  const actualScopeId = scopeId === "triage" ? null : scopeId
  const pendingCount = usePendingActionCount(scopeId, "done")

  // Loading state
  if (tasks === undefined) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-sm text-muted-foreground">Loading tasks...</p>
      </div>
    )
  }

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
              <TaskItem key={task.id} task={task} currentStatus="done" themeClass={themeClass} />
            ))}
          </div>
        )}
      </div>

      {/* Pending actions footer */}
      {pendingCount !== undefined && pendingCount > 0 && (
        <PendingActionsFooter
          scopeId={actualScopeId}
          currentStatus="done"
          pendingCount={pendingCount}
        />
      )}
    </div>
  )
}
