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

- All eight fixes implemented and validated locally. See the journal for per-issue acceptance and review evidence.
- The coverage gate passed: 3,145 tests passed, six skipped, 93.73% lines and 87.79% branches. Build, UTC changelog check, 389-item parity check, catalog check, distributed ADR reference check and version bump gate passed.
- GitHub merge, issue closure and release are pending at this checkpoint. Recheck the source branch PR with `gh pr list --head sessions/2026-11-10-issues-463-470 --state all --json number,state,url,headRefOid,mergeCommit`. Verify the Release and npm version separately, then smoke-test the published package before closing the run.
- The prior close-session checkout has its own staged handoff and journal. This run's continuity is recorded here to avoid a concurrent edit of that handoff.
