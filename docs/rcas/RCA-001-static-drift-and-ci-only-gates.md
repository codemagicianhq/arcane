---
title: "RCA-001: Static Tree-State Claims and a CI-Only Privacy Gate"
audience: both
last_updated: 2026-09-02
status: active
tags: [rca, drift, citations, testing, ci, org-token]
---

# RCA-001: Static Tree-State Claims and a CI-Only Privacy Gate

## Incident Summary

The Become Current program (BC-00…BC-32, closed 2026-09-01 at `a2dd1d3`, `v0.33.2`) was this
repository's most intensive dogfooding to date. Three independent read-only audits of its own
record found roughly 100 "we believed X, checked, X was wrong" corrections, collapsing into 12
recurring patterns. Tellingly, the closure pass that inventoried them introduced fresh instances
of the top pattern while writing it down: stale line-number pointers in a `TODO.md` section
written the same day, a `PLAN.md` note pointing at a section that was never written, and a Phase 0
pass on this very Lessons Hardening plan that found its own citation drift again within roughly 24
hours. Separately, a real client name leaked into shipped governance content and was fixed —
then the commit describing that fix quoted the same name again, retriggering the identical CI
failure minutes later. Neither problem is a one-off mistake; both are structural, and this RCA
records both root causes and the preventive actions this program (LH-03…LH-12) applies against
them.

## Timeline

| Date | Event | Reference |
|------|-------|-----------|
| 2026-08-30 | Become Current's master plan committed, establishing the PLAN/KICKOFF/OPERATOR-QUEUE loop shape this program reuses. | `c967895` |
| 2026-09-01 | A stale branch's content, reapplied verbatim, leaked a real client name into two shipped governance files; CI's org-token lint caught it on push. | `a8d8263` |
| 2026-09-01 | Minutes later, the closure note describing that first fix quoted the same real name while narrating its removal, retriggering CI's org-token lint a second time. | `513f6d8` |
| 2026-09-01 | Become Current closed at `v0.33.2`; three read-only audits of its correction history began. | `a2dd1d3` |
| 2026-09-02 | Phase 0 (LH-01) ran `spell-verification-ledger` over the audits' findings and, while fixing the live drift they surfaced, found and fixed three *more* instances of the same citation-drift pattern in content written barely a day earlier. | [PR #171](https://github.com/codemagicianhq/arcane/pull/171) |
| 2026-09-02 | LH-00 committed and merged the Lessons Hardening plan, activating this program's delegation. | [PR #172](https://github.com/codemagicianhq/arcane/pull/172) |
| 2026-09-02 | LH-02's own empirical-first check found that this program's freshly-written `PLAN.md`/`OPERATOR-QUEUE.md` had already overstated the org-token recurrence as "three times in one session" — a direct `git log` check found exactly two, both same-day; corrected on the record in the same PR that files this RCA. | This PR |

## Five Whys

**RC-1 — static tree-state claims:**

1. **Why did `TODO.md`'s own Parked section cite the wrong line numbers about a day after being
   written?** — Because a line-number citation names a position in a file that keeps being edited.
2. **Why does that keep breaking things?** — Because nothing re-derives or re-checks a citation
   against the file's current state once it's written; it is typed once, as plain prose.
3. **Why is there no mechanical check?** — Because this repository's only drift detector
   (`spell-check-drift`) is a manual, judgment-based prose review, not a mechanical validator, and
   it has no citation-specific check.
4. **Why was a mechanical validator never built before now?** — Because the pattern wasn't visible
   as a *recurring, quantified* defect until three independent audits of Become Current's own
   correction history collapsed roughly 100 individually-unremarkable-looking mistakes into 12
   named, counted patterns.
