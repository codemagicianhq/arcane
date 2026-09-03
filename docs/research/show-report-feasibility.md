---
title: "Show Report — Feasibility, Data Derivability, and Rendering Options"
audience: both
last_updated: 2026-09-02
status: active
tags: [research, show-report, reporting, arcane-ui, feasibility]
sources: [docs/plans/lessons-hardening/PLAN.md, docs/plans/lessons-hardening/OPERATOR-QUEUE.md, docs/verification-ledger.md, scripts/spell-catalog.ts, the arcane-ui repository (Azure DevOps project arcane), a gh pr list snapshot taken 2026-09-02]
---

# Show Report — Feasibility, Data Derivability, and Rendering Options

> Produced 2026-09-02 by the **Alexander (Research & Backlog Analyst)** roster agent as research input for the Show Report plan (docs/plans/show-report/PLAN.md). Verbatim except that local machine paths were normalized to repo-relative language before landing. Claims are labeled verified / inferred / speculative by the author where applicable.

---
title: Program-Completion Report Automation — Feasibility & Backlog
author: Alexander (Research & Backlog Analyst)
date: 2026-09-02
status: research
mode: read-only (repo in plan mode; nothing under the arcane repo was modified)
labels: verified = I observed it · inferred = reasoned from verified evidence · told = a document asserts it, unchecked · speculative = not checked
effort scale: S ≤ half a session · M = 1–3 sessions · L = multi-session
---

# Program-Completion Report Automation — Research

## Summary

1. **About 80% of both hand ledgers is derivable today** from PLAN.md frontmatter/waves/`[x]` epics, OPERATOR-QUEUE.md, `gh pr list`, `git show <baseline>:package.json`, commit trailers, the verification ledger, and the close-session journal — verified by re-deriving every stat-rail number (version spans, +5 spells, +4 checks, epic counts all match). Two fields are not: the per-row plain-English description (no honest source; PR `## Summary` usable verbatim in ~1 of 3 sampled PRs) and the category pill (Conventional-Commit type alone reproduces the hand category in 5/17 LH rows; type+scope rules ≈10/17). Keep those authored — once, at the source (PLAN.md epic entry), then generate.
2. **arcane-ui** (`@codemagician/arcane-ui` 2.0.3, proprietary, React 18/19 peer, ESM-only, tsup) styles via CSS custom properties + 53 `arc-*` classes in one `theme.css` plus ~2,259 inline `style={{}}` objects inside components; published to a private Azure Artifacts feed (`codemagicianllc`). It is consumable only at build time by a credentialed builder and never from a CDN — any artifact using it must be pre-rendered or fully inlined.
3. **arcane is PUBLIC + MIT** (verified via `gh repo view`); a private-feed dependency would break `npm ci` for anyone without a PAT (Dependabot included) and mix proprietary code into an MIT tree. Real-arcane-ui rendering belongs on the private side, not in `arcane`.
4. **Recommendation — confidence high (~85%):** build **(C) now** as `scripts/report.ts` with `--check`/`--fix` and a CI step, mirroring `scripts/spell-catalog.ts` and ARC-012's parity-guard rule; it emits a committed `ledger.json` model plus `ledger.html` through a **(B)-style static template** (tokens/fonts borrowed from arcane-ui's look, re-expressed MIT-clean, no runtime). Add one authored `Ledger:` line + category per epic in PLAN.md as the single human input.
5. Schedule an **(A1) `renderToStaticMarkup` spike in the arcane-ui repo** consuming that `ledger.json` — confidence medium (~60%) that it works without component patches: `StatTile`'s count-up renders "0" statically, `theme.css` restyles the whole host page, and arcane-ui has zero SSR/static-render tests.
6. Incidental verified drift found on the way: `DECISIONS.md`'s table of contents lacks the ARC-041 row; LH `PLAN.md` Done-notes link a PR for only 3 of 14 epics; the LH verification-ledger section has 8 rows where PLAN.md/journal say 7; BC ledger's "4 ADRs accepted" vs 5 ADRs that reached Accepted in the window.

---

## Findings

### Q1 — What should a program-completion report contain?

**Prior art (each fetched and read; see Appendix).**

| Convention | What it prescribes | Data present in Arcane? |
|---|---|---|
| Keep a Changelog 1.1.0 | For humans, not machines; one entry per version, dated, latest first, linkable; groups `Added/Changed/Deprecated/Removed/Fixed/Security`; explicitly *not* a commit-log diff | Version bumps and dates exist (`chore(release): bump version to X` commits, `gh release list`); groups map lossily from CC types (no Deprecated/Removed/Security signal; no `!` observed) — **partial** |
| GitHub auto-generated release notes | Merged-PR list + contributors + full-changelog link; label-driven categories via `.github/release.yml`; unlabeled → catch-all | PR list yes; **labels are empty on every non-Dependabot PR** in the last 30 (verified) — the label convention has no data here; no `.github/release.yml` exists (verified glob) |
| Conventional Commits 1.0 | `type(scope)!: description`; feat→MINOR, fix→PATCH, BREAKING→MAJOR | Last 100 merged PR titles: feat 43, docs 42, `[docs]` 7, fix 5, chore 1, ci 1, test 1 (verified) — **computable** |
| DORA five keys | change lead time, deployment frequency, failed-deployment recovery time, change fail rate, deployment rework rate | Frequency and PR→release lead time **computable** (PR `mergedAt` + release timestamps); fail rate / recovery / rework **not available** (no incident data; a "fix PRs ÷ PRs" proxy would misstate) |
| Scrum Guide — Sprint Review / Retrospective | Review inspects what was accomplished and what changed in the environment, adjusts the backlog; Retrospective plans process improvements | Review ≙ PLAN.md + queue; Retrospective ≙ journal `### Lessons Learned` (template prescribed by `spell-close-session.prompt.md` lines 54–58, verified) — **computable by extraction** |
| "Ship report" / launch recap | No canonical spec located (speculative area; I am not inventing one). Common denominator of the templates I know: headline metrics, what shipped grouped by kind, what was decided, what's next | Covered by the fields below |

