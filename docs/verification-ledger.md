# Verification Ledger

A running record of claims that were checked during a session and what the check showed — appended by
`spell-verification-ledger`, run on demand, separate from `spell-close-session`'s narrative record.

The value here is the calibration signal: how often a checked claim survives (`confirmed`) versus gets
corrected (`corrected`) or can't be resolved (`unverifiable`). A `corrected` entry is evidence the
verification step did something, not a record to be embarrassed about.

This file starts empty — it is not backfilled with historical examples from before this spell existed,
since reconstructing them accurately would require re-deriving details this file's own discipline says
not to guess at. It captures new sessions going forward.

Schema per entry: **Claim** (as originally stated) · **Verification method** (what was actually done to
check it) · **Result** (`confirmed` / `corrected` / `unverifiable`) · **Correction** (for `corrected`
only — what the check showed and what changed).

---
