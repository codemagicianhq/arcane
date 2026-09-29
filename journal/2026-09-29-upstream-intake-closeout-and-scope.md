# 2026-09-29 — Upstream Intake 2026-09 closed, the next intake scoped into two epics

Related: [[development-methodology]] (the Spell Loop the scoped epics will run), [[git-conventions]]
(the rebase-merge behaviour behind this session's main finding).

## Session: finish UP-06, Q-004 and UP-05, then scope the 2026-09-28 intake (#293–#296)

### Prompt Context

Continued from the 2026-09-28 session (`journal/2026-09-28-upstream-intake-waves.md`), which left the
Upstream Intake 2026-09 program with two open epics (UP-06 and UP-05) and three operator-queue items
blocking them. After PR #305 merged, the operator asked "is there anything left to do in this
session?" and then, "let's take care of both items in this session". I read "both" as the two
operator-side items (tick the `OPERATOR-QUEUE.md` entries, cut the step-2 plan for #293–#296), with
this close-session last. That reading was never confirmed; the alternative was close-session plus
step 2.

### What Got Done

1. **UP-06 shipped.** `spell report --theme` landed in [PR #302](https://github.com/codemagicianhq/arcane/pull/302) (merged 2026-09-28), closing #271.
2. **Q-004 recorded.** The transcript-fork probe result went in via [PR #303](https://github.com/codemagicianhq/arcane/pull/303) (merged 2026-09-28), closing #267.
3. **UP-05 closed the program.** [PR #304](https://github.com/codemagicianhq/arcane/pull/304) (merged 2026-09-29).
4. **The 2026-09-28 intake was registered** in `TODO.md` ([PR #305](https://github.com/codemagicianhq/arcane/pull/305), merged), then corrected against source in [PR #306](https://github.com/codemagicianhq/arcane/pull/306) (merged 2026-09-29), which also carried the two-epic scope: `features/upstream-intake-wave-2026-09-28/PRD.md` and `execution-plan.md`.
5. **Three premise corrections** are on the record in `TODO.md`, the PRD and the plan: #296's suggested `shell: true` fix would execute remote-derived metacharacters in `cmd.exe` (the arguments are not fixed strings), #295's fix needs a doctor warning because `.mcp.json` is `skipExisting`, and #293's headline ask narrows the recorded D-09 position and needs an ADR.
6. **`execution-plan.md` corrected this close:** it said ARC-049 was the latest decision number; `DECISIONS.md` on this branch and on `origin/main` both end at ARC-051, so ARC-052 is the first free number.

Not listed here because it is not yet confirmed: the operator-queue ticks and the report regeneration are in [PR #307](https://github.com/codemagicianhq/arcane/pull/307), which is open with CI still running. See Open Items.

### Decisions Made

No ADR was written. The one ADR candidate (`spell update` installing a component's `requires`) is recorded in `execution-plan.md` as `Proposed` direction and waits on the operator; it is drafted only after Epic 1 is in review.

### Lessons Learned

#### A rebase-merge rewrites committer dates, and the completed-day close commit keys on them

`getCloseCommit` (`src/modules/show-report/sources.ts`, the `completedDate` branch) walks on the committer date. PR #305 merged with its Show Report cast at 56 against a fresh regeneration of 55. I inferred the cause from timestamps and did not reproduce it. It is tracked as R-CLOSE in the PRD and in the MEDIUM `getCloseCommit` entry in `TODO.md`. The proposed fix anchors on a date a rebase cannot rewrite and adds the `generatedOutputs` exclusion the other branch already has.

#### The operator queue is a report source

Ticking an `OPERATOR-QUEUE.md` entry makes `check:report` fail until `npm run fix:report` runs, and the regeneration belongs in its own report-only, trailer-free commit. Expect the failure and the extra commit whenever a queue is edited, and never hand-edit `show-report.{json,html}`.

#### A push to a branch whose PR just merged recreates the deleted remote branch

PR #306 merged while I was committing the queue ticks. The merge auto-deleted the remote branch, and my push recreated it as `[new branch]`. The tell was `origin/main...HEAD` reading `2 4`, four commits ahead of trunk when two of them were already merged. I investigated before acting, rebased onto `origin/main` (which dropped the two merged commits), pushed with `--force-with-lease` to my own topic branch, and opened #307. The push step of a commit spell has no check for "is this branch's PR already merged?".

#### Counts I asserted from memory were wrong three times

"Eight sync-backup tags" was four, local only, none on the remote (checked again this close: 4 local, 0 remote). "Four queue entries open" was seven. "ARC-049 is the latest decision" was ARC-051. Each was fixed once a command was run, but each had already been written down. A number in a plan or handoff needs the command that produced it.

### Open Items Carried Forward

- **PR #307** (queue ticks + report regeneration) — `pending`: 2 of 3 checks pass, "Lint, typecheck, test, build" was still running at last check. The operator merges it.
- **Epic 1, "Safety fixes"** (#295, #296, R-CLOSE) — waits on the operator's go and on Open Question 1 in the plan. Registered in `TODO.md` ("Upstream intake — 2026-09-28") and `features/upstream-intake-wave-2026-09-28/execution-plan.md`.
- **Epic 2, "The install half of `spell update`"** (#294, #293) — gated on Epic 1 merging and on an ADR the operator accepts. Same locations.
- **Live Windows check of `az`** after Epic 1 merges — only the operator's machine has a real Azure CLI.
- **Four local `sync-backup/*` tags** — none on the remote; the operator decides whether to prune them.
- **Queue ticks Q-003 and Q-005 carry two honest limits:** Q-003 was ticked under a "Yes, if faithful" pre-authorization with no separate re-review of ARC-049's two interpretations, and Q-005 observed one client only. Both limits are written in the entries themselves.
- **Pre-push hook** — `up03-a-gitattributes` still fails inside the full suite on this Windows machine ([TODO.md](../TODO.md), Test Infrastructure), so each push needed the operator's per-branch `--no-verify`. CI on Linux is the real gate.

## Session: Epic 1 "Safety fixes" of the 2026-09-28 upstream intake, and the ARC-052 draft

### Prompt Context

The operator answered the plan's Open Question 1 with "yes, approve the ADR direction and go on Epic 1".
I ran `spell-full-cycle` on Epic 1 from `features/upstream-intake-wave-2026-09-28/execution-plan.md`:
R-295a and R-295b (#295), R-296a and R-296b (#296), R-CLOSE (Show Report), one patch bump. Standing
constraints from the operator: R-296a must not interpret remote-derived text through a shell and its
metacharacter test is a merge blocker; the ADR is not part of Epic 1 and is never accepted by the agent;
Epic 2 (#293, #294) is not started; the operator merges; every commit and every `--no-verify` push needs
fresh approval. During review the operator decided "fall back to plain az, no shell" over returning null.

### What Got Done

1. **Epic 1 shipped as one PR.** [PR #308](https://github.com/codemagicianhq/arcane/pull/308) merged 2026-09-29 09:59Z by the operator (CI "Lint, typecheck, test, build", "PR branch is rebased on target" and "Review round clear" all `SUCCESS` at last read; `gh pr view 308` shows `MERGED`). #295 and #296 closed with it (`gh issue view` shows `CLOSED` for both).
2. **#295:** the `.mcp.json` scaffold no longer names `@example/mcp-server` (`883e5c0`), and `spell doctor` warns installs that kept the line (`0418b99`).
3. **#296:** `resolveAzureCli` in `src/modules/exec.ts` launches the Azure CLI's own interpreter with no shell on Windows and falls back to plain `az` (never a shell, never null) for any other packaging; relative `PATH` entries are skipped (`4e2a521`, `fe74ab0`). A metacharacter test fails under a `shell:true` mutation, and a relative-PATH test fails with the guard removed.
4. **R-CLOSE, partly.** `getCloseCommit` excludes the program's generated outputs on the `completedDate` branch (`093f4e6`). Acceptance criterion 2 is NOT met (see Lessons and Open Items).
5. **`1.9.1` published.** `5b4cddc` bumped it; the "Release drift" workflow created the `v1.9.1` GitHub Release at 09:59:29Z and `publish.yml` run 36552720436 finished `success`, including its "Publish to npm" step. The registry answered `1.9.0` at about 10:04Z and `1.9.1` on a read a few minutes later (`curl https://registry.npmjs.org/arcane-cli/latest`), so it lagged the workflow briefly; the later read is the one that counts.
6. **Epic 1's record** is in `features/upstream-intake-wave-2026-09-28/epic-1-safety-fixes/` (`architecture.md`, `stories.json`, `progress.txt`), merged in the same PR (`7bc586f`).
7. **ARC-052 drafted as `Proposed`** in `DECISIONS.md` (`spell update` installs a component's `requires` prerequisites), on branch `claude/docs/adr-update-installs-requires`. It is a draft, not accepted, and its PR is not yet merged.
8. **The D-09 over-read corrected** in `features/upstream-intake-wave-2026-09-28/PRD.md` and `execution-plan.md` (see Lessons).

### Decisions Made

| ADR | Decision | Rationale |
|---|---|---|
| ARC-052 (Proposed) | `spell update` installs missing `requires` prerequisites of installed components (repo scope only, hash-tracked, `--dry-run` parity); never `initOnly` files, never newly available components | A cited-but-missing governance document leaves a spell broken; a newly available component is a preference, left opt-in for R-293b. Number: `max(this branch's highest ARC-052, origin/main's highest ARC-051) + 1`, with trunk fetched 2026-09-29 after #308 merged (origin/main `7bc586f`), so ARC-052 stands with no collision. |

No decision was written for the plain-`az` fallback: it is an implementation choice inside R-296a, recorded in `architecture.md` D1.

### Lessons Learned

#### A plan's paraphrase of a recorded decision is a claim to check, not a source

The PRD and execution plan said D-09 of the prior program states that `spell update` never installs a component. I repeated that in my first ARC-052 draft, with the wrong file for D-09 and the wrong anchor for ARC-045. Opening `features/upstream-intake-2026-09/PRD.md` showed D-09 is about `.gitattributes` only; the general position lives in the `initOnly` comment in `update.ts`, and a search found no earlier ADR stating it. I corrected the ADR and, in this close, the PRD and plan. An ADR that narrows a position is the worst place to get the position wrong.

#### A green test can be vacuous, and the fail-first run is the evidence

For R-CLOSE, the end-to-end regression passes on the old code too, and the exclusion changes no published report (`getCast` already ignores report-only commits). Only the unit test on `getCloseCommit` fails before the fix. I first wrote that the exclusion fixes #304; the commit it was meant to explain (`b43df06`) edited `TODO.md` too, so it is not report-only. The TODO and PRD were corrected. The author-date alternative was measured, not argued: it moved the published `upstream-intake-2026-09` report from 55 to 56, so it was dropped.

#### The security test covered the arguments; the review found the hole in the lookup

My metacharacter test proved no shell touches the arguments. The independent review found a different path: a relative `PATH` entry (`.`, `tools`) would have made the resolver read `az.cmd` from the working directory. A `shell:true` mutation and a guard-removed mutation now each fail a named test. When a mitigation names one threat, ask what else the new code reads from the environment.

#### Merged is not published, and an inferred release step was wrong

At close the PR was merged and the publish workflow was green, but the registry's `latest` still read `1.9.0` for a few minutes before it read `1.9.1`. Earlier in the close I inferred that publishing needed the operator to cut a Release; that was wrong, because "Release drift" creates the Release automatically. Reading `.github/workflows` and `gh release list` corrected it. Only the registry answers "is it published", and it can lag the workflow, so a first read that disagrees with a green run is a reason to read again, not to report either.

#### Deleting a worktree can delete the real `node_modules`

`git worktree remove --force` followed a `node_modules` junction and emptied the real directory (194 entries to 0). `npm ci` restored it; tracked files were untouched. Never `--force` a worktree that holds a junction; unlink the junction first.

### Open Items Carried Forward

- **Live Windows check** — `spell doctor` on the operator's Windows machine against an Azure DevOps remote must no longer warn "could not query". The stubbed test is CI's proof only, and the live test does not exercise the MSI launcher end to end.
- **ARC-052** — `Proposed`; the operator accepts it before Epic 2 starts.
- **Epic 2** (#294, #293) — not started, gated on ARC-052. Registered in `TODO.md` and the execution plan.
- **R-CLOSE second facet** — the rebase-merge committer-date drift is still open (cause inferred, not reproduced); the entry in `TODO.md` stays `[ ]`.
- **Registered in `TODO.md` this close:** `spell doctor`'s unowned-package check misses `--package=@example/...` and a single-string `command`, and its early return hides the missing-timeout warning; two `update.test.ts --user` tests time out at 5000 ms under full-suite load. (`up02-a-init-push-policy.test.ts` also failed here on clean `main`; `main`'s `08b6b0c` fixed it while this close was open, so it is not registered. `parseAdoRemote` percent-decoding was registered here too and shipped as `1.9.2` (`88df663`) from another session before this branch was pushed, so its item is closed on `main`.)
- **Pre-push hook** — needed the operator's per-branch `--no-verify` for Epic 1's push, because up02 and up03 failed the full suite here. up02 is now fixed on `main` (`08b6b0c`), and that commit reports the up03 failure did not reproduce on two clean Windows runs. A later push attempt (2026-09-29, this branch rebased on `main` at `1.9.2`, hook run without `--no-verify`) failed the hook with 4 failures of 2052 tests, all `Test timed out in 5000ms`: two in `test/push-safety.test.ts` (`undisabledRemotes names a remote added after the block was applied`, `recognises equivalent spellings of its own hooks path`) and two in `test/update.test.ts` (`--user`: `runs no git check and asks no retrofit question`, `--prune removes an orphaned store spell…`). up02 and up03 passed in that run, so the hook now fails on load timeouts, not on those two. Nothing was pushed by that attempt. Linux CI is the gate.
- **Four local `sync-backup/*` tags** — none on the remote; the operator decides whether to prune them.
