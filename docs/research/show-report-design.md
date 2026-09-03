---
title: "Show Report — Rendering with arcane-ui: Static-Export Feasibility, Components, Accessibility, Performance"
audience: both
last_updated: 2026-09-02
status: active
tags: [research, show-report, arcane-ui, design-system, accessibility, performance]
sources: [the arcane-ui repository (Azure DevOps project arcane) — src/index.ts, src/theme/theme.css, component sources and stories, test/a11y; in-memory renderToStaticMarkup probes and WCAG contrast computation performed 2026-09-02; the two hand-built completion ledgers]
---

# Show Report — Rendering with arcane-ui: Static-Export Feasibility, Components, Accessibility, Performance

> Produced 2026-09-02 by the **Adelaide (Frontend Developer)** roster agent as research input for the Show Report plan (docs/plans/show-report/PLAN.md). Verbatim except that local machine paths were normalized to repo-relative language before landing. Claims are labeled verified / inferred / speculative by the author where applicable.

# Rendering Arcane completion ledgers with arcane-ui — design memo

Author: Adelaide (Frontend Developer). Date: 2026-09-02.
Scope: `@codemagician/arcane-ui` v2.0.3 (shallow clone at `…/scratchpad/arcane-ui-clone`, HEAD `57f5e5d`, byte-identical `src/` to the operator's working copy at the operator's local `arcane-ui` working copy — verified with `diff -rq`), the two hand-built ledgers, and the Arcane CLI repo (read-only).
Method note: everything marked **[checked]** was read or executed. The runtime facts (import behaviour, static markup, bundle sizes) come from an in-memory esbuild bundle (`write:false`) of the clone's `src/index.ts`, evaluated against the working copy's `node_modules` (react 19.2.6, react-dom 19.2.6, esbuild 0.27.7) and rendered with `react-dom/server.renderToStaticMarkup`. No file was written anywhere during the investigation; the arcane repo was not touched.

---

## Summary

1. **Verdict: A′ — pre-render with `renderToStaticMarkup`, inline the CSS, ship no React.** Decisive reason: the deliverable is a *document*, and I verified the entire library imports and renders in plain Node with no DOM (217 exports, zero module-scope `window`/`document`), so arcane-ui's real value here — tokens + markup vocabulary — is available without a runtime; A (client React) pays 143–205 KB to animate five numbers, and B (hand-extracted CSS) forks the design system and drifts silently.
2. A′ has three **verified** static traps that must be designed around, not discovered: `NotchedFrame`/`HUDPanel` emit `<path d="">` (the chamfer is ResizeObserver-measured → no border, no fill statically); `StatTile` renders `0` unless `animateIn={false}`; `Reveal`/`Stagger` render `opacity:0` and `CountUp` renders `0` (content invisible).
3. Exists and fits today: `Badge` (pill/tag), `StatTile`, `CodeTag`, `HazardStripe`, `KPIHex`, `IDPlate`, `HUDPanel` (once the chamfer has a CSS renderer), the `.arc-eyebrow/.arc-mono/.arc-num/.arc-pill/.arc-tag` class layer, and the `[data-arcane-scheme]` token system.
4. Must be **proposed to arcane-ui** (new `src/report/` namespace): `ReportMasthead`, `StatRail`, `CategoryLegend`, `ReportSection` (export the private `PmSection`), `LedgerList`/`LedgerRow`, `ReportColophon`; plus `NotchedFrame renderer="css"`, `Badge tone`, `StatTile size/label`, eight categorical `--cat-*` tokens, a light-tuned signal/accent set, a `prefers-color-scheme` block, `@media print`, and an `ssr.ts` fix (it omits `data-arcane-scheme`).
5. Styling is a **mix**: CSS custom properties + a small class layer (26 `arc-*` classes actually used by components) + per-component inline `style` objects and inline SVG (69 hook-only class names; no CSS-in-JS) — extractable in part, which is exactly why B would fork.
6. A11y headline: the dark scheme passes AA down to `--ink-40` (5.63:1); the **light scheme is not shippable for pills** — signal/accent colours are not retuned by the light block and measure 1.18–2.93:1 on light surfaces, and `--ink-50` is 4.36:1 on `--bg-1`; axe covers HUDPanel/StatTile/Badge only and jsdom does not check contrast.
7. Perf budget: **≤ 100 KB raw / ≤ 25 KB gz** for the single file, zero runtime JS. Measured inputs: theme.css subset 8.9 KB (2.5 gz) vs full 24.4 KB; 40 inline-styled rows ≈ 24 KB vs 15 KB class-based; React 18 UMD 142.6 KB; 10-component subset + React 19 IIFE 204.6 KB (64 gz); current hand-built ledger 23.2 KB.
8. Blocking dependency fact: `arcane-cli` is public MIT with no React dependency, while `@codemagician/arcane-ui` is proprietary on a private feed (ARCUI-002) — the generator cannot be an ordinary dependency of arcane-cli; it belongs in arcane-ui (a `/report` subpath + bin) or a private sidecar package, invoked by the spell.

---

## Findings

### Q1 — Component inventory and mapping

**Source of truth:** `arcane-ui-clone/src/index.ts` (711 lines). Runtime export count measured at import: **217 symbols** (components + constants + hooks); README.md L5 claims "182 components". Legend below: **[checked]** = source file read; **[name]** = purpose inferred from export name, JSDoc in `index.ts`, or CHANGELOG entry — not read.

