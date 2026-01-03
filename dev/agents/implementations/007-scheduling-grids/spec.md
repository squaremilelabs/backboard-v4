# Scheduling Grids (Jobs + Projects)

| Field | Value |
|-------|-------|
| **ID** | 007 |
| **Status** | 🟢 In Progress |
| **Progress** | Step 1 of 8 |
| **Created** | 2026-01-03 |
| **Last Updated** | 2026-01-03 |

---

## Overview

Add interactive scheduling grids to the Jobs and Projects pages. Jobs get a 7-day weekly template (Mon–Sun) for `DefaultScheduleSlot`, Projects get a 6-month timeline for `MonthSlot`. Both grids support click-to-toggle, hover states with plus/X icons, and dual-axis scrolling with sticky headers and title columns.

---

## References

Read these before implementing:

| Topic | Source |
|-------|--------|
| Jobs page design | `dev/specs/prd.md` §4.3 |
| Projects page design | `dev/specs/prd.md` §4.4 |
| DefaultScheduleSlot schema | `dev/specs/trd.md` §4.1 |
| MonthSlot schema | `dev/specs/trd.md` §4.1 |
| Visual reference | `dev/specs/visuals/page-jobs.png` |
| Visual reference | `dev/specs/visuals/page-projects.png` |

---

## Scope

### In Scope
- Jobs page: 7-day grid (Mon–Sun) with clickable cells to toggle `DefaultScheduleSlot`
- Projects page: 6-month grid (current month → +5) with clickable cells to toggle `MonthSlot`
- Hover states: Plus icon on empty cells, X icon on filled cells
- Parent project inheritance display: Light blue (secondary) when children are active but parent is not
- Sticky title column (horizontal scroll)
- Sticky header row (vertical scroll)
- Minimum column width: `min-w-10` (40px)
- Re-enable grids on mobile (they are currently hidden)
- Database operations: CRUD for `DefaultScheduleSlot` and `MonthSlot`

### Out of Scope
- Schedule page (separate implementation)
- Auto-population logic (ScheduleSlot creation from DefaultScheduleSlot)
- Drag-and-drop reordering of scopes
- Rich text content in scope modals

---

## Dependencies

- ✅ 002 Database Schema (`defaultScheduleSlots`, `monthSlots` tables exist)
- ✅ 005 Scope Management (Jobs/Projects pages with CRUD)
- ✅ 006 Design Alignment (visual foundation, theme classes)

---

## Files Created

Files this implementation will create or modify:

- [x] `src/lib/schedule-mutations.ts` — Create: CRUD functions for DefaultScheduleSlot and MonthSlot ✅
- [ ] `src/hooks/use-schedule-slots.ts` — Create: Dexie live queries for schedule data
- [ ] `src/components/scopes/schedule-cell.tsx` — Create: Reusable toggle cell with hover states
- [ ] `src/components/scopes/scope-grid-header.tsx` — Modify: Add min-width, enable on mobile
- [ ] `src/components/scopes/scope-grid-row.tsx` — Modify: Replace placeholder cells with interactive ScheduleCell
- [ ] `src/app/jobs/page.tsx` — Modify: Add scroll container structure for sticky positioning
- [ ] `src/app/projects/page.tsx` — Modify: Add scroll container structure for sticky positioning

---

## Implementation Plan

### Step 1: Create schedule-mutations.ts

**Do**: Create database mutation functions for toggling schedule slots.

**File**: `src/lib/schedule-mutations.ts`

```typescript
import { db, type Weekday } from "@/lib/db"

// ============================================================================
// DefaultScheduleSlot (Jobs weekly template)
// ============================================================================

export async function toggleDefaultScheduleSlot(
  jobId: string,
  weekday: Weekday
): Promise<void> {
  // Check if slot exists
  const existing = await db.defaultScheduleSlots
    .where("[weekday+jobId]")
    .equals([weekday, jobId])
    .first()

  if (existing) {
    await db.defaultScheduleSlots.delete(existing.id)
  } else {
    await db.defaultScheduleSlots.add({
      id: crypto.randomUUID(),
      weekday,
      jobId,
    })
  }
}

// ============================================================================
// MonthSlot (Projects 6-month timeline)
// ============================================================================

export async function toggleMonthSlot(
  projectId: string,
  month: string // YYYY-MM
): Promise<void> {
  // Check if slot exists
  const existing = await db.monthSlots
    .where("[month+projectId]")
    .equals([month, projectId])
    .first()

  if (existing) {
    await db.monthSlots.delete(existing.id)
  } else {
    await db.monthSlots.add({
      id: crypto.randomUUID(),
      month,
      projectId,
    })
  }
}
```

