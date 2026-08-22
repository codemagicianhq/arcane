# Architecture — Init-Time Git State Contract

## Overview

Two new exported functions in `src/modules/git.ts` (`correctUnbornMasterDefault`,
`ensureLocalPullRebase`), both built on WP1's `runGit`. `src/commands/init.ts`'s existing
dirty-check block is replaced with a richer, `inspectGitRepository`-driven block that calls both.
`src/commands/doctor.ts` gains one new independent check, `checkPullRebase`, for drift detection
outside the init flow. `spell-close-session.prompt.md` gains a fourth remote-capability
classification state for "not a repository at all."

## Decisions

**D1 — `git symbolic-ref`, not `git init -b`/`git branch -m`, for the unborn-branch correction.**
`symbolic-ref` reads/writes `.git/HEAD`'s target ref directly; it works identically whether or
not any commit exists, and rewriting it before the first commit is git's own documented,
side-effect-free mechanism (equivalent to what `git init -b main` does internally). `git branch
-m` requires an existing branch ref to rename *from*, which doesn't exist yet on a genuinely
unborn repo.

**D2 — Correction is conditional on the CURRENT value being exactly `master`, AND on the repo
genuinely being unborn, checked internally rather than trusted from the caller.** EF-05's
reported defect is a specific default-leak (`master`), not "Arcane requires `main`." Silently
renaming any other operator-chosen branch name would exceed what was reported. Separately:
`symbolic-ref --short HEAD` resolves identically whether a repo is born or unborn, so
`correctUnbornMasterDefault` additionally verifies `rev-parse --verify HEAD` fails (the same
signal `inspectGitRepository` uses for its own `no-commits` state) before writing — a BORN repo
already on `master` must never be touched, since `symbolic-ref HEAD refs/heads/main` on a born
repo would detach HEAD from `master`'s commit history without moving any commits, leaving `main`
an empty ref while every real commit stays reachable only via the now-abandoned `master`. This
makes the function safe to call directly (as the test suite does) rather than correct only by
accident of `init.ts`'s current call site being gated on `no-commits`.

**D3 — `pull.rebase`: distinguish "unset locally" from "explicitly false locally" via `git config
--local --get`, never the effective/inherited value.** `--local` only returns a value if one is
set in *this repository's* `.git/config`; it errors if the value is only inherited from
global/system config (e.g. Git for Windows' `pull.rebase=false` system default). This is the
precise distinction EF-32's own required-tests section asks for: unset (safe to set) vs.
explicitly local-false (never silently override — warn instead, per EF-32's proposed fix).

**D4 — `checkPullRebase` (doctor) checks the *effective* value (`git config --get`, no
`--local`), not the local-only value.** Its job is different from init's: catch drift regardless
of *where* a non-`true` effective value comes from (missed by an install predating this fix,
manually unset later, etc.), not just whether init ran. Non-blocking (`blocking: false`) per
EF-32's explicit "warn, don't fail" requirement — this mirrors the shape of EF-31's already-shipped
version-bump gate, which is a hard CI failure; `pull.rebase` has no such enforcement point (no CI
job runs inside the operator's own working copy), so a `doctor` warning is the only honest
enforcement mode available, consistent with ARC-023's inline-enforcement-contract requirement
(state the mechanism, don't just assert the rule).

**D5 — `not-repository`: no action, only guidance — surfaced identically in two places.**
`init.ts`'s next-steps section and `spell-close-session.prompt.md`'s remote-capability check both
print the same corrective command (`git init -b main`) rather than one silently creating a
repository the other assumes exists. Chosen over auto-`git init` per the PRD's explicit design
decision (EF-05's own open question, resolved toward least invasive).

## Data flow

```
runInit()
  └─ inspectGitRepository(targetDir)
       ├─ not-repository  → record notice; skip all further git-state actions
       ├─ no-commits      → correctUnbornMasterDefault(targetDir)   [D1, D2]
       │                  → ensureLocalPullRebase(targetDir)         [D3]
       └─ ready           → existing uncommitted-changes confirm flow (unchanged UX)
                           → ensureLocalPullRebase(targetDir)         [D3]
  └─ (next steps) if notice === "not-repository": print `git init -b main` guidance first

runDoctor()
  └─ checkPullRebase(targetDir)   [D4, independent of init]

spell-close-session.prompt.md
  └─ remote-capability check gains a "not a repository" state, checked first, fails closed
     with the same `git init -b main` guidance   [D5]
```

## Testing strategy

- `test/init.test.ts`: existing git mock factory extended (not replaced) with
  `inspectGitRepository` mocked to `{status: "not-repository"}` by default — matches these tests'
  real environment (plain `fs.mkdtemp` dirs, never `git init`'d), so every existing assertion
  keeps passing unmodified in behavior.
- New `test/init-git-state.test.ts`: real git fixtures via `test/helpers/git-fixture.ts` (hermetic
  — no system `init.defaultBranch` override reaches the fixture, so a bare `git init` there lands
  on git's own raw default, which reproduces `master` exactly like the reported Windows
  environment) covering R2, R3, R5, R6 directly against the new `git.ts` functions, plus one
  end-to-end `runInit` test per scenario (inquirer mocked, git real) proving the block wires up
  correctly.
- `checkPullRebase` tested directly against real fixtures in the same new file (doctor.ts's
  existing coverage exclusion is for its harder-to-test checks — Node version, VS Code extension
  scanning — not a reason to skip testing a new, directly-testable function).
- Coverage target: 80% line (repo default) on `src/modules/git.ts` and the new `init.ts`/`doctor.ts`
  branches; no stricter per-file override applies to any touched file.

## Security

`git config --local` only ever writes within the target repository's own `.git/config` — no
global/system config is ever touched. No secrets handled.

## Implementation notes

- `ensureLocalPullRebase`/`correctUnbornMasterDefault` live in `src/modules/git.ts` (not
  `init.ts`) since `doctor.ts` also needs git-state primitives — avoids duplicating
  config-reading logic between the two commands.
- Both new functions return a discriminated result object (not booleans) so callers can print
  precise, state-specific messages without re-deriving what happened.
