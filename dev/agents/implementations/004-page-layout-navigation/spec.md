# Page Layout & Navigation

| Field | Value |
|-------|-------|
| **ID** | 004 |
| **Status** | 🔵 Ready |
| **Progress** | — |
| **Created** | 2025-12-30 |
| **Last Updated** | 2025-12-30 |

---

## Overview

Build the app shell with a collapsible sidebar navigation and page layout wrapper. This provides the consistent UI structure that all pages will use. Includes:
- Collapsible sidebar on desktop (toggle to show/hide)
- Hamburger drawer on mobile
- Max-width container at `lg` breakpoint to prevent excessive stretching

---

## References

Read these before implementing:

| Topic | Source |
|-------|--------|
| App Router structure | `dev/specs/trd.md` §3.2 |
| Project structure (components) | `dev/specs/trd.md` §10 |
| Page layouts (visual) | `dev/specs/visuals/page-tasks.png`, `page-schedule.png`, `page-jobs.png`, `page-projects.png` |
| Navigation routes | `dev/specs/prd.md` §4 (Tasks, Schedule, Projects, Jobs, Archive) |
| shadcn/ui usage | `components.json` — install components via `pnpm dlx shadcn@latest add <component>` |

---

## Scope

### In Scope
- `<AppSidebar>` component with navigation links
- `<PageShell>` wrapper component (sidebar + main content area)
- Navigation to all 5 routes: Tasks, Schedule, Projects, Jobs, Archive
- Active page highlighting based on current route
- Two-section sidebar: main nav (top) + secondary nav with Archive (bottom)
- **Collapsible sidebar on desktop** with toggle button
- **Sidebar state persisted to localStorage**
- Hamburger menu with drawer on mobile
- **Max-width container at `lg` breakpoint** (1024px)
- Integration into root `layout.tsx`
- Install required shadcn/ui components (Sheet, Button, Tooltip)

### Out of Scope
- Colored activity dots on Tasks nav item (data-dependent — future implementation)
- Page-specific content (task lists, grids, scope selectors)
- User authentication UI (Clerk — future implementation)
- Sync indicator/button
- Any data fetching or database interaction

---

## Dependencies

- `001-initial-project-setup` ✅ Complete
- `003-shadcn-ui-setup` ✅ Complete

---

## Files Created

Exact files this implementation will create or modify:

- [ ] `src/components/layout/app-sidebar.tsx` — Sidebar with navigation links
- [ ] `src/components/layout/page-shell.tsx` — Layout wrapper (sidebar + content + max-width)
- [ ] `src/components/layout/mobile-nav.tsx` — Mobile hamburger + drawer
- [ ] `src/components/layout/sidebar-toggle.tsx` — Toggle button for collapsing sidebar
- [ ] `src/app/layout.tsx` — Integrate PageShell (modify existing)
- [ ] `src/components/ui/button.tsx` — shadcn Button component (created by CLI)
- [ ] `src/components/ui/sheet.tsx` — shadcn Sheet component for mobile drawer (created by CLI)
- [ ] `src/components/ui/tooltip.tsx` — shadcn Tooltip for toggle button (created by CLI)

---

## Implementation Plan

### Step 1: Install shadcn/ui Components

**Do**: Install the Button, Sheet, and Tooltip components.

**Commands**:
```bash
pnpm dlx shadcn@latest add button sheet tooltip
```

**Verify**: 
- `src/components/ui/button.tsx` exists
- `src/components/ui/sheet.tsx` exists
- `src/components/ui/tooltip.tsx` exists
- No TypeScript errors: `pnpm exec tsc --noEmit`

---

### Step 2: Install Lucide Icons

**Do**: Install lucide-react for icons (hamburger, sidebar toggle, etc.).

**Commands**:
```bash
pnpm add lucide-react
```

**Verify**: 
- `package.json` dependencies include `lucide-react`

---

### Step 3: Create SidebarToggle Component

**Do**: Create a toggle button component that can be used to collapse/expand the sidebar.

**Create file** `src/components/layout/sidebar-toggle.tsx`:

