# shadcn/ui Setup & Configuration

| Field | Value |
|-------|-------|
| **ID** | 003 |
| **Status** | 🟢 In Progress |
| **Progress** | Step 2 of 6 complete |
| **Created** | 2025-12-28 |
| **Last Updated** | 2025-12-30 |

---

## Overview

Initialize shadcn/ui with Tailwind CSS v4, configure the CLI, and set up a scoped theming system. The theme supports three contexts via CSS classes:

- **Default** — Neutral colors (no class needed)
- **`.theme-gold`** — Gold primary/secondary (used for Jobs)
- **`.theme-blue`** — Blue primary/secondary (used for Projects)

No components are installed — they will be added incrementally as future implementations require them.

---

## References

Read these before implementing:

| Topic | Source |
|-------|--------|
| shadcn/ui initialization | `dev/specs/trd.md` §15.3 |
| Tailwind v4 CSS structure | `dev/specs/trd.md` §15.2 |
| Design colors (for context) | `dev/specs/visuals/` — Gold for Jobs, Blue for Projects |

External references:
- [shadcn/ui installation docs](https://ui.shadcn.com/docs/installation/next)
- [shadcn/ui theming docs](https://ui.shadcn.com/docs/theming)
- [Tailwind CSS v4 + shadcn/ui](https://ui.shadcn.com/docs/installation/next) — uses CSS variables

---

## Scope

### In Scope
- Run `shadcn init` to generate `components.json` configuration
- Configure for: Default style, Neutral base color, CSS variables enabled
- Create `src/lib/utils.ts` with `cn()` class merging utility
- Ensure Tailwind CSS v4 compatibility (shadcn uses CSS variables)
- Update `globals.css` with shadcn's CSS variable structure
- **Set up scoped theme classes**: `.theme-gold` and `.theme-blue`
- Theme classes override `--primary`, `--secondary`, and related variables within their scope

### Out of Scope
- Installing any shadcn/ui components (added as needed in future implementations)
- Fine-tuning exact color values (user will tinker manually after setup)
- Custom fonts or typography
- Dark mode configuration (future implementation if needed)
- Any UI component building

---

## Dependencies

- `001-initial-project-setup` ✅ Complete
- `002-database-schema` ✅ Complete (not directly required, but establishes project state)

---

## Files Created

Exact files this implementation will create or modify:

- [x] `components.json` — shadcn/ui configuration file (created by CLI)
- [x] `src/lib/utils.ts` — `cn()` utility function (created by CLI)
- [x] `src/app/globals.css` — Updated with shadcn CSS variables (modified)
- [x] `package.json` — New dependencies: `clsx`, `tailwind-merge`, `class-variance-authority` (modified by pnpm)

---

## Implementation Plan

### ✅ Step 1: Install Required Dependencies

**Do**: Install the utility packages that shadcn/ui components rely on.

**Commands**:
```bash
pnpm add clsx tailwind-merge class-variance-authority
```

**Verify**: 
- `package.json` dependencies include `clsx`, `tailwind-merge`, `class-variance-authority`

---

### ✅ Step 2: Run shadcn/ui Init

**Do**: Initialize shadcn/ui with interactive CLI. Use these settings:
- Style: **Default**
- Base color: **Neutral**
- CSS variables: **Yes**

**Commands**:
```bash
pnpm dlx shadcn@latest init
```

**Interactive prompts** — answer as follows:
```
Which style would you like to use? › Default
Which color would you like to use as base color? › Neutral
Do you want to use CSS variables for colors? › yes
```

**Note**: The CLI will detect Next.js, TypeScript, and Tailwind CSS v4 automatically. It will:
1. Create `components.json` with your preferences
2. Create `src/lib/utils.ts` with the `cn()` helper
3. Update `src/app/globals.css` with CSS variables for theming

**Verify**: 
- `components.json` exists at project root
- `src/lib/utils.ts` exists with `cn` export
- `src/app/globals.css` contains `:root` and `.dark` CSS variable blocks

---

### Step 3: Verify CSS Variables Structure

**Do**: Check that `globals.css` has the expected CSS variable structure for theming.

**Expected structure in `src/app/globals.css`**:
```css
@import "tailwindcss";

@layer base {
  :root {
    --background: 0 0% 100%;
    --foreground: 0 0% 3.9%;
    --card: 0 0% 100%;
    --card-foreground: 0 0% 3.9%;
    --popover: 0 0% 100%;
    --popover-foreground: 0 0% 3.9%;
    --primary: 0 0% 9%;
    --primary-foreground: 0 0% 98%;
    --secondary: 0 0% 96.1%;
    --secondary-foreground: 0 0% 9%;
    --muted: 0 0% 96.1%;
    --muted-foreground: 0 0% 45.1%;
    --accent: 0 0% 96.1%;
    --accent-foreground: 0 0% 9%;
    --destructive: 0 84.2% 60.2%;
    --destructive-foreground: 0 0% 98%;
    --border: 0 0% 89.8%;
    --input: 0 0% 89.8%;
    --ring: 0 0% 3.9%;
    --radius: 0.5rem;
    /* ... more variables */
  }

  .dark {
    /* Dark mode overrides */
  }
}
```

**Verify**: 
- CSS variables are defined in `:root` block
- Variables use HSL format (e.g., `0 0% 100%`)
- `--radius` is defined for consistent border radius

---

### Step 4: Add Scoped Theme Classes

**Do**: Add `.theme-gold` and `.theme-blue` classes to `globals.css` that override the primary/secondary colors within their scope.

**Append to `src/app/globals.css`** (inside the `@layer base` block, after `.dark`):

```css
  /* ==========================================================================
     Scoped Themes
     Apply these classes to containers to theme all children.
     Usage: <div className="theme-gold">...</div>
     ========================================================================== */

  .theme-gold {
    /* Gold theme (used for Jobs) */
    --primary: 43 74% 49%;
    --primary-foreground: 0 0% 100%;
    --secondary: 43 60% 85%;
    --secondary-foreground: 43 74% 25%;
    --accent: 43 50% 92%;
    --accent-foreground: 43 74% 30%;
    --ring: 43 74% 49%;
  }

  .theme-blue {
    /* Blue theme (used for Projects) */
    --primary: 199 45% 48%;
    --primary-foreground: 0 0% 100%;
    --secondary: 199 35% 85%;
    --secondary-foreground: 199 45% 25%;
    --accent: 199 30% 92%;
    --accent-foreground: 199 45% 30%;
    --ring: 199 45% 48%;
  }
```

**Color reference**:
| Theme | Primary | Approx Hex | Usage |
|-------|---------|------------|-------|
| Gold | `43 74% 49%` | `#C9A227` | Jobs |
| Blue | `199 45% 48%` | `#4A90A4` | Projects |

**Verify**: 
- Both `.theme-gold` and `.theme-blue` classes exist in `globals.css`
- Classes are inside `@layer base { }` block

---

### Step 5: Verify Build

**Do**: Ensure the project builds successfully with the new configuration.

**Commands**:
```bash
pnpm build
```

**Verify**: 
- Build exits with code 0
- No errors related to `src/lib/utils.ts` or CSS

---

### Step 6: Verify Theme Classes Work

**Do**: Test that the scoped theme classes correctly override colors.

**Test** (manual verification):
1. Update `src/app/tasks/page.tsx` temporarily:
   ```tsx
   "use client"

   import { cn } from "@/lib/utils"

   export default function TasksPage() {
     return (
       <main className="flex min-h-screen flex-col items-center justify-center gap-8 p-8">
         <h1 className="text-4xl font-bold">Theme Test</h1>
         
         {/* Default (neutral) */}
         <div className="rounded-lg border p-4">
           <p className="mb-2 text-sm text-muted-foreground">Default theme:</p>
           <button className="rounded bg-primary px-4 py-2 text-primary-foreground">
             Primary Button
           </button>
         </div>

         {/* Gold theme (for Jobs) */}
         <div className="theme-gold rounded-lg border p-4">
           <p className="mb-2 text-sm text-muted-foreground">Gold theme:</p>
           <button className="rounded bg-primary px-4 py-2 text-primary-foreground">
             Primary Button
           </button>
         </div>

         {/* Blue theme (for Projects) */}
         <div className="theme-blue rounded-lg border p-4">
           <p className="mb-2 text-sm text-muted-foreground">Blue theme:</p>
           <button className="rounded bg-primary px-4 py-2 text-primary-foreground">
             Primary Button
           </button>
         </div>
       </main>
     )
   }
   ```
2. Run `pnpm dev`
3. Visit `http://localhost:3000/tasks`
4. Confirm:
   - First button is **dark/neutral** (default)
   - Second button is **gold** (`.theme-gold`)
   - Third button is **blue** (`.theme-blue`)
5. **Remove the test code** — revert to placeholder

**Verify**: 
- All three theme variants display correct colors
- Test code is removed after verification

---

## Verification

Run these checks after implementation is complete:

| Check | Command | Expected Result |
|-------|---------|-----------------|
| TypeScript compiles | `pnpm exec tsc --noEmit` | Exit code 0, no errors |
| Build succeeds | `pnpm build` | Exit code 0 |
| Lint passes | `pnpm lint` | Exit code 0 (warnings OK) |

Manual checks:
- [ ] `components.json` exists with `style: "default"` and `tailwind.baseColor: "neutral"`
- [ ] `src/lib/utils.ts` exports `cn` function
- [ ] `src/app/globals.css` contains CSS variables in `:root` block
- [ ] `src/app/globals.css` contains `.theme-gold` and `.theme-blue` classes
- [ ] Theme classes correctly override colors when applied to containers
- [ ] No console errors when running `pnpm dev`

---

## Theme Customization Guide

The theming system uses CSS variable scoping. All customization happens in `src/app/globals.css`.

### How Scoped Themes Work

```tsx
{/* Default neutral theme */}
<div>
  <Button>Neutral</Button>
</div>

{/* Gold theme - apply to any container */}
<div className="theme-gold">
  <Button>Gold</Button>        {/* Uses gold --primary */}
  <TaskList />                 {/* All children inherit gold theme */}
</div>

{/* Blue theme */}
<div className="theme-blue">
  <Button>Blue</Button>        {/* Uses blue --primary */}
</div>
```

### Color Format

shadcn uses HSL values without the `hsl()` wrapper:
```css
--primary: 0 0% 9%;        /* HSL: hsl(0, 0%, 9%) = near black */
--primary: 43 74% 49%;     /* HSL: hsl(43, 74%, 49%) = gold */
```

### Customizing Theme Colors

To adjust the gold or blue themes, edit the classes in `globals.css`:

```css
.theme-gold {
  /* Adjust these values to tweak gold theme */
  --primary: 43 74% 49%;           /* Main gold */
  --primary-foreground: 0 0% 100%; /* Text on gold */
  --secondary: 43 60% 85%;         /* Light gold background */
  --secondary-foreground: 43 74% 25%;
  --accent: 43 50% 92%;            /* Very light gold */
  --ring: 43 74% 49%;              /* Focus ring */
}

.theme-blue {
  /* Adjust these values to tweak blue theme */
  --primary: 199 45% 48%;          /* Main blue */
  --primary-foreground: 0 0% 100%;
  --secondary: 199 35% 85%;        /* Light blue background */
  --secondary-foreground: 199 45% 25%;
  --accent: 199 30% 92%;           /* Very light blue */
  --ring: 199 45% 48%;
}
```

### Key Variables Reference

| Variable | Purpose | Used by |
|----------|---------|---------|
| `--primary` | Main action color | Buttons, links, active states |
| `--primary-foreground` | Text on primary | Button text |
| `--secondary` | Secondary backgrounds | Tags, badges, subtle buttons |
| `--accent` | Hover/highlight backgrounds | List item hover |
| `--ring` | Focus ring color | Focus states |
| `--muted` | Muted backgrounds | Disabled, inactive |
| `--border` | Border color | Cards, inputs |

### Global Adjustments

To change the base neutral theme (affects all contexts), edit `:root`:

```css
:root {
  --background: 0 0% 98%;      /* Page background */
  --card: 0 0% 100%;           /* Card backgrounds */
  --border: 0 0% 90%;          /* Border color */
  --radius: 0.5rem;            /* Border radius */
  /* ... */
}
```

### HSL to Hex Reference

| Color | HSL | Approx Hex |
|-------|-----|------------|
| Job Gold | `43 74% 49%` | `#C9A227` |
| Project Blue | `199 45% 48%` | `#4A90A4` |
| Light Gold | `43 60% 85%` | `#E8D9A8` |
| Light Blue | `199 35% 85%` | `#C4D9E2` |

---

## Notes for Implementer

### Why No Components Yet?

Components are installed individually as needed. This keeps the codebase lean and avoids unused code. When building UI, run:

```bash
pnpm dlx shadcn@latest add button
pnpm dlx shadcn@latest add dialog
# etc.
```

### Using Theme Classes in Components

When building scoped UI (like Tasklists), apply the theme class to the container:

```tsx
function Tasklist({ scope }: { scope: Scope }) {
  const themeClass = scope.type === 'job' ? 'theme-gold' : 'theme-blue'
  
  return (
    <div className={themeClass}>
      {/* All children use scoped theme colors */}
      <Button>Themed button</Button>
    </div>
  )
}
```

### Tailwind CSS v4 Compatibility

shadcn/ui's init script should detect Tailwind v4 and configure accordingly. If there are issues:
- Ensure `@import "tailwindcss";` is at the top of `globals.css`
- CSS variables should be in `@layer base { }` block
- The `@theme` block from our initial setup may need to be preserved or merged

### components.json Reference

Expected `components.json` content:
```json
{
  "$schema": "https://ui.shadcn.com/schema.json",
  "style": "default",
  "rsc": true,
  "tsx": true,
  "tailwind": {
    "config": "",
    "css": "src/app/globals.css",
    "baseColor": "neutral",
    "cssVariables": true,
    "prefix": ""
  },
  "aliases": {
    "components": "@/components",
    "utils": "@/lib/utils",
    "ui": "@/components/ui",
    "lib": "@/lib",
    "hooks": "@/hooks"
  },
  "iconLibrary": "lucide"
}
```


