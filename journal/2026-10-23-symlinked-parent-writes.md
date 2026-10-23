# 2026-10-23 — managed writes refused through a linked directory (1.12.4), and the session close

Related: [[2026-10-21-issue-wave-357-359]] (the wave whose review found this gap, and #357's leaf
handling), [[git-conventions]] (the branch, commit, pull-request and merge rules this session ran
through), [[testing-standards]] (the pre-push suite and the coverage thresholds).

## Session: symlinked-parent writes (1.12.4)

### Prompt Context

Started on 2026-10-22 by the operator's top session with a brief. The task was to fix the `TODO.md`
item "MEDIUM (security): a managed path under a symlinked parent directory is written outside the
repository". The independent review of issue wave 2026-10-20 had found it:

- `validateTargetPath` (`src/modules/copier.ts`) compared `path.resolve` results.
- #357's link handling `lstat`ed only the leaf.
- So a linked `.claude` took `spell update`, `spell init` and `spell add` writes wherever it pointed.

The brief's steps:

1. Run `spell-open-session`.
2. Before any code, ask the operator one design question: refuse such writes outright, or honour a
   link the operator made deliberately (and how to tell the two apart).
3. Run `spell-bug`, with a failing test through a junctioned parent.
4. Fix it in the shared write path and record the decision in the TODO item.
5. A 1.12.4 patch bump with a CHANGELOG entry.
6. Commits approved by fingerprint, a pull request, the operator's merge, and this session's own
   close after it.

The operator's inputs during the session:

- Chose "refuse outright".
- Asked, twice, what happens to the Claude and Codex spell files that a machine-wide install keeps
  outside the repository.
- Approved four follow-up items, registered in `TODO.md`.
- After the review, chose a pull request of its own for the review's HIGH finding, and kept the target
  directory as the boundary.
- Said "merged".

### What Got Done

1. **Branch and handoff.** The generated `claude/zealous-shirley-52af9c` became
   `sessions/2026-10-22-symlinked-parent-writes` at `origin/main` `7a9fa09` (1.12.3). The 2026-10-22
   handoff was consumed (`94fb4ef` on `main`).
2. **Reproduced first, in a scratch directory on Windows.** With `.claude` a junction to a folder outside
   the repository, `copyFile` wrote there, and `removeWithin` then deleted the file there.
3. **Failing tests before the fix.** All use junctions, so they run on Windows:
   - `test/linked-directory-writes.test.ts` (21 tests)
   - `test/linked-directory-direct-writers.test.ts` (9 tests)
   - two cases in `test/init.test.ts`

   Against the old source (a saved `src` patch, the committed `src` checked out, then the patch
   re-applied and compared with a backup), 24 of the 30 failed, plus both init cases. The 6 that
   passed pin behaviour that must not change. The user-tier store test fails once `init --user` drops
   `followDirectoryLinks`.
4. **The fix** (`3823ea4`).
   - `findLinkedEscape`, `validateRealTargetPath`, `validateRealTargetDirectory` and
     `LinkedDirectoryError` in `copier.ts` resolve a path's directory and the target by real path,
     and refuse before anything is created.
   - These writers go through them: `copyFile`, `writeManagedFile`, `removeWithin`,
     `removeEmptyAncestors`, the marker merge and strip, agent files and the roster, `installHook`
     and `removeHook`, `spell doctor --fix`, and `spell uninstall`'s deletes.
   - `spell update` and `spell init` check every path first and refuse the run.
   - `spell add` plans such a file as `linked`.
   - `--prune` reports such an orphan instead of deleting it.
   - The user tier passes `followDirectoryLinks`.
5. **Before and after, with the built CLI and the published 1.12.2,** both in scratch directories.
   - Repository: in a clone whose `.claude` is a junction, 1.12.2's `spell update` restored 40 files
     where the junction pointed and exited 0. This branch exited 1, wrote nothing there, and left
     `git status` clean.
   - Machine-wide: `spell init --user` wrote 41 commands, 41 skills and 41 store spells through a
     junctioned `~/.claude` with both versions.
6. **The operator's question about the spell files outside the repository.**
   - The first answer described code paths. The second looked at the operator's own home:
     `~/.claude/commands` held 41 spell commands, `~/.agents/skills` 41 skills and `~/.arcane/spells`
     41 spells, and none of these folders was a link.
   - Only `--user` commands write those folders, so the fix cannot touch them.
   - Side finding: the store's manifest records 1.10.0 while the global CLI is 1.12.2.
7. **Independent read-only review.** It found one HIGH, which predates this change, and six LOW. All
   six LOW are fixed in the same commit:
   - `agents.yaml` sat one level above the `.arcane/agents` that was checked; the reviewer reproduced it.
   - `spell uninstall` advised a re-run after it had deleted `.arcane.json`.
   - `doctor --fix` reported "all present" with a file refused.
   - The messages said "repository" where the boundary is the target directory.
   - `spell update` asked its newly-available checklist before refusing.
   - The user-tier tests did not exercise the opt-out.
8. **`TODO.md`** (`5cb8da9`). The item is closed with the decisions, the fix and the evidence. Five
   follow-ups were registered, all approved by the operator: HIGH, MEDIUM, and three LOW.
