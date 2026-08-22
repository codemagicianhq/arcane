# Architecture — Close-Session Pending-Verification Mechanism

## Overview

Four edit sites in `src/assets/.github/prompts/spell-close-session.prompt.md` (mirrored to root
via self-host-parity), one in `src/assets/.github/prompts/spell-open-session.prompt.md`, plus a
matching handoff-template touch in `src/assets/ai-context/system-prompt-context.md` and the live
root `ai-context/system-prompt-context.md` (hand-edited — this path is `skipExisting` and outside
`GENERATED_ROOTS`, so the parity script will never touch it).

## Decisions

**D1 — A new step (1b), not a rewrite of step 1.** Step 1 ("Reconstruct the full session...")
already enumerates completed actions/decisions/lessons from context. Verification is a distinct
activity — actively querying external systems, not reconstructing from memory — so it gets its
own step, positioned immediately after reconstruction and before ANY output artifact (journal,
TODO.md, handoff) is written. This ordering is what makes R2 real: a step inserted after the
journal/TODO writes would only protect the handoff, missing the intake's own reported incident
(journal and TODO.md were wrong too, not just the handoff).

**D2 — Five states, not three.** The intake's proposed fix names exactly five: dispatched,
pending, succeeded, failed, unverifiable. Collapsing to fewer (e.g. just "verified" / "not
verified") would re-introduce the ambiguity the fix exists to remove — "unverifiable" specifically
needs to be distinct from "pending" (one means "can't check," the other means "checked and it's
still running"), since they demand different handoff language and different operator actions.

**D3 — `unverifiable` requires a stated verification action, not just the label, AND requires
genuinely attempting the check first.** A bare "unverifiable" is barely better than silence — the
intake's own framing ("there's no structured way for a session to write down 'I couldn't check
this'") specifically wants "I don't know yet" to be a *useful* state, which requires telling the
next reader (operator or next session) exactly what to run or look at. **Adversarial review
found a one-level-down version of EF-21's own core worry:** a vague rule creates room to
rationalize "verified enough"; without a check, `unverifiable` could just as easily become the
path of least resistance for "didn't want to spend the tool calls" as for a genuine access limit
— technically satisfying the new rule's letter while defeating its purpose exactly as EF-21's
original ambiguity did. Step 1b now states explicitly that `unverifiable` follows a genuine
attempt, not a default. The verification-action field itself was also tightened: `dispatched`,
`pending`, and `unverifiable` all require a real action; only `failed` (already resolved, nothing
left to check) may say "N/A" — the original version let any non-succeeded state claim "N/A" if
"self-evident," which under-specified exactly the states (dispatched/pending) where
`spell-open-session`'s later re-check most needs something concrete to act on.

**D4 — Generalizes the existing PR-merge check (step 10) rather than replacing it, with an
explicit cross-reference (added after adversarial review found the first version only claimed
this in the architecture doc, not in the shipped prompt text).** Step 10 already verifies
"through the detected provider that the PR is merged before changing branches" — a working
example of exactly this pattern, scoped to one specific case (the close-session's own PR). D2's
vocabulary and D1's step apply the same discipline to *every* piece of async work dispatched
during the session, not just that one case. Step 10's existing check is left intact; step 1b now
explicitly states the two are the same requirement and both apply, so an agent can't satisfy one
and assume the other is covered.

**D5 — `spell-open-session` re-verifies, not just relays.** Per the intake's core point ("the next
session trusts that handoff as source context... one ambiguous completion judgment can propagate
a false premise into later work"), a `pending`/`dispatched`/`unverifiable` item in a consumed
handoff might have resolved (either way) by the time the next session opens. Carrying it forward
as inert text would just move the same failure mode one session later. `spell-open-session`'s
Handoff Detection step is updated to actively check current status for anything not already
`succeeded`/`failed`, not merely display what the prior session wrote.

## Data flow

```
spell-close-session
  Step 1: reconstruct session from context
  Step 1b [NEW]: for each async/dispatched item this session touched --
    query its current status --> classify (D2) --> if unverifiable, record
    the exact check the operator/next session should run (D3)
  Step 2 (journal), Step 4 (TODO.md): only "succeeded" items described as
    done (R4); everything else goes to Open Items Carried Forward
  Step 5b (handoff): new "Pending Verification" field populated from 1b's
    findings; "None" if everything resolved to succeeded/failed
  Step 10: existing PR-merge check is now one instance of the 1b pattern,
    left as-is (D4)

spell-open-session
  Handoff Detection: surfaces Pending Verification items explicitly and
    re-checks their current status (D5) before treating prior claims as
    fact -- not just relaying what the last session wrote
```

## Testing strategy

Prompt-only change; enforcement is string-assertion tests (ARC-023: no executable surface for
prose). Extends `test/prompt-session-branch-gate.test.ts` (already reads both prompts) or a new
focused file — verifies: the 5-state vocabulary appears in both prompts where required; the new
step 1b exists and is ordered before the journal/TODO/handoff writes; the handoff template
includes `Pending Verification`; the Rules section no longer contains only the old ambiguous
phrasing without the new vocabulary; open-session's Handoff Detection references re-checking
(not just relaying) pending items.

## Security

None — no code, no new execution surface.

## Implementation notes

- Keep the existing "Do not invent completions — only mark items done if verifiable from
  context" line in the Rules section (still true and still useful) but append the precise
  vocabulary reference immediately after it, rather than deleting institutional wording an
  operator may already be used to reading.
- The handoff template's field ordering: `Pending Verification` goes after `Blockers` and before
  `Notes`, since it's operationally closer to "known unresolved" than to free-form context.