5. **Why did each instance look unremarkable on its own?** — Because a claim about the tree's
   state (a count, a line number, a "not yet built" status, a follow-up's tracking location) is
   written as ordinary prose, indistinguishable at the point of writing from any other sentence —
   nothing marks it as a claim that must stay synchronized with a tree that keeps changing.

**Root cause (RC-1):** facts about the repository's live state are written as untagged static
prose that nothing mechanically re-derives or re-validates against the tree, so they silently
stop being true and nothing notices until a human happens to re-check them by hand.

**RC-2 — CI-only privacy gate:**

1. **Why did a real client name leak into shipped content, get fixed, then leak again minutes
   later?** — Because the second leak was the commit *describing* the first fix, which quoted the
   same name while narrating its removal.
2. **Why didn't the author catch it before pushing either time?** — Because nothing available
   locally (`typecheck`, `lint`, the full test suite, `check:self-host-parity`) checks content
   against the org-token denylist; only CI's build step does.
3. **Why does only CI check it?** — Because the denylist itself (`ARCANE_ORG_TOKENS`) is
   deliberately kept out of the repository, per ARC-031 decision 3, so the list of names to
   protect can't itself leak the names it protects.
4. **Why wasn't a local-safe equivalent built alongside the CI-only gate?** — Because ARC-031
   correctly solved "the denylist must not leak itself" but treated that as the whole problem; "how
   does a session check its own content before pushing" is a related but separate requirement that
   was never separately decided.
5. **Why did the gap go unaddressed until it caused two real leaks in one sitting?** — Because
   nothing surfaces the absence of local enforcement proactively; a CI-only secret gate with zero
   local mirror looks the same as a working gate until the exact moment it's needed and isn't
   there.

**Root cause (RC-2):** the org-token privacy gate exists only in CI, by design, so that the
denylist itself never leaks — but no local, pre-push equivalent exists, so the ordinary act of
writing about a leak's removal can retrigger the identical leak with no local warning before the
push that will fail.

## Root Causes

| # | Root Cause | Type |
|---|-----------|------|
| RC-1 | Facts about the repository's live tree (counts, line citations, shipped/not-shipped status, follow-up locations) are written as untagged static prose that nothing mechanically re-derives or re-validates. | Process gap |
| RC-2 | The org-token privacy denylist is enforced only in CI (by design, per ARC-031 decision 3, so the denylist can't leak itself); no local, pre-push equivalent exists, so a fix's own description of a leak can retrigger it. | Decision gap |

## Corrective Actions

| # | Action | Status | Reference |
|---|--------|--------|-----------|
| CA-1 | Replaced the leaked real client name with the ARC-031 fictional-venture set in both affected files. | Done | `a8d8263` |
| CA-2 | Reworded the closure note that had re-quoted the name, describing the fix without repeating the flagged string. | Done | `513f6d8` |
| CA-3 | Hand-fixed every live citation/count/status instance Phase 0's audit found (TODO.md's Parked-section pointers, a dangling PLAN.md section reference, README's spell/governance-doc counts, a stale ARC-020/version claim in `ai-context/system-prompt-context.md`). | Done | [PR #171](https://github.com/codemagicianhq/arcane/pull/171) |
| CA-4 | Corrected this program's own `PLAN.md`/`OPERATOR-QUEUE.md`, which had already overstated the RC-2 recurrence count before this RCA was even filed. | Done | This PR |

## Preventive Actions

| # | Action | Target Doc | Status |
|---|--------|-----------|--------|
| PA-1 | LH-03 — test-suite resilience helpers (retrying fixture cleanup, prose-assertion helpers, named per-test timeout budgets instead of hand-rolled literals), enforced by an ESLint rule scoped to `test/**`. | `test/helpers/`, [[testing-standards]] | Planned |
| PA-2 | LH-04 — evaluate `vitest.config.ts`'s coverage thresholds in CI instead of configuring them and never checking them. | [[testing-standards]], `.github/workflows/ci.yml` | Planned |
| PA-3 | LH-05 — derive counts (spell/agent/governance totals, test expectations) from the registry instead of hand-typing them in prose and tests. | `README.md`, `scripts/spell-catalog.ts` | Planned |
| PA-4 | LH-06 — fix the two build gates this incident's own Phase 0 pass hit live: `check-version-bump`'s pre-commit false pass, and `expandFragment`'s untested indentation assumption. | `scripts/check-version-bump.ts`, `src/modules/spell-compiler.ts` | Planned |
| PA-5 | LH-07 — a stable-locator citation grammar (heading anchor or unique quoted phrase, never a bare `file:line` in a living doc) plus a mechanical validator. | [[agent-output.instructions]], `scripts/check-citations.ts` | Planned |
| PA-6 | LH-08 — scan shipped governance/prompt content and living root docs for stale "not yet built"/status claims against the real tree. | `scripts/check-stale-claims.ts` | Planned |
| PA-7 | LH-09 — require every "filed as a follow-up"/"deferred"/"out of scope" sentence in a journal, plan, or TODO to carry a tracker token or an explicit `(untracked: reason)` opt-out. | `.github/prompts/spell-close-session.prompt.md` | Planned |
| PA-8 | LH-10 — three advisory conduct rules: never quote a denylisted token even while documenting its removal; a zero-match search is evidence about the pattern, not the thing; dispatched-agent supervision. | [[universal-agent-rules]] | Planned |
| PA-9 | LH-11/LH-12 — propose (ADR) and, if accepted, implement a local, out-of-repo org-token file source for `resolvePrivateTokens()`, closing RC-2 without weakening ARC-031's "the denylist must not leak itself" guarantee. | `DECISIONS.md` (ARC-041), `scripts/org-token-lint.ts` | Planned |

## Lessons Learned

- A recurring defect can be invisible at the instance level. Roughly 100 individually-plausible
  "I was wrong about that" moments looked like ordinary mistakes until three audits counted and
  grouped them — the count itself is what made the root cause visible.
- Writing down that a problem happened is not immune to the problem. This program's own planning
  documents introduced fresh line-citation drift and an overstated recurrence count while
  describing the very defects they exist to fix — both caught only by directly re-checking the
  claim against the tree, not by care or intent.
- A CI-only gate protects the pipeline, not the person writing the commit. When the thing being
  guarded against (a denylisted string) is also the natural way to *describe* the fix, the local
  author has no way to know they're about to repeat it until the push fails.
- "Fixed in three prompt files" (BC-06) and "leaked twice in one session" (this incident) are
  related but distinct events — conflating them into a single overstated count was itself a small
  instance of RC-1, caught while writing the RCA about RC-1.
