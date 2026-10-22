# Architecture — Issue Wave 2026-10-20 B (#375, #376)

Related: [[PRD]] (the requirements this implements), [[spell-authoring-standards]] (the bar for spell
text), [[testing-standards]] (where UI verification sits in the QA lifecycle).

## Decisions

| # | Decision | Rationale |
| --- | --- | --- |
| D1 | #375 becomes step **4a, "Visual verification (HTML and UI deliverables)"**, in `spell-test`, between step 4 (acceptance criteria) and step 5 (the evidence template), plus a Visual Verification block in that template and a Rules line. Not a new spell, and not `spell-ship`. | The issue's failure is a suite claiming success while the page rendered blank; `spell-test` is where a story's evidence is produced and where `spell-full-cycle` Phase 4 runs. `spell-ship` comes after the evidence exists and checks that phases passed; it produces none. A separate spell would need a new name (`spell-scry`), three generated shims, a catalog entry and a minor release for a routine of about thirty lines whose only output is test evidence. A step is a patch. `spell-scry` was not run because no name is created. |
| D2 | #376 extends `spell-eas-store-deploy` in place with a new `## EAS Update lifecycle (both stores)` section, after the Shared EAS Preamble and before `## Apple App Store`, its four parts as `###` subsections in the issue's order. No companion file. | A companion file under `src/assets/` is a new component (a minor release) and a second place to look. The spell already holds the OTA rules the lifecycle extends (#298). The section serves both stores, so it sits with the preamble rather than inside either store's section; each store's Repeat deployments starts with its audit, and the release report carries the result. The spell grows from 310 to 493 lines; the existing structure tests keep their anchors. |
| D3 | Two rules join `mobile-release-standards.md` in a new `## Release gates` section: **MR-15**, every store version still in use needs an update path, inventoried from the store releases and audited before each store release as it will stand once the release ships; **MR-16**, the Xcode of any build machine where it can change between builds (a self-hosted Mac, or a hosted runner whose default Xcode moves with its image) is pinned. Both are worded without EAS: what persists is store versions on phones, OTA delivery keyed to a native compatibility version, and Xcode stamping its toolchain into a binary, which hold whatever tool built the binary or ships the updates. The spell cites them by ID and carries the EAS commands. | Meets #376's done-state ("references the runtime audit and the toolchain guard as release gates") inside the document's stated scope, and keeps the 2026-10-04 decision that expo-updates behavior belongs in the spell (`features/issue-wave-2026-10/architecture.md`, decision 4). |
| D4 | Enforcement modes (ARC-023). MR-15: a structured spell gate, because the runtime audit is the first step of both stores' repeat deployments and its result goes into the release report. MR-16: a structured spell gate, because before a store build on such a machine the spell reads the guard's result in that build's own run and stops on a missing or failed guard; the guard itself is the consumer's executable check. Lifecycle parts 2 and 4: explicitly advisory prose, said in the section, because the prompt and the server-side fields are the consuming app's code. `spell-test` 4a: a structured spell gate through the spell's Rules (no story with a rendered deliverable passes without 4a's result). | Every new normative statement declares its mode where it stands, and each gate names the observable state it reads (the first draft overclaimed MR-16; review R4). |
| D5 | The consumer session's specifics (five stranded store versions, the crash-looping runtime, the Xcode self-update, the 426 behind the error boundary) go into one dated block, "Observed in one consumer session (reported 2026-10-18), not re-verified since", at the end of the lifecycle section. Facts this session checked go into the rules themselves and into the evidence list below. Distributed text names no issue number, because `#376` would mean the consumer's own issue once installed. | The discipline #298's console specifics followed on 2026-10-04. |
| D6 | The spell follows the checks where #376's wording disagrees with them (PRD, "Corrections to the issue"): runtimes come from `eas update:list`, phones per runtime from `eas channel:insights`; `gitCommitHash` comes from `eas update:view --json`; each store version is its own runtime, not its own channel; expo-updates' documented rollback is described as documented, and the issue's description stays as the consumer's observation. | Working protocol rule 3: a check that contradicts a claim changes the claim on the record. |
| D7 | The spell's scope line names EAS Update beside EAS Build and EAS Submit (it already carried OTA rules), and keeps "no local Xcode, Xcode Cloud, or Fastlane coverage" word for word, followed by one new sentence: the only local toolchain it touches is a build machine running `eas build --local`, and only to pin it. | `test/eas-store-deploy.test.ts` pins the phrase, and the machine in part 3 still builds with EAS Build. |
| D8 | One new placeholder, `{XCODE_VERSION}`, in the spell's Placeholders table with its resolution rule (the Xcode of the EAS build image the build profile selects, `build.<profile>.ios.image` or the SDK's default, read from an EAS-built IPA's `DTXcode`, never below what App Store Connect accepts; ask if no such IPA exists). The governance document gets angle-bracket examples only. | D2 Silver for spells (every placeholder resolves or asks); the runtime-placeholder list governs `status: active` governance documents and is not extended. |

Phase 1.5 (enchant) was skipped: the product-excellence scorecard grades user-facing product features.
For this wave's text, the dimension that applies, Requirements Completeness, is at Silver or above
(every requirement has a testable criterion, priorities and a Won't Have list are set, dependencies and
open questions are stated).

## Components touched

| Path | Change |
| --- | --- |
| `src/assets/.arcane/governance/mobile-release-standards.md` | Executive Summary bullet; rule index rows MR-15 and MR-16; new `## Release gates` section; introduction names the third source session. |
| `src/assets/.arcane/spells/spell-eas-store-deploy.md` | Executive Summary (scope note, lifecycle bullet); `{XCODE_VERSION}` placeholder; new `## EAS Update lifecycle (both stores)` section with four parts, the dated observations block and the section's enforcement line. |
| `src/assets/.arcane/spells/spell-test.md` | Executive Summary bullet; step 4a; Visual Verification block in the evidence template; a Rules line. |
| Root copies and shims | Regenerated by `npm run fix:self-host-parity`, never edited by hand. |
| `test/iw-2026-10-20-b.test.ts` (new) | One describe block per story, red before each edit. |
| `CHANGELOG.md`, `package.json`, `package-lock.json` | 1.12.3. |

## Testing strategy

- `test/iw-2026-10-20-b.test.ts` uses `test/helpers/prose.ts` (`expectProseToContain`, `blockContaining`,
  `expectNotNegated`), so assertions survive re-wrapping. Each describe block is run red against the
  unchanged files before its edit and green after it.
- `test/eas-store-deploy.test.ts`'s rule-index consistency tests cover MR-15 and MR-16 with no change;
  `test/iw-2026-10.test.ts` keeps its anchors in the edited spell; `test/up02-d-runtime-placeholders.test.ts`
  guards the governance document's tokens.
- The visual-verification routine is run once before it ships: on `src/assets/sign-in/*.html`, served over
  local HTTP with the production security policy, with Playwright 1.63 (already in this machine's npx
  cache, with its Chromium). No page changes in this wave, so the captures stay outside the repository;
  their counts and the console result go into the IW-375 evidence.
- The full suite and every CI `check:*` gate run at integration; CI on the pull request is the final gate.

## Evidence checked on 2026-10-22

- eas-cli source on `main`: `update/list.ts` (`--branch`, `--runtime-version`, `--json`, `--limit`
  defaulting to 25, at most 50), `update/utils.ts` (the human-readable update-group labels have no commit;
  the JSON carries `gitCommitHash`, `runtimeVersion` and `branch`), `update/view.ts` (`--json`,
  `--insights`), `channel/insights.ts` (`--channel` and `--runtime-version` both required) with
  `insights/timeRange.ts` (`--days`, default 7), `channel/view.ts` (the branches and updates on a
  channel), `build/list.ts` (`--platform`, `--distribution store`, `--status finished`, `--app-version`,
  `--runtime-version`, `--limit` up to 50 with `--offset` paging, `--json` printing build fragments that
  carry `runtime.version`, `appVersion` and `gitCommitHash`), `build/view.ts` (`--json`),
  `update/index.ts` (`--channel`, `--branch`; `--auto`, which takes the EAS branch from the current git
  branch; `--environment`, which alone loads the server-side environment variables, implies a cleared
  cache, and is required for Expo SDK 55 or later outside CI), `update/republish.ts` (`--group`) and
  `update/roll-back-to-embedded.ts` (`--channel`, `--runtime-version`). The eas-cli changelog dates
  `channel:insights` and `update:view --insights` to 18.8.0 (2026-04-22); the current release was 25.3.0
  (2026-10-20).
- expo-updates' error-recovery documentation (docs.expo.dev/eas-update/error-recovery): a crash before
  the update's content first appears rolls back to the most recent update that launched successfully and
  marks the failed one so it is not launched again on that device; once content has appeared, there is no
  rollback.
- The App Store lookup, called for a public app: `resultCount` 1 with `results[0].version`; `resultCount`
  0 for an unknown bundle ID; the default storefront is the United States (`apps.apple.com/us/…`), and
  `&country=mx` or `&country=jp` returns that storefront; `Cache-Control: max-age` read 8,683 s (about 2.4
  hours) in this session and 18,368 to 51,457 s (about 5 to 14 hours) for four apps in the review's check,
  counting down per resource.
- Playwright's `page.emulateMedia` takes `colorScheme` (since 1.9) and `reducedMotion` (since 1.12); the
  1.63 type definitions carry `page.screenshot({ fullPage, animations, mask })`, `page.clock`,
  `page.on("console")` and `page.on("pageerror")` (the review's check).
- WHATWG HTML, "Specifying the document's character encoding": the element carrying the declaration
  "must be serialized completely within the first 1024 bytes" of the document. Hosted macOS
  runners move their default Xcode with their image (actions/runner-images issues 14001, 14172, 14344 and
  14165, read by title in the review), which is why MR-16 covers them.
- `set -o pipefail; yes | head -1` exits 141 in bash; `read -r first_line <<< "$output"` takes the first
  line of a captured output with no pipe; the review ran the guard against a stub `xcodebuild` in Git Bash
  (unset, missing, matching, mismatched, failing and silent cases) with the expected exits. `DTXcode`
  encodes the Xcode version as zero-padded digits without dots (Chromium's `sdk_info.py`), so Xcode 26.2 is
  `2620`.
- The independent review and its resolutions: `assessments/review-2026-10-22.md`.
