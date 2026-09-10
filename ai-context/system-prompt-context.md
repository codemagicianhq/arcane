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
8. **Codex Support is the active program (CS-00–CS-08), activated 2026-09-09; CS-03 is built and waiting on the operator's merge.** [docs/plans/codex-support/PLAN.md](../docs/plans/codex-support/PLAN.md), PRD at `features/codex-support/PRD.md`, architecture at `features/codex-support/architecture.md`. Merged the same day: CS-00 ([PR #220](https://github.com/codemagicianhq/arcane/pull/220)), CS-01 ([PR #221](https://github.com/codemagicianhq/arcane/pull/221), `0.39.0` — Codex ships), CS-02 ([PR #226](https://github.com/codemagicianhq/arcane/pull/226); ARC-045 accepted in [PR #230](https://github.com/codemagicianhq/arcane/pull/230)), and the CHANGELOG catch-up precondition ([PR #231](https://github.com/codemagicianhq/arcane/pull/231)). **CS-03 — the canonical move to `.arcane/spells/`, every client a generated shim, `1.0.0` — is reviewed and green as [PR #232](https://github.com/codemagicianhq/arcane/pull/232), operator-merged by design (a merged bump auto-publishes to npm).** Two operator items are open in `docs/plans/codex-support/OPERATOR-QUEUE.md`: Q-003 (merge #232, then confirm `publish.yml` succeeded before marking it done) and Q-004 (a one-minute Copilot Chat check of the shim — the one client no agent session can observe). Next epic after the merge: CS-04 (user tier install) via `docs/plans/codex-support/KICKOFF.md`; CS-08 (the restore-model spike) may run any time after CS-03 lands. Two standing rules for this program: every show-report regeneration is a trailer-free commit (TODO.md's Show Report item), and never open a second PR that regenerates this program's report while another is open — whichever merges second must rebase and regenerate first.

---

## Next Session Handoff

> Auto-generated by spell-close-session. Consumed by spell-open-session. Do not edit manually.
> Generated: 2026-09-09

- **Active task:** Codex Support CS-03 — the canonical spell move (`1.0.0`) — built, independently
  reviewed and green as [PR #232](https://github.com/codemagicianhq/arcane/pull/232), **awaiting the
  operator's merge**. Registered at `docs/plans/codex-support/PLAN.md ("CS-03 — Canonical move")` (box
  deliberately unticked until merged) and
  `docs/plans/codex-support/OPERATOR-QUEUE.md ("Q-003 — Confirm the version number for CS-03")`.
- **Last completed step:** Pushed the session-close commit and its trailer-free show-report
  regeneration to `sessions/2026-09-09-cs03-canonical-spells`, which updates PR #232 — the PR is open,
  not merged, and its checks on that new head were in flight when this handoff was written.
- **Next concrete action:** Operator: merge [PR #232](https://github.com/codemagicianhq/arcane/pull/232)
  (merge commit or rebase, never squash) once `gh pr checks 232` is green on the final head, then watch
  `publish.yml` for `1.0.0` and mark Q-003 done with the merge commit
  (`docs/plans/codex-support/OPERATOR-QUEUE.md ("Q-003 — Confirm the version number for CS-03")`);
  the one-minute Copilot check is
  `docs/plans/codex-support/OPERATOR-QUEUE.md ("Q-004 — Confirm the Copilot shim in VS Code (one minute)")`.
  After the merge, a fresh session runs `docs/plans/codex-support/KICKOFF.md` for CS-04
  (`docs/plans/codex-support/PLAN.md ("CS-04 — User tier install")`).
- **Active files:** None uncommitted after the session-close commit.
- **Branch:** `sessions/2026-09-09-cs03-canonical-spells` (stays checked out; PR #232 targets `main`).
- **Blockers:** None technical. CS-03's merge is operator-gated by the program's own Authority &
  Delegation section; CS-04 and CS-08 both depend on it landing.
- **Pending Verification:** PR #232 merge — pending (operator action) — `gh pr view 232 --json state,mergeCommit`.
  PR #232 checks on the session-close head — pending — `gh pr checks 232`. `1.0.0` publish — not yet
  dispatched (fires on the merge via `release-drift.yml` → `publish.yml`) —
  `gh run list --workflow publish.yml --limit 1`, then `npm view arcane-cli version`. Copilot Chat
  shim behavior — unverifiable from any agent session — Q-004's steps in VS Code.
- **Notes:** Three fragile things. (1) Every show-report regeneration for this active program must be
  a trailer-free commit, and never open a second PR that regenerates
  `docs/plans/codex-support/show-report.*` while #232 is open — whichever merges second must rebase and
  regenerate first (`TODO.md ("the golden-parity gate has no notion of an in-progress program")`).
  (2) `codex exec` blocks on stdin from a background shell; always `< /dev/null`
  (`docs/research/skill-discovery-smoke-tests.md ("Operational note for anyone repeating this")`).
  (3) Commit `649d4ce`'s message says `check:citations` had no new findings; it did — six citations
  broke with the move and were retargeted in `051a6ea`
  (`docs/verification-ledger.md ("Codex Support CS-03 (canonical spell move)")`).
