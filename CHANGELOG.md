# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

Releases `0.22.1` through `0.39.0` were written up together on 2026-09-09, after this file had stopped at `0.22.0`. Each of those entries was reconstructed from its release tag, the pull requests merged inside it and their commit messages, and is deliberately shorter than the entries written at release time. Two versions that were tagged but never reached npm (`0.32.1`, `0.34.3`) are recorded as notes under the release that carried their content.

## [1.5.0] - 2026-09-11

Stop answering the same scope question in every new repository, without changing a single repository you already have ([ARC-048](DECISIONS.md#arc-048--an-absent-spell_scope-means-repo-permanently-new-repositories-may-be-pre-selected)).

### Added

- **`spell update --user --default-scope repo|user`** records which answer `spell init` pre-selects for its spell-scope question in **new** repositories on this machine. The preference lives in the store's own manifest and is read only at `init` time, so no existing repository's manifest is ever rewritten by setting it — and the question is still asked, so a repository you want self-contained is one keystroke away. An absent `spell_scope` still means `repo`, permanently, on every machine.
- **`spell update` now warns when a repository depends on a user tier that is not installed**, naming the store path and both ways out. `spell doctor` already failed on this, but nothing runs `spell doctor` — no workflow, no hook, and no spell — so the check moved to a command people actually run. Without it, a clone on a bare machine keeps a routing block naming spells that resolve to nothing, and an agent improvises the workflow instead of failing.

### Notes

- Flipping the default outright was considered and rejected. Almost no repository sets the field, so "the default" is not a preference for new installs — it is the live setting of every repository that already exists, on a release chain with no step where a human looks. The reasoning is recorded in full in `docs/research/default-spell-scope.md`.

## [1.4.0] - 2026-09-11

Your agent personas now work in Claude Code as well as VS Code, from one file each, and a repository that takes its spells from the machine-wide tier no longer loses its roster tables ([ARC-047](DECISIONS.md#arc-047--agents-are-roster-rendered-not-registry-distributed-and-get-a-user-tier), accepted with one revision).

### Changed

- **The user tier's agent files moved from `~/.copilot/agents/<name>.agent.md` to `~/.claude/agents/<name>.md`.** That directory is read by VS Code *and* by Claude Code, so one file gives you the persona in both. Moving rather than adding is deliberate: the four custom-agent locations VS Code resolves sit in one table with no deduplication, so a file in each home location would have listed every persona twice. `spell agents sync --user` performs the move, pruning the old copies, and keeps any file you edited.
- **Each user-tier agent's `description` now states that the persona is for explicit invocation.** Claude Code reads that field to decide whether to hand work to a subagent unprompted; twelve personas installed once per machine are visible in every project on that machine, including ones unrelated to Arcane. VS Code shows the same string as a label. One line per role reverses it if you want automatic routing.

### Fixed

- **A repository that opted into the user tier and had no roster of its own got no roster tables at all**, and `spell agents sync` refused with "No agent roster found". It now falls back to the machine-wide roster, which is what [ARC-045](DECISIONS.md#arc-045--one-spell-source-thin-client-shims-and-a-user-level-install-tier) decision 6 already said should happen. A repository's own roster still wins when it has one, and the tier's definition files travel with the tier's roster so a role you customized in the store is not silently replaced by the vendor default.
- The user-tier agent description no longer truncates mid-sentence. It was slicing the first *line* of hard-wrapped YAML prose, which cut "...and system design. Reviews" and left that dangling into the next sentence.

## [1.3.1] - 2026-09-11

Documentation only. Three shipped governance documents were left incomplete rather than wrong by the user-tier work, and CS-07's drift pass corrected them.

### Changed

- `universal-agent-rules.md` described how spells reach each client without mentioning that spells *or* the agent roster can be installed once per machine at `~/.arcane`, or that a repository with `spell_scope: "user"` carries neither its own spell files nor its own `.github/agents/*.agent.md`. Standing repository instructions still never move tier, and the note now says so explicitly.
- `spell-authoring-standards.md` told authors that a spell's relative links resolve two levels below the repository root, with no note that the user tier has no repository to resolve against. Authors are now pointed at D2 Gold's existing "works in a vanilla consuming repo" bar as the thing that makes a spell safe at either tier.
- The README's `spell_scope` comment still said a repository "carries its own spells" after the field started governing agent files too.

## [1.3.0] - 2026-09-11

The agent roster can now live once per machine, and a repository that takes its spells from the user tier stops carrying its own agent files (CS-06 of the Codex Support program, [ARC-047](DECISIONS.md#arc-047--agents-are-roster-rendered-not-registry-distributed-and-get-a-user-tier)).

### Added

- `spell agents init|sync|list --user` operate on the store at `~/.arcane`: the roster and its per-role definitions sit at the store root, and a sync renders one `~/.copilot/agents/<name>.agent.md` per agent — the home location VS Code resolves for machine-wide agent modes, and the only one of the four custom-agent locations read by VS Code alone.
- The user tier's agent files go through the same fan-out reconcile as its spells: hash-recorded in the store manifest, so a file you edited is recognized, kept and named rather than overwritten, and `spell uninstall --user` removes exactly what Arcane wrote. The reconcile is now scoped per client, so `spell update --user` and `spell agents sync --user` share one record without either erasing the other's entries.
- `spell doctor`'s blocking scope check covers agents where agents are expected: an opted-out repository that has its own roster and finds none in the tier fails with the remedy; one that has never run `spell agents init` passes.

### Changed

- A repository with `spell_scope: "user"` receives no `.github/agents` files. Its roster tables in `CLAUDE.md`, `AGENTS.md` and `.github/copilot-instructions.md` are unchanged — those are continuity content, not a client discovery surface. Agent files left from before the opt-out are named along with the `git rm` line that removes them, and are never deleted automatically: no component ever tracked them, so no recorded hash exists to prove one untouched.
- [ARC-002](DECISIONS.md#arc-002--distribute-vs-code-agent-mode-files-via-spell-init) is superseded. It decided to ship twelve fixed agent files as a registry component; that component was retired long ago, leaving a code comment as the only record. ARC-047 puts the reasoning on the record: a `.agent.md` file's name and contents are chosen per repository by the roster's naming strategy, and a registry component declares fixed paths, so it structurally cannot deliver one.

### Notes

- Repositories that have not opted out are unaffected. With a populated tier beside them they will list each agent twice, because VS Code does not deduplicate agents by name — the same trade the spell tier already makes, with the same remedy.

## [1.2.0] - 2026-09-10

A repository can now take its spells from the user tier instead of carrying its own (CS-05 of the Codex Support program, [ARC-045](DECISIONS.md#arc-045--one-spell-source-thin-client-shims-and-a-user-level-install-tier) decision 4).

### Added

- **`spell_scope` on `.arcane.json`** — `"user"` opts a repository out of carrying its own canonical spells and client shims; absent (or `"repo"`) is the default and the meaning of every manifest written before this release, so nothing changes for a repository that does not opt in. `spell init` offers the choice only when the machine already has a user tier, only interactively, and **defaults to No**: the field is committed and inherited by every clone, so a shared repository must not stop carrying its spells because one contributor's machine had a tier. Governance, instructions, continuity files, hooks and templates never move tier.
- **`spell update` acts on the opt-out immediately and deletes nothing on its own.** The repository's spell files become orphans: listed on every run with the reason named, and removed only by `spell update --prune`, and only while each file still matches the hash Arcane recorded for it. A file you edited is kept and named. Setting the field back to `"repo"` and running `spell update` reinstalls every spell file, at the same version.
- **`spell doctor` gains a blocking `Spell scope` check** for a repository that opted in: it fails, with `spell init --user` as the remedy, when the user tier is missing, unreadable, empty, or at a different `major.minor` — because an opted-in repository with no store has no spells in any client. `spell status` says `Scope: repo (spells: user tier)`.

### Fixed

- **An orphaned file that is still on disk stays tracked in the manifest** until it is actually removed. It used to be reported once and then dropped, which made the `spell update --prune` the same run had just recommended find nothing on the next invocation, left a file Arcane had written untracked for `spell uninstall`, and would have let a later re-install overwrite an operator's edits to it without a word.
- **Pruning no longer leaves empty directories behind.** Removing a component's files now removes the directories they emptied, stopping at the first non-empty one and never at the repository root.

### Notes

- **Why this matters beyond picker clutter:** while a repository and the user tier both own a spell's name, which copy a client actually runs is not predictable from the documentation — observed directly during this work, where two commands in one session resolved to different tiers. A repository that opts out has no copy of its own, so there is nothing to resolve.

## [1.1.1] - 2026-09-10

Four findings the Codex Support program's own sessions and reviews had left open, closed together.

### Fixed

- **A line-ending rewrite no longer reads as an operator edit.** Recorded file hashes (`fileHashes`, and the user tier's `fanout` record) are now computed over line-ending-normalized bytes, and every comparison against a recorded hash also accepts the raw-bytes digest that earlier versions recorded — so a managed file git rewrote from CRLF to LF (`text=auto eol=lf`, `core.autocrlf`) is refreshed normally instead of being three-way merged, and no migration is needed. A genuine edit inside a CRLF file is still an edit.
- **No delete path takes a manifest path outside the repository any more.** `spell update --prune`'s orphan pruning and both `spell uninstall` loops run the same traversal guard every write path has: an `.arcane.json` entry that resolves outside the target directory is named and skipped, never deleted. The user tier's fan-out validates every recorded key against the home directory before it writes or deletes.
- **`spell report` for an active program no longer goes stale the moment its own regeneration is committed.** The close commit of a program without a `completed:` date is now the most recent commit that touched anything other than the program's own `show-report.{json,html}`, and the cast never counts a commit that touched only those files — so a regeneration commit neither moves the version span nor counts itself, with or without an attribution trailer, whether it is the newest commit or buried under later work. Regeneration commits no longer need to be trailer-free; they only need to touch the report files alone, which is what `spell report` produces. The two closed programs' committed reports are unchanged by this rule.
- **The user tier's Claude Code command quotes its `@` include when the store path contains whitespace** (`@"C:/Users/Jane Doe/.arcane/spells/<id>.md"`), Claude Code's documented form for such paths. The whitespace-free case is byte-identical to `1.1.0`; the next `spell update --user` on an affected machine rewrites the 41 commands.

## [1.1.0] - 2026-09-10

The user tier: install the spell library once per machine and let every client find it from any repository (CS-04 of the Codex Support program, [ARC-045](DECISIONS.md#arc-045--one-spell-source-thin-client-shims-and-a-user-level-install-tier) decision 3).

### Added

- **`spell init --user`, `spell update --user`, `spell status --user`, `spell uninstall --user`.** The user tier is a store at `~/.arcane/` holding the 41 canonical spells (`~/.arcane/spells/<id>.md`, with its own `.arcane.json`) plus, per spell, one Codex skill at `~/.agents/skills/<id>/SKILL.md` and one Claude Code command at `~/.claude/commands/<id>.md`, both pointing at the spell's absolute path in the store. Codex and VS Code Copilot both read `~/.agents/skills` by default; Claude Code reads `~/.claude/commands`. No VS Code setting is required, and none is written. The tier carries spell delivery only — governance, continuity files and repository configuration stay with the repository. `init --user` asks no question and touches no git state.
- **The manifest records the tier and the fan-out.** `.arcane.json` gains an optional `scope` (`"repo"`, the default and the meaning of every existing manifest, or `"user"`) and, for the user tier, a `fanout` map of every client file Arcane wrote outside the store with its content hash. `update --user` and `uninstall --user` rewrite or delete a client file only while its content still matches that record; an edited one is kept and named, and a same-named file Arcane never wrote is left alone and never claimed. A store spell you edit gets the same three-way merge on `update --user` a repository file gets.
- **`spell doctor` reports the user tier**, non-blocking: not installed (optional), current, behind or ahead of the CLI's `major.minor`, or with client files missing — each with `spell update --user` as the remedy. `spell status` in a repository prints its scope and, when a user tier exists on the machine, that tier's version.

### Fixed

- **`spell update`'s three-way merge fetches the previously published file by its asset path**, so a component installed under a different name than its source (`sourceOverrides` — `.gitattributes`/`.gitignore`, and now the user tier's store) merges against the right base instead of a 404.

### Notes

- **Why there is no VS Code settings snippet:** VS Code's AI settings reference (fetched 2026-09-09) marks `chat.promptFilesLocations`, `chat.agentFilesLocations`, `chat.agentSkillsLocations` and `chat.instructionsFilesLocations` as deprecated ("This setting and the Local agent will be removed in a future release"), and its agent-skills page lists `~/.agents/skills` and `~/.claude/skills` among the locations read by default. The user tier lands where Copilot already looks. The Claude Code file is a *command* rather than a skill because Copilot scans `~/.claude/skills` too — a skill there would list every spell twice.
- **Precedence:** Claude Code runs a personal command over a project command of the same name, so in a repository that still carries its own spells `/spell-*` runs the user tier's copy. Codex and Copilot list both tiers' entries until the repository opts out (CS-05).
- Codex following a user-level skill to an absolute path from an unrelated directory was observed live (`docs/research/skill-discovery-smoke-tests.md`); the Claude Code and Copilot user-level checks are recorded as an operator item (`docs/plans/codex-support/OPERATOR-QUEUE.md` Q-005).

## [1.0.0] - 2026-09-09

The first stable-contract release: one authored source per spell, and every AI client a thin generated shim over it. This is the one breaking change of the Codex Support program (CS-03, [ARC-045](DECISIONS.md#arc-045--one-spell-source-thin-client-shims-and-a-user-level-install-tier)); everything after it is additive again.

### Changed

- **BREAKING: the canonical spell source moves from `.github/prompts/<id>.prompt.md` to `.arcane/spells/<id>.md`** — the one relocation [ARC-033](DECISIONS.md#arc-033--docs-mode-subject-root-content-sensitivity-and-capability-scoped-spell-components) decision 1 anticipated needing. The 41 spell files moved with their history and byte-identical frontmatter; the shared fragments moved to `.arcane/spells/_fragments/`. `.github/prompts/<id>.prompt.md` is now a generated Copilot shim: the canonical frontmatter block verbatim (so Copilot's picker sees exactly the fields it saw before), then one paragraph with a relative link to the canonical file and the read-and-follow sentence proven live against Codex. The Claude Code command (`@.arcane/spells/<id>.md`) and the Codex skill point at the same file. No client file carries prose of its own any more, and `check:self-host-parity` re-renders all 123 shims from their sources on every build.
- **Every `spells-*` component now lists four files per spell** — the canonical source first, then the Copilot, Claude Code and Codex shims — so `spell init`, `spell update` and `spell uninstall` carry a spell as one unit. `spell init`'s summary counts spells once, not per client.
- **Where a spell is authored is written down** in `spell-authoring-standards.md` (D2), `portable-bootstrap.md` ("Where Documents Live"), `universal-agent-rules.md`, `git-conventions.md`'s scope table and `agent-output.instructions.md`: edit `.arcane/spells/<id>.md`, never a shim. Relative links inside a spell resolve from two levels below the repo root, exactly as they did from `.github/prompts/`.

### Fixed

- **`spell update` never merges an operator's edit into a generated shim.** Updating a hand-edited prompt to a shim-shaped vendor file used to either three-way merge "successfully" — the shim with the edit dangling underneath, reported as `Merged your edits` — or write conflict markers over a body that was gone; both were observed against a real consumer fixture before the migration was designed. A customized Copilot prompt, Claude command or Codex skill is now kept byte-untouched, the canonical spell is written beside it, one summary names each such file with the remedy, and the previously recorded hash is carried forward so the next update recognizes the customization again. Dry-run reports the same decision.
- **An operator's edit now survives every update, not just one.** After a successful three-way merge, `spell update` recorded the merged file's hash as "what Arcane last wrote", so the *next* update read the file as untouched and overwrote it — reproduced against real published history: update one merged the edit, update two lost it. Present since ARC-038 shipped in `0.32.0`. The recorded hash is now the vendor content's, so later updates merge again against the right base; the "could not fetch the merge base" branch keeps the recorded hash for the same reason.
- **A same-version `spell update` restores missing tracked files** instead of stopping at "Already up to date." — the remedy after porting a customized shim's edits into the canonical spell: delete the old file, commit, run `spell update`, and the generated shim comes back. Only files that are tracked, absent and vendor-owned are written; `initOnly` files (EF-17) and user-owned `skipExisting` files (`TODO.md`, `.mcp.json`, `journal/.gitkeep`) keep their version-change-only backfill, so a file you deleted on purpose does not return on every run.
- **Four long-broken links now resolve:** `spell-brainstorm`'s `../../../TODO.md`, `spell-arcane-version`'s bare `.arcane.json`, and the two `development-methodology.md` links that pointed at `../.github/prompts/…` from inside `.arcane/governance/`.

### Migration

Run `spell update` from a committed, clean working tree (it refuses to run otherwise).

| Your install | What happens |
|---|---|
| `0.32.0` or later, spells untouched | Every prompt, command and skill is replaced by its shim and `.arcane/spells/` appears with the 41 canonical files. Nothing to do. |
| `0.32.0` or later, a prompt or command hand-edited | That file is kept exactly as you left it and named in the summary; it keeps working in its client. To converge: move the edit into `.arcane/spells/<id>.md`, delete the old file, commit, run `spell update` again. |
| Before `0.32.0` (no recorded file hashes) | Files are overwritten, as they always were for such installs — commit first, then recover any local edit from git history and port it into `.arcane/spells/<id>.md`. |

Governance content under `.arcane/governance/` is unaffected. A consumer on an older CLI sees no change until it updates.

### Notes

- CS-03 of the Codex Support program (`docs/plans/codex-support/`). The user-level install tier (CS-04), the repository opt-out (CS-05) and agent delivery at the user tier (CS-06) follow as minor releases on this contract.

## [0.39.0] - 2026-09-09

Adds OpenAI Codex as a third client target, and opens the Codex Support program.

### Added

- **Every spell now generates a Codex skill** — `.agents/skills/<id>/SKILL.md` beside the existing Copilot prompt and Claude command, all three rendered from the one canonical `.github/prompts/<id>.prompt.md` source ([ARC-039](DECISIONS.md#arc-039--build-time-spell-compiler-generated-client-stubs-and-shared-prose-fragments)). Codex has no `@include`, so the skill body tells the agent to read the prompt at its path and follow it as the complete workflow — a mechanism verified against the real Codex CLI before it was designed in ([#221](https://github.com/codemagicianhq/arcane/pull/221)).
- **[ARC-044](DECISIONS.md#arc-044--client-architecture-files-first-state-contract-and-a-local-presence-channel) — client architecture:** a versioned `spell state --json` export and a local presence channel; files remain the only source of truth, the export is derived and additive-only ([#218](https://github.com/codemagicianhq/arcane/pull/218)).

### Fixed

- **Two more full-suite timeout flakes budgeted** (`session-continuity`, `adr-reference-gate`), with the remaining 34 heavy tests surveyed ([#217](https://github.com/codemagicianhq/arcane/pull/217)).

### Notes

- **The Codex Support program opened** (`docs/plans/codex-support/`, CS-00, [#220](https://github.com/codemagicianhq/arcane/pull/220)): its plan, PRD, delegation record, and the skill-discovery smoke tests that decided the shim design above.

## [0.38.3] - 2026-09-06

Closes the Show Report program.

### Changed

- **Vendored arcane-ui v2.1.7's compiled template** — the pull request was opened automatically by arcane-ui's own pipeline (SR-07) because the compiled template changed ([#216](https://github.com/codemagicianhq/arcane/pull/216)).
- **Show Report closed at SR-08** — verdict GO, with two recorded deviations ([#214](https://github.com/codemagicianhq/arcane/pull/214)).

### Fixed

- **`hub-retrofit`'s 24 CLI-roundtrip tests had no timeout overrides** on vitest's 5-second default while each drove a real init/update roundtrip ([#215](https://github.com/codemagicianhq/arcane/pull/215)).

## [0.38.2] - 2026-09-05

### Fixed

- **Reports read "1 commit" and "1 item" at a count of one.** arcane-ui 2.1.4 re-vendored, consuming the singular flags added in `0.38.1`; the fix needed both sides ([#213](https://github.com/codemagicianhq/arcane/pull/213)).
- **Two heavy tests given real timeout budgets**, closing a flake found by reading the pre-push hook's log rather than retrying it ([#213](https://github.com/codemagicianhq/arcane/pull/213)).

## [0.38.1] - 2026-09-05

### Added

- **`buildShowReportView()` supplies `cast[].isSingular` and `parkedIsSingular`.** Mustache can branch on a name's truthiness but never on a value, so `{{commits}} commits` cannot pick its noun form — the flag has to come from this side ([#212](https://github.com/codemagicianhq/arcane/pull/212)).

## [0.38.0] - 2026-09-05

Replaces the interim report template with arcane-ui's real compiled build, behind a gate that renders it.

### Added

- **`check:report-template`, a gate that actually renders the template.** `check:report` only proves the committed reports match a regeneration; a template whose tags name fields that do not exist still regenerates byte-identically, because it is consistently wrong ([#209](https://github.com/codemagicianhq/arcane/pull/209)).
- **Gate rules for the provenance label and flag pluralisation**, both user-visible text in every report ([#210](https://github.com/codemagicianhq/arcane/pull/210)).

### Changed

- **The v0 interim template is replaced by arcane-ui 2.1.3's compiled build (SR-06).** It took four arcane-ui builds to pass the gate ([#211](https://github.com/codemagicianhq/arcane/pull/211)).

## [0.37.0] - 2026-09-05

### Changed

- **BREAKING: `show-report.json`'s `colophon` block is now `provenance`, and `schemaVersion` goes 1 → 2.** "Colophon" is a publishing term, not a software one; `naming-conventions.md` requires the established industry term where one exists ([#208](https://github.com/codemagicianhq/arcane/pull/208)).

## [0.36.1] - 2026-09-04

### Added

- **`rowCount` per section and a top-level `parkedCount` are precomputed**, because mustache cannot count a list and the compiled template needs "N items" labels ([#207](https://github.com/codemagicianhq/arcane/pull/207)).

### Changed

- **The SR-06 gate is hardened**, and the approved SR-05a design lands as the build spec ([#205](https://github.com/codemagicianhq/arcane/pull/205), [#206](https://github.com/codemagicianhq/arcane/pull/206)). [ARC-043](DECISIONS.md#arc-043--show-report-rows-carry-no-emoji-category-selects-the-mark) accepted ([#204](https://github.com/codemagicianhq/arcane/pull/204)).

## [0.36.0] - 2026-09-03

### Changed

- **BREAKING: `ShowReportRow.glyph` is removed from schema v1 — category selects the mark instead of a per-row emoji.** The first design review against real data killed the emoji and exposed three generator defects only a real corpus could surface ([#203](https://github.com/codemagicianhq/arcane/pull/203)).
- **The arcane-ui cross-repo brief for SR-05a/SR-05b is recorded**, and the session handoff refreshed after running four items stale ([#201](https://github.com/codemagicianhq/arcane/pull/201), [#202](https://github.com/codemagicianhq/arcane/pull/202)).

## [0.35.1] - 2026-09-03

### Added

- **SR-04 — `## For the record` in both `spell-create-pull-request` templates.** An epic's reader-facing sentence is now authored while the work is fresh rather than reconstructed later from commit subjects; the heading is omitted entirely when the PR is not one epic of a tracked program ([#200](https://github.com/codemagicianhq/arcane/pull/200)).

## [0.35.0] - 2026-09-03

Show Report's data pipeline, renderer and `spell report` command — in the first build of them that actually reached npm (see Notes).

### Added

- **SR-01 — the report data pipeline:** plan, queue, ledger and decisions parsers, the schema v1 model, and a git-derived version span and cast ([#194](https://github.com/codemagicianhq/arcane/pull/194)).
- **SR-02 — renderer, v0 template, and the `check:report` gate.** One five-character escaper per tag; `descriptionHtml` is the only triple-mustache field, re-admitting only code spans and https links ([#197](https://github.com/codemagicianhq/arcane/pull/197)).
- **SR-03 — the `spell report` command.** The generation core moved to `src/modules/show-report/generate.ts` so the shipped command can use it; `scripts/` is not bundled into the published package ([#198](https://github.com/codemagicianhq/arcane/pull/198)).
- **[ARC-042](DECISIONS.md#arc-042--show-report-compiled-template-distribution-model-and-program-decisions) accepted** ([#196](https://github.com/codemagicianhq/arcane/pull/196)).

### Fixed

- **`publish.yml` checked out a shallow clone while `ci.yml` fetched full history.** Show Report's golden-parity test derives the version span and cast from git history; in the shallow clone those fields vanished, the test reported the omission as drift, and the publish job failed minutes after CI had passed on the same commit. `fetch-depth: 0` now matches across the three workflows, `check:report` says "cannot verify in a shallow clone" instead of failing, and `spell report` warns that the span and cast will be omitted ([#198](https://github.com/codemagicianhq/arcane/pull/198)).

### Notes

- **`0.34.3` was tagged and released on GitHub but never reached npm** — it is the release the failure above broke. SR-01, SR-02 and the ARC-042 acceptance were cut as `v0.34.3` on 2026-09-03 and first published as part of `0.35.0` later the same day.

## [0.34.2] - 2026-09-03

### Added

- **`web-discoverability-standards` gains WD-16–WD-18** for AI retrieval agents, freshness, and measurement, wired into `spell-make-discoverable`. WD-16 separates a retrieval-class agent (never disallow when AI visibility is a goal) from a training crawler, which is an explicit, separate decision ([#193](https://github.com/codemagicianhq/arcane/pull/193)).

### Fixed

- **Doc drift across the HIGH/Medium/Low findings** of a `spell-check-drift` run ([#192](https://github.com/codemagicianhq/arcane/pull/192)); `@humanfs/node` bumped 0.16.7 → 0.16.8 ([#188](https://github.com/codemagicianhq/arcane/pull/188)).

### Notes

- **The Show Report program opened** (`docs/plans/show-report/`, SR-00, [#191](https://github.com/codemagicianhq/arcane/pull/191), [#192](https://github.com/codemagicianhq/arcane/pull/192)): plan, PRD, [ARC-042](DECISIONS.md#arc-042--show-report-compiled-template-distribution-model-and-program-decisions) drafted, and its delegation record.

## [0.34.1] - 2026-09-02

Closes the Lessons Hardening program (LH-13).

### Fixed

- **RCA-001 recorded, and the RCA artifact path moved `governance/rcas/` → `docs/rcas/`** — the original location would have created a second root-level tree. It names the shared root cause behind five Lessons Hardening patterns: static tree-state facts written as prose that nothing re-derives ([#174](https://github.com/codemagicianhq/arcane/pull/174)).

## [0.34.0] - 2026-09-02

### Added

- **The org-token denylist can be supplied from outside the repository** ([ARC-041](DECISIONS.md#arc-041--a-local-out-of-repo-supply-channel-for-the-org-token-privacy-denylist)). When `ARCANE_ORG_TOKENS` is unset, `$ARCANE_ORG_TOKENS_FILE` or `~/.arcane/org-tokens` is read instead, with a structural in-repo refusal rather than a `.gitignore` convention ([#184](https://github.com/codemagicianhq/arcane/pull/184), [#185](https://github.com/codemagicianhq/arcane/pull/185)).

## [0.33.9] - 2026-09-02

### Added

- **`universal-agent-rules` gains advisory rules 25–27**, each grounded in a real incident. Rule 25: never quote a denylisted token, even when documenting its removal — name the class, not the instance ([#183](https://github.com/codemagicianhq/arcane/pull/183)).

## [0.33.8] - 2026-09-02

### Added

- **A follow-up promotion gate (`check:followups`).** Scans recent journals, the active plan, `TODO.md` and the verification ledger for deferral phrases carrying no tracker token, so findings stop being buried in closure prose ([#182](https://github.com/codemagicianhq/arcane/pull/182)).

## [0.33.7] - 2026-09-02

### Added

- **A shipped-state staleness scan (`check:stale-claims`).** Class A fails the build when an `ARC-NNN (Status)` parenthetical in a living doc disagrees with `DECISIONS.md`; Class B reports the softer cases ([#181](https://github.com/codemagicianhq/arcane/pull/181)).

## [0.33.6] - 2026-09-02

### Added

- **A stable-locator citation grammar plus `check:citations`** — path, `path#anchor`, or `path ("unique quoted phrase")`; a bare `path:NNN` is never sufficient in a living doc ([#180](https://github.com/codemagicianhq/arcane/pull/180)).

### Fixed

- **`expandFragment()` now throws on a start/end marker indentation mismatch** instead of silently re-indenting the span from the start marker alone ([#179](https://github.com/codemagicianhq/arcane/pull/179)).

## [0.33.5] - 2026-09-02

### Fixed

- **`check:version-bump` reported a false "no bump required" before commit.** The default mode diffs only `merge-base..HEAD`, blind to uncommitted work — exactly what `spell-bump` Step 1 runs against. New `--staged` and `--working-tree` modes, wired into pre-push ([#178](https://github.com/codemagicianhq/arcane/pull/178)).

## [0.33.4] - 2026-09-02

### Changed

- **README's spell, agent and governance-doc counts are derived from the registry**, not hand-maintained. The spell count alone moved 33 → 41 inside one program ([#177](https://github.com/codemagicianhq/arcane/pull/177)).

## [0.33.3] - 2026-09-02

Opens the Lessons Hardening program (`docs/plans/lessons-hardening/`), which turns the previous program's recurring failure patterns into gates.

### Changed

- **CI evaluates coverage thresholds.** `vitest.config.ts` configured 80% global / 95% critical-path, but CI ran bare `npm test` and never checked them ([#176](https://github.com/codemagicianhq/arcane/pull/176)).
- **Test-suite resilience helpers with enforced conventions** — shared fixture-dir create/remove with retry for the Windows `ENOTEMPTY` window, and an end to line-wrap-fragile assertions ([#175](https://github.com/codemagicianhq/arcane/pull/175)).

## [0.33.2] - 2026-09-01

### Fixed

- **Two stale statements found by `spell-check-drift`**, both claiming the customization/override model was unbuilt and that `arcane update` overwrites an edited standard silently — untrue since ARC-038 shipped in `0.32.0` ([#169](https://github.com/codemagicianhq/arcane/pull/169)).

## [0.33.1] - 2026-09-01

### Changed

- **Become Current's Phase 5 definition-of-done closure.** Of 9 unchecked `TODO.md` items, the 4 that were small and not operator-blocked were implemented — among them ARC-035 decision 4, the closed-PR push warning, now shipped to every consumer tier except `blocked` — and the rest consolidated into a new "Parked — Needs Operator" section and queue item Q-011 ([#168](https://github.com/codemagicianhq/arcane/pull/168)).

## [0.33.0] - 2026-09-01

Implements Become Current's last epic (BC-32): the build-time spell compiler that ARC-039 proposed.

### Added

- **A build-time spell compiler ([ARC-039](DECISIONS.md#arc-039--build-time-spell-compiler-generated-client-stubs-and-shared-prose-fragments)).** `.claude/commands/` stubs and shared prose fragments are generated from each spell's own frontmatter at build time and held to parity by a gate, replacing hand-maintained stubs ([#167](https://github.com/codemagicianhq/arcane/pull/167)).

### Fixed

- **A real client name reintroduced by the closure note about removing it** — the second [ARC-031](DECISIONS.md#arc-031--fictional-venture-names-for-examples-and-a-repository-wide-privacy-gate) catch in a day ([#166](https://github.com/codemagicianhq/arcane/pull/166)).

## [0.32.4] - 2026-09-01

### Fixed

- **A real client name in governance content replaced with a fictional venture ([ARC-031](DECISIONS.md#arc-031--fictional-venture-names-for-examples-and-a-repository-wide-privacy-gate)).** The token is private and configured only in CI, so no local check could have caught it before push ([#165](https://github.com/codemagicianhq/arcane/pull/165)).
- **28 tests failed in any git worktree without its own install/build.** Ten test files hardcoded a `process.cwd()`-relative path to `dist/index.js` or `node_modules/tsx`; resolution now climbs the ancestor chain, bounded to the `arcane-cli` package ([#163](https://github.com/codemagicianhq/arcane/pull/163)).

## [0.32.3] - 2026-09-01

### Fixed

- **8 of 15 rows in `spell-make-discoverable`'s Phase 2 audit table cited a `WD-nn` ID that tested a different claim than the same-numbered rule.** Baked in at authoring, not later drift ([#161](https://github.com/codemagicianhq/arcane/pull/161)).

## [0.32.2] - 2026-09-01

### Changed

- **`cicd-standards.md` split into vendor-neutral Core Principles and an Azure DevOps Profile, with a D2 vendor gate** ([ARC-038](DECISIONS.md#arc-038--content-preserving-updates-and-vendor-neutral-governance-content) decisions 2–3), closing the vendor-neutral backlog item first filed on 2026-07-14 ([#159](https://github.com/codemagicianhq/arcane/pull/159)).
- **Become Current Phase 4 cleanup** — branch dispositions, consistency fixes, ledger reconciliation ([#160](https://github.com/codemagicianhq/arcane/pull/160)).

### Notes

- **`0.32.1` was never published.** Its bump commit exists (`ac1a3d0`), but the release-drift job received an `HTTP 500` from GitHub's Releases API while creating `v0.32.1`, so no tag, no Release and no publish followed. The `cicd-standards.md` change above first reached npm as `0.32.2`, 25 minutes later.

## [0.32.0] - 2026-09-01

### Added

- **`arcane update` preserves your edits ([ARC-038](DECISIONS.md#arc-038--content-preserving-updates-and-vendor-neutral-governance-content) Batch A).** Each installed file records a SHA-256 hash at write time and is three-way merged on update; files predating the field keep the old overwrite behavior. Adds an orphan report and `--prune` ([#158](https://github.com/codemagicianhq/arcane/pull/158)).

## [0.31.0] - 2026-09-01

### Added

- **A consumer-facing secrets pre-commit hook installer ([ARC-037](DECISIONS.md#arc-037--secret-and-org-leak-detection-pre-commit-scan-plus-repository-wide-ci-backstop) Batch B).** The pre-push install and collision-guard machinery is generalized to be hook-name-agnostic and independent of `push_policy`; existing callers are unchanged ([#157](https://github.com/codemagicianhq/arcane/pull/157)).

## [0.30.0] - 2026-09-01

### Added

- **Secret detection for this repository and in CI ([ARC-037](DECISIONS.md#arc-037--secret-and-org-leak-detection-pre-commit-scan-plus-repository-wide-ci-backstop) Batch A).** One shared credential-pattern set backs the copy-time scan, a new repository-wide backstop, and `spell doctor --leaks` ([#156](https://github.com/codemagicianhq/arcane/pull/156)).

## [0.29.6] - 2026-09-01

### Added

- **[ARC-023](DECISIONS.md#arc-023--normative-controls-require-inline-enforcement-contracts) enforcement annotations, batch E** (`git-conventions.md`), closing the sweep ([#154](https://github.com/codemagicianhq/arcane/pull/154)).

## [0.29.5] - 2026-09-01

### Added

- **[ARC-023](DECISIONS.md#arc-023--normative-controls-require-inline-enforcement-contracts) enforcement annotations, batch D** (`agent-policies.md`) ([#153](https://github.com/codemagicianhq/arcane/pull/153)).

## [0.29.4] - 2026-08-31

### Added

- **[ARC-023](DECISIONS.md#arc-023--normative-controls-require-inline-enforcement-contracts) enforcement annotations, batch C** (5 docs) ([#152](https://github.com/codemagicianhq/arcane/pull/152)).

## [0.29.3] - 2026-08-31

### Added

- **[ARC-023](DECISIONS.md#arc-023--normative-controls-require-inline-enforcement-contracts) enforcement annotations, batch B** (9 docs) ([#151](https://github.com/codemagicianhq/arcane/pull/151)).

## [0.29.2] - 2026-08-31

### Added

- **[ARC-023](DECISIONS.md#arc-023--normative-controls-require-inline-enforcement-contracts) enforcement annotations, batch A** (8 docs). Every normative rule now declares `Enforcement: <mode>` — executable check, structured spell gate, verified external platform policy, or honestly-downgraded advisory prose ([#150](https://github.com/codemagicianhq/arcane/pull/150)).
- **Delivery-channels smoke tests** covering `node_modules` traversal and symlink following ([#149](https://github.com/codemagicianhq/arcane/pull/149)).

## [0.29.1] - 2026-08-31

### Changed

- **The `Agent` commit trailer splits into `Agent` / `Persona` / `Role`, plus `Model-Source`.** One trailer conflated runtime identity with persona identity, and `Role` had no defined source; `Role` now derives only from a real roster entry ([#148](https://github.com/codemagicianhq/arcane/pull/148)).

## [0.29.0] - 2026-08-31

### Added

- **`spell-verification-ledger`** — extracts the structured `{claim, method, result, correction}` record that `spell-close-session` used to throw away. A corrected result is framed as the point, not something to hide ([#147](https://github.com/codemagicianhq/arcane/pull/147)).

### Changed

- **`spell ward` guidance names personal identifiers, not just org names.** The gate had found a username in a branch name in a public repo, because whoever seeded the denylist thought only in org terms ([#146](https://github.com/codemagicianhq/arcane/pull/146)).

## [0.28.1] - 2026-08-31

### Added

- **`universal-agent-rules` rule 23 — diff before deleting a duplicate.** A near-identical pair is usually a drifted copy carrying unique content on one side ([#145](https://github.com/codemagicianhq/arcane/pull/145)).

## [0.28.0] - 2026-08-31

### Added

- **`compliance-standards.md` (CS-01–CS-12) and `spell-compliance`** — GDPR, CCPA/CPRA, SOC 2 and HIPAA obligations mapped to concrete SaaS artifacts, plus a read-only self-assessment spell. Arcane's first regulatory coverage ([#144](https://github.com/codemagicianhq/arcane/pull/144)).

## [0.27.0] - 2026-08-31

### Added

- **`mobile-release-standards.md` (MR-01–MR-14) and `spell-eas-store-deploy`** — the EAS Build + Submit pipeline for the App Store and Google Play, distilled from two real dogfooding runs ([#143](https://github.com/codemagicianhq/arcane/pull/143)).

## [0.26.2] - 2026-08-31

### Added

- **A canonical home for research reports** at `docs/research/<topic-slug>.md`, with a required `sources` field and `spell-todo` routing their findings into the backlog ([#142](https://github.com/codemagicianhq/arcane/pull/142)).
- **A registry-driven spell catalog generator.** The README list had drifted — the registry held 38 spells while the README said "34" and "36" in different places ([#141](https://github.com/codemagicianhq/arcane/pull/141)).

## [0.26.1] - 2026-08-31

### Added

- **An MCP fail-fast rule and config scaffold.** One abnormal failure marks a server down for the session — no blind retries, fall back to the documented CLI, report the downgrade. Written after an ops session lost an hour to two consecutive 30-minute hangs ([#140](https://github.com/codemagicianhq/arcane/pull/140)).

## [0.26.0] - 2026-08-31

### Added

- **`spell-scry`** — clears a candidate name before it ships: an outward four-check pass plus a mandatory repo-local collision pass that runs *first*, citing the real ARC-028 workspace incident as the reason ([#138](https://github.com/codemagicianhq/arcane/pull/138)).

## [0.25.0] - 2026-08-31

### Added

- **`spell ward`** — a denylist scan reusing the existing org-token lint engine rather than reimplementing matching, tree-walking and dedup ([#137](https://github.com/codemagicianhq/arcane/pull/137)).

## [0.24.1] - 2026-08-31

### Changed

- **`spell-full-cycle` gains cross-epic coordination**, including re-verifying a handed-in, pre-diagnosed root cause against current source before accepting it into the PRD ([#135](https://github.com/codemagicianhq/arcane/pull/135)).

## [0.24.0] - 2026-08-31

### Added

- **Delegation for solo-operator mode.** A repo with no agent roster had nowhere to record a standing grant, so grants were made ad hoc and forgotten; `.arcane/delegations.json` makes them explicit, structured and git-tracked ([#133](https://github.com/codemagicianhq/arcane/pull/133)).

## [0.23.0] - 2026-08-31

### Added

- **`spell-sync-pull-request`** — a recovery path for a PR that has fallen behind its target. `spell-create-pull-request` and `spell-ship` both detected a conflicted branch and refused, with no way to tell a mechanically-safe conflict from a genuinely ambiguous one ([#131](https://github.com/codemagicianhq/arcane/pull/131)).

## [0.22.14] - 2026-08-31

### Added

- **`spell doctor` verifies platform branch and merge policy against what governance says (BC-17).** Paper-versus-enforced drift had already bitten this repository once, found only by reading a ruleset's raw JSON by hand. A new `platform-policy` module keeps pure `evaluate*` functions — unit-tested against this repo's own real ruleset in both its healthy and its historically drifted shape — apart from thin `gh api` / `az repos policy list` fetchers. The GitHub path queries Rulesets, never the classic branch-protection endpoint alone (which still answers "Branch not protected" for a repo with active Rulesets), and detects the `required_linear_history` × `allowed_merge_methods` interaction that silently blocks merge commits. The Azure DevOps path is implemented from the documented API shape only, not live-verified ([#129](https://github.com/codemagicianhq/arcane/pull/129)).

## [0.22.13] - 2026-08-31

### Added

- **A spell routing layer (BC-16).** Agents were never told spells are the mandatory path for lifecycle operations — a session followed the git conventions correctly and still committed ad hoc instead of invoking `spell-commit-work`. `CLAUDE.md`, `.github/copilot-instructions.md` and `AGENTS.md` now carry a generated routing section ahead of the roster table, every `.claude/commands/spell-*.md` gained a `description:` with "Use PROACTIVELY" wording — the lever that makes Claude Code self-select a spell — and `universal-agent-rules.md` gains rule 22 ([#127](https://github.com/codemagicianhq/arcane/pull/127)).

## [0.22.12] - 2026-08-31

### Added

- **Session handoff durability (BC-15, [ARC-040](DECISIONS.md#arc-040--session-handoff-durability-pointer-never-sole-carrier)).** The close-session handoff block is overwritten at every close and consumed at every open; one overwrite lost an unfinished task. `spell-close-session` now registers unfinished work on a durable, tracking-mode-aware surface (`TODO.md`, or the tracker work item) before writing the handoff, whose Notes field is formally pointer-only; `spell-open-session` runs a durability check and surfaces Last completed step, Blockers and Notes — fields close-session wrote but nothing had ever read back ([#125](https://github.com/codemagicianhq/arcane/pull/125)).

## [0.22.11] - 2026-08-31

### Changed

- **Generated state diagrams, Tier 3 harmonization (BC-14 R11, [ARC-036](DECISIONS.md#arc-036--generated-state-diagrams-deterministic-mermaid-for-computed-spell-state)).** `spell-explain-concept`, `spell-architect` and `spell-scope` repoint their independently restated Mermaid prescriptions to universal rule 8 as the single source, classified as agent-authored design output rather than generated state; `spell-security-review` gains the trust-boundary flowchart the PRD assumed it already had. Closes BC-14 ([#123](https://github.com/codemagicianhq/arcane/pull/123)).

## [0.22.10] - 2026-08-31

### Added

- **Generated state diagrams for four more spells (BC-14 R10).** `spell-review-batch` (a GO/NO-GO flowchart), `spell-manifest` (a routing flowchart), `spell-full-cycle` (a phase `stateDiagram-v2`) and `spell-close-session` (the session's own commit `gitGraph`, tied to its real per-commit verification) — each built from data the spell already gathers, each behind an applicability guard. Mermaid's `timeline` type was deliberately avoided: its own docs mark it experimental ([#121](https://github.com/codemagicianhq/arcane/pull/121)).

## [0.22.9] - 2026-08-31

### Added

- **Branch/PR topology diagrams in `spell-commit-work` and `spell-create-pull-request` (BC-14 R9).** One shared `gitGraph` built from the `git log origin/<target>..HEAD` both spells already run; no new git command is introduced ([#119](https://github.com/codemagicianhq/arcane/pull/119)).

## [0.22.8] - 2026-08-31

### Added

- **`spell status` renders the version-drift diagram the prompt already described (BC-14 R8).** `status.ts` had never actually compared the manifest version to the installed package's. A new `diagram-generator` module produces the same `gitGraph` as `spell-open-session` from the same three inputs, so CLI and prompt agree by construction: aligned plain text on a TTY, a fenced Mermaid block when piped ([#117](https://github.com/codemagicianhq/arcane/pull/117)).

## [0.22.7] - 2026-08-31

### Added

- **Generated state diagrams, Tier 1 (BC-14 R1–R7, [ARC-036](DECISIONS.md#arc-036--generated-state-diagrams-deterministic-mermaid-for-computed-spell-state)).** Universal rule 8 gains the convention, and `spell-open-session`'s two-axis version check emits a canonical `gitGraph` when either axis drifts — built only from values actually known, and suppressed entirely when both axes are current ([#114](https://github.com/codemagicianhq/arcane/pull/114), [#115](https://github.com/codemagicianhq/arcane/pull/115)).

### Notes

- Three ADRs were drafted in this release and implemented in `0.30.0`–`0.33.0`: [ARC-037](DECISIONS.md#arc-037--secret-and-org-leak-detection-pre-commit-scan-plus-repository-wide-ci-backstop) secret and org-leak detection ([#106](https://github.com/codemagicianhq/arcane/pull/106)), [ARC-038](DECISIONS.md#arc-038--content-preserving-updates-and-vendor-neutral-governance-content) content-preserving updates and vendor-neutral governance ([#108](https://github.com/codemagicianhq/arcane/pull/108)), and [ARC-039](DECISIONS.md#arc-039--build-time-spell-compiler-generated-client-stubs-and-shared-prose-fragments) the build-time spell compiler ([#110](https://github.com/codemagicianhq/arcane/pull/110)). The [ARC-029](DECISIONS.md#arc-029--best-practice-first-solution-selection-standard) acceptance brief was prepared ([#112](https://github.com/codemagicianhq/arcane/pull/112)).

## [0.22.6] - 2026-08-31

### Added

- **GitHub as a first-class `external_provider` (BC-09).** `ExternalProvider` becomes `"ado" | "github" | "jira" | "other"`, and `spell-bug`, `spell-plan`, `spell-scope`, `spell-suggest-feature` and `spell-full-cycle` gain real `gh issue` branches beside their `az boards` ones, every flag checked against the live CLI's `--help`. Not a reversal of [ARC-032](DECISIONS.md#arc-032--persisted-tracking-configuration-tracking_mode-and-external_provider-in-the-manifest), which dropped a `"github"` value that nothing read — this one ships with behavior behind it ([#104](https://github.com/codemagicianhq/arcane/pull/104)).
- **`spell <unrecognized>` now says so (BC-08).** It fell through to the welcome screen with exit code 0, because the root action claims dispatch before Commander's unknown-command event can fire. It now prints the unrecognized name, the `/spell-<name>` guidance and the real command list — generated from `program.commands`, not a hand-written count that had already gone stale — and exits 1 ([#102](https://github.com/codemagicianhq/arcane/pull/102)).

## [0.22.5] - 2026-08-31

### Added

- **A doc-ID link integrity gate (BC-06).** `check:adr-references` now detects "cross-repo-hazard" links — same-repo links to this repository's `DECISIONS.md` cited from a file that ships to consumers, where `src/assets/DECISIONS.md` is an empty starter template and the link dead-ends or resolves to the wrong document. Four live instances were found and fixed ([#98](https://github.com/codemagicianhq/arcane/pull/98)).

### Fixed

- **Shipped spell prompts cite ADRs as bare IDs, not full URLs.** The first commit of the change above converted the hazards to canonical GitHub URLs; CI's org-token portability gate rejected it, because a full URL bakes the project's own GitHub org into content that ships byte-for-byte into every consumer repo. The rule is now: a bare, unlinked ID in shipped prompts and instructions; links only in governance docs ([#98](https://github.com/codemagicianhq/arcane/pull/98)).

## [0.22.4] - 2026-08-31

### Fixed

- **Roster integrity batch (BC-04).** `spell agents init/sync` now exit non-zero when a rostered role's definition genuinely fails to resolve, instead of passing CI silently; [ARC-012](DECISIONS.md#arc-012--generated-distributable-artifacts-require-a-parity-guard)'s parity guard now covers `.github/agents/*.agent.md`, and its first run found `mercurio.agent.md` still shipping a literal `[object Object]` from a defect whose source YAML had been fixed in PR #45 but whose generated snapshot never was ([#94](https://github.com/codemagicianhq/arcane/pull/94)).

## [0.22.3] - 2026-08-31

### Added

- **Content-verified branch deletion (BC-03).** `git-conventions.md` gains the canonical procedure: provider PR status first when available, otherwise `git cherry` patch-id equivalence plus a resulting-content check for `+`-flagged commits, because a squash merge or an independently re-authored commit carries already-landed content under a different patch-id. `spell-close-session` gains a real idempotent sweep step. Run here for real, it found two "unmerged" branches whose content was byte-identical to `main` ([#92](https://github.com/codemagicianhq/arcane/pull/92)).

### Fixed

- **`copy-assets` prunes `dist/assets/` before copying (BC-02).** A deleted source file (`spell-eas-ios-deploy.prompt.md`) had survived every direct `tsx scripts/copy-assets.ts` run as an orphan. Found while fixing it: the script called `main()` unguarded at module scope, so importing it from a test rebuilt the real `dist/assets/` as a side effect and raced `init.test.ts`'s built-CLI subprocesses ([#90](https://github.com/codemagicianhq/arcane/pull/90)).

## [0.22.2] - 2026-08-31

Opens the Become Current program (`docs/plans/become-current/`) — an autonomous full-cycle loop through the intake backlog, which runs through `0.33.2`.

### Added

- **[ARC-035](DECISIONS.md#arc-035--auto-merge-requires-a-clear-review-round) — auto-merge requires a clear review round (BC-01).** A new "Review round clear" CI job blocks on an outstanding, un-dismissed `CHANGES_REQUESTED` review rather than on approval count, since GitHub blocks self-approval and this repository's author and reviewer are routinely the same identity; `spell-review` and `spell-review-batch` post and later dismiss that formal state. The closed-PR push warning ships for this repository's own pre-push hook only — recorded as a verified gap rather than claimed ([#88](https://github.com/codemagicianhq/arcane/pull/88)).
- **[ARC-036](DECISIONS.md#arc-036--generated-state-diagrams-deterministic-mermaid-for-computed-spell-state) — generated state diagrams**, promoted from a PRD ([#84](https://github.com/codemagicianhq/arcane/pull/84)) and implemented across `0.22.7`–`0.22.11`.

### Fixed

- **The pre-push hook aborted under husky's `sh -e`** whenever `git symbolic-ref` (detached HEAD) or `gh pr view` (no PR yet) exited non-zero — taking `npm test` down with it. Both substitutions are now guarded ([#88](https://github.com/codemagicianhq/arcane/pull/88)).

## [0.22.1] - 2026-08-25

### Fixed

- **`cicd-standards.md`'s Azure DevOps branch-policy table said the opposite of [ARC-009](DECISIONS.md#arc-009--session-naming-and-pr-lifecycle-reliability-policy) and `git-conventions.md`** — "squash merge or rebase (no merge commits)" where both sanction merge (no fast-forward) and rebase-and-fast-forward while disallowing squash. Found while checking a remembered ADO restriction against two real repositories, one of which had already drifted into mixed merge strategies because the rule lived only in prose ([#79](https://github.com/codemagicianhq/arcane/pull/79)).

## [0.22.0] - 2026-08-24

Adds web discoverability and external-verification governance, plus a spell that applies them.

### Added

- **`web-discoverability-standards`** — how a web property becomes retrievable by search-engine crawlers and by the AI assistants that answer from a search index. 15 rules (`WD-01`–`WD-15`): server-rendered per-route metadata over both a full SSR pipeline and a client-side head library; a real not-found status instead of an always-200 catch-all; runtime-resolved environment values, never build-time; never routing crawler traffic through user-traffic side effects; a sitemap that reuses the app's own visibility rule; a robots-exclusion allow-rule that must be declared to escape a broader disallow; crawl control and index control as two mechanisms that close different gaps; DNS-apex registration, instant-notification coverage, and why search-index presence is the real AI-retrieval lever; two independent escaping treatments for untrusted metadata; and why an image generator can't reproduce exact type or logos.
- **`external-verification-standards`** — rules for confirming a write actually took effect in a system you don't control: a console, a pipeline, a DNS zone, any third-party API. 6 rules (`EV-01`–`EV-06`): persisted state is proved only by re-reading it, never by the interface that accepted the write; a green pipeline exit proves the pipeline ran, not that the live system reflects the change; when a system's own readout disagrees with intent, escalate rather than retry blind; comparison-critical values must never carry embedded commentary; enumerate before writing to shared external state, and prefer additive over replace; rule out real causes before attributing a fresh "not found" to propagation lag.
- **`spell-make-discoverable`** — audits and fixes a web property's discoverability against both standards docs above, citing rule IDs rather than restating them. Read-only by default; every outward-facing action (a DNS write, a console submission, a crawl-notification ping) is confirmed individually with current state printed first, and nothing is written without an explicit approval gate. Joins the `spells-build` component group.

## [0.21.1] - 2026-08-24

Names ARC-028's central concept and moves the record to **Accepted**, closing the last open item from the 2026-08-15 concurrency spike.

### Changed

- **[ARC-028](DECISIONS.md#arc-028--concurrency-and-isolation-model-for-parallel-work) is Accepted.** Its container concept is a **session workspace** — one session workspace = one instance of one isolation primitive (primary checkout · linked worktree · full clone), and the unit a control center renders as a tile. Every implementation item this repository owns was already shipped in `0.21.0`; the record was held at `Proposed` solely for the name.
- **The name was resolved by the Naming Test, not the four-check.** `naming-conventions.md` holds that a universe name must be *earned by the absence of an established industry term*. No such absence exists: four independent tools already call this a workspace (git worktree · VS Code workspace · Codespaces · OpenClaw workspace), and that convergence is evidence the word is right rather than evidence it is taken. The concept takes **no lore word** — the first ARC naming decision to land that way. The vetted candidates (Grotto, Cloister, Vestry, Oratory) stay on the record unused.
- **`git-conventions.md` gains "Where Work Runs — Session Workspaces"** under Branch Discipline, defining the noun at the point a reader first meets the primitives. Mechanical git vocabulary is deliberately unchanged — `worktree`, `primary checkout` and `clone` remain correct in every command, path and error message, per ARC-028 item 10's own rule that the product noun never replaces git terms in technical payloads.

### Notes

- **The term is qualified because the bare word was already taken — internally.** A check at pick time found `workspace` load-bearing in two other Arcane senses: the agent sandbox root (`workspace-{agent}` in `agent-approved-paths.md` and `agent-policies.md`) and the shipped, validated schema fields `openclaw.workspace_root` / `workspace_prefix` (`src/types.ts`, `src/modules/agent-schema.ts`) that consumers already set. The second is sharper than it looks: Arcane ships one of the four colliding meanings the ADR set out to disambiguate. Taking the bare word would have used one noun for three things — the internal-collision class that flagged **Cabinet** against DMC's File Cabinet — so `session workspace` was adopted instead, with no rename and no schema change.
- **Four-check disposition, recorded rather than skipped:** a generic industry term cannot be appropriated from a coiner, so checks 1–3 do not bind and the trademark caveat is moot. Check 4 (first association) does bind, and its answer — the overloaded set itself — is exactly why the qualifier is mandatory rather than stylistic.

## [0.21.0] - 2026-08-23

Completes every [ARC-028](DECISIONS.md#arc-028--concurrency-and-isolation-model-for-parallel-work) follow-up this repository owns, and files one new intake finding.

### Changed

- **Governance now distinguishes the primary checkout from a linked worktree** (ARC-028 R1/R8). `git-conventions.md` previously told every session to `git checkout main` after merge and `git branch -d` the topic branch. From a linked worktree both **fail** — git refuses to check out one branch in two worktrees, and refuses to delete a branch still attached to one. The session-branch close, the docs-workflow fast-forward merge, the Magus+ self-merge step, and Post-Merge Cleanup are each scoped to the primary checkout, with the worktree path spelled out beside them: push → PR → `git worktree remove` from the primary vantage point. Both refusals were verified against real git rather than assumed, and the text says explicitly that they are the guardrail ARC-028 leans on, not an obstacle to force past with `-D`.
- **`spell-open-session` selects the isolation primitive before anything is written.** Repo-state management → primary checkout; primary occupied → linked worktree; unattended automation → full clone; otherwise the do-nothing default. Overlapping footprints override the choice and serialize (R4), because isolation hides collisions until merge review rather than preventing them.
- **`spell-close-session` no longer ends a worktree session by checking out trunk.** It detects the primitive with `git rev-parse --path-format=absolute --git-common-dir` vs `--git-dir` and forks: the primary path is unchanged, the worktree path reports the worktree and branch for removal from another vantage point and verifies the merge against the remote-tracking ref instead. `--path-format=absolute` is load-bearing — without it `--git-dir` is absolute and `--git-common-dir` relative from any subdirectory, so every primary checkout reads as a worktree.
- **`spell-implement`, `spell-full-cycle` and `spell-ship` scope their trunk-sync and cleanup steps too.** All three began with an unconditional `git checkout main`, which fails in a linked worktree — and in `spell-implement` and `spell-full-cycle` it is step 0, before any work, whose only stated failure branch covers a `pull` failure rather than the `checkout` that actually fails. In `spell-ship` it fails *first* in the cleanup block, leaving the remote-branch deletion half-done.
- **`agent-policies.md` no longer contradicts `git-conventions.md`.** It carries a near-duplicate of the Agent Workflow whose Magus+ step and ff-only recovery block were left unscoped, so the two governance documents gave opposite instructions on the same question. A Magus+ agent in a worktree reading the wrong one would attempt a local ff-merge that git refuses.
- **The worktree refusals are stated conditionally, because they are conditional.** They hold when a working tree actually holds trunk. A bare repository with worktrees attached — a common agent-fleet layout — usually has none, and there both commands succeed; the prompts now check `git worktree list` rather than asserting the failure, and name the bare repository as the removal vantage point instead of a primary checkout that does not exist.
- **`spell-full-cycle` requires a footprint comparison before running epics concurrently**, naming shared sequences (migration numbers, generated indexes, lockfiles) as the axis people miss. Backed by the recorded evidence: a four-epic parallel run produced two duplicate migration numbers and two conflicting imports, invisible until human review; a serialized three-epic re-run produced zero.
- **`threat-model.md` no longer marks credential exposure "Mitigated".** The listed mitigation was entirely storage conventions with nothing verifying them; the row now states that detection is not implemented and says to rotate any credential that reaches a commit.

### Added

- **[EF-35](docs/intake/batch-001/EF-35.md)** — secret-handling policy is stated in five governance documents but no detection mechanism exists anywhere: no scanner on the commit path, the push path, or in CI, and nothing configuring GitHub's own secret scanning. Routed to an ADR rather than implementation, because the real decision is where the check binds and what it may block — and it must extend ARC-034's pre-push hook rather than compete for `core.hooksPath`.

### Notes

- **A repository-wide check now enforces the scoping**, rather than tests that only assert about the files a pass happened to touch. It fails if any distributed prompt or governance document contains a trunk checkout without primitive scoping nearby. The first pass at this work shipped green while three spells still carried an unconditional `git checkout main` — one in a file that same change edited — because every test was a positive assertion and nothing asked "is there anywhere else?".
- ARC-028's naming four-check ran and **Chamber failed it** — OpenChamber (9.1k★, "an agentic development environment" organised around Sessions), cirruslabs/chamber (agent isolation in VMs), and Chamber YC W26 all occupy the same audience, with segmentio/chamber owning first association. The naming rollout stays parked; vetted alternatives are recorded in the ADR. ARC-028 remains Proposed for that reason alone — every implementation follow-up this repository owns is now done, and the DMC rendering contract belongs to a different repository.

## [0.20.2] - 2026-08-23

More push-safety fixes, from a review that attacked the shipped `0.20.1` rather than reading it. **Two of these let a single ordinary command deliver the full history while `spell doctor` reported the repository blocked.** If you use `push_policy: "blocked"`, upgrade and re-run `spell doctor`.

### Fixed

- **The pre-push hook did not exist in any linked worktree.** `core.hooksPath` was written as the relative literal `.arcane/hooks`, and git resolves a relative hooks path against *each worktree's own top level* — but the hook file is untracked and exists only in the checkout that created it. So every linked worktree inherited the config and had no hook, meaning `git push <url>` (the bypass only the hook covers) succeeded in one ordinary command, no `--no-verify` needed. This was not an edge case: Arcane's own methodology (ARC-028 R3) sends concurrent sessions into linked worktrees, so the control was absent exactly where the tool tells you to work. `core.hooksPath` is now absolute and anchored on the common git directory, so every worktree resolves to the one real hook.
- **`spell init` in a subdirectory installed the hook where git never looks.** `--is-inside-work-tree` is true from anywhere in a repository, so initialising inside a monorepo package wrote the hook under that package while pointing repository-wide `core.hooksPath` at a path git resolves from the root. The hook layer was absent throughout the repository, `doctor` reported it in place, and the repository's own `.git/hooks` stopped firing as collateral. The hook is now always installed at the repository root.
- **Taking `core.hooksPath` silently disabled hooks in git's default directory.** The R7 collision guard only looked for a competing `core.hooksPath`, so a repository with ordinary `.git/hooks/*` — no hook manager, no config key to collide with — had every one of them switched off without warning. That is the exact harm R7 exists to prevent, reached by the one route it was not watching. Installation now refuses and names the hooks it would have displaced (git's inert `.sample` templates are ignored).
- **A push URL contributed by an `include`d config file defeated the block and was reported as covered.** Git labels such a value as `local` scope, so the outer-scope refusal never fired and `--replace-all` could not remove it. Rather than enumerate another special case, applying the block now **re-reads what git actually resolves afterwards** and fails unless the result is exactly the sentinel.
- **A partial unblock closed its own retry path.** `spell unblock-push` returned early on `push_policy: "open"`, which is precisely what a partial lift had already written — so the failed attempt made the command refuse to finish the job. It now gates on whether the controls are actually in force.
- **A stale marker could delete a genuine push URL.** `git config --unset-all` exits 5 for an absent key; letting that throw skipped the bookkeeping cleanup, and a surviving "there was no push URL here" marker made the next block record nothing and the restore after that remove a real URL while reporting success.
- **`core.hooksPath` set at worktree scope is now removable**, and a push URL at worktree scope is treated as overridable rather than foreign — a repository can write both itself.
- **The remedy string for an unparseable scope no longer suggests `git config --unknown`**, which is not a command.

## [0.20.1] - 2026-08-23

Fixes defects in `0.20.0`'s push-safety controls, found by a verification review that exercised them against real repositories rather than reading the code. **If you set `push_policy: "blocked"` on `0.20.0`, re-run `spell doctor` after upgrading** — it will tell you whether that repository is actually covered.

### Fixed

- **A push URL configured outside the repository defeated the block entirely, while `doctor` reported it covered.** `remote.<name>.pushurl` is multivalued and git collects values across system, global and local scope — so writing the sentinel locally **appended** to git's list rather than replacing the live URL, and because the outside value sorts first git **delivered the push** and only then failed on the sentinel. Exit code 128, history already gone, `spell doctor` green. A local write cannot subtract an outside value, so applying the policy now refuses for that remote and names the scope to fix, and `doctor` reads the effective URLs across every scope rather than only this repository's.
- **`blocked` could silently leave remotes pushable.** `0.20.0` recorded each remote's original push URL under `arcane.originalPushUrl.<remote>`, and three ordinary git configurations broke it — every one of them leaving remotes live in a repository the operator had just been told was blocked:
  - A remote name that is legal for git but illegal as a trailing config key (`my_remote` — that segment must be alphanumeric or `-`) made `git config` fail. The error aborted the whole loop, so **every remote after it in git's ordering was never touched**.
  - Trailing config-key segments are case-**insensitive**, so remotes `origin` and `Origin` collided on one key. One original was lost, and unblocking pointed one remote at the other's URL — the wrong-remote push this feature exists to prevent, arriving through its own recovery path.
  - `git remote rename` orphaned the record. Unblocking then restored nothing while reporting success, and `doctor` reported `open` over a still-blocked remote.

  The record now lives at `remote.<name>.arcaneOriginalPushUrl`, inside the remote's own section: git accepts any legal remote name there, subsection names **are** case-sensitive, and `git remote rename` moves the whole section including keys git has never heard of. Applying the block is also fault-isolated per remote now — one remote that cannot be covered is reported, never allowed to abandon the rest.
- **A mirror remote with two push URLs defeated the block entirely.** `git remote set-url --push` refuses such a remote outright, which aborted the run with both mirrors still pushable. The sentinel is now written with `git config --replace-all`, and both URLs are restored on unblock.
- **A blocked remote with no prior `pushurl` got one pinned to it.** Unblocking wrote the fetch URL into a new `pushurl` key that had never existed, so a later `git remote set-url` changed fetch only and pushes kept going to the old location. Restore now removes the key when there was none.
- **`doctor` reported a neutered hook as enforcement.** It checked the hook file existed but not its contents, so a zero-byte file — or one edited down to `exit 0` — passed while real pushes succeeded. It now compares the body, and on POSIX also requires the execute bit, since git silently skips a hook without it.
- **`doctor` reported an enforced hook as missing.** `core.hooksPath` was compared by exact string, so `.arcane/hooks/`, `./.arcane/hooks`, and an absolute spelling were all called foreign even though the hook demonstrably fires. Comparison is now path-normalised (case-folded only on Windows — folding on POSIX would make the collision guard fail open).
- **`spell uninstall` left a blocked repository unable to push, with no way back.** It deleted `.arcane.json` while leaving the hook and sentinel URLs in force, so `spell unblock-push` no longer recognised the repository and recovery meant hand-editing git config — after being told the uninstall succeeded. It now refuses and points at `unblock-push`, keyed on whether the controls are **actually** installed rather than on what the manifest declares.
- **`spell unblock-push` could leave the hook in force while reporting success.** Removing a `core.hooksPath` set at *worktree* scope was attempted with `--local`, which cannot touch it, and the hook file was never deleted. It now unsets at the scope the value lives in, deletes the hook file, verifies the result, and reports a partial lift as a **warning** rather than a success with footnotes underneath.
- **Records written by `0.20.0` are no longer applied blind.** `0.20.0`'s flat key was case-insensitive and survived `git remote remove`, so restoring from it could point a remote at another remote's URL, or at a target the operator had moved away from — reported as a clean success. Such a record is now applied only when the remote is still carrying Arcane's sentinel and no two remote names differ only by case; otherwise the recorded value is printed for you to apply by hand.
- **The hook-manager collision guard failed open when git could not be asked.** Any error other than "not set" — an unparseable config, a permission error, a git too old for `--show-scope` — was read as "nothing is configured", and installation proceeded over a hook manager it had simply failed to see. It now refuses and says so.

### Changed

- **A blocked push now names its own remedy.** With both layers active the URL fails first and the hook never runs, so the only text git prints is the scheme name. It is now `arcane-push-blocked-run-spell-unblock-push`, turning a dead end into an instruction.
- **The `guarded` reminder prints each remote's push URL**, not just its name. Catching a wrong remote is the reminder's entire job, and `origin` alone says nothing about where it points.
- **Config scope is read rather than inferred**, via `git config --show-scope`. A `core.hooksPath` set at *system* scope, or per-worktree, was previously described to the operator as "set globally" — sending them somewhere that did not have it.

### Documentation

- ARC-034 asserted that no single bypass gets through, three lines above the paragraph documenting the case where one does. That property holds only for remotes covered at the time the policy was applied, and now says so.

## [0.20.0] - 2026-08-23

Implements the push-safety design accepted in [EF-09](docs/intake/batch-001/EF-09.md), recorded as [ARC-034](DECISIONS.md#arc-034--push-safety-for-sensitive-repositories).

### Added

- **`push_policy`** — `open` (default), `guarded`, or `blocked`. Strictly additive: every existing repository behaves exactly as before. Asked once at `spell init`, backfilled by `spell update`'s retrofit.
- **`blocked` installs two layered controls** — a `pre-push` hook *and* a sentinel push URL on every configured remote, not just `origin`. Both are needed, and they cover each other's blind spot: `--no-verify` skips hooks so only the URL catches it, while `git push <url>` and second remotes never consult the first remote's URL so only the hook catches those. The fetch URL is untouched, so a blocked repository can still pull. **Known gap:** the URL layer only covers remotes that exist when the policy is applied — a remote added later is covered by the hook alone. `init` warns about this, and `doctor` reports any remote whose push URL is still live.
- **A hook-manager collision guard, at any config scope.** `core.hooksPath` is a single exclusive slot — Git reads one hooks directory, never several — so installation refuses rather than silently disabling an existing Husky, Lefthook, or pre-commit setup. The effective value is read with `git config --get`, which respects local > global > system: an earlier implementation read only the local scope and was blind to a **global** `core.hooksPath`, the standard way organisations deploy hook managers, so it reported success while disabling them. (Arcane's own repository uses `.husky/_` for lint, typecheck and the test suite.)
- **`spell unblock-push`** — the only way to lift a block. Interactive terminal only, requires the repository name typed back, records the change with a timestamp, and offers no "just this once" mode.
- **A `doctor` check that verifies enforcement, not just declaration.** A manifest claiming `blocked` while the controls are absent is reported as such — a protection that is only asserted is worse than none, because it gets trusted. That includes checking the hook **file** exists, not only that `core.hooksPath` points at it: deleting the file leaves the config intact and pushes succeed. A `blocked` repository with no remote is likewise not reported as fully protected. For `guarded` repositories the reminder fires regardless of remote state, rather than going silent the moment any remote (possibly the wrong one) is configured.

### What this deliberately does not claim

The controls resist an **accidental** push — wrong remote, muscle memory, an unsupervised agent — not a determined operator, and `core.hooksPath` does not travel to a fresh clone. ARC-034 states the limits plainly rather than implying a guarantee, because a control believed to be stronger than it is produces exactly the carelessness it was meant to prevent.

## [0.19.0] - 2026-08-23

Completes docs mode. Records the decisions in [ARC-033](DECISIONS.md#arc-033--docs-mode-subject-root-content-sensitivity-and-capability-scoped-spell-components), which amends ARC-020 for the third time — ARC-020 itself stays Proposed, since its broader scope is genuinely still open. Closes [EF-03](docs/intake/batch-001/EF-03.md), [EF-04](docs/intake/batch-001/EF-04.md), [EF-07](docs/intake/batch-001/EF-07.md), [EF-10](docs/intake/batch-001/EF-10.md), [EF-11](docs/intake/batch-001/EF-11.md), [EF-12](docs/intake/batch-001/EF-12.md).

### Added

- **`subject_root`** — describes a repository that *is* one subject rather than a portfolio of ventures. Independent of `business_root` and may coexist with it. **`"."` is supported**, meaning the repository root itself is the subject tree: an existing archive can come under governance without being restructured first. `null` records "asked, no single subject root", distinct from never having been asked. Validated by shape, since the value is resolved against the repo root and handed to spells — absolute, drive-relative, UNC and `..`-traversal values are rejected.
- **`content_sensitivity`** — `standard` (default, today's behaviour) or `sensitive`. In sensitive repositories agents cite document paths rather than contents in journals, decisions, commits and PRs, and retain no screenshots of repository contents. Declared once per repository, because content-based classification of general documents has no reliable signature. This constrains what agents *write down*; it is not an access control.
- **`spell-adopt-docs`** — dry-run-first adoption of an existing document tree: inventory, propose a written mapping, get approval, then apply in separately-revertable phases. Never deletes a document, never overwrites a file, and stops at the first collision rather than attempting partial recovery.
- **`records-conventions.md`** — superseded documents keep their path and gain a tombstone header naming their replacement. No archive directory (moving breaks every inbound link, and the reader arriving by a stale link is exactly the one you need to redirect) and no shipped retention schedule (periods are jurisdiction- and contract-specific; absence of a known period is recorded as "unknown, therefore do not delete").
- **Repository baseline** — the docs profile emits a `.gitattributes`/`.gitignore` pair covering LF normalization and binary document formats, as user-owned `skipExisting` files. A repository with its own already has an intentional policy. Git LFS is documented as an opt-in decision, not configured by default.
- `RegistryComponent.sourceOverrides` — lets an installed dotfile be stored under a plain source path. A nested `.gitignore` inside an npm tarball can exclude sibling files from the published package, and a nested `.gitattributes` would apply its rules to Arcane's own source tree.

### Fixed

- `git-conventions.md` said docs repositories require a pull request while `cicd-standards.md` recorded ADR-048's docs-only exception. The exception governs; the policy table is corrected.

## [0.18.0] - 2026-08-23

### Added

- **`docs` profile** ([EF-04](docs/intake/batch-001/EF-04.md), docs-mode PRD MH-01) — a fifth installable profile for documentation and records repositories. Installs session, capture, PR-delivery, planning and meta spells plus core governance; deliberately excludes implementation, test-coverage, stack-expert, deployment, PRD-enchantment, adversarial code review, asset tooling and hub-venture workflows. `tracking_mode` defaults silently to `internal` for this profile, alongside `governance-only` and `methodology`.

  Retained spells complete their core workflow without source code, tests, CI, or an external tracker. Two carry a known caveat, stated rather than glossed: `spell-architect` and `spell-scope` each produce a complete document on their own, but their downstream consumer (`spell-implement`) is not installed here, so a docs repo uses them as design-note tools rather than as the front of a build chain.

### Changed

- **Spell components are now capability-scoped.** The monolithic `spell-prompts` (34 spells) and `claude-commands` (34 wrappers) components were split into eight groups — `spells-session`, `spells-capture`, `spells-delivery`, `spells-review`, `spells-planning`, `spells-build`, `spells-venture`, `spells-meta` — so a profile can select spells by capability. **No spell file was renamed or moved**; grouping lives in the registry only, and every file stays flat in `.github/prompts/` and `.claude/commands/`.

  Each component now carries *both* client formats of the same spell. The two were never independently selectable (every profile that took one took the other), and pairing them makes it structurally impossible for a spell's Copilot prompt and Claude wrapper to diverge across profiles.

  **Existing installs migrate automatically on `spell update`** — no questions, no action required. A manifest listing either legacy name (or both, which is the common case) converges on the same seven components, deduped. Without this, `update` would have hit `ComponentNotFoundError`, preserved the dead entry, and silently stopped updating that repo's spells forever.

## [0.17.1] - 2026-08-23

### Fixed

- `correctUnbornMasterDefault` no longer treats an *unreadable* `refs/heads/main` as an absent one. Both `rev-parse --verify` and `show-ref --verify` return the same nonzero status for a corrupt ref as for a missing one (verified empirically), so the previous bare `catch` could repoint HEAD onto a branch that still held real history — the exact history-splice hazard its own R1 guard exists to prevent. Now uses `for-each-ref`, which separates healthy / corrupt / absent via stdout+stderr, declines the correction on a broken ref, and reports `blockedReason: "target-unreadable"` so `spell init` can warn instead of silently doing nothing.
- `scripts/check-version-bump.ts` no longer prints a spurious `fatal: path 'package.json:package.json' does not exist` line on any CI run that touched a distributable path (runs that touch none short-circuit before reaching it). `getVersion` already appends `:package.json`, so the first operand of its `||` fallback built a doubled path that could never resolve — the fallback was doing all the work. Its `execSync` helper now pipes stderr rather than inheriting it, so a failure this helper deliberately swallows can't surface as a scary CI error.
- `vitest.config.ts` now excludes `**/.claude/**`. Linked worktrees live under `.claude/worktrees/<name>/`, each with a complete `test/` directory, so `npm test` from the primary checkout discovered and ran every test file a second time per live worktree. (`defaultExclude` is spread back in — Vitest replaces this array rather than merging it.)
- `package-lock.json`'s own `version` fields were stale at `0.16.1`, six bumps behind `package.json`. Resynced; no dependency resolutions changed.

## [0.17.0] - 2026-08-22

### Added

- `tracking_mode`/`external_provider` persist in `.arcane.json` on exactly `profile`'s contract ([ARC-032](DECISIONS.md#arc-032--persisted-tracking-configuration-tracking_mode-and-external_provider-in-the-manifest), amends [ARC-020](DECISIONS.md#arc-020--canonical-repository-configuration-schema), [EF-14](docs/intake/batch-001/EF-14.md)): asked once at `spell init` (silent `internal`/`null` default for docs-only profiles, asked interactively for `full`/`lite`), backfilled via a new `MANIFEST_RETROFITS` entry on `spell update` for pre-existing installs.

### Fixed

- `spell-open-session`/`spell-plan` now resolve tracking configuration from root `.arcane.json` → the committed self-hosted source manifest → PRD frontmatter → ask, instead of asking every session — this repo's own checkout previously asked every time despite `src/assets/.arcane.json` already declaring `tracking_mode: internal`, because the prompt explicitly refused to read it.
- `ExternalProvider`'s type corrected from `azure-devops | github | gitlab | jira` (never actually used anywhere) to `ado | jira | other`, matching ARC-011 and both consuming prompts.
- Seven spells hardcoded `ventures/` instead of resolving `{BUSINESS_ROOT}` from `.arcane.json`'s `business_root` field ([EF-08](docs/intake/batch-001/EF-08.md)): `spell-check-drift`, `spell-commit-work`, `spell-open-session`, `spell-plan`, `spell-todo`, `spell-summon-venture`, `spell-save-idea`. `spell-check-drift` and `spell-todo` each needed more fixes than the intake's now-stale line citations found; `spell-summon-venture` and `spell-save-idea` weren't in the intake's citation list at all -- found by an adversarial-review completeness sweep, not the original diagnosis.

## [0.16.6] - 2026-08-22

### Changed

- Accepted [ARC-022](DECISIONS.md#arc-022--fail-safe-ci-path-filter-policy) and wired it into `cicd-standards.md` ([EF-22](docs/intake/batch-001/EF-22.md)): the .NET and Node.js pipeline templates switch from include-based (or unfiltered) path triggers to a narrow, fail-safe exclude list, so a new code directory can no longer silently bypass CI. The Terraform and Markdown-lint templates stay correctly include-scoped for their narrower technology-specific purpose, widened to also cover their own pipeline definition file. New explicit rule against using commit message/author/branch name as a CI trust signal, and new guidance on keeping Azure DevOps branch-policy path filters aligned with YAML trigger scope.

## [0.16.5] - 2026-08-22

### Fixed

- Ships ARC-028's R7 rail as standing operational governance ([EF-33](docs/intake/batch-001/EF-33.md)): a new "Same-Vantage-Point Check" section in `git-conventions.md` requires independently confirming a worktree/branch path from the *current process's own filesystem* before any irreversible worktree/branch operation, since `git worktree list` can truthfully report a live, healthy worktree as `prunable` when read through a bridged/remote mount. Railed into `spell-commit-work`, `spell-close-session`, and `spell-ship`'s branch-deletion steps, plus `spell-open-session`'s worktree-list/stale-branch reads. `agent-policies.md`'s Multi-Agent Concurrency Rules gains the working-tree dimension (ARC-028 item 11a). Not CI-testable per the intake's own scope (cross-mount filesystem visibility can't be reproduced on one runner); shipped with string-assertion coverage on the governance text itself. ARC-028 remains Proposed — only two of its follow-up items are complete.

## [0.16.4] - 2026-08-22

### Fixed

- `spell-close-session` gained a structured pending-verification mechanism ([EF-21](docs/intake/batch-001/EF-21.md)): a new step requires actively checking the status of every async operation dispatched during the session (CI runs, deployments, publishes) before the journal, TODO.md, or handoff are written, classifying each into `dispatched` / `pending` / `succeeded` / `failed` / `unverifiable` — only `succeeded` work may be described as complete anywhere. The handoff template gained a `Pending Verification` field; `spell-open-session` now actively re-checks any non-`succeeded` item from the prior handoff instead of relaying it as still-current fact.

## [0.16.3] - 2026-08-22

### Fixed

- `spell init` now distinguishes not-a-repository / unborn / ready Git states instead of a blind uncommitted-changes count ([EF-05](docs/intake/batch-001/EF-05.md)): an unborn repo on `master` (the reported Git for Windows `init.defaultBranch` default-leak) is safely repointed to `main` via `symbolic-ref` before any commit exists; any other deliberately-chosen branch name is left untouched; a directory with no repository at all gets an explicit `git init -b main` next-step instead of a silent gap. `spell-close-session` gained a matching "not a repository" classification, checked first and failing closed with the same guidance.
- `spell init` and `spell doctor` now address `pull.rebase` governance drift ([EF-32](docs/intake/batch-001/EF-32.md)): init sets the repository-local value to `true` when nothing is set locally (never overriding an explicit local `false`, which is surfaced as a warning instead), and doctor's new `checkPullRebase` independently warns (non-blocking) whenever the effective value isn't `true`.

## [0.16.2] - 2026-08-22

### Fixed

- `src/modules/git.ts` now routes every production Git invocation through a single non-interactive execution contract ([EF-20](docs/intake/batch-001/EF-20.md), [EF-13](docs/intake/batch-001/EF-13.md)): closed stdin so an interactive prompt can't block indefinitely, `GIT_TERMINAL_PROMPT=0`/`GCM_INTERACTIVE=Never` to suppress credential prompts, `GIT_OPTIONAL_LOCKS=0` to avoid stranding an optional lock on filesystems that reject unlink, and a command-class-scoped timeout that throws a typed `GitTimeoutError` instead of hanging. `inspectGitRepository`/`countUncommittedChanges` are unchanged externally.

## [0.16.1] - 2026-08-22

### Fixed

- Widened the org-token build gate from a portability check (package-derived tokens in `src/assets/.github/prompts` only, unchanged) into two layers: portability, and a repository-wide privacy layer scanning docs, tests, and decision records against a denylist supplied via the `ARCANE_ORG_TOKENS` CI secret (unset = inert, so forks and local builds are unaffected). Established the Ordovica/Tidewright/Overshore fictional venture family as the canonical placeholder set for all examples (ARC-031).
- Replaced a hardcoded `codemagicianhq/arcane` literal in `spell-feedback`'s upstream-routing step with `{ARCANE_UPSTREAM_REPO}`, resolved from the installed package's own repository field, so forks/renames route correctly and the org-token lint no longer flags the spell itself.

## [0.16.0] - 2026-08-21

### Added

- **`role`/`business_root`** on `ArcaneManifest` (explicit opt-in only, never inferred): `spell init` asks whether a repo is a venture hub on interactive installs; `spell update` gains a general manifest-retrofit mechanism that asks about any field the installed version predates, once. Answering "hub" offers to scaffold `ventures/registry.json` from existing venture folders.
- **`spell-manifest`** — a new hub-gated spell that batch-triages `status: new` entries out of hub-side `IDEAS.md`/`TODO.md` books to a consumer repo, a PRD scaffold, a tracker item, a demoted todo, another venture's book, or public disclosure (gated per-entry on the literal word "disclose", keyed off destination visibility rather than destination type). Spell count 33 → 34.
- Venture-targeting phrasing for `spell-save-idea`/`spell-todo` (hub-only; refused in consumer repos), and hub-role/registry-consistency detectors in `spell-check-drift`.
- `spell-feedback` upstream-routing: framework-shaped feedback is genericized and offered as a GitHub issue against Arcane itself, gated by the same disclosure discipline.
- Full decision record: [ARC-030](DECISIONS.md#arc-030--venture-idea-lifecycle-hub-role-registry-and-spell-manifest-promotion).

### Changed

- **BREAKING:** `spell-bootstrap-business` is renamed to `spell-summon-venture` with no compatibility alias (ARC-008 clean-break precedent) — its behavior changed substantively (hub gate, per-venture books, registry entry), so an alias would have promised behavior that no longer exists. Use `spell-summon-venture`.

### Fixed

- Pre-commit hook test runs no longer inherit `GIT_DIR` and corrupt the real repository ([EF-34](docs/intake/batch-001/EF-34.md)): test git fixtures are now hermetic, `pre-commit` is fast-checks-only (lint + typecheck), and the full suite moved to `pre-push` with its own environment scrub.

## [0.15.9] - 2026-08-21

### Fixed

- `spell agents init`/`sync` no longer silently drops the `mobile-dev` role: an unquoted colon-space in a `behavioral_rules` item made the bundled template parse as a YAML mapping and fail validation, skipping the agent from every client output with a zero exit code. Every shipped agent template is now covered by a validation regression test.

## [0.15.8] - 2026-08-03

### Changed

- Refine `spell-commit-work`'s execution-authority resolution table and related guidance.

## [0.15.7] - 2026-08-02

### Added

- Install-once `README.md` and `project.md` orientation stubs for new repositories.

### Fixed

- Resolve spell governance links through the single installed `.arcane/governance/` layer.

## [0.15.6] - 2026-08-02

### Added

- Ship an offline legacy framework decision reference and fail CI for missing or malformed distributed ADR citations.

## [0.15.5] - 2026-08-02

### Added

- Define Arcane-vendored commit provenance with human authorship and programmatically derived vendor trailers.

## [0.15.4] - 2026-08-02

### Fixed

- Make close-session remote synchronization provider-neutral and skip all remote operations for local-only or read-only sessions.

## [0.15.3] - 2026-08-02

### Fixed

- Keep local-only `spell-commit-work` checkpoints on trunk when no authenticated supported remote merge path exists.
- Determine authorship before concern grouping and split every mixed-author batch into one-author commits.

## [0.15.2] - 2026-08-02

### Added

- Registry-driven self-host parity commands with a blocking CI check and negative drift coverage.
- Separate reporting for real content drift and line-ending-only differences.

### Changed

- Root dogfood copies under `.github/`, `.arcane/`, and `.claude/` are generated from canonical `src/assets/` sources.
- ARC-027 supersedes ARC-006's non-executable `spell update` self-refresh model.

## [0.14.0] - 2026-07-12

Initial public release.

[0.15.8]: https://github.com/codemagicianhq/arcane/compare/v0.15.7...v0.15.8
[0.15.7]: https://github.com/codemagicianhq/arcane/compare/v0.15.6...v0.15.7
[0.15.6]: https://github.com/codemagicianhq/arcane/compare/v0.15.5...v0.15.6
[0.15.5]: https://github.com/codemagicianhq/arcane/compare/v0.15.4...v0.15.5
[0.15.4]: https://github.com/codemagicianhq/arcane/compare/v0.15.3...v0.15.4
[0.15.3]: https://github.com/codemagicianhq/arcane/compare/v0.15.2...v0.15.3
[0.15.2]: https://github.com/codemagicianhq/arcane/compare/v0.15.1...v0.15.2
[0.14.0]: https://github.com/codemagicianhq/arcane/releases/tag/v0.14.0
