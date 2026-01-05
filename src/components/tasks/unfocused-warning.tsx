"use client"

import { Button } from "@/components/ui/button"
import { moveAllToLater } from "@/lib/task-mutations"

interface UnfocusedWarningProps {
  scopeId: string | null
}

export function UnfocusedWarningLabel() {
  return (
    <div className="px-4 py-2">
      <span
        className="inline-block rounded-md bg-destructive/10 px-2 py-1 text-xs font-medium
          text-destructive"
      >
        Not in focus today
      </span>
    </div>
  )
}

export function MoveAllToLaterButton({ scopeId }: UnfocusedWarningProps) {
  const handleClick = async () => {
    await moveAllToLater(scopeId)
  }

  return (
    <div className="flex items-center justify-end border-t px-4 py-3">
      <Button variant="outline" onClick={handleClick}>
        Move all to later
      </Button>
    </div>
  )
}
