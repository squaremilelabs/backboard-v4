"use client"

import { useEffect } from "react"
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable"
import { DraggableTaskItem } from "./draggable-task-item"
import { useTaskDnd } from "./task-dnd-provider"
import type { Task, TaskStatus } from "@/lib/db"

interface SortableTaskListProps {
  tasks: Task[]
  scopeId: string | null
  status: TaskStatus
  themeClass?: string
}

export function SortableTaskList({ tasks, scopeId, status, themeClass }: SortableTaskListProps) {
  const { registerTaskList, unregisterTaskList } = useTaskDnd()

  useEffect(() => {
    registerTaskList(scopeId, status, tasks)
    return () => unregisterTaskList(scopeId, status)
  }, [scopeId, status, tasks, registerTaskList, unregisterTaskList])

  const taskIds = tasks.map((t) => t.id)

  return (
    <SortableContext items={taskIds} strategy={verticalListSortingStrategy}>
      <div className="flex flex-col">
        {tasks.map((task) => (
          <DraggableTaskItem
            key={task.id}
            task={task}
            currentStatus={status}
            scopeId={scopeId}
            themeClass={themeClass}
          />
        ))}
      </div>
    </SortableContext>
  )
}
