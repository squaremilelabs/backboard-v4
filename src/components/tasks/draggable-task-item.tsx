"use client"

import { useSortable } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { TaskItem } from "./task-item"
import type { Task, TaskStatus } from "@/lib/db"

interface DraggableTaskItemProps {
  task: Task
  currentStatus: TaskStatus
  themeClass?: string
}

export function DraggableTaskItem({ task, currentStatus, themeClass }: DraggableTaskItemProps) {
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
      <TaskItem
        task={task}
        currentStatus={currentStatus}
        themeClass={themeClass}
        dragHandleProps={{ ...attributes, ...listeners }}
      />
    </div>
  )
}
