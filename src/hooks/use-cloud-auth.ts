"use client"

import { useObservable } from "dexie-react-hooks"
import { useCallback, useMemo } from "react"
import { db } from "@/lib/db"

export type CloudSyncState =
  | "disabled" // No cloud URL configured
  | "offline" // Not connected to cloud
  | "connecting" // Establishing connection
  | "connected" // Connected and idle
  | "syncing" // Actively syncing
  | "error" // Sync error

export type AuthState =
  | "logged-out" // Not authenticated
  | "logging-in" // Login flow in progress
  | "logged-in" // Authenticated

export interface CloudUser {
  userId: string
  email: string
}

export interface UseCloudAuthReturn {
  // Auth state
  isCloudEnabled: boolean
  authState: AuthState
  user: CloudUser | null

  // Cloud sync state
  syncState: CloudSyncState

  // Actions
  login: () => void
  logout: () => Promise<void>
}

// Check once at module load - NEXT_PUBLIC_ vars are available on both server and client
const CLOUD_ENABLED = !!process.env.NEXT_PUBLIC_DEXIE_CLOUD_URL

/**
 * Hook for managing Dexie Cloud authentication and sync state
 */
export function useCloudAuth(): UseCloudAuthReturn {
  const isCloudEnabled = CLOUD_ENABLED

  // Observe current user
  const currentUser = useObservable(db.cloud.currentUser)

  // Observe sync state
  const dexieSyncState = useObservable(db.cloud.syncState)

  // Observe user interaction requests (for custom login UI)
  const userInteraction = useObservable(db.cloud.userInteraction)

  // Derive auth state - check isLoggedIn, not just userId
  // Dexie Cloud returns userId="unauthorized" for anonymous users
  const authState: AuthState = useMemo(() => {
    if (!isCloudEnabled) return "logged-out"
    if (userInteraction) return "logging-in"
    if (currentUser?.isLoggedIn) return "logged-in"
    return "logged-out"
  }, [isCloudEnabled, currentUser, userInteraction])

  // Derive cloud user - only if actually logged in
  const user: CloudUser | null = useMemo(() => {
    if (!currentUser?.isLoggedIn || !currentUser.userId) return null
    return {
      userId: currentUser.userId,
      email: currentUser.email ?? currentUser.userId,
    }
  }, [currentUser])

  // Derive sync state
  const syncState: CloudSyncState = useMemo(() => {
    if (!isCloudEnabled) return "disabled"
    if (!dexieSyncState) return "offline"

    switch (dexieSyncState.status) {
      case "not-started":
        return "offline"
      case "connecting":
        return "connecting"
      case "connected":
        return "connected"
      case "disconnected":
        return "offline"
      case "error":
        return "error"
      default:
        return "offline"
    }
  }, [isCloudEnabled, dexieSyncState])

  // Login action - triggers Dexie Cloud's login flow
  const login = useCallback(async () => {
    if (!isCloudEnabled) return
    try {
      await db.cloud.login()
    } catch {
      // Expected: Dexie Cloud rejects with "User cancelled" when user cancels - silently ignore
    }
  }, [isCloudEnabled])

  // Logout action
  const logout = useCallback(async () => {
    if (!isCloudEnabled) return
    await db.cloud.logout()
  }, [isCloudEnabled])

  return {
    isCloudEnabled,
    authState,
    user,
    syncState,
    login,
    logout,
  }
}
