"use client"

import { useState, useRef } from "react"
import { Plus, GripVertical } from "lucide-react"
import { createRecurringTask } from "@/lib/recurring-task-mutations"
import { cn } from "@/lib/utils"
import { Input } from "@/components/ui/input"

interface AddRecurringTaskInputProps {
  scopeId: string
}

export function AddRecurringTaskInput({ scopeId }: AddRecurringTaskInputProps) {
  const [isAdding, setIsAdding] = useState(false)
  const [value, setValue] = useState("")
  const inputRef = useRef<HTMLInputElement>(null)

  const handleStartAdding = () => {
    setIsAdding(true)
    // Focus after state update
    setTimeout(() => inputRef.current?.focus(), 0)
  }

  const handleSave = async () => {
    const trimmed = value.trim()
    if (trimmed) {
      await createRecurringTask(trimmed, scopeId)
      setValue("")
      // Keep input focused for rapid entry
      inputRef.current?.focus()
    } else {
      setIsAdding(false)
      setValue("")
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSave()
    } else if (e.key === "Escape") {
      setIsAdding(false)
      setValue("")
    }
  }

  const handleBlur = () => {
    // Small delay to allow Enter key to fire first
    setTimeout(() => {
      if (!value.trim()) {
        setIsAdding(false)
        setValue("")
      }
    }, 100)
  }

  if (!isAdding) {
    return (
      <button
        onClick={handleStartAdding}
        className={cn(
          "flex w-full items-center gap-2 px-4 py-3 text-sm",
          "text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground"
        )}
      >
        {/* Grip placeholder for alignment */}
        <Plus className="h-4 w-4" />
        <span>Add</span>
      </button>
    )
  }

  return (
    <div className="flex items-center gap-2 px-4 py-2">
      {/* Grip placeholder for alignment */}
      <GripVertical className="h-4 w-4 shrink-0 opacity-0" />

      {/* Input */}
      <Input
        ref={inputRef}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={handleBlur}
        placeholder="Task title..."
        className="h-7 flex-1 px-2 py-1"
      />
    </div>
  )
}
