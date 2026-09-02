---
title: Lessons Hardening — Mechanical Enforcement for the Become Current Corrections Inventory
status: active
created: 2026-09-02
baseline: b0992c1 (main)
owner: operator (payini)
executor: Arcane autonomous loop (one epic per session)
---

# Lessons Hardening — Mechanical Enforcement for the Become Current Corrections Inventory

The Become Current program (BC-00…BC-32, closed 2026-09-01) was the most intensive dogfooding Arcane
has had. Three read-only audits of its record found roughly 100 distinct "we believed X, checked, X
was wrong" corrections, collapsing into 12 recurring patterns — and the closure pass that inventoried
them introduced fresh instances of the top pattern while writing it down (stale line-number pointers
in a section written the same day; a note pointing at a section that doesn't exist; a Phase 0 pass on
*this very program* that found its own drift again within 24 hours). The root cause is structural, not
carelessness: **facts about the tree get written as static text that nothing re-derives.** A second
root cause: the org-token privacy gate is CI-only, so the natural way to document a leak's removal
re-triggers it — three times in one session.

This program converts that inventory into mechanical enforcement wherever feasible, honestly labeled
advisory where it isn't (per ARC-023's enforcement-mode ethos), and parks what has no forcing function.
See [`docs/verification-ledger.md`](../../verification-ledger.md)'s 2026-09-02 entry for the checked
claims this program is built from, and [`TODO.md`](../../../TODO.md)'s items tagged "Routes to LH-NN"
for the mechanical findings behind each epic.

## Definition of Done

1. `npm run check:citations`, `check:stale-claims`, and `check:followups` exist, run in `ci.yml`'s
   `build-test` job, and pass on `main` in fail mode — or LH-13 records exactly why one stays in warn
   mode (criterion unmet, with the false-positive count).
2. `docs/verification-ledger.md` has its 2026-09-02 section plus any added along the way, and every
   `corrected` row's correction is shipped or carries a tracker token (mechanical via `check:followups`
   scanning the ledger's Correction column).
3. `grep -nE "toHaveLength\((1[0-9]|[2-9][0-9])\)" test/*.test.ts` returns only justified lines; the
   README's spell/agent/governance counts are marker-generated and `npm run check:spell-catalog` passes.
4. `ci.yml` runs `npm run test:coverage` and it passes on `main` — or `vitest.config.ts`'s thresholds
   and `testing-standards.md`'s annotations honestly match what CI actually evaluates.
5. Every ID in the Coverage Map below is `[x]` with a PR (and version if bumped) or an explicit Park
   with reason; `TODO.md` has no unchecked item this program added without a named epic.
6. `docs/rcas/RCA-001-*.md` exists, its approval is marked done in OPERATOR-QUEUE.md, and every
   Preventive Action row names a merged PR.
7. `spell-check-drift` reports **GO** with zero Critical/High after the last epic; `check:citations`
   reports zero bare `file.md:NNN` citations anywhere under `docs/plans/lessons-hardening/`.

## Authority & Delegation

This repository has no installed agent roster, and `agent-policies.md` fails closed: missing authority
⇒ human execution required for commit and merge. As with Become Current, the operator resolves that
explicitly for this program:

> **Standing delegation, recorded explicitly in [`.arcane/delegations.json`](../../.arcane/delegations.json)
> (id `lessons-hardening-plan`), listable via `spell doctor`, revocable by editing or removing that
> entry:** sessions executing epics of this plan may — without per-action approval — create session
> branches, commit, push, open PRs, and merge their own PRs into `main` via the sanctioned strategies
> (merge/rebase, never squash), for work scoped to an epic defined in this plan. **The grant activates
> only once the operator merges LH-00** — until then, work on this plan is interactive/operator-merged,
> the same way Phase 0 was.

**Explicitly outside the grant** (always queue, never perform) — `.arcane/delegations.json`'s
`excludedActions` for this entry is the source of truth; summarized here for readability:

