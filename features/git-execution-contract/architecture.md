# Architecture — Non-Interactive Git Execution Contract

## Overview

Replace the two direct `execFileAsync("git", args, { cwd })` call sites inside
`src/modules/git.ts` with a single internal chokepoint, `runGit(cwd, args, options?)`, that every
future Git-writing caller (WP2's `init.ts` changes) will also go through. `inspectGitRepository`
and `countUncommittedChanges` become thin callers of `runGit`; their public signatures are
unchanged (PRD R5).

## Decisions

**D1 — Non-promisified `execFile` + manual Promise, not `spawn`.**
`execFile`'s built-in `timeout`/`killSignal` options give well-tested kill-on-timeout semantics
for free. `spawn` would require hand-rolling that. The one thing `execFile`'s promisified form
doesn't expose is the live `ChildProcess` handle needed to close stdin — so this uses the
*callback* form of `execFile` directly (still wrapped in a `new Promise`), which returns the
`ChildProcess` synchronously, letting us call `child.stdin?.end()` immediately after spawn.

**D2 — Blanket env vars, per-class timeout only.**
`GIT_TERMINAL_PROMPT=0`, `GCM_INTERACTIVE=Never`, `GIT_OPTIONAL_LOCKS=0` apply to every
invocation regardless of command class (see PRD Constraints — `GIT_OPTIONAL_LOCKS` is
documented as a no-op outside `status`/`update-index`). Only the **timeout** varies by class,
because an under-timed network operation is the one place blanket application would cause a
real regression (killing a legitimately slow `fetch`).

**D3 — Command classification by first non-flag argument.**
```
read:    default (status, rev-parse, log, diff, show, describe, cat-file, ls-files, symbolic-ref, merge-base)
write:   init, commit, add, checkout, switch, merge, rebase, reset, tag, mv, rm,
         cherry-pick, revert, stash, apply, am
         + ambiguous-as-write: branch, config, remote, worktree
network: fetch, pull, push, clone, ls-remote
```
Ambiguous subcommands (`branch -m` is a write, `branch --list` is a read) are classified toward
the *safer over-estimate* — write's 30s ceiling is harmless for a read that finishes in 200ms,
whereas classifying a write as read would give a rename/config-write an artificially short
budget. No caller in this codebase invokes a network subcommand yet (confirmed by repo-wide
grep) — the `network` class exists for forward compatibility per EF-20's explicit ask ("upper
bounds… for large add, fetch, and push operations") and WP2 does not need it.

**D4 — Timeout defaults.** `read: 15_000ms`, `write: 30_000ms`, `network: 120_000ms`. Overridable
per call via `options.timeoutMs` for a caller with unusual needs; classification itself is
overridable via `options.commandClass` for the same reason.

**D5 — Stdin closed unconditionally, no opt-out.** Nothing in the current or planned (WP2)
call sites ever needs to write to git's stdin. Closing it is what converts "prompt read blocks
forever" into "prompt read hits EOF immediately, and git fails fast or proceeds
non-interactively" — this is EF-20's primary, general-purpose mitigation.

## Data flow

```
inspectGitRepository(cwd) ──┐
countUncommittedChanges(cwd)─┼──> runGit(cwd, args, opts?) ──> execFile(callback form)
                              │         │                          │
                              │         ├─ classify(args) -> class │
                              │         ├─ buildEnv() -> env vars  ├─ child.stdin.end() [D5]
                              │         └─ TIMEOUTS[class] -> ms   └─ on timeout: error.killed=true
                              │                                         -> throw GitTimeoutError
                              └─ same return shape as before (PRD R5)
```

## Testing strategy

- `test/git.test.ts` — **unmodified**, proves R5 (no behavior change for existing callers).
- `test/git-execution-contract.test.ts` — new:
  - R1/R2: spy-free approach — spawn `git config --show-origin --get user.name` isn't
    sufficient to observe env vars from outside the process, so assert indirectly: (a) a real
    `git commit` succeeds with `GIT_OPTIONAL_LOCKS=0` in effect (R2's regression), and (b) a
    unit-level test on the exported `buildEnv()`/`classifyGitCommand()` helpers, which are
    exported specifically to make the contract testable without spawning.
  - R3: `runGit(dir, ["credential", "fill"])` against a fixture repo, asserted to settle
    (resolve or reject) within a small bound (e.g. 3s) — the previously-open, never-closed
    stdin pipe is exactly what would make this hang under the old implementation.
  - R4: call `runGit(dir, ["status"], { timeoutMs: 1 })` and assert it rejects with
    `GitTimeoutError` — proves the timeout plumbing actually fires.
  - EF-13 regression: on a repo whose `.git/index.lock` path is made unwritable (chmod the
    `.git` directory read-only on the relevant platform), `git status` still succeeds because
    `GIT_OPTIONAL_LOCKS=0` means it never attempts the optional lock in the first place.
- Coverage target: 80% line (module default) — `src/modules/git.ts` is small and central enough
  that all branches (classification table, timeout-vs-success, stdin-close) are realistically
  reachable at ~100%.

## Security

No secrets handled. `GCM_INTERACTIVE=Never` and `GIT_TERMINAL_PROMPT=0` reduce attack surface
(no credential prompt can be spoofed/hijacked in a non-interactive agent context) rather than
introducing any.

## Implementation notes

- Export `GitTimeoutError`, `classifyGitCommand`, and `GitCommandClass` from `src/modules/git.ts`
  — needed by tests and by WP2, which will want to pass `commandClass` overrides explicitly for
  `init`/`config` calls it adds.
- Keep `inspectGitRepository`/`countUncommittedChanges` error-handling behavior identical:
  both currently swallow errors into a status value / `0` — that stays, only the underlying
  transport hardens.
