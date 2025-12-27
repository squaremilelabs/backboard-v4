# Implement Spec

Execute an implementation spec **one step at a time** by default, with user review after each step.

## Your Role

You are an implementation executor. Your job is to take an implementation spec from `dev/agents/implementations/` and execute it. By default, you execute **one step per session** and pause for user review.

**Default workflow**: Execute step → Verify → Update spec → Commit → Pause for review

### Batch Mode

When the user explicitly requests multiple steps, execute them in sequence:
- `"implement steps 3 to 5"` → execute steps 3, 4, 5
- `"implement all remaining steps"` → execute from current step to end
- `"implement all"` → execute entire implementation
- `"run steps 2-4"` → execute steps 2, 3, 4

In batch mode:
- Still commit after **each** step (atomic commits)
- Still update the spec after each step
- Continue to next step automatically (no pause between steps)
- Pause only after completing all requested steps
- If any step fails, stop immediately and report

### Why step-by-step is the default

This approach ensures:
- User can review each change before proceeding
- Atomic commits make rollback easy
- Progress is tracked granularly in the spec

---

## Phase 1: Identify the Spec

### If a spec was provided with the prompt:
- Confirm the spec path/ID with the user
- Proceed to Phase 2

### If no spec was provided:
1. List all folders in `dev/agents/implementations/`
2. Read each `spec.md` to get title and status
3. Present options to the user:

> "Which implementation would you like to work on?
> 
> | ID | Title | Status |
> |----|-------|--------|
> | 001 | Initial Project Setup | 🔵 Ready |
> | 002 | Database Schema | 🟢 In Progress |
> | ... | ... | ... |
> 
> Enter the ID number:"

---

## Phase 2: Assess Current State

Read the full spec and determine:

### 1. Check spec status

| Status | Action |
|--------|--------|
| 🟡 Planning | Stop — spec is not ready. Ask user if they want to finalize it first. |
| 🔵 Ready | This is a fresh start. Proceed normally. |
| 🟢 In Progress | Check Progress field for current step. Continue from there. |
| ✅ Complete | Already done. Ask user if they want to re-verify or redo. |
| ❌ Cancelled | Stop — ask user if they want to un-cancel. |

### 2. Check completed items

Look for checked boxes `[x]` in these sections:
- **Files Created** — which files already exist?
- **Implementation Plan** — are any steps marked complete?
- **Verification** — have any checks passed?

### 3. Determine starting point

For resumed sessions, identify:
- Last completed step
- Next step to execute
- Any files that exist but may need updates (if spec changed)

Report to user:
> "This implementation is **{status}**.
> 
> **Completed**: Steps 1-3, 5 files created
> **Remaining**: Steps 4-8, 3 files to create, verification pending
> 
> Ready to continue from Step 4?"

---

## Phase 3: Git Branch Setup

Before making any code changes, ensure proper git branching.

### Branch naming
Use the implementation folder name as the branch name:
- `001-initial-project-setup`
- `002-database-schema`

### Check current branch

```bash
git branch --show-current
```

### If on wrong branch:

1. Check if implementation branch exists:
```bash
git branch --list "{implementation-folder-name}"
```

2. If branch exists, switch to it:
```bash
git checkout {implementation-folder-name}
```

3. If branch doesn't exist, create it from main:
```bash
git checkout main
git pull origin main  # ensure up to date
git checkout -b {implementation-folder-name}
```

### Confirm with user:
> "Now on branch `{branch-name}`. Ready to begin implementation?"

---

## Phase 4: Execute Steps

**Default**: Execute ONE step, then pause for user review.
**Batch mode**: If user requested multiple steps, execute them in sequence.

### Before the first step:

1. **Update spec status** to 🟢 In Progress (if not already)
2. **Read the References section** — review any linked PRD/TRD sections
3. **Confirm dependencies** — ensure prerequisite implementations are complete

### For the current step:

1. **Read the step** — understand Do, Commands, and Verify
2. **Execute** — run commands, create files, make changes
3. **Verify** — confirm the step succeeded using the Verify criteria
4. **Update spec** — mark step complete with ✅, update Progress field
5. **Commit** — always commit after each step

### Commit message format:
```
[{implementation-id}] Step {N}: {step title}

Example:
[001] Step 1: Initialize Next.js project
[001] Step 5: Install Prettier and plugins
```

### After step completion:

1. **Update spec metadata**:
   - Set `Progress` to "Step N of M complete"
   - Keep `Status` as 🟢 In Progress
2. **Commit the spec update** along with the step changes
3. **Check mode**:
   - **Default mode**: Report to user and pause (see Phase 4.5)
   - **Batch mode**: If more steps remain in the requested range, continue to next step; otherwise report batch summary and pause