| Namespace | Exported components (key props) |
|---|---|
| theme | `ArcaneProvider` [checked] (`initial`, `persistTo: adapter\|"localStorage"\|"none"`, `onThemeChange`, `dir`) — context + writes `data-arcane-*` to `<html>` in a layout effect. `ThemeToggle` [checked] (`showMotionToggle`) — throws outside provider. `ThemeStudio`, `ThemePreview` [name] — layer-4 settings UI. Helpers: `ArcaneRootAttributes(theme)` [checked], `useArcaneTheme` [checked], `applyThemeToElement` [checked], `localStorageAdapter`/`nullAdapter` [checked], `DEFAULT_THEME` [checked]. |
| primitives | `HUDPanel` [checked] (`title`, `code`, `status: ok\|warn\|alert\|info\|active`, `notch=10`, `variant`, `padding=0`, `accent`, `headerRight`, `decorative`) — wraps `NotchedFrame`. `NotchedFrame` [checked] (`notch=12`, `stroke`, `color`, `fill`, `variant: all\|tl-br\|tr-bl\|top`, `padding=16`) — SVG path from ResizeObserver size. `BracketFrame` [checked] (`cap`, `stroke`, `color`). `CornerTicks` [checked] (`size`, `offset`, `stroke`, `color`, `variant`). `HazardStripe` [checked] (`height`, `width`, `thin`, `color`). `TickRule` [checked] (`start`, `end`, `step`, `width`, `height`, `majorEvery`, `showLabels`). `DashLine` [checked] (`width`, `color`, `dash`, `thickness`, `animate`). `Reticle`, `Crosshair` [name]. |
| controls | `Button` [checked] (`variant: default\|primary\|ghost\|alert\|secondary`, `size`, `loading`, `icon`, native button props). `Segmented` [checked] (`value`/`defaultValue`, `options`, `onChange`, `aria-label`) — `role="tablist"`. `Toggle`, `Slider`, `KeyCap`, `IconButton`, `Input`, `VSlider`, `Knob`, `DPad`, `BigToggle` [name]. |
| data | `StatTile` [checked] (`value: number\|string`, `code`, `description`, `accent`, `animateIn=true`, `animationDuration`) — 54px display number, rAF count-up. `Badge` [checked] (`status?: ok\|warn\|alert\|info`, `variant: pill\|tag`, `dot`) — pure class-driven (`arc-pill`, `arc-tag`). `CodeTag` [checked] (`code`, `label`). `KPIHex` [checked] (`value`, `label`, `size=130`). `IDPlate` [checked] (`id`, `label`). `DataTable` [checked, L10–L90 + probe] (`columns[]`, `rows`, `rowKey`, `selectable`, `expandable`, `pageSize`, `density`, `toolbarLeft/Right`, `defaultSort`, `height`, `multiSort`, `virtual`, …). `Sparkbar` [checked] (`value`, `max`, `accent`). `ProgressBar`, `BarMeter`, `LoadingBar`, `Calendar`, `DateTile`, `WorldMap`, `Globe`, `ActivityStatusCard`, `ScanLine` [name]. |
| charts | `Sparkline`, `Waveform`, `RadialGauge`, `ScopeTrace`, `BarChart`, `AreaChart`, `RingGauge`, `DotMatrixGauge`, `CircularWaveform`, `GridChart` [name] — several use `useLiveSeries`/canvas (setup.ts stubs `getContext`). |
| overlays | `Portal`, `Backdrop`, `Modal`, `Drawer`, `Tooltip`, `Toaster`+`toast`/`dismissToast`, `ConfirmDialog`, `Popover`, `Menu`, `SlideOver`, `Dropdown`, `ContextMenu` [name]. |
| forms | `FormField`, `TextField`, `TextArea`, `NumberField`, `Select`, `Checkbox`, `RadioGroup`, `FileDrop`, `DatePicker`, `Wizard` [name]. |
| states | `Skeleton`, `SkeletonText`, `SkelText`, `SkelCard`, `SkelTableRow`, `SkelChart`, `LoadingState`, `EmptyState`, `ErrorState`, `SuccessState` [name]. |
| motion | `Reveal` [checked] (`kind: up\|sweep\|spread\|scan\|boot`, `delay`, `as`) — `opacity:0` until `useInView`. `CountUp` [checked] (`to`, `from`, `duration`, `decimals`, `prefix`, `suffix`). `Stagger` [checked] (`kind`, `step`, `start`) — wraps children in `Reveal`. `DrawStroke`, `Stage`, `Sprite`, hooks `useTime/useTimeline/useSprite`, `Easing/clamp/interpolate/animate` [name]. |
| brand | `ArcaneSeal` [checked] (`size`, `ring`, `spin`) — decorative SVG, `aria-hidden`. |
| hooks | `useLiveSeries`, `useCountUp` [checked], `useInView` [checked], `useHotkey`/`getRegisteredHotkeys` [name]. |
| keyboard / commands / nav | `KeyHint`, `ShortcutsHelp`; `CommandPalette`, `QuickSwitcher`, `Spotlight`, `pushRecent`; `Sidebar`, `Breadcrumb` [name]. |
| auth / settings / canvas | `OTPInput`, `MFAModal`, `LoginScreen`, `OnboardingScreen`; `SettingsScreen`; `WorkflowCanvas` [name]. |
| telemetry | `AuditLog` [checked] (`entries?`) — seeds 120 rows with `Date.now()` when omitted; filters via `useState`. `LogsConsole`, `Inbox` [name]. |
| schedule / billing | `WeekCalendar`, `OnCallRotation`, `SprintGantt` [name, CHANGELOG L327–329]; `BillingPlans`, `UsageDashboard` [name]; `InvoiceLedger` [checked] (`invoices[]`, payment/billing strings, `onExportCsv`, `onDownloadPdf`, `onViewInvoice`) — 7-column grid rows with `arc-pill` status. |
| boot | `BootSequence`, `SplashScreen`, `LoaderLibrary`, `DotTriplet`, `OrbitSpinner`, `HazardMarch`, `MorsePulse`, `MiniBootLog`, `HexPulse`, `TickMarch` [name]. |
| help | `StatusPage` [checked] (`components[]`, `incidents[]`, `uptimeHistory`, `historyDays`) — **uses a foreign token namespace** (`--arcane-bg`, `--arcane-text`, …) and hard-coded hex (`#00d4ff`, `#ffb000`, `#ff3333`, `#8833ff`); `DocsReader`, `CoachmarkTour`, `KeyCheatsheet` [name]. |
| cinematic / graph / search | `CinematicCast`; `KnowledgeGraph` (+`DEFAULT_GRAPH_*`); `SearchResults`, `SearchFacets` [name]. |
| changelog | `ChangelogViewer` [checked] (`releases[]`, `categoryFilter`, `onCategoryChange`) + `CAT_META` (glyph/label/color per category) + `DEFAULT_RELEASES`. Private `ChangeRow` (L98–140): 3-column grid `100px 1fr auto`. |
| tablet / api-explorer / roadmap / onboarding | `TabletFrame`, `TabletCockpit`; `ApiExplorer`, `VerbBadge`; `RoadmapBoard`, `ThemeChip`; `FirstRun` [name]. |
| print | `InvoicePage`, `SpellCertificate` [checked] — fixed 794×1123 / 720 px "paper", hard-coded `PAPER` palette (L7–19), Georgia body. |
| compare | `CompareRuns` [name]. |
| mobile | `IOSDevice`, `AndroidDevice`, `MobileLogin`, `MobileCockpit`, `MobileInbox`, `MobileAlert` [name]. |
| oracle / diff / errors | `OracleAvatar`, `OracleChat`; `DiffViewer`; `ErrorPage`, `SectorMap` [name]. |
| postmortem | `PostmortemReport` [checked] (`data`, `mode: screen\|print`) — the library's only "document" component; private `PmSection` (L176–224: numbered `h2` + rule + hint) and `Meta` (L139–166). |
| marketing | `MarketingNav`, `Hero`, `Features`, `Outcomes` (`Outcome {value,key,detail}`), `Testimonials`, `FAQs`, `FinalCTA`, `MarketingFooter` [signatures checked via grep, render not read]. |
| warroom | `LiveClock`, `KillFeed`, `WarTile`, `AgentGrid`, `OnCallRing`, `WarRoom` [name]. |
| email | `EmailShell`, `EmailHeader`, `EmailBlock`, `EmailCallout`, `EmailCTA`, five templates, `EmailTemplate`, `buildEmailPalette` [checked] — `<table>`-based email markup with a self-contained hex palette (L74–111). |
| spells | `SpellCard`, `SpellDetail`, `SpellFacets`, `SpellCatalogue` [checked L1–260]. |

