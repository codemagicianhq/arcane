# 2026-11-04 — The latest-version lookup from an installed copy (1.17.3)

Related: [[testing-standards]], [[git-conventions]], [[2026-11-04-state-export-build]].

## Session: version lookup fix (PR #429, released as 1.17.3)

### Prompt Context

A side session started from the ops-hub session with one task: fix the latest-version lookup so that it works from an installed, bundled copy of the CLI, and prove it with a test that runs against the built bundle. The task set the order: open the session on a branch named by the session, reproduce before changing anything, fix through `spell-bug`, reuse the mechanism the CLI already uses for its own version, sweep `src/` for other reads that break the same way, keep a clear warning where the lookup cannot run, bump the patch version, write the changelog entry, and open a pull request without merging it. Every commit message was to be approved by the operator, and so was the push.

The operator then answered here: "Approve, then push" for the five commits, "Merged" once the pull request was in, ran the global upgrade, and asked for this close.

### What Got Done

1. **Root cause, confirmed directly.** `getFeedUrl()` in `src/modules/version-check.ts` read the package's own `package.json` as `../../package.json`. That is right from `src/modules/`. The published CLI is one bundle, `dist/index.js`, and from there the same path names the folder that holds the package, so the read threw `MODULE_NOT_FOUND` and the lookup never ran. A probe on the built bundle and on an installed copy showed `../../package.json` throwing and `../package.json` resolving to the package's own file. The line dates from the 0.14.0 initial release (`07b98a0`).
2. **The fix.** `src/package-info.ts` is the one module that reads `../package.json`. It sits directly under `src/`, so the path is the package root from source and from the bundle alike. `src/index.ts` (the version) and `getFeedUrl()` (the registry, still from `publishConfig.registry`) both import it. A sweep of `src/` found no other read from `import.meta.url` that depends on folder depth.
3. **Two failure paths that only became reachable once the lookup ran:**
   - `src/commands/status.ts`: with a registry that gives no answer, `checkForUpdate` returns a null `latest` and no `error`, and the footer printed the manifest's version as `Latest`. It now prints `Latest: unable to check` whenever `latest` is null.
   - `src/modules/state/versions.ts`: the state export's warning keeps the reason, `Feed URL unavailable: <reason>`.
