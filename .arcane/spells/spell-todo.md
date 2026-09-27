---
name: Spell — Todo
description: Elaborate a raw idea into one or more well-scoped TODO items and place them in the right document(s). In a hub repo, optionally target a venture's own TODO book, or sweep every book's open-item counts.
claude_description: Use PROACTIVELY whenever a raw idea needs to become one or more well-scoped TODO items, even if the user just says 'add a todo'.
argument-hint: The raw idea to elaborate (e.g., "add spending limits doc", "automate ADR numbering", "build a dashboard for {AGENT_NAME}"), optionally "for <venture>" (hub only). `{AGENT_NAME}` resolves from `.arcane.json` / frontmatter; ask if unset. Use `--sweep` instead to report open-item counts across every book.
agent: agent
---

## Executive Summary

- This prompt turns a vague idea into a concrete, well-scoped TODO item placed in the correct file and section.
- It reads the current TODO landscape and repo structure to avoid duplicates and pick the right home.
- Use this any time you have an idea mid-session and don't want to lose it or park it in the wrong place.
- If the idea is ADR-worthy or journal-worthy, it flags that and routes accordingly.
- `--prune` removes checked items from a TODO book — report first, outcome recorded or migrated before anything is deleted, one fingerprinted batch approval, and unchecked items are never touched.
- **In a hub repo:** "add a todo for &lt;venture&gt;" targets that venture's own `TODO.md` book instead of the hub root. `--sweep` skips elaboration entirely and reports new/open counts across every book (hub root + every venture).

---

Resolve `{BUSINESS_ROOT}` from `.arcane.json`'s `business_root` field (default `ventures/` if unset) before either mode below.

## Sweep Mode (`--sweep`)

If the argument is (or starts with) `--sweep`, skip every other step in this spell entirely and run this instead:

- **In a hub repo:** report `status: new` counts and oldest-entry age for the hub root `TODO.md` plus every `{BUSINESS_ROOT}/<slug>/TODO.md` that exists. Group by book, point at `spell-manifest` for entries ready to promote. Report-only — no edits.
- **In a consumer repo:** report the same, for the repo-root `TODO.md` only (no venture books exist there).

Output format:

```
Todo sweep — N books, M open items

hub TODO.md               12 open, oldest 2026-07-14
ventures/ordovica/TODO.md  3 open, oldest 2026-08-10
```

## Prune Mode (`--prune`)

If the argument is (or starts with) `--prune`, skip every other step in this spell entirely and run this instead. It removes resolved items from a TODO book only after proving each one's outcome is recorded somewhere durable. (Not to be confused with `spell update --prune`, which removes orphaned managed files.)

**Target book:** this repo's root `TODO.md`. In a hub, `--prune --venture <slug>` targets that venture's own `TODO.md` instead, resolved through the registry's aliases exactly as Step 0 below does. One book per run.

1. **Collect checked items only.** A candidate is a checked item — `- [x]` or `- [X]` — together with its indented continuation lines. **An unchecked item (`- [ ]`) is never a candidate: it is never deleted, moved or edited by this mode.** A checked item with any unchecked sub-item is kept whole and reported as `has open sub-items — kept`.
2. **Check each outcome is recorded durably.** For each candidate, look for the record of what happened, in this order:
   - the item's own reference — a file link, a PR or issue link, an ADR id, a tracker-id suffix — followed and confirmed to exist and to describe the outcome;
   - otherwise, a search of `journal/`, `DECISIONS.md`, `CHANGELOG.md`, and the repo's audit log and playbooks where they exist, for the item's key terms.

   Classify each candidate as `recorded → <where>` (path, plus heading or line) or `unrecorded`. A merged PR or closed issue counts as durable only when the item links it; an unlinked guess ("probably PR #40") is `unrecorded`.
3. **Report first — no edits yet.** Print every candidate with its classification. For each `unrecorded` one, print the outcome migration you propose: a short outcome note (what was done, when, where it can be seen) appended to today's journal entry, `journal/YYYY-MM-DD-<topic-slug>.md`, under a `### Pruned TODO outcomes` heading. If you cannot tell what the outcome was, say so and leave that item out of the batch — never invent an outcome.

   ```
   Todo prune — TODO.md, 5 checked items

     1. [x] Add export button              recorded → CHANGELOG.md (1.4.0)
     2. [x] Decide on ADR numbering         recorded → DECISIONS.md (numbering entry)
     3. [x] Document the retrofit path      unrecorded → migrate to journal/2026-09-27-todo-prune.md
     4. [x] Wire the push hook              has open sub-items — kept
     5. [x] Try the new cache               outcome unknown — kept (tell me what happened, or leave it)

   Delete 3 items (1 after migration). Fingerprint: 3f9c1a…
   ```
