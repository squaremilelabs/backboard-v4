"use client"

import { Button } from "@/components/ui/button"
import { commitPendingActions, clearPendingActions } from "@/lib/task-mutations"
import type { TaskStatus } from "@/lib/db"

interface PendingActionsFooterProps {
  scopeId: string | null
  currentStatus: TaskStatus
  pendingCount: number
}

export function PendingActionsFooter({
  scopeId,
  currentStatus,
  pendingCount,
}: PendingActionsFooterProps) {
  if (pendingCount === 0) return null

  const handleClear = async () => {
    await clearPendingActions(scopeId, currentStatus)
  }

  const handleSave = async () => {
    await commitPendingActions(scopeId, currentStatus)
  }

  return (
    <div className="flex items-center justify-end gap-3 border-t px-4 py-3">
      <Button variant="ghost" onClick={handleClear}>
        Clear
      </Button>
      <Button onClick={handleSave}>Save</Button>
    </div>
  )
}
