# Operator Queue — Lessons Hardening

The only surface where the autonomous loop asks the operator for anything. The loop **appends**
entries (never edits existing ones, never acts on an entry not marked done). The operator executes
or decides, then marks the entry: `- [x] done YYYY-MM-DD — <note>`.

Format per entry: **What / Why / Preconditions / Exact commands / Rollback / Status.**

Cross-reference: Become Current's own `docs/plans/become-current/OPERATOR-QUEUE.md` still carries
Q-009/Q-010/Q-011 — items outside this program's scope. Not duplicated here.

---

## Q-001 — Merge LH-00

- **What:** Merge the PR that commits this plan's three files (`PLAN.md`, `KICKOFF.md`,
  `OPERATOR-QUEUE.md`) and the `lessons-hardening-plan` delegation record in
  `.arcane/delegations.json`.
- **Why:** This merge *is* the grant — nothing in this plan authorizes autonomous execution until
  it lands, mirroring exactly how Become Current's BC-00 activated that program's delegation.
- **Preconditions:** LH-00's PR is open with all required checks green.
- **Exact commands:** review and merge the LH-00 pull request via GitHub's own UI or
  `gh pr merge <PR#> --rebase`.
- **Rollback:** revert the merge commit, or edit/remove the `lessons-hardening-plan` entry from
  `.arcane/delegations.json` at any later point to revoke the grant without touching history.
- **Status:** [x] done 2026-09-02 — merged by the operator ([PR #172](https://github.com/codemagicianhq/arcane/pull/172)), activating the `lessons-hardening-plan` delegation. **Found stale during LH-13's closing audit:** this line still read `[ ] open` after the merge — verified directly against `gh pr view 172` rather than assumed — a fresh, live instance of the exact static-status-drift pattern (P1) this program exists to catch, caught in this program's own queue at closing time.

## Q-002 — Approve and merge RCA-001

- **What:** Review and merge the pull request LH-02 opens, containing `docs/rcas/RCA-001-<slug>.md`
  (this repository's first RCA) and the artifact-path amendment to `rca-process-standard.md`.
- **Why:** [[rca-process-standard]] requires human approval for every RCA — "RCAs are never
  auto-committed" — the same rule that gates every interactive commit in this repo, applied here
  regardless of the standing delegation.
- **Preconditions:** LH-02 has shipped its PR with the RCA content and required checks green.
- **Exact commands:** review `docs/rcas/RCA-001-*.md` for accuracy against the corrections it cites,
  then `gh pr merge <PR#> --rebase`. **If the loop has shipped other `src/assets/`-touching epics
  while this one waited** (expected, since RCA review is the one thing that can't be rushed to keep
  the rest of the program moving): the loop rebases this PR onto current `main` and re-runs
  `npm version patch` before asking again, so its version bump lands on whatever patch number is
  actually next rather than colliding with one already claimed and merged — this is normal, not a
  sign anything went wrong. LH-02's own PR description will say which version it bumped to at
  request time.
- **Rollback:** revert the merge commit; the RCA record stays as a historical artifact per
  `records-conventions.md` rather than being deleted.
- **Status:** [ ] open

## Q-003 — Accept, revise, or reject ARC-041

- **What:** Decide on the ADR LH-11 drafts as `Proposed` in `DECISIONS.md`, amending ARC-031
  decision 3: whether `resolvePrivateTokens()` may read the org-token privacy denylist from a file
  outside the repository (e.g. `~/.arcane/org-tokens`) in addition to the `ARCANE_ORG_TOKENS` CI
  secret, closing the gap that let a real client name leak into shipped content twice in immediate
  succession on 2026-09-01 (`a8d8263`/`513f6d8` — the second leak was the first fix's own closure
  note re-quoting the name it described removing) with no local way to catch it before pushing.
  (This line was already corrected once, in LH-02's own then-still-unmerged PR #174 — Q-002 below
  — but every epic since branched from a `main` that didn't have that fix yet, since LH-02 hadn't
  merged. Reapplied here rather than left stale a second time; this is that predicted trivial
  conflict, resolved now that #174 is finally being rebased.)
- **Why:** Accepting an ADR is never within any delegation's grant in this repository — always an
  explicit operator decision, regardless of autonomy level elsewhere.
- **Preconditions:** LH-11's PR is open with the ADR drafted `Proposed`, including its own
  empirical-first findings (whether `.gitignore`'s `~/.arcane/` pattern is currently a no-op, and the
  measured cost of a staged-only pre-commit scan).
- **Exact commands:** read the ADR section in `DECISIONS.md`, then record the decision here and, if
  accepted, flip its `Status:` field to `Accepted` (or ask the executing session to do so on your
  behalf in the same PR once you've decided).
- **Rollback:** an accepted ADR can later be superseded via a new ADR entry, per
  `decision-documentation-standard.md`'s own supersession convention — nothing here is irreversible.
- **Operator pre-decision (recorded 2026-09-02, via conversation, ahead of LH-11 drafting the ADR —
  the operator asked to front-load blocking decisions before an unattended overnight run):**
  - Adopt at all: **yes**.
  - Default path: **yes** — try `~/.arcane/org-tokens` when `ARCANE_ORG_TOKENS_FILE` is unset.
  - File format: not a real open question — `resolvePrivateTokens()` already splits
    `ARCANE_ORG_TOKENS` on `/[,\r\n]+/` ([scripts/org-token-lint.ts](../../../scripts/org-token-lint.ts),
    function `resolvePrivateTokens`); the local file reuses that identical delimiter convention rather
    than inventing a new format.
  - This note records the decision's substance only. LH-11 still drafts the ADR text and its own
    empirical-first findings (the `.gitignore` no-op check, the staged-scan cost measurement) — per
    the "Exact commands" line above, LH-11 may flip `Status:` to `Accepted` and check this item done
    in the same PR, citing this note, since the operator already decided.
- **Acted upon 2026-09-02 (LH-11):** ARC-041 drafted in `DECISIONS.md` reflecting this pre-decision
  exactly (adopt yes, default path `~/.arcane/org-tokens`, format = `resolvePrivateTokens()`'s own
  existing delimiter convention), empirical-first findings included (`.gitignore`'s `~/.arcane/`
  pattern confirmed a no-op; a real 100-file scan timed at 29.0ms), and its own `Status:` field
  flipped straight to `Accepted` in the same PR per the allowance above — the operator already
  decided, so there was nothing left to leave `Proposed`.
- **Status:** [x] done 2026-09-02 — [ARC-041](../../../DECISIONS.md#arc-041--a-local-out-of-repo-supply-channel-for-the-org-token-privacy-denylist) accepted.

<!-- The loop appends Q-004+ below this line. -->