4. **One batch approval, fingerprinted.** This is the same gate `spell-commit-work` step 8 uses for a commit. Compute an approval fingerprint from the exact deletion list (book path, line, full item text for every item to delete) plus the exact migration text. Present the list, the migration text and the fingerprint through a structured approval control, and wait for an authenticated operator response tied to that fingerprint. One approval covers the whole batch; there are no per-item prompts. A timeout, a cancellation, a host-generated fallback, a delegated response, or ordinary conversational assent is not approval: halt with nothing written. Recompute the fingerprint immediately before writing. If the book or the migration text changed, the approval is void; ask again. **Enforcement: structured spell gate (ARC-023) — nothing is written until the operator approves the fingerprinted batch; the fingerprint comparison is agent-administered, not tool-verified.**
5. **Migrate, then delete.** Write every migration first and confirm each one landed. Then delete exactly the approved lines, and nothing else. An item whose migration failed stays in the book. Update `last_updated` in the frontmatter of every touched file.
6. **Record the deletion; do not commit.** `governance/records-conventions.md` ("Retention and deletion") requires an approved deletion to be recorded. Propose a commit message whose body lists each deleted item and where its outcome is recorded, and hand off to `spell-commit-work`. No separate completed-items ledger is written: `records-conventions.md` defines no home for one, and the commit body plus the migrated journal notes are the record.

**Speed rule:** a book with no checked items reports `Nothing to prune — 0 checked items` and stops.

## Step 0 — Venture Targeting (Hub Only)

If the input names a venture ("add a todo for ordo", `--venture <slug>`), resolve it through `{BUSINESS_ROOT}/registry.json`'s aliases first (exact slug → alias → closest match offered — never guessed). Unknown slug:

```
No venture "<slug>" under {BUSINESS_ROOT}/ (closest: ordovica, tidewright).
1) use <closest>  2) add to hub root TODO.md  3) cancel (create the venture first: spell-summon-venture)
```

If `role` in `.arcane.json` is not `"hub"`, venture-targeting phrasing is refused:

> Venture targeting works only in the hub repo (`role: "hub"` in `.arcane.json`). This repo has no venture books.
> 1) add to this repo's TODO.md (venture reference removed)
> 2) skip — capture it in the hub: `spell-todo --venture <slug> "<idea>"`

If option 1 is chosen and the named venture is a *different* venture than this repo's own, strip that name from the item text before writing it — a sibling venture's name must never land in a consumer repo's `TODO.md`. If it's this repo's own venture, keep the text as given.

An idea that only *mentions* a venture, without targeting phrasing, is not redirected — proceed with the hub root as normal (speed rule: don't block on a maybe).

Elaborate the idea given by the user and add it to the right document(s) — the hub root `TODO.md` by default, or the resolved venture's own `TODO.md` when targeted.

The raw idea from the user is in the prompt argument. If no argument was provided, ask the user to describe the idea before proceeding.

Use these files first:

- [TODO.md](../../TODO.md) — section structure and existing items (avoid duplicates); or the targeted venture's own `TODO.md`
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
- `business` — a specific business under `{BUSINESS_ROOT}/` — name which one
- `product-ideas` — new product concepts or packaging ideas
- `legal` — LLC, ToS, contracts
- `playbooks` — runbooks, setup guides, automation scripts
- `prompts` — new or updated `.arcane/spells/` canonical spell files (the client shims are generated from them)

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

**Tracker-id suffix (`tracking_mode: external` only):** when `.arcane.json`'s tracking mode is `external` and an item corresponds to a work item that already exists (the operator gave its id, or the idea names it), end the item with that id's suffix in the provider's format — defined once in [governance/development-methodology.md](../../.arcane/governance/development-methodology.md) under "Tracker-ID Suffix on Captured Items" (e.g. `[#123]` GitHub, `[AB#123]` Azure DevOps, the issue key for Jira). Never guess an id or file a work item just to get one. In `tracking_mode: internal`, items are written without a suffix, exactly as before.

If the idea naturally decomposes into multiple sub-items (e.g., "build dashboard" → design, implement, deploy, document), list them individually — do not bundle vague compound items.

If the idea is an `adr-candidate`, also draft a one-sentence ADR title suggestion (e.g., `ADR-NNN: Use GitHub Actions for CI instead of Azure Pipelines`).

## Step 3 — Route to the Right Document

Determine the target file(s) for each item:

| Situation                                             | Target                                                                             |
| ----------------------------------------------------- | ---------------------------------------------------------------------------------- |
| Discrete action item with a domain section in TODO.md | `TODO.md` under the matching section                                               |
| New domain not yet in TODO.md                         | `TODO.md` — add a new section heading                                              |
| Speculative idea or future-facing concept             | `TODO.md` under `## Product Ideas` or the best matching section                    |
| ADR candidate                                         | `DECISIONS.md` — flag it as pending, do not write the full ADR yet                 |
| Journal-worthy context                                | `journal/` — propose a filename with today's date slug, do not create the file yet |
| Finding sourced from a research report                | `TODO.md` under the matching section — cross-reference the report path (e.g., `— see docs/research/<slug>.md`) |
| Business-specific execution item                      | Both `TODO.md` AND the relevant `{BUSINESS_ROOT}/<name>/overview.md` reference section  |

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
