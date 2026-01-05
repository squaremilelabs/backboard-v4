"use client"

import { useQueryState } from "nuqs"
import { searchParamsParsers } from "@/app/tasks/search-params"
import { useRecurringTasks, useRecurringTaskPendingCount } from "@/hooks/use-recurring-tasks"
import { useScope } from "@/hooks/use-scopes"
import { commitRecurringTaskPendingActions, clearRecurringTaskPendingActions } from "@/lib/recurring-task-mutations"
import { RecurringTaskItem } from "./recurring-task-item"
import { AddRecurringTaskInput } from "./add-recurring-task-input"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export function RecurringTaskList() {
  const [scopeId] = useQueryState("scope", searchParamsParsers.scope)

  // Recurring tasks require a scope - no triage allowed
  // If triage is selected, show a message
  if (scopeId === "triage") {
    return (
      <div className="flex h-full items-center justify-center px-4">
        <p className="text-center text-sm text-muted-foreground">
          Recurring tasks must belong to a Job or Project.
          <br />
          Select a scope from the sidebar.
        </p>
      </div>
    )
  }

  return <RecurringTaskListContent scopeId={scopeId} />
}

function RecurringTaskListContent({ scopeId }: { scopeId: string }) {
  // Get scope info for theme
  const scope = useScope(scopeId)

  // Determine theme class based on scope type
  const themeClass =
    scope?.type === "job"
      ? "theme-gold"
      : scope?.type === "project"
        ? "theme-blue"
        : ""

  // Fetch recurring tasks for this scope
  const tasks = useRecurringTasks(scopeId)
  const pendingCount = useRecurringTaskPendingCount(scopeId)

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
      {/* Task list with add input at top */}
      <div className="flex-1 overflow-y-auto">
        {/* Add recurring task input - always at top */}
        <AddRecurringTaskInput scopeId={scopeId} />

        {tasks.length === 0 ? (
          <div className="px-4 py-8 text-center">
            <p className="text-sm text-muted-foreground">No recurring tasks</p>
            <p className="mt-1 text-xs text-muted-foreground/70">
              Add a recurring task to create templates that repeat on schedule
            </p>
          </div>
        ) : (
          <div className="flex flex-col">
            {tasks.map((task) => (
              <RecurringTaskItem key={task.id} task={task} themeClass={themeClass} />
            ))}
          </div>
        )}
      </div>

      {/* Pending actions footer */}
      {pendingCount > 0 && (
        <RecurringTaskPendingFooter scopeId={scopeId} pendingCount={pendingCount} />
      )}
    </div>
  )
}

interface RecurringTaskPendingFooterProps {
  scopeId: string
  pendingCount: number
}

function RecurringTaskPendingFooter({ scopeId, pendingCount }: RecurringTaskPendingFooterProps) {
  const handleClear = async () => {
    await clearRecurringTaskPendingActions(scopeId)
  }

  const handleSave = async () => {
    await commitRecurringTaskPendingActions(scopeId)
  }

  return (
    <div className="flex items-center justify-end gap-3 border-t px-4 py-3">
      <Button variant="ghost" onClick={handleClear}>
        Clear
      </Button>
      <Button onClick={handleSave}>Save</Button>
    </div>
  )
}
