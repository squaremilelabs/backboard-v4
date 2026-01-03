"use client"

import { Plus, X } from "lucide-react"
import { cn } from "@/lib/utils"

type CellState = "empty" | "active" | "inherited"

interface ScheduleCellProps {
  state: CellState
  onClick: () => void
}

export function ScheduleCell({ state, onClick }: ScheduleCellProps) {
  const isActive = state === "active"
  const isInherited = state === "inherited"
  const isEmpty = state === "empty"

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "group/cell relative flex h-8 w-full items-center justify-center rounded transition-colors",
        // Base states
        isEmpty &&
          `border border-dashed border-muted-foreground/20 hover:border-primary/50
          hover:bg-primary/10`,
        isActive && "bg-primary hover:bg-primary/80",
        isInherited && "bg-secondary hover:bg-secondary/80"
      )}
    >
      {/* Hover icon: Plus for empty/inherited, X for active */}
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
