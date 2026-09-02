# 2026-09-02 — Lessons Hardening: Full Program, LH-00 Through LH-13

## Session: Front-load the operator's blocking decisions, then run the entire program autonomously

### Prompt Context

Continuing from a prior context window (summarized, not re-narrated here) that had drafted the
Lessons Hardening plan — [docs/plans/lessons-hardening/PLAN.md](../docs/plans/lessons-hardening/PLAN.md),
a follow-on to Become Current mechanically hardening the 12 recurring correction patterns three
audits of that program's own record had found. The operator approved the plan with full autonomy
for every epic except three named exceptions requiring their own hand: merging LH-00, approving
RCA-001 (Q-002), and accepting the ARC-041 ADR (Q-003).

After LH-00's PR was reported ready, the operator merged it themselves and wrote, verbatim:
**"i merged it, go ahead and continue autonomously but im going to bed now, what if you ask the
questions now and do the whole thing?"** — front-load any decision they'd otherwise need to give
later, then run the entire remaining program (LH-02 through LH-13) continuously and
autonomously, stopping only where a decision was structurally impossible to front-load. Two
`AskUserQuestion` answers followed immediately (ARC-041: adopt it, default to
`~/.arcane/org-tokens`), recorded in `OPERATOR-QUEUE.md` ahead of LH-11 drafting the ADR itself.
No further messages arrived after that; the operator went to bed as stated, and this window
executed LH-02 through LH-13 without stopping.

### What Got Done

