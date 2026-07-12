---
name: Spell — Save Idea
description: Quickly capture a fleeting idea into the repo's idea inbox so it is not lost. Low ceremony, no approval gate, optimized for voice and speed.
argument-hint: The idea itself — a sentence to a couple of paragraphs (e.g., "add a dark-mode toggle to the settings page")
agent: agent
---

## Executive Summary

- This spell saves a short idea into `IDEAS.md` at the repo root with a timestamp, so a good thought is not lost between sessions.
- It is deliberately fast and low-friction: no approval gate, no multi-step proposal — capture and confirm.
- Use it the moment an idea occurs to you. Triage later with `spell-todo` or `spell-suggest-feature`.
- This is the lightweight counterpart to `spell-document` (which formalizes a whole conversation into polished docs).

---

Capture the user's idea into the idea inbox with minimal ceremony.

The user's input IS the idea. If no idea text was provided, ask one short question: _"What's the idea?"_ and stop until they answer.

## Step 1 — Normalize the Idea

- Take the user's input verbatim as the core idea.
- Strip a leading invocation phrase if the user dictated one (e.g., "save this idea —", "note that", "remind me to") — log the idea, not the command to log it.
- Lightly clean it up: fix obvious typos and capitalization, but **do not** rewrite, expand, or editorialize. The user's phrasing is the record.
- If the idea is clearly multiple distinct ideas, split them into separate entries (one appended line each).
- Optionally infer a single short tag (1–2 words, kebab-case) from the content — e.g., `ui`, `infra`, `marketing`, `dx`. If nothing fits cleanly, omit the tag.
- **If the idea contains a secret** (token, password, API key, connection string), redact it inline (e.g., `[redacted]`) before writing and warn the user in the confirmation. Never write the raw value to `IDEAS.md`.

## Step 2 — Append to IDEAS.md

Append (never overwrite) an entry to `IDEAS.md` at the repo root.

Entry format:

```markdown
- **[YYYY-MM-DD HH:MM]** [#tag] <the idea, lightly cleaned> <!-- status: new -->
```

- Get the real local date and time from the system (e.g., run `date`) rather than guessing — a wrong timestamp silently corrupts the append-only log.
- The `status: new` HTML comment lets later triage mark entries as `promoted` / `dropped` without deleting history.
- Include `[#tag]` only if a tag was inferred; otherwise omit it.

If `IDEAS.md` does not exist yet, create it with this header first, then append:

```markdown
# Idea Inbox

Fast-capture log of ideas worth keeping. Add with `spell-save-idea`. Triage with `spell-todo`
(actionable) or `spell-suggest-feature` (product ideas). Entries are append-only; mark status in the
trailing comment rather than deleting.

---
```

## Step 3 — Confirm (one line)

Print a single concise confirmation, nothing more:

```
💡 Saved to IDEAS.md — [#tag] <short echo of the idea>
```

- If multiple entries were appended, confirm with one line per entry (or a count, e.g. `💡 Saved 3 ideas to IDEAS.md`).
- If anything was redacted, append `(secret redacted)` to the confirmation so the user knows.

## Step 4 — Offer Promotion (optional, non-blocking)

After confirming, add at most one short line offering a next step **only if the idea is obviously
actionable or product-shaped**:

> Want to turn this into a tracked item? Run `spell-todo` (task) or `spell-suggest-feature` (product idea).

Do not ask follow-up questions. Do not commit — leave that to `spell-commit-work`.

## Rules

- Speed over polish. This spell should feel instant.
- Never overwrite existing entries — always append.
- Never rewrite the user's idea beyond light cleanup. Preserve their words.
- No approval gate — write immediately.
- Never include secrets, tokens, or credentials in an entry.
- Do not commit the change.