**Mapping — ledger primitive → best-fit arcane-ui component, with prop gaps**

| Ledger primitive (from the two HTML files) | Best fit today | Gap |
|---|---|---|
| Masthead: eyebrow + title + dek | **none as a unit.** Pieces: `.arc-eyebrow` class (theme.css L241), `CodeTag` (`label`+`code`) for the meta line, `HUDPanel` header strip for title+code. `EmailHeader` (eyebrow+title) is email `<table>` markup; `Hero` is a marketing section. | Needs `ReportMasthead` (`eyebrow`, `title`, `dek`, `code?`, `children` for rail/legend). Note theme.css L245 forces `h1–h4` uppercase display font globally — the editorial title would render as `BECOME CURRENT — COMPLETION LEDGER` in Chakra Petch. |
| Stat rail: 5 × (number + label) | `StatTile` (value/code/description). `KPIHex` is the "HUD-ier" alternative. `Outcomes` has the exact data shape (`value/key/detail`) but is a marketing block. | No group container; number is 54px (rail needs ~28px); no `label` slot (description is 9px mono uppercase); `animateIn` defaults to `true` → static output is `0` **[checked]**; no `<dl>` semantics. Needs `StatRail` + `StatTile size="sm"`/`label`. |
| Category legend: swatch + name × 8 | **none.** `Badge` pill with dot (`.arc-pill .arc-dot`) can stand in. | `Badge.status` is a closed 4-value semantic union (ok/warn/alert/info); the ledger has 8 *categorical* colours. Needs `CategoryLegend` and a `Badge tone` (or `CategoryPill`). |
| Phase section: heading + rule + note | Private `PmSection` in `PostmortemReport.tsx` L176–224 is exactly this (number, title, hint, rule) but **not exported**. `DashLine`/`TickRule` for the rule; `.arc-divider` (L491) exists. | Export/generalise as `ReportSection` (`n?`, `title`, `hint`, `id`, heading level). |
| Ledger list: rows of emoji + title / description / pill | Private `ChangeRow` in `ChangelogViewer.tsx` L98–140 (3-col grid, inline styles, 609 chars/row **[measured]**). `DataTable` is the only exported list: renders a real `<table>` but also a search `<input>`, COLUMNS button, density `Segmented`, and pager — **9 `<button>` + 1 `<input>` for 3 rows [checked]**, dead chrome on a static page; no toolbar-suppression prop in `DataTableProps` L45–L90. `InvoiceLedger` rows (L187–231) are the closest *look* (dashed `--ink-08` separators, mono ids, `arc-pill`) but are billing-specific. | Needs `LedgerList` (`<ol>`) + `LedgerRow` (`glyph`, `title`, `children`, `tone`, `category`, `href?`, `id?`) with **class-based** styling (`.arc-ledger*`), not inline. |
| Category pill | `Badge variant="pill"` **[checked: renders `<span class="arc-pill arc-pill--ok"><span class="arc-dot" aria-hidden="true"></span>New Feature</span>`]** | Needs categorical `tone`; pill colours are `--signal-*`, which fail contrast in the light scheme (Q5). |
| Colophon | none; `.arc-mono-data` (L494) / `.arc-eyebrow` text. `EmailShell` footer is email-only. | Needs `ReportColophon` (or a documented `<footer class="arc-mono-data">`). |
| Light + dark theme | `[data-arcane-scheme="light"]` (theme.css L100–119) | No `prefers-color-scheme`; light block leaves `--signal-*`/`--accent` untouched; `ArcaneRootAttributes()` omits `data-arcane-scheme` **[checked: rendered `<html>` has accent/corners/density/motion/grid + `--glow` only]**. |

### Q2 — Styling architecture

**Assembly [checked].** `tsup.config.ts`: single entry `src/index.ts`, `format:["esm"]`, `dts`, `sourcemap`, `treeshake`, `external:["react","react-dom"]`; no CSS pipeline. `scripts/copy-css.ts` L8–10 copies `src/theme/theme.css` to **both** `dist/theme.css` and `dist/tokens.css` — the two `package.json` `exports` (`./tokens.css`, `./theme.css`) are the same 24,389-byte file (dist sizes verified in the working copy). No component imports CSS (`grep import ".css"` → only `.ladle/components.tsx` L3). `dist/index.js` is 1,091,988 B raw / 183,660 B gz, unminified.

