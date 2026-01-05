"use client"

import { useState, useRef, useEffect } from "react"
import { GripVertical } from "lucide-react"
import { TaskActionButtons, PendingActionIndicator } from "./task-action-buttons"
import { updateTaskTitle } from "@/lib/task-mutations"
import { cn } from "@/lib/utils"
import { Input } from "@/components/ui/input"
import type { Task, TaskStatus } from "@/lib/db"

interface TaskItemProps {
  task: Task
  currentStatus: TaskStatus
  themeClass?: string
  dragHandleProps?: React.HTMLAttributes<HTMLDivElement>
}

export function TaskItem({ task, currentStatus, themeClass, dragHandleProps }: TaskItemProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [editValue, setEditValue] = useState(task.title)
  const inputRef = useRef<HTMLInputElement>(null)
  const [isHovered, setIsHovered] = useState(false)

  const hasPendingAction = task.pendingAction != null
  const isPendingDelete = task.pendingAction === "delete"

  // Focus input when entering edit mode
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus()
      inputRef.current.select()
    }
  }, [isEditing])

  const startEditing = () => {
    if (isPendingDelete) return // Don't allow editing if pending delete
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
        "group flex min-h-10 items-center gap-2 px-4 py-2",
        "transition-colors",
        // Pending action background
        hasPendingAction && !isPendingDelete && "bg-muted",
        // Pending delete: faded background
        isPendingDelete && "bg-muted/50",
        // Hover state (only when no pending action)
        !hasPendingAction && "hover:bg-muted/50",
        // Apply theme for colored actions
        themeClass
      )}
    >
      {/* Drag handle */}
      <div
        {...dragHandleProps}
        className="flex h-8 w-8 shrink-0 cursor-grab items-center justify-center rounded
          hover:bg-muted active:cursor-grabbing"
      >
        <GripVertical className="h-4 w-4 text-muted-foreground/50" />
      </div>

      {/* Task title - editable */}
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
              !isPendingDelete && "hover:bg-muted",
              // Strikethrough for pending delete
              isPendingDelete && "text-muted-foreground line-through"
            )}
          >
            {task.title}
          </span>
        )}
      </div>

      {/* Action buttons or pending indicator */}
      {hasPendingAction ? (
        // Show pending indicator (clickable to clear)
        <PendingActionIndicator task={task} currentStatus={currentStatus} />
      ) : isHovered ? (
        // Show full action bar when hovered and no pending action
        <TaskActionButtons task={task} currentStatus={currentStatus} />
      ) : (
        // Empty placeholder to maintain layout
        <div className="h-7 w-7" />
      )}
    </div>
  )
}
