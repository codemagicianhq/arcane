---
title: Naming Conventions
audience: both
last_updated: YYYY-MM-DD
status: active
distributable: true
tags: [naming, convention, machines, agents, identity]
---

# Naming Conventions

How machines, AI agents, and systems are named across your projects. This is a **template** — adapt the theme and fill in your own roster. Your filled-in instance lives in your ops repo, not here.

## Executive Summary

- Naming is split into three tiers: machines, AI agents, and systems/services.
- Machine names are iconic identities, agent names are persona-based, and service names are functional.
- Names must be unique, memorable, and consistent across projects to reduce operational ambiguity.
- This file is the reference for the patterns and rules; record your actual assigned names in your own ops repo.

---

## Naming Philosophy

Two rules govern every name in the system.

**The Naming Test:** if an established industry term exists for the thing, use the real term — a universe name has to be *earned* by the absence of one. Two dialects result: magic grammar for the personas and vocabulary, plain functional payloads for everything technical. Corollary: the more autonomous the tool, the more boring its name should be.

**The IP rule:** persona names must be **public domain or your own coinage**. No living people. No franchise-coined characters — a borrowed name is owned by whoever coined it, no matter how well it fits. Before any name ships, run the four checks: who coined it; does an estate still do business in it; do same-audience products already claim it (search live — don't trust memory); and what is its first association in each market you operate in, said aloud in every language your team speaks.

Names should be memorable, distinctive, and never repeated across categories.

The naming system has three tiers:

| Category               | What Gets Named                               | Naming Style                                                | Examples                   |
| ---------------------- | --------------------------------------------- | ----------------------------------------------------------- | -------------------------- |
| **Machines**           | Physical hardware (PCs, servers, laptops)     | Legendary / iconic figures — the "heavy hitters"            | Atlas, Goliath-class names |
| **AI Agents**          | Autonomous agents running operations          | Public-domain characters — smart, capable, distinct personality | Merlin, Athena, Prospero   |
| **Systems / Services** | Databases, APIs, internal tools               | Functional names — clear, descriptive                       | Inventory API, OrderQueue  |

---

## Machines

Machines get the most powerful, iconic names. These are the foundational hardware — they deserve heavyweight identifiers.

| Machine                       | Example Name | Why                                                              |
| ----------------------------- | ------------ | ---------------------------------------------------------------- |
| Primary workstation           | **Atlas**    | The one that carries the load — your most powerful build/dev box |
| Laptop                        | **Voyager**  | The mobile unit that travels with you                           |
| Secondary / home server       | **Nimbus**   | Always-on node bridging local and cloud environments            |

**Hostname convention:** use the same name everywhere, cased per platform — e.g., Windows hostname `ATLAS`, Linux hostname `atlas`, in documentation `Atlas` (TitleCase).

---

## AI Agents

Agents get persona names paired with a role. The persona name is the primary identifier — what you call it in conversation, logs, and dashboards. The role is metadata that describes what it does.

### Format

```
[Persona Name] — [Role Title] / [Responsibility Summary]
```

### Assignment Rules

- One persona name per agent, globally unique across all projects.
- An agent may serve multiple projects but keeps the same name and role everywhere.
- If an agent's role changes significantly, it gets a new name (don't reuse names for different roles).
- If you collaborate with other operators who run their own Arcane instances, reserve names across instances so they don't collide.

### Default Roster (Arcane personas)

Arcane ships with twelve default agent personas, organized by functional cluster. Use them as-is, rename them to your chosen universe, or define your own. The persona definitions live in `.github/agents/` (and `agents/*.yaml`); deployment state (which projects each serves, status, git identity) belongs in your ops repo.

