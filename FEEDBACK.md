# Feedback Log

---

## Feedback — spell-commit-work push step (2026-09-29)

**Session:** Upstream Intake 2026-09 close-out and scope (routed by spell-close-session from Lessons Learned)
**Rating:** N/A   **Would use again:** N/A
**Submitted by:** developer

### Friction Points
- A push to a topic branch whose pull request had just been rebase-merged silently recreated the remote branch the merge had auto-deleted (`[new branch]`, and `origin/<trunk>...HEAD` read `2 4`, four commits ahead of trunk with two already merged); the push step has no check that the branch's PR is still open.

### Improvement Items
- [ ] Before any push, have the commit spell's push step run a provider PR-state check for the current branch (for example `gh pr list --head <branch> --state all --json number,state`), and stop with the merged PR's number when it is `MERGED` instead of pushing. <!-- upstream: filed https://github.com/codemagicianhq/arcane/issues/321 (2026-10-01) -->

### Raw Notes
> Source: `journal/2026-09-29-upstream-intake-closeout-and-scope.md`, lesson "A push to a branch whose PR just merged recreates the deleted remote branch".

## Feedback — spell-close-session handoff block (2026-09-29)

**Session:** Fix the Windows-only up02-a test path masking, ship #309 (routed by spell-close-session from Lessons Learned)
**Rating:** N/A   **Would use again:** N/A
**Submitted by:** developer

### Friction Points
- A previous session's handoff `Blockers` field stated an environment diagnosis ("the pre-push hook still fails on this machine, so every push needs `--no-verify`") as a standing fact; the next session inherited it and its opening prompt repeated it, but the cheap check (`npm test`, about 90 s) passed three times that day and the push went through the hook normally. The handoff has no way to mark an environment claim as "observed on <date>, re-verify before relying on it".

### Improvement Items
- [ ] Have spell-close-session's handoff `Blockers` and `Notes` fields require a date and a one-line verification command on any claim about the local environment (a failing hook, a broken tool, a flaky test), and have spell-open-session re-run that command before repeating the claim to the operator. <!-- upstream: filed https://github.com/codemagicianhq/arcane/issues/322 (2026-10-01) -->

### Raw Notes
> Source: `journal/2026-09-29-up02-a-windows-path-masking.md`, lesson "\"Fails deterministically\" is a claim with a date on it".

---

## Feedback — git-conventions worktree removal (2026-09-29)

**Session:** Epic 1 "Safety fixes" of the 2026-09-28 upstream intake, and the ARC-052 draft (routed by spell-close-session from Lessons Learned)
**Rating:** N/A   **Would use again:** N/A
**Submitted by:** developer

### Friction Points
- `git worktree remove --force` on a scratch worktree whose `node_modules` was a junction to the primary checkout's `node_modules` followed the junction and emptied the real directory (194 entries to 0). `npm ci` restored it and no tracked file was touched, but nothing in the governance docs that tell an agent to remove a worktree (`git-conventions.md` Post-Merge Cleanup, `spell-close-session` step 10) mentions links inside a worktree.

### Improvement Items
- [ ] Add a warning to the worktree-removal instructions in `git-conventions.md` (and the pointer in `spell-close-session` step 10): before `git worktree remove --force`, list the worktree for junctions or symlinks (for example `Get-ChildItem -Force <path> | Where-Object LinkType` on Windows) and unlink them first, because `--force` can delete through them. <!-- upstream: filed https://github.com/codemagicianhq/arcane/issues/323 (2026-10-01) -->

### Raw Notes
> Source: `journal/2026-09-29-upstream-intake-closeout-and-scope.md`, lesson "Deleting a worktree can delete the real `node_modules`". The claim that the governance docs do not mention junctions was checked with a search of `.arcane/governance`, `src/assets/.arcane/governance` and `src/assets/.arcane/spells` (no match); the `--force` behaviour is as observed once on Windows, not re-tested.

---

## Feedback — Arcane workflow (2026-09-29)

