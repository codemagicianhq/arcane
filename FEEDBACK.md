# Feedback Log

---

## Feedback — spell-commit-work push step (2026-09-29)

**Session:** Upstream Intake 2026-09 close-out and scope (routed by spell-close-session from Lessons Learned)
**Rating:** N/A   **Would use again:** N/A
**Submitted by:** developer

### Friction Points
- A push to a topic branch whose pull request had just been rebase-merged silently recreated the remote branch the merge had auto-deleted (`[new branch]`, and `origin/<trunk>...HEAD` read `2 4`, four commits ahead of trunk with two already merged); the push step has no check that the branch's PR is still open.

### Improvement Items
- [ ] Before any push, have the commit spell's push step run a provider PR-state check for the current branch (for example `gh pr list --head <branch> --state all --json number,state`), and stop with the merged PR's number when it is `MERGED` instead of pushing. <!-- upstream: queued -->

### Raw Notes
> Source: `journal/2026-09-29-upstream-intake-closeout-and-scope.md`, lesson "A push to a branch whose PR just merged recreates the deleted remote branch".

## Feedback — spell-close-session handoff block (2026-09-29)

**Session:** Fix the Windows-only up02-a test path masking, ship #309 (routed by spell-close-session from Lessons Learned)
**Rating:** N/A   **Would use again:** N/A
**Submitted by:** developer

### Friction Points
- A previous session's handoff `Blockers` field stated an environment diagnosis ("the pre-push hook still fails on this machine, so every push needs `--no-verify`") as a standing fact; the next session inherited it and its opening prompt repeated it, but the cheap check (`npm test`, about 90 s) passed three times that day and the push went through the hook normally. The handoff has no way to mark an environment claim as "observed on <date>, re-verify before relying on it".

### Improvement Items
- [ ] Have spell-close-session's handoff `Blockers` and `Notes` fields require a date and a one-line verification command on any claim about the local environment (a failing hook, a broken tool, a flaky test), and have spell-open-session re-run that command before repeating the claim to the operator. <!-- upstream: queued -->

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
- [ ] Add a warning to the worktree-removal instructions in `git-conventions.md` (and the pointer in `spell-close-session` step 10): before `git worktree remove --force`, list the worktree for junctions or symlinks (for example `Get-ChildItem -Force <path> | Where-Object LinkType` on Windows) and unlink them first, because `--force` can delete through them. <!-- upstream: queued -->

### Raw Notes
> Source: `journal/2026-09-29-upstream-intake-closeout-and-scope.md`, lesson "Deleting a worktree can delete the real `node_modules`". The claim that the governance docs do not mention junctions was checked with a search of `.arcane/governance`, `src/assets/.arcane/governance` and `src/assets/.arcane/spells` (no match); the `--force` behaviour is as observed once on Windows, not re-tested.