9. **Release.** The 1.12.4 bump (`37a060e`) and its CHANGELOG entry (`b196a30`).
10. **Shipped, every step checked at the close.**
    - Pushed through the pre-push hook: 149 files, 2409 passed, 192 s.
    - Opened [PR #394](https://github.com/codemagicianhq/arcane/pull/394).
    - The operator merged it at 2026-10-23T08:24:13Z by rebase, as `94fb4ef..b196a30`.
    - CI on `main` passed. Release drift published v1.12.4 at 08:24:32Z, and the Publish run
      (39924423895) published `arcane-cli@1.12.4` with provenance.
    - npm served 1.12.4 as `latest` at 08:27:48Z.
11. **A session card** for the HIGH follow-up, as 1.12.5, to start after #394 merged.
12. **This close.** It adds ARC-057, and the index row ARC-056's own close had left out. It also adds
    this journal, `TODO.md`'s shipped note, Current Priorities, and the handoff. It fixes one stale
    citation in a done `TODO.md` item, which `check:citations` reported: `src/commands/add.ts ("Would copy:
    ${f.file}")`, out of date since `7a8464b` (2026-09-29). It deletes the merged branches
    `sessions/2026-10-22-symlinked-parent-writes` and `sessions/2026-10-22-close-issue-wave-375-376`
    after `git cherry` and a content check.

### Decisions Made

| ADR | Decision | Rationale |
| --- | --- | --- |
| ARC-057 | Managed paths stay inside the target directory by real path. A repository refuses a write or delete through a link that leaves it, with no override. The target directory, not the git repository, is the boundary. The user tier keeps following links. | Neither a repository's contents nor git can tell a deliberate link from a planted one. Only the operator can make a link in a home directory. The target directory needs no git call in the write path. |

Calls recorded without an ADR:

- **The review's HIGH finding gets a pull request of its own** (operator, 2026-10-23). The finding:
  writers outside `copier.ts` follow a link at the file itself. Its tests need file symlinks, which only
  CI's Linux and macOS runners can create.
- **Four follow-ups were registered rather than fixed here** (operator, through `spell-todo`), keeping
  the fix to the reported bug, as `spell-bug` requires.
- **No delegation was used.** Each of the five commits was approved by fingerprint.

### Lessons Learned

#### A delete is a write, and the recursive one matters most

The item named writes. Reading the delete paths too found `spell uninstall`'s `rm -r .arcane/agents`,
and the red run proved it emptied the folder a junctioned `.arcane` pointed at. That is a worse outcome
than any single file written outside. When a finding is about writes, list the deletes as well, starting
with the recursive ones.

#### Check every file a writer writes, not only the directory it creates

`spell agents init` checked `.arcane/agents` and then wrote `.arcane/agents.yaml` one level higher. The
reviewer reproduced the escape: a repository named `agents`, with `.arcane` linked to its parent,
resolves `.arcane/agents` back to itself. A directory check covers only the files whose parent that
directory is.

#### A shared error's advice does not fit every caller

`LinkedDirectoryError` says "replace the link, then run the command again". `spell uninstall` printed it
for each skipped path, then deleted `.arcane.json` and reported success, so the advice could no longer
be followed. When one error is shown by several commands, give each command its own sentence.

#### Prove new tests red with a patch, not a stash

The stash is shared by every session on this machine. The red check here saved `git diff HEAD -- src`
as a patch and backed up `src/`. It checked out the committed `src`, ran the tests, re-applied the
patch, and compared the result with the backup (`diff -r`). It also showed that three tests written
after the fix, which had only been assumed red, were.

#### Load the spell the brief names before following it from memory

The brief said to work this bug through `spell-bug`. I wrote the failing tests and the fix first, and
loaded the spell only afterwards. It added two things I had skipped: follow-ups go through `spell-todo`
rather than into the fix, and a fix to shared infrastructure must be flagged as one. Nothing had to be
undone, but the order was wrong.

#### Answer "what happens to my files" with the files

The operator asked what happens to the Claude and Codex spell files outside the repository. My first
answer described where the code writes. The operator asked again, and the second answer looked at the
operator's own `~/.claude/commands`, `~/.agents/skills` and `~/.arcane/spells`, and ran a before/after
install against a temporary home. That settled it.

#### `gh pr list --state all` shows when a pull request was created

A draft commit message gave #393's creation time as its merge time; `gh pr view --json mergedAt` showed
the merge two minutes later. The message was corrected before the commit was approved. Read `mergedAt`
whenever a merge time is written down.

#### A pull request titled by its most frequent commit type would have called a security fix "docs"

`spell-create-pull-request` Step 3 takes the title's type from the majority commit type. #394 carried
three `docs` commits (the handoff, `TODO.md`, the CHANGELOG), one `chore` and one `fix`, so the rule
gives `docs(...)` for a security release. The title used `fix(security)` instead. This is the second
sighting: the improvement is already queued in `FEEDBACK.md` ("Feedback — Arcane workflow
(2026-10-21)", from the typed-lint session), so nothing new was appended.

### Open Items Carried Forward

- **Registered in `TODO.md`** (under "### Bugs"):
  - HIGH: writers outside `copier.ts` follow a link at the file itself. There is a session card for it
    as 1.12.5.
  - MEDIUM: roster names, ids and `openclaw.workspace_root` in `.arcane/agents.yaml` become paths
    unchecked.
  - LOW: `spell report` and the hub registry scaffold lack the check.
  - LOW: `spell doctor` has no row for such a link.
  - LOW: some refusals still reach the operator as a stack trace.
- **Dependabot alerts 26 and 27** (medium, the development-only `@vitest/mocker`) appeared on `main` at
  2026-10-23T05:38Z and are tracked there:
  https://github.com/codemagicianhq/arcane/security/dependabot. They are unrelated to #394 and were not
  investigated.
- **The operator's:**
  - this close's pull request
  - the remaining `backup/*` snapshot
  - the 5,228 fixture directories in `%TEMP%`
  - removing this worktree once the session is archived
  - optionally, `spell update --user` on this machine, since the store is at 1.10.0

  The first four are in the handoff's Needs you.
