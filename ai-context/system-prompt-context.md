# AI Agent System Context

> **Keep this file current.** Update it at each session close via `/Spell-Close-Session`.

---

## Project Identity

| Field       | Value                                                                                                 |
| ----------- | ----------------------------------------------------------------------------------------------------- |
| Name        | Arcane (`arcane-cli`)                                                                                 |
| Description | Arcane framework CLI — scaffold and manage governance files in consuming repositories                 |
| Repo        | github.com/codemagicianhq/arcane                                                                      |
| Branch      | main                                                                                                  |
| Tracking    | Internal — persisted in `src/assets/.arcane.json` (this repo's self-hosted source manifest, `tracking_mode: "internal"`), per ARC-032 (2026-08-22). No root `.arcane.json` exists in this checkout; spells resolve the self-hosted source manifest as documented in `spell-open-session.prompt.md`. |

---

## Current Priorities

1. **The "Become Current" master plan is complete.** [docs/plans/become-current/PLAN.md](../docs/plans/become-current/PLAN.md) (merged 2026-08-30, [PR #86](https://github.com/codemagicianhq/arcane/pull/86)) sequenced 33 epics (BC-00 through BC-32) covering every open `TODO.md` item, every unmarked `IDEAS.md` entry, all non-shipped intake findings, and every Accepted-ADR mechanism gap found by the 2026-08-30 audit. **All 33 shipped as of 2026-09-01**, closing with Phase 5's own Definition-of-Done audit (PLAN.md's 7 criteria walked explicitly, evidenced). This program is no longer active backlog — there is no next eligible epic to pick up.
2. **The follow-on "Lessons Hardening" program is fully complete, including its one operator item.** [docs/plans/lessons-hardening/PLAN.md](../docs/plans/lessons-hardening/PLAN.md) (LH-00 merged 2026-09-02, [PR #172](https://github.com/codemagicianhq/arcane/pull/172)) mechanically hardened the 12 recurring correction patterns Become Current's own record surfaced. **LH-00 through LH-13 all shipped 2026-09-02** in one continuous session; [PR #174](https://github.com/codemagicianhq/arcane/pull/174) (LH-02, this repo's first RCA) was the one item requiring the operator's own hand — reviewed and merged 2026-09-02 (`v0.34.1`), closing [OPERATOR-QUEUE.md Q-002](../docs/plans/lessons-hardening/OPERATOR-QUEUE.md#q-002--approve-and-merge-rca-001). This program is no longer active backlog. `check:citations` and `check:followups` ship in warn mode (their own 5-session zero-false-positive flip criterion is unmet after one session); `check:stale-claims` Class A is real fail-mode already.
3. **Show Report is COMPLETE (2026-09-05, `v0.38.2`).** [docs/plans/show-report/PLAN.md](../docs/plans/show-report/PLAN.md)
   (`status: complete`), PRD at `features/show-report/PRD.md`, [ARC-042](../DECISIONS.md#arc-042--show-report-compiled-template-distribution-model-and-program-decisions)
   and [ARC-043](../DECISIONS.md#arc-043--show-report-rows-carry-no-emoji-category-selects-the-mark) both Accepted, operator
   queue empty, close-out audit in the plan. `spell report` renders a program's completion report through the arcane-ui
   compiled template vendored at `src/assets/report/`. **Two epics did not ship and are recorded, not dropped:** SR-07's
   pipeline stage is authored but inert in arcane-ui (branch `feat/sr-07-export-template-pr`, waiting on an
   operator-created GitHub token — see that repo's `docs/sr-07-enable.md`), and SR-05c (the share lens) moved out to
   `TODO.md`. **The transferable lesson:** a byte-comparison gate cannot catch a wrong template — mustache renders an
   unknown tag as an empty string silently, so a template whose tags name nothing still regenerates byte-identically.
   `npm run check:report-template` exists because four separate arcane-ui builds passed every other gate while broken.
4. **Not everything left open is operator-scoped — corrected 2026-09-03.** [TODO.md](../TODO.md)'s `## Parked — Needs Operator` section and Become Current's own [OPERATOR-QUEUE.md](../docs/plans/become-current/OPERATOR-QUEUE.md) Q-009/Q-010/Q-011 remain genuinely operator-gated, but non-Parked `TODO.md` items are agent-actionable now with no operator input required. The four this note originally named were all closed 2026-09-03 (ARC-041's TOC row and the "7 rows" miscount in the drift pass; the PLAN.md PR-link backfill in SR-01; the stale completion-ledger stat rail in SR-02). Still open and needing no operator input: the MEDIUM **"Claude Code worktree branches bypass Arcane's branch-naming standard"** (its operator decision is already recorded — rename-on-sight, ARC-023 — so it only needs implementing), a MEDIUM on five spells' diverged `tracking_mode` resolution logic, a MEDIUM on spells installable without the governance doc they cite, and a LOW on `DECISIONS.md`'s ARC-031 mis-citation (needs the root ADR identified first). A fresh session should read `TODO.md`'s Open Items before assuming only Parked/OPERATOR-QUEUE work remains.
5. **ARC-020 stays Proposed, with its full remainder still open — NOT folded into BC-11/ARC-038** (corrected 2026-09-02; the two ADRs sit on different axes: ARC-020's remainder is manifest *data fields*, ARC-038 is governance-*content* architecture — see [OPERATOR-QUEUE.md Q-005](../docs/plans/become-current/OPERATOR-QUEUE.md#q-005--arc-020-broad-schema-still-open-not-subsumed-by-bc-11)). Two prior amendments (ARC-030, ARC-032) already resolved narrower slices; the operator's own direction is to close the rest incrementally, one field group per future epic that needs it — not as a dedicated epic.
6. **ARC-028 (concurrency and isolation model) is Accepted**, named **session workspace**. Do not hardcode a version number here — it goes stale (this line itself said `0.33.1` while `main` was already at `0.33.2`, corrected 2026-09-02); run `spell-open-session`'s own two-axis version check for the current reading instead.
7. **Watch for the worktree-misdirect tool bug** (Edit/Write silently landing in the primary checkout instead of the active linked worktree — [journal/2026-08-22-ef-batch-closeout.md](../journal/2026-08-22-ef-batch-closeout.md)). Not recurred in recent sessions, but verify independently every time rather than trusting a clean streak.
8. **Codex Support is a new, active 9-epic program (CS-00–CS-08), not yet activated.** [docs/plans/codex-support/PLAN.md](../docs/plans/codex-support/PLAN.md), PRD at `features/codex-support/PRD.md`. Solves three problems at once: Codex cannot discover any Arcane spell today; multiple Arcane repos in one VS Code workspace duplicate every spell/agent per folder; and the distribution source is Copilot-shaped by accident rather than client-neutral. CS-00 (this activation) is [PR #220](https://github.com/codemagicianhq/arcane/pull/220), open with CI in progress — **the standing delegation and the rest of the program stay inert until the operator merges it.** CS-01 (ships Codex, additive, no design questions left) is next once that happens. CS-03 (the canonical-source move) is a breaking change gated on accepting a not-yet-drafted ARC-045 and an explicit operator-confirmed version number — never assume either.

---

## Next Session Handoff

> Auto-generated by spell-close-session. Consumed by spell-open-session. Do not edit manually.
> Generated: 2026-09-09

- **Active task:** Codex Support program, CS-00 (activation epic) — `docs/plans/codex-support/PLAN.md
  ("CS-00 — Discovery smoke tests + PRD/scope completion")`. All content work is done; the epic's
  own PR is open and awaiting the operator's merge, which is what activates the program's standing
  delegation for every later epic.
- **Last completed step:** Pushed the branch and opened
  [PR #220](https://github.com/codemagicianhq/arcane/pull/220) (`docs(codex-support): activate
  program — CS-00`) — not merged yet.
- **Next concrete action:** Merge [PR #220](https://github.com/codemagicianhq/arcane/pull/220)
  (registered at `docs/plans/codex-support/OPERATOR-QUEUE.md ("Q-001 — Merge CS-00")`) after
  confirming its required checks are green (`gh pr checks 220` — one was still `pending` at last
  check, see Pending Verification). Once merged, the next session should run
  `docs/plans/codex-support/KICKOFF.md`'s loop to start CS-01 (Codex shim, repo tier) — fully
  specified, no open design questions.
- **Active files:** None uncommitted at time of writing this handoff (this edit and the
  session-close commit that follows it are the last changes on this branch before push).
- **Branch:** `sessions/2026-09-09-codex-support-scoping` (stays checked out; PR #220 targets `main`).
- **Blockers:** None technical. CS-03 (the only other gated epic) needs an operator-accepted
  ARC-045 and an operator-confirmed version number before it may even start, per
  `docs/plans/codex-support/PLAN.md`'s Authority & Delegation section — neither is due yet.
- **Pending Verification:** PR #220's `Lint, typecheck, test, build` check — `pending` at last
  check (`gh pr checks 220`, run at session close; `PR branch is rebased on target` and `Review
  round clear` had already passed). Verification action: re-run `gh pr checks 220` before merging;
  do not assume it is green solely because this session's local `npm test` runs were.
- **Notes:** Two things worth knowing before touching this program again. First, the Show Report
  golden-parity gate has a real, undiagnosed-in-code gap this session found and only worked around:
  any commit that regenerates a program's own `show-report.json`/`.html` must NOT carry an
  `Agent:`/`Persona:` trailer, or the next `check` run will see that very commit's trailer in its
  own `cast` count and report drift — see `TODO.md`'s new Show Report item for the full mechanism.
  This applies to every future `codex-support` epic's report regeneration, not just CS-00's.
  Second, `docs/plans/codex-support/PLAN.md` deliberately mirrors Become Current/Lessons
  Hardening/Show Report's own program shape (`PLAN.md`/`KICKOFF.md`/`OPERATOR-QUEUE.md`) rather
  than `spell-scope.prompt.md`'s literal `execution-plan.md` template — a considered adaptation to
  match this repo's own established convention, not a drift from the spell.
