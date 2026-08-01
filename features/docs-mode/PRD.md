---
title: "PRD: Documentation Repository Mode"
status: accepted
implementation_status: queued
tracking:
  tracking_mode: internal
  external_provider: null
source_intake: batch-001
accepted: 2026-07-31
---

# PRD: Documentation Repository Mode

## Problem Statement

Arcane recognizes docs-only repositories in governance but does not express that model in installation profiles or executable spell behavior. Existing records trees must improvise onboarding, subject layout, Git policy, sensitive-content handling, supersession, and local-only session closure. Implementing those gaps independently would produce a profile with contradictory assumptions.

This PRD is the single design and delivery unit for EF-03, EF-04, EF-07, EF-10, EF-11, EF-12, EF-17, and EF-19.

## Implementation Gate

The design is accepted, but implementation is queued behind the shipped-code defects EF-25 through EF-29. EF-25 is the first implementation priority. Arcane must stop destroying user-owned decision, backlog, and handoff history on update before adding a new profile.

PRD acceptance does not authorize docs-mode implementation ahead of those fixes. EF-29 and this PRD's local-only lifecycle requirement are designed jointly so session opening never creates branches that EF-19 cannot integrate.

## Target Users

- Operators adopting Arcane in an existing documentation or records repository.
- Single-subject repositories whose root represents one entity, household, archive, or body of work.
- Portfolio repositories containing multiple businesses or subjects.
- Local-only repositories with no remote or PR provider.
- Repositories where documents are sensitive by default rather than exceptionally.

## Requirements

### Must Have

#### MH-01 — Installable docs profile

Add `profile: docs` as a first-class CLI profile. It installs only domain-agnostic session, documentation, governance, and capture workflows. It must not install code implementation, stack-expert, test-coverage, deployment, or PRD-enchantment workflows unless a separate mixed profile explicitly requests them.

Acceptance criteria:

- `spell init` lists and accepts the docs profile.
- The installed component set is asserted in tests, including explicit exclusions.
- Spells retained in the profile do not require source code, tests, CI, or an external tracker to complete their core workflow.

#### MH-02 — Subject shape and root

Initialization asks whether the repository represents one subject, a portfolio, or a mixed model. Define `{SUBJECT_ROOT}` independently from `{BUSINESS_ROOT}`. A single-subject repository must not be forced into a redundant `ventures/<repo-name>/` wrapper.

Acceptance criteria:

- One-subject, portfolio, and mixed choices have documented output structures.
- Root-as-subject is either supported explicitly or rejected with a concrete alternative.
- Root choices persist through the canonical configuration schema from ARC-020; no spell hardcodes `ventures/` when another root is configured.

#### MH-03 — Repository-owned Git text and binary policy

Emit a docs-appropriate `.gitattributes` and `.gitignore`. The attributes file begins with `* text=auto eol=lf`, followed by explicit binary overrides for supported document/image formats. Ignore transient Office lock files, OS metadata, and supported sync-client artifacts.

Acceptance criteria:

- Windows and Linux fixtures produce the same text blobs and clean status after checkout.
- A negative review fixture with CRLF working files reports only real content changes.
- `git check-attr` confirms binary formats resolve to `text: unset` after the LF baseline.
- Mixed docs/code repositories do not suppress meaningful build inputs solely because of file extension.

#### MH-04 — Adopt an existing document tree

Provide a dry-run-first adoption workflow for an existing folder. A complete `spell-adopt-docs.prompt.md` draft already exists, was written against `spell-authoring-standards`, and is the required implementation input. Obtain it from the maintainer; do not re-derive it from this PRD.

Review the supplied draft against the final profile, subject-root, sensitive-content, Git-safety, and local-only lifecycle decisions. Preserve the draft where compatible and document deltas where this unified design changes an assumption.

Acceptance criteria:

- Inventory occurs before any move, rename, or deletion.
- The operator approves a proposed mapping before mutation.
- Existing documents are referenced without transcribing sensitive contents into the Arcane layer.
- Failure and rollback behavior are explicit for every mutating phase.

#### MH-05 — Supersession and quarantine convention

Define how records become superseded without being silently deleted. The convention includes location, naming, replacement links, retention metadata, and a decision point for external regulatory requirements.

Acceptance criteria:

- A superseded record remains discoverable from its replacement and vice versa.
- The profile does not prescribe deletion where retention policy is unknown.
- The convention works per subject and does not assume every child directory is a business.

