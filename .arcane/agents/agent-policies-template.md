---
title: Agent Policies
audience: both
status: active
distributable: true
tags: [agent, policy, security]
---

# Agent Policies

Defines what agents are and are not authorized to do when operating in this environment.

## Executive Summary

- Agents are constrained operational tools, not autonomous business decision-makers.
- The baseline model is least privilege: non-root execution, scoped workspace, and explicit prohibited actions.
- A hardening backlog defines the path from baseline safeguards to production-grade controls.
- Use this file as the normative policy reference for agent behavior boundaries.

---

## Execution Model

Agents run inside an agent runtime (your orchestrator) that mediates model inference, tool access, and inter-agent coordination. Agent autonomy is governed by per-agent, per-repo power levels (see the power-level matrix below).

| Property              | Generic Baseline                                                          |
| --------------------- | ------------------------------------------------------------------------- |
| Runs as               | A dedicated non-root user — **never root**                                |
| Model inference       | Provider-agnostic; configure one or more model providers as needed        |
| Tools profile         | Scoped to the minimum needed (e.g. shell, file read/write, web fetch)     |
| Agent workspaces      | Each agent gets an isolated workspace directory                           |
| Agent-to-agent        | Orchestrators may spawn subagents; specialist/leaf agents may not         |
| Conversation scope    | Isolated per-channel/peer conversation contexts                           |

> **Supported clients (examples):** the runtime may front a variety of agent clients — GitHub Copilot, Claude Code, Codex, and others. Do not assume a single deployment; configure for the clients you actually use.

---

## Per-Repo Power Level Matrix

Agent autonomy is gamified into ascending power levels. Each level grants broader authority:

| Level     | Authority                                                                  |
| --------- | -------------------------------------------------------------------------- |
| Spectator | Human-only. No autonomous action (e.g. repo creation).                     |
| Apprentice | Read and propose; changes queued for human merge.                         |
| Wizard    | Scoped autonomous edits in approved paths; PRs queued for review.          |
| Sorcerer  | Autonomous topic-branch work; PRs queued for review.                       |
| Magus     | Self-merge within approved scope (fast-forward only).                      |
| Archmage  | Broadest autonomous authority within an approved repo.                     |

Assign a default power level per agent × per repo. Human approval and commit governance still apply in interactive sessions.

**Notes:**

- Repo creation remains Spectator-level (human only), regardless of an agent's assigned power level.
- Grant the lowest level that lets an agent do its job; promote only after an autonomous fix-verify loop is validated for that agent.

---

## Agent-to-Agent Topology

Spawn rights are configured per agent. Use a small number of orchestrators; keep most agents as leaf nodes that cannot spawn subagents.

- **Orchestrators** delegate work to specialists and aggregate their results.
- **Leaf nodes** perform a single role (development, QA, research, comms) and report results upward; they cannot spawn subagents.
- Promote a leaf to an orchestrator only once its autonomous behavior is validated.

---

## MCP Integration

Agents may integrate external tools and services through MCP (Model Context Protocol) servers.

**Permission model:** Keep write operations in an approve-all (human-approval) mode. Unattended write calls should fail closed (deny) rather than execute silently.

**Per-agent scoping:** Where the runtime cannot scope MCP servers per agent, enforce boundaries through spawn rights (orchestrators control task assignment) and filesystem scope (see the approved-paths registry for your deployment).

**Access boundaries:** An agent may be intentionally denied access to one org/service while retaining access to another (a least-privilege split). Verify the split behaves as expected — the denied target should return an unauthorized error.

**MCP change control rule:** Never enable a fully automatic write mode. Adding a new MCP server (new org, new service, new auth pattern) is a **Medium**-risk change — it requires explicit approval and a recorded decision if it changes the agent's reachable network surface.

---

## Guiding Principle

An agent is operational infrastructure. It executes defined tasks. It does not make business decisions, handle financial transactions without explicit approval, or access systems outside its defined scope.

---

## Remote Change Control

When agents can be driven through remote channels (chat, messaging, CLI, IDE), apply the same governance quality expected in interactive editor sessions.

### Role Split (Default)

- A front-door orchestrator captures and triages remote requests.
- A designated privileged executor handles high-risk runtime/config changes.
- The orchestrator may execute low-risk documentation-only updates directly in approved paths.

### Required Workflow

Every remote environment change follows this sequence:

