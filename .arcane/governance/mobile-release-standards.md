---
title: Mobile Release Standards
audience: both
last_updated: YYYY-MM-DD
status: active
distributable: true
tags: [mobile, app-store, google-play, release, deployment]
---

# Mobile Release Standards

Durable facts about how the Apple App Store and Google Play review consoles and release pipelines
actually behave — true regardless of which build tool produced the binary. These are platform
properties, not Expo/EAS-specific tooling behavior; the EAS-specific workflow that consumes these rules
lives in `spell-eas-store-deploy`. Sourced from two real dogfooding runs (a first-ever App Store
submission, then a from-zero Google Play listing to a live production release) — every rule here was hit
for real, not derived from documentation alone.

## Executive Summary

- A store's review/track model is not symmetric with the other store's, and approval on one track never
  promotes a binary anywhere else — treat each track and each store as its own release, not a step in a
  shared pipeline.
- Several consoles distinguish "saved" from "submitted," and several silently drop scripted input —
  verify the console's own state readout before trusting that an action took effect (`EV-01`/`EV-03`).
- Identity and signing facts (the certificate an installed app actually presents, which `(package,
  SHA-1)` pair an integration is keyed to, where a public developer address actually comes from) are
  frequently not visible on the console page you'd naturally check — read them from the artifact or the
  system that actually enforces them, not from a console summary.
- Two platform-specific binary/UI constraints (notification icon requirements, a native dialog's button
  cap) have no equivalent on the other platform and are easy to carry over incorrectly from iOS-first
  development.

---

## Rule index

| ID | Rule (one line) |
|----|------|
| MR-01 | Google Play's tracks are independent: only *internal testing* skips review, and approval on any one track never promotes the binary to another. |
| MR-02 | A fresh Google Play production track starts with zero countries/regions, which surfaces as a generic, uninformative release error. |
| MR-03 | Google Play console edits are staged until an explicit "send for review" action; saving is not submitting. |
| MR-04 | Google Play's IARC content-rating questionnaire re-renders when the app category changes, shifting rows under answers already given. |
| MR-05 | "Data collected" means data that leaves the device — and both stores' privacy/data-safety declarations must agree with each other. |
| MR-06 | The two stores' supported locale catalogues differ; do not copy one store's locale list onto the other. |
| MR-07 | Reviewer/demo-account access is scoped per app, not per account type, and is length-capped. |
| MR-08 | Google Play's "no deobfuscation file" warning is benign and permanent until a mapping file is uploaded. |
| MR-09 | The signing certificate an installed Android app actually presents can differ from what any single console page shows — read it from the device, never infer it. |
| MR-10 | Android OAuth clients are keyed to one `(package name, SHA-1)` pair each, and ship with the custom-URI-scheme toggle off by default. |
| MR-11 | Google Play sources the public developer address from the D-U-N-S record; confirming it in-console locks in whatever address is currently on file. |
| MR-12 | Audit the permissions the built artifact actually declares, not what the source code appears to use. |
| MR-13 | Android push-notification icons need a dedicated monochrome asset shipped in a native build; there is no OTA path for this. |
| MR-14 | Android's native `AlertDialog` silently caps at three buttons; a menu built on `Alert.alert` past that cap loses the overflow, typically the dismiss action. |

---

## Release tracks and console state

### MR-01: Google Play's tracks are independent — nothing promotes automatically

*Internal testing* publishes with no review. *Closed*, *open*, and *production* each trigger a real
review. Passing review on one track says nothing about any other track: production is a wholly separate
release, with its own binary assignment and its own country list. An operator who watches a closed-test
release turn green will reasonably conclude the app is live to the public — it is not, and nothing in
the console actively corrects that assumption.

**Rule (MR-01): Treat each Google Play track as an independent release requiring its own review and its own configuration; passing review on one track never promotes the binary to another. Enforcement: structured spell gate (ARC-023) — spell-eas-store-deploy opens its Google Play section with this exact rule as a read-first prerequisite, so no per-track setup or deployment step proceeds under the wrong assumption that another track's review already covers it.**

### MR-02: A fresh production track starts with zero countries — and fails silently about why

Countries and regions are configured per track, not once per app. A brand-new production track therefore
starts with none selected. The release wizard responds to this with a generic "We found some problems
with your release / To save, fix errors" that never names the actual cause. The real signal is the track
summary reading `0 countries / regions` — set the country list on the track before attempting to build
the release, not after the generic error appears.

**Rule (MR-02): Before building a release for any Google Play track, confirm its country/region list is non-empty; a generic "fix errors" message with no named cause is this failure's signature. Enforcement: structured spell gate (ARC-023) — spell-eas-store-deploy's Google Play setup step 2 requires confirming the track's country/region count is non-empty before building that release.**

### MR-03: Saving is not submitting

Google Play console edits land in the Publishing overview as staged changes. They reach Google only
through an explicit "Send changes for review" action, which itself carries a second confirmation dialog.
A workflow that stops at "Save" ships nothing. The listing pages carry the identical trap under a
differently-worded "Save and publish" action with its own second dialog.

