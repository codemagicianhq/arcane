---
name: Spell — Todo
description: Elaborate a raw idea into one or more well-scoped TODO items and place them in the right document(s). In a hub repo, optionally target a venture's own TODO book, or sweep every book's open-item counts.
claude_description: Use PROACTIVELY whenever a raw idea needs to become one or more well-scoped TODO items, even if the user just says 'add a todo'.
argument-hint: The raw idea to elaborate (e.g., "add spending limits doc", "automate ADR numbering", "build a dashboard for {AGENT_NAME}"), optionally "for <venture>" (hub only). `{AGENT_NAME}` resolves from `.arcane.json` / frontmatter; ask if unset. Use `--sweep` instead to report open-item counts across every book.
agent: agent
---

This prompt is the Arcane `spell-todo` spell. Read [`.arcane/spells/spell-todo.md`](../../.arcane/spells/spell-todo.md) and follow it as the complete workflow.
