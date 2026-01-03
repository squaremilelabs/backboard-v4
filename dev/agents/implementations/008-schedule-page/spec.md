# Schedule Page (7-Day View)

| Field | Value |
|-------|-------|
| **ID** | 008 |
| **Status** | ✅ Complete |
| **Progress** | All steps complete |
| **Created** | 2026-01-03 |
| **Last Updated** | 2026-01-03 |

---

## Overview

Build the Schedule Page with a 7-day view (Today → +6 days) showing all Jobs and Projects active in the relevant month(s). Users can click cells to toggle `ScheduleSlot` records. Reuses the grid infrastructure from 007.

---

## References

Read these before implementing:

| Topic | Source |
|-------|--------|
| Schedule page design | `dev/specs/prd.md` §4.2 |
| ScheduleSlot schema | `dev/specs/trd.md` §4.1 |
| Visual reference | `dev/specs/visuals/page-schedule.png` |
| Existing grid components | `src/components/scopes/schedule-cell.tsx`, `scope-grid-row.tsx` |
| Schedule mutations pattern | `src/lib/schedule-mutations.ts` |

---

## Scope

### In Scope
- 7-day grid: Today + next 6 days
- Date headers: "Mon, Jan 5", "Tue, Jan 6", etc.
- Rows: All non-archived Jobs + Projects active in current/next month
- Click cells to toggle `ScheduleSlot` (create/delete)
- Visual distinction: Gold (`.theme-gold`) for Jobs, Blue (`.theme-blue`) for Projects
- Reuse `ScheduleCell` component from 007
- Sticky header row (vertical scroll)
- Sticky title column (horizontal scroll)
- Scopes listed together (Jobs + Projects mixed), distinguished by dot color

### Out of Scope
- Auto-population from `DefaultScheduleSlot` (Local Sync Jobs implementation)
- Showing tasks within cells
- Drag-and-drop between days
- Week navigation (prev/next week)
- Today column highlight

---

## Dependencies

- ✅ 002 Database Schema (`scheduleSlots` table exists)
- ✅ 005 Scope Management (scopes CRUD, `useScopes` hook)
- ✅ 006 Design Alignment (ContentPanel, theme classes)
- ✅ 007 Scheduling Grids (`ScheduleCell` component, grid patterns)

---

## Files Created

Files this implementation will create or modify:

- [x] `src/lib/schedule-mutations.ts` — Add: `toggleScheduleSlot` function
- [x] `src/hooks/use-schedule-slots.ts` — Add: `useScheduleSlots`, `getNext7Days` helper
- [x] `src/hooks/use-scopes.ts` — Add: `useScheduleScopes` hook
- [x] `src/app/schedule/page.tsx` — Rewrite: Full schedule grid implementation
- [x] `src/components/schedule/schedule-grid-header.tsx` — Create: Header with date columns
- [x] `src/components/schedule/schedule-grid-row.tsx` — Create: Scope row with schedule cells

---

## Implementation Plan

### Step 1: Add toggleScheduleSlot to schedule-mutations.ts ✅

**Do**: Add a mutation function for toggling ScheduleSlot records.

**Modify** `src/lib/schedule-mutations.ts` — add at the end:

```typescript
// ============================================================================
// ScheduleSlot (7-day schedule)
// ============================================================================

export async function toggleScheduleSlot(
  scopeId: string,
  date: string // YYYY-MM-DD
): Promise<void> {
  // Check if slot exists
  const existing = await db.scheduleSlots
    .where("[date+scopeId]")
    .equals([date, scopeId])
    .first()

  if (existing) {
    await db.scheduleSlots.delete(existing.id)
  } else {
    // Derive weekday from date
    const dateObj = new Date(date + "T00:00:00")
    const weekdayIndex = dateObj.getDay() // 0 = Sunday
    const weekdays: Weekday[] = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"]
    const weekday = weekdays[weekdayIndex]

    await db.scheduleSlots.add({
      id: crypto.randomUUID(),
      date,
      weekday,
      scopeId,
    })
  }
}
```

**Verify**: 
- Function exported from file
- No TypeScript errors: `pnpm tsc --noEmit`

---

### Step 2: Add useScheduleSlots and getNext7Days to hooks ✅

**Do**: Add hook for fetching schedule slots and helper for generating next 7 days.

**Modify** `src/hooks/use-schedule-slots.ts` — add these exports:

```typescript
/**
 * Get all ScheduleSlots as a Set of "scopeId:date" keys for O(1) lookup
 */
export function useScheduleSlots(): Set<string> | undefined {
  const slots = useLiveQuery(() => db.scheduleSlots.toArray())

  if (slots === undefined) return undefined

  return new Set(slots.map((s) => `${s.scopeId}:${s.date}`))
}

/**
 * Get next 7 days starting from today
 * Returns array of { key: "YYYY-MM-DD", label: "Mon, Jan 5", month: "YYYY-MM" }
 */
export function getNext7Days(): Array<{ key: string; label: string; month: string }> {
  const days: Array<{ key: string; label: string; month: string }> = []
  const now = new Date()

  for (let i = 0; i < 7; i++) {
    const date = new Date(now.getFullYear(), now.getMonth(), now.getDate() + i)
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`
    const month = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`
    const label = date.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
    })
    days.push({ key, label, month })
  }

  return days
}
```

**Verify**: 
- Functions exported
- No TypeScript errors

---

### Step 3: Create schedule-grid-header.tsx ✅

**Do**: Create the header component for the schedule grid with date columns.

**Create** `src/components/schedule/schedule-grid-header.tsx`:

```typescript
"use client"

import { getNext7Days } from "@/hooks/use-schedule-slots"

export function ScheduleGridHeader() {
  const days = getNext7Days()

  return (
    <div className="flex shrink-0 items-center border-b bg-background text-sm text-muted-foreground">
      {/* Title column header - fixed width, sticky */}
      <div className="sticky left-0 z-10 w-2xs shrink-0 bg-background px-4 py-3 font-medium">
        Schedule
      </div>

      {/* Date column headers */}
      <div className="flex items-center px-2">
        {days.map(({ key, label }) => (
          <div key={key} className="min-w-20 flex-1 px-1 py-2 text-center">
            {label}
          </div>
        ))}
      </div>
    </div>
  )
}
```

**Verify**: 
- File created at `src/components/schedule/schedule-grid-header.tsx`
- No TypeScript errors

---

### Step 4: Create schedule-grid-row.tsx ✅

**Do**: Create the row component for each scope in the schedule grid.

**Create** `src/components/schedule/schedule-grid-row.tsx`:

```typescript
"use client"

import { getNext7Days } from "@/hooks/use-schedule-slots"
import { toggleScheduleSlot } from "@/lib/schedule-mutations"
import { cn } from "@/lib/utils"
import { ScheduleCell } from "@/components/scopes/schedule-cell"
import type { Scope } from "@/lib/db"

interface ScheduleGridRowProps {
  scope: Scope
  scheduleSlots?: Set<string>
}

export function ScheduleGridRow({ scope, scheduleSlots }: ScheduleGridRowProps) {
  const days = getNext7Days()
  const isJob = scope.type === "job"

  // Jobs: filled gold dot, Projects: filled blue dot
  const dotClass = isJob ? "bg-primary" : "bg-primary"
  // Theme wrapper for color context
  const themeClass = isJob ? "theme-gold" : "theme-blue"

  return (
    <div className={cn("group flex min-w-0 items-center transition-colors hover:bg-muted/50", themeClass)}>
      {/* Title cell - fixed width, sticky on scroll */}
      <div
        className={cn(
          "sticky left-0 z-10 flex w-2xs shrink-0 items-center gap-2 px-4 py-2",
          "bg-background group-hover:bg-muted/50"
        )}
      >
        {/* Scope type indicator dot */}
        <div className={cn("h-2.5 w-2.5 shrink-0 rounded-full", dotClass)} />

        {/* Title */}
        <span className="truncate text-sm">{scope.title}</span>
      </div>

      {/* Grid cells */}
      <div className="flex items-center px-2">
        {days.map(({ key: date }) => {
          const slotKey = `${scope.id}:${date}`
          const isActive = scheduleSlots?.has(slotKey) ?? false

          return (
            <div key={date} className="min-w-20 flex-1 px-1 py-1">
              <ScheduleCell
                state={isActive ? "active" : "empty"}
                onClick={() => toggleScheduleSlot(scope.id, date)}
              />
            </div>
          )
        })}
      </div>
    </div>
  )
}
```

**Verify**: 
- File created at `src/components/schedule/schedule-grid-row.tsx`
- No TypeScript errors

---

### Step 5: Create useScheduleScopes hook ✅

**Do**: Create a hook that returns all scopes that should appear on the Schedule page (all Jobs + Projects active in relevant months).

