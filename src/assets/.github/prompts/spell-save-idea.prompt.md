---
name: Spell — Save Idea
description: Quickly capture a fleeting idea into the repo's idea inbox so it is not lost. Low ceremony, no approval gate, optimized for voice and speed. In a hub repo, optionally target a venture's own idea book.
argument-hint: The idea itself — a sentence to a couple of paragraphs (e.g., "add a dark-mode toggle to the settings page"), optionally "for <venture>" (hub only, e.g. "save this idea for ordo — …")
agent: agent
---

## Executive Summary

- This spell saves a short idea into `IDEAS.md` at the repo root with a timestamp, so a good thought is not lost between sessions.
- It is deliberately fast and low-friction: no approval gate, no multi-step proposal — capture and confirm.
- Use it the moment an idea occurs to you. Triage later with `spell-todo` or `spell-suggest-feature`; in a hub, promote with `spell-manifest`.
- This is the lightweight counterpart to `spell-document` (which formalizes a whole conversation into polished docs).
- **In a hub repo:** "save this idea for &lt;venture&gt;" targets that venture's own `IDEAS.md` book instead of the hub root — private by default, including for ventures whose own repo is public.

---

Capture the user's idea into the idea inbox with minimal ceremony.

The user's input IS the idea. If no idea text was provided, ask one short question: _"What's the idea?"_ and stop until they answer.

## Step 0 — Venture Targeting (Hub Only)

If the input names a venture ("save this idea for ordo", `--venture <slug>`), resolve it through `ventures/registry.json`'s aliases first (exact slug → alias → closest match offered — never guessed). Unknown slug:

```
No venture "<slug>" under ventures/ (closest: ordovica, tidewright).
1) use <closest>  2) save to hub root IDEAS.md  3) cancel (create the venture first: spell-summon-venture)
```

Never silently create a venture folder.

If `role` in `.arcane.json` is not `"hub"`, venture-targeting phrasing is refused:

```
Venture targeting works only in the hub repo (role: "hub" in .arcane.json). This repo has no venture books.
1) save to this repo's IDEAS.md (venture reference removed)
2) skip — capture it in the hub: spell-save-idea --venture <slug> "<idea>"
Which? (1/2)
```

If option 1 is chosen and the named venture is a *different* venture than this repo's own, strip that name from the idea text before writing it — a sibling venture's name must never land in a consumer repo's `IDEAS.md`. If it's this repo's own venture, keep the text as given.

An idea that only *mentions* a venture, without targeting phrasing, is not redirected — proceed with the hub root and append a non-blocking hint to the Step 3 confirmation instead (speed rule: don't block on a maybe):

```
(mentions ordovica — re-save with --venture ordovica, or route it later with spell-manifest)
```

When targeting a venture book that doesn't exist yet as a file, create it from the venture-template `IDEAS.md` stub (same header convention as the hub root, below) with the venture's name filled in. Tolerate operator YAML frontmatter above either book's header — always append after the final `---` divider, never before it.

## Step 1 — Normalize the Idea

- Take the user's input verbatim as the core idea.
- Strip a leading invocation phrase if the user dictated one (e.g., "save this idea —", "note that", "remind me to") — log the idea, not the command to log it.
- Lightly clean it up: fix obvious typos and capitalization, but **do not** rewrite, expand, or editorialize. The user's phrasing is the record.
- If the idea is clearly multiple distinct ideas, split them into separate entries (one appended line each).
- Optionally infer a single short tag (1–2 words, kebab-case) from the content — e.g., `ui`, `infra`, `marketing`, `dx`. If nothing fits cleanly, omit the tag.
- **If the idea contains a secret** (token, password, API key, connection string), redact it inline (e.g., `[redacted]`) before writing and warn the user in the confirmation. Never write the raw value to `IDEAS.md`.

## Step 2 — Append to IDEAS.md

Append (never overwrite) an entry to `IDEAS.md` — the repo root, or the resolved venture's own book from Step 0.

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

> Want to turn this into a tracked item? Run `spell-todo` (task) or `spell-suggest-feature` (product idea). In a hub, `spell-manifest` promotes it downstream once ready.

Do not ask follow-up questions. Do not commit — leave that to `spell-commit-work`.

## Rules

- Speed over polish. This spell should feel instant.
- Never overwrite existing entries — always append.
- Never rewrite the user's idea beyond light cleanup. Preserve their words.
- No approval gate — write immediately.
- Never include secrets, tokens, or credentials in an entry.
- Do not commit the change.
