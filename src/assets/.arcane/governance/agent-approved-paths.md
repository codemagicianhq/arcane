---
title: Agent Approved Paths Registry
audience: both
last_updated: YYYY-MM-DD
status: active
distributable: true
tags: [agent, security, filesystem, autonomy]
---

# Agent Approved Paths Registry

Canonical allowlist of repository paths agents may read/write without per-message re-authorization, as long as actions remain within policy constraints.

This is a **template**. Fill in your own agent × workspace × repo rows; your live registry lives in your ops repo, not in the distributed framework.

## Executive Summary

- This registry reduces repeated path-authorization friction while preserving least privilege.
- Paths listed here are pre-approved roots for discovery and normal coding work.
- Anything outside these roots still requires explicit human approval.
- Agents should attempt read-only discovery in these roots before claiming "no access".

See [[agents/agent-policies|Agent Policies]] for global security boundaries.

---

## Approved Roots

Define one block per agent. Each agent gets its own isolated workspace root, plus read or read/write access to the specific repos it works on. Use `Read-only` for analysis/research agents and `Read/Write` for builders.

| Agent Scope                                 | Path                                                          | Access     |
| ------------------------------------------- | ------------------------------------------------------------ | ---------- |
| `{AGENT_NAME}` workspace root               | `/home/{OPERATOR_USERNAME}/.<runtime>/workspace-{agent}`     | Read/Write |
| `{BUSINESS_NAME}` repo (in agent workspace) | `/home/{OPERATOR_USERNAME}/.<runtime>/workspace-{agent}/{BUSINESS_NAME}` | Read/Write |
| Ops/docs repo (in agent workspace)          | `/home/{OPERATOR_USERNAME}/.<runtime>/workspace-{agent}/ops` | Read/Write |

**Conventions:**

- **Each agent operates from its own `workspace-{agent}` root. Enforcement: explicitly advisory prose (ARC-023) — this describes a convention for the operator's own agent-fleet setup; no check in this repository verifies that any agent actually runs from an isolated workspace root.** — never a shared tree — so concurrent agents don't collide.
- **Grant the narrowest access that lets the agent do its job. Enforcement: explicitly advisory prose (ARC-023) — which access level counts as "narrowest" for a given agent is a judgment call; no check verifies the grant against actual job scope.** (research agents: `Read-only`; builders: `Read/Write`).
- **The operator's primary working tree is never an approved agent path. Enforcement: explicitly advisory prose (ARC-023) — no check cross-references this file's approved-path rows against the operator's actual working-tree path to catch a violation.**

---

## Discovery Rule

When a request targets a repo that is expected to be inside an approved root:

1. **Perform read-only discovery first. Enforcement: explicitly advisory prose (ARC-023) — the same behavior universal-agent-rules.md rule 20 covers; no check verifies that an agent actually performs read-only discovery before proceeding.** (list/find/read).
2. **If path exists, continue task without asking for duplicate authorization. Enforcement: explicitly advisory prose (ARC-023) — whether an agent treats prior discovery as sufficient and skips a redundant ask is a judgment call; no check verifies this occurred.**
3. **If not found, request the exact path from the operator. Enforcement: explicitly advisory prose (ARC-023) — the same "before claiming no access" behavior universal-agent-rules.md rule 20 covers; no check verifies an agent actually asks rather than assuming access is absent.**
4. **Do not search outside approved roots. Enforcement: explicitly advisory prose (ARC-023) — no check inspects an agent's actual filesystem access to confirm it stayed within approved roots.**

---

## Change Control

- **Add/remove paths only through documentation update in this file. Enforcement: explicitly advisory prose (ARC-023) — no check cross-references actual agent path grants against this document to catch an undocumented change.**
- **Reflect material scope changes in [[agents/agent-policies|agent-policies.md]]. Enforcement: explicitly advisory prose (ARC-023) — whether a scope change is "material" enough to require an update, and whether the update happens, both depend on agent judgment; no check cross-validates this file against agent-policies.md.**
- **If access boundaries meaningfully change risk posture, record an ADR. Enforcement: explicitly advisory prose (ARC-023) — `check:adr-references` verifies that ADR citations elsewhere resolve, not that a change to this file actually triggered a new ADR.**
