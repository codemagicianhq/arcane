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

See [ARC-014](../../../DECISIONS.md#arc-014) for the decision that established this standard.

## The Spell Quality Rubric

Eight dimensions. Each is scored **Bronze (1) / Silver (2) / Gold (3)**. A spell's **overall score is
its weakest dimension** (same weakest-link rule as the PRD scorecard) — a Gold workflow with a Bronze
safety rail is a Bronze spell.

Two dimensions are **hard gates**: **D2 Distributability** and **D7 Safety** must be **≥ Silver** for a
spell to ship, regardless of overall target.

### D1 — Front-matter & invocation contract

| Tier | Bar |
| --- | --- |
| Bronze | Front-matter complete: `name`, `description`, `argument-hint`, `agent`. |
| Silver | + an accurate **Executive Summary** stating purpose, when to use it, and what it produces. |
| Gold | + explicitly disambiguates itself from sibling spells a user might confuse it with. |

### D2 — Distributability / no org-coupling **(HARD GATE ≥ Silver)**

| Tier | Bar |
| --- | --- |
| Bronze | No real organization, person, venture, or machine names. Org-specific values use `{UPPER_SNAKE}` placeholders. |
| Silver | + every placeholder has an inline resolution note: *"resolve from `.arcane.json` / frontmatter; ask if unset."* |
| Gold | + no hard assumption of a specific tracker, agent roster, or directory layout — the spell works in a vanilla consuming repo with no Arcane context files present. |

> A **Bronze on D2 is OSS-blocking** and must be fixed before release. See **Distributability conventions** below.

### D3 — Context-file robustness

| Tier | Bar |
| --- | --- |
| Bronze | Context files the spell reads are listed. |
| Silver | + each optional file has a fallback: *"if missing, proceed with X."* |
| Gold | + the spell degrades gracefully end-to-end when **no** context files exist. |

### D4 — Workflow completeness

| Tier | Bar |
| --- | --- |
| Bronze | The happy path is fully specified with clear, ordered steps. |
| Silver | + edge and failure cases handled: missing/invalid input, a required tool unavailable, an empty result. |
| Gold | + re-run safety (idempotency) and recovery from partial failure. |

### D5 — Output & acceptance spec

| Tier | Bar |
| --- | --- |
| Bronze | The output is named. |
| Silver | + the output's structure or a template is given. |
| Gold | + a user-verifiable **acceptance checklist** — how to know the spell did its job. |

### D6 — Cross-references

| Tier | Bar |
| --- | --- |
| Bronze | Related spells are mentioned. |
| Silver | + correct hand-off direction (consumes-from X, feeds-into Y). |
| Gold | + bidirectional and consistent with the flow in [[development-methodology]]. |

### D7 — Input validation & safety rails **(HARD GATE ≥ Silver)**

| Tier | Bar |
| --- | --- |
| Bronze | A `Rules` section exists. |
| Silver | + required arguments are validated or requested; the spell refuses to proceed on clearly invalid input. |
| Gold | + every destructive or outward-facing action (delete, force-push, publish, external post) is explicitly gated behind confirmation. |

### D8 — Conciseness & non-duplication

| Tier | Bar |
| --- | --- |
| Bronze | No dead or contradictory text. |
| Silver | + shared logic is **referenced**, not copy-pasted (e.g. point to a governance doc rather than inlining it). |
| Gold | + tight and single-responsibility — the spell does one job well. |

## Scoring & target

- **Overall = lowest dimension score.**
- **Hard gates:** D2 and D7 must each be **≥ Silver**.
- **Authoring target:** every shipped spell reaches **Silver overall, Gold on D2.** Gold-everywhere is
  aspirational, not required — chasing it on a mature spell usually adds bloat, not value. A short spell
  that meets every gate at Silver is **done**; do not pad it.

## Distributability conventions (D2)

Arcane spells ship to other repositories and, eventually, open source. Keep them portable:

- **Never hard-code** an org name, person, venture, product, or machine name. Use a documented
  `{UPPER_SNAKE}` placeholder: `{ADO_ORG}`, `{ADO_PROJECT}`, `{BUSINESS_NAME}`, `{OPERATOR_NAME}`.
- **Resolution rule:** a placeholder resolves from `.arcane.json` or the feature/PRD frontmatter; if it
  is unset, the spell **asks** rather than assuming a default.
- **Roster by reference, not by name:** when a spell needs the concept of an agent role, reference
  [[agent-policies]] / [[naming-conventions]] as context (with a fallback) instead of naming personas
  inline.
- **Trackers are optional:** never assume Azure DevOps (or any single provider). Respect
  `tracking_mode` (internal/external) and detect the provider; the shared rules live in
  [[development-methodology]] — point to them rather than re-inlining ADO logic.

> **Maintainer-internal exemption.** A few spells operate *on the Arcane framework itself*
> (e.g. `spell-bump`, `spell-arcane-version`) and legitimately reference repo internals like
> `registry.ts`, `src/assets/`, or the `arcane-cli` package name. Such
> **framework-self-referential** references do **not** count as a D2 violation. The exemption covers
> only the framework's own internals — never a consuming org's venture, person, machine, or tracker names.

## How to audit a spell

For each dimension, score Bronze/Silver/Gold with one line of evidence. Record the overall (weakest)
score and flag any D2/D7 below Silver as **must-fix**. When elevating, prefer **additive** changes
(add a fallback, an edge case, an acceptance line, a cross-reference); preserve the spell's intent and
working prose, and treat any change to *behavior* (not just coverage) as requiring explicit sign-off.