**Verify**: File exists and exports two functions. No TypeScript errors.

---

### Step 2: Create use-schedule-slots.ts

**Do**: Create Dexie live query hooks for fetching schedule data reactively.

**File**: `src/hooks/use-schedule-slots.ts`

```typescript
import { useLiveQuery } from "dexie-react-hooks"
import { db, type Weekday } from "@/lib/db"

/**
 * Get all DefaultScheduleSlots as a Set of "jobId:weekday" keys for O(1) lookup
 */
export function useDefaultScheduleSlots(): Set<string> | undefined {
  const slots = useLiveQuery(() => db.defaultScheduleSlots.toArray())
  
  if (slots === undefined) return undefined
  
  return new Set(slots.map((s) => `${s.jobId}:${s.weekday}`))
}

/**
 * Get all MonthSlots as a Set of "projectId:month" keys for O(1) lookup
 */
export function useMonthSlots(): Set<string> | undefined {
  const slots = useLiveQuery(() => db.monthSlots.toArray())
  
  if (slots === undefined) return undefined
  
  return new Set(slots.map((s) => `${s.projectId}:${s.month}`))
}

/**
 * Get MonthSlots grouped by month for calculating parent inheritance
 * Returns Map<month, Set<projectId>>
 */
export function useMonthSlotsByMonth(): Map<string, Set<string>> | undefined {
  const slots = useLiveQuery(() => db.monthSlots.toArray())
  
  if (slots === undefined) return undefined
  
  const byMonth = new Map<string, Set<string>>()
  for (const slot of slots) {
    if (!byMonth.has(slot.month)) {
      byMonth.set(slot.month, new Set())
    }
    byMonth.get(slot.month)!.add(slot.projectId)
  }
  return byMonth
}

/**
 * Weekday constants for iteration
 */
export const WEEKDAYS: Weekday[] = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"]
export const WEEKDAY_LABELS: Record<Weekday, string> = {
  mon: "Mon",
  tue: "Tue",
  wed: "Wed",
  thu: "Thu",
  fri: "Fri",
  sat: "Sat",
  sun: "Sun",
}

/**
 * Get next 6 months as YYYY-MM strings and short labels
 */
export function getNext6Months(): Array<{ key: string; label: string }> {
  const months: Array<{ key: string; label: string }> = []
  const now = new Date()
  for (let i = 0; i < 6; i++) {
    const date = new Date(now.getFullYear(), now.getMonth() + i, 1)
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`
    const label = date.toLocaleString("en-US", { month: "short" })
    months.push({ key, label })
  }
  return months
}
```

**Verify**: File exists and exports hooks and constants. No TypeScript errors.

---

### Step 3: Create schedule-cell.tsx

**Do**: Create the interactive cell component with hover states and toggle behavior.

**File**: `src/components/scopes/schedule-cell.tsx`

```typescript
"use client"

import { Plus, X } from "lucide-react"
import { cn } from "@/lib/utils"

type CellState = "empty" | "active" | "inherited"

interface ScheduleCellProps {
  state: CellState
  onClick: () => void
}

export function ScheduleCell({ state, onClick }: ScheduleCellProps) {
  const isActive = state === "active"
  const isInherited = state === "inherited"
  const isEmpty = state === "empty"

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "group/cell relative flex h-8 w-full items-center justify-center rounded transition-colors",
        // Base states
        isEmpty && "border border-dashed border-muted-foreground/20 hover:border-primary/50 hover:bg-primary/10",
        isActive && "bg-primary hover:bg-primary/80",
        isInherited && "bg-secondary hover:bg-secondary/80"
      )}
    >
      {/* Hover icon: Plus for empty/inherited, X for active */}
      <span
        className={cn(
          "opacity-0 transition-opacity group-hover/cell:opacity-100",
          isActive ? "text-primary-foreground" : "text-primary"
        )}
      >
        {isActive ? (
          <X className="h-4 w-4" />
        ) : (
          <Plus className="h-4 w-4" />
        )}
      </span>
    </button>
  )
}
```

**Verify**: File exists. Component renders with three visual states. No TypeScript errors.

---

### Step 4: Update scope-grid-header.tsx

**Do**: 
1. Remove mobile hiding (`isMobile` check)
2. Add `min-w-10` to column cells
3. Use the new month utilities for consistent key/label handling

**File**: `src/components/scopes/scope-grid-header.tsx`

Replace entire file:

```typescript
"use client"

