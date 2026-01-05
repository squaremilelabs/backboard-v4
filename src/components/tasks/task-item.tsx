"use client"

import { useState, useRef, useEffect } from "react"
import { GripVertical } from "lucide-react"
import { updateTaskTitle } from "@/lib/task-mutations"
import { cn } from "@/lib/utils"
import { Input } from "@/components/ui/input"
import type { Task } from "@/lib/db"

interface TaskItemProps {
  task: Task
}

export function TaskItem({ task }: TaskItemProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [editValue, setEditValue] = useState(task.title)
  const inputRef = useRef<HTMLInputElement>(null)

  // Focus input when entering edit mode
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus()
      inputRef.current.select()
    }
  }, [isEditing])

  const startEditing = () => {
    // Reset to current task title when starting edit
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
      className={cn(
        "group flex min-h-10 items-center gap-2 px-4 py-2",
        "transition-colors hover:bg-muted/50"
      )}
    >
      {/* Drag handle - for future drag-and-drop */}
      <GripVertical className="h-4 w-4 shrink-0 cursor-grab text-muted-foreground/50" />

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
              "-mx-1 rounded px-1 hover:bg-muted"
            )}
          >
            {task.title}
          </span>
        )}
      </div>

      {/* Action buttons placeholder - for future implementation */}
      {/* Will contain: done, forward, back, delete buttons */}
    </div>
  )
}
