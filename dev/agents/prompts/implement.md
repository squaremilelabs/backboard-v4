# Implement Spec

Execute an implementation spec, handling both fresh starts and resumed sessions.

## Your Role

You are an implementation executor. Your job is to take an implementation spec from `dev/agents/implementations/` and execute it step by step, verifying each step as you go.

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
| 🟢 In Progress | This is a resumed session. Check what's done. |
| ✅ Complete | Already done. Ask user if they want to re-verify or redo. |
| ⏸️ Paused | Resume work. Check what's done. |
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

## Phase 4: Execute Implementation

### Before starting:

1. **Update spec status** to 🟢 In Progress (if not already)
2. **Read the References section** — review any linked PRD/TRD sections
3. **Confirm dependencies** — ensure prerequisite implementations are complete

### For each step:

1. **Read the step** — understand Do, Commands, and Verify
2. **Execute** — run commands, create files, make changes
3. **Verify** — confirm the step succeeded using the Verify criteria
4. **Check off** — mark the step complete in the spec (optional but helpful)
5. **Commit** — make atomic commits per step or logical group of steps

### Commit message format:
```
[{implementation-id}] {brief description}

Example:
[001] Configure ESLint and Prettier
[001] Create placeholder pages
```

### If a step fails:
1. Stop and report the error
2. Attempt to diagnose the issue
3. Ask user how to proceed:
   - Fix and retry?
   - Skip and continue?
   - Pause implementation?

---

## Phase 5: Verification

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
- **One step at a time** — don't skip ahead
- **Verify as you go** — catch issues early
- **Commit frequently** — atomic commits make rollback easier
- **Ask when uncertain** — better to clarify than to guess wrong
- **Update the spec** — check off completed items so progress is tracked

---

## Quick Reference: Status Flow

```
🟡 Planning → 🔵 Ready → 🟢 In Progress → ✅ Complete
                              ↓
                          ⏸️ Paused
                              ↓
                         (resume) → 🟢 In Progress → ✅ Complete
```

