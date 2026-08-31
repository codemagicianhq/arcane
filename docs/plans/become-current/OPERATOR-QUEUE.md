# Operator Queue — Become Current

The only surface where the autonomous loop asks the operator for anything. The loop **appends**
entries (never edits existing ones, never acts on an entry not marked done). The operator executes
or decides, then marks the entry: `- [x] done YYYY-MM-DD — <note>`.

Format per entry: **What / Why / Preconditions / Exact commands / Rollback / Status.**

---

## Q-001 — Wire `Review round clear` into the protect-main ruleset

- **What:** add the third required status check mandated by ARC-035 decision 2.
- **Why:** platform-settings mutation — outside the delegation grant; a misconfigured required
  check hard-locks every PR (`current_user_can_bypass: "never"`).
- **Preconditions (hard):** BC-01 merged; the `Review round clear` job has reported **green on at
  least one live PR** (verify in the PR's checks tab or `gh pr checks`).
- **Command** (adds to the existing two contexts; verify current state first):

  ```bash
  gh api repos/codemagicianhq/arcane/rulesets/18841659 --jq '.rules[] | select(.type=="required_status_checks").parameters.required_status_checks'
  ```

  Then apply the PUT the BC-01 session will append here verbatim once the job name is final
  (it must include ALL rules of the ruleset — a partial PUT drops the others; the session
  prepares the full JSON payload file).
- **Rollback:** re-PUT the saved pre-change ruleset JSON (the BC-01 session attaches it here).
- **Status:** waiting on BC-01.

## Q-002 — Decide: re-enable `allow_auto_merge`

- **What:** `gh api -X PATCH repos/codemagicianhq/arcane -f allow_auto_merge=true`
- **Why:** it is `false` today (changed undocumented after the 2026-08-23 incident); ARC-035
  narrowed auto-merge instead of removing it, assuming it returns. With Q-001 in place the
  PR #63 failure shape is closed.
- **Preconditions:** Q-001 done.
- **Rollback:** same PATCH with `false`.
- **Status:** waiting on Q-001 + your call.

## Q-003 — Five content-holding local branches: land or abandon

- **What:** decide per branch; each holds commits whose content is NOT on main
  (`git cherry` verified 2026-08-30):
  `chore/todo-update-preserve-user-content` (2) · `docs/runnable-fences-selfhosted-agents` (1) ·
  `docs/session-close-2026-08-01` (2) · `sessions/2026-08-02-provider-neutral-close` (1) ·
  `sessions/2026-08-15-queue-failfast-doclink-ideas` (2).
- **Why:** deletion of content-holding branches is outside the grant.
- **Preconditions:** BC-03 will append a per-branch content report (what the commits contain, land
  recommendation) before you decide. The 5 `backup/*` branches are deliberate and untouched.
- **Status:** waiting on BC-03's reports, then your per-branch call.

## Q-004 — Accept/revise/reject ADR: ARC-029 (Best-Practice-First Solution Selection)

- **What:** ARC-029 has been `Proposed` since EF-34 with no tracking entry anywhere.
- **Preconditions:** BC-13 appends a one-page decision brief here.
- **Status:** waiting on BC-13.

## Q-005 — Accept/revise/reject ADR: ARC-020 broad schema (folded into BC-11)

- **What:** the customization/vendor-neutrality ADR from BC-11 will subsume or close ARC-020's
  open remainder ("operator identity, provider coordinates, repository lists").
- **Status:** waiting on BC-11's draft PR.

<!-- The loop appends Q-006+ below this line. -->
