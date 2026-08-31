---
name: Spell — EAS Store Deploy
description: Deploy an Expo app to the Apple App Store and Google Play via EAS Build + EAS Submit — one-time setup, repeat deployments, and the known pitfalls hit dogfooding both flows for real.
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
- **Deliberately scoped to EAS Build + EAS Submit** — no local Xcode, Xcode Cloud, or Fastlane coverage.
  That scope is what keeps every step concrete and copy-pasteable.
- Every lesson here was hit for real across two dogfooding runs (a first-ever App Store submission, then
  a from-zero Google Play listing to a live production release) — none is general knowledge restated.
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
- **🔴 Bundler transform caches do not key on `EXPO_PUBLIC_*` env vars.** On a persistent (self-hosted)
  build runner, the cache survives between runs, so an update published to one channel can ship
  another channel's inlined config — for example, a production build silently pointing at a development
  API. Pass `--clear-cache` on the publish lane, and verify by comparing the published `launchAsset`
  hashes across channels: identical hashes for two channels that differ by at least one env var is proof
  of the defect. **A green publish/build step is not evidence here (`EV-02`)** — assert against the
  actual published asset.
- **When a feature is removed or renamed, both stores' screenshots and descriptions are in the blast
  radius.** Store metadata outlives the code it depicts, and it's the first thing a reviewer opens.

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
