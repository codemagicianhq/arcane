# PRD: Issue Wave 2026-10-20 — three managed-file defects (#357, #358, #359)

---
tracking:
  tracking_mode: internal
  external_provider: null
  adoWorkItemId: null
  githubIssueId: null
status: approved
created: 2026-10-20
approved_by: operator (payini), 2026-10-20, in-session plan approval ("Go")
---

Related: [[development-methodology]] (the Spell Loop this runs through), [[git-conventions]]
(branch, PR and merge rules), [[testing-standards]] (coverage thresholds the tests must hold).

## Problem Statement

Three open issues report ways `spell update` leaves a consumer repository silently wrong. All three
were filed from real consumer repositories between 2026-10-11 and 2026-10-14, and each was checked
against the current source on 2026-10-20 before this document was written:

- **#357.** `copyFile` ([src/modules/copier.ts](../../src/modules/copier.ts), `writeFile(destPath, content)`)
  and the merge path in [src/commands/update.ts](../../src/commands/update.ts) (`writeFile(join(targetDir, file), result.content)`)
  write *through* a managed path that is a symlink. Neither `lstat`s the destination nor reads the
  git index, so a consumer that symlinked its `.claude/commands/*.md` shims before Arcane managed
  them keeps the links. On a `core.symlinks=false` machine the working-tree file is regular but the
  index still says mode `120000`, so git commits the new shim text as a link *target*; every other
  machine then checks out a broken link and Claude Code drops the command. Nothing in `spell doctor`
  notices either shape.
- **#358.** `resolveOrphan` ([src/commands/update.ts](../../src/commands/update.ts)) refuses to prune a
  file with no recorded hash ("Orphaned, not pruned (no recorded hash to verify it's untouched)") and
  names no next step. Components installed before ARC-038 recorded hashes cannot be cleaned up by
  `spell update --prune`, and the retired component's manifest entry stays, so `spell doctor` keeps
  reporting it.
- **#359.** `missingTierWarning` ([src/commands/update.ts](../../src/commands/update.ts)) detects a
  `spell_scope: "user"` repository whose machine has no `~/.arcane`, prints a warning, and lets
  `spell update` succeed. The repository's `CLAUDE.md` and `AGENTS.md` keep routing to spells that
  resolve to nothing, and nothing tells an agent to stop instead of improvising.

The handed-in diagnoses hold against the current tree; none of the three was fixed by anything that
landed since they were filed (the last change to the update command before this wave is `1474e56`,
2026-10-03).

## Users

Every Arcane consumer that runs `spell update` on a repository with pre-existing symlinks, legacy
(pre-hash) components, or a user-tier opt-in, on any machine; the operator reading `spell doctor`;
and every assistant that reads a user-scoped repository's routing block.

## Requirements

### Must Have

- **R-357 — Managed writes replace symlinks with regular files.** Every managed path `spell update`,
  `spell init` or `spell add` writes is a regular file afterwards, whatever it was before:
  1. a symlink in the working tree (`lstat`) is unlinked before the write;
  2. a path the git index tracks as a symlink (mode `120000`, the `core.symlinks=false` shape, where
     the working-tree file already looks regular) is unlinked, rewritten, and re-recorded in the index
     as `100644`, because git keeps the symlink mode for an existing entry on a machine without
     symlinks and a plain write cannot change what it records there;
  3. each conversion is reported in the update summary, naming the path and whether the index was
     touched.
- **R-357-doctor — `spell doctor` flags both shapes.** A blocking check names (a) every managed path
  the index tracks as `120000` and (b) every managed client shim whose entire body is a single relative
  path (a symlink materialised as text), with the fix (`spell update`, then commit the typechange).
  Skipped, not failed, where there is no git repository or no manifest.
