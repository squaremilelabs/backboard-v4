"use client"

import { useSortable } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { RecurringTaskItem } from "./recurring-task-item"
import type { RecurringTask } from "@/lib/db"

interface DraggableRecurringTaskItemProps {
  task: RecurringTask
  themeClass?: string
}

export function DraggableRecurringTaskItem({ task, themeClass }: DraggableRecurringTaskItemProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: task.id,
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <div ref={setNodeRef} style={style}>
      <RecurringTaskItem
        task={task}
        themeClass={themeClass}
        dragHandleProps={{ ...attributes, ...listeners }}
      />
    </div>
  )
}
