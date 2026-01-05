# Cloud Sync with Dexie Cloud OTP Auth

| Field            | Value        |
| ---------------- | ------------ |
| **ID**           | 016          |
| **Status**       | 🔵 Ready     |
| **Progress**     | —            |
| **Created**      | 2026-01-05   |
| **Last Updated** | 2026-01-05   |

---

## Overview

Enable cloud sync using Dexie Cloud's built-in OTP (One-Time Password) email authentication. Users can optionally sign in to sync data across devices. Unifies the "sync" concept in UI—one Sync button handles both local jobs (recurring tasks, schedule slots, purging) and cloud synchronization.

**Important**: This implementation includes a schema migration to use Dexie Cloud's `@id` auto-generated primary keys. This enables the "use locally first, sign up later" pattern where anonymous data automatically migrates to the user's cloud account on sign-in.

---

## References

Read these before implementing:

| Topic                        | Source                                                   |
| ---------------------------- | -------------------------------------------------------- |
| Product vision (local-first) | `dev/specs/prd.md` §1, §7.1                              |
| Original sync architecture   | `dev/specs/trd.md` §5 (Clerk reference to be replaced)   |
| Current database config      | `src/lib/db.ts`                                          |
| Current sync implementation  | `src/lib/sync.ts`, `src/hooks/use-sync.ts`               |
| Current sync button          | `src/components/layout/sync-button.tsx`                  |
| Sidebar layout               | `src/components/layout/app-sidebar.tsx`                  |
| Dexie Cloud authentication   | https://dexie.org/cloud/docs/authentication              |
| Dexie Cloud db.cloud API     | https://dexie.org/cloud/docs/db.cloud                    |
| Dexie Cloud @id keys         | https://dexie.org/cloud/docs/best-practices              |

---

## Scope

### In Scope

1. **Schema migration to cloud-compatible IDs** — Update `db.ts` to use `@id` prefix for auto-generated globally unique IDs. This:
   - Enables proper cloud sync with owner/realmId tracking
   - Allows anonymous data to migrate on sign-in
   - **Breaking change**: Existing local data will be cleared
2. **Update mutation functions** — Remove manual `crypto.randomUUID()` calls; let Dexie auto-generate IDs
3. **Dexie Cloud configuration** — Ensure proper cloud config with `requireAuth: false`
4. **Unified sync concept** — Single "Sync" button handles:
   - Local sync jobs (existing functionality)
   - Cloud sync trigger when logged in
5. **Auth state management** — Hook to track `db.cloud.currentUser`, sync state, login/logout
6. **Login UI** — Custom login dialog using `db.cloud.userInteraction` observable:
   - Email input step → OTP code input step → success
   - Styled to match app aesthetic
7. **User indicator in sidebar** — Show logged-in email near secondary nav, with logout option
8. **Sync status enrichment** — Show cloud sync state (connected/syncing/offline) in sync button
9. **Environment documentation** — How to set up Dexie Cloud account and env vars

### Out of Scope