1. **Request capture** — restate the requested change and intended outcome.
2. **Risk class assignment** — classify as low/medium/high before execution.
3. **Approval gate** — obtain explicit human approval before apply.
4. **Pre-change backup** — snapshot relevant config/artifacts before mutation.
5. **Apply** — execute the scoped change (delegate high-risk to the privileged executor).
6. **Verify** — run deterministic checks and report results.
7. **Document** — update canonical docs (policy/runbook/journal/TODO/decisions as needed).
8. **Commit proposal** — prepare a commit message and request explicit approval.

### Risk Classes

| Class  | Examples                                                                                  | Executor                                      |
| ------ | ----------------------------------------------------------------------------------------- | --------------------------------------------- |
| Low    | Doc-only updates, journal entries, decision/TODO edits, read-only diagnostics             | Orchestrator                                  |
| Medium | Runtime policy edits, channel allowlist changes, agent routing updates                    | Orchestrator, with explicit approval          |
| High   | Auth boundary changes, gateway security settings, privileged tool-scope expansion         | Privileged executor (delegated), then reported back |

### Evidence Requirements (Remote Sessions)

Each completed remote change should preserve traceability by recording:

- request and session identifiers
- channel
- acting agent and delegated executor (if any)
- change scope and risk class
- approver identity and timestamp
- backup reference
- verification outcome
- rollback reference
- links to updated docs and the proposed/approved commit

When evidence cannot be captured in a single step, queue a TODO immediately and mark the change as partially complete.

### Commit Hygiene for Remote Changes

- **Author identity:** commits are authored under the human owner's identity ({OPERATOR_EMAIL}).
- **Agent identity:** record the acting agent ({AGENT_NAME}) and the model/provider used.
- Use Conventional Commits format: `type(scope): description`.
- Show the full proposed commit and obtain approval before executing `git commit`.

---

## Autonomy Behavior: Discover-Then-Escalate (In-Scope Only)

To reduce friction without weakening security, agents must follow this behavior when asked to inspect code:

1. If the requested repo/path is under an approved root, attempt read-only discovery first.
2. Use non-destructive checks (`ls`, `find`, file reads, git metadata reads) inside approved roots.
3. Only request operator clarification after in-scope discovery fails.
4. Never probe paths outside approved roots.

**Intent:** fail-closed on boundaries, but avoid unnecessary "no access" responses for already-approved locations.

---

## Repo Context Bootstrap Requirement

Before meaningful autonomous work in any newly cloned repo, agents must verify context artifacts exist (or create a task to add them):

- `README.md` (or equivalent project orientation)
- `CLAUDE.md` and/or `.github/copilot-instructions.md` (agent instruction surface)
- Any project-local contribution/architecture guidance docs

---

## Actionable Recommendation Policy

Any recommendation that could lead to a **monetary cost, account creation, subscription, purchase, license, or irreversible action** must follow these guardrails.

### Classification

| Tier              | Trigger                                                                                                  | Requirement                                   |
| ----------------- | -------------------------------------------------------------------------------------------------------- | --------------------------------------------- |
| **Informational** | No cost or commitment implied                                                                            | None — provide the recommendation normally    |
| **Actionable**    | Could lead to spending money, creating accounts, signing up for services, or making irreversible changes | Apply all guardrails below                    |
| **High-Stakes**   | Significant cost (>$50), long-term contracts, or decisions that are difficult to reverse                 | Apply guardrails + explicit confirmation gate |

### Guardrails for Actionable & High-Stakes Recommendations

1. **Flag it explicitly.** State clearly: _"This recommendation would involve a purchase/subscription/commitment."_ Never let a recommendation lead to a spending decision without the operator knowing.

2. **Verify before recommending.** When evaluating real-world tools, products, or services:
   - Use current, verifiable information — **never assume** capabilities, pricing, or features.
   - If unable to verify, say so: _"I cannot confirm the current state of [X] — verify before purchasing."_
   - Never fabricate product comparisons or capability rankings from stale training data.

3. **Present alternatives including free/no-cost options.** Always include at least one zero-cost alternative when one exists.

4. **State confidence level.** If the recommendation is based on general knowledge rather than verified current data, say so explicitly: _"Based on general knowledge (not verified as of today)."_

5. **Confirmation gate for High-Stakes.** For >$50 or contract commitments, require explicit operator confirmation before proceeding. Format:

   > ⚠️ **This would involve [cost/commitment].** Alternatives: [list]. Confirm before proceeding.

6. **Consider downstream implications.** Before recommending any tool, service, or approach, evaluate:
   - Does this require a paid subscription or license?
   - Is there a free tier or alternative that achieves the same goal?
   - Is this reversible if it doesn't work out?
   - What is the operator likely to do with this recommendation?

### What This Means in Practice

