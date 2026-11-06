# Preflight result: issues #438–#440

Observed 2026-11-05 (UTC 2026-11-06). Target: `github.com/codemagicianhq/arcane`,
`main`, base `7af78bf`, session branch `sessions/2026-11-05-unattended-run-authority`.

- CLI identity: `payini`, verified with `gh auth status` outside the sandbox.
  The earlier sandbox result incorrectly suggested invalid authentication; the
  successful authenticated query contradicted it. No credential was changed.
- `gh api repos/codemagicianhq/arcane` reports merge/rebase enabled, squash disabled,
  auto-merge enabled and remote branch deletion enabled.
- `gh api repos/codemagicianhq/arcane/rules/branches/main` reports required approvals
  0, no code-owner or last-push review requirement, strict status checks and
  merge/rebase as allowed methods. Four required checks: Lint, typecheck, test,
  build; PR branch is rebased on target; Review round clear; Fixture tests
  (macos-latest). Read classic protection as well before completion.
- Repository tracking is internal; push policy is absent, therefore open under
  ARC-049. No installed roster; no standing power is claimed.
- Grant: `issues-438-440`, expiry `2026-11-07T07:40:27.000Z`, stops earlier on
  completion (including release verification and merged-branch cleanup). The
  operator explicitly authorized commits and full implementation through merge
  in this chat before the record's bootstrap commit. This instruction is the
  authority; the newly written JSON is its record, not its source.
- Local gates: grant `requiredChecks` plus the approved plan's review/security
  review. Each completion head is checked again. No platform setting is changed.

| Action | Will run unattended | Will wait for operator / reason |
| --- | --- | --- |
| Commit, push, PR creation and assignment | Authorized by this run; assign to payini | None observed |
| PR approval | Not requested or needed; GitHub authors cannot self-approve | Independent review if new policy requires one |
| Completion and merged remote branch deletion | Authorized after checks and review; merge commit | A future required review or expired grant |
| Unrelated operations, settings, force-push, production deploy, manual publish | Excluded | A separate operator instruction |

Use auto-merge only with active expiry monitoring; otherwise wait for checks and
revalidate immediately before completion. No unanswered product question remains.
This run uses GitHub; ADO voting/build/merge preflight is documented from Microsoft's
policy specification and verified by prompt-contract checks, not a live ADO PR.

Related: [[PRD]], [[architecture]], [[DECISIONS]].
