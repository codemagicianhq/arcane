---
status: accepted
tracking_mode: internal
source_intake: batch-001 (EF-13, EF-20)
---

# PRD — Non-Interactive Git Execution Contract

## Problem

`src/modules/git.ts` spawns `git` via bare `execFile(cwd)` with no environment, timeout, or stdio
policy. Two intake findings describe the same underlying gap from different angles:

- **EF-20** (high): Git for Windows can issue interactive retry/credential prompts during an
  autonomous operation. With stdin left open as an unclosed pipe (Node's default for
  `execFile`) and no timeout, a prompt-issuing `git` subprocess blocks forever with no
  completion signal.
- **EF-13** (high): read-only Git commands can take an "optional lock" (used to refresh the
  index during `git status`) that fails to release on a filesystem that rejects unlink,
  stranding state for the next operation. No `--no-optional-locks` / `GIT_OPTIONAL_LOCKS=0`
  policy exists anywhere in the codebase.

Both intake reports found the current `src/modules/git.ts` (2 functions, `execFileAsync` with
only `{ cwd }`) unchanged from what a fresh read of HEAD confirms today — the diagnosis is
current, not stale.

## Non-goals (explicitly deferred)

- Reproducing the exact Windows GUI retry dialog end-to-end — intake itself states this
  "could not be reproduced safely" outside the reporting environment. This PRD instead tests
  each mitigation mechanism independently against real git subprocess behavior, per EF-20's
  own proposed-fix wording ("test closed stdin, credential-prompt suppression, and
  command-class-specific timeouts independently").
- Sync-root / cloud-drive detection — EF-13 explicitly scopes this out ("Research sync-root
  detection separately and warn rather than assign causality without evidence").
- Any change to `src/commands/doctor.ts`'s `execFileAsync` — verified during re-diagnosis that
  it spawns `code --version`, not `git`; out of scope for a Git execution contract.
- Any change to `inspectGitRepository`/`countUncommittedChanges`'s public signature or
  return semantics — this PRD hardens the execution layer underneath them only. Call-site
  behavior changes (e.g. surfacing `not-repository` in `init.ts`) are EF-05/EF-32 (WP2).

## Requirements

| # | Requirement | Acceptance Criteria |
|---|---|---|
| R1 | All `git` subprocess invocations in `src/modules/git.ts` run with `GIT_TERMINAL_PROMPT=0` and `GCM_INTERACTIVE=Never` | Env object passed to `execFile` contains both, verified by a spy/inspection test |
| R2 | All invocations run with `GIT_OPTIONAL_LOCKS=0` | Same as R1; plus a real-repo regression proving a write op (`commit`) still succeeds and is durably recorded with the var set |
| R3 | stdin is closed immediately on every invocation, never left as an open, unread pipe | A real git subcommand that would otherwise block reading stdin (`git credential fill`) resolves/rejects well within a short bound instead of hanging |
| R4 | Every invocation has a command-class-scoped timeout (`read` / `write` / `network`), overridable per call | Unit test forces a sub-timeout duration and asserts a typed `GitTimeoutError` is thrown before the process would otherwise complete |
| R5 | Existing callers (`inspectGitRepository`, `countUncommittedChanges`) keep identical signatures and return values | `test/git.test.ts` passes unmodified |

## Constraints

- No new runtime dependencies (Node's `child_process` + existing `test/helpers/git-fixture.ts`
  pattern only).
- Must not weaken any existing lock/index correctness: `GIT_OPTIONAL_LOCKS=0` is git's own
  documented mechanism (`core.optionalLocks`) and only affects `git status`'s speculative index
  refresh, per git-config(1) — it does not touch the mandatory locks `commit`/`checkout` rely on
  for correctness. This PRD applies it as a single blanket env var (not per-command-class)
  specifically because it is documented as a no-op outside the status/update-index path.

## Dependencies

None — this is the foundation WP; WP2 (EF-05/EF-32) builds on `runGit`'s signature.

## Open Questions

None blocking — EF-13's filesystem/Git-for-Windows-version questions are about the *reporting*
environment and don't gate a framework-wide contract per the intake's own proposed fix.
