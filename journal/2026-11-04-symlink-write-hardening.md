# 2026-11-04 — Writes through a link at the file itself, and roster paths (1.17.2)

Related: [[git-conventions]], [[testing-standards]], [[2026-11-04-state-export-build]].

## Session: symlink write hardening (PR #422, release PR #424)

### Prompt Context

The session opened with `spell-open-session`. While it ran, the state export's follow-up [PR #420](https://github.com/codemagicianhq/arcane/pull/420) was still open and a peer session was busy in this checkout, so the opening pass stayed read-only. The operator then asked what the open HIGH symlink-write item was, and where it had been found. The answer, checked in the git history: the independent review of PR #394's linked-directory fix, 2026-10-23, recorded in `5cb8da9`. Once #420 merged the operator said "ok let's fix it". After that came, in order: commit, push and open the PR, turn on Auto-fix, a CI failure the operator reported, "release 1.17.2", and close the session.

### What Got Done

1. **The guard (`src/modules/copier.ts`).** `validateRealTargetFile` runs `validateRealTargetPath`, then follows a link at the file itself. That covers dangling links (a write creates their target) and loops (refused after 40 hops). It raises `LinkedFileError`, a subclass of `LinkedDirectoryError`, when the write would land outside the target directory. A link that stays inside, such as `CLAUDE.md` -> `AGENTS.md`, keeps working. `findLinkedFileEscape` is the non-throwing form.
2. **Every writer named in the TODO item now calls it:** `mergeIntoFile` and `stripMarkerSection` (`merger.ts`); `installHook`, both the write and the `chmod` (`push-safety.ts`); `agents.yaml` and each copied definition (`agents.ts`); `.agent.md` files, the OpenClaw `IDENTITY`/`SOUL`/`TOOLS` and `openclaw-roster.json` (`agent-generator.ts`); `writeManifest`. `spell doctor --fix` names such a file and skips it. `writeManifest` takes `{ followLinks }`, set only for the user-tier store at `init --user`, `update --user` and the user-tier agent fan-out.
3. **Roster checks (`src/modules/agent-schema.ts`), applied when `agents.yaml` loads:**
   - A `name` or `id` that is empty, `.` or `..`, or contains `/`, `\` or a control character is refused.
   - So is an `epithet` with a control character.
   - `openclaw.workspace_root` must be `~/.openclaw` or a folder inside it. The operator chose this, the strictest of three options.
   - Three test fixtures moved their root to `~/.openclaw/never-written`; the state-export snapshots did not change.
4. **Tests (`test/linked-file-writers.test.ts`):** 14 file-link cases (POSIX only), 4 junction cases for the guard itself (every platform) and 18 roster cases. The roster cases were seen failing 18 of 18 against the old validator. On the PR's head, CI's Linux job ran all 37 cases in the file with none skipped, and they passed.
5. **[PR #422](https://github.com/codemagicianhq/arcane/pull/422) was merged by rebase as `338f45e`..`daea969`**, with all 7 checks green.
6. **[PR #424](https://github.com/codemagicianhq/arcane/pull/424) released 1.17.2** as `0a738cf` (bump plus regenerated demos) and `2c963c3` (changelog). Release drift and Publish both succeeded, and npm `latest` returned `1.17.2` at 23:17Z.
7. **[PR #426](https://github.com/codemagicianhq/arcane/pull/426) closed both `TODO.md` items** (`bdda163`).
8. **This close** confirmed that run 41866709739 completed with conclusion success. The planning-day close ([PR #427](https://github.com/codemagicianhq/arcane/pull/427)) had already checked off "Confirm main's post-merge CI run passes after the macOS fixture re-run", so this close keeps that line as it is. This close also adds 1.17.1 and 1.17.2 to the website-sync item. Rebasing this close onto #427 conflicted in `TODO.md` and the handoff; with the operator's approval, the two handoffs were combined into one.

### Decisions Made

No new decision record was filed. The operator's 2026-11-04 choice, that `openclaw.workspace_root` must be `~/.openclaw` or a folder inside it, is recorded in `TODO.md` and in the 1.17.2 changelog under Changed. It extends ARC-057 (managed paths stay inside the target directory by real path) to the OpenClaw home, and might warrant an amendment there; that is listed under Open Items.

### Lessons Learned

#### Ask for commit approval only after the commit gates have run

`spell-bug` presents the commit message for approval, and `spell-commit-work`'s coverage gate runs afterwards. Here the gate failed: `copier.ts` has a 95% per-file threshold, and on Windows it fell to 89%, because the new code was exercised only by tests that skip on Windows. Fixing that changed the staged diff, so the approval no longer applied and had to be asked again. The gates should run before the operator is asked. Routed to `FEEDBACK.md`.

#### `check:changelog` has no `### Security` heading

Keep a Changelog 1.1.0, which this changelog says it follows, defines a Security section. `scripts/check-changelog` accepts only Added, Changed, Fixed, Removed and Notes, so the 1.17.2 security fixes went under Fixed with a "Security:" lead-in. Routed to the idea book.

#### A refusal test must show it reaches the write

The first version of the `agents init` case pointed `.arcane/agents.yaml` at an existing file and expected a refusal. `runAgentsInit` returns early when a roster exists and `--force` is not given, so it resolved without writing anything, and the guard never ran. The test skipped on Windows, so CI's Linux job was the first place it ran, and it failed there. Nothing had leaked. A test that asserts a writer refuses must make sure the writer gets as far as the write: here, `--force` for an existing target, or a dangling link.

#### A junction stands in for a file symlink in guard tests on Windows, with one difference

