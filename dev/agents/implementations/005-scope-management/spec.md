# Scope Management (Jobs & Projects)

| Field            | Value                                              |
| ---------------- | -------------------------------------------------- |
| **ID**           | 005                                                |
| **Status**       | ✅ Complete                                        |
| **Progress**     | Core CRUD complete. Visual design deferred to 006. |
| **Created**      | 2025-12-31                                         |
| **Last Updated** | 2025-12-31                                         |

> **Note**: This implementation delivers core CRUD functionality (add, edit, archive) for Jobs and
> Projects. However, the visual layout does not yet match the Figma designs (grid structure, sticky
> columns, etc.). A follow-up implementation (006) will focus on design alignment.

---

## Overview

Build the Jobs and Projects pages with full CRUD for scopes (add, edit title, archive). Includes a
responsive modal (dialog on desktop, full-screen sheet on mobile), inline title editing on desktop,
and a placeholder for the scheduling grids. Projects support 1-level nesting.

---

## References

Read these before implementing:

| Topic                | Source                                                                 |
| -------------------- | ---------------------------------------------------------------------- |
| Scope data model     | `dev/specs/trd.md` §4.1 — `Scope` interface                            |
| Jobs page layout     | `dev/specs/prd.md` §4.3                                                |
| Projects page layout | `dev/specs/prd.md` §4.4                                                |
| Project nesting      | `dev/specs/prd.md` §2.1 — "1-level nesting"                            |
| Database operations  | `src/lib/db.ts` — `db.scopes` table                                    |
| Theme classes        | `src/app/globals.css` — `.theme-gold` (Jobs), `.theme-blue` (Projects) |

---

## Scope

### In Scope

- **Jobs page**: Two-panel layout (list left, grid placeholder right)
- **Projects page**: Two-panel layout with nested project display
- **Add scope**: Inline input at bottom of list
- **Edit title**: Desktop = inline click-to-edit, Mobile = in modal
- **Scope modal**: Edit title + archive button
  - Desktop: Centered dialog
  - Mobile: Full-screen sheet
- **Archive flow**: Simple confirmation dialog
- **More menu**: Desktop only — icon button opens modal
- **Grid placeholder**: "Coming soon" message, hidden on mobile
- **Project nesting**: 1-level parent/child with indented display
- **Responsive behavior**: List-only on mobile (grid hidden)

### Out of Scope

- Weekly template grid (DefaultScheduleSlots) — future implementation
- 6-month timeline grid (MonthSlots) — future implementation
- Rich text editor for scope content (Tiptap) — future implementation
- Task-aware archive confirmation — future implementation
- Drag-and-drop reordering — future implementation

---

## Dependencies

- `001-initial-project-setup` ✅ Complete
- `002-database-schema` ✅ Complete — provides `db.scopes` table
- `003-shadcn-ui-setup` ✅ Complete — provides theme classes
- `004-page-layout-navigation` ✅ Complete — provides page shell

---

## Files Created

Exact files this implementation will create or modify:

### shadcn/ui Components (created by CLI)

- [x] `src/components/ui/dialog.tsx`
- [x] `src/components/ui/input.tsx`
- [x] `src/components/ui/alert-dialog.tsx`

### Scope Components

- [x] `src/components/scopes/scope-modal.tsx` — Responsive modal (dialog/sheet)
- [x] `src/components/scopes/scope-list-item.tsx` — List item with inline edit
- [x] `src/components/scopes/add-scope-input.tsx` — Inline add input
- [x] `src/components/scopes/scope-list.tsx` — List container
- [x] `src/components/scopes/grid-placeholder.tsx` — Placeholder for future grid

### Hooks

- [x] `src/hooks/use-media-query.ts` — Detect mobile vs desktop
- [x] `src/hooks/use-scopes.ts` — Dexie live queries for scopes (read only)

### Lib

- [x] `src/lib/scope-mutations.ts` — Scope mutation functions (create, update, archive)

