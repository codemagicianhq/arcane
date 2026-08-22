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

**D3 — Command classification by first real subcommand token, three explicit tiers plus a
write-biased fallback.**
```
network: fetch, pull, push, clone, ls-remote, send-email
write:   init, commit, add, checkout, switch, merge, rebase, reset, tag, mv, rm,
         cherry-pick, revert, stash, apply, am, restore, submodule, sparse-checkout,
         maintenance, notes
         + ambiguous-as-write: branch, config, remote, worktree
read:    status, rev-parse, log, diff, show, describe, cat-file, ls-files, ls-tree,
         symbolic-ref, merge-base, blame, shortlog, grep, reflog, diff-tree, rev-list,
         name-rev, count-objects, verify-commit, verify-tag, help, version
(none of the above / genuinely unrecognized subcommand): write
(no subcommand at all, e.g. `--version`): read
```
Ambiguous subcommands (`branch -m` is a write, `branch --list` is a read) are classified toward
the *safer over-estimate* — write's 30s ceiling is harmless for a read that finishes in 200ms,
whereas classifying a write as read would give a rename/config-write an artificially short
budget. The same reasoning sets the fallback for a subcommand in none of the three explicit
tiers: "write", not "read" — an *unknown* operation should get the benefit of the doubt that it
might mutate. (An earlier version of this classifier defaulted unconditionally to "read" for
anything not explicitly matched; adversarial review caught that this silently under-timed any
real subcommand this module hadn't enumerated — e.g. `restore`, a mainstream write command,
originally fell through to "read." The three-tier-plus-fallback shape fixes this while keeping
known reads fast.) Leading global options that take a separate-token value (`-c <name>=<value>`,
`-C <path>`) are explicitly skipped before the classifier looks for the subcommand — otherwise
the *value* token (which doesn't start with `-`) is mistaken for the subcommand itself. No
caller in this codebase invokes a network subcommand yet (confirmed by repo-wide grep) — the
`network` class exists for forward compatibility per EF-20's explicit ask ("upper bounds… for
large add, fetch, and push operations") and WP2 does not need it.

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
  - EF-13: verified at the level this suite can actually prove — `buildGitEnv()` sets
    `GIT_OPTIONAL_LOCKS=0` on every invocation (code-level regression guard: removing that line
    fails the test immediately), and a real commit still succeeds with it in effect (doesn't
    break normal writes). **Not verified by this suite:** external behavioral efficacy against a
    genuinely restricted/unlink-denying filesystem. A chmod-based Windows simulation was tried
    and discarded after direct verification showed chmod-444 on a Windows directory does not
    block file creation inside it — the assertion held identically against the pre-fix code, so
    it proved nothing. EF-13's own proposed fix already scopes a real restricted-filesystem test
    harness as separate, dedicated work; this PR ships the documented git-level mitigation
    (`core.optionalLocks` / `GIT_OPTIONAL_LOCKS`, per git-config(1)) without overclaiming an
    end-to-end proof it doesn't have.
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
