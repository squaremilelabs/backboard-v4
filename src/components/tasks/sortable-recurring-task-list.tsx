"use client"

import { useEffect } from "react"
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable"
import { DraggableRecurringTaskItem } from "./draggable-recurring-task-item"
import { useTaskDnd } from "./task-dnd-provider"
import type { RecurringTask } from "@/lib/db"

interface SortableRecurringTaskListProps {
  tasks: RecurringTask[]
  scopeId: string
  themeClass?: string
}

export function SortableRecurringTaskList({
  tasks,
  scopeId,
  themeClass,
}: SortableRecurringTaskListProps) {
  const { registerRecurringTaskList, unregisterRecurringTaskList } = useTaskDnd()

  // Register this list with the provider so drag end handler has access to tasks
  useEffect(() => {
    registerRecurringTaskList(scopeId, tasks)
    return () => unregisterRecurringTaskList(scopeId)
  }, [scopeId, tasks, registerRecurringTaskList, unregisterRecurringTaskList])

  const taskIds = tasks.map((t) => t.id)

  return (
    <SortableContext items={taskIds} strategy={verticalListSortingStrategy}>
      <div className="flex flex-col">
        {tasks.map((task) => (
          <DraggableRecurringTaskItem key={task.id} task={task} themeClass={themeClass} />
        ))}
      </div>
    </SortableContext>
  )
}