**Where the look lives — a mix, measured [checked, script over 168 source files]:**
- **Layer 1 CSS (`theme.css`)**: `:root` tokens (L15–93: surfaces, 12-step `--ink` ramp, accent triplet, 4 signal channels, strokes, radii, spacing, grid, three font stacks, `--glow`, easings, density); data-attribute variants (`data-arcane-scheme|accent|corners|density|motion|grid`, L99–175); a **global base reset** (L180–209: `* {box-sizing}`, `html,body {background:var(--bg); color; font-family:var(--f-ui)}`, `::selection`, body grid classes, `.scanlines`); typography utilities (L238–243) plus a **global `h1–h4` rule** (L245: display font, uppercase, `.04em` tracking); HUD/panel classes (L255–284); hazard/ticks/dot (L287–319); keyframes + animation classes (L324–366) with a `prefers-reduced-motion` guard (L369–377); buttons, inputs, toggle, segmented (L382–449); pills/tags/progress (L454–468); tabs (L473–477); stat tile (L482–483); utilities (L488–494); scrollbar (L499–502).
- **Class-driven components** (26 `arc-*` classes referenced by components that have a rule): `arc-mono`(130 uses), `arc-eyebrow`(67), `arc-btn`(54), `arc-display`(47), `arc-input`(31), `arc-num`(28), `arc-pill`(18), `arc-dot`(16), `arc-tag`(6), `arc-seg`, `arc-toggle*`, `arc-progress`, `arc-blink`, `arc-flicker`, `arc-in-up`. `Badge`, `Button`, `Segmented`, `Toggle` are purely class-driven — fully extractable.
- **Inline-style components** (69 `arc-*` class names referenced with **no rule** — hook classes only): `arc-hud-panel(__hd/__bd)`, `arc-notched-frame`, `arc-stat-tile`, `arc-code-tag`, `arc-kpi-hex`, `arc-hazard-stripe`, `arc-corner-ticks`, `arc-bracket-frame`, `arc-tick-rule`, `arc-dash-line`, all charts, all states, `arc-btn--sm/--lg/--secondary/--loading`, `arc-btn__icon`, `arc-seg__opt--active`, … Their look is `style={{…}}` objects referencing CSS vars (e.g. `StatTile.tsx` L76–84, `HUDPanel.tsx` L85–97, `IDPlate.tsx` L21–29) plus inline SVG for chamfers/brackets/ticks. Note `Button` emits `arc-btn--sm` but theme.css has no `.arc-btn--sm` — the size prop is a no-op today **[checked]**.
- **Orphaned CSS**: `.arc-hud/.arc-hud__head/.arc-hud__body`, `.arc-panel*`, `.arc-tile/.arc-tile__num`, `.arc-tabs`, `.arc-hazard*`, `.arc-ticks`, `.arc-divider`, `.arc-row/col/grid`, `.arc-mono-data`, `.arc-btn-notch` are defined in theme.css but used by **no** component (ported from `spec/css/arcane.css`). They are a ready-made static vocabulary — relevant to option B.
- **No CSS-in-JS**: no styled-components/emotion, no runtime `<style>` injection; `utils/cn.ts` (7 lines) is the only styling helper and explicitly "avoids adding a runtime dependency".
- **Token hygiene [measured]**: 62 tokens defined, 53 distinct used, **22 used-but-undefined**. Ones that bite a report: `--ink-25` (22 bare uses; `HUDPanel` and `StatTile` use it *with* an `--ink-30` fallback), `--ink-8` (5 bare: `ChangelogViewer.tsx` L108 `border-bottom: 1px solid var(--ink-8)` → invalid → **no row separator renders**), `--ink-08`/`--ink-04` bare in `InvoiceLedger.tsx` L195/199, `--f-num` bare in `Email.tsx`, `--bg-0` bare in `SpellCatalogue`/`WarRoom`, and the whole `--arcane-*` foreign namespace in `help/*`. This is a design-system defect to file; the report must not inherit it.

**Runtime theming [checked].** `ArcaneProvider.tsx` L62–101: theme state seeded from `DEFAULT_THEME` (dark / mono / chamfer / comfy / full motion / dots grid / glow 0 — `types.ts` L47–55) merged with a persisted value (`persistence.ts`, key `arcane-ui:theme:v1`, try/catch around `localStorage`) and `initial`; a `useIsomorphicLayoutEffect` (L25–26 guards `typeof window`) calls `applyThemeToElement(document.documentElement, theme)` (`attribute-applier.ts` L10–18 → six `data-arcane-*` attributes + `--glow` inline). So theming is **`data-*` attributes on `<html>` + CSS variables**; no `prefers-color-scheme` anywhere (grep: the only media query is `prefers-reduced-motion` at L369). `ssr.ts` L25–36 predates `ColorScheme` (added v1.5.0 per CHANGELOG L179–185) and still omits `data-arcane-scheme`.

**Does it match the artifact host's light/dark pattern? No.** Host contract: complete light palette on bare `:root`; dark under `@media (prefers-color-scheme: dark) { :root:not([data-theme="light"]) }` and `:root[data-theme="dark"]`. arcane-ui: dark on bare `:root`, light only under `[data-arcane-scheme="light"]`, keyed to an attribute the host never sets, no media query. Two consequences: (i) a page that just inlines theme.css is dark regardless of the viewer's toggle; (ii) `html,body {background:var(--bg)}` overrides the host's off-white ground. A "dark-first design that swaps roles consistently" is permitted by the host, so the adapter is: duplicate the light block under `:root[data-theme="light"]` and `@media (prefers-color-scheme: light) { :root:not([data-theme="dark"]) }`, and set `data-arcane-scheme` to match — ~25 lines, generated from theme.css rather than typed. The right long-term fix is upstream (Q4).

**Fonts [checked].** `--f-display: 'Chakra Petch', 'Saira Condensed', system-ui`; `--f-ui: 'Rajdhani', …`; `--f-mono: 'JetBrains Mono', ui-monospace`. v2.0.2 removed the Google Fonts `@import` from theme.css (CHANGELOG L30: "Fonts are now expected to be provided by the host app"). All three are Google Fonts, which the artifact CSP allows — the report supplies the `<link>`.

### Q3 — Static rendering feasibility (verified, not guessed)

**(a) Module-scope globals — clean.** Evaluating the full bundle in Node with `typeof window/document/localStorage === "undefined"` succeeded: `IMPORT full lib in Node (no DOM globals): OK — 217 exports`. Static grep for column-0 lines touching `window|document|localStorage|matchMedia|ResizeObserver|IntersectionObserver|requestAnimationFrame|performance` finds only a comment (`DataTable.tsx` L150). All DOM access is inside effects/handlers or guarded (`ArcaneProvider.tsx` L25–26, L77; `persistence.ts` try/catch). HANDOFF §6.2 rule 7 ("No global side effects on import") holds.

**(b) Output that depends on effects/client state — these render wrong statically [all checked by `renderToStaticMarkup`]:**

