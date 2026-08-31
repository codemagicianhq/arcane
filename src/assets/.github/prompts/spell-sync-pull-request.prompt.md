---
name: Spell — Sync Pull Request
description: Safely sync an open PR's branch with its target when it has fallen behind — recoverable pre-rebase ref, mechanical-vs-ambiguous conflict handling, force-with-lease push, provider-verified landing. Use when a PR needs rebasing onto a moved target, or was routed here from spell-create-pull-request/spell-ship's own conflict-stop points.
argument-hint: '[PR number or branch name]'
agent: agent
last_updated: 2026-08-31
---

## Executive Summary

- This spell safely syncs an open PR's branch with its target branch once the target has moved ahead.
- It is the recovery path `spell-create-pull-request` and `spell-ship` route to when they detect a
  conflict they deliberately don't try to resolve themselves.
- It draws a hard line between conflicts safe to resolve mechanically (identical changes on both sides)
  and conflicts that need a human — it never guesses on the ambiguous side of that line.
- Every history-rewriting step is preceded by a recoverable ref, and every push uses
  `--force-with-lease`, never bare `--force`.

---

Sync the specified PR's branch (or the current branch's own open PR) with its target branch.

Context to consult:

- `.arcane/governance/git-conventions.md` — the declared merge-strategy ladder (Merge no-fast-forward or
  Rebase-and-fast-forward sanctioned; Squash and Semi-linear merge never sanctioned) and branch policy.
- `.arcane/governance/testing-standards.md` — coverage thresholds for the post-replay gate re-run.

Related spells:

- `spell-create-pull-request` — routes here from its Step 0.6 conflict-stop; reuses its Step 2
  provider-detection table rather than re-deriving it (D8).
- `spell-ship` — routes here from its Step 2 conflict-stop.

## Step 0 — Guard checks

1. **Require a clean worktree.** Run `git status --porcelain`. Any output — staged, unstaged, or
   untracked — **STOPS** this spell before it touches anything. Sync is not the place to also carry
   uncommitted work through a rebase.
2. **Resolve the active PR, source branch, base branch, and expected head SHA.** If a PR number or
   branch name was given as an argument, resolve from that; otherwise resolve from
   `git branch --show-current` and the open PR for it (reuse `spell-create-pull-request`'s Step 2
   provider-detection and open-PR-lookup calls — same commands, not restated here). Record the
   branch's current HEAD SHA now, before anything else runs — this is what "expected head SHA" means
   for Step 5's post-push verification once rebase/replay changes it to a new value.
3. **STOP** if no open PR is found for the resolved branch — this spell syncs an *existing* PR; if none
   exists yet, direct the user to `spell-create-pull-request` first.

## Step 1 — Create the recoverable ref

Before any history-rewriting operation, tag the current HEAD so this sync is never a one-way door:

```bash
git tag "sync-backup/<branch>/$(date +%Y%m%d-%H%M%S)" HEAD
```

Report the tag name in the final output (Step 6). **Never delete this tag automatically** — leave it for
the human to remove once they've confirmed the sync landed correctly; this spell only ever adds it.

## Step 2 — Fetch and apply the declared merge policy

```bash
git fetch origin
```

Resolve the repository's actual merge-strategy ladder from `git-conventions.md` rather than assuming:

