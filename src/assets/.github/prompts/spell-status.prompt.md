---
name: Spell — Status
description: Show a fast, read-only snapshot of the current session — branch, git working state, open TODO count, decision count, and last journal date. Text or JSON.
argument-hint: Optional flags — e.g., --verbose --format json
agent: agent
---

## Executive Summary

- This spell prints a quick state snapshot for the current repo. It never modifies files.
- It reads local git state plus arcane session files (`TODO.md`, `DECISIONS.md`, `journal/`).
- Use it any time mid-session to re-orient without running the full `spell-open-session` pass.

---

Show the current session status for this repository. This is a read-only spell.

## Inputs

- Optional `--verbose` — include changed-file paths and the first few open TODOs.
- Optional `--format text|json` — default is `text`.

If no flags are given, use default text mode.

## Steps

0. Confirm this is a git repository (e.g., `git rev-parse --is-inside-work-tree`). If it is not, skip the git steps and set `branch`, `unpushedCommits`, `staged`, `unstaged`, and `untracked` to `unknown` (text) / `null` (JSON); still report the file-based counts in steps 4–6 if those files exist. Note `not a git repository` in the output.
1. Run `git branch --show-current` and capture the branch name. If it returns empty, you are in **detached HEAD** — report the branch as `detached@{short-sha}` (use `git rev-parse --short HEAD`).
2. Run `git rev-list --count @{upstream}..HEAD` for unpushed commit count. If there is no upstream (no tracking branch, or detached HEAD), set this to `unknown` (text) / `null` (JSON). Do not treat the absence of an upstream as `0`.
3. Run `git status --short` and compute counts: staged, unstaged, untracked. A clean tree is `0`/`0`/`0`.
4. Count open TODOs in `TODO.md` (unchecked `- [ ]` items). If the file is missing, count `0`.
5. Count decision entries in `DECISIONS.md` — count one per decision-record heading (the `ADR-NNN` / `ARC-NNN` entry headings, e.g. `## ARC-012 ...`). Do not count cross-reference table rows or inline mentions, and de-duplicate repeated IDs. If the file is missing, count `0`.
6. Determine the last session date from the most recent file in `journal/` (filenames follow `YYYY-MM-DD-topic-slug.md`; sort by the leading date, not file mtime). If `journal/` is missing or contains no dated entries, report `none` (text) / `null` (JSON).

## Output

### Text mode (default)

One concise line:

```
[{branch}] ↑{unpushed} | {staged}● {unstaged}✎ {untracked}? | {openTodos} TODOs | {decisions} ADRs | last session: {date}
```

Glyph key: `↑` unpushed commits, `●` staged, `✎` unstaged, `?` untracked. Render `unknown` / `none` literally in the slot when a value cannot be determined (e.g. `↑unknown`, `last session: none`). When not a git repo, prefix the line with `not a git repository — ` and show `unknown` for all git-derived slots.

If `--verbose`, also print:

- a short bullet list of changed file paths from `git status --short`
- the first 5 open TODO lines

### JSON mode (`--format json`)

```json
{
  "branch": "main",
  "isGitRepo": true,
  "detachedHead": false,
  "unpushedCommits": 0,
  "staged": 0,
  "unstaged": 0,
  "untracked": 0,
  "openTodos": 0,
  "decisions": 0,
  "lastSessionDate": "YYYY-MM-DD",
  "modifiedFiles": []
}
```

Field conventions (keep JSON consistent with the text shape):

- `branch` — string; `detached@{short-sha}` when in detached HEAD; `null` when not a git repo.
- `isGitRepo` — boolean. When `false`, all git-derived fields (`unpushedCommits`, `staged`, `unstaged`, `untracked`, `branch`) are `null`.
- `detachedHead` — boolean.
- `unpushedCommits` — integer, or `null` when there is no upstream / detached HEAD (the JSON analogue of text `unknown`). Never silently `0`.
- `lastSessionDate` — `YYYY-MM-DD` string, or `null` when no dated journal entry exists (the analogue of text `none`).
- `modifiedFiles` — populated only when `--verbose` is set; otherwise `[]`.

## Rules

- Read-only — never edit, create, stage, or commit any file. Use only inspection commands (`git status`, `git rev-list`, `git branch`, file reads).
- Prefer exact values from local git and files; do not estimate.
- Never fail the whole snapshot because one source is unavailable. A missing count file is `0`; an undeterminable git value is `unknown` (text) / `null` (JSON); a non-git directory still reports file-based counts.
- Counts vs. unknowns are distinct: a real `0` (clean tree, empty TODO) is not the same as `unknown`/`null` (could not determine). Do not collapse one into the other.
- Keep text output to a single line unless `--verbose` is set.
