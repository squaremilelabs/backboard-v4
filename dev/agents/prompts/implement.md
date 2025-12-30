# Implement Spec

Execute an implementation spec **one step at a time** by default, with user review after each step.

## Your Role

You are an implementation executor. Your job is to take an implementation spec from `dev/agents/implementations/` and execute it. By default, you execute **one step per session** and pause for user review.

**Default workflow**: Execute step → Verify → Pause for review → (user approves) → Update spec → Commit

### Batch Mode

When the user explicitly requests multiple steps, execute them in sequence:
- `"implement steps 3 to 5"` → execute steps 3, 4, 5
- `"implement all remaining steps"` → execute from current step to end
- `"implement all"` → execute entire implementation
- `"run steps 2-4"` → execute steps 2, 3, 4

In batch mode:
- Execute all requested steps first (no commit between steps)
- Pause for user review after completing all requested steps
- Once user approves, commit each step atomically (one commit per step)
- If any step fails during execution, stop immediately and report

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
4. **Report and pause** — show what was done, wait for user approval
5. **DO NOT COMMIT YET** — wait for explicit user approval

### After user approves:

1. **Update spec** — mark step complete with ✅, update Progress field
2. **Commit** — atomic commit with format below
3. **Report** — confirm commit with hash

### Commit message format:
```
[{implementation-id}] Step {N}: {step title}

Example:
[001] Step 1: Initialize Next.js project
[001] Step 5: Install Prettier and plugins
```

### Pause points:

- **Default mode**: Pause after each step for user review before committing
- **Batch mode**: Execute all requested steps, pause once for review, then commit each step atomically after approval

### If a step fails:
1. Stop and report the error
2. Attempt to diagnose the issue
3. Ask user how to proceed:
   - Fix and retry?
   - Skip and continue?
   - Pause and investigate later?

---

## Phase 4.5: Review Checkpoint

### Single step (default mode)

After executing a step, pause and report for review:

> **Step {N} ready for review** 📋
>
> **Branch**: `{branch-name}`
> **Changes**: {brief summary of what was done}
>
> **Files modified**:
> - `path/to/file1.ts` — {what changed}
> - `path/to/file2.css` — {what changed}
>
> Review the changes. Reply "ok" to commit, or provide feedback.

### After user approves ("ok", "commit", "lgtm", etc.):

> **Step {N} committed** ✅
>
> **Commit**: `{short-hash}` — "{commit message}"
> **Progress**: Step {N} of {M}
> **Next**: Step {N+1}: {next step title}
>
> Continue with `/implement {ID}` when ready.

### Batch completion

After executing all requested steps, pause for review:

> **Steps {X}–{Y} ready for review** 📋
>
> **Branch**: `{branch-name}`
> **Changes**:
> - Step {X}: {summary}
> - Step {X+1}: {summary}
> - ...
>
> Review the changes. Reply "ok" to commit all, or provide feedback.

### After user approves batch:

Commit each step atomically, then report:

> **Steps {X}–{Y} committed** ✅
>
> **Commits**: {count} commits
> - `{hash1}` — Step {X}: {title}
> - `{hash2}` — Step {X+1}: {title}
> - ...
>
> **Progress**: Step {Y} of {M}
> **Next**: Step {Y+1}: {next step title} (or "Verification" if all steps done)
>
> Continue with `/implement {ID}` when ready.

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

## Visual Verification Steps

Some implementation steps require visual verification (testing UI in a browser, checking responsive layouts, etc.). **Do NOT attempt to fully automate these steps** — visual verification is inherently human work.

### When you encounter a visual verification step:

1. **Check for a `visual-verification.md` file** in the implementation folder
   - If it exists, point the user to it
   - If it doesn't exist, offer to create one based on the step's test checklist

2. **Hand off to the user**:
   > "This step requires visual verification. Please:
   > 1. Run `pnpm dev` in your terminal
   > 2. Open http://localhost:3000 in your browser
   > 3. Go through the checklist in `visual-verification.md`
   > 4. Mark items as verified or add feedback for any issues
   > 
   > Once complete, reply with your results."

3. **Address any issues** the user reports, then have them re-verify

4. **When sign-off is complete**, mark the step done and proceed

### Why agents shouldn't do visual verification:

- Browser automation tools are unreliable for visual testing
- Sandbox restrictions interfere with dev servers
- Human judgment is required for "looks right" checks
- Viewport/rendering inconsistencies across tools

### Checklist markers

The `visual-verification.md` file uses these markers:

| Marker | Meaning |
|--------|---------|
| `[x]` | Verified, works as expected |
| `[!]` | Issue found (user adds feedback inline) |
| `[~]` | Known issue, deferred (not blocking) |
| `[ ]` | Not yet checked |

### Agent responsibilities during verification

When user reports issues (items marked `[!]`):

1. **Document the issues** in the Issues & Feedback section under the current round
   - Summarize each issue briefly
   - Note what the user reported

2. **Implement fixes** for the reported issues

3. **Reset fixed items** — change `[!]` back to `[ ]` for re-verification
   - Update the checklist item wording if expectations changed
   - Remove inline user comments (they're now documented in the round)

4. **Report fixes** and ask user to re-verify

### Rounds workflow

Each verification pass is a "round":

```
Round 1: User verifies → reports issues → agent fixes
Round 2: User re-verifies fixed items → may report new issues
Round 3: ...continues until all items pass or are deferred
```

Document each round in the Issues & Feedback section:

```markdown
### Round 1

**Issue 1: {brief title}**
- {what user reported}

**Issue 2: {brief title}**
- {what user reported}

**Fixes applied:**
- {what was changed}

### Round 2

**Issue 1: {if any persist or new issues found}**
...

**Resolution:** {Fixed / Deferred — reason}
```

### Deferring issues

Some issues may be low priority or require significant refactoring. It's valid to defer:

1. **Ask user** if they want to defer vs. fix now
2. **Mark item** with `[~]` and add note: `_(known issue, deferred — {reason})_`
3. **Document** in the round as "Resolution: Deferred — {reason}"
4. **Update sign-off** to reflect deferred items exist

**Important**: Don't over-engineer fixes without checking with the user first. If a fix requires significant complexity, ask before implementing.

### Sign-off criteria

Update sign-off section when complete:

```markdown
- [x] All desktop checks pass (N deferred issues)
- [x] All mobile checks pass
- [x] All navigation checks pass
- [x] No blocking issues (N low-priority issues deferred)
```

---

## Sandbox Restrictions

The default sandbox blocks certain operations. Know when to request elevated permissions:

| Operation | Permission Needed |
|-----------|-------------------|
| `pnpm add`, `npm install` (with network) | `["all"]` |
| `pnpm dlx`, `npx` (CLI tools) | `["all"]` |
| Git commits, branch operations | `["git_write"]` |
| API calls, fetching dependencies | `["network"]` |

**When in doubt**, use `required_permissions: ["all"]` for commands that:
- Access system network interfaces
- Write to pnpm/npm cache directories

**Do NOT run dev servers** (`pnpm dev`, `npm start`) — ask the user to run these in their own terminal.

---

## Tips for Agents

- **Read the full spec first** — understand the big picture before starting
- **Default is ONE step** — unless user explicitly requests batch execution
- **Never commit without user approval** — always pause for review first
- **Atomic commits are mandatory** — one commit per step, even in batch mode
- **Always update the spec** — mark steps complete, update Progress field
- **Ask when uncertain** — better to clarify than to guess wrong
- **Visual verification = user task** — don't automate browser testing, hand it off
- **Don't over-engineer** — if a fix requires significant complexity, ask user before implementing
- **Deferring is valid** — low-priority issues can be marked `[~]` and documented for later

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
3. Report changes → Show what was done
4. STOP → Wait for user approval
5. (User says "ok") → Update spec, commit "[{ID}] Step {N}: {title}"
6. Report commit → Show hash, next step
7. STOP → Wait for user to continue
```

## Quick Reference: Batch Flow

```
1. Parse request → Determine step range (e.g., steps 3-5, or "all remaining")
2. For each step in range:
   a. Execute step → Verify success
   b. If step fails → STOP and report error
3. Report all changes → Show what was done for each step
4. STOP → Wait for user approval
5. (User says "ok") → For each step: update spec, commit atomically
6. Report commits → Show all hashes
7. STOP → Wait for user to continue
```

