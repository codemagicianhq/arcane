# 2026-10-12 — `scripts/` and `test/` type-checked, and the opening drift check's fixes

Related: [[git-conventions]] (the branch, commit and pull-request rules this session ran through),
[[testing-standards]] (the CI and pre-commit gates this session extended),
[[2026-10-12-symlink-realpath-compare]] (the session beside this one, whose own lessons include the
type-check gap).

## Session: `scripts/` and `test/` type-checked, and the opening drift check's fixes

### Prompt Context

The operator asked to close a type-checking gap in the arcane CLI: nothing type-checked
`scripts/*.ts` or `test/*.ts`. They supplied facts checked on 2026-10-12 on
`sessions/2026-10-12-symlink-realpath-compare`. `tsconfig.json` includes only `src` and excludes
`test` and `scripts`. `npm run typecheck` is `tsc --noEmit`. `npm run lint` (`eslint src test`)
skips `scripts/` and is not type-aware. tsup, tsx and vitest transpile without checking. So a type
error in `scripts/` (`scripts/org-token-lint.ts`, ARC-041's privacy guard, and
`scripts/check-version-bump.ts` among them) or in any test failed neither CI nor the pre-commit
hook.

The work asked for, in order:

1. Add a tsconfig that extends `tsconfig.json` over `src`, `scripts` and `test`, with `rootDir: "."`
   and `noEmit`.
2. Inventory the existing errors by directory before changing anything.
3. Decide with the operator between fixing them and landing the check with a recorded baseline.
4. Add an npm script, wire it into CI's Type-check step, and weigh the pre-commit hook's time cost.

The constraints: a `sessions/YYYY-MM-DD-<slug>` branch, `spell-commit-work` with the operator
approving each staged diff and message, `spell-create-pull-request`, and a `TODO.md` record if the
gap was not closed in one go.

