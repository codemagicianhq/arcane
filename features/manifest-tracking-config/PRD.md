---
status: accepted
tracking_mode: internal
source_intake: batch-001 (EF-14, EF-08)
---

# PRD - Persist Tracking Configuration and Fix Business-Root Hardcoding

## Problem

**EF-14.** Arcane persists one repo-level behavioral decision (profile) but not the parallel
tracking decision (tracking_mode/external_provider). .arcane.json has nowhere durable to put
it, so spell-open-session/spell-plan ask every session/every plan.

Re-verified against current HEAD (this is where the finding had gone stale):

- src/types.ts:18-19,39-40 already declares tracking_mode?: TrackingMode and
  external_provider?: ExternalProvider | null on ArcaneManifest, with TrackingMode/
  ExternalProvider unions -- contradicting EF-14's original claim that these are absent from
  types.ts. However ExternalProvider was typed as "azure-devops" | "github" | "gitlab" |
  "jira", while both consuming prompts (spell-open-session.prompt.md:82,
  spell-plan.prompt.md:31) and the already-Accepted ARC-011 (which defined this exact field)
  use ado | jira | other. The type never matched the one ADR and two prompts that actually use
  it -- "azure-devops" appears nowhere as a literal value; "github"/"gitlab" are unused. This
  PRD treats the type as wrong, not the prompts.
- src/commands/init.ts never asks or writes tracking_mode/external_provider at any point in
  runInit -- the manifest object built at step 6 (init.ts:342-348) omits them entirely. The type
  existing is not the same as the field being populated.
- src/modules/hub.ts's MANIFEST_RETROFITS (the general backfill-question mechanism ARC-030
  built) has exactly one entry, role -- no tracking_mode entry exists to backfill installs that
  predate the field once this PRD adds it.
- spell-open-session.prompt.md:80-83 already resolves root .arcane.json -> PRD frontmatter ->
  ask, but explicitly refuses to read src/assets/.arcane.json (the committed self-hosted source
  manifest) as a fallback: "A self-host marker under src/assets/ is doctor metadata, not active
  repository configuration; never use it as tracking provenance." This contradicts EF-14's own
  recorded self-hosting decision (2026-08-02): "Config-resolving spells must resolve the generated
  root manifest first, then the committed self-hosted source manifest, then PRD frontmatter, and
  ask only when all three are absent." Concretely, in this repo's own checkout -- no root
  .arcane.json exists, only src/assets/.arcane.json (selfHosted: true, tracking_mode:
  "internal", external_provider: null) -- the current prompt logic asks every session despite the
  self-hosted value already being unambiguous. This is the exact defect EF-14 describes,
  reproduced live in this repo, caused by the prompt's own over-broad exclusion rule.
- spell-plan.prompt.md's "Configure tracking mode first" step (lines 27-48) has no
  .arcane.json read at all (confirmed: zero matches for .arcane.json in the file) and no
  ask-instruction for the case where no ADO context exists -- it only defines the yaml shape and a
  backward-compatibility default. This is a bigger gap than EF-14's own text describes.