### Pages (modify existing)

- [x] `src/app/jobs/page.tsx` — Jobs page with scope list
- [x] `src/app/projects/page.tsx` — Projects page with nested list

---

## Implementation Plan

### Step 1: Install shadcn/ui Components

**Do**: Install Dialog, Input, and AlertDialog components.

**Commands**:

```bash
pnpm dlx shadcn@latest add dialog input alert-dialog
```

**Verify**:

- `src/components/ui/dialog.tsx` exists
- `src/components/ui/input.tsx` exists
- `src/components/ui/alert-dialog.tsx` exists
- No TypeScript errors: `pnpm exec tsc --noEmit`

---

### Step 2: Create useMediaQuery Hook

**Do**: Create a hook to detect screen size for responsive modal behavior.

**Create file** `src/hooks/use-media-query.ts`:

```typescript
"use client"

import { useEffect, useState } from "react"

export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false)

  useEffect(() => {
    const media = window.matchMedia(query)

    // Set initial value
    setMatches(media.matches)

    // Listen for changes
    const listener = (event: MediaQueryListEvent) => {
      setMatches(event.matches)
    }

    media.addEventListener("change", listener)
    return () => media.removeEventListener("change", listener)
  }, [query])

  return matches
}

// Convenience hook for mobile detection
export function useIsMobile(): boolean {
  return !useMediaQuery("(min-width: 768px)")
}
```

**Verify**:

- File exists at `src/hooks/use-media-query.ts`
- No TypeScript errors

---

### Step 3: Create useScopes Hook

**Do**: Create Dexie live query hooks for fetching scopes. These are read-only queries — mutations
live in a separate file.

**Create file** `src/hooks/use-scopes.ts`:

```typescript
"use client"

import { useLiveQuery } from "dexie-react-hooks"
import { db, type ScopeType } from "@/lib/db"

export function useScopes(type: ScopeType) {
  return useLiveQuery(
    () =>
      db.scopes
        .where("type")
        .equals(type)
        .filter((scope) => !scope.archivedAt)
        .toArray(),
    [type]
  )
}

export function useScope(id: string | null) {
  return useLiveQuery(() => (id ? db.scopes.get(id) : undefined), [id])
}
```

**Verify**:

- File exists at `src/hooks/use-scopes.ts`
- No TypeScript errors

---

### Step 4: Create Scope Mutations

**Do**: Create mutation functions for scope operations. These are plain async functions (not hooks)
that write to the database.

**Create file** `src/lib/scope-mutations.ts`:

```typescript
import { db, type ScopeType } from "@/lib/db"

export async function createScope(
  type: ScopeType,
  title: string,
  parentId?: string
): Promise<string> {
  const id = crypto.randomUUID()
  await db.scopes.add({
    id,
    type,
    title,
    parentId,
    createdAt: Date.now(),
  })
  return id
}

export async function updateScopeTitle(id: string, title: string): Promise<void> {
  await db.scopes.update(id, { title })
}

export async function archiveScope(id: string): Promise<void> {
  await db.scopes.update(id, { archivedAt: Date.now() })
}
```

**Verify**:

- File exists at `src/lib/scope-mutations.ts`
- No TypeScript errors

---

### Step 5: Create GridPlaceholder Component

**Do**: Create a placeholder component for the future scheduling grids.

**Create file** `src/components/scopes/grid-placeholder.tsx`:

```tsx
"use client"

import { CalendarDays } from "lucide-react"

interface GridPlaceholderProps {
  type: "jobs" | "projects"
}

export function GridPlaceholder({ type }: GridPlaceholderProps) {
  const message =
    type === "jobs" ? "Weekly schedule template coming soon" : "6-month timeline coming soon"

  return (
    <div className="flex h-full flex-col items-center justify-center text-muted-foreground">
      <CalendarDays className="mb-4 h-12 w-12 opacity-50" />
      <p className="text-sm">{message}</p>
    </div>
  )
}
```