- **Rebase-and-fast-forward** (the common case for a PR that's simply fallen behind): `git rebase origin/<target>`.
- **Merge no-fast-forward** (when the repo's declared policy or the PR's own history indicates merge
  commits are the norm here): `git merge origin/<target>`.
- **Never** produce a squash or semi-linear result as part of this sync — those are never sanctioned,
  regardless of which of the two above applies.

## Step 3 — Classify any conflict: mechanical vs. ambiguous

If Step 2 completes with no conflicts, skip straight to Step 4 — **this is the common case and it must
not be treated as a special case of conflict handling.**

If Step 2 reports conflicts, read every conflicted file's conflict markers before doing anything else,
then classify **each conflicted hunk independently** — a single file can contain both kinds:

- **Mechanically resolvable** — both sides made the identical change (e.g. the same formatting fix, the
  same import added the same way), or one side's change is a strict superset of the other's with no
  semantic divergence. Resolve by keeping the superset/identical content, verify no line from either
  side's *unique* content was dropped, stage the file, and continue the rebase/merge.
- **Ambiguous** — the same lines changed with different intent, or you cannot establish with confidence
  that one side's content is a strict superset of the other's. **STOP.** Do not guess, do not pick a
  side, do not attempt a "reasonable-looking" merge of the two. Abort the in-progress rebase/merge
  (`git rebase --abort` / `git merge --abort`) so the branch is left exactly as it was, then report:
  - The exact conflicting file(s) and hunk(s).
  - Both sides' conflicting content, verbatim.
  - That the recoverable ref from Step 1 still points at the pre-sync state.
  - A direct instruction to resolve manually and re-run this spell, or to resolve and push directly.

Never proceed past an ambiguous hunk on the theory that "the rest of the file is fine" — abort the whole
operation and hand off, per the line above.

## Step 4 — Re-run project gates before pushing

A clean replay is not the same as a working tree. Before pushing:

```bash
npm run typecheck && npm run lint && npm run test
```

If this repository has `check:version-bump` and the sync touched any distributable path, run it too. **A
gate failure here is the same class of stop as an ambiguous conflict** — do not push a tree that fails
its own gates just because the git-level replay succeeded. Report which gate failed and stop; the
recoverable ref from Step 1 is still available.

## Step 5 — Push and verify

```bash
git push --force-with-lease
```

- **On success:** proceed to provider verification below.
- **On lease rejection** (the remote moved again since this sync's own Step 2 fetch — someone else
  pushed to the branch in the meantime): **do not retry with `--force`, and do not retry
  `--force-with-lease` blindly.** Re-fetch and re-evaluate from Step 2 as if starting over — the branch
  state this sync was built against no longer exists. This is a genuinely new sync, not a retry of the
  same one.

**Provider verification (never assume a successful push means the PR reflects it):**

| Provider | Verify |
| --- | --- |
| GitHub | `gh pr view <PR#> --json headRefOid,mergeable` — `headRefOid` must equal the new HEAD SHA from Step 5; `mergeable` should not report a conflict state. |
| Azure DevOps | `az repos pr show --id <PR_ID> --output json --query "{sha:lastMergeSourceCommit.commitId, status:mergeStatus}"` — the SHA must equal the new HEAD; `status` should not report `conflicts`. |

If the reported SHA does not match, or the mergeable/status field reports a conflict despite a clean
local push, **do not report success** — this is the exact "dispatched is not succeeded" gap EF-21
already established for `spell-close-session`; a push completing without error is dispatched, not
verified. Re-check once after a short wait (provider APIs can lag); if it still doesn't match, stop and
report the discrepancy rather than declaring the sync done.

## Step 6 — Report

```
✓ PR synced: <URL>
  Branch:          <branch> → <target>
  Method:          rebase-and-fast-forward | merge-no-fast-forward
  Conflicts:       none | resolved (mechanical) | none — no rebase needed
  Recoverable ref: sync-backup/<branch>/<timestamp>
  New head SHA:    <sha> (provider-confirmed)
```

- If Step 3 resolved any mechanical conflicts, list exactly which files and what was kept from each side.
- If Step 3 aborted on an ambiguous conflict, this report never runs — Step 3's own STOP report is final.
- Never delete the Step 1 recoverable ref as part of this report — that is the human's call.

## Rules

- Never push with bare `--force` — only `--force-with-lease`, and never retry a rejected lease blindly.
- Never guess on an ambiguous conflict — abort and hand off, every time, with no exception for
  "obviously trivial-looking" content on either side that this spell cannot independently verify.
- Never skip the recoverable ref (Step 1), even for a sync expected to be clean — the ref costs nothing
  and the alternative is an unrecoverable mistake on the case that turns out not to be clean.
- Never report a sync as complete on a push success alone — provider verification (Step 5) is mandatory.
- Never delete the recoverable ref automatically.
