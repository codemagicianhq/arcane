---
name: Spell — Todo
description: Elaborate a raw idea into one or more well-scoped TODO items and place them in the right document(s).
argument-hint: The raw idea to elaborate (e.g., "add spending limits doc", "automate ADR numbering", "build a dashboard for {AGENT_NAME}"). `{AGENT_NAME}` resolves from `.arcane.json` / frontmatter; ask if unset.
agent: agent
---

## Executive Summary

- This prompt turns a vague idea into a concrete, well-scoped TODO item placed in the correct file and section.
- It reads the current TODO landscape and repo structure to avoid duplicates and pick the right home.
- Use this any time you have an idea mid-session and don't want to lose it or park it in the wrong place.
- If the idea is ADR-worthy or journal-worthy, it flags that and routes accordingly.

---

Elaborate the idea given by the user and add it to the right document(s).

The raw idea from the user is in the prompt argument. If no argument was provided, ask the user to describe the idea before proceeding.

Use these files first:

- [TODO.md](../../TODO.md) — section structure and existing items (avoid duplicates)
- [DECISIONS.md](../../DECISIONS.md) — ADR registry (check if the idea is decision-worthy)
- [README.md](../../README.md) — repo structure (find the right canonical doc to reference)
- [project.md](../../project.md) — active priorities (calibrate urgency)

## Step 1 — Understand the Idea

Read the raw input. Ask one clarifying question only if the idea is fundamentally ambiguous (e.g., "which business?"). Do not ask for information you can infer.

Classify the idea along two axes:

**Type:**
- `todo` — a discrete action item with a clear done state
- `bug` — a defect to fix
- `tech-debt` — deferred cleanup/refactor cost to track
- `adr-candidate` — a significant architectural or policy decision that needs a formal ADR
- `journal-seed` — context-heavy exploration that belongs in a journal entry, not a task list
- `idea-capture` — a speculative or long-horizon idea with no immediate action (goes in TODO under the relevant section with a `[ ]`)

**Domain** (pick primary):
- `security` — threat model, hardening, access control
- `agents` — agent config, channels, policies, installation
- `infrastructure` — hardware, OS, cloud, networking, provisioning
- `governance` — git conventions, agent autonomy, spending controls, work management
- `ci-cd` — repos, pipelines, build/release automation
- `business` — a specific business under `ventures/` — name which one
- `product-ideas` — new product concepts or packaging ideas
- `legal` — LLC, ToS, contracts
- `playbooks` — runbooks, setup guides, automation scripts
- `prompts` — new or updated `.github/prompts/` files

**Scope** (optional, additive — does not replace Domain):
- `repo` — repo-wide change touching the project broadly
- `feature` — scoped to a specific feature or slug
- `file` — scoped to a specific file or area

## Step 2 — Elaborate

Expand the idea into one or more concrete TODO items. Each item must:

- Be phrased as an imperative action (e.g., "Define...", "Create...", "Implement...", "Document...")
- Have a clear done state (reviewable by a human in 10 seconds)
- Include a file reference if a canonical home doc already exists (e.g., `— see [[DECISIONS]]`)
- Be specific enough to act on without further clarification

If the idea naturally decomposes into multiple sub-items (e.g., "build dashboard" → design, implement, deploy, document), list them individually — do not bundle vague compound items.

If the idea is an `adr-candidate`, also draft a one-sentence ADR title suggestion (e.g., `ADR-027: Use GitHub Actions for CI instead of Azure Pipelines`).

## Step 3 — Route to the Right Document

Determine the target file(s) for each item:

| Situation                                             | Target                                                                             |
| ----------------------------------------------------- | ---------------------------------------------------------------------------------- |
| Discrete action item with a domain section in TODO.md | `TODO.md` under the matching section                                               |
| New domain not yet in TODO.md                         | `TODO.md` — add a new section heading                                              |
| Speculative idea or future-facing concept             | `TODO.md` under `## Product Ideas` or the best matching section                    |
| ADR candidate                                         | `DECISIONS.md` — flag it as pending, do not write the full ADR yet                 |
| Journal-worthy context                                | `journal/` — propose a filename with today's date slug, do not create the file yet |
| Business-specific execution item                      | Both `TODO.md` AND the relevant `ventures/<name>/overview.md` reference section  |

## Step 4 — Show Proposal

Output the elaborated items in this format before making any edits:

## Proposed TODO Addition

**Idea understood as:** [one-sentence restatement]
**Type:** [type from Step 1]
**Domain:** [domain from Step 1]
**Scope:** [scope from Step 1, if applicable — repo / feature / file]

**Elaborated items:**

- [ ] [First item — phrased as imperative, with file ref if applicable]
- [ ] [Second item if applicable]
- ...

**Target document(s):**
- `[file path]` → section `## [Section Name]`

**If ADR-candidate:** Suggested ADR title: `ADR-NNN: [title]`

**Placement note (if any):** [e.g., "No matching section exists — will add ## [New Section]"]

**Approve?** (yes / edit / skip)

## Step 5 — Apply (After Approval)

When the user approves:

1. Insert the item(s) at the bottom of the correct section in the target file(s).
2. Update the `last_updated` frontmatter on every file touched (date: today as YYYY-MM-DD).
3. Do NOT commit — leave that to `spell-commit-work`.
4. Confirm what was added and where.

Output after applying:

## Added

- `[file]` → `## [Section]`: [item text]

**Next:** Run `spell-commit-work` to checkpoint, or continue the session.
