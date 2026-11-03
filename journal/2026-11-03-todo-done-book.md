# 2026-11-03 — Done book for `spell-todo --prune`

Related: [[records-conventions]], [[git-conventions]], [[agent-policies]].

## Session: todo done book (#415, PR #416)

### Prompt Context

The operator asked this cloud session to work on [issue #415](https://github.com/codemagicianhq/arcane/issues/415): make `spell-todo --prune` move checked items to a `DONE.md` done book by default rather than delete them. The issue asked for the move to keep each item word for word, with continuation lines, under the same heading; a manifest field to set the path or opt out (`todo_done_book: false`); an append-only done book; `records-conventions.md` to name the done book; and a minor release with a changelog line. Later turns: the operator chose to rename the generated branch, approved each commit by fingerprint, merged the pull request, confirmed npm served 1.16.0, and asked to close the session.

### What Got Done

1. Renamed the cloud-generated branch to `sessions/2026-11-03-todo-done-book` before the first write, at the operator's choice (the session's own instructions named the generated branch; `CLAUDE.md` requires the rename).
2. `spell-todo` Prune Mode (`src/assets/.arcane/spells/spell-todo.md`): resolves the done book from `todo_done_book`; Step 5 is "Migrate, move, then delete", copying each approved item word for word under its full heading path, confirming the copy, then removing it from the TODO book; the done book is append-only, frontmatter included; the report reads "Move N items to DONE.md"; the fingerprint covers the done-book path and its content; a sub-item moves only with its parent; no write through a symbolic link.
3. Manifest field `todo_done_book?: string | false` (`src/types.ts`) validated by `isValidTodoDoneBook` in `src/modules/manifest.ts`, which rejects escapes, dot-directories, `:`, whitespace, a bare `.md`, `TODO.md` at any depth, and `IDEAS.md`, `DECISIONS.md` and `CHANGELOG.md`. Tests: `test/todo-done-book-manifest.test.ts` (new) and `test/up03-b-todo-prune.test.ts` (extended).
4. `records-conventions.md` gained a "Completed TODO items" section.
5. Released 1.16.0 with a `CHANGELOG.md` entry. [PR #416](https://github.com/codemagicianhq/arcane/pull/416) was rebase-merged by the operator (on `main` as `767cda9`, `4289b48`, `839965e`). Checked on 2026-11-03: issue #415 closed as completed and linked to PR #416; the merged diff carries the change in `src/assets/.arcane/spells/spell-todo.md` and `src/modules/manifest.ts`; release `v1.16.0` exists; Publish run 41604912923 succeeded; npm `latest` is 1.16.0; CI and Release drift on `839965e` succeeded.
6. Marked the 2026-11-02 handoff consumed, in its own commit.

### Lessons Learned

#### "Already pushed" was read from a stale local ref

Both `git branch -a` and the session's own instructions showed `remotes/origin/claude/confident-gauss-ns7fwo`, so the rename question to the operator said the branch was pushed and that renaming would delete the remote branch. The delete then failed with "remote ref does not exist": the branch had never been on GitHub. A remote-tracking ref is a local record and can be stale. The branch rename gate's "if `<old>` was already pushed" should be decided by asking the remote (`git ls-remote --heads origin <old>`), not by reading the local ref.

#### An independent review again found real gaps after the author's tests passed

The first commit passed the full suite, but a reviewer agent that read only the diff and the issue found eight problems: a checked sub-item could reach the done book twice; heading placement ignored parent headings; the done book's frontmatter could be edited; a done-book change did not void the approval; and the path validator accepted `ventures/acme/TODO.md`, which in a hub would write into a venture's live book. Phrase-presence tests on a spell cannot catch an ambiguous instruction. All eight were fixed in `839965e` before the merge.

#### A plain `npm view` can report the previous version

After the Publish run succeeded, the operator's `npm view arcane-cli version` still printed 1.15.1, while `npm view arcane-cli version --prefer-online` printed 1.16.0. `spell-open-session`'s version check runs the plain form, so a cached answer can hide an update that has already shipped.

### Open Items Carried Forward

- The website's bot sync pull request for 1.16.0 (and the one for 1.15.0, still pending from 2026-11-02) is not observed: the website repository is outside this session's access. Check its open pull requests on the arcane-sync bot branch after the next 6-hourly run, and merge to deploy.
- Lessons 1 and 3 above are queued for upstream in `FEEDBACK.md` ("Feedback — Arcane workflow (2026-11-03)").
- The open `TODO.md` item on cloud sessions' generated branch names ("A cloud session's pull request arrives on a random `claude/<adjective>-<noun>-<hash>` branch") gains one data point: this cloud session ran `spell-open-session`, and the rename gate renamed the branch before the first write.
