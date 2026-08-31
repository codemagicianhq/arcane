---
title: Become Current — Master Execution Plan
status: active
created: 2026-08-30
baseline: fdf853e (main)
owner: operator (payini)
executor: Arcane autonomous loop (one epic per session)
---

# Become Current — Master Execution Plan

Single authoritative backlog to take this repository from its 2026-08-30 state to **current**: every
open TODO item, pending idea, deferred intake finding, and accepted-but-unimplemented decision either
**done**, **parked with a named operator input**, or **queued as an operator-gated step**. Built from a
full inventory of [TODO.md](../../../TODO.md), [IDEAS.md](../../../IDEAS.md), `docs/intake/batch-001/`,
`features/*/PRD.md`, and a mechanism audit of all 36 ADRs in [DECISIONS.md](../../../DECISIONS.md).

Citations were verified against `fdf853e` on 2026-08-30. **Executing sessions re-verify the specific
lines they act on** (working protocol rule 1); if a cite has drifted, trust the tree and note the drift.

## Definition of Done

The program is complete when all of the following hold:

1. Every epic below is checked off, or explicitly parked in [OPERATOR-QUEUE.md](OPERATOR-QUEUE.md).
2. `TODO.md` has no unchecked items except those listed under **Parked — Needs Operator**.
3. Every Accepted ADR's mandated mechanism exists in-tree (audit list below), except steps sitting in
   the operator queue.
4. Every `features/*/PRD.md` frontmatter status is truthful (no stale `proposed`/`queued`).
5. Every `IDEAS.md` entry carries a `status:` marker (`promoted → <epic/PR>` or folded/dropped note).
6. `spell-check-drift` reports **GO** with zero Critical/High findings.
7. A final close-session handoff summarizes the operator queue as the only remaining work.

## Authority & Delegation

This repository has no installed agent roster, and `agent-policies.md` fails closed: missing authority
⇒ human execution required for commit and merge. The operator resolves that explicitly for this
program — recorded as this repo's first entry in the solo-operator delegation mechanism
(`agent-policies.md` → **Solo-Operator Delegation Records (No Roster)**, BC-19):

> **Standing delegation, recorded explicitly in [`.arcane/delegations.json`](../../.arcane/delegations.json)
> (id `become-current-plan`), listable via `spell doctor`, revocable by editing or removing that entry:**
> sessions executing epics of this plan may — without per-action approval — create session branches,
> commit, push, open PRs, and merge their own PRs into `main` via the sanctioned strategies
> (merge/rebase, never squash), for work scoped to an epic defined in this plan.

**Explicitly outside the grant** (always queue, never perform) — the authoritative list is
`.arcane/delegations.json`'s `excludedActions` for this entry; summarized here for readability, but the
JSON file is the source of truth if the two ever disagree:

- Any GitHub/ADO **platform-settings mutation**: rulesets, required checks, `allow_auto_merge`,
  repo settings, secrets, webhooks.
- Deleting or force-resetting any branch that holds content not on `main` (content-verified via
  `git cherry` + diff, not ancestry).
- Manual `npm publish` or `workflow_dispatch` of publish/release workflows. (The existing automatic
  chain — version bump merged to main → `release-drift.yml` cuts a release → `publish.yml` publishes —
  is sanctioned and expected.)
- Accepting an ADR (drafts are `Proposed` until the operator accepts).
- Marking anything in OPERATOR-QUEUE.md as approved/done — operator-only.
- Anything in `.arcane/governance/agent-policies.md`'s prohibited list (MCP/security config, etc.).

## Standing Constraints (digest — full text in the cited sources)

- **Serial by construction.** Any change under `src/assets/`, to `src/modules/registry.ts`, or
  `src/config/profiles.ts` requires a `package.json` version bump differing from main
  (`scripts/check-version-bump.ts:28-32`; prose home `project.md:56-58`). Version is a shared
  sequence, and self-host parity ties `src/assets/` to the root dogfood copies — so **epics touching
  `src/assets/` must run one at a time, sequentially. Never two concurrent worktree epics in this
  repo** (ARC-028 R4; `spell-full-cycle.prompt.md:209-211`).
- **Every merged bump publishes.** `release-drift.yml` (push to main, `package.json` path filter)
  auto-creates the release; `publish.yml` publishes to npm with provenance. Batch an epic's
  `src/assets/` changes into ONE PR so one epic = one release.
- **PR-only, no squash, rebase-before-PR.** Required checks on ruleset `18841659`:
  `Lint, typecheck, test, build` and `PR branch is rebased on target`. Pre-PR guard:
  `git fetch origin && git rebase origin/main && git push --force-with-lease`
  (`spell-create-pull-request.prompt.md:49-56`).
- **Hooks are slow by design.** `.husky/pre-push` scrubs `GIT_*` then runs the full test suite;
  budget for long pushes and never parallelize around them.
- **Session lifecycle.** Every iteration: `spell-open-session` (handoff + drift check + isolation
  primitive + Mutation Guard branch) … work … `spell-close-session` (async-item sweep, journal,
  handoff). Session branches: `sessions/YYYY-MM-DD-<topic-slug>`.
- **Attribution trailers** on every commit per `git-conventions.md`; `Vendor: arcane-cli` per ARC-021.
- **Working protocol** (root `CLAUDE.md`): verify before asserting; checked ≠ inferred ≠ told; green
  tests are not evidence of done.

## Loop Protocol (one epic per session)

1. **Open:** run `spell-open-session` with focus `become-current: <next epic id>`. Consume any
   handoff. If drift check reports HIGH → fix or queue before proceeding.
2. **Select:** the topmost unchecked epic whose dependencies are all satisfied and which is not
   blocked on OPERATOR-QUEUE. If the next epic is ADR-gated and its ADR is still `Proposed`, skip it
   and take the next eligible one.
3. **Footprint check:** confirm no other session/worktree is active on overlapping files
   (`git worktree list`, open PRs). Overlap ⇒ serialize (wait or pick a disjoint epic).
4. **Execute** per the epic's **Route**:
   - `direct` — implement on the session branch; tests + gates; single PR.
   - `chain` — `spell-plan` (if no PRD) → `spell-architect` (architecture.md + stories.json) →
     `spell-implement` → `spell-test` → `spell-review`, then PR. `spell-full-cycle` is the wrapper
     when starting from a bare description.
   - `adr` — research + draft the ADR as **Proposed** in DECISIONS.md (+ ToC row), open the PR,
     append an acceptance request to OPERATOR-QUEUE.md, and **park the dependent implementation**.
   - `process` — a verification/procedural step; evidence goes to the journal + TODO closure.
