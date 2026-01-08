"use client"

import { useSortable } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { TaskItem } from "./task-item"
import { useTaskSelection } from "@/hooks/use-task-selection"
import { cn } from "@/lib/utils"
import type { Task, TaskStatus } from "@/lib/db"

interface DraggableTaskItemProps {
  task: Task
  currentStatus: TaskStatus
  scopeId: string | null
  themeClass?: string
}

export function DraggableTaskItem({
  task,
  currentStatus,
  scopeId,
  themeClass,
}: DraggableTaskItemProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: task.id,
  })

  const { selectedIds, isSelected } = useTaskSelection()
  const isThisSelected = isSelected(task.id)

  // Count how many selected items are being dragged with this one
  const selectedCount = selectedIds.size
  const showDragCount = isDragging && isThisSelected && selectedCount > 1

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <div ref={setNodeRef} style={style} className="relative">
      <TaskItem
        task={task}
        currentStatus={currentStatus}
        scopeId={scopeId}
        themeClass={themeClass}
        dragHandleProps={{ ...attributes, ...listeners }}
      />

      {/* Multi-drag count badge */}
      {showDragCount && (
        <span
          className={cn(
            "absolute -top-2 -right-2 z-10",
            "flex h-5 min-w-5 items-center justify-center rounded-full",
            "bg-primary text-xs font-medium text-primary-foreground",
            "px-1.5"
          )}
        >
          {selectedCount}
        </span>
      )}
    </div>
  )
}
