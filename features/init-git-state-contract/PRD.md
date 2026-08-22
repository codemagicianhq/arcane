---
status: accepted
tracking_mode: internal
source_intake: batch-001 (EF-05, EF-32)
---

# PRD — Init-Time Git State Contract

## Problem

Two intake findings converge on the same code location, `src/commands/init.ts`'s Git-state
block (currently just an uncommitted-changes warning via `countUncommittedChanges`):

- **EF-05** (medium): `spell init` never runs `git init` or creates a baseline commit, but
  `spell-close-session` assumes both a repository and a `main` branch exist. Root cause
  confirmed: Git for Windows sets `init.defaultBranch=master` at the system config level, so an
  operator's own `git init` + first commit silently lands on `master`, not `main`, reproducing
  the trap under any fix that just "creates a baseline commit" without addressing branch naming.
- **EF-32** (medium, classification EF-24): `git-conventions.md` mandates rebase-and-fast-forward,
  but Git for Windows defaults `pull.rebase=false` at the system level, so a bare `git pull`
  silently produces merge commits, contradicting the repo's own governance. Confirmed identically
  on this machine (`git config --show-origin --get pull.rebase` resolves to `false` from
  `C:/Program Files/Git/etc/gitconfig`).

Re-verified against current HEAD (post-WP1): `runInit` in `src/commands/init.ts` is unchanged
from what both intake reports describe — still only calls `countUncommittedChanges`, which
swallows every error (including "not a repository") into `0`, so init cannot distinguish a clean
repo from no repo at all. No `git config` call exists anywhere in `src/`.

## Design decision (EF-05's own open question)

EF-05 explicitly leaves open: *"Should automatic Git initialization and scaffold commit be
opt-in, limited to empty directories, or a separate explicit command?"* — and its proposed fix
separately instructs *"Do not silently commit when `spell init` is used to add Arcane to an
existing repository."*

Resolved here as the least invasive option that still fixes the reported root cause:

1. **Never run `git init` or create a commit.** Auto-committing on the operator's behalf is the
   invasive path EF-05's own caveat warns against, and the open question flags it as unresolved
   — declining it, not deferring it.
2. **When a repository already exists but is unborn** (`git init` was run, no commit yet — the
   exact state the reported failure occurs in): safely repoint HEAD from `master` to `main` via
   `git symbolic-ref` (no commit objects exist yet, so nothing is at risk) — but **only** when
   the current unborn branch is exactly `master`, the reported system-default leak. Any other
   branch name (including a deliberately chosen one) is left untouched; this corrects the
   specific reported defect, not a broader "Arcane requires `main`" policy.
3. **When no repository exists at all:** don't act — surface the exact correct next step
   (`git init -b main`) in the printed guidance, so the operator doesn't fall into the same trap
   themselves. `spell-close-session` also gains an explicit "not a repository" classification so
   it fails closed with the same guidance rather than a confusing raw Git error mid-flow.

## Requirements

| # | Requirement | Acceptance Criteria |
|---|---|---|
| R1 | Init distinguishes not-a-repository / unborn / ready states | Uses `inspectGitRepository` (already exists, already used by `update.ts`) instead of `countUncommittedChanges` |
| R2 | Unborn repo on `master` is repointed to `main` | Real-git fixture: `git init` (hermetic, no system config) lands on `master`; after the init step runs, `git symbolic-ref --short HEAD` reports `main` |
| R3 | An unborn repo NOT on `master` is left untouched | Fixture with `git symbolic-ref HEAD refs/heads/develop` before init runs; branch name unchanged after |
| R4 | `not-repository` state produces no git mutation, only guidance | Next-steps output includes the exact `git init -b main` command; no `.git` directory is created |
| R5 | `pull.rebase` unset locally gets set to `true` | Fixture: repo with no local `pull.rebase`; after init, `git config --local --get pull.rebase` returns `true` |
| R6 | An explicit local `pull.rebase=false` is preserved, only warned about | Fixture: repo with `git config --local pull.rebase false` before init; value unchanged after, warning printed |
| R7 | `spell doctor` independently verifies the *effective* `pull.rebase` and warns (non-blocking) if not `true` | New `checkPullRebase` check registered in `runDoctor` |
| R8 | Existing `init.test.ts` behavior unchanged | All existing tests pass with an extended (not replaced) git mock |

## Constraints

- No new runtime dependencies.
- `git config`/`symbolic-ref` calls route through WP1's `runGit` (env/timeout/stdin contract) —
  no direct `execFile` calls added anywhere in this change.
- Dry-run must never mutate anything (existing contract, preserved).
- Doctor's `checkPullRebase` degrades gracefully outside a Git repository (non-blocking warning,
  not a crash) — `spell doctor` already runs in arbitrary directories.

## Dependencies

Builds on WP1 (`runGit`, `inspectGitRepository`, `GitCommandClass`) — both merged to `main`.

## Open Questions

None blocking. EF-05's own open question is resolved above, not deferred further.
