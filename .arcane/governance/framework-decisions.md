---
title: Legacy Framework Decision Reference
audience: both
status: active
distributable: true
tags: [decisions, adr, framework, references]
---

# Legacy Framework Decision Reference

Arcane framework decisions now use the `ARC-NNN` sequence. The entries below preserve the legacy `ADR-NNN` identifiers still cited by distributed governance and spells so every installed citation resolves offline. Consumer repository decisions remain in the root `DECISIONS.md` and use their own local sequence.

## ADR-002 — Documentation in Markdown and Git

Keep operational documentation in reviewable, version-controlled Markdown alongside the work it governs.

## ADR-011 — Troubleshooting Standard

Troubleshooting guidance uses Symptom, Cause, Fix, Verify, and Prevention sections so remediation is reproducible.

## ADR-019 — Spell Prompt Naming

Arcane workflow prompts use the `spell-` prefix to make their purpose and invocation surface explicit.

## ADR-028 — Agent Git Attribution Model

The content producer is the commit author, the approving operator is the committer, and agent-authored commits carry attribution trailers.

## ADR-029 — Canonical Commit Metadata Schema

Agent commits use stable `Agent`, `Model`, and `Provider` trailers, with optional role, task, channel, and approval metadata.

## ADR-031 — Agent Role Consolidation

Agent identities represent durable roles rather than framework-specific technology stacks.

## ADR-032 — Context-Dependent Agent Power Levels

Agent autonomy is assigned per agent and repository through the Spectator-to-Archmage ladder.

## ADR-034 — Actionable Recommendation Guardrails

Recommendations involving cost, accounts, subscriptions, or irreversible action require disclosure, current verification, alternatives, and proportionate approval.

## ADR-048 — Code Versus Docs Branch Policy

Code repositories use protected integration branches and reviewed PRs. A genuinely local-only documentation repository may integrate a reviewed docs change with a local fast-forward when no remote PR path exists.

## ADR-049 — Spell Loop

Arcane's lifecycle is plan, architect, implement, test, review, and ship, with session and operational spells supporting the loop.

## ADR-050 — Testing Standards

Projects select stack-appropriate test tooling and enforce coverage and critical-path evidence before shipping.

## ADR-051 — Infrastructure Agent Ownership

The infrastructure role owns CI/CD, deployment automation, and platform operations while remaining subject to repository authority gates.

## ADR-052 — Product Excellence Standards

PRD enhancement uses explicit quality dimensions and profile-dependent Bronze, Silver, and Gold targets.

## ADR-061 — Arcane Framework Identity

Arcane is a four-layer methodology composed of Spells, Governance, Agents, and the CLI.

## ADR-068 — Root Cause Analysis Standard

Material incidents receive structured root cause analysis with evidence, corrective actions, prevention, and follow-up ownership.