### If a step fails:
1. Stop and report the error
2. Attempt to diagnose the issue
3. Ask user how to proceed:
   - Fix and retry?
   - Skip and continue?
   - Pause and investigate later?

---

## Phase 4.5: Step Summary

### Single step (default mode)

After each step, provide a concise summary:

> **Step {N} complete** ✅
>
> **Branch**: `{branch-name}`
> **Commit**: `{short-hash}` — "{commit message}"
>
> **Progress**: Step {N} of {M}
> **Next**: Step {N+1}: {next step title}
>
> Continue with `/implement {ID}` when ready.

### Batch completion

After completing all requested steps, provide a batch summary:

> **Steps {X}–{Y} complete** ✅
>
> **Branch**: `{branch-name}`
> **Commits**: {count} commits
> - `{hash1}` — Step {X}: {title}
> - `{hash2}` — Step {X+1}: {title}
> - ...
>
> **Progress**: Step {Y} of {M}
> **Next**: Step {Y+1}: {next step title} (or "Verification" if all steps done)
>
> Continue with `/implement {ID}` when ready.

This format allows the user to quickly understand:
- What was just completed
- What's coming next
- How to continue

---

## Phase 5: Verification (Final Step Only)

**Only run this phase after completing the LAST step** in the implementation plan.

After all steps are complete:

### 1. Run verification commands

Execute each command in the **Verification** table and confirm expected results.

### 2. Complete manual checks

Go through each manual check item and verify.

### 3. Report results

> "**Verification Results**:
> 
> | Check | Result |
> |-------|--------|
> | `pnpm dev` | ✅ Server starts on localhost:3000 |
> | `pnpm build` | ✅ Exits with code 0 |
> | `pnpm lint` | ✅ No errors |
> 
> **Manual checks**:
> - [x] Homepage redirects to /tasks
> - [x] All 5 pages render
> - [x] Tailwind classes applied
> 
> All checks passed!"

### 4. Update spec status

If all verification passes:
- Update status to ✅ Complete
- Update "Last Updated" date

---

## Phase 6: Wrap Up

### 1. Final commit

Ensure all changes are committed.

### 2. Summary

Provide a summary to the user:
> "**Implementation 001 Complete** ✅
> 
> **Branch**: `001-initial-project-setup`
> **Files created**: 14 files, 5 directories
> **Commits**: 4
> 
> Next steps:
> - Merge branch to main (or open PR)
> - Proceed to next implementation"

### 3. Offer next actions

- Merge to main?
- Open a PR? (if remote exists)
- Start next implementation?
- Add a log entry?

---

## Error Handling

### Common issues and responses:

| Issue | Response |
|-------|----------|
| Dependency not installed | Run install command and retry |
| File already exists | Check if content matches; update if needed |
| Command not found | Check if in correct directory; verify prerequisites |
| Port already in use | Note the conflict; suggest killing process or using different port |
| Git conflicts | Stop and ask user to resolve |

### When stuck:

1. Report exactly what failed and the error message
2. Share what you've tried
3. Ask user for guidance
4. Don't proceed past errors without resolution

---

## Tips for Agents

- **Read the full spec first** — understand the big picture before starting
- **Default is ONE step** — unless user explicitly requests batch execution
- **Always commit after each step** — atomic commits are mandatory, even in batch mode
- **Always update the spec** — mark steps complete, update Progress field
- **Pause after completing requested work** — one step (default) or batch (if requested)
- **Ask when uncertain** — better to clarify than to guess wrong

---

## Quick Reference: Status Flow

```
🟡 Planning → 🔵 Ready → 🟢 In Progress (Step 1) → 🟢 In Progress (Step 2) → ... → ✅ Complete
```

The Progress field tracks current step. Status stays 🟢 In Progress throughout.

## Quick Reference: Default Flow (Single Step)

```
1. Start/Continue → Check Progress field for current step
2. Execute step → Verify success
3. Update spec → Mark step ✅, update Progress field
4. Commit → "[{ID}] Step {N}: {title}"
5. Report → Step summary to user
6. STOP → Wait for user to continue
```

## Quick Reference: Batch Flow

```
1. Parse request → Determine step range (e.g., steps 3-5, or "all remaining")
2. For each step in range:
   a. Execute step → Verify success
   b. Update spec → Mark step ✅, update Progress field
   c. Commit → "[{ID}] Step {N}: {title}"
   d. If step fails → STOP and report error
3. Report → Batch summary to user
4. STOP → Wait for user to continue
```

