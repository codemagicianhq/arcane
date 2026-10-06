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
| Bronze | No real organization, person, venture, or machine names. Org-specific values use `{UPPER_SNAKE}` placeholders. Enforcement: executable check (ARC-023) — `scripts/org-token-lint.ts` scans `.arcane/spells/*.md` (and every generated client shim) against the `ARCANE_ORG_TOKENS` denylist and runs automatically as part of `npm run build`, failing the build on a match; `spell ward --gate` (`src/commands/ward.ts`) runs the same denylist-scanning engine standalone but is not currently wired into CI as its own gate. |
| Silver | + every placeholder has an inline resolution note: *"resolve from `.arcane.json` / frontmatter; ask if unset."* Enforcement: explicitly advisory prose (ARC-023) — part of the D2 hard gate by name, but this specific bar is self-graded; no check verifies a placeholder carries an inline resolution note. |
| Gold | + no hard assumption of a specific tracker, CI/CD platform, cloud/deployment vendor, agent roster, or directory layout — the spell works in a vanilla consuming repo with no Arcane context files present. |

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

- **Author in one place (ARC-045):** a spell's body lives only in `.arcane/spells/<id>.md`. The
  Copilot prompt (`.github/prompts/<id>.prompt.md`), the Claude Code command
  (`.claude/commands/<id>.md`) and the Codex skill (`.agents/skills/<id>/SKILL.md`) are generated
  from it by `npm run fix:self-host-parity` and carry no prose of their own — never edit one by
  hand. Relative links inside a spell resolve from `.arcane/spells/`, two levels below the repo
  root (`../../.arcane/governance/…`, `../../README.md`); refer to a sibling spell as
  `spell-x.md`. Enforcement: executable check (ARC-023) — `npm run check:self-host-parity`
  re-renders every shim from its canonical file and fails CI on any byte of difference. **A spell
  may also be installed once per machine** at `~/.arcane/spells/<id>.md` (ARC-045 decision 3), where
  a `../../` link has no repository to resolve against: write a spell so that a broken context link
  degrades to a named, skippable step rather than a dead end, which D2 Gold already asks for in its
  "works in a vanilla consuming repo with no Arcane context files present" bar. Enforcement:
  explicitly advisory prose (ARC-023) — nothing resolves a spell's links from the user tier.
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
- **CI/CD and deployment vendors are optional too (ARC-038 decision 3):** the same D2 bar that
  forbids assuming a single tracker applies to any other platform a spell might otherwise hard-code
  — a CI/CD system, a cloud provider, a deployment target. When a governance doc's actual content
  turns out to be vendor-specific throughout (found, not assumed: [[cicd-standards]] was
  Azure-DevOps-specific end to end until ARC-038), the remediation is the same shape decision 2
  demonstrates concretely there — split into a vendor-neutral core (principles) plus a
  provider-specific profile (that vendor's mechanics), the same shape
  [[development-methodology]] already uses for tracking providers. No separate "vendor-specific
  standards directory" — the pattern is the split itself, applied to whichever governance doc or
  spell risks the same coupling next. Enforcement: explicitly advisory prose (ARC-023) — self-graded
  during spell audit; no lint scans a spell prompt or governance doc for a hard-coded CI/CD or
  deployment vendor assumption.

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

### Runtime placeholders (ARC-051)

A `{UPPER_SNAKE}` token in a shipped governance document is one of two kinds
([ARC-051](https://github.com/codemagicianhq/arcane/blob/main/DECISIONS.md#arc-051--placeholder-taxonomy-for-governance-documents)):

- **Runtime-resolved:** an agent resolves it when it uses the document, from the source named in the
  list below; if that source is unset, it asks (the resolution rule above). These tokens are legal in a
  `status: active` document, and the list below is the only place they are enumerated.
- **Fill-in:** a slot the operator replaces by hand. A document built around such slots carries
  `status: template` (for example `agent-approved-paths.md` and `naming-conventions.md`), and the
  placeholder check skips it.

A token that is neither is **unknown**: a typo, or a slot nobody filled. To make a new token legal,
add it to the list in the same form: one item per token, a code span holding the token first, then
where it resolves from. The list is read by machine, so keep it between the two markers.

<!-- runtime-placeholders:start -->
- `{ADO_ORG}` — the Azure DevOps organization: `tracking.ado.org` in the PRD frontmatter or `.arcane.json` ([[development-methodology]]).
- `{ADO_PROJECT}` — the Azure DevOps project: `tracking.ado.project`, from the same places.
- `{AGENT_EMAIL}` — the acting agent's commit email: the agent roster ([[agent-policies]]); ask if unset.
- `{AGENT_NAME}` — the acting agent's name: the agent roster ([[agent-policies]]); ask if unset.
- `{BUSINESS_NAME}` — the business or venture the work is for: the project's own context (its README or PRD frontmatter); ask if unset.
- `{HOST}` — the hostname of the machine being configured: the machine itself.
- `{LLC_NAME}` — the operator's legal entity: the project's own context; ask if unset.
- `{OPERATOR_DOMAIN}` — the domain the operator uses for agent and tool Git identities: ask if unset.
- `{OPERATOR_EMAIL}` — the operator's email: `git config user.email`.
- `{OPERATOR_NAME}` — the operator's name: `git config user.name`.
- `{OPERATOR_USERNAME}` — the operator's account on the host: the machine itself.
- `{ORG}` — the organization or owner that hosts the repositories: the repository's remote URL.
- `{PUBLIC_VISIBILITY_PREDICATE}` — the application's own public-visibility rule: the codebase (WD-07 in [[web-discoverability-standards]]).
- `{THE_REAL_VALUE}` — a secret's real value in an uncommitted `.env` example: the operator's secret store; never a committed file.
<!-- runtime-placeholders:end -->

**Enforcement: executable check (ARC-023) — in an installed repository, `spell doctor` warns (never
fails; the exit code is unchanged) on each token in a `status: active` `.arcane/governance/` document
that is not in this list, naming the file; it skips the check when this list is not installed. In
Arcane's own repository, a test (`test/up02-d-runtime-placeholders.test.ts`) fails when a shipped
`status: active` governance document uses a token that is not in this list. Whether an agent actually
resolves a listed token from the named source is explicitly advisory prose: no check exercises it.**

## Required operator actions: the `Needs you` block

Some runs end with an action only the operator can take: approving or merging a pull request,
accepting a decision record, answering a question the work is waiting on, confirming a `guarded`
push, running an interactive command such as `spell unblock-push`, or a step on an external platform
the agent cannot reach. Listed among optional next steps, such an action gets skimmed past. A spell
whose output can carry one reports it in one fixed block instead:

- **One fixed heading,** `## ⚠ Needs you`, at the very top of the final report, before every other
  section and before any optional next step.
- **One line per action:** exactly what to do, then why the agent cannot do it itself.
- **Never only among optional steps:** an action required for correctness may be repeated under next
  steps or suggestions, but it always appears in the block.
- **Omitted when empty:** when nothing needs the operator, the block is left out entirely, never
  printed as an empty heading or a "None" line.

The block's wording lives in one shared prose fragment (ARC-039), `needs-you`, kept in Arcane's
source under `.arcane/spells/_fragments/` and never shipped on its own. A spell carries it as a
`<!-- fragment:needs-you:start -->` / `<!-- fragment:needs-you:end -->` marker pair placed where the
spell describes its final output or report, and `npm run fix:self-host-parity` expands the fragment
between the markers. Edit the fragment, never an expanded copy, and never restate its rules by hand
in a spell body. Any shipped Markdown file can host a fragment the same way, not only a spell: the
`branch-naming` fragment is expanded into `git-conventions.md` and the Copilot instruction file as
well as into spells, and `spell agents sync` renders it into every client instruction file, so the
branch formats are written in exactly one place. Required actions also survive the end of a session: `spell-close-session` writes
the open items into the handoff's `Needs you` field, and `spell-open-session` surfaces that field
first, above the rest of the handoff, and does not mark the handoff consumed until it has.

**Enforcement: executable check (ARC-023) for the wording — in Arcane's own repository,
`npm run check:self-host-parity` fails CI when a spell's expanded span differs from the fragment, and
a test (`test/up04-b-needs-you.test.ts`) fails when the fragment loses its heading, placement or
omit-when-empty rule, or when a spell in the chosen set loses its span. Which spells carry the span
is decided by an author's judgment, and whether an agent actually emits the block is explicitly
advisory prose: no check reads a spell's output.**

## How to audit a spell

For each dimension, score Bronze/Silver/Gold with one line of evidence. Record the overall (weakest)
score and flag any D2/D7 below Silver as **must-fix**. When elevating, prefer **additive** changes
(add a fallback, an edge case, an acceptance line, a cross-reference); preserve the spell's intent and
working prose, and treat any change to *behavior* (not just coverage) as requiring explicit sign-off.
**Enforcement: explicitly advisory prose (ARC-023) — this audit process, including the must-fix flag
and the sign-off convention, is self-graded during spell-enchant's review; no coded scorer or
workflow gate verifies it.**
