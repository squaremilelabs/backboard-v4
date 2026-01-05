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
        const result = await runSyncJobs()
        const message = formatSyncResult(result)

        // Only show toast if there were changes
        const hasChanges =
          result.recurringTasksInserted > 0 ||
          result.scheduleSlotsCreated > 0 ||
          result.tasksPurged > 0 ||
          result.scopesPurged > 0 ||
          result.scheduleSlotsArchived > 0 ||
          result.monthSlotsArchived > 0

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
