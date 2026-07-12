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

- Each agent operates from its own `workspace-{agent}` root — never a shared tree — so concurrent agents don't collide.
- Grant the narrowest access that lets the agent do its job (research agents: `Read-only`; builders: `Read/Write`).
- The operator's primary working tree is never an approved agent path.

---

## Discovery Rule

When a request targets a repo that is expected to be inside an approved root:

1. Perform read-only discovery first (list/find/read).
2. If path exists, continue task without asking for duplicate authorization.
3. If not found, request the exact path from the operator.
4. Do not search outside approved roots.

---

## Change Control

- Add/remove paths only through documentation update in this file.
- Reflect material scope changes in [[agents/agent-policies|agent-policies.md]].
- If access boundaries meaningfully change risk posture, record an ADR.
