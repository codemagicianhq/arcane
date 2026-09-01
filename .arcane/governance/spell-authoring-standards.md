---
title: Spell Authoring Standards
audience: contributor
last_updated: YYYY-MM-DD
status: active
tags: [spell, authoring, quality, governance, ARC-014]
---

# Spell Authoring Standards

## Purpose

Define what a **high-quality Arcane spell** looks like, so spell prompts can be authored and audited
against a consistent bar. This is the spell-prompt analogue of [[product-excellence-standards]] (which
grades PRDs, not prompts). It is an **authoring-time standard** — a checklist for contributors writing
or reviewing spells. It is **not** meant to be read at runtime by the spells it grades.

See [ARC-014](https://github.com/codemagicianhq/arcane/blob/main/DECISIONS.md#arc-014--spell-authoring-standards-a-quality-rubric-for-spell-prompts)
for the decision that established this standard. **Full canonical URL, not a same-repo
wiki-link** (corrected 2026-08-31, BC-06) — this file ships to consumer repos, and
`DECISIONS.md` does not: `src/assets/DECISIONS.md` (what consumers actually receive via
`spell init`) is an empty starter template for the *consumer's own* decisions, so a
same-repo wiki-link to a specific ARC id would resolve to the wrong document once
installed, not simply fail to resolve. **Enforcement: explicitly advisory prose (ARC-023)
— depends on editorial judgment; no mechanical check verifies citation style in this file.**

## The Spell Quality Rubric

Eight dimensions. Each is scored **Bronze (1) / Silver (2) / Gold (3)**. A spell's **overall score is
its weakest dimension** (same weakest-link rule as the PRD scorecard) — a Gold workflow with a Bronze
safety rail is a Bronze spell. **Enforcement: explicitly advisory prose (ARC-023) — self-graded during
spell audit; no coded scorer computes or verifies this aggregation.**

Two dimensions are **hard gates**: **D2 Distributability** and **D7 Safety** must be **≥ Silver** for a
spell to ship, regardless of overall target. **Enforcement: explicitly advisory prose (ARC-023) — self-graded
during spell audit; only D2's Bronze floor (literal org-name detection) is mechanically checked today, so
this broader ≥ Silver gate is not fully verified by any coded scorer or workflow gate.**

### D1 — Front-matter & invocation contract

| Tier | Bar |
| --- | --- |
| Bronze | Front-matter complete: `name`, `description`, `argument-hint`, `agent`. Enforcement: explicitly advisory prose (ARC-023) — self-graded during spell audit; a CI check (`npm run check:spell-catalog`, running `scripts/spell-catalog.ts`) incidentally validates only the `name`/`description` fields as a side effect of catalog generation, not the full front-matter set this bar requires. |
| Silver | + an accurate **Executive Summary** stating purpose, when to use it, and what it produces. |
| Gold | + explicitly disambiguates itself from sibling spells a user might confuse it with. |

### D2 — Distributability / no org-coupling **(HARD GATE ≥ Silver)**

| Tier | Bar |
| --- | --- |
| Bronze | No real organization, person, venture, or machine names. Org-specific values use `{UPPER_SNAKE}` placeholders. Enforcement: executable check (ARC-023) — `scripts/org-token-lint.ts` scans `.github/prompts/*.prompt.md` against the `ARCANE_ORG_TOKENS` denylist and runs automatically as part of `npm run build`, failing the build on a match; `spell ward --gate` (`src/commands/ward.ts`) runs the same denylist-scanning engine standalone but is not currently wired into CI as its own gate. |
| Silver | + every placeholder has an inline resolution note: *"resolve from `.arcane.json` / frontmatter; ask if unset."* Enforcement: explicitly advisory prose (ARC-023) — part of the D2 hard gate by name, but this specific bar is self-graded; no check verifies a placeholder carries an inline resolution note. |
| Gold | + no hard assumption of a specific tracker, agent roster, or directory layout — the spell works in a vanilla consuming repo with no Arcane context files present. |

> A **Bronze on D2 is OSS-blocking** and must be fixed before release. **Enforcement: executable check (ARC-023) — same mechanism as the D2 Bronze bar above: the `org-token-lint` build gate fails `npm run build` automatically; `spell ward --gate` provides the same scan standalone but is not yet wired into CI.** See **Distributability conventions** below.

### D3 — Context-file robustness

| Tier | Bar |
| --- | --- |
| Bronze | Context files the spell reads are listed. Enforcement: explicitly advisory prose (ARC-023) — self-graded during spell audit; no coded scorer verifies this dimension. |
| Silver | + each optional file has a fallback: *"if missing, proceed with X."* |
| Gold | + the spell degrades gracefully end-to-end when **no** context files exist. |

### D4 — Workflow completeness

| Tier | Bar |
| --- | --- |
| Bronze | The happy path is fully specified with clear, ordered steps. Enforcement: explicitly advisory prose (ARC-023) — self-graded during spell audit; no coded scorer verifies this dimension. |
| Silver | + edge and failure cases handled: missing/invalid input, a required tool unavailable, an empty result. |
| Gold | + re-run safety (idempotency) and recovery from partial failure. |

### D5 — Output & acceptance spec

| Tier | Bar |
| --- | --- |
| Bronze | The output is named. Enforcement: explicitly advisory prose (ARC-023) — self-graded during spell audit; no coded scorer verifies this dimension. |
| Silver | + the output's structure or a template is given. |
| Gold | + a user-verifiable **acceptance checklist** — how to know the spell did its job. |

### D6 — Cross-references

| Tier | Bar |
| --- | --- |
| Bronze | Related spells are mentioned. Enforcement: explicitly advisory prose (ARC-023) — self-graded during spell audit; no coded scorer verifies this dimension. |
| Silver | + correct hand-off direction (consumes-from X, feeds-into Y). |
| Gold | + bidirectional and consistent with the flow in [[development-methodology]]. |

### D7 — Input validation & safety rails **(HARD GATE ≥ Silver)**

| Tier | Bar |
| --- | --- |
| Bronze | A `Rules` section exists. Enforcement: explicitly advisory prose (ARC-023) — part of the D7 hard gate by name, but this specific bar is self-graded; no check verifies a spell prompt contains a `Rules` section. |
| Silver | + required arguments are validated or requested; the spell refuses to proceed on clearly invalid input. Enforcement: explicitly advisory prose (ARC-023) — part of the D7 hard gate by name, but this specific bar is self-graded; no check verifies input-validation behavior across spell prompts. |
| Gold | + every destructive or outward-facing action (delete, force-push, publish, external post) is explicitly gated behind confirmation. |

### D8 — Conciseness & non-duplication

| Tier | Bar |
| --- | --- |
| Bronze | No dead or contradictory text. Enforcement: explicitly advisory prose (ARC-023) — self-graded during spell audit; no coded scorer verifies this dimension. |
| Silver | + shared logic is **referenced**, not copy-pasted (e.g. point to a governance doc rather than inlining it). |
| Gold | + tight and single-responsibility — the spell does one job well. |

## Scoring & target

- **Overall = lowest dimension score.** Enforcement: explicitly advisory prose (ARC-023) — self-graded
  during spell audit; no coded scorer computes or verifies this aggregation.
- **Hard gates:** D2 and D7 must each be **≥ Silver**. Enforcement: explicitly advisory prose (ARC-023) —
  self-graded during spell audit; only D2's Bronze floor is mechanically checked today, so this broader
  gate is not fully verified by any coded scorer or workflow gate.
- **Authoring target:** every shipped spell reaches **Silver overall, Gold on D2.** Gold-everywhere is
  aspirational, not required — chasing it on a mature spell usually adds bloat, not value. A short spell
  that meets every gate at Silver is **done**; do not pad it. Enforcement: explicitly advisory prose
  (ARC-023) — self-graded during spell audit; no coded scorer verifies overall attainment.

## Distributability conventions (D2)

Arcane spells ship to other repositories and, eventually, open source. Keep them portable:

- **Never hard-code** an org name, person, venture, product, or machine name. Use a documented
  `{UPPER_SNAKE}` placeholder: `{ADO_ORG}`, `{ADO_PROJECT}`, `{BUSINESS_NAME}`, `{OPERATOR_NAME}`.
  Enforcement: executable check (ARC-023) — same mechanism as D2 Bronze above: the `org-token-lint`
  build gate (`scripts/org-token-lint.ts`) fails `npm run build` automatically; `spell ward --gate`
  (`src/commands/ward.ts`) runs the same scan standalone but is not yet wired into CI.
- **Resolution rule:** a placeholder resolves from `.arcane.json` or the feature/PRD frontmatter; if it
  is unset, the spell **asks** rather than assuming a default. Enforcement: explicitly advisory prose
  (ARC-023) — depends on each spell's own runtime judgment; no check exercises a spell's unset-placeholder
  behavior.
- **Roster by reference, not by name:** when a spell needs the concept of an agent role, reference
  [[agent-policies]] / [[naming-conventions]] as context (with a fallback) instead of naming personas
  inline. Enforcement: explicitly advisory prose (ARC-023) — self-graded during spell audit; no coded
  scorer verifies this convention.
- **Trackers are optional:** never assume Azure DevOps (or any single provider). Respect
  `tracking_mode` (internal/external) and detect the provider; the shared rules live in
  [[development-methodology]] — point to them rather than re-inlining ADO logic. Enforcement: explicitly
  advisory prose (ARC-023) — self-graded during spell audit; no lint scans spell prompts for a
  hard-coded tracker assumption.

> **Maintainer-internal exemption.** A few spells operate *on the Arcane framework itself*
> (e.g. `spell-bump`, `spell-arcane-version`) and legitimately reference repo internals like
> `registry.ts`, `src/assets/`, or the `arcane-cli` package name. Such
> **framework-self-referential** references do **not** count as a D2 violation. The exemption covers
> only the framework's own internals — never a consuming org's venture, person, machine, or tracker names.
> **Enforcement: explicitly advisory prose (ARC-023) — depends on an auditor's judgment about what
> counts as framework-self-reference; `org-token-lint`'s denylist is derived only from package
> author/repository identity plus the operator-supplied `ARCANE_ORG_TOKENS` list, so these terms were
> never candidates for that scan regardless of this clause, and no check specifically verifies the
> carve-out itself.**

## How to audit a spell

For each dimension, score Bronze/Silver/Gold with one line of evidence. Record the overall (weakest)
score and flag any D2/D7 below Silver as **must-fix**. When elevating, prefer **additive** changes
(add a fallback, an edge case, an acceptance line, a cross-reference); preserve the spell's intent and
working prose, and treat any change to *behavior* (not just coverage) as requiring explicit sign-off.
**Enforcement: explicitly advisory prose (ARC-023) — this audit process, including the must-fix flag
and the sign-off convention, is self-graded during spell-enchant's review; no coded scorer or
workflow gate verifies it.**