```tsx
"use client"

import { PanelLeftClose, PanelLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

interface SidebarToggleProps {
  isCollapsed: boolean
  onToggle: () => void
}

export function SidebarToggle({ isCollapsed, onToggle }: SidebarToggleProps) {
  return (
    <TooltipProvider delayDuration={0}>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            onClick={onToggle}
            className="h-8 w-8"
          >
            {isCollapsed ? (
              <PanelLeft className="h-4 w-4" />
            ) : (
              <PanelLeftClose className="h-4 w-4" />
            )}
            <span className="sr-only">
              {isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            </span>
          </Button>
        </TooltipTrigger>
        <TooltipContent side="right">
          {isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}
```

**Verify**: 
- File exists at `src/components/layout/sidebar-toggle.tsx`
- No TypeScript errors

---

### Step 4: Create AppSidebar Component

**Do**: Create the sidebar component with navigation links. Uses `usePathname()` for active state.

**Create file** `src/components/layout/app-sidebar.tsx`:

```tsx
"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { SidebarToggle } from "./sidebar-toggle"

const mainNavItems = [
  { href: "/tasks", label: "Tasks" },
  { href: "/schedule", label: "Schedule" },
  { href: "/projects", label: "Projects" },
  { href: "/jobs", label: "Jobs" },
]

const secondaryNavItems = [
  { href: "/archive", label: "Archive" },
]

interface NavItemProps {
  href: string
  label: string
  isActive: boolean
}

function NavItem({ href, label, isActive }: NavItemProps) {
  return (
    <Link
      href={href}
      className={cn(
        "block rounded-md px-3 py-2 text-sm font-medium transition-colors",
        isActive
          ? "bg-secondary text-secondary-foreground"
          : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
      )}
    >
      {label}
    </Link>
  )
}

interface AppSidebarProps {
  isCollapsed: boolean
  onToggle: () => void
}

export function AppSidebar({ isCollapsed, onToggle }: AppSidebarProps) {
  const pathname = usePathname()

  if (isCollapsed) {
    return null
  }

  return (
    <aside className="flex h-full w-64 flex-col border-r bg-background">
      {/* Header with toggle */}
      <div className="flex h-14 items-center justify-between border-b px-4">
        <span className="font-semibold">Backboard</span>
        <SidebarToggle isCollapsed={isCollapsed} onToggle={onToggle} />
      </div>

      {/* Main navigation */}
      <nav className="flex-1 space-y-1 p-4">
        {mainNavItems.map((item) => (
          <NavItem
            key={item.href}
            href={item.href}
            label={item.label}
            isActive={pathname === item.href || pathname.startsWith(item.href + "/")}
          />
        ))}
      </nav>

      {/* Secondary navigation (Archive) */}
      <nav className="border-t p-4">
        {secondaryNavItems.map((item) => (
          <NavItem
            key={item.href}
            href={item.href}
            label={item.label}
            isActive={pathname === item.href || pathname.startsWith(item.href + "/")}
          />
        ))}
      </nav>
    </aside>
  )
}
```

**Verify**: 
- File exists at `src/components/layout/app-sidebar.tsx`
- No TypeScript errors

---

### Step 5: Create MobileNav Component

**Do**: Create the mobile navigation with hamburger button and Sheet drawer.

**Create file** `src/components/layout/mobile-nav.tsx`:

```tsx
"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Menu } from "lucide-react"
import { useState } from "react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"

const mainNavItems = [
  { href: "/tasks", label: "Tasks" },
  { href: "/schedule", label: "Schedule" },
  { href: "/projects", label: "Projects" },
  { href: "/jobs", label: "Jobs" },
]

const secondaryNavItems = [
  { href: "/archive", label: "Archive" },
]

interface NavItemProps {
  href: string
  label: string
  isActive: boolean
  onClick?: () => void
}

function NavItem({ href, label, isActive, onClick }: NavItemProps) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className={cn(
        "block rounded-md px-3 py-2 text-sm font-medium transition-colors",
        isActive
          ? "bg-secondary text-secondary-foreground"
          : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
      )}
    >
      {label}
    </Link>
  )
}

export function MobileNav() {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)

  const closeSheet = () => setOpen(false)

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon">
          <Menu className="h-5 w-5" />
          <span className="sr-only">Toggle menu</span>
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-64 p-0">
        <SheetHeader className="border-b px-4 py-3">
          <SheetTitle className="text-left text-lg font-semibold">Backboard</SheetTitle>
        </SheetHeader>
        <div className="flex h-[calc(100%-57px)] flex-col">
          {/* Main navigation */}
          <nav className="flex-1 space-y-1 p-4">
            {mainNavItems.map((item) => (
              <NavItem
                key={item.href}
                href={item.href}
                label={item.label}
                isActive={pathname === item.href || pathname.startsWith(item.href + "/")}
                onClick={closeSheet}
              />
            ))}
          </nav>

          {/* Secondary navigation (Archive) */}
          <nav className="border-t p-4">
            {secondaryNavItems.map((item) => (
              <NavItem
                key={item.href}
                href={item.href}
                label={item.label}
                isActive={pathname === item.href || pathname.startsWith(item.href + "/")}
                onClick={closeSheet}
              />
            ))}
          </nav>
        </div>
      </SheetContent>
    </Sheet>
  )
}
```

