"use client"

import { useState, useRef, useEffect } from "react"
import { MoreHorizontal } from "lucide-react"
import { useIsMobile } from "@/hooks/use-media-query"
import { updateScopeTitle } from "@/lib/scope-mutations"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import type { Scope } from "@/lib/db"

interface ScopeGridRowProps {
  scope: Scope
  isNested?: boolean
  onOpenModal: (scope: Scope) => void
}

export function ScopeGridRow({ scope, isNested = false, onOpenModal }: ScopeGridRowProps) {
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
  // For projects: parent = hollow dot, child = filled dot
  // For jobs: always filled dot
  const dotStyle = isJob
    ? "bg-primary"
    : isNested
      ? "bg-primary"
      : "border-2 border-primary bg-transparent"

  // Jobs have 7 columns (days), Projects have 6 columns (months)
  const cellCount = isJob ? 7 : 6

  return (
    <div
      className={cn(
        "group flex min-w-0 items-center transition-colors hover:bg-muted/50",
        isMobile && "cursor-pointer"
      )}
      onClick={handleRowClick}
    >
      {/* Title cell - fixed width, sticky on scroll */}
      <div
        className={cn(
          "sticky left-0 z-10 flex w-2xs shrink-0 items-center gap-2 px-4 py-2",
          "bg-background group-hover:bg-muted/50"
        )}
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

      {/* Grid cells - desktop only */}
      {!isMobile && (
        <div className="flex flex-1 items-center px-2">
          {Array.from({ length: cellCount }).map((_, i) => (
            <div key={i} className="flex-1 px-1 py-1">
              <div
                className="h-8 rounded border border-dashed border-muted-foreground/20"
                title="Coming soon"
              />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
