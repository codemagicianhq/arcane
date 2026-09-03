# PRD: Show Report

---
tracking:
  tracking_mode: internal
  external_provider: null
  adoWorkItemId: null
  githubIssueId: null
---

## Problem Statement

After each autonomous program (Become Current, Lessons Hardening) the operator hand-built a
"completion ledger" HTML page to review what shipped. The format works but doesn't scale:
hand-editing is slow, drifts from the real sources — both existing ledgers were confirmed stale
against `PLAN.md`/`OPERATOR-QUEUE.md`/`docs/verification-ledger.md` by direct re-derivation (see
[docs/research/show-report-feasibility.md](../../docs/research/show-report-feasibility.md)) — and
isn't available to `arcane-cli` users outside this repository. The operator wants a report that is
(1) **automated** — generated from the plan/queue/ledger/git sources, never hand-typed, (2)
**rendered with arcane-ui** — the private design system — so it matches its visual language exactly,
and (3) **usable by open-source `arcane-cli` users** on their own machines, offline, reliably.

## Target Users

- **Primary:** the operator (payini), reviewing this repository's own program completions (Become
  Current, Lessons Hardening, and future programs).
- **Secondary:** any `arcane-cli` user running their own Arcane-governed program who wants the same
  completion report for their repo, generated locally with no network dependency and no proprietary
  runtime installed.

## Requirements

### Must Have

