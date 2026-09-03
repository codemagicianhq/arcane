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
3. **Show Report — active since 2026-09-03; SR-00 through SR-02 shipped that day.** [docs/plans/show-report/PLAN.md](../docs/plans/show-report/PLAN.md) (`status: active`), PRD at `features/show-report/PRD.md`, [ARC-042](../DECISIONS.md#arc-042--show-report-compiled-template-distribution-model-and-program-decisions) **Accepted** (all seven decisions; the name stays "Show Report"). Shipped: SR-00 activation ([PR #192](https://github.com/codemagicianhq/arcane/pull/192)), SR-01 parsers/model/JSON + 47 `**Report:**` lines ([#194](https://github.com/codemagicianhq/arcane/pull/194), [#195](https://github.com/codemagicianhq/arcane/pull/195)), SR-02 renderer + v0 template + `check:report` warn-mode gate ([#197](https://github.com/codemagicianhq/arcane/pull/197), `v0.34.3`). Goal unchanged: generated program-completion reports, eventually rendered from an arcane-ui-compiled offline Mustache template vendored into public `arcane-cli`. The `show-report-plan` delegation is live; Q-001/Q-002 are done. Next in-repo epics: **SR-03** (`spell report` command) and SR-04 (the capture point); SR-05a/SR-05b execute in the private arcane-ui repo, not this loop, and SR-06 waits on them.
4. **Not everything left open is operator-scoped — corrected 2026-09-03.** [TODO.md](../TODO.md)'s `## Parked — Needs Operator` section and Become Current's own [OPERATOR-QUEUE.md](../docs/plans/become-current/OPERATOR-QUEUE.md) Q-009/Q-010/Q-011 remain genuinely operator-gated, but several non-Parked `TODO.md` items are agent-actionable now with no operator input required: three LOW doc-fix items (`DECISIONS.md`'s missing ARC-041 TOC row; `docs/verification-ledger.md`'s stale "7 rows" prose count, actually 8), and one MEDIUM item — "Claude Code worktree branches bypass Arcane's branch-naming standard" — which already has its operator decision recorded (rename-on-sight, ARC-023) and only needs implementation. Two further LOW items (a PLAN.md PR-link backfill and a stale completion-ledger stat rail) are explicitly routed to Show Report's SR-01/SR-02 rather than hand-fixed now. A fresh session should read `TODO.md`'s Open Items before assuming only Parked/OPERATOR-QUEUE work remains.
5. **ARC-020 stays Proposed, with its full remainder still open — NOT folded into BC-11/ARC-038** (corrected 2026-09-02; the two ADRs sit on different axes: ARC-020's remainder is manifest *data fields*, ARC-038 is governance-*content* architecture — see [OPERATOR-QUEUE.md Q-005](../docs/plans/become-current/OPERATOR-QUEUE.md#q-005--arc-020-broad-schema-still-open-not-subsumed-by-bc-11)). Two prior amendments (ARC-030, ARC-032) already resolved narrower slices; the operator's own direction is to close the rest incrementally, one field group per future epic that needs it — not as a dedicated epic.
6. **ARC-028 (concurrency and isolation model) is Accepted**, named **session workspace**. Do not hardcode a version number here — it goes stale (this line itself said `0.33.1` while `main` was already at `0.33.2`, corrected 2026-09-02); run `spell-open-session`'s own two-axis version check for the current reading instead.
7. **Watch for the worktree-misdirect tool bug** (Edit/Write silently landing in the primary checkout instead of the active linked worktree — [journal/2026-08-22-ef-batch-closeout.md](../journal/2026-08-22-ef-batch-closeout.md)). Not recurred in recent sessions, but verify independently every time rather than trusting a clean streak.

---

## Next Session Handoff

> Auto-generated by spell-close-session. Consumed by spell-open-session. Do not edit manually.
> Generated: 2026-09-02

- **Active task:** None in progress. The Show Report program is **planned and saved as a draft,
  not started** — the operator approved the plan and chose "save for the next session." Registered
  at [docs/plans/show-report/PLAN.md](../docs/plans/show-report/PLAN.md) (`status: draft`); its
  first epic is `docs/plans/show-report/PLAN.md ("SR-00")`. Lessons Hardening and Become Current
  are both fully closed.
- **Last completed step:** Landed the three research memos as `docs/research/show-report-*.md`
  (local paths normalized, leak scan clean), wrote the draft plan, filed five `IDEAS.md` and five
  `TODO.md` entries through `spell-save-idea`/`spell-todo`, and wrote
  [journal/2026-09-02-show-report-research-and-planning.md](../journal/2026-09-02-show-report-research-and-planning.md)
  — all on `sessions/2026-09-02-show-report-plan-draft`, about to be committed and opened as a
  docs-only PR (not yet merged at the time this block was written).
- **Next concrete action:** On an explicit operator go, run **SR-00** from
  `docs/plans/show-report/PLAN.md ("SR-00")`: `spell-open-session` with focus `show-report: SR-00`,
  then `spell-plan` → `features/show-report/PRD.md` (tracking_mode internal), draft **ARC-042**
  `Proposed`, create KICKOFF.md + OPERATOR-QUEUE.md + the `show-report-plan` delegation record,
  flip the plan to `status: active`, and open the PR the operator merges to activate the grant.
  Do not start SR-00 without that go — the operator separates approving a plan from starting it.
- **Active files:** `docs/plans/show-report/PLAN.md`, `docs/research/show-report-feasibility.md`,
  `docs/research/show-report-design.md`, `docs/research/show-report-narrative.md`, `IDEAS.md`,
  `TODO.md`, `journal/2026-09-02-show-report-research-and-planning.md`,
  `ai-context/system-prompt-context.md` — on `sessions/2026-09-02-show-report-plan-draft`.
- **Branch:** `sessions/2026-09-02-show-report-plan-draft`.
- **Blockers:** None. The seven operator-owned decisions in the plan (template licensing into MIT,
  the name, the `mustache` dependency, design tool, export-contract scope, fonts, arcane-ui
  tagging) are inputs to SR-00's ARC-042, not blockers on saving.
- **Pending Verification:** The docs-only PR for this branch — `dispatched` once pushed —
  `gh pr checks <PR#>` then `gh pr view <PR#> --json state,mergedAt`.
- **Notes:** The plan also lives at `~/.claude/plans/show-report.md` (renamed from the random slug
  Claude Code's plan mode generated — the same random-name class as the `claude/*` branches now
  tracked as a MEDIUM item in `TODO.md ("Claude Code worktree branches bypass Arcane's branch-naming standard")`).
  Two lessons worth carrying: agent-written research cites absolute local paths including the
  operator's username — scan and normalize before committing anything an agent wrote; and this
  Bash layer mangles backslashes inside heredocs, so build regex escapes programmatically. The
  research memos are `status: active` research docs; the plan is `status: draft` and therefore
  outside the living-docs citation/stale-claim gates until SR-00 activates it.

> ✓ Consumed: 2026-09-03
