# Initial Project Setup

| Field | Value |
|-------|-------|
| **ID** | 001 |
| **Status** | 🟢 In Progress |
| **Progress** | Step 3 of 13 complete |
| **Created** | 2025-12-24 |
| **Last Updated** | 2025-12-26 |

---

## Overview

Scaffold the Next.js 16 application with foundational dependencies, configuration files, folder structure, and placeholder pages. This establishes the project skeleton that all subsequent implementations will build upon.

---

## References

Read these before implementing:

| Topic | Source |
|-------|--------|
| Project structure | `dev/specs/trd.md` §10 |
| ESLint flat config | `dev/specs/trd.md` §11.1 — copy config verbatim |
| Prettier config | `dev/specs/trd.md` §11.2 — copy config verbatim |
| IDE settings | `dev/specs/trd.md` §11.3 — copy config verbatim |
| Tailwind v4 setup | `dev/specs/trd.md` §15.2 |
| App Router structure | `dev/specs/trd.md` §3.2 |
| Dependency versions | `dev/specs/trd.md` §12 |

---

## Scope

### In Scope
- Initialize Next.js 16 project with TypeScript and App Router
- Install foundational dependencies (Next.js, React 19, TypeScript, Tailwind CSS 4, ESLint, Prettier)
- Configure ESLint flat config per TRD §11.1
- Configure Prettier per TRD §11.2
- Set up PostCSS for Tailwind CSS v4
- Create `globals.css` with Tailwind v4 `@import` and basic `@theme` block
- Establish folder structure per TRD §10
- Create placeholder page files for all 5 routes (tasks, schedule, jobs, projects, archive)
- Create root layout with minimal HTML shell
- Add VS Code/Cursor settings per TRD §11.3
- Create `.env.example` template

### Out of Scope
- Dexie.js database setup (future implementation)
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

## Files Created

Exact files this implementation will create or modify:

### Base Project Files (Step 1)
- [x] `package.json`
- [x] `tsconfig.json`
- [x] `next.config.ts`
- [x] `.gitignore`

### Config Files (project root)
- [ ] `eslint.config.mjs`
- [ ] `.prettierrc`
- [x] `postcss.config.mjs`
- [ ] `.env.example`
- [ ] `.vscode/settings.json`

### App Files
- [ ] `src/app/globals.css`
- [x] `src/app/layout.tsx` (placeholder created Step 1, final version Step 10)
- [x] `src/app/page.tsx` (placeholder created Step 1, final version Step 11)
- [ ] `src/app/tasks/page.tsx`
- [ ] `src/app/schedule/page.tsx`
- [ ] `src/app/jobs/page.tsx`
- [ ] `src/app/projects/page.tsx`
- [ ] `src/app/archive/page.tsx`

### Empty Directories
- [ ] `src/components/`
- [ ] `src/components/ui/`
- [ ] `src/lib/`
- [ ] `src/hooks/`
- [ ] `src/stores/`

---

## Implementation Plan

### Step 1: Initialize Next.js Project ✅

**Do**: Create new Next.js 16 project with TypeScript, App Router, and `src/` directory. Do NOT use the `--tailwind` flag — we'll configure Tailwind v4 manually.

**Commands**:
```bash
pnpm create next-app@latest . --typescript --eslint --app --src-dir --import-alias "@/*"
```

**Note**: Due to existing files in directory, project was manually scaffolded instead of using `create-next-app`. Created `package.json`, `tsconfig.json`, `next.config.ts`, `next-env.d.ts`, and initial `src/app/` structure.

**Verify**: 
- ✅ `package.json` exists with `next`, `react`, `react-dom` dependencies
- ✅ `src/app/` directory exists
- ✅ `tsconfig.json` exists

---

### Step 2: Install Tailwind CSS v4 ✅

**Do**: Install Tailwind v4 and its PostCSS plugin.

**Commands**:
```bash
pnpm add -D tailwindcss @tailwindcss/postcss
```

**Verify**: 
- ✅ `package.json` devDependencies includes `tailwindcss` (4.1.18) and `@tailwindcss/postcss` (4.1.18)

---

### Step 3: Configure PostCSS ✅

**Do**: Create `postcss.config.mjs` per TRD §15.2.

**Create file** `postcss.config.mjs`:
```javascript
export default {
  plugins: {
    "@tailwindcss/postcss": {},
  },
};
```

**Verify**: 
- ✅ File exists at project root

---

### Step 4: Configure globals.css

**Do**: Replace `src/app/globals.css` with Tailwind v4 setup per TRD §15.2. Remove all default Next.js CSS.

**Create file** `src/app/globals.css`:
```css
@import "tailwindcss";

/* Custom theme configuration (replaces tailwind.config.js) */
@theme {
  /* Placeholder tokens - will be customized in future implementations */
  --color-primary: oklch(0.7 0.15 200);
  --color-secondary: oklch(0.6 0.1 250);
}
```

**Verify**: File contains `@import "tailwindcss";` and `@theme` block

---

### Step 5: Install Prettier and Plugins

**Do**: Install Prettier with Tailwind plugin and supporting plugins.

**Commands**:
```bash
pnpm add -D prettier prettier-plugin-tailwindcss prettier-plugin-classnames prettier-plugin-merge eslint-plugin-prettier
```

**Verify**: All packages appear in `package.json` devDependencies

---

### Step 6: Configure ESLint

**Do**: Replace the default ESLint config with flat config from TRD §11.1.

