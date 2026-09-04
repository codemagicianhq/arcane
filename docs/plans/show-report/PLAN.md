---
title: Show Report — Generated Program-Completion Reports, Rendered with arcane-ui
status: active
created: 2026-09-02
activated: 2026-09-03
baseline: c3143e6 (main)
owner: operator (payini)
executor: Arcane autonomous loop (one epic per session) — activates when SR-00 is merged
---

# Show Report — Generated Program-Completion Reports, Rendered with arcane-ui

> **Status: active, as of SR-00 (2026-09-03).** Approved by the operator as a plan 2026-09-02;
> SR-00 turned the draft into a running program — this PRD, ARC-042 drafted `Proposed`,
> `KICKOFF.md`/`OPERATOR-QUEUE.md`, and the `show-report-plan` delegation record are all in place.
> **The standing delegation itself is still inert until the operator merges SR-00's own PR** — see
> Authority & Delegation below and `OPERATOR-QUEUE.md` Q-001. The intake this planning produced was
> filed 2026-09-02: five ideas in `IDEAS.md` (23:24 entries) and five items in `TODO.md` (the
> LOW/MEDIUM items dated 2026-09-02 at the end of Open Items — two already fixed 2026-09-03, see
> `TODO.md`'s own notes); the three research memos are landed under `docs/research/` (see Sources).

## Context

After each autonomous program (Become Current, Lessons Hardening) a "completion ledger" HTML page was hand-built. The operator loves the format and wants it (1) **automated**, (2) rendered with **arcane-ui** — their private React design system — so it looks exactly as those components define, and (3) usable by **open-source `arcane-cli` users on their own machines**, reliably, consistently, fast. They are open to a service or even open-sourcing arcane-ui if needed, but want the options weighed first.

Three roster agents researched this (memos in `docs/research/`):

- **Alexander** (feasibility — `docs/research/show-report-feasibility.md`): ~80% of a report is derivable today from `PLAN.md`, `OPERATOR-QUEUE.md`, `gh pr list`, commit trailers and `docs/verification-ledger.md` — verified by re-deriving every stat in both hand ledgers. The per-row one-line description and the category are **not** reliably derivable (Conventional-Commit type reproduces the hand category in 5/17 rows) and must be authored once at the source. `arcane-cli` is public + MIT with no React; arcane-ui is proprietary on a private Azure Artifacts feed — a private dependency would break `npm ci` for anyone without a PAT.
- **Adelaide** (design system — `docs/research/show-report-design.md`): verified the **entire arcane-ui library imports and `renderToStaticMarkup`s in plain Node** (217 exports, zero module-scope DOM access). Three static traps to design around: `NotchedFrame`/`HUDPanel` chamfer needs `ResizeObserver` (renders `<path d="">`), `StatTile` renders `0` unless `animateIn={false}`, `Reveal`/`Stagger`/`CountUp` render invisible/zero. Light scheme currently fails AA contrast for pills. Verdict: pre-render, inline CSS, ship **zero runtime JS**; budget ≤ 100 KB raw / ≤ 25 KB gz.
- **Circe** (audience/story — `docs/research/show-report-narrative.md`): primary reader is the operator asking *"Is it done, and what's waiting on me?"* — lead with the outcome and a **Needs you: N** block; every row gets a receipt link (today none does); surface the run's own corrections as *calibration* (the differentiator); name it **"Show Report"** (a stage manager's post-performance record; "ledger" already means `docs/verification-ledger.md`). Author one reader-facing sentence per epic at PR time; the generator must mark a missing one **"unwritten"**, never paste a commit subject.

### The three options, weighed against "fidelity + offline + open source"

| Option | Fidelity | Offline OSS use | What it costs | Verdict |
|---|---|---|---|---|
| Hosted render endpoint | exact | ✗ network dependency; sends report data (possibly client names — the ARC-031 leak class) off-machine | a service to run | **Reject as default**; optional later for hosted publishing |
| Open-source arcane-ui + render locally | exact | ✓ but adds React to every `arcane-cli` install | business decision; ~200 KB of runtime nobody needs for a document | **Not required**; remains the fallback if the compiled-template licensing is declined |
| **Compiled template** — arcane-ui pre-renders the report components once into a static Mustache template; that artifact (markup + CSS subset, no React) is vendored into `arcane-cli`, which fills it from JSON | exact (it *is* the component output) | ✓ zero network, zero React | one licensing decision: rendered output ships under MIT while source stays private | **Recommended** |

The "two-tier" idea resolves into **one tier, two phases**: the CLI ships first with the existing hand-written CSS converted into the same template grammar (so automation and the data contract are real immediately), and the arcane-ui-compiled template drops into the same file slot later with no code change. **The v0 look is a placeholder** — today's hand-built design — not the shipped design; that comes from a dedicated design epic in Claude Design (SR-05a) before anything is built in arcane-ui.