**Verify**: 
- File exists at `src/components/layout/mobile-nav.tsx`
- No TypeScript errors

---

### Step 6: Create PageShell Component

**Do**: Create the layout wrapper with collapsible sidebar, max-width container, and responsive behavior. Sidebar state is persisted to localStorage.

**Create file** `src/components/layout/page-shell.tsx`:

```tsx
"use client"

import { useEffect, useState } from "react"
import { AppSidebar } from "./app-sidebar"
import { MobileNav } from "./mobile-nav"
import { SidebarToggle } from "./sidebar-toggle"

const SIDEBAR_STORAGE_KEY = "backboard-sidebar-collapsed"

interface PageShellProps {
  children: React.ReactNode
}

export function PageShell({ children }: PageShellProps) {
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [isHydrated, setIsHydrated] = useState(false)

  // Load sidebar state from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem(SIDEBAR_STORAGE_KEY)
    if (stored !== null) {
      setIsCollapsed(stored === "true")
    }
    setIsHydrated(true)
  }, [])

  // Persist sidebar state to localStorage
  const toggleSidebar = () => {
    const newState = !isCollapsed
    setIsCollapsed(newState)
    localStorage.setItem(SIDEBAR_STORAGE_KEY, String(newState))
  }

  return (
    <div className="flex h-screen justify-center bg-muted/30">
      {/* Max-width container */}
      <div className="flex h-full w-full max-w-5xl">
        {/* Desktop sidebar - hidden on mobile */}
        {isHydrated && (
          <div className="hidden md:block">
            <AppSidebar isCollapsed={isCollapsed} onToggle={toggleSidebar} />
          </div>
        )}

        {/* Main content area */}
        <div className="flex flex-1 flex-col overflow-hidden">
          {/* Header - always visible, content varies by screen size */}
          <header className="flex h-14 items-center gap-2 border-b bg-background px-4">
            {/* Mobile: hamburger menu */}
            <div className="md:hidden">
              <MobileNav />
            </div>
            
            {/* Desktop: sidebar toggle (when collapsed) */}
            {isHydrated && isCollapsed && (
              <div className="hidden md:block">
                <SidebarToggle isCollapsed={isCollapsed} onToggle={toggleSidebar} />
              </div>
            )}
            
            {/* Title - visible when sidebar is collapsed or on mobile */}
            {(isCollapsed || !isHydrated) && (
              <span className="font-semibold md:block">Backboard</span>
            )}
            <span className="font-semibold md:hidden">Backboard</span>
          </header>

          {/* Page content */}
          <main className="flex-1 overflow-auto">
            {children}
          </main>
        </div>
      </div>
    </div>
  )
}
```

**Verify**: 
- File exists at `src/components/layout/page-shell.tsx`
- No TypeScript errors

---

### Step 7: Update Root Layout

**Do**: Integrate PageShell into the root layout so all pages get the sidebar.

**Modify file** `src/app/layout.tsx`:

```tsx
import type { Metadata } from "next"
import "./globals.css"
import { PageShell } from "@/components/layout/page-shell"

export const metadata: Metadata = {
  title: "Backboard",
  description: "Task management for what's current",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body>
        <PageShell>{children}</PageShell>
      </body>
    </html>
  )
}
```

**Verify**: 
- File updated with PageShell wrapper
- No TypeScript errors

---