**Create file** `eslint.config.mjs`:
```javascript
import { defineConfig, globalIgnores } from "eslint/config"
import nextVitals from "eslint-config-next/core-web-vitals"
import nextTypescript from "eslint-config-next/typescript"
import prettier from "eslint-plugin-prettier/recommended"

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTypescript,
  prettier,
  {
    rules: {
      "import/order": "warn",
      "no-console": ["warn", { allow: ["error", "warn"] }],
      "@typescript-eslint/no-unused-vars": [
        "warn",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
        },
      ],
      "prettier/prettier": "warn",
    },
  },
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    "node_modules",
    "dev/*",
  ]),
])

export default eslintConfig
```

**Verify**: Run `pnpm lint` — should complete (warnings OK, no errors)

---

### Step 7: Configure Prettier

**Do**: Create `.prettierrc` per TRD §11.2.

**Create file** `.prettierrc`:
```json
{
  "plugins": [
    "prettier-plugin-tailwindcss",
    "prettier-plugin-classnames",
    "prettier-plugin-merge"
  ],
  "semi": false,
  "printWidth": 100,
  "proseWrap": "always",
  "trailingComma": "es5",
  "tailwindStylesheet": "./src/app/globals.css",
  "tailwindFunctions": ["twm", "twv"]
}
```

**Verify**: File exists at project root

---

### Step 8: Configure IDE Settings

**Do**: Create VS Code/Cursor settings per TRD §11.3.

**Create file** `.vscode/settings.json`:
```json
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": "explicit"
  }
}
```

**Verify**: File exists at `.vscode/settings.json`

---

### Step 9: Create Folder Structure

**Do**: Create empty directories for future use per TRD §10.

**Commands**:
```bash
mkdir -p src/components/ui src/lib src/hooks src/stores
```

**Verify**: All directories exist under `src/`

---

### Step 10: Create Root Layout

**Do**: Update `src/app/layout.tsx` with minimal shell. Import globals.css.

**Create file** `src/app/layout.tsx`:
```tsx
import type { Metadata } from "next"
import "./globals.css"

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
      <body>{children}</body>
    </html>
  )
}
```

**Verify**: File exists and imports `globals.css`

---

### Step 11: Create Homepage Redirect

**Do**: Create `src/app/page.tsx` that redirects to `/tasks`.

**Create file** `src/app/page.tsx`:
```tsx
import { redirect } from "next/navigation"

export default function Home() {
  redirect("/tasks")
}
```

**Verify**: Visiting `http://localhost:3000/` redirects to `/tasks`

---

### Step 12: Create Placeholder Pages

**Do**: Create minimal placeholder pages for each route. Each should be a client component showing the page name.

**Create file** `src/app/tasks/page.tsx`:
```tsx
"use client"

export default function TasksPage() {
  return (
    <main className="flex min-h-screen items-center justify-center">
      <h1 className="text-4xl font-bold">Tasks</h1>
    </main>
  )
}
```

**Create file** `src/app/schedule/page.tsx`:
```tsx
"use client"

export default function SchedulePage() {
  return (
    <main className="flex min-h-screen items-center justify-center">
      <h1 className="text-4xl font-bold">Schedule</h1>
    </main>
  )
}
```

**Create file** `src/app/jobs/page.tsx`:
```tsx
"use client"

export default function JobsPage() {
  return (
    <main className="flex min-h-screen items-center justify-center">
      <h1 className="text-4xl font-bold">Jobs</h1>
    </main>
  )
}
```

**Create file** `src/app/projects/page.tsx`:
```tsx
"use client"

export default function ProjectsPage() {
  return (
    <main className="flex min-h-screen items-center justify-center">
      <h1 className="text-4xl font-bold">Projects</h1>
    </main>
  )
}
```

**Create file** `src/app/archive/page.tsx`:
```tsx
"use client"

export default function ArchivePage() {
  return (
    <main className="flex min-h-screen items-center justify-center">
      <h1 className="text-4xl font-bold">Archive</h1>
    </main>
  )
}
```

**Verify**: Each file exists in its respective directory under `src/app/`

---

### Step 13: Create Environment Template

**Do**: Create `.env.example` with placeholder variables for future use.

**Create file** `.env.example`:
```bash
# Clerk Authentication (future implementation)
# NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_...
# CLERK_SECRET_KEY=sk_...
# NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
# NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up

# Dexie Cloud (future implementation)
# NEXT_PUBLIC_DEXIE_CLOUD_URL=https://your-db.dexie.cloud
```

**Verify**: File exists at project root

---

## Verification

Run these checks after implementation is complete:

| Check | Command | Expected Result |
|-------|---------|-----------------|
| Dev server starts | `pnpm dev` | Server runs at localhost:3000, no errors in terminal |
| Build succeeds | `pnpm build` | Exit code 0, `.next/` directory created |
| Lint passes | `pnpm lint` | Exit code 0 (warnings OK) |
| Tailwind works | Visit any page | Text renders with Tailwind classes (centered, bold) |

Manual checks:
- [ ] Visit `http://localhost:3000/` → redirects to `/tasks`
- [ ] Visit `http://localhost:3000/tasks` → shows "Tasks" heading
- [ ] Visit `http://localhost:3000/schedule` → shows "Schedule" heading
- [ ] Visit `http://localhost:3000/jobs` → shows "Jobs" heading
- [ ] Visit `http://localhost:3000/projects` → shows "Projects" heading
- [ ] Visit `http://localhost:3000/archive` → shows "Archive" heading
- [ ] Tailwind classes are applied (text is centered, large, bold)
- [ ] Save a file in VS Code/Cursor → Prettier formats on save
- [ ] Folder structure matches: `src/components/`, `src/lib/`, `src/hooks/`, `src/stores/` exist