- **R-358 — `--prune` has a verified fallback when no hash is recorded.** For an orphan with no
  recorded hash, `spell update --prune` deletes the file only when git can confirm it is untouched:
  the path is tracked, has no working-tree or index changes, and exactly one commit in its history
  touched it. Otherwise it is reported with the manual route named in the message (`git rm <file>`,
  then remove the component's entry from `.arcane.json`). A directory that is not a git repository
  gets the manual route. Once every file of a retired component is pruned or gone, its manifest entry
  is dropped, as the existing retirement path already does.
- **R-359 — A user-scoped repository refuses to update without its tier, and tells agents to stop.**
  1. `spell update` in a `spell_scope: "user"` repository whose machine has no readable `~/.arcane`
     manifest exits 1 before writing anything, naming `spell init --user` and the `spell_scope`
     alternative. This holds for `--dry-run` too: a dry run that reports success is the observed
     failure.
  2. The routing block `spell agents sync` renders into `CLAUDE.md` and `AGENTS.md` for a user-scoped
     repository tells the agent that spells come from the user tier and that a spell which does not
     resolve means "stop and say `spell init --user` is needed on this machine", never improvise.

### Should Have

- Nothing beyond the Must Have list. The wave is three defects and their doctor coverage.

### Won't Have (this iteration)

- **#375 and #376** (a visual-verification routine; the EAS update lifecycle section). Spell content,
  not code; planned as Wave B after this PR merges.
- **`--prune --force`** (#358, option 3). The operator chose the verified fallback plus the manual
  route; a force flag is a new flag and a new way to lose an edit.
- **A recorded minimum user-tier version** (#359, expected item 1's "or older"). A new manifest field
  and a minor bump; the operator chose refusal on a missing tier only.
- **Converting symlinked merge targets** such as `CLAUDE.md` or `AGENTS.md` themselves. They are the
  operator's files with managed blocks, not managed paths; out of #357's scope.
- **Verifying a hash-less orphan against the published tarball.** Offline git evidence is the chosen
  check; a retired component's assets may not exist in the installed version's tarball at the same
  path.

## Constraints

- One branch, one PR, one version bump. Every change is a bug fix under `src/commands/` or
  `src/modules/`, or an update to generated text, so per `spell-bump`'s table the bump is a **patch**
  (1.12.1 → 1.12.2). No new CLI flag.
- Offline. The #358 fallback and the #357 index check use the local `git` through `runGit` and
  degrade to "report, name the manual route" when git is unavailable.
- Tests run red before each edit and green after it; the full suite and the coverage thresholds in
  `vitest.config.ts` (80% lines, branches, functions, statements) hold.
- Platform honesty. A file symlink cannot be created on Windows without a privilege, so the
  working-tree-symlink test skips there with its reason; the index-`120000` fixture
  (`git update-index --add --cacheinfo 120000,<blob>,<path>` over a regular file) runs on every OS and
  is the shape the issue reported.
- The #358 fallback cannot see an edit made before the file's first commit (install and edit in one
  commit leave one commit in the history). Recorded here as a known limit of the chosen evidence.
- `spell update` does not re-render the routing block; `spell agents sync` does. The CHANGELOG entry
  says so, so a consumer knows which command carries R-359.2 into its files.

## Acceptance Criteria

| ID | Criterion | Evidence |
| --- | --- | --- |
| AC-357-1 | `copyFile` over a destination that is a working-tree symlink leaves a regular file with the rendered content (test skips with reason where a file symlink cannot be created). | `test/copier-symlinks.test.ts` |
| AC-357-2 | `copyFile` over a path the index tracks as `120000` with a regular working-tree file leaves the content rewritten and `git ls-files -s` reporting `100644`. | `test/copier-symlinks.test.ts` |
| AC-357-3 | `spell update` reports each conversion in its summary, and converts a `120000` shim on a fixture repository. | `test/update-issue-wave-2026-10-20.test.ts` |
| AC-357-4 | `spell doctor` fails naming a managed `120000` path and a shim whose body is only a relative path, names the fix, and skips outside a git repository. | `test/doctor-managed-file-modes.test.ts` |
| AC-358-1 | With no recorded hash, `--prune` deletes a tracked, clean orphan whose history has one commit. | `test/update-prune-fallback.test.ts` |
| AC-358-2 | With no recorded hash, `--prune` keeps an orphan with uncommitted changes, one with two commits in its history, and an untracked one, and the message names `git rm` and the manifest entry. | `test/update-prune-fallback.test.ts` |
| AC-358-3 | With no recorded hash and no git repository, `--prune` keeps the file and names the manual route. | `test/update-prune-fallback.test.ts` |
| AC-358-4 | A retired component whose hash-less files were all pruned leaves no manifest entry. | `test/update-issue-wave-2026-10-20.test.ts` |
| AC-359-1 | `spell update` (and `--dry-run`) in a user-scoped repository with no tier exits 1 before writing, naming `spell init --user`. | `test/update-issue-wave-2026-10-20.test.ts` |
| AC-359-2 | The rendered routing section contains the stop rule when `spellScope` is `"user"` and not otherwise. | `test/agent-generator-routing.test.ts` |
| AC-359-3 | `missingTierWarning`'s existing behaviours are unchanged (its five tests still pass). | `test/update.test.ts` |

## Dependencies

None outside this repository. Git on the PATH, as every `spell update` already requires.

## Open Questions

None blocking. The known limit of the #358 evidence is recorded under Constraints rather than left
open; it changes the message, not the scope.
