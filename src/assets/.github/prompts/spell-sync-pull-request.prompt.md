---
name: Spell — Sync Pull Request
description: Safely sync an open PR's branch with its target when it has fallen behind — recoverable pre-rebase ref, mechanical-vs-ambiguous conflict handling, force-with-lease push, provider-verified landing. Use when a PR needs rebasing onto a moved target, or was routed here from spell-create-pull-request/spell-ship's own conflict-stop points.
claude_description: Use PROACTIVELY whenever an open PR has fallen behind its target branch and needs a safe rebase/sync, or when spell-create-pull-request/spell-ship stop on a conflict they route here.
argument-hint: '[PR number or branch name]'
agent: agent
last_updated: 2026-08-31
---

This prompt is the Arcane `spell-sync-pull-request` spell. Read [`.arcane/spells/spell-sync-pull-request.md`](../../.arcane/spells/spell-sync-pull-request.md) and follow it as the complete workflow.
