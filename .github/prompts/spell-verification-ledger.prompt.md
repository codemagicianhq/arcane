---
name: Spell — Verification Ledger
description: Extract a structured record of claims that were checked this session and what the check showed — especially the ones that didn't survive. Separate from spell-close-session; run on demand, not every session.
argument-hint: Optional focus (e.g., "just the corrections", "since the last commit")
agent: agent
---

## Executive Summary

- The highest-value output of a working session is often the corrections — claims that were checked and
  did not survive. `spell-close-session` captures what happened and sanitized lessons learned; it does
  not capture what was asserted, what was checked, what the check showed, or what changed as a result.
  This spell extracts exactly that, separately.
- **Run on demand, not every session.** Most sessions have nothing worth a ledger entry; this spell says
  so plainly and stops rather than manufacturing content to fill one (same discipline as
  `spell-document`).
- **A `corrected` result is the point, not a failure to hide.** A ledger showing three confirmed claims
  and one correction is more valuable than one showing four confirmed claims and nothing else — the
  correction is evidence the verification step actually did something, not theater.
- Appends to a single running file, [`docs/verification-ledger.md`](../../docs/verification-ledger.md),
  so a calibration rate (how often a checked claim survives) is computable across sessions without
  reading scattered journal entries.

---

## What counts as a ledger-worthy event

Only an assertion that was actually **checked against an independent source** counts — not every
statement made during the session. The check has to have been capable of coming back either way:

- A confident claim, followed by a real verification step (a tool call, a live read, re-running
  something, checking a second source), whose result **confirmed** the claim.
- A confident claim, followed by the same kind of check, whose result **contradicted** it —
  a **correction**.
- A check that was attempted but couldn't produce a definitive answer (no access, an ambiguous result)
  — **unverifiable**. Distinct from never having been checked at all, which isn't ledger-worthy at all.

Not ledger-worthy: a claim nobody checked, a preference or judgment call with no verifiable fact behind
it, or a check whose outcome was never in doubt (confirming something already directly observed moments
earlier is not a verification event).

## Workflow

1. **Scan the session for ledger-worthy events**, per the definition above. Look specifically for
   moments where a check contradicted an initial assertion — a count that was off, a file path that
   didn't exist, a "should be done" that direct inspection showed wasn't, a citation that pointed at the
   wrong content. These are usually more memorable than confirmations; do not let them get lost among
   routine, expected-to-pass checks.

2. **Stop here if nothing qualifies.** If the session had no real verification events — no claim was
   both asserted with confidence and independently checked — say so plainly and do not proceed. A quiet,
   uneventful session with nothing to report is a valid outcome, not a gap to paper over.

3. **Classify each event:**

   | Field | What it captures |
   | --- | --- |
   | Claim | The assertion as originally stated, in the speaker's own words at the time — not softened in hindsight. |
   | Verification method | What was actually done to check it (a specific command, a specific file read, a specific re-fetch) — not "verified," which asserts nothing checkable itself. |
   | Result | `confirmed` / `corrected` / `unverifiable`. |
   | Correction | For `corrected` only: what the check actually showed, and what changed as a result (a claim retracted, a decision reversed, a fix applied). |

4. **Present the extracted ledger for approval** before writing — the same approval gate
   `spell-document` uses, since this is also durable content leaving the conversation:

   ```text
   ## Verification Ledger Proposal — [session topic]

   | Claim | Verification method | Result | Correction |
   | --- | --- | --- | --- |
   | ... | ... | confirmed | — |
   | ... | ... | corrected | ... |

   Approve? (yes / edit / skip)
   ```

5. **Append, don't rewrite.** After approval, append a new `## YYYY-MM-DD — <session topic>` section
   with the approved table to `docs/verification-ledger.md`. Get the real date from the system rather
   than guessing. If the file doesn't exist yet, create it with a short header explaining its purpose
   and schema, then the first section — never insert a section anywhere but the end.

## Rules

- Never fabricate a ledger-worthy event to fill a report — an empty result from step 2 is a complete,
  valid run of this spell.
- Quote the claim as it was actually stated, not a cleaned-up paraphrase that makes the miss look
  smaller (or larger) than it was.
- Do not editorialize about fault or blame in the ledger itself — the value is the calibration signal
  (how often checks confirm vs. correct), not a record of who was wrong.
- Do not commit the changes — that is `spell-commit-work`'s job.

## Related

- **Complements, does not replace:** `spell-close-session`'s narrative record and sanitized lessons
  learned. Run this spell separately when a session had real verification events worth a structured
  record, not as a mandatory step of every close.
- `spell-document` — the general-purpose formalization spell this one borrows its
  extract-then-approve-then-write shape from, narrowed to one specific, structured record type.

> **Tip:** Run `spell-close-session` afterward to log the session, or `spell-commit-work` to commit the
> ledger update.
