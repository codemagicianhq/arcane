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
program:

> **Standing delegation (activated by the operator merging this plan's PR; revocable by editing or
> removing this section):** sessions executing epics of this plan may — without per-action approval —
> create session branches, commit, push, open PRs, and merge their own PRs into `main` via the
> sanctioned strategies (merge/rebase, never squash), for work scoped to an epic defined in this plan.

**Explicitly outside the grant** (always queue, never perform):

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

BC-19 later formalizes this grant into the listable/revocable delegation mechanism TODO.md:101 asks
for; until then this section is the record.

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

- [ ] **BC-01 — ARC-035 review-round merge gate.** Sources: TODO.md:42 · EF-36 · DECISIONS.md:1493.
  Route: direct (the ADR is the spec). Size M. Bump: **yes** (spell prompts). Details below.
  **In progress:** [PR #88](https://github.com/codemagicianhq/arcane/pull/88), `v0.22.2` — open,
  awaiting required checks before merge. Tick on merge, not before (KICKOFF.md step 5 runs after
  step 4's merge, not concurrently with it). Decision 4 shipped only for this repo's own
  `.husky/pre-push`, not the consumer-facing `HOOK_BODY` path — see the ARC-035 implementation note
  in DECISIONS.md and the new TODO.md gap item. Empirical test (step 1) ran live: GitHub refuses
  author self-request-changes, same as self-approval.
- [ ] **BC-02 — `dist/assets` pruning.** Sources: TODO.md:86 (T9). Route: direct. Size S. Bump: no.
  Prune `dist/assets/` before copy (or temp-dir-and-swap) in `scripts/copy-assets.ts` (`copyDir`
  at :94-130 never deletes); regression test: file removed from `src/assets/` disappears from
  `dist/assets/` on next build. Kills the live `spell-eas-ios-deploy.prompt.md` orphan.
- [ ] **BC-03 — Branch hygiene: content-verified sweep.** Sources: TODO.md:92-99 (T12 a+b; c → BC-17).
  Route: direct. Size M. Bump: yes (close-session prompt). Implement content-level verification
  (`git cherry` + diff, never ancestry alone) as an idempotent close-session sweep step. Then run it:
  delete `docs/discoverability-session-journal` (verified 0 unmerged commits, 2026-08-30) and this
  session's empty `sessions/2026-08-30-arc035-review-round-check`; produce per-branch content reports
  for the five content-holding branches and append them to OPERATOR-QUEUE (land vs. abandon is the
  operator's call). Honor the EF-33 same-vantage-point check before any deletion.
- [ ] **BC-04 — Roster integrity batch (incl. ARC-012).** Sources: TODO.md:12 (T1), :103 (T14),
  :143 (T16), :155 (T20/ARC-012). Route: direct. Size M. Bump: **yes** (one PR, one bump).
  (a) `spell agents sync/init` exits non-zero when any rostered role fails to resolve
  (`src/modules/agent-generator.ts:176` currently swallows). (b) ARC-012 parity test: render every
  `src/assets/agents/*.yaml` through the generator and byte-compare against committed
  `src/assets/.github/agents/*.agent.md` (audit confirmed no such test exists; drift class unguarded
  both directions). (c) Add optional `epithet` to schema v2 + roster generation. (d) Document
  `visual_description` in the roster schema docs.

### Wave 2 — Ledger, status & doc-link hygiene

- [ ] **BC-05 — Ledger & status reconciliation.** Sources: TODO.md:35 (T2), :181 (T28, the two
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
- [ ] **BC-06 — Doc-ID link integrity.** Sources: IDEAS.md:17 (I9), :18 (I10), :19 (I11), :25 (I16)
  + T28's `src/assets` citer. Route: direct. Size M. Bump: **yes**. Extend the
  `check:adr-references` gate to every ID class (ARC/EF/journal — I10); adopt the doc-ID link rule in
  governance (I9); fix the named residues: `new-business-setup.md:116,121` dead wiki-links,
  `spell-review-batch.prompt.md:74` and `spell-full-cycle.prompt.md:189` bare `PR #n`, and the
  `../../../DECISIONS.md` consumer-root escapes (I16, e.g. `spell-authoring-standards.md:18`).
- [ ] **BC-07 — Fresh-session instruction probe.** Sources: TODO.md:46 (T6). Route: process. Size S.
  As the FIRST action of a fresh iteration (before reading anything else): report from checked
  evidence (1) whether the root working protocol was inherited, (2) `.arcane/agents.yaml` existence,
  (3) the `git-conventions.md:554` example mapping. Record in journal; close T6.
- [ ] **BC-08 — CLI unknown-command guidance.** Sources: IDEAS.md:14 (I6). Route: direct. Size S.
  Bump: no. `spell <unrecognized>` prints guidance + the real CLI commands instead of failing silent.
- [ ] **BC-09 — GitHub as first-class `external_provider`.** Sources: IDEAS.md:10 (I2). Route:
  direct. Size M. Bump: yes (type union + init wording + spell guidance). Extends the ARC-032 union;
  keep `readManifest` rejection behavior consistent.

### Wave 3 — ADR drafts (draft → PR → park acceptance → continue)

- [ ] **BC-10 — Secret-detection ADR (EF-35).** Sources: TODO.md:37 (T4) · EF-35 · ARC-016 gaps
  (audit: `spell check-leaks` command and pre-commit leak hook were mandated, never built). Route:
  adr. Size M. Must settle: bind point (pre-commit = free remediation vs. extending ARC-034's
  pre-push), shipped-vs-self-host parity, false-positive posture (`org-token-lint.test.ts` fixtures
  construct fake tokens that naive push protection would flag), and whether ARC-016's unbuilt pieces
  are absorbed or retired. Implementation = BC-30.
- [ ] **BC-11 — Customization & vendor-neutrality spike + ADR.** Sources: TODO.md:158 (T22) ·
  ARC-020 (Proposed; broad schema open) · IDEAS.md:22 (I14 prior art: copier 3-way merge,
  `ng update` schematics; per-file content hashes prerequisite). Route: adr (research spike first,
  per T22's own instruction). Size L. Covers: override model surviving `spell update`,
  vendor-neutral naming core + pluggable profiles, home for vendor-specific standards.
  Implementation = BC-31.
- [ ] **BC-12 — Spell-compiler ADR.** Sources: IDEAS.md:13 (I5), :23 (I15 — 66 hand-maintained
  files → 33 + generator; ARC-027 doesn't cover commands-vs-prompts drift). Route: adr. Size M.
  Must resolve the D2 Gold vanilla-repo tension I5 names. Implementation = BC-32.
- [ ] **BC-13 — ARC-029 acceptance packet.** Sources: DECISIONS.md:1150 (Proposed, untracked).
  Route: process. Size S. Prepare a one-page accept/revise/reject brief; append to OPERATOR-QUEUE.
  (Tracking entry added by BC-05.)

### Wave 4 — Feature epics (serial `chain` builds)

- [ ] **BC-14 — ARC-036 generated state diagrams.** Sources: TODO.md:179 (T27) ·
  `features/generated-state-diagrams/PRD.md` (draft; R1-R11). Route: chain (PRD exists —
  `spell-architect` onward; promote PRD `draft`→`accepted` citing ARC-036). Size L, **four
  sequential PRs** per the PRD's own route: (1) Tier 1 R1-R7 (rule-8 extension, canonical `gitGraph`
  template, open-session + arcane-version emission, tracker-aware fencing,
  `test/prompt-diagram-emission.test.ts`, bump+parity); (2) R8 CLI `spell status` parity — also
  closes the verified axis-A gap (`src/commands/status.ts:87-101` never compares `manifest.version`
  to `packageVersion`); (3) Tier 2 R9-R10 adopters; (4) Tier 3 R11 harmonization. Resolve the PRD's
  five open questions in the architecture doc; they are template choices, not operator decisions.
- [ ] **BC-15 — Handoff durability (R1-R8).** Sources: `features/handoff-durability/PRD.md` (draft).
  Route: chain. Size M. Bump: yes. Prompt-only by its own constraints; must not shift the bold-colon
  anchors `test/prompt-pending-verification.test.ts` keys on; adds
  `test/prompt-handoff-durability.test.ts`; includes ARC-005 amendment (R7) and filing its missing
  work-item ID (coordinates with BC-05e).
- [ ] **BC-16 — Spell routing layer (R1-R3).** Sources: TODO.md:163 (T24). Route: chain. Size L.
  Bump: yes. R1 routing table injected via `agent-generator.ts` marker merge into all three L1
  surfaces; R2 frontmatter `description:` with proactive triggers on every
  `.claude/commands/spell-*.md`; R3 universal-agent-rules lifecycle rule. R4 (PreToolUse hook)
  deliberately deferred — leave a TODO note keyed on observed drift after R1-R3.
- [ ] **BC-17 — `doctor` platform-policy verification.** Sources: TODO.md:90 (T11, absorbing T12c).
  Route: chain. Size M. Verify live branch/merge policy against the declared ladder on both
  providers; must read GitHub **Rulesets** (the classic `/branches/main/protection` endpoint
  false-negatives — proven 2026-08-24) including cross-rule interactions
  (`allowed_merge_methods` × `required_linear_history`), and ADO "Limit merge types". Report-only in
  `doctor`; never auto-mutate (grant exclusion).
- [ ] **BC-18 — `spell-sync-pull-request`.** Sources: TODO.md:49 (T7; explicit route). Route: chain
  (`spell-plan` → `spell-architect` → implement). Size L. Bump: yes. Fixtures: clean sync,
  conflicting rebase, stale lease rejection, ambiguous-conflict handoff, GitHub/ADO post-push
  verification; route conflicted PRs here from `spell-create-pull-request`/`spell-ship`.
- [ ] **BC-19 — Delegation UX (solo-operator mode).** Sources: TODO.md:101 (T13). Route: chain.
  Size M. Bump: yes. Delegations explicit, listable (`spell doctor`), revocable per repo; migrate
  this plan's Authority section into the mechanism as its first record.
- [ ] **BC-20 — Full-cycle cross-epic coordination.** Sources: TODO.md:160-161 (T23). Route: direct
  (prompt/governance edits + tests). Size M. Bump: yes. Ship the three fix ideas (migration-number
  re-derivation at write time; real-data migration gate guidance; serialize-migrations doc) plus the
  2026-07-22 sub-findings: multi-item PR strategy defined; delegation-is-roleplay documented
  honestly (no `.claude/agents/` ships); the two prompt patterns codified.
- [ ] **BC-21 — `ward` + `scry` spells.** Sources: TODO.md:151 (T18). Route: chain. Size L. Bump:
  yes. `ward` (leak scan, vendor-identifier denylist mandatory) + `scry` (name clearance: outward
  four-check **and** the inward repo-local collision pass ARC-028 proved necessary). Soft-depends on
  BC-10's accepted ADR to keep scanner boundaries from colliding with secret detection.
- [ ] **BC-22 — MCP resilience.** Sources: IDEAS.md:16 (I8), :20 (I12). Route: direct. Size M.
  Bump: yes. Fail-fast/fallback governance rule (one abnormal failure marks a server down for the
  session) + `.mcp.json` scaffold with per-server `timeout` via init/doctor.
- [ ] **BC-23 — Registry-driven spell catalog.** Sources: TODO.md:130-141 (T15). Route: direct.
  Size M. Bump: likely (registry). Generator emits the catalog artifact (JSON + README block) from
  `registry.ts`; CI drift-check in the ARC-012/ARC-027 mold. The website's consumption of the
  artifact is cross-repo — record a pointer in OPERATOR-QUEUE when the artifact ships.
- [ ] **BC-24 — Research-doc capability.** Sources: TODO.md:165-175 (T25). Route: chain. Size M.
  Bump: yes. Canonical storage convention (a) + `spell-todo` routing (c); optional `spell-research`
  (b) only if (a) proves insufficient alone.
- [ ] **BC-25 — `spell-eas-store-deploy`.** Sources: TODO.md:51-84 (T8). Route: chain. Size L.
  Bump: yes. One prompt, shared EAS preamble + two store-console sections; placeholders for
  app-specific values; cite `EV-01`-`EV-06` in `external-verification-standards.md` by ID (the
  TODO's own doc/spell split note). The ~30 raw lessons in the TODO body are the source material.
- [ ] **BC-26 — Compliance standards + spell.** Sources: TODO.md:177 (T26). Route: chain. Size L.
  Bump: yes. `compliance-standards.md` (GDPR + CCPA baseline, SOC 2 optional tier) +
  `spell-compliance` self-assessment runnable on any consuming repo.
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
