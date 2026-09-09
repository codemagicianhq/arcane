# Operator Queue — Codex Support

The only surface where the autonomous loop asks the operator for anything. The loop **appends**
entries (never edits existing ones, never acts on an entry not marked done). The operator executes
or decides, then marks the entry: `- [x] done YYYY-MM-DD — <note>`.

Format per entry: **What / Why / Preconditions / Exact commands / Rollback / Status.**

Cross-reference: Become Current's own `docs/plans/become-current/OPERATOR-QUEUE.md` Q-010 is the
item this program's CS-08 unparks — not duplicated here; CS-08 will append its own findings-based
entry to *this* queue once it runs.

---

## Q-001 — Merge CS-00

- **What:** Merge the PR that commits this plan's three files (`PLAN.md`, `KICKOFF.md`,
  `OPERATOR-QUEUE.md`), the `codex-support-plan` delegation record in `.arcane/delegations.json`,
  the completed `features/codex-support/PRD.md`, and `docs/research/skill-discovery-smoke-tests.md`.
- **Why:** This merge *is* the grant — nothing in this plan authorizes autonomous execution until
  it lands, mirroring exactly how Become Current's BC-00, Lessons Hardening's LH-00, and Show
  Report's SR-00 each activated their program's delegation.
- **Preconditions:** CS-00's PR is open with all required checks green.
- **Exact commands:** review and merge the CS-00 pull request via GitHub's own UI or
  `gh pr merge <PR#> --rebase`.
- **Rollback:** revert the merge commit, or edit/remove the `codex-support-plan` entry from
  `.arcane/delegations.json` at any later point to revoke the grant without touching history.
- **Status:** [x] done 2026-09-09 — merged by the operator ([PR #220](https://github.com/codemagicianhq/arcane/pull/220), merge commit `9c3ca28`, confirmed via `gh pr view 220`). The `codex-support-plan` delegation is active as of this merge.

## Q-002 — Accept, revise, or reject ARC-045

- **What:** Decide on the ADR CS-02 drafts as `Proposed` in `DECISIONS.md`: "One Spell Source,
  Thin Client Shims, and a User-Level Tier" — the canonical spell source moves to
  `.arcane/spells/<id>.md`, every client surface (Copilot, Claude, Codex) becomes a generated shim
  over it, a user-level install tier is introduced, and ARC-033 decision 1 / ARC-019 /
  `portable-bootstrap.md` are amended accordingly.
- **Why:** Accepting an ADR is never within any delegation's grant in this repository — always an
  explicit operator decision, regardless of autonomy level elsewhere. CS-03 (the canonical move)
  cannot start until this is `Accepted`.
- **Preconditions (met):** CS-01 shipped ([PR #221](https://github.com/codemagicianhq/arcane/pull/221),
  merged, `arcane-cli` 0.39.0 published) so the ADR reflects what actually exists; CS-02's PR is
  open with the ADR drafted `Proposed` — [PR #226](https://github.com/codemagicianhq/arcane/pull/226),
  awaiting your merge (ADR-drafting PRs are operator-gated regardless of the active delegation).
- **Exact commands:** read the ADR section in `DECISIONS.md`, then record the decision here and,
  if accepted, flip its `Status:` field to `Accepted` (or ask the executing session to do so on
  your behalf in the same PR once you've decided).
- **Rollback:** an accepted ADR can later be superseded via a new ADR entry, per
  `decision-documentation-standard.md`'s own supersession convention.
- **Status:** [ ] open

## Q-003 — Confirm the version number for CS-03

- **What:** CS-03 (moving the canonical spell source and converting every client to a generated
  shim) is a breaking change to the distribution contract and will bump `package.json`'s version.
  This plan recommends **1.0.0** ("one source of truth, N thin clients" — the framework's first
  stable-contract milestone), as an alternative to continuing the `0.x` line (e.g. `0.40.0`).
- **Why:** a merged version bump auto-publishes to npm within minutes
  (`release-drift.yml` → `publish.yml`) — this is a one-way door for every existing `arcane-cli`
  consumer, so the exact number is an explicit operator call, not an autonomous default, per this
  plan's own Authority & Delegation exclusion list.
- **Preconditions:** ARC-045 is `Accepted` (Q-002); the CHANGELOG.md catch-up (0.22.0 → current)
  has landed, so whichever version is chosen has a real changelog behind it.
- **Exact commands:** record the chosen version number here. The executing session applies it via
  the repo's normal `npm version` flow in CS-03's own PR.
- **Rollback:** none needed before the fact — this is a decision recorded ahead of the irreversible
  publish, not an action to undo.
- **Operator pre-decision (recorded 2026-09-09, via conversation, ahead of ARC-045's acceptance):**
  **1.0.0** — "one source of truth, N thin clients," the framework's first stable-contract milestone,
  over continuing the `0.x` line. This note records the decision's substance only; the preconditions
  above (ARC-045 `Accepted`, CHANGELOG catch-up landed) still gate CS-03 itself, and this item is not
  marked done until both are satisfied and CS-03's own PR applies `npm version major`.
- **Status:** [ ] open

<!-- The loop appends Q-004+ below this line. -->