**Session:** Epic 2 "The install half of `spell update`" shipped as 1.10.0 (routed by spell-close-session from Lessons Learned)
**Rating:** N/A   **Would use again:** N/A
**Submitted by:** developer

### Friction Points
- The PR body written per `spell-create-pull-request` said "Closes #293 and #294". GitHub reads a closing keyword only for the issue reference directly after it, so the merge closed #293 and left #294 open until it was closed by hand. The template's `## Summary` gives no rule for naming several issues.
- The PRD's acceptance criterion "a fresh `init --profile full` and `update --add-new` end with the same component set" contradicted its own Won't Have (`initOnly` components stay `spell add`, ARC-052 decision 2). Neither `spell-plan` nor `spell-scope` checks a PRD's criteria against its Won't Haves, so the conflict reached implementation and had to be resolved by disclosure.

### Improvement Items
- [ ] In `spell-create-pull-request` Step 4, tell the author to write one closing keyword per issue ("Closes #293. Closes #294.") and never "Closes #A and #B", and have Step 6's report confirm each named issue's state after the merge or list it for the operator. <!-- upstream: filed https://github.com/codemagicianhq/arcane/issues/324 (2026-10-01) -->
- [ ] Add a check to `spell-plan` (and `spell-scope`'s quick-check) that reads each acceptance criterion against the PRD's Won't Have list and flags a criterion that can only hold if a Won't Have is done. <!-- upstream: filed https://github.com/codemagicianhq/arcane/issues/325 (2026-10-01) -->

### Raw Notes
> Source: `journal/2026-09-29-upstream-intake-closeout-and-scope.md`, lessons "One `Closes #N` per issue" and "An acceptance criterion can contradict its own Won't Have". The keyword behaviour was observed once on PR #313 (#293 `CLOSED`, #294 `OPEN` until `gh issue close 294`), not read from GitHub's documentation.

---

## Feedback — spell-feedback flush and disclose prompt (2026-10-02)

**Session:** Upstream intake to 1.10.2 (routed by spell-close-session from Lessons Learned)
**Rating:** N/A   **Would use again:** N/A
**Submitted by:** developer

### Friction Points
- After `spell-feedback --flush` filed five issues, each on a literal `disclose`, the operator asked where the new issues had come from and whether the session had made them. The disclose prompt named the item but not the repository the issue would be created on, and the run ended without a list tying each new issue to the `FEEDBACK.md` entry it came from. In a repository that is its own upstream, the new issues sat beside older ones from another session with no visible difference in origin.

### Improvement Items
- [ ] In `spell-feedback` Step 6, have the disclosure confirm name the target repository in full (`owner/repo`) and say that a public issue will be created there, and have Flush Mode end with a table of every issue the run created (number, URL, the `FEEDBACK.md` heading it came from). <!-- upstream: filed https://github.com/codemagicianhq/arcane/issues/332 (2026-10-04) -->

### Raw Notes
> Source: `journal/2026-10-01-intake-followups-to-1.10.2.md`, lesson "A disclose prompt should say where the issue lands".

## Feedback — git-conventions Required Commit Trailers (2026-10-04)

**Session:** Issue wave #297–#299, #321–#325 (routed by spell-close-session from Lessons Learned)
**Rating:** N/A   **Would use again:** N/A
**Submitted by:** developer

### Friction Points
- The agent runtime in this session may not put a model identifier in commit messages. The Required Commit Trailers table in `git-conventions.md` makes `Model` required and gives `self-reported` as the only `Model-Source` value. It has no value for a runtime that withholds its model. The session wrote `Model: withheld`, a value the standard never defined. Nothing failed, because trailers are advisory under ARC-023.

### Improvement Items
- [ ] In `git-conventions.md` Required Commit Trailers, define the value an agent uses when its runtime forbids disclosing the model, for example `Model: withheld` with `Model-Source: withheld-by-runtime`, and say whether `Agent` and `Provider` stay required in that case. <!-- upstream: filed https://github.com/codemagicianhq/arcane/issues/333 (2026-10-04) -->

### Raw Notes
> Source: `journal/2026-10-04-issue-wave-297-325.md`, lesson "This runtime withholds model identifiers, but the repo requires a `Model:` trailer".

## Feedback — spell-close-session step 10 (2026-10-04)

**Session:** After the close — #332, #333 and 1.11.2 (routed by spell-close-session from Lessons Learned)
**Rating:** N/A   **Would use again:** N/A
**Submitted by:** developer

### Friction Points
- An issue showed `closed`, and GitHub linked the closure to a merged PR, but that PR had only changed the issue's status marker in `FEEDBACK.md`. The change the issue asked for was not in the merged diff. `spell-close-session` step 10 confirms each issue the PR body closes is closed after a merge; it does not check that the merged diff contains the change the issue requested. The gap was caught only by reading the spell text by hand.

### Improvement Items
- [ ] In `spell-close-session` step 10 (and `spell-create-pull-request` Step 6's post-merge check), after confirming an issue is closed, confirm the merged diff contains the change that issue asked for, and reopen the issue with a comment when it does not. A `closed` state is not evidence the change shipped. <!-- upstream: filed https://github.com/codemagicianhq/arcane/issues/339 (2026-10-04) -->

### Raw Notes
> Source: `journal/2026-10-04-issue-wave-297-325.md`, lesson "A closed issue is not proof its change shipped".

## Feedback — Arcane workflow (2026-10-09)

**Session:** Branch naming, written once — #328 to 1.11.0 and branch naming to 1.11.4 (routed by spell-close-session from Lessons Learned)
**Rating:** N/A   **Would use again:** N/A
**Submitted by:** developer

### Friction Points
- A four-second `npm ci` run in the background, with nothing else to do, left the session idle for 73 minutes: the completion notice is delivered on the next turn, and nothing in the agent rules says to keep short work in the foreground.
- `spell-open-session`'s Mutation Guard ran `git switch -c` in a primary checkout another session was using; that session's staged files followed HEAD and its next commit landed on the new branch. The guard checks remote, branch and PR state, not whether the checkout is occupied (ARC-028 R3), and `git worktree list` cannot show a second session sharing one worktree.
- The pre-PR rebase (`spell-create-pull-request` Step 0.6) pulled in new dependencies and tests that spawn the built CLI; the pre-push suite then failed twice with a `0 test` file, because `node_modules` and `dist/` still matched the old tree. Neither spell says to reinstall and rebuild after a rebase.
- The pre-commit org-token scan (`check:staged-org-tokens`) reads every staged file whole, so a denylist added after the fact blocks any commit touching a file whose unchanged lines match; three unrelated lines on `main` had to be scrubbed before the session's own `TODO.md` and `DECISIONS.md` edits could be committed.

### Improvement Items
- [ ] In `universal-agent-rules.md` (or `agent-policies.md`), add: run any task under a few minutes in the foreground; never end a turn only to wait for a background notice. <!-- upstream: queued -->
- [ ] In `spell-open-session`'s Mutation Guard and isolation-primitive selection, before `git switch -c` in the primary checkout, check `git status --short` for staged or untracked files the session did not write and the session roster for a busy peer; when either shows activity, create a linked worktree from the trunk instead (ARC-028 R3), and never repair a peer's branch. <!-- upstream: queued -->
- [ ] In `spell-create-pull-request` Step 0.6 and `spell-commit-work` step 9b, after a rebase that changes `package-lock.json` or `src/`, run the dependency install and the build before the push, so the pre-push suite tests the rebased tree. <!-- upstream: queued -->
- [ ] In `scripts/check-staged-org-tokens.ts`, scan only the lines a commit adds (or report unchanged-line hits as advisory), and have `spell ward` or `spell doctor` offer a repository-wide scrub when a local denylist is created, so a new denylist does not block unrelated commits. <!-- upstream: queued -->

### Raw Notes
> Source: `journal/2026-10-09-branch-naming-written-once.md`, lessons "A backgrounded four-second task stalled the session for 73 minutes", "Two sessions in one primary checkout: `git switch -c` carried a peer's staged work onto my branch", "After a rebase, the suite lies until the dependencies and `dist/` match the new tree", "A local denylist blocks commits on lines nobody changed".

## Feedback — Arcane workflow (2026-10-12)

**Session:** Symlinked paths compared by real path — both TODO bugs fixed in [PR #364](https://github.com/codemagicianhq/arcane/pull/364) (routed by spell-close-session from Lessons Learned)
**Rating:** N/A   **Would use again:** N/A
**Submitted by:** developer

### Friction Points
- A commit message cited an unmerged commit by SHA (`58f1eff`). The mandatory pre-PR rebase (`spell-commit-work` step 9b, `spell-create-pull-request` Step 0.6) rewrites unmerged SHAs, so the citation was bound to go stale, and nothing in either spell or in `git-conventions.md` warns against it.
- `spell-create-pull-request` Step 4 and `spell-commit-work` step 9a2 write the PR body to `<git-dir>/arcane-pr-body.md`. In a Claude Code linked worktree that path is inside the primary checkout's `.git/worktrees/<name>/`, which Claude Code's worktree hook refuses to write; the alternative path the hook suggests cannot exist, because a linked worktree's `.git` is a gitfile.
- `spell-commit-work` step 4.5 gives two rows for an interactive commit in a repository with no roster and no active delegation: "Interactive, any power" (exact operator approval required) and, because roster identity is missing, "Missing or invalid authority" (human execution required). The step does not say which governs, or whether an exact per-commit operator approval is the explicit grant `agent-policies.md` asks for.

### Improvement Items
- [ ] In `git-conventions.md` (the commit body guidance) and `spell-commit-work` step 7, add: cite an unmerged commit by its subject, never its SHA, because the pre-PR rebase rewrites it. <!-- upstream: queued -->
- [ ] In `spell-create-pull-request` Step 4 and `spell-commit-work` step 9a2, name a fallback for the body file when the git dir is not writable by the agent: a temp file outside the repository, keeping the `<!-- arcane-pr-body: <branch> -->` first line, deleted after the read-back. <!-- upstream: queued -->
- [ ] In `spell-commit-work` step 4.5, say which row governs an interactive session in a repository with no roster and no active delegation, and whether an exact, fingerprint-bound operator approval of one commit counts as the explicit grant `agent-policies.md` requires. <!-- upstream: queued -->

### Raw Notes
> Source: `journal/2026-10-12-symlink-realpath-compare.md`, lessons "A commit message cited an unmerged commit by SHA", "`spell-create-pull-request`'s body file cannot be written from a Claude Code worktree", "`spell-commit-work`'s authority table has two rows for a repo with no roster".

## Feedback — spell-create-pull-request (2026-10-12)

**Session:** `scripts/` and `test/` type-checked, and the opening drift check's fixes — [PR #365](https://github.com/codemagicianhq/arcane/pull/365) and [PR #367](https://github.com/codemagicianhq/arcane/pull/367) (routed by spell-close-session from Lessons Learned)
**Rating:** N/A   **Would use again:** N/A
**Submitted by:** developer

### Friction Points
- `spell-create-pull-request` Step 0 pushes a never-pushed branch (item 3) before the mandatory rebase on the target (item 6). When the target has moved, the branch reaches the remote stale, the pre-push suite runs on it, and the rebase then needs a `--force-with-lease` push and a second suite run. This session rebased first and pushed once, and said so in its report.

### Improvement Items
- [ ] In `spell-create-pull-request` Step 0, run item 6's fetch and rebase before item 3's first push, so a never-pushed branch reaches the remote once, already rebased, and `--force-with-lease` is needed only for a branch that was on the remote before the rebase. <!-- upstream: queued -->

### Raw Notes
> Source: `journal/2026-10-12-typecheck-scripts-tests.md`, lesson "`spell-create-pull-request` pushes before it rebases".
> A data point for the 2026-10-12 symlink session's body-file item above: in this session's Claude Code linked worktree, the body file was written to `<git-dir>/arcane-pr-body.md` from the shell without any refusal, for both PR #365 and PR #367.

## Feedback — Arcane workflow (2026-10-13)

**Session:** Handoff release correction, PR [#354](https://github.com/codemagicianhq/arcane/pull/354), and this session's close (routed by spell-close-session from Lessons Learned)
**Rating:** N/A   **Would use again:** N/A
**Submitted by:** developer

### Friction Points
- The designated-branch rule and the branch-rename gate conflict. `CLAUDE.md` says a tool-generated branch name is renamed before a PR, and `spell-create-pull-request` Step 0's rename gate would push a new branch and delete the designated remote branch. The spell has no path for a branch the session harness designates, so the choice had to go to the operator.
- The attribution rules conflict over model names. `spell-commit-work` requires a `Model:` trailer, the runtime forbids naming the model in commits, and the attribution reminder asks for a `Co-Authored-By` line that names a model. The spell describes the `withheld` path but not how a `Co-Authored-By` line should read.
- `spell-check-drift`'s canonical-versus-installed parity rule pairs each `src/assets/` file with a root file of the same name. That produced five false "real content" findings in files outside the parity contract (`GENERATED_ROOTS` in `scripts/self-host-parity.ts`).

### Improvement Items
- [ ] In `spell-create-pull-request` Step 0 and `spell-commit-work` step 9, when the session harness designates a branch, keep that branch and report the conflict with the branch-naming rule, instead of running the rename gate. <!-- upstream: queued -->
- [ ] In `spell-commit-work` step 7, state the trailer rule when the runtime forbids naming a model: use `Model: withheld` and `Model-Source: withheld-by-runtime`, and say what a `Co-Authored-By` line should name. <!-- upstream: queued -->
- [ ] In `spell-check-drift`'s canonical-versus-installed parity rule, pair files only inside the managed roots of `scripts/self-host-parity.ts` (`GENERATED_ROOTS`), not by filename across `src/assets/` and the root. <!-- upstream: queued -->

### Raw Notes
> Source: `journal/2026-10-13-handoff-release-correction.md`, lessons "The branch-name rule and the session's branch designation conflict", "The attribution rules conflict over model names", and "The drift check's parity pairing produced false findings".

## Feedback — Arcane workflow (2026-10-12)

**Session:** macOS test fixtures compared by real path, PR [#363](https://github.com/codemagicianhq/arcane/pull/363), and this session's close (routed by spell-close-session from Lessons Learned)
**Rating:** N/A   **Would use again:** N/A
**Submitted by:** developer

### Friction Points
- `spell-bug` step 2 resolves `tracking_mode` only from a root `.arcane.json` and asks when it is unset. Arcane's own repository keeps its self-hosted manifest at `src/assets/.arcane.json` (`tracking_mode: "internal"`), which the push-policy check already reads when the file declares `selfHosted: true`, so the spell asks a question its own repository has already answered.
- `spell-commit-work` step 3 resolves `{OPERATOR_DOMAIN}` for a CLI tool's author identity from `.arcane.json`, and neither manifest in this repository carries one, so the domain came from an earlier commit's author and the operator's choice at the approval prompt.

### Improvement Items
- [ ] In `spell-bug` step 2, and in every spell that reads `.arcane.json`, resolve the manifest the way the push-policy check does: the root file, else `src/assets/.arcane.json` when it declares `selfHosted: true`. <!-- upstream: queued -->
- [ ] Give `{OPERATOR_DOMAIN}` a home in the manifest, or name a fallback in `spell-commit-work` step 3, so a CLI tool's author identity resolves without asking on every commit. <!-- upstream: queued -->

### Raw Notes
> Source: `journal/2026-10-12-macos-fixture-realpath.md`, lessons "`spell-bug` read `tracking_mode` only from a root manifest this repository does not have" and "`spell-commit-work` had nowhere to read the tool author's domain from".
