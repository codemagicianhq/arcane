# 2026-10-12 — The test suite passes on macOS, and CI now requires it

Related: [[testing-standards]] (the coverage gate the fix was verified against), [[cicd-standards]]
(the required-check gate the new macOS job joined), [[git-conventions]] (the commit, branch and
pull-request rules this session ran through), [[development-methodology]] (the bug workflow the fix
followed), [[2026-10-12-symlink-realpath-compare]] (the session this one spawned).

## Session: macOS test fixtures compared by real path

### Prompt Context

The operator asked for the test helpers to be fixed so the full suite passes on a Mac without any
environment workaround. On macOS the default temp directory is `/var/folders/<xx>/<hash>/T/`, and
`/var` is a symlink to `/private/var`. `createFixtureDir` returned `mkdtemp`'s path unresolved, and
the tripwire in `runGit` from [EF-34](../docs/intake/batch-001/EF-34.md) (pre-commit test runs
inherit `GIT_DIR` and write fixture state into the real repository) compared it with git's
symlink-resolved `--absolute-git-dir`, so it threw on every fixture. The brief: make fixture
directories real paths or resolve both sides of the comparison, keeping the tripwire's protection;
add a test proving a symlinked temp root passes and a leaked repository still trips; consider adding
a git-fixture test file to the macOS CI job; run `npm run test:coverage` with the default macOS
`TMPDIR`, plus lint and typecheck. Later asks in the same session: push and open the pull request,
make the new macOS job a required check, clean up, pull `main` in the primary checkout and run the
tests there, check on the spawned session and archive it, and close this session with this entry.

### What Got Done

