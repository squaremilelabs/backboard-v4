# Initial Project Setup

| Field | Value |
|-------|-------|
| **ID** | 001 |
| **Status** | 🟡 Planning |
| **Created** | 2025-12-24 |
| **Last Updated** | 2025-12-24 |

---

## Overview

Scaffold the Next.js 16 application with foundational dependencies, configuration files, folder structure, and placeholder pages. This establishes the project skeleton that all subsequent implementations will build upon.

---

## Scope

### In Scope
- Initialize Next.js 16 project with TypeScript and App Router
- Install minimal foundational dependencies (Next.js, React 19, TypeScript, Tailwind CSS 4, ESLint, Prettier)
- Configure ESLint flat config per TRD specification
- Configure Prettier with Tailwind plugin per TRD specification
- Set up PostCSS for Tailwind CSS v4
- Create `globals.css` with Tailwind v4 `@import` and basic `@theme` block
- Establish folder structure: `src/app/`, `src/components/`, `src/lib/`, `src/hooks/`, `src/stores/`
- Create placeholder page files for all 5 routes (tasks, schedule, jobs, projects, archive)
- Create root layout with minimal HTML shell
- Add VS Code/Cursor settings for format-on-save
- Create `.env.example` template (empty placeholders for future use)

### Out of Scope
- Dexie.js database setup (Implementation #002)
- shadcn/ui initialization (deferred until first UI components needed)
- Zustand store setup (deferred until UI state needed)
- Tiptap rich text editor (deferred until notes feature)
- Clerk authentication (deferred until auth implementation)
- Dexie Cloud sync (deferred until sync implementation)
- PWA/Serwist configuration (deferred until PWA implementation)
- Vitest testing setup (deferred until testing implementation)
- Any actual UI components or styling beyond placeholders
- Mobile responsiveness considerations

---

## Dependencies

None — this is the first implementation.

---

## Implementation Plan

### Step 1: Initialize Next.js Project
Create new Next.js 16 project with TypeScript, App Router, and `src/` directory structure. Use `create-next-app` with appropriate flags.

### Step 2: Install Tailwind CSS v4
Install `tailwindcss` and `@tailwindcss/postcss`. Configure `postcss.config.mjs` per TRD.

### Step 3: Configure globals.css
Set up `src/app/globals.css` with:
- `@import "tailwindcss";`
- Basic `@theme` block with placeholder custom properties
- Any CSS reset adjustments needed

### Step 4: Configure ESLint
Create `eslint.config.mjs` with flat config format per TRD:
- Next.js core-web-vitals and TypeScript configs
- Prettier integration
- Custom rules for imports, console, unused vars
- Global ignores for `.next/`, `node_modules/`, `dev/`

### Step 5: Configure Prettier
Create `.prettierrc` per TRD:
- No semicolons
- 100 print width
- Tailwind plugin integration
- ES5 trailing commas

### Step 6: Create Folder Structure
Establish empty directories:
```
src/
├── app/           # Next.js App Router pages
├── components/    # React components (empty for now)
│   └── ui/        # Future shadcn/ui components
├── lib/           # Utilities, database, constants
├── hooks/         # Custom React hooks
└── stores/        # Zustand stores
```

### Step 7: Create Placeholder Pages
Create minimal placeholder pages for each route:
- `src/app/page.tsx` — Redirect to `/tasks`
- `src/app/tasks/page.tsx` — "Tasks" placeholder
- `src/app/schedule/page.tsx` — "Schedule" placeholder
- `src/app/jobs/page.tsx` — "Jobs" placeholder
- `src/app/projects/page.tsx` — "Projects" placeholder
- `src/app/archive/page.tsx` — "Archive" placeholder

Each page should be a `"use client"` component with minimal content showing the page name.

### Step 8: Create Root Layout
Create `src/app/layout.tsx` with:
- Basic HTML structure
- Metadata (title, description)
- Import of `globals.css`
- Children rendering

### Step 9: IDE Configuration
Create `.vscode/settings.json` with:
- Format on save enabled
- Prettier as default formatter
- ESLint fix on save

### Step 10: Environment Template
Create `.env.example` with commented placeholders for future variables:
- Clerk keys (commented)
- Dexie Cloud URL (commented)

---

## Technical Notes

### Dependency Versions (per TRD)
| Package | Version |
|---------|---------|
| next | ^16.x |
| react | ^19.x (bundled with Next.js 16) |
| typescript | ^5.8.x |
| tailwindcss | ^4.x |
| @tailwindcss/postcss | ^4.x |
| eslint | ^9.x |
| eslint-config-next | ^16.x |
| prettier | ^3.x |

### Tailwind CSS v4 Notes
- Uses CSS-first configuration via `@theme` blocks in CSS
- No `tailwind.config.js` needed
- Requires `@tailwindcss/postcss` plugin (not the old `tailwindcss` PostCSS plugin)

### ESLint Flat Config
- Next.js 16 uses ESLint 9 flat config format
- Config file is `eslint.config.mjs` (not `.eslintrc`)

---

## Acceptance Criteria

- [ ] `pnpm dev` starts the development server without errors
- [ ] `pnpm build` completes successfully
- [ ] `pnpm lint` runs ESLint without errors
- [ ] All 5 routes are accessible and render placeholder content
- [ ] Tailwind CSS classes work in placeholder pages
- [ ] Prettier formats files on save in VS Code/Cursor
- [ ] Folder structure matches TRD specification
- [ ] No extraneous dependencies installed (minimal footprint)