**Verify**:

- File exists at `src/components/scopes/grid-placeholder.tsx`
- No TypeScript errors

---

### Step 6: Create ScopeModal Component

**Do**: Create a responsive modal that shows as Dialog on desktop and full-screen Sheet on mobile.

**Create file** `src/components/scopes/scope-modal.tsx`:

```tsx
"use client"

import { useState } from "react"
import { useIsMobile } from "@/hooks/use-media-query"
import { updateScopeTitle, archiveScope } from "@/lib/scope-mutations"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from "@/components/ui/sheet"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import type { Scope } from "@/lib/db"

interface ScopeModalProps {
  scope: Scope | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ScopeModal({ scope, open, onOpenChange }: ScopeModalProps) {
  const isMobile = useIsMobile()
  const [title, setTitle] = useState(scope?.title ?? "")
  const [showArchiveConfirm, setShowArchiveConfirm] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  // Sync title when scope changes
  const handleOpenChange = (newOpen: boolean) => {
    if (newOpen && scope) {
      setTitle(scope.title)
    }
    onOpenChange(newOpen)
  }

  const handleSave = async () => {
    if (!scope || !title.trim()) return
    setIsSaving(true)
    try {
      await updateScopeTitle(scope.id, title.trim())
      onOpenChange(false)
    } finally {
      setIsSaving(false)
    }
  }

  const handleArchive = async () => {
    if (!scope) return
    await archiveScope(scope.id)
    setShowArchiveConfirm(false)
    onOpenChange(false)
  }

  const typeLabel = scope?.type === "job" ? "Job" : "Project"

  const content = (
    <>
      <div className="space-y-4 py-4">
        <div className="space-y-2">
          <label htmlFor="scope-title" className="text-sm font-medium">
            Title
          </label>
          <Input
            id="scope-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={`${typeLabel} title`}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                handleSave()
              }
            }}
          />
        </div>

        {/* Placeholder for future rich text content */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-muted-foreground">Notes</label>
          <div className="rounded-md border border-dashed p-4 text-center text-sm text-muted-foreground">
            Rich text notes coming soon
          </div>
        </div>
      </div>
    </>
  )

  const footer = (
    <div className="flex w-full items-center justify-between">
      <Button variant="destructive" onClick={() => setShowArchiveConfirm(true)}>
        Archive
      </Button>
      <div className="flex gap-2">
        <Button variant="outline" onClick={() => onOpenChange(false)}>
          Cancel
        </Button>
        <Button onClick={handleSave} disabled={isSaving || !title.trim()}>
          {isSaving ? "Saving..." : "Save"}
        </Button>
      </div>
    </div>
  )

  // Archive confirmation dialog
  const archiveConfirmDialog = (
    <AlertDialog open={showArchiveConfirm} onOpenChange={setShowArchiveConfirm}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Archive {typeLabel}?</AlertDialogTitle>
          <AlertDialogDescription>
            This will move &quot;{scope?.title}&quot; to the archive. You can restore it from the
            Archive page within 30 days.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={handleArchive}>Archive</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )

  if (isMobile) {
    return (
      <>
        <Sheet open={open} onOpenChange={handleOpenChange}>
          <SheetContent side="bottom" className="h-full">
            <SheetHeader>
              <SheetTitle>Edit {typeLabel}</SheetTitle>
            </SheetHeader>
            {content}
            <SheetFooter className="mt-auto">{footer}</SheetFooter>
          </SheetContent>
        </Sheet>
        {archiveConfirmDialog}
      </>
    )
  }

  return (
    <>
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit {typeLabel}</DialogTitle>
          </DialogHeader>
          {content}
          <DialogFooter>{footer}</DialogFooter>
        </DialogContent>
      </Dialog>
      {archiveConfirmDialog}
    </>
  )
}
```

**Verify**:

- File exists at `src/components/scopes/scope-modal.tsx`
- No TypeScript errors

