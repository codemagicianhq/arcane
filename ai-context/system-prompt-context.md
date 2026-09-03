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
3. **Show Report — active since 2026-09-03; SR-00 through SR-03 shipped that day.** [docs/plans/show-report/PLAN.md](../docs/plans/show-report/PLAN.md) (`status: active`), PRD at `features/show-report/PRD.md`, [ARC-042](../DECISIONS.md#arc-042--show-report-compiled-template-distribution-model-and-program-decisions) **Accepted** (all seven decisions; the name stays "Show Report" — weighed against `naming-conventions.md`'s Naming Test, not defaulted to). Shipped: SR-00 activation ([PR #192](https://github.com/codemagicianhq/arcane/pull/192)), SR-01 parsers/model/JSON + 47 `**Report:**` lines ([#194](https://github.com/codemagicianhq/arcane/pull/194), [#195](https://github.com/codemagicianhq/arcane/pull/195)), SR-02 renderer + v0 template + `check:report` warn-mode gate ([#197](https://github.com/codemagicianhq/arcane/pull/197)), SR-03 `spell report` + the `publish.yml` shallow-checkout fix ([#198](https://github.com/codemagicianhq/arcane/pull/198), `v0.35.0` — confirmed on npm). Goal unchanged: generated program-completion reports, eventually rendered from an arcane-ui-compiled offline Mustache template vendored into public `arcane-cli`. The `show-report-plan` delegation is live; Q-001/Q-002 done, **Q-003 open** (the orphan `v0.34.3` release — operator-only, and do not re-run that tag's publish). Next in-repo epic: **SR-04** (the `## For the record` capture point); SR-05a/SR-05b execute in the private arcane-ui repo, not this loop, and SR-06 waits on them.
4. **Not everything left open is operator-scoped — corrected 2026-09-03.** [TODO.md](../TODO.md)'s `## Parked — Needs Operator` section and Become Current's own [OPERATOR-QUEUE.md](../docs/plans/become-current/OPERATOR-QUEUE.md) Q-009/Q-010/Q-011 remain genuinely operator-gated, but non-Parked `TODO.md` items are agent-actionable now with no operator input required. The four this note originally named were all closed 2026-09-03 (ARC-041's TOC row and the "7 rows" miscount in the drift pass; the PLAN.md PR-link backfill in SR-01; the stale completion-ledger stat rail in SR-02). Still open and needing no operator input: the MEDIUM **"Claude Code worktree branches bypass Arcane's branch-naming standard"** (its operator decision is already recorded — rename-on-sight, ARC-023 — so it only needs implementing), a MEDIUM on five spells' diverged `tracking_mode` resolution logic, a MEDIUM on spells installable without the governance doc they cite, and a LOW on `DECISIONS.md`'s ARC-031 mis-citation (needs the root ADR identified first). A fresh session should read `TODO.md`'s Open Items before assuming only Parked/OPERATOR-QUEUE work remains.
5. **ARC-020 stays Proposed, with its full remainder still open — NOT folded into BC-11/ARC-038** (corrected 2026-09-02; the two ADRs sit on different axes: ARC-020's remainder is manifest *data fields*, ARC-038 is governance-*content* architecture — see [OPERATOR-QUEUE.md Q-005](../docs/plans/become-current/OPERATOR-QUEUE.md#q-005--arc-020-broad-schema-still-open-not-subsumed-by-bc-11)). Two prior amendments (ARC-030, ARC-032) already resolved narrower slices; the operator's own direction is to close the rest incrementally, one field group per future epic that needs it — not as a dedicated epic.
6. **ARC-028 (concurrency and isolation model) is Accepted**, named **session workspace**. Do not hardcode a version number here — it goes stale (this line itself said `0.33.1` while `main` was already at `0.33.2`, corrected 2026-09-02); run `spell-open-session`'s own two-axis version check for the current reading instead.
7. **Watch for the worktree-misdirect tool bug** (Edit/Write silently landing in the primary checkout instead of the active linked worktree — [journal/2026-08-22-ef-batch-closeout.md](../journal/2026-08-22-ef-batch-closeout.md)). Not recurred in recent sessions, but verify independently every time rather than trusting a clean streak.

---

## Next Session Handoff

> Auto-generated by spell-close-session. Consumed by spell-open-session. Do not edit manually.
> Generated: 2026-09-03

- **Active task:** None in progress. The Show Report program is **active and four epics deep** —
  SR-00 through SR-03 all shipped and merged this session. Nothing was left half-done; the next
  epic is `docs/plans/show-report/PLAN.md ("SR-04")`, not yet started.
- **Last completed step:** Merged [PR #198](https://github.com/codemagicianhq/arcane/pull/198)
  (SR-03) via rebase, confirmed `arcane-cli@0.35.0` reached npm (`npm view arcane-cli version`),
  then ran `spell-close-session` on branch `docs/session-close-2026-09-03`.
- **Next concrete action:** Run **SR-04** from `docs/plans/show-report/PLAN.md ("SR-04")` — add the
  `## For the record` heading to `spell-create-pull-request.prompt.md` and the "Record" step to the
  loop protocol / `spell-close-session`, so an epic's `**Report:**` line is authored at PR time
  instead of backfilled; `--check` warns on `unwritten`. Touches `src/assets/` (prompts), so it
  needs a patch bump and `fix:self-host-parity`. Alternatively, clear
  `docs/plans/show-report/OPERATOR-QUEUE.md ("Q-003 — v0.34.3 exists as a tag and GitHub release but never reached npm")`
  first — it is operator-only and takes one command.
- **Active files:** None uncommitted beyond this close itself —
  `journal/2026-09-03-show-report-sr00-sr03.md`, `ai-context/system-prompt-context.md`,
  `docs/plans/show-report/PLAN.md`, `TODO.md`, `project.md`.
- **Branch:** `docs/session-close-2026-09-03`.
- **Blockers:** None in this repository. **SR-06 is blocked cross-repo** until SR-05a (Claude Design
  pass) and SR-05b (arcane-ui static-export build) ship in the private arcane-ui repo — those run
  under that repo's own governance and are explicitly outside this loop and this delegation.
- **Pending Verification:** None. Every PR opened this session (#192, #194, #195, #196, #197, #198)
  was confirmed `MERGED` via `gh pr view`; `v0.35.0`'s publish was confirmed `success` with
  `npm view arcane-cli version` returning `0.35.0`. The one `failed` item, `v0.34.3`'s publish, is
  resolved and recorded as Q-003 — nothing about it is still in flight.
- **Notes:** Two things worth carrying, both registered durably rather than living here. (1) The
  orphan `v0.34.3` GitHub release implies an npm artifact that does not exist — logged as
  `docs/plans/show-report/OPERATOR-QUEUE.md ("Q-003 — v0.34.3 exists as a tag and GitHub release but never reached npm")`;
  **do not re-run that tag's publish**, its commit still carries the shallow `publish.yml`.
  (2) This session had at least three real correction events (the "version at close" definition,
  wrong twice before right; `gh pr checks --watch` reporting success before any checks existed; a
  fixture whose incoherent dates made a new test fail on a false premise) — the narrative is in
  `journal/2026-09-03-show-report-sr00-sr03.md`, but the structured calibration record is not
  written; run `spell-verification-ledger` to add it.
