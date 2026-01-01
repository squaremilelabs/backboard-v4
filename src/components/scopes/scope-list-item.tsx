"use client"

import { useState, useRef, useEffect } from "react"
import { MoreHorizontal } from "lucide-react"
import { useIsMobile } from "@/hooks/use-media-query"
import { updateScopeTitle } from "@/lib/scope-mutations"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import type { Scope } from "@/lib/db"

interface ScopeListItemProps {
  scope: Scope
  isNested?: boolean
  onOpenModal: (scope: Scope) => void
}

export function ScopeListItem({ scope, isNested = false, onOpenModal }: ScopeListItemProps) {
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
      setEditValue(scope.title) // Reset if empty or unchanged
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

  return (
    <div
      className={cn(
        "group flex min-w-0 items-center gap-2 rounded-md px-4 py-2 transition-colors",
        "hover:bg-accent",
        isNested && "ml-6",
        isMobile && "cursor-pointer"
      )}
      onClick={handleRowClick}
    >
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
              "block truncate text-sm font-medium",
              !isMobile && "-mx-1 cursor-text rounded px-1 hover:bg-muted/50"
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
          className="h-7 w-7 opacity-0 transition-opacity group-hover:opacity-100"
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
  )
}
