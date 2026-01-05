"use client"

import { useState, useRef, useEffect } from "react"
import { GripVertical, ArrowLeftToLine, X } from "lucide-react"
import {
  updateRecurringTaskTitle,
  updateRecurringTaskFrequency,
  setRecurringTaskPendingAction,
  setUserTimezone,
} from "@/lib/recurring-task-mutations"
import { useUserTimezone } from "@/hooks/use-recurring-tasks"
import { Input } from "@/components/ui/input"
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip"
import { FrequencyIndicator } from "./frequency-indicator"
import { FrequencyPicker } from "./frequency-picker"
import { cn } from "@/lib/utils"
import type { RecurringTask, FrequencyValue, RecurringTaskAction } from "@/lib/db"

interface RecurringTaskItemProps {
  task: RecurringTask
  themeClass?: string
}

export function RecurringTaskItem({ task, themeClass }: RecurringTaskItemProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [editValue, setEditValue] = useState(task.title)
  const inputRef = useRef<HTMLInputElement>(null)
  const [isHovered, setIsHovered] = useState(false)
  const userTimezone = useUserTimezone()

  const hasPendingAction = task.pendingAction != null
  const isPendingDelete = task.pendingAction === "delete"

  // Focus input when entering edit mode
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus()
      inputRef.current.select()
    }
  }, [isEditing])

  // Sync edit value when task changes externally
  useEffect(() => {
    if (!isEditing) {
      setEditValue(task.title)
    }
  }, [task.title, isEditing])

  const startEditing = () => {
    if (isPendingDelete) return // Don't allow editing if pending delete
    setEditValue(task.title)
    setIsEditing(true)
  }

  const handleSave = async () => {
    const trimmed = editValue.trim()
    if (trimmed && trimmed !== task.title) {
      await updateRecurringTaskTitle(task.id, trimmed)
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

  const handleFrequencyChange = async (frequency: FrequencyValue[]) => {
    await updateRecurringTaskFrequency(task.id, frequency)
  }

  const handleTimezoneChange = async (timezone: string) => {
    await setUserTimezone(timezone)
  }

  const handleAction = async (action: RecurringTaskAction) => {
    await setRecurringTaskPendingAction(task.id, action)
  }

  const handleClearPending = async () => {
    await setRecurringTaskPendingAction(task.id, null)
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
        themeClass
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

      {/* Action buttons - ALWAYS rendered for stable layout, visibility controlled */}
      <div
        className={cn(
          "flex items-center gap-0.5",
          // Show when hovered or has pending action, hide otherwise
          !isHovered && !hasPendingAction && "invisible"
        )}
      >
        {hasPendingAction ? (
          <RecurringTaskPendingIndicator
            action={task.pendingAction!}
            onClear={handleClearPending}
          />
        ) : (
          <RecurringTaskActionButtons onAction={handleAction} />
        )}
      </div>

      {/* Frequency indicator - ALWAYS on far right */}
      <FrequencyPicker
        frequency={task.frequency}
        userTimezone={userTimezone}
        onFrequencyChange={handleFrequencyChange}
        onTimezoneChange={handleTimezoneChange}
        trigger={<FrequencyIndicator frequency={task.frequency} />}
        themeClass={themeClass}
      />
    </div>
  )
}

interface RecurringTaskActionButtonsProps {
  onAction: (action: RecurringTaskAction) => void
}

function RecurringTaskActionButtons({ onAction }: RecurringTaskActionButtonsProps) {
  return (
    <>
      {/* Insert to Now - primary action */}
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            onClick={() => onAction("insert")}
            className={cn(
              "flex h-7 w-7 items-center justify-center rounded transition-colors",
              "text-primary hover:bg-muted hover:text-primary"
            )}
          >
            <ArrowLeftToLine className="h-4 w-4" />
          </button>
        </TooltipTrigger>
        <TooltipContent side="bottom">Insert to Now</TooltipContent>
      </Tooltip>

      {/* Delete - muted */}
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            onClick={() => onAction("delete")}
            className={cn(
              "flex h-7 w-7 items-center justify-center rounded transition-colors",
              "text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
          >
            <X className="h-4 w-4" />
          </button>
        </TooltipTrigger>
        <TooltipContent side="bottom">Delete</TooltipContent>
      </Tooltip>
    </>
  )
}

interface RecurringTaskPendingIndicatorProps {
  action: RecurringTaskAction
  onClear: () => void
}

function RecurringTaskPendingIndicator({ action, onClear }: RecurringTaskPendingIndicatorProps) {
  const isInsert = action === "insert"
  const Icon = isInsert ? ArrowLeftToLine : X

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          onClick={onClear}
          className={cn(
            "flex h-7 w-7 items-center justify-center rounded",
            isInsert
              ? "bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground"
              : "bg-muted text-muted-foreground hover:bg-muted/90"
          )}
        >
          <Icon className="h-4 w-4" />
        </button>
      </TooltipTrigger>
      <TooltipContent side="bottom">Clear</TooltipContent>
    </Tooltip>
  )
}
