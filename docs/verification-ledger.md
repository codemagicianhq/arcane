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

## 2026-09-02 — Become Current corrections (2026-08-31 → 2026-09-02)

Scoped to verification events on or after this ledger's own creation (2026-08-31, BC-27c) — not
backfilling anything from before it existed.

| Claim | Verification method | Result | Correction |
| --- | --- | --- | --- |
| TODO.md: "R3 (lifecycle-operations rule) is genuinely still open" | Re-grepped `universal-agent-rules.md` case-insensitively for "lifecycle operations" | corrected | The first grep was case-sensitive and missed rule 22's capitalized "**Lifecycle operations** run through their spell…" — R3 was already shipped. TODO item closed in full; error named on the record. |
| ARC-039 (I15's premise): "36 (not 33) spell command stubs exist" | `ls .claude/commands/spell-*.md` at BC-32 implementation time | corrected | 41, not 36 — the count grew again in the day between the ADR's drafting and its implementation. |
| ARC-039 decision 2: "5 files duplicate a resolution-order paragraph, worded almost identically" | Diffed the actual text of all 5 consuming files | corrected | Only a bare 2-line `tracking_mode`/`external_provider` enum is byte-identical; `spell-scope` skips the `.arcane.json` source entirely that the other four check — the surrounding logic had already diverged. Extracted only the genuinely-shared 2 lines. |
| ARC-039 decision 1: stub `description` is generated "from its frontmatter (`name`, `description`)" | Byte-compared all 41 stubs' `description` fields against their prompts' own `description` | corrected | Every stub carries a distinct hand-written "Use PROACTIVELY…" invocation hint, absent from the prompt. Added a new `claude_description` field instead of overwriting it. |
| TODO.md (own text, written 2026-09-01): "these seven are the only unchecked items" | Counted the actual bullets under the new heading | corrected | Eight bullets — a parent finding plus its own still-open sub-item, one topic but two checkboxes. |
| TODO.md (own text, written 2026-09-01): pointers read "(line 443)" / "(line 446)" / "(line 448)" | Re-read TODO.md's current line numbers during Lessons Hardening planning | corrected | Items had already moved to 449/452/454 — drifted within roughly 24 hours of being written, by the file's own subsequent edits. |
| PLAN.md (own text, BC-06 closure note): "added to this run's operating lessons below" | Grepped PLAN.md for a heading named "operating lessons" | corrected | No such section exists anywhere in the file. |
| README.md tagline: "38 spells" / "23 governance standards" | `ls` counts against the live registry and asset tree | corrected | 41 spells, 25 governance docs. |
| `ai-context/system-prompt-context.md`: "ARC-020 stays Proposed; its remaining scope is folded into BC-11" | Read `OPERATOR-QUEUE.md`'s Q-005 entry directly | corrected | Q-005 explicitly says NOT subsumed — different axis entirely (manifest data fields vs. governance-content architecture). |
| `ai-context/system-prompt-context.md`: "`0.33.1` is current on `main`" | Read `package.json`'s live version field | corrected | `0.33.2` — the claim was stale in the same PR that performed the bump to `0.33.2`. |
| `universal-agent-rules.md` rule 3: "no secret-scanner exists in this repo yet (tracked as future work, BC-30)" | Read `src/modules/secrets-scan.ts` and `.husky/pre-commit` directly | corrected | BC-30 shipped exactly this; the distributed governance doc was never updated after. |
| "The other session wrapped up" (assumed the full ARC-023 prompt/instructions pass) | `gh pr view 161/163 --json files` | corrected | Narrower scope than assumed (a WD-nn labeling fix + a worktree test-infra fix); the gate's real concern was satisfied regardless. |
| The org-token closure note (describing the leak's removal) was safe to write | CI's org-token lint run, twice on the same PR | corrected | The note itself quoted the real client name verbatim — once in the first draft, again in its own fix of that draft. Both replaced with the ARC-031 fictional-venture convention. |
| Every PR from PR #165 through #170 was merged | Fresh `gh pr list --state all --limit 10` immediately before writing the close-session journal | confirmed | — |
| `rca-process-standard.md` stores RCAs at `governance/rcas/` | Cross-checked against `portable-bootstrap.md`'s "do not create a duplicate root `governance/` tree" rule | unverifiable | Genuine contradiction between two governance docs, not resolvable by re-checking either one alone — routed to Lessons Hardening's LH-02 to resolve rather than guessed at here. |
