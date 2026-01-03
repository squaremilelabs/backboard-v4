# Design Alignment

| Field | Value |
|-------|-------|
| **ID** | 006 |
| **Status** | ✅ Complete |
| **Progress** | All steps complete |
| **Created** | 2025-12-31 |
| **Last Updated** | 2026-01-03 |

---

## Overview

Realign the app's visual design with the original Figma mockups. The core issue: we built an "app shell" pattern with lifted sidebar and header, when the design calls for a flat sidebar/header that blends with the background, with only the page content being the elevated white card.

---

## References

Read these before implementing:

| Topic | Source |
|-------|--------|
| Original page layouts | `dev/specs/visuals/page-tasks.png`, `page-jobs.png`, `page-projects.png`, `page-schedule.png` |
| Current screenshots | `dev/agents/implementations/006-design-alignment/screenshots/` |
| Current layout components | `src/components/layout/` |
| Current scope components | `src/components/scopes/` |

---

## Scope

### In Scope

1. **Minimal flat header** — 36px height, blends with gray background, contains toggle + "Backboard" text
2. **Flat sidebar** — Same background color as page shell, no border-right, seamless with header
3. **White rounded content card** — Page content wrapped in white card with rounded corners (the "lifted" element)
4. **Simplified nav styling** — Lighter active state, remove border separators
5. **Jobs/Projects grid card** — Unified white card containing scope list column + grid columns as one cohesive unit
6. **Subtle add inputs** — Less prominent, no full-width colored input borders

### Out of Scope

- Color palette changes (current gold/blue values are fine)
- Activity dots on Tasks nav item (requires task data)
- Filled grid bars showing schedules (requires schedule data)
- Tasks page implementation (separate spec)
- Schedule page implementation (separate spec)

---

## Dependencies

- `004-page-layout-navigation` ✅ Complete
- `005-scope-management` ✅ Complete

---

## Files Modified

- [ ] `src/components/layout/page-shell.tsx` — Restructure layout, add content card wrapper
- [ ] `src/components/layout/app-sidebar.tsx` — Remove border, flatten styling
- [ ] `src/components/layout/sidebar-toggle.tsx` — May need size adjustments
- [ ] `src/app/globals.css` — Add content card styles, adjust spacing variables
- [ ] `src/app/jobs/page.tsx` — Wrap in content card, unify grid layout
- [ ] `src/app/projects/page.tsx` — Wrap in content card, unify grid layout
- [ ] `src/app/tasks/page.tsx` — Wrap in content card
- [ ] `src/app/schedule/page.tsx` — Wrap in content card
- [ ] `src/app/archive/page.tsx` — Wrap in content card
- [ ] `src/components/scopes/add-scope-input.tsx` — Subtle styling
- [ ] `src/components/scopes/scope-grid-header.tsx` — New: unified grid header
- [ ] `src/components/scopes/scope-grid-row.tsx` — Update: cohesive row styling

---

## Implementation Plan

### Step 1: Update PageShell Structure

**Do**: Restructure the PageShell to have a flat header + sidebar, with content in a white rounded card.

**Modify** `src/components/layout/page-shell.tsx`:

The new structure should be:

```
┌─────────────────────────────────────────────────────┐
│ [Toggle] Backboard                    (36px header) │ ← flat, gray bg
├────────────┬────────────────────────────────────────┤
│ Tasks      │ ┌────────────────────────────────────┐ │
│ Schedule   │ │                                    │ │
│ Projects   │ │   White rounded content card       │ │ ← lifted, white bg
│ Jobs       │ │   (page content goes here)         │ │
│            │ │                                    │ │
│            │ └────────────────────────────────────┘ │
│ ─────────  │                                        │
│ Archive    │                                        │ ← flat, gray bg
└────────────┴────────────────────────────────────────┘
```

Key changes:
- Header: 36px (`h-9`), no border-bottom, same bg as shell (`bg-muted/30` or similar)
- Sidebar: Remove `bg-background` and `border-r`, inherit shell bg
- Content area: Add a wrapper div with `bg-background rounded-lg` (or `rounded-xl`) and appropriate margin/padding

