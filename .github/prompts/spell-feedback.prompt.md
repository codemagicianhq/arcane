---
name: Spell — Feedback
description: Collect structured feedback on AI-assistance quality and workflow friction, and append it to FEEDBACK.md for continuous improvement.
argument-hint: Optional focus area — e.g., "spell-implement loop", "review quality", "session handoff"
agent: agent
---

## Executive Summary

- This spell captures post-session feedback on how well the spells and AI assistance worked.
- It structures the feedback into actionable improvement items and appends them to `FEEDBACK.md` at the repo root.
- Use it after any session where assistance felt notably effective or notably off — the record feeds `spell-enchant`.

---

Collect and record feedback to improve the Arcane workflow.

The user's input describes what to give feedback on. If no argument is provided, ask one question: _"What part of the workflow or AI assistance do you want to give feedback on?"_ and wait.

## Step 1 — Identify Scope

From the input and recent context, determine:

- **Target** — which spell, agent, or general experience is being rated.
- **Session context** — the recent task/feature (check `TODO.md`, `DECISIONS.md`, latest `journal/` entry).
- **Type** — output quality, workflow friction, or tooling/setup.

Do not ask for anything you can infer from the conversation.

## Step 2 — Prompt for Structured Feedback

Ask all of this at once (not one at a time):

```
## Feedback Form

**Target:** [spell/agent/experience]
**Session:** [topic or "general"]

1. Overall quality (1–5): how effective was the assistance?
2. Friction points: what slowed you down or felt wrong?
3. What worked well: what should stay exactly as-is?
4. Suggested improvement: the single change that would help most?
5. Would you use this again? (yes / yes-with-changes / no)
```

If the user already covered some fields in their input, skip those and confirm what you inferred.

## Step 3 — Synthesize

Extract:

- **Improvement items** — specific, imperative, with a clear done-state ("Add…", "Fix…", "Remove…").
- **Positive signals** — patterns to preserve.
- **Blockers** — anything that prevented task completion (surface these under Friction Points).

Mark an item **substantial** (TODO-worthy) if any apply: it requires editing a spell/governance/agent file, it blocked task completion, or it recurs across sessions. Trivial one-off nits stay in `FEEDBACK.md` only.

## Step 4 — Show Proposal

```
## Feedback Summary

**Target:** [...]   **Date:** [YYYY-MM-DD]   **Rating:** [N/5]   **Would use again:** [yes / yes-with-changes / no]

**Friction:** [...]
**Worked well:** [...]
**Improvement items:**
- [ ] [item] [SUBSTANTIAL if TODO-worthy]

Append to FEEDBACK.md? (yes / edit / skip)
```

If the rating is ≤ 2, prepend a `⚠️ LOW RATING` line to this proposal so it is visible before the append decision — do not bury it.

## Step 5 — Apply (after approval)

1. Read `FEEDBACK.md` at the repo root (create with a `# Feedback Log` header if missing).
2. **Append** this block — never overwrite existing entries:

```markdown
---

## Feedback — [Target] ([YYYY-MM-DD])

**Session:** [topic or "general"]
**Rating:** [N/5]   **Would use again:** [yes / yes-with-changes / no]
**Submitted by:** [git config user.name if available, else "developer"]

### Friction Points
- [point — include any blockers]

### What Worked
- [strength]

### Improvement Items
- [ ] [item]

### Raw Notes
> [verbatim user input if useful]
```

3. For each item marked **substantial** in Step 3, offer to add it to `TODO.md` as a `[feedback]`-tagged item. If the user accepts, hand off to [`spell-todo`](spell-todo.prompt.md) rather than editing `TODO.md` directly — it picks the right section and avoids duplicates.
4. Do NOT commit — leave that to `spell-commit-work`.
5. Confirm what was appended and where, then point the user to [`spell-enchant`](spell-enchant.prompt.md) if the feedback suggests a spell or PRD is ready to be lifted to the next quality tier.

## Rules

- Never overwrite existing feedback — always append.
- Keep improvement items specific and actionable — no vague "improve quality".
- If overall quality is ≤ 2, flag it with `⚠️ LOW RATING` in the Step 4 proposal (before the append decision) and offer `spell-todo` to capture a concrete fix.
- After approval, write immediately — no further questions.
- Never include secrets or tokens.
