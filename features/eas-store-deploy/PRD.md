# PRD: `spell-eas-store-deploy`

---
tracking:
  tracking_mode: internal
  external_provider: null
  adoWorkItemId: null
  githubIssueId: null
---

## Problem Statement

Two real dogfooding runs (a consumer Expo app's first-ever TestFlight build+submit, then a second run
taking a different consumer app through Google Play from zero listing to a live production release)
produced roughly 30 hard-won, non-general-knowledge lessons about the Expo/EAS Build + EAS Submit
pipeline and both stores' console behavior — captured as raw prose in `TODO.md` under T8, explicitly
marked "backlog only — do not write the spell content yet." Nothing in Arcane documents this pipeline
today, so every future EAS deployment either repeats the same mistakes or requires someone to
re-discover fixes already known and written down once.

T8's own "Doc/spell split precedent" note (added 2026-08-24, citing `spell-make-discoverable` +
`web-discoverability-standards.md` as the shape to follow) is explicit that this must not become one
big prompt inlining all 30 lessons: several already overlap `external-verification-standards.md`'s
`EV-01`-`EV-06` and should be cited by ID, not restated; the remaining store-specific material (Play's
track model, per-track country lists, IARC re-render, locale mismatches, and related durable platform
facts) is "a genuine third candidate for its own governance doc," with the spell staying the thin,
runnable workflow layer on top.

## Target Users

Any Arcane-consuming repo shipping an Expo app to the Apple App Store and/or Google Play via EAS Build +
EAS Submit — from a first-ever submission (needs the one-time setup in full) to a routine repeat release
(needs the short repeat-deployment path plus the known-pitfalls list close at hand).

## Requirements

### Must Have

- **One new governance doc**, `mobile-release-standards.md`, holding the store-specific durable facts
  that have no home in either existing standards doc — platform/console behavior that would be true
  regardless of which build tool produced the binary (Play's track model, per-track country lists, the
  IARC re-render trap, cross-store data-safety consistency, locale-list mismatches, reviewer-access
  constraints, the "no deobfuscation file" warning, Play Store signing-certificate opacity, Android
  OAuth client scoping, the D-U-N-S-sourced developer address, binary permission auditing, notification
  icon requirements, and the native `AlertDialog` button cap). Each fact gets a stable `MR-nn` ID and
  prose depth matching `external-verification-standards.md`'s existing rules (what happens, why, the
  fix) — not a one-line summary.
- **One new spell**, `spell-eas-store-deploy`, following the `spell-dotnet-expert` stack-expert shape
  (reference content + a short workflow) rather than `spell-make-discoverable`'s audit/apply/verify
  phase machine — this spell is a runbook for a build+submit pipeline, not an auditor of an already-live
  property. Structure: a shared EAS preamble (the ~80% common to both stores — `eas.json` profile
  shape, remote-managed credentials, build-number handling, OTA rules) plus one section per store
  (initial one-time setup → repeat deployments → known pitfalls, in that order, per T8's own required
  ordering), plus a cross-platform-lessons section.
- **Placeholders for every app-specific value** (bundle identifier, Apple Team ID, App Store Connect App
  ID, Apple ID email, EAS project ID/slug, Android package name, org name) resolved via `.arcane.json` /
  frontmatter / existing project config, or asked — never assumed — reusing `spell-make-discoverable`'s
  exact placeholder-resolution rule (D8).
- **Cite `EV-01`-`EV-06` by ID wherever a lesson overlaps them, never restate them**: the Play Console
  synthetic-input drop (`EV-01`/`EV-03`), the bundler-cache-vs-`EXPO_PUBLIC_*` pipeline-green trap
  (`EV-02`), reading the actual installed signing certificate rather than inferring it (`EV-01`), and
  observed review latencies as an instance of propagation lag rather than failure (`EV-06`).
- **A `Context files` section** naming both governance docs, cited-by-ID-only, with the same
  graceful-degradation behavior `spell-make-discoverable` already established: if a doc isn't installed,
  the spell still runs, citing `MR-nn (rationale unavailable — install the standards doc)` instead of
  linking to it.
