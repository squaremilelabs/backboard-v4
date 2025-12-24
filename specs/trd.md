# Backboard V4 – Technical Requirements Document

## 1. Overview

### Design Principles

- **LLM-Friendly**: Tech choices optimized for AI-assisted development (well-documented, popular, lots of training data)
- **Local-First**: App works fully offline; data stored locally in IndexedDB
- **Sync-Ready**: Architecture supports cloud sync from day 1 via Dexie Cloud
- **PWA-Installable**: Users can install on mobile/desktop for native-like experience

---

## 2. Tech Stack

| Layer | Technology | Version | Notes |
|-------|------------|---------|-------|
| **Framework** | Next.js | 16.x | App Router, fully client-side rendering |
| **React** | React | 19.x | Bundled with Next.js 16 |
| **UI Components** | shadcn/ui | latest | Copied into codebase, Radix-based |
| **Styling** | Tailwind CSS | 4.x | Uses `@tailwindcss/postcss` plugin |
| **Rich Text Editor** | Tiptap | 2.x | Headless, ProseMirror-based |
| **State Management** | Zustand | 5.x | Lightweight UI state; Dexie handles data |
| **Local Database** | Dexie.js | 4.x | IndexedDB wrapper with `useLiveQuery` |
| **Sync Engine** | Dexie Cloud | 4.x | Managed sync service |
| **Authentication** | Clerk | @clerk/nextjs latest | Auth provider, integrates with Dexie Cloud |
| **Hosting** | Vercel | - | Optimized for Next.js |
| **PWA** | @serwist/next | 9.x | Modern PWA plugin (successor to next-pwa) |
| **Testing** | Vitest | 3.x | Minimal test coverage |

---

## 3. Architecture

### 3.1 Client-Side Only

Since Backboard is local-first, the entire app runs client-side:

```
┌─────────────────────────────────────────────────────────────┐
│                        Next.js App                          │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                   "use client"                       │   │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────────────┐  │   │
│  │  │  Pages   │  │Components│  │     Hooks        │  │   │
│  │  └────┬─────┘  └────┬─────┘  └────────┬─────────┘  │   │
│  │       │             │                  │            │   │
│  │       └─────────────┼──────────────────┘            │   │
│  │                     ▼                               │   │
│  │            ┌─────────────────┐                      │   │
│  │            │   Dexie.js DB   │                      │   │
│  │            │   (IndexedDB)   │                      │   │
│  │            └────────┬────────┘                      │   │
│  │                     │                               │   │
│  │                     ▼                               │   │
│  │            ┌─────────────────┐                      │   │
│  │            │  Dexie Cloud    │◄── Clerk Auth        │   │
│  │            │  (Sync Layer)   │                      │   │
│  │            └─────────────────┘                      │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

### 3.2 Next.js App Router Structure

All pages use `"use client"` directive. Server Components are only used for:
- Static layout shell
- Metadata generation
- Initial HTML structure

```
app/
├── layout.tsx          # Root layout (server component, minimal)
├── page.tsx            # Redirect to /tasks
├── tasks/
│   └── page.tsx        # "use client" - Tasks page
├── schedule/
│   └── page.tsx        # "use client" - Schedule page
├── projects/
│   └── page.tsx        # "use client" - Projects page
├── jobs/
│   └── page.tsx        # "use client" - Jobs page
└── archive/
    └── page.tsx        # "use client" - Archive page
```

---

## 4. Database Schema (Dexie.js)

### 4.1 Schema Definition

```typescript
// lib/db.ts
import Dexie, { Table } from 'dexie';
import dexieCloud from 'dexie-cloud-addon';

// Types (from product spec)
type TaskStatus = 'now' | 'later' | 'backlog' | 'done';
type TasklistType = TaskStatus | 'recurring';
type ScopeType = 'job' | 'project';
type Weekday = 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun';

