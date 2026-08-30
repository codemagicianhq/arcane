# 2026-08-27 — EF-36's ADR: Auto-Merge Requires a Clear Review Round

## Session: A stale local checkout almost became the whole session's premise, caught by an unexplained worktree before it mattered

### Prompt Context

Opened with `spell-open-session`, no focus argument. The prior handoff's next concrete action was unambiguous: write the ADR for [EF-36](../docs/intake/batch-001/EF-36.md), unchanged priority across three sessions running. After the open-session report, the operator renamed the session, then asked to draft the ADR and run the worktree/branch cleanup the report had flagged, together. After reviewing the resulting design, the operator approved it and asked to commit and open a PR. Some time later the operator reported merging the PR themselves and asked whether anything was still pending on the session, then closed it.

### What Got Done

1. **Caught a stale local checkout before it could shape the whole session.** `spell-open-session`'s first read of `ai-context/system-prompt-context.md` looked stale in a way that didn't add up until a `git worktree list` turned up an unexplained detached-HEAD worktree holding a commit describing an entire session's worth of work — a branch sweep, a GitHub Ruleset fix, a `0.22.1` release — that matched nothing on record locally. `git fetch` confirmed local `main` was 7 commits behind `origin/main`; the dangling worktree's commit was already an ancestor of the real `origin/main`, just not of the stale local one. Fast-forwarded before trusting anything else read from disk.
2. **Session renamed** to `arcane-ef36-automerge-adr` on request (the CCD session title, distinct from the git branch).
3. **Cleared the worktree/branch debt** the (now-current) handoff had flagged: removed `.claude/worktrees/spell-open-session-901c71` after confirming zero uncommitted work inside it and confirming its commit was already merged via [PR #81](https://github.com/codemagicianhq/arcane/pull/81); deleted the local `docs/session-close-2026-08-24` branch after `git cherry` against a freshly fetched `origin/main` showed zero unique commits (the remote copy was already gone — `delete_branch_on_merge` auto-deleted it on merge).
4. **Drafted and Accepted [ARC-035 — Auto-Merge Requires a Clear Review Round](../DECISIONS.md#arc-035--auto-merge-requires-a-clear-review-round)**, closing EF-36's ADR. `DECISIONS.md`, `TODO.md`, and `ai-context/system-prompt-context.md` updated to match.
5. **Committed (`ca38b7d`) and opened [PR #82](https://github.com/codemagicianhq/arcane/pull/82).** The operator merged it (`6a52767`, 2026-08-27) outside this session's own actions; verified merged by `git merge-base --is-ancestor ca38b7d origin/main` rather than by trusting the report, and confirmed the GitHub Actions run on the merge commit completed with `conclusion: success`.
6. **Post-merge cleanup completed and independently re-verified**: local `main` fast-forwarded to `6a52767`, the local session branch deleted, stale remote-tracking refs pruned, working tree confirmed clean.

### Decisions Made

| ADR | Decision | Rationale |
| --- | --- | --- |
| [ARC-035](../DECISIONS.md#arc-035--auto-merge-requires-a-clear-review-round) | Auto-merge is narrowed, not removed, behind a new required status check that reads PR review state rather than approval count | GitHub blocks a PR author from approving their own PR, and this repository has no second identity to be the reviewer — verified live against the actual `protect main` ruleset (`required_approving_review_count: 0`, `current_user_can_bypass: "never"`) before writing the decision, since requiring an approval would have made every PR permanently unmergeable |

### Lessons Learned

#### A stale local checkout can quietly become the premise of an entire report

The open-session drift analysis was, for a while, being built against a local `main` sitting seven commits behind `origin/main` — old enough to be describing an already-superseded branch count and an already-fixed repo setting as if they were still live problems. Nothing in the open-session flow currently checks "is local `main` behind `origin/main`" as an explicit step; this was caught by noticing a detached-HEAD worktree whose commit message didn't correspond to anything in the locally-read docs, not by any built-in guard. That worktree turning out to be exactly the cleanup item the (also-stale-locally) handoff was already asking for was a coincidence worth being honest about — the catch worked this time, but it worked because an anomaly happened to be lying around, not because anything forced the check. Worth considering whether `spell-open-session` should fetch and compare against `origin/<trunk>` before reading any file, rather than leaving that to chance.

#### The obvious fix for a governance gap can be the one that breaks the thing it protects

EF-36's intake framed the missing signal as "does a review round exist," and the reflexive fix is a branch-protection setting requiring an approving review. Fetching the actual live ruleset before writing that down turned up `required_approving_review_count: 0` and `current_user_can_bypass: "never"` — and GitHub does not allow a PR author to approve their own pull request. On a solo-operator repository where the author and the only available reviewer are the same GitHub identity, the "obvious" fix would have made every future PR permanently unmergeable, with no admin escape hatch. The design that shipped gates on the *absence* of an outstanding objection rather than the *presence* of an approval specifically to avoid that trap. The generalizable point isn't the specific setting — it's that a plausible-sounding platform-policy fix deserves the same live verification as any other claim before it gets written into a decision record, not just reasoned about from memory of how branch protection "usually" works.

#### A real-time gap mid-session is a cue to re-verify, not a curiosity to note

A `git push` that also runs this repository's full test suite via its pre-push hook returned after a real-world gap of about two days, surfaced only by a date-change notice rather than by the command itself taking that long. Rather than treating the gap as incidental, it was used as the trigger to re-fetch and re-check merge state, CI state, and branch ancestry from scratch before doing anything else — the same discipline this repository's own history already established for "assume `main` has moved," applied here to a session-level idle gap instead of a PR-level rebase. Everything came back unchanged, but that was worth confirming rather than assuming.

#### The Naming Test applies by extension to sequential IDs, not just words

`ARC-035` was earlier recorded elsewhere as the "next free number," provisionally earmarked in passing for a different, not-yet-written ADR (the handoff-durability PRD). This session claimed it for EF-36 instead — legitimately, since nothing had actually reserved it — but it means the next free ARC number is now `ARC-036`, not `ARC-035`, for whoever writes that ADR later. Nothing in any live file asserted the old number, so there is no drift to fix, only a fact worth stating here so it doesn't have to be rediscovered by grep.

### Open Items Carried Forward

- **New top next action:** implement ARC-035 — `scripts/check-review-round.ts` (the required status check reading PR review state), wire it into the `protect main` ruleset's `required_status_checks`, update `spell-review`/`code-review` to post a formal `gh pr review --request-changes` when a round ends with a blocker open, and extend ARC-034's pre-push hook to warn on pushes to a closed/merged PR's branch. ARC-035's own Open Questions section lists what implementation still needs to settle — starting with empirically verifying that GitHub allows a PR author to `--request-changes` on their own PR before relying on it.
- The next free ARC number is **ARC-036** (see the naming lesson above).
- [EF-24/EF-30/EF-31 ledger-backfill gap](../TODO.md) in `TODO.md` — untouched this session, still open.
- [features/handoff-durability/PRD.md](../features/handoff-durability/PRD.md) (EF-37, `status: draft`) — untouched this session, still needs `spell-plan`/`spell-architect` and a work-item ID.
- Several local branches are 7+ days old and worth a cleanup pass with the content-verification method `TODO.md`'s merged-branch-cleanup item already prescribes (`docs/session-close-2026-08-01`, `docs/runnable-fences-selfhosted-agents`, `chore/todo-update-preserve-user-content`, `sessions/2026-08-02-provider-neutral-close`) — not touched this session since that sweep already ran twice this week and is tracked as its own item, not this session's job. The `backup/*` branches and `sessions/2026-08-15-ef34-gitdir-contamination` (the `arcane-arc028` worktree's live branch) are deliberately excluded — the former is preserved incident evidence, the latter belongs to a worktree this session didn't touch.
