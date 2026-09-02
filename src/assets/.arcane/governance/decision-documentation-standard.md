---
title: Decision Documentation Standard
audience: both
status: active
distributable: true
tags: [governance, decisions, documentation, standards]
---

# Decision Documentation Standard

This document defines how significant decisions are documented in this repository. It establishes the relationship between lean Architecture Decision Records (ADRs) and detailed companion documentation.

## Executive Summary

- ADRs remain lean for scanability; companion topic docs hold full rationale and trade-off depth.
- Every complex ADR should include a “Deep dive” link to a discoverable topic doc.
- Companion docs must link back to related ADRs to preserve bidirectional navigation in Obsidian.
- This standard exists to make “why X over Y?” answerable from one shareable file.

## Related ADRs

- [[DECISIONS#ADR-002|ADR-002: Documentation in Markdown + Git]]
- [[DECISIONS#ADR-011|ADR-011: Troubleshooting Standard]]

## Decision Prefixes

Arcane separates framework-level decisions from org-specific ones using two prefixes:

| Prefix    | File                  | Scope                                                                               |
| --------- | --------------------- | ----------------------------------------------------------------------------------- |
| `ADR-NNN` | `DECISIONS.md`        | Org-specific decisions (ventures, infrastructure, runtime config, org conventions)  |
| `ARC-NNN` | `arcane/DECISIONS.md` | Arcane framework decisions (spell library, CLI, agent system, governance templates) |

**Rules:**

- If the decision would apply to any organization using Arcane, it is `ARC-NNN`.
- If the decision is specific to how your organization operates, it is `ADR-NNN`.
- When uncertain, default to `ADR-NNN` in ops; promote to `ARC-NNN` later if the decision proves framework-generic. **Enforcement: explicitly advisory prose (ARC-023) — whether a decision is framework-generic enough for `ARC-NNN` (this rule and the two prefix-scoping rules above) is a judgment call; no script evaluates a decision's content to confirm the chosen prefix.**
- Never renumber existing entries in either sequence. **Enforcement: explicitly advisory prose (ARC-023) — `scripts/check-distributed-adr-references.ts` only verifies that a bare `ADR-NNN` citation resolves to a heading declared in `framework-decisions.md` (and separately flags certain `ARC-NNN`/`EF-NNN` link forms as cross-repo hazards); it never checks that numbers are sequential, unique, or never reused.**

## Problem Statement

**Scannability vs. Detail Tension:**

- ADRs must be scannable (quick review of decision history)
- Complex decisions need deep rationale, comparisons, implementation notes
- Embedding all detail in ADRs makes DECISIONS.md unreadable (bloat risk)
- Scattering rationale across journals, audit logs, and implementation docs makes it hard to answer "why did we choose X over Y?"

**Triggered by:** Question "why SSH vs PAT?" — answer existed in [security/audit-log.md](../security/audit-log.md) but not discoverable without knowing where to look. No ADR documented the Git authentication decision.

## Solution: Two-Tier Documentation

### Tier 1: Lean ADRs in DECISIONS.md

**Purpose:** Quick-reference decision log
**Audience:** Anyone scanning project history
**Content:**

- Date, Status, Verified (with wiki-link to verification session)
- Context (2-3 sentences: what problem, what constraints)
- Decision (1 sentence: what was chosen)
- Reasoning (3-5 bullets: core justification)
- Rejected alternatives (2-3 bullets: what was considered but not chosen)
- **Deep dive link** (if companion doc exists): `[[path/to/detail-doc|Display Text]]`

**Keep ADRs under 20 lines** (excluding frontmatter). Longer means detail should move to companion doc. **Enforcement: explicitly advisory prose (ARC-023) — no script measures ADR entry length in DECISIONS.md; the Quarterly Review checklist below asks a human to check for long ADRs manually.**

**Naming Impact Check:** If the decision introduces, changes, or retires a name (repo, project, product, agent, service), the ADR **must** include a "Naming impact" section that:

1. Lists all existing uses of the proposed name (grep the repo)
2. Confirms no collision with other entities
3. Identifies any docs, scripts, or prompts that reference the old name

This check was added after [[docs/rcas/RCA-001-naming-collision|RCA-001]] discovered that ADR-061 named a product without checking whether the ops repo already used that name. **Enforcement: explicitly advisory prose (ARC-023) — no script or spell gate verifies that an ADR introducing a new name actually contains a "Naming impact" section or performed its three checks; `spell-scry` can run the grep-and-collision check manually, but nothing requires it before such an ADR is written.**

### Tier 2: Companion Detail Docs

**Purpose:** Deep rationale, trade-offs, implementation notes, verification procedures
**Audience:** Someone implementing, troubleshooting, or justifying the decision to outsiders
**Content:**

- Full "why X over Y" comparison with specific technical/business justification
- Trade-offs analysis (what we lose, why we accept it)
- Implementation notes (edge cases, gotchas, configuration examples)
- Verification procedures (how to confirm decision still valid)
- Future review criteria (when to re-evaluate)
- Related ADRs section (bidirectional links for Obsidian graph visualization)

**Location:** Domain-specific folders (security/, infrastructure/, agents/, governance/)
**Naming:** Topic-based, not `ADR-NNN-title.md` — groups related decisions together

---

## Companion Doc Creation Guidelines

### When to Create a Companion Doc

**Create a companion doc if:**

- Decision justification exceeds 5 bullets in "Reasoning" section
- Multiple ADRs share a common theme (e.g., several authentication decisions belong in one authentication strategy)
- Implementation has significant gotchas or edge cases
- Decision has ongoing review/maintenance requirements (quarterly audits, version compatibility)
- You anticipate "why did we do this?" questions from future team members or external auditors

**Keep detail in ADR if:**

- Reasoning fits in 3-5 clear bullets
- Decision is simple with no complex trade-offs
- Implementation is straightforward (no special notes needed)
- Decision unlikely to be questioned or re-evaluated

### Where to Place Companion Docs

Use existing folder structure; **do not create `deep-dives/` or `DECISIONS-details/` folders**.

| Decision Theme                       | Location           | Example                                                                             |
| ------------------------------------ | ------------------ | ----------------------------------------------------------------------------------- |
| Authentication, credentials, keys    | `security/`        | [security/authentication-strategy.md](../security/authentication-strategy.md)       |
| Hardware, OS, dual-boot              | `infrastructure/`  | [infrastructure/compute-architecture.md](../infrastructure/compute-architecture.md) |
| Agent runtime config, agent policies | `agents/`          | [agents/architecture-decisions.md](../agents/architecture-decisions.md)             |
| Git, naming, documentation standards | `governance/`      | This file                                                                           |
| Business-specific operations         | `ventures/{name}/` | `ventures/acme-store/DECISIONS.md`, `ventures/example-app/operations-model.md`      |

**Rationale:** Keeps security knowledge with security docs, infrastructure with infrastructure, etc. Easier to discover via folder browsing.

### Naming Conventions

**Use topic-based names:**

- ✅ `security/authentication-strategy.md` — covers SSH, PATs, API keys, tokens (multiple ADRs)
- ✅ `infrastructure/compute-architecture.md` — covers dual-boot, Ubuntu choice, hardware sizing
- ❌ `security/ADR-NNN-deep-dive.md` — Forces 1:1 mapping, harder to group related decisions

**Filename format:** `{topic-slug}.md` (lowercase, hyphen-separated)

### Content Template

```markdown
---
title: [Topic Title]
audience: both
last_updated: YYYY-MM-DD
status: active
tags: [relevant, tags]
---

# [Topic Title]

Brief description of what decisions this doc covers.

## Related ADRs

- [[DECISIONS#ADR-NNN|ADR-NNN: Short Title]]
- [[DECISIONS#ADR-MMM|ADR-MMM: Another Title]]

## Principles

High-level guiding principles for this decision domain (3-5 bullets).

## Decision Deep Dives

### [Decision Name]

**Context:** What problem, constraints, options available

**Decision:** What was chosen (1 sentence)

**Rationale:**

1. **First Major Point** — with technical/business justification
2. **Second Major Point** — with specific examples
3. **Third Major Point** — with comparisons to alternatives

**Trade-offs:**

- **Downside:** What we lose by choosing this
- **Mitigation:** How we address the downside
- **Chosen:** Why we accept the trade-off

**Rejected Alternatives:**

- **Alternative 1:** Why it was considered but rejected
- **Alternative 2:** Specific reason it didn't fit

**Verification:** How decision was confirmed working (link to audit log or journal entry)

---

### [Next Decision]

...

## Future Considerations

Conditions under which this decision should be re-evaluated.

## References

- [[path/to/related-doc|Related Doc]]
- [[journal/YYYY-MM-DD-session-slug|Session Where Decided]]
```

---

## Linking Pattern

### ADRs Link Forward to Companion Docs

Add this section **after Reasoning, before Rejected alternatives** in the ADR:

```markdown
**Deep dive:** [[security/authentication-strategy|Authentication Strategy]]
```

**Example from an authentication ADR:**

```markdown
**Reasoning:**

- PATs are bearer tokens; SSH uses challenge/response
- Reduces secret exposure in commands and environment variables
- Consistent with GitHub/GitLab industry practice

**Deep dive:** [[security/authentication-strategy#azure-devops-git-operations|Authentication Strategy — Azure DevOps]]

**Rejected alternatives:**

- PATs — bearer token replay risk
  ...
```

### Companion Docs Link Back to ADRs

Create "Related ADRs" section at the top of every companion doc:

```markdown
## Related ADRs

- [[DECISIONS#ADR-NNN|Runtime Gateway Security decision]]
- [[DECISIONS#ADR-NNN|Inter-Machine Communication decision]]
- [[DECISIONS#ADR-NNN|Git SSH Authentication decision]]
```

**Rationale:** Creates bidirectional graph edges in Obsidian visualization. Clicking an ADR shows its authentication strategy companion; the companion links back to each related ADR. **Enforcement: explicitly advisory prose (ARC-023) — no script verifies that a companion doc's "Related ADRs" section reciprocates an ADR's "Deep dive" link, or that every companion doc has one at all; the Anti-Patterns section below lists forgetting this link as a known failure mode with no automated catch.**

---

## Index-Free Discovery

**No DECISIONS-INDEX.md required. Enforcement: explicitly advisory prose (ARC-023) — nothing prevents creating one, and no script verifies that the four discovery methods below actually surface a given decision.** Discovery happens via:

1. **Obsidian Graph View:** Visual clusters show related docs
2. **Wiki-link navigation:** Click ADR "Deep dive" link → companion doc → "Related ADRs" → back to other ADRs
3. **Folder browsing:** Security decisions in security/, infrastructure in infrastructure/
4. **Grep search:** `grep -r "authentication" **/*.md` finds all mentions

**If you need an answer:**

1. Check DECISIONS.md for high-level ADR
2. Follow "Deep dive" link if present
3. Browse domain folder (security/, infrastructure/, etc.) if no link
4. Search journals for session where decision was made

---

## Maintenance Rules

### When Editing

**If you edit an ADR:**

- Update `last_updated` in DECISIONS.md frontmatter
- If adding new reasoning that makes ADR >20 lines, **move detail to companion doc** instead
- Add "Deep dive" link if creating new companion doc

**If you edit a companion doc:**

- Update `last_updated` in companion doc frontmatter
- Check if related ADRs need "Deep dive" link updates (if linking pattern changed)
- **Do not** edit DECISIONS.md unless decision itself changed

**If you create a new ADR:**

- Decide: does this need a companion doc, or does an existing companion doc cover it?
- If new companion doc needed, create it first, then add "Deep dive" link in ADR
- If existing companion doc covers it, add new section to that doc + update "Related ADRs" list

**Enforcement: explicitly advisory prose (ARC-023) — none of the editorial steps above (bumping `last_updated`, extracting detail past 20 lines, adding or updating "Deep dive"/"Related ADRs" links) is checked by any script; each depends on the editor remembering to do it.**

### Quarterly Review

Every 3 months:

- [ ] Check for orphaned companion docs (docs with no ADR links pointing to them)
- [ ] Check for long ADRs (>20 lines) that should have detail extracted
- [ ] Verify Obsidian graph shows connected clusters (no isolated decision nodes)
- [ ] Review "Future Considerations" sections in companion docs — any re-evaluation triggers?

**Enforcement: explicitly advisory prose (ARC-023) — this is a manual checklist; no script detects orphaned companion docs, measures ADR length, verifies Obsidian graph connectivity, or reminds anyone to revisit "Future Considerations" sections.**

---

## Anti-Patterns (Don't Do This)

❌ **Creating `ADR-NNN-deep-dive.md` files** — Forces 1:1 mapping, prevents grouping related decisions

❌ **Duplicating content between ADR and companion doc** — ADR should summarize (3-5 bullets), companion has full detail. No copy/paste.

❌ **Putting implementation steps in companion docs** — Implementation belongs in playbooks/ or installation.md. Companion docs explain **why**, not **how** (unless "how" is a decision point).

❌ **Creating companion docs for simple decisions** — If reasoning fits in 3-5 bullets, keep it in ADR.

❌ **Forgetting bidirectional links** — Always add "Related ADRs" section in companion doc + "Deep dive" link in ADR.

❌ **Putting rationale in journals instead of companion docs** — Journals are chronological session logs (narrative). Companion docs are topic-indexed reference (structured). Rationale goes in companion docs, linked from journals.

**Enforcement: explicitly advisory prose (ARC-023) — no lint or script detects any of the six anti-patterns above (a stray `ADR-NNN-deep-dive.md` file, duplicated content, implementation steps in a companion doc, a companion doc for a simple decision, a missing bidirectional link, or rationale left in a journal); catching them depends on the writer's or a reviewer's judgment.**

---

## Evolution of This Standard

**This is ADR governance for ADRs** (meta!). Changes to this standard should be treated as significant decisions:

1. Propose change (add to TODO.md with context)
2. Discuss in journal session
3. Update this file
4. Add entry to DECISIONS.md if decision-making process itself changes
5. Announce in relevant channels (if the team expands beyond a single operator)

**Enforcement: explicitly advisory prose (ARC-023) — no script or spell gate enforces this five-step process when this standard itself changes; it depends on the editor following it by discipline.**

**Versioning note:** Per-business decisions follow this pattern — business-only decisions live in `ventures/{name}/DECISIONS.md` (unnumbered or business-prefixed); system/cross-business decisions stay in the root `DECISIONS.md`.

---

## References

- [[DECISIONS|Architecture Decision Records]] — The ADR list itself
- [[README|README]] — How to use graph view for discovery
- Documentation conventions — frontmatter, wiki-links, tagging
