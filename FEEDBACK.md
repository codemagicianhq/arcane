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
