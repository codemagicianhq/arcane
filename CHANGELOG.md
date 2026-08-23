# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.21.0] - 2026-08-23

Completes every [ARC-028](DECISIONS.md#arc-028--concurrency-and-isolation-model-for-parallel-work) follow-up this repository owns, and files one new intake finding.

### Changed

- **Governance now distinguishes the primary checkout from a linked worktree** (ARC-028 R1/R8). `git-conventions.md` previously told every session to `git checkout main` after merge and `git branch -d` the topic branch. From a linked worktree both **fail** — git refuses to check out one branch in two worktrees, and refuses to delete a branch still attached to one. The session-branch close, the docs-workflow fast-forward merge, the Magus+ self-merge step, and Post-Merge Cleanup are each scoped to the primary checkout, with the worktree path spelled out beside them: push → PR → `git worktree remove` from the primary vantage point. Both refusals were verified against real git rather than assumed, and the text says explicitly that they are the guardrail ARC-028 leans on, not an obstacle to force past with `-D`.
- **`spell-open-session` selects the isolation primitive before anything is written.** Repo-state management → primary checkout; primary occupied → linked worktree; unattended automation → full clone; otherwise the do-nothing default. Overlapping footprints override the choice and serialize (R4), because isolation hides collisions until merge review rather than preventing them.
- **`spell-close-session` no longer ends a worktree session by checking out trunk.** It detects the primitive with `git rev-parse --path-format=absolute --git-common-dir` vs `--git-dir` and forks: the primary path is unchanged, the worktree path reports the worktree and branch for removal from another vantage point and verifies the merge against the remote-tracking ref instead. `--path-format=absolute` is load-bearing — without it `--git-dir` is absolute and `--git-common-dir` relative from any subdirectory, so every primary checkout reads as a worktree.
- **`spell-implement`, `spell-full-cycle` and `spell-ship` scope their trunk-sync and cleanup steps too.** All three began with an unconditional `git checkout main`, which fails in a linked worktree — and in `spell-implement` and `spell-full-cycle` it is step 0, before any work, whose only stated failure branch covers a `pull` failure rather than the `checkout` that actually fails. In `spell-ship` it fails *first* in the cleanup block, leaving the remote-branch deletion half-done.
- **`agent-policies.md` no longer contradicts `git-conventions.md`.** It carries a near-duplicate of the Agent Workflow whose Magus+ step and ff-only recovery block were left unscoped, so the two governance documents gave opposite instructions on the same question. A Magus+ agent in a worktree reading the wrong one would attempt a local ff-merge that git refuses.
- **The worktree refusals are stated conditionally, because they are conditional.** They hold when a working tree actually holds trunk. A bare repository with worktrees attached — a common agent-fleet layout — usually has none, and there both commands succeed; the prompts now check `git worktree list` rather than asserting the failure, and name the bare repository as the removal vantage point instead of a primary checkout that does not exist.
- **`spell-full-cycle` requires a footprint comparison before running epics concurrently**, naming shared sequences (migration numbers, generated indexes, lockfiles) as the axis people miss. Backed by the recorded evidence: a four-epic parallel run produced two duplicate migration numbers and two conflicting imports, invisible until human review; a serialized three-epic re-run produced zero.
- **`threat-model.md` no longer marks credential exposure "Mitigated".** The listed mitigation was entirely storage conventions with nothing verifying them; the row now states that detection is not implemented and says to rotate any credential that reaches a commit.

### Added

- **[EF-35](docs/intake/batch-001/EF-35.md)** — secret-handling policy is stated in five governance documents but no detection mechanism exists anywhere: no scanner on the commit path, the push path, or in CI, and nothing configuring GitHub's own secret scanning. Routed to an ADR rather than implementation, because the real decision is where the check binds and what it may block — and it must extend ARC-034's pre-push hook rather than compete for `core.hooksPath`.

### Notes

- **A repository-wide check now enforces the scoping**, rather than tests that only assert about the files a pass happened to touch. It fails if any distributed prompt or governance document contains a trunk checkout without primitive scoping nearby. The first pass at this work shipped green while three spells still carried an unconditional `git checkout main` — one in a file that same change edited — because every test was a positive assertion and nothing asked "is there anywhere else?".
- ARC-028's naming four-check ran and **Chamber failed it** — OpenChamber (9.1k★, "an agentic development environment" organised around Sessions), cirruslabs/chamber (agent isolation in VMs), and Chamber YC W26 all occupy the same audience, with segmentio/chamber owning first association. The naming rollout stays parked; vetted alternatives are recorded in the ADR. ARC-028 remains Proposed for that reason alone — every implementation follow-up this repository owns is now done, and the DMC rendering contract belongs to a different repository.

## [0.20.2] - 2026-08-23

More push-safety fixes, from a review that attacked the shipped `0.20.1` rather than reading it. **Two of these let a single ordinary command deliver the full history while `spell doctor` reported the repository blocked.** If you use `push_policy: "blocked"`, upgrade and re-run `spell doctor`.

### Fixed

- **The pre-push hook did not exist in any linked worktree.** `core.hooksPath` was written as the relative literal `.arcane/hooks`, and git resolves a relative hooks path against *each worktree's own top level* — but the hook file is untracked and exists only in the checkout that created it. So every linked worktree inherited the config and had no hook, meaning `git push <url>` (the bypass only the hook covers) succeeded in one ordinary command, no `--no-verify` needed. This was not an edge case: Arcane's own methodology (ARC-028 R3) sends concurrent sessions into linked worktrees, so the control was absent exactly where the tool tells you to work. `core.hooksPath` is now absolute and anchored on the common git directory, so every worktree resolves to the one real hook.
- **`spell init` in a subdirectory installed the hook where git never looks.** `--is-inside-work-tree` is true from anywhere in a repository, so initialising inside a monorepo package wrote the hook under that package while pointing repository-wide `core.hooksPath` at a path git resolves from the root. The hook layer was absent throughout the repository, `doctor` reported it in place, and the repository's own `.git/hooks` stopped firing as collateral. The hook is now always installed at the repository root.
- **Taking `core.hooksPath` silently disabled hooks in git's default directory.** The R7 collision guard only looked for a competing `core.hooksPath`, so a repository with ordinary `.git/hooks/*` — no hook manager, no config key to collide with — had every one of them switched off without warning. That is the exact harm R7 exists to prevent, reached by the one route it was not watching. Installation now refuses and names the hooks it would have displaced (git's inert `.sample` templates are ignored).
- **A push URL contributed by an `include`d config file defeated the block and was reported as covered.** Git labels such a value as `local` scope, so the outer-scope refusal never fired and `--replace-all` could not remove it. Rather than enumerate another special case, applying the block now **re-reads what git actually resolves afterwards** and fails unless the result is exactly the sentinel.
- **A partial unblock closed its own retry path.** `spell unblock-push` returned early on `push_policy: "open"`, which is precisely what a partial lift had already written — so the failed attempt made the command refuse to finish the job. It now gates on whether the controls are actually in force.
- **A stale marker could delete a genuine push URL.** `git config --unset-all` exits 5 for an absent key; letting that throw skipped the bookkeeping cleanup, and a surviving "there was no push URL here" marker made the next block record nothing and the restore after that remove a real URL while reporting success.
- **`core.hooksPath` set at worktree scope is now removable**, and a push URL at worktree scope is treated as overridable rather than foreign — a repository can write both itself.
- **The remedy string for an unparseable scope no longer suggests `git config --unknown`**, which is not a command.

