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
| Tracking    | Internal — persisted in `src/assets/.arcane.json` (this repo's self-hosted source manifest, `tracking_mode: "internal"`), per ARC-032 (2026-08-22). No root `.arcane.json` exists in this checkout; spells resolve the self-hosted source manifest as documented in `spell-open-session.md` (`.arcane/spells/`, since 1.0.0). |

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
8. **Codex Support is the active program (CS-00–CS-08), activated 2026-09-09; CS-00 through CS-04 are merged and `1.1.0` is published.** [docs/plans/codex-support/PLAN.md](../docs/plans/codex-support/PLAN.md), PRD at `features/codex-support/PRD.md`, architecture at `features/codex-support/architecture.md`. Merged: CS-00 ([PR #220](https://github.com/codemagicianhq/arcane/pull/220)), CS-01 ([PR #221](https://github.com/codemagicianhq/arcane/pull/221), `0.39.0` — Codex ships), CS-02 ([PR #226](https://github.com/codemagicianhq/arcane/pull/226); ARC-045 accepted in [PR #230](https://github.com/codemagicianhq/arcane/pull/230)), the CHANGELOG catch-up ([PR #231](https://github.com/codemagicianhq/arcane/pull/231)), CS-03 — the canonical move, every client a generated shim — ([PR #232](https://github.com/codemagicianhq/arcane/pull/232), operator-merged, `v1.0.0`), and **CS-04 — the user tier: `spell init|update|status|uninstall --user`, the `~/.arcane` store holding canonical spells only, and the fan-out to `~/.agents/skills` (Codex + Copilot) and `~/.claude/commands` (Claude Code) under the ARC-038 hash rule — as [PR #234](https://github.com/codemagicianhq/arcane/pull/234), self-merged 2026-09-10, released as `v1.1.0` and on npm** (`publish.yml` confirmed, tarball inspected). Two premise corrections shipped with CS-04, recorded as ARC-045 implementation variances: VS Code has deprecated the `chat.*FilesLocations` settings and scans `~/.agents/skills` by default, so no settings snippet is printed; and the Claude Code file is a *command* under `~/.claude/commands/` because Copilot scans `~/.claude/skills` too. Two operator items are open in `docs/plans/codex-support/OPERATOR-QUEUE.md`, neither gating the next epic: Q-004 (Copilot Chat `/spell-status` through the repo shim) and Q-005 (Claude Code and Copilot at the user tier — the two clients no agent session can observe there; the operator's machine currently has **no** user tier installed, by design). **Next eligible epic: CS-05 (repo opt-out, `spell_scope`)** via `docs/plans/codex-support/KICKOFF.md`; CS-06 (agents at the user tier) follows it sequentially (shared `src/assets`/registry footprint); CS-08 (the restore-model spike, research only) may run any time. Two standing rules for this program: a show-report regeneration is its own commit that touches only the report files (trailer-free is no longer required since `1.1.1` anchored an active program's close on its last non-report commit — TODO.md's Show Report item, resolved), and never open a second PR that regenerates this program's report while another is open — whichever merges second must rebase and regenerate first.

---

## Next Session Handoff

> Auto-generated by spell-close-session. Consumed by spell-open-session. Do not edit manually.
> Generated: 2026-09-10
> ✓ Consumed: 2026-09-10

- **Active task:** Codex Support — CS-04 is merged and published (`1.1.0`); the next eligible epic is
  CS-05, the repository opt-out — `docs/plans/codex-support/PLAN.md ("CS-05 — Repo opt-out
  (`spell_scope`)")`. Not started.
- **Last completed step:** Merged [PR #234](https://github.com/codemagicianhq/arcane/pull/234) by
  rebase under the standing delegation (`dac7a8f`), confirmed `v1.1.0` released and `publish.yml`
  succeeded (npm `1.1.0` at 2026-09-10T15:47Z, tarball inspected), recorded the merge and publish in
  PLAN.md / OPERATOR-QUEUE.md Q-005 / stories.json, appended the verification ledger, and wrote this
  close-session record — pushed for its own docs PR.
- **Next concrete action:** Run `docs/plans/codex-support/KICKOFF.md`'s loop for CS-05
  (`docs/plans/codex-support/PLAN.md ("CS-05 — Repo opt-out (`spell_scope`)")`). Its empirical-first
  step: a fixture repository with the repo tier installed and a user tier in a stubbed home, so the
  opt-out's prune logic is designed against observed `spell update` behavior under the ARC-038 hash
  rule, never assumed. Reuse `componentForScope`, `isClientShimPath` and the manifest's `fanout` record
  from CS-04 rather than adding a second path contract. CS-06 follows sequentially; CS-08 may run any
  time.
- **Active files:** None uncommitted after the close-session commit.
- **Branch:** `sessions/2026-09-10-cs04-close` (deleted once its docs PR merges; then `main`).
- **Blockers:** None. Q-004 and Q-005
  (`docs/plans/codex-support/OPERATOR-QUEUE.md ("Q-005 — Try the user tier in Claude Code and VS Code Copilot (a few minutes, once)")`)
  are operator observations, informational for CS-05, not gates.
- **Pending Verification:** None — the PR #234 merge (`gh pr view 234 --json state,mergeCommit`), the
  `v1.1.0` release (`gh release view v1.1.0`) and the npm publish (`gh run view 34497846257`,
  `npm view arcane-cli version`) were each confirmed before this handoff was written.
- **Notes:** (1) The operator's machine has **no** user tier installed: the session's live check was
  uninstalled afterwards so the Claude Code personal-over-project precedence change stays the
  operator's decision (Q-005). (2) A show-report regeneration is its own commit touching only the
  report files (trailer-free no longer required since `1.1.1`), and never two open PRs regenerating
  `docs/plans/codex-support/show-report.*`
  (`TODO.md ("the golden-parity gate has no notion of an in-progress program")`). (3) `codex exec`
  blocks on stdin from a background shell; always `< /dev/null`
  (`docs/research/skill-discovery-smoke-tests.md ("Operational note for anyone repeating this")`).
  (4) A nested `claude -p` from this environment is not logged in and the running session's skill
  list is fixed at startup, so user-level Claude Code behavior cannot be observed from an agent session
  (`docs/research/skill-discovery-smoke-tests.md ("Probe 2 — Claude Code")`) — do not spend time
  retrying it. (5) A home path with a space is untested in the Claude stub's `@` include
  (`TODO.md ("a home path containing a space is untested")`).
