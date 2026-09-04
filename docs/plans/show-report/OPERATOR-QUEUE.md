# Operator Queue — Show Report

The only surface where the autonomous loop asks the operator for anything. The loop **appends**
entries (never edits existing ones, never acts on an entry not marked done). The operator executes
or decides, then marks the entry: `- [x] done YYYY-MM-DD — <note>`.

Format per entry: **What / Why / Preconditions / Exact commands / Rollback / Status.**

Cross-reference: Become Current's own `docs/plans/become-current/OPERATOR-QUEUE.md` still carries
Q-009/Q-010/Q-011 — items outside this program's scope. Not duplicated here.

---

## Q-001 — Merge SR-00

- **What:** Merge the PR that commits this plan's activation artifacts — `PLAN.md` flipped to
  `status: active`, `KICKOFF.md`, this file, `features/show-report/PRD.md`, ARC-042 drafted
  `Proposed` in `DECISIONS.md` — and the `show-report-plan` delegation record in
  `.arcane/delegations.json`.
- **Why:** This merge *is* the grant — nothing in this plan authorizes autonomous execution until it
  lands, mirroring exactly how Become Current's BC-00 and Lessons Hardening's LH-00 activated those
  programs' delegations.
- **Preconditions:** SR-00's PR is open with all required checks green.
- **Exact commands:** review and merge the SR-00 pull request via GitHub's own UI or
  `gh pr merge <PR#> --rebase`.
- **Rollback:** revert the merge commit, or edit/remove the `show-report-plan` entry from
  `.arcane/delegations.json` at any later point to revoke the grant without touching history.
- **Status:** [x] done 2026-09-03 — merged by the operator ([PR #192](https://github.com/codemagicianhq/arcane/pull/192), merge SHA `16fe081`, verified via `gh pr view 192 --json state,mergedAt` at the time rather than assumed), activating the `show-report-plan` delegation. SR-01 ([PR #194](https://github.com/codemagicianhq/arcane/pull/194)) has since shipped under it. **Found stale during Q-002's closure:** this line still read `[ ] open` several hours after the merge — the same static-status-drift pattern (P1) Lessons Hardening's own Q-001 exhibited, caught here the same way.

## Q-002 — Accept, revise, or reject ARC-042

- **What:** Decide on [ARC-042](../../../DECISIONS.md#arc-042--show-report-compiled-template-distribution-model-and-program-decisions),
  drafted `Proposed` in `DECISIONS.md`, recording the seven decisions `PLAN.md`'s own "Decisions the
  operator owns" section named:
  1. Licensing of the compiled template (recommended: yes, with a license notice).
  2. Name — "Show Report" (default) vs. "Completion Report".
  3. Add `mustache` as a new `arcane-cli` dependency (recommended: yes).
  4. Design tool — Claude Design via `/design-sync` (already operator-stated intent; recorded for
     the record).
  5. Export-contract scope — register only Show Report now (recommended) vs. the whole exportable
     subset up front.
  6. Fonts — no licensing action needed (recorded for the record; no decision required).
  7. `arcane-ui` release tagging — tag every publish going forward (recommended: yes).
- **Why:** Accepting an ADR is never within any delegation's grant in this repository — always an
  explicit operator decision, regardless of autonomy level elsewhere, the same rule Lessons
  Hardening's ARC-041 (Q-003 there) and Become Current's ARC-037 (Q-006 there) were both held to.
- **Preconditions:** ARC-042 is drafted `Proposed` in `DECISIONS.md` with all seven decisions
  recorded (done, as part of SR-00).
- **Exact commands:** read the ADR section in `DECISIONS.md`, then record the decision here and, if
  accepted as-is, flip its `Status:` field to `Accepted` (or ask the executing session to do so on
  your behalf in the same PR once you've decided). Any decision point revised or rejected should be
  noted here with the reason, so SR-01 onward build against the corrected contract rather than the
  draft.
- **Rollback:** an accepted ADR can later be superseded via a new ADR entry, per
  `decision-documentation-standard.md`'s own supersession convention — nothing here is irreversible.
- **Status:** [x] done 2026-09-03 — [ARC-042](../../../DECISIONS.md#arc-042--show-report-compiled-template-distribution-model-and-program-decisions) accepted as drafted, all seven decisions. The operator explicitly reconsidered decision 2 (the name) against `naming-conventions.md`'s Naming Test — whether a coined Arcane-lingo name was warranted — and kept "Show Report": it is already earned theater lingo (a stage manager's post-performance record, mapping directly onto epics/corrections/dates/cast), it satisfies the Systems/Services tier's functional-clarity rule for technical payloads (`spell report`, `show-report.json`), and the autonomy corollary ("the more autonomous the tool, the more boring its name") points the same way for an unattended CI generator. Status flipped by the executing session on the operator's behalf per this entry's own "Exact commands" allowance.

## Q-003 — v0.34.3 exists as a tag and GitHub release but never reached npm

- **What:** Informational, plus one optional platform action. SR-02's merge bumped `main` to `0.34.3`; `release-drift.yml` created the tag and release, but `publish.yml` (run `33788319964`) failed in its pre-publish test step, so npm still serves `0.34.2`. Cause, found and fixed in SR-03: `publish.yml`'s checkout used the default shallow clone while `ci.yml`'s test job uses `fetch-depth: 0`; show-report's golden parity test derives the version span and cast from git history, silently omitted them in the shallow clone, and reported the omission as drift. SR-03 sets `fetch-depth: 0` in `publish.yml`, makes the generator say "shallow clone" instead of "drifted", and ships as `0.35.0`, which publishes normally and supersedes `0.34.3`.
- **Why:** Re-running a publish workflow and editing or deleting a GitHub release are both outside the delegation grant (workflow dispatch; platform mutation). Nothing is needed for correctness — versions need not be contiguous on npm — but the `v0.34.3` release page implies an artifact that does not exist.
- **Preconditions:** SR-03 merged and `0.35.0` confirmed on npm (`npm view arcane-cli version`).
- **Exact commands (optional):** annotate the release — `gh release edit v0.34.3 --notes "Never published to npm: the publish job failed on a shallow-checkout test defect fixed in v0.35.0 (SR-03). Use 0.35.0."` — or delete it and its tag (`gh release delete v0.34.3 --cleanup-tag`) if you prefer no orphan release. Do **not** re-run the `v0.34.3` publish: that tag's commit still carries the shallow-checkout `publish.yml`.
- **Rollback:** `gh release edit` is reversible; deleting the tag is not (the commit itself remains on `main`).
- **Status:** [x] done 2026-09-03 — operator chose **annotate, not delete** (the reversible option; the tag stays as a record). [The `v0.34.3` release](https://github.com/codemagicianhq/arcane/releases/tag/v0.34.3) now opens with "This version was never published to npm. Use `v0.35.0` or later," explains the shallow-checkout cause and the SR-03 fix, and states that re-running its publish would fail the same way because that commit still carries the old `publish.yml`. Applied with `gh release edit v0.34.3 --notes ...` and verified by reading `gh release view v0.34.3 --json body` back, rather than trusting the command's own success output.

<!-- The loop appends Q-004+ below this line. -->
