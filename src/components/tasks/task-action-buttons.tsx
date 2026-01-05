"use client"

import { Check, ArrowRight, ArrowRightToLine, ArrowLeft, ArrowLeftToLine, X } from "lucide-react"
import { setTaskPendingAction } from "@/lib/task-mutations"
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"
import type { Task, TaskStatus } from "@/lib/db"

interface TaskActionButtonsProps {
  task: Task
  currentStatus: TaskStatus
}

type ActionVariant = "primary" | "secondary" | "muted"

type ActionConfig = {
  icon: React.ComponentType<{ className?: string }>
  action: TaskStatus | "delete"
  title: string
  variant: ActionVariant
}

// Action configurations per status
// Primary = main action for this list, Secondary = other movements, Muted = delete
const actionsPerStatus: Record<TaskStatus, ActionConfig[]> = {
  now: [
    { icon: Check, action: "done", title: "Mark done", variant: "primary" },
    { icon: ArrowRight, action: "later", title: "Move to Later", variant: "secondary" },
    { icon: ArrowRightToLine, action: "backlog", title: "Move to Backlog", variant: "secondary" },
    { icon: X, action: "delete", title: "Delete", variant: "muted" },
  ],
  later: [
    { icon: ArrowLeft, action: "now", title: "Move to Now", variant: "primary" },
    { icon: ArrowRight, action: "backlog", title: "Move to Backlog", variant: "secondary" },
    { icon: X, action: "delete", title: "Delete", variant: "muted" },
  ],
  backlog: [
    { icon: ArrowLeftToLine, action: "now", title: "Move to Now", variant: "primary" },
    { icon: ArrowLeft, action: "later", title: "Move to Later", variant: "secondary" },
    { icon: X, action: "delete", title: "Delete", variant: "muted" },
  ],
  done: [
    { icon: ArrowLeftToLine, action: "now", title: "Move to Now", variant: "primary" },
    { icon: X, action: "delete", title: "Delete", variant: "muted" },
  ],
}

// Default icon color classes by variant (non-active state)
// Primary CTA shows its color, others are neutral/muted
const variantClasses: Record<ActionVariant, string> = {
  primary: "text-primary hover:text-primary",
  secondary: "text-muted-foreground hover:text-foreground",
  muted: "text-muted-foreground hover:text-foreground",
}

// Active state classes by variant (filled background)
const activeVariantClasses: Record<ActionVariant, string> = {
  primary: "bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground",
  secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/90",
  muted: "bg-muted text-muted-foreground hover:bg-muted/90",
}

export function TaskActionButtons({ task, currentStatus }: TaskActionButtonsProps) {
  const actions = actionsPerStatus[currentStatus] || []

  const handleAction = async (action: TaskStatus | "delete") => {
    await setTaskPendingAction(task.id, action)
  }

  return (
    <div className="flex items-center gap-0.5">
      {actions.map(({ icon: Icon, action, title, variant }) => (
        <Tooltip key={action}>
          <TooltipTrigger asChild>
            <button
              onClick={() => handleAction(action)}
              className={cn(
                "flex h-7 w-7 items-center justify-center rounded transition-colors",
                "hover:bg-muted",
                variantClasses[variant]
              )}
            >
              <Icon className="h-4 w-4" />
            </button>
          </TooltipTrigger>
          <TooltipContent side="bottom">{title}</TooltipContent>
        </Tooltip>
      ))}
    </div>
  )
}

/**
 * Single action indicator for pending state - clickable to clear the action
 */
export function PendingActionIndicator({
  task,
  currentStatus,
}: {
  task: Task
  currentStatus: TaskStatus
}) {
  const action = task.pendingAction
  if (!action) return null

  const config = actionsPerStatus[currentStatus]?.find((a) => a.action === action)
  if (!config) return null

  const Icon = config.icon

  const handleClear = async () => {
    await setTaskPendingAction(task.id, null)
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          onClick={handleClear}
          className={cn(
            "flex h-7 w-7 items-center justify-center rounded",
            activeVariantClasses[config.variant]
          )}
        >
          <Icon className="h-4 w-4" />
        </button>
      </TooltipTrigger>
      <TooltipContent side="bottom">Clear</TooltipContent>
    </Tooltip>
  )
}