## [0.20.1] - 2026-08-23

Fixes defects in `0.20.0`'s push-safety controls, found by a verification review that exercised them against real repositories rather than reading the code. **If you set `push_policy: "blocked"` on `0.20.0`, re-run `spell doctor` after upgrading** — it will tell you whether that repository is actually covered.

### Fixed

- **A push URL configured outside the repository defeated the block entirely, while `doctor` reported it covered.** `remote.<name>.pushurl` is multivalued and git collects values across system, global and local scope — so writing the sentinel locally **appended** to git's list rather than replacing the live URL, and because the outside value sorts first git **delivered the push** and only then failed on the sentinel. Exit code 128, history already gone, `spell doctor` green. A local write cannot subtract an outside value, so applying the policy now refuses for that remote and names the scope to fix, and `doctor` reads the effective URLs across every scope rather than only this repository's.
- **`blocked` could silently leave remotes pushable.** `0.20.0` recorded each remote's original push URL under `arcane.originalPushUrl.<remote>`, and three ordinary git configurations broke it — every one of them leaving remotes live in a repository the operator had just been told was blocked:
  - A remote name that is legal for git but illegal as a trailing config key (`my_remote` — that segment must be alphanumeric or `-`) made `git config` fail. The error aborted the whole loop, so **every remote after it in git's ordering was never touched**.
  - Trailing config-key segments are case-**insensitive**, so remotes `origin` and `Origin` collided on one key. One original was lost, and unblocking pointed one remote at the other's URL — the wrong-remote push this feature exists to prevent, arriving through its own recovery path.
  - `git remote rename` orphaned the record. Unblocking then restored nothing while reporting success, and `doctor` reported `open` over a still-blocked remote.

  The record now lives at `remote.<name>.arcaneOriginalPushUrl`, inside the remote's own section: git accepts any legal remote name there, subsection names **are** case-sensitive, and `git remote rename` moves the whole section including keys git has never heard of. Applying the block is also fault-isolated per remote now — one remote that cannot be covered is reported, never allowed to abandon the rest.