1. **The suite passes on macOS** — [PR #363](https://github.com/codemagicianhq/arcane/pull/363),
   merged by the operator on 2026-10-12T19:51Z as `ecf7a0d` (a rebase merge). The baseline, on a
   clean `main` at `4e04f5c` with the default `TMPDIR`: 179 of 2282 tests failed in 24 files. All
   but one trace to the tripwire; the other is `test/resolve-cli.test.ts`, where `require.resolve`
   returns the real path. The tripwire now compares real paths on both sides with a path-separator
   boundary (`resolvesInside`, `test/helpers/git-fixture.ts`), which also closes a gap in the old
   prefix test: `<fixture>-other/.git` counted as inside. `createFixtureDir` returns
   `fs.realpath(...)` (`test/helpers/fixture-dir.ts`), and `test/resolve-cli.test.ts` makes its
   directories with it. New tests rebuild a symlinked temp root on every OS
   (`test/git-fixture-isolation.test.ts`, `test/fixture-dir.test.ts`). Each was run against the old
   helpers, a comparison without the boundary, and a disabled check, and failed where it should.
   All seven checks on #363 passed.
2. **A macOS CI job, now required** — #363 added `Fixture tests (macos-latest)` to
   `.github/workflows/ci.yml`: six fixture-heavy test files against the runner's real temp
   directory. At the operator's instruction, the `protect main` ruleset gained it as a fourth
   required status check at 2026-10-12T22:29:59Z, confirmed through `rules/branches/main`
   ([ARC-056](../DECISIONS.md#arc-056--the-macos-fixture-job-is-a-required-check)).
3. **Two product bugs found and handed to a spawned session** — with only the tripwire fixed, four
   failures it had been masking surfaced: two test expectations built from the unresolved path, and
   two product checks comparing a symlinked spelling with git's real path (the org-token guard in
   `scripts/org-token-lint.ts`, and `isHookEnforced` in `src/modules/push-safety.ts`). They went
   into `TODO.md` and to a spawned session, which fixed both in
   [PR #364](https://github.com/codemagicianhq/arcane/pull/364) (merged 2026-10-12T22:47Z,
   `9c05827`), the first pull request gated by the new required check.
4. **Verified on the primary checkout** — at `ecf7a0d`, `npm run test:coverage` with the default
   macOS `TMPDIR` gave 2307 passed, 5 skipped, 0 failed. That checkout has a built CLI, so it ran 37
   built-CLI tests that this session's worktree runs had skipped.
5. **Cleaned up** — this session's fix worktree and its branch, local and remote, are gone, and the
   spawned session's worktree went with its archive.

### Decisions Made

| ARC | Decision | Rationale |
| --- | --- | --- |
| [ARC-056](../DECISIONS.md#arc-056--the-macos-fixture-job-is-a-required-check) | `Fixture tests (macos-latest)` is a required status check on `main` | An advisory check can be merged over at the moment it matters; the operator chose prevention at the root over a monitor that reacts after a failure lands. |

### Lessons Learned

#### Fixing the tests' root cause uncovered two product bugs, then hid them again

The tripwire threw at every fixture's `git init`, so the 179 failures said nothing about what ran
after it. Running the suite with only the tripwire fixed, before touching the fixture creator,
surfaced four failures it had been masking, two of them product checks that compared a symlinked
path with git's real one. Once fixtures are real paths, the suite stops spelling paths through a
symlink at all, so it can no longer find that class of bug by accident; #364 had to add tests that
create the symlink explicitly. When a fix makes tests feed the product canonical input, run the
suite with the narrowest fix first, and keep explicit tests for the case the canonical input stops
exercising.

#### A safety test passed with its safety check switched off

In `test/git-fixture-isolation.test.ts`, "throws instead of silently succeeding if a fixture init
ever resolves outside its own directory" asserts that `runGit` does *not* throw with `GIT_DIR`
pointed at a decoy, because `fixtureGitEnv` strips the variable first. It still passed with the
tripwire's check replaced by `true`, so nothing proved the tripwire fires until this session's
"still trips" tests. That came out of running each test against a disabled check. Run a guard's
tests once with the guard disabled: a test that still passes is not testing it. The rename is in
`TODO.md` (Test Infrastructure, "a safety test's title claims a throw it never asserts").

#### A failure count needs the commit it was measured on

The brief reported 192 failures in 27 files of 2302 tests. A clean checkout of `main` at `4e04f5c`
gave 179 in 24 files of 2282, and the larger numbers fit a tree carrying the sign-in branch's extra
tests. Both were honest counts of different trees. Record the commit next to a count.

#### `spell-bug` read `tracking_mode` only from a root manifest this repository does not have

`spell-bug` step 2 resolves `tracking_mode` from `.arcane.json` and says to ask when it is unset.
Arcane's own repository has no root manifest (it is gitignored) and keeps its self-hosted one at
`src/assets/.arcane.json`, which says `internal`. The push-policy check
([ARC-049](../DECISIONS.md#arc-049--enforcing-a-recorded-push-policy-after-init), enforcing a
recorded push policy after init) already reads that file when it declares `selfHosted: true`;
`spell-bug` does not. The session followed precedent instead (an earlier test-helper fix recorded in
`TODO.md` with `Refs TODO.md`), which happened to match the manifest.

#### `spell-commit-work` had nowhere to read the tool author's domain from

For a commit by a CLI tool, `spell-commit-work` step 3 builds
`--author="Claude <claude@{OPERATOR_DOMAIN}>"` and resolves `{OPERATOR_DOMAIN}` from
`.arcane.json`, asking when it is unset. Neither manifest here carries one, so the domain came from
an earlier commit's author (`ff36fb9`), and the operator chose the identity at the approval prompt.
Recent commits in this repository are authored both ways: as the operator with agent trailers, and
as `Claude <claude@codemagician.net>`.

### Open Items Carried Forward

- **Rename the misleading safety test** — in `TODO.md` (Test Infrastructure, "a safety test's title
  claims a throw it never asserts").
- **Release the product fixes** — `main` carries #364's fixes unreleased; tracked in `TODO.md`
  ("Next release is a patch, 1.12.1").
- **Windows** — the symlinked-root tests use a junction so they can run on Windows, but nobody ran
  them there, and no CI job runs the fixture tests on Windows (untracked: no Windows fixture job
  exists; a Windows run of the suite is where they would first show).
- **This close's docs pull request** — dispatched; it needs the operator's merge.
- **This close's worktree and local branch** — removed by this session once the pull request is
  open; the branch on `origin` goes when the pull request merges.
