"use client"

import { useState, useRef, useEffect } from "react"
import { MoreHorizontal } from "lucide-react"
import { ScheduleCell } from "./schedule-cell"
import { useIsMobile } from "@/hooks/use-media-query"
import { WEEKDAYS, getNext6Months } from "@/hooks/use-schedule-slots"
import { updateScopeTitle } from "@/lib/scope-mutations"
import { toggleDefaultScheduleSlot, toggleMonthSlot } from "@/lib/schedule-mutations"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import type { Scope } from "@/lib/db"

interface ScopeGridRowProps {
  scope: Scope
  isNested?: boolean
  onOpenModal: (scope: Scope) => void
  // For jobs: Set of "jobId:weekday" keys
  defaultScheduleSlots?: Set<string>
  // For projects: Set of "projectId:month" keys
  monthSlots?: Set<string>
  // For projects: child project IDs for inheritance calculation
  childIds?: string[]
}

export function ScopeGridRow({
  scope,
  isNested = false,
  onOpenModal,
  defaultScheduleSlots,
  monthSlots,
  childIds = [],
}: ScopeGridRowProps) {
  const isMobile = useIsMobile()
  const [isEditing, setIsEditing] = useState(false)
  const [editValue, setEditValue] = useState(scope.title)
  const inputRef = useRef<HTMLInputElement>(null)

  // Focus input when entering edit mode
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus()
      inputRef.current.select()
    }
  }, [isEditing])

  const handleSave = async () => {
    if (editValue.trim() && editValue.trim() !== scope.title) {
      await updateScopeTitle(scope.id, editValue.trim())
    } else {
      setEditValue(scope.title)
    }
    setIsEditing(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSave()
    } else if (e.key === "Escape") {
      setEditValue(scope.title)
      setIsEditing(false)
    }
  }

  const handleRowClick = () => {
    if (isMobile) {
      onOpenModal(scope)
    }
  }

  const handleTitleClick = (e: React.MouseEvent) => {
    if (!isMobile) {
      e.stopPropagation()
      setIsEditing(true)
    }
  }

  const isJob = scope.type === "job"
  // For projects: parent = filled dot, child = outlined dot
  // For jobs: always filled dot
  const dotStyle = isJob
    ? "bg-primary"
    : isNested
      ? "border-2 border-primary bg-transparent"
      : "bg-primary"

  // Calculate cell states and render cells
  const renderCells = () => {
    if (isJob) {
      // Jobs: 7 weekday cells
      return WEEKDAYS.map((weekday) => {
        const key = `${scope.id}:${weekday}`
        const isActive = defaultScheduleSlots?.has(key) ?? false

        return (
          <div key={weekday} className="min-w-18 flex-1 px-1 py-1">
            <ScheduleCell
              state={isActive ? "active" : "empty"}
              onClick={() => toggleDefaultScheduleSlot(scope.id, weekday)}
            />
          </div>
        )
      })
    } else {
      // Projects: 6 month cells
      const months = getNext6Months()
      return months.map(({ key: month }) => {
        const selfKey = `${scope.id}:${month}`
        const isActive = monthSlots?.has(selfKey) ?? false

        // Check for inherited state (parent with active children)
        let isInherited = false
        if (!isNested && !isActive && childIds.length > 0 && monthSlots) {
          // Check if any child has this month active
          isInherited = childIds.some((childId) => monthSlots.has(`${childId}:${month}`))
        }

        const state = isActive ? "active" : isInherited ? "inherited" : "empty"

        return (
          <div key={month} className="min-w-10 flex-1 px-1 py-1">
            <ScheduleCell state={state} onClick={() => toggleMonthSlot(scope.id, month)} />
          </div>
        )
      })
    }
  }

  return (
    <div className="group flex min-w-0 items-center">
      {/* Title cell - fixed width, clickable on mobile */}
      <div
        className={cn(
          "flex w-64 shrink-0 items-center gap-2 bg-background px-4 py-2",
          isMobile && "cursor-pointer"
        )}
        onClick={handleRowClick}
      >
        {/* Indentation for nested items */}
        {isNested && <div className="w-4 shrink-0" />}

        {/* Scope type indicator dot */}
        <div className={cn("h-2.5 w-2.5 shrink-0 rounded-full", dotStyle)} />

        {/* Title - editable on desktop */}
        <div className="min-w-0 flex-1">
          {isEditing && !isMobile ? (
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
              onClick={handleTitleClick}
              className={cn(
                "block truncate text-sm",
                !isMobile && "-mx-1 cursor-text rounded px-1 hover:bg-muted"
              )}
            >
              {scope.title}
            </span>
          )}
        </div>

        {/* More button - desktop only */}
        {!isMobile && (
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 shrink-0 opacity-0 transition-opacity group-hover:opacity-100"
            onClick={(e) => {
              e.stopPropagation()
              onOpenModal(scope)
            }}
          >
            <MoreHorizontal className="h-4 w-4" />
            <span className="sr-only">More options</span>
          </Button>
        )}
      </div>

      {/* Grid cells - now shown on all screen sizes */}
      <div className="flex flex-1 items-center px-2">{renderCells()}</div>
    </div>
  )
}