### Step 8: Update Page Placeholders

**Do**: Update the placeholder pages to remove their own centering (PageShell handles layout now). Add a simple container with padding.

**Modify file** `src/app/tasks/page.tsx`:

```tsx
"use client"

export default function TasksPage() {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold">Tasks</h1>
    </div>
  )
}
```

**Repeat for all other pages** (`schedule`, `jobs`, `projects`, `archive`) with the same pattern, just changing the heading text.

**Verify**: 
- All 5 page files updated
- Pages display inside the PageShell layout

---

### Step 9: Verify Build

**Do**: Ensure the project builds successfully.

**Commands**:
```bash
pnpm build
```

**Verify**: 
- Build exits with code 0
- No errors

---

### Step 10: Visual Verification

**Do**: Test the layout in the browser at various screen sizes.

**Commands**:
```bash
pnpm dev
```

**Test checklist**:

1. **Desktop with sidebar expanded** (≥768px):
   - Sidebar visible on left with all nav items
   - "Backboard" title in sidebar header
   - Toggle button (PanelLeftClose icon) in sidebar header
   - Archive in bottom section with border separator
   - Active page highlighted in nav
   - Click toggle — sidebar collapses

2. **Desktop with sidebar collapsed**:
   - Sidebar hidden
   - Header visible with toggle button (PanelLeft icon) and "Backboard" title
   - Click toggle — sidebar expands
   - Refresh page — sidebar state persists (localStorage)

3. **Mobile view** (<768px):
   - Sidebar always hidden
   - Header visible with hamburger menu and "Backboard" title
   - Click hamburger — drawer slides in from left
   - Nav items visible in drawer
   - Click nav item — navigates and drawer closes

4. **Max-width behavior** (resize to very wide screen):
   - Content container maxes out at 1024px (lg breakpoint)
   - Background color visible on sides

5. **Navigation**:
   - Click each nav item — navigates correctly
   - Active page is highlighted
   - Works in both sidebar and mobile drawer

**Verify**: 
- All test checklist items pass

---

## Verification

Run these checks after implementation is complete:

| Check | Command | Expected Result |
|-------|---------|-----------------|
| TypeScript compiles | `pnpm exec tsc --noEmit` | Exit code 0, no errors |
| Build succeeds | `pnpm build` | Exit code 0 |
| Lint passes | `pnpm lint` | Exit code 0 (warnings OK) |
| Dev server runs | `pnpm dev` | Server starts, no console errors |

Manual checks:
- [ ] Desktop: Sidebar displays with all 5 nav items
- [ ] Desktop: Toggle button collapses/expands sidebar
- [ ] Desktop: Sidebar state persists across page refresh (localStorage)
- [ ] Archive appears in separate bottom section with border
- [ ] Active page is visually highlighted in nav
- [ ] Navigation works — clicking items changes route
- [ ] Mobile: hamburger menu appears below 768px
- [ ] Mobile: drawer opens/closes correctly
- [ ] Mobile: navigation works and closes drawer
- [ ] Wide screens: content maxes out at 1024px (lg breakpoint)
- [ ] No layout shift or flash on page load (hydration handled)

---

## Design Notes

### Breakpoints
- **Mobile**: < 768px (md breakpoint) — hamburger drawer
- **Desktop**: ≥ 768px — collapsible sidebar
- **Max-width**: 1024px (lg breakpoint) — content container limit

### Sidebar Width
- Fixed 256px (w-64) when expanded
- 0px when collapsed (fully hidden)

### Colors
- Background: `bg-background` (white)
- Page area: `bg-muted/30` (very light gray)
- Active nav: `bg-secondary` with `text-secondary-foreground`
- Inactive nav: `text-muted-foreground` with hover states

### State Management
- Sidebar collapsed state stored in `localStorage` under key `backboard-sidebar-collapsed`
- Hydration handled to prevent flash of incorrect state

### Accessibility
- Hamburger button has `sr-only` label
- Toggle button has `sr-only` label and tooltip
- Sheet has proper `SheetTitle` for screen readers
- Links use semantic `<a>` via Next.js `<Link>`

### Icons Used (from lucide-react)
- `Menu` — hamburger menu
- `PanelLeft` — expand sidebar
- `PanelLeftClose` — collapse sidebar
