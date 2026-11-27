---
date: 2026-11-26
---

# CI path-filter verification and session close

### Prompt Context

Complete Arcane issue [#489](https://github.com/codemagicianhq/arcane/issues/489), verify the released checker against a live Azure Repos consumer, and test documentation-only and code changes. The operator later explored automatic skipping for new documentation, chose a dedicated documentation folder as the preferred design, and agreed to wait until the benefit warrants further work.

### What Got Done

1. GitHub reports issue #489 closed as completed. The live response fixes merged in [PR #498](https://github.com/codemagicianhq/arcane/pull/498); the release-date correction merged in [PR #499](https://github.com/codemagicianhq/arcane/pull/499). Both `spell --version` and `arcane --version` reported 1.26.1 on 2026-11-26.
2. An independent required guard and narrowly reviewed exclusions were deployed to a consumer. Live documentation-only and code-change test PRs were exercised: Azure runs 1602, 1603 and 1604 are completed and succeeded; the test PRs were abandoned after testing. The docs-only PR skipped the full build in the session's observed test, while the code-change PR ran it.
3. The checker tests in `test/ci-path-filters.test.ts` passed: 11 tests on 2026-11-26. This is separate from the live Azure verification above.
4. Corrected the two stale checker bug entries in `TODO.md` using the merged fix and test evidence.

### Lessons Learned

#### Documentation can be a build input

Markdown can be read by tests, so broad file-extension exclusions can hide failures. Use reviewed exact paths and an independent guard; automatically excluding a new folder would need a stronger way to prevent its contents from being consumed by builds or tests.

### Open Items Carried Forward

- No further automatic documentation skipping was approved for implementation. A dedicated folder remains a possible future option (untracked: operator chose to wait for a demonstrated need).
- This closeout is prepared for a docs-only pull request and still requires its commit, push, review, and merge.

### Authority used

| Action | Branch / exact head | Authority used | Evidence |
| --- | --- | --- | --- |
| Checker fix commit | `sessions/2026-11-24-azure-policy-scope-case` / `41a33baaf835e810dac4f5935a2d96ef2eca774b` | Operator-created commit | Operator reported running the commit command; GitHub confirms the PR head. |
| PR #498 completion | `41a33baaf835e810dac4f5935a2d96ef2eca774b` | Operator merge | Operator reported merging; GitHub confirms merge `7fafc877521a3dcbafd1c8e6be20009902d4a450`. |
| Release date correction commit | `sessions/2026-11-24-fix-release-date` / `3d8d4db682da3e8154d1bfed72e3cfedf351e8f8` | Operator-created commit | Operator reported running the commit command; GitHub confirms the PR head. |
| PR #499 completion | `3d8d4db682da3e8154d1bfed72e3cfedf351e8f8` | Operator merge | Operator reported merging; GitHub confirms merge `c6978e2108a977dd7a16351cd5c781086e5426c3`. |
| This closeout commit and PR | `sessions/2026-11-26-close-ci-path-verification` / planned | Planned | Exact commit approval and PR completion have not occurred. |

Earlier issue implementation and its authority record are covered by the prior closeout in [PR #497](https://github.com/codemagicianhq/arcane/pull/497). Consumer changes and their approvals remain in the consumer's own records.
