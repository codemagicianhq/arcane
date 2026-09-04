# Cross-Repo Brief — Show Report in `arcane-ui` (SR-05a / SR-05b)

> **What this is.** The input to `spell-plan` in the **private `arcane-ui` repository** (ADO,
> `codemagicianllc/arcane/_git/arcane-ui`) — not a PRD, and not a backlog that repo inherits. Show
> Report's plan lives in `codemagicianhq/arcane` and deliberately specifies only the *interface*;
> arcane-ui authors its own PRD and architecture from this brief, per
> [PLAN.md](PLAN.md)'s "arcane-ui — the contract this plan fixes" section.
>
> **Why a brief exists at all:** everything below was verified against the arcane-ui source on
> 2026-09-02 and would otherwise have to be re-derived there. Findings marked **[verified]** were
> executed or read directly; everything else is a specification this program is asking for.
>
> Sources, all in `codemagicianhq/arcane`: [PLAN.md](PLAN.md) ·
> [docs/research/show-report-design.md](../../research/show-report-design.md) (Adelaide, the
> engineering brief) · [docs/research/show-report-narrative.md](../../research/show-report-narrative.md)
> (Circe, reader/structure) · the frozen JSON contract in `src/modules/show-report/types.ts`.

---

## Before starting

1. **`spell update` first.** That checkout is on Arcane **0.15.8** (installed 2026-05-18); current
   is **0.35.1**. Its spells predate the citation grammar (LH-07), the stale-claim and follow-up
   gates (LH-08/09), EF-21's verification states, and the branch-naming standard. This is a real
   change with its own review, not a formality — do it as its own PR before any Show Report work.
2. **Start from `main`.** The working copy was last seen on `docs/session-close-2026-08-21`, an old
   session-close branch.
3. **Branch/version conventions there:** `copilot/feat/<version>`, and **bump the version before
   merge** — Azure Artifacts feed versions are immutable.

## The two epics, in order

**SR-05a — design first.** Sync arcane-ui's tokens and the report-relevant exportable components
into a Claude Design design-system project via the `/design-sync` skill + `DesignSync` tool —
incrementally, one component at a time, never a wholesale replace. Design Show Report there against
Circe's structure and the real JSON model (both lenses: operator / share; light + dark; print). The
operator approves the design; **the approved design is the spec SR-05b builds.**

**SR-05b — then build.** Design may add fields; the **JSON schema freezes at SR-05b start**,
additive changes only after that point.

Do not collapse these. The v0 template shipping in `arcane-cli` today is an explicit placeholder —
the hand-built ledger's CSS converted to the Mustache grammar — not a design to reimplement.

## What to build

### 1. A general static-export contract (not report-specific)

- `src/export/registry.ts` — `exportable` registrations. **The registry, not convention, decides
  what may ship to MIT consumers.** Non-exportable controls (`Modal`, `CommandPalette`, virtual
  `DataTable`, motion components) are simply not registered.
- A `templateMode` prop convention: in `templateMode`, report components render **Mustache tags as
  ordinary text children** — `<ol>{"{{#rows}}"}<li>…</li>{"{{/rows}}"}</ol>`, and `{{href}}` inside
  attributes. `renderToStaticMarkup` passes them through untouched, so there is no sentinel
  post-processing step.
- `test/export/conformance.test.tsx` — every registered export renders statically with none of the
  known traps below.
- `scripts/build-export.tsx <name>` → `dist/exports/<name>.template.html`, with an inlined CSS
  **subset** plus a header comment carrying the arcane-ui version and the license notice.

Show Report is the **first and only** registration for now (ARC-042 decision 5); nothing else is
registered until it passes conformance.

### 2. `src/report/*` — the components

`ReportMasthead`, `StatRail` (+ `StatTile size="sm"` and a real `label` slot), `CategoryLegend`
(+ `Badge tone`), `ReportSection` (export the currently-private `PmSection`), `LedgerList` /
`LedgerRow`, `ReportColophon`, `NeedsYou`, `Corrections`, `Cast`, and a `ShowReport` composition.
Exact set is subject to the SR-05a design.

**`ShowReport` does not exist today.** The nearest precedents are references, not the
implementation: `PostmortemReport` (sectioned document + print mode), `ChangelogViewer`
(`Release`/`ChangeEntry`/`CAT_META` — closest data model), `InvoiceLedger` (row/pill idiom),
`InvoicePage`/`SpellCertificate` (print documents), `DigestEmail` (stat strip).

**Use class-based `.arc-ledger*` CSS, not inline styles** — measured at 15 KB vs 24 KB for 40 rows
**[verified]**.

### 3. Fix the three static traps **[all verified by `renderToStaticMarkup`]**

The whole library imports and renders in plain Node with no DOM — 217 exports, zero module-scope
`window`/`document` **[verified]**. These three still render wrong statically:

| Component | What it emits statically | Required fix |
|---|---|---|
| `NotchedFrame` → `HUDPanel` | `<path d="" …>` — `d` comes from a `ResizeObserver` measurement | Add `renderer="css"` (clip-path chamfer): SSR-safe and prints. Otherwise the signature shape is simply lost. |
| `StatTile value={40}` | `0` — `useState(0)` plus a rAF count-up in an effect | Report must pass `animateIn={false}`. String values (`"v0.22 → v0.33"`) already render as given. |
| `Reveal` / `Stagger` / `CountUp` | `opacity: 0` / `0` — content invisible | Do not use any of them in the report. |

