# PRD: Upstream Intake Wave 2026-09-28 — the install half of `spell update`, three defects, one report bug

---
tracking:
  tracking_mode: internal
  external_provider: null
  adoWorkItemId: null
  githubIssueId: null
status: draft
created: 2026-09-29
plan: features/upstream-intake-wave-2026-09-28/execution-plan.md
source: TODO.md ("Upstream intake — 2026-09-28")
---

Related: [[development-methodology]] (the Spell Loop this runs through), [[git-conventions]]
(branch, PR and merge rules).

## Problem Statement

Four issues (#293–#296) were filed on 2026-09-28 by a consumer session that updated three
repositories to `1.8.0`, plus one Show Report bug found while closing the previous program. Each
root cause below was checked against source on 2026-09-29.

- **#295 — supply chain.** `src/assets/.mcp.json` ships `npx -y @example/mcp-server`, a package
  name nobody owns. Whoever publishes it runs code on every machine where a user approved the
  project's MCP servers. **Fixing the shipped file is not enough:** `.mcp.json` is declared
  `skipExisting` in `src/modules/registry.ts`, so every repository that already ran `spell init`
  keeps the bad line, and nothing tells its owner.
- **#294 — a crash on a documented workflow.** `spell add --dry-run` never checks whether the
  destination exists, so it prints "Would copy" for a file the real run then refuses with an
  uncaught `Destination already exists` and a stack trace. `add.ts` also never reads the
  `skipExisting` flag four components declare.
- **#296 — a false warning on every Windows run.** `spell doctor`'s branch-policy check spawns
  `az`, whose Windows entry point is `az.cmd`. `execFile` without a shell cannot launch it, so the
  check warns even when Azure CLI is installed and signed in.
- **#293 — the install half of `spell update`.** UP-03 (`v1.7.0`) made `spell update` *list*
  missing `requires` prerequisites and newly available components. Installing them is still one
  `spell add` each and easy to miss, so older installs never catch up with a fresh `spell init`.
  This item also absorbs two older `TODO.md` items whose listing half already shipped.
- **The `getCloseCommit` completed-day bug.** For a completed program the close commit does
  not exclude the program's own report files, so on the program's `completed:` day a
  report-regeneration commit becomes its own close and the report is stale on landing. This turned PR #304 red after it passed locally.
  A second facet surfaced on 2026-09-29: the completed-day walk keys on the committer date, which a
  rebase-merge rewrites, so PR #305's report (56) merged stale against a fresh regeneration (55).

**Why now:** #295 is an open supply-chain exposure with a one-line fix. #294 and #296 are defects
users hit on ordinary runs. #293 is the largest and the only one that needs a design decision.

## Target Users

Operators of Arcane-installed repositories, especially those installed before `1.7.0`, and anyone
running `spell doctor` on Windows against an Azure DevOps remote.

## Premise corrections (checked against source, not the reports)

1. **#296's suggested fix is unsafe as written.** The report, and the `TODO.md` entry filed from
   it, say the `az` arguments are fixed strings, so `shell: true` carries no escaping risk. They are
   not. `fetchAdoMergeTypePolicies` passes `--repository`, `--project` and the organisation URL,
   all parsed from the git remote URL by `parseAdoRemote` with `[^/]+` patterns that accept `&`,
   `|`, `"` and `%`. On Windows, `shell: true` joins arguments unquoted into a `cmd.exe` command
   line, so a metacharacter in a remote's project segment would execute, and a project name with a
   space would break. The requirement below is *launch `az.cmd` without shell interpretation of the
   arguments*, not "add `shell: true`". The `TODO.md` entry carries the same wrong sentence and is
   corrected in the same change as this PRD.
2. **#293's headline ask contradicts a recorded position.** The comment on `initOnly` in
   `src/commands/update.ts` says `spell update` does not add such a file on its own, because a
   mid-life install is the operator's call, and the prior program's D-09
   (`features/upstream-intake-2026-09/PRD.md`) records that for the one component it covered,
   `.gitattributes`. **Corrected 2026-09-29:** this paragraph first said D-09 states the general
   position that `update` never installs anything. It does not: D-09 is about `.gitattributes`
   only, and a search found no earlier ADR stating the general one (ARC-052 says so). That
   reasoning is specific to files that change how Git treats the whole repository. A `requires` prerequisite is a governance
   document a spell already cites, so the spell is broken without it. The requirement below
   narrows the exception to `requires` only and leaves newly available components opt-in. It needs
   an ADR (Open Question 1).
3. **#293's "list them" half is already live.** The reporter's own output proves it. Only the
   install half is in scope.

## Requirements

### Must Have

- **R-295a — the shipped scaffold cannot resolve to a stranger's code.** `src/assets/.mcp.json`
  names no package that is unowned or unpublished. *AC:* a test reads the shipped file and fails on
  `@example/` and on any `args` entry that is not a placeholder no npm package name can match.
- **R-295b — existing installs are told.** `spell doctor`'s MCP config check warns when a
  repository's `.mcp.json` still runs the shipped example package, naming the file and the fix. It
  never fails and never edits the file, which is user-owned. *AC:* a doctor test with the old line
  warns, one with a real server line does not, and one with no `.mcp.json` still passes silently.
- **R-294a — dry-run reports an existing destination.** For each file `spell add --dry-run` would
  copy, it says when the destination already exists and whether it differs from the packaged file.
  *AC:* a dry-run over an identical existing file, a differing existing file and a missing file
  prints three distinct lines and writes nothing.
- **R-294b — the real run never throws a stack trace on an existing file.** A refusal is one clean
  error line naming the file and the `--force` remedy, with a non-zero exit. *AC:* a test that adds
  over an existing file asserts exit code 1, one error line, and no stack frame in the output.
- **R-294c — `skipExisting` is honoured.** A `skipExisting` component keeps an existing
  destination, reported as kept and not as an error, and creates a missing one. *AC:* one test per
  behaviour, using `.mcp.json` as the fixture.
- **R-296a — `az` launches on Windows.** `az` starts through `az.cmd` on `win32` with no shell
  interpretation of any argument. *AC:* a test stubs an `az.cmd` that echoes its arguments and
  asserts they arrive unchanged for a project name containing a space, `&`, `|`, `"` and `%`, with
  no side effect from any metacharacter. The `gh` calls are unchanged.
- **R-296b — no behaviour change on other platforms.** *AC:* the existing exec tests pass
  unmodified on Linux CI.
- **R-293a — `spell update` installs missing `requires` prerequisites.** For every installed
  component whose `requires` names a component not in the manifest, `update` installs it (never an
  `initOnly` component) and reports each one. *AC:* a repository installed with a spell component
  but without its cited governance component ends `spell update` with that component present,
  hash-tracked and reported. `--dry-run` reports the same list and writes nothing.
- **R-293b — newly available components are offered in one step and never installed silently.**
  `spell update` lets the operator accept the profile's new components in one action: a checklist
  in an interactive terminal, and an explicit `--add-new` flag in a harness with no TTY. Without
  the flag and without a TTY nothing is installed and the list prints as today. `spell doctor`
  stays read-only and names the one command to run. *AC:* tests for interactive accept,
  interactive decline, the flag, no TTY without the flag, and doctor printing the command.
- **R-293c — `spell add` takes several names.** `spell add a b c` adds each in order, stops at the
  first failure with a clean error, and reports which were added. *AC:* tests for all-success, a
  failure in the middle, and an already-installed name (skipped, not an error).

### Should Have

- **R-CLOSE — `getCloseCommit` excludes generated outputs on the completed day.** A completed
  program's close commit ignores that program's own report files, as the active-program branch
  already does. *AC:* a regression that regenerates a completed program's report on its
  `completed:` day in a trailered commit and asserts `check:report` passes. The fix also anchors the walk on a date a rebase cannot rewrite (for example the
  author date), with a regression that rewrites committer dates and asserts the close does not move.
  Dropped first if the
  wave runs long.

### Won't Have (this iteration)

- Editing an existing user's `.mcp.json`. It is user-owned; R-295b only warns.
- Installing `initOnly` components from `update`.
- A `--user` variant of the offer flow, since `spell add` has no `--user`.
- Turning `.mcp.json` into a profile-level component.

## Constraints

- **Technical:** every `src/assets/` change and every registry change carries a version bump. An
  installed prerequisite must be recorded with its hash exactly as `spell add` records it
  (ARC-038).
- **Security:** R-296a must not introduce shell interpretation of remote-derived text.
- **Delivery:** the operator merges every PR. No agent accepts an ADR.

## Acceptance Criteria (program level)

- [ ] #295, #294, #296 and #293 are each closed by a merged PR (`Closes #NNN`).
- [ ] The two older `spell update` items in `TODO.md` stay ticked, and their closure notes still
      claim exactly the listing half.
- [ ] `npm run check:self-host-parity`, `check:version-bump`, `check:stale-claims` and the full
      test suite pass on `main` after each PR.
- [ ] A fresh `spell init --profile full` and an old install brought up with `spell update
      --add-new` end with the same component set.

## Dependencies

- An ADR for R-293a (a narrow exception to "update installs nothing on its own"), Accepted by the
  operator before the PR that implements it merges.
- A Windows machine for R-296a's live check. The stubbed `.cmd` test covers CI, and the operator's
  machine is the only real Azure CLI available.

## Open Questions

1. **Approve narrowing "update installs nothing" to `requires` only?** Recommended: yes, with the
   ADR. The alternative keeps `update` report-only and ships only R-293b and R-293c, which leaves
   missing prerequisites as a doctor warning.
2. **R-296a mechanism.** Resolve `az.cmd` and invoke it through `cmd.exe` with each argument
   escaped, or bypass the `.cmd` by invoking the Azure CLI's own entry point directly. The
   architect decides. The acceptance criterion is the contract either way.