- Clerk integration (replaced by Dexie Cloud's built-in auth)
- Data access control / sharing between users (separate future implementation)
- User settings page (email is just displayed, no editable settings)
- PWA offline indicators (separate concern)
- Tasklist ordering sync (kept local for simplicity; may be addressed in future impl)

---

## Dependencies

- ✅ 002 Database Schema
- ✅ 015 Local Sync Jobs (provides base sync functionality to extend)

---

## Files Created/Modified

### Schema & Data Layer
- [ ] `src/lib/db.ts` — **Major update**: Schema v3 with `@id` cloud-compatible keys
- [ ] `src/lib/task-mutations.ts` — Update: Remove manual ID generation
- [ ] `src/lib/recurring-task-mutations.ts` — Update: Remove manual ID generation
- [ ] `src/lib/scope-mutations.ts` — Update: Remove manual ID generation
- [ ] `src/lib/schedule-mutations.ts` — Update: Remove manual ID generation
- [ ] `src/lib/sync.ts` — Update: Remove manual ID generation in recurring task insertion

### Auth & Sync Hooks
- [ ] `src/hooks/use-cloud-auth.ts` — Create: Hook for auth state, login/logout, cloud sync status
- [ ] `src/hooks/use-sync.ts` — Modify: Integrate cloud sync into unified sync function

### UI Components
- [ ] `src/components/auth/login-dialog.tsx` — Create: Custom OTP login dialog
- [ ] `src/components/auth/user-menu.tsx` — Create: Logged-in user display with logout
- [ ] `src/components/layout/sync-button.tsx` — Modify: Show cloud sync state
- [ ] `src/components/layout/app-sidebar.tsx` — Modify: Add user menu and login dialog
- [ ] `src/components/layout/mobile-nav.tsx` — Modify: Add user menu to mobile nav

### Documentation
- [ ] `.env.example` — Create: Document required environment variables

---

## Implementation Plan

### Step 1: Create .env.example

**Do**: Document the required environment variable for Dexie Cloud.

**Create** `.env.example`:

```bash
# Dexie Cloud
# Get your database URL from https://dexie.cloud after creating an account
# Without this variable, the app runs in local-only mode (no sync)
NEXT_PUBLIC_DEXIE_CLOUD_URL=
```

**Verify**:
- File exists at `.env.example`

---

### Step 2: Update db.ts with cloud-compatible schema (BREAKING CHANGE)

**Do**: Add schema version 3 with `@id` prefix for Dexie Cloud auto-generated IDs.

**Why `@id`?**
- Dexie Cloud uses `@id` to auto-generate globally unique IDs (e.g., `tsk0OroMWmdWtMgzS5Udb2dfysp`)
- Auto-adds `owner` and `realmId` properties for access control
- Enables anonymous-to-authenticated data migration

**Modify** `src/lib/db.ts`:

1. Add version 3 after the existing version 2 block (keep v1 and v2 for migration path):

```typescript
    // Version 3: Cloud-compatible schema with @id auto-generated keys
    // BREAKING CHANGE: This clears existing data due to ID format change
    // But enables: anonymous data → user's private realm on sign-in
    this.version(3).stores({
      tasks: "@id, scopeId, status, createdAt, completedAt",
      recurringTasks: "@id, scopeId",
      tasklists: "id, scopeId, type", // Keep manual ID (derived key pattern)
      scopes: "@id, type, archivedAt",
      scheduleSlots: "@id, date, scopeId, [date+scopeId]",
      monthSlots: "@id, month, projectId, [month+projectId]",
      defaultScheduleSlots: "@id, weekday, jobId, [weekday+jobId]",
      appMeta: "id", // Keep manual ID (singleton record)
    })
```

**Note on `tasklists`**: Keeps manual `id` because it uses a derived key pattern (`${scopeId}:${type}`). This means task ordering stays local and doesn't sync. A future implementation could address this if needed.

**Note on `appMeta`**: Keeps manual `id` because it's a singleton app-wide record (`id: "app"`).

2. Update the cloud configuration to use `customLoginGui: true` for our custom login UI:

```typescript
    const cloudUrl = process.env.NEXT_PUBLIC_DEXIE_CLOUD_URL
    if (cloudUrl) {
      this.cloud.configure({
        databaseUrl: cloudUrl,
        requireAuth: false, // Allow anonymous local usage
        customLoginGui: true, // We provide our own login dialog
      })
    }
```

**Verify**:
- File compiles: `pnpm tsc --noEmit`
- Database version is now 3

---

### Step 3: Update task-mutations.ts to remove manual ID generation

**Do**: When using `@id`, Dexie auto-generates the ID on `add()`. Remove `crypto.randomUUID()` calls.

**Modify** `src/lib/task-mutations.ts`:

Find all instances of adding tasks with manual IDs like:
```typescript
const id = crypto.randomUUID()
await db.tasks.add({
  id,
  // ...other fields
})
```

Replace with:
```typescript
const id = await db.tasks.add({
  // ...other fields (no id property)
})
```

The `add()` method returns the auto-generated ID when using `@id`.

**Key functions to update**:
- `createTask()` — remove manual id generation
- Any other task creation functions

**Verify**:
- No TypeScript errors
- `crypto.randomUUID()` not used for task IDs

---

### Step 4: Update recurring-task-mutations.ts

**Do**: Same pattern — remove manual ID generation for recurring tasks.

**Modify** `src/lib/recurring-task-mutations.ts`:

Update `createRecurringTask()` and any other creation functions to let Dexie generate IDs.

**Verify**:
- No TypeScript errors

---

### Step 5: Update scope-mutations.ts

**Do**: Remove manual ID generation for scopes.

**Modify** `src/lib/scope-mutations.ts`:

Update scope creation to let Dexie generate IDs.

**Verify**:
- No TypeScript errors

---

### Step 6: Update schedule-mutations.ts

**Do**: Remove manual ID generation for schedule slots, month slots, and default schedule slots.

**Modify** `src/lib/schedule-mutations.ts`:

Update all creation functions.

**Verify**:
- No TypeScript errors

---

### Step 7: Update sync.ts

**Do**: The `insertRecurringTaskToNow()` function creates tasks with manual IDs. Update it.

**Modify** `src/lib/sync.ts`:

Find:
```typescript
const id = crypto.randomUUID()
// ...
await db.tasks.add({
  id,
  // ...
})
```

Replace with letting Dexie generate the ID, then use the returned ID for the tasklist:
```typescript
const id = await db.tasks.add({
  // ...all fields except id
})

// Add to "now" tasklist using the returned id
await prependToTasklist(recurringTask.scopeId, "now", id as string)
```

Also update `populateScheduleSlots()` which creates schedule slots.

**Verify**:
- No TypeScript errors
- Sync jobs still work

---

### Step 8: Create use-cloud-auth.ts hook

**Do**: Create a hook that manages Dexie Cloud authentication state and provides login/logout functions.

**Create** `src/hooks/use-cloud-auth.ts` (note: `db.cloud.syncState` is an observable with different properties than documented in some examples — we access the actual Dexie Cloud sync state):

```typescript
"use client"

import { useObservable } from "dexie-react-hooks"
import { useCallback, useMemo } from "react"
import { db } from "@/lib/db"

export type CloudSyncState = 
  | "disabled"      // No cloud URL configured
  | "offline"       // Not connected to cloud
  | "connecting"    // Establishing connection
  | "connected"     // Connected and idle
  | "syncing"       // Actively syncing
  | "error"         // Sync error

export type AuthState =
  | "logged-out"    // Not authenticated
  | "logging-in"    // Login flow in progress
  | "logged-in"     // Authenticated

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
  
  // For custom login UI
  userInteraction: ReturnType<typeof useObservable<typeof db.cloud.userInteraction>>
}

/**
 * Hook for managing Dexie Cloud authentication and sync state
 */
export function useCloudAuth(): UseCloudAuthReturn {
  // Check if cloud is configured
  const isCloudEnabled = useMemo(() => {
    return !!process.env.NEXT_PUBLIC_DEXIE_CLOUD_URL
  }, [])

  // Observe current user
  const currentUser = useObservable(db.cloud.currentUser)
  
  // Observe sync state
  const dexieSyncState = useObservable(db.cloud.syncState)
  
  // Observe user interaction requests (for custom login UI)
  const userInteraction = useObservable(db.cloud.userInteraction)

  // Derive auth state
  const authState: AuthState = useMemo(() => {
    if (!isCloudEnabled) return "logged-out"
    if (userInteraction) return "logging-in"
    if (currentUser?.userId) return "logged-in"
    return "logged-out"
  }, [isCloudEnabled, currentUser, userInteraction])

  // Derive cloud user
  const user: CloudUser | null = useMemo(() => {
    if (!currentUser?.userId) return null
    return {
      userId: currentUser.userId,
      email: currentUser.email ?? currentUser.userId, // OTP auth uses email as userId
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
  const login = useCallback(() => {
    if (!isCloudEnabled) return
    db.cloud.login()
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
    userInteraction,
  }
}
```

**Verify**:
- File created at `src/hooks/use-cloud-auth.ts`
- No TypeScript errors: `pnpm tsc --noEmit`

---

### Step 9: Update use-sync.ts to integrate cloud sync

**Do**: Modify the sync hook to handle both local sync jobs AND cloud sync as a unified operation.

**Modify** `src/hooks/use-sync.ts`:

```typescript
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
```

**Verify**:
- File modified
- No TypeScript errors
- Existing sync functionality still works

---

### Step 10: Create login-dialog.tsx

**Do**: Create a custom login dialog that handles Dexie Cloud's OTP flow using `db.cloud.userInteraction`.

**Create** `src/components/auth/login-dialog.tsx`:

```typescript
"use client"

import { useState } from "react"
import { useObservable } from "dexie-react-hooks"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { db } from "@/lib/db"
import { resolveText, type DXCInputField, type DXCUserInteraction } from "dexie-cloud-addon"
import { Loader2, Mail, KeyRound, AlertCircle } from "lucide-react"

/**
 * Login dialog that handles Dexie Cloud's OTP authentication flow
 * Automatically appears when db.cloud.userInteraction emits a login request
 */
export function LoginDialog() {
  const userInteraction = useObservable(db.cloud.userInteraction)

  if (!userInteraction) return null

  return <LoginDialogContent ui={userInteraction} />
}

interface LoginDialogContentProps {
  ui: DXCUserInteraction
}

function LoginDialogContent({ ui }: LoginDialogContentProps) {
  const [params, setParams] = useState<Record<string, string>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    try {
      await ui.onSubmit(params)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleCancel = () => {
    ui.onCancel?.()
  }

  // Determine dialog icon based on type
  const getIcon = () => {
    switch (ui.type) {
      case "email":
        return <Mail className="h-6 w-6 text-muted-foreground" />
      case "otp":
        return <KeyRound className="h-6 w-6 text-muted-foreground" />
      default:
        return null
    }
  }

  // Get description based on type
  const getDescription = () => {
    switch (ui.type) {
      case "email":
        return "Enter your email to receive a one-time login code"
      case "otp":
        return "Check your email for the login code"
      case "message-alert":
        return null
      case "logout-confirmation":
        return "You will be logged out of cloud sync"
      default:
        return null
    }
  }

  return (
    <Dialog open onOpenChange={(open) => !open && handleCancel()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3">
            {getIcon()}
            <div>
              <DialogTitle>{ui.title}</DialogTitle>
              {getDescription() && (
                <DialogDescription>{getDescription()}</DialogDescription>
              )}
            </div>
          </div>
        </DialogHeader>

        {/* Alerts */}
        {ui.alerts && ui.alerts.length > 0 && (
          <div className="space-y-2">
            {ui.alerts.map((alert, i) => (
              <div
                key={i}
                className={`flex items-start gap-2 rounded-md p-3 text-sm ${
                  alert.type === "error"
                    ? "bg-destructive/10 text-destructive"
                    : alert.type === "warning"
                      ? "bg-yellow-500/10 text-yellow-600 dark:text-yellow-500"
                      : "bg-muted text-muted-foreground"
                }`}
              >
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{resolveText(alert)}</span>
              </div>
            ))}
          </div>
        )}

        {/* Form fields */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {Object.entries(ui.fields as Record<string, DXCInputField>).map(
            ([fieldName, field], idx) => (
              <div key={fieldName} className="space-y-2">
                {field.label && (
                  <label
                    htmlFor={fieldName}
                    className="text-sm font-medium leading-none"
                  >
                    {field.label}
                  </label>
                )}
                <Input
                  id={fieldName}
                  type={field.type}
                  placeholder={field.placeholder}
                  value={params[fieldName] ?? ""}
                  onChange={(e) =>
                    setParams((prev) => ({ ...prev, [fieldName]: e.target.value }))
                  }
                  autoFocus={idx === 0}
                  disabled={isSubmitting}
                  className="font-mono"
                />
              </div>
            )
          )}

          {/* Buttons */}
          <div className="flex justify-end gap-2 pt-2">
            {ui.cancelLabel && (
              <Button
                type="button"
                variant="outline"
                onClick={handleCancel}
                disabled={isSubmitting}
              >
                {ui.cancelLabel}
              </Button>
            )}
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {ui.submitLabel}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
```

**Verify**:
- File created at `src/components/auth/login-dialog.tsx`
- No TypeScript errors

---

### Step 11: Create user-menu.tsx

**Do**: Create a component that shows the logged-in user's email with a logout option.

**Create** `src/components/auth/user-menu.tsx`:

```typescript
"use client"

import { useState } from "react"
import { LogIn, LogOut, User, Cloud, CloudOff } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { useCloudAuth } from "@/hooks/use-cloud-auth"
import { cn } from "@/lib/utils"

interface UserMenuProps {
  className?: string
  variant?: "sidebar" | "mobile"
}

export function UserMenu({ className, variant = "sidebar" }: UserMenuProps) {
  const { isCloudEnabled, authState, user, syncState, login, logout } = useCloudAuth()
  const [isOpen, setIsOpen] = useState(false)

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
            "flex w-full items-center justify-between rounded-xl border-2 border-transparent px-3 py-1.5",
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
              syncState === "syncing" && "text-blue-500 animate-pulse",
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
```

**Verify**:
- File created at `src/components/auth/user-menu.tsx`
- No TypeScript errors

---

### Step 12: Update sync-button.tsx for cloud status

**Do**: Update the sync button to show cloud sync state indicator.

**Modify** `src/components/layout/sync-button.tsx`:

```typescript
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
  const { isSyncing, lastSyncedAt, sync, cloudSyncActive } = useSync()
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
        <span className="text-xs text-muted-foreground/70">
          {formatLastSynced(lastSyncedAt)}
        </span>
      </button>
    )
  }

  // Sidebar variant
  return (
    <button
      onClick={handleSync}
      disabled={isSyncing}
      className={cn(
        "flex w-full items-center justify-between rounded-xl border-2 border-transparent px-3 py-1.5",
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
      <span className="text-xs text-muted-foreground/70">
        {formatLastSynced(lastSyncedAt)}
      </span>
    </button>
  )
}
```

**Verify**:
- File modified
- Cloud icon appears when logged in
- No TypeScript errors

---

### Step 13: Update app-sidebar.tsx

**Do**: Add the UserMenu and LoginDialog to the sidebar's secondary navigation area.

**Modify** `src/components/layout/app-sidebar.tsx`:

1. Add imports at the top:
```typescript
import { UserMenu } from "@/components/auth/user-menu"
import { LoginDialog } from "@/components/auth/login-dialog"
```

2. Find the secondary navigation section and update it to include UserMenu:

Find:
```typescript
{/* Secondary navigation (Sync + Archive) */}
<nav className="space-y-1 px-3 pt-6 pb-3">
  <SyncButton />
  {secondaryNavItems.map((item) => (
```

Replace with:
```typescript
{/* Secondary navigation (Auth + Sync + Archive) */}
<nav className="space-y-1 px-3 pt-6 pb-3">
  <UserMenu />
  <SyncButton />
  {secondaryNavItems.map((item) => (
```

3. Add the LoginDialog inside the component return, after the closing `</div>` of the sidebar but before the final fragment close:

Add at the end of the component's return:
```typescript
<LoginDialog />
```

**Verify**:
- UserMenu appears above SyncButton in sidebar
- LoginDialog renders when login flow is triggered
- No TypeScript errors

---

### Step 14: Update mobile-nav.tsx

**Do**: Add the UserMenu and LoginDialog to the mobile navigation.

**Modify** `src/components/layout/mobile-nav.tsx`:

1. Add imports:
```typescript
import { UserMenu } from "@/components/auth/user-menu"
import { LoginDialog } from "@/components/auth/login-dialog"
```

2. Find the secondary navigation section and update it:

Find:
```typescript
{/* Secondary navigation (Sync + Archive) */}
<nav className="space-y-1 border-t p-4">
  <SyncButton variant="mobile" />
```

Replace with:
```typescript
{/* Secondary navigation (Auth + Sync + Archive) */}
<nav className="space-y-1 border-t p-4">
  <UserMenu variant="mobile" />
  <SyncButton variant="mobile" />
```

3. Add LoginDialog at the end of the component return.

**Verify**:
- UserMenu appears in mobile nav
- LoginDialog works from mobile nav
- No TypeScript errors

---

### Step 15: Verify TypeScript and lint

**Do**: Ensure all files compile and lint passes.

**Commands**:
```bash
pnpm tsc --noEmit
pnpm lint
```

**Verify**:
- No TypeScript errors
- No lint errors (or only minor warnings)

---

### Step 16: Manual testing

**Do**: Test the complete authentication and sync flow.

**Testing without Dexie Cloud URL (local-only mode)**:
1. Ensure `NEXT_PUBLIC_DEXIE_CLOUD_URL` is NOT set in `.env.local`
2. Start the app: `pnpm dev`
3. Verify:
   - [ ] UserMenu / "Sign in" button does NOT appear (cloud disabled)
   - [ ] Sync button works (local sync only)
   - [ ] No cloud icon in sync button
   - [ ] All existing functionality works

**Testing with Dexie Cloud URL (cloud enabled)**:

*Note: This requires a Dexie Cloud account. See https://dexie.cloud for setup.*

1. Set `NEXT_PUBLIC_DEXIE_CLOUD_URL` in `.env.local`
2. Start the app: `pnpm dev`
3. Test login flow:
   - [ ] "Sign in to sync" button appears in sidebar
   - [ ] Click it → Email dialog appears
   - [ ] Enter email → Submit → OTP dialog appears
   - [ ] Enter OTP from email → Submit → Login succeeds
   - [ ] UserMenu shows email with cloud icon
   - [ ] SyncButton shows cloud connected icon

4. Test logout flow:
   - [ ] Click UserMenu → popover opens
   - [ ] Shows email and connection status
   - [ ] Click "Sign out" → logs out
   - [ ] "Sign in to sync" button reappears

5. Test unified sync:
   - [ ] While logged in, click Sync
   - [ ] Toast shows both local jobs AND "cloud synced"
   - [ ] Data syncs to Dexie Cloud

6. **Test anonymous-to-authenticated migration** (key feature!):
   - [ ] Start fresh (clear IndexedDB via DevTools → Application → IndexedDB → Delete "backboard")
   - [ ] Create some tasks and scopes WITHOUT signing in
   - [ ] Verify data exists locally (check via DevTools)
   - [ ] Now click "Sign in to sync" and complete login
   - [ ] Verify: existing data is NOT lost
   - [ ] Verify: data now syncs to cloud (check Dexie Cloud console or another device)

7. Test mobile:
   - [ ] Open mobile nav
   - [ ] UserMenu and SyncButton appear correctly
   - [ ] Login flow works from mobile nav

**Verify**:
- All test cases pass
- No console errors
- Smooth UX flow

---

## Dexie Cloud Setup Guide

For the implementation to work with cloud sync, users need to:

1. **Create a Dexie Cloud account** at https://dexie.cloud

2. **Create a new database** in the Dexie Cloud console

3. **Copy the database URL** (looks like `https://your-db-id.dexie.cloud`)

4. **Add to environment**:
   ```bash
   # .env.local
   NEXT_PUBLIC_DEXIE_CLOUD_URL=https://your-db-id.dexie.cloud
   ```

5. **Restart the dev server**

The app will now show login options and enable cloud sync.

---

## Notes

- **OTP Auth**: Dexie Cloud's OTP auth sends a one-time code to the user's email. No password needed. The `userId` is typically the email address.

- **Anonymous → Authenticated Migration**: With the `@id` schema, data created before login automatically gets associated with the user's private realm when they sign in. This is a key feature that allows "use locally first, sign up later" without data loss.

- **Anonymous Usage**: With `requireAuth: false`, users can use the app without logging in. Their data stays local until they sign in. Once signed in, all anonymous data syncs to their account.

- **Automatic Sync**: Once logged in, Dexie Cloud automatically syncs in the background via WebSocket. The "Sync" button triggers an immediate sync for both local jobs and cloud.

- **Offline Support**: Dexie Cloud handles offline scenarios gracefully. Changes queue up locally and sync when back online.

- **No Clerk**: This implementation replaces the originally planned Clerk integration. Dexie Cloud's built-in auth is simpler and more integrated with the sync layer.

- **Tasklist Ordering**: Task order within lists (via `tasklists` table) remains local-only because it uses a derived ID pattern. This is a deliberate simplification; cross-device ordering could be addressed in a future implementation.

- **Breaking Change**: The schema migration from v2 to v3 clears existing local data due to the ID format change. This is acceptable for development but should be communicated clearly to any existing users.
