"use client"

import { RefreshCw, Cloud, CloudOff } from "lucide-react"
import { toast } from "sonner"
import { useSync, formatSyncResult, formatLastSynced } from "@/hooks/use-sync"
import { useCloudAuth } from "@/hooks/use-cloud-auth"
import { cn } from "@/lib/utils"

interface SyncButtonProps {
  className?: string
  variant?: "sidebar" | "mobile"
}

export function SyncButton({ className, variant = "sidebar" }: SyncButtonProps) {
  const { isSyncing, lastSyncedAt, sync } = useSync()
  const { isCloudEnabled, authState, syncState } = useCloudAuth()

  const handleSync = async () => {
    const result = await sync()
    const message = formatSyncResult(result)

    // Show toast with result
    const hasChanges =
      result.local.recurringTasksInserted > 0 ||
      result.local.scheduleSlotsCreated > 0 ||
      result.local.tasksPurged > 0 ||
      result.local.scopesPurged > 0 ||
      result.cloudTriggered

    if (hasChanges) {
      toast.success("Synced", { description: message })
    } else {
      toast.info("Synced", { description: message })
    }
  }

  // Determine cloud indicator
  const showCloudIndicator = isCloudEnabled && authState === "logged-in"
  const CloudIcon = syncState === "connected" || syncState === "syncing" ? Cloud : CloudOff

  if (variant === "mobile") {
    return (
      <button
        onClick={handleSync}
        disabled={isSyncing}
        className={cn(
          "flex w-full items-center justify-between rounded-md px-3 py-2 text-sm font-medium",
          "transition-colors",
          "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
          "disabled:pointer-events-none disabled:opacity-50",
          className
        )}
      >
        <span className="flex items-center gap-2">
          <RefreshCw className={cn("h-4 w-4", isSyncing && "animate-spin")} />
          <span>Sync</span>
          {showCloudIndicator && (
            <CloudIcon
              className={cn(
                "h-3.5 w-3.5",
                syncState === "connected" && "text-green-500",
                syncState === "syncing" && "text-blue-500",
                syncState === "offline" && "text-muted-foreground/50"
              )}
            />
          )}
        </span>
        <span className="text-xs text-muted-foreground/70">{formatLastSynced(lastSyncedAt)}</span>
      </button>
    )
  }

  // Sidebar variant
  return (
    <button
      onClick={handleSync}
      disabled={isSyncing}
      className={cn(
        `flex w-full items-center justify-between rounded-xl border-2 border-transparent px-3
        py-1.5`,
        "text-sm text-muted-foreground transition-colors",
        "hover:bg-background hover:text-foreground",
        "disabled:pointer-events-none disabled:opacity-50",
        className
      )}
    >
      <span className="flex items-center gap-2">
        <RefreshCw className={cn("h-4 w-4", isSyncing && "animate-spin")} />
        <span>Sync</span>
        {showCloudIndicator && (
          <CloudIcon
            className={cn(
              "h-3.5 w-3.5",
              syncState === "connected" && "text-green-500",
              syncState === "syncing" && "text-blue-500",
              syncState === "offline" && "text-muted-foreground/50"
            )}
          />
        )}
      </span>
      <span className="text-xs text-muted-foreground/70">{formatLastSynced(lastSyncedAt)}</span>
    </button>
  )
}
