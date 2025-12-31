"use client"

import { useState } from "react"
import { useIsMobile } from "@/hooks/use-media-query"
import { updateScopeTitle, archiveScope } from "@/lib/scope-mutations"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from "@/components/ui/sheet"
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
  const [title, setTitle] = useState(scope?.title ?? "")
  const [showArchiveConfirm, setShowArchiveConfirm] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  // Sync title when scope changes
  const handleOpenChange = (newOpen: boolean) => {
    if (newOpen && scope) {
      setTitle(scope.title)
    }
    onOpenChange(newOpen)
  }

  const handleSave = async () => {
    if (!scope || !title.trim()) return
    setIsSaving(true)
    try {
      await updateScopeTitle(scope.id, title.trim())
      onOpenChange(false)
    } finally {
      setIsSaving(false)
    }
  }

  const handleArchive = async () => {
    if (!scope) return
    await archiveScope(scope.id)
    setShowArchiveConfirm(false)
    onOpenChange(false)
  }

  const typeLabel = scope?.type === "job" ? "Job" : "Project"

  const content = (
    <>
      <div className="space-y-4 py-4">
        <div className="space-y-2">
          <label htmlFor="scope-title" className="text-sm font-medium">
            Title
          </label>
          <Input
            id="scope-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={`${typeLabel} title`}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                handleSave()
              }
            }}
          />
        </div>

        {/* Placeholder for future rich text content */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-muted-foreground">Notes</label>
          <div
            className="rounded-md border border-dashed p-4 text-center text-sm
              text-muted-foreground"
          >
            Rich text notes coming soon
          </div>
        </div>
      </div>
    </>
  )

  const footer = (
    <div className="flex w-full items-center justify-between">
      <Button variant="destructive" onClick={() => setShowArchiveConfirm(true)}>
        Archive
      </Button>
      <div className="flex gap-2">
        <Button variant="outline" onClick={() => onOpenChange(false)}>
          Cancel
        </Button>
        <Button onClick={handleSave} disabled={isSaving || !title.trim()}>
          {isSaving ? "Saving..." : "Save"}
        </Button>
      </div>
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
        <Sheet open={open} onOpenChange={handleOpenChange}>
          <SheetContent side="bottom" className="h-full">
            <SheetHeader>
              <SheetTitle>Edit {typeLabel}</SheetTitle>
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
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit {typeLabel}</DialogTitle>
          </DialogHeader>
          {content}
          <DialogFooter>{footer}</DialogFooter>
        </DialogContent>
      </Dialog>
      {archiveConfirmDialog}
    </>
  )
}