- Registered in `registry.ts` under the existing `spells-build` component (already the home for the
  other stack-expert spell, `spell-dotnet-expert`, and for release/deployment-flavored spells like
  `spell-ship` — no new component needed).

### Should Have

- Nothing beyond Must Have for this iteration — see Won't Have.

### Won't Have (this iteration)

- **`-ios`/`-android` sibling split.** T8's own text: "split into siblings only if [one prompt] proves
  unwieldy in practice" — no evidence of that yet; ship as one prompt first.
- **Local Xcode / Xcode Cloud / Fastlane coverage.** T8 deliberately scopes this to the EAS Build + EAS
  Submit tech stack only, for concreteness and copy-pasteability.
- **Fixing MR-rule-adjacent items with no durable-platform-fact shape.** Several raw lessons are EAS/
  Expo-tool-specific bugs and workarounds (the `EXPO_NO_CAPABILITY_SYNC=1` env var, re-running a build
  after `expo-updates` auto-installs, retrying a transient ASC API-key-creation error) rather than
  platform truths — these stay as spell content (Known Pitfalls), not governance rules, since they
  describe EAS's own current behavior, not something durable about Apple's or Google's platforms.
- **A dogfooding re-run as part of this epic.** The lessons already come from two real dogfooding runs;
  this epic formalizes them, it doesn't re-verify them live (no consumer app / Apple or Play account is
  available in this repo's own CI to dogfood against).

## Constraints

- **D8:** placeholder-resolution rule, the rule-ID-citation-with-graceful-degradation pattern, and the
  `Context files` section shape are all reused verbatim from `spell-make-discoverable` — not
  reinvented.
- **Technical:** new files only — `src/assets/.arcane/governance/mobile-release-standards.md`,
  `src/assets/.github/prompts/spell-eas-store-deploy.prompt.md` + its `.claude/commands/` stub,
  `registry.ts` component + `spells-build` membership entries, root dogfood copies via
  `fix:self-host-parity`, `docs/spell-catalog.json` + README regeneration via `fix:spell-catalog`
  (BC-23's own gate — a new spell is exactly the drift case it exists to catch).
- **Version bump:** minor — a brand-new spell is new distributed capability, matching this session's
  established convention (BC-18 `spell-sync-pull-request`, BC-21 `spell-scry`), not a patch.

## Acceptance Criteria

- [ ] `mobile-release-standards.md` exists with `MR-01` through the full set of durable store-specific
      facts identified above, each with rule-index-table + full prose, matching
      `external-verification-standards.md`'s depth and structure.
- [ ] `spell-eas-store-deploy.prompt.md` exists, covers both stores in the required order (initial
      setup → repeat deployment → known pitfalls) plus a shared preamble and cross-platform-lessons
      section, cites `EV-nn`/`MR-nn` by ID only wherever they apply, and never inlines a rule the
      governance docs already state.
- [ ] Registered in `registry.ts`'s `spells-build` component; `docs/spell-catalog.json` and README's
      catalogue block regenerate cleanly via `fix:spell-catalog` with no manual edits needed.
- [ ] `check:self-host-parity`, `check:adr-references`, `check:spell-catalog`, and the full test suite
      stay green; any hardcoded spell/component count elsewhere in `test/` is found and bumped in this
      same PR.
- [ ] Version bumped minor.

## Dependencies

- `external-verification-standards.md`'s existing `EV-01`-`EV-06` (cited, not restated).
- `spell-make-discoverable.prompt.md` (the placeholder-resolution and rule-citation pattern reused).
- `registry.ts`'s existing `spells-build` component (joined, not replaced).

## Open Questions

- None blocking. Whether the new `mobile-release-standards.md` rules ever need their own dedicated
  consuming spell beyond `spell-eas-store-deploy` (e.g. a future native-build troubleshooting spell) is
  left for real evidence to decide, not designed speculatively now.
