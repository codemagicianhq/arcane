# 2026-09-01 — WD-nn Phase 2 Audit Table Mislabeling Fix

## Session: Fix and ship the Phase 2 / WD-nn mismatch

### Prompt Context

The user opened with a fully-derived finding from their own work: while annotating ARC-023
enforcement modes onto `web-discoverability-standards.md`, they cross-checked every `WD-nn`
ID cited in `spell-make-discoverable.prompt.md`'s Phase 2 Audit table against that same ID's
actual rule text, and found that 8 of the 15 rows tested a different claim than the rule they
were labeled with. They laid out two possible fixes and asked which to take. After independent
verification, a plain-language walkthrough (the user asked to understand the problem before
deciding — "explain me in a way I can understand better"), and a root-cause investigation (the
user specifically asked whether this was a simple title/description mispairing), the user chose
the full fix, then said "merge it" once CI was green, then asked to close the session.

### What Got Done

1. Verified all 8 mismatches and the 7 correct matches independently against the primary
   source text — [web-discoverability-standards.md](../.arcane/governance/web-discoverability-standards.md),
   [spell-make-discoverable.prompt.md](../.github/prompts/spell-make-discoverable.prompt.md) —
   rather than trusting the user's account as-is.
2. Diagnosed root cause via git history: both files were authored together in one commit
   (`3417dbb`); the later ARC-023 annotation commit (`0cd7883`) only appended `Enforcement:`
   sentences and never touched rule content or the Phase 2 table — confirmed via `git show`,
   not assumed.
3. Found the same finding had already been discovered once, by a dispatched agent during that
   annotation commit's own work, and recorded as one sentence inside
   [PLAN.md](../docs/plans/become-current/PLAN.md)'s BC-29 Batch A closure entry — never
   promoted to a tracked item in `TODO.md` or `IDEAS.md`.
4. Confirmed (by checking whether each mismatched row's real counterpart existed *anywhere
   else* in the table) that this was not a simple label swap: for 7 of the 8, the correct test
   didn't exist under any label — it had never been written.
5. Implemented the fix via `spell-bug`: stripped the misleading `WD-nn` label from all 8 rows;
   wrote 2 new real Phase 2 checks for `WD-03` (dead/non-public routes returning a genuine
   404/410) and `WD-08` (robots.txt allow/disallow specificity) — the only 2 of the 8 whose
   real claim is mechanically HTTP-testable; upgraded those 2 rules' governance-doc Enforcement
   annotations to `structured spell gate (ARC-023)`; corrected the other 6 mismatched rules'
   Enforcement sentences to accurately state Phase 2 no longer cites them.
6. Added [test/web-discoverability-standards.test.ts](../test/web-discoverability-standards.test.ts)
   (6 tests) proving the fix and guarding the regression.
