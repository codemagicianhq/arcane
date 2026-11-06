# Shipping run: Unattended Run 1.22.0

Scope: ship the prepared [[features/unattended-run-spell/PRD]] in github.com/codemagicianhq/arcane. Base eb702c64c0616c6f6d681f9d5f98d41f10becbf4. Branch prefix sessions/2026-11-06-unattended-run-spell. No additional application is being built in this run.

Preflight observed 2026-11-06 UTC: authenticated gh identity payini, repository push/admin access, target main, no open PRs. Push policy is open (self-hosted manifest field absent). Effective branch rules allow merge/rebase, require zero standard approvals and preserve the extra unattributed-change approval condition. No code-owner or last-push approval required; classic protection returned 404. Required checks: Lint, typecheck, test, build; PR branch is rebased on target; Review round clear; Fixture tests (macos-latest). Auto-merge enabled; squash disabled. Policy sources: repository metadata, rules/branches/main and branches/main/protection GitHub endpoints. npm latest observed 1.21.2.

Grant ship-unattended-run-2026-11-06, task ship-spell-unattended-run-1.22.0, expires 2026-11-07T10:00:00.000Z or completion/cleanup, whichever is earlier. Bootstrap commit 2753ba5 records the operator's actual authorization. Permits commit, push, create-pr, assign-pr, complete-pr and delete-remote-branch; excludes approval, force-push, production deployment, settings changes and dev-pipeline dispatch. Check immediately before each action. Assign PRs to payini. Do not reuse earlier grants or this grant for later work.

| Action | Unattended | Requires operator if |
| --- | --- | --- |
| Commit, push, create and assign PR | Authorized, within scope and with hooks/policy | Access or policy changes |
| Auto-merge/completion | Rebase, bound to current PR head and monitored | Independent approval or a failed/unavailable required gate |
| Branch cleanup | Only verified landed run-owned branches | Content is unmerged or ownership uncertain |
| Publication verification | Observe existing release workflows and install package in scratch directory | Publication needs unsupported manual action |

Local evidence: 3,134 passed, six skips, 93.73% lines; authoring review records the other passing checks. New grant is additional metadata; existing feature source remains the tested tree. PR, main CI, publication, scratch smoke and close-session outcomes are pending at this checkpoint.

## Delivery verified

PR #460 merged by rebase to dc625213e0b936884039022cc59252053771d4ea. All seven PR checks, main CI 42203498399, release-drift 42203498367 and publish 42203527711 succeeded. Release v1.22.0 targets that commit. The first npm install returned ETARGET while npm was processing the accepted publication; the publish log explicitly reported this delay. A fresh registry lookup then succeeded. A scratch install at /private/tmp/arcane-1220-verify.3xJHdW returned 1.22.0 and scaffolded a consumer with all 43 spells, including the canonical new spell and the three discovery clients. No global installation was replaced.

Feature commits are patch-equivalent to main and their trees matched. Its remote branch was already absent and the local branch was removed after verification. Closeout runs on sessions/2026-11-06-unattended-run-spell-close. Its commit, PR/checks/completion and cleanup are planned after this record; the final chat report reconciles their outcomes. Authority ends on completion despite any residual active record status; no new task may reuse it.
