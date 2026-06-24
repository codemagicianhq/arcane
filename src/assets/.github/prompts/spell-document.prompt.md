---
name: Spell — Document
description: Formalize valuable insights, analysis, or decisions from the current conversation into polished, permanent reference documents.
argument-hint: Topics and output paths (e.g., "capability inventory → docs/capabilities.md")
agent: agent
---

## Executive Summary

- This spell extracts substantive analysis from the current conversation and structures it into formal, durable documents.
- It bridges ephemeral chat context and lasting project documentation.
- Use it when a session produces reference material that deserves a proper home (inventories, comparisons, rationale, guides).
- For a quick one-line idea instead, use `spell-save-idea`. For session continuity, use `spell-close-session`.

---

Capture conversation insights and formalize them into well-structured documents.

The user's input describes what to capture and where. If no argument was provided, ask what they want to capture and stop until they answer.

**Before doing anything else, check that there is durable material to formalize.** Scan the conversation for substantive analysis, decisions, comparisons, or reference data. If the session holds nothing beyond small talk or trivial exchanges, say so plainly, suggest `spell-save-idea` for a quick capture instead, and stop — do not manufacture content to fill a document.

## Step 1 — Parse the Request

Identify:

- **Topics** — what conversation insights to extract (e.g., "naming analysis", "architecture comparison").
- **Target paths** — where to write (e.g., `docs/...`, `.arcane/governance/...`). If the user gives only topics, propose sensible paths from the project structure.
- **Document type** — reference doc, decision record, analysis report, inventory, or guide.

## Step 2 — Extract from Conversation

Gather all relevant material from context: tables, structured data, analysis results, comparisons, conclusions, recommendations, metrics/counts, and reasoning chains. Do not leave valuable insight behind in the chat.

## Step 3 — Structure into Documents

For each target, produce a polished structure:

- Title + metadata (clear heading, date, one-line context). Get the real date from the system (e.g., run `date`) rather than guessing.
- Table of contents for documents longer than ~3 sections.
- Proper sections with headers and logical flow.
- Tables and lists formatted for readability.
- Cross-references to related project files where relevant.
- A short provenance note (e.g., _"Captured from a development session on YYYY-MM-DD."_) so future readers know its origin.

Match the tone, frontmatter, and structure of files already in the target directory before inventing your own format.

## Step 4 — Show Proposal

Present before writing. For each target, check whether the file already exists and label it `(new)` or `(exists — will diff before writing)` so approval is informed, not blind:

```
## Document Proposal

### 1. <path/to/file.md>  (new)
- Type: <reference / analysis / inventory / guide>
- Sections: <list>
- Preview:
  <first 10–15 lines>

### 2. <another path>  (exists — will diff before writing)
...

Approve? (yes / edit / skip)
```

## Step 5 — Apply (after approval)

1. Write each new document to its target path.
2. If a target already exists, do not silently overwrite. Show a diff preview of the proposed change against the current file and confirm. Prefer merging the new content into the existing structure (append a section, update a table) over replacing the whole file, unless the user asked for a full rewrite. State which mode you are using before writing.
3. Do NOT commit — leave that to `spell-commit-work`.
4. Confirm what was written and where (path + new-vs-updated per file).

## Rules

- Only formalize material actually present in the conversation — do not invent, infer, or pad content to fill a section.
- If nothing substantive is in the conversation, stop and route to `spell-save-idea` rather than producing an empty document.
- Follow existing documentation patterns in the target directory.
- Never overwrite an existing file without an explicit diff confirmation; prefer merging over clobbering.
- Never include secrets, tokens, or credentials in a document.
- Do not commit the changes — that is `spell-commit-work`'s job.

> **Tip:** Run `spell-close-session` afterward to log the session, or `spell-commit-work` to commit the new documents.