Two generalizations the operator asked for (2026-09-02) are folded in below: the compiled-template mechanism is defined as a **general static-export contract** in arcane-ui (any component may opt in; Show Report is the first exportable composition), and an explicit **exportable / not-exportable** marker with a conformance test makes that boundary enforced — and it is the same boundary that governs what may ever cross into the MIT repo.

## Architecture (the compiled-template contract)

```
arcane-ui (private, ADO)                          arcane-cli (public, MIT, GitHub)
────────────────────────                          ─────────────────────────────────
src/report/*  (React components)                  src/assets/report/show-report.template.html  ← vendored artifact
   └─ templateMode: renders Mustache tags as text      (header: compiled-from arcane-ui@x.y.z, sha)
scripts/build-report-template.tsx                 src/modules/show-report/
   renderToStaticMarkup(<ShowReport template/>)      ├─ model.ts        buildShowReportModel()  → show-report.json
   + inlined theme.css subset + print/host CSS       ├─ plan-parser.ts  PLAN.md / OPERATOR-QUEUE.md / ledger / Coverage Map
   → dist/show-report.template.html                  ├─ sources.ts      gh PR snapshot, git trailers (optional --refresh)
                                                     └─ render.ts       renderShowReport(model, template) via mustache
                                                  scripts/report.ts  --check | --fix | --refresh  (CI gate, warn first)
                                                  src/commands/report.ts  `spell report`  (consumers, offline)
                                                  docs/plans/<program>/show-report.{json,html}   ← outputs, committed
```

Key mechanics:

- **Static-export contract (arcane-ui, general — not report-specific).** A component or composition opts in with `exportable: true` metadata (a small registry, `src/export/registry.ts`, alongside a `templateMode` prop convention). A conformance test renders every registered export under `renderToStaticMarkup` in Node and fails on the known client-only traps (empty SVG paths, `opacity:0`, zero-valued counters, `useEffect`-dependent output, module-scope DOM access). `scripts/build-export.tsx <name>` emits `dist/exports/<name>.template.html` for any registered export; Show Report is the first. Non-exportable controls (`Modal`, `CommandPalette`, virtual `DataTable`, motion components) are simply not registered — the registry, not convention, decides what can ship to MIT consumers.
- **Template grammar = Mustache** (logic-less; sections `{{#rows}}…{{/rows}}`, inverted `{{^needsYou}}…{{/needsYou}}`, escaped `{{x}}`, raw `{{{html}}}`). One level of nesting (sections → rows) is all the document needs. Use the `mustache` npm package (MIT, zero deps, ~10 KB) rather than an in-house renderer — spec-conformant escaping matters more than avoiding a tiny dependency.
- **How React emits a template:** in `templateMode` the report components render Mustache tags as ordinary text children (`<ol>{"{{#rows}}"}<li>…</li>{"{{/rows}}"}</ol>`) and `{{href}}` in attributes — `renderToStaticMarkup` passes them through untouched. No sentinel post-processing.
- **Themes/print live in the template**, not the CLI: arcane-ui's `[data-arcane-scheme="dark|light"]` tokens plus a host adapter (`@media (prefers-color-scheme: …)` guarded by `:root:not([data-arcane-scheme=…])`, and `:root[data-theme="dark|light"]` → scheme mapping for the Artifact host), `@media print`. Until the light scheme passes AA, the template forces dark and says so in its header.
- **Determinism / `--check`:** mirrors `scripts/spell-catalog.ts`'s `--check/--fix` — regenerate JSON from sources and HTML from JSON+template, compare line-ending-normalized bytes to the committed files. External data (PR titles/merge dates from `gh`) is **snapshotted into the JSON** by `--refresh`; plain `--check` never touches the network, so CI needs no API calls and two runs are byte-identical. Timestamps come from the plan (`completed:` / close-PR merge date), never wall-clock.
- **Fonts — verified no licensing issue.** arcane-ui's own spec (`spec/HANDOFF.md`, "Font hosting") specifies Chakra Petch, Rajdhani, and JetBrains Mono, all served from **Google Fonts** — all three are open-source (SIL Open Font License), free for embedding, redistribution, and commercial use with no purchase or attribution requirement. Nothing to license, nothing proprietary. arcane-ui deliberately does **not** bundle them (its `CHANGELOG.md` [2.0.2]: "removed the Google Fonts `@import` from `theme.css`... Fonts are now expected to be provided by the host app" — HANDOFF.md's own recorded decision was "(a) Consumer-supplied," not "(b) Bundle"). The compiled template follows the same rule arcane-ui already chose: it carries its own `<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=...">`, which is also the one external-stylesheet host the Artifact CSP allows — no font files are vendored into either repo.
- **Freshness:** the template header records the arcane-ui version it was compiled from; `check:report-template` warns when a newer template is expected (pinned in `package.json` `arcane.reportTemplateVersion`). Later (SR-07) arcane-ui's pipeline opens a PR on `codemagicianhq/arcane` whenever the compiled template changes — that is the "automatic and consistent" the operator asked for. **This requires arcane-ui's published versions to be checkoutable** (see "Release tagging" below) — a version string alone, with no corresponding git ref, is not enough to reproduce or patch the exact source a template was compiled from.

