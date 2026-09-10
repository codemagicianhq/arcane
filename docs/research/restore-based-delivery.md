---
title: Restore-Based Spell Delivery — Should Spell Files Be Gitignored and Restored From the Arcane Dependency?
audience: both
last_updated: 2026-09-10
status: active
tags: [research, distribution, restore, node_modules, codex-support, cs-08]
sources: [docs/plans/codex-support/PLAN.md (CS-08), docs/plans/become-current/OPERATOR-QUEUE.md Q-010, docs/research/delivery-channels-smoke-tests.md (BC-28), IDEAS.md I13 (2026-08-21 #distribution), DECISIONS.md ARC-019 / ARC-027 / ARC-038 / ARC-045, a live prototype run 2026-09-10 with the built 1.1.1 CLI and codex-cli 0.153.4, VS Code's AI settings reference fetched 2026-09-09]
---

# Restore-Based Spell Delivery

## Summary

CS-08 of [docs/plans/codex-support/PLAN.md](../plans/codex-support/PLAN.md) — the research spike that
unparks Become Current's Q-010. The question, in the operator's own framing during planning: now
that every spell has one canonical file and three tiny shims, should those files stop being committed
in consumer repositories and instead be **restored from the declared Arcane dependency** on install,
`node_modules`-style — gitignored, materialized, never diffed?

**Verdict: no-go, for now — and the door stays open at no cost.** Three findings, all observed
rather than argued:

1. **The mechanism already exists and works.** A consumer whose spell folders are gitignored gets
   every file back on a fresh clone from today's `spell update`: its same-version restore path
   (shipped in CS-03 for a different reason) restored all 160 delivery files of a `lite` install
   in one command, and the clients found them — Codex listed the restored, gitignored skills with
   no sign it cared about `.gitignore`. Nothing new would need to be built to *get* files back.
2. **The crux is not getting files back; it is what happens to an operator's edits.** An edit to a
   gitignored spell is invisible to `git status`, cannot be committed, never reaches a second clone,
   and is recorded only in the *local* manifest's hash — the exact "silent data loss" class R5 of
   this program's PRD forbids. ARC-038's three-way merge protects committed files; it has nothing to
   merge for a file git cannot see. A customization overlay (edits committed somewhere else and
   re-applied on restore) would be the real design, and it does not exist.
3. **The motivation has largely gone away.** The clutter and duplication that raised the question
   were per-repository copies of 41 full prompt bodies in two formats. After ARC-045 a repository
   carries 41 canonical files plus 123 three-line shims; after CS-04 one machine-wide copy exists at
   `~/.arcane`, and CS-05's `spell_scope: "user"` lets a repository stop carrying any of it. What
   remains for a restore model to remove is the canonical folder in repositories that keep the repo
   tier — the one class of file operators do customize.

The symlink/junction variant Q-010 actually named (a package-resident folder *referenced* rather
than copied) is rejected outright, not deferred: ARC-027's `core.symlinks=false` constraint stands,
and the VS Code setting whose junction-following BC-28 observed is now deprecated by VS Code itself.

## The question, precisely

Three shapes were on the table (PLAN.md's ADR candidate for ARC-046):

| Option | What becomes gitignored + restored | What stays committed |
|---|---|---|
| (a) status quo | nothing | everything |
| (b) shims only | `.github/prompts/`, `.claude/commands/`, `.agents/skills/` (123 three-line files) | canonical spells, governance, manifest |
| (c) canonical + shims | `.arcane/spells/` too (41 files with real bodies) | governance, manifest |

Governance was never a candidate: ARC-019 makes the repository its owner and operators edit it per
repository.

## What already exists (read before building anything)

- **`spell update` restores missing tracked files at the same version** — CS-03's remedy path
  (`src/commands/update.ts`, `findMissingTrackedFiles`): a file the manifest tracks, absent on disk,
  shipped by a vendor-owned component, is written back from the installed CLI's assets with no
  version change. This is, byte for byte, the "restore" a restore model needs.
- **The manifest already records every delivery file's hash** (ARC-038), so a restored file is a
  first-class managed file afterwards.
- **`spell update` refuses to run on a dirty tree** and requires a git repository with commits.
- **Clients discover files by scanning directories** — the repo-tier shims, the user tier's
  `~/.agents/skills` and `~/.claude/commands` (CS-04) — with no reference to git at all.

## Prototype (2026-09-10, built 1.1.1 CLI, disposable repositories under the session scratchpad)

1. **Consumer install.** `spell init --profile lite` in a fresh repository: 40 spells (Copilot,
   Claude Code, Codex), 3 governance docs, 170 files.
2. **Gitignore the delivery folders, commit the rest.** `.gitignore` gained `.arcane/spells/`,
   `.github/prompts/`, `.claude/commands/`, `.agents/skills/`. After the commit: **0** tracked spell
   files, the manifest tracked and listing **160** delivery files with hashes.
3. **Fresh clone.** `ls .arcane/spells` → 0; `.agents/skills` → 0. The repository is complete as
   far as git is concerned and has no spells.
4. **Restore = today's `spell update`.** Output: `Already at v1.1.1, but 160 tracked files are
   missing — restoring.` then one `Restored missing: …` per file. Afterwards: 40 spells, 40 prompts,
   40 commands, 40 skills on disk.
5. **The tree after a restore, on this Windows machine (`core.autocrlf=true`).** `git status` showed
   `.arcane.json` modified; `git diff --ignore-cr-at-eol` showed no content change; `git add` had
   nothing to commit — a line-ending-only artifact of `writeManifest` rewriting the file with LF
   into a CRLF working copy. Real consequence nonetheless: the next `spell update` **refused**
   (`this repository has 1 uncommitted change`) until the operator ran `git add`. Filed as a LOW
   in `TODO.md` ("refuses on a line-ending-only modification of a file it just wrote"); unrelated
   to the restore question but found by it.
6. **Discovery ignores `.gitignore`.** In the restored clone, `git check-ignore` confirmed
   `.agents/skills/spell-status/SKILL.md` is ignored; `codex exec --cd <clone>` answered **81**
   `spell-*` skills available (40 from the repo's ignored folder plus the 41 of the user tier
   installed on this machine) and nothing in its trace mentioned ignore rules. Claude Code and
   Copilot are inferred to behave the same — both scan directories, and BC-28 observed Copilot
   traversing even `node_modules` — but neither was driven here.
7. **The customization crux, demonstrated.** `printf 'OPERATOR EDIT' >> .arcane/spells/spell-status.md`
   in the clone → `git status` shows **0** changes; `spell update` says `Already up to date.` (the
   file is present, so the same-version path leaves it alone); a **second fresh clone** restores
   the vendor file — the edit is gone. The only trace of the operator's intent is the recorded hash
   in the clone's own `.arcane.json`, which is exactly what ARC-038 uses to *detect* an edit at the
   next version bump — on that one machine, against a file no other checkout has.

## Findings

- **F1 — Restore is a solved mechanism.** No new command is needed; `spell update` at the same
  version is the restore. A `spell restore` alias would be cosmetics.
- **F2 — Restore has no trigger in a repository without `package.json`.** The docs profile and
  governance-only repositories have no npm lifecycle to hang a `prepare` script on; a restore would
  have to be a documented manual step or a git hook Arcane installs — both weaker than "commit the
  files".
- **F3 — Edits to restored files are lost by construction.** Not a bug to fix in `spell update`; a
  property of gitignored files. Any restore model needs a *customization overlay*: edits live in a
  committed place (the canonical spell itself, if canonical stays committed — option (b); or a
  committed patch/overlay file re-applied after restore — option (c)) and restored files are treated
  as pure vendor output. That overlay is the actual design work, and none of it exists.
- **F4 — Option (b) is now nearly pointless.** The three shim sets are 123 files of three lines
  each, generated, never customized (ARC-045 decision 2 forbids prose in them; CS-03's update logic
  keeps a customized one only to avoid destroying an operator's mistake). Removing them from git
  saves 123 tiny files per repository and buys a restore trigger problem (F2) in exchange.
- **F5 — Option (c) collides with the one file class operators customize.** The canonical spells
  are where the customized-shim remedy tells operators to put their edits (CS-03 D5.2). Making them
  ephemeral moves the customization problem, it does not solve it (F3).
- **F6 — The duplication motive is answered elsewhere.** The user tier (CS-04) holds one copy per
  machine; CS-05's opt-out removes a repository's copies. A restore model would not reduce
  duplication further than that.
- **F7 — The symlink/junction shape is dead.** ARC-027: this maintainer's own environment runs
  `core.symlinks=false`, and the copier's traversal guard refuses links by design. BC-28's positive
  junction result was for `chat.promptFilesLocations`, which VS Code now marks deprecated ("This
  setting and the Local agent will be removed in a future release", AI settings reference fetched
  2026-09-09 for CS-04). Re-running BC-28's two probes was therefore not done: the true-symlink
  re-run needs Developer Mode (outside an agent session's authority, as BC-28 already recorded),
  and the setting under test is going away.
- **F8 — A hostile package could plant discoverable files** in a restore model just as BC-28 warned
  for `node_modules` traversal: anything that restores into `.agents/skills/` or `.claude/commands/`
  from a dependency inherits the dependency's supply-chain trust. Committed files at least appear in
  code review.

## Verdict

**No-go on opening a restore-based delivery program.** The decision is recorded as ARC-046 in
`DECISIONS.md` (drafted `Proposed`; the operator accepts, revises or rejects it via
`docs/plans/codex-support/OPERATOR-QUEUE.md` Q-006). What would change the verdict, so it can be
re-opened deliberately rather than re-argued: a customization-overlay design that survives a fresh
clone (the crux), a restore trigger that works without npm, and a real cost the current model still
imposes after CS-05 ships.

Nothing needs undoing to go the other way later: the same-version restore path, the per-file hash
record and the manifest's `scope` field are the pieces a future overlay design would build on.

## Operator check (none required)

This spike produced a decision, not a client behavior; there is nothing for the operator to observe
beyond reading ARC-046 and answering Q-006. The one live behavior it relied on — Codex discovering
gitignored skills — was observed directly.
