---
status: accepted
tracking_mode: internal
source_intake: batch-001 (EF-22)
---

# PRD — Accept ARC-022 and Wire Fail-Safe CI Path-Filter Policy

## Problem

Arcane's own CI/CD governance template (`cicd-standards.md`) prescribes path-filter patterns that
contradict the fail-safe principle it should model: the .NET and Terraform pipeline templates use
`paths.include`, which silently skips any new code directory added outside the listed path (fails
*open* — a security/quality gap); the Node.js template has no path filter at all, so a pure docs
commit burns a full pipeline run (wasteful, though not unsafe). No template documents aligning
Azure DevOps branch-policy path filters (a separate mechanism from YAML triggers) with the
pipeline's own trigger paths, and nothing prohibits `[skip ci]`/commit-prefix-based CI skipping.

Re-verified against current HEAD: all four templates in `src/assets/.arcane/governance/cicd-standards.md`
are unchanged from what the intake describes — `.NET Backend Pipeline` (L66-68) and
`Terraform Pipeline` (L139-141) both use `paths.include`; `Node.js Pipeline` (L98-128) has no path
filter; `Markdown Lint Pipeline` (L168-170) also uses `paths.include` scoped to `**.md`.

**ARC-022** (DECISIONS.md, currently Proposed) already specifies the resolution: base CI skipping
only on changed paths, never commit metadata; prefer narrow exclusions for known-inert doc
locations so new code paths fail safe; pipeline definitions, manifests, lockfiles, scripts,
migrations, containers, and infrastructure always remain triggering inputs; provider branch-policy
filters must be documented and tested alongside YAML triggers. This PRD accepts that ADR and
implements it.

## Design nuance: not every include filter is the anti-pattern — but the glob SHAPE decides that, not the pipeline's category

**Correction, made after adversarial review found the first version of this section wrong:** an
earlier draft argued that "narrowly-scoped, technology-specific" pipelines (Terraform,
Markdown-lint) are inherently exempt from ARC-022's anti-pattern just by virtue of having a scoped
purpose. That argument was not internally consistent, and review proved it empirically: this
document's own Markdown-lint template used a **filetype** glob (`**.md`, matching any Markdown
file at any depth) while the Terraform template used a **directory-prefix** glob
(`infrastructure/terraform/**`, matching only files under one named directory) — the two were
treated as the same category of "correctly scoped," but only one of them actually has the closure
property that makes include-scoping safe. A new `.tf` file added *outside*
`infrastructure/terraform/**` (a new `modules/**` root, a renamed folder) would have silently
never triggered — exactly ARC-022's "new code locations fail open" failure, and exactly what
EF-22's own Verification section flagged for the Terraform template, grouped in the same sentence
as .NET's `src/**` problem — not treated as a different, exempt category anywhere in ARC-022's or
EF-22's own text. That distinction was this PRD's invention, not the source material's, and it
didn't hold for one of the two examples used to justify it.

**Corrected principle:** the deciding factor is the glob's own shape, not which pipeline it
belongs to. A **directory-prefix** include glob (`path/to/dir/**`) fails open — new content
elsewhere is invisible to it. A **filetype** include glob (`**/*.ext`) does not — it matches that
filetype at any depth, so it has the same "can't miss a new location" property an exclude filter
has, just inverted (matches everything of a kind, rather than everything except a kind). Two
different fixes follow:

- **.NET, Node.js** (general "validate this codebase" pipelines, no natural filetype/path scope of
  their own): convert to **exclude**-based filters — trigger on everything except a narrow, named,
  filetype-scoped list of known-inert paths (`**/*.md`, not `docs/**` — see the exclude-list
  correction below). Any new code directory triggers by default.
- **Terraform, Markdown-lint** (pipelines whose job is inherently about one filetype): keep
  **include**-based filters, but as **filetype** globs (`**/*.tf`/`**/*.tfvars`, `**.md`), not
  directory-prefix ones — Terraform's template was corrected from the latter to the former as part
  of this fix. Both are widened to also cover their own pipeline-definition file (satisfying
  ARC-022's "pipeline definitions... remain triggering inputs" requirement), and the document now
  states explicitly *why* filetype-scoped include-scoping is the right call here, distinguishing
  it from the directory-prefix anti-pattern ARC-022 actually rejects.

**A second correction in the same review round:** the .NET/Node.js exclude list originally named
whole directories (`docs/**`, `journal/**`, `.arcane/governance/**`), not just `**/*.md`. That's
also directory-wide, not content-type-scoped — it would exclude *any* file found under those
paths, including a script, manifest, or tooling config a consumer might place there, directly
contradicting ARC-022's unconditional list. Simplified to the single filetype-scoped `**/*.md`
entry, which excludes only genuine Markdown, anywhere in the tree, and nothing else.

## Requirements

| # | Requirement | Acceptance Criteria |
|---|---|---|
| R1 | ARC-022 flips Proposed → Accepted | DECISIONS.md |
| R2 | .NET and Node.js templates use exclude-based path filters | Narrow exclude list (docs, journal, governance-only paths); pipeline/manifest/lockfile paths never excluded |
| R3 | Terraform and Markdown-lint templates stay include-based, widened to cover their own pipeline definition | Each template's include list also covers its own YAML file's path |
| R4 | Explicit rule: never use commit message/author/branch name as a CI trust signal | Stated in cicd-standards.md, matching ARC-022's rejected-alternatives reasoning |
| R5 | Branch-policy path-filter alignment documented | New guidance: ADO branch-policy path filters (a separate mechanism from YAML triggers) must match or be a superset of the YAML trigger scope, or a change can merge without CI having been required |
| R6 | Fixture-shaped acceptance coverage for docs-only / code-only / mixed / new-directory / pipeline-definition changes | String-assertion tests on the governance doc (honest scoping — these are templates for consumers, not Arcane's own executable pipeline) |
| R7 | EF-22.md flips to shipped | docs/intake/batch-001/EF-22.md |

## Constraints

- `cicd-standards.md` is a **template** for consumers (Azure DevOps pipelines) — Arcane's own CI is
  GitHub Actions (`.github/workflows/ci.yml`) with no path filters at all, which is already the
  correct fail-safe default and needs no change. This PRD does not touch `.github/workflows/ci.yml`.
- No application code changes. `.arcane/governance/` is parity-managed → version bump required.
- Enforcement is string-assertion tests on the governance doc's content — YAML syntax validity can
  be checked (these are real YAML fragments), but the *policy correctness* (fail-safe, no
  commit-message trust signal) has no code-executable equivalent, matching prior WPs' honest ARC-023
  scoping for this class of governance content.

## Dependencies

None new.

## Open Questions

EF-22's own open question ("should Arcane ship provider-specific branch-policy examples or limit
itself to invariants and tests") is resolved toward **invariants**: R5 documents the alignment
*requirement* and what can go wrong, not a full provider-specific walkthrough — consistent with
this repo's existing pattern of `.arcane/governance/` docs being provider-adaptable templates.
