title: Arcane Framework — Architecture Decision Records
audience: both
status: active
tags: [decisions, ARC, framework, arcane]

# Arcane Framework — Architecture Decision Records (ARC)

> Full operational history for framework decisions is maintained in the operator's private records.

Framework-level decisions for the Arcane SDLC methodology: the spell library, CLI distribution, agent system, and governance templates.

> **Curated public subset.** This is the public Arcane framework decision record. It contains only decisions about Arcane itself (the spell loop, CLI, agent system, distribution, and governance standards). Deployment- and org-specific decisions are maintained separately in the framework author's private operations repository and are intentionally not reproduced here, so gaps in the numbering are expected.

## Numbering Convention

Arcane framework decisions use the `ARC-NNN` prefix (three digits, zero-padded). Prior framework decisions predate the `ARC-NNN` sequence and are listed in the [Cross-Reference Index](#cross-reference-index---framework-adrs) below under their original `ADR-NNN` numbers.

## Table of Contents

| ARC                                                                                       | Title                                                                   | Date       | Status   |
| ----------------------------------------------------------------------------------------- | ----------------------------------------------------------------------- | ---------- | -------- |
| [ARC-001](#arc-001--arcane-ops-separation-dual-prefix-adr-strategy-and-content-ownership) | Arcane / Ops Separation: Dual-Prefix ADR Strategy and Content Ownership | 2026-05-04 | Accepted |
| [ARC-002](#arc-002--distribute-vs-code-agent-mode-files-via-spell-init)                   | Distribute VS Code Agent Mode Files via spell init                      | 2026-05-14 | Accepted |
| [ARC-003](#arc-003--agent-persona-schema-v2-and-operations-comms-persona-replacement)     | Agent Persona Schema v2 and Operations-Comms Persona Replacement        | 2026-05-18 | Accepted |
| [ARC-004](#arc-004--image-prompt-asset-ownership-model)                                   | Image-Prompt Asset Ownership Model                                      | 2026-05-19 | Accepted |
| [ARC-005](#arc-005--session-handoff-prompt-automatic-continuation-context)                | Session Handoff Prompt: Automatic Continuation Context                  | 2026-05-25 | Accepted |
| [ARC-006](#arc-006--arcane-self-installs-via-spell-init-dogfooding)                       | Arcane Self-Installs via spell init (Dogfooding)                        | 2026-05-26 | Accepted |
| [ARC-007](#arc-007--rename-spell-assess-to-spell-scope-and-add-spell-brainstorm)          | Rename spell-assess to spell-scope and add spell-brainstorm             | 2026-06-06 | Accepted |
| [ARC-008](#arc-008--clean-break-for-spell-assess-removal-no-compatibility-alias)          | Clean Break for spell-assess Removal: No Compatibility Alias            | 2026-06-06 | Accepted |
| [ARC-009](#arc-009--session-naming-and-pr-lifecycle-reliability-policy)                    | Session Naming and PR Lifecycle Reliability Policy                       | 2026-06-07 | Accepted |
| [ARC-010](#arc-010--terminal-safe-cli-banner-animation-strategy)                            | Terminal-Safe CLI Banner Animation Strategy                              | 2026-06-07 | Accepted |
| [ARC-011](#arc-011--optional-external-tracking-mode-with-process-template-aware-ado-mapping) | Optional External Tracking Mode with Process-Template-Aware ADO Mapping  | 2026-06-08 | Accepted |
| [ARC-012](#arc-012--generated-distributable-artifacts-require-a-parity-guard)                | Generated Distributable Artifacts Require a Parity Guard                 | 2026-06-20 | Accepted |
| [ARC-013](#arc-013--review-and-drift-quality-gate-philosophy-coverage-mandate-over-finding-quotas) | Review and Drift Quality-Gate Philosophy: Coverage Mandate over Finding Quotas | 2026-06-22 | Accepted |
| [ARC-014](#arc-014--spell-authoring-standards-a-quality-rubric-for-spell-prompts) | Spell Authoring Standards: A Quality Rubric for Spell Prompts | 2026-06-22 | Accepted |
| [ARC-015](#arc-015--public-naming-architecture-brand-package-and-binary-with-arcane-alias) | Public Naming Architecture: Brand, Package, and Binary (with `arcane` alias) | 2026-06-23 | Accepted |
| [ARC-016](#arc-016--public-repository-model-fresh-start-build-in-public-with-an-org-leak-gate) | Public Repository Model: Fresh-Start Build-in-Public with an Org-Leak Gate | 2026-06-24 | Accepted |
| [ARC-017](#arc-017--enforce-pre-pr-rebase-for-agent-initiated-pull-requests) | Enforce Pre-PR Rebase for Agent-Initiated Pull Requests | 2026-07-05 | Accepted |
| [ARC-018](#arc-018--track-claude-code-preview-launch-config-in-source-control) | Track Claude Code Preview Launch Config in Source Control | 2026-07-11 | Accepted |

---

## ARC-001 — Framework / Operations Separation: Dual-Prefix ADR Strategy and Content Ownership

**Date:** 2026-05-04
**Status:** Accepted

**Context:**

The Arcane framework's methodology content (spell prompts, governance templates, agent definitions) was initially hosted inside a private operations repository because no external consumers existed (ADR-038). As Arcane began to be installed across multiple downstream repos, that repository became an implicit distribution point for content that belongs in the published npm package.

The operations repo had a single `ADR-NNN` sequence mixing framework decisions and deployment-specific decisions.

**Decision:**

1. **Arcane gets its own `ARC-NNN` decision sequence** starting with this entry (ARC-001). Framework decisions going forward are recorded here.
2. **No renumbering of existing framework ADRs.** Prior framework `ADR-NNN` entries keep their numbers. Renaming would break wiki-links across consumer repos, agent-instruction files, and cross-repo references.
3. **Prior framework ADRs are soft-extracted:** they stay where they were recorded with their original numbers and receive a `See also: ARC-NNN` cross-reference when a corresponding ARC entry exists.
4. **Content ownership going forward:**
   - Spell prompts, governance templates, agent YAML templates → `arcane/src/assets/` (distributed via CLI)
   - Deployment-specific policies and operational docs → private operations repo (not in arcane)
   - The operations repo becomes a consumer of Arcane via `spell init`, not a host of framework content
5. **Arcane's sole methodology is the Spell Loop.** The four layers are: Spells, Governance, Agents, CLI. Users who want additional methodology tools (e.g., BMAD) install them independently.
6. **Migration scope:** move framework governance files into `arcane/src/assets/.arcane/governance/` and bump the Arcane CLI version accordingly.

**Reasoning:**

- Spell prompts and governance templates are the Arcane product, not deployment docs. They belong in the package.
- The dual-prefix strategy (ARC-NNN vs ADR-NNN) gives Arcane a clean, authoritative history without breaking anything in downstream repos.
- The operations repo as a consumer (not host) aligns with the framework-as-product intent (ADR-061).
- One tool, one methodology (Spell Loop) reduces cognitive load for users. Third-party methodology tools are out of scope.

**Rejected alternatives:**

- **Renumber framework ADRs into ARC-NNN** — breaks all existing wiki-links across repos. High cost, zero benefit.
- **Leave everything in the operations repo** — contradicts ADR-061; violates separation now that external consumers exist.

---

## Cross-Reference Index — Framework ADRs

These ADRs were recorded before the ARC-NNN sequence existed. They document framework-level decisions and are listed here for discoverability; they retain their original ADR numbers. (Deployment- and org-specific ADRs from the same original sequence are intentionally omitted from this public record.)

| ADR     | Title                                                                                       | Framework Area                                 |
| ------- | ------------------------------------------------------------------------------------------- | ---------------------------------------------- |
| ADR-002 | Documentation in Markdown + Git                                                             | Docs standard                                  |
| ADR-005 | Naming convention: machines get iconic names, agents get persona + role                     | Agent naming                                   |
| ADR-011 | Troubleshooting standard: Symptom / Cause / Fix / Verify / Prevention                       | Runbook format                                 |
| ADR-013 | Git Workflow — Conventional Commits + Trunk-Based Development                               | Git conventions                                |
| ADR-018 | Documentation readability standard: Executive Summary in operational docs                   | Docs standard                                  |
| ADR-019 | Custom Prompt Naming: spell- Prefix for the Spell Prompt Library                            | Spell naming                                   |
| ADR-020 | Session Prompt Naming: Open/Close Pairing                                                   | Spell naming                                   |
| ADR-023 | Mermaid for All Diagrams and Flow Charts in Documentation                                   | Docs standard                                  |
| ADR-028 | Agent Git Attribution Model: Per-Agent Author Identity with Commit Trailers                 | Agent convention                               |
| ADR-029 | Canonical Commit Metadata Schema for Agent Analytics                                        | Agent convention                               |
| ADR-030 | Canonical Agent Git Identity Domain                                                          | Agent identity                                 |
| ADR-031 | Agent Roster Overhaul: Role Consolidation and Thematic Naming                               | Agent roster                                   |
| ADR-032 | Agent Autonomy Redesign: Gamified Power Levels with Context-Dependent Assignment            | Autonomy model                                 |
| ADR-038 | Separation-Ready Framework: Keep Reusable Components In-Repo Until External Consumer Exists | Extraction boundary — **fulfilled by ARC-001** |
| ADR-049 | Spell Loop: Autonomous Implementation Loop + Structured Planning + Spell System             | Core methodology                               |
| ADR-050 | Testing Standards: Framework Selection and Coverage Policy                                  | Testing policy                                 |
| ADR-052 | Product Excellence Standards and spell-enchant PRD Quality Enhancement                      | Quality gates                                  |
| ADR-054 | Feature Folder Convention: Per-Repo Spell Artifact Persistence                              | Project structure                              |
| ADR-061 | Arcane Framework Identity: Name, 4-Layer Architecture                                       | Core framework identity                        |
| ADR-062 | npm CLI as Governance Package Distribution Format                                           | Distribution format                            |
| ADR-073 | Portable Agent Identity System: YAML Canonical Definitions with Multi-Client Fan-Out        | Agent system                                   |

---

## ARC-002 — Distribute VS Code Agent Mode Files via spell init

**Date:** 2026-05-14
**Status:** Accepted

**Context:**

The `@codemagician/arcane` CLI distributes spell prompts and governance templates to consumer repos via `spell init` / `spell update`. However, the `.github/agents/*.agent.md` files — which VS Code Copilot reads to surface named agent modes (Kellar, Merlin, Lafayette, etc.) in the chat UI — were absent from the asset distribution. Consumer repos that ran `spell init` got spells and governance but no agents appeared in VS Code.

A working reference implementation of all 12 agent files existed in a consumer repo. A corrected set (with the `[object Object]` serialization bug fixed in the mobile-dev agent file) was also verified in another consumer repo.

**Problem with the bug:** An earlier version of the agent generation tooling serialized a JavaScript object reference instead of a string in the mobile-dev agent file's description field, producing the literal text `[object Object]`. This was caught during the consumer-repo verification pass and corrected before committing to arcane assets.

**Decision:**

1. Add 12 `*.agent.md` files to `src/assets/.github/agents/` — one per Arcane persona: Kellar, Merlin, Lafayette, Lince, Prospero, Adelaide, Mercurio, Alexander, Circe, Bess, Iris, Custodio.
2. Register a new `agent-files` component in `registry.ts` listing all 12 file paths.
3. Include `agent-files` in the `lite` and `methodology` profiles (in addition to `full`, which already uses `*`). This ensures agents appear in VS Code even for lightweight installs.
4. The `governance-only` profile deliberately excludes `agent-files` — that profile is for standards-only setups where agent tooling is not needed.
5. No changes to `scripts/copy-assets.ts` are required — the script already performs a recursive directory copy of all `src/assets/` content, so `.github/agents/` is handled automatically.
6. Version bumped from `0.4.0` → `0.4.1` (semver patch — additive, no breaking changes to existing consumers).

**Consequences:**

- Running `spell init` or `spell update` with any profile except `governance-only` will now install the 12 agent files into `.github/agents/` of the consumer repo.
- VS Code Copilot will surface named agent modes immediately after `spell init` completes.
- Consumer repos that previously ran `spell init` must run `spell update` to receive the agent files retroactively.

---

## ARC-003 — Agent Persona Schema v2 and Operations-Comms Persona Replacement

**Date:** 2026-05-18
**Status:** Accepted

**Context:**

The initial agent YAML schema (v1) supported only two persona fields: `description` (string) and `behavioral_rules` (string[]). This was sufficient for functional agent behavior but provided no structured metadata for avatar consistency, voice calibration, or published roster documentation. As Arcane moves toward a public GitHub release, the agent roster needs richer identity metadata.

Additionally, the original `operations-comms` persona had been chosen for a specific co-owner comms use case at a venture. That use case was deferred, and the role was generalized to operational communications across all projects — making a more tactically precise persona more appropriate.

**Decision:**

1. **Schema v2:** Add four optional fields to the `AgentPersona` TypeScript interface and YAML schema:
   - `personality?: string` — short personality summary for tone calibration
   - `voice?: string` — communication style descriptor
   - `visual_description?: string` — physical appearance for avatar generation consistency (not rendered into agent output files)
   - `catchphrase?: string` — signature one-liner, rendered into IDENTITY.md (as a Motto) and Copilot `.agent.md` files
2. **All 12 agent YAML files** updated with all four new fields.
3. **Render updates:** `renderIdentity()` emits catchphrase as a `## Motto` block. `renderCopilotAgent()` emits personality, voice, and catchphrase. `visual_description` is intentionally excluded from rendered output — it is metadata for image generation, not agent behavior.
4. **The `operations-comms` persona is replaced.** A tactical, economical, zero-noise persona better matches the generalized ops-comms role; the original persona moved to a standby pool for potential future re-activation (the standby pool has since been retired).
5. **The roster name map** in `naming.ts` updated to assign the replacement persona name to `operations-comms`.
6. **Version bumped** from `0.4.3` → `0.5.0` (minor — additive schema fields, new persona metadata, one persona replacement; no breaking changes for existing consumers).

**Consequences:**

- Consumer repos running `spell update` will receive updated agent YAML files with the new persona fields.
- The `operations-comms` agent will use the replacement persona name in all generated outputs (VS Code agent mode, IDENTITY.md, etc.).
- The `AgentPersona` interface is backward-compatible — all new fields are optional, and the YAML loader already accepts extra fields without validation errors.
- Avatar images for agents using `visual_description` can be generated independently using the field content as a prompt seed.

**Addendum (2026-05-19) — Governance source remediation (v0.5.2):**

Initial ARC-003 implementation updated agent YAMLs, `naming.ts`, and `naming-conventions.md` but left 6 governance/prompt source files unremediated. Completed in v0.5.2:

- `src/assets/.arcane/agents/agent-policies-template.md` — 13 prior-persona references → replacement persona
- `src/assets/.arcane/governance/agent-policies.md` — 13 prior-persona references → replacement persona
- `src/assets/.arcane/governance/agent-approved-paths.md` — prior-persona workspace paths → replacement persona
- `src/assets/.arcane/governance/git-conventions.md` — prior-persona email row → replacement persona (date 2026-05-18)
- `src/assets/.arcane/governance/hardening-checklist.md` — prior persona in exec-deny list → replacement persona
- `src/assets/.github/prompts/spell-present-arcane.prompt.md` — prior persona in agent lineup → replacement persona
- Mermaid diagram node color updated from the prior persona's purple (`#5a2d5c`) to the replacement persona's palette (`#1a1a1a/#00ff41`)

---

## ARC-004 — Image-Prompt Asset Ownership Model

**Date:** 2026-05-19
**Status:** Accepted

**Context:**

Agent visual identity requires three types of assets: (1) text generation prompts, (2) profile picture PNGs, and (3) full-body PNGs. Before this ADR all three were scattered across repos. As arcane becomes a distributable npm package with a versioned agent roster, the generation prompts need a stable, versioned home separate from deployment-specific operational content.

A replacement prompt set had already been created, but those prompts used a different aesthetic (fantasy/character-faithful) inconsistent with all previously generated images; the originals lived outside the framework repo.

**Decision:**

1. **Text generation prompts** (profile picture, palette, negative prompts, safe versions) → `arcane/src/assets/.arcane/image-prompts/<agent>-image-prompt.md`. One file per agent, with standardized structure: Character Notes, Palette hex table, Safe Version, Negative Prompts, explicit ethnicity declaration.
2. These files are **reference/generation artifacts only** — not registered in `registry.ts`, not distributed via `spell init`. They version alongside the agent roster.
3. **Profile picture PNGs** live in their primary downstream consumer (the application that renders avatars), not in the framework package.
4. **Full-body prompts** (`full-body-prompts.md`) are application-specific wallpaper content and remain outside the framework — not framework-generic content.
5. Any pre-existing scattered prompt files are superseded by the arcane image-prompt files.

**Consequences:**

- All 12 agent image-prompt files now live in `arcane/src/assets/.arcane/image-prompts/` with the canonical photorealistic cinematic style, enhanced with explicit ethnicity, safe versions, and negative prompts.
- The replacement operations-comms persona (ARC-003) has a net-new image-prompt file; corresponding PNGs must be generated by the downstream consumer.
- Future persona additions must include a corresponding `<agent>-image-prompt.md` file.
- The full-body prompts file remains outside arcane scope.

---

## ARC-005 — Session Handoff Prompt: Automatic Continuation Context

**Date:** 2026-05-25
**Status:** Accepted

**Context:**

The `spell close session` → `spell open session` loop is designed to preserve continuity across chat resets. Close-session captures *state* (journal, TODO, decisions, system-prompt-context) but not the **precise continuation point** — the exact task in progress, last concrete step, and next action. Open-session reconstructs context from scratch by reading all docs and inferring priorities, producing correct-but-broad output rather than a surgical "resume here" kickstart. Users have been bridging this gap by manually writing a handoff note at the end of each close-session.

**Decision:**

1. **`spell-close-session` gains Step 5b:** After updating `system-prompt-context.md`, the agent generates a `## Next Session Handoff` block and writes it into `ai-context/system-prompt-context.md`. The block contains seven fields: Active task, Last completed step, Next concrete action, Active files, Branch, Blockers, Notes. The block is overwritten each close-session.
2. **`spell-open-session` gains Handoff Detection:** Before the workspace scan, the agent checks `system-prompt-context.md` for a `## Next Session Handoff` section. If present and unconsumed, it is surfaced as `## Picking Up From Last Session` at the top of output, and its `Next concrete action` field seeds the `## Next Session Plan`. The block is then marked consumed (`> ✓ Consumed: YYYY-MM-DD`) in the file.
3. **No new files.** The handoff block lives inside the existing `ai-context/system-prompt-context.md` file, which open-session already reads. No new file in consuming repos, no CLI source changes.
4. **Version bump:** `0.5.x` → `0.6.0` (minor — new capability distributed to consuming repos via `spell update`).

**Reasoning:**

- Zero-friction session continuation is a core Arcane promise. Manual handoff notes are friction the system should absorb.
- Using the existing `system-prompt-context.md` requires no changes to open-session's file reading list and no new files in consuming repos.
- The consumed-marker pattern (`> ✓ Consumed: YYYY-MM-DD`) preserves the handoff text in git history while making its lifecycle state machine-readable.
- Keeping the block in `system-prompt-context.md` rather than a dedicated file avoids registry and distribution complexity.

**Rejected alternatives:**

- **Dedicated `ai-context/handoff.md`** — requires open-session prompt update to add the file to its read list, plus a new file in every consuming repo. Same outcome, more surface area.
- **Separate `spell handoff` command** — adds user-facing friction; the user must remember to run it. Close-session should generate it automatically.
- **Richer `### Carry Forward` in journal** — journal is an archive, not live state. Open-session would need perfect date-ordered journal parsing to reliably find the most recent carry-forward. Fragile at scale.

---

## ARC-006 — Arcane Self-Installs via spell init (Dogfooding)

**Date:** 2026-05-26
**Status:** Accepted

**Context:**

The arcane source repo (`@codemagician/arcane`) distributes governance templates, spell prompts, agent definitions, and Claude commands to consumer repos via `spell init`. Until this date, the arcane repo itself did not run `spell init` — it held the source assets in `src/assets/` but did not install its own governance tooling at the repo root. The repo relied on `CLAUDE.md` and `DECISIONS.md` for documentation hygiene but lacked the full consumer artifact tree (`.arcane/governance/`, `.github/prompts/`, `.github/agents/`, `.claude/commands/`).

**Decision:**

1. **Run `spell init` inside the arcane source repo** and commit all installed consumer artifacts.
2. **Accept the source/installed duality permanently:** `src/assets/.github/prompts/` (source of truth for what gets shipped) and `.github/prompts/` (installed copy from the currently published version) coexist in the same repo. These serve different purposes and do not conflict.
3. **No publish impact.** `package.json` declares `"files": ["dist/"]`; consumer artifacts in `.arcane/`, `.claude/`, `.github/`, and `AGENTS.md` are excluded from the npm package automatically.
4. **No test impact.** Vitest scans `test/*.test.ts` only. Build script (`copy-assets.ts`) operates on `src/assets/` exclusively.
5. **Drift between source and installed is expected and intentional.** Installed files reflect the last published version. After each release, run `spell update` in the arcane repo to self-update the installed consumer copies.
6. **Create `journal/` and `ai-context/` directories** in the arcane repo to fully participate in the session lifecycle managed by its own spell system.

**Reasoning:**

- Dogfooding forces discovery of real usability issues in arcane's own tooling. If arcane's governance docs or spells are confusing when applied to arcane itself, they will be confusing for other consumers.
- The source/installed duality is a natural consequence of any package that installs content into its own repo. The critical constraint — that only `dist/` is published — is already enforced by `package.json`.
- Creating `journal/` and `ai-context/` turns arcane into a first-class spell-governed repo, making `spell close session` and `spell open session` usable in arcane development sessions.

**Rejected alternatives:**

- **Do not commit installed files; add them to `.gitignore`** — loses the governance content for anyone cloning the repo, and means arcane does not benefit from its own tooling. Contradicts the dogfooding intent.
- **Keep a single copy by symlinking `src/assets/` to `.github/prompts/`** — symlinks are fragile on Windows, break the copier module's path traversal logic, and would make `spell update` overwrite source files with published content.

---

## ARC-007 — Rename spell-assess to spell-scope and add spell-brainstorm

**Date:** 2026-06-06
**Status:** Accepted

**Context:**

The spell previously named `spell-assess` was responsible for scoping large PRDs into epic-level execution plans. In practice, "assess" read as a generic evaluation step and was less explicit than the actual outcome (scope decomposition and sequencing). During Phase 0A work, the team also identified a gap before formal planning: a divergent ideation stage for ambiguous problem spaces.

The session delivered two concrete changes: renaming `spell-assess` to `spell-scope`, and introducing a new `spell-brainstorm` prompt and corresponding Claude command wrappers. All related registry and governance references were updated in source assets and dogfood-installed copies.

**Decision:**

1. Rename `spell-assess` to `spell-scope` across prompt files, Claude command wrappers, registry entries, and governance references.
2. Add `spell-brainstorm` as a first-class spell prompt and Claude command wrapper in both dogfood and `src/assets/` copies.
3. Register `spell-brainstorm` in distribution manifests (`registry.ts`, `curate-assets.ts`) and update spell counts accordingly.
4. Keep compatibility alias handling as a follow-on Phase 0B decision (not part of this change set).

**Reasoning:**

- `spell-scope` is semantically aligned with the spell's primary output (`execution-plan.md` with scoped epics and dependency order).
- Adding `spell-brainstorm` captures divergent exploration as an explicit, reusable step rather than ad-hoc chat behavior.
- Updating both installed and source asset trees preserves arcane dogfooding integrity and avoids registry/test drift.

**Rejected alternatives:**

- **Keep `spell-assess` as the canonical name** — rejected because it obscures the spell's specific purpose and prolongs naming ambiguity.
- **Ship `spell-brainstorm` without registration** — rejected because unregistered prompts are not distributable via `spell init`/`spell update`.
- **Implement compatibility alias in the same commit** — deferred to Phase 0B to keep Phase 0A atomic and low risk.

---

## ARC-008 — Clean Break for spell-assess Removal: No Compatibility Alias

**Date:** 2026-06-06
**Status:** Accepted

**Context:**

ARC-007 (Phase 0A) renamed `spell-assess` to `spell-scope` and explicitly deferred the compatibility alias question to Phase 0B. The question was whether consumers that reference `spell-assess` in scripts, docs, or muscle memory need a deprecation alias, a warning redirect, or nothing at all.

At time of decision, Arcane has a single active maintainer (the framework author). No external consumers or CI pipelines reference `spell-assess` by name. The rename was already executed atomically across all source and dogfood assets in commit `a237640`.

**Decision:**

1. **No compatibility alias or deprecation shim** for `spell-assess`. The name is fully retired.
2. The historical reference in `spell-scope.prompt.md` line 12 ("Formerly `spell-assess`.") is retained as documentation context for anyone reading prompt history.
3. If future consumers surface confusion, a one-line CLI warning can be added at that time — but YAGNI applies today.

**Reasoning:**

- Single-operator use means zero migration burden.
- Adding an alias introduces dead code paths and test surface for a scenario with no current users.
- The journal and ARC-007 provide full audit trail of the rename for anyone who encounters the old name in git history.

**Rejected alternatives:**

- **Add a CLI alias that prints a deprecation warning** — rejected as unnecessary complexity for a zero-consumer scenario.
- **Keep both names permanently** — rejected because dual naming creates ambiguity about which spell is canonical.

---

## ARC-009 — Session Naming and PR Lifecycle Reliability Policy

**Date:** 2026-06-07
**Status:** Accepted

**Context:**

During a consumer-repo PR lifecycle and follow-up Arcane hardening work, repeated failures surfaced in session naming and closeout workflows:

- Session names defaulted to generic/random values (for example, `Open session`, adjective-noun slugs), reducing traceability.
- PR automation guidance diverged between GitHub and Azure DevOps and omitted idempotent handling for reviewer/vote/merge edge cases.
- Worktree-backed sessions caused local branch deletion failures during cleanup.
- Merge strategy guidance was inconsistent across docs.

Arcane needed one policy baseline that consumers can apply deterministically across toolchains.

**Decision:**

1. Require deterministic, human-meaningful session naming in `spell-open-session` outputs via a mandatory `Suggested Session Name` field.
2. Disallow generic session names when focus or next-action context is available; derive names from focus argument or top recommended action.
3. Include optional copy-paste branch helper output (`sessions/YYYY-MM-DD-<topic-slug>`) in open-session guidance.
4. Standardize `spell-commit-work` PR lifecycle logic with explicit GitHub vs Azure DevOps decision trees.
5. Require idempotent reviewer assignment and policy-aware self-approval behavior (self-approve when allowed; require additional human approver when blocked by policy).
6. Require completion with source-branch deletion enabled and squash disabled by default.
7. Allow only two merge strategies by default: **Merge (no fast forward)** or **Rebase and fast-forward**. Squash is disallowed.
8. Require troubleshooting guidance for reviewer already assigned, vote API/policy quirks, remote branch already deleted, and worktree-attached local branch deletion failures.

**Reasoning:**

- Deterministic naming improves handoff quality, branch discoverability, and auditability across sessions.
- Explicit platform branching removes ambiguous automation paths and reduces environment-specific breakage.
- Idempotent PR steps make repeated runs safe in partial-failure scenarios.
- Worktree-aware cleanup prevents false failures in modern multi-worktree workflows.
- Restricting merge strategies protects commit metadata quality while preserving team flexibility between merge commits and rebase workflows.

**Rejected alternatives:**

- **Keep rebase-only merge policy** — rejected because some groups require explicit merge commits for review traceability.
- **Allow squash by default** — rejected because it loses per-commit attribution and weakens granular rollback.
- **Rely on one platform path (ADO-only or GitHub-only)** — rejected because Arcane consumers operate across both hosts.

---

## ARC-010 — Terminal-Safe CLI Banner Animation Strategy

**Date:** 2026-06-07
**Status:** Accepted

**Context:**

The bare `spell` command introduced animated banner rendering to improve first-run experience. Initial implementation used full-frame multi-line cursor rewrite effects. In practice, this produced inconsistent output across terminals, including partial glyph rendering ("sliver" artifacts), repeated flicker patterns, and abrupt handoff into help text.

Because Arcane is used in mixed terminal environments (Windows Terminal variants, integrated terminals, and non-interactive shell contexts), banner animation must prioritize compatibility and graceful degradation over effect complexity.

**Decision:**

1. Keep the ARCANE block logo and gradient styling as the canonical visual identity.
2. Use terminal-safe animation primitives for bare `spell`:
   - short single-line prelude animation (`\r` + clear-line),
   - line-by-line logo reveal,
   - line-by-line help reveal for smooth post-logo transition.
3. Keep static fallback behavior for non-interactive outputs (`TERM=dumb`, CI, or explicit animation disable).
4. Avoid full-screen multi-line cursor rewrite effects for default CLI execution.

**Reasoning:**

- Terminal-safe primitives have materially lower rendering variance across host shells.
- Progressive reveal keeps motion and polish without sacrificing legibility.
- Non-interactive fallback prevents noisy escape-sequence output in logs/automation.
- The approach balances user-visible quality with predictable portability.

**Rejected alternatives:**

- **Full-frame radar/glitch rewrite as default** — rejected due to rendering instability across terminals.
- **Disable animation entirely** — rejected because users explicitly wanted motion and improved visual identity.

---

## ARC-011 — Optional External Tracking Mode with Process-Template-Aware ADO Mapping

**Date:** 2026-06-08
**Status:** Accepted

**Context:**

Arcane spell flows had implicit Azure DevOps coupling. In practice, epic-level work items were sometimes created with incorrect types (for example, `Feature` where `Epic` was expected) because flows assumed static mappings instead of reading process-template capabilities. The framework also lacked a first-class "internal-only" tracking path, forcing external tracker assumptions even when users wanted PRD/file-based tracking only.

This caused inconsistency between process templates, hierarchy drift in external trackers, and extra operator friction in sessions that did not need external tooling.

**Decision:**

1. Add explicit tracking configuration to spell flow guidance:
   - `tracking_mode: internal | external`
   - `external_provider: ado | jira | other`
2. Make external tracking optional; internal tracking is a supported first-class mode.
3. Preserve backward compatibility by defaulting to `external + ado` only when existing ADO context is already present.
4. Require ADO mode to resolve process template and available work item types before creating/mapping hierarchy items.
5. Standardize fallback mapping by logical hierarchy level:
   - Epic-level: `Epic → Feature → User Story → Issue`
   - Feature-level: `Feature → User Story → Issue`
   - Story-level: `User Story → Issue → Task`
   - Task-level: `Task → Issue`
   - Defect-level: `Bug → Issue → Task`
6. Require explicit linkage fallback behavior when native parent/child relationships are not allowed by the selected process template:
   - Attempt native hierarchy links first.
   - If rejected, use `Related` links and preserve logical level tags (`[EPIC]`, `[FEATURE]`, etc.).
7. Add explicit TODO placeholders for provider-specific automation beyond ADO (`jira`, `other`) until those mappings are defined.

**Reasoning:**

- Optional tracking mode reduces unnecessary coupling and supports file-first workflows without losing compatibility for existing ADO users.
- Process-template-aware mapping prevents invalid assumptions about work item type availability.
- Explicit fallback/linkage rules preserve hierarchy intent even when template constraints block native parent/child links.
- Provider TODO placeholders make scope boundaries explicit and avoid pretending unsupported providers are automated.

**Rejected alternatives:**

- **Keep ADO mandatory across spell flows** — rejected because it blocks internal-only workflows and increases session setup overhead.
- **Use static hardcoded ADO type mapping without template discovery** — rejected because process-template variance causes incorrect type selection and broken hierarchies.
- **Enable Jira/other automation immediately without formal mapping specs** — rejected because behavior would be inconsistent and difficult to validate.

## ARC-012 — Generated Distributable Artifacts Require a Parity Guard

**Date:** 2026-06-20
**Status:** Accepted

**Context:**

The agent instruction files at `src/assets/.github/agents/*.agent.md` are rendered from YAML personas (`src/assets/agents/*.yaml`) by `src/modules/agent-generator.ts`, then committed into the distributable. When [ARC-003](#arc-003--agent-persona-schema-v2-and-operations-comms-persona-replacement) (Persona Schema v2) landed on 2026-05-18 (commit `c7586d2`), the generator and YAMLs were updated to emit `## Mottos`/`## Personality`/`## Voice`, but the committed distributable copies were last regenerated 2026-05-14 and were never refreshed. Every consumer installing any release since then received agent files missing their persona sections.

The dogfood root copies (`.github/agents/`) *were* regenerated on 2026-05-26, so local dogfooding looked correct and masked the drift. The full test suite (337 tests) passed throughout because no test asserts that the committed distributable matches generator output. The bug surfaced ~5 weeks later only because a session manually diffed the two trees.

**Decision:**

1. Treat regeneration of committed generated artifacts as a **required step** whenever the generator (`agent-generator.ts`) or any source persona YAML changes — the same way a `src/assets/` change requires a version bump.
2. Add a **parity test** that renders each agent from its YAML via the current generator and asserts byte-equality with the committed `src/assets/.github/agents/*.agent.md`. Drift must fail CI, not ship silently.
3. Apply the same principle to any future committed generated distributable artifact (not only agent files).

**Reasoning:**

- Committed generated files cannot be trusted to stay current through manual discipline alone; a guard converts a silent, weeks-long drift into an immediate, local test failure.
- Dogfood copies are a poor proxy for the distributable — they are regenerated on a different cadence and can mask staleness in the shipped artifact.
- A render-and-compare test is cheap, deterministic, and directly encodes the contract "the shipped file is what the generator produces."

**Rejected alternatives:**

- **Rely on documentation/process discipline to regenerate manually** — rejected; this is exactly what failed for ~5 weeks.
- **Stop committing rendered agent files and render them at build time** — viable but larger in scope (changes the registry/copy-assets model and how `dist/assets` is produced); deferred in favor of the lower-risk parity guard.
- **Generate agent files at `spell init`/`spell update` time on the consumer** — rejected for now because it moves render logic and YAML inputs into every consumer install and changes the distribution contract.

## ARC-013 — Review and Drift Quality-Gate Philosophy: Coverage Mandate over Finding Quotas

**Date:** 2026-06-22
**Status:** Accepted

**Context:**

`spell-review` previously mandated a **minimum of three findings** per review. In practice a finding
quota incentivizes manufacturing low-value or theoretical findings to satisfy the count — which
directly contradicts the spell's own "don't cry wolf" rule (only flag real, exploitable issues). On a
small or clean diff, a genuine review may legitimately produce zero findings.

Separately, `spell-check-drift` **auto-applied fixes by default**. A drift check is a diagnostic;
mutating the workspace as a side effect of running it is surprising and can entangle unrelated changes.

**Decision:**

1. Replace the minimum-finding-count quota in `spell-review` with a **dimension-coverage mandate**: the
   reviewer must explicitly address each lens — correctness, security, performance, tests,
   naming/clarity, architecture — and report "no issues" for any lens that is clean. **Zero findings is
   a valid outcome.** Operationalized via a PASS/WARN/FAIL coverage-summary table.
2. `spell-check-drift` is **report-only by default**; mechanical fixes are gated behind an explicit
   `--fix` flag.

**Reasoning:**

- Mandating *coverage of effort* (every lens considered) instead of a *count of findings* keeps reviews
  high-signal and removes the incentive to fabricate. It guards against both lazy reviews (a lens
  skipped) and noisy ones (findings invented to hit a quota).
- A diagnostic should not silently change state. Making the fix opt-in keeps the default safe and
  composable (e.g. runnable inside `spell-open-session` without side effects).

**Rejected alternatives:**

- **Keep the minimum-3 quota** — rejected; it manufactures noise and erodes trust in the review.
- **Drop the quota with no replacement** — rejected; without a coverage requirement a review can be
  lazily shallow. The coverage mandate preserves rigor without forcing a count.
- **Keep drift auto-fix as the default** — rejected; surprising mutation during a diagnostic. The
  `--fix` flag preserves the capability without making it the default.

## ARC-014 — Spell Authoring Standards: A Quality Rubric for Spell Prompts

**Date:** 2026-06-22
**Status:** Accepted

**Context:**

The spell library grew to 33 prompts over many dogfooding iterations with no defined quality bar for a
*spell prompt* itself. `product-excellence-standards.md` and `spell-enchant` grade PRDs/products, not
prompts. An audit of the older spells found recurring weaknesses: org-specific hardcoding (OSS-blocking),
context-file assumptions with no fallback, missing edge/failure cases, weak cross-references,
underspecified outputs, and ADO tracking logic copy-pasted across several spells. Without a rubric, an
"elevation" pass has nothing consistent to elevate toward, and quality drifts spell-to-spell.

**Decision:**

1. Adopt a **Spell Quality Rubric** with eight dimensions (front-matter & invocation contract;
   distributability; context-file robustness; workflow completeness; output & acceptance spec;
   cross-references; input validation & safety; conciseness & non-duplication), scored
   Bronze/Silver/Gold with **overall = weakest dimension**.
2. **Distributability (D2)** and **Safety (D7)** are **hard gates** (must be ≥ Silver). A Bronze on D2
   is OSS-blocking.
3. Authoring target is **Silver overall, Gold on D2** — Gold-everywhere is explicitly *not* required,
   to prevent bloat of mature spells.
4. Record the rubric as a governance doc `spell-authoring-standards.md` (`audience: contributor`),
   wired into the `methodology`, `governance-only`, and `full` profiles. It is an authoring-time
   standard and is **not** read at runtime by the spells it grades.
5. Add a build-time **org-token lint** over `*.prompt.md` (staged warn → fail) that operationalizes D2
   and folds in the open-source-readiness goal.

**Reasoning:**

- A weakest-link score keeps a spell honest: a great workflow with no safety rail is not a good spell.
- A Silver target (not Gold) raises the floor across the library without padding spells that are
  already fit for purpose.
- A governance doc plus a lint makes the bar durable and enforced, not a one-off pass.

**Rejected alternatives:**

- **Extend product-excellence-standards.md** — rejected; it grades product UX/accessibility/performance,
  a different domain from prompt quality. Mixing them muddies both.
- **Reuse spell-enchant** — rejected; it is PRD-specific by design (research/marketing lenses, PRD scorecard)
  and cannot grade a prompt file.
- **Ad-hoc elevation with no standard** — rejected; quality would drift spell-to-spell and the bar would
  be lost for future spells.

---

## ARC-015 — Public Naming Architecture: Brand, Package, and Binary (with `arcane` alias)

**Date:** 2026-06-23
**Status:** Accepted — **amended 2026-06-24** (public npm package name)
**Related:** [[DECISIONS#ARC-001|ARC-001]], [[DECISIONS#ARC-016|ARC-016]]

> **Note (2026-06-24): the public npm package name is `arcane-cli` (unscoped).** An initial reading assumed the `@codemagician` scope was claimable on public npm; it is not — both the bare `arcane` name (owned by another project, v2.0.6) and the `@codemagician` scope are taken. With "just `arcane`" impossible, the realistic options were the scoped `@codemagicianhq/arcane` (keeps the literal name `arcane` but buries it behind an unfamiliar scope) or an unscoped `arcane-*`. We briefly chose `arcane-framework`, then reconsidered: the `-framework` suffix reads like the product's *actual name* ("is it Arcane or Arcane Framework?") and caused real confusion in review. **`arcane-cli` avoids that** — `-cli` is a universally understood "command-line tool" marker (cf. `firebase-tools` → `firebase`, `@angular/cli` → `ng`), the most-adopted CLIs are short and unscoped, and no npm org is required. The product remains **Arcane**, the GitHub repo is `codemagicianhq/arcane`, and the binary is `spell` (+ `arcane` alias): install with `npm i -g arcane-cli`, then run `arcane init`. Nothing was lost — the package had not been published to public npm.

**Context:**

The public open-source launch (Commercialization Plan, Phase 1) forces a final lock on Arcane's
public name surfaces before the GitHub repo and public npm package exist. Three surfaces were in play
and their relationship was a live question: the **brand** is *Arcane*, the **CLI
binary** is `spell`, and the **npm package** name was not yet locked. The open question was whether the
brand≠binary split is correct, and whether the binary should be renamed to `arcane` before going public.

Verified facts: bare `arcane` is taken on public npm (v2.0.6) and the `@codemagician` scope is
unavailable; `arcane-cli`, `arcane-framework`, and `@arcane/cli` are free; `spell-cli` is taken.
`package.json` `bin` maps only `spell`. `src/index.ts` hardcodes `.name("spell")` for help output.

**Decision:**

1. **Three name surfaces, each named by its own convention — the brand≠binary split is intentional and kept:**
   - **Brand / product:** `Arcane`
   - **npm package:** `arcane-cli` (unscoped — `-cli` marks a command-line tool)
   - **CLI binary (primary):** `spell` (named for the action — "cast a spell")
2. **Add `arcane` as an alias binary** alongside `spell` (`package.json` `bin` maps both to `dist/index.js`).
   Both `spell …` and `arcane …` invoke the CLI. This closes the discoverability gap (hear "Arcane,"
   reach for `arcane`) without disturbing the `spell` metaphor.
3. **GitHub org: `codemagicianhq`**, repo: `arcane` → `github.com/codemagicianhq/arcane` (created
   2026-06-24). `codemagician` was taken; `codemagicianhq` keeps the brand string with a clean,
   suffix-free public handle. The org is an umbrella for multiple public products (Arcane and, later,
   `dark-matter-complex`).
4. **README leads with `spell`** (ties to the Spell Loop) and documents `arcane` as an equivalent alias.
5. **Follow-up (non-blocking):** make the commander program name dynamic (derive from invoked binary
   basename) so `arcane --help` prints `Usage: arcane …` instead of `Usage: spell …`. Deferred because it
   touches help output asserted by tests; tracked in TODO.

**Reasoning:**

- Brand≠binary is the prevailing pattern, not an anomaly: `@angular/cli` → `ng`, GitHub → `gh`,
  Kubernetes → `kubectl`. The package is named for the product; the binary is the verb.
- `spell` is load-bearing, not incidental: the methodology is the **Spell Loop** and the entire prompt
  library is `spell-*` (`spell-plan`, `spell-architect`, `spell-ship`). Renaming the binary to `arcane`
  would orphan that vocabulary and force an identity-level rewrite of the methodology name and ~33 prompts
  immediately before launch — high risk, and it discards the metaphor that makes Arcane memorable.
- The alias gives the discoverability upside of `arcane` at ~zero cost and zero migration.
- An unscoped `arcane-cli` needs no npm org and reads as "the Arcane CLI," matching the most-adopted
  CLI packages; the scoped `@codemagicianhq/arcane` would bury the name behind an unfamiliar scope.
- Stars accrue to the **repo**, not the org, so a "product-focused org" yields no real discovery benefit;
  an umbrella `codemagicianhq` org is the correct home for a multi-product portfolio.

**Rejected alternatives:**

- **Rename the binary `spell` → `arcane`** — orphans the Spell Loop methodology and `spell-*` prompt
  library; an identity rewrite the week before launch. Rejected.
- **Scoped `@codemagicianhq/arcane`** — keeps the literal name `arcane` but buries it behind an
  unfamiliar scope and needs an npm org. Rejected in favor of the unscoped `arcane-cli`.
- **Unscoped `arcane-framework`** — the `-framework` suffix reads like the product's *actual name*
  ("is it Arcane or Arcane Framework?") and caused confusion in review. Rejected.
- **GitHub org `arcane-framework` or `arcane-dev`** — makes the org synonymous with one product, which
  becomes awkward when `dark-matter-complex` and future products ship publicly. Rejected in favor of the
  `codemagicianhq` umbrella.

---

## ARC-016 — Public Repository Model: Fresh-Start Build-in-Public with an Org-Leak Gate

**Date:** 2026-06-24
**Status:** Accepted
**Related:** [[DECISIONS#ARC-015|ARC-015]], [[DECISIONS#ARC-001|ARC-001]]

**Context:**

Preparing the public GitHub repo (`github.com/codemagicianhq/arcane`) surfaced that the OSS-readiness
cleanup of `src/assets/` was not enough: the repo root also carried operator-specific data in the
dogfood install (`.arcane/`, `.github/`, `.claude/` — stale pre-cleanup copies), the development
`journal/`, `ai-context/`, and internal planning docs. The question was whether to scrub and publish that
history or exclude it — complicated by a genuine desire to "build in public" and dogfood Arcane
transparently.

Two clarifying facts resolved it: (1) Arcane's journals are almost entirely **framework-dev** content
(CLI, spells, dogfooding) — any sensitive business strategy lives in a separate private operations repo,
not here; (2) there is currently **no automated guard** that prevents deployment-specific tokens from
being committed (only a build-time secrets scan in `copy-assets.ts`).

**Decision:**

1. **Fresh-start the public repo at the launch version.** The public GitHub repo begins with a single
   clean initial commit of a curated subset (framework source, tests, scripts, config, `LICENSE`, a
   public `README`, scaffolding, and the resynced clean dogfood install). Pre-launch git history and the
   private development `journal/` / `ai-context/` are **not** published — they remain in the private Azure
   DevOps repo (preserved, not deleted; may also be copied to `ops`).
2. **Build forward in public from commit #1.** From launch onward, Arcane development happens in the open
   (`spell-open-session` → work → `spell-close-session` → public journal entry), so users watch the
   framework build itself with its own methodology. New journals are written public-aware and clean by
   default.
3. **Ship an org-leak gate as the enabling guard (and inaugural public feature).** A configurable
   org-token denylist (org names, ventures, machines, usernames, ADO URLs) in `.arcane.json`, surfaced as
   a `spell check-leaks` command + a pre-commit hook + a CI gate. It both fixes the recurrence root cause
   and becomes a selling point: *Arcane won't let you accidentally publish your org's private data.*
   Detailed design is deferred to its own ARC when built; tracked in TODO.
4. **MIT licensing and the brand boundary.** The code ships MIT (liability disclaimer + attribution; ARC
   reaffirms ADR-061). The MIT grant covers the code, **not** the "Arcane" name — brand/trademark is a
   separate, optional concern noted for later, and does not block the launch.

**Reasoning:**

- A fresh start is cheaper, lower-risk, and cleaner than scrubbing ~10 historical journals by hand, and a
  single clean initial commit means the public git log never contains the pre-cleanup instance data.
- Build-in-public is on-brand for a methodology framework and is *safe specifically for Arcane* because
  its journals are framework-dev, not business strategy.
- The leak gate converts "build in public" from a risky one-time manual scrub into a repeatable,
  automated discipline — and is itself a compelling product feature.
- No data is lost: the private Azure DevOps repo retains full history.

**Rejected alternatives:**

- **Scrub and publish the historical journals** — high manual effort, real residual-leak risk, and it
  publishes the messy pre-cleanup history. Rejected in favor of a fresh start + forward-only public dev.
- **Exclude journals permanently / never build in public** — forgoes the dogfooding transparency that is
  a genuine marketing and credibility asset for a methodology framework. Rejected.
- **Publish the whole repo as-is** — leaks operator data via the stale dogfood install, journals, and
  internal docs. Rejected.
- **`spell`-only, no alias** — leaves the hear-"Arcane"/type-`spell` discoverability gap unaddressed for
  no good reason given the alias is one line. Rejected.

---

## ARC-017 — Enforce Pre-PR Rebase for Agent-Initiated Pull Requests

**Date:** 2026-07-05
**Status:** Accepted
**Related:** [[DECISIONS#ARC-009|ARC-009]], [[DECISIONS#ARC-014|ARC-014]]

**Context:**

Git conventions have long required a "sync with main before opening a PR" rebase, and `spell-create-pull-request` encodes that check as Step 0.6. However, the rule was framed as a *spell* responsibility rather than an *agent* responsibility, so agents that shell out to `az repos pr create` or `gh pr create` directly (bypassing the spell) skipped the rebase entirely. This just caused a real merge conflict on `arcane-website` PR #499, wasting reviewer time and eroding trust that agent-created PRs are safe to merge.

**Decision:**

The pre-PR rebase is now an **explicit, agent-level, mandatory guard**, independent of which tool opens the PR. Governance and spell prompts have been hardened accordingly:

1. `src/assets/.arcane/governance/git-conventions.md` — new `### 🛑 Agent-mandatory pre-PR guard` subsection at the top of "PR Standards", with the exact required sequence (`git fetch origin && git rebase origin/<target-branch>`) and explicit language that raw `az repos pr create` / `gh pr create` / MCP tools are **not** an escape hatch. The existing "Pre-PR sync" table row and Agent Workflow step 3 now reference the callout.
2. `src/assets/.github/prompts/spell-create-pull-request.prompt.md` — Step 0 opens with a boxed **🛑 AGENT-MANDATORY PRE-PR CHECKLIST**; Step 0.6 was rewritten to require `git rebase` (previously used `git merge`) and to state that the guard applies to any PR-creation path.
3. `src/assets/.github/prompts/spell-commit-work.prompt.md` — the PR-creation step (9) now begins with a mandatory rebase substep (9b) that runs *before* either the GitHub or Azure DevOps flow, with subsequent substeps renumbered.

**Consequences:**

- Positive: Reviewers should no longer receive agent-created PRs with resolvable-but-unresolved conflicts. The rule is discoverable from any of three converging paths (governance doc, either spell), so an agent reading any one of them will find it.
- Positive: Bypassing the spell is now explicitly framed as a governance violation, giving humans clear grounds to reject a PR and re-run.
- Neutral: No CI/hook enforcement yet — this is a documentation and prompt-level hardening. A pre-receive hook or CI gate that rejects PR branches that are behind target is a future option (tracked informally; may become a follow-up ARC).
- Propagation: Consumer repos pick up the hardened prompts and governance file the next time they run the standard sync flow. No consumer-repo changes were made in this ADR — arcane framework only.

---

## ARC-018 — Track Claude Code Preview Launch Config in Source Control

**Date:** 2026-07-11
**Status:** Accepted

**Context:**

Claude Code's preview tooling reads `.claude/launch.json` to launch dev servers (`arcane-website`, `arcane-ui`) for in-editor previews. The file was created ad hoc during a session and left untracked, which meant it would need to be recreated from scratch in every fresh clone or session.

**Decision:**

Track `.claude/launch.json` in source control rather than leaving it untracked or gitignoring it. It is treated as project-level dev-server configuration, not personal editor state (the existing `.gitignore` exclusion for editor state only covers `.vscode/settings.json` and `.idea/`). The README's Contributing section now documents the file's one hidden assumption: `arcane-website` and `arcane-ui` are expected to be cloned as sibling directories next to `arcane` (`../arcane-website`, `../arcane-ui`).

**Reasoning:**

- The file contains no secrets or machine-specific absolute paths — only relative `--prefix` paths and ports.
- Committing it saves every future session (human or agent) from re-deriving the same preview setup, in line with this repo's "reproducible by design" philosophy.
- The sibling-clone assumption is a real constraint worth documenting explicitly rather than a reason to keep the file local-only.

**Rejected alternatives:**

- **Leave it untracked / add to `.gitignore`** — treats it like personal IDE state when it's actually shared project config with no secrets in it. Forces every session to rebuild it from memory.
