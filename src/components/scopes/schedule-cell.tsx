"use client"

import { Plus, X } from "lucide-react"
import { cn } from "@/lib/utils"

type CellState = "empty" | "active" | "inherited" | "default"

interface ScheduleCellProps {
  state: CellState
  onClick: () => void
}

export function ScheduleCell({ state, onClick }: ScheduleCellProps) {
  const isActive = state === "active"
  const isInherited = state === "inherited"
  const isDefault = state === "default"
  const isEmpty = state === "empty"

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        `group/cell relative flex h-8 w-full items-center justify-center rounded-xl
        transition-colors`,
        // Empty: dashed gray border
        isEmpty && "border border-muted-foreground/20 hover:border-primary/50 hover:bg-primary/10",
        // Default: solid primary border (indicates default-scheduled but not selected)
        isDefault && "border border-primary/50 hover:bg-primary/10",
        // Active: filled
        isActive && "bg-primary hover:bg-primary/80",
        // Inherited: secondary fill
        isInherited && "bg-secondary hover:bg-secondary/80"
      )}
    >
      {/* Hover icon: Plus for empty/default/inherited, X for active */}
      <span
        className={cn(
          "opacity-0 transition-opacity group-hover/cell:opacity-100",
          isActive ? "text-primary-foreground" : "text-primary"
        )}
      >
        {isActive ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
      </span>
    </button>
  )
}
