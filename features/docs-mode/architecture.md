# Architecture — Docs Mode

Implements the accepted `features/docs-mode/PRD.md` across two work packages.
Decisions are recorded in [ARC-033](../../DECISIONS.md#arc-033--docs-mode-subject-root-content-sensitivity-and-capability-scoped-spell-components).

## Overview

WP-C1 (`0.18.0`) made a docs profile *expressible*: it split the monolithic
spell component so profiles can select spells by capability, and added the
profile itself. WP-C2 (`0.19.0`) gives that profile something to say — subject
shape, sensitivity behaviour, records conventions, a repository baseline, and an
adoption workflow.

## Decisions

**D1 — Capability components, presets on top.** `spells-{session,capture,
delivery,review,planning,build,venture,meta,docs}`. Grouping lives in the
registry; no spell file moved. Profiles stay named presets over those
components — see ARC-033's rejected alternatives for why composition-as-UX was
declined.

**D2 — Both client formats travel together.** One component holds a spell's
Copilot prompt *and* its Claude wrapper. They were never independently
selectable, and pairing them makes divergence across profiles impossible rather
than merely unlikely.

**D3 — Legacy migration is frozen, not derived.** `migrateLegacyComponents`
(`src/commands/update.ts`) maps the retired names to a literal eight-name list.
Deriving it from the live `spells-*` set would hand every future group to legacy
installs silently. `spells-docs`, added in WP-C2, is the first proof: it exists,
it is a `spells-*` component, and legacy installs correctly do not receive it.

**D4 — `subject_root` supports `"."`.** Root-as-subject is what makes adoption
non-destructive; requiring a subdirectory would force a restructure on exactly
the repositories docs mode exists to welcome. `null` means "asked, no single
subject" — distinct from `undefined`, mirroring `external_provider: null`.

**D5 — `content_sensitivity` is repository-wide.** Per-file detection of general
documents has no reliable signature (the same reasoning ARC-022 applied to CI
path filters). Behaviour lives in `universal-agent-rules.md` and is referenced
from `spell-close-session`'s screenshot step.

**D6 — Baseline files are `skipExisting` and source-renamed.** `.gitattributes`/
`.gitignore` are user-owned once written. Their sources live at
`src/assets/docs-baseline/*` and map to dotfile targets via
`RegistryComponent.sourceOverrides` — a nested `.gitignore` inside the published
package can exclude sibling files from the npm tarball, and a nested
`.gitattributes` would apply to Arcane's own tree.

**D7 — Tombstones in place.** `records-conventions.md` keeps superseded
documents at their path with a header naming the replacement. No archive
directory, no shipped retention schedule.

## Data flow

```
src/types.ts            + subject_root, content_sensitivity, sourceOverrides
src/modules/manifest.ts + enum + path-shape validation (rejects escapes)
src/config/profiles.ts  + docs preset; spells-review added to lite/methodology
src/modules/registry.ts + 9 spell components, docs-baseline, records-conventions,
                          frozen LEGACY_COMPONENT_MIGRATIONS
src/commands/init.ts    + Step 5c (subject shape), Step 5d (sensitivity)
src/modules/hub.ts      + retrofits for both fields
src/commands/update.ts  + migrateLegacyComponents, before the component loop

src/assets/
  .arcane/governance/records-conventions.md      new (EF-11)
  .arcane/governance/universal-agent-rules.md    + Sensitive Repositories (EF-12)
  .arcane/governance/git-conventions.md          docs-repo PR contradiction fixed
  .github/prompts/spell-adopt-docs.prompt.md     new (EF-03 / MH-04)
  .github/prompts/spell-close-session.prompt.md  + sensitivity gate on screenshots
  docs-baseline/{gitattributes,gitignore}        new (EF-10 + EF-17 residue)
```

## Testing strategy

Registry integrity is derived from disk, not hardcoded: every spell present must
be registered exactly once, in both formats, in the same component. Backwards
compatibility is asserted separately — `lite`/`methodology` must still resolve to
the 34 spells the monolith held, which caught a real regression when the eighth
group was added and those profiles were not updated.

Migration is tested for order preservation, dedupe (both legacy names map to the
same set), idempotency, and non-interference with untouched entries — plus a
guard that fails deliberately if a future `spells-*` group starts riding into
legacy installs.

`subject_root` validation is tested against real escape shapes (absolute POSIX,
Windows drive-relative, UNC, `..` traversal, empty) rather than only happy paths.

End-to-end verification uses the built CLI against real temp repositories: a
docs install, a `lite` install for backwards compatibility, and an `update`
against a hand-written legacy manifest.

## Deliberate non-goals

- **MH-04's original draft.** The referenced `spell-adopt-docs` draft could not
  be located; the operator authorised re-deriving it from MH-04's acceptance
  criteria. The shipped spell satisfies those criteria but is not the draft.
- **EF-04's profile + tracking-mode question merge.** Left deferred, consistent
  with ARC-032's own rejected-alternatives note.
- **`spell-architect`/`spell-scope` in the docs profile.** Retained: each
  produces a complete document unaided. Their downstream consumer
  (`spell-implement`) is absent, so a docs repo uses them as design-note tools.
  Stated rather than hidden.
