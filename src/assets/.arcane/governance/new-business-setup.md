---
title: New Business Setup Guide
audience: both
status: draft
distributable: true
tags: [playbook, setup, onboarding, replicability, attribution]
---

# New Business Setup Guide

The master guide for spinning up a new business ({venture}) under {LLC_NAME} using agent automation.

## Executive Summary

- This playbook is the replication path from idea to operational business environment.
- It sequences project creation, infrastructure alignment, security prerequisites, and agent readiness.
- Follow this guide to reduce setup variance and avoid re-solving known operational decisions.
- Use this as the default onboarding runbook for every new business launch.

**Goal:** Follow this guide once and a new business is fully operational — project, repos, the agent runtime configured, infrastructure documented, legal basics covered.

> **How this guide was built:** Every step here is meant to be done manually at least once for a new {venture}. As steps are validated, they get automated. Check the `scripts/` folder — if a script exists for a step, run the script instead of doing it by hand.

---

## Before You Start

Have the following ready:

- [ ] Business name decided (both brand name and slug, e.g. `{venture}`)
- [ ] Business type clear (e-commerce, app, protocol, service)
- [ ] Access to your version-control host / project organization
- [ ] The agent runtime installed and operational
- [ ] Full-disk encryption confirmed active on any machine that holds credentials or working copies
- [ ] System clock correct and time sync enabled. **Critical:** an incorrect system clock breaks all SSL/HTTPS connections silently.

---

## Phase 1 — Project & Repo Setup

### Step 1.1 — Create the Project

1. Open your version-control host's project organization
2. Create a **New Project**
3. Name: the business slug (use your org's naming convention)
4. Description: brief one-liner describing the business
5. Visibility: **Private**
6. Version control: **Git**
7. Work item process: pick your tracker's default (Agile/Scrum/Kanban)

> **Script:** `scripts/create-project.ps1` — automate once the manual steps are validated.

### Step 1.2 — Create Repos

Inside the new project, create repos based on business type:

**E-commerce business:**
- `storefront` — platform config, theme, automation scripts
- `inventory` — SKU tracking, reorder logic
- `marketing` — social content, SEO, copy templates

**App business:**
- `app` — application code
- `api` — backend/API
- `requirements` — specs, wireframes, design docs

**Protocol / whitepaper:**
- `whitepaper` — the spec document

To create a repo: Project → **Repos** → **New repository** → name → **Create**.

### Step 1.3 — Copy Business Template into Docs Repo

In your docs/ops repo, copy `ventures/_template/` to `ventures/{venture}/` as a **reference hub** and fill in:

- `overview.md` — what the business is, current status, automation scope, blockers
- links/pointers to the business's dedicated project repos for runtime artifacts

> **Boundary rule:** the ops/docs repo stores shared framework + references. Business runtime artifacts live in business-specific project repos.

---

## Phase 2 — Infrastructure & Security

### Step 2.1 — Confirm Security Baseline

Before running the agent runtime for any new business, verify:

- [ ] Full-disk encryption active on machines holding credentials or working copies
- [ ] Host hardening checklist complete ([[security/hardening-checklist|Hardening Checklist]])
- [ ] Agent policies reviewed for this business ([[agents/agent-policies|Agent Policies]])
- [ ] Runtime hardening enforcement checklist executed

### Step 2.2 — Clone the Docs Repo

```bash
git clone <docs-repo-url> ~/code/{repo}
```

---

## Phase 3 — Agent Runtime Configuration

### Step 3.1 — Install the Agent Runtime (if not already installed)

See [[agents/installation|Runtime Installation]].

### Step 3.2 — Configure the Runtime for This Business

- Use the reference template in [[ventures/_template/overview|Business Template]] to capture scope and links
- Apply business-specific runtime configuration in that business's own project repos and environment
- Review [[agents/agent-policies|Agent Policies]] — adjust permitted actions if needed for this business type

### Step 3.3 — Agent Git Identity Setup

Every agent that will produce commits for this business must have a registered Git identity **before making its first commit**. See [[governance/git-conventions#agent-attribution-model|Git Conventions — Agent Attribution]].

For each agent assigned to this business:

1. **Confirm persona name** is registered in [[naming-conventions|Naming Conventions]] agent roster.
2. **Confirm Git identity** exists in the registered identities table in [[governance/git-conventions#agent-email-convention|Git Conventions]].
3. **Add agent to `.mailmap`** in every repo the agent will commit to:
   ```
   {AGENT_NAME} <{AGENT_EMAIL}>
   ```
4. **Verify** you can commit with the agent's author:
   ```bash
   git commit --allow-empty --author="{AGENT_NAME} <{AGENT_EMAIL}>" \
     --trailer="Agent=kellar" --trailer="Model=test" --trailer="Provider=test" \
     -m "test: verify agent git identity for {AGENT_NAME}"
   git log -1  # confirm author shows {AGENT_NAME}
   git reset HEAD~1  # clean up test commit
   ```

### Step 3.4 — Test Run

Run the agent runtime in dry-run / observation mode first. Do not let it execute live actions until you've reviewed its behavior.

---

## Phase 4 — Legal Baseline

### Step 4.1 — Business Entity

- Confirm operations run under {LLC_NAME}
- If this business has meaningfully different liability exposure (e.g. physical goods vs. software), consult an attorney

### Step 4.2 — Sales Tax (Physical Goods Only)

- Register for sales tax in your home jurisdiction if not already done
- Identify nexus states based on where you'll sell
- Configure tax collection on the platform (Shopify, Etsy, etc.)

### Step 4.3 — Platform Terms of Service

- Review the selling platform's ToS for AI-generated listings/content
- Review your agent runtime's ToS for commercial use

---

## Phase 5 — First Launch Checklist

- [ ] At least 10 product listings live (or equivalent for non-e-commerce)
- [ ] Order/fulfillment workflow tested end-to-end
- [ ] The agent runtime running and monitored (see `agents/monitoring.md`)
- [ ] Legal baseline complete
- [ ] `ventures/{venture}/overview.md` status updated to reflect live status
- [ ] Journal entry written in `journal/YYYY-MM-DD-topic-slug.md` documenting launch

---

## What to Automate Next

As you complete this guide manually for each business, flag steps that are repetitive and mechanical. Those become scripts. Priority candidates:

- Project + repo creation (`scripts/create-project.ps1`)
- Runtime config generation from a template (`scripts/configure-runtime.sh`)
- Repo initialization with standard folder structure

---

*Fill in this guide as you go. Every blank or TBD here is something you'll encounter during your first {venture} setup — document it then, not in advance.*