```tsx
// Conceptual structure (not final code)
<div className="flex h-screen bg-muted/30">
  {/* Thin header - spans full width */}
  <header className="fixed top-0 left-0 right-0 h-9 flex items-center px-3 z-10">
    <SidebarToggle ... />
    <span className="ml-2 text-sm font-semibold">Backboard</span>
  </header>

  {/* Below header */}
  <div className="flex pt-9 h-full w-full">
    {/* Sidebar - flat, no border */}
    <aside className="w-56 shrink-0">
      <nav className="p-2">...</nav>
    </aside>

    {/* Content card - this is the lifted element */}
    <main className="flex-1 p-3">
      <div className="h-full bg-background rounded-xl shadow-sm overflow-hidden">
        {children}
      </div>
    </main>
  </div>
</div>
```

**Verify**: 
- Header is 36px, flat, contains toggle + "Backboard"
- Sidebar has no right border, blends with gray bg
- Content area is a white rounded card
- Run `pnpm exec tsc --noEmit` — no errors

---

### Step 2: Update AppSidebar Styling

**Do**: Remove borders and heavy backgrounds, make nav items more subtle.

**Modify** `src/components/layout/app-sidebar.tsx`:

Changes:
- Remove `border-r` and `bg-background` from aside element
- Remove `border-b` from header area (header is now in PageShell)
- Remove `border-t` separator above Archive — use spacing instead
- Lighten active state — use very subtle bg or just font weight change
- Tighten padding on nav items

```tsx
// NavItem - lighter active state
function NavItem({ href, label, isActive }: NavItemProps) {
  return (
    <Link
      href={href}
      className={cn(
        "block rounded-md px-3 py-1.5 text-sm transition-colors",
        isActive
          ? "bg-background/60 font-medium"  // Subtle white tint, not heavy gray
          : "text-muted-foreground hover:text-foreground"
      )}
    >
      {label}
    </Link>
  )
}
```

**Verify**:
- Sidebar blends seamlessly with gray background
- No visible borders
- Active state is subtle (slight bg tint)
- Archive section separated by spacing, not border

---

### Step 3: Create ContentCard Wrapper Component

**Do**: Create a reusable wrapper for page content that provides the white rounded card styling.

**Create** `src/components/layout/content-card.tsx`:

```tsx
interface ContentCardProps {
  children: React.ReactNode
  className?: string
}

export function ContentCard({ children, className }: ContentCardProps) {
  return (
    <div className={cn(
      "h-full bg-background rounded-xl overflow-hidden",
      className
    )}>
      {children}
    </div>
  )
}
```

**Verify**:
- File exists
- No TypeScript errors

---

### Step 4: Update Jobs Page Layout

**Do**: Restructure Jobs page to be one cohesive grid inside the content card.

**Modify** `src/app/jobs/page.tsx`:

The design shows a unified grid where:
- First column: Scope names (sticky)
- Remaining columns: Day cells (Mon-Sun)
- All inside one white card

```tsx
"use client"

import { ContentCard } from "@/components/layout/content-card"
import { ScopeGridHeader } from "@/components/scopes/scope-grid-header"
import { ScopeGridRow } from "@/components/scopes/scope-grid-row"
import { useScopes } from "@/hooks/use-scopes"

export default function JobsPage() {
  const scopes = useScopes("job")
  const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]

  return (
    <ContentCard>
      <div className="theme-gold h-full overflow-auto">
        {/* Grid header */}
        <ScopeGridHeader 
          title="Jobs" 
          columns={days} 
        />
        
        {/* Grid rows */}
        <div className="divide-y">
          {scopes?.map((scope) => (
            <ScopeGridRow
              key={scope.id}
              scope={scope}
              columns={days}
            />
          ))}
        </div>

        {/* Add row */}
        <AddScopeRow type="job" columns={days.length} />
      </div>
    </ContentCard>
  )
}
```

**Verify**:
- Jobs page renders inside white rounded card
- Grid feels cohesive (one visual unit)
- No TypeScript errors

---

### Step 5: Create ScopeGridHeader Component

**Do**: Create the header row for the scope grid (title column + day/month headers).

**Modify** `src/components/scopes/scope-grid-header.tsx`:

```tsx
"use client"

interface ScopeGridHeaderProps {
  title: string
  columns: string[]
}

export function ScopeGridHeader({ title, columns }: ScopeGridHeaderProps) {
  return (
    <div className="grid grid-cols-[200px_repeat(auto-fit,minmax(80px,1fr))] border-b bg-muted/30 sticky top-0 z-10">
      {/* Title column */}
      <div className="px-4 py-2 font-medium text-sm">
        {title}
      </div>
      
      {/* Day/Month columns */}
      {columns.map((col) => (
        <div 
          key={col} 
          className="px-2 py-2 text-center text-sm text-muted-foreground"
        >
          {col}
        </div>
      ))}
    </div>
  )
}
```