4. **The regression test.** `test/installed-cli-version-lookup.test.ts`, with `test/helpers/installed-cli.ts`, copies the built bundle into the layout npm installs (`node_modules/arcane-cli/dist/index.js` beside a `package.json` whose `publishConfig.registry` is a stub on loopback) and runs `spell status` and `spell state --json --online` there with a home of its own. Four cases; all four fail on the 1.17.2 bundle. CI ran them, not skipped them: the "Lint, typecheck, test, build" job shows the file passing with 4 tests on the pull request's run, on `main`'s run and in the Publish job's test step.
5. **Other tests.** `test/status.test.ts`'s built-CLI case now uses a home of its own with a seeded cache and asserts the `Latest:` value, and a unit case covers a null `latest` with no error. `test/state-versions.test.ts`, `test/version-check.test.ts` and `test/vendor-attribution.test.ts` follow the change.
6. **[PR #429](https://github.com/codemagicianhq/arcane/pull/429) was merged by rebase as `166f50a`..`459894d`** on 2026-11-05 at 02:35Z, with all 7 checks green. `bb15c91` is the fix and its tests, `24abb7b` the bump to 1.17.3 with the regenerated demos, `2308e8d` the changelog entry.
7. **1.17.3 is released and published.** Release drift cut tag and GitHub Release `v1.17.3`, the Publish run succeeded, and CI on `main` at `459894d` passed. npm's `latest` answered 1.17.3 from 02:39Z and the tarball could be downloaded from 02:42:53Z.
8. **Verified from the published package and from the operator's upgraded global install**, run from a directory with a manifest: `spell state --json --online` reports `versions.latest: "1.17.3"`, equal to `npm view arcane-cli version`, with `drift.cli_behind_latest: false` and no versions warning; `spell status` prints `Installed: 1.17.3  Latest: 1.17.3`. Before the fix the same two commands gave `latest: null` with the warning `Feed URL unavailable`, and `Latest: unable to check`.
9. **A second defect, found while verifying and registered, not fixed:** `TODO.md`, "MEDIUM (bug): `spell status` says an update is available when the installed CLI is newer than the latest version it found." (`459894d`).
10. **This close** checks off the `TODO.md` item "MEDIUM (bug): the built CLI's `spell status` never reaches npm.", registers a new `TODO.md` item for the publish workflow, and queues two lessons in `FEEDBACK.md`. [PR #430](https://github.com/codemagicianhq/arcane/pull/430) (`0c11748`) merged while this close was open, and `main` was then merged into its branch at the operator's instruction. Both had added to the website-sync item's line in `TODO.md`; #430's text is kept, because it records what the sync runs show, and this close's note that 1.17.3 had been published is dropped.

### Decisions Made

No new decision record was filed. The rule that the package's own `package.json` is read in one module, kept directly under `src/`, is written in that module's comment and held by the bundle-level test.

### Lessons Learned

#### A test of the source module cannot see a path that depends on where the file sits

Every test of the lookup imported `src/modules/version-check.ts` or mocked it. From there the old path is correct, so the tests passed for every release since 0.14.0 while every installed copy failed. The one test that ran the built CLI asserted only that the footer contained `Installed:`. A bundle changes what `import.meta.url` means for every module in it. A behaviour that depends on a file's location needs a test that runs the artefact users install, from the layout they install it in. Routed to `FEEDBACK.md`.

#### A mocked return value the real function never produces hides the real path

A unit test of `spell status` mocked `checkForUpdate` to return an `error`. The real function never sets one: on a network failure it returns a null `latest` and nothing else. So the path a user meets when the registry is unreachable was untested, and it printed the manifest's version as `Latest`. When a mock stands in for a function, its return value should be one the function can produce; `test/version-check.test.ts` now asserts that the error field is absent, so the two cannot drift apart unnoticed.

#### Read the suite's own exit line, not the wrapper's exit code

The first full-suite run was started in the background with its output piped through `tail`. The harness reported exit code 0, which was `tail`'s. The log's own last line said the suite had exited 1: `test/vendor-attribution.test.ts` pins the text of the `require` call in `src/index.ts`, which had just moved. Reading the log caught it before anything was claimed. A command whose result matters should not end in a pipe, or should record the exit code of the stage that matters. Routed to `FEEDBACK.md`.

#### npm lists a new version before its tarball can be downloaded

Measured on this release: the publish step printed `+ arcane-cli@1.17.3` at 02:36:39Z. The `latest` tag still answered 1.17.2 until 02:39:08Z. The tarball answered 404 until 02:42:53Z. For about four minutes `npm view arcane-cli version` said 1.17.3 while `npm install arcane-cli@1.17.3` failed with E404. That is a lag in the registry, not a failed publish. A release check that stops at `npm view` can pass before the package can be installed; the check that settles it is an install, or a request for the tarball. Registered in `TODO.md` ("MEDIUM (release): a green Publish run means "uploaded", not "installable".").

### Open Items Carried Forward

- `TODO.md`, "MEDIUM (bug): `spell status` says an update is available when the installed CLI is newer than the latest version it found." It is reachable for up to 24 hours after an upgrade, because the cache in `~/.arcane/version-cache.json` keeps the older `latest`. The operator's machine met exactly this between the publish and the upgrade.
- `TODO.md`, "MEDIUM (release): a green Publish run means "uploaded", not "installable"." The publish workflow should run the packed package as installed before publishing, and wait for the tarball afterwards.
- The website catalog is behind the current release. [PR #430](https://github.com/codemagicianhq/arcane/pull/430) recorded that the pins through 1.17.0 are merged and that the sync run fails for 1.17.1 to 1.17.3; the fix belongs to a session in the website repository. Tracked in `TODO.md` ("Review and merge the website repository's bot sync pull requests").
- ARC-059 and ARC-060 were accepted as written, and ARC-057 was amended for the rules 1.17.2 shipped, the `openclaw.workspace_root` rule among them, by [PR #430](https://github.com/codemagicianhq/arcane/pull/430) while this close was open. The next step for the presence channel is `spell-architect` on its PRD (`TODO.md`, "Presence channel (ARC-060): accept the record, architect it, implement roadmap item 2.1 before T3 (2026-12-02).").
- The new test's dependency link is a junction on Windows. It ran on macOS locally and on CI's Linux job; no Windows run of that file was observed, because CI's Windows job runs only the sign-in tests (untracked: nothing to fix unless a Windows run of the full suite fails on it).
- In this repository itself `spell state --json` and `spell status` answer "Not initialized", because the manifest is the self-hosted one under `src/assets/` and there is no root `.arcane.json`. `spell-open-session`'s state-export-first step falls back to the individual commands here (untracked: by design for the source repository; noted so the next session does not read it as a regression).
- A Dependabot run for `minimatch` failed again on `main` at `459894d`. It is unrelated to this work and was not investigated (untracked: Dependabot reruns on its own schedule).
