# Arcane issues 463–470

- Run and grant ID: `issues-463-470-2026-11-10`.
- Repository: `github.com/codemagicianhq/arcane`. Isolated checkout on `sessions/2026-11-10-issues-463-470`.
- Base: `73b36231aaf381fdc6a56e37fbe09c1959d04334`. The open issue snapshot contained exactly #463–#470, with no open PRs at preflight.
- Outcome: one PR to `main`, automatic GitHub/npm release, package smoke check and cleanup of the run branch.

## Milestones and acceptance

1. #463, #468, #469: repair the phase table and assert its width. Add Azure Pipelines guidance for dependency-specific conditions and untrusted output.
2. #466, #467: require the session to run and record the security review before approval. Keep PRs draft until requested work and reviews finish.
3. #464, #465, #470: correct historical UTC dates and gate date order. Use a stable non-HTTP state schema ID, identify the shipped schema in CLI help, and generate a folder-by-folder asset installation catalog.

## Preflight and authority

- Consent in this chat: “Authorize the full run and grant commit” in response to the scoped plan for issues #463–#470. Expires November 11, 2026 at 10:00 a.m. Pacific, or on completion. See `.arcane/delegations.json` for actions, checks and revocation.
- GitHub CLI identity: `payini`. Observed November 10 Pacific. Repository merge and rebase methods are enabled, squash disabled. GitHub ruleset 18841659 applies on `main`. Classic branch protection endpoint returned “Branch not protected”.
- Required checks: Lint, typecheck, test, build; PR branch is rebased on target; Review round clear; Fixture tests (macos-latest). Effective ruleset lists zero required approving reviews and no code owner or last push review. Recheck current review decisions and required checks before completion.
- The grant covers commit, push, PR creation, completion and deletion of the merged run branch. No assignee or approval action. No manual publish, deployment, spend, force push, unrelated cleanup or settings change.
- Stop the dependent action after three failures of the same operation, at expiry, or if GitHub requires independent review. Resume only while the grant remains valid and the observed scope matches.

## Execution

Preflight complete. Awaiting implementation and validation.
