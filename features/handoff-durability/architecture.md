# Architecture — Session Handoff Durability (R1-R8)

Resolves the PRD's open questions and states the exact edit plan per requirement. Single-session
implementation (no multi-agent `stories.json` — same adaptation BC-14's architecture doc used: this
loop implements everything itself sequentially, so the story-breakdown format built for assigning
work across multiple agents doesn't apply).

## Open Questions

**"No work-item ID exists yet — file one before or during implementation."** Resolved: `tracking_mode`
is `internal` (`src/assets/.arcane.json`), so the durable "work item" for an internal-tracking repo is
a `TODO.md` entry — the same mechanism R2 itself specifies as the internal-mode durable sink. This PRD
has never had one (confirmed: PLAN.md's BC-15 sourcing line cites only the PRD, no `TODO.md:NNN (Txx)`,
unlike every other epic in the plan). Filed as part of this implementation, alongside the other TODO.md
edits — closing the gap rather than leaving it open a second time.

The other two open questions are explicitly out of scope per the PRD's own text (a `spell-check-drift`
lint for old-format handoffs; `spell-todo` status markers) — no action needed here, left as PRD notes
for separate future consideration.

## Edit Plan

**R1 + R2 — `spell-close-session.prompt.md`, new step 4b.** Inserted between step 4 (Update TODO.md)
and step 5 (Update ai-context/system-prompt-context.md), matching the file's existing `<N>b` sub-step
convention (step 1b already does this for the async-verification gate). Enumerates `Active task` (if
incomplete), `Next concrete action`, and any durable content that would otherwise live only in `Notes`;
resolves the sink from `tracking_mode` per ARC-032 (`internal` → `TODO.md`; `external` → a work item via
`external_provider`, falling back to `TODO.md` when tracker tooling is unavailable that session).
Applicability guard: skip when nothing is unfinished.

**R3 — field descriptions name their durable home.** The step 5b template's `Active task`,
`Next concrete action`, and `Notes` field descriptions each gain a clause pointing at step 4b's
registered location, referenced in backtick form per the PRD's own constraint (test/prompt-pending-
verification.test.ts locates fields by bold-colon literal, not by surrounding prose — backtick
references to field *names* in new prose don't touch those anchors either way, but the constraint is
followed regardless since it's the PRD's explicit ask).

**R4 — `Notes` is pointer-only.** Stated inline (R3's edit) and as its own bullet in the file's closing
Rules section, so the constraint is discoverable independent of the field description.

**R5 — `spell-open-session.prompt.md` Durability check.** Added to Handoff Detection, sequenced after
"apply the Mutation Guard below" and before the consumed-marker append (PRD: "after the Mutation Guard
and before the marker write"). Confirms the named durable references exist; if step 4b was skipped or
incomplete, registers the missing content now (on this session's own branch) before consuming. If the
check itself can't complete, the handoff stays unconsumed — the next open-session retries idempotently,
the same failure-mode protection EF-21's `Pending Verification` re-check already uses.

**R6 — surface the three unread fields.** `Last completed step`, `Blockers`, `Notes` added to the
existing "surface it immediately... before all other sections" sentence in Handoff Detection.

**R7 — ARC-005 amendment.** The PRD says "amendment blockquote under ARC-005's Status line" — checked
against this file's own established convention for exactly this relationship (ARC-020 amended by
ARC-030/032/033) and found it is a plain **Amended by:** bold-label line, not a `>` blockquote. Using
the real, already-three-times-used convention instead of inventing a new one; disclosed here and in the
commit rather than silently deviating from the PRD's wording. New entry **ARC-040** (next sequential
after ARC-039), Status `Accepted` — this is direct-implementation epic work like ARC-036 (BC-14), not
an ADR-DRAFT route epic like ARC-037/038/039, so it does not go through the Proposed/OPERATOR-QUEUE
acceptance path.

**R8 — scaffold fix.** `src/assets/ai-context/system-prompt-context.md`'s example handoff block
currently uses plain `**Field:**` lines with no `>` header and no consumed marker — a format that
satisfies `spell-open-session`'s own detection trigger (a `## Next Session Handoff` heading with no
`> ✓ Consumed:` line) well enough that a brand-new repo's placeholder content could be surfaced by the
very first `spell-open-session` run as if it were a real, unconsumed handoff. Rewritten to match step
5b's real format (bullet fields, `>` header lines) with a `> ✓ Consumed: YYYY-MM-DD` marker already
present — `YYYY-MM-DD` as a literal placeholder is intentional (no templating exists in `spell init`'s
copy step; this file ships byte-for-byte), matching the same placeholder convention already used
elsewhere in this repo's own docs (e.g. journal filenames).

## Testing

New `test/prompt-handoff-durability.test.ts`, string-assertion only (ARC-023, matching EF-21's
`test/prompt-pending-verification.test.ts` precedent) — reads the three edited files fresh and asserts
on the exact substrings the edit plan above introduces. No code changes per the PRD's own constraint,
so no non-prompt test coverage is needed.
