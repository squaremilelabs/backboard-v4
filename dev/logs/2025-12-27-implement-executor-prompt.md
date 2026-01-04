# Log: Implementation Executor Prompt

**Date**: 2025-12-27  
**Model**: Claude Opus 4.5  
**Session Duration**: ~10 minutes  
**Outcome**: Created `implement.md` prompt to complete the spec → execution workflow

---

## Summary

Extended the implementation workflow with an executor prompt. Previously we had
`new-implementation.md` for creating specs — now we have `implement.md` for running them. This
completes the planning-to-execution loop for AI agents.

---

## Conversation Flow

### Phase 1: Prompt Design

Created `dev/agents/prompts/implement.md` with a six-phase workflow:

| Phase           | Purpose                                                              |
| --------------- | -------------------------------------------------------------------- |
| 1. Identify     | Ask which spec to implement, list available specs with status        |
| 2. Assess       | Check current status, find completed items, determine starting point |
| 3. Git Branch   | Create or switch to implementation branch                            |
| 4. Execute      | Run through steps, commit atomically, handle failures                |
| 5. Verification | Run verification commands, complete manual checks                    |
| 6. Wrap Up      | Update spec status, provide summary, offer next actions              |

### Phase 2: Key Features

- **Resumed session handling**: Checks `[x]` boxes to find where to continue
- **Status-aware**: Won't start 🟡 Planning specs, handles ⏸️ Paused, etc.
- **Git-first**: Branch naming matches implementation folder (e.g., `001-initial-project-setup`)
- **Commit format**: `[001] Description` for easy filtering
- **Error handling**: Explicit guidance on common issues and when to stop

### Phase 3: Log Updates

Updated `2025-12-26-agent-optimized-specs.md` to include the new prompt creation, then created this
log for the new day.

---

## Key Decisions Made

| Decision                | Rationale                                                        |
| ----------------------- | ---------------------------------------------------------------- |
| Six-phase workflow      | Covers full lifecycle from spec selection to completion          |
| Branch = folder name    | Simple, predictable, easy to correlate                           |
| Resume via checkboxes   | Leverages existing spec structure, no separate state file needed |
| Atomic commits per step | Enables easy rollback if issues arise                            |

---

## Files Created/Modified

```
dev/agents/prompts/implement.md                (created)
dev/logs/2025-12-26-agent-optimized-specs.md   (updated with Phase 4)
```

---

## Current Prompt Suite

The implementation workflow now has three prompts:

| Prompt                  | Purpose                          |
| ----------------------- | -------------------------------- |
| `new-implementation.md` | Create a new implementation spec |
| `implement.md`          | Execute an implementation spec   |
| `add-log.md`            | Document development sessions    |

---

## Next Steps

1. Run `/implement 001` to validate the full workflow
2. Refine prompts based on real execution results
3. Consider adding a `/pause-implementation` prompt for graceful session handoff

---

_End of log_