### Release tagging (arcane-ui) — a gap this plan surfaces, not fixes here

Checked directly (`git ls-remote --heads --tags`, `azure-pipelines.yml`): arcane-ui is **trunk-based with zero git tags** today — every merge to `main` with a version bump auto-publishes to the Azure Artifacts feed (versions immutable there), but nothing in git marks *which commit* became `v2.0.3` versus `v2.0.2`; the CHANGELOG cites a commit SHA by hand in only one entry. That was tolerable before because nothing needed to check out an old published version. Show Report changes that: `check:report-template` and the pipeline-PR automation (SR-07) both need to say "this template was compiled from arcane-ui commit X, tagged vY.Z.W" and have that be independently verifiable and reproducible later — not just a version number in a header comment.

**Recommendation: git tags on every publish, not release branches.** Add one pipeline step (same `Publish` stage, right after a successful `npm publish`) that runs `git tag v$(node -p "require('./package.json').version") && git push origin --tags`. This gives a permanent, reproducible `git checkout v2.0.3` for any published version, at the cost of one command — no change to the existing trunk-based flow. Full **release branches** (`release/2.x`, ReleaseFlow/GitFlow-style) are a heavier model that earns its cost only when multiple version lines need to be maintained *in parallel* — e.g. backporting a security fix to an old major while `main` has moved on. There's no evidence arcane-ui needs that today (single evolving line, no LTS commitment), so a branch-per-release-line would be process weight with nothing pulling on it yet. If that need appears later, it composes cleanly on top of tags (`git checkout -b release/2.x v2.0.3`) rather than requiring a redesign now.

This is arcane-ui's own decision to make in its own governance (a new `ARCUI-016`-style entry, drafted as part of SR-05b's PRD in that repo) — flagged here as a **dependency SR-05b/SR-06 need answered**, not decided by this plan. The framework-level generalization ("when must any Arcane-governed repo tag releases, and what decides it") is filed as an idea in `IDEAS.md` (2026-09-02 23:24, `[#governance]`).

## Data contract — `show-report.json` (schema v1)

```ts
interface ShowReport {
  schemaVersion: 1;
  program: { id: string; slug: string; title: string; status: string; baseline: string;
             started: string; completed?: string; versionSpan?: { from: string; to: string } };
  masthead: { eyebrow: string; title: string; dek: string };          // dek = PLAN frontmatter/intro sentence, overridable
  stats: Array<{ id: string; value: string | number; label: string; derived: true }>;
  outcome?: string;                        // from Coverage Map: "12 of 12 patterns dispositioned — 9 mechanized, 3 parked"
  needsYou: Array<{ id: string; title: string; reason: string; href?: string }>;   // OPERATOR-QUEUE entries not done; [] renders "Nothing needs you"
  sections: Array<{ id: string; title: string; note?: string; rows: Row[] }>;     // PLAN waves in order
  corrections?: { checked: number; corrected: number; unverifiable: number; scopeNote: string; highlights: Row[] };
  parked: Array<{ title: string; reason: string }>;                              // "## Parked — Needs Operator"
  close?: { dodVerdict?: string; driftVerdict?: string; deviations: string[] };  // from the close epic's Done note
  cast: Array<{ name: string; commits: number; source: "commit-trailer" }>;      // Agent/Persona trailers, "self-reported"
  colophon: { sources: string[]; compiledAt: string; templateVersion: string };
}
interface Row {
  id: string; glyph?: string; title: string;
  description: string | null; descriptionState: "authored" | "unwritten";
  category: "spell"|"feature"|"governance"|"decision"|"fix"|"process"|"docs"|"platform";
  href?: string; refs: string[]; by?: string[]; date?: string;
}
```

