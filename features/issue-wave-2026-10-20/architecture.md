# Architecture — Issue Wave 2026-10-20 (#357, #358, #359)

Related: [[PRD]] (the requirements this implements), [[testing-standards]], [[git-conventions]].

## Decisions

| # | Decision | Rationale |
| --- | --- | --- |
| D1 | One chokepoint for symlink handling: `copyFile` in `src/modules/copier.ts` always `lstat`s the destination and unlinks a symlink before writing. Index-tracked links are supplied by the caller through `opts.linkTracked: ReadonlySet<string>`, collected once per run by a new `listSymlinkTrackedPaths(targetDir)` in `src/modules/git.ts` (`git ls-files -s -z`, mode `120000` entries). Conversions are reported through `opts.conversions`, a collector the caller prints from. | `lstat` is free and needs no git; the index read needs one `git` spawn per run, not per file (a full install writes about 90 files). A collector keeps `copyFile`'s return type (the content hash) unchanged for its many callers. |
| D2 | For the index-`120000` shape only, after the write the entry is re-recorded as `100644` with `git hash-object -w -- <path>` and `git update-index --add --cacheinfo 100644,<blob>,<path>`. For a working-tree symlink the unlink and write are enough and the typechange is left unstaged. | On `core.symlinks=false` git's `ce_mode_from_stat` keeps an existing entry's symlink mode, so a plain write cannot change what git records; re-recording the entry is the only route. Staging is confined to the case that needs it, and the summary line says it happened. |
| D3 | The #358 fallback accepts an orphan with no recorded hash only when `git status --porcelain -z -- <file>` is empty (tracked, clean) and `git log --format=%H -- <file>` lists exactly one commit. Any other reading, or no repository, reports the file with the manual route. | Offline, conservative, and the evidence the issue itself proposed. The one-commit test cannot see an edit made before the file's first commit; recorded as a limit in the PRD and in the message. |
| D4 | `missingTierWarning` keeps its signature and its lines; the handler treats a non-empty result as a refusal: print, `process.exit(1)`, return. It runs where the warning ran, before any git-state check or write, so `--dry-run` refuses too. | The five existing tests of the function stay valid; the behaviour change lives in the handler, where exits already live and are mocked in tests. |
| D5 | `renderSpellRoutingSection(spellScope)` appends the stop rule when the repository's `spellScope` is `"user"`. `syncAgents` already receives `options.spellScope`. | The routing block is the place agents read first; the sentence travels with the existing render, no new file. |
| D6 | The doctor check `checkManagedFileModes(targetDir)` reads the manifest's component files, runs `git ls-files -s -z` once, and reads each client shim body (paths matching the spell compiler's shim patterns). Blocking fail on either finding; `skipped: true` when there is no manifest or no git repository. | Mirrors `checkSpellScope`'s shape and the runner's conventions; a broken shim is a real defect, like a missing tier, so it blocks. |

## Components touched

| Path | Change |
| --- | --- |
| `src/modules/copier.ts` | `copyFile` and `copyDirectory` accept `linkTracked` and `conversions`; new `replaceSymlinkedDestination` helper; `SymlinkConversion` type. |
| `src/modules/git.ts` | `listSymlinkTrackedPaths`, `recordRegularFileInIndex`, `isUneditedTrackedFile` (status + log evidence). |
| `src/commands/update.ts` | Collects the link set once after the repository check; threads it and a conversions collector into the copy loop, the merge write and `executeInstallPlan`; prints conversions in the summary; `resolveOrphan` gains the fallback and the manual-route message; the tier warning becomes a refusal. |
| `src/modules/component-install.ts` | `executeInstallPlan` accepts the same options and passes them to `copyFile`. |
| `src/commands/doctor.ts` | `checkManagedFileModes`, registered in the runner. |
| `src/modules/agent-generator.ts` | `renderSpellRoutingSection(spellScope)`. |
| `test/copier.test.ts`, `test/update.test.ts`, `test/doctor-managed-file-modes.test.ts` (new), `test/agent-generator.test.ts` | Red-before-green tests per acceptance criterion. |
| `CHANGELOG.md`, `package.json`, `package-lock.json` | 1.12.2 entry and bump. |

## Testing strategy

- Each story's tests are written first and run red against the unchanged code; the edit turns them
  green; the full suite runs before the PR (`npm run test:coverage`, thresholds from `vitest.config.ts`).
- Fixtures use `test/helpers/git-fixture.ts`'s `runGit`, which scrubs the parent process's git context
  (EF-34). The index-`120000` shape is built with `git hash-object -w --stdin` and
  `git update-index --add --cacheinfo 120000,<blob>,<path>` over a regular file, so it runs on every OS.
  The working-tree-symlink case creates a real file symlink and skips with its reason on `EPERM` or
  `EACCES` (Windows without the privilege).
- The doctor check is tested through its exported function, like every other `doctor-*.test.ts`.
- The update handler tests reuse the file's existing `process.exit` spy pattern and the `@inquirer`
  and git mocks already in place; the #358 fallback is tested against a real fixture repository through
  `resolveOrphan` directly, so the handler's git mock does not hide it.
