# 2026-10-21 — Fixture directory leaks removed, and a guard that fails the file that leaks

Related: [[testing-standards]] (the vitest conventions the guard follows), [[git-conventions]] (the session branches, fingerprinted commits and pull requests this session ran through), [[2026-10-20-lint-scripts-and-safety-test-title]] (the session whose pre-push timeouts led to this one)

## Session: Fixture directory leaks removed and guarded

### Prompt Context

A side session started by the 2026-10-21 open-session ("arc - hulk - Spell open session") to fix a test-infrastructure defect found that day. Test files created fixture git repositories with `createFixtureDir` (`test/helpers/fixture-dir.ts`) and never removed them. The operator's `%TEMP%` had accumulated 70,914 leftover directories since 2026-09-03, and the growing folder slowed the full suite on Windows from 100 s to 161 s in one day, timing out real-git tests with 5 s budgets and blocking the pre-push hook three times. The brief: remove every leak, add the lightest guard `testing-standards.md` allows and say why in the commit, never delete the operator's existing temp directories from the repository, and register the finding in `TODO.md` unless another session's open pull request was editing it. Done meant a full run leaving the temp folder's count unchanged, the guard in place, and a pull request open with CI green. Later the operator approved two fingerprinted commits, allowed one push with `--no-verify`, merged both pull requests and asked for this close.

### What Got Done