**Derived** (never typed by hand): program/frontmatter, stats, outcome, needsYou, section order, `refs`/`href` (PR links in Done notes; `--refresh` snapshot), corrections counts (the program's section of `docs/verification-ledger.md`), parked, close, cast, colophon.
**Authored, once, at the source** — one line inside each epic's PLAN.md entry:

```
**Report:** Living docs now cite by a stable anchor or quoted phrase instead of a bare line number
that drifts the moment the file is next edited — with a checker watching for it. · category: feature · glyph: 🔗
```

Optional `title:` override (Circe R3: Title Case, ≤ 5 words, no IDs); default title = epic title with the `LH-NN —` prefix stripped. Missing `**Report:**` → `descriptionState: "unwritten"`, rendered visibly as such; `--check` warns (flips to fail for programs with `status: complete` once the warn period has passed, per the LH-07 warn→fail convention). Capture point: `spell-create-pull-request` adds a `## For the record` PR-body heading; the loop's "Record" step copies it into PLAN.md.

## Work, by repository

### arcane-cli (this repo) — files and reuse

| File | Purpose | Reuses |
|---|---|---|
| `src/modules/show-report/plan-parser.ts` | Parse PLAN frontmatter, `### Wave` headings, `- [x] **ID — Title.** … **Done:** …` entries, `**Report:**` lines, Coverage Map table, `## Parked — Needs Operator`; parse `OPERATOR-QUEUE.md` `## Q-NNN — …` + `- **Status:**`; parse the program's `docs/verification-ledger.md` section | frontmatter/heading conventions already parsed by `scripts/check-stale-claims.ts`; living-docs set from `scripts/lib/living-docs.ts` |
| `src/modules/show-report/sources.ts` | `gh pr list … --json` snapshot, `git log --format` trailer counts, `git show <baseline>:package.json` version | `execFileSync` pattern from `scripts/org-token-lint.ts` (`repoToplevel`) |
| `src/modules/show-report/model.ts` | `buildShowReportModel({ planPath, queuePath, ledgerPath, snapshot })` → `ShowReport` (pure, deterministic) | — |
| `src/modules/show-report/render.ts` | `renderShowReport(model, templateHtml)` → HTML via `mustache`; backtick→`<code>` and `[t](u)`→link for descriptions, everything else escaped | marker/splice precedent in `src/modules/spell-compiler.ts` `expandFragment` (only if a root copy is ever spliced) |
| `src/assets/report/show-report.template.html` | v0: the current hand-written ledger CSS/markup converted to the Mustache grammar; v1: arcane-ui's compiled template (same slot) | the two existing ledgers |
| `scripts/report.ts` | `--program <slug> \| --all`, `--check`, `--fix`, `--refresh`; writes `docs/plans/<slug>/show-report.{json,html}` | `scripts/spell-catalog.ts` (`--check/--fix` shape, normalized byte compare) |
| `scripts/check-report-template.ts` | template header version vs. pinned expectation → warn | `scripts/self-host-parity.ts` |
| `src/commands/report.ts` + `src/index.ts` | `spell report [--plan <path>] [--out <dir>] [--refresh]`; auto-discovers `docs/plans/*/PLAN.md` | command registration pattern of `runWardCli` in `src/index.ts` |
| `.github/prompts/spell-create-pull-request.prompt.md`, `spell-close-session.prompt.md` (+ `src/assets/` mirrors) | `## For the record` capture; "Record" step copies to PLAN.md | `fix:self-host-parity` |
| `.github/workflows/ci.yml` | `Check show reports (warn mode)` after "Verify spell catalog" | existing warn-mode steps |
| Tests: `test/show-report-parser.test.ts`, `test/show-report-model.test.ts`, `test/show-report-render.test.ts`, `test/report-cli.test.ts` | grammar; determinism (two builds byte-equal); **golden test**: Lessons Hardening regenerates from the real `PLAN.md` + `OPERATOR-QUEUE.md` + a committed snapshot; an epic without `**Report:**` renders `unwritten` and is reported, never faked; `needsYou: []` renders the explicit-zero line; a checker test that proves a nonzero finding (the LH-03 lesson) | `test/helpers/fixture-dir.ts`, `test/helpers/prose.ts`, `HEAVY_TEST_TIMEOUT` |

### arcane-ui (private repo, its own Arcane-governed workflow) — the contract this plan fixes

Executed there via its own `spell-plan` → `spell-architect` cycle, branch `copilot/feat/<version>`, **version bump before merge** (feed versions are immutable). **`ShowReport` does not exist today and is to be created**; the repo's existing report-style controls are the reference precedents, not the implementation: `PostmortemReport` (long-form sectioned document with a print mode — header/`PmSection`/footer pattern), `ChangelogViewer` (`Release`/`ChangeEntry`/`CAT_META` — closest data model and category-meta pattern), `InvoiceLedger` (row/pill idiom), `InvoicePage`/`SpellCertificate` (print documents), `DigestEmail` (stat strip). This plan specifies only the interface:

- **Static-export contract** (general): `src/export/registry.ts` (`exportable` registrations), the `templateMode` prop convention, `test/export/conformance.test.tsx` (every registered export renders statically with none of the known traps), `scripts/build-export.tsx` (emits `dist/exports/<name>.template.html` with inlined CSS subset + license/version header). Show Report is the first registration; nothing else is registered until it passes conformance.
- **Design first, then build (SR-05a → SR-05b):** sync arcane-ui's tokens and the report-relevant exportable components into a Claude Design design-system project via the `/design-sync` skill + `DesignSync` tool (incremental, one component at a time, never a wholesale replace); design Show Report there against Circe's structure and the JSON model; the approved design is the spec SR-05b builds. Design may add fields — the JSON schema is frozen at SR-05b start, additive changes only after.
- New `src/report/`: `ReportMasthead`, `StatRail` (+ `StatTile size="sm"`, `label`), `CategoryLegend` (+ `Badge tone`), `ReportSection` (export the private `PmSection`), `LedgerList`/`LedgerRow` (class-based `.arc-ledger*` CSS, not inline styles — 15 KB vs 24 KB for 40 rows), `ReportColophon`, `NeedsYou`, `Corrections`, `Cast`; a `ShowReport` composition — exact set subject to the design.
- Fix the static traps: `NotchedFrame renderer="css"` (clip-path chamfer, prints, SSR-safe); report uses `StatTile animateIn={false}`; no `Reveal`/`Stagger`/`CountUp`.
- Tokens: eight `--cat-*`/`--cat-*-bg` pairs in both schemes; light-tuned `--signal-*`/`--accent` (AA on light surfaces); `@media (prefers-color-scheme)` block; `@media print`; `ssr.ts` emits `data-arcane-scheme`.
- `scripts/build-report-template.tsx` → `dist/show-report.template.html` (doctype, `<html lang>`, inlined CSS **subset**, fonts via Google Fonts `<link>`, header comment with version + license notice). Snapshot test + Mustache parse test + axe on the rendered HTML (jsdom axe cannot check contrast — a numeric contrast test against the tokens instead).
- A11y baseline: one `<h1>`, `<h2>` per section, `<main>`/`<footer>` landmarks, ledger as `<ol>`, stat rail as `<dl>`, emoji `aria-hidden`, pill text always present, `:focus-visible` on links.

## Epics (each ≤ 1–2 days; program directory `docs/plans/show-report/`, epic prefix `SR-`)

| ID | Epic | Route / Bump | Depends on | Verify |
|---|---|---|---|---|
| SR-00 | Program activation: `spell-plan` → `features/show-report/PRD.md` (tracking_mode internal) · **ARC-042** drafted `Proposed` · KICKOFF.md + OPERATOR-QUEUE.md + `show-report-plan` delegation record · this file → `status: active` (memos already landed 2026-09-02; intake already filed) | direct · no | — | operator merges (activates the grant), accepts ARC-042 (Q-002) |
| SR-01 | Parsers + model + JSON for both existing programs; backfill `**Report:**` lines (and missing PR links in Done notes) into `docs/plans/lessons-hardening/PLAN.md` and `become-current/PLAN.md` from the two hand ledgers | direct · no | SR-00 | **Done:** [PR #194](https://github.com/codemagicianhq/arcane/pull/194), merged 2026-09-03. `show-report.json` stat rail confirmed matching: BC's derived ADR-accepted count comes out to 5 (confirming the hand ledger's "4" was wrong), LH to 1. All 47 epics backfilled with a `**Report:**` line; PR-link backfill confirmed already complete in both files. 29 tests, ~99% line coverage on `src/modules/show-report/`. |
| SR-02 | Mustache renderer + interim template (hand CSS → grammar) + `scripts/report.ts --check/--fix/--refresh` + CI warn step + golden test | direct · patch (`src/assets/report/`) | SR-01 | **Done:** `v0.34.3`. `src/modules/show-report/render.ts` (mustache, one five-character escaper for every tag, `descriptionHtml` the only triple-mustache field), `src/assets/report/show-report.template.html` (v0: the hand ledger's CSS converted to the grammar — `<dl>` stat rail, `<ol>` ledger, landmarks, `aria-hidden` glyphs, `:focus-visible`, print CSS), `scripts/report.ts --check/--fix/--refresh --all/--program`, `check:report` in `ci.yml` (warn mode), `npm run check:report` green. Determinism: `colophon.compiledAt` is the plan's own `completed`/`activated`/`created` date, never wall-clock; two `--fix` runs byte-identical (tested). `--refresh` is accepted and says plainly it regenerates from local sources — external snapshotting is not built. Both closed programs' `show-report.{json,html}` committed; this plan's own table-form epics are skipped by design and reported, not rendered empty. **The eyeball found a real defect, fixed on the record:** the rendered LH stat rail read `0.33.2 → 0.34.2` where the true close is `0.34.1` — `sources.ts` had taken "last commit touching PLAN.md" as the close commit, and SR-01's own backfill had just edited the finished plan. The first fix (bounding that same PLAN.md anchor by author date) corrected LH but broke BC to `0.33.0` — measured against the real history before the second attempt: BC's last PLAN.md-touching commit on its completed day sat at 0.33.0 while two bumps landed later that day without touching the plan, and author dates are not monotonic along this rebase-merged log. The close is now "the commit `main` stood at when the `completed` day ended" — any path, by committer (landing) date `%cs`, TZ-safe — which reproduces both human records (`0.33.2 → 0.34.1`, `0.22.1 → 0.33.2`), with a regression test encoding the bump-only-commit case and a narrowly scoped `FixtureGitDates` option on the git fixture helper to pin dates. Eyeballed via `file://` in light, dark, and at 375px — the Browser pane cannot reach the claude.ai artifact route, so the Artifact publish is for the operator's own look. |
| SR-03 | `spell report` command + docs (README catalog entry; `spell-catalog.json` unaffected — it's a command, not a spell) | direct · minor | SR-02 | **Done:** `v0.35.0`. Generation core extracted to `src/modules/show-report/generate.ts` (shared: `scripts/report.ts` reads the template from `src/assets/`, the shipped command from the installed package's `dist/assets/` — `scripts/` is not bundled). New `src/commands/report.ts` + `spell report [--plan <path>] [--out <dir>] [--refresh]`, README entry in both the CLI row and the quickstart. **Verify met against the built CLI, not just unit tests:** `node dist/index.js report` in a scratch repo with a copied `PLAN.md`, no Arcane install and no network, wrote both files — 14 rows, no unrendered tags, idempotent on re-run, and `versionSpan` correctly *omitted* because that fixture's history lacks the baseline SHA. The refactor is byte-identical (`check:report` clean). **Also fixed here:** `v0.34.3` never reached npm — `publish.yml` checked out shallow while `ci.yml` uses `fetch-depth: 0`, so the golden parity test saw history-derived fields vanish and called it drift. `publish.yml` now fetches full history; `isShallowRepository()` makes `--check` say "cannot verify in a shallow clone" and `spell report` warn instead of degrading silently; both behaviours verified against a real `--depth 1` clone. Orphan `v0.34.3` release logged as `OPERATOR-QUEUE.md` Q-003. |
| SR-04 | Capture point: `## For the record` in `spell-create-pull-request`; "Record" step in loop protocol/`spell-close-session`; `--check` warns on `unwritten` | direct · patch (prompts) | SR-02 | **Done:** `v0.35.1`. `spell-create-pull-request` Step 4 gains the `## For the record` section in both templates plus the convention (include only for an epic of a tracked program; omit the heading otherwise); `spell-commit-work` step 9f references it rather than restating it; `spell-close-session` gains **step 4d**, which copies that sentence verbatim into the epic's `PLAN.md` `**Report:**` line — and explicitly leaves it absent, rather than writing one from memory, when the PR carried none. `--check`/`spell report` now name the epics rendering as `unwritten`, **advisory only** — never a failing exit, since the capture point applies going forward and a visible gap beats a fabricated sentence. Self-host parity re-synced (3 root copies). Verified: this epic's own PR carries the heading, and a fixture epic with no `**Report:**` line is named by `--check` while the report still passes. |
| SR-05a | **Design** (Claude Design): `/design-sync` arcane-ui tokens + exportable components into a design-system project; design Show Report against Circe's structure + the JSON model (both lenses: operator / share; light + dark; print); operator approves the design; schema v1 frozen | design · no code | SR-00, SR-01 (real JSON to design against) | approved design in the Claude Design project; any schema additions recorded |
| SR-05b | **arcane-ui build**: static-export contract (registry, `templateMode`, conformance test, `build-export.tsx`), `src/report/*` per the approved design, trap fixes, `--cat-*` tokens/contrast/print, `ssr.ts` scheme attr, stories + axe — in that repo under its own PRD; release-tagging decision (`ARCUI-016`-shaped) lands here | cross-repo · arcane-ui minor bump + feed publish | SR-05a | conformance test green; `renderToStaticMarkup` snapshot; numeric contrast test; template ≤ 100 KB raw |
| SR-06 | Vendor the compiled template into `src/assets/report/` (replacing v0); `check:report-template`; re-baseline the golden test | direct · minor | SR-02, SR-05b | LH + BC regenerate; Artifact screenshot light/dark; print preview |
| SR-07 | Automation (**operator-confirmed**): arcane-ui pipeline stage runs `build-export`, and opens/updates a PR on `codemagicianhq/arcane` whenever a compiled export changes (GitHub token in an ADO variable group) — the "consistent + automatic" guarantee | platform · no | SR-06 | a template change in arcane-ui produces a PR here within one pipeline run |
| SR-08 | Program DoD audit + close (walk the DoD with evidence, `spell-check-drift`, `spell-close-session`) | process · no | all | — |

**Riskiest assumption:** that the light scheme's contrast retune (SR-05b) is contained — Adelaide measured signal/accent at 1.18–2.93:1 on light surfaces, so the light lens may need more token work than a report epic should carry; if so, ship dark-only first and track light as its own arcane-ui item.

## Authority & Delegation

This repository has no installed agent roster, and `agent-policies.md` fails closed: missing authority
⇒ human execution required for commit and merge. As with Become Current and Lessons Hardening, the
operator resolves that explicitly for this program:

> **Standing delegation, recorded explicitly in [`.arcane/delegations.json`](../../../.arcane/delegations.json)
> (id `show-report-plan`), listable via `spell doctor`, revocable by editing or removing that
> entry:** sessions executing epics of this plan may — without per-action approval — create session
> branches, commit, push, open PRs, and merge their own PRs into `main` via the sanctioned strategies
> (merge/rebase, never squash), for work scoped to an epic defined in this plan, **in this
> repository only**. **The grant activates only once the operator merges SR-00** — until then, work
> on this plan is interactive/operator-merged, the same way Phase 0 was for both prior programs.

**Explicitly outside the grant** (always queue, never perform) — `.arcane/delegations.json`'s
`excludedActions` for this entry is the source of truth; summarized here for readability:

- Any GitHub/ADO **platform-settings mutation**: rulesets, required checks, `allow_auto_merge`, repo
  settings, secrets, webhooks.
- Deleting or force-resetting any branch that holds content not on `main` (content-verified via
  `git cherry` + diff, not ancestry).
- Manual `npm publish` or `workflow_dispatch` of publish/release workflows (the automatic version-bump
  → `release-drift.yml` → `publish.yml` chain is sanctioned and expected).
- **Accepting an ADR** — ARC-042 (this program's own) is drafted `Proposed` and stays that way until
  the operator accepts it via `OPERATOR-QUEUE.md` Q-002.
- **Any work scoped to the private `arcane-ui` repository** (SR-05a, SR-05b) — a different repo,
  different governance, different delegation; this grant covers `arcane-cli` only.
- **SR-07's pipeline automation** — ships only after the operator's explicit confirmation, per the
  epic's own "operator-confirmed" marker in the Epics table above.
- Marking anything in `OPERATOR-QUEUE.md` as approved/done — operator-only.
- Anything in `.arcane/governance/agent-policies.md`'s prohibited list (MCP/security config, etc.).

## Standing Constraints (digest — full text in the cited sources)

Identical invariants to Become Current and Lessons Hardening — these are repo-wide, not
program-specific:

- **Serial by construction.** Any change under `src/assets/`, to `src/modules/registry.ts`, or
  `src/config/profiles.ts` requires a `package.json` version bump differing from `main`
  (`scripts/check-version-bump.ts`). Epics touching `src/assets/` (notably SR-02, SR-06) run one at a
  time, sequentially — never two concurrent worktree epics in this repo (ARC-028 R4).
- **Every merged bump publishes.** `release-drift.yml` auto-creates the release on a `package.json`
  version change on `main`; `publish.yml` publishes to npm with provenance. Batch each epic's
  `src/assets/` changes into ONE PR.
- **PR-only, no squash, rebase-before-PR.** Required checks: `Lint, typecheck, test, build`, `PR
  branch is rebased on target`, `Review round clear`. Pre-PR guard: `git fetch origin && git rebase
  origin/main && git push --force-with-lease`.
- **Hooks are slow by design.** `.husky/pre-push` runs the full test suite; budget for long pushes.
- **Session lifecycle.** Every iteration: `spell-open-session` → work → `spell-close-session`.
  Session branches: `sessions/YYYY-MM-DD-<topic-slug>`.
- **Attribution trailers** on every commit per [[git-conventions]].
- **Working protocol** (root `CLAUDE.md`): verify before asserting; checked ≠ inferred ≠ told; a
  green test suite is not itself evidence.
- **Cross-repo boundary.** SR-05a/SR-05b execute under `arcane-ui`'s own governance and delegation,
  not this one — see Authority & Delegation above and `KICKOFF.md` step 3.

## Loop Protocol

Full step-by-step protocol lives in [KICKOFF.md](KICKOFF.md), kept as the single source so the two
never drift against each other (the exact class of bug this program's own SR-01 backfill work
corrects elsewhere). Digest: open → select topmost unblocked in-repo epic → run its empirical-first
step → execute per its Route → cite by stable locator → ship (PR, checks, merge under the grant) →
record (`**Report:**` line, `PLAN.md` checkbox, `TODO.md`/`IDEAS.md`) → close. Halt conditions are
listed in `KICKOFF.md`'s own closing paragraph.

## Danger Gates & Operator Queue

[OPERATOR-QUEUE.md](OPERATOR-QUEUE.md) is the single mutable surface between loop and operator. The
loop **appends** fully-prepared entries; the operator executes/approves and marks them done. Seeded
today with: **Q-001** (merge SR-00 — activates the grant above), **Q-002** (accept/revise/reject
ARC-042).

## Decisions the operator owns (to be recorded in ARC-042 / OPERATOR-QUEUE at SR-00)

1. **Licensing of the compiled template** — rendered markup + a CSS subset derived from proprietary `theme.css` ships inside MIT `arcane-cli`. Recommend: yes, with a license notice in the template header naming Code Magician LLC and permitting use with Arcane. (If declined → fall back to open-sourcing a `@codemagician/arcane-ui-report` subset; the JSON contract and CLI are unchanged.)
2. **Name:** "Show Report" (Circe) vs. "Completion Report". Default: Show Report — file/command names use `show-report` / `spell report`.
3. **Dependency:** add `mustache` to `arcane-cli` (MIT, zero deps). Default: yes.
4. SR-05a/b are executed in the arcane-ui repo by its own agents/workflow; Adelaide's memo is the engineering brief, the Claude Design output is the visual spec. **Design tool: Claude Design via `/design-sync`** (operator-stated intent, 2026-09-02).
5. **Scope of the export contract now:** contract + conformance test + Show Report as the only registration (recommended — small, and it establishes the boundary); registering further components is per-need, later. Alternative: audit and register the whole exportable subset up front (larger, not needed for the report).
6. **Fonts:** confirmed no licensing action needed (Google Fonts, SIL OFL) — no decision required, listed here for the record.
7. **arcane-ui release tagging:** tag every publish (`vX.Y.Z` on the publishing commit) — no release branches yet. Recommend: yes, as its own `ARCUI-016`-shaped decision drafted in arcane-ui's PRD for SR-05b, before `check:report-template`/SR-07 depend on a tag existing.

## Verification (end to end, at program close)

- `npm run check:report` green on `main` in warn mode with zero findings on both programs; `spell report` run in a scratch clone of a consumer-shaped repo produces the page with no network.
- Golden test: `docs/plans/lessons-hardening/show-report.html` regenerates byte-identically from sources + committed snapshot + vendored template.
- Published Artifact of the regenerated Lessons Hardening report: dark and light readable (or light explicitly disabled), prints to PDF cleanly, ≤ 100 KB, zero external scripts, fonts only from Google Fonts.
- Contrast: every `--cat-*` pill ≥ 4.5:1 on its background in the shipped scheme(s), asserted by a numeric test in arcane-ui.
- Full suite: `npm run typecheck && npm run lint && npm test && npm run check:self-host-parity && npm run check:spell-catalog && npm run check:citations`; version bump gate per epic.

## Sources

- Research memos: `docs/research/show-report-feasibility.md` (Alexander), `docs/research/show-report-design.md` (Adelaide), `docs/research/show-report-narrative.md` (Circe) — landed 2026-09-02, local paths normalized.
- arcane-ui: `package.json`, `azure-pipelines.yml` (publish stage), `src/index.ts`, `src/theme/ssr.ts`, `src/theme/theme.css`, `src/changelog/ChangelogViewer.tsx` (`Release`/`ChangeEntry`/`CAT_META`), `DECISIONS.md` (ARCUI-002 license, ARCUI-003 theming, ARCUI-007 CSS-vars-only), `spec/HANDOFF.md` (font hosting).
- arcane: `scripts/spell-catalog.ts`, `scripts/self-host-parity.ts`, `src/modules/spell-compiler.ts` (`expandFragment`), `scripts/lib/living-docs.ts`, `src/index.ts` (`runWardCli` registration), `docs/spell-catalog.json`, `docs/plans/lessons-hardening/PLAN.md` and `OPERATOR-QUEUE.md`, the two hand-built ledgers.
- Intake filed from this planning (2026-09-02): `IDEAS.md` — release-tagging policy, handoff freshness check, research-dispatch brief, Dependabot rebase note, the operator's branch-naming idea; `TODO.md` — ARC-041 missing from the DECISIONS TOC, LH PLAN.md PR links (→ SR-01), the "7 rows" vs 8 miscount, the known-stale Become Current artifact (→ SR-01/02), and the MEDIUM branch-naming gap (rename-on-sight, single-source fragment).