Later the operator asked to turn on Auto-fix, for a plain-language explanation of the work, to start
the doc drift follow-up ([PR #367](https://github.com/codemagicianhq/arcane/pull/367)), and for this
close. For this close they chose that the journal also cover
what landed since the 2026-10-09 close, which no journal had recorded.

### What Got Done

1. **The session opened per `spell-open-session`.**
   - The generated branch `claude/beautiful-sinoussi-fae89f` (unpushed, no pull request) was renamed
     `sessions/2026-10-12-typecheck-scripts-tests` before the first edit.
   - The 2026-10-09 handoff was surfaced and consumed. [PR #352](https://github.com/codemagicianhq/arcane/pull/352)
     had merged with all six checks passing, ARC-053 was accepted on 2026-10-10, and Dependabot
     alert 22 was fixed. Its two Windows-only items went back to the operator.
   - The report-only drift check found 1 High, 3 Medium and 3 Low findings. This session added an
     eighth: two governance documents misdescribe the pre-commit hook.
2. **The type-check gap closed:** [PR #365](https://github.com/codemagicianhq/arcane/pull/365).
   The operator merged it at 2026-10-12T23:39Z (`8ee8d44`, `29f0560`, `0f2110b`). All seven checks
   passed, and `main`'s CI on `0f2110b` passed.
   - Inventory on `ecf7a0d`: `src/` 0 errors (65 files), `scripts/` 0 (14 files), `test/` 21 errors
     in 7 of 147 files. The operator chose to fix all 21 instead of recording a baseline.
   - Two errors were more than missing annotations. `test/registry.test.ts`'s "no external
     components are registered" asserted on `RegistryComponent.external`, a field the type has
     never had, so it could not fail at any point since the first commit, `07b98a0`. At the
     operator's call it was deleted with its no-op filter. And
     `test/helpers/mock-identity-provider.ts` imported `KeyLike`, which jose 6.2.12 does not export.
   - `tsconfig.all.json` covers `src`, `scripts`, `test` and, at the operator's call, the root
     `vitest.config.ts` and `tsup.config.ts`. `npm run typecheck:all` runs it. CI's Type-check step
     and `.husky/pre-commit` run it after `typecheck`. `typecheck` stays because only its
     `rootDir: "src"` fails a `src/` file that imports from outside `src/` (TS6059, confirmed under
     `--noEmit`). `README.md` and `CONTRIBUTING.md` list the script.
   - Verified:
     - A probe type error planted in `scripts/`, `test/`, `vitest.config.ts` and
       `tsup.config.ts` failed `typecheck:all` four times while `typecheck` passed.
     - vitest and tsx each ran a file with a planted type error, so the gap was real.
     - On the branch rebased onto `9c05827`, `npm run test:coverage` gave 2312 passed, 5 skipped,
       0 failed (statements 91.95%, branches 87.05%).
     - The new check took 2.1–2.2 s; the hook's other steps took about 4.5 s together.
   - `TODO.md` records the gap as done and opens two LOW items: `npm run lint` skips `scripts/`,
     and two governance documents misdescribe the hook.
3. **Auto-fix was turned on for PR #365** at the operator's request. No CI event arrived before the
   PR merged.
4. **The opening drift check's findings were fixed:**
   [PR #367](https://github.com/codemagicianhq/arcane/pull/367). The operator merged it at
   2026-10-13T00:06Z (`226c54e`), after GitHub merged `main` into the branch (`a664888`). All seven
   checks passed, and `main`'s CI on `226c54e` passed. The fixes:
   - The Gate-pages `TODO.md` item now asks only for the browser review record. The operator did
     not know whether a review was recorded somewhere.
   - ARC-054's "unreleased" is corrected; decision 9 shipped in 1.12.0.
   - ARC-031's link to ARC-014 points at a real heading again. ARC-014's decision 5 is the
     build-time org-token lint, so the `TODO.md` item that doubted the reference is closed.
   - Current Priorities items 4, 8 and 10 are corrected.
   - ARC-053's status in `TODO.md` is corrected.
   - Two more stale ADR anchors (ARC-001, ARC-033) are fixed; all 176 ARC links in the three files
     now resolve.

   Left on purpose:
   - The old handoff note: this close's handoff replaces it.
   - The governance documents' hook description: their sources are distributable, so the fix waits
     for the next release (`TODO.md`).
   - One `check:citations` warning, which quotes pre-fix code as the evidence of a bug.
5. **Branch hygiene.** Both merged branches were deleted locally after `git cherry` showed every
   patch on `main`. The pull requests were rebase-merged, so the commits carry new SHAs there.
   GitHub had already deleted both remote branches.

### Landed Since the 2026-10-09 Close

No journal recorded these. They are summarized from their commits and pull requests, as the
operator chose. [PR #364](https://github.com/codemagicianhq/arcane/pull/364) has its own entry,
[[2026-10-12-symlink-realpath-compare]].

- **2026-10-10, [PR #353](https://github.com/codemagicianhq/arcane/pull/353):** ARC-054 records
  the sign-in decisions of 2026-10-05 and the 2026-10-08 hardening. The login PRD is marked
  shipped, with each acceptance check linked to its evidence.
- **2026-10-10, [PR #354](https://github.com/codemagicianhq/arcane/pull/354):** the handoff names
  1.11.5 as the latest published release. Its head branch, `claude/upbeat-cannon-q9ejnx`, is a
  generated name of the kind ARC-053 renames on sight.
- **2026-10-11, [PR #356](https://github.com/codemagicianhq/arcane/pull/356):** the brand mark is
  redrawn on the Flower of Life construction (four coordinates in the mark and lockup SVGs).
- **2026-10-11, [PR #355](https://github.com/codemagicianhq/arcane/pull/355):** ARC-053 accepted
  (2026-10-10). The macOS keychain run passed four of four on the operator's Mac. The production
  smoke-test account was deleted on 2026-10-10.
- **2026-10-12, [PR #360](https://github.com/codemagicianhq/arcane/pull/360):** 1.12.0. A browser
  sign-in now ends on arcane-ui's vendored Gate pages. It was published at 2026-10-12T19:07Z:
  GitHub release `v1.12.0`, a successful publish run, and npm `latest` 1.12.0.
  [PR #361](https://github.com/codemagicianhq/arcane/pull/361) accepted ARC-055.
- **2026-10-12, [PR #362](https://github.com/codemagicianhq/arcane/pull/362):** the release job
  creates the GitHub release with its own token and starts the publish with `gh workflow run`. An
  expired personal access token had stopped 1.12.0 from publishing on merge.
- **2026-10-12, [PR #363](https://github.com/codemagicianhq/arcane/pull/363):** the suite passes on
  macOS with the default `TMPDIR`, because fixture paths are compared by real path. CI gains a macOS
  fixture job.

### Decisions Made

No ADRs. The operator's calls this session were implementation choices, recorded in `TODO.md` and
the two pull requests.

| ADR | Decision | Rationale |
| --- | --- | --- |
| — | Fix all 21 type errors instead of recording a baseline | Seven test files and small edits; a baseline needs a comparison script larger than the fixes |
| — | Run `typecheck:all` in CI and the pre-commit hook, after `typecheck` | About 2 s per commit; `typecheck` alone enforces `rootDir: "src"` |
| — | Delete the vacuous registry test and its no-op filter | It could never fail; the typed `COMPONENTS` array already rejects the key |
| — | Cover `vitest.config.ts` and `tsup.config.ts` too | Same gap, both clean, no measurable cost |
| — | Fix the opening drift in its own pull request; leave the governance hook description for the next release | Keeps #365 about type-checking; that fix needs a version bump and a release |

### Lessons Learned

#### A test can pass for years by asserting on nothing

`registry.test.ts`'s "no external components are registered" filtered on a property the component
type has never had. At run time the property was always `undefined`, so the filter matched nothing
and the test passed on every run since the first commit. No reviewer had a reason to look: the test
was green. What surfaced it was type-checking the test file, which rejects a property the type does
not declare. A test that reads a property should be type-checked like any other code; that is now
the case here. The session beside this one recorded the same gap from the other side ("A green
typecheck said nothing about `scripts/` and `test/`").

#### A probe that never ran looks like a probe that passed

The first attempt to prove the new check worked planted nothing. In zsh an unquoted `$FILES` is not
split into words, so the loop ran once over the whole string and the appends failed. The command
chain stopped before `typecheck` ran, and `typecheck:all` reported no errors, which is also what a
working check reports on clean code. The failure showed only because `cp` printed an error. The second attempt listed the files literally and grepped for the planted marker
before trusting either check. When a check's "pass" is the evidence, first confirm the thing it was
meant to catch is actually there.

#### Read a cited ADR's decisions, not only its title

On 2026-09-02 a `TODO.md` item concluded that ARC-031 cited the wrong ADR, because ARC-014's title is
"Spell Authoring Standards". ARC-014's decision 5 is the build-time org-token lint, and ARC-031's own
context says "The existing org-token gate (ARC-014)". Only the anchor was stale. The item had stayed
open since 2026-09-02 on a premise that one search of the decision text would have settled.

#### A citation in a done item is evidence, not a pointer to keep fresh

`check:citations` warns that a done `TODO.md` item quotes `Would copy: ${file}` from
`src/commands/add.ts`, a phrase no longer in that file. The quote describes the code as it was when
the bug was found. Today's line, `Would copy: ${f.file}`, belongs to the fixed code, so repointing
the quote would cite the fix as the bug's evidence. Mechanical freshness is the wrong goal for a
historical citation.

#### `spell-create-pull-request` pushes before it rebases

The spell's Step 0 pushes a never-pushed branch (item 3) before the mandatory rebase on the target
(item 6). When the target has moved, that pushes a stale branch, runs the pre-push suite on it, then
needs a force push and a second suite run after the rebase. This session rebased first and pushed
once, and said so. The outcome the spell guards (no PR on a branch behind its target) is the same
either way.

#### A linked worktree runs the primary checkout's hooks

This worktree's `core.hooksPath` points at the primary checkout's `.husky/_`, so the pre-commit
change made on this branch never ran on this branch's own commits. It takes effect where
`.husky/pre-commit` is read, which is the primary checkout once its `main` is fast-forwarded.
Re-verify with `git config --get core.hooksPath`.

### Open Items Carried Forward

- **This close's docs pull request:** dispatched. It needs the operator's merge.
- **The primary checkout's `main` is at `ecf7a0d`, seven commits behind `origin/main`.** Until it is
  fast-forwarded, commits from linked worktrees run its older pre-commit hook, which has no
  `typecheck:all`. CI runs both checks regardless.
- **`main` carries unreleased product fixes:** #364's changes to `src/modules/push-safety.ts` and
  `src/modules/real-path.ts` reach users only in the next release, a patch per `spell-bump`'s table.
  The governance documents' hook description (`TODO.md`, "two governance documents still say
  `.husky/pre-commit` runs only lint and typecheck") can ride with it.
- **`TODO.md` LOW items from this session:**
  - "`npm run lint` (`eslint src test`) never lints `scripts/`".
  - The governance documents' hook description.
  - The Gate-pages item, "Record the browser review of the three Gate result pages at desktop and
    320 px".
- **From the 2026-10-09 handoff,** not checkable from this Mac: removing the linked worktree
  `arcane-wt-branch-naming` on the Windows machine, and deciding on the five local `backup/*`
  snapshots there.
- **This linked worktree** (`.claude/worktrees/beautiful-sinoussi-fae89f`) can be removed from the
  primary checkout once this close's pull request merges. A worktree cannot remove itself.