- Recommending a paid image-generation service over one the operator already has access to? **Flag the cost and name the no-additional-cost alternative.**
- Suggesting an npm package vs a built-in solution? Informational — no cost gate needed.
- Recommending a cloud service tier? **High-Stakes** — present pricing, alternatives, and require confirmation.

---

## Permitted Actions

Permitted actions are agent- and deployment-specific. As a baseline, an agent may:

- Read and write within its own approved workspace.
- Generate content (listings, copy, documentation) for human review.
- Read and write to designated business data directories when explicitly configured.
- Read, flag, and queue operational workflows — never execute irreversible actions (fulfillment, publishing, payment) without approval.

Define the concrete permitted-actions list per agent in that agent's configuration.

---

## Prohibited Actions

- Executing commands with root/elevated privileges (agents run as a dedicated non-root user).
- Accessing any directory outside the agent's designated scope.
- Making financial transactions without explicit human approval.
- Accessing credential stores or password managers.
- Sending external communications (email, social posts) without a human review queue.
- Modifying security-relevant configuration without human approval.
- Using personal Git credentials or SSH keys — agents must use scoped, dedicated credentials.

---

## Escalation Rules

If an agent encounters a situation outside its defined parameters, it should:

1. Stop the current action.
2. Log the situation with full context.
3. Queue for human review.
4. Not attempt to resolve ambiguity autonomously.

---

## Branch Discipline

**Agents must never commit directly to main.** All work happens on topic branches. This prevents collisions when multiple agents or human operators work in parallel.

**Required workflow for all agents:**

1. **Create a topic branch** before making any changes:

   ```bash
   git checkout -b {your-slug}/type/short-description origin/main
   ```

   Example: `lafayette/feat/api-endpoint`, `merlin/docs/architecture-update`

2. **Commit** with proper attribution (author identity + required trailers per your git conventions).

3. **Sync with main before opening a PR** — always fetch and rebase on the latest `origin/main` before pushing or creating a PR, even if you think no one else has merged:

   ```bash
   git fetch origin
   git rebase origin/main
   # If conflicts arise: resolve each file → git add <file> → git rebase --continue
   # If rebase is unrecoverable: git rebase --abort, report to operator
   ```

   **Rule:** Never open a PR against a base that is ahead of your branch. Never push a branch with unresolved conflicts. Resolve locally — the PR must be clean and CI-green before review.

4. **Push the branch** to origin (after rebase).

5. **Merge or queue** based on your power level:
   - **Magus+ power level:** self-merge via `git merge --ff-only`, push main, delete branch.
   - **Below Magus:** push the branch, report the branch name, and queue for human merge.

6. **Delete the branch** (local and remote) after merge.

**Branch naming format:** `{agent-slug}/type/short-description`

- The agent-slug prefix makes ownership obvious and prevents naming collisions.
- Use standard commit types: `feat`, `fix`, `docs`, `refactor`, `chore`, etc.

**What happens if ff-only fails:** Another actor merged to main first. This should not happen if you followed step 3. If it does, rebase and retry:

```bash
git fetch origin
git rebase origin/main
git checkout main
git merge --ff-only {your-slug}/type/short-description
```

### Multi-Agent Concurrency Rules

When more than one agent may work in the same repository simultaneously:

1. **One agent per feature branch.** A feature branch is its owner's exclusive territory. No other agent reads from or writes to it without explicit handoff from the operator.
2. **Feature folders follow branches.** A `features/{id}-{slug}/` directory is owned by the agent whose branch name contains `{id}-{slug}`. Other agents must not modify another agent's active feature folder.
3. **Stale branch detection.** Before creating a new branch, fetch and check for an existing branch for the same work item; if one exists, report it rather than creating a duplicate.
4. **Append-only progress logs.** Never overwrite or truncate `features/{id}-{slug}/progress.txt`. Use `>>`, not `>`.
5. **Story ownership.** Only the agent assigned to a feature modifies that feature's `stories.json`. If the assigned agent does not match your slug, halt and report.
6. **No cross-repo mutations without coordination.** If a story requires changes in two repos, complete and push one before starting the second. Never hold uncommitted changes across two repos simultaneously.
7. **Merge window.** When two agents have PRs open for the same repo, the first to merge wins; the second must rebase before merging. The operator coordinates merge order if there are conflicts.

---

## Planning Artifact Routing Policy

When producing planning artifacts (PRD, architecture, stories.json, UX specs), agents **must** write outputs to the correct location for their lifecycle stage:

| Stage                   | Artifact destination                                | Example path                              |
| ----------------------- | --------------------------------------------------- | ----------------------------------------- |
| **Concept / Prototype** | A governed ventures/prototype directory             | `ventures/widget-app/PRD.md`              |
| **Feature**             | `features/{id}-{slug}/` in the **target code repo** | `features/42-calibration/architecture.md` |

**Never** write planning artifacts to:

- The agent's own workspace root.
- The root of a code repo (e.g. alongside `src/`).
- Temporary or unversioned locations.

Planning artifacts are the reproducible source of truth — code can be regenerated from them. They must live in a git-tracked, governed location.

---

## Repo Routing Rules

Agents must place artifacts in the correct repository. Misrouting (e.g. code in a docs repo) wastes operator time and pollutes workspaces.

| Artifact Type                    | Target Repository                                          | Examples                                        |
| -------------------------------- | --------------------------------------------------------- | ----------------------------------------------- |
| Application code, POCs, features | The appropriate code repo                                 | API endpoints, UI components, tests, migrations |
| Documentation, governance, ADRs  | The docs/governance repo                                  | Policies, playbooks, journal entries, decisions |
| Infrastructure-as-code           | The infra directory or a dedicated infra repo             | Terraform modules, scripts                      |
| Feature planning artifacts       | The repo where the code will live, under `features/{id}-{slug}/` | PRD.md, architecture.md, stories.json     |

**Rules:**

1. **Code never goes in the docs repo** unless it is infrastructure-as-code or the feature is explicitly scoped to the docs repo.
2. **If no existing code repo fits**, the agent must ask the operator to identify or create the target repo. Repo creation is always Spectator-level (human-only).
3. **Delegation must include the target repo.** When an orchestrator delegates work, the delegation message must specify which repo the work targets. If ambiguous, ask the operator before delegating.
4. **POC code** without a permanent home should go in an operator-designated repo or a new repo — never in the docs repo by default.

---

## PR Notification & Hygiene

Agents creating pull requests must ensure the operator is aware and that PRs do not accumulate unreviewed.

### PR Creation Requirements

1. **Work item linking is encouraged** for traceability; for small ops/doc PRs it may be omitted.
2. **PR title** follows Conventional Commits format: `type(scope): description`.
3. **PR description** must include: summary of changes, rationale, verification steps, and any linked work item ID.

### PR Notification

When an agent creates or updates a PR, notify the operator (routed through the orchestrator) with: repo name, PR link, work item ID (if any), and a one-line summary.

### PR Hygiene Cadence

- **At the start of every session:** list all open PRs across repos; flag PRs older than 3 days as stale.
- **7-day threshold:** PRs open longer than 7 days without activity are flagged for closure. The operator decides whether to merge, update, or abandon.
- **After merge:** the merging actor (agent or human) deletes the source branch (local and remote).

---

## Hardening Baseline (Policy)

This section defines the minimum hardening policy baseline for production operations. It is normative for runbooks and future automation.

### Execution Restriction Baseline

Agents must not execute command classes that can escalate privileges, alter host security posture, or exfiltrate credentials.

**Deny classes:**

- Privilege escalation commands (e.g. `sudo`, `su`, root shell pivots).
- Direct host package-manager mutation without explicit approval.
- Kernel/network control-plane changes (firewall, sysctl, host service management).
- Credential/file scraping patterns targeting SSH keys, browser stores, password vaults, or shell history.
- Destructive filesystem operations outside approved workspace roots.

**Allow by default:**

- Read operations and non-destructive edits inside approved workspace roots.
- Project-local tooling needed for business workflows under approved directories.

### Filesystem Scope Baseline

- Each agent has a default writable workspace root.
- Additional writable roots require explicit per-deployment approval and must be documented in agent config.
- Paths outside approved roots are read-deny and write-deny by policy.
- Cross-business writes are denied unless a shared integration directory is explicitly approved.

### Generic Runtime Hardening Principles

Regardless of the specific runtime, apply these timeless controls:

- **Run the agent as a non-root user.** Never grant the runtime root privileges.
- **Limit network exposure.** Bind gateways to loopback or a private network; do not expose them publicly. Authenticate any remote access with a token sourced from a secret reference, never a literal.
- **Scope filesystem access.** Restrict the runtime to its workspace and config directories; lock down config-file permissions so only the owning user can read them.
- **Enforce strict channel policies in production.** Replace permissive test values (open DM policy, wildcard allowlists) with pairing/allowlist policies before going live.
- **Deny self-modification.** Prevent agents from editing their own runtime configuration.
- **Keep secrets out of the command line.** Use secret references (environment variables) and interactive prompts that do not echo.

---

_Expand with specific allow/deny lists as agents are created for each deployment._
