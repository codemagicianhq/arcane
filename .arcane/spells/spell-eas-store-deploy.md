---
name: Spell — EAS Store Deploy
description: Deploy an Expo app to the Apple App Store and Google Play via EAS Build + EAS Submit — one-time setup, repeat deployments, and the known pitfalls hit dogfooding both flows for real.
claude_description: Use PROACTIVELY when deploying an Expo app to the App Store or Google Play via EAS.
argument-hint: Which store(s) to deploy to (ios, android, or both) and whether this is initial setup or a repeat deployment
agent: agent
---

## Executive Summary

- This spell documents the **EAS Build + EAS Submit** pipeline end to end for both the Apple App Store
  and Google Play — initial one-time setup, repeat deployments, and known pitfalls, in that order, for
  each store.
- Roughly 80% of the material (credentials, `eas.json` profile shape, build-number handling, OTA rules)
  is shared between the two stores; only the store-console work genuinely diverges. Covered once in a
  shared preamble, then two store-specific sections.
- **Deliberately scoped to EAS Build, EAS Submit and EAS Update** — no local Xcode, Xcode Cloud, or Fastlane coverage.
  That scope is what keeps every step concrete and copy-pasteable. The only local toolchain it touches is
  a build machine running `eas build --local`, and only to pin it (EAS Update lifecycle, part 3).
- An **EAS Update lifecycle** section covers what a store release leaves behind and what surrounds it: the
  runtimes older store versions keep running, an in-app store update prompt, toolchain pinning for
  machines running `eas build --local`, and when to announce a version as the latest.
- Every lesson here was hit for real, across two dogfooding runs (a first-ever App Store submission, then
  a from-zero Google Play listing to a live production release) and a later consumer store release (the
  EAS Update lifecycle) — none is general knowledge restated.
- Durable, store-specific platform facts are documented once in
  [`mobile-release-standards.md`](../../.arcane/governance/mobile-release-standards.md) and cited here
  by `MR-nn` ID; verification discipline is documented once in
  [`external-verification-standards.md`](../../.arcane/governance/external-verification-standards.md)
  and cited by `EV-nn` ID. This spell does not restate either.

---

## Placeholders

Every placeholder below follows the same resolution rule: pull it from `.arcane.json`, the invoking
frontmatter, or the repo's own existing `app.json`/`eas.json`; if it is not resolvable from any of those,
**ask** — never assume. A wrong guess here produces a rejected submission or a build tied to the wrong
account, not a local mistake.