- A JSON data contract (`show-report.json`, schema v1) deterministically derived from `PLAN.md`,
  `OPERATOR-QUEUE.md`, and `docs/verification-ledger.md` — no hand-typed stats. **AC:**
  `buildShowReportModel()` output matches both existing hand ledgers' independently verified numbers,
  or documents the corrected number (e.g. Become Current's actual 5 accepted ADRs).
- A static HTML renderer that fills a vendored Mustache template from the JSON with zero network
  calls and zero client-side JavaScript. **AC:** `spell report` run in an offline scratch clone
  produces the page.
- The template is visually identical to arcane-ui's design system output, not a hand approximation.
  **AC:** once SR-05b/SR-06 land, the template is compiled via arcane-ui's `renderToStaticMarkup`,
  not hand-authored CSS.
- `arcane-cli` ships fully MIT and dependency-light: the only new runtime dependency is `mustache`
  (zero deps). No React and no arcane-ui runtime ship to consumers. **AC:** `npm ls` shows no new
  non-MIT-compatible or React-family dependency in `arcane-cli`.
- `--check`/`--fix`/`--refresh` CLI verbs mirroring `scripts/spell-catalog.ts`'s determinism
  contract: `--check` never touches the network; two `--fix` runs are byte-identical. **AC:** CI gate
  `npm run check:report` passes in warn mode.
- A capture point so future epics author one descriptive line (`**Report:**`) at the source, not
  after the fact — a missing one renders visibly as `unwritten`, never faked. **AC:** an epic without
  `**Report:**` renders `unwritten` in the golden test.
- Accessibility baseline: single `<h1>`, one `<h2>` per section, semantic landmarks, `:focus-visible`,
  contrast ≥ 4.5:1 for every category pill in the shipped color scheme(s). **AC:** a numeric contrast
  test in arcane-ui, plus an axe run on the rendered HTML.
- A golden regression test: the Lessons Hardening report regenerates byte-identically from its real
  sources plus the committed template snapshot. **AC:** `test/report-cli.test.ts`'s golden case
  passes.

### Should Have

- `spell report` as a first-class CLI command with a README catalog entry.
- CI warning (not failing) when a program's report is out of date, following the LH-07 warn→fail
  convention until a program reaches `status: complete`.
- A `NeedsYou` block surfacing open `OPERATOR-QUEUE.md` entries so the primary reader's actual
  question ("what's waiting on me?") is answered first, per
  [docs/research/show-report-narrative.md](../../docs/research/show-report-narrative.md).

### Won't Have (this iteration)

- A hosted rendering endpoint, or any service that sends report data off-machine — rejected in favor
  of the compiled-template approach (see `PLAN.md`'s options table); may revisit later as an optional
  hosted-publishing add-on.
- Open-sourcing arcane-ui itself — remains the fallback only if the compiled-template licensing
  decision (Open Questions #1) is declined.
- Registering any arcane-ui component beyond Show Report in the new static-export registry
  (per-need, later).
- Guaranteed light-scheme parity — if the light-scheme contrast retune proves too large for this
  program, the documented fallback is to ship dark-only first and track light separately in
  arcane-ui.

## Constraints

- **Technical:** the compiled-template artifact must render solely via `renderToStaticMarkup` in
  Node with no module-scope DOM access (verified: arcane-ui's full 217-export surface already
  satisfies this). Three known static traps must be designed around: `NotchedFrame`/`HUDPanel`'s
  `ResizeObserver`-driven chamfer, `StatTile`'s animate-in-to-zero default, and
  `Reveal`/`Stagger`/`CountUp`'s invisible/zero initial render.
- **Cross-repo:** SR-05a/SR-05b execute in the private `arcane-ui` (ADO) repository under its own
  PRD/architecture/delegation — this PRD and `PLAN.md` specify the interface (static-export
  contract, data model, design brief), not that repository's internal implementation.
- **Business/licensing:** the compiled template ships rendered markup plus a CSS subset derived from
  proprietary `theme.css` inside MIT `arcane-cli` — an explicit licensing decision the operator owns
  (Open Questions #1 / ARC-042).
- **Security:** report content is derived from this repository's own docs — no user-supplied or
  client-name data is expected in scope, but the existing ARC-031 privacy-gate class applies to any
  future extension that could surface venture/client names.
- **Self-hosting:** `src/assets/report/show-report.template.html` is a canonical distributable
  asset — any change requires the standard version-bump gate and self-host-parity check like every
  other `src/assets/` file.

## Acceptance Criteria

- [ ] `show-report.json` schema v1 is implemented and `buildShowReportModel()` is pure/deterministic
      given the same source files.
- [ ] `npm run check:report` passes in warn mode on `main` with zero findings on both existing
      programs (Become Current, Lessons Hardening).
- [ ] `spell report` run in a scratch clone of a consumer-shaped repo (no network) produces a valid
      HTML page.
- [ ] The regenerated Lessons Hardening report is published as an Artifact and is readable in both
      light and dark (or light explicitly disabled with a documented reason), prints cleanly to PDF,
      ≤ 100 KB, zero external scripts, fonts only from Google Fonts.
- [ ] Every `--cat-*` category pill passes ≥ 4.5:1 contrast in the shipped scheme(s), asserted by a
      numeric test.
- [ ] Full gate suite green: `typecheck`, `lint`, `test`, `check:self-host-parity`,
      `check:spell-catalog`, `check:citations`; version bump gate satisfied per epic that touches
      `src/assets/`.
- [ ] ARC-042 is drafted `Proposed` and accepted by the operator before SR-01 begins consuming its
      data contract as final.

## Dependencies

- [docs/research/show-report-feasibility.md](../../docs/research/show-report-feasibility.md),
  [show-report-design.md](../../docs/research/show-report-design.md),
  [show-report-narrative.md](../../docs/research/show-report-narrative.md) (landed 2026-09-02) — the
  engineering, design, and narrative briefs this PRD and `PLAN.md` are built from.
- The private `arcane-ui` repository and its own Arcane-governed `spell-plan → spell-architect`
  cycle for SR-05a (design) / SR-05b (build) — outside this repository's direct control; SR-06
  (vendoring the compiled template) blocks on SR-05b shipping.
- `mustache` npm package (MIT, ~10 KB, zero deps) — new dependency, pending operator confirmation
  (Open Questions #3).
- **ARC-042** (new ADR, drafted `Proposed` as part of SR-00) — records the seven operator decisions
  below; SR-01 onward treats its accepted form as binding.
- `.arcane/delegations.json`'s new `show-report-plan` entry (mirrors `become-current-plan` /
  `lessons-hardening-plan`) — inert until the operator merges SR-00's PR, exactly like BC-00/LH-00.

## Open Questions

All seven are **decisions the operator owns**, per
[docs/plans/show-report/PLAN.md](../../docs/plans/show-report/PLAN.md)'s own "Decisions the operator
owns" section — recorded here and in ARC-042 for the operator to accept or revise when merging
SR-00's PR.

1. **Licensing of the compiled template** — rendered markup plus a CSS subset derived from
   proprietary `theme.css` ships inside MIT `arcane-cli`. Recommended: yes, with a license notice in
   the template header naming Code Magician LLC. Fallback if declined: open-source a
   `@codemagician/arcane-ui-report` subset instead (JSON contract and CLI unchanged).
2. **Name** — "Show Report" (default, used throughout this PRD and `PLAN.md`) vs. "Completion
   Report".
3. **Dependency** — add `mustache` to `arcane-cli`. Recommended: yes.
4. **Design tool** — Claude Design via `/design-sync` (already operator-stated intent, 2026-09-02;
   listed here for the record, not genuinely open).
5. **Export-contract scope** — register only Show Report now (recommended) vs. audit and register
   the whole exportable arcane-ui subset up front.
6. **Fonts** — no licensing action needed (Google Fonts, SIL OFL); listed for the record only, no
   decision required.
7. **arcane-ui release tagging** — tag every publish (`vX.Y.Z`) going forward, no release branches
   yet. Recommended: yes; drafted as its own `ARCUI-016`-shaped decision in arcane-ui's own PRD for
   SR-05b.
