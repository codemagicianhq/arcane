# 2026-10-21 — Typed lint: the 11 rules that reported nothing, plus the assertion rule

Related: [[testing-standards]] (the coverage thresholds the suite runs were held to), [[git-conventions]] (the session branch, fingerprinted commits, rebase syncs and pull request this session ran through), [[2026-10-20-lint-scripts-and-safety-test-title]] (the session whose measurement declined the whole typed preset and named these 11 rules), [[2026-10-21-fixture-dir-leaks]] (a sibling session that closed the same day).

## Session: Typed lint, silent rules first

### Prompt Context

A side session started on 2026-10-21 by "Close two LOW test-infrastructure items", the session that had declined type-aware linting the day before at a measured cost of about 4.9 s more per `npm run lint` (`TODO.md`, the done item "`npm run lint` (`eslint src test`) never lints `scripts/`, and no lint rule is type-aware"). The brief: ask the operator first whether that cost is acceptable for the 11 typed rules that reported nothing on 2026-10-20, and stop if not. If yes, keep `tseslint.configs.recommended`, add a block with `parserOptions.project: "./tsconfig.all.json"` and `tsconfigRootDir: import.meta.dirname`, enable exactly those 11 rules, confirm zero findings, re-measure three `npm run lint` runs and one pre-commit run on the same machine, and put the numbers in the commit bodies. Optionally, each in its own commit: remove the 219 `no-unnecessary-type-assertion` findings with `--fix` and enable that rule, and register the rest of the preset in `TODO.md` with counts. Register the work as a new Test Infrastructure item and mark it done in the same pull request. The session's model changed twice mid-task, from claude-fable-5-1 to claude-sonnet-5-5 to claude-opus-5-5.

### What Got Done