interface Task {
  id: string;
  scopeId: string | null;        // null = Triage
  title: string;
  content?: string;
  status: TaskStatus;
  pendingAction?: TaskStatus | 'delete' | null;
  insertedAt: number;
  insertedFrom: TasklistType;
  createdAt: number;
  completedAt?: number;          // For 7-day purge
}

interface RecurringTask {
  id: string;
  scopeId: string;
  title: string;
  content?: string;
  frequency: FrequencyValue[];
  createdAt: number;
  lastInsertedDate?: string;     // YYYY-MM-DD, prevents duplicate insertion
}

interface FrequencyValue {
  weekday: Weekday;
  time: string;                  // HH:mm
  timezone: string;
}

interface Scope {
  id: string;
  type: ScopeType;
  title: string;
  content?: string;
  parentId?: string;             // Only for projects, 1 level
  createdAt: number;
  archivedAt?: number;
}

interface ScheduleSlot {
  id: string;
  date: string;                  // YYYY-MM-DD
  weekday: Weekday;
  scopeId: string;
}

interface MonthSlot {
  id: string;
  month: string;                 // YYYY-MM
  projectId: string;
}

interface DefaultScheduleSlot {
  id: string;
  weekday: Weekday;
  jobId: string;
}

interface AppMeta {
  id: string;                    // Always 'app'
  lastSyncedAt: number;
  timezone: string;
}

// Database class
class BackboardDB extends Dexie {
  tasks!: Table<Task>;
  recurringTasks!: Table<RecurringTask>;
  scopes!: Table<Scope>;
  scheduleSlots!: Table<ScheduleSlot>;
  monthSlots!: Table<MonthSlot>;
  defaultScheduleSlots!: Table<DefaultScheduleSlot>;
  appMeta!: Table<AppMeta>;

  constructor() {
    super('backboard', { addons: [dexieCloud] });
    
    this.version(1).stores({
      tasks: 'id, scopeId, status, createdAt, completedAt',
      recurringTasks: 'id, scopeId',
      scopes: 'id, type, archivedAt',
      scheduleSlots: 'id, date, scopeId, [date+scopeId]',
      monthSlots: 'id, month, projectId, [month+projectId]',
      defaultScheduleSlots: 'id, weekday, jobId, [weekday+jobId]',
      appMeta: 'id',
    });

    // Dexie Cloud configuration
    this.cloud.configure({
      databaseUrl: process.env.NEXT_PUBLIC_DEXIE_CLOUD_URL!,
      requireAuth: false,  // Allow anonymous local usage
    });
  }
}

export const db = new BackboardDB();
```

### 4.2 Indexes Explained

| Table | Index | Purpose |
|-------|-------|---------|
| tasks | `scopeId` | Filter tasks by scope |
| tasks | `status` | Filter by Now/Later/Backlog/Done |
| tasks | `completedAt` | Purge done tasks >7 days |
| scopes | `type` | Filter Jobs vs Projects |
| scopes | `archivedAt` | Find archived scopes for purge |
| scheduleSlots | `[date+scopeId]` | Compound: check if scope scheduled on date |
| monthSlots | `[month+projectId]` | Compound: check if project active in month |

---

## 5. Sync with Dexie Cloud

### 5.1 How It Works

1. **Anonymous users**: Data stored locally only
2. **Signed-in users**: Data syncs to Dexie Cloud
3. **Clerk integration**: Dexie Cloud uses Clerk JWT for authentication

### 5.2 Clerk + Dexie Cloud Integration

```typescript
// lib/auth.ts
import { db } from './db';
import { useAuth } from '@clerk/nextjs';

export function useSyncAuth() {
  const { getToken, isSignedIn } = useAuth();

  useEffect(() => {
    if (isSignedIn) {
      // Login to Dexie Cloud with Clerk token
      db.cloud.login({
        token: async () => {
          const token = await getToken({ template: 'dexie-cloud' });
          return token;
        },
      });
    } else {
      // Logout from Dexie Cloud (keeps local data)
      db.cloud.logout();
    }
  }, [isSignedIn]);
}
```

### 5.3 Dexie Cloud Setup

1. Create account at [dexie.cloud](https://dexie.cloud)
2. Create database, get URL
3. Configure Clerk JWT template for Dexie Cloud
4. Set `NEXT_PUBLIC_DEXIE_CLOUD_URL` in environment

---

## 6. Local Sync Jobs

On app launch, run these jobs client-side:

```typescript
// lib/sync.ts
import { db } from './db';
import { 
  addDays, 
  format, 
  isAfter, 
  subDays,
  startOfWeek,
  parse 
} from 'date-fns';

