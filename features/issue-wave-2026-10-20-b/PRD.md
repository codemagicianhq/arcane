# PRD: Issue Wave 2026-10-20 B — the EAS update lifecycle (#376) and a visual-verification routine (#375)

---
tracking:
  tracking_mode: internal
  external_provider: null
  adoWorkItemId: null
  githubIssueId: null
status: approved
created: 2026-10-22
approved_by: operator (payini), 2026-10-20, the two-wave triage plan (Wave B is #375 and #376, to start after PR #379 merged); the choices inside this PRD (where #375 lives, the two release-gate rules) were made by the executing session under that approval and are named for the operator in the pull request
---

Related: [[development-methodology]] (the Spell Loop this runs through), [[git-conventions]] (branch, PR
and merge rules), [[spell-authoring-standards]] (the bar the edited spells are held to). Wave A, the code
half of the same triage, is `features/issue-wave-2026-10-20/`
([PR #379](https://github.com/codemagicianhq/arcane/pull/379), 1.12.2).

## Problem Statement

Two open issues ask for spell content the shipped spells do not carry. Both were checked against the
current source on 2026-10-22 (`main` at `b4155f3`, version 1.12.2) before this document was written;
nothing that landed since they were filed addresses either.

- **#376** (filed 2026-10-18). A consumer session shipped a store release of an Expo app with
  `runtimeVersion.policy: appVersion`, then found that phones on five earlier store versions had stopped
  receiving OTA updates for weeks with no error anywhere, that one of those runtimes was crash-looping on
  an update published from a checkout with a different native SDK, and that two production iOS binaries
  crashed at launch because the self-hosted build Mac's Xcode had updated itself.
  `spell-eas-store-deploy` is scoped to EAS Build and EAS Submit (its Executive Summary), so none of this
  had guidance. Its OTA/native alignment rule (#298, Cross-platform lessons) keeps an update published
  from trunk aligned with the binaries in use; it says nothing about runtimes left behind by a new store
  version. `mobile-release-standards.md` (MR-01 to MR-14: tracks, consoles, signing, binary specifics)
  has no release gate for either failure.
- **#375** (filed 2026-10-14). The sign-in result pages' blank-page defect (a 426 KB page cut short,
  found while testing [PR #360](https://github.com/codemagicianhq/arcane/pull/360)) showed only in a real
  browser while every test passed, and a design lab opened from disk showed garbled characters until it
  was served with a charset. No spell has a routine for checking an HTML or UI deliverable in a browser:
  `spell-test` runs suites and coverage, and `testing-standards.md` asks for "Manual verification for UI
  stories (screenshot or recording)" at QA → Resolved without saying how.

## Users

Every Arcane consumer whose assistant ships an Expo app through EAS (#376) or builds anything a browser
renders (#375), and the operator who reads the result.

## Requirements

### Must Have

- **R-376-1 — OTA lifecycle and stranded runtimes.** `spell-eas-store-deploy` gains a lifecycle section.
  Its first part makes "audit the live runtimes" a release step, the first of every repeat deployment:
  the store versions still in use, listed from each store console's release history rather than from the
  updates or a page of recent builds, each version's runtime and commit, the phones still on each, and
  each judged as it will stand once the release ships, with the result in the release report. It states what happens when an update is published to an old runtime from a checkout whose
  native dependencies differ from that binary, pointing to #298's alignment rule rather than restating
  it, and how to stop a crash loop before any backport (republish the last good update, or roll back to
  the embedded bundle). It gives the backport recipe for reaching a stranded runtime: find the commit that
  runtime runs, branch from it, add only the files needed and only primitives that binary has, build the
  workspace libraries and typecheck against that tree, publish from that git branch to the store channel
  with the store build's environment and the operator's go-ahead (never `--auto`), prove the published
  `runtimeVersion`, `gitCommitHash` and EAS branch by reading the update back, and keep the git branch
  publish-only, never merged.
- **R-376-2 — A store update prompt pattern.** Part 2 carries the issue's design: per-platform "latest"
  and "minimum" versions held server-side, editable by an operator, empty by default; the client sends its
  platform and version and gets `ok`, `update` (an invitation with "not now", snoozed a few days) or
  `required` (a screen with only an update button, uncloseable); clients send platform and version as
  request headers from the release that introduces them, and the API answers 426 to anything below the
  minimum except the version-check endpoint itself, while clients that send no headers pass; the prompt is
  mounted outside the app's error boundary; the mandatory screen is worded as something new, not something
  broken; and the prompt is backported to every stranded runtime.
- **R-376-3 — Toolchain pinning for self-hosted build agents.** Part 3, for any machine running
  `eas build --local` whose Xcode can change between builds (a self-hosted Mac, or a hosted runner whose
  default Xcode moves with its image): the Xcode is pinned per build with `DEVELOPER_DIR`, installed beside
  any newer Xcode as `/Applications/Xcode-<version>.app`; a guard step fails the run when that path is
  missing or `xcodebuild -version` reports another version, and avoids `xcodebuild -version | head -1`
  under `pipefail` (SIGPIPE, exit 141); the guard's result is read in the build's own run before a store
  build goes on; the pin moves only with the EAS build image the build profile selects, read from an
  EAS-built IPA's `DTXcode`, and never below what App Store Connect accepts; and when a store build crashes
  at launch while the same JavaScript runs fine via OTA, `DTXcode` and `DTSDKName` of the working and the
  crashing IPA are compared before any code is read, and the same commit is built in the EAS cloud to
  separate toolchain from code.
- **R-376-4 — When to set "latest".** Part 4: the server-side "latest version" is set per platform only
  when the store listing actually offers that version; the App Store's public lookup
  (`itunes.apple.com/lookup?bundleId=…`) can be shown beside the field as a reference, with a warning when
  the typed version is newer; Google publishes no equivalent, so Play is a manual check. The "minimum
  version" is raised only to a version every user can install now (on Play, once the production rollout
  reaches 100%) and that their devices' OS can run, since a minimum ahead of either locks users out.
- **R-376-5 — Release gates in `mobile-release-standards.md`.** Two new rules, each worded so it holds
  whatever tool built the binary or delivers its updates (the document's stated scope), each with its
  ARC-023 enforcement line, and each cited by ID from the spell: `MR-15` (every store version still in use
  needs an update path, audited before each store release) and `MR-16` (the Xcode of any build machine
  where it can change between builds is pinned, and the build fails when another one is active).
- **R-376-6 — Dated observations.** The consumer session's specifics this repository cannot re-check are
  recorded as dated observations, with an instruction to re-check them before relying on them, as #298's
  console specifics were on 2026-10-04.
- **R-375 — A visual-verification routine for HTML and UI deliverables.** `spell-test` gains a step that
  runs when the scope changes anything a browser renders: serve the page over local HTTP with the headers
  production sends, never `file://`, and check that it declares its character set; take headless captures
  at 1440, 390 and 320 px wide, in dark and in light, each with motion allowed and with reduced motion,
  after the animations settle; read the console for script errors and content-security-policy violations;
  compare before and after, like with like; keep the differing captures in the design record, never one
  that shows a secret or personal data, and none in a sensitive repository. The evidence template gains a
  block for it, and a story whose visual check did not run is not marked passing.

### Should Have

- A prose regression per requirement in `test/iw-2026-10-20-b.test.ts`, run red before each edit.
- The routine run once against a real page before it ships, so its instructions are tested, not only
  written.

### Won't Have (this iteration)

- **A new spell for #375.** A step in `spell-test` is the chosen home (architecture, D1). A separate spell
  would be a new name, three generated shims, a catalog entry and a minor release for a routine whose
  output is test evidence. Recorded as the alternative the operator can still choose.
- **A companion playbook file for #376.** The spell is extended in place (architecture, D2); a new
  distributable file would be a new component.
- **Any change to a spell's frontmatter `description` or `claude_description`**, so
  `docs/spell-catalog.json` and the generated shims' descriptions stay as they are.
- **Code or tooling for either issue**: no screenshot runner, no update-prompt implementation, no pipeline
  template. Both issues ask for guidance.
- **Re-testing the consumer session's device, console and server observations.** This repository has no
  Expo app, store listing or build Mac.
- **Pointing `testing-standards.md`'s QA → Resolved line at the new step.**

## Constraints

- Edit only sources under `src/assets/`; regenerate the root copies with `npm run fix:self-host-parity` and
  keep `npm run check:self-host-parity` at 100%.
- One version bump for the wave. Both issues update existing distributable files and add none, so by
  `spell-bump`'s table the bump is a **patch** (1.12.2 → 1.12.3).
- `mobile-release-standards.md` holds facts that are true "regardless of which build tool produced the
  binary" (its introduction). The new rules are worded that way and the EAS commands stay in the spell,
  which keeps the 2026-10-04 decision that expo-updates behavior belongs in the spell
  (`features/issue-wave-2026-10/architecture.md`, decision 4).
- `mobile-release-standards.md` is a `status: active` governance document, so it gets no new
  `{UPPER_SNAKE}` token (the runtime-placeholder test fails on one that is not in the list).
- Every anchor the existing tests rely on stays unique and in place: the #298 rule's bold lead, the
  Console automation section, the 2026-09-28 observations block, and the scope sentence "no local Xcode,
  Xcode Cloud, or Fastlane coverage" (`test/iw-2026-10.test.ts`, `test/eas-store-deploy.test.ts`).
- Vendor-neutral outside EAS itself (D2 Gold): the guard step is shell, not one CI system's syntax.

## Acceptance Criteria

| ID | Criterion | Evidence |
| --- | --- | --- |
| AC-376-1 | Part 1 makes the runtime audit a release step citing `MR-15`: the versions from each store console's release history (or the release tags), each version's runtime and commit from `eas build:list --platform <ios\|android> --app-version <version> --distribution store --status finished --json`, the phones from `eas channel:insights --channel <channel> --runtime-version <runtime> --days 30`, the latest update from `eas update:list --branch <eas-branch> --runtime-version <runtime> --limit 1 --json`, a local build's commit from its pipeline run or tag, and each runtime judged as it will stand once the release ships; both stores' repeat deployments start with it and the release report carries its result. It says what a misaligned publish to an old runtime does, pointing to the alignment rule, and how to stop a crash loop first; and it gives the backport recipe in order: `gitCommitHash` from `eas update:view <group-id> --json`, a git branch from that commit, only primitives that binary has, workspace libraries built before the typecheck, the operator's go-ahead, a publish with `--channel` and `--environment`, never `--auto`, from a committed tree, `runtimeVersion`, `gitCommitHash` and `branch` read back, publish-only and never merged. | `test/iw-2026-10-20-b.test.ts` |
| AC-376-2 | Part 2 contains the three server answers, the uncloseable required screen, the request headers with the 426 rule and both exceptions, the mount outside the error boundary, the "new, not broken" wording, and the backport to stranded runtimes. | same |
| AC-376-3 | Part 3 applies to any machine whose Xcode can change between builds and contains `DEVELOPER_DIR` with the side-by-side install path, a guard step that fails on a missing path or another version and cites `MR-16`, the `head -1` / `pipefail` / exit 141 warning, the guard's result read before a store build, the rule for moving the pin with the profile's build image (`DTXcode`, never below what App Store Connect accepts), and the `DTXcode`/`DTSDKName` comparison before reading code plus the cloud build of the same commit. | same |
| AC-376-4 | Part 4 contains the "only when the store listing offers it" rule, the rule for raising the minimum only to what every user can install (Play: rollout at 100%) and their devices' OS can run, the App Store lookup with the newer-version warning and its cache, and the manual Play check. | same |
| AC-376-5 | `mobile-release-standards.md` lists `MR-15` and `MR-16` in its rule index, each with its heading, its `**Rule (MR-nn):` line and an ARC-023 enforcement line; the existing index/body consistency tests pass; the spell cites both IDs. | `test/eas-store-deploy.test.ts`, `test/iw-2026-10-20-b.test.ts` |
| AC-376-6 | The four parts appear in the issue's order, and the consumer session's specifics sit in one dated observations block that says to re-check them. | `test/iw-2026-10-20-b.test.ts` |
| AC-375 | `spell-test` step 4a, between the acceptance-criteria step and the evidence step, carries local HTTP with production's `Content-Type` rather than `file://` and the declared-charset check, the 1440/390/320 px widths, dark and light, reduced motion, the animation wait and its fallback, the console read for script and CSP errors, the like-with-like before/after comparison and the new-page case, the design record (differing captures kept, the rest by hash, never a secret or personal data), the sensitive-repository exception and the not-run outcome; the evidence template has a Visual Verification block; a Rules line keeps a UI story open without it. No shipped section names an issue number. | `test/iw-2026-10-20-b.test.ts` |
| AC-ALL | Self-host parity 100%, the version-bump check, lint, typecheck, the full suite and every CI `check:*` gate pass. | CI on the pull request |

**Won't Have cross-check (`spell-plan` step 5a):** no criterion needs a new spell, a new file under
`src/assets/`, a description change, code, or a device re-test. AC-376-6 records the consumer specifics as
observations, so it does not depend on the excluded re-test.

## Corrections to the issue, on the record

Checks made on 2026-10-22 contradict four details of #376 as written. The spell follows the checks; the
issue's wording is kept where it is the consumer session's observation.

1. `eas update:list --branch <name>` lists update groups with their runtime version, platforms and message
   (eas-cli source, `update/utils.ts`); it has no device data, so it cannot show "every runtime that still
   has phones on it", and it lists only the most recent 25 groups unless `--limit` (at most 50) says
   otherwise, while a store version that never received an update has no group at all. The inventory
   therefore comes from the store consoles' release histories, each version's runtime and commit from
   `eas build:list --app-version <version> --distribution store` (a page of the newest builds, at most 50
   and TestFlight builds among them, is not an inventory either), and phones per runtime from
   `eas channel:insights --channel <name> --runtime-version <version>`, added in eas-cli 18.8.0
   (2026-04-22). Found by the independent review (R1, then N1 in its second pass) after the first draft
   followed the issue here.
2. `eas update:view <group>` prints `gitCommitHash` only with `--json`; its human-readable output has no
   commit line.
3. With `runtimeVersion.policy: appVersion`, each store version is its own *runtime*, not its own channel:
   the channel and branch stay the same, and an update reaches only phones whose binary has the same
   runtime version.
4. expo-updates' documented error recovery rolls an update back only when it crashes before its content
   first appears, and then does not launch that update again on the device; a crash after that point is
   not rolled back. The issue's "rolls back to the previous OTA on every launch" is recorded as the
   consumer session's observation, beside the documented behavior.

## Dependencies

None outside this repository. The architecture lists the outside facts the new text relies on and when
each was checked.

## Open Questions

None blocking. Where #375 lives is decided in the architecture (D1) and named in the pull request; if the
operator prefers a separate spell, that is a later minor release, not a change to this wave.
