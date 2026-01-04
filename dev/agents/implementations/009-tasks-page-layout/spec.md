# Tasks Page Layout Foundation

| Field | Value |
|-------|-------|
| **ID** | 009 |
| **Status** | 🟡 Planning |
| **Progress** | — |
| **Created** | 2026-01-04 |
| **Last Updated** | 2026-01-04 |

---

## Overview

Build the layout foundation for the Tasks page including list type navigation (tabs), scope selector sidebar with contextual fading, and placeholder content area. No actual task rendering or task data logic in this implementation.

---

## References

Read these before implementing:

| Topic | Source |
|-------|--------|
| Tasks page design | `dev/specs/prd.md` §4.1 |
| Task lifecycle & list types | `dev/specs/prd.md` §2.2 |
| Scope visibility rules | `dev/specs/prd.md` §2.2, Table: "List → Behavior" |
| Visual reference | `dev/specs/visuals/page-tasks.png` |
| Database schema | `dev/specs/trd.md` §4.1 |
| nuqs documentation | https://nuqs.47ng.com/ |

---

## Scope

### In Scope

1. **List type navigation (tabs)**
   - Horizontal tabs: Now, Later, Backlog, Recurring, Recent
   - Part of page structure (inside ContentPanel)
   - Active state styling
   - NO activity dots (requires task data, deferred to next implementation)

2. **Scope selector sidebar**
   - Shows all non-archived Jobs + Projects
   - **Triage** as special fixed item at top (visible only in Now/Later/Backlog)
   - **Contextual fading** (50% opacity):
     - "Now": Fade scopes without ScheduleSlot for today
     - "Later": Fade Projects without MonthSlot for current month (Jobs never fade)
     - "Backlog/Recurring/Recent": No fading
   - Reads ScheduleSlots and MonthSlots (NO task data)
   - Click to select scope

3. **Scope selector component (reusable)**
   - shadcn Select/Popover pattern
   - Shows current selected scope
   - Dropdown to choose scope
   - Same component used in both desktop (sidebar) and mobile (different container)

4. **Layout structure**
   - Two-column: scope selector (left, fixed width) + main content (right, flex)
   - Main content: tabs at top + placeholder area below
   - Responsive: mobile TBD (for now, just ensure structure is sound)

5. **UI state management (URL search params via nuqs)**
   - `list`: "now" | "later" | "backlog" | "recurring" | "recent" (default: "now")
   - `scope`: string | "triage" (default: "triage")
   - Shareable URLs, browser back/forward support

6. **Empty state**
   - Placeholder text in main content area

### Out of Scope

- Task/tasklist components (next implementation)
- Task data/hooks (no `useTasks` calls)
- Activity indicators (dots on tabs/scopes showing task counts)
- Task actions, drag-drop, rich text editor
- Batch save UI
- Unfocused scope warning
- Mobile-specific layout adjustments (basic responsive OK, but not mobile-optimized)

---

## Dependencies

- ✅ 002 Database Schema (scopes, scheduleSlots, monthSlots tables)
- ✅ 005 Scope Management (useScopes hook)
- ✅ 006 Design Alignment (ContentPanel)
- ✅ 008 Schedule Page (ScheduleSlot data exists)

---

## Files Created

Files this implementation will create or modify:

- [ ] `package.json` — Modify: Add `nuqs` dependency
- [ ] `src/app/tasks/search-params.ts` — Create: nuqs parsers for URL state
- [ ] `src/hooks/use-task-scopes.ts` — Create: Hook for scopes with fading logic
- [ ] `src/components/tasks/task-list-tabs.tsx` — Create: Horizontal tab navigation
- [ ] `src/components/tasks/scope-selector.tsx` — Create: Reusable scope selector dropdown
- [ ] `src/components/tasks/scope-list.tsx` — Create: Sidebar list of scopes with Triage
- [ ] `src/components/tasks/task-content-placeholder.tsx` — Create: Placeholder content area
- [ ] `src/app/tasks/page.tsx` — Rewrite: Full tasks page layout

---

## Implementation Plan

### Step 1: Install nuqs

**Do**: Add nuqs package for URL search params management.

**Commands**:
```bash
pnpm add nuqs
```

