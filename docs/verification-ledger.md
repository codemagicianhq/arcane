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

## 2026-09-02 — Lessons Hardening corrections (LH-02 → LH-12)

Scoped to verification events during epic execution, not already captured in RCA-001's own Timeline
(the "three times" recurrence-count correction is logged there as CA-4; not duplicated here).

| Claim | Verification method | Result | Correction |
| --- | --- | --- | --- |
| TODO.md's new ARC-014 citation, copied from ARC-031's own "Related" line, correctly points at the ADR for "org-token lint as a build gate" | `grep "^## ARC-014"` in `DECISIONS.md` while drafting ARC-041 (LH-11) | corrected | ARC-014's real title is "Spell Authoring Standards: A Quality Rubric for Spell Prompts" — unrelated to org-tokens. Pre-existing bug in ARC-031 itself, not introduced by LH-11. Fixed the new ADR to use plain prose instead of the copied link; routed the pre-existing bug as its own TODO.md item (root ADR number not yet identified). |
| `resolvePrivateTokens()`'s test suite passes after converting the function to `async` | Ran the actual test suite, not just `tsc --noEmit` | corrected | Typecheck stayed green, but two un-awaited call sites in `test/org-token-lint.test.ts` failed at runtime (`Received: Promise {}`; `TypeError: tokens.map is not a function`). Fixed both call sites with `await`. |
| The new "refuses a file inside a real repository" test exercises the in-repo refusal path against its own fixture repo | Traced the test's actual `cwd` at the call site against the implementation | corrected | `resolvePrivateTokens()` had no `cwd` parameter yet, so the check silently ran against `process.cwd()` (the real checkout) rather than the fixture — the test passed without exercising the refusal logic at all. Added an optional `cwd` parameter threaded through to `readLocalTokenFile`; test now passes the fixture dir explicitly. |
| `registry.test.ts`'s `toHaveLength(25)` on the `governance-only` profile is correct because the profile and the count agree | `comm` diff of the profile's real file list against `src/config/profiles.ts`'s declared list (LH-05 empirical-first step) | corrected | The profile was missing `records-conventions` while wrongly including `agent-output-instructions` — two miscounts canceling out to the same total. Fixed `profiles.ts`; rewrote the test to derive its expectation from the registry instead of a literal. |
| `check-citations.ts`'s first design (flag every bare `path` citation lacking a stable locator) is ready to run in report mode | Ran it against the live tree in report mode (LH-07) | corrected | 452 findings, nearly all false positives — flagged any backtick-wrapped filename in prose, not just citations making a specific claim. Narrowed to citations carrying an anchor, quoted phrase, or line number; findings dropped to 30 genuine ones. |
| The narrowed citation regex catches every bare line-citation in the living-docs set | Re-ran `check:citations --report` after narrowing, diffed against a manual scan (LH-07) | corrected | Comma-separated line lists (e.g. a file cited at two lines like "7,115") weren't matched by the original `:NNN`/`:NNN-MMM` pattern. Broadened to `(?::(\d+(?:[-,]\d+)*))?`, using `Math.max()` over the split numbers for the line-count bound. |
| A paragraph-level window is sufficient for `check-followups.ts` to associate a deferral phrase with a nearby tracker token | Measured the character distance between the known true positive's deferral phrase and its tracker token inside the real historical paragraph (LH-09) | corrected | The true positive sat 314 characters from an unrelated "ARC-023" mention inside one 12,674-character paragraph — a paragraph-level check would match the wrong token and produce a false negative on the known case. Fixed with a 150-character window, verified directly against the historical true positive. |
| The tracker-token pattern (`TODO\.md`/`IDEAS\.md`, requiring the literal `.md`) matches every real tracker reference in the corpus | Ran the check against the known true-positive corpus (LH-09) | corrected | Missed "Filed a separate follow-up TODO item" (bare word, no `.md`). Broadened to `\bTODO\b\|\bIDEAS\b`. |

## 2026-09-03 — Show Report SR-00 through SR-03

Scoped to verification events during the session that activated the Show Report program and shipped
its first four epics. Four of the seven checks corrected the claim they tested.

| Claim | Verification method | Result | Correction |
| --- | --- | --- | --- |
| SR-02's generated Lessons Hardening report is correct; its committed stat rail reads `0.33.2 → 0.34.2` | Rendered the page and read it against the hand-built ledger and `docs/research/show-report-feasibility.md`'s verified figures | corrected | True close is `0.34.1`. `sources.ts` had taken "the last commit touching PLAN.md" as the close commit, and SR-01's own backfill had just edited that finished plan. Close-commit derivation replaced. |
| "Now bounded by the plan's `completed:` date via author calendar dates; LH reads `0.33.2 → 0.34.1` again, matching the hand ledger and the feasibility memo" | Regenerated **both** programs after the fix, not only the one that had been wrong | corrected | Become Current broke to `0.33.0`: its last PLAN.md-touching commit on its completed day sat at 0.33.0 while two version bumps landed later the same day without touching the plan, and author dates are not monotonic along a rebase-merged log. Redefined as "the commit `main` stood at when the `completed` day ended," by committer (landing) date `%cs`. |
| PR #195's CI passed — the background watch reported "completed (exit code 0)" | Read the watch command's actual output file, then re-ran `gh pr checks 195` live | corrected | The watch had exited in under a second printing `no checks reported on the '<branch>' branch`; all three checks were still `pending`. Merging on that summary would have been an unverified merge. Every subsequent watch used a readiness loop (poll until a `pass\|fail\|pending` line exists) plus a live re-read before merging. |
| `v0.34.3`'s publish failed because `publish.yml` checks out shallow while `ci.yml` uses `fetch-depth: 0`, and the golden parity test derives the version span and cast from git history | `gh run view --log-failed` on the failed run, compared checkout config across `publish.yml`/`ci.yml`/`release-drift.yml`, then tested `isShallowRepository()` against a real `git clone --depth 1` and confirmed `arcane-cli@0.35.0` reached npm after the fix | confirmed | — |
| The backfill agent's self-report: "become-current 33/33 ✓, lessons-hardening 14/14 ✓, bare PR-citation backfill: 0 fixes needed" | Ran this session's own `parseEpics` over both files independently of the agent's claim, plus a grep for unlinked `PR #NNN` citations | confirmed | — |
| `sessions/2026-09-03-ai-discoverability-rules` is fully landed and safe to delete — `git cherry` shows 0 unlanded commits | A three-dot diff showed 182 insertions, so followed with a per-file two-dot diff against `main` and a `git log --grep` for both commit subjects | confirmed | — |
| `docs/plans/show-report/OPERATOR-QUEUE.md` Q-001 read `- **Status:** [ ] open` | Checked PR #192's real state with `gh pr view` while closing Q-002 | corrected | It had merged hours earlier. The same static-status drift (P1) Lessons Hardening's own Q-001 exhibited, caught the same way; marked done with the merge SHA recorded. |