**Field-by-field computability** (sources are repo-relative to this repository's root):

| Ledger element | Source | Computability | Evidence / notes |
|---|---|---|---|
| Program title | `docs/plans/<p>/PLAN.md` frontmatter `title` | computable | verified both plans; LH title is long ("Lessons Hardening — Mechanical Enforcement…") → take text before " — " |
| Dek paragraph | — | **human** | PLAN.md's opening paragraph is planning-voiced, ~150 words |
| Window (start/end) | frontmatter `created`; `completed` (BC only); else last program PR `mergedAt` | partial | LH frontmatter has no `completed:`; its `status:` embeds prose (`complete — Q-002 (RCA-001 merge) pending operator`) — `living-docs.ts`'s `^status:\s*(\S+)` regex still reads `complete` |
| Baseline sha | frontmatter `baseline` | computable | `b0992c1` (LH), `fdf853e` (BC) |
| Version span | `git show <baseline>:package.json` → version; version at close commit | computable | verified: BC 0.22.1→0.33.2, LH 0.33.2→0.34.1 — matches both stat rails |
| Epic count / list / titles | `- [x] **<ID> — <title>.**` lines | computable | regex count: BC 33, LH 14 (verified) |
| Phase grouping | `### Wave N — <name>` headings | computable (different taxonomy) | BC 6 waves, LH 5 (verified); hand ledgers used Setup / Epics / Cleanup / DoD instead |
| Phase notes | — | human (or omit) | |
| Per-row title | PLAN epic title, or PR title | partial | planning voice ("Derived counts") vs ledger voice ("Derived Counts, Not Hardcoded") |
| Per-row description | none; fallback = PR body `## Summary` (prescribed by `spell-create-pull-request.prompt.md` lines 110–141, verified) | **human** | sample #177/#181/#185: #177's second sentence ≈ the ledger line; #181 opens "Closes P11 (6x)…", #185 "Implements ARC-041 (LH-11)…" — insider voice. Expect ~1 in 3 usable verbatim (inferred from a 3-PR sample) |
| Category pill (8 categories) | CC `type(scope)` of the joined PR(s) | partial | hand-mapping the 17 LH rows to their PRs: type-only agrees 5/17; adding scope/keyword rules (`governance`→Governance, `decisions`/`ARC-` in title→Decision, `plans`/`journal`→Process, `deps`→Fix) ≈10/17. Misses are judgment calls: `feat(catalog)` #177 the human called *Bug Fix*; `test(helpers)` #175 and `ci(coverage)` #176 called *New Feature*; `docs(plans)` #173 called *Decision*. (inferred; inputs verified) |
| Emoji | — | human (or per-category default) | |
| PR ↔ epic join | epic token in PR title (`(LH-NN)`, `docs(bc-02)`): BC 71/88, LH 14/20; PLAN `pull/NNN` links: BC 33 lines, LH 4 lines | partial | LH Done notes carry a PR link only for LH-00/01/02 (verified by reading) → the title token is the only mechanical join for LH-03…LH-13; a generator must flag unjoinable epics rather than guess |
| Operator items | `OPERATOR-QUEUE.md` `## Q-NNN — title` + `- **Status:** [x] done DATE — note` / `parked …` | computable | LH 3 entries, BC 11 (verified) |
| Stat: items shipped | needs a definition | partial | hand: 40 / 17 = curated rows; PRs in window 88 / 20; epics 33 / 14 |
| Stat: new spells | prompt-file count delta baseline→close | computable | BC 36→41 = the ledger's "5 new spells" ✓; LH 41→41 |
| Stat: ADRs accepted | `## ARC-` headings and ToC `Accepted` rows, delta | computable, **definition ambiguous** | BC mechanical: 5 reached Accepted (ARC-029/037/038/039/040); hand ledger says 4 = the operator's explicit Accept calls (Q-004/006/007/008 — ARC-040 had no queue item). LH: 1 ✓ |
| Stat: new checks | `check:*` scripts delta in `package.json` | computable | LH 5→9 = "4 new checks" ✓; BC 3→5 |
| Contributors / agents | commit trailers `Agent:`, `Model:`, `Task-Type:` (docs\|code), `Channel:`; PR `author` | computable | verified on the last 12 commits |
| Decisions made | `DECISIONS.md` diff baseline→close; journal `### Decisions Made` table | computable | |
| Lessons learned / open items | journal `### Lessons Learned`, `### Open Items Carried Forward` | computable (extract) | authored once upstream; the report should quote headings, not restate |
| Verification calibration | `docs/verification-ledger.md` per-section `Result` column | computable | BC-window section 15 rows: 13 corrected / 1 confirmed / 1 unverifiable; LH section 8 rows, all corrected (counted). **Unique to Arcane; no prior-art template has it** |
| Delivery metrics | `gh release list`, PR `mergedAt`, bump commits | computable (frequency, lead time only) | 9 releases dated 2026-09-02 in the top-15 list |
| Compare link | `github.com/codemagicianhq/arcane/compare/<baseline>...<close>` | computable | |
| Colophon | generator metadata | computable | must stamp the close commit's date, not wall-clock, or `--check` can never be deterministic |

**Honest verdict on the two authored fields.** The description is not derivable at acceptable quality: the only prose sources (PR `## Summary`, PLAN Done-notes, journal items) are written for the operator/agent, not for a reader, and routinely open with tracker jargon. The category is ~60% derivable and 100% derivable once a human writes it. The pattern this repo already uses (ARC-036 "compute it, don't restate it"; ARC-039 single-source-of-truth) says: make the human write the one-liner and category **once, at the source** (the PLAN.md epic entry, or the PR body), and let everything else be computed. Rows lacking an authored line should render with a visible "derived" marker and the PR-summary fallback, never silently.

### Q2 — Feasibility of the three rendering architectures

**Hard constraint (verified from the Artifact tool contract in this session):** external `<script>` only from cdnjs / jsdelivr-npm / tailwind-CDN / jquery; external stylesheets only fonts.googleapis.com (font files from fonts.gstatic.com); everything else inline or `data:`; ≤ 16 MB; the page is wrapped in the viewer's own `<html>/<head>/<body>` skeleton (we cannot set `<html>` attributes); theme signalled by `data-theme` on the root plus `prefers-color-scheme`. arcane-ui is on no public CDN and cannot be (private, proprietary) — **so under any architecture its code/CSS must be inlined at build time by a builder that can reach the feed.**

**Second structural constraint (verified):** `codemagicianhq/arcane` is `visibility: PUBLIC`, license MIT; `@codemagician/arcane-ui` is "Proprietary — © 2026 Code Magician LLC" (README, ARCUI-002) with `.npmrc` `always-auth=true` and `publishConfig.registry` pointing at the org feed; Microsoft's own doc shows no unauthenticated consumption path (user-level `.npmrc` with a base64 PAT, Packaging scope). Inference: adding it to `arcane/package.json` would (a) write the feed URL into a public lockfile, (b) fail `npm ci` for Dependabot, contributors, and any CI job lacking the secret, (c) vendor proprietary code into an MIT tree. All three are avoidable only by keeping real-arcane-ui rendering out of the public repo.

#### (A) Standalone HTML embedding arcane-ui React components

*How, concretely.* Two sub-variants:
- **A1 — pre-render, no runtime.** A Node script (in a repo that can `npm install` from the feed — the arcane-ui repo itself is the natural host) imports `react-dom/server`'s `renderToStaticMarkup` (verified on react.dev: emits a non-interactive HTML string, no hydration attributes, effects never run, no DOM required), renders `<div data-arcane-scheme="light|dark" data-arcane-accent="amber" …>` (the attribute set `ArcaneRootAttributes()` returns for `<html>`, verified in `src/theme/ssr.ts`, applied to a wrapper div because we can't own `<html>`), inlines `dist/theme.css` into a `<style>`, and writes one file. `"use client"` directives are inert outside an RSC bundler (inferred — standard React behavior, not tested here).
- **A2 — inline runtime.** Bundle React + react-dom + the arcane-ui subset with Vite + `vite-plugin-singlefile` (verified: inlines all JS/CSS into one `index.html`) or esbuild `--bundle --format=iife`, and inline the result. CSP-compliant because inline scripts are allowed and no host is contacted. Buys interactivity (DataTable sort, CommandPalette) a completion ledger does not need. Size well under 16 MB (react-dom production ≈ 130 KB minified — speculative figure; measure in the spike).

