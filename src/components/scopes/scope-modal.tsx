"use client"

import { useState, useEffect, useRef } from "react"
import { useIsMobile } from "@/hooks/use-media-query"
import { updateScopeTitle, archiveScope } from "@/lib/scope-mutations"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from "@/components/ui/sheet"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import type { Scope } from "@/lib/db"

interface ScopeModalProps {
  scope: Scope | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ScopeModal({ scope, open, onOpenChange }: ScopeModalProps) {
  const isMobile = useIsMobile()
  const [title, setTitle] = useState("")
  const [isEditingTitle, setIsEditingTitle] = useState(false)
  const [showArchiveConfirm, setShowArchiveConfirm] = useState(false)
  const titleInputRef = useRef<HTMLInputElement>(null)

  // Sync title when modal opens or scope changes
  useEffect(() => {
    if (open && scope) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setTitle(scope.title)
      setIsEditingTitle(false)
    }
  }, [open, scope])

  // Focus input when entering edit mode
  useEffect(() => {
    if (isEditingTitle && titleInputRef.current) {
      titleInputRef.current.focus()
      titleInputRef.current.select()
    }
  }, [isEditingTitle])

  const handleTitleSave = async () => {
    if (!scope) return
    const trimmed = title.trim()
    if (trimmed && trimmed !== scope.title) {
      await updateScopeTitle(scope.id, trimmed)
    } else {
      setTitle(scope.title) // Reset if empty or unchanged
    }
    setIsEditingTitle(false)
  }

  const handleTitleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleTitleSave()
    } else if (e.key === "Escape") {
      setTitle(scope?.title ?? "")
      setIsEditingTitle(false)
    }
  }

  const handleArchive = async () => {
    if (!scope) return
    await archiveScope(scope.id)
    setShowArchiveConfirm(false)
    onOpenChange(false)
  }

  const typeLabel = scope?.type === "job" ? "Job" : "Project"
  const isJob = scope?.type === "job"
  const isNested = !!scope?.parentId

  // Dot style: jobs = filled, projects parent = hollow, projects child = filled
  const dotStyle = isJob
    ? "bg-primary"
    : isNested
      ? "bg-primary"
      : "border-2 border-primary bg-transparent"

  // Click-to-edit title component (used as modal header)
  const editableTitle = (
    <div className="flex min-w-0 items-center gap-2">
      {/* Colored dot indicator */}
      <div className={cn("h-3 w-3 shrink-0 rounded-full", dotStyle)} />

      {/* Editable title */}
      <div className="min-w-0 flex-1">
        {isEditingTitle ? (
          <Input
            ref={titleInputRef}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={handleTitleSave}
            onKeyDown={handleTitleKeyDown}
            placeholder={`${typeLabel} title`}
            className="text-lg font-semibold"
          />
        ) : (
          <h2
            onClick={() => setIsEditingTitle(true)}
            className={cn(
              "-mx-1 cursor-text truncate rounded px-1 text-lg font-semibold",
              "transition-colors hover:bg-muted/50",
              !title && "text-muted-foreground"
            )}
          >
            {title || `Untitled ${typeLabel}`}
          </h2>
        )}
      </div>
    </div>
  )

  const content = (
    <div className="flex-1 space-y-4 py-4">
      {/* Placeholder for future rich text content */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-muted-foreground">Notes</label>
        <div
          className="rounded-md border border-dashed p-4 text-center text-sm text-muted-foreground"
        >
          Rich text notes coming soon
        </div>
      </div>
    </div>
  )

  const footer = (
    <div className="flex w-full items-center justify-between">
      <Button variant="destructive" onClick={() => setShowArchiveConfirm(true)}>
        Archive
      </Button>
      <Button variant="outline" onClick={() => onOpenChange(false)}>
        Done
      </Button>
    </div>
  )

  // Archive confirmation dialog
  const archiveConfirmDialog = (
    <AlertDialog open={showArchiveConfirm} onOpenChange={setShowArchiveConfirm}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Archive {typeLabel}?</AlertDialogTitle>
          <AlertDialogDescription>
            This will move &quot;{scope?.title}&quot; to the archive. You can restore it from the
            Archive page within 30 days.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={handleArchive}>Archive</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )

  if (isMobile) {
    return (
      <>
        <Sheet open={open} onOpenChange={onOpenChange}>
          <SheetContent side="bottom" className="flex h-full flex-col px-6">
            <SheetHeader>
              <SheetTitle className="sr-only">Edit {typeLabel}</SheetTitle>
              <SheetDescription className="sr-only">
                Edit the title and notes for this {typeLabel.toLowerCase()}
              </SheetDescription>
              {editableTitle}
            </SheetHeader>
            {content}
            <SheetFooter className="mt-auto">{footer}</SheetFooter>
          </SheetContent>
        </Sheet>
        {archiveConfirmDialog}
      </>
    )
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="sr-only">Edit {typeLabel}</DialogTitle>
            <DialogDescription className="sr-only">
              Edit the title and notes for this {typeLabel.toLowerCase()}
            </DialogDescription>
            {editableTitle}
          </DialogHeader>
          {content}
          <DialogFooter>{footer}</DialogFooter>
        </DialogContent>
      </Dialog>
      {archiveConfirmDialog}
    </>
  )
}