---

### Step 7: Create ScopeListItem Component

**Do**: Create the list item with inline editing on desktop and click-to-modal on mobile.

**Create file** `src/components/scopes/scope-list-item.tsx`:

```tsx
"use client"

import { useState, useRef, useEffect } from "react"
import { MoreHorizontal } from "lucide-react"
import { useIsMobile } from "@/hooks/use-media-query"
import { updateScopeTitle } from "@/lib/scope-mutations"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import type { Scope } from "@/lib/db"

interface ScopeListItemProps {
  scope: Scope
  isNested?: boolean
  onOpenModal: (scope: Scope) => void
}

export function ScopeListItem({ scope, isNested = false, onOpenModal }: ScopeListItemProps) {
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
      setEditValue(scope.title) // Reset if empty or unchanged
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

  return (
    <div
      className={cn(
        "group flex items-center gap-2 rounded-md px-3 py-2 transition-colors",
        "hover:bg-accent",
        isNested && "ml-6",
        isMobile && "cursor-pointer"
      )}
      onClick={handleRowClick}
    >
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
              "block truncate text-sm font-medium",
              !isMobile && "-mx-1 cursor-text rounded px-1 hover:bg-muted/50"
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
          className="h-7 w-7 opacity-0 transition-opacity group-hover:opacity-100"
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
  )
}
```

**Verify**:

- File exists at `src/components/scopes/scope-list-item.tsx`
- No TypeScript errors

---

### Step 8: Create AddScopeInput Component

**Do**: Create the inline input for adding new scopes.

**Create file** `src/components/scopes/add-scope-input.tsx`:

```tsx
"use client"

import { useState, useRef } from "react"
import { Plus } from "lucide-react"
import { createScope } from "@/lib/scope-mutations"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import type { ScopeType } from "@/lib/db"

interface AddScopeInputProps {
  type: ScopeType
  parentId?: string
  placeholder?: string
}

export function AddScopeInput({ type, parentId, placeholder }: AddScopeInputProps) {
  const [isAdding, setIsAdding] = useState(false)
  const [value, setValue] = useState("")
  const inputRef = useRef<HTMLInputElement>(null)

  const typeLabel = type === "job" ? "job" : "project"
  const defaultPlaceholder = parentId ? `Add sub-${typeLabel}...` : `Add ${typeLabel}...`

  const handleSubmit = async () => {
    if (!value.trim()) {
      setIsAdding(false)
      return
    }

    await createScope(type, value.trim(), parentId)
    setValue("")
    // Keep input open for rapid entry
    inputRef.current?.focus()
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSubmit()
    } else if (e.key === "Escape") {
      setValue("")
      setIsAdding(false)
    }
  }

  if (!isAdding) {
    return (
      <Button
        variant="ghost"
        size="sm"
        className={cn("w-full justify-start gap-2 text-muted-foreground", parentId && "ml-6")}
        onClick={() => {
          setIsAdding(true)
          // Focus after state update
          setTimeout(() => inputRef.current?.focus(), 0)
        }}
      >
        <Plus className="h-4 w-4" />
        {placeholder ?? defaultPlaceholder}
      </Button>
    )
  }

  return (
    <div className={cn("px-3 py-1", parentId && "ml-6")}>
      <Input
        ref={inputRef}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onBlur={handleSubmit}
        onKeyDown={handleKeyDown}
        placeholder={placeholder ?? defaultPlaceholder}
        className="h-8"
      />
    </div>
  )
}
```

**Verify**:

- File exists at `src/components/scopes/add-scope-input.tsx`
- No TypeScript errors

---

### Step 9: Create ScopeList Component

**Do**: Create the list container that combines items and add input.

**Create file** `src/components/scopes/scope-list.tsx`:

```tsx
"use client"

import { useState } from "react"
import { useScopes } from "@/hooks/use-scopes"
import { ScopeListItem } from "./scope-list-item"
import { AddScopeInput } from "./add-scope-input"
import { ScopeModal } from "./scope-modal"
import type { Scope, ScopeType } from "@/lib/db"

interface ScopeListProps {
  type: ScopeType
}

export function ScopeList({ type }: ScopeListProps) {
  const scopes = useScopes(type)
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
  // For projects: group by parent/child
  if (type === "job") {
    return (
      <>
        <div className="flex flex-col gap-1 p-2">
          {scopes.map((scope) => (
            <ScopeListItem key={scope.id} scope={scope} onOpenModal={handleOpenModal} />
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
      <div className="flex flex-col gap-1 p-2">
        {parentProjects.map((project) => (
          <div key={project.id}>
            <ScopeListItem scope={project} onOpenModal={handleOpenModal} />
            {/* Nested children */}
            {childrenByParent[project.id]?.map((child) => (
              <ScopeListItem key={child.id} scope={child} isNested onOpenModal={handleOpenModal} />
            ))}
            {/* Add child project */}
            <AddScopeInput type="project" parentId={project.id} />
          </div>
        ))}
        <AddScopeInput type="project" />
      </div>

      <ScopeModal scope={modalScope} open={isModalOpen} onOpenChange={handleCloseModal} />
    </>
  )
}
```

**Verify**:

- File exists at `src/components/scopes/scope-list.tsx`
- No TypeScript errors

---

### Step 10: Build Jobs Page

**Do**: Update the Jobs page with the two-panel layout.

**Modify file** `src/app/jobs/page.tsx`:

```tsx
"use client"

import { ScopeList } from "@/components/scopes/scope-list"
import { GridPlaceholder } from "@/components/scopes/grid-placeholder"

export default function JobsPage() {
  return (
    <div className="theme-gold flex h-full">
      {/* Left panel: Job list */}
      <div className="w-full border-r md:w-72 lg:w-80">
        <div className="border-b px-4 py-3">
          <h1 className="text-lg font-semibold">Jobs</h1>
        </div>
        <div className="overflow-auto">
          <ScopeList type="job" />
        </div>
      </div>

      {/* Right panel: Grid placeholder (hidden on mobile) */}
      <div className="hidden flex-1 md:block">
        <GridPlaceholder type="jobs" />
      </div>
    </div>
  )
}
```

**Verify**:

- File updated at `src/app/jobs/page.tsx`
- No TypeScript errors

---

### Step 11: Build Projects Page

**Do**: Update the Projects page with the two-panel layout and nested list.

**Modify file** `src/app/projects/page.tsx`:

```tsx
"use client"

import { ScopeList } from "@/components/scopes/scope-list"
import { GridPlaceholder } from "@/components/scopes/grid-placeholder"

export default function ProjectsPage() {
  return (
    <div className="theme-blue flex h-full">
      {/* Left panel: Project list (with nesting) */}
      <div className="w-full border-r md:w-72 lg:w-80">
        <div className="border-b px-4 py-3">
          <h1 className="text-lg font-semibold">Projects</h1>
        </div>
        <div className="overflow-auto">
          <ScopeList type="project" />
        </div>
      </div>

      {/* Right panel: Grid placeholder (hidden on mobile) */}
      <div className="hidden flex-1 md:block">
        <GridPlaceholder type="projects" />
      </div>
    </div>
  )
}
```

**Verify**:

- File updated at `src/app/projects/page.tsx`
- No TypeScript errors

---

### Step 12: Verify Build

**Do**: Ensure the project builds successfully.

**Commands**:

```bash
pnpm build
```

**Verify**:

- Build exits with code 0
- No errors

---

### Step 13: Visual Verification

**Do**: Test all functionality in the browser.

**Commands**:

```bash
pnpm dev
```

**Test checklist**:

#### Jobs Page (`/jobs`)

1. **Layout**:
   - [ ] Two-panel layout on desktop (list left, placeholder right)
   - [ ] List-only on mobile (placeholder hidden)
   - [ ] Gold theme applied (`.theme-gold`)

