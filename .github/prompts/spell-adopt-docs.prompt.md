---
name: Spell — Adopt Docs
description: Bring an existing document tree under Arcane governance without moving anything first — inventory, propose a mapping, get approval, then apply in reversible steps. Dry-run by default.
claude_description: Use PROACTIVELY when bringing an existing, ungoverned doc tree under Arcane governance.
argument-hint: Optional path to the tree to adopt (defaults to the repository root). Add `--apply` only after reviewing a dry run.
agent: agent
---

## Executive Summary

- This spell adopts a folder of documents that already exists, rather than
  scaffolding a new one.
- It **never moves, renames, or deletes anything until you approve a specific
  written mapping** — the default run is read-only.
- It works with `subject_root: "."`, so a tree that already lives at the
  repository root is adopted where it is. Restructuring is offered, never
  required.
- Every mutating phase states its rollback before it runs.
- In a repository marked `content_sensitivity: sensitive`, the inventory records
  paths and shapes, never document contents.

---

## Preconditions

Stop and report, without changing anything, if any of these fail:

1. **`.arcane.json` exists.** If not: "Run `spell init` first — adoption needs a
   profile and a subject root to map into."
2. **The working tree is clean** (`git status --porcelain` is empty). Adoption's
   rollback story is "revert the commit"; that only works from a clean baseline.
   Report the dirty paths and stop.
3. **The target path exists and is inside the repository.** Reject absolute
   paths and anything resolving outside the repo root.

Read, in order: `.arcane.json` (for `subject_root`, `content_sensitivity`,
`profile`), then `.arcane/governance/records-conventions.md`, then
`.arcane/governance/naming-conventions.md` if installed.

## Phase 1 — Inventory (always read-only)

Walk the target tree and build a picture of what is actually there. Do not open
a document to summarize its subject matter; classify from path, name, extension,
and size.

Report:

- **Total counts** by extension, and total size.
- **Depth and shape** — how deep the tree goes, which directories hold the bulk.
- **Naming patterns observed** — dated (`2024-03-01-...`), numbered, free-form,
  or mixed. Report what you see; do not judge it yet.
- **Collisions with Arcane's own layout** — anything already at `TODO.md`,
  `DECISIONS.md`, `IDEAS.md`, `README.md`, `journal/`, `.arcane/`, `.github/`,
  `.claude/`. These are the only paths where adoption could overwrite something.
- **Files Git will treat as binary** under the installed `.gitattributes`, and
  any that are large enough to be worth an explicit LFS decision later.
- **Anything unreadable** — permission errors, broken symlinks, zero-byte files.
  Report them; never silently skip.

**If `content_sensitivity` is `"sensitive"`:** the inventory is paths, counts,
extensions and sizes only. Do not quote filenames that are themselves revealing
in the session summary — say "12 files under `clients/`", not the list — and do
not open documents to characterize their contents.

## Phase 2 — Propose a mapping

Produce a written proposal. This is the artifact the operator approves, and it
must be specific enough that they can predict every effect.

For each group of files, state one of:

| Disposition | Meaning |
|---|---|
| **Leave in place** | No move. The default, and the right answer for most trees. |
| **Move** | Old path → new path, explicitly, per file or per directory. |
| **Rename** | Old name → new name, with the rule that produced it. |
| **Ignore** | Added to `.gitignore` rather than governed. |
| **Flag** | Needs an operator decision this spell will not make (see below). |

Always also state:

- **What `subject_root` will be** afterwards, and whether adoption changes it.
  If the tree is already at the repository root, propose `"."` and say plainly
  that this means no restructuring.
- **Which collisions from Phase 1 you propose to resolve, and how.** Never
  propose overwriting an existing `TODO.md`/`DECISIONS.md`/`README.md`; propose
  merging or leaving the operator's file untouched.
- **What will NOT be touched** — an explicit list is part of the proposal, not
  an omission from it.

Flag rather than decide:

- Anything that looks like credentials, keys, or personal data.
- Anything suggesting a retention obligation (contracts, filings, tax records)
  — see `records-conventions.md`; deletion and relocation of those is an
  operator decision.
- Superseded-looking duplicates (`final-v2-FINAL.docx`). Propose the tombstone
  convention from `records-conventions.md`; do not pick a winner.

End with: **"Approve this mapping? (yes / edit / cancel)"** and stop. A dry run
ends here, always.

## Phase 3 — Apply (only after explicit approval, and only with `--apply`)

Apply in the order below. Each step states its rollback *before* it runs, and
each step is a separate commit. Revert them in reverse order — reverting an
earlier phase while a later one still stands will conflict, because the later
phase built on the paths the earlier one created.

1. **Write `subject_root` to `.arcane.json`** (if it changes).
   *Rollback: revert the commit; no files moved yet.*
2. **Add ignore entries** for anything dispositioned "Ignore".
   *Rollback: revert the commit; files are untouched on disk either way.*
3. **Renames**, using `git mv` so history follows the file.
   *Rollback: revert the commit. If a rename collides with an existing path,
   stop the whole phase — do not overwrite, do not continue to step 4.*
4. **Moves**, using `git mv`, deepest paths first so parent directories are
   never removed out from under a pending move.
   *Rollback: revert the commit.*
5. **Tombstones** for anything the operator confirmed as superseded, per
   `records-conventions.md`.
   *Rollback: revert the commit; original content was never deleted.*

Hard rules for this phase:

- **Never delete a document.** Adoption moves, renames, and marks. Deletion is a
  separate, explicit operator decision (`records-conventions.md`).
- **Never overwrite an existing file.** On any collision, stop and report.
- **Stop at the first failure.** Do not attempt partial recovery mid-phase —
  report what completed, what did not, and the exact `git revert` command for
  each commit already made.
- If the repository is `content_sensitivity: sensitive`, commit messages name
  paths and counts only, never contents.

## Phase 4 — Report

Output:

```
Adopted <N> files under {SUBJECT_ROOT}

Moved      <n>   (commit <sha>)
Renamed    <n>   (commit <sha>)
Tombstoned <n>   (commit <sha>)
Left as-is <n>
Ignored    <n>
Flagged    <n>   — needs your decision, listed below
```

Then list every flagged item with the decision it needs. Finish with the
suggested next step: `spell-todo` to capture the flagged decisions, or
`spell-commit-work` if anything remains uncommitted.

## Related

- [[.arcane/governance/records-conventions|Records Conventions]] — supersession and retention
- [[.arcane/governance/git-conventions|Git Conventions]] — branch and merge discipline
- [[.arcane/governance/universal-agent-rules|Universal Agent Rules]] — sensitive-repository behaviour
