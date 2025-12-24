# Log: Initial PRD & TRD Creation

**Date**: 2025-12-24  
**Model**: Claude Opus 4.5  
**Session Duration**: ~1 hour  
**Outcome**: Complete PRD and TRD for Backboard V4

---

## Summary

This session established the foundational specs for Backboard V4 – a local-first task management app. Starting from a Figma file, we iteratively built out both the Product Requirements Document (PRD) and Technical Requirements Document (TRD) through a structured interview process.

---

## Conversation Flow

### Phase 1: Figma Exploration

1. **Input**: User provided Figma file URL
2. **Process**: Used Figma MCP tools to:
   - Fetch design context and metadata
   - Take screenshots of key frames (Tasks, Schedule, Projects, Jobs pages)
   - Identify UI patterns (task actions, tasklist states, unfocused scope warnings)
   - Extract TypeScript schema from "Schema" section in Figma

### Phase 2: PRD Development (Interview Style)

Started with a draft PRD outline, then refined through Q&A:

| Round | Topics Covered |
|-------|----------------|
| 1 | Core concepts: Jobs vs Projects, Task lifecycle, Scheduling model |
| 2 | Triage behavior, Schedule grid interactions, Scope visibility rules |
| 3 | Unfocused scope warnings, Archive flow, Data lifecycle |
| 4 | Local-first sync jobs (replaced server cron), Mobile support requirements |

**Key Clarifications from User**:
- Triage is for quick-add, tasks only move *out* of Triage
- Schedule grid: toggle cells (not drag duration bars)
- Week starts on Monday (auto-detect, user-modifiable)
- Projects can span non-consecutive months
- Done tasks purge after 7 days, archived scopes after 30 days
- Cron jobs replaced with client-side sync-on-launch

### Phase 3: TRD Development

Established tech stack through targeted questions:

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Framework | Next.js 16 (App Router) | LLM-friendly, latest version |
| Rendering | Fully client-side | Local-first architecture |
| UI Components | shadcn/ui | LLM-friendly, copied into codebase |
| Styling | Tailwind CSS v4 | CSS-first config, latest version |
| Local DB | Dexie.js | IndexedDB wrapper with reactive hooks |
| Sync | Dexie Cloud | Managed sync, Clerk JWT integration |
| Auth | Clerk | User's existing preference |
| PWA | @serwist/next | Modern successor to next-pwa |
| Rich Text | Tiptap | Headless, ProseMirror-based |
| State | Zustand + Dexie useLiveQuery | Lightweight UI state + reactive data |
| Testing | Vitest (minimal) | Lean, just to check the box |
| Hosting | Vercel | Optimized for Next.js |

**Version Research**: Used Context7 MCP to verify latest versions:
- Next.js 16.x (not 14 as initially assumed)
- Tailwind CSS 4.x (major changes from v3)
- React 19.x (bundled with Next.js 16)

### Phase 4: Finalization

1. Saved 10 Figma screenshots to `specs/visuals/`
2. Wrote PRD to `specs/prd.md` (382 lines)
3. Wrote TRD to `specs/trd.md` (874 lines)
4. Pushed to GitHub: `squaremilelabs/backboard-v4` (public)

---

## Key Decisions Made

### Product Decisions
- **Ephemeral by design**: No permanent history, focused on "now"
- **Time horizons**: 7-day schedule view, 6-month project timeline
- **Unfocused scope pattern**: Red warning when tasks are in "Now" but scope not scheduled today

### Technical Decisions
- **Local-first**: All data in IndexedDB, sync optional on account creation
- **No server-side cron**: Sync jobs run client-side on app launch
- **PWA-first**: Installable on mobile/desktop
- **LLM-friendly stack**: Every choice optimized for AI-assisted development

---

## Files Created

```
specs/
├── prd.md                    # Product Requirements Document
├── trd.md                    # Technical Requirements Document
├── logs/
│   └── 2024-12-24-initial-prd-trd.md  # This file
└── visuals/
    ├── page-tasks.png
    ├── page-schedule.png
    ├── page-projects.png
    ├── page-jobs.png
    ├── task-actions.png
    ├── task-actions-by-status.png
    ├── tasklist-notes.png
    ├── tasklist-adding.png
    ├── tasklist-actioning.png
    └── tasklist-unfocused.png
```

---

## Tools Used

| Tool | Purpose |
|------|---------|
| `mcp_Figma_get_design_context` | Extract design structure and code hints |
| `mcp_Figma_get_screenshot` | Capture visual references |
| `mcp_Figma_get_metadata` | Get node hierarchy |
| `mcp_context7_resolve-library-id` | Find library documentation |
| `mcp_context7_get-library-docs` | Verify latest versions |
| `gh repo create` | Create GitHub repository |

---

## Next Steps

1. Scaffold the Next.js 16 project
2. Set up Dexie.js schema
3. Implement core components (Tasklist, Schedule grid)
4. Add PWA configuration
5. Integrate Clerk authentication
6. Connect Dexie Cloud for sync

---

## Observations

**What worked well**:
- Figma MCP tools provided quick visual context
- Interview-style PRD development caught edge cases early
- Context7 prevented using outdated package versions

**What could improve**:
- Figma screenshots couldn't be auto-saved to disk (manual export needed)
- Some back-and-forth on terminology (Mode → Job)

---

*End of log*

