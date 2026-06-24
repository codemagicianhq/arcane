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

Pick a shared "universe" your team resonates with (magician, sci-fi, superhero, fantasy, mythology — whatever fits your brand) and draw all names from it. Names should be memorable, distinctive, and never repeated across categories.

The naming system has three tiers:

| Category               | What Gets Named                               | Naming Style                                                | Examples                   |
| ---------------------- | --------------------------------------------- | ----------------------------------------------------------- | -------------------------- |
| **Machines**           | Physical hardware (PCs, servers, laptops)     | Legendary / iconic characters — the "heavy hitters"         | Atlas, Titan-class names   |
| **AI Agents**          | Autonomous agents running operations          | Fictional characters — smart, capable, distinct personality | Gandalf, Morpheus, Phoenix |
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

| Persona      | Role                        | Cluster        |
| ------------ | --------------------------- | -------------- |
| **Primus**   | Product Operations Manager  | Foundation     |
| **Gandalf**  | CTO / Architecture Lead     | Guide          |
| **Vision**   | Research & Backlog Analyst  | Mind           |
| **Heimdall** | Bridge Guardian / Gatekeeper| Bridge         |
| **Snape**    | QA Lead                     | Guardian       |
| **Flash**    | Mobile Developer            | Build Team     |
| **Wasp**     | Frontend Developer          | Build Team     |
| **Thor**     | Full-Stack Developer        | Build Team     |
| **Wanda**    | Marketing Strategist        | Voice          |
| **Trinity**  | Operations Communications   | Voice          |
| **Gideon**   | Project Collaboration Agent | Bridge         |
| **Scotty**   | DevOps / CI/CD Engineer     | Infrastructure |

**Role consolidation (ADR-031):** Framework-specific dev roles (.NET, Blazor, React, Flutter, MAUI) are consolidated into generic roles (Full-Stack, Frontend, Mobile). The framework/stack is a prompt parameter, not an agent identity. This scales without needing a new agent for every technology.

**Naming policy:** All agent names should be positive/heroic characters with a clear thematic connection to their role.

**Canonical agent identity domain:** Use a single domain for all agent and tool Git identities — e.g., `gandalf@{OPERATOR_DOMAIN}`. See [[DECISIONS#ADR-028|ADR-028]] for the full attribution model.

### Power Levels (ADR-032)

Agent autonomy is assigned per agent × per repo using gamified power levels. See [[DECISIONS#ADR-032|ADR-032]] for full rationale.

| Level | Name         | Behavior                                  | Push Model                                  |
| ----- | ------------ | ----------------------------------------- | ------------------------------------------- |
| 0     | **Civilian** | Locked — human only                       | N/A                                         |
| 1     | **Sidekick** | Agent suggests; human executes            | Human pushes all                            |
| 2     | **Hero**     | Agent acts with human approval            | Human reviews and pushes                    |
| 3     | **Champion** | Agent acts independently; notifies after  | Agent pushes branch; human merges PR        |
| 4     | **Legend**   | Agent operates silently within boundaries | Agent pushes and creates PR; human approves |
| 5     | **Titan**    | Full autonomy — branch, push, PR, iterate | Agent drives; human approves merge          |

A common starting policy: cap ops/docs repos at **Hero**, allow app repos up to **Titan**, and keep repo creation at **Civilian** (human only).

### Name Suggestions (Available Pool)

Organized by source — pick from these when assigning agents, or add your own.

- **Magician / Magic:** Dynamo, Penn, Blaine, Siegfried, Houdini
- **Lord of the Rings / Fantasy:** Aragorn, Elrond, Galadriel, Saruman
- **Marvel:** Jarvis, Friday, Stark, Widow, Shuri, Strange
- **DC:** Oracle, Alfred, Cyborg, Zatanna, Constantine, Batman
- **Sci-Fi / Matrix:** Morpheus, Neo, Niobe, Tank
- **Harry Potter:** Dumbledore, McGonagall, Dobby, Lupin, Hermione, Sirius
- **Greek / Egyptian / Ancient Mythology:** Athena, Apollo, Hermes, Orpheus, Horus, Maat, Thoth, Enki, Imhotep
- **General Sci-Fi:** HAL, Cortana, Samantha, Ava, Sonny
- **Star Trek:** Spock, Uhura, Bones, Sulu, Chekov, Data, Worf, LaForge, Picard, Riker, Seven, B'Elanna, Janeway

> **Note:** Some of these names are used by real products (Cortana, Jarvis, Friday). Using them internally is fine since these are private agent identifiers. If an agent ever becomes public-facing, verify there's no trademark conflict.

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