| Persona       | Epithet              | Role                        | Cluster        |
| ------------- | -------------------- | --------------------------- | -------------- |
| **Kellar**    | the Maestro          | Product Operations Manager  | Foundation     |
| **Merlin**    | the Archmage         | CTO / Architecture Lead     | Guide          |
| **Alexander** | the Man Who Knows    | Research & Backlog Analyst  | Mind           |
| **Custodio**  | the Warden           | Security Operations         | Bridge         |
| **Lince**     | the Unmasker         | QA Lead                     | Guardian       |
| **Mercurio**  | the Swift            | Mobile Developer            | Build Team     |
| **Adelaide**  | the Illusionist      | Frontend Developer          | Build Team     |
| **Lafayette** | the Conjuror         | Full-Stack Developer        | Build Team     |
| **Circe**     | the Charmweaver      | Marketing Strategist        | Voice          |
| **Bess**      | the Herald           | Operations Communications   | Voice          |
| **Iris**      | the Emissary         | External Collaboration Lead | Bridge         |
| **Prospero**  | the Stormcaller      | DevOps / CI/CD Engineer     | Infrastructure |

Twelve legendary agents — the Arcanos. Every namesake is public domain: golden-age stage magicians (Kellar, Lafayette, Adelaide, Alexander, Bess), myth and classic literature (Merlin, Circe, Iris, Prospero, Mercurio), and coinages from living vocabulary (Lince — *ojo de lince*; Custodio — *ángel custodio*). Lince is never anglicized.

**Role consolidation (ADR-031):** Framework-specific dev roles (.NET, Blazor, React, Flutter, MAUI) are consolidated into generic roles (Full-Stack, Frontend, Mobile). The framework/stack is a prompt parameter, not an agent identity. This scales without needing a new agent for every technology.

**Naming policy:** All agent names should be positive characters — beings, not objects — with a clear thematic connection to their role.

**Canonical agent identity domain:** Use a single domain for all agent and tool Git identities — e.g., `merlin@{OPERATOR_DOMAIN}`. See [[DECISIONS#ADR-028|ADR-028]] for the full attribution model.

### Power Levels (ADR-032)

Agent autonomy is assigned per agent × per repo using gamified power levels. See [[DECISIONS#ADR-032|ADR-032]] for full rationale. This is the single canonical ladder — every other document mirrors it. The teachable gradient: **wizards study, sorcerers wield, magi command.**

| Level | Name           | Behavior                                                | Push Model                                  |
| ----- | -------------- | ------------------------------------------------------- | ------------------------------------------- |
| 0     | **Spectator**  | Locked — human only                                     | N/A                                         |
| 1     | **Apprentice** | Agent suggests; human executes                          | Human pushes all                            |
| 2     | **Wizard**     | Scoped autonomous edits in approved paths               | Agent pushes branch; PRs queued for review  |
| 3     | **Sorcerer**   | Autonomous topic-branch work                            | Agent pushes and creates PR; human approves |
| 4     | **Magus**      | Self-merge within approved scope — the "Magus+" gate    | Agent merges (fast-forward only)            |
| 5     | **Archmage**   | Broadest autonomous authority within an approved repo   | Agent drives; human approves policy changes |

A common starting policy: cap ops/docs repos at **Wizard**, allow app repos up to **Archmage**, and keep repo creation at **Spectator** (human only).

### Name Suggestions (Available Pool)

Every pool entry is public domain and pre-screened against the IP rule. Pick from these when assigning agents, or add your own — after running the four checks.

- **Golden-age magicians (all pre-1955, public domain):** Thurston, Devant, Maskelyne, Talma, Carter, Sherezada
- **Greek / Egyptian / Ancient Mythology:** Athena, Apollo, Hermes, Orpheus, Horus, Maat, Thoth, Enki, Imhotep

> **Note:** "Pre-screened" is not "cleared forever" — product namespaces shift constantly. Before a pooled name goes onto anything public-facing, re-run the four checks live: coiner, estate, same-audience products, first-association per market.

---

## Systems / Services

Internal tools, databases, APIs, and services use **functional names** — no persona names. These need to be immediately understood by anyone reading a log or config file.

**Format:** `[project-slug]-[function]` or just `[function]` if shared.

**Examples:**

- `acme-store-inventory-api`
- `widget-co-booking-db`
- `agent-runtime-monitor`
- `order-queue`

---

> **Keep your real roster in your ops repo.** This template intentionally omits a live machine inventory, per-agent deployment status, and the naming decisions log — those are operator-specific instance data. Record them alongside your other org docs, not in the distributed framework.