**Verify**:
- Header renders with title + column labels
- Sticky behavior works
- No TypeScript errors

---

### Step 6: Update ScopeGridRow Component

**Do**: Update the grid row to be a cohesive unit (scope name + cells).

**Modify** `src/components/scopes/scope-grid-row.tsx`:

```tsx
"use client"

import { useState } from "react"
import { cn } from "@/lib/utils"
import type { Scope } from "@/lib/db"

interface ScopeGridRowProps {
  scope: Scope
  columns: string[]
  isNested?: boolean
}

export function ScopeGridRow({ scope, columns, isNested }: ScopeGridRowProps) {
  return (
    <div className={cn(
      "grid grid-cols-[200px_repeat(auto-fit,minmax(80px,1fr))] hover:bg-muted/20 transition-colors",
      isNested && "pl-4"
    )}>
      {/* Scope name column */}
      <div className="flex items-center gap-2 px-4 py-2">
        <span className={cn(
          "h-2 w-2 rounded-full",
          scope.parentId ? "bg-primary" : "border-2 border-primary"
        )} />
        <span className="text-sm truncate">{scope.title}</span>
      </div>
      
      {/* Grid cells */}
      {columns.map((col) => (
        <div 
          key={col}
          className="px-1 py-1"
        >
          <div className="h-8 rounded border border-dashed border-muted-foreground/20" />
        </div>
      ))}
    </div>
  )
}
```

**Verify**:
- Row renders scope name + empty cells
- Hover state works
- Nested items are indented
- No TypeScript errors

---

### Step 7: Update AddScopeInput to be Subtle

**Do**: Make the add input less prominent — a simple text button that expands to input on click.

**Modify** `src/components/scopes/add-scope-input.tsx`:

Key changes:
- Remove the prominent colored border on focus
- Use a simple "+ Add" text that transforms to input
- Input should be minimal, blending with the grid

```tsx
// When not adding: simple text button
<button
  onClick={() => setIsAdding(true)}
  className="flex items-center gap-1 px-4 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
>
  <Plus className="h-3.5 w-3.5" />
  Add
</button>

// When adding: minimal input without heavy borders
<Input
  className="h-8 border-transparent bg-transparent focus:border-muted focus:ring-0 shadow-none"
  ...
/>
```

**Verify**:
- Add button is subtle, not prominent
- Input blends with grid, no colored focus ring
- Functionality unchanged

---

### Step 8: Update Projects Page Layout

**Do**: Apply same grid structure to Projects page, handling nesting.

**Modify** `src/app/projects/page.tsx`:

Same pattern as Jobs, but:
- Columns are months (Dec, Jan, Feb, Mar, Apr, May)
- Projects can be nested (show parent with children indented)

```tsx
"use client"

import { ContentCard } from "@/components/layout/content-card"
import { ScopeGridHeader } from "@/components/scopes/scope-grid-header"
import { ScopeGridRow } from "@/components/scopes/scope-grid-row"
import { useScopes } from "@/hooks/use-scopes"

export default function ProjectsPage() {
  const scopes = useScopes("project")
  const months = ["Dec", "Jan", "Feb", "Mar", "Apr", "May"]

  // Group by parent
  const parents = scopes?.filter(s => !s.parentId) ?? []
  const childrenByParent = scopes?.reduce((acc, s) => {
    if (s.parentId) {
      acc[s.parentId] = [...(acc[s.parentId] || []), s]
    }
    return acc
  }, {} as Record<string, typeof scopes>) ?? {}

  return (
    <ContentCard>
      <div className="theme-blue h-full overflow-auto">
        <ScopeGridHeader title="Projects" columns={months} />
        
        <div>
          {parents.map((parent) => (
            <div key={parent.id}>
              <ScopeGridRow scope={parent} columns={months} />
              {childrenByParent[parent.id]?.map((child) => (
                <ScopeGridRow 
                  key={child.id} 
                  scope={child} 
                  columns={months}
                  isNested 
                />
              ))}
            </div>
          ))}
        </div>

        <AddScopeRow type="project" columns={months.length} />
      </div>
    </ContentCard>
  )
}
```

