---
title: "PRD: Scoped authority for unattended runs"
status: approved
implementation_status: shipped
created: 2026-11-05
tracking:
  tracking_mode: internal
  external_provider: null
  githubIssueId: null
source_issues: [438, 439, 440]
---

# PRD: Scoped authority for unattended runs

## Problem Statement

An operator can request an unattended run while present, but the interactive
commit and completion gates require approval of artifacts that do not exist yet.
The standing delegation record neither changes those gates nor supports expiry.
Consequently a session either stops after the operator leaves or executes without
making its authority visible. Platform policy can also prevent completion, but is
often discovered too late. Session close does not account for earlier actions.

Sources: [#438](https://github.com/codemagicianhq/arcane/issues/438),
[#439](https://github.com/codemagicianhq/arcane/issues/439), and
[#440](https://github.com/codemagicianhq/arcane/issues/440).

## Target Users

Operators asking an interactive agent to finish a bounded task while unattended,
and reviewers who need evidence of the authority used for each action.

## Requirements

### Must Have

- **UR-01 — Temporary run grants (#438).** Record the grantor, the operator's
  words verbatim, repository, task, branch prefix, explicit permitted and excluded
  actions, required completion checks, grant time, expiry, and revocation state.
  Support repositories with and without a roster. Existing standing delegations
  retain their meaning; they do not silently become run grants.
- **UR-02 — Action-specific authority (#438).** Commit, PR creation and completion
  spells check the active grant immediately before acting and print its ID,
  action, branch or PR and current head SHA. Completion requires `complete-pr`;
  neither commit permission nor PR assignment implies it. A missing, invalid,
  expired, revoked or out-of-scope grant preserves the existing downgrade path.
  Preserve explicit `exec_allowed: false`, push-policy restrictions, platform
  permissions, review requirements and checks. A grant never authenticates itself:
  its record must be tied to the operator's instruction while present.
- **UR-03 — Discovery (#438).** `spell doctor` lists active run grants and expiry,
  distinguishes expired/revoked grants, and handles malformed records without
  crashing. Legacy delegation files continue to work.
- **UR-04 — Shared preflight (#439).** Before an unattended run, full-cycle,
  implement and the parallel-workers orchestrator use one shared fragment to
  batch blocking questions, verify grant scope and platform capabilities, and
  record what can run and exactly what waits for the operator. GitHub checks
  include required reviews (an author cannot approve their own PR), PR validation
  and allowed merge methods. Azure DevOps checks include creator-vote policy,
  required reviewers, build validation and allowed merge methods. Unknown policy
  is reported as unknown, never as permission. Where no PR validation exists,
  required local checks run against the exact completion head.
- **UR-05 — Authority accounting (#440).** Session close reports every session
  commit range and completed PR, its exact head, and the recorded authority:
  fingerprint approval, PR-bound approval, active grant ID, validated autonomous
  Magus+, or none. Missing authority is visible under Action required. Never
  backdate a grant to legitimize a past action. Reconcile the final report after
  the session-close commit and completion themselves.
- **UR-06 — Distribution and verification.** Change canonical assets, regenerate
  dogfood copies and test both positive and refusal cases. Document the authority
  change in an ADR, user-facing release notes and a minor version bump.

### Should Have

- Examples of a commit-only grant, an expired grant and a platform-blocked run.
- A concise authority table usable in the handoff and final closure report.

### Won't Have (this iteration)

- Signing or remote issuance of grants, a privileged execution service, automatic
  promotion of roster power, platform-setting changes or bypassing required checks.
- Self-approval on GitHub, production deployment, arbitrary force pushes, or
  execution of command text stored in a grant.

## Constraints

- Respect ARC-023's distinction between executable checks and spell gates, and
  ARC-039/045's canonical-source and fragment compilation rules.
- No new runtime dependency. Preserve existing delegation compatibility.
- A file can record operator consent but cannot prove it. Spell gates must verify
  provenance against the session; doctor validates/displays records only.
- One session branch and one PR: the three issues overlap on authority gates.

## Acceptance Criteria

- [x] A scoped active grant permits commit without inventing autonomous status.
- [x] Completion is denied without `complete-pr`, even when commit is permitted.
- [x] Expired, revoked, malformed, excluded and mismatched grants fail closed.
- [x] Doctor lists valid active grants with expiry and preserves legacy output.
- [x] All three orchestrating spells contain the same compiled preflight.
- [x] Preflight covers both providers, validation, review restrictions and merge
      methods, and explicitly lists actions waiting for the operator.
- [x] Close accounts for every earlier and final commit/PR action; absent
      authority appears under Action required and remains visible in the handoff.
- [x] Regression tests, full coverage, lint, typecheck, build, catalog, parity,
      release, report, ADR and leak gates pass; review covers the trust boundary.

## Dependencies

Existing delegation records, EF-27 roster validation, commit/PR authority gates,
platform policy inspection, shared-fragment compiler and Action required block.

## Open Questions

None. On 2026-11-05 the operator chose full implementation and merge, approved
the proposed design with remaining technical details delegated to this session,
and authorized this run until completion with a 24-hour cap.

Related: [[DECISIONS]], [[TODO]], [[.arcane/governance/agent-policies]].