**Modify** `src/hooks/use-scopes.ts` — add this export:

```typescript
/**
 * Get scopes for the Schedule page:
 * - All non-archived Jobs
 * - Projects that have a MonthSlot for any of the provided months
 */
export function useScheduleScopes(activeMonths: string[]) {
  return useLiveQuery(
    async () => {
      // Get all non-archived scopes
      const allScopes = await db.scopes.filter((s) => !s.archivedAt).toArray()

      // Get all month slots
      const monthSlots = await db.monthSlots.toArray()
      const activeProjectIds = new Set(
        monthSlots
          .filter((ms) => activeMonths.includes(ms.month))
          .map((ms) => ms.projectId)
      )

      // Filter: all Jobs + Projects with active months
      return allScopes.filter(
        (scope) => scope.type === "job" || activeProjectIds.has(scope.id)
      )
    },
    [activeMonths.join(",")]
  )
}
```

**Verify**: 
- Function exported
- No TypeScript errors

---

### Step 6: Rewrite schedule/page.tsx ✅

**Do**: Build the complete Schedule page with the 7-day grid.

**Replace** `src/app/schedule/page.tsx`:

```typescript
"use client"

import { useMemo } from "react"
import { ContentPanel } from "@/components/layout/content-panel"
import { ScheduleGridHeader } from "@/components/schedule/schedule-grid-header"
import { ScheduleGridRow } from "@/components/schedule/schedule-grid-row"
import { useScheduleScopes } from "@/hooks/use-scopes"
import { useScheduleSlots, getNext7Days } from "@/hooks/use-schedule-slots"

export default function SchedulePage() {
  // Get the months covered by the 7-day range
  const activeMonths = useMemo(() => {
    const days = getNext7Days()
    const months = new Set(days.map((d) => d.month))
    return Array.from(months)
  }, [])

  const scopes = useScheduleScopes(activeMonths)
  const scheduleSlots = useScheduleSlots()

  return (
    <ContentPanel>
      <div className="flex h-full flex-col overflow-hidden">
        {/* Sticky header row */}
        <ScheduleGridHeader />

        {/* Scrollable content area */}
        <div className="flex-1 overflow-auto">
          {scopes === undefined ? (
            <div className="p-4 text-sm text-muted-foreground">Loading...</div>
          ) : scopes.length === 0 ? (
            <div className="p-4 text-sm text-muted-foreground">
              No scopes to schedule. Create Jobs or activate Projects for this month.
            </div>
          ) : (
            <div className="flex flex-col">
              {scopes.map((scope) => (
                <ScheduleGridRow
                  key={scope.id}
                  scope={scope}
                  scheduleSlots={scheduleSlots}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </ContentPanel>
  )
}
```

**Verify**: 
- File updated
- No TypeScript errors

---

### Step 7: Verify Build ✅

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

### Step 8: Visual Verification

**Do**: Test in browser.

**Commands**:
```bash
pnpm dev
```

**Checklist**:

1. **Grid Layout**:
   - [ ] Header shows "Schedule" + 7 date columns (e.g., "Mon, Jan 6", "Tue, Jan 7")
   - [ ] All Jobs appear in the grid
   - [ ] Projects only appear if they have a MonthSlot for the current/next month
   - [ ] Empty state shows when no scopes exist

2. **Cell Interaction**:
   - [ ] Click empty cell → fills with scope color (gold for Job, blue for Project)
   - [ ] Click filled cell → clears the cell
   - [ ] Hover empty cell → shows plus icon
   - [ ] Hover filled cell → shows X icon

3. **Data Persistence**:
   - [ ] Refresh page → scheduled slots persist
   - [ ] Check IndexedDB → `scheduleSlots` table has records

4. **Scrolling**:
   - [ ] Horizontal scroll → title column stays fixed
   - [ ] Vertical scroll → header row stays fixed
   - [ ] Cells don't shrink below min-width

5. **Scope Colors**:
   - [ ] Job rows have gold-colored filled cells
   - [ ] Project rows have blue-colored filled cells
   - [ ] Dot indicators match scope type

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
- [ ] Schedule page shows 7-day grid with date headers
- [ ] All Jobs visible, only active-month Projects visible
- [ ] Click toggles ScheduleSlot (gold for Jobs, blue for Projects)
- [ ] Sticky header + sticky title column work correctly
- [ ] Data persists in IndexedDB across refresh