*Hard constraints / gotchas found by reading the components (verified unless noted):*
- `StatTile` initializes `useState(animateIn && isNumeric ? 0 : numTarget)` and counts up in an effect (`src/data/StatTile.tsx` lines 50–70). Under `renderToStaticMarkup` effects never run → **every numeric stat renders as "0"** unless `animateIn={false}` is passed. The same class of failure applies to `Reveal`, `Stagger`, `CountUp`, `LoadingBar` (inferred from names + 166 `useEffect|useState` hits across 163 files; not individually read).
- `ArcaneProvider` reads persistence inside the `useState` initializer; `localStorageAdapter.read()` is try/catch-wrapped (`src/theme/persistence.ts`), so a missing `localStorage` degrades to `null` — safe. `applyThemeToElement` runs in an isomorphic layout effect, so on the server nothing is applied — the wrapper div's `data-arcane-*` attributes must carry the theme.
- `theme.css` is global, not scoped: `html, body { background: var(--bg); color: …; font-family: var(--f-ui) }`, `h1–h4 { text-transform: uppercase }`, `::selection`, scrollbar rules (lines 180–245, 499–502). Inlined into an artifact it restyles the host page, dark-first (`--bg: #000000`). A `[data-arcane-scheme="light"]` token block exists (lines 100–119), so a light mapping is possible; the artifact's `data-theme` must be mirrored onto the wrapper (inline script or duplicated token blocks).
- `Badge` has exactly four status colors (`ok/warn/alert/info`) — eight ledger categories need a custom color map via `style` (verified `src/data/Badge.tsx`; `ChangelogViewer`'s `CAT_META` shows the library's own pattern for that).
- **Zero SSR/static-render coverage**: `react-dom/server`, `renderToStaticMarkup`, `renderToString` appear nowhere in the arcane-ui tree (grep, verified); `spec/HANDOFF.md` line 1116 leaves the "no SSR warnings" checklist item unchecked. 90 `window.|document.|localStorage` references exist; most are in effects/handlers by inspection of five files, but "renders without throwing" is untested for the other ~158.
- Fonts: `--f-display: 'Chakra Petch', 'Saira Condensed'`, `--f-ui: 'Rajdhani'`, `--f-mono: 'JetBrains Mono'` — all four exist on Google Fonts (verified css2 response, served from fonts.gstatic.com) → loadable under the CSP. arcane-ui 2.0.2 deliberately removed its own Google Fonts `@import` ("fonts are now expected to be provided by the host app", CHANGELOG) → the report page must add the `<link>`.
- `dist/` is not in the clone; `files` = `dist/` only → consuming from source requires `npm run build` (tsup + `scripts/copy-css.ts`), or installing from the feed.

