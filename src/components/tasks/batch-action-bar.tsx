"use client"

import { Check, ArrowRight, ArrowRightToLine, ArrowLeft, ArrowLeftToLine, X } from "lucide-react"
import { TaskCheckbox } from "./task-checkbox"
import { useTaskSelection } from "@/hooks/use-task-selection"
import { batchMoveTasks, batchDeleteTasks } from "@/lib/task-mutations"
import { Button } from "@/components/ui/button"
import type { TaskStatus } from "@/lib/db"

interface BatchActionBarProps {
  taskIds: string[] // All task IDs in current list (for select all)
  currentStatus: TaskStatus
  scopeId: string | null
}

type BatchAction = {
  icon: React.ComponentType<{ className?: string }>
  label: string
  targetStatus: TaskStatus | "delete"
  variant: "default" | "secondary" | "destructive"
}

const batchActionsPerStatus: Record<TaskStatus, BatchAction[]> = {
  now: [
    { icon: Check, label: "Done", targetStatus: "done", variant: "default" },
    { icon: ArrowRight, label: "Later", targetStatus: "later", variant: "secondary" },
    { icon: ArrowRightToLine, label: "Backlog", targetStatus: "backlog", variant: "secondary" },
    { icon: X, label: "Delete", targetStatus: "delete", variant: "destructive" },
  ],
  later: [
    { icon: ArrowLeft, label: "Now", targetStatus: "now", variant: "default" },
    { icon: ArrowRight, label: "Backlog", targetStatus: "backlog", variant: "secondary" },
    { icon: X, label: "Delete", targetStatus: "delete", variant: "destructive" },
  ],
  backlog: [
    { icon: ArrowLeftToLine, label: "Now", targetStatus: "now", variant: "default" },
    { icon: ArrowLeft, label: "Later", targetStatus: "later", variant: "secondary" },
    { icon: X, label: "Delete", targetStatus: "delete", variant: "destructive" },
  ],
  done: [
    { icon: ArrowLeftToLine, label: "Now", targetStatus: "now", variant: "default" },
    { icon: X, label: "Delete", targetStatus: "delete", variant: "destructive" },
  ],
}

export function BatchActionBar({ taskIds, currentStatus, scopeId }: BatchActionBarProps) {
  const { selectedIds, toggleAll, deselectAll } = useTaskSelection()

  // Get selected IDs that are in the current list
  const selectedInList = taskIds.filter((id) => selectedIds.has(id))
  const selectedCount = selectedInList.length

  if (selectedCount === 0) return null

  const allSelected = taskIds.length > 0 && taskIds.every((id) => selectedIds.has(id))
  const actions = batchActionsPerStatus[currentStatus] || []

  const handleAction = async (targetStatus: TaskStatus | "delete") => {
    if (targetStatus === "delete") {
      await batchDeleteTasks(selectedInList, currentStatus, scopeId)
    } else {
      await batchMoveTasks(selectedInList, currentStatus, targetStatus, scopeId)
    }
    deselectAll()
  }

  return (
    <div className="overflow-x-auto border-t bg-background">
      <div className="flex items-center gap-4 px-4 py-3">
        {/* Select all checkbox */}
        <div className="flex shrink-0 items-center gap-2">
          <TaskCheckbox checked={allSelected} onChange={() => toggleAll(taskIds)} />
          <span className="whitespace-nowrap text-sm text-muted-foreground">
            {selectedCount} selected
          </span>
        </div>

        {/* Spacer (hidden on mobile to allow scroll) */}
        <div className="hidden flex-1 md:block" />

        {/* Action buttons */}
        <div className="flex shrink-0 items-center gap-2">
          {actions.map(({ icon: Icon, label, targetStatus, variant }) => (
            <Button
              key={targetStatus}
              variant={variant === "destructive" ? "ghost" : variant}
              size="sm"
              onClick={() => handleAction(targetStatus)}
              className={
                variant === "destructive"
                  ? "shrink-0 gap-1.5 text-muted-foreground hover:bg-destructive hover:text-white"
                  : "shrink-0 gap-1.5"
              }
            >
              <Icon className="h-4 w-4" />
              {label}
            </Button>
          ))}
        </div>

        {/* Cancel button */}
        <Button variant="ghost" size="sm" onClick={deselectAll} className="shrink-0">
          Cancel
        </Button>
      </div>
    </div>
  )
}