| Component | Static output | Consequence |
|---|---|---|
| `NotchedFrame` → `HUDPanel` | `<path d="" fill="var(--bg-1)" stroke="var(--ink-30)">` — `d` is computed from `ResizeObserver` size (`NotchedFrame.tsx` L48–74) | **No chamfered border and no panel fill.** The signature shape is lost in A′ unless a CSS renderer is added. |
| `StatTile value={40}` (default `animateIn`) | number `0` (`useState(0)` L50–52, rAF in effect) | Must pass `animateIn={false}` → renders `40`. String values (`"v0.22 → v0.33"`) render as given. |
| `Reveal`, `Stagger` | `style="animation-delay:0ms;opacity:0"`, no `arc-in-*` class (`useInView` false) | **Content invisible.** Never use in A′. |
| `CountUp to={40}` | `0` | Same. |
| `ThemeToggle`/`ThemeStudio` | throw outside `ArcaneProvider`; inside, render buttons with no handlers | Omit; a static page cannot re-theme anyway. |
| `ArcaneProvider` | children render; its layout effect never runs → **no `data-arcane-*` on `<html>`** | Emit `<html {...ArcaneRootAttributes()} data-arcane-scheme=…>` yourself. |
| `AuditLog` (default entries) | seeded from `Date.now()` L69 | Non-deterministic markup — irrelevant for the ledger but a warning for any "run twice, diff" pipeline. |
| `DataTable` | 6,768 chars for 3 rows: real `<table>`, plus search `<input>`, 9 `<button>` (columns, density segmented, pager) | Dead controls in a static document; the initial page/sort renders correctly. |
| `PostmortemReport mode="print"`, `ChangelogViewer`, `InvoicePage`, `Email*` | render fully (24,123 / 14,758 chars) | Good precedents: pure props-in/markup-out. |

**(c) CSS imports in Node — non-issue.** No `.css` import exists inside `src/` components, so `import "@codemagician/arcane-ui"` (or the in-memory bundle) loads in plain Node ESM without tsx/esbuild stubs. The CSS is a sibling file to read and inline (`dist/theme.css`).

**Ladle output.** `build/` and `test-ladle-build/` each contain only `meta.json` (52,508 / 52,518 B; they differ by one story name, `boot--boot-sequence--fast` vs `…--fast-8×-`). It is a Ladle story index whose `filePath`s reference story files that **no longer exist** (`auth-v7`, `charts-v6`, `controls-v6`, `data-v6`, `forms-v6`, `motion-v7`, `overlays-v6` — 8 MISSING of 25 [checked]) — stale leftovers of an old `ladle build`, no HTML. A real `ladle build` emits a client-rendered SPA of stories; it is a catalogue, not a pre-render path.

**Sizes (measured):**