- **A mirror remote with two push URLs defeated the block entirely.** `git remote set-url --push` refuses such a remote outright, which aborted the run with both mirrors still pushable. The sentinel is now written with `git config --replace-all`, and both URLs are restored on unblock.
- **A blocked remote with no prior `pushurl` got one pinned to it.** Unblocking wrote the fetch URL into a new `pushurl` key that had never existed, so a later `git remote set-url` changed fetch only and pushes kept going to the old location. Restore now removes the key when there was none.
- **`doctor` reported a neutered hook as enforcement.** It checked the hook file existed but not its contents, so a zero-byte file — or one edited down to `exit 0` — passed while real pushes succeeded. It now compares the body, and on POSIX also requires the execute bit, since git silently skips a hook without it.
- **`doctor` reported an enforced hook as missing.** `core.hooksPath` was compared by exact string, so `.arcane/hooks/`, `./.arcane/hooks`, and an absolute spelling were all called foreign even though the hook demonstrably fires. Comparison is now path-normalised (case-folded only on Windows — folding on POSIX would make the collision guard fail open).
- **`spell uninstall` left a blocked repository unable to push, with no way back.** It deleted `.arcane.json` while leaving the hook and sentinel URLs in force, so `spell unblock-push` no longer recognised the repository and recovery meant hand-editing git config — after being told the uninstall succeeded. It now refuses and points at `unblock-push`, keyed on whether the controls are **actually** installed rather than on what the manifest declares.
- **`spell unblock-push` could leave the hook in force while reporting success.** Removing a `core.hooksPath` set at *worktree* scope was attempted with `--local`, which cannot touch it, and the hook file was never deleted. It now unsets at the scope the value lives in, deletes the hook file, verifies the result, and reports a partial lift as a **warning** rather than a success with footnotes underneath.
- **Records written by `0.20.0` are no longer applied blind.** `0.20.0`'s flat key was case-insensitive and survived `git remote remove`, so restoring from it could point a remote at another remote's URL, or at a target the operator had moved away from — reported as a clean success. Such a record is now applied only when the remote is still carrying Arcane's sentinel and no two remote names differ only by case; otherwise the recorded value is printed for you to apply by hand.
- **The hook-manager collision guard failed open when git could not be asked.** Any error other than "not set" — an unparseable config, a permission error, a git too old for `--show-scope` — was read as "nothing is configured", and installation proceeded over a hook manager it had simply failed to see. It now refuses and says so.