1. [PR #383](https://github.com/codemagicianhq/arcane/pull/383) merged onto `main` as `142c9b7` through the operator's auto-merge (rebase method), with CI green on the pull request and on `main`. The eight files that leaked on every run (`test/push-safety.test.ts`, `test/block-push.test.ts`, `test/up02-a-push-controls.test.ts`, `test/up02-a-update-push-policy.test.ts`, `test/up02-a-flags.test.ts`, `test/up02-a-ado-context.test.ts`, `test/up02-a-init-push-policy.test.ts`, `test/up02-integration-fixes.test.ts`) keep each test's directories in a `fixtures` list that an `afterEach` empties, and remove their `beforeAll` scopes directory in `afterAll`.
2. The guard, in the same pull request: `createFixtureDir` records every directory it makes, `removeFixtureDir` forgets it, and an `afterAll` that the helper registers at import time sweeps whatever is still on disk when the file ends, removes it, and fails the file naming the directories. Vitest runs after-hooks in reverse registration order (`sequence.hooks: "stack"`), so a hook registered at import runs after the file's own. `test/fixture-dir.test.ts` gained three tests for the sweep. The helper registers the hook itself rather than through a `setupFiles` entry, which would have changed `vitest.config.ts` while another session was editing it; diffing the temp folder around each file was rejected because parallel files would see each other's directories.
3. `TODO.md` records the finding as a done MEDIUM item under "### Test Infrastructure", and the open LOW item on `EBUSY` cleanup failures records its second sighting. This close corrects the MEDIUM item's counts (see "A total minus the known exclusions is not a per-file count" below).
4. [PR #385](https://github.com/codemagicianhq/arcane/pull/385) merged as `c5fa879`, rebased by the merge onto the sibling session's [PR #384](https://github.com/codemagicianhq/arcane/pull/384): the guard's message also names the cause seen under load, a timed-out test that kept running past its own cleanup. CI on `main` passed for `c5fa879`, the first run of both changes together.
5. Measured on 2026-10-21:

| Full run | Entries left in the temp folder |
| --- | --- |
| `73f5393`, empty `TEMP` | 249: 234 from the eight files, 11 from four files that leak only when a test fails, 4 not fixtures |
| fixed tree, empty `TEMP` | no fixture directories |
| `main` plus the #385 change, real `%TEMP%`, no other suite running when the run started | no fixture directories, one new vitest directory |

During that last run 52 more entries appeared, from a sibling worktree's two runs of the unfixed `test/up02-a-flags.test.ts`, attributed by creation times and that worktree's `coverage/junit.xml`.

### Lessons Learned

#### Measure a temp-folder leak in an empty temp root, not in the shared one

The operator's `%TEMP%` is shared by every session on the machine, so a before-and-after count there measures everyone's runs at once. Three diffs of the real folder taken around this session's pushes picked up 160 to 430 leak-named entries each from sibling worktrees running the unfixed suite, while the isolated measurement of the same tree was clean. Pointing `TEMP` and `TMP` at an empty directory for one run, then grouping what remains by prefix with the six random characters stripped, gave an attributable count in one step. When the real folder had to be measured, creation times against the run window, plus each worktree's `coverage/junit.xml` with its time and suite list, named the source of every entry. Some entries per run are not fixtures at all: `node-compile-cache`, tsx's cache directory, the fixed-name `never-written` workspace root that `test/agents-user-tier.test.ts` configures, and the 21-character directory of transformed modules that vitest leaves on every run, about 7 MB after a full run, now a LOW item in `TODO.md`. That last one was first written off as empty; looking inside before calling a leftover harmless would have caught it.

#### A cleanup guard also reports tests that outlive their own cleanup

Under full-suite load the guard fired in files whose every `createFixtureDir` was paired. A test that times out keeps running after vitest moves on, so its `afterEach` removal ran while the body was still busy or hit `EBUSY`, and the body created more directories after the cleanup. Sweeping them at the end of the file is the right outcome, but the first message told the reader to add a pairing that already existed. PR #385 names both causes and points at the file's other failures to tell them apart. A guard's message has to describe every way the guard can fire, not only the one it was written for.

#### Parallel sessions on one machine fail each other's pre-push hooks

Four sessions pushed from the operator's Windows machine on 2026-10-21, and each push runs the full suite. Three attempts to push PR #383 failed with 13 to 28 timeouts each while sibling worktrees ran 9 to 14 vitest processes, and the operator allowed one push with `--no-verify`. Waiting for a quiet window first worked once and failed once: a sibling's own quiet check read a running vitest as idle and started a full run beside this one, and one test with a 5 s budget timed out at 8 s. The retry passed. A process count right before the push, a sampler during it, and a message to the sibling sessions before pushing are all cheap. The sibling's 4-worker cap (#384) passed with no timeouts while this session's 8-worker run overlapped it.

#### A total minus the known exclusions is not a per-file count

The first measurement's 249 entries were reported in the commit message of `142c9b7`, in PR #383's description and in the `TODO.md` item as all but four coming from the eight files, with three more files leaking only on failure. Both figures were wrong. 245 is 249 minus the four non-fixture entries, and it silently included 11 entries from four other files that leak only when a test fails: `test/report-cli.test.ts` 5, `test/secrets-scan.test.ts` 3, `test/report-command.test.ts` 2 and `test/init-git-state.test.ts` 1. The eight files left 234. The error came from subtracting the exclusions instead of summing the prefixes that map to each file, and the fourth file was probably missed because `report-command-` sat beside `report-cli-` in the listing. This close corrects the `TODO.md` item; the merged commit message and the pull request description keep the wrong figures.

#### Edit many files with a counted, exact-match script

Eight files needed the same structural edit. `sed` lost backslashes through the Bash tool, so a Node script written by heredoc made the edits, with each replacement required to match exactly once and each file's rename count checked against the creation sites counted beforehand. A textual pre-check for identifier collisions stopped the first two runs by matching words in a comment; checking code uses with `grep` first, then dropping the pre-check, was the fix.

### Open Items Carried Forward

- This close's pull request (head `sessions/2026-10-21-close-fixture-dir-leaks`): dispatched when this entry is written; the operator merges it.
- The leaked directories already in the operator's `%TEMP%`: 10,495 entries at 14:05, 5,231 of them with leak prefixes from runs of the unfixed suite. The operator removes them by hand, registered in `TODO.md` under "### Operator follow-ups".
- The directory vitest leaves on every run, 368 of them and 438,689 KB in `%TEMP%` that day: registered in `TODO.md` ("each vitest run leaves a directory of transformed modules in the temp folder").
- Real-git tests that still run at vitest's 5 s default, including `test/secrets-scan.test.ts`'s hook test, and the `EBUSY` cleanup budget: open in `TODO.md` under "### Test Infrastructure".
- The sibling sessions: "Cap vitest workers for the pre-push suite on Windows" merged as PR #384 and is closing in its own worktree; "Adopt type-aware lint: silent typed rules first" had no pull request when this entry was written (untracked: that session tracks its own work).