5. **Gates:** full-cycle limits apply — 3 consecutive failures on one story ⇒ halt the epic and
   record it (do not thrash); any HIGH review finding loops back before ship (max 2 loops).
6. **Ship:** rebase, PR, wait for required checks, merge (grant above), post-merge cleanup.
   One epic = one PR unless the epic's detail says otherwise.
7. **Record:** in the same PR or the session-close commit — tick the epic's checkbox here, close the
   TODO.md item(s), add `IDEAS.md` status markers, append any new operator items to
   OPERATOR-QUEUE.md.
8. **Close:** `spell-close-session` (async sweep — a merged PR is `succeeded` only after ancestry +
   CI conclusion verification; a dispatched publish is `dispatched` until npm shows the version).
9. **Halt conditions** (end the loop, leave a clean handoff): two consecutive epics halted; drift
   check NO-GO that can't be fixed autonomously; any required check failing on main; operator queue
   blocking everything that remains.

## Danger Gates & Operator Queue

[OPERATOR-QUEUE.md](OPERATOR-QUEUE.md) is the single mutable surface between loop and operator.
The loop **appends** fully-prepared entries (context, exact ready-to-run commands, preconditions,
rollback); the operator executes/approves and marks them done. The loop never edits or acts on an
entry the operator hasn't marked. Seeded today with: the ARC-035 ruleset wiring, the auto-merge
re-enable decision, five content-holding branches, and two ADR-acceptance decisions already pending.

---

## Wave Plan