### Changed

- **A blocked push now names its own remedy.** With both layers active the URL fails first and the hook never runs, so the only text git prints is the scheme name. It is now `arcane-push-blocked-run-spell-unblock-push`, turning a dead end into an instruction.
- **The `guarded` reminder prints each remote's push URL**, not just its name. Catching a wrong remote is the reminder's entire job, and `origin` alone says nothing about where it points.
- **Config scope is read rather than inferred**, via `git config --show-scope`. A `core.hooksPath` set at *system* scope, or per-worktree, was previously described to the operator as "set globally" — sending them somewhere that did not have it.

### Documentation

- ARC-034 asserted that no single bypass gets through, three lines above the paragraph documenting the case where one does. That property holds only for remotes covered at the time the policy was applied, and now says so.

## [0.20.0] - 2026-08-23

Implements the push-safety design accepted in [EF-09](docs/intake/batch-001/EF-09.md), recorded as [ARC-034](DECISIONS.md#arc-034--push-safety-for-sensitive-repositories).

### Added

- **`push_policy`** — `open` (default), `guarded`, or `blocked`. Strictly additive: every existing repository behaves exactly as before. Asked once at `spell init`, backfilled by `spell update`'s retrofit.
- **`blocked` installs two layered controls** — a `pre-push` hook *and* a sentinel push URL on every configured remote, not just `origin`. Both are needed, and they cover each other's blind spot: `--no-verify` skips hooks so only the URL catches it, while `git push <url>` and second remotes never consult the first remote's URL so only the hook catches those. The fetch URL is untouched, so a blocked repository can still pull. **Known gap:** the URL layer only covers remotes that exist when the policy is applied — a remote added later is covered by the hook alone. `init` warns about this, and `doctor` reports any remote whose push URL is still live.
- **A hook-manager collision guard, at any config scope.** `core.hooksPath` is a single exclusive slot — Git reads one hooks directory, never several — so installation refuses rather than silently disabling an existing Husky, Lefthook, or pre-commit setup. The effective value is read with `git config --get`, which respects local > global > system: an earlier implementation read only the local scope and was blind to a **global** `core.hooksPath`, the standard way organisations deploy hook managers, so it reported success while disabling them. (Arcane's own repository uses `.husky/_` for lint, typecheck and the test suite.)
- **`spell unblock-push`** — the only way to lift a block. Interactive terminal only, requires the repository name typed back, records the change with a timestamp, and offers no "just this once" mode.
- **A `doctor` check that verifies enforcement, not just declaration.** A manifest claiming `blocked` while the controls are absent is reported as such — a protection that is only asserted is worse than none, because it gets trusted. That includes checking the hook **file** exists, not only that `core.hooksPath` points at it: deleting the file leaves the config intact and pushes succeed. A `blocked` repository with no remote is likewise not reported as fully protected. For `guarded` repositories the reminder fires regardless of remote state, rather than going silent the moment any remote (possibly the wrong one) is configured.

### What this deliberately does not claim

The controls resist an **accidental** push — wrong remote, muscle memory, an unsupervised agent — not a determined operator, and `core.hooksPath` does not travel to a fresh clone. ARC-034 states the limits plainly rather than implying a guarantee, because a control believed to be stronger than it is produces exactly the carelessness it was meant to prevent.

## [0.19.0] - 2026-08-23

Completes docs mode. Records the decisions in [ARC-033](DECISIONS.md#arc-033--docs-mode-subject-root-content-sensitivity-and-capability-scoped-spell-components), which amends ARC-020 for the third time — ARC-020 itself stays Proposed, since its broader scope is genuinely still open. Closes [EF-03](docs/intake/batch-001/EF-03.md), [EF-04](docs/intake/batch-001/EF-04.md), [EF-07](docs/intake/batch-001/EF-07.md), [EF-10](docs/intake/batch-001/EF-10.md), [EF-11](docs/intake/batch-001/EF-11.md), [EF-12](docs/intake/batch-001/EF-12.md).

### Added

- **`subject_root`** — describes a repository that *is* one subject rather than a portfolio of ventures. Independent of `business_root` and may coexist with it. **`"."` is supported**, meaning the repository root itself is the subject tree: an existing archive can come under governance without being restructured first. `null` records "asked, no single subject root", distinct from never having been asked. Validated by shape, since the value is resolved against the repo root and handed to spells — absolute, drive-relative, UNC and `..`-traversal values are rejected.
- **`content_sensitivity`** — `standard` (default, today's behaviour) or `sensitive`. In sensitive repositories agents cite document paths rather than contents in journals, decisions, commits and PRs, and retain no screenshots of repository contents. Declared once per repository, because content-based classification of general documents has no reliable signature. This constrains what agents *write down*; it is not an access control.
- **`spell-adopt-docs`** — dry-run-first adoption of an existing document tree: inventory, propose a written mapping, get approval, then apply in separately-revertable phases. Never deletes a document, never overwrites a file, and stops at the first collision rather than attempting partial recovery.
- **`records-conventions.md`** — superseded documents keep their path and gain a tombstone header naming their replacement. No archive directory (moving breaks every inbound link, and the reader arriving by a stale link is exactly the one you need to redirect) and no shipped retention schedule (periods are jurisdiction- and contract-specific; absence of a known period is recorded as "unknown, therefore do not delete").
- **Repository baseline** — the docs profile emits a `.gitattributes`/`.gitignore` pair covering LF normalization and binary document formats, as user-owned `skipExisting` files. A repository with its own already has an intentional policy. Git LFS is documented as an opt-in decision, not configured by default.
- `RegistryComponent.sourceOverrides` — lets an installed dotfile be stored under a plain source path. A nested `.gitignore` inside an npm tarball can exclude sibling files from the published package, and a nested `.gitattributes` would apply its rules to Arcane's own source tree.

### Fixed

- `git-conventions.md` said docs repositories require a pull request while `cicd-standards.md` recorded ADR-048's docs-only exception. The exception governs; the policy table is corrected.

## [0.18.0] - 2026-08-23

### Added

- **`docs` profile** ([EF-04](docs/intake/batch-001/EF-04.md), docs-mode PRD MH-01) — a fifth installable profile for documentation and records repositories. Installs session, capture, PR-delivery, planning and meta spells plus core governance; deliberately excludes implementation, test-coverage, stack-expert, deployment, PRD-enchantment, adversarial code review, asset tooling and hub-venture workflows. `tracking_mode` defaults silently to `internal` for this profile, alongside `governance-only` and `methodology`.

  Retained spells complete their core workflow without source code, tests, CI, or an external tracker. Two carry a known caveat, stated rather than glossed: `spell-architect` and `spell-scope` each produce a complete document on their own, but their downstream consumer (`spell-implement`) is not installed here, so a docs repo uses them as design-note tools rather than as the front of a build chain.

### Changed

- **Spell components are now capability-scoped.** The monolithic `spell-prompts` (34 spells) and `claude-commands` (34 wrappers) components were split into eight groups — `spells-session`, `spells-capture`, `spells-delivery`, `spells-review`, `spells-planning`, `spells-build`, `spells-venture`, `spells-meta` — so a profile can select spells by capability. **No spell file was renamed or moved**; grouping lives in the registry only, and every file stays flat in `.github/prompts/` and `.claude/commands/`.

  Each component now carries *both* client formats of the same spell. The two were never independently selectable (every profile that took one took the other), and pairing them makes it structurally impossible for a spell's Copilot prompt and Claude wrapper to diverge across profiles.

  **Existing installs migrate automatically on `spell update`** — no questions, no action required. A manifest listing either legacy name (or both, which is the common case) converges on the same seven components, deduped. Without this, `update` would have hit `ComponentNotFoundError`, preserved the dead entry, and silently stopped updating that repo's spells forever.

## [0.17.1] - 2026-08-23

### Fixed

- `correctUnbornMasterDefault` no longer treats an *unreadable* `refs/heads/main` as an absent one. Both `rev-parse --verify` and `show-ref --verify` return the same nonzero status for a corrupt ref as for a missing one (verified empirically), so the previous bare `catch` could repoint HEAD onto a branch that still held real history — the exact history-splice hazard its own R1 guard exists to prevent. Now uses `for-each-ref`, which separates healthy / corrupt / absent via stdout+stderr, declines the correction on a broken ref, and reports `blockedReason: "target-unreadable"` so `spell init` can warn instead of silently doing nothing.
- `scripts/check-version-bump.ts` no longer prints a spurious `fatal: path 'package.json:package.json' does not exist` line on any CI run that touched a distributable path (runs that touch none short-circuit before reaching it). `getVersion` already appends `:package.json`, so the first operand of its `||` fallback built a doubled path that could never resolve — the fallback was doing all the work. Its `execSync` helper now pipes stderr rather than inheriting it, so a failure this helper deliberately swallows can't surface as a scary CI error.
- `vitest.config.ts` now excludes `**/.claude/**`. Linked worktrees live under `.claude/worktrees/<name>/`, each with a complete `test/` directory, so `npm test` from the primary checkout discovered and ran every test file a second time per live worktree. (`defaultExclude` is spread back in — Vitest replaces this array rather than merging it.)
- `package-lock.json`'s own `version` fields were stale at `0.16.1`, six bumps behind `package.json`. Resynced; no dependency resolutions changed.

## [0.17.0] - 2026-08-22

### Added

- `tracking_mode`/`external_provider` persist in `.arcane.json` on exactly `profile`'s contract ([ARC-032](DECISIONS.md#arc-032--persisted-tracking-configuration-tracking_mode-and-external_provider-in-the-manifest), amends [ARC-020](DECISIONS.md#arc-020--canonical-repository-configuration-schema), [EF-14](docs/intake/batch-001/EF-14.md)): asked once at `spell init` (silent `internal`/`null` default for docs-only profiles, asked interactively for `full`/`lite`), backfilled via a new `MANIFEST_RETROFITS` entry on `spell update` for pre-existing installs.

### Fixed

- `spell-open-session`/`spell-plan` now resolve tracking configuration from root `.arcane.json` → the committed self-hosted source manifest → PRD frontmatter → ask, instead of asking every session — this repo's own checkout previously asked every time despite `src/assets/.arcane.json` already declaring `tracking_mode: internal`, because the prompt explicitly refused to read it.
- `ExternalProvider`'s type corrected from `azure-devops | github | gitlab | jira` (never actually used anywhere) to `ado | jira | other`, matching ARC-011 and both consuming prompts.
- Seven spells hardcoded `ventures/` instead of resolving `{BUSINESS_ROOT}` from `.arcane.json`'s `business_root` field ([EF-08](docs/intake/batch-001/EF-08.md)): `spell-check-drift`, `spell-commit-work`, `spell-open-session`, `spell-plan`, `spell-todo`, `spell-summon-venture`, `spell-save-idea`. `spell-check-drift` and `spell-todo` each needed more fixes than the intake's now-stale line citations found; `spell-summon-venture` and `spell-save-idea` weren't in the intake's citation list at all -- found by an adversarial-review completeness sweep, not the original diagnosis.

## [0.16.6] - 2026-08-22

### Changed

- Accepted [ARC-022](DECISIONS.md#arc-022--fail-safe-ci-path-filter-policy) and wired it into `cicd-standards.md` ([EF-22](docs/intake/batch-001/EF-22.md)): the .NET and Node.js pipeline templates switch from include-based (or unfiltered) path triggers to a narrow, fail-safe exclude list, so a new code directory can no longer silently bypass CI. The Terraform and Markdown-lint templates stay correctly include-scoped for their narrower technology-specific purpose, widened to also cover their own pipeline definition file. New explicit rule against using commit message/author/branch name as a CI trust signal, and new guidance on keeping Azure DevOps branch-policy path filters aligned with YAML trigger scope.

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
