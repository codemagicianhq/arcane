# 2026-09-11 — Codex Support: CS-06 and CS-07 shipped, the program closes (1.3.0, 1.3.1)

Related: [[development-methodology]] (the Spell Loop these epics ran under), [[git-conventions]]
(branch, PR and attribution rules every commit here followed).

## Session: the agent tier, the program's close, and the operator's questions

### Prompt Context

Opened mid-flight on the operator's long testing report, which carried four questions and no epic
request: why agents are delivered differently from spells, why `spell update --prune` removed
nothing in a repository with stale spell files, whether the research on making the user tier the
default had come back a yes for *new* repositories, and whether a 161-change prune output was
correct. Their closing line was *"go ahead with cs-06"*. The standing `codex-support-plan`
delegation covers CS-06 and CS-07, so both ran end to end without an operator gate.

### What Got Done

1. **Four operator questions answered from evidence, not memory.** The prune answer split six stale
   files two ways: three were never tracked by any manifest, so no prune could reach them, which is
   correct; the fourth was tracked at `0.15.8` and untracked at `1.2.0` with the file still on disk,
   which is a bug. Root cause read from source — `migrateLegacyComponents` expands a renamed
   component into its replacements with an empty file list, discarding the only record of what
   Arcane wrote, *before* the orphan loop runs. Filed with its regression test
   ([PR #242](https://github.com/codemagicianhq/arcane/pull/242)). The 161-change count was verified
   in the operator's own working tree: 160 deletions (40 spells x 4 client files) plus the rewritten
   manifest.
2. **The agents question had no answer on the record, and that was the finding.** ARC-002 decided
   the opposite of what ships and was still marked `Accepted`; the component it registered was
   retired before this repository's public history begins, leaving a four-line code comment as the
   entire record. Superseded by ARC-047.
3. **CS-06 designed against the shipped client instead of the plan.** PLAN.md targeted
   `~/.arcane/.github/agents` plus a `chat.agentFilesLocations` snippet — a setting CS-04 had already
   found vendor-deprecated, whose replacement documentation contradicts itself about whether the home
   locations are live. Reading VS Code `1.137.0`'s own bundle settled it: four custom-agent locations
   in one table, two of them in the home directory, and a loader that pushes one picker entry per
   file and sorts by name with **no dedup step**. VS Code issue 312256 reports the same behavior
   independently.
4. **That finding changed the epic's shape.** A user tier alone cannot reduce the agent count for a
   repository that still carries `.github/agents`; it can only add to it. The opt-out is the whole
   fix, not a convenience on top of one.
5. **CS-06 shipped as `1.3.0`** ([PR #243](https://github.com/codemagicianhq/arcane/pull/243)):
   `--user` on all three `spell agents` subcommands with the roster at the store root; a home fan-out
   to `~/.copilot/agents` through CS-04's hash-guarded reconcile, now scoped per client so two
   commands share one record; the opt-out; a report naming leftovers with the `git rm` line rather
   than deleting files no component ever tracked; and the blocking doctor row, failed only where a
   repository actually expects agents.
6. **CS-07 shipped as `1.3.1`** ([PR #244](https://github.com/codemagicianhq/arcane/pull/244)): the
   PRD closes at eight of nine acceptance criteria, with AC1 re-verified against the built CLI rather
   than taken from CS-01's word. Three governance documents corrected, four open findings routed by
   name.

### Lessons Learned

- **When a vendor's documentation contradicts itself, read the vendor's build.** VS Code ships its
  discovery tables as plain literals. Two hours of documentation round-trips were replaced by one
  grep, and the answer was better than either document: not "which location works" but "the loader
  does not deduplicate", which is the fact the epic actually turned on.
- **A correct run that reads as a broken one is a defect.** Running the built CLI against a stubbed
  home found three: a `--user` run reporting the repository's roster path, a written-files summary
  naming two hardcoded clients so an agent sync said "0 Codex skills, 0 Claude Code commands", and a
  success block pointing at the wrong file. All three passed every test; none would have been found
  without running the thing.
- **Name the unverified premise in the ADR, not in a commit message.** ARC-047's consequences say
  plainly that the home-location resolution is an inference with a queued count behind it, and that
  a failure costs one string. That is cheaper than discovering later that a decision rested on
  something nobody had checked.
- **A version-bump gate firing on a "no bump" epic is the gate working.** CS-07's drift pass edited
  two `src/assets/` governance documents. The plan said no bump; the gate said otherwise and was
  right. Corrected on the record in PLAN.md rather than worked around.
- **Save the full log before filtering it.** Two pre-push failures in this session were nearly lost
  to a grep. The second time, the log went to a file first — which is how the three timing-out tests
  were identified as a contention flake class rather than guessed at.

### Deferred

Nothing untracked — Q-006, Q-007, Q-008, Q-009 and Q-010 are the five open operator queue items, and
every finding this program did not close is a `TODO.md` entry routed by name in
`docs/plans/codex-support/PLAN.md`, "What this program did not close". Of the queue items, three are
decisions (ARC-046, the default `spell_scope`, ARC-047) and two are the picker counts that make up
AC5's remaining half.
