# 2026-09-29 — `parseAdoRemote` decodes percent-encoded Azure DevOps remote segments (1.9.2)

Related: [[git-conventions]] (the linked-worktree and footprint-overlap rules this session ran
under, and the rebase-merge behaviour that hid Epic 1's landing), [[development-methodology]]
(the bug spell's test-first sequence).

## Session: fix the `My%20Project` bug, first on Epic 1's branch, then re-landed on `main` as 1.9.2

### Prompt Context

The operator asked for a patch-level CLI bug fix: `parseAdoRemote` in
`src/modules/platform-policy.ts` returns the org, project and repo segments of an Azure DevOps remote
without percent-decoding, so a project named `My Project` reaches `az` as `My%20Project`. Write a
failing test first, then decode each segment with `decodeURIComponent`, guarded so a malformed
sequence returns `null` rather than throwing. Security constraint: the segments are attacker-influenced
text from a git remote, the `az` launch is deliberately shell-free (`resolveAzureCli` in
`src/modules/exec.ts`), and `test/azure-cli-launch.test.ts` is a merge-blocking metacharacter test that
must keep passing. Also decide whether to reject a decoded segment beginning with `-`, which `az`'s
argument parser could read as an option. Run `spell-bump`, add a `CHANGELOG.md` entry, follow the
spell routing, and never push without the operator's approval. Later in the session the operator
said "merge into the Epic 1 branch, then push with --no-verify", and after the ground had moved,
"go, re-land it as 1.9.2 on top of main".

### What Got Done

1. **Where the bug lives was established before anything was written.** At session start
   `resolveAzureCli` and `test/azure-cli-launch.test.ts` did not exist on `main`. They existed only on
   `claude/fix/upstream-intake-safety-fixes`, the then-unmerged Epic 1 branch checked out in the
   primary checkout, whose `1.9.1` changelog recorded this bug as "not fixed here" (tracked in
   `TODO.md`, item 6 below). That checkout also held another session's uncommitted edits to
   `exec.ts`, `platform-policy.ts` and the metacharacter test. Per ARC-028 R4 the footprints
   overlapped, so the fix was built on Epic 1's committed tip, in a distinct function and a distinct
   test file, on a linked-worktree session branch.
2. **Failing test first.** Six cases under `describe("percent-encoded segments …")` in
   `test/platform-policy.test.ts`: both remote shapes, a multi-byte and metacharacter sequence
   (`Caf%C3%A9%20%26%20Co` → `Café & Co`), malformed sequences returning `null` without throwing,
   leading-dash segments (encoded `%2D` and literal) returning `null`, and a segment that decodes to
   whitespace being kept. All six failed against the old parser (`6 failed | 19 skipped`).
3. **The fix.** A `decodeAdoSegment` helper wraps `decodeURIComponent` in a try/catch, returns
   `null` for an empty result or one beginning with `-`, and `parseAdoRemote` runs all three captured
   segments through it. The leading-dash rejection was chosen over passing the value through: the
   segments become `az` arguments, and Python's argparse treats a value beginning with `-` as an
   option, so no such value can ever name a project or repository. The launch is untouched.
4. **Verification, repeated at each landing.** The parser file and the metacharacter test together:
   37 passed, including the Windows-only live `az` case on this machine. Lint, typecheck, the
   org-token scan and the version-bump gate all passed. On the Epic 1 base the full suite was
   2055 passed, 2 skipped, 1 failed (item 7). See Open Items for the full-suite run on the final
   `main`-based branch.
5. **Landed twice; only the second counts.** The first landing went onto Epic 1's branch: the
   operator chose that target, the two session commits were rebased onto its moved tip (one
   changelog conflict), the branch was fast-forwarded and pushed with `--no-verify`. But Epic 1 had
   already merged as [PR #308](https://github.com/codemagicianhq/arcane/pull/308) at 09:59Z and
   `1.9.1` was on npm before that push, so those commits (`6067bb1`, `0bd00d1`, `6aca8c7`) sit on a
   branch whose pull request is closed, with a changelog entry inside a published block. The second
   landing is this branch, `sessions/2026-09-29-ado-remote-decoding-1-9-2`, cut from `origin/main`:
   the fix cherry-picked with `main`'s `1.9.1` block restored byte-for-byte and the entry in a new
   `1.9.2` block, then `spell-bump` (patch, `1.9.2`) as its own commit.
6. **Tracker.** The bug was recorded in `TODO.md` (internal tracking mode) under the 2026-09-28
   upstream intake section, next to #296, and checked off naming this branch and `1.9.2`.
7. **A Windows-local test failure was diagnosed, then found already fixed upstream.**
   `test/up02-a-init-push-policy.test.ts` failed here because `mkdtemp` returns backslash paths
   while git prints `core.hookspath` with forward slashes, so the test's fixture-path masking never
   matched. I registered it in `TODO.md` on the first landing; before the second, `main` had merged
   [PR #309](https://github.com/codemagicianhq/arcane/pull/309) with exactly that fix and its own
   checked-off item, so this branch carries no duplicate entry.

### Lessons Learned

#### Check which branch a task's premises live on before writing the first line

The prompt named `resolveAzureCli` and `test/azure-cli-launch.test.ts` as existing facts. On `main`
they did not exist. Grepping for them in this worktree before doing anything else is what turned
"fix a function" into "fix a function on top of an unmerged branch another session is still editing,
in a disjoint hunk". The check cost one command.

#### Re-verify the target branch's pull-request state immediately before every push, not once

I checked `gh pr list --head claude/fix/upstream-intake-safety-fixes` early in the session and saw no
pull request. Hours later the operator chose that branch as the merge target and I pushed to it
without re-running that check. By then PR #308 had been opened and merged and `1.9.1` published. The
push succeeded, which looked like progress, and put three commits on a branch nothing would ever
merge again. A `gh pr list --head <branch> --state all` in the same command as the push would have
caught it. The rebase-merge that landed #308 also meant `git log origin/main..<branch>` showed every
Epic 1 commit as unmerged; only `git cherry` told the truth.

#### A green gate can be green for a reason you did not intend

`npm run check:version-bump` passed before any bump because the branch already carried Epic 1's
`1.9.1`. The spell's rule ("passes → no bump needed") gave the right outcome only while `1.9.1` was
unpublished. Once it shipped, the same green result meant the opposite, and the fix needed `1.9.2`.
Read the two version numbers the gate prints, not just the tick.

### Open Items Carried Forward

- This branch holds the fix, the `1.9.2` bump and this close, and needs a pull request against
  `main`; the push and the PR wait on the operator's confirmation. The full suite on this branch, run twice: 2051
  passed, 2 skipped, 5 failed, every failure a `Test timed out in 5000ms` in `test/push-safety.test.ts`
  or `test/update.test.ts` under full-suite load on this Windows machine; the three files pass alone
  (159 passed) and neither touches the changed code. This is the load flakiness `TODO.md` already
  records (the closed MEDIUM item on "test flakiness under full-suite load"), recurring, not a
  regression. `up03-a-gitattributes` passed in both runs.
- `origin/claude/fix/upstream-intake-safety-fixes` still carries the three orphaned commits from the
  first landing and should be deleted on the remote after this branch merges (operator approval:
  it is a remote branch deletion).
- The local branch `sessions/2026-09-29-ado-remote-percent-decoding` (the first landing) can be
  deleted once this branch merges.
