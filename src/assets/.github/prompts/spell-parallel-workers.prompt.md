---
name: Spell — Parallel Workers
description: Run one orchestrator session and several worker sessions. Workers each prepare one independent slice of work on a prep branch and leave a short note; the orchestrator owns the plan, the shared files, the merge order and every protocol step, and integrates each slice when the stack reaches it.
tagline: Split disjoint work across worker sessions
claude_description: Use PROACTIVELY when a plan has several independent slices of work (disjoint files, shared-file edits that can be listed up front) that could be prepared in parallel by worker sessions and integrated in order by one orchestrator.
argument-hint: 'Orchestrator: the plan and its slices (e.g. "batches 3-6 of the component conversion"). Worker: worker <path to the brief>'
agent: agent
---

This prompt is the Arcane `spell-parallel-workers` spell. Read [`.arcane/spells/spell-parallel-workers.md`](../../.arcane/spells/spell-parallel-workers.md) and follow it as the complete workflow.
