# 2026-09-28 — Upstream Intake 2026-09: nineteen issues planned, seventeen shipped in four waves

Related: [[development-methodology]] (the Spell Loop each wave ran), [[git-conventions]] (the
rebase-and-fast-forward policy the stacked-PR syncs had to respect), [[agent-policies]] (the
multi-agent lane rules the parallel waves followed).

## Session: plan every open issue, run the waves overnight, then land them one by one

### Prompt Context

Opened with `spell-open-session` on 2026-09-25 in a cloud session. After a small root-user test fix
(#284), the operator asked for "a plan to tackle all 19 issues submitted into arcane's repo … a single
prd to fix them all leveraging arcane's spell loop full cycle, and leveraging the subagents when
possible to run stories in parallel". The plan was set by the operator's answers:
- one PR per wave;
- the PRD's decision defaults accepted;
- #271 to be fixed upstream in `arcane-ui`;
- the operator merges every wave.

At 3 a.m. on 2026-09-27 they asked for an unattended overnight run, and answered four questions up front:
- "Stacked PRs, no merges";
- the ADRs accepted "if faithful";
- the Mermaid probe answered "as text, with a copy button";
- "Skip both tonight" for #267 and #271.

On 2026-09-28 they merged the stack wave by wave, asked for the stacked-PRs idea to be saved, then
"do the cleanup and record the program". Last came the question of finishing #267 and #271 now. The
operator said `arcane-ui` is a private Azure DevOps repository, and chose to document the state for a
local session instead.

### What Got Done

1. **Root-user test guard** ([PR #284](https://github.com/codemagicianhq/arcane/pull/284)).
   `test/manifest.test.ts` skips its permission assertions when running as uid 0, which is how this
   cloud container runs.
2. **UP-00: plan, PRD, queue and delegation**
   ([PR #285](https://github.com/codemagicianhq/arcane/pull/285)). It created
   `docs/plans/upstream-intake-2026-09/` and `features/upstream-intake-2026-09/PRD.md`, ranking all
   19 open issues, and added the `upstream-intake-2026-09-plan` delegation record.
3. **UP-01: decisions** ([PR #286](https://github.com/codemagicianhq/arcane/pull/286)). It added ARC-049,
   ARC-050 and ARC-051, and replaced ARC-036's unverified rendering claim with a matrix. Closes #270.
4. **UP-02: 1.6.0** ([PR #287](https://github.com/codemagicianhq/arcane/pull/287)). Four parallel
   lanes. The main change: `spell block-push` finally enforces a recorded `blocked` policy. Closes #280,
   #262, #269, #278, #277 and #261, plus #282's CLI half.
5. **UP-03: 1.7.0** ([PR #288](https://github.com/codemagicianhq/arcane/pull/288)). Four lanes: registry
   changes explained on `spell update`, a line-ending baseline in every profile, the idea lifecycle, and
   safe decision numbering. Closes #279, #281, #265, #268, #263, #275, #264, #274 and #282.
6. **UP-04: 1.8.0** ([PR #289](https://github.com/codemagicianhq/arcane/pull/289)). A `## ⚠ Needs you`
   block in 16 spells and a `Needs you` handoff field. Closes #266.
7. **Every wave passed an independent adversarial review before its PR opened.** The reviews found
   three blocking issues in UP-02 and one major regression in UP-03, all fixed before push.
8. **All four waves were built overnight as stacked PRs, then synced one at a time.** As each wave
   merged, `spell-sync-pull-request` moved the next onto `main`. Each sync verified the rebased tree was
   byte-identical to the reviewed one, so CI's green result applied to exactly what had been reviewed.
9. **Published and confirmed on npm.** `npm view arcane-cli versions` lists 1.6.0, 1.7.0 and 1.8.0,
   and `latest` is 1.8.0.
10. **Stacked-PRs idea saved** to `IDEAS.md` ([PR #290](https://github.com/codemagicianhq/arcane/pull/290)).
11. **Program recorded** ([PR #291](https://github.com/codemagicianhq/arcane/pull/291)):
    - UP-01 to UP-04 ticked in the plan, each with its report line;
    - #271's lane split out as UP-06;
    - OPERATOR-QUEUE gained Q-008.
12. **Cleanup.** 10 lane worktrees and 17 local branches were removed. Each branch was checked by
    `git cherry` against `main` first; all had every commit already there. The 6 `sync-backup/*` tags
    are kept for the operator.

Result: 17 of 19 issues closed. #267 and #271 remain (see Open Items).

### Decisions Made

| ADR | Decision | Rationale |
|---|---|---|
| ARC-049 | Enforce a recorded push policy after init with `spell block-push`, and have every pushing spell honour `guarded` and `blocked` | A `blocked` recorded by `spell update` was never enforced, and nothing could enforce it (#280) |
| ARC-050 | Allocate decision numbers from the maximum of this branch and the fetched trunk; a duplicate-ID check runs in CI | Parallel sessions collided on "the next number" (#264) |
| ARC-051 | Two placeholder classes: runtime-resolved (listed once) or fill-in (`status: template`); `spell doctor` warns only | The placeholder check needed a taxonomy that doesn't flag legitimate runtime tokens (#277) |

All three were already merged in #286 under the operator's "Yes, if faithful" pre-authorization. None
is allocated or re-numbered at this close.

### Lessons Learned

#### A stale `dist/` fails tests, and the previous handoff had already said so

While restacking #288 and #289, both pushes were refused by the pre-push hook: 4 failures each, all in
tests that run the built CLI. The cause was switching branches without running `npm run build`, so
those tests ran the UP-02 build against UP-03 source. The 2026-09-13 handoff's note (3) said exactly
this: "Any test that spawns `dist/index.js` tests whatever was built last: rebuild before trusting a
failure". The note was read at session open and still not applied three days later. A note is too
weak for this. The test helper could compare `dist/`'s version with `package.json`'s and fail with
"rebuild first" instead of a misleading assertion.

#### A plan-coined epic ID must match what the report parser reads

The plan's UP-04 rule said a deferred lane "becomes UP-04b". The Show Report's epic pattern
(`src/modules/show-report/plan-parser.ts:64`) is `[A-Z]+-\d+`, so "UP-04b" is not an epic. Its bullet
was silently folded into UP-04's block, and the regenerated report simply lacked it. I only caught it
because the unwritten-epics warning listed UP-05 alone. The epic is now UP-06. The parser should warn
on a `- [ ] **…**` bullet it cannot read as an epic, instead of absorbing it.

#### An active program's report taxes every unrelated PR

While a plan has no `completed:` date, its Show Report counts every commit on `main`
(`src/modules/show-report/model.ts`). So #290, one `IDEAS.md` line, failed the golden test until it
regenerated the report, and its commit counts as program work. This is designed behaviour, but its
cost grows with how long a program stays open. Recorded as OPERATOR-QUEUE Q-008.

#### Ask where an external repository lives before routing access to it

To unblock UP-06, I checked GitHub for `arcane-ui`, found nothing, and told the operator to install
the Claude GitHub App on it. It is a private Azure DevOps repository. I had assumed the host from this
repository's host. The plan now records where it lives. Any plan step that depends on another
repository should name its host and access path when it is written.

#### A merge-state check is true only at the moment it ran

The operator said "merged 288". I checked, found it open, and said so. It merged about twenty seconds
later. Both statements were true when made. Reporting the check's time with its result, or re-checking
before acting on it, avoids sounding like a contradiction.

### Open Items Carried Forward

- **UP-06 (#271).** Needs OPERATOR-QUEUE Q-006, the theme change in `arcane-ui` (Azure DevOps,
  private). Run it from a local session with ADO access, then re-vendor here. Tracked in
  `docs/plans/upstream-intake-2026-09/PLAN.md ("UP-06 — Show Report theme (UP-04's lane A, split out)")`.
- **#267.** Needs the Q-004 probe on the operator's local Claude Code client. If it reproduces: D-06
  ADR, then the recovery work. If it doesn't: close #267 as not reproducible, with the probe record.
- **UP-05 (close).** Runs after both of the above. It writes `completed:`, which also resolves Q-008.
- **Operator queue.** Q-007 is waiting for the operator to mark it done, since all four waves merged.
  Q-008 needs an answer, or becomes moot once UP-05 runs.
- **Not from this session, left alone.** 6 `sync-backup/*` tags (the operator's to delete), and two
  remote branches from 2026-08-15 (`ef34-gitdir-contamination`, `queue-failfast-doclink-ideas`).
