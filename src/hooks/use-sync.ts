"use client"

import { useState, useCallback } from "react"
import { useLiveQuery, useObservable } from "dexie-react-hooks"
import { db } from "@/lib/db"
import { runSyncJobs, type SyncResult } from "@/lib/sync"

export interface UnifiedSyncResult {
  local: SyncResult
  cloudTriggered: boolean
}

interface UseSyncReturn {
  isSyncing: boolean
  lastSyncedAt: number | null
  lastResult: UnifiedSyncResult | null
  cloudSyncActive: boolean
  sync: () => Promise<UnifiedSyncResult>
}

/**
 * Hook for managing unified sync (local jobs + cloud sync)
 */
export function useSync(): UseSyncReturn {
  const [isSyncing, setIsSyncing] = useState(false)
  const [lastResult, setLastResult] = useState<UnifiedSyncResult | null>(null)

  // Live query for last synced timestamp
  const lastSyncedAt = useLiveQuery(async () => {
    const meta = await db.appMeta.get("app")
    return meta?.lastSyncedAt ?? null
  })

  // Observe cloud sync state to know if cloud is active
  const cloudSyncState = useObservable(db.cloud.syncState)
  const cloudSyncActive = cloudSyncState?.status === "connected"

  const sync = useCallback(async (): Promise<UnifiedSyncResult> => {
    setIsSyncing(true)
    try {
      // Run local sync jobs first
      const localResult = await runSyncJobs()

      // If cloud is connected, trigger a sync
      // Dexie Cloud syncs automatically, but we can request an immediate sync
      let cloudTriggered = false
      if (cloudSyncState?.status === "connected") {
        try {
          await db.cloud.sync()
          cloudTriggered = true
        } catch (e) {
          // Cloud sync might fail if offline - that's okay
          console.warn("Cloud sync skipped:", e)
        }
      }

      const result: UnifiedSyncResult = {
        local: localResult,
        cloudTriggered,
      }
      setLastResult(result)
      return result
    } finally {
      setIsSyncing(false)
    }
  }, [cloudSyncState?.status])

  return {
    isSyncing,
    lastSyncedAt: lastSyncedAt ?? null,
    lastResult,
    cloudSyncActive,
    sync,
  }
}

/**
 * Format sync result as a human-readable message
 */
export function formatSyncResult(result: UnifiedSyncResult): string {
  const parts: string[] = []

  if (result.local.recurringTasksInserted > 0) {
    parts.push(
      `${result.local.recurringTasksInserted} recurring task${result.local.recurringTasksInserted === 1 ? "" : "s"} inserted`
    )
  }

  if (result.local.scheduleSlotsCreated > 0) {
    parts.push(
      `${result.local.scheduleSlotsCreated} schedule slot${result.local.scheduleSlotsCreated === 1 ? "" : "s"} created`
    )
  }

  if (result.local.tasksPurged > 0) {
    parts.push(
      `${result.local.tasksPurged} old task${result.local.tasksPurged === 1 ? "" : "s"} purged`
    )
  }

  if (result.local.scopesPurged > 0) {
    parts.push(
      `${result.local.scopesPurged} archived scope${result.local.scopesPurged === 1 ? "" : "s"} purged`
    )
  }

  if (result.cloudTriggered) {
    parts.push("cloud synced")
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
