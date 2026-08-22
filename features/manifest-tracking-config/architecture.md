# Architecture - Persisted Tracking Configuration + Business-Root Fixes

## Overview

One new ADR (amends ARC-020). Five source files (types.ts, manifest.ts, init.ts, hub.ts,
plus their existing test files). Seven prompt-template edits in
src/assets/.github/prompts/ (mirrored to root): two for tracking-mode resolution, five for
{BUSINESS_ROOT} resolution.

## Data flow

```
DECISIONS.md          new ARC-0XX, Amends: ARC-020 (R1)

src/types.ts           ExternalProvider: "azure-devops"|"github"|"gitlab"|"jira"
                                       -> "ado"|"jira"|"other"                    (R2)

src/modules/manifest.ts
  + ManifestInvalidFieldError
  + validateTrackingFields() called from readManifest, post-parse                (R3)

src/commands/init.ts
  + Step 5b: tracking-mode question/default, before manifest write               (R4)
    profile in {governance-only, methodology} -> silent default, always
    profile in {full, lite} + interactive     -> ask once
    profile in {full, lite} + --profile flag  -> left unset (scripted)

src/modules/hub.ts
  ManifestRetrofit.ask gains a manifest parameter                                (D4)
  + MANIFEST_RETROFITS entry: field "tracking_mode"                              (R5)
    mirrors init.ts's D5 branching exactly (same profile-based logic,
    reachable from spell update for installs that predate the field)

src/assets/.github/prompts/
  spell-open-session.prompt.md   + self-hosted-source-manifest fallback tier,
                                    + concrete question wording                   (R6)
  spell-plan.prompt.md           + full resolution chain (previously absent)     (R6)
  spell-check-drift.prompt.md    ventures/ -> {BUSINESS_ROOT} resolution         (R7)
  spell-commit-work.prompt.md    ventures/ -> {BUSINESS_ROOT} (scope label)      (R7)
  spell-open-session.prompt.md   ventures/ -> {BUSINESS_ROOT} resolution         (R7)
  spell-plan.prompt.md           ventures/ -> {BUSINESS_ROOT} resolution         (R7)
  spell-todo.prompt.md           ventures/ -> {BUSINESS_ROOT} (6 locations)      (R7)

docs/intake/batch-001/EF-14.md   open-by-design -> shipped                       (R8)
docs/intake/batch-001/EF-08.md   deferred -> shipped                             (R8)
```

Note: spell-open-session.prompt.md and spell-plan.prompt.md each appear twice above (R6 and
R7) -- same files, two independent edits (tracking-mode resolution near the top of each file;
{BUSINESS_ROOT} resolution at their own separate line further down).

## Interface change: ManifestRetrofit.ask

```ts
// Before
ask(): Promise<Partial<ArcaneManifest>>;

// After
ask(manifest: ArcaneManifest): Promise<Partial<ArcaneManifest>>;
```

runManifestRetrofits (hub.ts) already has manifest in scope at its call site
(retrofit.ask() -> retrofit.ask(manifest)); the one existing entry (role) does not reference
the parameter, so its behavior is unchanged. This is the minimal change that lets the new
tracking_mode retrofit apply D5's profile-based branching without a second, parallel mechanism
living outside the registry.

## readManifest validation

```ts
const VALID_TRACKING_MODES: TrackingMode[] = ["internal", "external"];
const VALID_EXTERNAL_PROVIDERS: ExternalProvider[] = ["ado", "jira", "other"];
```

Checked only when the field is present (both are optional on ArcaneManifest);
external_provider: null is valid (means "internal, no provider") and short-circuits before the
enum check. Throws ManifestInvalidFieldError -- new class, distinct from ManifestCorruptError
(JSON-syntax failure) so callers/operators can tell "not JSON" from "valid JSON, bad value"
apart. No existing catch site pattern-matches exclusively on ManifestCorruptError in a way this
new class would break (checked: init.ts only special-cases ManifestNotFoundError, same pattern
in update.ts/add.ts/status.ts/uninstall.ts -- everything else re-throws, which is the correct
behavior for an unrecognized error).

## Testing strategy

- test/manifest.test.ts: extend with ManifestInvalidFieldError cases (bad tracking_mode, bad
  external_provider, external_provider: null accepted, field absent accepted).
- test/hub-retrofit.test.ts: extend the existing hoisted-mock structure. select becomes a
  hoisted, message-branching mock (mirroring the existing confirmMock pattern) so tests can
  control the profile answer independently from the new tracking-mode/external-provider
  answers. New cases: governance-only/methodology silent default (init, both interactive and
  --profile); full/lite interactive ask + persist (both internal and external+provider
  branches); full/lite --profile leaves unset; retrofit backfill mirrors all of the above via
  spell update; idempotent on a second update once set.
- New test/prompt-tracking-and-business-root.test.ts: string-assertion tests (matching this
  repo's established pattern for prompt-template content) confirming: both tracking-mode
  prompts document the full resolution chain including the self-hosted-source-manifest tier;
  none of the five EF-08 files' resolution/label contexts contain a literal ventures/ where
  {BUSINESS_ROOT} belongs; the {BUSINESS_ROOT} resolution sentence appears in each of the five.

## Security

None. No new external input surface -- this is manifest-field persistence and prompt-template
wording; the enum validation added is itself a (minor) hardening, not a new risk.

## Implementation notes

- Self-host parity: all seven prompt edits land in src/assets/.github/prompts/, mirrored to
  root .github/prompts/ via npm run fix:self-host-parity.
- Version bump: package.json (source under src/assets/**, src/modules/registry.ts,
  src/config/profiles.ts changed) -- sized as 0.17.0 (minor), matching the plan's own
  feature-sized categorization for this WP, not a patch bump.
