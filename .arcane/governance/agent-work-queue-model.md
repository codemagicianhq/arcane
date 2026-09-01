---
title: Agent Work Queue Model
audience: both
last_updated: YYYY-MM-DD
status: draft
distributable: true
tags: [governance, queue, agents, work-management]
---

# Agent Work Queue Model

Defines a single markdown-first queue for assigning work across businesses, while keeping Azure DevOps at Story-level visibility for human milestone tracking.

## Executive Summary

- One queue controls cross-business assignment to avoid agent contention and hidden work.
- Markdown remains source of truth; Azure DevOps mirrors milestone status for humans.
- Queue rows include execution host and approval gate so autonomy stays explicit.
- {BUSINESS_NAME} starts first; same structure extends to AcmeStore and other businesses.

**This document specifies a queue design that has not been implemented anywhere in this codebase — no queue instance exists yet, and this document's own frontmatter is still `status: draft` (see the `## Next Action` section below). Enforcement: explicitly advisory prose (ARC-023) — every principle, field, and rollout step that follows is advisory guidance only, since no code, spell, or platform check exists yet to enforce any of it.**

---

## Queue Principles

1. Single intake queue for all businesses
2. One active owner per queue item
3. Explicit agent, host, and power-level per item
4. Exit criteria required before status can move to Done

---

## Canonical Fields

| Field          | Description                                    |
| -------------- | ---------------------------------------------- |
| Queue ID       | Unique work identifier                         |
| Business       | `acme-store`, `example-app`, etc.              |
| Repo           | Target repo name                               |
| DevOps Item    | Story/Task/Bug link or ID                      |
| Priority       | Critical / High / Medium / Low                 |
| Assigned Agent | {AGENT_NAME}, Lafayette, Mercurio, Lince, etc. |
| Power Level    | Apprentice/Wizard/Sorcerer/Magus/Archmage      |
| Execution Host | Atlas, Voyager, Nimbus                         |
| Approval Gate  | Required reviewer and checkpoint               |
| Exit Criteria  | Objective definition of done                   |
| Status         | Backlog / Ready / In Progress / Blocked / Done |

---

## Initial Rollout

1. Start with {BUSINESS_NAME} items only.
2. Populate 5–10 current backlog items from Azure DevOps.
3. Validate assignment cadence for one week.
4. Extend same queue format to AcmeStore.

---

## Next Action

Create the first queue instance document (dated journal or governance execution log) and seed it with open {BUSINESS_NAME} stories.
