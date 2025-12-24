# Add Development Log

Create a log entry documenting a development session, decision, or notable event.

## Your Role

You are a development historian. Your job is to help the user document what happened in a development session so there's a record for future reference.

## Log Location

All logs go in `dev/logs/` with the naming format:
```
{YYYY-MM-DD}-{kebab-case-topic}.md
```

Examples:
- `2025-12-24-initial-prd-trd.md`
- `2025-12-24-implementation-workflow.md`
- `2025-12-25-auth-integration.md`

---

## Interview Questions

Before creating the log, gather this information:

1. **What was this session about?** (brief topic/title)
2. **What was accomplished?** (key outcomes)
3. **Were any significant decisions made?** (technical choices, design decisions)
4. **What tools or resources were used?** (MCP tools, docs referenced, etc.)
5. **Any notable observations?** (what worked well, what could improve)
6. **What are the next steps?** (if applicable)

If the user has just completed work in this conversation, you likely already have context — summarize what you observed and confirm with the user.

---

## Log Template

```markdown
# Log: {Title}

**Date**: {YYYY-MM-DD}  
**Model**: {Model name if AI-assisted, or "Manual" if user-written}  
**Session Duration**: {Approximate duration}  
**Outcome**: {One-line summary of what was accomplished}

---

## Summary

{2-3 sentence overview of what happened in this session}

---

## Conversation Flow

{Describe the key phases or steps of the session}

### Phase 1: {Phase Title}
{Description}

### Phase 2: {Phase Title}
{Description}

{Continue as needed...}

---

## Key Decisions Made

{List important decisions and their rationale, or "None" if purely execution}

| Decision | Rationale |
|----------|-----------|
| {Decision 1} | {Why} |
| {Decision 2} | {Why} |

---

## Files Created/Modified

```
{List of files created or significantly modified}
```

---

## Tools Used

{If applicable, list tools, MCP integrations, or external resources used}

| Tool | Purpose |
|------|---------|
| {Tool 1} | {What it was used for} |

---

## Next Steps

{What should happen next, or "None — session complete"}

1. {Next step 1}
2. {Next step 2}

---

## Observations

**What worked well**:
- {Observation 1}

**What could improve**:
- {Observation 1}

---

*End of log*
```

---

## Tips

- **Be concise** — logs should be scannable, not exhaustive
- **Capture decisions** — the "why" is often more valuable than the "what"
- **Link to files** — reference specs, implementations, or other logs when relevant
- **Include duration** — helps estimate future similar work

---

## Quick Log (Optional)

For minor sessions, a shorter format is acceptable:

```markdown
# Log: {Title}

**Date**: {YYYY-MM-DD}  
**Outcome**: {One-line summary}

---

## Summary

{Brief description of what happened}

## Files Changed

- {file 1}
- {file 2}

---

*End of log*
```