import { WEEKDAY_LABELS, WEEKDAYS, getNext6Months } from "@/hooks/use-schedule-slots"

interface ScopeGridHeaderProps {
  type: "jobs" | "projects"
}

export function ScopeGridHeader({ type }: ScopeGridHeaderProps) {
  const isJobs = type === "jobs"
  
  const columns = isJobs
    ? WEEKDAYS.map((w) => ({ key: w, label: WEEKDAY_LABELS[w] }))
    : getNext6Months()

  return (
    <div className="flex shrink-0 items-center border-b bg-background text-sm text-muted-foreground">
      {/* Title column header - fixed width, sticky */}
      <div className="sticky left-0 z-10 w-2xs shrink-0 bg-background px-4 py-3 font-medium">
        {isJobs ? "Jobs" : "Projects"}
      </div>

      {/* Column headers - min width enforced */}
      <div className="flex items-center px-2">
        {columns.map(({ key, label }) => (
          <div key={key} className="min-w-10 flex-1 px-1 py-2 text-center">
            {label}
          </div>
        ))}
      </div>
    </div>
  )
}
```

**Verify**: 
- `isMobile` check removed — header renders on all screen sizes
- Columns have `min-w-10` class
- No TypeScript errors

---

### Step 5: Update scope-grid-row.tsx

**Do**:
1. Remove mobile hiding for grid cells
2. Accept schedule slot data via props
3. Use `ScheduleCell` component for each cell
4. Calculate cell state (empty/active/inherited for projects)
5. Add `min-w-10` to cells

**File**: `src/components/scopes/scope-grid-row.tsx`

Replace entire file:

```typescript
"use client"

import { useState, useRef, useEffect } from "react"
import { MoreHorizontal } from "lucide-react"
import { useIsMobile } from "@/hooks/use-media-query"
import { WEEKDAYS, getNext6Months } from "@/hooks/use-schedule-slots"
import { updateScopeTitle } from "@/lib/scope-mutations"
import { toggleDefaultScheduleSlot, toggleMonthSlot } from "@/lib/schedule-mutations"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScheduleCell } from "./schedule-cell"
import type { Scope, Weekday } from "@/lib/db"

interface ScopeGridRowProps {
  scope: Scope
  isNested?: boolean
  onOpenModal: (scope: Scope) => void
  // For jobs: Set of "jobId:weekday" keys
  defaultScheduleSlots?: Set<string>
  // For projects: Set of "projectId:month" keys
  monthSlots?: Set<string>
  // For projects: child project IDs for inheritance calculation
  childIds?: string[]
}

