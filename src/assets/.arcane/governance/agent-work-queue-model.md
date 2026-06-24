---
title: Agent Work Queue Model
audience: both
last_updated: YYYY-MM-DD
status: draft
distributable: true
tags: [governance, queue, agents, work-management]
---

# Agent Work Queue Model

Defines a single markdown-first queue for assigning work across businesses, while keeping Azure DevOps at Story-level visibility per [[DECISIONS#ADR-015|ADR-015]].

## Executive Summary

- One queue controls cross-business assignment to avoid agent contention and hidden work.
- Markdown remains source of truth; Azure DevOps mirrors milestone status for humans.
- Queue rows include execution host and approval gate so autonomy stays explicit.
- {BUSINESS_NAME} starts first; same structure extends to AcmeStore and other businesses.

---

## Queue Principles

1. Single intake queue for all businesses
2. One active owner per queue item
3. Explicit agent, host, and power-level per item
4. Exit criteria required before status can move to Done

---

## Canonical Fields

| Field | Description |
|------|-------------|
| Queue ID | Unique work identifier |
| Business | `acme-store`, `example-app`, etc. |
| Repo | Target repo name |
| DevOps Item | Story/Task/Bug link or ID |
| Priority | Critical / High / Medium / Low |
| Assigned Agent | {AGENT_NAME}, Thor, Flash, Snape, etc. |
| Power Level | Sidekick/Hero/Champion/Legend/Titan |
| Execution Host | Atlas, Voyager, Nimbus |
| Approval Gate | Required reviewer and checkpoint |
| Exit Criteria | Objective definition of done |
| Status | Backlog / Ready / In Progress / Blocked / Done |

---

## Initial Rollout

1. Start with {BUSINESS_NAME} items only.
2. Populate 5–10 current backlog items from Azure DevOps.
3. Validate assignment cadence for one week.
4. Extend same queue format to AcmeStore.

---

## Next Action

Create the first queue instance document (dated journal or governance execution log) and seed it with open {BUSINESS_NAME} stories.
