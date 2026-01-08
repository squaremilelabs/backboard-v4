"use client"

import { useState, useRef, useEffect } from "react"
import { GripVertical } from "lucide-react"
import { TaskActionButtons } from "./task-action-buttons"
import { TaskCheckbox } from "./task-checkbox"
import { useTaskSelection } from "@/hooks/use-task-selection"
import { updateTaskTitle } from "@/lib/task-mutations"
import { cn } from "@/lib/utils"
import { Input } from "@/components/ui/input"
import type { Task, TaskStatus } from "@/lib/db"

interface TaskItemProps {
  task: Task
  currentStatus: TaskStatus
  scopeId: string | null
  themeClass?: string
  dragHandleProps?: React.HTMLAttributes<HTMLDivElement>
}

export function TaskItem({
  task,
  currentStatus,
  scopeId,
  themeClass,
  dragHandleProps,
}: TaskItemProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [editValue, setEditValue] = useState(task.title)
  const inputRef = useRef<HTMLInputElement>(null)
  const [isHovered, setIsHovered] = useState(false)

  const { isSelected, toggle } = useTaskSelection()
  const checked = isSelected(task.id)

  // Focus input when entering edit mode
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus()
      inputRef.current.select()
    }
  }, [isEditing])

  const startEditing = () => {
    setEditValue(task.title)
    setIsEditing(true)
  }

  const handleSave = async () => {
    const trimmed = editValue.trim()
    if (trimmed && trimmed !== task.title) {
      await updateTaskTitle(task.id, trimmed)
    }
    setIsEditing(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSave()
    } else if (e.key === "Escape") {
      setIsEditing(false)
    }
  }

  return (
    <div
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={cn(
        "group flex min-h-10 items-center gap-2 py-2 pl-2 pr-3",
        "transition-colors",
        checked && "bg-muted/50",
        !checked && "hover:bg-muted/30",
        themeClass
      )}
    >
      {/* Drag handle (left, always visible but muted) */}
      <div
        {...dragHandleProps}
        className={cn(
          "flex h-6 w-6 shrink-0 cursor-grab items-center justify-center rounded",
          "hover:bg-muted active:cursor-grabbing"
        )}
      >
        <GripVertical className="h-3.5 w-3.5 text-muted-foreground/50" />
      </div>

      {/* Checkbox */}
      <TaskCheckbox checked={checked} onChange={() => toggle(task.id)} />

      {/* Task title - editable (center, flex-1) */}
      <div className="min-w-0 flex-1">
        {isEditing ? (
          <Input
            ref={inputRef}
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onBlur={handleSave}
            onKeyDown={handleKeyDown}
            className="h-7 px-2 py-1"
          />
        ) : (
          <span
            onClick={startEditing}
            className={cn(
              "block cursor-text truncate text-sm",
              "-mx-1 rounded px-1",
              "hover:bg-muted"
            )}
          >
            {task.title}
          </span>
        )}
      </div>

      {/* Right side: action buttons (on hover, desktop only) */}
      <div
        className={cn(
          "hidden transition-opacity md:block",
          isHovered ? "opacity-100" : "opacity-0"
        )}
      >
        <TaskActionButtons task={task} currentStatus={currentStatus} scopeId={scopeId} />
      </div>
    </div>
  )
}
