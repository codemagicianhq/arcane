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
- [ ] In `spell-feedback` Step 6, have the disclosure confirm name the target repository in full (`owner/repo`) and say that a public issue will be created there, and have Flush Mode end with a table of every issue the run created (number, URL, the `FEEDBACK.md` heading it came from). <!-- upstream: queued -->

### Raw Notes
> Source: `journal/2026-10-01-intake-followups-to-1.10.2.md`, lesson "A disclose prompt should say where the issue lands".

## Feedback — git-conventions Required Commit Trailers (2026-10-04)

**Session:** Issue wave #297–#299, #321–#325 (routed by spell-close-session from Lessons Learned)
**Rating:** N/A   **Would use again:** N/A
**Submitted by:** developer

### Friction Points
- The agent runtime in this session may not put a model identifier in commit messages. The Required Commit Trailers table in `git-conventions.md` makes `Model` required and gives `self-reported` as the only `Model-Source` value. It has no value for a runtime that withholds its model. The session wrote `Model: withheld`, a value the standard never defined. Nothing failed, because trailers are advisory under ARC-023.

### Improvement Items
- [ ] In `git-conventions.md` Required Commit Trailers, define the value an agent uses when its runtime forbids disclosing the model, for example `Model: withheld` with `Model-Source: withheld-by-runtime`, and say whether `Agent` and `Provider` stay required in that case. <!-- upstream: queued -->

### Raw Notes
> Source: `journal/2026-10-04-issue-wave-297-325.md`, lesson "This runtime withholds model identifiers, but the repo requires a `Model:` trailer".
