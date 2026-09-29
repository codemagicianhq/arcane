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
