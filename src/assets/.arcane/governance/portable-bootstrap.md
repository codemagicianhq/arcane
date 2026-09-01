---
title: Portable Bootstrap — Quick Context for Ad-Hoc AI Clients
audience: ai
status: active
tags: [ai-context, bootstrap, multi-client, portable]
---

# Portable Bootstrap

Paste this entire file into any AI client (Claude web, ChatGPT, etc.) to give it working context for this project. For full detail, read the linked files in the repo.

---

## Project

**Arcane** — Operational documentation for running AI-automated businesses under {LLC_NAME} (owner: {OPERATOR_NAME}). Uses an agent runtime to automate operations across one or more ventures.

**This is a documentation-only repository.** No build commands, test suites, or deployable code. **Do not add automation without being asked. Enforcement: explicitly advisory prose (ARC-023) — no check blocks adding scripts, build tooling, or automation to this repo; compliance depends on agent judgment.**

## Environment

- **Primary machine:** the host where the agent runtime executes.
- **Disk encryption:** full-disk encryption active on machines holding credentials or working copies.
- **Agent runtime:** one or more agents configured. Runtime gateway bound to loopback, token auth via SecretRef, exposed remotely only through an authenticated tunnel if needed.
- **User:** a dedicated non-root user.

## Non-Negotiable Rules

**Enforcement note (ARC-023):** these 9 rules are a condensed restatement of `.arcane/governance/universal-agent-rules.md` rules 1-6, 10, 11, and 15 — see that file for each rule's full text and its authoritative enforcement-mode classification; this summary does not duplicate those classifications here, to avoid a second, driftable copy of the same information.

1. **Never access an encrypted or cross-OS volume you are not authorized to touch.** This rule stands as defense-in-depth regardless of encryption status.
2. **No root commands** unless explicitly scoped and justified.
3. **No secrets on the command line.** Use env vars and `read -s`.
4. **Update `last_updated` frontmatter** when editing any document.
5. **Log significant decisions** in DECISIONS.md as ADRs.
6. **Production system** — no shortcuts, no "fix it later."
7. **Conventional Commits** format: `type(scope): description`.
8. **Never auto-commit** during interactive sessions — present for approval first.
9. **Recommendation guardrails:** Flag actionable recommendations. Verify information. Present free alternatives. Confirm >$50 items.

## Key Files

| Need               | File                                          |
| ------------------ | --------------------------------------------- |
| Full rules         | `.arcane/governance/universal-agent-rules.md` |
| Project overview   | `project.md`                                  |
| Decisions log      | `DECISIONS.md`                                |
| Agent policies     | `.arcane/governance/agent-policies.md`        |
| Git conventions    | `.arcane/governance/git-conventions.md`       |
| AI context summary | `ai-context/system-prompt-context.md`         |

## Where Documents Live

- **Framework-managed standards:** `.arcane/governance/`. Spells reference this single installed layer; **do not create a duplicate root `governance/` tree. Enforcement: explicitly advisory prose (ARC-023) — no check scans a repo for a duplicate root-level `governance/` directory.**
- **Project-owned orientation and continuity:** `README.md`, `project.md`, `TODO.md`, `DECISIONS.md`, `ai-context/`, and `journal/`. Arcane creates missing files once and preserves existing content.
- **Project/domain documents:** use explicit descriptive paths such as `docs/`, `security/`, `infrastructure/`, or a configured business root. These add project context alongside framework standards.
- **Overrides are not yet supported:** editing a managed `.arcane/governance/` standard can be replaced by `arcane update`. Additive project documents are safe; **overriding a shipped standard requires the open customization/override model. Enforcement: explicitly advisory prose (ARC-023) — that model is still an open backlog item (not yet built), so nothing currently blocks a direct edit; `arcane update` will just overwrite it silently on the next run.**

## Research Reports

Research findings (competitive analysis, technical spikes, feasibility studies — the output of the Research & Backlog Analyst role) live at `docs/research/<topic-slug>.md`, one file per report. No dedicated spell produces these: `spell-document` already proposes a target path from project structure and matches its destination directory's existing conventions — point it at `docs/research/` for investigative content, the same way it already proposes `docs/` or `.arcane/governance/` for other document types. The directory is created on first real report, not pre-seeded on `spell init`.

Use this repo's standard frontmatter (below) plus one addition: `sources` — a list of what was consulted. **Every claim in the body traces back to one of these or is explicitly marked speculative. Enforcement: explicitly advisory prose (ARC-023) — no mechanism reads research-report prose to verify citation coverage or speculation marking.** Structure the body summary-first: a short **Summary** with the key findings, then **Findings** with full detail and inline citations, then an optional **Follow-ups** for anything that should become a TODO item — route those via `spell-todo`, which cross-references the report path. Throughout, distinguish **verified facts**, **reasonable inferences**, and **speculation** explicitly; don't let an inference read as a checked fact.

## Documentation Format

**Every doc uses YAML frontmatter: `title`, `audience` (human/ai/both), `last_updated`, `status` (draft/active/deprecated), `tags`. Enforcement: explicitly advisory prose (ARC-023) — no schema validates these frontmatter fields on arbitrary docs; `.arcane.json` manifest validation (`src/modules/manifest.ts`) covers only installation-config fields, not document frontmatter.** Use wiki-links (`[[filename]]`) for cross-references.

## Naming Tiers

| Tier      | Style           | Examples                                 |
| --------- | --------------- | ---------------------------------------- |
| Machines  | Iconic names    | Atlas, Voyager                           |
| AI Agents | Persona + role  | Merlin — CTO, {AGENT_NAME} — Product Ops |
| Systems   | Functional slug | `inventory-api`, `orders-worker`         |

## Version Control Host

Use your chosen host's project organization ({ADO_ORG}). Apply a consistent project/repo naming convention. One project per business + one shared docs/ops project.

## Spell Commands (Development Methodology)

Development follows the **Spell Loop** — structured planning phases feeding an autonomous implementation loop, delivered through the spell system. All workflows go through this flow.

**Available spells** (invoke by typing the command name in your message):

### Core Loop: Plan → Architect → Implement → Test → Review → Ship

- `spell-plan` — Plan a feature (output: PRD.md)
- `spell-architect` — Design the solution (output: architecture.md + stories.json)
- `spell-implement` — Write code per story
- `spell-test` — Run QA and verify
- `spell-review` — Adversarial code review
- `spell-ship` — Merge and deploy

### Session Management

- `spell-open-session` — Rebuild context after reset; read core docs, identify unfinished work, prioritize
- `spell-close-session` — End-of-session cleanup: stage changes, curate screenshots, propose commits, journal

### Operational

- `spell-commit-work` — Standard Git workflow: stage → message → approve → execute
- `spell-todo` — Review TODO.md, prioritize, move resolved items to canonical docs
- `spell-check-drift` — Find stale assumptions in docs vs. reality
- `spell-summon-venture` — Create a new venture (hub-gated): folder, template docs, idea/todo books, registry entry

### Specialized

- `spell-security-review` — Audit for security gaps, credential exposure, threat coverage
- `spell-product-review` — Evaluate business readiness: market fit, automation scope, blockers
- `spell-dotnet-expert` — .NET/Blazor deep-dive
- `spell-explain-concept` — Break down complex architecture concepts
- `spell-generate-bot-icons` — Create agent personas and icons

Full reference: See `.arcane/governance/development-methodology.md` in the repo.
