# Visual Verification Checklist

> **Implementation**: 004 - Page Layout & Navigation  
> **Status**: ✅ Complete  
> **Last Updated**: 2025-12-30

---

## Instructions

1. Run `pnpm dev` in your terminal
2. Open http://localhost:3000 in your browser
3. Go through each section below
4. Mark items with:
   - `[x]` — Verified, works as expected
   - `[!]` — Issue found (add feedback below the item)
   - `[~]` — Known issue, deferred (not blocking)
   - `[ ]` — Not yet checked
5. After completing a pass, update the status and date above
6. If issues exist, agent addresses them, then you re-verify

---

## Desktop View (≥768px)

Resize browser to at least 768px wide.

### Sidebar Expanded

- [x] Sidebar visible on left side
- [x] "Backboard" title in sidebar header
- [x] Collapse button (panel icon) in sidebar header
- [x] Main nav items: Tasks, Schedule, Projects, Jobs
- [x] Secondary nav at bottom: Archive (separated by border)
- [x] Active page is highlighted in nav

### Sidebar Collapsed

- [x] Click collapse button → sidebar disappears (with animation)
- [x] Header shows expand button + "Backboard" title
- [x] Click expand button → sidebar reappears (with animation)
- [x] Refresh page → sidebar state persists (localStorage)

### Layout & Spacing

- [x] Main content has max-width (~1024px) and fills available width
- [x] Background color visible on sides when window is wide
- [x] No horizontal scrolling
- [~] No layout shift on page load _(known issue, deferred — low priority)_

---

## Mobile View (<768px)

Resize browser to less than 768px wide (or use DevTools mobile mode).

### Header

- [x] Hamburger menu icon visible
- [x] "Backboard" title visible
- [x] Sidebar is NOT visible (hidden)

### Drawer Navigation

- [x] Click hamburger → drawer slides in from left
- [x] Drawer shows "Backboard" title
- [x]  All nav items visible: Tasks, Schedule, Projects, Jobs
- [x] Archive in bottom section with separator
- [x] Active page is highlighted
- [x] Click nav item → navigates AND closes drawer
- [x] Click outside drawer → drawer closes

---

## Navigation

Test each route works correctly.

- [x] `/tasks` — Shows "Tasks" heading
- [x] `/schedule` — Shows "Schedule" heading
- [x] `/projects` — Shows "Projects" heading
- [x] `/jobs` — Shows "Jobs" heading
- [x] `/archive` — Shows "Archive" heading
- [x] Active state updates when navigating

---

## Issues & Feedback

_Document any issues found during verification. Agent will address these, then you re-verify._

### Round 1

**Issue 1: No sidebar animation**
- Sidebar collapse/expand works but has no transition
- Requested smooth CSS width animation

**Issue 2: Content too thin when empty**
- Main content has max-width but doesn't fill available screen width
- Looks too narrow when page content is minimal

**Issue 3: Layout shift on page load**
- Sidebar starts collapsed for a moment, then expands
- Visible flash/shift during hydration

**Fixes applied:**
- Added `transition-[width] duration-200` to sidebar, animates from `w-64` to `w-0`
- Restructured layout: content uses `flex-1` to fill width, `max-w-5xl` on inner div
- Changed initial state to collapsed, uses opacity fade during hydration

### Round 2

**Issue 1: Layout shift still present**
- Sidebar still starts collapsed then expands on page load
- localStorage read happens after React hydration, causing mismatch
- Fixing requires blocking script or alternative storage approach

**Resolution:** Deferred — low priority, does not block core functionality

---

## Sign-off

When all items are checked and no blocking issues remain:

- [x] All desktop checks pass (1 deferred issue)
- [x] All mobile checks pass
- [x] All navigation checks pass
- [x] No blocking issues (1 low-priority issue deferred)

**Verified by**: _______________  
**Date**: _______________

---

## Template Notes

_This section is for documentation purposes and can be removed in future implementations._

This file serves as a template for visual verification steps. When creating a new implementation that requires visual verification:

1. Copy this file structure
2. Customize the checklist items for the specific implementation
3. Remove or modify sections as needed
4. Keep the Issues & Feedback section for iteration

The agent should **not** attempt to run visual verification. Instead:
- Agent runs `pnpm dev` with `required_permissions: ["all"]` to avoid sandbox issues
- Agent provides this checklist to the user
- User performs verification and provides feedback
- Agent addresses any issues
- Repeat until sign-off