7. Ran `spell-bump`, `spell-commit-work` (fix + bump commits, proper attribution and trailers),
   pushed, and ran `spell-create-pull-request` — [PR #161](https://github.com/codemagicianhq/arcane/pull/161).
8. Mid-flight, `origin/main` advanced substantially from unrelated concurrent work (BC-30/BC-31,
   `0.29.6` → `0.32.2`) before the PR could be opened. Rebased cleanly, resolved a pure
   version-field conflict in `package.json`/`package-lock.json` (took the new base, then
   recomputed the bump fresh as `0.32.3` rather than trying to reconcile a stale number),
   re-verified the full suite, and re-pushed.
9. Operator merged [PR #161](https://github.com/codemagicianhq/arcane/pull/161) themselves —
   confirmed via `gh pr view` (`state: MERGED`, `mergeCommit: 3eaab13d…`,
   `mergedAt: 2026-09-01T20:08:30Z`) rather than trusted from the operator's own report. No
   self-merge was attempted: no `.arcane/agents.yaml` roster exists to establish the Magus+
   authority this repo's own merge-completion gate requires, so the exact merge command was
   handed to the operator instead, per `spell-create-pull-request`'s Authorization Gate.

### Decisions Made

None — this session applied and corrected an existing ARC-023 classification; it did not
introduce a new standing decision.

### Lessons Learned

#### A governance doc's own "Enforcement:" annotation can already be honest even when the thing it cites is wrong

The 8 mismatched Phase 2 rows looked, from a distance, like undiscovered drift between the
governance doc's annotations and reality. They weren't: the annotation sentence for every one
of the 8 already said, explicitly, "Phase 2 table cites WD-nn for X, a different check." The
actual defect was narrower than it first looked — the *checklist's row labels* were misleading,
not the governance doc's account of them. Worth checking both directions (does the annotation's
claim match Phase 2? does Phase 2's label match the rule?) before assuming a mismatch means the
more-detailed document is the one that's wrong.

#### A finding already existing doesn't mean it's tracked

The exact 8-of-15 count had already been found and written down — one sentence, inside a
closure paragraph in `PLAN.md` — a full day before this session re-derived it from scratch by
hand. `TODO.md` and `IDEAS.md` had nothing. "Filed as a follow-up" inside prose is not the same
as a tracked, findable item; worth grepping the tracked surfaces before treating any finding as
new, even one that feels like fresh discovery.

#### Not every governance rule that's "wrongly tested" can become "correctly tested"

Of the 8 mismatched rules, only 2 (WD-03, WD-08) could actually gain a real Phase 2 check — the
other 6 are advisory for reasons independent of Phase 2's labeling (an injection layer that's
architecturally unobservable from outside, a design judgment call, a check that would require
reading internal code paths this spell's black-box HTTP-fetch approach can't reach). Fixing a
row's label doesn't by itself earn a rule "structured spell gate" status; each one needs its own
verifiability check first, or the "fix" just relocates the same false confidence.

#### This worktree needed its own `npm install`/`npm run build` before the pre-push hook could ever pass

Neither existed here at session start. Everything resolving via normal `npm run` (which walks
up to the parent checkout's `node_modules`) worked fine; the small number of tests and hooks
that hardcode a `process.cwd()`-relative path to `node_modules/tsx` or `dist/index.js` failed
for reasons entirely unrelated to code correctness. Fixed directly rather than bypassing the
hook (`--no-verify` was never used). Flagged separately as its own finding since it will recur
in any worktree that skips this step — a peer session (`jolly-curran-505074-4e`) has since
drafted and verified a proper code-level fix (ancestor-directory path resolution instead of the
hardcoded assumption; 28 failed/109 passed → 0 failed/143 passed), still awaiting its own
operator's commit approval as of this session's close.

#### A full-suite run under fresh, cold caches produces real but non-reproducible timeouts

`test/prompt-drift-classification.test.ts`'s subprocess-spawning tests hit the 15s timeout
twice, on two different sub-tests, only when running inside the full 1000+-test suite
immediately after a fresh install/build — both passed cleanly and quickly (1-2s) in isolation
every time this was checked. Treated as load-induced flakiness and retried, but only after
independently confirming reliability in isolation first — never assumed.

### Open Items Carried Forward

- **Worktree test-infrastructure fix** — in progress in a peer session
  (`jolly-curran-505074-4e`, its own worktree at `.claude/worktrees/jolly-curran-505074`).
  Status per their own direct report at this session's close: fix drafted and verified,
  awaiting their operator's commit approval — no commit or PR yet. Not this session's own
  deliverable; tracked there, not duplicated here.
- **`ai-context/system-prompt-context.md`'s "Current Priorities" section is stale** — still
  names BC-01 as the "next eligible epic," but BC-30/BC-31 have already shipped per `git log`.
  Out of scope to fix from this session (would require auditing the full current epic state
  across the become-current plan); flagged for whoever next runs that loop.
- **`docs/runnable-fences-selfhosted-agents`** — a local branch, not attached to any worktree.
  `git cherry main docs/runnable-fences-selfhosted-agents` shows one `+`-flagged (not
  patch-id-matched) commit. Not verified further this session — needs the resulting-content
  check before any deletion decision, per `git-conventions.md`'s own caveat that a `+` flag
  alone can be a false negative.
