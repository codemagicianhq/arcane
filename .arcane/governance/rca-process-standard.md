---
title: Root Cause Analysis (RCA) Process Standard
audience: both
last_updated: YYYY-MM-DD
status: active
distributable: true
tags: [governance, rca, process, incident, corrective-actions]
---

# Root Cause Analysis (RCA) Process Standard

When a significant decision is reversed, a naming collision is discovered, or a multi-file correction is needed, something went wrong upstream. This document defines the process for tracing root causes and preventing recurrence.

## Related ADRs

- [[DECISIONS#ADR-068|ADR-068: Establish RCA Process Standard]]

## When to Trigger an RCA

An RCA is **required** when any of these occur:

| Trigger | Example |
|---------|---------|
| **Decision reversed or superseded within 30 days** | ADR accepted, then rolled back because the premise was wrong |
| **Naming collision discovered** | Two entities share a name, causing ambiguity in docs or code |
| **Multi-file correction needed** | A change required updating >5 files to fix a single conceptual error |
| **Implicit decision detected** | A drift check or session applied a change that had no governing ADR |
| **Integration failure from doc mismatch** | A playbook or script failed because docs disagreed with reality |

An RCA is **recommended** (but optional) for:
- Repeated confusion in sessions about the same topic
- A TODO item that was deferred and caused downstream problems
- Any incident where the operator says "how did we end up here?"

## RCA Template

Every RCA follows this structure. Artifacts are stored in `governance/rcas/` with the filename `RCA-NNN-short-slug.md` (sequential numbering, matching the related ADR when applicable).

```markdown
---
title: "RCA-NNN: Short Description"
audience: both
last_updated: YYYY-MM-DD
status: active
tags: [rca, relevant-tags]
---

# RCA-NNN: Short Description

## Incident Summary

One paragraph: what went wrong, when it was discovered, and what the impact was.

## Timeline

Chronological sequence of decisions and events that led to the incident.
Include ADR numbers, journal dates, and session references.

| Date | Event | Reference |
|------|-------|-----------|
| YYYY-MM-DD | Description | [[DECISIONS#ADR-NNN\|ADR-NNN]] |

## Five Whys

1. **Why [symptom]?** — Because [proximate cause].
2. **Why [proximate cause]?** — Because [deeper cause].
3. **Why [deeper cause]?** — Because [process gap].
4. **Why [process gap]?** — Because [missing safeguard].
5. **Why [missing safeguard]?** — Because [root cause].

## Root Causes

| # | Root Cause | Type |
|---|-----------|------|
| RC-1 | Description | Decision gap / Process gap / Review gap / Communication gap |

## Corrective Actions

Actions taken to fix the immediate problem.

| # | Action | Status | Reference |
|---|--------|--------|-----------|
| CA-1 | Description | Done / Planned | Link to commit or doc |

## Preventive Actions

Process changes to prevent recurrence. These should modify governance docs, templates, or prompts.

| # | Action | Target Doc | Status |
|---|--------|-----------|--------|
| PA-1 | Description | [[path/to/doc]] | Done / Planned |

## Lessons Learned

Bullet points — what the team now knows that it didn't before.
```

## Process Steps

### 1. Initiate

When a trigger condition is met:
- Create the RCA artifact file in `governance/rcas/`
- Fill in the Incident Summary and Timeline sections
- Record the ADR that establishes the RCA (if applicable)

### 2. Analyze

- Walk the Five Whys from symptom to root cause
- Categorize each root cause by type:
  - **Decision gap** — a decision was needed but not made, or was made with incomplete scope
  - **Process gap** — the process allowed an action that should have been guarded
  - **Review gap** — a review step existed but missed the issue
  - **Communication gap** — information existed but wasn't discoverable or linked

### 3. Define Actions

- **Corrective actions** fix the immediate problem (e.g., rename the files, revert the change)
- **Preventive actions** change the process so the problem can't recur (e.g., add a checklist item, amend a template, update a prompt)
- Every preventive action must reference the specific governance doc, template, or prompt it modifies

### 4. Implement and Verify

- Implement preventive actions in the same branch as the RCA artifact (when possible)
- Verify: can the original root cause still produce the same problem? If yes, the preventive action is insufficient.

### 5. Close

- Set RCA status to `active` (RCAs remain active as reference — they are not "resolved" and deleted)
- Link the RCA from the related ADR using a "Deep dive" wiki-link
- Record a note in the session journal

## Severity Levels

RCAs do not have formal severity levels. The trigger conditions above determine whether an RCA is required or recommended. All RCAs follow the same template regardless of impact.

## Ownership

- In interactive sessions: the human operator and AI agent collaborate on the RCA
- For autonomous agent work: the agent flags the trigger condition and drafts the RCA for human review
- RCAs are never auto-committed — they require human approval (same rule as all interactive commits per [[governance/git-conventions|Git Conventions]])

## Artifact Location

```
governance/
  rcas/
    RCA-001-naming-collision.md
    RCA-002-...
```

**Why `governance/rcas/`?** RCAs are governance artifacts (process improvement), not journals (session logs) or decisions (ADRs). They complement ADRs by explaining *how a decision failed* rather than *what was decided*.

## Maintenance

- Review RCA preventive actions quarterly during `spell-check-drift` runs
- If a preventive action proves ineffective (same class of problem recurs), update the RCA with a "Recurrence" section and strengthen the preventive action