**Rule (MR-03): After any Google Play console edit, look for and complete the explicit send-for-review (or save-and-publish) action and its confirmation dialog — "saved" is not a release state. Enforcement: structured spell gate (ARC-023) — spell-eas-store-deploy's repeat-deployment step for Google Play requires locating and completing that confirmation dialog before the release counts as shipped.**

---

## Console review quirks

### MR-04: The IARC questionnaire re-renders on category change

Changing an app's category in the Google Play console causes the IARC content-rating questionnaire to
re-render, shifting which question sits at which row. A batch of clicks issued against the prior layout
lands on the wrong questions and can silently set an unintended answer — including sensitive categories
like graphic violence or location sharing.

**Rule (MR-04): Answer the IARC questionnaire one question at a time, and re-read the full form after any change to the app's category, rather than assuming the row order is stable. Enforcement: structured spell gate (ARC-023) — spell-eas-store-deploy's Google Play setup step 5 requires re-reading the full IARC form after any category change before submitting answers.**

### MR-08: The "no deobfuscation file" warning is benign and permanent

Google Play shows a "no deobfuscation file" warning on every release once mapping-file upload isn't
wired up. This warning does not resolve itself and does not indicate a build defect — it will appear on
every future release until a mapping file is actually uploaded. State this explicitly wherever it
appears in documentation or in-flight guidance, since it reads as alarming on a first submission.

**Rule (MR-08): Treat Google Play's "no deobfuscation file" warning as an expected, permanent state absent mapping-file upload — not a signal of a broken release. Enforcement: explicitly advisory prose (ARC-023) — spell-eas-store-deploy's Known Pitfalls list mentions this warning for context, but no step checks for it or blocks on it; treating it as benign rather than a build defect depends on the operator's own judgment.**

---

## Cross-store consistency

### MR-05: "Collected" means leaves the device — and the two stores' answers must agree

Google Play's data-safety framework and Apple's App Privacy responses both hinge on the same underlying
definition: data is "collected" only if it leaves the device. Purely on-device processing is not
collection. Because both declarations are public, a reviewer or a user can compare them directly — the
two stores' answers for the same app must describe the same underlying behavior, not merely satisfy each
store's form independently.

**Rule (MR-05): Data-safety and privacy declarations across both stores must agree with each other on what is actually collected, using "leaves the device" as the collection test in both places. Enforcement: structured spell gate (ARC-023) — spell-eas-store-deploy's Google Play setup step 6 requires confirming the data-safety declaration agrees with the App Store's own App Privacy answers before submission.**

### MR-06: The stores' locale catalogues differ

Release notes are supplied per-language, and the set of locales each store's catalogue supports is not
identical between Apple and Google. A locale available on one store may not exist on the other, so a
default-language or locale-coverage choice has to be made against each store's own list — never copied
across from the other store's configuration.

**Rule (MR-06): Resolve locale/language coverage against each store's own supported-locale list independently; do not assume the other store's locale set applies. Enforcement: explicitly advisory prose (ARC-023) — spell-eas-store-deploy's Known Pitfalls list cites this rule for context, but resolving locale coverage against each store's own catalogue is left to the operator's judgment, with no checkable state or step gating it.**

---

## Access, identity, and signing

### MR-07: Reviewer access is scoped per app and length-capped

The demo-credentials/reviewer-access box is required per app, not per account type, and has a length
cap. An app with genuinely distinct account types (consumer vs. business, for example) needs one working
account supplied directly, with prose describing how a reviewer reaches the other flows — there is no
mechanism for supplying multiple credential sets natively.

**Rule (MR-07): Provide one working reviewer account per app submission, with any additional account-type flows described in prose rather than as separate credentials. Enforcement: structured spell gate (ARC-023) — spell-eas-store-deploy's Google Play setup step 7 requires a working reviewer account to be provided before the submission steps that follow it.**

### MR-09: Read the actual signing certificate — never infer it

Google Play App Signing, combined with "automatic protection," can result in an installed app presenting
a signing certificate that does not appear on any console page an operator would naturally check.
Anything keyed to a `(package, SHA-1)` pair — Maps API keys, Google Sign-In, App Links / `assetlinks.json`
— then fails specifically on Play-delivered installs while working normally on sideloaded builds. Zero
traffic in a provider's own usage metrics is not evidence the app isn't calling it (an auth failure can
occur before any billable request is logged), and a working browser-based OAuth flow proves nothing
about certificate matching, since that flow never checks certificates. This is the same discipline
`EV-01` states in general form — re-read the actual persisted/served state, never trust the interface —
applied to a case where the "interface" is a console page that may not even show the value in question.

**Rule (MR-09): Never infer an Android signing SHA-1 from a console page; read the certificate the installed app actually presents, via `adb logcat` against a Play-delivered install (`EV-01`). Enforcement: structured spell gate (ARC-023) — cited by spell-eas-store-deploy's Known Pitfalls step, which requires reading the certificate via `adb logcat` against a Play-delivered install before trusting any `(package, SHA-1)`-keyed integration, applying the general EV-01 re-read-actual-state discipline to this specific case.**

