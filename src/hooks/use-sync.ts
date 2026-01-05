"use client"

import { useState, useCallback } from "react"
import { useLiveQuery } from "dexie-react-hooks"
import { db } from "@/lib/db"
import { runSyncJobs, type SyncResult } from "@/lib/sync"

interface UseSyncReturn {
  isSyncing: boolean
  lastSyncedAt: number | null
  lastResult: SyncResult | null
  sync: () => Promise<SyncResult>
}

/**
 * Hook for managing sync state and triggering sync jobs
 */
export function useSync(): UseSyncReturn {
  const [isSyncing, setIsSyncing] = useState(false)
  const [lastResult, setLastResult] = useState<SyncResult | null>(null)

  // Live query for last synced timestamp
  const lastSyncedAt = useLiveQuery(async () => {
    const meta = await db.appMeta.get("app")
    return meta?.lastSyncedAt ?? null
  })

  const sync = useCallback(async (): Promise<SyncResult> => {
    setIsSyncing(true)
    try {
      const result = await runSyncJobs()
      setLastResult(result)
      return result
    } finally {
      setIsSyncing(false)
    }
  }, [])

  return {
    isSyncing,
    lastSyncedAt: lastSyncedAt ?? null,
    lastResult,
    sync,
  }
}

/**
 * Format sync result as a human-readable message
 */
export function formatSyncResult(result: SyncResult): string {
  const parts: string[] = []

  if (result.recurringTasksInserted > 0) {
    parts.push(
      `${result.recurringTasksInserted} recurring task${result.recurringTasksInserted === 1 ? "" : "s"} inserted`
    )
  }

  if (result.scheduleSlotsCreated > 0) {
    parts.push(
      `${result.scheduleSlotsCreated} schedule slot${result.scheduleSlotsCreated === 1 ? "" : "s"} created`
    )
  }

  if (result.tasksPurged > 0) {
    parts.push(`${result.tasksPurged} old task${result.tasksPurged === 1 ? "" : "s"} purged`)
  }

  if (result.scopesPurged > 0) {
    parts.push(
      `${result.scopesPurged} archived scope${result.scopesPurged === 1 ? "" : "s"} purged`
    )
  }

  if (parts.length === 0) {
    return "Everything up to date"
  }

  return parts.join(", ")
}

/**
 * Format timestamp as relative time (e.g., "2 min ago", "Just now")
 */
export function formatLastSynced(timestamp: number | null): string {
  if (!timestamp) return "Never"

  const now = Date.now()
  const diff = now - timestamp
  const seconds = Math.floor(diff / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)

  if (seconds < 10) return "Just now"
  if (seconds < 60) return `${seconds}s ago`
  if (minutes < 60) return `${minutes}m ago`
  if (hours < 24) return `${hours}h ago`

  // Format as date for older timestamps
  return new Date(timestamp).toLocaleDateString()
}
