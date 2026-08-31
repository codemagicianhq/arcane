---
title: Universal Agent Rules — Single Source of Truth
audience: ai
status: active
tags: [rules, governance, ai-agents, multi-client]
---

# Universal Agent Rules

These rules apply to **every AI agent and tool** working in this repository, regardless of client (GitHub Copilot, Claude Code, Codex, your agent runtime, or any future tool). This file is the canonical source; client-specific instruction files reference this document and add client-specific behavior on top.

See also: [[README]], [[DECISIONS]], [[governance/git-conventions|Git Conventions]], [[agents/agent-policies|Agent Policies]].

---

## Non-Negotiable Safety Rules

1. **Never access an encrypted or cross-OS volume you are not authorized to touch.** Do not suggest, execute, or recommend any action that would mount, read, or probe a drive outside the agent's authorized environment. This rule stands as defense-in-depth regardless of encryption status.

2. **No root commands without justification.** Do not generate or suggest commands that run as root unless explicitly scoped and justified. The agent runtime should run as a dedicated non-root user by design. See [[security/hardening-checklist|Hardening Checklist]].

3. **No secrets on the command line.** Never pass API keys, tokens, or secrets on the command line, in chat, or in config files. Use SecretRef (env vars) and `read -s` for interactive input.

4. **This is a production system.** No "fix it later" shortcuts. No experimental changes without rollback plans.

---

## Documentation Rules

5. **Update `last_updated` frontmatter** whenever you edit a document. Every document must have YAML frontmatter with `audience`, `status`, `last_updated`, and `tags`.

6. **Log significant decisions in [[DECISIONS]].** Use the next sequential ADR number. Format: Date, Status, Context, Decision, Reasoning, Rejected alternatives.

7. **Use wiki-links for cross-references** (e.g., `[[DECISIONS#ADR-NNN|Short Title]]`, `[[journal/YYYY-MM-DD-topic-slug|Session Label]]`). This enables knowledge graph visualization.