export function ScopeGridRow({
  scope,
  isNested = false,
  onOpenModal,
  defaultScheduleSlots,
  monthSlots,
  childIds = [],
}: ScopeGridRowProps) {
  const isMobile = useIsMobile()
  const [isEditing, setIsEditing] = useState(false)
  const [editValue, setEditValue] = useState(scope.title)
  const inputRef = useRef<HTMLInputElement>(null)

  // Focus input when entering edit mode
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus()
      inputRef.current.select()
    }
  }, [isEditing])

  const handleSave = async () => {
    if (editValue.trim() && editValue.trim() !== scope.title) {
      await updateScopeTitle(scope.id, editValue.trim())
    } else {
      setEditValue(scope.title)
    }
    setIsEditing(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSave()
    } else if (e.key === "Escape") {
      setEditValue(scope.title)
      setIsEditing(false)
    }
  }

  const handleRowClick = () => {
    if (isMobile) {
      onOpenModal(scope)
    }
  }

  const handleTitleClick = (e: React.MouseEvent) => {
    if (!isMobile) {
      e.stopPropagation()
      setIsEditing(true)
    }
  }

  const isJob = scope.type === "job"
  // For projects: parent = hollow dot, child = filled dot
  // For jobs: always filled dot
  const dotStyle = isJob
    ? "bg-primary"
    : isNested
      ? "bg-primary"
      : "border-2 border-primary bg-transparent"

  // Calculate cell states and render cells
  const renderCells = () => {
    if (isJob) {
      // Jobs: 7 weekday cells
      return WEEKDAYS.map((weekday) => {
        const key = `${scope.id}:${weekday}`
        const isActive = defaultScheduleSlots?.has(key) ?? false
        
        return (
          <div key={weekday} className="min-w-10 flex-1 px-1 py-1">
            <ScheduleCell
              state={isActive ? "active" : "empty"}
              onClick={() => toggleDefaultScheduleSlot(scope.id, weekday)}
            />
          </div>
        )
      })
    } else {
      // Projects: 6 month cells
      const months = getNext6Months()
      return months.map(({ key: month }) => {
        const selfKey = `${scope.id}:${month}`
        const isActive = monthSlots?.has(selfKey) ?? false
        
        // Check for inherited state (parent with active children)
        let isInherited = false
        if (!isNested && !isActive && childIds.length > 0 && monthSlots) {
          // Check if any child has this month active
          isInherited = childIds.some((childId) => monthSlots.has(`${childId}:${month}`))
        }
        
        const state = isActive ? "active" : isInherited ? "inherited" : "empty"
        
        return (
          <div key={month} className="min-w-10 flex-1 px-1 py-1">
            <ScheduleCell
              state={state}
              onClick={() => toggleMonthSlot(scope.id, month)}
            />
          </div>
        )
      })
    }
  }

  return (
    <div
      className={cn(
        "group flex min-w-0 items-center transition-colors hover:bg-muted/50",
        isMobile && "cursor-pointer"
      )}
      onClick={handleRowClick}
    >
      {/* Title cell - fixed width, sticky on scroll */}
      <div
        className={cn(
          "sticky left-0 z-10 flex w-2xs shrink-0 items-center gap-2 px-4 py-2",
          "bg-background group-hover:bg-muted/50"
        )}
      >
        {/* Indentation for nested items */}
        {isNested && <div className="w-4 shrink-0" />}

        {/* Scope type indicator dot */}
        <div className={cn("h-2.5 w-2.5 shrink-0 rounded-full", dotStyle)} />

        {/* Title - editable on desktop */}
        <div className="min-w-0 flex-1">
          {isEditing && !isMobile ? (
            <Input
              ref={inputRef}
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onBlur={handleSave}
              onKeyDown={handleKeyDown}
              className="h-7 px-2 py-1"
            />
          ) : (
            <span
              onClick={handleTitleClick}
              className={cn(
                "block truncate text-sm",
                !isMobile && "-mx-1 cursor-text rounded px-1 hover:bg-muted"
              )}
            >
              {scope.title}
            </span>
          )}
        </div>

        {/* More button - desktop only */}
        {!isMobile && (
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 shrink-0 opacity-0 transition-opacity group-hover:opacity-100"
            onClick={(e) => {
              e.stopPropagation()
              onOpenModal(scope)
            }}
          >
            <MoreHorizontal className="h-4 w-4" />
            <span className="sr-only">More options</span>
          </Button>
        )}
      </div>

      {/* Grid cells - now shown on all screen sizes */}
      <div className="flex items-center px-2">
        {renderCells()}
      </div>
    </div>
  )
}
```

**Verify**:
- Grid cells render on mobile (no `isMobile` hiding)
- Cells have `min-w-10` class
- ScheduleCell component used for each cell
- Inheritance logic works for parent projects
- No TypeScript errors

---

### Step 6: Update scope-list.tsx

**Do**: Pass schedule slot data to ScopeGridRow components.

**File**: `src/components/scopes/scope-list.tsx`

Replace entire file:

```typescript
"use client"

import { useState } from "react"

import { AddScopeInput } from "./add-scope-input"
import { ScopeGridRow } from "./scope-grid-row"
import { ScopeModal } from "./scope-modal"
import { useScopes } from "@/hooks/use-scopes"
import { useDefaultScheduleSlots, useMonthSlots } from "@/hooks/use-schedule-slots"
import type { Scope, ScopeType } from "@/lib/db"

interface ScopeListProps {
  type: ScopeType
}