Status legend: `[ ]` open · `[x]` done (PR#) · `[P]` parked on operator queue.

### Wave 0 — Bootstrap

- [x] **BC-00 — Commit this plan.** This document + KICKOFF.md + OPERATOR-QUEUE.md via PR.
  Merging it activates the delegation grant. Route: direct. Bump: no (docs only, outside
  `src/assets/`). **Done:** [PR #86](https://github.com/codemagicianhq/arcane/pull/86), merged
  2026-08-30 (`6021ca7`). Checkbox was left unticked after merge — corrected 2026-08-31 while
  starting BC-01.

### Wave 1 — Platform & release integrity

- [x] **BC-01 — ARC-035 review-round merge gate.** Sources: TODO.md:42 · EF-36 · DECISIONS.md:1493.
  Route: direct (the ADR is the spec). Size M. Bump: **yes** (spell prompts). Details below.
  **Done:** [PR #88](https://github.com/codemagicianhq/arcane/pull/88) merged 2026-08-31 via rebase
  (`1da490e`, confirmed via `gh pr view --json state,mergedAt,mergeCommit`), `v0.22.2`, published to
  npm automatically via the version-bump → `release-drift.yml` → `publish.yml` chain. All three
  required checks (including the new `Review round clear` job itself) reported green before merge.
  Decision 4 shipped only for this repo's own `.husky/pre-push`, not the consumer-facing `HOOK_BODY`
  path — see the ARC-035 implementation note in DECISIONS.md and the new TODO.md gap item. Empirical
  test (step 1) ran live: GitHub refuses author self-request-changes, same as self-approval — folded
  into `spell-review.prompt.md` step 10 as an expected-failure caveat. Q-001's hard precondition
  (the check reporting green on a live PR) is satisfied; ruleset-wiring payload prepared in
  `docs/plans/become-current/q-001-ruleset-{before,after}.json`, application still queued to the
  operator (platform-settings mutation, outside the delegation grant).
- [x] **BC-02 — `dist/assets` pruning.** Sources: TODO.md:88 (T9, line renumbered by BC-01's edits —
  corrected here). Route: direct. Size S. Bump: no.
  Prune `dist/assets/` before copy (or temp-dir-and-swap) in `scripts/copy-assets.ts` (`copyDir`
  at :94-130 never deletes); regression test: file removed from `src/assets/` disappears from
  `dist/assets/` on next build. Kills the live `spell-eas-ios-deploy.prompt.md` orphan.
  **Done:** [PR #90](https://github.com/codemagicianhq/arcane/pull/90) merged 2026-08-31 via rebase
  (`570b655`, confirmed via `gh pr view --json state,mergedAt,mergeCommit`). Implemented as
  `copyAssets()` + `test/copy-assets.test.ts`. A second, more serious import-safety bug
  (`main()` called unconditionally at module scope, so importing the new exports for testing
  silently rebuilt this repo's real `dist/assets/` and raced `test/init.test.ts`'s built-CLI
  tests) was found and fixed in the same PR — see the TODO.md entry for the full detail.
- [x] **BC-03 — Branch hygiene: content-verified sweep.** Sources: TODO.md:94-101 (T12 a+b; c → BC-17,
  line renumbered by BC-01/02's edits — corrected here). Route: direct. Size M. Bump: yes (close-session
  prompt). Implement content-level verification (`git cherry` + diff, never ancestry alone) as an
  idempotent close-session sweep step. Then run it. **Done:** [PR #92](https://github.com/codemagicianhq/arcane/pull/92)
  merged 2026-08-31 via rebase (`c5eb8de`), `v0.22.3`. Implemented in
  `git-conventions.md` (new Content-Verified Branch Deletion section), `spell-open-session.prompt.md`,
  and `spell-close-session.prompt.md`; ran live — `sessions/2026-08-30-arc035-review-round-check` from
  this line's original text does not actually exist (stale citation, corrected via live verification,
  not the 5 originally-listed content-holding branches minus the one this cleared). Deleted 3 branches
  verified fully landed (`docs/discoverability-session-journal`; `sessions/2026-08-15-queue-failfast-doclink-ideas`,
  cleared only after a resulting-content check caught a `git cherry` patch-id false-negative; the
  remote-only `docs/spell-full-cycle-coordination-gaps`). Per-branch content reports with land/abandon
  recommendations for the remaining 4 branches appended to
  [OPERATOR-QUEUE.md Q-003](OPERATOR-QUEUE.md#q-003--four-content-holding-local-branches-land-or-abandon),
  including a newly-found 6th instance of EF-34-class fixture contamination.
- [x] **BC-04 — Roster integrity batch (incl. ARC-012).** Sources: TODO.md:12 (T1), :107 (T14),
  :149 (T16), :161 (T20/ARC-012) — lines renumbered by BC-01/02/03's edits, corrected here.
  Route: direct. Size M. Bump: **yes** (one PR, one bump).
  (a) `spell agents sync/init` exits non-zero when any rostered role fails to resolve
  (`src/modules/agent-generator.ts:176` currently swallows). (b) ARC-012 parity test: render every
  `src/assets/agents/*.yaml` through the generator and byte-compare against committed
  `src/assets/.github/agents/*.agent.md` (audit confirmed no such test exists; drift class unguarded
  both directions). (c) Add optional `epithet` to schema v2 + roster generation. (d) Document
  `visual_description` in the roster schema docs.
  **Done:** [PR #94](https://github.com/codemagicianhq/arcane/pull/94) merged 2026-08-31 via rebase
  (`5a8ecd6`), `v0.22.4`. All four shipped. (a) `SyncResult.hasUnresolvedRoles` + non-zero exit
  in both CLI commands. (b) `test/agent-roster-parity.test.ts` — **found and fixed real, live drift**:
  `mercurio.agent.md` had shipped the literal `[object Object]` defect since before the mobile-dev
  bug's own fix (PR #45), invisible until this test existed. (c) `epithet` landed on the roster entry
  (schema v2), not the agent YAML — a deliberate deviation from this line's own phrasing, since an
  epithet is naming-strategy-bound ("the Archmage" is Merlin's, not "architecture-lead"'s) and putting
  it on the definition would leak Arcanos flavor into the deliberately epithet-less `generic` strategy.
  (d) documented in `naming-conventions.md`'s new Agent Definition Schema section. A pre-existing,
  unrelated CI race (`test/init.test.ts`'s redundant build `beforeAll` colliding with other test
  files) surfaced while shipping this PR and was fixed in the same PR — see TODO.md's new entry.

### Wave 2 — Ledger, status & doc-link hygiene

- [x] **BC-05 — Ledger & status reconciliation.** Sources: TODO.md:35 (T2), :181 (T28, the two
  non-shipped citers) · stale statuses found 2026-08-30. Route: direct. Size S. Bump: no (root docs +
  scripts only). Fix in one PR: (a) backfill EF-24/30/31 closure entries with PR/version refs;
  (b) `features/push-safety/PRD.md:2` `proposed` → `shipped` and correct the false "nothing has been
  built" preamble (:9-12, :23-42 — ARC-034 shipped R1-R7, verified); extract its four live follow-on
  questions (per-directory `push_policy`, fourth policy state, non-CLI-client hook honor, TTY
  sufficiency) as new TODO items; (c) `features/docs-mode/PRD.md` `implementation_status: queued` →
  shipped; (d) `docs/intake/batch-001/EF-36.md` status `deferred` → `accepted` (ARC-035) with note
  that BC-01 ships it; (e) resolve the dangling `EF-37` at `features/handoff-durability/PRD.md:4`
  (file the intake stub or re-point); (f) re-point version-bump-rule citations in
  `scripts/check-version-bump.ts:7,115` and annotate `docs/intake/batch-001/EF-31.md:17` →
  `project.md:56-58` (the `spell-bump.prompt.md:12` citer moves to BC-06's bump PR); (g) add a TODO
  entry tracking ARC-029 (Proposed since EF-34, currently tracked nowhere).
  **Done:** [PR #96](https://github.com/codemagicianhq/arcane/pull/96) merged 2026-08-31 via rebase
  (`f99e49c`). All seven shipped. (a) found real PR references via `gh pr list --search <sha>`
  against actual merge commits (PR #19/#20/#21) rather than inventing them — a prior session had
  explicitly declined to guess here; also found EF-24's "shipped" status means the ADR text shipped,
  not that ARC-023's own retroactive-classification completion bar is met (it isn't — that's BC-29).
  (b) corrected; the four follow-on questions are new TODO items. (c)/(d) corrected. (e) re-pointed
  rather than fabricated an intake stub for a citation with no genuine record. (f)/(g) done.
  Bump: no, confirmed by `check:version-bump`.
- [x] **BC-06 — Doc-ID link integrity.** Sources: IDEAS.md:17 (I9), :18 (I10), :19 (I11), :25 (I16)
  + T28's `src/assets` citer. Route: direct. Size M. Bump: **yes**.
  **Done:** [PR #98](https://github.com/codemagicianhq/arcane/pull/98) merged 2026-08-31 via rebase
  (`aab4446`), `v0.22.5`. `check:adr-references` extended with a new cross-repo-hazard class (ARC/EF
  same-repo links from shipped content); I9's four named inconsistencies and I11's residues all fixed;
  T28 fully closed. Found and fixed four real cross-repo-hazard citations, two of which BC-01 had
  introduced earlier the same night. **Correction mid-epic, disclosed in the PR:** the first commit's
  fix — full canonical URLs for every citation, "not optional for shipped assets" — was itself wrong
  for `.github/prompts/*.prompt.md`: CI's pre-existing org-token portability gate failed on it, since a
  full `github.com/codemagicianhq/arcane` URL bakes this project's own org into distributed spell
  content, exactly what that gate exists to block. Corrected to a bare, unlinked ID for shipped spell
  prompts/instructions; full URLs stay correct only for governance docs and runtime output. Root cause
  of missing it locally: `npm run build` (the only place the org-token lint runs) wasn't in the local
  verification loop — added to this run's operating lessons below. I10 only partially addressed (ARC/EF
  cross-repo-hazard shape, not journal-class checking or full anchor-resolution) — left `status: new`
  in IDEAS.md rather than `promoted`, with the remainder noted inline. One new gap found and filed
  rather than fixed here (scope discipline): the org-token portability scan only walks
  `.github/prompts/`, not `.github/instructions/`, though both ship identically — see TODO.md.
- [x] **BC-07 — Fresh-session instruction probe.** Sources: TODO.md:46 (T6). Route: process. Size S.
  **Done:** [PR #100](https://github.com/codemagicianhq/arcane/pull/100) merged 2026-08-31 via rebase
  (`188d4fb`). Bump: n/a, no `src/assets` changes. All three facts confirmed from checked evidence:
  (1) the root working protocol was inherited (present in the fresh iteration's own system context
  before any file read); (2) `.arcane/agents.yaml` still does not exist; (3) the `Role` trailer's
  example row is still there, but its `:554` line citation had gone stale (six epics of edits since
  2026-08-02 shifted it to line 635) — caught and corrected a real error made mid-probe (a first
  search targeted the wrong text shape and nearly reported the example as removed). Full narrative in
  [journal/2026-08-31-bc07-fresh-session-probe.md](../../../journal/2026-08-31-bc07-fresh-session-probe.md).
  New IDEAS.md idea filed for the generalizable line-number-citation-drift problem, not fixed here.
- [x] **BC-08 — CLI unknown-command guidance.** Sources: IDEAS.md:14 (I6). Route: direct. Size S.
  Bump: no. **Done:** [PR #102](https://github.com/codemagicianhq/arcane/pull/102) merged 2026-08-31
  via rebase (`eab0a3f`). `spell <unrecognized>` now prints guidance + exits 1 instead of silently
  falling through to the welcome screen at exit 0 (confirmed live before the fix). Command list
  generated from `program.commands` rather than the idea's hardcoded "6" — already stale by the time
  this ran (8 real commands today; `unblock-push`/`agents` shipped after that count was written).
- [x] **BC-09 — GitHub as first-class `external_provider`.** Sources: IDEAS.md:10 (I2). Route:
  direct. Size M. Bump: yes (type union + init wording + spell guidance). Extends the ARC-032 union;
  keep `readManifest` rejection behavior consistent.
  **Done:** [PR #104](https://github.com/codemagicianhq/arcane/pull/104) merged 2026-08-31 via
  rebase (`139030c`), `v0.22.6`. `ExternalProvider` extended to `ado | github | jira | other`;
  unlike the earlier `"github"` value ARC-032 removed for having no consuming code, this one ships
  with a real `gh issue create/view/close` branch in five prompts (bug/plan/scope/suggest-feature/
  full-cycle) plus a new development-methodology.md GitHub Issues Conventions section — recorded as
  an ARC-032 implementation note distinguishing the two rather than presenting this as a plain
  revert. `readManifest`'s rejection behavior unchanged in shape, only the accepted set grew.

### Wave 3 — ADR drafts (draft → PR → park acceptance → continue)

- [x] **BC-10 — Secret-detection ADR (EF-35).** Sources: TODO.md:37 (T4) · EF-35 · ARC-016 gaps
  (audit: `spell check-leaks` command and pre-commit leak hook were mandated, never built). Route:
  adr. Size M. Must settle: bind point (pre-commit = free remediation vs. extending ARC-034's
  pre-push), shipped-vs-self-host parity, false-positive posture (`org-token-lint.test.ts` fixtures
  construct fake tokens that naive push protection would flag), and whether ARC-016's unbuilt pieces
  are absorbed or retired. Implementation = BC-30.
  **Done:** [PR #106](https://github.com/codemagicianhq/arcane/pull/106) merged 2026-08-31 via
  rebase (`f019d83`). [ARC-037](https://github.com/codemagicianhq/arcane/blob/main/DECISIONS.md#arc-037--secret-and-org-leak-detection-pre-commit-scan-plus-repository-wide-ci-backstop)
  drafted `Proposed`; acceptance requested at OPERATOR-QUEUE.md Q-006. Corrected two premises while
  researching: EF-35's "no scanner exists anywhere" is wrong (a homegrown one has run at build time
  since the first public commit, just scoped to `src/assets/` only); ARC-016's CI-gate deliverable is
  already shipped, not still unbuilt as this line above implied. The false-positive fixture is
  `test/copy-assets.test.ts:74`, not `org-token-lint.test.ts` as this line above also named —
  corrected in the ADR itself. Bump: n/a, no `src/assets` changes.
- [x] **BC-11 — Customization & vendor-neutrality spike + ADR.** Sources: TODO.md:158 (T22) ·
  ARC-020 (Proposed; broad schema open) · IDEAS.md:22 (I14 prior art: copier 3-way merge,
  `ng update` schematics; per-file content hashes prerequisite). Route: adr (research spike first,
  per T22's own instruction). Size L. Covers: override model surviving `spell update`,
  vendor-neutral naming core + pluggable profiles, home for vendor-specific standards.
  Implementation = BC-31.
  **Done:** [PR #108](https://github.com/codemagicianhq/arcane/pull/108) merged 2026-08-31 via
  rebase (`e762b30`). [ARC-038](https://github.com/codemagicianhq/arcane/blob/main/DECISIONS.md#arc-038--content-preserving-updates-and-vendor-neutral-governance-content)
  drafted `Proposed`; acceptance requested at OPERATOR-QUEUE.md Q-007. Spike found the "vendor-neutral
  naming core" premise stale (`naming-conventions.md` carries no Azure content today — the real,
  current instance is `cicd-standards.md`) and corrected OPERATOR-QUEUE.md Q-005's standing assumption
  that this ADR would subsume ARC-020's remainder (it doesn't — different axis: data fields vs.
  content architecture). Bump: n/a, no `src/assets` changes.
- [x] **BC-12 — Spell-compiler ADR.** Sources: IDEAS.md:13 (I5), :23 (I15 — 66 hand-maintained
  files → 33 + generator; ARC-027 doesn't cover commands-vs-prompts drift). Route: adr. Size M.
  Must resolve the D2 Gold vanilla-repo tension I5 names. Implementation = BC-32.
  **Done:** [PR #110](https://github.com/codemagicianhq/arcane/pull/110) merged 2026-08-31 via
  rebase (`68b5893`). [ARC-039](https://github.com/codemagicianhq/arcane/blob/main/DECISIONS.md#arc-039--build-time-spell-compiler-generated-client-stubs-and-shared-prose-fragments)
  drafted `Proposed`; acceptance requested at OPERATOR-QUEUE.md Q-008. Resolves the D2 Gold tension by
  scoping the compiler to build-time-only structure generation (client stubs, shared prose fragments) —
  explicitly does not pursue runtime operator-config injection, since no resolution was found that
  avoids either violating D2 Gold or accepting version skew. I15's "66 files" premise also checked and
  corrected: verified all 36 `.claude/commands/` files are already thin `@`-include shims, so the real
  gap was narrower than described (stub generation, not body-drift de-duplication). All three
  ADR-drafting epics (BC-10/BC-11/BC-12) are now done. Bump: n/a, no `src/assets` changes.
- [x] **BC-13 — ARC-029 acceptance packet.** Sources: DECISIONS.md:1150 (Proposed, untracked).
  **Done:** [PR #112](https://github.com/codemagicianhq/arcane/pull/112) merged 2026-08-31 via rebase
  (`feaca4a`). Full acceptance brief now at OPERATOR-QUEUE.md Q-004, replacing its placeholder.
  Verified the motivating incident directly against EF-34's own intake file rather than relaying
  ARC-029's compressed account, and found/disclosed that no epic in this plan implements ARC-029's own
  decision 5 follow-up — accepting it doesn't schedule that work by itself. Bump: n/a, no `src/assets`
  changes.
  Route: process. Size S. Prepare a one-page accept/revise/reject brief; append to OPERATOR-QUEUE.
  (Tracking entry added by BC-05.)

### Wave 4 — Feature epics (serial `chain` builds)

- [x] **BC-14 — ARC-036 generated state diagrams.** Sources: TODO.md:179 (T27) ·
  `features/generated-state-diagrams/PRD.md` (draft; R1-R11). Route: chain (PRD exists —
  `spell-architect` onward; promote PRD `draft`→`accepted` citing ARC-036). Size L, **four
  sequential PRs** per the PRD's own route: (1) Tier 1 R1-R7 (rule-8 extension, canonical `gitGraph`
  template, open-session + arcane-version emission, tracker-aware fencing,
  `test/prompt-diagram-emission.test.ts`, bump+parity); (2) R8 CLI `spell status` parity — also
  closes the verified axis-A gap (`src/commands/status.ts:87-101` never compares `manifest.version`
  to `packageVersion`); (3) Tier 2 R9-R10 adopters; (4) Tier 3 R11 harmonization. Resolve the PRD's
  five open questions in the architecture doc; they are template choices, not operator decisions.
  **Progress (2026-08-31):**
  - PRD promotion + `architecture.md` (precursor, resolves all 5 open questions): **done** —
    [PR #114](https://github.com/codemagicianhq/arcane/pull/114), `draft`→`accepted`, no bump.
  - PR (1) Tier 1 R1-R7: **done** — [PR #115](https://github.com/codemagicianhq/arcane/pull/115) merged
    via rebase (`c86300d`), `v0.22.7`.
  - PR (2) R8 CLI `spell status` parity: **done** — [PR #117](https://github.com/codemagicianhq/arcane/pull/117)
    merged via rebase (`8f9e082`), `v0.22.8`. New `src/modules/diagram-generator.ts` (pure, sibling to
    `version-check.ts`); OQ2 resolved there (aligned text on a TTY, fenced diagram only when piped).
  - PR (3) Tier 2 R9-R10 **split into two PRs** — found while implementing that R10's four adopters
    (`spell-review-batch`, `spell-manifest`, `spell-full-cycle`, `spell-close-session`) each need a
    genuinely different Mermaid diagram type for their own data shape, unlike R9's single reused
    `gitGraph` template. This is now 6 total PRs, not 5; disclosed here rather than silently
    re-numbering without a note.
    - PR (3a) R9 branch/PR topology: **done** — [PR #119](https://github.com/codemagicianhq/arcane/pull/119)
      merged via rebase (`61499fb`), `v0.22.9`. `spell-commit-work` + `spell-create-pull-request`.
    - PR (3b) R10 four adopters: **done** — [PR #121](https://github.com/codemagicianhq/arcane/pull/121)
      merged via rebase (`3f7af9d`), `v0.22.10`. `spell-review-batch` (flowchart), `spell-manifest`
      (flowchart), `spell-full-cycle` (stateDiagram-v2), `spell-close-session` (gitGraph — `timeline`
      rejected as Mermaid-experimental).
  - PR (4) Tier 3 R11: **done** — [PR #123](https://github.com/codemagicianhq/arcane/pull/123) merged
    via rebase (`864bfae`), `v0.22.11`. `spell-explain-concept`/`spell-architect`/`spell-scope`
    repointed to rule 8 (not ARC-036 — classified as agent-authored design/planning output);
    `spell-security-review` gained a new trust-boundary/data-flow diagram under the same rule-8
    classification (none existed previously — a scope finding, disclosed in the PR).
  - **Epic complete** — all 6 of 6 total PRs (including the precursor) done.
- [x] **BC-15 — Handoff durability (R1-R8).** Sources: `features/handoff-durability/PRD.md` (draft).
  Route: chain. Size M. Bump: yes. Prompt-only by its own constraints; must not shift the bold-colon
  anchors `test/prompt-pending-verification.test.ts` keys on; adds
  `test/prompt-handoff-durability.test.ts`; includes ARC-005 amendment (R7) and filing its missing
  work-item ID (coordinates with BC-05e).
  **Done 2026-08-31:** [PR #125](https://github.com/codemagicianhq/arcane/pull/125) merged via rebase
  (`630e67f`), `v0.22.12`. All eight requirements shipped in one PR — PRD promoted `draft`→`accepted`;
  step 4b (durable registration) + field pointers + `Notes` pointer-only rule in `spell-close-session`;
  Durability check + three-field surfacing in `spell-open-session`; fresh-install scaffold fixed to
  ship pre-consumed (a real bug: its old format satisfied open-session's own live-handoff detection
  trigger); ARC-005 amended by new **ARC-040** (used this file's real `**Amended by:**`/`**Amends:**`
  convention — the PRD said "blockquote", which isn't this file's actual pattern; disclosed in the PR).
  BC-05e's own scope (the dangling `EF-37` intake citation) was already resolved by BC-05 itself; this
  PR's own missing-work-item-ID open question was the separate, still-open half, closed here by filing
  a `TODO.md` entry (internal tracking mode) in the same PR.
- [x] **BC-16 — Spell routing layer (R1-R3).** Sources: TODO.md:163 (T24). Route: chain. Size L.
  Bump: yes. R1 routing table injected via `agent-generator.ts` marker merge into all three L1
  surfaces; R2 frontmatter `description:` with proactive triggers on every
  `.claude/commands/spell-*.md`; R3 universal-agent-rules lifecycle rule. R4 (PreToolUse hook)
  deliberately deferred — leave a TODO note keyed on observed drift after R1-R3.
  **Done 2026-08-31:** [PR #127](https://github.com/codemagicianhq/arcane/pull/127) merged via rebase
  (`586af84`), `v0.22.13`. R1-R3 all shipped in one PR; R4 intentionally out of this epic's scope
  (TODO.md's T24 stays open, tracking R4 separately). New rule 22 in `universal-agent-rules.md` —
  appended, not inserted, since renumbering would have broken rule 8's live ARC-036 citations across
  8+ shipped prompt files from BC-14. This repo's own root `CLAUDE.md`/`AGENTS.md`/`.github/copilot-
  instructions.md` updated by hand alongside the code fix, since this repo has no installed agent
  roster and the generator path never runs here. **Process note:** the implementation commit briefly
  landed on `main` before being caught and moved to this session branch pre-push — disclosed in
  PR #127's own description; no content was lost and `main` was never pushed in that state.
- [x] **BC-17 — `doctor` platform-policy verification.** Sources: TODO.md:90 (T11, absorbing T12c).
  Route: chain. Size M. Verify live branch/merge policy against the declared ladder on both
  providers; must read GitHub **Rulesets** (the classic `/branches/main/protection` endpoint
  false-negatives — proven 2026-08-24) including cross-rule interactions
  (`allowed_merge_methods` × `required_linear_history`), and ADO "Limit merge types". Report-only in
  `doctor`; never auto-mutate (grant exclusion).
  **Done 2026-08-31:** [PR #129](https://github.com/codemagicianhq/arcane/pull/129) merged via rebase
  (`5566ec1`), `v0.22.14` (bumped by judgment call, not required by `check:version-bump` — no
  `src/assets/` touched). New `src/modules/platform-policy.ts`; GitHub path live-verified against
  this repo's own real Rulesets (both the current healthy shape and, as a fixture, the historical
  2026-08-24/25 drifted shape); ADO path implemented from documented API shape only, **not
  live-verified** (no ADO remote exists to test against) — disclosed in the PRD and TODO.md. 22 new
  tests. TODO.md's T11 item stays open: its title also names `ward`, which doesn't exist as a shipped
  spell yet (T18/BC-21) — only the `doctor` half, this epic's actual scope, is done.
- [x] **BC-18 — `spell-sync-pull-request`.** Sources: TODO.md:49 (T7; explicit route). Route: chain
  (`spell-plan` → `spell-architect` → implement). Size L. Bump: yes. Fixtures: clean sync,
  conflicting rebase, stale lease rejection, ambiguous-conflict handoff, GitHub/ADO post-push
  verification; route conflicted PRs here from `spell-create-pull-request`/`spell-ship`.
  **Done 2026-08-31:** [PR #131](https://github.com/codemagicianhq/arcane/pull/131) merged via rebase
  (`16f151f`), `v0.23.0` (minor, not patch — a new spell is new distributed capability, per ARC-005's
  own precedent). PRD via `spell-plan`'s real template (no separate `stories.json` — solo-loop
  adaptation). New spell registered under the existing `spells-delivery` component, no new component
  invented. All 5 named fixtures addressed explicitly in the prompt; both routing pointers added.
  Fixed the expected `test/docs-profile-registry-split.test.ts` count bump (35→36) per that test's own
  documented precedent for an existing group growing. 16 new tests.
- [x] **BC-19 — Delegation UX (solo-operator mode).** Sources: TODO.md:101 (T13). Route: chain.
  Size M. Bump: yes. Delegations explicit, listable (`spell doctor`), revocable per repo; migrate
  this plan's Authority section into the mechanism as its first record.
  **Done 2026-08-31:** [PR #133](https://github.com/codemagicianhq/arcane/pull/133) merged via rebase
  (`9a8dfee`), `v0.24.0` (minor — new distributed capability, per ARC-005/BC-18 precedent). New
  `.arcane/delegations.json` (no scaffold — repo-specific); `spell doctor`'s new `checkDelegations`
  live-verified post-merge (`node dist/index.js doctor` → `✓ [pass] Standing delegations (T13)`).
  This very section above now references that file rather than restating it — migrated in the same
  commit that added the record, so this loop's own standing authority was never ambiguous even
  transiently. 11 new tests.
- [x] **BC-20 — Full-cycle cross-epic coordination.** Sources: TODO.md:160-161 (T23). Route: direct
  (prompt/governance edits + tests). Size M. Bump: yes. Ship the three fix ideas (migration-number
  re-derivation at write time; real-data migration gate guidance; serialize-migrations doc) plus the
  2026-07-22 sub-findings: multi-item PR strategy defined; delegation-is-roleplay documented
  honestly (no `.claude/agents/` ships); the two prompt patterns codified.
  **Done 2026-08-31:** [PR #135](https://github.com/codemagicianhq/arcane/pull/135) merged via rebase
  (`d6689f0`), `v0.24.1` (patch — fix/extension to an existing spell). **Scope finding:** the
  serialize-migrations fix idea (3) was already shipped via ARC-028 (2026-08-15), predating this
  plan — verified fresh before implementing rather than assumed from this summary's own wording; only
  fix ideas (1)/(2) and the four sub-findings needed shipping. 11 new tests.
- [x] **BC-21 — `ward` + `scry` spells.** Sources: TODO.md:151 (T18). Route: chain. Size L. Bump:
  yes. `ward` (leak scan, vendor-identifier denylist mandatory) + `scry` (name clearance: outward
  four-check **and** the inward repo-local collision pass ARC-028 proved necessary). Soft-depends on
  BC-10's accepted ADR to keep scanner boundaries from colliding with secret detection.
  **Done 2026-08-31 — shipped as two PRs, disclosed here** (`ward` and `scry` have genuinely
  different implementation shapes — deterministic CLI code vs. a research-driven prompt spell).
  - `ward`: **done** — [PR #137](https://github.com/codemagicianhq/arcane/pull/137) merged via rebase
    (`127f257`), `v0.25.0`. New `spell ward` CLI, reusing `org-token-lint.ts`'s scanning engine
    (extracted into a new shared `src/modules/denylist-scan.ts`, zero behavior change, verified).
    28 new tests.
  - `scry`: **done** — [PR #138](https://github.com/codemagicianhq/arcane/pull/138) merged via rebase
    (`e2471a5`), `v0.26.0`. New prompt-driven `spell-scry.prompt.md`, registered under the existing
    `spells-build` component. Inward pass mandatory and runs first (real ARC-028 `workspace` incident
    cited as why); one shared same-space/adjacent/out-of-space taxonomy for both passes; verdict is
    pass/pass-with-disclosure/kill, never rounded. Does not call `spell ward` — same grep principle,
    different operation. 11 new tests.
  - Soft-dependency respected: `ward` scans identifiers/trademarks only, never secret/credential
    patterns — that scope stays reserved for BC-10's still-Proposed ARC-037, not implemented here.
- [x] **BC-22 — MCP resilience.** Sources: IDEAS.md:16 (I8), :20 (I12). Route: direct. Size M.
  Bump: yes. Fail-fast/fallback governance rule (one abnormal failure marks a server down for the
  session) + `.mcp.json` scaffold with per-server `timeout` via init/doctor.
  **Done 2026-08-31:** canonical rule in `git-conventions.md` (near the Known-issues table it
  generalizes), referenced (not restated, D8) from `agent-output.instructions.md` and
  `spell-commit-work.prompt.md` step 9. New optional `mcp-config-template` registry component
  (`.mcp.json`, `skipExisting: true` — structurally exempt from self-host-parity, same as
  `docs-baseline`'s precedent; not in any default profile, available via `spell add`). New `spell
  doctor` check `checkMcpConfig` (per-server timeout, silent pass when no `.mcp.json` exists). Both
  IDEAS.md sources (I8, I12) marked promoted. 16 new tests (patch bump — a new doctor check + optional
  scaffold, not a new spell, matching BC-17's precedent).
- [x] **BC-23 — Registry-driven spell catalog.** Sources: TODO.md:179-190 (T15, corrected — the
  "130-141" citation had drifted). Route: direct. Size M. Bump: likely (registry).
  **Done 2026-08-31:** new `scripts/spell-catalog.ts` (`--check`/`--fix`, ARC-027-shaped) derives
  the catalog from `registry.ts`'s `spells-*` components + each spell's own `.prompt.md`
  frontmatter — 38 spells confirmed (README still said "34"/"36"). Emits `docs/spell-catalog.json`
  (cross-repo pointer for `arcane-website` queued at
  [OPERATOR-QUEUE.md Q-009](OPERATOR-QUEUE.md#q-009)) and README's spell-catalogue block, now
  marker-wrapped (`<!-- arcane:start/end -->`, `merger.ts`'s existing convention, first use on
  README.md). New `check:spell-catalog` CI step; new `test/spell-catalog.test.ts` (5 tests,
  ARC-012-style live-render-and-byte-compare). **Bump deviation from this entry's own forward
  guess:** actual scope never touches `src/assets/`, `registry.ts`, or `profiles.ts` — confirmed by
  `check:version-bump` — and ships no consumer-facing capability, so no bump. Full detail in
  TODO.md's own closure note on this item.
- [x] **BC-24 — Research-doc capability.** Sources: TODO.md:293-303 (T25, corrected — "165-175" had
  drifted). Route: chain. Size M. Bump: yes.
  **Done 2026-08-31:** PRD at [features/research-doc-capability/PRD.md](../../../features/research-doc-capability/PRD.md).
  Canonical storage convention (a) — `docs/research/<topic-slug>.md`, declared in
  `portable-bootstrap.md`'s new "Research Reports" section — plus `spell-todo` routing (c). Optional
  `spell-research` (b) skipped: `spell-document` was already sufficient once the location existed and
  was named, matching this entry's own gate. Full detail in TODO.md's closure note on the T25 item.
- [x] **BC-25 — `spell-eas-store-deploy`.** Sources: TODO.md:82-115 (T8, confirmed accurate). Route:
  chain. Size L. Bump: yes.
  **Done 2026-08-31:** PRD at [features/eas-store-deploy/PRD.md](../../../features/eas-store-deploy/PRD.md).
  New `mobile-release-standards.md` (`MR-01`-`MR-14`) for the durable store-specific facts with no
  existing home, cited by ID from the new `spell-eas-store-deploy` (joined `spells-build`) alongside
  `EV-01`/`EV-02`/`EV-03`/`EV-06` from `external-verification-standards.md` — never restated. Minor
  version bump (new spell). Full detail in TODO.md's closure note on the T8 item.
- [x] **BC-26 — Compliance standards + spell.** Sources: TODO.md:354 (T26, corrected — "177" had
  drifted). Route: chain. Size L. Bump: yes.
  **Done 2026-08-31:** PRD at [features/compliance-standards/PRD.md](../../../features/compliance-standards/PRD.md).
  New `compliance-standards.md` (`CS-01`-`CS-12`: GDPR, CCPA, shared obligations, SOC 2, HIPAA, tiered
  applicability — explicit not-legal-advice framing) + new `spell-compliance` (joined `spells-build`),
  a read-only self-assessment with no apply/fix phase — citing `CS-nn` by ID, never restating. Minor
  version bump (new spell). Full detail in TODO.md's closure note on the T26 item.
- [ ] **BC-27 — Governance tail batch.** Sources: IDEAS.md:9 (I1), :11 (I3), :12 (I4), :15 (I7).
  Route: direct, one PR per sub-item where they touch different trees. Size M. (a) I4 dedup rule:
  diff before deleting "duplicates" — governance edit. (b) I1 org-token gate seeds operator-identity
  tokens. (c) I7 verification-ledger extraction from close-session. (d) I3 attribution trailer split
  — depends on roster/`.arcane/agents.yaml` existing (after BC-19); keep last.
- [ ] **BC-28 — Delivery-channels spike.** Sources: IDEAS.md:21 (I13). Route: process (spike). Size
  M. Run the two named smoke tests (MCP prompts; Claude Code plugin) and write a findings doc;
  go/no-go on each channel is an operator decision → OPERATOR-QUEUE.

### Wave 5 — Unparked implementations & the big backfill

- [ ] **BC-29 — ARC-023 enforcement-mode backfill.** Sources: DECISIONS.md (ARC-023, Accepted) ·
  audit: exactly ONE rule in all of `src/assets/` carries an enforcement-mode declaration
  (`spell-close-session.prompt.md:36`); all 23 governance docs have zero. Route: direct, sub-PRs
  per governance doc (each bumps — batch sensibly, ~4-6 docs per PR). Size L. Mechanical but huge;
  scheduled late so vocabulary benefits from every earlier epic.
- [ ] **BC-30 — Secret detection implementation.** Depends: BC-10 ADR **Accepted**. Route: chain.
  Size M-L per the ADR's settled bind point.
- [ ] **BC-31 — Customization implementation.** Depends: BC-11 ADR **Accepted**. Route: chain.
  Size L. Includes TODO.md:88 (T10) `spell update` orphan report + `--prune` — its content-hash
  prerequisite is decided by BC-11.
- [ ] **BC-32 — Spell-compiler implementation.** Depends: BC-12 ADR **Accepted**. Route: chain.
  Size L. Includes the I15 dual-copy elimination (66 → 33 + generator).

---

## BC-01 Detail — ARC-035 review-round merge gate

The one epic with platform steps, an empirical unknown, and a shipped-defect history (`0.20.0`).
All spec anchors: DECISIONS.md:1493-1543 (decisions 1-6, open questions, rejected alternatives).

1. **Empirical test FIRST** (ARC-035's flagged open question): on this epic's own PR, attempt
   `gh pr review --request-changes` as the author. Record the result in DECISIONS.md as a dated
   verification note under ARC-035. If authors CANNOT self-request-changes, the check still works
   for reviewer-posted state; note the ad-hoc-round gap consequence and continue.
2. **`scripts/check-review-round.ts`** (naming per `check-*.ts` convention): fails only while an
   outstanding, un-dismissed `CHANGES_REQUESTED` review exists on the PR; zero reviews ⇒ pass.
   Read review state via `gh api` (not approval count — decision 2's reasoning).
3. **CI job** in `.github/workflows/ci.yml`: job id `review-round`, `name: Review round clear`,
   PR-events only (mirror `rebase-check`'s `if:` guard so push-to-main skips it).
4. **Spell round-closure posting** (decision 3): `spell-review` and `spell-review-batch` end a
   blocked round with `gh pr review --request-changes` (ADO: `az repos pr set-vote --vote reject` —
   same primitive the author side already uses in `spell-commit-work.prompt.md:187`) and dismiss/
   supersede it explicitly when the round clears (`dismiss_stale_reviews_on_push` is false — closing
   the round is a deliberate step). Note: the repo's review family is `spell-review`,
   `spell-review-batch`, `spell-address-review` — there is no `code-review` spell despite the ADR's
   phrasing; apply to the family.
5. **Pre-push closed-PR warning** (decision 4): warn — not block — when the current branch's PR is
   `CLOSED`/`MERGED`, in BOTH hook homes: this repo's `.husky/pre-push` and the shipped
   `HOOK_BODY` in `src/modules/push-safety.ts:148` (consumers). Degrade silently when `gh` is
   absent/unauthenticated — a hook must never break pushes on a machine without `gh`.
6. **Queue the ruleset wiring** (operator gate): append to OPERATOR-QUEUE.md the exact command adding
   `{"context": "Review round clear"}` to ruleset `18841659`'s `required_status_checks`, with the
   hard precondition *"check has reported green on ≥1 live PR"* and a rollback command. Include the
   companion decision: whether to re-enable `allow_auto_merge` (currently `false`; ARC-035 assumed
   it returns).
7. Tests: unit-test the check's decision function against fixture review-state payloads; assert the
   CI job exists (mirror `test/publish-workflow.test.ts`'s pattern).

---

## Parked — Needs Operator

| Item | Source | Exactly what's needed from you |
|---|---|---|
| EF-18 / spell-intake (T3) | TODO.md:36 · `features/spell-intake/PRD.md` | A genuine independent **batch-002** submission. The PRD's own Won't-Have forbids implementation before it. When it exists, run the manual intake per MH-01..08, then this becomes a chain epic. |
| Naming reword (T21) | TODO.md:156 | Marked "owner's call": approve "boring" → "plainer/clearer" in both trees, or veto. One word from you unparks a 10-minute PR. |
| Prospero insignia lore (T17) | TODO.md:145-149 | Your content: the emblem's description/story for `prospero-image-prompt.md` + Arcanos Codex. |
| Website copy "the Arcanos" (T19) | TODO.md:153 | Cross-repo (arcane-website): change "SUMMON THE ROSTER" headline there; not executable from this repo. |
| ADR acceptances | BC-10/11/12/13 outputs | Review each Proposed ADR PR; accept/revise/reject. Dependent epics (BC-30/31/32) unpark on acceptance. |
| Everything in OPERATOR-QUEUE.md | — | Platform mutations, content-holding branch decisions, auto-merge re-enable. |

## Coverage Map (every inventory ID → disposition)

| Source | → | Source | → |
|---|---|---|---|
| T1 | BC-04 | T15 | BC-23 |
| T2 | BC-05 | T16 | BC-04 |
| T3 / EF-18 | **Parked** | T17 | **Parked** |
| T4 / EF-35 | BC-10 → BC-30 | T18 | BC-21 |
| T5 / EF-36 / ARC-035 | BC-01 | T19 | **Parked** (cross-repo) |
| T6 | BC-07 | T20 / ARC-012 | BC-04 |
| T7 | BC-18 | T21 | **Parked** |
| T8 | BC-25 | T22 / ARC-020 | BC-11 → BC-31 |
| T9 | BC-02 | T23 | BC-20 |
| T10 | BC-31 | T24 | BC-16 |
| T11 | BC-17 | T25 | BC-24 |
| T12 | BC-03 (+c → BC-17) | T26 | BC-26 |
| T13 | BC-19 | T27 / ARC-036 | BC-14 |
| T14 | BC-04 | T28 | BC-05 + BC-06 |
| I1 | BC-27 | I9-I11 | BC-06 |
| I2 | BC-09 | I12 | BC-22 |
| I3 | BC-27 | I13 | BC-28 |
| I4 | BC-27 | I14 | BC-11 |
| I5 | BC-12 → BC-32 | I15 | BC-12 → BC-32 |
| I6 | BC-08 | I16 | BC-06 |
| I7 | BC-27 | I8 | BC-22 |
| ARC-016 gaps | BC-10 → BC-30 | ARC-023 | BC-29 |
| ARC-029 | BC-13 | Stale PRD/intake statuses | BC-05 |

T-numbers = the 2026-08-30 TODO.md inventory (T1=line 12 … T28=line 181); I-numbers = IDEAS.md lines
9-25. Every unchecked TODO item, every unmarked idea, all three non-shipped intake files, both
Proposed ADRs, and every Accepted-ADR mechanism gap found by the 2026-08-30 audit appears exactly
once above.

## Progress conventions

- The executing session ticks `[ ]` → `[x] (PR #NN, vX.Y.Z)` here in the same PR that ships the
  epic (or the close-session commit), closes the TODO.md item, and marks IDEAS.md entries.
- Journals stay the narrative record; this file stays the scoreboard; OPERATOR-QUEUE.md stays the
  only ask-of-operator surface.
- Do not renumber epics. New work discovered mid-program gets BC-33+, appended to the wave it
  belongs to, with a coverage-map row.