1. **Recorded the operator's ARC-041 pre-decision** ahead of LH-11 drafting the ADR —
   [PR #173](https://github.com/codemagicianhq/arcane/pull/173).
2. **LH-02 — RCA-001 + RCA artifact path.** Amended `rca-process-standard.md`'s Artifact Location
   to `docs/rcas/`; wrote this repo's first RCA,
   [RCA-001](https://github.com/codemagicianhq/arcane/pull/174) (static tree-state claims + the
   CI-only org-token gate). **Opened as [PR #174](https://github.com/codemagicianhq/arcane/pull/174)
   and deliberately left unmerged all session** — RCA review is never auto-committed (Q-002); every
   epic since branched from a `main` that never received this PR's own fixes, discovered and
   reapplied on the record three separate times (LH-02 itself, LH-04, LH-11) rather than assumed
   fixed. A closing commit was pushed to this same still-open PR during LH-13 (below).
3. **LH-03 — test-suite resilience helpers** —
   [PR #175](https://github.com/codemagicianhq/arcane/pull/175). Retrying fixture cleanup, prose-
   assertion helpers, named per-test timeout constants (no global `testTimeout`), an ESLint rule
   scoped to `test/**` enforcing both.
4. **LH-04 — coverage thresholds evaluated in CI** —
   [PR #176](https://github.com/codemagicianhq/arcane/pull/176). `ci.yml` now runs
   `test:coverage`, not bare `test`.
5. **LH-05 — derived counts** — [PR #177](https://github.com/codemagicianhq/arcane/pull/177).
   Replaced hand-typed spell/agent/governance counts with registry-derived expectations. Found and
   fixed a real bug along the way: `registry.test.ts`'s `toHaveLength(25)` passed by two miscounts
   in `src/config/profiles.ts` canceling out (missing `records-conventions`, wrongly including
   `agent-output-instructions`).
6. **LH-06a/b — build-gate correctness** —
   [PR #178](https://github.com/codemagicianhq/arcane/pull/178) (`check-version-bump --staged`,
   wired into `spell-bump` and `.husky/pre-push`) and
   [PR #179](https://github.com/codemagicianhq/arcane/pull/179) (`expandFragment` throws on a
   start/end marker indentation mismatch).
7. **LH-07 — line-citation hygiene** — [PR #180](https://github.com/codemagicianhq/arcane/pull/180).
   Stable-locator citation grammar in `agent-output.instructions.md`; `scripts/check-citations.ts`,
   warn-mode in `ci.yml`. First design flagged 452 false positives (any backtick-wrapped filename);
   narrowed to citations carrying an anchor, quoted phrase, or line number — 30 genuine findings,
   converted.
8. **LH-08 — shipped-state staleness scan** —
   [PR #181](https://github.com/codemagicianhq/arcane/pull/181). `scripts/check-stale-claims.ts`:
   Class A (ADR status claims vs. `DECISIONS.md`) ships as a real fail-mode gate; Class B
   (advisory phrase report) feeds `spell-check-drift`.
9. **LH-09 — follow-up promotion gate** —
   [PR #182](https://github.com/codemagicianhq/arcane/pull/182). `scripts/check-followups.ts`
   flags a deferral phrase with no nearby tracker token. A paragraph-level first design would have
   missed its own known true positive (314 characters from an unrelated mention inside one
   12,674-character paragraph); fixed with a 150-character window instead.
10. **LH-10 — three advisory conduct rules (25–27)** —
    [PR #183](https://github.com/codemagicianhq/arcane/pull/183), added to
    `universal-agent-rules.md`: never quote a denylisted token while documenting its removal; a
    zero-match search is evidence about the pattern, not the thing; dispatched-agent supervision.
11. **LH-11 — ARC-041 (Accepted)** —
    [PR #184](https://github.com/codemagicianhq/arcane/pull/184). A local, out-of-repo org-token
    file source (`$ARCANE_ORG_TOKENS_FILE` or `~/.arcane/org-tokens`) additive to the CI-only
    `ARCANE_ORG_TOKENS` secret, with a hard structural refusal of any path resolving inside the
    repository. Drafted and accepted in the same PR per the operator's own pre-decision and its
    explicit allowance to do so.
12. **LH-12 — local denylist implementation** —
    [PR #185](https://github.com/codemagicianhq/arcane/pull/185). `resolvePrivateTokens()` made
    async with the new file source; `scripts/check-staged-org-tokens.ts` wired into
    `.husky/pre-commit`; `spell ward --terms-file`. Two real bugs caught by the test suite itself
    (not assumed fixed): the async conversion broke two un-awaited test call sites (typecheck
    stayed clean; the actual test run failed hard), and a first "refuses an in-repo file" test was
    vacuously passing against the real checkout rather than its own fixture.
13. **LH-13 — Definition-of-Done audit and program close** —
    [PR #186](https://github.com/codemagicianhq/arcane/pull/186). Walked all 7 DoD criteria against
    the live tree with direct evidence (full detail in `PLAN.md`'s own LH-13 entry); appended a
    verification-ledger section for LH-02→LH-12's 7 corrections; pushed RCA-001's real
    Preventive-Action PR references to the still-open PR #174; ran `spell-check-drift` for a real
    **GO** verdict; found and fixed `OPERATOR-QUEUE.md`'s own stale Q-001 line (still read `[ ]
    open` after the operator's actual merge).

### Decisions Made

| ADR | Decision | Rationale |
| --- | --- | --- |
| ARC-041 | A local, out-of-repo file may supply org-token denylist entries alongside the CI-only `ARCANE_ORG_TOKENS` secret, with a hard structural refusal of any in-repo path. | Closes the gap that let a real client name leak into shipped content twice in immediate succession with no local way to catch it before pushing, without weakening ARC-031's "the denylist must not leak itself" guarantee. Operator-decided in conversation ahead of LH-11 drafting the text; recorded as `Accepted` in the same PR per that decision's own explicit allowance. |

### Lessons Learned

**A program about static-drift caught a live instance of its own top pattern in its own queue at
closing time.** LH-13's audit found `OPERATOR-QUEUE.md`'s Q-001 line still reading `[ ] open`
after the operator had already merged LH-00 hours earlier — nobody had gone back to flip it once
the merge landed. Caught only by directly re-checking `gh pr view 172` rather than trusting the
file, exactly the discipline this whole program exists to make routine. Fixed on the record rather
than quietly.

**"Continue autonomously, do the whole thing" meant one continuous session, not the KICKOFF
protocol's literal shape.** `docs/plans/lessons-hardening/KICKOFF.md` says "one epic per session,
always," pasted fresh each time, with `spell-close-session` (including a journal entry) after
every iteration. The operator's actual instruction asked for one uninterrupted run instead, and
that is what happened — 12 epics, one session, zero journal entries until this one. Recording
each epic's outcome directly in `PLAN.md`'s own "Done:" notes covered the record-keeping need in
the moment; the discrete-session shape KICKOFF.md describes never applied here, and this entry is
the one, honest journal write that session boundary was always going to need — not backdated
into 12 entries describing sessions that didn't happen.

**A false positive can hide inside the very row describing the bug it's about.** Re-running
`check:followups` during LH-13's own audit against the freshly-written verification-ledger
section found two hits on that section itself: one matched "followup" only because it substring-
matches the tool's own filename (`check-followups.ts`) mentioned in a ledger row; the other missed
a same-row tracker token (`BC-30`) because a wide markdown table row exceeds the checker's
150-character window. Neither is a real untracked deferral — both are disclosed limitations of a
warn-mode tool still short of its own stated flip criterion, not gaps to paper over or silently
re-word away.

**Two-track verification held throughout.** LH-12's async conversion of `resolvePrivateTokens()`
stayed typecheck-clean while breaking two test call sites at runtime — the same "a green typecheck
is not evidence of correctness" lesson Become Current closed on, now caught a second time by
actually running the suite rather than trusting the compiler.

### Open Items Carried Forward

- **Q-002 — approve and merge RCA-001.** [PR #174](https://github.com/codemagicianhq/arcane/pull/174)
  is open, CI-green, and complete (including LH-13's closing update to its Preventive Actions
  table). Correctly not self-merged — RCAs are never auto-committed. This is the program's one
  remaining item; registered natively in
  [OPERATOR-QUEUE.md Q-002](../docs/plans/lessons-hardening/OPERATOR-QUEUE.md#q-002--approve-and-merge-rca-001),
  not a new tracking surface.
- **The ARC-014 citation bug in `DECISIONS.md`'s ARC-031 "Related" line** (found while drafting
  ARC-041) has no epic to route to — disclosed explicitly in its own `TODO.md` entry as a
  deliberate, unrouted exception needing its own future investigation, not silently dropped.
- **`check:citations` and `check:followups` stay in warn mode**, per
  `docs/plans/lessons-hardening/PLAN.md`'s own Definition-of-Done Criterion 1 — their stated
  5-session zero-false-positive flip criterion is honestly unmet after one session (this one), not
  silently left ambiguous. `(untracked: the criterion itself, already written in PLAN.md, is the
  tracker — no separate TODO.md item needed to remember a self-stated threshold)`.