export async function runSyncJobs() {
  const now = new Date();
  const today = format(now, 'yyyy-MM-dd');
  
  await Promise.all([
    insertRecurringTasks(now, today),
    populateScheduleSlots(today),
    purgeDoneTasks(now),
    purgeArchivedScopes(now),
  ]);

  // Update last synced timestamp
  await db.appMeta.put({ id: 'app', lastSyncedAt: Date.now() });
}

async function insertRecurringTasks(now: Date, today: string) {
  const currentWeekday = format(now, 'eee').toLowerCase() as Weekday;
  const currentTime = format(now, 'HH:mm');
  
  const recurringTasks = await db.recurringTasks.toArray();
  
  for (const rt of recurringTasks) {
    // Skip if already inserted today
    if (rt.lastInsertedDate === today) continue;
    
    // Check if any frequency matches now
    const shouldInsert = rt.frequency.some(f => 
      f.weekday === currentWeekday && f.time <= currentTime
    );
    
    if (shouldInsert) {
      await db.tasks.add({
        id: crypto.randomUUID(),
        scopeId: rt.scopeId,
        title: rt.title,
        content: rt.content,
        status: 'now',
        insertedAt: Date.now(),
        insertedFrom: 'recurring',
        createdAt: Date.now(),
      });
      
      await db.recurringTasks.update(rt.id, { lastInsertedDate: today });
    }
  }
}

async function populateScheduleSlots(today: string) {
  const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 }); // Monday
  
  // Get all default schedule slots
  const defaults = await db.defaultScheduleSlots.toArray();
  
  // Create slots for next 7 days
  for (let i = 0; i < 7; i++) {
    const date = addDays(new Date(today), i);
    const dateStr = format(date, 'yyyy-MM-dd');
    const weekday = format(date, 'eee').toLowerCase() as Weekday;
    
    // Find defaults for this weekday
    const dayDefaults = defaults.filter(d => d.weekday === weekday);
    
    for (const def of dayDefaults) {
      // Check if slot already exists
      const existing = await db.scheduleSlots
        .where('[date+scopeId]')
        .equals([dateStr, def.jobId])
        .first();
      
      if (!existing) {
        await db.scheduleSlots.add({
          id: crypto.randomUUID(),
          date: dateStr,
          weekday,
          scopeId: def.jobId,
        });
      }
    }
  }
}

async function purgeDoneTasks(now: Date) {
  const cutoff = subDays(now, 7).getTime();
  
  await db.tasks
    .where('completedAt')
    .below(cutoff)
    .delete();
}

async function purgeArchivedScopes(now: Date) {
  const cutoff = subDays(now, 30).getTime();
  
  const toDelete = await db.scopes
    .where('archivedAt')
    .below(cutoff)
    .toArray();
  
  for (const scope of toDelete) {
    // Delete scope and its tasks
    await db.tasks.where('scopeId').equals(scope.id).delete();
    await db.recurringTasks.where('scopeId').equals(scope.id).delete();
    await db.scheduleSlots.where('scopeId').equals(scope.id).delete();
    await db.scopes.delete(scope.id);
  }
}
```

---

## 7. PWA Configuration

### 7.1 Setup with @serwist/next

Serwist is the modern successor to next-pwa, actively maintained for Next.js 14+/16.

```typescript
// next.config.ts
import withSerwistInit from "@serwist/next";

const withSerwist = withSerwistInit({
  swSrc: "app/sw.ts",
  swDest: "public/sw.js",
});