- Any GitHub/ADO **platform-settings mutation**: rulesets, required checks, `allow_auto_merge`, repo
  settings, secrets, webhooks.
- Deleting or force-resetting any branch that holds content not on `main` (content-verified via
  `git cherry` + diff, not ancestry).
- Manual `npm publish` or `workflow_dispatch` of publish/release workflows (the automatic version-bump
  → `release-drift.yml` → `publish.yml` chain is sanctioned and expected).
- **Accepting an ADR** — ARC-041 (LH-11) is drafted `Proposed` and stays that way until the operator
  accepts it via OPERATOR-QUEUE.md Q-003.
- **Approving an RCA** — RCA-001 (LH-02) is never auto-committed; the operator merges it via Q-002.
- Marking anything in OPERATOR-QUEUE.md as approved/done — operator-only.
- Anything in `.arcane/governance/agent-policies.md`'s prohibited list (MCP/security config, etc.).

## Standing Constraints (digest — full text in the cited sources)

Identical invariants to Become Current — these are repo-wide, not program-specific:

- **Serial by construction.** Any change under `src/assets/`, to `src/modules/registry.ts`, or
  `src/config/profiles.ts` requires a `package.json` version bump differing from `main`
  (`scripts/check-version-bump.ts`; prose home `project.md:56-58`). Epics touching `src/assets/` run
  one at a time, sequentially — never two concurrent worktree epics in this repo (ARC-028 R4).
- **Every merged bump publishes.** `release-drift.yml` auto-creates the release on a `package.json`
  version change on `main`; `publish.yml` publishes to npm with provenance. Batch each epic's
  `src/assets/` changes into ONE PR.
- **PR-only, no squash, rebase-before-PR.** Required checks: `Lint, typecheck, test, build`, `PR
  branch is rebased on target`, `Review round clear`. Pre-PR guard: `git fetch origin && git rebase
  origin/main && git push --force-with-lease`.
- **Hooks are slow by design.** `.husky/pre-push` runs the full test suite; budget for long pushes.
- **Session lifecycle.** Every iteration: `spell-open-session` → work → `spell-close-session`. Session
  branches: `sessions/YYYY-MM-DD-<topic-slug>`.
- **Attribution trailers** on every commit per [[git-conventions]].
- **Working protocol** (root `CLAUDE.md`): verify before asserting; checked ≠ inferred ≠ told; a green
  test suite is not itself evidence.
- **No global `testTimeout`, ever** — rejected on the record (Become Current, lesson E28); LH-03's
  fix is per-test named budgets, not a global bump.
- **No `docs/intake/batch-002/` or `EF-37`** — reserved for a genuine independent external submission
  (EF-18); spending it on internal findings destroys that experiment.

## Loop Protocol (one epic per session)

1. **Open:** run `spell-open-session` with focus `lessons-hardening: <next epic id>`. Consume any
   handoff. If drift check reports HIGH → fix or queue before proceeding.
