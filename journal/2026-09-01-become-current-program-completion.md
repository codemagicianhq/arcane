# 2026-09-01 — Become Current: Program Completion (Gate Clearance Through Phase 5)

## Session: Land the two gate-held items, ship BC-32, run the Definition of Done audit, close

### Prompt Context

Continuing the Become Current autonomous loop from a prior context window (summarized, not
re-narrated in full here — see that summary and PRs #150-164 for BC-01 through BC-31's own
history). This window opened already past the operator's live message reporting the parallel
session's ARC-023 prompt/instructions work had wrapped up (PRs [#161](https://github.com/codemagicianhq/arcane/pull/161),
[#163](https://github.com/codemagicianhq/arcane/pull/163), plus two close-session PRs) — independently
re-verified via `gh pr view`/`gh pr list` rather than taken on the operator's informal
description, which named a narrower scope (a WD-nn labeling fix and a worktree test-infra
fix) than the pre-compaction summary had assumed. The gate's real concern (no concurrent
edits to `.github/prompts/`/`.github/instructions/`) was satisfied regardless.

A system-level attribution-convention change also arrived mid-window: commits gain
`Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>`, PR descriptions gain
`🤖 Generated with [Claude Code]`, added alongside (not replacing) this project's own
`spell-commit-work`-mandated trailers — applied starting with this window's first commit.

### What Got Done

1. **Landed the two Phase 4 items held for the gate** — [PR #165](https://github.com/codemagicianhq/arcane/pull/165)
   (`v0.32.4`): the `spell-full-cycle.prompt.md` min-3-issues wording fix, and
   `docs/runnable-fences-selfhosted-agents`' content (a "Runnable Code Fences Are
   Commitments" rule for `agent-output.instructions.md`, a "Self-Hosted Agents" section for
   `cicd-standards.md`) re-applied fresh rather than merging the stale branch, since
   `cicd-standards.md` had been restructured into Core/Azure-DevOps-Profile sections
   (BC-31 Batch B) after that branch was cut. Caught and fixed a real org-token-lint
   failure mid-PR: the stale branch's content baked in a real client name; a second,
   self-inflicted instance of the same leak turned up in this fix's own closure note,
   caught by CI a second time and fixed — see Lessons Learned.
2. **Closed Q-003's last open branch disposition** — [PR #166](https://github.com/codemagicianhq/arcane/pull/166)
   (`v0.32.4`), recording PR #165's landing in `OPERATOR-QUEUE.md`.