export default withSerwist({
  // Next.js config
});
```

```typescript
// app/sw.ts
import { defaultCache } from "@serwist/next/worker";
import type { PrecacheEntry, SerwistGlobalConfig } from "serwist";
import { Serwist } from "serwist";

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}

declare const self: ServiceWorkerGlobalScope;

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: defaultCache,
});

serwist.addEventListeners();
```

### 7.2 Web App Manifest

```json
// public/manifest.json
{
  "name": "Backboard",
  "short_name": "Backboard",
  "description": "Task management for what's current",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#ffffff",
  "theme_color": "#000000",
  "icons": [
    {
      "src": "/icons/icon-192.png",
      "sizes": "192x192",
      "type": "image/png"
    },
    {
      "src": "/icons/icon-512.png",
      "sizes": "512x512",
      "type": "image/png"
    }
  ]
}
```

### 7.3 PWA Requirements

- [ ] App icons (192x192, 512x512)
- [ ] Splash screens (optional)
- [ ] Offline fallback page
- [ ] Service worker caching strategy

---

## 8. Rich Text Editor (Tiptap)

Tiptap is used for task notes and scope content. It's headless, highly customizable, and has excellent shadcn/ui integrations.

### 8.1 Setup

```bash
# Core packages
pnpm add @tiptap/react @tiptap/pm @tiptap/starter-kit

# Extensions for our use case
pnpm add @tiptap/extension-placeholder @tiptap/extension-link @tiptap/extension-task-list @tiptap/extension-task-item
```

### 8.2 Basic Editor Component

```typescript
// components/editor/tiptap-editor.tsx
'use client';

import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import Link from '@tiptap/extension-link';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';

interface TiptapEditorProps {
  content: string;
  onChange: (content: string) => void;
  placeholder?: string;
}

export function TiptapEditor({ content, onChange, placeholder }: TiptapEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({ placeholder: placeholder ?? 'Add notes...' }),
      Link.configure({ openOnClick: false }),
      TaskList,
      TaskItem.configure({ nested: true }),
    ],
    content,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
  });

  return <EditorContent editor={editor} className="prose prose-sm max-w-none" />;
}
```

### 8.3 Editor Features

For task notes, we support:
- **Basic formatting**: Bold, italic, strikethrough
- **Lists**: Bullet, numbered, and task checklists
- **Links**: URL embedding
- **Placeholder text**: Contextual hints

> **Note**: Consider using [shadcn-minimal-tiptap](https://github.com/aslam97/shadcn-minimal-tiptap) for a pre-built shadcn-styled toolbar.

---

## 9. State Management

### 9.1 Data Layer: Dexie `useLiveQuery`

Dexie provides reactive hooks for IndexedDB queries. This is the primary data layer.

```typescript
// hooks/use-tasks.ts
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/db';

export function useTasks(scopeId: string | null, status: TaskStatus) {
  return useLiveQuery(
    () => db.tasks
      .where({ scopeId, status })
      .sortBy('position'),
    [scopeId, status]
  );
}

export function useScopes(type?: ScopeType) {
  return useLiveQuery(
    () => type
      ? db.scopes.where('type').equals(type).and(s => !s.archivedAt).toArray()
      : db.scopes.filter(s => !s.archivedAt).toArray(),
    [type]
  );
}
```

### 9.2 UI State: Zustand

Zustand handles ephemeral UI state that doesn't need persistence.

```bash
pnpm add zustand
```

```typescript
// stores/ui-store.ts
import { create } from 'zustand';

interface UIState {
  // Active selections
  activeTaskId: string | null;
  activeScopeId: string | null;
  
  // Modals
  isScopeModalOpen: boolean;
  scopeModalMode: 'create' | 'edit' | null;
  
  // Actions
  setActiveTask: (id: string | null) => void;
  setActiveScope: (id: string | null) => void;
  openScopeModal: (mode: 'create' | 'edit') => void;
  closeScopeModal: () => void;
}

