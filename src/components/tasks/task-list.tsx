"use client"

import { useQueryState } from "nuqs"
import { TaskItem } from "./task-item"
import { AddTaskInput } from "./add-task-input"
import { searchParamsParsers } from "@/app/tasks/search-params"
import { useTasks } from "@/hooks/use-tasks"
import { useScope } from "@/hooks/use-scopes"
import { cn } from "@/lib/utils"
import type { TaskStatus } from "@/lib/db"

export function TaskList() {
  const [listType] = useQueryState("list", searchParamsParsers.list)
  const [scopeId] = useQueryState("scope", searchParamsParsers.scope)

  // Only render for now/later/backlog
  const isActiveList = ["now", "later", "backlog"].includes(listType)

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

  // Loading state
  if (tasks === undefined) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-sm text-muted-foreground">Loading tasks...</p>
      </div>
    )
  }

  // Determine actual scopeId for creating tasks (null for triage)
  const actualScopeId = scopeId === "triage" ? null : scopeId

  return (
    <div className={cn("flex h-full flex-col", themeClass)}>
      {/* Task list with add input at top */}
      <div className="flex-1 overflow-y-auto">
        {/* Add task input - always at top */}
        {isActiveList && <AddTaskInput scopeId={actualScopeId} status={listType as TaskStatus} />}

        {tasks.length === 0 ? (
          <div className="px-4 py-8 text-center">
            <p className="text-sm text-muted-foreground">No tasks</p>
          </div>
        ) : (
          <div className="flex flex-col">
            {tasks.map((task) => (
              <TaskItem key={task.id} task={task} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
