---
date: 2026-11-06
topic: Unattended Run spell release
---

# Session: Unattended Run spell

### Prompt Context

The operator requested turning the earlier unattended issue-delivery prompt into a reusable spell, with standards-based naming and stronger application-build, reliability and security guidance. After reviewing the local implementation, they explicitly authorized a new grant and its own commit, commits/push/PR creation, assignment to themselves, auto-merge after checks, usable 1.22.0 verification and cleanup within 24 hours. No prior grant was reused.

### What Got Done

1. Added [[.arcane/spells/spell-unattended-run]], registered it in spells-build and generated all three clients, catalog, profile coverage and documentation. It owns bounded intake/readiness, consent, supervision, milestone delegation, recovery, verification and closure; implementation remains in full-cycle. [[features/unattended-run-spell/authoring-review]] records the rubric and review.
2. PR [#460](https://github.com/codemagicianhq/arcane/pull/460) merged by rebase at `dc625213e0b936884039022cc59252053771d4ea`. All seven PR checks passed. Main CI [42203498399](https://github.com/codemagicianhq/arcane/actions/runs/42203498399), release-drift [42203498367](https://github.com/codemagicianhq/arcane/actions/runs/42203498367) and publish [42203527711](https://github.com/codemagicianhq/arcane/actions/runs/42203527711) succeeded.
3. Release [1.22.0](https://github.com/codemagicianhq/arcane/releases/tag/v1.22.0) became available on npm. An isolated installation returned 1.22.0 and scaffolded a consumer with all 43 spells, including the canonical unattended-run body and Copilot/Claude/Codex discovery files. This tested packaged assets without a local asset override or changing the global CLI.
4. Local coverage passed: 3,134 tests, six skips, 93.73% lines. Build/demos, lint, typechecks, references, secrets, catalog, changelog, version and 389-item parity checks passed; commit and push hooks remained enabled.
5. All original commits were patch-equivalent to main and the trees matched. The feature remote branch was already absent; its local branch was removed after verification. Unrelated branches and worktrees were preserved.

### Decisions Made

ARC-063 records the entry point and descriptive name. It was allocated from local and freshly fetched trunk maxima of ARC-062. 1.22.0 is the minor bump for a new spell. No new executor, persistent scheduler, dependency or authority mechanism was introduced.

### Authority used

| Action | Branch/head | Authority and contemporaneous evidence |
| --- | --- | --- |
| Grant bootstrap commit | `2753ba5` | Explicit operator instruction authorizing the record and its own commit; matching commit check and action line. |
| Release and feature commits | `ca57334`, `e8ba110` | Grant `ship-unattended-run-2026-11-06`; per-action checks and action lines. Equivalent main commits: `0f4885a`, `dc62521`. |
| Push, PR #460 creation/assignment and rebase auto-merge | `e8ba1106892c2d3ecf13bd37f35b95cdb8741c45` | Same grant; head-bound auto-merge, observed provider policy, required checks and reviews. |
| Closeout commit, PR and cleanup | Planned on `sessions/2026-11-06-unattended-run-spell-close` | Same scoped grant, subject to fresh checks; final chat report records actual outcomes. |

### Lessons Learned

A successful publish workflow did not immediately mean npm availability: npm explicitly reported processing delay and the initial install returned ETARGET. Fresh registry lookup and a real consumer install were required before marking the release usable. This is a repo-local verification lesson; routing was skipped for the unattended close (`--no-route`).

### Open Items Carried Forward

Only this closeout branch's own commit, PR/checks/completion and cleanup remain planned at journal-write time; see [[features/unattended-run-spell/run]]. The final report reconciles those observed outcomes. The grant's consent ends on completion even if its JSON record remains active until expiry; no authority for later work is implied.