export const useUIStore = create<UIState>((set) => ({
  activeTaskId: null,
  activeScopeId: null,
  isScopeModalOpen: false,
  scopeModalMode: null,
  
  setActiveTask: (id) => set({ activeTaskId: id }),
  setActiveScope: (id) => set({ activeScopeId: id }),
  openScopeModal: (mode) => set({ isScopeModalOpen: true, scopeModalMode: mode }),
  closeScopeModal: () => set({ isScopeModalOpen: false, scopeModalMode: null }),
}));
```

### 9.3 State Architecture Summary

| State Type | Solution | Examples |
|------------|----------|----------|
| **Persistent Data** | Dexie.js + `useLiveQuery` | Tasks, Scopes, ScheduleSlots |
| **UI State** | Zustand | Active selections, modal state |
| **Form State** | React Hook Form (optional) | Task editing, scope forms |
| **Server State** | N/A (local-first) | Sync status handled by Dexie Cloud |

---

## 10. Project Structure

```
backboard-v4/
├── app/
│   ├── layout.tsx              # Root layout, Clerk provider
│   ├── page.tsx                # Redirect to /tasks
│   ├── tasks/page.tsx
│   ├── schedule/page.tsx
│   ├── projects/page.tsx
│   ├── jobs/page.tsx
│   └── archive/page.tsx
├── components/
│   ├── ui/                     # shadcn/ui components
│   ├── layout/
│   │   ├── sidebar.tsx
│   │   └── page-shell.tsx
│   ├── tasks/
│   │   ├── task-list.tsx
│   │   ├── task-item.tsx
│   │   ├── task-actions.tsx
│   │   └── add-task.tsx
│   ├── scopes/
│   │   ├── scope-selector.tsx
│   │   ├── scope-detail-modal.tsx
│   │   └── archive-dialog.tsx
│   ├── schedule/
│   │   ├── schedule-grid.tsx
│   │   └── schedule-cell.tsx
│   ├── projects/
│   │   ├── project-list.tsx
│   │   └── month-timeline.tsx
│   └── jobs/
│       ├── job-list.tsx
│       └── weekday-grid.tsx
├── hooks/
│   ├── use-tasks.ts            # Dexie live queries
│   ├── use-scopes.ts
│   ├── use-schedule.ts
│   ├── use-sync.ts             # Sync job runner
│   └── use-sync-auth.ts        # Clerk + Dexie Cloud
├── lib/
│   ├── db.ts                   # Dexie database
│   ├── sync.ts                 # Sync jobs
│   ├── utils.ts                # Utilities
│   └── constants.ts            # App constants
├── public/
│   ├── manifest.json
│   └── icons/
├── specs/
│   ├── product.md
│   └── trd.md
├── tests/
│   └── ...                     # Minimal Vitest tests
├── .env.local
├── next.config.ts             # Next.js 16 config (TypeScript)
├── postcss.config.mjs         # PostCSS with @tailwindcss/postcss
├── tsconfig.json
└── package.json
```

> **Note**: Tailwind CSS v4 uses CSS-first configuration. Theme customization is done in your main CSS file using `@theme` blocks, not a separate `tailwind.config.js`.

---

## 11. Key Dependencies

```json
{
  "dependencies": {
    "next": "^16.0.0",
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "dexie": "^4.0.0",
    "dexie-cloud-addon": "^4.0.0",
    "dexie-react-hooks": "^1.1.0",
    "@clerk/nextjs": "^6.0.0",
    "zustand": "^5.0.0",
    "@tiptap/react": "^2.10.0",
    "@tiptap/pm": "^2.10.0",
    "@tiptap/starter-kit": "^2.10.0",
    "@tiptap/extension-placeholder": "^2.10.0",
    "@tiptap/extension-link": "^2.10.0",
    "@tiptap/extension-task-list": "^2.10.0",
    "@tiptap/extension-task-item": "^2.10.0",
    "date-fns": "^4.0.0",
    "lucide-react": "^0.500.0",
    "class-variance-authority": "^0.7.0",
    "clsx": "^2.0.0",
    "tailwind-merge": "^3.0.0"
  },
  "devDependencies": {
    "typescript": "^5.8.0",
    "tailwindcss": "^4.0.0",
    "@tailwindcss/postcss": "^4.0.0",
    "@serwist/next": "^9.0.0",
    "serwist": "^9.0.0",
    "vitest": "^3.0.0",
    "@testing-library/react": "^16.0.0"
  }
}
```

> **Note**: Always use `@latest` when installing to get the most current versions. The versions above are approximate minimums as of December 2024.

---

## 12. Environment Variables

```bash
# .env.local

