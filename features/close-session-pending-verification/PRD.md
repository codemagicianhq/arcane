---
status: accepted
tracking_mode: internal
source_intake: batch-001 (EF-21)
---

# PRD — Close-Session Pending-Verification Mechanism

## Problem

`spell-close-session.prompt.md` states a verifiability rule in prose ("Do not invent completions
— only mark items done if verifiable from context") but has no structured pending-verification
state or in-flight check before writing the journal, TODO.md, or the handoff. "Verifiable from
context" doesn't distinguish "I can see I started it" (dispatched) from "I can see it finished"
(succeeded) — an in-flight CI run is verifiable in the first sense and not the second, and the
rule leaves that distinction entirely to agent judgment under time pressure.

Re-verified against current HEAD (post-WP1/WP2): the handoff schema (step 5b) has no `Pending
Verification` field; the workflow proceeds from commit/PR actions (step 9) to returning to trunk
(step 10) without a dedicated check for other async work dispatched earlier in the session (CI
runs, deployments, publishes); the Rules section still reads the original ambiguous phrasing.

The intake's own real-world incident: a session closed while two builds were still running and
wrote the journal/TODO/handoff as if they'd succeeded. One had already failed at write time; the
other failed shortly after. A same-day correction PR was needed. Reconciles with EF-13 per the
intake's own note — same defect class (reported success masking unconfirmed state), different
layer (a stale `.git/index.lock` vs. an unverified build).

## Requirements

| # | Requirement | Acceptance Criteria |
|---|---|---|
| R1 | A structured 5-state vocabulary (dispatched / pending / succeeded / failed / unverifiable) replaces the ambiguous "verifiable from context" phrasing | Present in close-session's Rules section and in the new verification step |
| R2 | An explicit in-flight verification step runs before the journal, TODO.md, or handoff are written | New step inserted early in the workflow (before step 2's journal write), actively checking status of session-dispatched async work |
| R3 | The handoff schema gains a `Pending Verification` field | Populated from R2's findings; "None" when nothing is outstanding |
| R4 | Only `succeeded` work may be described as complete anywhere in journal/TODO.md/handoff | Stated explicitly in the Rules section and in TODO.md's completion-marking instruction |
| R5 | `unverifiable` items state the exact verification action for the operator | Required field content, not optional |
| R6 | `spell-open-session` actively re-checks pending items from the prior handoff rather than carrying them forward as fact | Handoff Detection section updated to surface and re-verify, not just relay |

## Constraints

- Prompt-only change (markdown in `src/assets/.github/prompts/`, mirrored to root via
  self-host-parity, plus governance-adjacent wording) — no code changes.
- Must not weaken the existing PR-merge verification already in step 10 ("Verify through the
  detected provider that the PR is merged before changing branches") — this PRD generalizes that
  existing pattern to all session-dispatched async work, not just the close-session's own PR.
- Enforcement is string-assertion tests only (per ARC-023: prose has no executable enforcement
  surface) — honestly scoped, matching how existing prompt-gate tests work in this repo.

## Dependencies

None new. Builds on the existing handoff schema and Mutation Guard machinery already in both
prompts (including this session's own WP2 addition of the "not a repository" classification).

## Open Questions

EF-21's own open questions ("which async systems can be detected generically," "what bounded
wait policy applies") are intentionally left to agent judgment per system — the fix defines the
vocabulary and the requirement to use it, not a provider-specific detection contract. This
matches the intake's own framing: the fix is the missing state machine and the requirement to
populate it, not exhaustive provider coverage.
