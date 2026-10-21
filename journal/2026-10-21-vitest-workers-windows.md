# 2026-10-21 — vitest capped at 4 workers on Windows, and a timed-out test's leak fixed

Related: [[testing-standards]] (the suite and coverage gate this session made reliable on the operator's machine), [[git-conventions]] (the session branch, fingerprinted commits and pull-request rules this session ran through), [[2026-10-20-lint-scripts-and-safety-test-title]] (the session that found the timeouts and started this one).

## Session: vitest capped at 4 workers on Windows, and a timed-out test's leak fixed

### Prompt Context

A side session started on 2026-10-21 by "Close two LOW test-infrastructure items", itself started by the 2026-10-20 open-session. It had two tasks. The first was to make the full suite pass reliably on the operator's Windows machine, where vitest's default worker count timed out git-heavy tests in every run. The second was to remove the ordering dependence those timeouts exposed in `test/up02-a-flags.test.ts`.

The brief:

- Decide the worker cap and where it lives from measurements on the machine: `vitest.config.ts`, or `VITEST_MAX_WORKERS` documented in `testing-standards.md`.
- Check the cap's cost to CI on the pull request.
- Fix the leaking test's cause, not its symptom, and prove it by forcing the preceding test to a 1 ms timeout.
- Register and close a `TODO.md` item.
- Open the pull request from `sessions/2026-10-21-vitest-workers-windows` through `spell-create-pull-request`, with CI green.

The work ran from 01:40 to 03:25 and from 10:55 to 11:20 PDT. A usage limit stopped it in between, and a hand-over note in the session group's notes folder carried the state across. The operator merged the pull request at 12:37 PDT and asked this session to close itself.

### What Got Done

1. [PR #384](https://github.com/codemagicianhq/arcane/pull/384) merged onto `main` as three rebased commits (`4f6f09e`, `0fee99d`, `53679a6`). `git cherry` shows all three equivalent to the branch's, and the files are identical. All seven CI checks passed. The build-test job's Test step took 29 s, against 28 to 42 s on the last six `main` runs; the comparison is posted as a comment on the PR.
2. `vitest.config.ts` now sets `maxWorkers: Math.min(Math.max(availableParallelism() - 1, 1), 4)`.
   - It is a cap, not a floor, so CI's 4-vCPU runners stay at 3 workers.
   - `VITEST_MAX_WORKERS` and `--maxWorkers` still override it, because vitest applies the environment variable after the config merge.
   - The config won over documenting the environment variable: no distributable path changed, no version bump was needed, and the hook itself became reliable.

   Measured on the machine (8 cores, 16 logical CPUs, 2319 tests at `395735e`), leaving out runs that overlapped another session's suite:

   | Workers | Timeouts per run | Wall time |
   | --- | --- | --- |
   | 15 (the default) | 23 | 243 s |
   | 12 | 13 | 243 s |
   | 10 | 12 | 212 s |
   | 8 | 1 and 3 | 192 s, 212 s |
   | 6 | 1 | 213 s |
   | 4 | 0 and 0 | 222 s, 222 s |
3. `test/up02-a-flags.test.ts`: the cause was found and fixed. Vitest abandons a timed-out test without cancelling it. The abandoned body's `runUpdate` then called `process.exit(1)` through the spy the next test had installed.
   - The two in-process describes register each test body, and their `afterEach` waits for every registered body before `vi.restoreAllMocks()`.
   - Vitest runs a describe's `afterEach` before the file-level one. So the wait finishes before [PR #383](https://github.com/codemagicianhq/arcane/pull/383)'s fixture cleanup removes the directories.
   - Four real-git tests in the file still ran at the 5 s default. They now carry `HEAVY_TEST_TIMEOUT`.

   The proof ran three times, the last on the rebased code. With the preceding test forced to 1 ms, "tightening to blocked records it, prints the ARC-049 notice, and installs nothing" failed before the fix with `expected "Mock" to not be called at all, but actually been called 1 times`, and passes after it. The file passes 21 of 21 alone.
4. `TODO.md` "### Test Infrastructure" has a done HIGH item with the measurements and evidence. It also has two open LOW items for what the PR does not cover:
   - the same leak in other files that spy on `process.exit`;
   - real-git tests still on the 5 s default.
   Both were also offered to the operator as session cards.
5. Verification:
   - `npm run lint`, `npm run typecheck` and `npm run typecheck:all` pass.
   - `npm run test:coverage` at the cap passed 2350 tests with 0 failed, in 229 s. At most 5 vitest processes ran: the main process and 4 workers.
   - The real pre-push hook ran the suite without `VITEST_MAX_WORKERS` on the rebased tree: 2353 passed, 10 skipped, 0 failed, 229 s.
6. Rebasing onto `origin/main` `3c1bf1d` conflicted in `TODO.md`, where PR #383 had added an item at the same position. Both were kept, and this branch's three lines stayed byte-identical to the approved commit.

### Lessons Learned

#### A timed-out vitest test is abandoned, not cancelled

When a test hits its timeout, vitest reports it, runs the hooks and starts the next test, but the test's own async body keeps running. In `test/up02-a-flags.test.ts` that body was an in-process `runUpdate`. When it finally called `process.exit(1)` and the console, the spies it reached belonged to the next test. So "tightening to blocked" failed on a mock call count that had nothing to do with its own behavior, only under load and never alone.

The first fix that came to mind, wrapping just the `runUpdate` call, would not have worked. With the preceding test forced to a 1 ms timeout, its body had not even reached `runUpdate` when vitest moved on. Only registering the whole body and waiting for it in `afterEach` holds. That 1 ms timeout is the cheap way to reproduce this class of bug on demand. Eleven test files spy on `process.exit` the same way; `TODO.md` tracks the rest as an open LOW item.

#### Two numbers I was sure of were wrong when checked

The brief and the 2026-10-20 notes said vitest's default here is 16 workers. Vitest 5.0.0's resolver says `availableParallelism() - 1`, which is 15 on this machine.

The first cap that suggested itself, 8, came from the one run that had happened to pass. It still timed out tests in both of its clean runs here. Measuring across 4 to 15 workers showed that 4 costs no time, because the suite is bound by git process creation, not by CPU.

Later, writing the pull request body, I gave PR #383 the number 384 from memory. A `gh api` lookup caught it before the body was posted, and 384 turned out to be this session's own pull request. A number that goes into a public artifact gets looked up, not remembered.

#### Linked worktrees isolate files, not the machine

Four sessions were working in this repository at once, each in its own worktree, and each pushed through a pre-push hook that runs the whole suite. This session's measurement runs, more than a dozen full runs, made another session's hook time out tests.

Later this session's own push started while a sibling's hook was running, because the wait-for-quiet check was broken. A PowerShell function that returns an empty `HashSet` hands back `$null`, and the method-call error that follows is non-terminating. So the check read a busy machine as quiet.

The repository's isolation guidance (ARC-028) covers file footprints, not machine load. Full-suite runs and pushes from several sessions on one machine contend whatever the per-run cap is. What would have helped: announce heavy runs to the sibling sessions before starting, keep their number low, and write checks that fail closed.

#### `spell-create-pull-request`'s body path sits outside a Claude Code worktree

Step 4 of `spell-create-pull-request` writes the description to `<git-dir>/arcane-pr-body.md`. In a linked worktree that directory is `.git/worktrees/<name>/` under the primary checkout. Claude Code's worktree guard refused the Write tool there and suggested a path that does not exist, because a worktree's `.git` is a file. The body went to the session's scratch directory instead, with the same first-line branch marker and the same checks before and after the create.

### Open Items Carried Forward

- This close's pull request, head `sessions/2026-10-21-close-vitest-workers-windows`, was dispatched when this entry was written. The operator merges it.
- Two open LOW items in `TODO.md` "### Test Infrastructure", both offered as session cards on 2026-10-21 and not started:
  - "the leak fixed in `test/up02-a-flags.test.ts`, where a timed-out test's abandoned body reaches the next test's spies, can exist in other files";
  - "real-git tests still on vitest's 5 s default time out under load".
- "Adopt type-aware lint: silent typed rules first" is no longer open: [PR #386](https://github.com/codemagicianhq/arcane/pull/386) opened at 14:07 PDT and merged at 15:03 PDT. The first version of this entry said it had no PR yet. That check ran at about 14:00, before the PR opened, and was not repeated before the entry was committed at 14:37.
- About 50 fixture directories remain in the operator's `%TEMP%` from this session's two `test/up02-a-flags.test.ts` runs before the rebase onto PR #383's leak fix (untracked: operator machine state, not repository work).