| Placeholder | What it is | Resolution rule |
| --- | --- | --- |
| `{IOS_BUNDLE_ID}` | The iOS bundle identifier. | Resolve from `app.json`'s `expo.ios.bundleIdentifier`; if unset, ask. |
| `{APPLE_TEAM_ID}` | The Apple Developer Team ID. | Resolve from `eas.json` or the Apple Developer account; if unset, ask. |
| `{ASC_APP_ID}` | The App Store Connect App ID (`ascAppId`). | Resolve from `eas.json`'s `submit.production.ios` block, or App Store Connect's own app record; if unset, ask. |
| `{APPLE_ID_EMAIL}` | The Apple ID email used to authenticate to App Store Connect. | Resolve from `eas.json`, or ask — never assume which Apple ID owns the account. |
| `{EAS_PROJECT_SLUG}` | The EAS project ID/slug. | Resolve from `app.json`'s `expo.extra.eas.projectId` or `eas init` output; if unset, ask. |
| `{ANDROID_PACKAGE}` | The Android application ID / package name. | Resolve from `app.json`'s `expo.android.package`; if unset, ask. |
| `{ORG_NAME}` | The Expo/EAS organization name, if the project belongs to one. | Resolve from `eas.json` or the EAS dashboard; if not applicable, omit. |
| `{XCODE_VERSION}` | The Xcode version a build machine running `eas build --local` is pinned to, as `xcodebuild -version` prints it (for example `26.2`). | Use the Xcode of the EAS build image the build profile selects (`build.<profile>.ios.image`, or the default image for the project's SDK): read `DTXcode` from an IPA EAS built with that profile (`2620` is Xcode 26.2), never one older than App Store Connect accepts for uploads; if no EAS-built IPA exists yet, ask. |

## Context files

- [governance/mobile-release-standards.md](../../.arcane/governance/mobile-release-standards.md) —
  every `MR-nn` rule cited below. Rules are **cited by ID only** in this spell, never restated. **If the
  file is not installed**, this spell still runs in full — findings just cite each check as `MR-nn
  (rationale unavailable — install the standards doc)` instead of linking to it.
- [governance/external-verification-standards.md](../../.arcane/governance/external-verification-standards.md) —
  every `EV-nn` rule cited below, cited by ID only. **If the file is not installed**, this spell still
  runs, and still re-reads actual state rather than trusting a console's own success signal — it just
  cites those checks as `EV-nn (rationale unavailable — install the standards doc)`.

---

## Shared EAS Preamble (both stores)

This section is common setup both stores' deployments depend on. Do it once.

### `eas.json` profile structure

```json
{
  "build": {
    "production": {
      "autoIncrement": true
    }
  },
  "submit": {
    "production": {
      "ios": {
        "appleId": "{APPLE_ID_EMAIL}",
        "ascAppId": "{ASC_APP_ID}",
        "appleTeamId": "{APPLE_TEAM_ID}"
      },
      "android": {
        "serviceAccountKeyPath": "./path/to/service-account.json",
        "track": "production"
      }
    }
  }
}
```

- `appVersionSource: "local"` (in `app.json`'s `expo` block) plus `production.autoIncrement: true` means
  build numbers auto-increment on every build — no manual version bump needed for a routine release.
- Credentials for both platforms can be **remote, EAS-managed** — no local Mac or Xcode required for iOS
  signing (Distribution Certificate, Provisioning Profile, Push Notifications key are all generated and
  held by EAS), and no local Android keystore file required either.

### Cross-platform lessons (apply to every release, either store)

- **Never ship a native rebuild while a submission is in review** just to carry a JS-only change — it
  can cost the queue position. Hold the change and ship it as an OTA update after the verdict lands.
- **A reviewer's first cold launch must already be correct.** A review build has to carry the work
  natively; it cannot rely on an OTA update being fetched, because of the next rule.
- **OTA updates apply on the next launch, not the current one** — the client downloads in the background
  and swaps on relaunch. Do not diagnose a "stuck" update until after two full quit-and-reopen cycles.
- **🔴 An OTA update must match the installed binary's native dependencies.** With
  `runtimeVersion.policy: appVersion`, expo-updates refuses an OTA only when the app version differs. A
  native dependency change merged to trunk before its binary ships is invisible to that check: an OTA
  published from trunk HEAD carries the new module's JavaScript onto binaries still running the old
  native code, and the publish reports success. **Bump the app version in the same PR as any native
  dependency change** (or move to a runtime-version policy that tracks native changes, such as
  `fingerprint`); that is the rule, because users keep running the old store build long after the new
  one ships. Until a bump lands, publish OTAs only from the last commit whose native dependency set
  (`package.json`, the lockfile and the app config's plugins) matches every binary still in use: in a
  pipeline, run the update job against that commit (for example with a `--commit-id <sha>` argument,
  where the pipeline takes one); from the CLI, run `eas update` from a checkout of that commit. Read
  `eas update`'s `Commit`, `Runtime version` and `Platform` lines, then prove the alignment by reading
  the published update back (`eas update:view <group-id> --json`, whose `gitCommitHash` and
  `runtimeVersion` name that commit and runtime; the human-readable view prints no commit), never from
  pipeline status or the publish step's own output alone (`EV-01`, `EV-02`).
- **🔴 Bundler transform caches do not key on `EXPO_PUBLIC_*` env vars.** On a persistent (self-hosted)
  build runner, the cache survives between runs, so an update published to one channel can ship
  another channel's inlined config — for example, a production build silently pointing at a development
  API. Pass `--clear-cache` on the publish lane, and verify by comparing the published `launchAsset`
  hashes across channels: identical hashes for two channels that differ by at least one env var is proof
  of the defect. **A green publish/build step is not evidence here (`EV-02`)** — assert against the
  actual published asset.
- **When a feature is removed or renamed, both stores' screenshots and descriptions are in the blast
  radius.** Store metadata outlives the code it depicts, and it's the first thing a reviewer opens.

### Console automation (both stores)

- **Every mutating save is verified by reloading the page and re-reading the saved state** — character
  counters, the attached-build row, draft fields — in Play Console and App Store Connect alike (`EV-01`).
  Both consoles can silently drop synthetic input (seen in Play Console; see its Known pitfalls), so a
  click that "succeeded" proves nothing.
- **Large uploads are a human step.** Browser-automation upload tools may cap file size below a release
  bundle (one observation below), so plan for it: the operator drags the artifact into the console's upload box, and the agent
  handles the rest of the page (release name, notes, review, submit).
- **The agent never types credentials.** When a console session expires mid-task, stop and ask the
  operator to sign in again, then re-read the page before continuing.

**Observed in one consumer session (2026-09-28), not re-verified since** — re-check against the live
console before relying on any of them: the session's upload tool capped files at 10 MB against a
~94 MB `.aab`; Play's default release name is `<versionCode> (<version>)`; Play release notes go
inside the listing's default-language tags (for example `<es-419>…</es-419>`); with managed publishing
off, "Submit for review" is the last human action and Google's approval publishes the release; an
expired App Store Connect session shows as a redirect carrying `authResult=FAILED`.

---

## EAS Update lifecycle (both stores)

A store release changes which phones an update can reach. This section covers what each release leaves
behind and what surrounds it, in four parts: the runtimes older store versions keep running (part 1, a
step of every store release), an in-app prompt that moves phones to the store (part 2, built into the app
once), the toolchain of a machine running `eas build --local` (part 3, set up once per machine and
checked before every store build), and when to announce a version as the latest (part 4, after the store
offers it).

### 1. OTA lifecycle and stranded runtimes

- **Audit the live runtimes before every store build (`MR-15`).** With `runtimeVersion.policy:
  appVersion`, every store version is its own runtime, and an update reaches only phones whose binary has
  the same runtime version: a phone that never installs the next store version receives nothing new,
  forever, with no error anywhere. List the store versions from each store console's release history (or
  the release tags, where every store release is tagged), then read, for each, its runtime and commit, how
  many phones it still has, and the last update it receives:

  ```bash
  eas channel:view <channel>
  # the EAS branch the store channel points to
  eas build:list --platform <ios|android> --app-version <version> --distribution store --status finished --json
  # one store version's builds, with runtime.version and gitCommitHash
  eas channel:insights --channel <channel> --runtime-version <runtime> --days 30
  # the phones on one runtime, running its embedded bundle or an update (eas-cli 18.8.0 or later)
  eas update:list --branch <eas-branch> --runtime-version <runtime> --limit 1 --json
  # the latest update group that runtime receives, if any
  ```

  A runtime that never received an update has no update group, `eas update:list` shows only the most
  recent groups (25 unless `--limit` says otherwise), and `eas build:list` returns at most 50 builds per
  page, newest first, with TestFlight and other test builds among them, so neither the update list nor a
  page of the newest builds can be the inventory. A binary built with `eas build --local` has no EAS build
  record: its commit comes from the pipeline run or tag that produced it. Judge each runtime as it will
  stand once this release ships: the version it replaces still receives updates today and stops receiving
  updates the moment the release is out. For each runtime that will still have phones and no update path,
  choose its route before the release ships: the backport recipe below, the store update prompt (part 2,
  backported the same way), or the operator's decision to leave it stranded, written into the release
  report.
- **Never publish to an old runtime from a checkout whose native dependencies differ from that binary.**
  This is the OTA/native alignment rule above (Cross-platform lessons), applied to a runtime that is no
  longer current. When it is broken, the publish succeeds and the phones on that runtime download an
  update that calls native code their binary does not have. expo-updates rolls an update back by itself
  only when it crashes before its content first appears, and then does not launch it again on that
  device; a crash after that point, such as a screen calling the missing module, comes back every time
  that screen is reached, until a corrected update is published to that runtime.
- **When a runtime is already crashing on a bad update, stop the damage first**, with the operator's
  go-ahead, since each command publishes to phones in production: republish that runtime's last good
  update group (`eas update:republish --group <last-good-group-id>`), or send the runtime back to the
  bundle embedded in its binary
  (`eas update:roll-back-to-embedded --channel <channel> --runtime-version <runtime>`). Then backport the
  fix.
- **The backport recipe for a stranded runtime:**
  1. Find the commit that runtime actually runs. The audit's `eas update:list` line names its latest update
     group, and `eas update:view <group-id> --json` gives that group's `gitCommitHash` (the human-readable
     view prints no commit). A runtime that never received an update runs the bundle embedded in its store
     build: take the `gitCommitHash` of that build's `eas build:list` entry, or, for a binary built with
     `eas build --local`, the commit of the pipeline run or release tag that produced it.
  2. Create a git branch from that commit and add only the files the fix needs, using only primitives that
     binary has: no new native module, and no API from a newer SDK or a newer native dependency.
  3. Build the workspace libraries first (in a monorepo, the packages the app imports), then typecheck
     against that tree, not the trunk's.
  4. With the operator's go-ahead (this publishes to phones in production), commit, then publish from that
     git branch to the store channel:
     `eas update --channel <channel> --environment <environment> --message "<what it fixes>"`, with the
     store build's environment (usually `production`): the flag loads that environment's server-side
     variables, which the publish otherwise leaves out, and clears the bundler cache. Never use `--auto`,
     which names the EAS branch after the git branch, a branch no channel points to. The `Commit` line
     `eas update` prints must not end in `*`, which marks an uncommitted tree.
  5. Prove it by reading the update back: `eas update:view <new-group-id> --json` must show the stranded
     runtime's `runtimeVersion`, the git branch's `gitCommitHash`, and the `branch` that
     `eas channel:view <channel>` names. The pipeline's "succeeded" is not evidence (`EV-02`).
  6. Mark the git branch publish-only (its name and its first commit say so) and never merge it: it exists
     to publish from, and a merge would bring that old tree back into the trunk.

### 2. A store update prompt

Built into the app and its API once; it moves phones off old store versions instead of waiting for them.

- **The server holds the versions:** a "latest version" and a "minimum version" per platform, editable by
  an operator (an admin screen), empty by default. The client sends its platform and version, and the
  server answers `ok`, `update` (an invitation with "not now", snoozed for a few days) or `required` (a
  screen with only an update button, which cannot be closed).
- **Clients identify themselves on every request.** From the release that introduces it, the client sends
  its platform and version as request headers, and the API answers `426 Upgrade Required` to anything
  below the minimum version, except the version-check endpoint itself. Older clients that send no headers
  pass. This is the emergency brake for a breaking API change, and it answers "which app versions still
  call this route?" before any `/v2` is needed.
- **Mount the prompt outside the app's error boundary.** A 426 can make a screen throw, and an error
  boundary whose fallback replaces the whole tree replaces the update screen with it.
- **Word the mandatory screen as something new, not something broken:** "there is a new version", not
  "this version no longer works".
- **Backport the prompt to every stranded runtime** (part 1): for those phones it is the only way to the
  store.

### 3. Toolchain pinning for self-hosted build agents

Applies when `eas build --local` runs on a machine whose Xcode can change between builds: a Mac you
manage, or a hosted CI runner whose default Xcode moves with its image. EAS's own build servers run the
image the build profile selects.

- **Pin the Xcode per build (`MR-16`).** Install the pinned version beside any newer one as
  `/Applications/Xcode-{XCODE_VERSION}.app` (on a hosted runner, point `DEVELOPER_DIR` at that version
  among the image's preinstalled Xcodes instead), set `DEVELOPER_DIR` to its `Contents/Developer` for the
  whole build job so that every step uses it, the build included, and add a bash guard step that fails
  the run when the path is missing or `xcodebuild -version` reports another version:

  ```bash
  set -euo pipefail
  expected="Xcode {XCODE_VERSION}"
  if [ ! -d "${DEVELOPER_DIR:?DEVELOPER_DIR is not set}" ]; then
    echo "Pinned Xcode is not installed: $DEVELOPER_DIR" >&2
    exit 1
  fi
  version_output="$(xcodebuild -version)"   # captured whole, never piped into head
  read -r first_line <<< "$version_output"
  if [ "$first_line" != "$expected" ]; then
    echo "Expected $expected, xcodebuild reports: $first_line" >&2
    exit 1
  fi
  ```

  Avoid `xcodebuild -version | head -1` under `pipefail`: `head` can exit before `xcodebuild` has finished
  writing, the SIGPIPE that ends `xcodebuild` fails the pipeline, and the step dies (exit 141).
- **Before a store build on such a machine, read the guard's result in that build's own run.** Confirm that
  the job ran the guard step and that it passed; stop the release if the step is missing or failed.
- **Move the pin only with the EAS build image the build profile selects** (`build.<profile>.ios.image`,
  or the default image for the project's SDK). An IPA that EAS built with that profile records the Xcode
  it used as `DTXcode` in its `Info.plist` (`2620` is Xcode 26.2); pin that version, and never one older
  than App Store Connect accepts for uploads.
- **When a store build crashes at launch but the same JavaScript runs fine via OTA**, compare `DTXcode` and
  `DTSDKName` in the working and the crashing IPA's `Info.plist` (unzip each IPA, then
  `plutil -p Payload/<App>.app/Info.plist` on macOS) before reading any code, and build the same commit in
  the EAS cloud: if that build works, the toolchain is the difference, not the code (`MR-16`).

### 4. When to set "latest"

- **Set the server-side "latest version" for a platform only when that store's listing actually offers
  the version.** Set early, it sends users to a store page that still offers the old build.
- **Raise the "minimum version" only to a version every user can install now:** on the App Store once the
  lookup below reports it, on Google Play once the production rollout reaches 100%. A minimum above that
  leaves users on a screen that cannot be closed, whose only button opens a store page that still offers
  the old build, while the API refuses their every request with 426. A version that raises the iOS
  deployment target or Android's `minSdkVersion` never installs on devices below it, so a minimum at that
  version locks those devices out for good, unless the client also sends its OS version and the server
  exempts them.
- **App Store:** the public lookup, `https://itunes.apple.com/lookup?bundleId={IOS_BUNDLE_ID}`, returns the
  listed version as `results[0].version`. Show it beside the admin field as a reference, with a warning
  when the typed version is newer. It reads one storefront, the United States unless `&country=<cc>` names
  another (`resultCount: 0` means the app is not listed there), and it answers from a cache (a `max-age`
  of about 2 to 14 hours in checks on 2026-10-22), so a version released in the last several hours can
  still read as the old one: treat the warning as a reason to check the listing by hand.
- **Google Play publishes no equivalent lookup**, so Play is a manual check of the listing before either
  field is set, and a staged rollout counts only at 100%: until then, some users are still offered the
  previous build.

**Observed in one consumer session (reported 2026-10-18), not re-verified since** — re-check before relying
on any of them: phones on five earlier store versions had received no update for weeks before anyone
noticed; one runtime crash-looped on an update published from a checkout with a different native SDK, and
the session described expo-updates rolling back to the previous update on every launch while the latest
update on the channel kept breaking it (compare the documented behavior in part 1); two production iOS
binaries crashed at launch after the build Mac's Xcode updated itself, while the same JavaScript ran fine
via OTA; and a 426 made the app's feed crash, so the error boundary's fallback replaced the update screen
until the prompt was mounted above the boundary.

Enforcement: parts 1 and 3 are structured spell gates through `MR-15` and `MR-16` (ARC-023); parts 2 and
4 are explicitly advisory prose (ARC-023) — the prompt and the server-side fields are the app's own code,
which no step of this spell can read.

---

## Apple App Store

### Initial one-time setup

1. Confirm Apple Developer Program enrollment is active.
2. Create the App Store Connect app record: name, `{IOS_BUNDLE_ID}`, SKU, and user access.
3. Set the `eas.json` build + submit profile structure shown in the preamble above, filling in
   `{APPLE_ID_EMAIL}`, `{ASC_APP_ID}`, and `{APPLE_TEAM_ID}`.
4. Generate remote, EAS-managed credentials (Distribution Certificate, Provisioning Profile, Push
   Notifications key) — no local Mac or Xcode needed.
5. Create an App Store Connect API key for non-interactive submits (choose EAS-managed vs.
   manually-uploaded per the operator's preference).
6. If App Store Connect already has this bundle ID linked and EAS's automatic capability sync fails
   against it, toggle the affected capabilities manually in the Apple Developer console's Identifiers
   page instead of retrying the automated sync.

### Repeat deployments

Start with the runtime audit (EAS Update lifecycle, part 1; `MR-15`), then build and submit:

```bash
eas build --platform ios --profile production
eas submit --platform ios --profile production --latest
```

Build numbers auto-increment per the preamble's `eas.json` config — no manual version bump needed.
Realistic wait times: build ~10-20 minutes; Apple's binary processing ~5-10 minutes before the build is
visible in TestFlight. A build not yet visible immediately after `eas submit` reports success is
ordinarily processing lag, not a failed submission — verify by checking TestFlight directly before
concluding otherwise (`EV-06`).

### Known pitfalls

- **`Failed to patch capabilities: X ON, Y OFF`** — happens when an App Store Connect app is already
  linked to the bundle ID and Apple rejects EAS's automatic capability sync. Fix: `EXPO_NO_CAPABILITY_SYNC=1`
  as a build-time env var, combined with the manual capability toggle from setup step 6.
- **`Command must be re-run to pick up new updates configuration`** — EAS auto-installs `expo-updates`
  mid-build the first time it's needed. Simply re-run the exact same `eas build` command; no
  configuration change is required on your end.
- **A transient Apple "Internal Server Error" during App Store Connect API key creation** clears on a
  simple retry — no code or configuration change needed.

---

## Google Play

Read this before anything else: **passing review on one Google Play track never promotes the binary to
any other track** (`MR-01`) — internal testing has no review at all, while closed, open, and production
each require one independently.

### Initial one-time setup

1. Create the Google Play Console app listing.
2. **Set the country/region list on every track you plan to release to, before building that release** —
   a fresh production track starts with zero countries and fails with a generic, un-actionable error
   otherwise (`MR-02`).
3. Reuse the App Store's listing copy and screenshots as a starting point — it keeps the two stores
   consistent — but re-review each asset against the actually shipped binary before publishing; a
   screenshot advertising a since-removed feature is a common miss from blind reuse. Image dimensions
   differ between stores, so assets need re-export, not re-invention.
4. Set up a Google Play service account and reference its key from `eas.json`'s
   `submit.production.android.serviceAccountKeyPath`.
5. Complete the IARC content-rating questionnaire one question at a time, and re-read the full form
   after any change to the app's category (`MR-04`).
6. Complete the data-safety declaration using "leaves the device" as the collection test, and confirm it
   agrees with the App Store's own App Privacy answers for the same app (`MR-05`).
7. Provide reviewer/demo-account access — one working account per app, described in prose for any
   additional account types (`MR-07`).
8. If Android developer verification is pending, correct the public developer address at its D-U-N-S
   source and let it propagate **before** confirming it in the Play console — confirming first locks in
   whatever address is currently on file (`MR-11`). Start this early: verification has a hard deadline,
   and D&B propagation can take days to weeks.

### Repeat deployments

Start with the runtime audit (EAS Update lifecycle, part 1; `MR-15`), then build and submit:

```bash
eas build --platform android --profile production
eas submit --platform android --profile production --latest
```

**Saving a console edit is not submitting it** — Google Play stages edits until an explicit "send
changes for review" (or "save and publish") action, each with its own confirmation dialog (`MR-03`). A
workflow that stops at "Save" ships nothing.

Observed review latencies, for expectation-setting: internal testing is instant (no review); a first
closed-testing review is roughly one day; production review is quoted as "typically within 7 days," and
materially faster when the identical binary already cleared a closed-track review. Treat a release not
yet visible immediately after submission as this ordinary review latency, not a failure, absent a
console error stating otherwise (`EV-06`).

### Known pitfalls

- **🔴 Play Console silently drops synthetic browser input.** Programmatic form input and coordinate
  clicks frequently do not register — the control appears set, the save succeeds, and nothing persists
  (seen on both app-access contact fields and country checkboxes). Before saving, read the page's own
  state readout (a "Targeted (N)" filter chip, "Release notes provided for N languages," a track's
  country-count summary); if the number disagrees with intent, hand the step to a human rather than
  retrying the same automated input (`EV-01`/`EV-03`).
- **The "no deobfuscation file" warning** appears on every release and is benign and permanent until
  mapping-file upload is wired up — it is not a sign of a broken build (`MR-08`).
- **🔴 The signing certificate an installed app presents can differ from every console page you'd
  naturally check.** Play App Signing plus "automatic protection" can make anything keyed to a
  `(package, SHA-1)` pair — Maps, Google Sign-In, App Links/`assetlinks.json` — fail on Play-delivered
  installs while working on sideloads. Never infer the SHA-1; read it from `adb logcat` against an
  actual Play-delivered install (`MR-09`, `EV-01`). Zero traffic in a provider's usage metrics is not
  evidence the app isn't calling it — an auth failure can occur before any billable request is logged —
  and a working browser-based OAuth flow proves nothing about certificate matching.
- **Android OAuth clients are keyed to one `(package, SHA-1)` pair each** — a Play-signed install, an
  upload-signed sideload, and a `.dev` variant each need their own client. New clients also ship with
  "Enable custom URI scheme" off, which fails with a visible `Error 400: invalid_request` until toggled
  on (`MR-10`).
- **Audit what the built artifact actually declares** (`aapt2 dump permissions`, or an equivalent
  manifest inspection) before submission — a dependency that's installed but no longer called still
  contributes its permissions, and removing one means removing the dependency, re-verified against a
  fresh build (`MR-12`).
- **Android notification icons need a dedicated monochrome, white-on-transparent small icon**, shipped
  in a build — there's no OTA path for this. A "broken" icon symptom should be checked in the
  notification shade, not the heads-up banner, since some OEM skins legitimately omit the small icon
  from banners only (`MR-13`).
- **Android's native `AlertDialog` caps at three buttons.** A menu built on `Alert.alert` past that cap
  silently loses the overflow — typically the *Cancel* row. Use a real bottom sheet instead for any menu
  that could exceed three options (`MR-14`).
- **Locale lists differ between the stores.** Release notes are per-language; resolve locale coverage
  against each store's own catalogue rather than copying the other store's list (`MR-06`).

### Reporting the release

End every release run with a short report that includes the runtime audit's result (each runtime still on
phones and the route chosen for it). The store-console steps the agent cannot reach — sending
staged Google Play changes for review, answering an App Store review question, confirming a manual
release — are required operator actions:

<!-- fragment:needs-you:start -->
**Needs you — required operator actions.** When this run leaves an action that only the operator can take, and the work is not correct or complete until it is taken, report it in one block at the very top of the final report, before every other section and before any optional next step:

```markdown
## ⚠ Needs you

- <exactly what to do: the command, the link, or the question> — <why the agent cannot do it itself>
```

- **What belongs in it:** an action the work needs that only the operator can take — approving or merging a pull request, accepting a decision record, answering a question the work is waiting on, confirming a `guarded` push, running an interactive command such as `spell unblock-push`, or a step on an external platform the agent cannot reach. An optional suggestion, a next spell to run, or anything the agent could do itself is not a required action and stays out of the block.
- **One line per action.** Say exactly what to do, then, after the dash, why the agent cannot do it. Write the command, link or question out in full; never point elsewhere with "see above".
- **Never only among optional steps.** An action required for correctness is never listed only under next steps, suggestions, `Carry Forward` or `What's Next?`. It may be repeated there, but it always appears in this block.
- **Omit it when empty.** When nothing needs the operator, leave the block out entirely: no heading and no "None" line.
- **Every final report.** The block belongs in whatever report ends the run, including a report written when the spell stops early.
- Enforcement: explicitly advisory prose (ARC-023) — no check reads a spell's actual output for this block; it holds by these instructions alone.
<!-- fragment:needs-you:end -->

---

## Rules

This spell defers entirely to
[governance/mobile-release-standards.md](../../.arcane/governance/mobile-release-standards.md) for what
each store-specific platform fact means and why, and to
[governance/external-verification-standards.md](../../.arcane/governance/external-verification-standards.md)
for how any claimed success is verified. Findings and steps in this spell cite rule IDs from both; they
do not re-explain them. Where the two disagree with what this spell says to do, the governance docs win.

## Related

- **Consumes from:** whatever workflow builds and versions the app before deployment (in this
  repository's own stack, `spell-implement`/`spell-ship`) — this spell deploys an already-built app to
  the stores, it does not build the app's features.
- [Mobile Release Standards](../../.arcane/governance/mobile-release-standards.md)
- [External Verification Standards](../../.arcane/governance/external-verification-standards.md)
