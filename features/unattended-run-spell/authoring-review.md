# Authoring review: Unattended Run

Review of [[.arcane/spells/spell-unattended-run]] against [[.arcane/governance/spell-authoring-standards]]. Self-assessment, not an executable safety guarantee.

| Dimension | Grade | Evidence |
| --- | --- | --- |
| D1 Invocation | Gold | Required metadata, executive summary and distinction from full-cycle/parallel-workers. |
| D2 Distribution | Gold | No consumer identity, provider, roster, tracker or cloud requirement; configuration and absent-context paths are explicit. |
| D3 Context | Gold | Optional files fall back to brief/observed tooling; absent authority stops only unattended outward actions. |
| D4 Completeness | Gold | Intake through closure, finite milestones, retry limits, interruption/resume and reconciliation. |
| D5 Acceptance | Gold | Run-record schema, final report and user-verifiable acceptance checklist. |
| D6 References | Silver | Delegation directions, full-cycle return link and methodology entry; reused shared fragments. |
| D7 Safety | Gold | Invalid inputs, explicit consent and bootstrap, per-action gates, exclusions, data boundaries, expiry and supervision. |
| D8 Conciseness | Silver | One lifecycle responsibility; implementation and policy mechanics delegated; shared prose generated. |

Overall: Silver (weakest dimension). D2 and D7 exceed their required Silver floor. Contract tests and static checks verify distribution and the presence of instructions; actual host persistence, agent behavior, authorization provenance and application correctness require the run's real evidence.

Review lenses: no new executable runtime, dependencies or privileged executor. Security boundaries keep untrusted inputs as data and separate formatting from authority. No performance change in the CLI beyond loading another asset. Acceptance criteria remain finite, observable and stage-specific. Residual risk: prompt instructions are not enforcement; the spell states that limitation.

## Validation observed

2026-11-06: full Vitest coverage passed with 3,134 tests passing and six skipped, 93.73% lines; configured thresholds passed. Build and demo generation, lint, all-file typecheck, distributed ADR references, secrets scan, catalog, changelog, version and 389-item self-host parity checks passed. The initial full run exposed missing deliberate-set/count updates and proactive frontmatter wording; these were corrected before the final passing run. This was local evidence before the shipping grant; PR checks and publication are separate gates.


## Ship review — 2026-11-06

Verdict: APPROVE for PR, subject to its required checks. Correctness: no issues found; full-cycle explicitly executes delegated milestones without restarting intake. Security: no new executor or authority mechanism; scoped consent, untrusted input handling, exclusions and expiry remain explicit. Performance: no issues; assets and registry only. Tests: distribution and safety contracts plus full regression passed; they do not prove model compliance. Naming/clarity: no issues; descriptive established vocabulary. Architecture: no issues; shared fragments and registry-driven shims preserve the existing implementation loop. No unresolved high-severity finding. This is an agent self-review, not an independent platform approval.