*Effort:* A1 spike **S**, A1 productionized **M**; A2 **M–L**. *Risks:* medium — unknown count of components that misrender statically; global-CSS leakage; every build needs feed credentials; the output cannot live in the public repo without the licensing/lockfile problems above.

#### (B) Extract arcane-ui's CSS/markup into a static template (no React at runtime)

*What the "look" is made of (verified):* ARCUI-003 chose "four-layer CSS-variable + React" and rejected Tailwind, CSS Modules, and Style Dictionary. Styling lives in three places: (1) `src/theme/theme.css` (~500 lines): root tokens, `data-arcane-*` variants (scheme, 9 accent presets, corners, density, motion, grid), global reset, and 53 `.arc-*` utility classes (`arc-pill`, `arc-tag`, `arc-tile`, `arc-hud`, `arc-eyebrow`, `arc-label`, `arc-num`, `arc-display`, `arc-hazard`, …); (2) **≈2,259 inline `style={{…}}` objects across 163 component files** versus 537 `className=` uses, 0 CSS-in-JS libraries, 0 CSS imports in components — i.e. most component-level appearance (StatTile's 54px number and hazard stripe, ChangelogViewer's `100px 1fr auto` row grid, HUDPanel's header strip) is JS, not CSS; (3) SVG/clip-path chamfered frames (`NotchedFrame`, 9 clip-path references).

*Therefore:* the tokens, fonts, palette, and utility classes are trivially extractable (they already are a standalone CSS file shipped as `./theme.css` and `./tokens.css`); the *component* look must be hand-ported into template markup by reading the TSX (StatTile, Badge, HUDPanel header, ChangeRow). That is exactly how the two existing ledgers were built — they are a (B)-style template with their own tokens. Quality: "arcane-ui-flavored", faithful for tiles/pills/eyebrows, approximate for chamfered frames. Drift: no parity guard against the private library is possible from the public side; a snapshot story in arcane-ui could serve as the visual reference.

*Licensing flag (needs operator decision):* copying `theme.css` verbatim into the MIT repo ships proprietary CSS under MIT. A re-expression of the token *values* (hex colors, font stack, spacing scale) in the report's own stylesheet is the clean route — that is what the existing ledgers already do with their palette.

*Effort:* **S–M.** *Risks:* low; deterministic; zero runtime; light/dark via the existing `data-theme` pattern; CSP-trivial.

#### (C) A generator — `scripts/report.ts` (or `spell report`) run in CI

*Orthogonality, stated plainly:* yes — (C) decides **who produces the file and when**; it can use (A) or (B) as its renderer. The cleanest split is a two-stage pipeline: `scripts/report.ts` emits a **data model** (`ledger.json`: program, window, baseline/close shas, stats, waves, rows with source refs, queue items, calibration counts) and then a **renderer** turns it into HTML. The (B) template is the renderer that can live in `arcane`; an (A1) renderer can live in the arcane-ui repo and consume the same JSON.

*Fit with existing prior art (verified):*
- `scripts/spell-catalog.ts`: `generateSpellCatalog()` → `renderJsonArtifact()` / `renderReadmeBlock()` → marker splice → `runSpellCatalogCheck(mode: "check" | "fix")` returning `{drifted, repaired}`; CLI `--check|--fix`; `package.json` `check:spell-catalog` / `fix:spell-catalog`; `ci.yml` step "Verify spell catalog"; `test/spell-catalog.test.ts`. A `report.ts` with the same shape (`generateLedger()` → `renderJson()` / `renderHtml()` → `runReportCheck(mode)`) is a direct clone; `check-citations.ts` / `check-stale-claims.ts` / `check-followups.ts` (all with fixture tests) show the `--report`/`--check` variant.
- ARC-012 decision 3: "apply the same principle to any future committed generated distributable artifact" — a committed `ledger.html` needs a parity guard, i.e. `check:report` in CI. ARC-036: deterministic, data-derived output; ARC-039: one source, generated stubs.
- **Script vs CLI subcommand:** the `docs/plans/<program>/` layout appears nowhere in `src/assets/` (0 hits) — it is repo-local, not a distributed convention; the CLI (`bin: spell/arcane`) ships to consumer repos and its commands are manifest-driven (`src/commands/status.ts` reads `.arcane.json`). A `spell report` subcommand would commit the CLI to a plan format consumers don't have. **Use `scripts/report.ts`**; promote to a CLI command only if the plan layout is ever distributed.
- **Hermeticity:** `ci.yml`'s `build-test` job has `permissions: contents: read` and no `GH_TOKEN` (only `review-round` gets one). A `--check` that calls `gh pr list` live is non-hermetic and rate-limited → snapshot the PR window into `ledger.json` during `--fix`; `--check` re-renders from the snapshot + tree and byte-compares (normalize line endings, as `spell-catalog.ts` does).
- **Publishing** to a Claude Artifact has no API from CI — it stays a manual step (`Artifact` tool) after the file is committed; document it in the program-close protocol.

*Effort:* **M** for model + (B) renderer + check + tests. *Risks:* low; the main design risk is over-fitting the parser to two hand-written PLAN.md files — keep the parsed grammar small (`frontmatter`, `### Wave`, `- [x] **ID — title.**`, `## Q-NNN`, `- **Status:**`) and fail loudly on anything else, like `spliceNamedCounts` does.

#### Recommendation

**C + B now, A1 as a scheduled spike on the private side.** Confidence **high (~85%)** that C+B is the right first move: every input is verified to exist, the generator pattern is already in the repo three times over, the output is CSP-trivial and deterministic, and it side-steps the public/private and license boundaries entirely. Confidence **medium (~60%)** that A1 renders acceptably without patching arcane-ui components — the `StatTile` zero, global CSS, and absent SSR tests are the known unknowns; the spike is cheap (S) precisely because `ledger.json` decouples it. A2 is not recommended: interactivity is not a requirement of a completion ledger, and it maximizes both bundle and credential complexity.

### Q3 — What is arcane-ui, actually?

| Attribute | Value | Label |
|---|---|---|
| Package / version | `@codemagician/arcane-ui` **2.0.3**; description "Arcane visual design system — chamfered HUD components and runtime theming for React" | verified (`package.json`) |
| License | `"SEE LICENSE IN LICENSE"`; README: "Proprietary — © 2026 Code Magician LLC. All rights reserved."; ARCUI-002 | verified |
| React | peer `react`/`react-dom` `^18 \|\| ^19`; dev `react@^19`; `@types/react@^19` | verified |
| Build | tsup, ESM-only (`format: ["esm"]`, `dts`, `treeshake`, externals react/react-dom); post-build `scripts/copy-css.ts` copies `src/theme/theme.css` → `dist/theme.css` and `dist/tokens.css` (identical files); `exports`: `.`, `./tokens.css`, `./theme.css`; `files`: `dist/` only | verified |
| Toolchain | TypeScript 5.4 (`moduleResolution: Bundler`, `jsx: react-jsx`), vitest 2 + jsdom + testing-library + axe (`vitest-axe`), ESLint 9, husky, Ladle 5 (`stories: src/**/*.stories.{tsx,jsx}`, `base: "./"`) | verified |
| Styling | CSS custom properties + `data-arcane-*` attribute variants + 53 `.arc-*` utility classes in `theme.css`; inline `style={{}}` inside components (≈2,259 sites); no Tailwind/CSS-in-JS/CSS Modules (ARCUI-003 rejected them); every component file starts with `"use client"` (ARCUI-005) | verified |
| Publish target | `publishConfig.registry` = `https://pkgs.dev.azure.com/codemagicianllc/_packaging/codemagicianllc/npm/registry/`; `.npmrc` scopes `@codemagician` to it with `always-auth=true`; `azure-pipelines.yml` stage `Publish → Azure Artifacts` on `main` using `$(System.AccessToken)`, idempotent skip if the version exists | verified (files) |
| Actually in the feed? | README/CHANGELOG say auto-published on every merge to main; 2.0.3 dated 2026-06-21 | **told** — not checked against the feed (would need feed auth) |
| Repo | `https://dev.azure.com/codemagicianllc/arcane/_git/arcane-ui`; clone HEAD `57f5e5d` (2026-08-21), depth 1 | verified (`git remote -v`, `git log`) |
| Export surface | `src/index.ts`: 217 value exports, 184 PascalCase identifiers (README claims "182 components across 30 phases") | verified count / told claim |
| Component groups | theme, primitives (HUDPanel, NotchedFrame, BracketFrame, CornerTicks, HazardStripe, Reticle, …), controls, data (StatTile, Badge, CodeTag, DataTable, KPIHex, ProgressBar, BarMeter, …), charts, overlays, forms, states, motion, keyboard, commands, nav, auth, settings, canvas, telemetry (LogsConsole, AuditLog, Inbox), schedule (WeekCalendar, OnCallRotation, SprintGantt), billing (BillingPlans, UsageDashboard, InvoiceLedger), boot, help, cinematic, graph, search, changelog (ChangelogViewer), tablet, api-explorer, roadmap, onboarding, print (InvoicePage, SpellCertificate), compare, mobile, oracle, diff, errors, postmortem, marketing, warroom, email, spells (SpellCatalogue) | verified (index.ts) |
| Tests / a11y | pipeline label "test (913 tests)"; README "19 a11y checks" | told |

**Components that already resemble the ledger's parts:**

| Ledger part | Closest arcane-ui component | Fit | Label |
|---|---|---|---|
| Ledger row (title · description · category) | `ChangelogViewer`'s internal `ChangeRow` — grid `100px 1fr auto`, category glyph+label, body, `by`; data types `Release { version, date, tag, title, summary, sealedBy, changes[] }`, `ChangeEntry { cat, body, by }`, `ChangeCategory = add\|change\|fix\|seal\|remove\|note` with a `CAT_META` color/glyph map | best fit; its data model is nearly `ledger.json`'s row shape; 6 categories vs the ledger's 8 → extend `CAT_META`-style | verified (read) |
| Stat rail | `StatTile` (value, `code`, `description`, hazard stripe, count-up); `KPIHex`, `TabletCockpitKPI` | good; **pass `animateIn={false}` for static render** | verified / names only |
| Category pill | `Badge` `variant="pill"\|"tag"` with `status` ok/warn/alert/info (`arc-pill`, `arc-tag`) | partial — 4 colors, needs per-category `style` | verified |
| Masthead | `HUDPanel` header strip (`title`, `code`, `status`, `headerRight`) over a `NotchedFrame`; `.arc-eyebrow`/`.arc-display` utilities | good | verified |
| Phase sections / timeline | `SprintGantt`, `RoadmapBoard`, `PostmortemReport` (timeline + action items — a natural home for RCA-001) | plausible | names/types only (inferred) |
| Verification calibration | `AuditLog`, `DataTable` | plausible | names only |

**Consumption implication for the `arcane` repo.** It *is* published — but to a private, auth-only feed. From a public MIT repo the options are: (1) **path dependency / submodule** — still private, still needs ADO auth in CI, still a license mix → no; (2) **copy** — proprietary code in MIT → operator decision, and I would not; (3) **npm dependency with a PAT secret in GitHub Actions** — feed URL in the public lockfile, `npm ci` broken for everyone without the secret → no; (4) **keep real-arcane-ui rendering on the private side** (arcane-ui repo or a private `arcane-reports` app) consuming a public `ledger.json` → recommended. **Cost flags:** Azure Artifacts is 2 GiB free then $2/GiB tiered (verified pricing page) — the feed already exists, incremental cost ≈ $0; Azure DevOps Basic first 5 users free then $6/user/month (already in use); a PAT, GitHub Actions on a public repo, and Google Fonts cost nothing; an additional Azure Pipelines job for a renderer runs on the existing free Microsoft-hosted parallel job (speculative — depends on the org's current parallel-job allotment).

### Incidental findings (verified; out of scope, not fixed — repo is read-only for this task)

1. `DECISIONS.md` Table of Contents ends at ARC-040 (line 61); **no `[ARC-041](#arc-041…)` row exists** although the ARC-041 section exists at line 2155 (added by PR #184). Neither `spell-check-drift` (checks heading sequence: "41/41") nor `check:stale-claims` Class A (compares `**Status:**` fields) watches the ToC. A generated ToC would be the ARC-036-style fix.
2. LH `PLAN.md` Done-notes link a PR only for LH-00/01/02; LH-03…LH-13 have none (4 `pull/` lines total vs BC's 33). The join works today only because 13 PR titles carry `(LH-NN)`.
3. `docs/verification-ledger.md`'s LH section has **8 rows**; `PLAN.md` (LH-13 item 2) and the journal both say **7**.
4. BC ledger stat "4 ADRs accepted" vs 5 ADRs that flipped to Accepted between `fdf853e` and the close commit (ARC-029, 037, 038, 039, 040) — two valid definitions; pick one mechanically (R-04).
5. Plan frontmatter is inconsistent across the two programs (`completed:` present only in BC; prose inside LH's `status:`).

### Assumptions needing validation

- That `@codemagician/arcane-ui@2.0.3` is really resolvable from the feed (unverified; run `npm view` with auth).
- That the Artifact CSP contract quoted here is identical for the operator's own publishes (it is the contract this session was given; treat as verified for this tooling, speculative for others).
- That the operator accepts a light-first report in arcane-ui's *palette* (the library is dark-first) — a design call, not a technical one.
- That `docs/plans/<program>/` remains the program layout (repo-local today).
- License stance on re-expressing arcane-ui token values in an MIT file (I treat plain hex/font values as facts, not copyrightable expression — inferred, not legal advice).
- Which "ADRs accepted" and "items shipped" definitions are intended.
- Static-render safety of arcane-ui components beyond the five I read.

---

## Backlog

Ordered so R-01 is the smallest thing that yields a real report from real data. Every item is read-only until the operator lifts plan mode.

**R-01 — `scripts/report.ts` v0: model + HTML from real data (S)**
Parse `docs/plans/<program>/PLAN.md` (frontmatter, `### Wave`, `- [x] **ID — title.**`, Done-notes), `OPERATOR-QUEUE.md` (`## Q-NNN`, `- **Status:**`), a `gh pr list --search "merged:<created>..<close>" --json number,title,mergedAt,author,labels` snapshot, `git show <baseline>:package.json`, and the tree at HEAD. Emit `docs/plans/<program>/ledger.json` and `ledger.html`, the HTML using the two existing ledgers' own stylesheet (operator-authored, MIT-safe) with rows = epics + queue items + unjoined PRs grouped by wave.
*Acceptance:* `npx tsx scripts/report.ts --program lessons-hardening --fix` writes both files; the stat rail shows 14 epics, `v0.33.2 → v0.34.1`, 4 new checks, 1 ADR; every epic row carries its PLAN title, joined PR number(s) (via title token or Done-note link) and a category derived from CC type+scope with a visible `derived` marker; epics with no joinable PR are listed in a "needs a link" block, not guessed; the page renders in light and dark, makes no network request except fonts.googleapis.com/gstatic; two consecutive `--fix` runs are byte-identical; `tsc --noEmit` and `eslint` clean.

**R-02 — Authored-field convention: one `Ledger:` line per epic (S)**
Add to each PLAN.md epic entry `**Ledger:** <one plain-English sentence> · <category: spell|feature|governance|decision|fix|process|docs|platform> · <emoji>`; backfill both programs from the two hand ledgers. Generator prefers it; falls back to PR `## Summary` first sentence + derived category, marked `fallback`. Add the field to the plan template in `docs/plans/lessons-hardening/KICKOFF.md`'s successor / the program-plan authoring guidance, and a one-line reminder in the program-close (DoD-audit) step.
*Acceptance:* both regenerated ledgers contain zero `fallback` rows; `report.ts --report` lists any epic lacking a `Ledger:` line; the row text of the regenerated LH ledger equals the hand ledger's 17 descriptions where an epic maps 1:1.

**R-03 — `check:report` CI gate + tests (S–M)**
`--check` mode mirroring `runSpellCatalogCheck` (line-ending-normalized byte compare of `ledger.json`/`ledger.html` against a regeneration from the committed PR snapshot + tree); `package.json` `check:report`/`fix:report`; `ci.yml` step after "Verify spell catalog"; fixture-based tests in `test/report.test.ts` modelled on `test/check-citations.test.ts` (parser grammar, join rules, determinism, close-commit date in the colophon, loud failure on an unrecognized epic line).
*Acceptance:* CI fails when PLAN/QUEUE/snapshot change without regenerating; passes on `main`; a test proves the checker can report a nonzero finding (the LH-03 lesson); coverage thresholds unchanged.

**R-04 — Record the stat definitions (S, decision)**
Write down, in the generator's header comment and a short `docs/research/` note (frontmatter per `delivery-channels-smoke-tests.md`): items = epics + queue items + unjoined PRs; ADRs accepted = headings whose Status flipped to Accepted between baseline and close; new spells = prompt-file delta; new checks = `check:*` delta; window = `created` → last joined PR `mergedAt`.
*Acceptance:* regenerated BC ledger shows 5 ADRs and the discrepancy with the hand ledger's 4 is logged as a `corrected` row via `spell-verification-ledger`; LH frontmatter gains `completed:`.

**R-05 — arcane-ui static-render spike, in the arcane-ui repo (S)**
`scripts/render-ledger.tsx` there: `renderToStaticMarkup` over a copied `ledger.json`, using `HUDPanel`, `StatTile animateIn={false}`, `Badge`, and a `ChangeRow`-style row; inline `dist/theme.css`; wrap in `<div data-arcane-scheme=… data-arcane-accent="amber">` mirrored from the viewer's `data-theme`; add the Google Fonts `<link>` for the four families; publish once by hand as an Artifact.
*Acceptance:* renders without throwing; every numeric stat shows its real value; light and dark both readable; ≤ 16 MB; no external request beyond fonts; a written go/no-go listing every component that needed a prop or patch (feeds arcane-ui's backlog) and a decision on whether the private renderer replaces the (B) template for published artifacts. *Flags:* needs feed credentials; stays inside the proprietary repo.

**R-06 — Calibration and lessons blocks (S)**
Add to the model: per-program `verification-ledger.md` counts (confirmed/corrected/unverifiable), journal `### Lessons Learned` headings and `### Open Items Carried Forward` bullets (quoted, not restated), `### Decisions Made` rows.
*Acceptance:* BC-window block reads 13/1/1 and LH 8/0/0 (matching a hand count); each lesson links to its journal heading anchor; the report never paraphrases a journal sentence.

**R-07 — Delivery metrics block (S, optional)**
Releases in window (`gh release list` snapshot), PR→release lead time per bump, PR count by CC type, agent/model/Task-Type distribution from commit trailers. Explicitly no change-fail-rate or recovery time.
*Acceptance:* numbers cross-check against `gh release list` and `git log --grep 'chore(release): bump version'`; the block states which DORA keys are omitted and why.

**R-08 — Location, retention, and publish step (S, decision)**
Decide `docs/plans/<program>/ledger.{json,html}` (self-contained program directory; completed plans are already excluded from citation checks by `living-docs.ts`) vs `docs/reports/`; add a line to `records-conventions.md` (which today says nothing about reports); document the manual Artifact publish in the program-close protocol.
*Acceptance:* both existing ledgers regenerated, committed at the chosen path, and published; the convention names who publishes and when.

---

## Appendix: Sources

Repo root for relative paths: this repository's root. Scratchpad: the session scratchpad.

**Baseline ledgers (read in full)**
- `<scratchpad>\become-current-ledger.html`
- `<scratchpad>\lessons-hardening-ledger.html`

**Arcane repo files read**
- `docs/plans/lessons-hardening/PLAN.md` (full), `docs/plans/lessons-hardening/OPERATOR-QUEUE.md` (full)
- `docs/plans/become-current/PLAN.md` (lines 1–40 + grep of epic lines and `### Wave` headings), `docs/plans/become-current/OPERATOR-QUEUE.md` (grep of `## Q-` and `- **Status:**`)
- `docs/verification-ledger.md` (full), `journal/2026-09-02-lessons-hardening-program.md` (full)
- `scripts/spell-catalog.ts` (full), `docs/spell-catalog.json` (lines 1–80), `scripts/lib/living-docs.ts` (full)
- `DECISIONS.md` (lines 1–120; sections ARC-012, ARC-036, ARC-039, ARC-041 via grep; ToC checked for ARC-040/041 links)
- `package.json` (full), `.github/workflows/ci.yml` (full), `src/index.ts` (lines 1–120), `src/commands/status.ts` (full)
- `src/assets/.github/prompts/spell-create-pull-request.prompt.md` (lines 98–147), `src/assets/.github/prompts/spell-close-session.prompt.md` (grep of journal section names)
- `src/assets/.arcane/governance/records-conventions.md` (headings + keyword grep), `docs/research/delivery-channels-smoke-tests.md` (lines 1–25)
- Globs: `.github/{release.yml,workflows/*}`, `docs/plans/*/*.md`, `test/{spell-catalog,check-*}*.test.ts`, `{docs,scripts,src,test}/**/*.html` (none), `src/commands/*`, `journal/2026-09-*.md`, `docs/rcas/*`

**Arcane repo commands run (read-only)**
- `gh pr list --state merged --limit 30 --json number,title,mergedAt,labels,headRefName,author`
- `gh pr list --state merged --limit 100 --json number,title,mergedAt` (type distribution)
- `gh pr list --state merged --limit 200 --search "merged:2026-08-30..2026-09-01"` and `"merged:2026-09-02..2026-09-02"` (window counts, epic-token coverage)
- `gh pr view 185|181|177 --json body`, `gh release list --limit 15`, `gh repo view codemagicianhq/arcane --json visibility,isPrivate,licenseInfo`
- `git log --format='%h | %ad | %s%n%b' -n 12`, `git log --grep 'chore(release): bump version' -n 14`, `git tag --sort=-v:refname`
- `git show fdf853e:package.json`, `git show b0992c1:package.json`, `git show a2dd1d3…:package.json`, `git show <sha>:DECISIONS.md`, `git ls-tree -r --name-only <sha> -- src/assets/.github/prompts | src/assets/.arcane/governance`

**arcane-ui clone (`<scratchpad>\arcane-ui-clone`, origin `https://dev.azure.com/codemagicianllc/arcane/_git/arcane-ui`, HEAD `57f5e5d`)**
- `package.json`, `.npmrc`, `azure-pipelines.yml`, `tsup.config.ts`, `tsconfig.json`, `README.md`, `CHANGELOG.md` (lines 1–40), `DECISIONS.md` (lines 1–70: ARCUI-001…005)
- `src/index.ts` (full), `src/theme/theme.css` (full), `src/theme/ssr.ts`, `src/theme/ArcaneProvider.tsx`, `src/theme/persistence.ts`, `src/data/StatTile.tsx`, `src/data/Badge.tsx`, `src/changelog/ChangelogViewer.tsx` (lines 1–120), `src/primitives/HUDPanel.tsx` (lines 1–90), `scripts/copy-css.ts`, `.ladle/config.mjs`, `.ladle/components.tsx`, `build/meta.json` (lines 1–40)
- Greps: `react-dom/server|renderToStaticMarkup|renderToString|hydrateRoot|typeof window` (tree-wide), `SSR|server-side|…` in `spec/`
- PowerShell counts over `src/**/*.{ts,tsx}` excluding stories: `style={{` 2259, `className=` 537, `var(--` 3089, CSS-in-JS/Tailwind/CSS-modules 0, `.css` imports 0, clip-path 9, `useEffect|useState` 166, `window.|document.|localStorage` 90; export identifiers in `src/index.ts` (217 / 184 PascalCase); `.arc-*` selectors in `theme.css` (53)
- `git remote -v`, `git log -1`, `git rev-list --count HEAD`

**Web (fetched 2026-09-02)**
- https://keepachangelog.com/en/1.1.0/
- https://docs.github.com/en/repositories/releasing-projects-on-github/automatically-generated-release-notes
- https://dora.dev/guides/dora-metrics-four-keys/
- https://www.conventionalcommits.org/en/v1.0.0/
- https://react.dev/reference/react-dom/server/renderToStaticMarkup
- https://scrumguides.org/scrum-guide.html
- https://learn.microsoft.com/en-us/azure/devops/artifacts/npm/npmrc
- https://github.com/richardtallent/vite-plugin-singlefile
- https://azure.microsoft.com/en-us/pricing/details/devops/azure-devops-services/
- https://fonts.googleapis.com/css2?family=Chakra+Petch…&family=Rajdhani…&family=Saira+Condensed…&family=JetBrains+Mono… (font availability check)
- https://ladle.dev/docs/config (returned config options only; build-output shape not documented there — not relied on)
- https://www.atlassian.com/agile/scrum/sprint-reviews (fetch returned navigation only; not used)

**Tool contract**
- Artifact tool description supplied to this session — "External resources — CDN allowlist (CSP-enforced)", "Size", "Theme-aware" sections (source of the CSP, 16 MB, wrapper-skeleton, and `data-theme` constraints).