export function ScopeList({ type }: ScopeListProps) {
  const scopes = useScopes(type)
  const defaultScheduleSlots = useDefaultScheduleSlots()
  const monthSlots = useMonthSlots()
  const [modalScope, setModalScope] = useState<Scope | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)

  const handleOpenModal = (scope: Scope) => {
    setModalScope(scope)
    setIsModalOpen(true)
  }

  const handleCloseModal = (open: boolean) => {
    setIsModalOpen(open)
    if (!open) {
      setModalScope(null)
    }
  }

  if (scopes === undefined) {
    return <div className="p-4 text-sm text-muted-foreground">Loading...</div>
  }

  // For jobs: simple flat list
  if (type === "job") {
    return (
      <>
        <div className="flex flex-col">
          {scopes.map((scope) => (
            <ScopeGridRow
              key={scope.id}
              scope={scope}
              onOpenModal={handleOpenModal}
              defaultScheduleSlots={defaultScheduleSlots}
            />
          ))}
          <AddScopeInput type="job" />
        </div>

        <ScopeModal scope={modalScope} open={isModalOpen} onOpenChange={handleCloseModal} />
      </>
    )
  }

  // Projects: handle nesting
  const parentProjects = scopes.filter((s) => !s.parentId)
  const childrenByParent = scopes.reduce(
    (acc, scope) => {
      if (scope.parentId) {
        if (!acc[scope.parentId]) {
          acc[scope.parentId] = []
        }
        acc[scope.parentId].push(scope)
      }
      return acc
    },
    {} as Record<string, Scope[]>
  )

  return (
    <>
      <div className="flex flex-col">
        {parentProjects.map((project) => {
          const children = childrenByParent[project.id] || []
          const childIds = children.map((c) => c.id)

          return (
            <div key={project.id}>
              <ScopeGridRow
                scope={project}
                onOpenModal={handleOpenModal}
                monthSlots={monthSlots}
                childIds={childIds}
              />
              {/* Nested children */}
              {children.map((child) => (
                <ScopeGridRow
                  key={child.id}
                  scope={child}
                  isNested
                  onOpenModal={handleOpenModal}
                  monthSlots={monthSlots}
                />
              ))}
              {/* Add child project */}
              <AddScopeInput type="project" parentId={project.id} />
            </div>
          )
        })}
        <AddScopeInput type="project" />
      </div>

      <ScopeModal scope={modalScope} open={isModalOpen} onOpenChange={handleCloseModal} />
    </>
  )
}
```

**Verify**:
- Schedule hooks imported and used
- Data passed to ScopeGridRow via props
- childIds calculated and passed for parent projects
- No TypeScript errors

---

### Step 7: Update page layouts for dual-axis scrolling

**Do**: Restructure Jobs and Projects pages to support:
1. Horizontal scrolling with sticky title column
2. Vertical scrolling with sticky header row

**File**: `src/app/jobs/page.tsx`

Replace entire file:

```typescript
"use client"

import { ContentPanel } from "@/components/layout/content-panel"
import { ScopeList } from "@/components/scopes/scope-list"
import { ScopeGridHeader } from "@/components/scopes/scope-grid-header"

export default function JobsPage() {
  return (
    <ContentPanel>
      <div className="theme-gold flex h-full flex-col overflow-hidden">
        {/* Sticky header row */}
        <ScopeGridHeader type="jobs" />

        {/* Scrollable content area - both axes */}
        <div className="flex-1 overflow-auto">
          <ScopeList type="job" />
        </div>
      </div>
    </ContentPanel>
  )
}
```

**File**: `src/app/projects/page.tsx`

Replace entire file:

```typescript
"use client"

import { ContentPanel } from "@/components/layout/content-panel"
import { ScopeList } from "@/components/scopes/scope-list"
import { ScopeGridHeader } from "@/components/scopes/scope-grid-header"

export default function ProjectsPage() {
  return (
    <ContentPanel>
      <div className="theme-blue flex h-full flex-col overflow-hidden">
        {/* Sticky header row */}
        <ScopeGridHeader type="projects" />

        {/* Scrollable content area - both axes */}
        <div className="flex-1 overflow-auto">
          <ScopeList type="project" />
        </div>
      </div>
    </ContentPanel>
  )
}
```

**Verify**:
- Pages have `overflow-hidden` on container
- Scroll container has `overflow-auto`
- Header stays fixed during vertical scroll
- Title column stays fixed during horizontal scroll

---

### Step 8: Delete unused grid-placeholder.tsx

**Do**: Remove the placeholder component that is no longer needed.

**Command**:
```bash
rm src/components/scopes/grid-placeholder.tsx
```

**Verify**: File no longer exists.

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

- [ ] **Jobs page**: Click a cell → toggles gold fill, database record created/deleted
- [ ] **Jobs page**: Hover empty cell → shows plus icon
- [ ] **Jobs page**: Hover filled cell → shows X icon
- [ ] **Projects page**: Click a cell → toggles blue fill, database record created/deleted
- [ ] **Projects page**: Parent shows light blue when children have active months but parent doesn't
- [ ] **Projects page**: Click light blue parent cell → becomes solid blue (creates own MonthSlot)
- [ ] **Horizontal scroll**: Title column stays fixed, cells scroll
- [ ] **Vertical scroll**: Header row stays fixed, rows scroll
- [ ] **Mobile**: Grids visible and scrollable horizontally (may show 1-2 columns)
- [ ] **Column width**: Cells don't shrink below 40px (min-w-10)

