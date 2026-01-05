"use client"

import { useEffect, useRef } from "react"
import { Toaster, toast } from "sonner"
import { runSyncJobs } from "@/lib/sync"
import { formatSyncResult } from "@/hooks/use-sync"

interface SyncProviderProps {
  children: React.ReactNode
}

export function SyncProvider({ children }: SyncProviderProps) {
  const hasRunRef = useRef(false)

  useEffect(() => {
    // Only run once on mount
    if (hasRunRef.current) return
    hasRunRef.current = true

    const runInitialSync = async () => {
      try {
        const localResult = await runSyncJobs()
        // Wrap in UnifiedSyncResult format for formatSyncResult
        const message = formatSyncResult({ local: localResult, cloudTriggered: false })

        // Only show toast if there were changes
        const hasChanges =
          localResult.recurringTasksInserted > 0 ||
          localResult.scheduleSlotsCreated > 0 ||
          localResult.tasksPurged > 0 ||
          localResult.scopesPurged > 0 ||
          localResult.scheduleSlotsArchived > 0 ||
          localResult.monthSlotsArchived > 0

        if (hasChanges) {
          toast.success("Synced on startup", { description: message })
        }
      } catch (error) {
        console.error("Sync failed:", error)
        toast.error("Sync failed", {
          description: "Could not complete background sync",
        })
      }
    }

    runInitialSync()
  }, [])

  return (
    <>
      {children}
      <Toaster position="bottom-right" richColors closeButton />
    </>
  )
}
