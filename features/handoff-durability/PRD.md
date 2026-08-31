---
status: draft
tracking_mode: internal
source_intake: field incident (no formal batch-001 intake filed)
---

**Corrected 2026-08-31 (BC-05):** this PRD's frontmatter cited `source_intake: batch-001
(EF-37)`, but no `docs/intake/batch-001/EF-37.md` exists, and none of batch-001's
findings were ever assigned that ID — confirmed via a repo-wide search before this PRD's
own citation was the only hit. Re-pointed rather than backfilled: fabricating an intake
stub now, months after the fact, with content this repo has no genuine record of, would
manufacture exactly the false confident-provenance this repo's working protocol exists
to prevent. The real origin is not lost — it's told faithfully in this PRD's own
"Problem" section below (a real close-session incident where a next-session objective
existed only in the handoff block and a journal narrative) — it just never went through
the formal per-finding intake process the way EF-01 through EF-36 did.

# PRD — Session Handoff Durability (Pointer, Never Sole Carrier)

## Problem

`spell-close-session`'s handoff block (`## Next Session Handoff`, written in step 5b) is explicitly
ephemeral — overwritten at every close, consumed at every open. Nothing in either prompt requires
the work it names (an incomplete `Active task`, the `Next concrete action`, durable content in
`Notes`) to also exist on a tracked surface. The consumed marker (`> ✓ Consumed: YYYY-MM-DD`)
records that the block was *read*, never that its work is *done*.

TODO.md's own update step (step 4) is purely subtractive — it marks items done or keeps them open,
but never adds an entry for work identified as unfinished this session. `Pending Verification` is
the only handoff field with a read-side re-check obligation (EF-21); `Next concrete action` has
none. `Last completed step`, `Blockers`, and `Notes` are written by close-session but never read by
open-session.

A real incident made the failure concrete: a consuming repo's stated next-session objective —
including conventions established that same session — existed only in the handoff block and a
journal narrative, with zero presence in TODO.md or any tracked book. One close-session overwriting
the block, and the task is gone. The pressure was already visible before the incident forced the
question: a `Notes` field had grown to carry several items that had no other durable home, one
carried across multiple consecutive sessions.

Separately, ARC-005 (the original handoff design) documents **seven** fields; the block has carried
**eight** since EF-21 added `Pending Verification`, and ARC-005 was never amended to record it.

## Requirements

| # | Requirement | Acceptance Criteria |
|---|---|---|
| R1 | `spell-close-session` gains a step (4b) that registers every not-finished, task-bearing item on a durable surface before the handoff is written | New step present between the TODO.md update and the handoff write; enumerates `Active task` (if incomplete), `Next concrete action`, durable `Notes` content, and action-requiring blockers |
| R2 | The durable sink is tracking-mode aware | `tracking_mode: internal` → root/venture `TODO.md`; `external` → a tracker work item via `external_provider`, with a `TODO.md` fallback when tracker tooling is unavailable that session |
| R3 | Handoff fields name their durable home in-line once registered | `Active task`, `Next concrete action`, and `Notes` template lines each reference where the corresponding work now lives |
| R4 | `Notes` becomes a formally pointer-only field | Rule stated explicitly: `Notes` must never be the sole carrier of durable content |
| R5 | `spell-open-session` verifies durable references before appending the consumed marker | New Durability check in Handoff Detection, sequenced after the Mutation Guard and before the marker write, so a mid-session failure leaves the handoff unconsumed and idempotently re-checked next open |
| R6 | Open-session surfaces the three previously-unread fields | `Last completed step`, `Blockers`, `Notes` included verbatim in `## Picking Up From Last Session` |
| R7 | ARC-005 is amended (not superseded) to correct the field count and record the pointer principle | Amendment blockquote under ARC-005's Status line; new ARC entry recording the decision |
| R8 | The fresh-install scaffold handoff block matches step 5b's real format and ships pre-consumed | Bullet format + `>` header lines + a scaffold `✓ Consumed` marker, so a first open-session cannot mistake it for a real unconsumed handoff |

## Constraints

- Prompt-only change (`src/assets/.github/prompts/spell-close-session.prompt.md` and
  `spell-open-session.prompt.md`, mirrored to root via self-host-parity) plus the
  `src/assets/ai-context/system-prompt-context.md` scaffold and `DECISIONS.md` — no code changes.
- Must reuse existing durable-storage machinery (`TODO.md`, venture books, the ARC-032 tracking
  configuration) — no new files, honoring ARC-005's original "no new files" posture.
- New prose must reference handoff fields in backtick form only (`` `Notes` ``, not `**Notes:**`) —
  `test/prompt-pending-verification.test.ts` locates fields by first/last occurrence of bold-colon
  literals, and new wording must not shift those anchors.
- Enforcement is string-assertion tests only (per ARC-023, matching EF-21's own precedent) — a new
  `test/prompt-handoff-durability.test.ts` alongside the existing pending-verification suite.

## Dependencies

Builds on the existing handoff schema and Mutation Guard machinery (EF-21 / the close-session
pending-verification work). No new dependencies.

## Open Questions

- No work-item ID exists yet for this PRD — file one (ADO or GitHub, per whatever this repo's
  active tracking convention is at execution time) before or during implementation.
- Should `spell-check-drift` gain a check that flags handoffs whose task-bearing fields lack durable
  references (a lint for old-format blocks in consuming repos)? Out of scope for this PRD; noted
  for separate consideration.
- Should `spell-todo` emit `status:` markers on the TODO items it writes, so that `spell-manifest`
  sweeps count them the way `IDEAS.md` entries are counted? A known separate inconsistency,
  independent of this fix.
