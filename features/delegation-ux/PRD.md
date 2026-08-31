# PRD: Delegation UX (Solo-Operator Mode)

---
tracking:
  tracking_mode: internal
  external_provider: null
  adoWorkItemId: null
  githubIssueId: null
---

## Problem Statement

`agent-policies.md`'s Per-Repo Power Level Matrix assumes an installed agent roster (`.arcane/agents.yaml`)
— each agent has a slug and a per-repo power level, and that's where standing authority lives. A repo
with no roster at all (this repo included — confirmed: no `.arcane/agents.yaml` exists here) has nowhere
in that model to record a delegation, so one gets granted ad hoc instead. This repo's own Become Current
plan is the concrete instance: `docs/plans/become-current/PLAN.md`'s "Authority & Delegation" section is
a real, working standing grant — activated by a specific PR merge, scoped to specific epics, with an
explicit exclusion list — but it lives as free prose inside a large planning document. Nothing lists it.
Nothing surfaces it in `spell doctor`. A human auditing "what autonomous authority currently exists in
this repo" has no way to find it short of knowing to read that one section of that one file. TODO.md's
own framing names the exact failure mode: "self-approve delegation was granted ad hoc and forgotten."

## Target Users

Solo operators and small teams running Arcane without a multi-agent roster, who still need to grant an
agent/session standing authority for a scoped piece of work (exactly this plan's own situation) without
either (a) building out a full roster just to record one grant, or (b) losing track of what's been
granted because it's buried in prose.

## Requirements

### Must Have

- A delegation record that is **explicit**: a structured, git-tracked file — not prose embedded in an
  unrelated planning document — naming the scope, the grantor, the grant date, what's permitted, and
  what's explicitly excluded.
- **Listable** via `spell doctor`: a new check reads the record (if one exists) and reports every active
  delegation's scope and exclusions, so "what's currently delegated" is answerable in one command.
- **Revocable per repo**: revocation is editing or removing the record's entry and committing — the same
  git-native mechanism the current PLAN.md prose already uses, just now in a dedicated, discoverable
  location instead of a random section of a large document.
- **No roster required.** This mechanism must work in a repo with zero `.arcane/agents.yaml` entries —
  it is specifically the answer for the case `agent-policies.md`'s power-level matrix doesn't cover.
- Document the mechanism in `agent-policies.md` (the canonical authority-policy reference) as the
  solo-operator/no-roster counterpart to the roster-based power-level matrix.
- **Migrate this plan's own Authority & Delegation section into the new mechanism, as its first real
  record** — not a synthetic example. The migration must not, even momentarily, leave the loop without
  valid standing authority: the new record is added with the identical grant first, `spell doctor`'s
  check is wired to it, and only then does PLAN.md's own section get rewritten to reference the new
  record instead of duplicating its prose (D8) — all in one commit, so there is no externally-visible
  in-between state.

### Should Have

- Nothing beyond Must Have for this iteration — see Won't Have.

### Won't Have (this iteration)

- No automatic expiration or staleness detection. T13's own ask is "explicit, listable, revocable," not
  "self-expiring" — revocation is a deliberate git-tracked edit, not a timer. Out of scope; can be a
  later addition if drift is actually observed.
- No scaffold/template shipped to fresh `spell init` installs. A delegation record is inherently
  repo-specific and starts empty for a brand-new repo — nothing to seed. `spell doctor` treats a missing
  record file as "no delegations, nothing to report," the same graceful-missing-file pattern already
  used for `.arcane.json` elsewhere in `doctor.ts`.
- No integration with the full multi-agent roster/power-level system. That model already has its own
  mechanism (per-agent power levels in `.arcane/agents.yaml`) for repos that have a roster; this PRD is
  deliberately the parallel, lighter-weight path for repos that don't.

## Constraints

- **Technical:** the record must be machine-parseable (`doctor.ts` reads it programmatically) — JSON,
  not freeform markdown, matching how `.arcane.json` itself is read elsewhere in this codebase.
- **Governance:** this mechanism does not grant any NEW authority beyond what `agent-policies.md`
  already permits in principle (human execution required absent an explicit grant) — it only makes an
  existing kind of grant explicit and visible, per T13's own framing ("was granted ad hoc," not "was
  never allowed").
- **Sequencing (this PRD's own migration step):** see the Must Have item above — the new record must
  exist and be wired into `doctor` before PLAN.md's prose is rewritten to reference it, all within one
  commit/PR, so the loop's own standing authority is never ambiguous even transiently.

## Acceptance Criteria

- [ ] `.arcane/delegations.json` exists in this repo, containing the Become Current plan's grant as a
      real, structured record — scope, grantor, grant date, permitted actions, excluded actions.
- [ ] `spell doctor` gains a new check that reads this file (when present) and reports each active
      delegation's scope and exclusion list; a missing file is a silent pass, not a warning.
- [ ] `agent-policies.md` documents the mechanism as the no-roster counterpart to the power-level matrix.
- [ ] `docs/plans/become-current/PLAN.md`'s "Authority & Delegation" section is rewritten to reference
      `.arcane/delegations.json` rather than duplicating its own prose — in the same commit that adds
      the new record, so the grant is never ambiguous.
- [ ] The exclusion list in the new record is byte-faithful to PLAN.md's current "Explicitly outside the
      grant" list — migrated, not narrowed or widened.

## Dependencies

- `agent-policies.md`'s existing authority model (this is an additive, parallel mechanism, not a
  replacement) — cites it, doesn't restate its content (D8).
- `docs/plans/become-current/PLAN.md`'s current Authority & Delegation section (the migration source).

## Open Questions

- None blocking. Whether this mechanism eventually gains expiration/staleness detection is explicitly
  deferred (see Won't Have) pending real-world evidence that ad hoc grants are going stale in practice,
  not designed speculatively now.
