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

---

## Next Session Handoff

> Auto-generated by spell-close-session. Consumed by spell-open-session. Do not edit manually.
> Generated: 2026-09-06
> ✓ Consumed: 2026-09-09 — durability check passed (both cited TODO.md items still exist,
> unchecked). Flagged as stale on consumption: 3 commits landed on main after this handoff was
> written (test-timeout budgeting, ARC-044 draft, spell-vet feature suggestion) and a session
> branch (`sessions/2026-09-09-codex-support-scoping`) with a staged `features/codex-support/PRD.md`
> already existed at open-session time — none of this is reflected in this block's "Active task:
> None" / "Nothing is in progress" claim. See journal for this session's own accounting.

- **Active task:** None. SR-07's automation was enabled and verified end to end, resolving the last
  disclosed deviation from the Show Report program's close. Nothing is in progress in either repo.
- **Last completed step:** Merged [PR #216](https://github.com/codemagicianhq/arcane/pull/216) — the
  first pull request this repo has received from the arcane-ui pipeline rather than a human — and
  confirmed `arcane-cli` **0.38.3** on npm (`dist-tags.latest`), carrying the `arcane-ui v2.1.7`
  template.
- **Next concrete action:** Nothing in Show Report is startable. Pick up the highest-value unrelated
  item: `TODO.md ("MEDIUM: Claude Code worktree branches bypass Arcane's branch-naming standard")`,
  whose operator decision is already recorded (rename-on-sight, ARC-023) so it only needs
  implementing. `TODO.md ("MEDIUM: Show Report's share lens (was SR-05c)")` is the other open item,
  but it was deliberately deferred and needs an operator decision before it is worth starting.
- **Active files:** None uncommitted. Last edits: `docs/plans/show-report/PLAN.md`,
  `ai-context/system-prompt-context.md`, `journal/2026-09-06-sr-07-enablement.md`.
- **Branch:** `docs/session-close-2026-09-06` (this close's own branch; `main` after it merges).
- **Blockers:** None.
- **Pending Verification:** None. Every item dispatched this session resolved to `succeeded`: four
  arcane-ui PRs (!835, !836, !839, !841) completed, PR #216 merged, 0.38.3 confirmed on npm, arcane-ui
  2.1.7 tagged, all pipeline runs succeeded with none in flight, and the automation branch was deleted
  from the remote on merge.
- **Notes:** The vendoring automation is now live and will open PRs here on its own. Three things to
  know before reacting to one. It fires **only when the compiled template body actually differs** —
  unrelated arcane-ui work produces nothing, and the comparison deliberately ignores the template's
  first line, which carries the arcane-ui version and would otherwise change every release. Its PRs
  **require a human approval even on green**, because `main`'s ruleset demands extra approval for
  unattributed changes and the bot commits as a non-GitHub identity — that is the safety property, not
  a snag. And it is disabled by setting `VENDORING_ENABLED` to anything but `true` in
  `vg-arcane-ui-vendoring`, **never** by deleting that group, which is referenced at pipeline root and
  whose absence fails the whole arcane-ui pipeline.