2. **Add Job**:
   - [ ] "+ Add job..." button visible at bottom of list
   - [ ] Click button → input appears
   - [ ] Type title, press Enter → job created
   - [ ] Job appears in list
   - [ ] Input stays open for rapid entry
   - [ ] Press Escape → input closes

3. **Edit Job (Desktop)**:
   - [ ] Click on job title → inline edit mode
   - [ ] Edit text, press Enter → title saved
   - [ ] Press Escape → reverts to original
   - [ ] Click away → saves changes

4. **Edit Job (Mobile)**:
   - [ ] Click anywhere on row → modal opens as full-screen sheet
   - [ ] Edit title in modal
   - [ ] Save → title updated

5. **More Menu (Desktop)**:
   - [ ] Hover job row → "..." button appears
   - [ ] Click "..." → modal dialog opens
   - [ ] Edit title, click Save → title updated

6. **Archive Job**:
   - [ ] In modal, click Archive button
   - [ ] Confirmation dialog appears
   - [ ] Confirm → job removed from list
   - [ ] (Job should appear on Archive page with `archivedAt` set)

#### Projects Page (`/projects`)

1. **Layout**:
   - [ ] Two-panel layout on desktop
   - [ ] Blue theme applied (`.theme-blue`)

2. **Add Project**:
   - [ ] "+ Add project..." at bottom of list
   - [ ] Creates top-level project

3. **Project Nesting**:
   - [ ] Parent projects show "+ Add sub-project..." underneath
   - [ ] Adding sub-project creates nested child
   - [ ] Child projects are indented

4. **All interactions from Jobs page work on Projects**

#### General

- [ ] No console errors
- [ ] Responsive transitions smooth
- [ ] Data persists on page refresh (IndexedDB)

---

## Verification

Run these checks after implementation is complete:

| Check               | Command                  | Expected Result                  |
| ------------------- | ------------------------ | -------------------------------- |
| TypeScript compiles | `pnpm exec tsc --noEmit` | Exit code 0, no errors           |
| Build succeeds      | `pnpm build`             | Exit code 0                      |
| Lint passes         | `pnpm lint`              | Exit code 0 (warnings OK)        |
| Dev server runs     | `pnpm dev`               | Server starts, no console errors |

Manual checks:

- [ ] Jobs page: add, inline edit, modal edit, archive
- [ ] Projects page: add, nested add, inline edit, modal edit, archive
- [ ] Desktop: inline editing works
- [ ] Mobile: click opens full-screen modal
- [ ] Data persists in IndexedDB across refresh
- [ ] Theme colors applied (gold for Jobs, blue for Projects)

---

## Design Notes

### Responsive Behavior Summary

| Feature          | Desktop (≥768px)                    | Mobile (<768px)   |
| ---------------- | ----------------------------------- | ----------------- |
| Layout           | Two-panel (list + grid placeholder) | List only         |
| Grid placeholder | Visible                             | Hidden            |
| Title editing    | Inline click-to-edit                | In modal          |
| More button      | Visible on hover                    | Hidden            |
| Row click        | No action                           | Opens modal       |
| Modal style      | Centered dialog                     | Full-screen sheet |

### Component Architecture

```
Jobs/Projects Page
├── ScopeList (type="job" | "project")
│   ├── ScopeListItem (inline edit, more button)
│   ├── AddScopeInput (under each parent for nesting)
│   └── ScopeModal (responsive dialog/sheet)
└── GridPlaceholder (hidden on mobile)
```

### Data Flow

```
User Action → Dexie mutation → useLiveQuery auto-updates → UI re-renders
```

No manual state management for scope data — Dexie's reactive queries handle it.

### Theme Classes

Pages wrap their content in theme classes:

- Jobs: `<div className="theme-gold">...</div>`
- Projects: `<div className="theme-blue">...</div>`

This scopes the primary/secondary colors for all child components.
