"use client"

import { Check, ArrowRight, ArrowRightToLine, ArrowLeft, ArrowLeftToLine, X } from "lucide-react"
import { moveTask, deleteTask } from "@/lib/task-mutations"
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"
import type { Task, TaskStatus } from "@/lib/db"

interface TaskActionButtonsProps {
  task: Task
  currentStatus: TaskStatus
  scopeId: string | null
}

type ActionConfig = {
  icon: React.ComponentType<{ className?: string }>
  targetStatus: TaskStatus | "delete"
  title: string
  variant: "primary" | "secondary" | "muted"
}

const actionsPerStatus: Record<TaskStatus, ActionConfig[]> = {
  now: [
    { icon: Check, targetStatus: "done", title: "Done", variant: "primary" },
    { icon: ArrowRight, targetStatus: "later", title: "Later", variant: "secondary" },
    { icon: ArrowRightToLine, targetStatus: "backlog", title: "Backlog", variant: "secondary" },
    { icon: X, targetStatus: "delete", title: "Delete", variant: "muted" },
  ],
  later: [
    { icon: ArrowLeft, targetStatus: "now", title: "Now", variant: "primary" },
    { icon: ArrowRight, targetStatus: "backlog", title: "Backlog", variant: "secondary" },
    { icon: X, targetStatus: "delete", title: "Delete", variant: "muted" },
  ],
  backlog: [
    { icon: ArrowLeftToLine, targetStatus: "now", title: "Now", variant: "primary" },
    { icon: ArrowLeft, targetStatus: "later", title: "Later", variant: "secondary" },
    { icon: X, targetStatus: "delete", title: "Delete", variant: "muted" },
  ],
  done: [
    { icon: ArrowLeftToLine, targetStatus: "now", title: "Now", variant: "primary" },
    { icon: X, targetStatus: "delete", title: "Delete", variant: "muted" },
  ],
}

const variantClasses: Record<string, string> = {
  primary: "text-primary hover:text-primary",
  secondary: "text-muted-foreground hover:text-foreground",
  muted: "text-muted-foreground hover:text-foreground",
}

export function TaskActionButtons({ task, currentStatus, scopeId }: TaskActionButtonsProps) {
  const actions = actionsPerStatus[currentStatus] || []

  const handleAction = async (targetStatus: TaskStatus | "delete") => {
    if (targetStatus === "delete") {
      await deleteTask(task.id, currentStatus, scopeId)
    } else {
      await moveTask(task.id, currentStatus, targetStatus, scopeId)
    }
  }

  return (
    <div className="flex items-center gap-0.5">
      {actions.map(({ icon: Icon, targetStatus, title, variant }) => (
        <Tooltip key={targetStatus}>
          <TooltipTrigger asChild>
            <button
              onClick={() => handleAction(targetStatus)}
              className={cn(
                "flex h-6 w-6 items-center justify-center rounded transition-colors",
                "hover:bg-muted",
                variantClasses[variant]
              )}
            >
              <Icon className="h-3.5 w-3.5" />
            </button>
          </TooltipTrigger>
          <TooltipContent side="bottom">{title}</TooltipContent>
        </Tooltip>
      ))}
    </div>
  )
}

// Export action configs for batch action bar
export { actionsPerStatus }
export type { ActionConfig }
