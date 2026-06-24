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

**This is a documentation-only repository.** No build commands, test suites, or deployable code. Do not add automation without being asked.

## Environment

- **Primary machine:** the host where the agent runtime executes.
- **Disk encryption:** full-disk encryption active on machines holding credentials or working copies.
- **Agent runtime:** one or more agents configured. Runtime gateway bound to loopback, token auth via SecretRef, exposed remotely only through an authenticated tunnel if needed.
- **User:** a dedicated non-root user.

## Non-Negotiable Rules

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

| Need               | File                                  |
| ------------------ | ------------------------------------- |
| Full rules         | `governance/universal-agent-rules.md` |
| Project overview   | `project.md`                          |
| Decisions log      | `DECISIONS.md`                        |
| Agent policies     | `agents/agent-policies.md`            |
| Git conventions    | `governance/git-conventions.md`       |
| AI context summary | `ai-context/system-prompt-context.md` |

## Documentation Format

Every doc uses YAML frontmatter: `title`, `audience` (human/ai/both), `last_updated`, `status` (draft/active/deprecated), `tags`. Use wiki-links (`[[filename]]`) for cross-references.

## Naming Tiers

| Tier      | Style           | Examples                                  |
| --------- | --------------- | ----------------------------------------- |
| Machines  | Iconic names    | Atlas, Voyager                       |
| AI Agents | Persona + role  | Gandalf — CTO, {AGENT_NAME} — Product Ops |
| Systems   | Functional slug | `inventory-api`, `orders-worker`          |

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
- `spell-bootstrap-business` — Initialize a new business: folder, template docs, project setup

### Specialized

- `spell-security-review` — Audit for security gaps, credential exposure, threat coverage
- `spell-product-review` — Evaluate business readiness: market fit, automation scope, blockers
- `spell-dotnet-expert` — .NET/Blazor deep-dive
- `spell-explain-concept` — Break down complex architecture concepts
- `spell-generate-bot-icons` — Create agent personas and icons

Full reference: See `governance/development-methodology.md` in the repo.