#### MH-06 — Sensitive-content boundary

Docs mode treats the underlying document as potentially sensitive. Arcane journals, decisions, TODOs, prompts, and screenshots form a separate metadata layer and follow least-copy rules.

Acceptance criteria:

- Agents reference sensitive documents by path and do not transcribe contents into Arcane metadata by default.
- Screenshot retention defaults to off unless explicitly justified.
- Sanitized summaries identify what was omitted and why.
- Secrets, PII, financial figures, account identifiers, and client identities do not cross into distributable framework artifacts.

#### MH-07 — Remote-aware local-only lifecycle

Session opening and closing share one observed remote-capability decision:

- With a usable remote and merge path, create a session branch lazily immediately before first mutation and close through the supported integration flow.
- With no remote, remain trunk-only, skip PR/pull operations, and close locally without accumulating dead branches.

Acceptance criteria:

- Remote + read-only, remote + mutation, no-remote + mutation, existing session branch, active-PR branch, and worktree scenarios are tested.
- Every branch state created by open-session has a valid close-session integration path.
- A configured but unwritable or unsupported remote does not masquerade as a usable merge path.

#### MH-08 — Profile-aware spell behavior

All retained docs-profile spells detect and honor the profile. Inapplicable code/test/CI steps are skipped explicitly rather than attempted or silently assumed complete.

Acceptance criteria:

- Session, TODO, document, save-idea, status, drift, and feedback flows complete in a repository with no code, tests, CI, remote, or PRD.
- Output states which gates are not applicable and why.
- Governance and executing spells agree on docs-only branch and merge behavior.

### Should Have

- Offer Git LFS guidance when repository size or binary churn crosses documented thresholds.
- Detect likely sync roots and warn without claiming the sync provider caused an observed lock failure.
- Provide migration guidance for adding `.gitattributes` to an existing history without silently renormalizing user work.

### Won't Have

- Repository-level encryption as an automatic default.
- Automatic retention-policy selection for regulated records.
- A universal archive directory imposed without subject or regulatory context.
- Implementation before EF-25 through EF-29 are resolved.

## Constraints

- ARC-019 must settle the operator-owned versus managed document model before orientation stubs are added.
- ARC-020 must define upgrade-safe storage for profile and root choices.
- EF-17's framework-repository mitigation does not by itself satisfy consuming-repository installation.
- EF-13 filesystem behavior remains deferred research and must not be presented as a proven sync-client diagnosis.
- Existing repositories require dry-run and explicit approval before structural changes.

## Acceptance Criteria

- [ ] All eight intake reports map to at least one Must Have requirement.
- [ ] EF-25 through EF-29 are resolved before implementation begins.
- [ ] The supplied MH-04 draft is reviewed as an input, not rewritten from scratch.
- [ ] Profile install/uninstall/update behavior is covered by lifecycle tests.
- [ ] Windows and Linux EOL fixtures pass.
- [ ] Remote and no-remote session lifecycles both pass end to end.
- [ ] Sensitive-content tests prove Arcane metadata does not copy fixture record contents.
- [ ] Documentation and spell behavior carry no unresolved contradiction about docs-only PR requirements.

## Dependencies

- [ARC-019](../../DECISIONS.md#arc-019--repository-document-ownership-and-path-model)
- [ARC-020](../../DECISIONS.md#arc-020--canonical-repository-configuration-schema)
- [EF-25](../../docs/intake/batch-001/EF-25.md) through [EF-29](../../docs/intake/batch-001/EF-29.md)
- Maintainer-supplied `spell-adopt-docs.prompt.md` draft for MH-04

## Requirement Traceability

| Intake item | Requirement  |
| ----------- | ------------ |
| EF-03       | MH-04        |
| EF-04       | MH-01, MH-08 |
| EF-07       | MH-02        |
| EF-10       | MH-03        |
| EF-11       | MH-05        |
| EF-12       | MH-06        |
| EF-17       | MH-03        |
| EF-19       | MH-07        |

## Open Questions

- What is the final component list for the docs profile after a source audit of each retained spell?
- Can `{SUBJECT_ROOT}` and `{BUSINESS_ROOT}` coexist, and which one takes precedence for shared documents?
- What formats belong in the default binary override list versus optional extensions?
- What exact condition defines a usable remote and merge path?
- Which retention metadata is framework-generic enough to ship without implying legal advice?