- src/modules/manifest.ts's readManifest (manifest.ts:36-54) did JSON.parse(content) as
  ArcaneManifest -- a compile-time-only assertion, not a runtime check. Nothing rejected an
  unsupported tracking_mode/external_provider value, contradicting EF-14 point 2 ("Reject
  unsupported values rather than silently treating them as a provider").

**EF-08.** Five spells hardcode ventures/ while three already resolve {BUSINESS_ROOT}
dynamically. Re-verified against current HEAD (two of the five original line citations are now
stale -- files were edited after EF-08 was filed):

- spell-check-drift.prompt.md:30 -- still hardcoded, matches EF-08's citation.
- spell-open-session.prompt.md:31 -- still hardcoded, matches EF-08's citation.
- spell-plan.prompt.md:67 -- still hardcoded, matches EF-08's citation.
- spell-commit-work.prompt.md:76-80 -- no longer hardcoded there (file restructured since
  EF-08 was filed); the live hardcode is now at line 104, a commit-scope label table entry
  ("business" - ventures/ directory), a different kind of reference than the other four.
- spell-todo.prompt.md:48 -- not hardcoded there (blank line). The file has six ventures/
  references (lines 22, 31, 36, 39, 84, 119), none at line 48 -- EF-08's citation was imprecise even
  at filing time, or the file changed. All six need the same fix EF-08 asks for.
- The three "already correct" examples: spell-summon-venture.prompt.md (renamed from
  spell-bootstrap-business.prompt.md since EF-08 was filed, per ARC-008's clean-break precedent)
  resolves {BUSINESS_ROOT} from .arcane.json's business_root field, default ventures/, gated
  behind role === "hub". spell-present-arcane.prompt.md:35 and spell-product-review.prompt.md:
  19,22 resolve the same way but without a hub gate -- general-purpose spells that any repo
  (hub or consumer) can run. The five files this PRD fixes are general-purpose like the latter two,
  not hub-only, so they follow that ungated pattern.

## Design decisions

**D1 - Correct the type, not the prompts (ExternalProvider).** ado | jira | other is
ARC-011's Accepted, already-shipped vocabulary; "azure-devops"/"github"/"gitlab" were never used
anywhere. Changing the type to match reality is the minimal fix; rewriting two prompts' worth of
already-working ADO process-template logic to match a stale, unused type would be backwards and far
riskier for a single-pass overnight change.

**D2 - Amend ARC-020, do not flip it to Accepted.** ARC-020 (Status: Proposed) explicitly leaves
open "whether user-owned configuration remains inside .arcane.json or moves to a separate file"
for its full scope (operator identity, business roots as a formal concept, provider coordinates,
repository lists). This PRD does not resolve that. It follows the precedent ARC-030 already set for
exactly this situation -- Accepted, with an explicit Amends: ARC-020 header, scoped to one field
pair, using the same "chosen once, persisted, backfilled without overwriting" contract profile
and role already use -- rather than mint a false sense that the full schema question is settled.
A new ADR (next number) is added; ARC-020 itself is left untouched (still Proposed), with the new
ADR's own text making the amendment relationship explicit, matching how ARC-030 handled the
business_root/hub-role slice of the same broader ARC-020 concern.

**D3 - Incremental MANIFEST_RETROFITS entries, not one unified migration.** EF-14 point 5
envisioned "broader schema unification... under the same migration so one shape is evolved once,
not patched ad hoc." That already did not happen -- ARC-030 shipped business_root/role as their
own retrofit entries, independently, before this PRD. This PRD follows the same now-established,
working pattern (register one more retrofit) rather than attempt the larger unification EF-14
originally imagined, which remains open under ARC-020. Point 5's underlying goal -- avoid ad hoc,
uncoordinated patching -- is still met: there is one general, versioned mechanism every field
change goes through, just not one single migration event.

**D4 - ManifestRetrofit.ask gains a manifest parameter.** The existing interface
(ask(): Promise<Partial<ArcaneManifest>>) cannot branch on the installed profile, which the
tracking-mode retrofit needs (see D5). Changed to ask(manifest: ArcaneManifest):
Promise<Partial<ArcaneManifest>>. The one existing entry (role) ignores the new parameter --
harmless, not a breaking change in practice since this is an internal registry with one caller.

**D5 - Profile decides whether tracking mode is asked at all, not just its default.** EF-14
point 4: "docs/journal profile path defaults to tracking_mode=internal and no external
provider... artifact-producing profiles still choose internal vs external once, then persist."
Mapped onto Arcane's actual four profiles (full | lite | governance-only | methodology):
governance-only and methodology (no code, no CI, no artifact production -- the closest fit to
"docs/journal") get tracking_mode: "internal", external_provider: null written silently, no
question, even for a scripted --profile install (it is a deterministic default, not a prompt, so
there is nothing for non-interactive mode to skip). full and lite ask once, interactively only --
mirroring the existing hub question's own gating (!options.profile) exactly; a scripted full/lite
install leaves the field unset, to be resolved later by the retrofit wizard, same as role today.

**D6 - Question wording (EF-14 point 3).** Replaces the ambiguous internal/external framing
with: "Track work in this repo (TODO.md / PRDs)" vs. "Track work in an external tracker (Azure
DevOps / Jira / other)." A second question only fires when external is chosen: "Which external
tracker?" (Azure DevOps / Jira / Other).

**D7 - Not in scope: EF-04's unified setup-flow ask.** EF-14 cross-references EF-04 (profile
selection and tracker mode are coupled classification decisions... asked as one coherent setup
flow). EF-04 is docs-mode, explicitly excluded from this run (operator scope decision). This PRD
keeps profile selection (existing step 1) and tracking-mode selection (new step) as two
sequential questions, not merged -- EF-04's deeper UX unification stays open, undisturbed.

**D8 - {BUSINESS_ROOT} resolution matches the existing ungated idiom exactly.** "Resolve
{BUSINESS_ROOT} from .arcane.json's business_root field (default ventures/ if unset)." -- no
new pattern invented; copies the two already-correct, non-hub-gated examples' wording.

## Requirements

| # | Requirement | Acceptance Criteria |
|---|---|---|
| R1 | New ADR amends ARC-020, scoped to tracking_mode/external_provider | DECISIONS.md; ARC-020 itself untouched |
| R2 | ExternalProvider type corrected to ado, jira, or other | src/types.ts |
| R3 | readManifest rejects unsupported tracking_mode/external_provider values | New ManifestInvalidFieldError; src/modules/manifest.ts |
| R4 | spell init asks/defaults tracking_mode once, persists it | src/commands/init.ts; behavior per D5/D6 |
| R5 | spell update backfills tracking_mode for pre-existing installs | src/modules/hub.ts retrofit entry |
| R6 | spell-open-session/spell-plan resolve from manifest before asking | Root .arcane.json -> self-hosted source manifest -> PRD frontmatter -> ask |
| R7 | Five EF-08 files resolve {BUSINESS_ROOT} instead of hardcoding ventures/ | spell-check-drift, spell-commit-work, spell-open-session, spell-plan, spell-todo |
| R8 | EF-14.md, EF-08.md flip to shipped | Frontmatter |

## Constraints

- No full manifest schema validator (e.g. zod). Validation is narrowly scoped to the two fields
  this PRD adds meaning to -- matches prior WPs' proportionate-scope precedent.
- status.ts is not changed -- it has no existing "show profile/role" precedent to extend
  (component table + version footer only); adding a tracking_mode display would be a new UI
  surface EF-14 does not ask for.
- doctor.ts's self-host check is untouched -- it inlines its own ad hoc type reading
  src/assets/.arcane.json directly, bypassing ArcaneManifest/readManifest entirely; this PRD's
  validation and type changes do not reach it, and it is not broken by them.
- Self-hosted source manifest (src/assets/.arcane.json) already has correct values
  (tracking_mode: "internal") -- no change needed there.

## Dependencies

None new. Builds directly on ARC-030's MANIFEST_RETROFITS mechanism.

## Open Questions

None blocking. ARC-020's broader schema-unification question (operator identity, provider
coordinates, repository lists; inline-vs-separate-file for those data classes) remains explicitly
open, owned by ARC-020 itself, not this PRD.
