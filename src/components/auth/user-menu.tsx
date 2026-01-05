"use client"

import { useState, useSyncExternalStore } from "react"
import { LogIn, LogOut, User, Cloud, CloudOff } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { useCloudAuth } from "@/hooks/use-cloud-auth"
import { cn } from "@/lib/utils"

// Hook to detect if we're on the client (avoids hydration mismatch)
function useIsClient() {
  return useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  )
}

interface UserMenuProps {
  className?: string
  variant?: "sidebar" | "mobile"
}

export function UserMenu({ className, variant = "sidebar" }: UserMenuProps) {
  const isClient = useIsClient()
  const { isCloudEnabled, authState, user, syncState, login, logout } = useCloudAuth()
  const [isOpen, setIsOpen] = useState(false)

  // Don't render on server to avoid hydration mismatch (Dexie observables differ)
  if (!isClient) return null

  // If cloud is not configured, don't show anything
  if (!isCloudEnabled) return null

  // Not logged in - show login button
  if (authState === "logged-out") {
    return (
      <button
        onClick={login}
        className={cn(
          "flex w-full items-center gap-2 rounded-xl border-2 border-transparent px-3 py-1.5",
          "text-sm text-muted-foreground transition-colors",
          "hover:bg-background hover:text-foreground",
          variant === "mobile" && "rounded-md px-3 py-2",
          className
        )}
      >
        <LogIn className="h-4 w-4" />
        <span>Sign in to sync</span>
      </button>
    )
  }

  // Logging in - show loading state
  if (authState === "logging-in") {
    return (
      <div
        className={cn(
          "flex w-full items-center gap-2 rounded-xl border-2 border-transparent px-3 py-1.5",
          "text-sm text-muted-foreground",
          variant === "mobile" && "rounded-md px-3 py-2",
          className
        )}
      >
        <User className="h-4 w-4 animate-pulse" />
        <span>Signing in...</span>
      </div>
    )
  }

  // Logged in - show user menu
  const SyncIcon = syncState === "connected" || syncState === "syncing" ? Cloud : CloudOff

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <button
          className={cn(
            `flex w-full items-center justify-between rounded-xl border-2 border-transparent px-3
            py-1.5`,
            "text-sm text-muted-foreground transition-colors",
            "hover:bg-background hover:text-foreground",
            variant === "mobile" && "rounded-md px-3 py-2",
            className
          )}
        >
          <span className="flex items-center gap-2 truncate">
            <User className="h-4 w-4 shrink-0" />
            <span className="truncate">{user?.email}</span>
          </span>
          <SyncIcon
            className={cn(
              "h-3.5 w-3.5 shrink-0",
              syncState === "connected" && "text-green-500",
              syncState === "syncing" && "animate-pulse text-blue-500",
              syncState === "offline" && "text-muted-foreground/50",
              syncState === "error" && "text-destructive"
            )}
          />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-56 p-2">
        <div className="space-y-1">
          {/* User info */}
          <div className="px-2 py-1.5">
            <p className="truncate text-sm font-medium">{user?.email}</p>
            <p className="text-xs text-muted-foreground">
              {syncState === "connected" && "Connected to cloud"}
              {syncState === "syncing" && "Syncing..."}
              {syncState === "offline" && "Offline"}
              {syncState === "connecting" && "Connecting..."}
              {syncState === "error" && "Sync error"}
            </p>
          </div>

          {/* Logout button */}
          <Button
            variant="ghost"
            className="w-full justify-start gap-2 text-destructive hover:text-destructive"
            onClick={async () => {
              await logout()
              setIsOpen(false)
            }}
          >
            <LogOut className="h-4 w-4" />
            Sign out
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  )
}
