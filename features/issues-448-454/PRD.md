# PRD: Session workflow and update accuracy

---
tracking:
  tracking_mode: internal
  external_provider: null
---

## Problem statement

Seven reported defects make session handoffs, update reporting, PR testing evidence, merge strategy, attribution, and release gates unreliable for Arcane consumers. See [[.arcane/governance/development-methodology]] and GitHub issues #448–#454.

## Target users

Operators and agents using Arcane in consumer repositories on GitHub or Azure DevOps.

## Requirements and acceptance criteria

- **#448:** The managed-file drift warning specifies the repository-scoped `spell update`, not `--user`, and its clean-working-tree prerequisite.
- **#452:** Before consuming a trunk handoff, check open session PRs for newer handoffs in the same file; surface the newer handoff and PR and do not write a consumed marker on trunk while that PR is open. Handle unavailable provider evidence without a false assurance.
- **#453:** Determine whether the target has PR validation before using a CI-results reference. When no PR validation exists, report actual local checks or say no CI runs; do not imply a pipeline ran.
- **#454:** Document that the Azure CLI `--squash false` completion creates a merge commit; provide a policy-permitted REST rebase path for linear-history repositories and verify resulting target history.
- **#449:** Before a production deploy or flag flip, search the repository's open backlog entries for target-related prerequisites; report each with file and line or explicitly report none. Record the operator's actual words for any waiver.
- **#450:** Document and honor a repository-declared attribution convention, including operator author and configured trailers, while preserving the existing default behavior. Cover both settings in tests and retain required authority and provenance checks.
- **#451:** Distinguish changed from unchanged files in normal and dry-run update summaries, with regression coverage for mostly identical content. Count actual prospective content changes, including relevant managed file paths.

## Constraints

- Limit scope to #448–#454 and supporting run governance. Serialize overlapping changes. Do not change platform settings, force-push, approve under the operator's identity, or deploy production.
- Preserve repository policy, required checks, hook execution, attribution transparency, and existing behavior except where the issue explicitly asks for change. Keep canonical and installed managed content in parity.
- Verify each reported root cause against current source. Use non-squash merge, exact-head checks, and release verification when a release is expected.

## Dependencies

GitHub access and the current main branch, CI checks, an independent reviewer when required, and publication pipeline access for release verification.

## Open questions

None identified yet. Technical details will be resolved within the issue acceptance criteria; newly discovered product decisions or platform gates will be surfaced.
