# Unattended preflight: issues #448–#454

Observed 2026-11-06 UTC. Repository `github.com/codemagicianhq/arcane`, base `main` at `e8f47edb4d74aaa1e3535dbfa54a3e80fb58def9`; run branch `sessions/2026-11-06-issues-448-454`; authenticated GitHub CLI user `payini`. GitHub reports repository push/admin permissions. No open PRs observed. The self-hosted source manifest has no push policy field, which means open under [[.arcane/governance/git-conventions]]. Hooks path is `.husky/_`.

Grant `issues-448-454-2026-11-06` expires 2026-11-07T08:00:00.000Z or on completion and cleanup, whichever is earlier. It authorizes commit, push, create-pr, assign-pr, complete-pr and delete-remote-branch for the named issues and prefix. It excludes approve-pr, dev-pipeline execution, force-push, production deployment and platform settings changes. Validate the grant immediately before each action. Never reuse the previous grant.

GitHub effective branch rules endpoint and repository settings report merge and rebase allowed, squash disabled, auto-merge enabled. Ruleset 18841659 requires zero standard approving reviews, no code-owner or last-push approval, but has `require_extra_approval_for_unattributed_changes`. Classic protection returned 404. Required checks: `Lint, typecheck, test, build`; `PR branch is rebased on target`; `Review round clear`; `Fixture tests (macos-latest)`. Required checks are strict and must pass for the exact current PR head. Check review decision, review rounds, rules, checks, and grant again at completion. Any independent approval or other new gate remains for its reviewer. PRs are assigned to payini.

| Action | Unattended | Waits for operator |
| --- | --- | --- |
| Commit, push, create and assign PR | Yes, within the scope and grant, while hooks and push policy permit | Any changed policy, access failure, or gate that requires operator action |
| Completion and deletion | Yes after exact-head checks, review gates, allowed strategy and landed-content verification | Independent approvals, unresolved required review or checks, inaccessible policy, or expired authority |
| Auto-merge | Only while monitored and canceled before grant expiry if still pending | No unattended completion beyond expiry |
| Production deployment, platform settings, approval under operator identity | No | Outside this grant |

Issue-specific plan and acceptance criteria are in [[features/issues-448-454/PRD]]. Work is serialized because #448 and #452 touch the same session spell and #450/#454 touch commit guidance. User-specified issues are #448–#454, the open issue set returned by GitHub at intake. Later issues are not in scope.