### MR-10: Android OAuth clients are scoped to one `(package, SHA-1)` pair, custom scheme off by default

Each Android OAuth client is keyed to exactly one `(package name, SHA-1)` combination — a Play-signed
install, an upload-signed sideload, and a separate `.dev` build variant each need their own client, not a
shared one. Separately, new Android OAuth clients ship with "Enable custom URI scheme" switched off by
default; leaving it off produces a visible `Error 400: invalid_request`, which is a console
configuration gap, not a code defect.

**Rule (MR-10): Provision one Android OAuth client per distinct `(package, SHA-1)` pair, and confirm "Enable custom URI scheme" is on for any client that needs a custom-scheme redirect. Enforcement: structured spell gate (ARC-023) — spell-eas-store-deploy's Known Pitfalls step requires confirming each OAuth client's package/SHA-1 pairing and its custom-URI-scheme toggle state before relying on a custom-scheme redirect.**

### MR-11: The public developer address comes from D-U-N-S, and confirming it locks it in

Google Play publishes the developer's address on the public listing, and that address is not directly
editable inside Play — it is sourced from the developer's D-U-N-S record. The console offers only
"confirm" or "contact D&B." Clicking "confirm" first locks in whatever address is currently on file,
which for a solo operator is frequently a home address. The correct order is: fix the address at D&B
first, wait for propagation (days to weeks), let Google re-sync, and only then confirm. Android developer
verification carries its own hard deadline, so this correction needs to start early enough that the
D&B propagation window still fits before that deadline.

**Rule (MR-11): Correct the address at the D-U-N-S source and allow it to propagate before confirming it in the Google Play console — confirming first permanently publishes whatever address is on file at that moment. Enforcement: structured spell gate (ARC-023) — spell-eas-store-deploy's Google Play setup step 8 requires the D-U-N-S correction to propagate before the console confirmation step runs.**

---

## Binary and platform specifics

### MR-12: Audit what the binary actually declares, not what the code appears to use

A dependency that is installed but no longer called from application code still contributes its declared
permissions to the built artifact, and every declared permission is both review and data-safety surface.
The only reliable check is against the artifact itself (`aapt2 dump permissions`, or an equivalent raw
manifest inspection) — inspecting source code for call sites is not equivalent, since an unused
dependency's manifest entries survive independently of whether anything still calls it. Removing a
permission means removing the dependency that declares it, and the removal must be re-verified against a
newly built artifact, not assumed from the source diff.

**Rule (MR-12): Verify declared permissions against the actually built artifact, not against source code's apparent usage, both before submission and after removing a permission-declaring dependency. Enforcement: structured spell gate (ARC-023) — spell-eas-store-deploy's Known Pitfalls step requires running `aapt2 dump permissions` (or an equivalent manifest inspection) against the built artifact before submission.**

### MR-13: Android notification icons need a dedicated asset, shipped natively

Android requires a dedicated monochrome, white-on-transparent small icon for notifications; without one,
the system falls back to a generic glyph in the notification shade. This is a native configuration
change and therefore ships only in a build — there is no OTA path for it. When diagnosing a "broken"
notification icon, check the notification shade specifically rather than the heads-up banner, since some
OEM skins legitimately omit the small icon from the banner view while still rendering it correctly in the
shade. The branded, full-color icon slot is `largeIcon`, a separate asset from the required small icon.

**Rule (MR-13): Ship a dedicated monochrome small-icon asset for Android notifications in a native build (never an OTA), and diagnose icon issues via the notification shade, not the heads-up banner. Enforcement: explicitly advisory prose (ARC-023) — spell-eas-store-deploy's Known Pitfalls list restates this rule for awareness, but no step verifies the icon asset exists or checks the notification shade before proceeding; both remain judgment calls for the operator.**

### MR-14: Android's native `AlertDialog` caps at three buttons

Android's native `AlertDialog` silently drops any button past a hard cap of three. A menu built on
`Alert.alert` with more than three options loses whatever falls past the cap — in practice, typically
the *Cancel* row, leaving a dialog with no way to dismiss it. iOS has no equivalent limit
(`ActionSheetIOS` supports an arbitrary option count).

**Rule (MR-14): For any Android menu that could exceed three options, use a real bottom sheet dismissible at least three ways (an explicit cancel row, a scrim tap, and the hardware back gesture) instead of `Alert.alert`. Enforcement: explicitly advisory prose (ARC-023) — spell-eas-store-deploy's Known Pitfalls list cites this rule for awareness, but the fix is a UI code change with no console or platform state for the deploy workflow to check before proceeding; catching it depends on code review, not this spell.**

## Related

- [[.arcane/governance/external-verification-standards|External Verification Standards]] — `EV-01`
  (re-read persisted state) and `EV-03` (trust the readout, escalate rather than retry) are the general
  principles `MR-09` applies to Android's signing-certificate opacity specifically.
- `spell-eas-store-deploy` — the runnable EAS Build + EAS Submit workflow that cites these rules by ID.
