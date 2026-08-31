# PRD: Research-Doc Capability

---
tracking:
  tracking_mode: internal
  external_provider: null
  adoWorkItemId: null
  githubIssueId: null
---

## Problem Statement

The Research & Backlog Analyst persona (Alexander) is defined purely as a behavior contract —
`src/assets/agents/research-analyst.yaml` states his behavioral rules (cite sources; distinguish
verified facts from reasonable inferences from speculation; summarize findings at the top, full detail
after) but names no output location. Arcane has no canonical home for a research report: a consumer
repo hand-placed one in an ad hoc `files/` directory because nothing else was defined. That directory
name has no precedent anywhere in this repo either (governance, spell prompts, or `registry.ts`) — it
was the consumer's own improvisation, not an existing Arcane convention being reused.

This repo already shows what happens when a document-location convention is left to emerge on its own
instead of being declared: `docs/intake/` has 34 files and three years of cross-references, but its own
PRD (`features/spell-intake/PRD.md`) is still `status: draft` / `implementation_status: blocked`, and no
governance doc declares the path as a rule. Research reports should not repeat that pattern.

## Target Users

Any Arcane-consuming repo where a research/investigation task (dogfooded here via the Research &
Backlog Analyst role, but not exclusive to it) produces a cited, structured finding that deserves to
persist past the conversation that produced it — and any session's `spell-todo`/`spell-close-session`
that needs to know where such a report lives so its findings can be routed into the backlog instead of
sitting only in chat history.

## Requirements

### Must Have

- **(a) A canonical storage convention**, declared in governance (not left to emerge by precedent the
  way `docs/intake/` did): `docs/research/<topic-slug>.md`, one file per report, documented in
  `portable-bootstrap.md`'s existing "Where Documents Live" reference — the doc whose whole purpose is
  answering exactly this question for a new session.
- The convention specifies a **structure**, not just a path: this repo's existing generic frontmatter
  (`title`/`audience`/`last_updated`/`status`/`tags`, already declared in `portable-bootstrap.md`'s
  "Documentation Format") plus one addition — `sources` — and a summary-first body shape (Summary →
  Findings → optional Follow-ups) that operationalizes Alexander's own behavioral rules: every claim
  traces to a source or is marked speculative; verified/inferred/speculative are visually distinct;
  findings are summarized before the full detail.
- **No new spell.** `spell-document` is already generic and path-agnostic (`Step 1`: "propose sensible
  paths from the project structure"; `Step 3`: "match the tone, frontmatter, and structure of files
  already in the target directory") — it needs the convention to exist and be named, not new logic to
  write there. Add "research report" to its Step 1 document-type list and name `docs/research/` as the
  default target path for that type, so the convention is actually reachable through the spell that
  would produce one, not just declared in prose nothing points at.
- **(c) `spell-todo` routing.** Extend the existing `Step 3 — Route to the Right Document` table with a
  row for a finding sourced from a research report: file it under the matching `TODO.md` section (same
  as any other discrete action item) with a cross-reference back to the report path — reusing the
  back-link mechanism `Step 2` already documents for `DECISIONS.md` (`— see [[DECISIONS]]`), not a new
  mechanism.
- `spell-close-session`'s existing capture tie-in tip (already the closest hook to this concept — it
  already suggests `spell-document` for "an investigation") names "a research finding" explicitly
  alongside its current examples, so the existing routing is discoverable without requiring a reader to
  infer that "investigation" was meant to include it.

### Should Have

- Nothing beyond Must Have for this iteration — see Won't Have.

### Won't Have (this iteration)

- **`spell-research`** (T25's optional part (b)): PLAN.md's own scope note for this epic gates it on
  "(a) proves insufficient alone." Since `spell-document` already covers "produce a structured, sourced
  report and write it to a known location" once that location is named, building a second,
  competing production mechanism now would duplicate `spell-document`'s propose-path → show-diff → write
  flow rather than reuse it. Revisit only if real use shows the generic spell genuinely can't carry
  research-specific needs (e.g., dispatching an actual research sub-agent) that a location convention
  alone can't fix.
- **A `docs/research/.gitkeep` scaffold shipped to fresh `spell init` installs.** Unlike `journal/`
  (used every session) or the other `session-continuity` files, a research report is opportunistic —
  most repos may never produce one. The directory is created on first real write by `spell-document`,
  the same way any other project/domain doc directory under `docs/` comes into existence on demand, not
  pre-seeded empty.
- **Migrating `docs/intake/`'s existing content or retrofitting its convention.** That is a separate,
  already-tracked, explicitly provisional effort (`features/spell-intake/PRD.md`) — cited here only as
  the cautionary precedent for why this convention needs to be declared, not touched by this PRD.
- **A dedicated `research-doc.md` governance file.** The convention is short enough to live as a section
  of `portable-bootstrap.md` (the file whose stated job is exactly this kind of "where do things live"
  answer) — a new standalone governance doc for one paragraph plus a frontmatter table would be the
  wrong-sized unit and would give a fresh session a second place to check instead of one.

## Constraints

- **D8 (single source, don't restate):** the frontmatter convention reuses `portable-bootstrap.md`'s
  own existing `title`/`audience`/`last_updated`/`status`/`tags` fields rather than inventing a
  competing schema; the back-link mechanism reuses `spell-todo`'s existing `[[DECISIONS]]`-style
  cross-reference pattern rather than a new one; production reuses `spell-document` rather than a new
  spell.
- **Technical:** no code changes — every touch point is prose inside existing `src/assets/` governance
  docs and spell prompts (`portable-bootstrap.md`, `spell-document.prompt.md`, `spell-todo.prompt.md`,
  `spell-close-session.prompt.md`). No new registry component; `docs/research/` is not part of any
  installed profile's file set, matching the "created on demand" decision above.

## Acceptance Criteria

- [ ] `portable-bootstrap.md` declares `docs/research/<topic-slug>.md` as the canonical research-report
      location, with a `sources` frontmatter field (layered on the doc's existing generic frontmatter)
      and a summary-first, verified/inferred/speculative body convention.
- [ ] `spell-document.prompt.md`'s Step 1 names "research report" as a document type and
      `docs/research/` as its default target path.
- [ ] `spell-todo.prompt.md`'s Step 3 routing table has a new row for research-report-sourced findings,
      cross-referencing the report path.
- [ ] `spell-close-session.prompt.md`'s existing capture tie-in tip names "a research finding" alongside
      its current examples.
- [ ] `self-host-parity` and the distributed-ADR-reference gate stay green (no new citation format
      introduced that either check would need to learn).

## Dependencies

- `portable-bootstrap.md`'s existing "Where Documents Live" / "Documentation Format" sections (extended,
  not replaced).
- `spell-document`, `spell-todo`, `spell-close-session` (all extended in place; none replaced).

## Open Questions

- None blocking. Whether `docs/research/` ever needs sub-organization (by topic area, by date) is
  deliberately left unaddressed — nothing in this repo or the motivating field report shows enough
  volume yet to design that ahead of real evidence.
