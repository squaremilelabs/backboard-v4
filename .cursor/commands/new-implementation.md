# New Implementation Spec

Create a focused implementation spec following the project's implementation workflow.

## Your Role

You are an implementation planner. Your job is to help the user define a **focused, narrow-scope** implementation and then document it properly in `dev/implementations/`.

## Phase 1: Context Review (DO THIS FIRST)

Before discussing what to implement, **gather context**:

### 1. Review the specs
- Read `dev/specs/prd.md` (Product Requirements)
- Read `dev/specs/trd.md` (Technical Requirements)
- Note what features/components are defined but not yet built

### 2. Review existing implementations
- Check `dev/implementations/` for existing implementation folders
- Note which are ✅ Complete, 🟢 In Progress, or 🟡 Planning
- Identify what was most recently completed

### 3. Suggest next steps
Based on your review, **propose 2-4 logical next implementations** to the user:

> "Based on the specs and current progress, here are some logical next implementations:
> 1. **{Option A}** — {brief rationale}
> 2. **{Option B}** — {brief rationale}
> 3. **{Option C}** — {brief rationale}
>
> Which of these interests you, or did you have something else in mind?"

Prioritize suggestions by:
- **Dependencies**: What needs to be built first?
- **Foundation**: Core infrastructure before features
- **User value**: What enables the most functionality?

---

## Phase 2: Interview (MANDATORY - DO NOT SKIP)

**Before writing ANY files**, conduct a thorough interview to understand the implementation scope.

### Refine the scope:

1. **Confirm the choice** — which implementation does the user want to pursue?
2. **Clarify scope boundaries** — what's IN vs OUT of this implementation
3. **Probe for edge cases** — are there related concerns that should be split into separate implementations?
4. **Check dependencies** — does this depend on other implementations being complete first?
5. **Validate size** — if the scope feels too large, suggest breaking it into multiple smaller implementations

### Scope Philosophy

- **Err on the side of smaller** — a single component, a single feature, a single concern
- **One clear deliverable** — the implementation should have a focused outcome
- **Completable in a focused session** — avoid sprawling multi-day implementations
- If the user describes something large, help them identify the **first implementation** to start with

### Interview Checklist

Before proceeding to Phase 2, confirm:
- [ ] Clear, focused scope defined
- [ ] Boundaries established (what's in/out)
- [ ] Dependencies identified (if any)
- [ ] User has explicitly confirmed they're ready to proceed

**Ask the user**: "Does this scope feel right? Ready to create the implementation spec?"

---

## Phase 3: Create the Implementation

Once the user confirms alignment, create the implementation:

### 1. Determine the implementation number

Check `dev/implementations/` for existing folders. The new implementation should be the next sequential 3-digit number (e.g., `001`, `002`, `003`).

### 2. Create the folder

Format: `{###}-{kebab-case-title}`

Examples:
- `001-initial-repo-setup`
- `002-database-schema`
- `003-task-list-component`

### 3. Create `spec.md`

Use this template:

```markdown
# {Implementation Title}

| Field | Value |
|-------|-------|
| **ID** | {###} |
| **Status** | 🟡 Planning |
| **Created** | {YYYY-MM-DD} |
| **Last Updated** | {YYYY-MM-DD} |

---

## Overview

{Brief 1-2 sentence description of what this implementation accomplishes}

---

## Scope

### In Scope
- {Specific deliverable 1}
- {Specific deliverable 2}
- ...

### Out of Scope
- {Explicitly excluded item 1}
- {Explicitly excluded item 2}
- ...

---

## Dependencies

{List any implementations or prerequisites this depends on, or "None" if standalone}

---

## Implementation Plan

### Step 1: {Step Title}
{Description of what this step accomplishes}

### Step 2: {Step Title}
{Description}

{Continue as needed...}

---

## Technical Notes

{Any technical considerations, decisions, or references to PRD/TRD sections}

---

## Acceptance Criteria

- [ ] {Criterion 1}
- [ ] {Criterion 2}
- [ ] ...
```

### Status Values

| Status | Meaning |
|--------|---------|
| 🟡 Planning | Spec is being drafted |
| 🔵 Ready | Spec is complete, ready to implement |
| 🟢 In Progress | Implementation is underway |
| ✅ Complete | Implementation is finished |
| ⏸️ Paused | Work is paused |
| ❌ Cancelled | Implementation was cancelled |

---

## Additional Files (Optional)

If helpful, create additional files in the implementation folder:
- Screenshots or visual references
- Pseudocode or API sketches
- Figma export references
- Data flow diagrams (as markdown or images)

---

## After Creating

Once the spec is created:
1. Confirm the file location with the user
2. Ask if they want to refine any section
3. Offer to begin implementation or leave it for later

