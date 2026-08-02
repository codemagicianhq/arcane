# 2026-08-01 — Intake Batch 001, Enforcement Chain, and 0.15.0 Release

## Session: Execute intake batch, ship enforcement fixes, publish 0.15.0, and close

### Prompt Context

Session work began from a strict external intake directive and continued through ordered remediation of EF-25 through EF-29, ARC-024 implementation, EF-31 CI enforcement, attribution correction, and release publication. The final release work bumped `arcane-cli` from `0.14.0` to `0.15.0`, recovered the npm publish workflow by pinning npm 11 for Node 20, and verified the package registry, GitHub release, provenance, and successful publish run. The npm website UI lagged behind the registry metadata during verification.

### What Got Done

1. Verified and adjudicated the external intake batch end to end, preserving per-item evidence reports under [docs/intake/batch-001](../docs/intake/batch-001) and accepted routes in [TODO.md](../TODO.md), [DECISIONS.md](../DECISIONS.md), and the feature PRDs.
2. Completed EF-25 through EF-29 in order via PRs [#13](https://github.com/codemagicianhq/arcane/pull/13), [#14](https://github.com/codemagicianhq/arcane/pull/14), [#15](https://github.com/codemagicianhq/arcane/pull/15), [#16](https://github.com/codemagicianhq/arcane/pull/16), [#17](https://github.com/codemagicianhq/arcane/pull/17), and [#18](https://github.com/codemagicianhq/arcane/pull/18), including Git safety, continuity preservation, token detection, agent schema validation, autonomy gates, and session branch handling.
3. Narrowed and implemented ARC-024 through PRs [#19](https://github.com/codemagicianhq/arcane/pull/19) and [#20](https://github.com/codemagicianhq/arcane/pull/20), adding the incident queue, doctor/build enforcement, and historical EF-25 escalation evidence.
4. Wired EF-31 into CI and added the real negative version-bump test in [PR #21](https://github.com/codemagicianhq/arcane/pull/21), then corrected attribution metadata and relocated the attribution proposal to [IDEAS.md](../IDEAS.md) through [PR #22](https://github.com/codemagicianhq/arcane/pull/22).
5. Published `arcane-cli@0.15.0` through [PR #23](https://github.com/codemagicianhq/arcane/pull/23) and [PR #24](https://github.com/codemagicianhq/arcane/pull/24); GitHub release `v0.15.0`, npm dist-tag `latest`, tarball provenance, and publish run [30730879822](https://github.com/codemagicianhq/arcane/actions/runs/30730879822) all verified successfully.

### Decisions Made

| ADR                                                                                       | Decision                                                                                                                              | Rationale                                                                                                   |
| ----------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| [ARC-024](../DECISIONS.md#arc-024--confirmed-severity-must-have-operational-consequences) | Confirmed Critical/High data-integrity and security defects have release and doctor/build consequences, with one-line dated deferral. | Detection had succeeded while prioritization had not; enforcement turns severity into an operational state. |
| [ARC-025](../DECISIONS.md#arc-025--pin-publish-tooling-to-the-supported-node-runtime)     | Pin npm 11 for Node 20 publishing and retain manual workflow dispatch for recovery.                                                   | `npm@latest` moved to npm 12 and broke the publish runner before trusted publication.                       |

### Lessons Learned

#### Non-interactive PR completion flags matter in scripted sessions

A GitHub merge command can appear to stall when it reaches an interactive confirmation path in an automated terminal sequence. The fix was to terminate the stuck process, rerun the flow non-interactively, and include explicit merge automation flags. This prevents perceived hangs and keeps close-session automation deterministic.

#### Rediscovery handling prevents duplicate backlog inflation

EF-25 initially looked like a newly filed severe bug, but commit history proved the same diagnosis and test had already been filed earlier. Marking rediscovery explicitly preserved chronology and prevented duplicate “new” work items from obscuring true net-new risk.

#### Release tooling must be bounded by the runner runtime

Using `npm@latest` on a Node 20 runner allowed a registry-side major release to break publication without any repository change. Pinning npm 11 and testing the workflow's runtime/tool relationship restored deterministic publishing; registry metadata is the authoritative verification surface when the npm website rendering lags.

#### Attribution must be sourced, not inferred

The corrected PR history uses `Copilot <copilot@codemagician.net>` with `Agent`, `Model`, and `Provider` trailers, while omitting an unsourced role. Runtime persona and roster-derived role remain a separate future idea rather than fabricated commit metadata.

#### Severity labels must map to operational consequence

The batch surfaced cases where confirmed high severity had no mandatory escalation behavior. Capturing the issue as EF-30 / ARC-024 reframed the gap from individual bug handling to governance mechanism design, which is the level where prevention actually scales.

### Additional Closeout Work

1. Enforced disposition hygiene by dropping EF-06 and deleting its report with no retained trace, while preserving accepted findings and routes.
2. Filed accepted outcomes into source-of-truth docs: bug backlog entries in [TODO.md](../TODO.md), architecture records in [DECISIONS.md](../DECISIONS.md), and feature planning in [features/docs-mode/PRD.md](../features/docs-mode/PRD.md) and [features/spell-intake/PRD.md](../features/spell-intake/PRD.md).
3. Applied the repository line-ending baseline through [.gitattributes](../.gitattributes) before downstream filing changes to reduce review noise and avoid EOL-only drift confusion.
4. Corrected finding lineage by marking EF-25 as rediscovery, then captured the separate process-gap finding EF-30 and proposed [ARC-024](../DECISIONS.md#arc-024--confirmed-severity-must-have-operational-consequences).
5. Captured a durable quick idea in [IDEAS.md](../IDEAS.md) with an outbound wiki-link to [EF-26](../docs/intake/batch-001/EF-26.md), then checkpointed and merged commit-work via [PR #8](https://github.com/codemagicianhq/arcane/pull/8).

### Open Items Carried Forward

- Resolve the remaining accepted intake items, beginning with EF-20's non-interactive Git execution contract.
- Implement [EF-25](../docs/intake/batch-001/EF-25.md) first: protect continuity files during update and land the survival regression test in the same fix.
- Implement [EF-26](../docs/intake/batch-001/EF-26.md): install real token-pattern sources and add negative/positive gate tests.
- Implement [EF-27](../docs/intake/batch-001/EF-27.md) and [EF-28](../docs/intake/batch-001/EF-28.md): schema validation plus enforceable autonomy gates.
- Reproduce and close [EF-20](../docs/intake/batch-001/EF-20.md): define a non-interactive Git execution contract with command-scoped timeout behavior.
- If the EF-25 through EF-30 cluster design hardens further, run `spell-document` to publish a consolidated implementation design artifact before coding.
- Consider running `spell-document` for a consolidated implementation design if the enforcement cluster needs a durable public explanation.
- Correct the provider-specific close-session lifecycle wording: the prompt still describes an Azure DevOps-only merge path while this repository uses GitHub PRs.
- No screenshots were provided; the three untracked PNGs remain user-owned and were not staged.