**Verify**:
- Projects page has same cohesive grid layout
- Nesting works correctly
- No TypeScript errors

---

### Step 9: Update Tasks/Schedule/Archive Pages

**Do**: Wrap these pages in ContentCard for consistent styling.

**Modify** `src/app/tasks/page.tsx`:

```tsx
"use client"

import { ContentCard } from "@/components/layout/content-card"

export default function TasksPage() {
  return (
    <ContentCard>
      <div className="p-6">
        <h1 className="text-lg font-semibold">Tasks</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Task management coming soon...
        </p>
      </div>
    </ContentCard>
  )
}
```

Repeat similar pattern for `schedule/page.tsx` and `archive/page.tsx`.

**Verify**:
- All pages render inside white rounded card
- Consistent visual appearance

---

### Step 10: Verify Build

**Do**: Ensure everything compiles and builds.

**Commands**:
```bash
pnpm exec tsc --noEmit
pnpm build
```

**Verify**:
- No TypeScript errors
- Build succeeds

---

### Step 11: Visual Verification

**Do**: Test in browser at various screen sizes.

**Commands**:
```bash
pnpm dev
```

**Checklist**:

1. **Layout Structure**:
   - [ ] Header is 36px, flat (gray bg), contains toggle + "Backboard"
   - [ ] Sidebar blends with gray background (no border)
   - [ ] Content is white rounded card floating on gray

2. **Sidebar Navigation**:
   - [ ] Active state is subtle (slight bg tint, not heavy)
   - [ ] No visible borders between sections
   - [ ] Archive separated by spacing only

3. **Jobs Page**:
   - [ ] One cohesive grid inside white card
   - [ ] Scope column + day columns feel unified
   - [ ] Add button is subtle

4. **Projects Page**:
   - [ ] Same cohesive grid layout
   - [ ] Nested projects indented correctly
   - [ ] Parent items have hollow dot, children filled

5. **Other Pages**:
   - [ ] Tasks, Schedule, Archive all in white card
   - [ ] Consistent padding/styling

6. **Collapsed Sidebar**:
   - [ ] Toggle works in header
   - [ ] When collapsed, content card expands

---

## Verification

| Check | Command | Expected Result |
|-------|---------|-----------------|
| TypeScript compiles | `pnpm exec tsc --noEmit` | Exit code 0 |
| Build succeeds | `pnpm build` | Exit code 0 |
| Lint passes | `pnpm lint` | Exit code 0 (warnings OK) |

Manual checks:
- [ ] Header: 36px flat, toggle + "Backboard"
- [ ] Sidebar: flat, no border, subtle active states
- [ ] Content: white rounded card on gray background
- [ ] Jobs/Projects: cohesive grid layout
- [ ] Add inputs: subtle, not prominent
- [ ] Compare to original designs — major alignment issues resolved

---

## Design Notes

### Visual Hierarchy (After)

```
┌─────────────────────────────────────────────────────┐
│                    FLAT SHELL                       │
│  ┌─────────────────────────────────────────────┐   │
│  │                                             │   │
│  │           LIFTED CONTENT CARD               │   │
│  │                                             │   │
│  └─────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────┘
```

The gray shell (header + sidebar + page bg) is the "canvas".
The white content card is the focused, elevated element.

### Key CSS Classes

| Element | Classes |
|---------|---------|
| Shell bg | `bg-muted/30` (or custom gray) |
| Header | `h-9 flex items-center px-3` |
| Sidebar | No border, inherit bg |
| Content card | `bg-background rounded-xl overflow-hidden` |
| Active nav | `bg-background/60 font-medium` |

### Grid Structure (Jobs/Projects)

```
┌──────────────────────────────────────────────────┐
│ Jobs     │ Mon │ Tue │ Wed │ Thu │ Fri │ Sat│Sun │ ← Header
├──────────┼─────┼─────┼─────┼─────┼─────┼────┼────┤
│ ● Scope1 │     │     │     │     │     │    │    │ ← Data rows
│ ● Scope2 │     │     │     │     │     │    │    │
│ + Add    │     │     │     │     │     │    │    │ ← Add row
└──────────────────────────────────────────────────┘
```

All in one white card. First column is sticky for scrolling.

