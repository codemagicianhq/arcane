# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.16.5] - 2026-08-22

### Fixed

- Ships ARC-028's R7 rail as standing operational governance ([EF-33](docs/intake/batch-001/EF-33.md)): a new "Same-Vantage-Point Check" section in `git-conventions.md` requires independently confirming a worktree/branch path from the *current process's own filesystem* before any irreversible worktree/branch operation, since `git worktree list` can truthfully report a live, healthy worktree as `prunable` when read through a bridged/remote mount. Railed into `spell-commit-work`, `spell-close-session`, and `spell-ship`'s branch-deletion steps, plus `spell-open-session`'s worktree-list/stale-branch reads. `agent-policies.md`'s Multi-Agent Concurrency Rules gains the working-tree dimension (ARC-028 item 11a). Not CI-testable per the intake's own scope (cross-mount filesystem visibility can't be reproduced on one runner); shipped with string-assertion coverage on the governance text itself. ARC-028 remains Proposed — only two of its follow-up items are complete.

## [0.16.4] - 2026-08-22

### Fixed

- `spell-close-session` gained a structured pending-verification mechanism ([EF-21](docs/intake/batch-001/EF-21.md)): a new step requires actively checking the status of every async operation dispatched during the session (CI runs, deployments, publishes) before the journal, TODO.md, or handoff are written, classifying each into `dispatched` / `pending` / `succeeded` / `failed` / `unverifiable` — only `succeeded` work may be described as complete anywhere. The handoff template gained a `Pending Verification` field; `spell-open-session` now actively re-checks any non-`succeeded` item from the prior handoff instead of relaying it as still-current fact.

## [0.16.3] - 2026-08-22

### Fixed

- `spell init` now distinguishes not-a-repository / unborn / ready Git states instead of a blind uncommitted-changes count ([EF-05](docs/intake/batch-001/EF-05.md)): an unborn repo on `master` (the reported Git for Windows `init.defaultBranch` default-leak) is safely repointed to `main` via `symbolic-ref` before any commit exists; any other deliberately-chosen branch name is left untouched; a directory with no repository at all gets an explicit `git init -b main` next-step instead of a silent gap. `spell-close-session` gained a matching "not a repository" classification, checked first and failing closed with the same guidance.
- `spell init` and `spell doctor` now address `pull.rebase` governance drift ([EF-32](docs/intake/batch-001/EF-32.md)): init sets the repository-local value to `true` when nothing is set locally (never overriding an explicit local `false`, which is surfaced as a warning instead), and doctor's new `checkPullRebase` independently warns (non-blocking) whenever the effective value isn't `true`.

## [0.16.2] - 2026-08-22

### Fixed

- `src/modules/git.ts` now routes every production Git invocation through a single non-interactive execution contract ([EF-20](docs/intake/batch-001/EF-20.md), [EF-13](docs/intake/batch-001/EF-13.md)): closed stdin so an interactive prompt can't block indefinitely, `GIT_TERMINAL_PROMPT=0`/`GCM_INTERACTIVE=Never` to suppress credential prompts, `GIT_OPTIONAL_LOCKS=0` to avoid stranding an optional lock on filesystems that reject unlink, and a command-class-scoped timeout that throws a typed `GitTimeoutError` instead of hanging. `inspectGitRepository`/`countUncommittedChanges` are unchanged externally.

## [0.16.1] - 2026-08-22

### Fixed

- Widened the org-token build gate from a portability check (package-derived tokens in `src/assets/.github/prompts` only, unchanged) into two layers: portability, and a repository-wide privacy layer scanning docs, tests, and decision records against a denylist supplied via the `ARCANE_ORG_TOKENS` CI secret (unset = inert, so forks and local builds are unaffected). Established the Ordovica/Tidewright/Overshore fictional venture family as the canonical placeholder set for all examples (ARC-031).
- Replaced a hardcoded `codemagicianhq/arcane` literal in `spell-feedback`'s upstream-routing step with `{ARCANE_UPSTREAM_REPO}`, resolved from the installed package's own repository field, so forks/renames route correctly and the org-token lint no longer flags the spell itself.

## [0.16.0] - 2026-08-21

### Added

- **`role`/`business_root`** on `ArcaneManifest` (explicit opt-in only, never inferred): `spell init` asks whether a repo is a venture hub on interactive installs; `spell update` gains a general manifest-retrofit mechanism that asks about any field the installed version predates, once. Answering "hub" offers to scaffold `ventures/registry.json` from existing venture folders.
- **`spell-manifest`** — a new hub-gated spell that batch-triages `status: new` entries out of hub-side `IDEAS.md`/`TODO.md` books to a consumer repo, a PRD scaffold, a tracker item, a demoted todo, another venture's book, or public disclosure (gated per-entry on the literal word "disclose", keyed off destination visibility rather than destination type). Spell count 33 → 34.
- Venture-targeting phrasing for `spell-save-idea`/`spell-todo` (hub-only; refused in consumer repos), and hub-role/registry-consistency detectors in `spell-check-drift`.
- `spell-feedback` upstream-routing: framework-shaped feedback is genericized and offered as a GitHub issue against Arcane itself, gated by the same disclosure discipline.
- Full decision record: [ARC-030](DECISIONS.md#arc-030--venture-idea-lifecycle-hub-role-registry-and-spell-manifest-promotion).

### Changed

- **BREAKING:** `spell-bootstrap-business` is renamed to `spell-summon-venture` with no compatibility alias (ARC-008 clean-break precedent) — its behavior changed substantively (hub gate, per-venture books, registry entry), so an alias would have promised behavior that no longer exists. Use `spell-summon-venture`.

### Fixed

- Pre-commit hook test runs no longer inherit `GIT_DIR` and corrupt the real repository ([EF-34](docs/intake/batch-001/EF-34.md)): test git fixtures are now hermetic, `pre-commit` is fast-checks-only (lint + typecheck), and the full suite moved to `pre-push` with its own environment scrub.

## [0.15.9] - 2026-08-21

### Fixed

- `spell agents init`/`sync` no longer silently drops the `mobile-dev` role: an unquoted colon-space in a `behavioral_rules` item made the bundled template parse as a YAML mapping and fail validation, skipping the agent from every client output with a zero exit code. Every shipped agent template is now covered by a validation regression test.

## [0.15.8] - 2026-08-03

### Changed

- Refine `spell-commit-work`'s execution-authority resolution table and related guidance.

## [0.15.7] - 2026-08-02

### Added

- Install-once `README.md` and `project.md` orientation stubs for new repositories.

### Fixed

- Resolve spell governance links through the single installed `.arcane/governance/` layer.

## [0.15.6] - 2026-08-02

### Added

- Ship an offline legacy framework decision reference and fail CI for missing or malformed distributed ADR citations.

## [0.15.5] - 2026-08-02

### Added

- Define Arcane-vendored commit provenance with human authorship and programmatically derived vendor trailers.

## [0.15.4] - 2026-08-02

### Fixed

- Make close-session remote synchronization provider-neutral and skip all remote operations for local-only or read-only sessions.

## [0.15.3] - 2026-08-02

### Fixed

- Keep local-only `spell-commit-work` checkpoints on trunk when no authenticated supported remote merge path exists.
- Determine authorship before concern grouping and split every mixed-author batch into one-author commits.

## [0.15.2] - 2026-08-02

### Added

- Registry-driven self-host parity commands with a blocking CI check and negative drift coverage.
- Separate reporting for real content drift and line-ending-only differences.

### Changed

- Root dogfood copies under `.github/`, `.arcane/`, and `.claude/` are generated from canonical `src/assets/` sources.
- ARC-027 supersedes ARC-006's non-executable `spell update` self-refresh model.

## [0.14.0] - 2026-07-12

Initial public release.

[0.15.8]: https://github.com/codemagicianhq/arcane/compare/v0.15.7...v0.15.8
[0.15.7]: https://github.com/codemagicianhq/arcane/compare/v0.15.6...v0.15.7
[0.15.6]: https://github.com/codemagicianhq/arcane/compare/v0.15.5...v0.15.6
[0.15.5]: https://github.com/codemagicianhq/arcane/compare/v0.15.4...v0.15.5
[0.15.4]: https://github.com/codemagicianhq/arcane/compare/v0.15.3...v0.15.4
[0.15.3]: https://github.com/codemagicianhq/arcane/compare/v0.15.2...v0.15.3
[0.15.2]: https://github.com/codemagicianhq/arcane/compare/v0.15.1...v0.15.2
[0.14.0]: https://github.com/codemagicianhq/arcane/releases/tag/v0.14.0