8. **Use Mermaid for diagrams** (` ```mermaid ` blocks) for all flow charts, architecture diagrams, and sequence diagrams. Directory trees stay as plain code blocks. Spell output describing state the spell already computed — not authored, freehand explanatory content — additionally follows the **generated state diagrams** convention ([ARC-036](https://github.com/codemagicianhq/arcane/blob/main/DECISIONS.md#arc-036--generated-state-diagrams-deterministic-mermaid-for-computed-spell-state)): a deterministic, data-derived Mermaid diagram built only from values already in scope, never modeled or invented. Skip it for one-line outputs, speed-rule spells, or any state with only a single reading — the diagram exists to make relationships between multiple already-computed values legible, not to decorate simple output.

9. **Journal files use date-prefix naming:** `journal/YYYY-MM-DD-topic-slug.md` for chronological sorting.

---

## Git Rules

10. **Never auto-commit during interactive sessions.** Stage changes and present the proposed commit message for human approval before executing `git commit`. This applies to Copilot, Claude Code, Codex, and any other interactive AI tool. The human decides when to commit. Exception: autonomous agents at Magus+ power level may self-commit within approved scope.

11. **Use Conventional Commits format** for all commit messages: `type(scope): description`. See [[governance/git-conventions|Git Conventions]] for types, scopes, and examples.

12. **Agent attribution trailers** are required on agent-authored commits (`Agent`, `Model`, `Provider`). See [[governance/git-conventions#agent-attribution-model|Attribution Model]].

13. **For runtime config changes** (anything touching the agent runtime's config files or service restarts): do NOT commit supporting docs until the user has confirmed the change is working. Stage and present — but wait for explicit approval after testing.

14. **Never commit directly to main.** All work — human or agent — happens on topic branches. Humans use `type/short-description`; agents use `{agent-slug}/type/short-description`. Main receives changes only through PR completion, not local direct merges. See [[governance/git-conventions#branch-discipline|Branch Discipline]].

---

## Spell Lifecycle

22. **Lifecycle operations run through their spell when one is installed.** Committing, opening a PR, opening or closing a session, reviewing code, and shipping each have a dedicated spell (`spell-commit-work`, `spell-create-pull-request`, `spell-open-session`/`spell-close-session`, `spell-review`, `spell-ship`). When the installed component set includes the matching spell, invoke it for that operation rather than improvising the workflow from general knowledge — even when the user does not name the spell explicitly. The intent→spell routing table injected into each client's L1 instruction file (`CLAUDE.md`, `.github/copilot-instructions.md`, `AGENTS.md`) is normative for this mapping, not illustrative.

---

## Recommendation Guardrails (ADR-034)

15. **Flag actionable recommendations.** Any recommendation that could lead to a purchase, subscription, account creation, or irreversible action must: (a) be flagged explicitly, (b) use verified current information — never assume or fabricate, (c) present free/no-cost alternatives when they exist, (d) state confidence level if based on general knowledge. For >$50 or contracts, require explicit confirmation. See [[agents/agent-policies#actionable-recommendation-policy-adr-034|Full Policy]].

---

## Screenshot Curation

15. **Curate screenshots — not every screenshot needs saving.** Use these heuristics:
    - **Save** when it shows a completed setup, config state, UI result, or evidence of a problem/fix.
    - **Save** when the user explicitly says "save this" or "add this to docs."
    - **Save key decision points and final states** in multi-step flows; skip intermediate steps.
    - **Don't save** external reference material, transient troubleshooting, or items marked "just for reference."
    - **When ambiguous, save it** — easier to delete than to re-paste.
    - Saved screenshots go to `assets/screenshots/YYYY-MM-DD/` with descriptive lowercase-with-dashes filenames.
    - Never save screenshots containing secrets, API keys, tokens, or PII.

---

## Sensitive Repositories

21. **Reference, don't transcribe, when the repository is marked sensitive.** If
    `.arcane.json` has `content_sensitivity: "sensitive"`, the repository's own
    documents are the sensitive material — not just credentials inside them. In
    that mode:
    - **Cite paths, never contents.** Write "see `records/2024/lease.md`", not a
      quotation, summary-with-details, or paraphrase of what it says. This
      applies to journal entries, decision records, commit messages, PR
      descriptions, and TODO items alike — every one of those is a durable,
      often-published artifact that outlives the session.
    - **Retain no screenshots of repository contents.** Read them, act on them,
      then do not save them. The screenshot-curation heuristics above are
      superseded here: "when ambiguous, save it" inverts to "when ambiguous,
      don't."
    - **A sanitized summary is still permitted where it carries no recoverable
      detail** — "three lease agreements, one expiring this quarter" is fine;
      naming the parties, addresses, sums, or dates is not.
    - This is a governance default, not an access control. It constrains what
      agents *write down*; it does not restrict what they may read, and it is
      not a substitute for repository permissions or the push-safety controls in
      `git-conventions.md`.
    - Absent or `"standard"` means normal behaviour — this rule adds nothing.

---

## Naming Conventions

16. **Three naming tiers — never mix them:**

| Tier | What | Style | Examples |
|------|------|-------|---------|
| Machines | Physical hardware | Iconic character names | Atlas, Voyager |
| AI Agents | Autonomous agents | Persona name + role title | Merlin — CTO, Kellar — Product Ops |
| Systems/Services | DBs, APIs, tools | Functional `[slug]-[function]` | `inventory-api`, `orders-worker` |

17. **Projects and repos follow a consistent naming convention.** Pick one (TitleCase or kebab-case) and apply it uniformly across your org.

---

## Operational Rules

18. **TODO.md is a scratchpad.** Resolved items move to the relevant doc, then get deleted from TODO.md.

19. **After any onboarding or config wizard**, re-validate authentication and network-exposure settings — wizards can silently downgrade security settings.

20. **For repo path requests**, perform read-only discovery before claiming "no access." Use [[agents/agent-approved-paths|Agent Approved Paths Registry]].

23. **Diff before deleting a "duplicate."** When housekeeping surfaces two blocks of content that look
    like duplicates — in a document, a config, a data file — compare them in full before removing
    either. A near-identical pair is usually a **drifted copy carrying unique content in one and not the
    other**, not byte-identical redundancy; deleting on sight can destroy the unique content silently.
    Merge anything unique to either copy into the one that survives, and only delete a copy confirmed
    byte-identical to (or a confirmed strict subset of) the one kept. This generalizes the same
    content-verification discipline
    [[governance/git-conventions#content-verified-branch-deletion-todomd-merged-branch-cleanup-finding|Content-Verified
    Branch Deletion]] already applies to branches specifically.

---

## Client-Specific Instruction Locations

| Client | Instruction File | Notes |
|--------|-----------------|-------|
| GitHub Copilot | `.github/copilot-instructions.md` | Auto-loaded by Copilot in workspace |
| Claude Code (CLI) | `CLAUDE.md` | Auto-loaded by Claude Code in repo root |
| Codex | `AGENTS.md` | Auto-loaded by Codex in repo root |
| Your agent runtime | [[agents/agent-policies]] | Loaded via agent config |
| Ad-hoc chat clients | [[ai-context/portable-bootstrap]] | Copy-paste into conversation |
| Any new tool | This file | Read this, then follow links above |
