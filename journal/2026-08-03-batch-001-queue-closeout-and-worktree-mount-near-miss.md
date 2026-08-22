# 2026-08-03 - Batch 001 Queue Closeout, Worktree Contamination Repair, and a Cross-Mount Near-Miss

## Session: Land the remaining ordered backlog, repair self-inflicted Git corruption, and close out

### Prompt Context

The session opened as a continuation of the drift-fix and self-host-parity work (PR #28), then executed the operator's ordered backlog: commit-work branch guards + EF-16 authorship-first (PR #29), EF-19 provider-neutral close-session (PR #31, after a linear-history repair), then the remaining five items batched together — EF-17, EF-15, the working-protocol standing instruction, EF-23, and EF-01/EF-02 — landed as PRs #32 through #36. EF-14 remains explicitly deferred.

### What Got Done

1. Landed the full ordered queue on `main`, tags `v0.15.2` through `v0.15.7`:
   - `v0.15.2` — registry-driven self-host parity guard (ARC-027 supersedes ARC-006), [PR #28](https://github.com/codemagicianhq/arcane/pull/28).
   - `v0.15.3` — commit-work branch guard + EF-16 authorship-before-grouping, [PR #29](https://github.com/codemagicianhq/arcane/pull/29).
   - `v0.15.4` — EF-19 provider-neutral close-session, [PR #31](https://github.com/codemagicianhq/arcane/pull/31) (`sessions/2026-08-02-provider-neutral-close-v2`, real fix at `d60d1f3`).
   - unversioned — EF-17 cross-platform line-ending regression coverage, [PR #32](https://github.com/codemagicianhq/arcane/pull/32).
   - `v0.15.5` — EF-15 vendor attribution (ARC-021 accepted), [PR #33](https://github.com/codemagicianhq/arcane/pull/33) (`sessions/2026-08-02-vendor-attribution`).
   - unversioned — repository Working Protocol standing instruction + EF-06-adjacent finding + verification-ledger idea, [PR #34](https://github.com/codemagicianhq/arcane/pull/34) (`sessions/2026-08-02-working-protocol`).
   - `v0.15.6` — EF-23 resolvable legacy ADR citations, [PR #35](https://github.com/codemagicianhq/arcane/pull/35) (`sessions/2026-08-02-resolvable-adrs-v2`).
   - `v0.15.7` — EF-01/EF-02 single governance layer + orientation stubs (ARC-019 accepted), [PR #36](https://github.com/codemagicianhq/arcane/pull/36) (`sessions/2026-08-02-single-governance-layer`).
2. Diagnosed and repaired a recurring Git-worktree contamination bug: because every linked worktree of this repository shares one physical `.git/config`, a bare `git commit --amend` let a vitest test fixture's own `git init`/`git commit` inherit `GIT_DIR` and write into the shared config, flipping `core.bare` to `true`, overwriting the Git identity, and leaving stray `test: seed ...` fixture commits on real branches. Repaired by restoring config, discarding the fixture commits, and switching to a validated `--no-verify` amend pattern for fixups where the identical checks had already been run manually.
3. Corrected a factual error in this session's own analysis: attributed a working-tree diff on `package.json`/`package-lock.json` to `core.autocrlf`/CRLF noise. The operator corrected this — this repository's `.gitattributes` (`* text=auto eol=lf`) makes `core.autocrlf` inert for every path here, and the real difference was a missing trailing newline. Corrected in repo memory and in this record so the wrong explanation does not recur.
4. From the operator's review of this machine's Git config, filed and recorded three real findings: `init.defaultBranch=master` as the confirmed root cause of EF-05 (updated), `core.symlinks=false` as a demonstrated (not merely judged) constraint added to ARC-027's preserved reasoning, and [EF-32](../docs/intake/batch-001/EF-32.md) — `pull.rebase=false` contradicting this repository's own rebase-and-fast-forward mandate, an EF-24-class enforcement gap.
5. Caught and repaired a genuine near-miss: the operator, reading this repository through a Linux-side mount of the Windows host, saw all eight linked worktrees reported `prunable` and instructed running `git worktree prune`. Independent verification from the worktrees' actual owning environment (`git worktree list --porcelain`, `Test-Path`, and a real `git worktree prune -v` that removed nothing) showed all nine worktrees healthy. The operator's own read was truthful for its vantage point but wrong about the worktrees' real state; had the same prune command run from the bridge-mounted view, it would have deregistered eight live worktrees. Filed as [EF-33](../docs/intake/batch-001/EF-33.md) and added as a confirmed instance to the verification-ledger idea in [IDEAS.md](../IDEAS.md).

### Decisions Made

- **ARC-019 (Repository Document Ownership and Path Model): Accepted.** One installed framework layer at `.arcane/governance/`; canonical spell targets repointed and mechanically checked.
- **ARC-021 (Vendored Framework Content Attribution): Accepted.** Vendor-only repository actions use the human Git identity with a required `Vendor: arcane-cli` trailer; `Vendor-Version` only when programmatically derivable, never guessed.

### Lessons Learned

#### A truthful read can still be globally false

The operator's "seven prunable" report and this session's own worktree-state report were both individually correct for their vantage points and mutually contradictory. Neither side was lying or careless; the tool's output simply does not distinguish "confirmed absent" from "not visible from this filesystem view." Any irreversible operation on shared state needs a same-vantage-point existence check, not trust in a single read.

#### Shared `.git/config` across worktrees is a standing hazard

> **Retired 2026-08-21:** the root cause (leaked `GIT_DIR` reaching fixture `git`
> subprocesses spawned with only `cwd` set) is fixed — see
> [EF-34](../docs/intake/batch-001/EF-34.md) (now `shipped`). Fixture git calls
> are hermetic (`test/helpers/git-fixture.ts`), the full suite moved from
> pre-commit to pre-push (which also scrubs `GIT_*` as defense-in-depth), and a
> negative regression test proves a leaked `GIT_DIR` no longer reaches a decoy
> repository. The `--no-verify` workaround below is no longer required —
> ordinary `git commit` is safe again. Left unedited as the historical record
> of why the workaround existed.

This is the second and third time this exact contamination class fired in one session. The only fully safe pattern found: validate manually first (build, parity, lint, typecheck, full test), then commit with `--no-verify`, never re-running husky hooks on top of an already-validated state inside a shared-config worktree fleet.

#### Corrections are worth more than conclusions

The operator corrected this session's own CRLF/`core.autocrlf` misattribution with a precise mechanical explanation (`.gitattributes` `eol` attribute overrides `autocrlf`, clean-filter normalization at staging). That single correction was more valuable than the original (wrong) finding, and is now the second confirmed instance recorded against the verification-ledger idea alongside the worktree-mount near-miss.

### Open Items Carried Forward

- EF-14 remains explicitly deferred (canonical `BUSINESS_ROOT`/tracking storage).
- EF-05, EF-08, EF-20, EF-21, EF-32, and EF-33 remain open in [TODO.md](../TODO.md), each with a confirmed root cause or reproduction path recorded.
- `spell-sync-pull-request` (open PR branch synchronization) remains an open MEDIUM feature.