# Clerk
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_...
CLERK_SECRET_KEY=sk_...
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up

# Dexie Cloud
NEXT_PUBLIC_DEXIE_CLOUD_URL=https://your-db.dexie.cloud
```

---

## 13. Testing Strategy

Minimal testing to "check the box":

### 11.1 Vitest Setup

```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
  },
});
```

### 11.2 Test Coverage

| Area | Coverage |
|------|----------|
| Sync jobs | Unit tests for purge logic, recurring insertion |
| Database operations | Basic CRUD tests with fake-indexeddb |
| Components | Skip – visual testing via Storybook if needed later |
| E2E | Skip for MVP |

```typescript
// tests/sync.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import 'fake-indexeddb/auto';
import { db } from '../lib/db';

describe('Sync Jobs', () => {
  beforeEach(async () => {
    await db.tasks.clear();
    await db.scopes.clear();
  });

  it('purges tasks older than 7 days', async () => {
    // ... minimal test
  });
});
```

---

## 14. Development Workflow

### 12.1 Getting Started

```bash
# Install dependencies
pnpm install

# Set up environment
cp .env.example .env.local
# Fill in Clerk and Dexie Cloud credentials

# Run development server
pnpm dev
```

### 12.2 Tailwind CSS v4 Setup

```css
/* app/globals.css */
@import "tailwindcss";

/* Custom theme configuration (replaces tailwind.config.js) */
@theme {
  --color-primary: oklch(0.7 0.15 200);
  --color-secondary: oklch(0.6 0.1 250);
  /* ... custom tokens */
}
```

```javascript
// postcss.config.mjs
export default {
  plugins: {
    "@tailwindcss/postcss": {},
  },
};
```

### 12.3 shadcn/ui Components

```bash
# Initialize shadcn/ui
pnpm dlx shadcn@latest init

# Add components as needed
pnpm dlx shadcn@latest add button
pnpm dlx shadcn@latest add dialog
pnpm dlx shadcn@latest add input
# etc.
```

### 12.4 Deployment

```bash
# Deploy to Vercel
vercel --prod
```

---

## 15. Open Technical Decisions

| Item | Status | Notes |
|------|--------|-------|
| Dexie Cloud pricing tier | TBD | Free tier may suffice for MVP |
| Clerk JWT template setup | TBD | Need to configure for Dexie Cloud |
| Offline fallback UI | TBD | What to show when truly offline |
| Data export/import | TBD | User data portability |
| Analytics | TBD | Vercel Analytics, Plausible, or skip |

---

## 16. References

- [Next.js 16 Docs](https://nextjs.org/docs)
- [React 19 Docs](https://react.dev)
- [Tailwind CSS v4 Docs](https://tailwindcss.com/docs)
- [shadcn/ui Docs](https://ui.shadcn.com)
- [Tiptap Docs](https://tiptap.dev/docs)
- [Zustand Docs](https://zustand.docs.pmnd.rs)
- [Dexie.js Docs](https://dexie.org)
- [Dexie Cloud Docs](https://dexie.org/cloud)
- [Dexie React Hooks](https://dexie.org/docs/dexie-react-hooks/useLiveQuery())
- [Clerk + Next.js](https://clerk.com/docs/quickstarts/nextjs)
- [Clerk JWT Templates](https://clerk.com/docs/backend-requests/making/jwt-templates)
- [Serwist (PWA)](https://serwist.pages.dev/docs/next)