This account cannot create file symlinks ("Administrator privilege required"), and WSL here has no Linux Node. A directory junction placed where a file is expected works for testing the guard: Node's `lstat` reports it as a symlink and `readlink` follows it. Four junction cases covered `validateRealTargetFile` on every platform and fixed the coverage gap. The difference: `access()` succeeds on a dangling junction on Windows, but fails on a dangling POSIX symlink. So a junction is not a faithful stand-in where code tests existence with `access()`, as `rosterExists` does.

#### Never write a placeholder into a record

The first draft of the TODO close-out said "checked 2026-11-04 23:1xZ" before the time had been looked up. It was caught and replaced with the real time (23:17Z) before the commit. Look the value up first and write it once.

### Open Items Carried Forward

- The website repository's bot sync pull requests, now for 1.16.0, 1.16.1, 1.17.0, 1.17.1 and 1.17.2, are unverifiable from this account: `gh repo list codemagicianhq` shows only `arcane` and `arcane-archive`. Tracked in `TODO.md` ("Review and merge the website repository's bot sync pull requests").
- Whether the `workspace_root` rule deserves an ARC-057 amendment or its own decision record is the operator's call; nothing has been filed (untracked: a decision for the operator, raised in this session's closure report).
- The roster's `definition` field is still unrestricted. It is only read, never used as a write path, so it was out of scope for both items (untracked: no write path, nothing to fix unless reads come into scope).
- The LOW follow-ups to the linked-directory work are still open in `TODO.md`: the report and hub-registry writers, a doctor row naming linked paths, and refusals that still reach the operator with a stack trace.
- A Dependabot run for `minimatch` failed on `main` at 23:09Z. It is unrelated to this work and was not investigated (untracked: Dependabot reruns on its own schedule; look again if it recurs).

## Session: the four open questions (PR #430)

### Prompt Context

The same session, after its first close merged as [PR #428](https://github.com/codemagicianhq/arcane/pull/428). The operator asked for stale branches to be cleaned up, for a summary and a session name that reflects the work, then said: "we can tackle the 4 questions and close session after". The four were the items the first close left for the operator: ARC-059, ARC-060, a decision record for the `workspace_root` rule, and the website repository's sync pull requests.

### What Got Done

1. **Cleanup.** No stale branch existed, locally or on origin. `main` was fast-forwarded to `459894d` (1.17.3, a peer session's release). Three local `sync-backup/*` tags were deleted after checking that their pull requests (#386, #428) had merged and that none was on origin.
2. **ARC-059 and ARC-060 accepted as written** by the operator on 2026-11-04: both status lines and table-of-contents rows in `DECISIONS.md`, and the `decision:` line of `features/agent-identity/PRD.md` and `features/presence-channel/PRD.md`.
3. **ARC-057 amended**, the operator's choice over a record of its own: decisions 6 to 8 record what 1.17.2 shipped (the link-at-the-file rule, the roster segment rule, `openclaw.workspace_root` confined to `~/.openclaw`).
4. **The website sync was checked, and an earlier claim corrected.** The first close said the sync pull requests were unverifiable from this account. That was wrong: `gh` cannot see the website repository, but the Azure DevOps API with the operator's `az` sign-in can. Read there: the pins for 1.16.0, 1.16.1 and 1.17.0 are merged (pull requests 1296, 1308, 1310); none exists for 1.17.1 to 1.17.3; the `arcane-sync` run for v1.17.2 (build 1198) fails with `Staged files differ from the plan`, and failed again when the operator re-ran it. `TODO.md`'s item says so and stays open.
5. Committed as `613ae1b`; [PR #430](https://github.com/codemagicianhq/arcane/pull/430) merged on 2026-11-05 at 05:40Z as `0c11748`, with all checks passed.

### Lessons Learned

#### "Unverifiable" was written after trying one tool

The first close classified the website sync as unverifiable because `gh repo list` showed two repositories. The website lives in Azure DevOps, and `az` was signed in on this machine the whole time. The claim then travelled through two handoffs as a standing fact. The operator's link to the build is what exposed it. Before writing that a system cannot be reached, try each provider tool the machine has (`gh`, `az`), and say which were tried.

#### A pull that changes `src/` leaves `dist/` stale, and the pre-push hook then fails on tests that are right

After fast-forwarding to 1.17.3, the pre-push suite failed five tests in `test/installed-cli-version-lookup.test.ts` and `test/status.test.ts`. They run the built CLI, and `dist/index.js` predated the fix they check. `npm run build` cleared it; the suite then passed (2782 tests). Nothing in the hook says the build is older than the source. Registered in `TODO.md` ("LOW (dx): the pre-push suite runs built-CLI tests against a stale `dist/`").

#### A push that printed the pull request's state without acting on it

The close commit was meant to join [PR #430](https://github.com/codemagicianhq/arcane/pull/430). The operator merged that pull request while the commit was being prepared. The command printed `MERGED` and pushed anyway, because the state was echoed, not tested; the commit itself had already been refused by the org-token scan, so the push carried nothing new and only recreated the remote branch the merge had deleted. The branch was deleted again and the close moved to a fresh branch from `main`. This was the agent's error: `spell-commit-work`'s PR-state check says a merged branch is never pushed. A gate is a test in the command (`[ "$state" = OPEN ] || exit 1`), never a value printed beside it. The scan's refusal was also the agent's doing: the handoff named a real organization, which the privacy gate (ARC-031) exists to stop.

### Open Items Carried Forward

- This close is a pull request of its own from `sessions/2026-11-04-close-four-questions`; a merge needs the operator.
- The website sync failure is undiagnosed and belongs to a session in the website repository (`TODO.md`, "Review and merge the website repository's bot sync pull requests").
- `TODO.md`'s "MEDIUM (bug): the built CLI's `spell status` never reaches npm." is still unchecked although 1.17.3's subject line reads as its fix; that is the peer session's item to close (untracked: another session's work, flagged to the operator in this close's report).
