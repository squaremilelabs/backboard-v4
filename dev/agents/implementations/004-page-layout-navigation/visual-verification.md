# Visual Verification Checklist

> **Implementation**: 004 - Page Layout & Navigation  
> **Status**: 🔄 In Progress  
> **Last Updated**: 2025-12-30

---

## Instructions

1. Run `pnpm dev` in your terminal
2. Open http://localhost:3000 in your browser
3. Go through each section below
4. Mark items with:
   - `[x]` — Verified, works as expected
   - `[!]` — Issue found (add feedback below the item)
   - `[ ]` — Not yet checked
5. After completing a pass, update the status and date above
6. If issues exist, agent addresses them, then you re-verify

---

## Desktop View (≥768px)

Resize browser to at least 768px wide.

### Sidebar Expanded

- [ ] Sidebar visible on left side
- [ ] "Backboard" title in sidebar header
- [ ] Collapse button (panel icon) in sidebar header
- [ ] Main nav items: Tasks, Schedule, Projects, Jobs
- [ ] Secondary nav at bottom: Archive (separated by border)
- [ ] Active page is highlighted in nav

### Sidebar Collapsed

- [ ] Click collapse button → sidebar disappears
- [ ] Header shows expand button + "Backboard" title
- [ ] Click expand button → sidebar reappears
- [ ] Refresh page → sidebar state persists (localStorage)

### Layout & Spacing

- [ ] Main content has max-width (~1024px)
- [ ] Background color visible on sides when window is wide
- [ ] No horizontal scrolling
- [ ] No layout shift on page load

---

## Mobile View (<768px)

Resize browser to less than 768px wide (or use DevTools mobile mode).

### Header

- [ ] Hamburger menu icon visible
- [ ] "Backboard" title visible
- [ ] Sidebar is NOT visible (hidden)

### Drawer Navigation

- [ ] Click hamburger → drawer slides in from left
- [ ] Drawer shows "Backboard" title
- [ ] All nav items visible: Tasks, Schedule, Projects, Jobs
- [ ] Archive in bottom section with separator
- [ ] Active page is highlighted
- [ ] Click nav item → navigates AND closes drawer
- [ ] Click outside drawer → drawer closes

---

## Navigation

Test each route works correctly.

- [ ] `/tasks` — Shows "Tasks" heading
- [ ] `/schedule` — Shows "Schedule" heading
- [ ] `/projects` — Shows "Projects" heading
- [ ] `/jobs` — Shows "Jobs" heading
- [ ] `/archive` — Shows "Archive" heading
- [ ] Active state updates when navigating

---

## Issues & Feedback

_Document any issues found during verification. Agent will address these, then you re-verify._

### Round 1

<!-- Example format:
**Issue**: Sidebar doesn't collapse on first click
**Steps to reproduce**: Click collapse button in sidebar header
**Expected**: Sidebar should hide immediately
**Actual**: Nothing happens on first click, works on second
**Screenshot**: (optional - paste or describe)
-->

_(No issues found yet)_

---

## Sign-off

When all items are checked and no issues remain:

- [ ] All desktop checks pass
- [ ] All mobile checks pass
- [ ] All navigation checks pass
- [ ] No outstanding issues

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

