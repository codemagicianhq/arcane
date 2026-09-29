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