| Artifact | raw | gzip |
|---|---|---|
| `dist/index.js` (tsup, unminified, react external) | 1,091,988 | 183,660 |
| full library, esbuild-minified, react external | 549,902 | 136,598 |
| **10-component report subset** (`ArcaneProvider, HUDPanel, HazardStripe, CornerTicks, DashLine, Badge, StatTile, CodeTag, KPIHex, IDPlate`), minified | 10,455 | 3,755 |
| subset + React 19.2.6 + `react-dom/client`, IIFE minified (option A, self-contained) | 204,626 | 64,038 |
| React 18.2.0 UMD `react` + `react-dom` production (cdnjs equivalent; measured from an unrelated project's `node_modules`) | 10,737 + 131,882 | 4,279 + 43,013 |
| `dist/theme.css` = `dist/tokens.css` | 24,389 | 5,346 |
| theme.css subset a report needs (tokens, light block, corners, reduced-motion, reset, type, hud, hazard, dot, pill/tag, utilities) | 8,867 | 2,470 |
| hand-built `become-current-ledger.html` (40 rows) / `lessons-hardening-ledger.html` (17 rows) | 23,152 / 16,364 | — |
| one inline-styled row (`ChangeRow` delta) vs one class-based `LedgerRow` | 609 / 385 chars | ×40 rows = 23.8 KB / 15.0 KB |

**Verdicts**

- **(A) Inline React + arcane-ui runtime, client-rendered — reject for reports.** Feasible: React 19 has no UMD build (`node_modules/react/umd` absent), so either bundle React into the inline IIFE (204.6 KB / 64 gz for the subset) or load React 18.3 UMD from cdnjs (142.6 KB / 47 gz; arcane-ui's peer range `^18 || ^19` allows it) plus a ~10 KB inline component IIFE. arcane-ui itself must be bundled at generation time either way (private registry, CSP). What A buys over A′ is the count-up, the reveal cascade, and the ResizeObserver chamfer — and it costs a blank page without JS, a browser pass before PDF, and 6–9× the payload. Estimated single file: **~160–230 KB raw**.
- **(A′) Pre-render with `renderToStaticMarkup`, inline emitted CSS, no runtime — recommended.** Verified working end-to-end in Node with zero DOM shims. Requirements: `animateIn={false}`, no `Reveal/Stagger/CountUp`, explicit `<html data-arcane-*>` + scheme adapter, and a CSS chamfer for `HUDPanel` (until then, `HUDPanel` renders as a headed box with no frame). Estimated single file with today's components: **~60–85 KB raw / ~12–15 KB gz** (inline-styled rows dominate); with class-based `LedgerRow`: **~35–50 KB raw / ~8–10 KB gz**. Print/PDF works from the same file.
- **(B) Hand-extract classes/tokens into a static template — bridge only.** Works today because theme.css is plain CSS and the orphaned `.arc-hud/.arc-tile` classes exist; **smallest** (~9 KB CSS + ~15 KB markup ≈ 25–35 KB). But every look decision that lives in component inline styles gets re-typed by hand and drifts on the next arcane-ui release — a second design system by accident. It violates "follow the project design system — propose additions before inventing", unless framed as a stop-gap with the proposals below filed.

### Q4 — Proposed composition

**Page tree (JSX pseudocode; `NEW` = to be proposed to arcane-ui, everything else exists).**

```tsx
// generation side (Node): renderToStaticMarkup(<LedgerReport data={ledger} />) → wrap in <!doctype html>, inline <style>
<html lang="en" {...ArcaneRootAttributes({ ...DEFAULT_THEME, grid: "none" })} data-arcane-scheme="dark" /* until ssr.ts emits it */>
  <head>
    <title>Become Current Ledger</title>
    <style>{themeCssSubset}{hostSchemeAdapter}{reportCss}{printCss}</style>
    <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Rajdhani:wght@400;600&family=JetBrains+Mono:wght@500&display=swap" />
  </head>
  <body>
    <main className="arc-report">                                   {/* max-width 920px, like the hand-built page */}
      <ReportMasthead                                                 /* NEW */
        eyebrow="Arcane · Session Record" code="BC-00–32"
        title="Become Current — Completion Ledger"
        dek="Every item shipped while taking the Arcane framework from its 2026-08-30 backlog to fully current…">
        <HUDPanel renderer="css" title="Run totals" code="v0.22 → v0.33" status="ok" padding={16}>   {/* renderer prop NEW */}
          <StatRail>                                                  {/* NEW: <dl> */}
            <StatTile size="sm" label="Items shipped" value={40} animateIn={false} />        {/* size/label NEW */}
            <StatTile size="sm" label="Epics (BC-00–32)" value={33} animateIn={false} />
            <StatTile size="sm" label="Version span" value="v0.22 → v0.33" animateIn={false} />
            <StatTile size="sm" label="New spells" value={5} animateIn={false} />
            <StatTile size="sm" label="ADRs accepted" value={4} animateIn={false} />
          </StatRail>
        </HUDPanel>
        <CategoryLegend items={CATEGORIES} />                          {/* NEW: Badge tone per category */}
      </ReportMasthead>

      {phases.map((p, i) => (
        <ReportSection key={p.id} n={String(i + 1).padStart(2, "0")} title={p.title} hint={p.note}>   {/* NEW (export PmSection) */}
          <HUDPanel renderer="css" variant="tl-br" padding={0}>
            <LedgerList>                                              {/* NEW: <ol> */}
              {p.items.map(it => (
                <LedgerRow key={it.id} glyph={it.emoji} title={it.title} tone={it.category} category={CATEGORIES[it.category].label} href={it.prUrl}>
                  {it.description}
                </LedgerRow>
              ))}
            </LedgerList>
          </HUDPanel>
        </ReportSection>
      ))}

      <ReportColophon>                                                 {/* NEW */}
        Compiled 2026-09-01 from <CodeTag code="DECISIONS.md" />, <CodeTag code="PLAN.md" /> and this session's PR history. Every row shipped to <CodeTag code="main" />.
      </ReportColophon>
    </main>
  </body>
</html>
```

**Components/variants to propose to arcane-ui (not to build locally):**

| Proposal | Props | Where | Precedent in the codebase |
|---|---|---|---|
| `ReportMasthead` | `eyebrow`, `title`, `dek`, `code?`, `as?="header"`, `children` | `src/report/ReportMasthead.tsx` | `PostmortemReport` header (L270–379); `EmailHeader` eyebrow+title |
| `StatRail` (+ `StatTile size="sm"`, `label`) | rail: `children`, `columns?`; tile: `size: "sm"\|"md"`, `label` (rendered as `<dt>`/`<dd>` pair) | `src/report/StatRail.tsx`, `src/data/StatTile.tsx` | `DigestEmail` stat strip (Email.tsx L788–870); `SprintGantt` "4 stat tiles" (CHANGELOG L329) |
| `CategoryLegend` + `Badge tone` | legend: `items: {id,label,tone}[]`; Badge: `tone?: string` mapping to `--cat-<tone>` / `--cat-<tone>-bg` | `src/report/CategoryLegend.tsx`, `src/data/Badge.tsx` | `ChangelogViewer.CAT_META` (glyph/label/color map, L36–43); `InvoiceLedger.STATUS_PILL` |
| `ReportSection` | `n?`, `title`, `hint?`, `id?`, `level?: 2\|3`, `rule?: "line"\|"dash"\|"hazard"` | `src/report/ReportSection.tsx` (extract `PmSection`) | `PostmortemReport.tsx` L176–224 |
| `LedgerList` / `LedgerRow` | list: `children`, `zebra?`; row: `glyph?` (`aria-hidden`), `title`, `children`, `tone`, `category`, `href?`, `id?`, `meta?` (date/PR) | `src/report/Ledger.tsx` + `.arc-ledger*` classes in theme.css | `ChangelogViewer.ChangeRow` (L98–140), `InvoiceLedger` rows (L187–231) |
| `ReportColophon` | `children`, `as?="footer"` | `src/report/ReportColophon.tsx` | `EmailShell` footer; PostmortemReport footer (L866–881) |
| `NotchedFrame renderer="css"` | `renderer?: "svg"\|"css"` — css = two stacked `clip-path: polygon(...)` layers driven by `--notch`/`--stroke`; no measurement, prints, SSR-safe | `src/primitives/NotchedFrame.tsx` + `.arc-notch` in theme.css | `.arc-btn-notch` (theme.css L412–415) already does a CSS chamfer |
| Tokens | eight `--cat-*`/`--cat-*-bg` pairs in both schemes; light-tuned `--signal-*`/`--accent` under `[data-arcane-scheme="light"]`; `@media (prefers-color-scheme: light) { :root:not([data-arcane-scheme="dark"]) }`; `@media print` (paper surfaces, no grid/glow/scanlines, `break-inside: avoid` on rows, `@page` margins) | `src/theme/theme.css` | light block L100–119; PostmortemReport `PAPER` palette shows the print intent but hard-codes hex |
| `ssr.ts` fix | add `"data-arcane-scheme": theme.colorScheme` | `src/theme/ssr.ts` L28–35 | `attribute-applier.ts` L16 already writes it client-side |
| Hygiene | define `--ink-25`, `--ink-08/-8`, `--ink-04`, `--f-num`, `--bg-0` or replace them; `.arc-btn--sm/--lg/--secondary`, `.arc-seg__opt--active` rules | theme.css | audit in Q2 |
| Stories/tests | `src/stories/report.stories.tsx`; `test/report/*.test.tsx`; axe entries for every report component | per `.github/copilot-instructions.md` L23–26 | `test/a11y/a11y.test.tsx` harness L32–50 |

**Where the generator lives — a dependency question, not a rendering one.** `arcane-cli` (`X:\…\arcane\package.json`) is public MIT, `type: module`, deps `@inquirer/prompts, chalk, commander, gradient-string, yaml` — no React; its generation precedent is `src/modules/diagram-generator.ts` (pure function, called from `src/commands/status.ts` L111–130). `@codemagician/arcane-ui` is proprietary on a private Azure feed (DECISIONS.md ARCUI-002). A public package cannot depend on a private one, so the renderer cannot be an ordinary `arcane-cli` dependency. Options, in my order: (1) ship the renderer **inside arcane-ui** as a subpath export + bin (`@codemagician/arcane-ui/report`, `arcane-ui-report <ledger.json> --out report.html`), with `react`/`react-dom` as peers already declared; the spell invokes it where the feed is authenticated; (2) a small private sidecar package; (3) arcane-cli ships only the data contract (`ledger.json` schema) and an optional `--renderer` dynamic import. Either way, `ledger.json` (masthead, stats, categories, phases[items]) is the interface — the two hand-built pages already share one content model.

**Translating the editorial ledger into the chamfered HUD without losing readability.** Rule of thumb: *frames and labels speak HUD; the 40 rows speak prose.* Concretely: (1) chamfer only the containers — the stat rail panel and each phase's ledger panel (`HUDPanel`, `notch` 8–10, `variant="tl-br"` for a quieter silhouette); no frame per row. (2) Header strips carry the HUD voice: `code` slot for the phase id (`PHASE 02 · BC-00–32`), `.arc-eyebrow` mono caps at 10–11px, status dot only where it means something (all rows shipped → `status="ok"` once, on the masthead). (3) The rule under a section is a thin `HazardStripe` (`height={4}`, `opacity .5`) — the library's own signature (StatTile L87–99, IDPlate L32–38, PostmortemReport L255–267) — not a hairline. (4) Row text stays in `--f-ui` (Rajdhani) at 14–15px, sentence case, `max-width: 58–62ch`; titles 600 weight; **no `text-transform: uppercase` on rows** — override the global `h1–h4` rule inside `.arc-report` (`text-transform: none; letter-spacing: 0`) for the page title and phase headings, and keep uppercase for eyebrows/pills only. (5) Rhythm for a long list: zebra `--bg-2`, dashed `--ink-15` separators (InvoiceLedger/PostmortemReport idiom), 26% / 1fr / auto grid as in the hand-built page, pills right-aligned in `arc-pill` with categorical tones. (6) Keep `glow: 0` (default) and `grid: "none"` — glow halos and the dotted body grid are cockpit texture; on a 40-row document they are noise and a repaint cost. (7) Emoji glyphs stay (they are the ledger's wit) but `aria-hidden`, fixed-width column so titles align.

### Q5 — Accessibility and performance

**axe coverage [checked: `test/a11y/a11y.test.tsx`].** 19 checks via `vitest-axe`, each wrapped in `<ArcaneProvider persistTo="none"><div id="root">` (L32–38): Button ×3, Toggle, Segmented, Slider, KeyCap, **HUDPanel**, ProgressBar, **StatTile** (`value="12ms"` — the count-up path is not exercised), **Badge**, Modal, Tooltip, FormField+TextField, Checkbox, Select, LoadingState, EmptyState, ErrorState. Of what the report would use: HUDPanel, StatTile, Badge are covered; `CodeTag`, `KPIHex`, `IDPlate`, `HazardStripe`, `CornerTicks`, `DashLine`, `NotchedFrame` are not; none of the proposed report components exist yet. Two caveats: (i) axe under jsdom cannot evaluate `color-contrast` (no layout), so contrast is unverified by the suite — I measured it numerically below; (ii) `README.md` L19 / `copilot-instructions.md` L27 tell agents to commit with `--no-verify`, so the a11y suite is CI-only. A report-page-level check should run axe on the *rendered HTML* (e.g. `@axe-core/cli` or Playwright) once per generated file — that is where heading order and landmark rules bite, not in component tests.

**Contrast, measured from the actual token values (WCAG 2.1 ratios):**
- Dark scheme text on `--bg-1 #060708`: `ink-100` 20.2, `ink-80` 13.6, `ink-60` 9.9, `ink-50` 6.6, `ink-40` 5.6 (AA), `ink-30` 3.6 (large text / UI only), `ink-20` 2.8, `ink-15` 1.9 (borders only). Signal on dark: ok 14.1, warn 11.5, alert 5.7, info 13.4 — all AA.
- Light scheme text on `--bg-1 #e4eaef`: `ink-60` 6.3 AA, **`ink-50` 4.36 — fails AA for normal text** (eyebrows/labels at 9–11px use `--ink-50` throughout: `.arc-eyebrow` L241, StatTile description L133, CodeTag L33), `ink-40` 3.0. **Signal/accent on light: ok 1.18, warn 1.45, alert 2.93, info 1.25, accent-mono 1.21, violet 2.24, teal 1.53 — all fail**, because the light block (L100–119) never retunes them. A `Badge status="ok"` in light mode is unreadable; the light scheme is not shippable for pills until a light-tuned signal set lands.
- The hand-built ledger is not clean either: `--ink-faint #8a8fa3` on `#eef0f4` = **2.81** (stat labels, phase notes, colophon) and the `spell` pill `#b8802e` on `#f6ead6` = **2.86**; `feature`/`governance`/`fix`/`process`/`docs` pills sit at 3.8–4.5 (pass only as large/bold text at ≥ 14px bold; they are 0.7rem). Dark variants pass (5.3–6.8). The new `--cat-*` tokens must be chosen against 4.5:1 on their pill backgrounds in **both** schemes.

**What the page must do for WCAG 2.1 AA:**
1. `<html lang="en">`; one `<h1>` (masthead title); one `<h2>` per phase; no skipped levels; a `<main>` landmark; `<footer>` for the colophon. The hand-built pages have this structure except landmarks are `div.page`.
2. The ledger as `<ol>` of `<li>` (or a `<table>` with `<th scope="col">` — defensible with three columns; I prefer `<ol>` because row titles read as items, not cells). `DataTable` is a `<table>` but adds dead controls.
3. Colour is never the only signal: pills carry the category **text** (keep this); legend swatches are `aria-hidden` next to visible labels; emoji glyphs `aria-hidden="true"` (today "⚖️" is announced as "balance scale" before every title); status dots in `HUDPanel` already have `role="img" aria-label` (L101–109).
4. Stat rail as `<dl>` (`<dt>` label / `<dd>` value) or `aria-labelledby` pairs; `StatTile` today renders unpaired `div`s.
5. Text sizes: body/description ≥ 14px (`--f-ui`), titles 15–16px 600; the library's 9–10px mono eyebrows are acceptable only for non-essential labels; nothing essential below 12px.
6. Contrast per the numbers above: in dark, text ≥ `--ink-50`, borders `--ink-15/20`; in light, text ≥ `--ink-60`, and no `--signal-*`/`--accent` text until retuned.
7. Motion: none in A′; theme.css already honours `prefers-reduced-motion` (L369–377) and `data-arcane-motion="reduced"` (L152–158).
8. Focus: the only focusables are links (PR/ADR refs in rows, colophon) — give `.arc-report a:focus-visible` a 2px `--accent` outline; do not inherit `.arc-input { outline: none }` habits (L430).
9. Print stylesheet: `@media print { :root { light paper tokens } body { background: none } .arc-report { max-width: none } li { break-inside: avoid } h2 { break-after: avoid } a[href^="http"]::after { content: " (" attr(href) ")" } }` plus `@page { margin: 16mm }`; drop the dotted grid/scanlines/glow; PostmortemReport's `mode="print"` shows the intent but hard-codes hex — tokens should do it.
10. Fonts: Google Fonts `<link>` with `display=swap` and real fallbacks (`system-ui`, `ui-monospace`); `text-wrap: balance` on the title is fine.

**Performance budget for the single file.** Target **≤ 100 KB raw / ≤ 25 KB gzip** excluding web fonts, **0 KB runtime JS**, no layout dependence on JS (first paint is final paint), ≤ 3 font requests, ≤ 2 families; hard ceiling 150 KB raw (the host's 16 MB limit is irrelevant — this is a page someone opens on a phone from a Slack link). Where the bytes go today and what to cut, in order of yield:
1. **The React runtime** — A → A′ removes 143–205 KB (measured). Nothing else comes close.
2. **Inline-style repetition** — 40 × 609 = 23.8 KB of `style="…"` if rows come from inline-styled components; class-based `LedgerRow` makes it 15.0 KB and gzips far better (repeated class names vs. repeated declarations). This is the argument for adding `.arc-ledger*` CSS to theme.css rather than another inline component.
3. **theme.css** — inline the 8.9 KB subset, not the 24.4 KB file (keyframes, buttons, inputs, tabs, scrollbar rules are dead weight on a document).
4. **Fonts** — Rajdhani 400/600 + JetBrains Mono 500 (Chakra Petch only if the display face matters more than one request; system-ui otherwise). Do **not** embed woff2 as data: URIs (hundreds of KB per family) unless a headless-PDF pipeline demands offline fonts; then subset to Latin.
5. **Paint** — no `.scanlines` (two `position: fixed` full-viewport pseudo-elements), no body gradient grid, `glow: 0`; 40 rows of `box-shadow` glows repaint on every scroll frame on low-end devices.
6. **SVG** — with `renderer="css"` chamfers there is no per-panel SVG; keep `HazardStripe` as a gradient, not an image.
Projected A′ page with the proposals landed: ~9 KB CSS + ~15 KB rows + ~5 KB masthead/sections + ~2 KB adapters ≈ **32–40 KB raw, ~8–10 KB gz** — on par with the 23 KB hand-built page while being generated from the design system.

---

## Sources

**arcane-ui clone** (the read-only shallow clone of `arcane-ui`):
- `src/index.ts`; `package.json`; `tsup.config.ts`; `tsconfig.json`; `vitest.config.ts`; `.npmignore`; `scripts/copy-css.ts`; `.ladle/components.tsx`; `.ladle/config.mjs`
- `src/theme/theme.css`; `src/theme/ArcaneProvider.tsx`; `src/theme/attribute-applier.ts`; `src/theme/persistence.ts`; `src/theme/ssr.ts`; `src/theme/types.ts`; `src/theme/useArcaneTheme.ts`; `src/theme/ThemeToggle.tsx`
- `src/primitives/HUDPanel.tsx`; `NotchedFrame.tsx`; `BracketFrame.tsx`; `CornerTicks.tsx`; `TickRule.tsx`; `DashLine.tsx`; `HazardStripe.tsx`
- `src/data/StatTile.tsx`; `Badge.tsx`; `CodeTag.tsx`; `KPIHex.tsx`; `IDPlate.tsx`; `DataTable.tsx` (L10–90, L253–297)
- `src/motion/Reveal.tsx`; `CountUp.tsx`; `Stagger.tsx`; `src/hooks/useInView.ts`; `src/hooks/useCountUp.ts`
- `src/controls/Button.tsx`; `Segmented.tsx`; `src/utils/cn.ts`; `src/brand/ArcaneSeal.tsx`
- `src/print/PrintDocuments.tsx`; `src/postmortem/PostmortemReport.tsx`; `src/changelog/ChangelogViewer.tsx`; `src/billing/InvoiceLedger.tsx`; `src/telemetry/AuditLog.tsx`; `src/help/StatusPage.tsx`; `src/email/Email.tsx`; `src/spells/SpellCatalogue.tsx` (L1–260); `src/marketing/Marketing.tsx` (exported signatures via grep)
- `src/stories/data.stories.tsx`; `src/stories/primitives.stories.tsx`
- `test/setup.ts`; `test/a11y/a11y.test.tsx`; `test/data/StatTile.test.tsx`; `test/primitives/HUDPanel.test.tsx`
- `build/meta.json`; `test-ladle-build/meta.json`
- `README.md`; `DECISIONS.md`; `TODO.md`; `AGENTS.md`; `.github/copilot-instructions.md`; `ai-context/system-prompt-context.md`; `spec/HANDOFF.md`; `CHANGELOG.md` (grep for font/light/scheme/print/a11y)
- Whole-tree greps over `src/` (excluding `stories/`): `.css` imports; column-0 DOM-global references; `useEffect/useLayoutEffect/useState` counts; `var(--…)` token usage vs. `theme.css` definitions; `arc-*` class references vs. `theme.css` selectors.

**Operator's arcane-ui working copy** (the operator's local `arcane-ui` working copy, read-only): `dist/index.js`, `dist/index.d.ts`, `dist/theme.css`, `dist/tokens.css` (sizes); `node_modules/{react,react-dom,esbuild,tsup,@ladle/react,vitest-axe,axe-core}/package.json` (versions); `node_modules/react/cjs/*`, `react-dom/cjs/*` (sizes); `features/arcane-ui-scaffold/architecture.md`; `git log -1`, `git status`, `diff -rq src` against the clone.

**Arcane CLI repo** (this repository's root, read-only): `package.json`; `tsup.config.ts`; `src/` and `src/commands/`, `src/modules/`, `src/assets/` listings; `src/modules/diagram-generator.ts` (L1–55); `src/commands/status.ts` (grep for the diagram call site); greps for HTML/ledger generation (none found).

**Ledgers**: `…/scratchpad/become-current-ledger.html` (40 rows); `…/scratchpad/lessons-hardening-ledger.html` (17 rows).

**Other**: a local copy of the react and react-dom UMD production builds (used only to measure bundle size) (React 18.2.0 UMD sizes only).

**Probes executed** (all in-memory, no files written): esbuild `buildSync({write:false})` of `src/index.ts` (ESM/minified/CJS variants and a 10-component subset, with and without React bundled); CJS evaluation via `createRequire` against the working copy's `node_modules`; `renderToStaticMarkup` of HUDPanel, NotchedFrame, StatTile (both `animateIn` states and a string value), Badge (pill/tag), CodeTag, KPIHex, IDPlate, HazardStripe, Reveal, CountUp, Stagger, ThemeToggle (with/without provider), PostmortemReport (`print`), ChangelogViewer, DataTable (3 rows), Button, Segmented, `ArcaneRootAttributes()`; WCAG luminance-contrast computation over the token values; gzip sizing via `zlib`.
