# Visual Verification: 005 Scope Management

## Instructions

1. Run `pnpm dev` in your terminal
2. Open http://localhost:3000 in your browser
3. Go through each checklist item below
4. Mark items with:
   - `[x]` — Verified, works as expected
   - `[!]` — Issue found (add feedback inline)
   - `[~]` — Known issue, deferred
   - `[ ]` — Not yet checked

---

## Jobs Page (`/jobs`)

### Layout
- [ ] Grid structure: title column (288px) + 7 day columns
- [x] Grid header shows day names
- [x] Each job is a row with title + 7 cell placeholders
- [x] List-only on mobile (no grid columns)
- [x] Gold theme applied (`.theme-gold`)

### Add Job
- [x] "+ Add job..." button visible at bottom of list
- [x] Click button → input appears
- [x] Type title, press Enter → job created
- [x] Job appears in list
- [x] Input stays open for rapid entry
- [x] Press Escape → input closes

### Edit Job (Desktop)
- [x] Click on job title → inline edit mode
- [x] Edit text, press Enter → title saved
- [x] Press Escape → reverts to original
- [x] Click away → saves changes

### Edit Job (Mobile)
- [x] Click anywhere on row → modal opens as full-screen sheet with proper padding
- [ ] Title as editable header with colored dot indicator
- [ ] Long titles truncate properly
- [x] Title saves on blur or Enter

### More Menu (Desktop)
- [x] Hover job row → "..." button appears
- [x] Click "..." → modal dialog opens
- [ ] Title as editable header with colored dot indicator
- [x] Click "Done" to close modal

### Archive Job
- [x] In modal, click Archive button
- [x] Confirmation dialog appears
- [x] Confirm → job removed from list

---

## Projects Page (`/projects`)

### Layout
- [ ] Grid structure: title column (288px) + 6 month columns
- [ ] Nested items align properly in grid (indented within title cell)
- [ ] Title column and header stay frozen when scrolling horizontally
- [x] Grid header shows month names (dynamic based on current date)
- [x] Parent projects have hollow dots, children have filled dots
- [x] No horizontal overflow on mobile (long titles truncated)
- [x] Blue theme applied (`.theme-blue`)

### Add Project
- [x] "+ Add project..." at bottom of list
- [x] Creates top-level project

### Project Nesting
- [x] Parent projects show "+ Add sub-project..." underneath
- [x] Adding sub-project creates nested child
- [x] Child projects are indented

### All interactions from Jobs page work on Projects
- [x] Add, inline edit, modal edit, archive all work

---

## General

- [x] No console errors or warnings
- [x] Responsive transitions smooth
- [x] Data persists on page refresh (IndexedDB)

---

## Sign-off

- [ ] All desktop checks pass
- [ ] All mobile checks pass
- [ ] No blocking issues

---

## Issues & Feedback

### Round 1

**Issue 1: Layout doesn't take full page height**
- Jobs/Projects pages only as tall as content
- Grid placeholder doesn't fill right panel

**Issue 2: Mobile horizontal overflow**
- Long titles cause horizontal scroll on mobile

**Issue 3: Modal needs padding**
- Sheet content body lacks horizontal padding

**Issue 4: Modal title not pre-populated**
- Title input is empty when modal opens
- Stale value persists when switching between scopes

**Issue 5: Console accessibility warning**
- Missing DialogDescription for screen readers

**Fixes applied:**
- Added `h-full` to page-shell.tsx wrapper
- Added `min-w-0` and flex layout to left panel
- Added `px-6` padding to SheetContent
- Changed to `useEffect` for title sync when modal opens
- Added `DialogDescription` and `SheetDescription` with `sr-only`

**Round 1.5 — Additional fix:**
- Implemented Notion-style click-to-edit title in modal
- Title displays as heading, click to enter edit mode
- Saves on blur or Enter, Escape to cancel
- Changed "Save/Cancel" buttons to single "Done" button

### Round 2

**Issue 1: Grid structure per visual designs**
- Layout should be a grid with title column + day/month columns
- Each scope is a row with title + grid cells (not separate panel)

**Issue 2: Modal title should be editable header**
- Remove "Edit Job" label, use editable title as header

**Fixes applied:**
- Created `ScopeGridRow` component with title + 7 cells (jobs) or 6 cells (projects)
- Created `ScopeGridHeader` with day names (jobs) or month names (projects)
- Made modal header use editable title instead of static label
- Parent projects have hollow dots, children have filled dots
- Removed old two-panel layout

### Round 3

**Issue 1: Title column width**
- Title column should be fixed at 288px

**Issue 2: Nested items grid alignment**
- Sub-items pushing grid cells right instead of aligning properly

**Issue 3: Frozen columns with horizontal scroll**
- Title column and header should stay frozen while cells scroll

**Issue 4: Modal dot indicator**
- Add colored dot indicator next to title in modal

**Issue 5: Modal title truncation**
- Long titles should truncate in the modal

**Fixes applied:**
- Changed from CSS Grid to Flexbox layout
- Title column fixed at 288px (w-72) with `sticky left-0`
- Nested items indent within title cell, not entire row
- Grid cells scroll horizontally, title stays sticky
- Added colored dot indicator to modal title
- Modal title truncates with `truncate` class

