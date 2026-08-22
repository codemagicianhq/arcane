---
name: Spell — Feedback
description: Collect structured feedback on AI-assistance quality and workflow friction, and append it to FEEDBACK.md for continuous improvement. Framework-shaped items can route upstream to arcane's public GitHub issues.
argument-hint: Optional focus area — e.g., "spell-implement loop", "review quality", "session handoff". Use `--flush` instead to re-offer any previously queued upstream items.
agent: agent
---

## Executive Summary

- This spell captures post-session feedback on how well the spells and AI assistance worked.
- It structures the feedback into actionable improvement items and appends them to `FEEDBACK.md` at the repo root.
- Use it after any session where assistance felt notably effective or notably off — the record feeds `spell-enchant`.
- **Framework-shaped items** (about a spell, template, governance doc, playbook, or CLI behavior — not this repo's own content) can additionally route upstream as a GitHub issue on `{ARCANE_UPSTREAM_REPO}` — the same public intake path any arcane user would use, genericized first and gated by an explicit disclosure confirm. This is the whole consumer→arcane feedback loop: arcane is the one thing every consumer repo may reference without violating sibling isolation, because it's the installed, publicly-homed dependency, not a sibling venture.

---

Collect and record feedback to improve the Arcane workflow.

## Flush Mode (`--flush`)

If the argument is `--flush`, skip Steps 1–5 entirely. Scan `FEEDBACK.md` for improvement items marked `<!-- upstream: queued -->`, and for each one run Step 6's filing flow (genericize, confirm, file or re-queue) without re-collecting feedback. Report how many were filed, re-queued, and how many remain.

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

For each substantial item, additionally classify **framework-shaped** vs **repo-local**: framework-shaped means the fix belongs in arcane itself (a spell prompt, template, governance doc, playbook, or CLI behavior this repo installed rather than authored); repo-local means it's specific to this repo's own content or configuration. Only framework-shaped items are offered upstream routing in Step 6.

## Step 4 — Show Proposal

```
## Feedback Summary

**Target:** [...]   **Date:** [YYYY-MM-DD]   **Rating:** [N/5]   **Would use again:** [yes / yes-with-changes / no]

**Friction:** [...]
**Worked well:** [...]
**Improvement items:**
- [ ] [item] [SUBSTANTIAL if TODO-worthy] [FRAMEWORK-SHAPED if upstream-eligible]

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
4. For each item additionally marked **framework-shaped**, run Step 6.
5. Do NOT commit — leave that to `spell-commit-work`.
6. Confirm what was appended and where, then point the user to [`spell-enchant`](spell-enchant.prompt.md) if the feedback suggests a spell or PRD is ready to be lifted to the next quality tier.

## Step 6 — Upstream Routing (Framework-Shaped Items)

`{ARCANE_UPSTREAM_REPO}` is this install's own arcane framework repository (`owner/repo`) — resolve it from the installed `arcane-cli` package's `repository` field (e.g. `node_modules/arcane-cli/package.json`, or `npm view arcane-cli repository.url` if not vendored locally); ask the user if it cannot be determined. Never hardcode a specific org/repo here — a fork or downstream rename changes this value.

For each framework-shaped item:

1. **Genericize.** Strip anything identifying this specific consumer: venture/business names, org tokens, machine names, hub or local paths. Write "a consumer repo session" instead of naming the actual venture, generalize file paths to their relative form. The finding must read the same whether it came from this repo or any other arcane user's.
2. **Check `gh`.** If unauthenticated or offline, skip straight to the fallback below.
3. **Disclosure confirm.** Print the exact issue title and body that will be filed publicly on `{ARCANE_UPSTREAM_REPO}`, and ask for the literal word `disclose` — same discipline as `spell-manifest`'s disclosure gate; this is the same kind of act (private observation → public issue). Anything else is a decline, not an error.
4. **File.** On `disclose`: `gh issue create --repo {ARCANE_UPSTREAM_REPO} --title "<title>" --body "<genericized body>"`. Report the issue URL.
5. **Fallback.** If `gh` is unavailable, offline, or the operator declines: append `<!-- upstream: queued -->` to that item's line in `FEEDBACK.md`. Never block the rest of the session on this — queuing is a complete, valid outcome. The next `spell-feedback` run (or `spell-feedback --flush`) re-offers every queued item.

Maintainer side is unchanged: GitHub issues are arcane's normal public intake; triage into arcane's own `IDEAS.md`/`DECISIONS.md` happens in arcane sessions like any other issue. This spell never writes to a hub's venture books and never reads `ventures/registry.json` — framework feedback and venture ideas are different channels on purpose (venture ideas → hub books → `spell-manifest`; framework lessons → here → arcane's GitHub).

## Rules

- Never overwrite existing feedback — always append.
- Keep improvement items specific and actionable — no vague "improve quality".
- If overall quality is ≤ 2, flag it with `⚠️ LOW RATING` in the Step 4 proposal (before the append decision) and offer `spell-todo` to capture a concrete fix.
- After approval, write immediately — no further questions.
- Never include secrets or tokens.
- Never file an upstream issue without the literal `disclose` confirmation on that exact entry — batch approval of the local `FEEDBACK.md` append does not extend to Step 6.
- Never write a venture name, hub path, or machine name into an upstream issue — genericize before showing the disclosure confirm, not after.