2. **Select:** the topmost unchecked epic whose dependencies are satisfied and which is not blocked on
   OPERATOR-QUEUE. Skip LH-12 while ARC-041 is `Proposed`. Check `git worktree list` for footprint
   overlap (`arcane-arc028` is a known bystander, not this program's — leave it alone).
3. **Empirical-first:** run the epic's named empirical-first step *before* building. If it contradicts
   the epic's premise, correct the epic entry on the record and proceed against the tree, not the text.
4. **Execute** per the epic's **Route** (`direct` / `chain` / `adr` / `process` — same meanings as
   Become Current's Loop Protocol).
5. **Cite by stable locator** — a heading anchor or a unique quoted phrase — never a bare `file:line`,
   in every durable artifact this program touches. This plan is the first thing that convention applies
   to.
6. **Ship:** rebase, PR, wait for required checks, merge under the grant (RCA and ADR-drafting PRs are
   operator-merged regardless of epic route). One epic = one PR unless the epic says otherwise.
7. **Record:** tick the epic's checkbox here with PR (and version if bumped); close the `TODO.md`
   item(s) this epic routes from; mark `IDEAS.md`; append operator items to `OPERATOR-QUEUE.md`; update
   `docs/rcas/RCA-001-*.md`'s Preventive Actions row once LH-02 has created it.
8. **Close:** `spell-close-session` — its follow-up-promotion sweep (LH-09, once shipped) must be
   clean; if a claim was corrected this session, run `spell-verification-ledger` first.
9. **Halt conditions** (end the loop, leave a clean handoff): two consecutive epics halted; drift check
   NO-GO beyond autonomous repair; a required check failing on `main`; everything remaining is
   operator-blocked.

## Danger Gates & Operator Queue

[OPERATOR-QUEUE.md](OPERATOR-QUEUE.md) is the single mutable surface between loop and operator. The
loop **appends** fully-prepared entries; the operator executes/approves and marks them done. Seeded
today with: **Q-001** (merge LH-00 — activates the grant above), **Q-002** (approve/merge RCA-001),
**Q-003** (accept/revise/reject ARC-041).

---

## Wave Plan

Status legend: `[ ]` open · `[x]` done (PR#) · `[P]` parked on operator queue.

### Wave 0 — Bootstrap

- [ ] **LH-00 — Commit this plan.** This document + KICKOFF.md + OPERATOR-QUEUE.md + the
  `lessons-hardening-plan` delegation record, via PR (the IDEAS.md citation-drift status flip already
  shipped in LH-01/PR #171, not here — corrected on the record during LH-00's own commit prep).
  Merging it activates the delegation grant. Route: direct. Size S. Bump: no (docs only, outside
  `src/assets/`). **Operator merges this one** — see Authority & Delegation above.
- [x] **LH-01 — Phase 0 capture and live-drift fix (scoreboard entry).** The actual work
  ([PR #171](https://github.com/codemagicianhq/arcane/pull/171)) already shipped ahead of this plan
  existing, exactly as Become Current's own BC-00 commit-the-plan pattern allows for prerequisite
  work — this entry exists so it is tracked, not narrated. Route: process. Size S. Bump: no.
  **Done:** [PR #171](https://github.com/codemagicianhq/arcane/pull/171), merged 2026-09-02 —
  verification ledger's first section (15 rows), `TODO.md`/`PLAN.md`(become-current)/
  `system-prompt-context.md`/`README.md` live-drift fixes, 5 new TODO items + 1 idea routed to their
  epics below.

### Wave 1 — Root cause record and test substrate

- [ ] **LH-02 — RCA-001 and the RCA artifact path.** Closes the shared root cause behind patterns
  P1/P2/P4/P5/P11 (static text nothing re-derives) plus a second root-cause row for P7 (a CI-only gate
  with no local enforcement path). Route: direct. Size S. Bump: patch (`rca-process-standard.md`
  ships). **Mechanism:** amend the standard's Artifact Location from `governance/rcas/` to
  `docs/rcas/` (consistent with ARC-019's ownership model and `docs/research/`'s precedent from BC-24;
  `governance/rcas/` collides with `portable-bootstrap.md`'s "do not create a duplicate root
  `governance/` tree" rule — see `docs/verification-ledger.md`'s 2026-09-02 `unverifiable` row); write
  `docs/rcas/RCA-001-<slug>.md` in the standard's own template, Preventive Actions naming LH-03…LH-10 by
  ID. **Operator-merged (Q-002)** — RCAs are never auto-committed. **Empirical-first:** grep `src/`,
  `test/` for `governance/rcas` references before renaming anything.
- [ ] **LH-03 — Test-suite resilience helpers.** Closes P3 (13×: vitest 5000ms default under
  full-suite contention, Windows `ENOTEMPTY` temp-dir races) and P5 (8×: line-wrap-fragile
  `toContain` assertions). Owns `TODO.md`'s parked Windows `ENOTEMPTY` sub-item. Route: direct. Size M.
  Bump: no (`test/`, `eslint.config.js`, `CONTRIBUTING.md` only). **Mechanism:** (a)
  `test/helpers/fixture-dir.ts` — `createFixtureDir`/`removeFixtureDir` using
  `fs.rm(dir, { recursive, force, maxRetries: 5, retryDelay: 200 })` (Node's built-in EBUSY/ENOTEMPTY
  retry), re-exported from `test/helpers/git-fixture.ts`; migrate the ~36 test files / ~58 hand-rolled
  `rm` sites. (b) `test/helpers/prose.ts` — `normalizeProse`/`expectProseToContain`, lifting
  `lineContaining`/`blockContaining`/`expectNotNegated` already built in
  `test/prompt-worktree-vantage-check.test.ts`; migrate the governance/prompt-doc assertion files that
  broke in BC-24/27/29. (c) `test/helpers/timeouts.ts` → `HEAVY_TEST_TIMEOUT = 15_000` replacing the 13
  literals across 4 files — a named per-test budget, explicitly **not** a global `testTimeout`.
  **Enforcement (executable):** ESLint `no-restricted-syntax` scoped to `test/**` flagging direct
  `rm`/`rmSync` outside `test/helpers/` and numeric-literal `it()` timeouts. **Empirical-first:**
  stress-reproduce the `ENOTEMPTY` race before/after `maxRetries`; prove each lint selector hits exactly
  the known sites and nothing else.
- [ ] **LH-04 — Coverage thresholds evaluated in CI.** Closes the gap `testing-standards.md` already
  documents: `vitest.config.ts` thresholds are configured but `ci.yml` runs bare `npm test`, never
  `npm run test:coverage`. Route: direct. Size S. Bump: patch (the standard's annotations change).
  **Empirical-first branches the epic:** run `npm run test:coverage` on `main`; if thresholds pass,
  switch CI's Test step and relabel both annotations "evaluated in CI"; if they fail, raise coverage or
  lower/exclude honestly in `vitest.config.ts` with a comment, record it, then wire. Keep pre-push at
  `npm test`.

### Wave 2 — Mechanical gates

- [ ] **LH-05 — Derived counts.** Closes P4 (12×: the spell count alone moved 33→41 inside one
  program, with 5 separate manual "bump the literal" test fixes). Route: direct. Size S-M. Bump: no.
  **Mechanism:** replace literal counts with registry-derived expectations preserving each test's
  stated intent — `docs-profile-registry-split.test.ts`, `registry.test.ts`, `dedup-rule.test.ts`
  (`max == 24` → assert uniqueness + rule 23 exists, so LH-10's new rules don't break it). README
  tagline + governance-doc list: extend `scripts/spell-catalog.ts` to render spell/agent/governance
  counts into a named marker span using `expandFragment` from `src/modules/spell-compiler.ts` —
  `check:spell-catalog --check/--fix` then guards it for free. Precedent: `cli-unknown-command` test
  already derives from `program.commands` (BC-08). **Enforcement:** ESLint selector flagging
  `toHaveLength(<numeric ≥10>)` in tests without a justified `eslint-disable`. **Empirical-first:**
  evaluate every derived expression against the current tree (41/40/25/12) before deleting a literal.
  Ask the operator in-PR whether they want to own the README tagline sentence.
- [ ] **LH-06 — Build-gate correctness (2 PRs).** Closes G1 + G2. (a) `scripts/check-version-bump.ts
  --staged`: union the merge-base diff with `git diff --cached --name-only` (+ `--working-tree`); CI
  default unchanged; `spell-bump` Step 1 switches to staged mode; `spell-commit-work` Step 2 gains a
  distributable-change halt; `.husky/pre-push` runs `check:version-bump` (everything is committed
  there — the correct basis). Extend `test/version-bump-gate.test.ts` with a staged-only fixture;
  verify offline (no `origin/main`) is a skip-with-warning, not a false pass. (b) `expandFragment`
  throws `MalformedFragmentMarkersError` when the END marker's indentation ≠ the START's (bit 4 of 5
  real files once); `self-host-parity --check` then fails CI on it. Route: direct. Size S. Bump: patch
  (a) / judgment (b).
- [ ] **LH-07 — Line-citation hygiene.** Closes P2 (13× + 3 caught live in LH-01), promotes the
  2026-08-31 `IDEAS.md` idea. Route: direct. Size M. Bump: patch. **Mechanism:** (1) citation grammar
  in `agent-output.instructions.md` → Doc-ID Link Format: `path`; `path#anchor`; `path ("unique quoted
  phrase")`; `path:NNN` only alongside one of those, or in ephemeral output — never the sole locator
  in a living doc. (2) rewrite `spell-check-drift`'s "MUST cite `file:line`" and `spell-close-session`'s
  handoff `TODO.md:NNN` to the new grammar; verify `spell-open-session`'s Durability check doesn't
  parse `:NNN`. (3) `scripts/check-citations.ts` (check/report modes modelled on `spell-catalog.ts`)
  over a living-docs set in `scripts/lib/living-docs.ts` (TODO/IDEAS/DECISIONS, `ai-context/`, the
  ledger, `docs/plans/*/` with `status: active`, `src/assets/.arcane/governance/**`,
  `src/assets/.github/**`): path exists; NNN within line count; anchor slugifies to a real heading;
  quoted phrase occurs exactly once; bare `path:NNN` is a finding. Report/`--suggest` only, no `--fix`.
  Historical records (`journal/`, `docs/intake/`, completed plans) excluded. (4) convert the ~24
  living-doc citations. **Rollout:** warn mode in `ci.yml`'s `build-test` job first, flip to fail after
  five sessions log zero false positives. **Empirical-first:** report mode on the current tree;
  `spell-check-drift`'s own `TODO.md:42-45` example and placeholder shapes must read as non-citations.
- [ ] **LH-08 — Shipped-state staleness scan.** Closes P11 (6×) + the status-claim half of P1;
  proof case = `universal-agent-rules.md` rule 3 (filed in `TODO.md` by LH-01). Route: direct. Size M.
  Bump: patch. **Mechanism, two classes:** **A (gate)** — every `ARC-NNN (Proposed|Accepted|
  Superseded)` claim in living docs vs. the real `**Status:**` in `DECISIONS.md`; `EF-NN` claims vs.
  intake frontmatter; mismatch fails. **B (report, advisory)** — occurrences of `not yet built|not yet
  supported|not yet implemented|open backlog item|still unbuilt|tracked as future work` in shipped
  governance/prompt content and living root docs; `spell-check-drift` gains one bullet telling the
  agent to run `check:stale-claims --report` and triage — every other drift detector stays prose.
  **Empirical-first:** class A must be zero-false-positive on `main` before becoming a CI step; class B
  must catch rule 3 live.
- [ ] **LH-09 — Follow-up promotion gate.** Closes P9 (6×: findings buried in closure prose, never
  promoted; shipments never linked back to their TODO item). Route: direct. Size M. Bump: patch.
  **Mechanism:** `scripts/check-followups.ts` — in journals <30 days old, active plans' PLAN/
  OPERATOR-QUEUE, `TODO.md`, and the ledger's Correction column, any block containing a deferral phrase
  (`filed as a separate`, `follow-up`, `out of scope`, `not fixed here`, `left open`, `deferred`,
  `revisit`, `future work`) must also carry a tracker token (`TODO.md`, `IDEAS.md`, `Q-NNN`,
  `ARC-NNN`, `EF-NN`, `RCA-NNN`, a PR URL) or the explicit `(untracked: <reason>)`. Spell wiring:
  `spell-close-session` step 4c "Follow-up promotion sweep" before 5b writes the handoff;
  `spell-commit-work` Step 4 gains a "TODO linkage" assist. **Rollout:** warn→fail on LH-07's
  criterion. **Empirical-first:** measure precision over the last ten journals + Become Current's own
  PLAN/OPERATOR-QUEUE; the WD-nn "filed as a separate, out-of-scope follow-up" sentence is the known
  true positive.

### Wave 3 — Conduct rules and ADR-gated work

- [ ] **LH-10 — Advisory conduct rules batch.** Closes P7's prose half, P8 (6×), P10 (3×). Route:
  direct. Size S. Bump: patch. Three rules appended to `universal-agent-rules.md` (25–27, after LH-05
  removes the `max == 24` coupling), each labeled "explicitly advisory prose (ARC-023)": **25** never
  quote a denylisted token even when documenting its removal — name the class, not the instance;
  **26** a zero-match search is evidence about the pattern, not the thing — run a second,
  differently-shaped search before concluding absence; **27** dispatched-agent supervision — review
  the diff, not the summary; one agent per file for concurrent edits; an agent may override an
  instruction after verifying it is wrong and must say so. Also fixes rule 3's stale text if LH-08
  hasn't yet. **Empirical-first:** confirm rule-number uniqueness (numbering is non-sequential in file
  order).
- [ ] **LH-11 — ADR ARC-041: a local supply channel for the ARC-031 privacy denylist (amends
  decision 3).** Closes P7's mechanical half. Route: adr. Size M. Bump: n/a. **Operator-gated
  (Q-003).** Proposes: `resolvePrivateTokens()` may additionally read a file **outside** the repository
  (`~/.arcane/org-tokens` or `$ARCANE_ORG_TOKENS_FILE`) when the env var is unset, with a hard refusal
  of any path under `git rev-parse --show-toplevel` regardless of gitignore (closes the `git add -f`
  hole a gitignored in-repo file leaves); `.husky/pre-commit` gains a staged-files-only org-token scan
  through the same resolution; `spell ward --terms-file` gets the same format so consumers escape
  shell-history exposure; CI's secret stays authoritative. Rejected alternatives to record: a
  gitignored in-repo file; a committed encrypted list. Open questions for the operator: adopt at all;
  file format; home-directory default. **Empirical-first, in the ADR itself:** `git check-ignore -v`
  confirms `.gitignore`'s `~/.arcane/` pattern is currently a no-op; time a staged-only scan on a
  100-file commit.
- [ ] **LH-12 — Local denylist implementation.** **Parked until ARC-041 Accepted.** Route: direct.
  Size M. Bump: minor by judgment. Reuses `denylist-scan.ts`'s `scanFile` per staged path and
  `org-token-lint.ts`'s `resolvePrivateTokens` (add the file source beside the env source). Tests
  mirror `test/org-token-lint.test.ts`'s spawn-the-real-gate shape.

### Wave 4 — Close

- [ ] **LH-13 — Program Definition-of-Done audit and close.** Route: process. Size S. Walk the 7
  DoD criteria above with evidence; flip warn-mode checks to fail where the criterion held; update
  RCA-001's Preventive Actions statuses; mark `IDEAS.md`/`TODO.md`; run `spell-check-drift` last;
  `spell-close-session`.

**Dependencies:** LH-00 → all · LH-01 already done (ships with LH-00) · LH-07 → LH-08/09 (shared
`living-docs.ts`) · LH-08 before LH-10 (soft, so rule 3 is caught live) · LH-11 → LH-12 · LH-13 last.
Epics touching `src/assets/` (LH-02, 04, 06a, 07, 08, 09, 10, 12) run strictly serially per Standing
Constraints; LH-03, LH-05, LH-06b, LH-11 do not touch it.

---

## Parked — Needs Operator

- **Pattern 6** (reported-done vs. independent check, 9×) — already codified in `spell-close-session`
  step 1b / step 10 / Content-Verified Branch Deletion. Ledger rows only, no epic.
- **Pattern 12** (disclosed scope deviations, 8×) — working as intended.
- **`git cherry` patch-id false negatives** — fully solved (`git-conventions.md` → Content-Verified
  Branch Deletion).
- **`IDEAS.md`'s 2026-08-15 doc-ID-resolver remainder** — zero violations found; LH-07's validator is
  deliberately forbidden from growing into a resolver.
- **`TODO.md`'s tracking-mode resolution-order inconsistency** — an operator design decision, already
  recorded at Become Current's OPERATOR-QUEUE.md Q-011 item 7.
- **Become Current's Q-009/Q-010** — cross-repo and distribution strategy, outside this program.
- **Mechanizing `spell-check-drift`'s judgment-based detectors** beyond LH-07/LH-08's two mechanical
  inputs — deliberately out of scope; the detectors stay prose.
- **Pattern 8 beyond LH-10's advisory rule** — no subagent registry ships in this repo; nothing to gate
  mechanically yet.
- **`FEEDBACK.md`** — not created. This repo *is* Arcane; `spell-feedback.prompt.md`'s own maintainer-side
  rule triages framework-shaped feedback straight into `IDEAS.md`/`TODO.md`, which is what this program
  already did in LH-01.

## Coverage Map (every pattern/gap ID → disposition)

| ID | Item (recurrence) | → |
|---|---|---|
| P1 | Stale plan/ADR/backlog premises (22×) | LH-05 (counts) + LH-08 (status claims) + RCA-001 (LH-02) |
| P2 | Stale line citations (13× + 3 caught in LH-01) | LH-07 |
| P3 | Environment flakiness (13×) | LH-03 |
| P4 | Hardcoded counts (12×) | LH-05 |
| P5 | Line-wrap-fragile assertions (8×) | LH-03 |
| P6 | Reported-done vs. check (9×) | **Park** — codified; ledger rows |
| P7 | Org-token self-reference (6×) | LH-10 rule 25 + LH-11 → LH-12 |
| P8 | Dispatched-agent supervision (6×) | LH-10 rule 27; **Park** beyond prose |
| P9 | Prose ≠ tracked (6×) | LH-09 |
| P10 | Search-methodology errors (3×) | LH-10 rule 26 |
| P11 | Doc-vs-doc / shipped-elsewhere drift (6×) | LH-08; `system-prompt-context.md` fixed in LH-01 |
| P12 | Disclosed scope deviations (8×) | **Park** — working as intended |
| G1 | `check-version-bump` false pass pre-commit | LH-06a |
| G2 | Fragment END-marker indentation | LH-06b |
| G3 | `git cherry` false negatives | **Park** — solved |
| G4 | Coverage thresholds not evaluated in CI | LH-04 |
| N1 | README counts | LH-01 (hand-fix, done) → LH-05 (generated) |
| N2 | `system-prompt-context.md` stale claims | LH-01 (done) |
| N3 | Rule 3 stale BC-30 claim | LH-08 (proof case) / LH-10 |
| N4 | RCA artifact path contradiction | LH-02 |
| N5 | Become Current `PLAN.md` `status: active` | LH-01 (done) |
| I-citation | `IDEAS.md` 2026-08-31 citation-drift idea | LH-07 (promoted in LH-01) |
| I-resolver | `IDEAS.md` 2026-08-15 resolver remainder | **Park** |
| T-ENOTEMPTY | `TODO.md` Windows rmdir race sub-item | LH-03 (empirical) |
| T-TRACKING | `TODO.md` tracking-mode resolution order | **Park** — Become Current Q-011 item 7 |
| RCA | REQUIRED trigger fired twice (>5-file corrections) | LH-02 |
| FEEDBACK.md | | **Park** |

## Progress conventions

- The executing session ticks `[ ]` → `[x] (PR #NN, vX.Y.Z)` here in the same PR that ships the epic
  (or the close-session commit), closes the `TODO.md` item, and marks `IDEAS.md` entries.
- Journals stay the narrative record; this file stays the scoreboard; `OPERATOR-QUEUE.md` stays the
  only ask-of-operator surface.
- Cite by stable locator, never a bare `file:line` — this plan is the first thing LH-07's grammar
  applies to.