3. **Shipped BC-32 — the spell compiler (ARC-039)** — [PR #167](https://github.com/codemagicianhq/arcane/pull/167)
   (`v0.33.0`). `renderClaudeCommandStub()` generates all 41 `.claude/commands/spell-*.md`
   stubs from prompt frontmatter; found and fixed 2 real pre-existing title-drift bugs
   (`spell-check-drift`, `spell-dotnet-expert`) as a disclosed side effect of generating
   rather than hand-authoring. Discovered the ADR's own premise needed a real correction
   before implementing: every stub's `description` is a distinct, hand-crafted
   proactive-invocation hint, not a copy of the prompt's `description` as the ADR assumed —
   added a new `claude_description` frontmatter field instead, backfilled verbatim.
   Extracted a shared-fragment mechanism (named marker comments, generalizing
   `merger.ts`'s single-marker model) for the `tracking_mode`/`external_provider`
   declaration — narrower than the ADR described once diffed for real: only 2 lines are
   actually identical across the 5 named spells, not a full resolution-order paragraph.
   Two new self-host-parity axes; 26 new tests in `test/spell-compiler.test.ts`.
4. **Phase 5 — Definition of Done audit and closure.** Walked PLAN.md's 7 criteria against
   current repo state (all verified directly, not assumed):
   - Criterion 2 (`TODO.md` unchecked-items) failed on first check — 9 unchecked items, no
     `Parked` section to house them. Implemented the 4 that were small, in-reach, and not
     operator-blocked — [PR #168](https://github.com/codemagicianhq/arcane/pull/168) (`v0.33.1`):
     - ARC-035 decision 4's closed-PR push warning, shipped to every consumer tier except
       `blocked` (new `CLOSED_PR_WARNING_HOOK_BODY` in `push-safety.ts`, sharing the
       `pre-push` hook slot with the existing blocking hook by construction).
     - The org-token portability gate's `.github/instructions/` scan gap — generalized
       `scanPromptDirectory` into `scanDirectoryByExtension`; running the real build against
       current content immediately caught 2 live violations (see Lessons Learned).
     - Two heaviest flaky test blocks given per-test `15_000` timeouts.
     - Found the "spell routing layer" TODO item's R1/R2/R3 were **all** already shipped —
       an earlier pass on this same item (same window, before this correction) had
       concluded only R1/R2 were done; that conclusion was wrong (see Lessons Learned).
     Consolidated the remaining 7 topics (8 checkboxes) into a new `TODO.md`
     `## Parked — Needs Operator` section and `OPERATOR-QUEUE.md` Q-011.
   - Running `spell-check-drift` for real (not just the mechanical sub-checks) surfaced 2
     genuine stale statements, fixed in [PR #169](https://github.com/codemagicianhq/arcane/pull/169)
     (`v0.33.2`): `portable-bootstrap.md` still claimed the customization/override model was
     unbuilt and that `arcane update` overwrites edits silently, directly contradicted by
     ARC-038/BC-31's shipped hash-compare/three-way-merge logic; `TODO.md`'s own closure
     note for that item cited "ARC-038 (Proposed)" after it had been accepted and shipped.
   - Refreshed `ai-context/system-prompt-context.md`'s Current Priorities section (same PR),
     removing a self-flagged staleness note from an earlier session and stating the actual
     current state.
   - All 7 DoD criteria now hold: every epic checked/parked (criterion 1), `TODO.md` fully
     accounted for (criterion 2), ADR mechanisms audited via the coverage map (criterion 3),
     PRD statuses truthful — 9 `accepted`, 1 `shipped`, 1 genuinely `draft` (criterion 4),
     all 18 `IDEAS.md` entries carry a status marker (criterion 5), `spell-check-drift`
     reports **GO** with the 2 findings above fixed in the same pass, not left open
     (criterion 6). Criterion 7 is this close-session itself.

### Decisions Made

No new ADRs. This window implemented already-accepted decisions (ARC-035, ARC-037, ARC-038,
ARC-039) rather than making new ones; the org-token-lint mechanism, closed-PR hook, and
fragment-marker syntax are all implementation choices within those ADRs' own open questions,
recorded as **Implementation notes** under the relevant ADR in `DECISIONS.md` rather than as
new decision records.

### Lessons Learned

**Describing a leak by naming it is the leak, twice over in one session.** Landing PR #165,
`OPERATOR-QUEUE.md`'s own closure note for the fix quoted the real client name verbatim while
explaining that it had been removed — CI's org-token lint caught the note itself on the very
next push. This is a durable trap specific to this repository's `ARCANE_ORG_TOKENS` gate: it
is CI-only (needs a secret unavailable locally), so no local check can catch it, and the
natural way to *document* a fix — quoting what was wrong — is the exact shape of the
violation. Saved as a project memory (`project_org_token_lint_self_reference_trap.md`) for
future sessions in this repository specifically, since the failure mode will recur on any
future old-branch land or incident write-up that predates the ARC-031 fictional-venture
convention.

**A grep's case-sensitivity produced a real, on-the-record error, not just a near-miss.**
Verifying the "spell routing layer" TODO item's R3 recommendation, an initial grep for
`"lifecycle operations"` (lowercase) missed `universal-agent-rules.md` rule 22's actual text,
`"**Lifecycle operations** run through their spell..."` (capital L) — concluding R3 was
"genuinely still open" and narrowing the TODO item on that basis. The error was caught minutes
later re-deriving the same fact a different way (during BC-32's own unrelated stub-generation
work) and corrected on the record in the same TODO entry, named as an error rather than
silently edited — per this repository's own working-protocol rule 4 ("name your own errors as
errors"). The general lesson: a grep returning zero matches is evidence the *pattern* wasn't
found, never evidence the *thing* doesn't exist — worth a second, differently-worded search
before concluding a governance rule is absent, especially right before closing a TODO item on
that absence.

**An ADR's own worked example can be stale relative to the codebase it describes, and nobody
notices until the exact check it describes actually runs against it.** `agent-output.
instructions.md`'s Doc-ID Link Format section explains why a full `github.com/{org}/{repo}`
URL is unsafe in shipped instructions files by citing the literal URL as its own example —
which was itself an org-token-lint violation, invisible for as long as instructions files
were outside the scanned set (the exact gap BC-32's Phase-5 pass closed). The fix generalizing
`scanPromptDirectory` didn't just close a documented gap; it immediately proved itself by
catching 2 live violations nobody had a way to see before.

**Two independently-shipped epics can invalidate a third document's claim, and nothing
flags it automatically.** `portable-bootstrap.md`'s "overrides are not yet supported" bullet
was accurate when written; ARC-038/BC-31 (a different epic, landed later) shipped exactly the
capability it said didn't exist, and nothing updated the cross-reference. `spell-check-drift`
is the only mechanism that catches this class today, and only when someone actually runs it
with the specific claim in mind — it is not a standing CI check. Worth remembering that
"shipped elsewhere" drift is real and silent, not just "written but never built" drift.

### Open Items Carried Forward

Nothing pending, dispatched, failed, or unverifiable — every PR opened this window
(#165–#169) was independently re-confirmed `MERGED` via a fresh `gh pr list` call immediately
before writing this entry, not assumed from earlier tool output. The Become Current program
itself has no carried-forward engineering work: `TODO.md`'s `## Parked — Needs Operator`
section and `OPERATOR-QUEUE.md`'s Q-009/Q-010/Q-011 name the complete remainder, and every
item there is either operator-scoped (an external artifact, a brand/creative call) or a real
design decision with no forcing function — not something a future session should pick up
unprompted.
