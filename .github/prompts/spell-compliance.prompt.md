---
name: Spell — Compliance
description: Run a regulatory compliance self-assessment against this repo (GDPR, CCPA, SOC 2, HIPAA) and produce a prioritized remediation checklist. Read-only — never drafts policies or fixes gaps automatically.
argument-hint: Optional focus (e.g., "GDPR only", "pre-launch check", "SOC 2 readiness")
agent: agent
---

## Executive Summary

- This spell self-assesses a repo's compliance posture against GDPR, CCPA, SOC 2, and HIPAA, and
  produces a prioritized remediation checklist.
- **It is read-only.** It never drafts a privacy policy, invents a retention period, or fixes a gap on
  its own — every finding is a checklist item for a human (often with legal input) to act on.
- **This is not legal advice**, and the report says so explicitly. It is a starting self-assessment
  against established, uncontroversial obligations — not a substitute for a qualified lawyer's analysis
  of this specific business's specific facts.
- Findings cite `CS-nn` rule IDs from
  [`compliance-standards.md`](../../.arcane/governance/compliance-standards.md) — the rationale for each
  obligation lives there, not restated here.

---

## Context files

- [governance/compliance-standards.md](../../.arcane/governance/compliance-standards.md) — every
  `CS-nn` rule this spell checks against. Rules are **cited by ID only** in this spell, never restated.
  **If the file is not installed**, this spell still runs in full — findings just cite each check as
  `CS-nn (rationale unavailable — install the standards doc)` instead of linking to it.
- `threat-model.md` and `hardening-checklist.md`, if present — the security-control evidence for `CS-10`
  (access control, audit logging) frequently already exists in these docs rather than needing to be
  assessed fresh.
- `project.md` / `.arcane.json` — for the business context (target users, whether the product could
  plausibly reach EU or California residents, whether it handles health data) that Phase 1 needs.

## Phase 1 — Determine applicability (ask, don't assume)

Applicability determinations have real consequences, so resolve each of the following by checking the
repo's own context first (`project.md`, `.arcane.json`, existing docs); **ask the operator directly**
for anything not resolvable from those sources — never assume:

- Could the product realistically reach EU residents (any public-internet-reachable consumer product
  defaults to yes) — GDPR relevance (`CS-01`).
- Does the business meet, or plausibly approach, CCPA/CPRA's revenue or data-volume thresholds, and
  could it reach California residents — CCPA relevance (`CS-04`). State plainly that exact thresholds
  should be verified against current statute, not assumed from this spell's own knowledge.
- Is a customer, prospect, or procurement process currently asking for a SOC 2 report, or is one
  expected within a near-term sales cycle — SOC 2 relevance (`CS-09`).
- Does the product create, receive, maintain, or transmit protected health information as a covered
  entity or business associate — HIPAA relevance (`CS-11`). State plainly that this is a narrow trigger,
  not a default.

Record which frameworks are in scope for this run and why, before proceeding — a framework judged
out of scope is reported as such in Phase 4, not silently skipped without explanation.

## Phase 2 — Inventory (read-only)

Enumerate what compliance-relevant artifacts already exist, without judging sufficiency yet:

- A privacy policy — does one exist, and where.
- A data inventory / Records of Processing Activities doc — does one exist and does it name what
  personal data is collected, where it's stored, and why.
- A retention/deletion policy — does one exist, and does it define a period per data category.
- Consent mechanism indicators — a cookie/consent banner, a consent-management SDK, an opt-in flow in
  the signup path; and separately, a "Do Not Sell or Share" link or equivalent opt-out mechanism.
- Existing security documentation this repo may already ship (`threat-model.md`,
  `hardening-checklist.md`, `authentication-strategy.md`) — relevant evidence for `CS-10` without
  needing to reassess it from scratch.
- Breach-notification process — is there a documented incident-response process with a named owner and
  a notification path.

Report anything not found as absent, not as failed — Phase 3 is where absence becomes a finding against
a specific applicable rule.

## Phase 3 — Audit

For each framework marked in-scope in Phase 1, check its rules from `compliance-standards.md` against
what Phase 2 found. Mark each `PASS` / `FAIL` / `PARTIAL`, citing the rule ID only:

```text
CS-07 FAIL — no data inventory found; a data inventory is the prerequisite artifact CS-02/CS-04's
  rights-request obligations depend on.
CS-06 PARTIAL — a consent banner exists, but the "accept all" and "reject non-essential" options are
  not visually equivalent, which is a common consent-validity gap.
```

Do not restate why a rule matters — that reasoning lives in `compliance-standards.md`; cite the ID and
state the evidence.

## Phase 4 — Report

Produce a prioritized remediation checklist: mandatory-baseline gaps (GDPR/CCPA, if in scope) before
optional-tier gaps (SOC 2, HIPAA), and structural prerequisites (a missing data inventory) before the
rights-request/consent mechanisms that depend on them.

```markdown
## Compliance Self-Assessment — [repo name]

**Frameworks assessed:** [list, with in-scope/out-of-scope reasoning from Phase 1]
**Date:** [timestamp]

> This is a self-assessment against established compliance obligations, not legal advice. Confirm any
> finding below with qualified counsel before treating it as a compliance determination.

### Findings, by priority

#### Mandatory baseline (GDPR / CCPA)
- [ ] CS-07 — [gap + what artifact would close it]

#### Optional tier (SOC 2 / HIPAA), if in scope
- [ ] CS-10 — [gap + what artifact would close it]

### Out of scope this run
- [Framework] — [why, per Phase 1's determination]
```

## Rules

This spell defers entirely to
[governance/compliance-standards.md](../../.arcane/governance/compliance-standards.md) for what each
obligation means and why. Findings in this spell cite rule IDs; they do not re-explain them. This spell
never drafts a policy document, never invents a retention period or lawful basis on the operator's
behalf, and never claims to produce a legal compliance determination — every output is a checklist item
for a human to act on, with legal input where the finding calls for it.

## Related

- [Compliance Standards](../../.arcane/governance/compliance-standards.md)
- **Feeds into:** the operator's own remediation work — this spell does not fix gaps, it enumerates
  them.