### 4. Tokens and contrast — the riskiest part

Eight `--cat-*` / `--cat-*-bg` pairs in **both** schemes, plus a light-tuned `--signal-*` / `--accent`
set, a `@media (prefers-color-scheme)` block, `@media print`, and `ssr.ts` emitting
`data-arcane-scheme`.

**Measured WCAG 2.1 ratios [verified]:**

- **Dark passes** down to `--ink-40` (5.6:1); signal on dark 5.7–14.1, all AA.
- **Light does not.** `--ink-50` is **4.36:1** on `--bg-1` (fails AA for normal text, and 9–11px
  eyebrows/labels use it throughout). Worse, the light block never retunes signal/accent:
  **ok 1.18, warn 1.45, alert 2.93, info 1.25, accent-mono 1.21, violet 2.24, teal 1.53 — all fail.**
  A `Badge status="ok"` in light mode is unreadable.
- The hand-built ledger is not clean either (`--ink-faint` 2.81:1; `spell` pill 2.86:1) — do not
  copy its palette forward.

**Every new `--cat-*` pill must be chosen against ≥ 4.5:1 on its own background in both schemes,
asserted by a numeric contrast test** — jsdom axe cannot evaluate `color-contrast` (no layout), so
the component suite will not catch this.

> **This is the plan's stated riskiest assumption:** that the light retune is contained. If it grows
> beyond a report epic, **ship dark-only first** and track the light scheme as its own arcane-ui
> item — that fallback is pre-approved, and the template already declares which schemes it supports.

### 5. Accessibility baseline

One `<h1>` (masthead), one `<h2>` per section, no skipped levels, `<main>` + `<footer>` landmarks;
ledger as `<ol>`/`<li>`; stat rail as `<dl>` (`<dt>` label / `<dd>` value — `StatTile` today renders
unpaired `div`s); pill **text** always present so colour is never the only signal; legend swatches
and emoji glyphs `aria-hidden="true"`; `:focus-visible` outline on links; nothing essential below
12px; no motion. Run axe on the **rendered HTML** (`@axe-core/cli` or Playwright) once per generated
file — heading order and landmark rules bite there, not in component tests.

### 6. The build output

`scripts/build-report-template.tsx` → `dist/show-report.template.html`: doctype, `<html lang>`,
inlined CSS **subset**, fonts via a Google Fonts `<link>` (Chakra Petch / Rajdhani / JetBrains Mono
are SIL OFL and consumer-supplied — arcane-ui's own CHANGELOG 2.0.2 decision; **do not bundle font
files**), and a header comment with the arcane-ui version and license notice.

Tests: snapshot, a Mustache **parse** test, axe on the rendered HTML, and the numeric contrast test.

**Budget: ≤ 100 KB raw / ≤ 25 KB gzip, 0 KB runtime JS**, hard ceiling 150 KB. Reference points
**[verified]**: theme.css subset 8.9 KB (2.5 gz) vs full 24.4 KB; the current hand-built ledger is
23.2 KB.

## What consumes this

`arcane-cli` fills the template from `show-report.json` (schema v1, **frozen**). The template must
consume exactly these sections: `program`, `masthead` (eyebrow/title/dek), `stats[]`
(value + label), `outcome?`, `needsYou[]` (renders "Nothing needs you" when empty), `sections[]` →
`rows[]`, `corrections?` (checked/corrected/unverifiable + highlights), `parked[]`, `close?`,
`cast[]`, `colophon`. Authoritative shape: `src/modules/show-report/types.ts` in
`codemagicianhq/arcane`.

Two row-level rules the design must honour:

- A row's `descriptionState` is `"authored"` or `"unwritten"`. **An `unwritten` row must render
  visibly as unwritten** — never as a pasted commit subject, never hidden.
- Every row may carry an `href` (its PR) and a `glyph`; `category` is one of
  `spell | feature | governance | decision | fix | process | docs | platform`.

## Also needed from arcane-ui: release tagging

ARC-042 decision 7. arcane-ui is trunk-based with **zero git tags** **[verified]** — every version
bump auto-publishes to the feed, but nothing in git marks which commit became `v2.0.3`. Show Report
changes that: `check:report-template` and the SR-07 pipeline automation both need "this template was
compiled from arcane-ui commit X, tagged vY.Z.W" to be independently reproducible.

**Recommendation: tag every publish** — one pipeline step after a successful `npm publish`
(`git tag v$(node -p "require('./package.json').version") && git push origin --tags`). Not release
branches; those earn their cost only when parallel version lines need maintaining, and tags compose
into that model later if it ever appears. This is **arcane-ui's own decision to record** in its
governance as an `ARCUI-016`-shaped entry, drafted as part of SR-05b's PRD — flagged here as a
dependency, not decided by this program.

## Definition of done (what unblocks SR-06 back here)

1. The conformance test is green and Show Report is registered as an export.
2. `renderToStaticMarkup` snapshot + Mustache parse test pass.
3. The numeric contrast test passes for every `--cat-*` pill in every shipped scheme.
4. `dist/show-report.template.html` is ≤ 100 KB raw, zero runtime JS, header carries the arcane-ui
   version + license notice.
5. A new arcane-ui version is **published to the feed and tagged**.

SR-06 in `codemagicianhq/arcane` then vendors that artifact into `src/assets/report/`, replacing the
v0 placeholder, and re-baselines the golden test. Until then SR-06 is correctly blocked — the loop
there is instructed to halt rather than guess at a template that does not exist.
