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

**Enforcement: explicitly advisory prose (ARC-023) — no script or drift check detects decision reversals, naming collisions, multi-file corrections, or the other trigger conditions above, or confirms an RCA was opened when one applies; recognizing a trigger and initiating an RCA depends on human or agent judgment.**

An RCA is **recommended** (but optional) for:
- Repeated confusion in sessions about the same topic
- A TODO item that was deferred and caused downstream problems
- Any incident where the operator says "how did we end up here?"

**Enforcement: explicitly advisory prose (ARC-023) — these are softer signals than the required triggers above; no script detects them, and opening an RCA here is left to human or agent judgment.**

## RCA Template

**Every RCA follows this structure. Artifacts are stored in `docs/rcas/` with the filename `RCA-NNN-short-slug.md` (sequential numbering, matching the related ADR when applicable). Enforcement: explicitly advisory prose (ARC-023) — no script validates RCA filenames, sequential numbering, or template structure.**

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
- Create the RCA artifact file in `docs/rcas/`
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
- **Every preventive action must reference the specific governance doc, template, or prompt it modifies. Enforcement: explicitly advisory prose (ARC-023) — no script verifies that a preventive action's Target Doc cites a real, specific governance path.**

### 4. Implement and Verify

- Implement preventive actions in the same branch as the RCA artifact (when possible)
- Verify: can the original root cause still produce the same problem? If yes, the preventive action is insufficient.

### 5. Close

- **Set RCA status to `active` (RCAs remain active as reference — they are not "resolved" and deleted). Enforcement: explicitly advisory prose (ARC-023) — no script checks RCA status fields or blocks deleting an RCA file.**
- **Link the RCA from the related ADR using a "Deep dive" wiki-link. Enforcement: explicitly advisory prose (ARC-023) — `check-distributed-adr-references.ts` validates ADR-ID references and cross-repo link hazards but does not check for a "Deep dive" backlink from the ADR.**
- Record a note in the session journal

## Severity Levels

RCAs do not have formal severity levels. The trigger conditions above determine whether an RCA is required or recommended. All RCAs follow the same template regardless of impact.

## Ownership

- In interactive sessions: the human operator and AI agent collaborate on the RCA
- For autonomous agent work: the agent flags the trigger condition and drafts the RCA for human review
- **RCAs are never auto-committed — they require human approval (same rule as all interactive commits per [[governance/git-conventions|Git Conventions]]). Enforcement: structured spell gate (ARC-023) — this restates universal-agent-rules.md rule 10 ("Never auto-commit during interactive sessions"), enforced by `spell-commit-work`'s Step 8, which computes an approval fingerprint over the staged diff and message and halts until an authenticated operator response is tied to it before `git commit` runs.**

## Artifact Location

```
docs/
  rcas/
    RCA-001-naming-collision.md
    RCA-002-...
```

**Why `docs/rcas/`, not `governance/rcas/`?** RCAs are project/domain documents (a record of what happened in *this* repository), not a framework-managed standard — [[portable-bootstrap#where-documents-live|portable-bootstrap.md's "Where Documents Live"]] reserves `.arcane/governance/` for framework-managed standards and explicitly forbids a duplicate root `governance/` tree; `docs/` is the same explicit-descriptive-path convention it names for project/domain documents. RCAs remain governance artifacts in *purpose* (process improvement, not a journal or a decision) — they complement ADRs by explaining *how a decision failed* rather than *what was decided* — just not in *filesystem location*. Enforcement: explicitly advisory prose (ARC-023) — no script checks that an RCA file actually lives under `docs/rcas/` rather than elsewhere.

## Maintenance

- **Review RCA preventive actions quarterly during `spell-check-drift` runs. Enforcement: explicitly advisory prose (ARC-023) — `spell-check-drift` has no RCA-specific detector; this cross-reference depends on the operator or agent remembering to do the review by hand.**
- **If a preventive action proves ineffective (same class of problem recurs), update the RCA with a "Recurrence" section and strengthen the preventive action. Enforcement: explicitly advisory prose (ARC-023) — no script detects recurrence of the same class of problem; recognizing it depends on human or agent judgment.**