1. The operator accepted the cost on 2026-10-21 ("Yes, enable them").
2. [PR #386](https://github.com/codemagicianhq/arcane/pull/386) merged onto `main` at 22:03 UTC, by the operator with the rebase method, as four commits each approved by fingerprint: `56e856f` enables the 11 rules; `4692146` removes 213 non-null assertions and 6 casts in 60 files with `eslint --fix` and enables `no-unnecessary-type-assertion`; `5371de6` adds the Test Infrastructure item, done, with the cost; `1fa4f87` adds an open item for the preset's other 11 typed rules. All 7 checks passed on the pull request, and `main`'s CI passed on `1fa4f87`.
3. Measured from 11:02 to 11:10, with no vitest process running during any kept run. One block that a sibling session's suite overlapped was discarded.

| Measure | Untyped | 11 typed rules |
| --- | --- | --- |
| `npm run lint`, 3 runs | 3.9, 4.1, 4.3 s | 8.9, 9.0, 8.0 s |
| eslint process CPU time, median | 5.5 s | 12.5 s |
| `.husky/pre-commit`, 1 run | 15.0 s | 18.0 s |

`no-unnecessary-type-assertion` adds 24 ms per run by ESLint's per-rule timing.

4. Verified before the merge: zero findings over 234 files; the whole typed preset reports 362 errors on `88a3187` and 143 after the assertion removals, so the type information is live; a planted violation of each of the 12 rules was reported by name; `npm run typecheck` and `npm run typecheck:all` pass; `npm run test:coverage` on the final tree passed 2353 tests with the thresholds met.
5. 195 of the 213 removed `!` were on an index access. `tsconfig.json` does not set `noUncheckedIndexedAccess`, so the compiler already typed those reads without `undefined`; the commit body says they need a real check if that option is ever turned on.
6. The branch was synced twice, both times by rebase. Before the pull request opened, `main` had moved six commits; after it opened, an Auto-fix event reported a conflict with `2777104`. Both conflicts had the same shape: `main` and this branch each appended items at the end of `TODO.md`'s "### Test Infrastructure". Each was resolved by keeping `main`'s items first and this branch's after them, and `TODO.md` then differed from `main` by exactly this branch's lines. The second sync followed `spell-sync-pull-request`: backup tags, an explicit `--force-with-lease`, and a provider check that the pull request was mergeable and rebaseable.

### Lessons Learned

#### Time a lint change in blocks, and discard any block a sibling's suite overlapped

The first two sittings measured nothing useful. Untyped `npm run lint` took 26 to 43 s and the pre-commit hook 108 s, against 3.6 to 3.8 s and 12.6 s on a quiet machine the day before, because other sessions were running their suites. A machine that is quiet when a script starts does not stay quiet: in the third sitting a sibling started five vitest processes before the first measured run, and they ran through all of it. What worked was a script that waits for three quiet samples, runs untyped and typed back to back in blocks of four, checks for vitest processes before and after every run, and keeps only blocks with none at either end. It also records the eslint process's CPU time beside wall time; under that sibling run CPU time rose about 25% and wall time 20 to 45%, so CPU time is steadier but not immune.

#### Timing scripts on this machine: run them through the PowerShell tool, and start npm through sh

A `pwsh -File` timing script launched from the Bash tool, with its output redirected to a file, died twice with exit code 127 and no message, the first time about three minutes in. The same script run through the PowerShell tool's background mode completed runs of four and eight minutes. Separately, `npm.cmd` started through .NET `Process.Start` from the worktree failed with MODULE_NOT_FOUND for `node_modules/npm/bin/npm-prefix.js` under the worktree. The script starts npm as `sh -c "npm run lint"` through Git's `sh.exe` instead, which is how the hook runs it anyway.

#### Auto-fix resolves conflicts by merging; this repository lands pull requests by rebase

The desktop app's Auto-fix event asked for `main` to be merged into the branch and said never to rebase or force-push. `git-conventions.md` requires a rebase on the latest `origin/<target>` before pushing, the "PR branch is rebased on target" check's own message says to rebase, and a merge commit's resolution is lost when GitHub replays a branch for Rebase-and-merge. The sync followed the repository's rule instead, and the operator confirmed it: resolve conflicts on this repository's pull requests by rebasing, per its git conventions.

#### A required job cancelled for lack of a runner shows as a failure

"Fixture tests (macos-latest)" showed as failed after 15 minutes. The job had no runner name, no steps and no log, so it never started. None of the six files it runs had changed in the pull request, and the same workflow had passed on `main` at the pull request's base. Re-running the failed jobs got a runner, and the job passed.

#### A model switch mid-session needs a provenance line in the commit

The harness's attribution line changed with each model switch, and for a while it disagreed with the model named in the system prompt. The commits record the model that made them in `Model:` and `Co-Authored-By:`, and the first commit's body also says which part an earlier model wrote. The Agent Attribution Model in `git-conventions.md` does not cover a session whose model changes.

#### The pull request title's majority-type rule picks `docs` for a config and code change

`spell-create-pull-request` Step 3 takes the title's type from the majority commit type. Two of this branch's four commits were `docs(todo)`, so the rule gives `docs` for a pull request whose substance is a lint configuration and 60 source files. The title used `chore(lint)` instead.

### Open Items Carried Forward

- This close's pull request (head `sessions/2026-10-21-close-typed-lint-silent-rules`): dispatched when this entry is written; the operator merges it.
- The preset's other 11 typed rules, 143 findings on `88a3187`: open in `TODO.md` ("the typed preset's other 11 rules stay off, with 143 findings").
- The cap-vitest close, [PR #388](https://github.com/codemagicianhq/arcane/pull/388), opened at 21:41 UTC: open when this entry is written. Whichever of the two closes merges second rebases and keeps the other's handoff items.
- `TODO.md`'s "Next release is a patch, 1.12.1" is still open although tags `v1.12.1` and `v1.12.2` exist. It belongs to another session, so this close flags it for the next session to check against its Done-when and leaves the item as it is.
- In this worktree: two `sync-backup/sessions/2026-10-21-typed-lint-silent-rules/*` tags, which the sync spell leaves for the operator to delete, and the worktree itself, `.claude/worktrees/wizardly-sanderson-a5cd6e`, which is removed from another checkout once this close merges.
