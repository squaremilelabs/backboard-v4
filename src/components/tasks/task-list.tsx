"use client"

import { ArrowUp } from "lucide-react"
import { useQueryState } from "nuqs"
import { SortableTaskList } from "./sortable-task-list"
import { AddTaskInput } from "./add-task-input"
import { PendingActionsFooter } from "./pending-actions-footer"
import { UnfocusedWarningLabel, MoveAllToLaterButton } from "./unfocused-warning"
import { searchParamsParsers } from "@/app/tasks/search-params"
import {
  useTasks,
  usePendingActionCount,
  useIsScopeScheduledToday,
  useLaterTaskCount,
} from "@/hooks/use-tasks"
import { useScope } from "@/hooks/use-scopes"
import { moveAllFromLaterToNow } from "@/lib/task-mutations"
import { cn } from "@/lib/utils"
import type { TaskStatus } from "@/lib/db"

export function TaskList() {
  const [listType] = useQueryState("list", searchParamsParsers.list)
  const [scopeId] = useQueryState("scope", searchParamsParsers.scope)

  // Only render for now/later/backlog
  const isActiveList = ["now", "later", "backlog"].includes(listType)
  const isNowList = listType === "now"

  // Get scope info for theme
  const scope = useScope(scopeId === "triage" ? null : scopeId)

  // Determine theme class based on scope type
  const themeClass =
    scopeId === "triage"
      ? "" // No theme for triage
      : scope?.type === "job"
        ? "theme-gold"
        : scope?.type === "project"
          ? "theme-blue"
          : ""

  // Fetch tasks for this scope and status
  const tasks = useTasks(scopeId, listType as TaskStatus)

  // Get pending action count
  const pendingCount = usePendingActionCount(scopeId, listType as TaskStatus)

  // Check if scope is scheduled for today (only relevant for NOW list)
  const actualScopeId = scopeId === "triage" ? null : scopeId
  const isScheduledToday = useIsScopeScheduledToday(actualScopeId)

  // Show unfocused warning if: NOW list + has tasks + not scheduled today
  const showUnfocusedWarning =
    isNowList && tasks !== undefined && tasks.length > 0 && isScheduledToday === false

  // Count Later tasks (only check when viewing NOW list)
  const laterTaskCount = useLaterTaskCount(scopeId)

  // Show "Move from Later" when: NOW list + empty + Later has tasks
  const showMoveFromLater = isNowList && tasks?.length === 0 && (laterTaskCount ?? 0) > 0

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
      {/* Unfocused warning (above task list) */}
      {showUnfocusedWarning && <UnfocusedWarningLabel />}

      {/* Task list with add input at top */}
      <div className="flex-1 overflow-y-auto">
        {/* Add task input - always at top */}
        {isActiveList && <AddTaskInput scopeId={actualScopeId} status={listType as TaskStatus} />}

        {tasks.length === 0 ? (
          <div className="px-4 py-8 text-center">
            <p className="text-sm text-muted-foreground">No tasks</p>
            {showMoveFromLater && (
              <button
                onClick={() => moveAllFromLaterToNow(actualScopeId)}
                className={cn(
                  "mt-4 inline-flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium",
                  "bg-primary/10 text-primary transition-colors hover:bg-primary/20"
                )}
              >
                <ArrowUp className="h-4 w-4" />
                Move {laterTaskCount} from Later
              </button>
            )}
          </div>
        ) : (
          <SortableTaskList
            tasks={tasks}
            scopeId={actualScopeId}
            status={listType as TaskStatus}
            themeClass={themeClass}
          />
        )}
      </div>

      {/* Footer: either pending actions or unfocused bulk action */}
      {pendingCount !== undefined && pendingCount > 0 ? (
        <PendingActionsFooter
          scopeId={actualScopeId}
          currentStatus={listType as TaskStatus}
          pendingCount={pendingCount}
        />
      ) : showUnfocusedWarning ? (
        <MoveAllToLaterButton scopeId={actualScopeId} />
      ) : null}
    </div>
  )
}