**Verify**:
- `nuqs` added to `package.json` dependencies
- No installation errors

---

### Step 2: Create search-params.ts (nuqs parsers)

**Do**: Create nuqs parsers for tasks page URL state.

**Create** `src/app/tasks/search-params.ts`:

```typescript
import { createSearchParamsCache, parseAsStringLiteral } from "nuqs/server"
import { parseAsString } from "nuqs"

export const taskListTypes = ["now", "later", "backlog", "recurring", "recent"] as const
export type TaskListType = (typeof taskListTypes)[number]

// Search param parsers
export const searchParamsParsers = {
  // List type: "now" | "later" | "backlog" | "recurring" | "recent"
  list: parseAsStringLiteral(taskListTypes).withDefault("now"),

  // Scope: "triage" or a scope ID
  scope: parseAsString.withDefault("triage"),
}

// Server-side cache for SSR
export const searchParamsCache = createSearchParamsCache(searchParamsParsers)
```

**Verify**:
- File created
- Exports parsers and types
- No TypeScript errors: `pnpm tsc --noEmit`

---

### Step 3: Create use-task-scopes.ts (scopes with fading logic)

**Do**: Create a hook that returns scopes with contextual fading based on list type.

**Create** `src/hooks/use-task-scopes.ts`:

```typescript
import { useMemo } from "react"
import { useLiveQuery } from "dexie-react-hooks"
import { db, type Scope } from "@/lib/db"
import type { TaskListType } from "@/app/tasks/search-params"

export interface TaskScope extends Scope {
  isFaded: boolean
}

/**
 * Get scopes for the tasks page with contextual fading
 *
 * Fading rules:
 * - "now": Fade scopes without ScheduleSlot for today
 * - "later": Fade Projects without MonthSlot for current month (Jobs never fade)
 * - "backlog", "recurring", "recent": No fading
 */
export function useTaskScopes(listType: TaskListType): TaskScope[] | undefined {
  // Get all non-archived scopes
  const scopes = useLiveQuery(() =>
    db.scopes.filter((s) => !s.archivedAt).toArray()
  )

  // Get today's date for "now" filtering
  const today = useMemo(() => {
    const date = new Date()
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`
  }, [])

  // Get current month for "later" filtering
  const currentMonth = useMemo(() => {
    const date = new Date()
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`
  }, [])

  // Get schedule slots for today (for "now" fading)
  const todaySlots = useLiveQuery(
    () => listType === "now"
      ? db.scheduleSlots.where("date").equals(today).toArray()
      : Promise.resolve([]),
    [listType, today]
  )

  // Get month slots for current month (for "later" fading)
  const monthSlots = useLiveQuery(
    () => listType === "later"
      ? db.monthSlots.where("month").equals(currentMonth).toArray()
      : Promise.resolve([]),
    [listType, currentMonth]
  )

  // Compute scopes with fading
  const taskScopes = useMemo(() => {
    if (!scopes) return undefined
    if (listType === "now" && !todaySlots) return undefined
    if (listType === "later" && !monthSlots) return undefined

    return scopes.map((scope) => {
      let isFaded = false

      if (listType === "now") {
        // Fade if scope doesn't have a schedule slot for today
        const hasSlotToday = todaySlots?.some((slot) => slot.scopeId === scope.id)
        isFaded = !hasSlotToday
      } else if (listType === "later") {
        // Fade Projects without MonthSlot for current month (Jobs never fade)
        if (scope.type === "project") {
          const hasMonthSlot = monthSlots?.some((slot) => slot.projectId === scope.id)
          isFaded = !hasMonthSlot
        }
      }
      // For "backlog", "recurring", "recent": isFaded remains false

      return {
        ...scope,
        isFaded,
      }
    })
  }, [scopes, listType, todaySlots, monthSlots])

  return taskScopes
}
```

**Verify**:
- File created
- Hook returns scopes with `isFaded` property
- No TypeScript errors

---

### Step 4: Create task-list-tabs.tsx (horizontal tab navigation)

**Do**: Create the horizontal tab navigation for list types.

**Create** `src/components/tasks/task-list-tabs.tsx`:

```typescript
"use client"

import { useQueryState } from "nuqs"
import { searchParamsParsers, type TaskListType } from "@/app/tasks/search-params"
import { cn } from "@/lib/utils"

const LIST_TYPES: Array<{ value: TaskListType; label: string }> = [
  { value: "now", label: "Now" },
  { value: "later", label: "Later" },
  { value: "backlog", label: "Backlog" },
  { value: "recurring", label: "Recurring" },
  { value: "recent", label: "Recent" },
]

export function TaskListTabs() {
  const [activeListType, setActiveListType] = useQueryState("list", searchParamsParsers.list)

  return (
    <div className="flex items-center gap-1 border-b bg-background px-3">
      {LIST_TYPES.map(({ value, label }) => {
        const isActive = activeListType === value

        return (
          <button
            key={value}
            onClick={() => setActiveListType(value)}
            className={cn(
              "relative flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors",
              isActive
                ? "text-foreground"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {label}

            {/* Activity dots - placeholder for future implementation */}
            {/* TODO: Show colored dots when scope has tasks in this list */}

            {/* Active indicator bar */}
            {isActive && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
            )}
          </button>
        )
      })}
    </div>
  )
}
```

**Verify**:
- File created
- Tabs render and switch active state
- URL updates when tab is clicked
- No TypeScript errors

---

### Step 5: Create scope-selector.tsx (reusable dropdown component)

**Do**: Create a reusable scope selector using shadcn Popover + Command pattern.

**Commands**:
```bash
pnpm dlx shadcn@latest add popover
pnpm dlx shadcn@latest add command
```

**Create** `src/components/tasks/scope-selector.tsx`:

```typescript
"use client"

import { useState } from "react"
import { Check, ChevronsUpDown } from "lucide-react"
import { useQueryState } from "nuqs"
import { searchParamsParsers } from "@/app/tasks/search-params"
import { useTaskScopes } from "@/hooks/use-task-scopes"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

export function ScopeSelector() {
  const [open, setOpen] = useState(false)
  const [activeListType] = useQueryState("list", searchParamsParsers.list)
  const [activeScopeId, setActiveScopeId] = useQueryState("scope", searchParamsParsers.scope)

  const scopes = useTaskScopes(activeListType)

  // Show Triage in Now/Later/Backlog only
  const showTriage = ["now", "later", "backlog"].includes(activeListType)

  // Find current selected scope
  const selectedScope = activeScopeId !== "triage"
    ? scopes?.find((s) => s.id === activeScopeId)
    : null
  const selectedLabel = activeScopeId === "triage" ? "Triage" : selectedScope?.title || "Select scope..."

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between"
        >
          {selectedLabel}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[300px] p-0" align="start">
        <Command>
          <CommandInput placeholder="Search scopes..." />
          <CommandList>
            <CommandEmpty>No scope found.</CommandEmpty>
            <CommandGroup>
              {/* Triage (special item) */}
              {showTriage && (
                <CommandItem
                  value="triage"
                  onSelect={() => {
                    setActiveScopeId("triage")
                    setOpen(false)
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      activeScopeId === "triage" ? "opacity-100" : "opacity-0"
                    )}
                  />
                  <span className="mr-2 h-2 w-2 shrink-0 rounded-full bg-muted-foreground" />
                  Triage
                </CommandItem>
              )}

              {/* All scopes */}
              {scopes?.map((scope) => {
                const isJob = scope.type === "job"
                const dotClass = isJob ? "bg-primary" : "bg-primary"

                return (
                  <CommandItem
                    key={scope.id}
                    value={scope.id}
                    onSelect={() => {
                      setActiveScopeId(scope.id)
                      setOpen(false)
                    }}
                    className={cn(scope.isFaded && "opacity-50")}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        activeScopeId === scope.id ? "opacity-100" : "opacity-0"
                      )}
                    />
                    <span className={cn("mr-2 h-2 w-2 shrink-0 rounded-full", dotClass)} />
                    {scope.title}
                  </CommandItem>
                )
              })}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
```

**Verify**:
- Component renders
- Dropdown shows Triage + all scopes
- Faded scopes have 50% opacity
- Selection updates URL
- No TypeScript errors

---

### Step 6: Create scope-list.tsx (sidebar list version)

**Do**: Create a sidebar list version of the scope selector (desktop).

**Create** `src/components/tasks/scope-list.tsx`:

```typescript
"use client"

import { useQueryState } from "nuqs"
import { searchParamsParsers } from "@/app/tasks/search-params"
import { useTaskScopes } from "@/hooks/use-task-scopes"
import { cn } from "@/lib/utils"

export function ScopeList() {
  const [activeListType] = useQueryState("list", searchParamsParsers.list)
  const [activeScopeId, setActiveScopeId] = useQueryState("scope", searchParamsParsers.scope)

  const scopes = useTaskScopes(activeListType)

  // Show Triage in Now/Later/Backlog only
  const showTriage = ["now", "later", "backlog"].includes(activeListType)

  if (!scopes) {
    return <div className="p-4 text-sm text-muted-foreground">Loading...</div>
  }

  return (
    <div className="flex flex-col gap-0.5 p-2">
      {/* Triage (special fixed item at top) */}
      {showTriage && (
        <button
          onClick={() => setActiveScopeId("triage")}
          className={cn(
            "flex items-center gap-2 rounded-md px-3 py-2 text-left text-sm transition-colors",
            activeScopeId === "triage"
              ? "bg-muted font-medium"
              : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
          )}
        >
          <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-muted-foreground" />
          <span className="truncate">Triage</span>
          {/* TODO: Add task count indicator dot */}
        </button>
      )}

      {/* All scopes */}
      {scopes.map((scope) => {
        const isActive = activeScopeId === scope.id
        const isJob = scope.type === "job"

        // Jobs: filled dot, Projects: filled dot (color differs via theme)
        const dotClass = isJob ? "bg-primary" : "bg-primary"

        return (
          <button
            key={scope.id}
            onClick={() => setActiveScopeId(scope.id)}
            className={cn(
              "flex items-center gap-2 rounded-md px-3 py-2 text-left text-sm transition-colors",
              isActive
                ? "bg-muted font-medium"
                : "text-muted-foreground hover:bg-muted/50 hover:text-foreground",
              scope.isFaded && "opacity-50"
            )}
          >
            <span className={cn("h-2.5 w-2.5 shrink-0 rounded-full", dotClass)} />
            <span className="truncate">{scope.title}</span>
            {/* TODO: Add task count indicator dot */}
          </button>
        )
      })}
    </div>
  )
}
```

**Verify**:
- Sidebar list renders
- Triage appears at top (when applicable)
- Scopes are faded correctly
- Click updates URL
- No TypeScript errors

---

### Step 7: Create task-content-placeholder.tsx

**Do**: Create a placeholder component for the main content area.

**Create** `src/components/tasks/task-content-placeholder.tsx`:

```typescript
"use client"

import { useQueryState } from "nuqs"
import { searchParamsParsers } from "@/app/tasks/search-params"
import { useScopes } from "@/hooks/use-scopes"

export function TaskContentPlaceholder() {
  const [activeListType] = useQueryState("list", searchParamsParsers.list)
  const [activeScopeId] = useQueryState("scope", searchParamsParsers.scope)
  const scopes = useScopes()

  const scopeName = activeScopeId === "triage"
    ? "Triage"
    : scopes?.find((s) => s.id === activeScopeId)?.title || "Unknown"

  return (
    <div className="flex h-full items-center justify-center p-8">
      <div className="text-center">
        <p className="text-sm text-muted-foreground">
          Task list component will appear here
        </p>
        <p className="mt-2 text-xs text-muted-foreground/60">
          List: <span className="font-medium">{activeListType}</span> • Scope: <span className="font-medium">{scopeName}</span>
        </p>
        {/* TODO: Replace with actual TaskList component in next implementation */}
      </div>
    </div>
  )
}
```

**Verify**:
- Placeholder renders
- Shows current list type and scope from URL
- No TypeScript errors

---

### Step 8: Rewrite tasks/page.tsx (full layout)

**Do**: Build the complete Tasks page layout.

**Replace** `src/app/tasks/page.tsx`:

```typescript
"use client"

import { ContentPanel } from "@/components/layout/content-panel"
import { TaskListTabs } from "@/components/tasks/task-list-tabs"
import { ScopeList } from "@/components/tasks/scope-list"
import { ScopeSelector } from "@/components/tasks/scope-selector"
import { TaskContentPlaceholder } from "@/components/tasks/task-content-placeholder"
import { useIsMobile } from "@/hooks/use-media-query"

export default function TasksPage() {
  const isMobile = useIsMobile()

  return (
    <ContentPanel>
      <div className="flex h-full flex-col overflow-hidden">
        {/* Tabs (horizontal navigation) */}
        <TaskListTabs />

        {/* Two-column layout: Scope selector + Content */}
        <div className="flex flex-1 overflow-hidden">
          {/* Left: Scope selector sidebar (desktop) */}
          {!isMobile && (
            <aside className="w-64 shrink-0 overflow-y-auto border-r">
              <ScopeList />
            </aside>
          )}

          {/* Right: Main content area */}
          <main className="flex flex-1 flex-col overflow-hidden">
            {/* Mobile: Scope selector dropdown */}
            {isMobile && (
              <div className="border-b p-3">
                <ScopeSelector />
              </div>
            )}

            {/* Content area (placeholder for now) */}
            <div className="flex-1 overflow-y-auto">
              <TaskContentPlaceholder />
            </div>
          </main>
        </div>
      </div>
    </ContentPanel>
  )
}
```

**Verify**:
- Page renders with tabs at top
- Desktop: scope list in left sidebar
- Mobile: scope dropdown above content
- Layout scrolls correctly
- No TypeScript errors

---

### Step 9: Verify Build

**Do**: Ensure everything compiles and builds.

**Commands**:
```bash
pnpm tsc --noEmit
pnpm build
```

**Verify**:
- No TypeScript errors
- Build succeeds with exit code 0

---

### Step 10: Visual Verification

**Do**: Test in browser at various screen sizes.

**Commands**:
```bash
pnpm dev
```

**Checklist**:

1. **List Type Navigation**:
   - [ ] Tabs render horizontally: Now, Later, Backlog, Recurring, Recent
   - [ ] Click tab → switches active state
   - [ ] Active tab has underline indicator
   - [ ] No activity dots (expected, deferred to next implementation)

2. **Scope Selector (Desktop)**:
   - [ ] Left sidebar shows scope list
   - [ ] Triage appears at top in Now/Later/Backlog
   - [ ] Triage does NOT appear in Recurring/Recent
   - [ ] All Jobs + Projects render
   - [ ] Click scope → updates active scope
   - [ ] Active scope highlighted

3. **Contextual Fading**:
   - [ ] "Now" list: Scopes without today's ScheduleSlot are 50% opacity
   - [ ] "Later" list: Projects without current month's MonthSlot are 50% opacity
   - [ ] "Later" list: Jobs are NEVER faded
   - [ ] "Backlog/Recurring/Recent": No scopes faded

4. **Scope Selector (Mobile)**:
   - [ ] Resize to mobile → sidebar hidden
   - [ ] Dropdown appears above content
   - [ ] Dropdown shows current selected scope
   - [ ] Click → opens popover with all scopes
   - [ ] Select scope → updates and closes

5. **Placeholder Content**:
   - [ ] Main area shows placeholder text
   - [ ] Shows current list type and scope name
   - [ ] Area is scrollable (if content were long)

6. **URL State Persistence**:
   - [ ] URL reflects current state (e.g., `/tasks?list=now&scope=triage`)
   - [ ] Refresh page → state persists from URL
   - [ ] Browser back/forward → navigates between states
   - [ ] Copy URL → shareable link to specific list + scope

---

## Verification

Run these checks after implementation is complete:

| Check | Command | Expected Result |
|-------|---------|-----------------|
| TypeScript | `pnpm tsc --noEmit` | No errors |
| Linting | `pnpm lint` | No errors |
| Build | `pnpm build` | Exits with code 0 |
| Dev server | `pnpm dev` | Starts without errors |

Manual checks:
- [ ] Tasks page loads with tabs + scope selector + placeholder
- [ ] Tabs switch list type correctly
- [ ] Scope selector shows/hides Triage based on list type
- [ ] Fading logic works for "Now" and "Later" lists
- [ ] Mobile shows dropdown instead of sidebar
- [ ] No console errors or warnings
