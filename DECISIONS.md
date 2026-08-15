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

| ARC                                                                                                | Title                                                                          | Date       | Status     |
| -------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------ | ---------- | ---------- |
| [ARC-001](#arc-001--arcane-ops-separation-dual-prefix-adr-strategy-and-content-ownership)          | Arcane / Ops Separation: Dual-Prefix ADR Strategy and Content Ownership        | 2026-05-04 | Accepted   |
| [ARC-002](#arc-002--distribute-vs-code-agent-mode-files-via-spell-init)                            | Distribute VS Code Agent Mode Files via spell init                             | 2026-05-14 | Accepted   |
| [ARC-003](#arc-003--agent-persona-schema-v2-and-operations-comms-persona-replacement)              | Agent Persona Schema v2 and Operations-Comms Persona Replacement               | 2026-05-18 | Accepted   |
| [ARC-004](#arc-004--image-prompt-asset-ownership-model)                                            | Image-Prompt Asset Ownership Model                                             | 2026-05-19 | Accepted   |
| [ARC-005](#arc-005--session-handoff-prompt-automatic-continuation-context)                         | Session Handoff Prompt: Automatic Continuation Context                         | 2026-05-25 | Accepted   |
| [ARC-006](#arc-006--arcane-self-installs-via-spell-init-dogfooding)                                | Arcane Self-Installs via spell init (Dogfooding)                               | 2026-05-26 | Superseded |
| [ARC-007](#arc-007--rename-spell-assess-to-spell-scope-and-add-spell-brainstorm)                   | Rename spell-assess to spell-scope and add spell-brainstorm                    | 2026-06-06 | Accepted   |
| [ARC-008](#arc-008--clean-break-for-spell-assess-removal-no-compatibility-alias)                   | Clean Break for spell-assess Removal: No Compatibility Alias                   | 2026-06-06 | Accepted   |
| [ARC-009](#arc-009--session-naming-and-pr-lifecycle-reliability-policy)                            | Session Naming and PR Lifecycle Reliability Policy                             | 2026-06-07 | Accepted   |
| [ARC-010](#arc-010--terminal-safe-cli-banner-animation-strategy)                                   | Terminal-Safe CLI Banner Animation Strategy                                    | 2026-06-07 | Accepted   |
| [ARC-011](#arc-011--optional-external-tracking-mode-with-process-template-aware-ado-mapping)       | Optional External Tracking Mode with Process-Template-Aware ADO Mapping        | 2026-06-08 | Accepted   |
| [ARC-012](#arc-012--generated-distributable-artifacts-require-a-parity-guard)                      | Generated Distributable Artifacts Require a Parity Guard                       | 2026-06-20 | Accepted   |
| [ARC-013](#arc-013--review-and-drift-quality-gate-philosophy-coverage-mandate-over-finding-quotas) | Review and Drift Quality-Gate Philosophy: Coverage Mandate over Finding Quotas | 2026-06-22 | Accepted   |
| [ARC-014](#arc-014--spell-authoring-standards-a-quality-rubric-for-spell-prompts)                  | Spell Authoring Standards: A Quality Rubric for Spell Prompts                  | 2026-06-22 | Accepted   |
| [ARC-015](#arc-015--public-naming-architecture-brand-package-and-binary-with-arcane-alias)         | Public Naming Architecture: Brand, Package, and Binary (with `arcane` alias)   | 2026-06-23 | Accepted   |
| [ARC-016](#arc-016--public-repository-model-fresh-start-build-in-public-with-an-org-leak-gate)     | Public Repository Model: Fresh-Start Build-in-Public with an Org-Leak Gate     | 2026-06-24 | Accepted   |
| [ARC-017](#arc-017--enforce-pre-pr-rebase-for-agent-initiated-pull-requests)                       | Enforce Pre-PR Rebase for Agent-Initiated Pull Requests                        | 2026-07-05 | Accepted   |
| [ARC-018](#arc-018--track-claude-code-preview-launch-config-in-source-control)                     | Track Claude Code Preview Launch Config in Source Control                      | 2026-07-11 | Accepted   |
| [ARC-019](#arc-019--repository-document-ownership-and-path-model)                                  | Repository Document Ownership and Path Model                                   | 2026-07-31 | Accepted   |
| [ARC-020](#arc-020--canonical-repository-configuration-schema)                                     | Canonical Repository Configuration Schema                                      | 2026-07-31 | Proposed   |
| [ARC-021](#arc-021--vendored-framework-content-attribution)                                        | Vendored Framework Content Attribution                                         | 2026-07-31 | Accepted   |
| [ARC-022](#arc-022--fail-safe-ci-path-filter-policy)                                               | Fail-Safe CI Path-Filter Policy                                                | 2026-07-31 | Proposed   |
| [ARC-023](#arc-023--normative-controls-require-inline-enforcement-contracts)                       | Normative Controls Require Inline Enforcement Contracts                        | 2026-07-31 | Accepted   |
| [ARC-024](#arc-024--confirmed-severity-must-have-operational-consequences)                         | Confirmed Severity Must Have Operational Consequences                          | 2026-07-31 | Accepted   |
| [ARC-025](#arc-025--pin-publish-tooling-to-the-supported-node-runtime)                             | Pin Publish Tooling to the Supported Node Runtime                              | 2026-08-01 | Accepted   |
| [ARC-026](#arc-026--explicit-self-hosted-manifest-and-authoritative-root-validation)               | Explicit Self-Hosted Manifest and Authoritative Root Validation                | 2026-08-02 | Accepted   |
| [ARC-027](#arc-027--registry-driven-self-host-parity-guard)                                        | Registry-Driven Self-Host Parity Guard                                         | 2026-08-02 | Accepted   |
| [ARC-028](#arc-028--concurrency-and-isolation-model-for-parallel-work)                             | Concurrency and Isolation Model for Parallel Work                              | 2026-08-15 | Proposed   |
| [ARC-029](#arc-029--best-practice-first-solution-selection-standard)                               | Best-Practice-First Solution Selection Standard                                | 2026-08-15 | Proposed   |

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
| ADR-030 | Canonical Agent Git Identity Domain                                                         | Agent identity                                 |
| ADR-031 | Agent Roster Overhaul: Role Consolidation and Thematic Naming                               | Agent roster                                   |
| ADR-032 | Agent Autonomy Redesign: Gamified Power Levels with Context-Dependent Assignment            | Autonomy model                                 |
| ADR-034 | Actionable Recommendation Guardrails                                                        | Recommendation safety                          |
| ADR-038 | Separation-Ready Framework: Keep Reusable Components In-Repo Until External Consumer Exists | Extraction boundary — **fulfilled by ARC-001** |
| ADR-048 | Code Versus Docs Branch Policy                                                              | Git and PR policy                              |
| ADR-049 | Spell Loop: Autonomous Implementation Loop + Structured Planning + Spell System             | Core methodology                               |
| ADR-050 | Testing Standards: Framework Selection and Coverage Policy                                  | Testing policy                                 |
| ADR-051 | Infrastructure Agent Ownership                                                              | Agent responsibility                           |
| ADR-052 | Product Excellence Standards and spell-enchant PRD Quality Enhancement                      | Quality gates                                  |
| ADR-054 | Feature Folder Convention: Per-Repo Spell Artifact Persistence                              | Project structure                              |
| ADR-061 | Arcane Framework Identity: Name, 4-Layer Architecture                                       | Core framework identity                        |
| ADR-062 | npm CLI as Governance Package Distribution Format                                           | Distribution format                            |
| ADR-068 | Root Cause Analysis Standard                                                                | Governance improvement                         |
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

The `spell close session` → `spell open session` loop is designed to preserve continuity across chat resets. Close-session captures _state_ (journal, TODO, decisions, system-prompt-context) but not the **precise continuation point** — the exact task in progress, last concrete step, and next action. Open-session reconstructs context from scratch by reading all docs and inferring priorities, producing correct-but-broad output rather than a surgical "resume here" kickstart. Users have been bridging this gap by manually writing a handoff note at the end of each close-session.

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
**Status:** Superseded by [ARC-027](#arc-027--registry-driven-self-host-parity-guard)

> This decision remains visible as historical context. ARC-027 replaces its non-executable claim that `spell update` refreshes the root dogfood copies after each release. Its rejected alternatives, especially the symlink analysis, remain applicable.

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

The dogfood root copies (`.github/agents/`) _were_ regenerated on 2026-05-26, so local dogfooding looked correct and masked the drift. The full test suite (337 tests) passed throughout because no test asserts that the committed distributable matches generator output. The bug surfaced ~5 weeks later only because a session manually diffed the two trees.

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

- Mandating _coverage of effort_ (every lens considered) instead of a _count of findings_ keeps reviews
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
_spell prompt_ itself. `product-excellence-standards.md` and `spell-enchant` grade PRDs/products, not
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
3. Authoring target is **Silver overall, Gold on D2** — Gold-everywhere is explicitly _not_ required,
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

> **Note (2026-06-24): the public npm package name is `arcane-cli` (unscoped).** An initial reading assumed the `@codemagician` scope was claimable on public npm; it is not — both the bare `arcane` name (owned by another project, v2.0.6) and the `@codemagician` scope are taken. With "just `arcane`" impossible, the realistic options were the scoped `@codemagicianhq/arcane` (keeps the literal name `arcane` but buries it behind an unfamiliar scope) or an unscoped `arcane-*`. We briefly chose `arcane-framework`, then reconsidered: the `-framework` suffix reads like the product's _actual name_ ("is it Arcane or Arcane Framework?") and caused real confusion in review. **`arcane-cli` avoids that** — `-cli` is a universally understood "command-line tool" marker (cf. `firebase-tools` → `firebase`, `@angular/cli` → `ng`), the most-adopted CLIs are short and unscoped, and no npm org is required. The product remains **Arcane**, the GitHub repo is `codemagicianhq/arcane`, and the binary is `spell` (+ `arcane` alias): install with `npm i -g arcane-cli`, then run `arcane init`. Nothing was lost — the package had not been published to public npm.

**Context:**

The public open-source launch (Commercialization Plan, Phase 1) forces a final lock on Arcane's
public name surfaces before the GitHub repo and public npm package exist. Three surfaces were in play
and their relationship was a live question: the **brand** is _Arcane_, the **CLI
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
- **Unscoped `arcane-framework`** — the `-framework` suffix reads like the product's _actual name_
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
   and becomes a selling point: _Arcane won't let you accidentally publish your org's private data._
   Detailed design is deferred to its own ARC when built; tracked in TODO.
4. **MIT licensing and the brand boundary.** The code ships MIT (liability disclaimer + attribution; ARC
   reaffirms ADR-061). The MIT grant covers the code, **not** the "Arcane" name — brand/trademark is a
   separate, optional concern noted for later, and does not block the launch.

**Reasoning:**

- A fresh start is cheaper, lower-risk, and cleaner than scrubbing ~10 historical journals by hand, and a
  single clean initial commit means the public git log never contains the pre-cleanup instance data.
- Build-in-public is on-brand for a methodology framework and is _safe specifically for Arcane_ because
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

Git conventions have long required a "sync with main before opening a PR" rebase, and `spell-create-pull-request` encodes that check as Step 0.6. However, the rule was framed as a _spell_ responsibility rather than an _agent_ responsibility, so agents that shell out to `az repos pr create` or `gh pr create` directly (bypassing the spell) skipped the rebase entirely. This just caused a real merge conflict on `arcane-website` PR #499, wasting reviewer time and eroding trust that agent-created PRs are safe to merge.

**Decision:**

The pre-PR rebase is now an **explicit, agent-level, mandatory guard**, independent of which tool opens the PR. Governance and spell prompts have been hardened accordingly:

1. `src/assets/.arcane/governance/git-conventions.md` — new `### 🛑 Agent-mandatory pre-PR guard` subsection at the top of "PR Standards", with the exact required sequence (`git fetch origin && git rebase origin/<target-branch>`) and explicit language that raw `az repos pr create` / `gh pr create` / MCP tools are **not** an escape hatch. The existing "Pre-PR sync" table row and Agent Workflow step 3 now reference the callout.
2. `src/assets/.github/prompts/spell-create-pull-request.prompt.md` — Step 0 opens with a boxed **🛑 AGENT-MANDATORY PRE-PR CHECKLIST**; Step 0.6 was rewritten to require `git rebase` (previously used `git merge`) and to state that the guard applies to any PR-creation path.
3. `src/assets/.github/prompts/spell-commit-work.prompt.md` — the PR-creation step (9) now begins with a mandatory rebase substep (9b) that runs _before_ either the GitHub or Azure DevOps flow, with subsequent substeps renumbered.

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

---

## ARC-019 — Repository Document Ownership and Path Model

**Date:** 2026-07-31
**Status:** Accepted 2026-08-02
**Intake:** [EF-02](docs/intake/batch-001/EF-02.md)

**Context:**

Arcane installs governance under `.arcane/governance/`, while many canonical spells read root-level `governance/`, `agents/`, `security/`, and `playbooks/` paths. Other spells use the installed dotted paths. Consumers therefore cannot tell whether `.arcane/` is the editable project instance or a vendored template for a second operator-owned layer.

**Decision:**

1. Use one framework-governance layer at `.arcane/governance/`. Every spell references that installed path; Arcane does not scaffold a duplicate root `governance/` tree.
2. Keep project-owned orientation and continuity at the repository root (`README.md`, `project.md`, `TODO.md`, `DECISIONS.md`) and in `ai-context/` / `journal/`. These files are install-once and preserved when present.
3. Put additive operator/domain documents at explicit paths such as `docs/`, `security/`, `infrastructure/`, or a configured business root. Template statements that a filled-in instance belongs in an ops repo refer to operator data, not a second copy of every framework standard.
4. Publish a discoverable "Where Documents Live" section in portable bootstrap and mechanically reject spell links to the nonexistent un-dotted governance layer.

**Reasoning:**

One model must control installation and spell lookup. A second complete governance tree would recreate the same two-copy drift failure that ARC-027 now prevents inside the source repository.

**Open follow-up — managed-standard overrides:**

The single-layer model does not yet let an operator override a shipped standard safely. Editing `.arcane/governance/git-conventions.md` can be overwritten by `arcane update`; this is the EF-25 failure class applied to managed governance content. Additive project documents are unaffected. The override/customization model remains open in the [vendor-neutral customization backlog](TODO.md) filed 2026-07-14 and must define precedence and update-safe ownership before Arcane claims managed standards are customizable.

**Rejected alternatives:**

- **Continue mixed dotted and un-dotted references with fallbacks** — rejected because graceful fallback masks missing canonical inputs and makes behavior differ by spell.
- **Scaffold two complete governance layers** — rejected because duplicated standards create independent update paths and repeat the drift class addressed by ARC-027.

---

## ARC-020 — Canonical Repository Configuration Schema

**Date:** 2026-07-31
**Status:** Proposed
**Intake:** [EF-14](docs/intake/batch-001/EF-14.md)

**Context:**

Spells read operator identity, subject/business roots, tracking mode/provider, provider coordinates, and repository lists from `.arcane.json`, but the manifest schema contains none of those fields. EF-14 deliberately merges three submissions because independent field patches would create incompatible configuration shapes.

**Proposed decision:**

Define one versioned, published repository-configuration schema covering operator identity references, subject/business roots, tracking configuration, provider coordinates, and configured repositories. Init writes it once; update backfills schema changes without overwriting user values; unconfigured required values produce visible drift rather than silent inference.

The final decision must settle whether user-owned configuration remains inside `.arcane.json` or moves to a separate file with an independent update lifecycle. Secrets are prohibited from either location.

**Reasoning:**

Persistent framework inputs need one upgrade-safe source of truth. Repeated prompts and ambient ADO inference are not persistence mechanisms.

**Rejected alternatives:**

- **Add `operatorDomain`, `businessRoot`, and tracker fields independently** — rejected because three local fixes would encode three ownership and migration models.

---

## ARC-021 — Vendored Framework Content Attribution

**Date:** 2026-07-31
**Status:** Accepted
**Intake:** [EF-15](docs/intake/batch-001/EF-15.md)

**Context:**

The attribution model distinguishes human and agent-produced content but does not classify files copied from the Arcane package. Every initial scaffold and managed update therefore requires an undocumented authorship judgment.

**Decision:**

1. Define Arcane-vendored scaffold and managed-update content as a third provenance class.
2. Do not invent an Arcane email identity. A vendor-only repository action uses the operator's normal Git author/committer identity with required `Vendor: arcane-cli` provenance.
3. Include `Vendor-Version` only when it is derived programmatically at commit time from the installed CLI. `arcane --version` / `spell --version` reads that installed package's `package.json`; never type, remember, or infer the value. If resolution fails, omit the trailer and report incomplete provenance.
4. Partition mixed vendored, human, and agent work under EF-16 before concern grouping so one commit never attributes operator customizations to the package or vendored content to an agent.

**Reasoning:**

Git's author field records who performed the repository action; the vendor trailers record who produced the copied content. This preserves queryable package provenance without fabricating an identity. Programmatic version derivation applies the same evidence standard as model-source metadata.

**Rejected alternatives:**

- **Keep human-as-author as an undocumented default** — rejected because every deployment rediscovers the same evidentiary choice.
- **Create an Arcane vendor email identity** — rejected because copied package provenance is not a person/tool mailbox and would fabricate identity metadata.
- **Type `Vendor-Version` manually** — rejected because a plausible hand-entered version becomes unverifiable and stale within one release.

---

## ARC-022 — Fail-Safe CI Path-Filter Policy

**Date:** 2026-07-31
**Status:** Proposed
**Intake:** [EF-22](docs/intake/batch-001/EF-22.md)

**Context:**

The Node.js pipeline template has no path filter, while .NET and Terraform templates use include-only filters that can silently omit new code locations. Arcane also produces routine docs-only commits, so the current guidance wastes constrained CI capacity while leaving a fail-open expansion hazard.

**Proposed decision:**

Base CI skipping only on changed paths, never commit message, author, or branch-name metadata. Prefer narrow exclusions for known inert documentation locations so new code paths fail safe by running CI. Pipeline definitions, manifests, lockfiles, scripts, migrations, containers, and infrastructure remain triggering inputs. Provider branch-policy filters must be documented and tested alongside YAML triggers.

Acceptance requires fixtures for docs-only, code-only, mixed, new-directory, and pipeline-definition changes.

**Reasoning:**

Wasteful-but-safe is preferable to silently shipping a new code directory without validation. Commit messages are attacker-controlled metadata and cannot be a trust signal.

**Rejected alternatives:**

- **Use `[skip ci]` or a `docs(...)` commit prefix** — rejected as a security bypass primitive.
- **Maintain include lists of known code directories** — rejected because new code locations fail open.

---

## ARC-023 — Normative Controls Require Inline Enforcement Contracts

**Date:** 2026-07-31
**Status:** Accepted
**Intake:** [EF-24](docs/intake/batch-001/EF-24.md)

**Context:**

External intake batch 001 found repeated cases where Arcane states configurability, preservation, validation, consent, or authorization requirements without a working mechanism. The audit itself reproduced the problem when a structured consent question received a synthetic host response while the operator was available, and the workflow initially treated tool completion as authoritative.

**Decision:**

Every normative rule in shipped governance, prompts, and instructions declares one primary enforcement mode at the rule itself:

1. **Executable check** — code or tests deterministically enforce the invariant.
2. **Structured spell gate** — the workflow requires an observable state or authenticated operator response before proceeding.
3. **Verified external platform policy** — another system enforces the rule and Arcane verifies that policy exists and matches declared configuration.
4. **Explicitly advisory prose** — guidance intentionally depends on judgment, says that it is advisory, and does not claim mechanical enforcement.

Enforcement declarations are inline or immediately adjacent. A separate registry is prohibited because it can drift from the rules it describes.

Implementation includes a retroactive pass over every existing normative statement. Each rule must be classified in place; non-advisory mechanisms must be verified; honest advisory downgrades are required where no gate is intended; and discrepancies are filed independently. EF-25 through EF-29 remain separate concrete bugs.

EF-24 is complete only when no shipped normative statement remains unclassified, every non-advisory rule has a verified owner/mechanism, every advisory rule is visibly labeled, and the retroactive inventory records a zero-unclassified result.

Structured consent gates fail closed. A timeout, cancellation, absence signal, delegated response, or host-generated fallback is not operator consent and must not be interpreted as approval or disposition.

**Reasoning:**

Colocating mode and rule prevents a second source of truth. The advisory mode preserves valuable guidance without pretending it is a gate. Retroactive classification turns the decision into bounded implementation work and exposes existing control drift rather than binding only future prose.

**Rejected alternatives:**

- **Central enforcement registry** — rejected because it can drift independently from the controls it classifies.
- **Require every rule to be executable** — rejected because sound advisory guidance would be deleted or mechanized beyond what the framework can safely enforce.
- **Apply the rule only to future governance** — rejected because current unclassified controls are the demonstrated risk and would leave this ADR unwired.

---

## ARC-024 — Confirmed Severity Must Have Operational Consequences

**Date:** 2026-07-31
**Status:** Accepted — 2026-08-01
**Intake:** [EF-30](docs/intake/batch-001/EF-30.md)

**Context:**

Commit `5bc1b72` filed a field-confirmed data-loss bug on 2026-07-14 with complete root cause, affected files, ownership semantics, and a regression test. A second unrelated deployment independently rediscovered the identical defect 17 days later and added no technical information. The bug remained unfixed while routine backlog work continued.

The TODO audit found nine open source-confirmed, accepted-but-unimplemented, or directly observed defects including the data-loss item. Eight others were already open; the oldest defect filing was 21 days old, and ARC-012's underlying accepted guard was 41 days old. None of the pre-batch entries had operational severity metadata. At least three other items are now independently classified High.

Recording severity therefore has no defined consequence. "DATA LOSS" is an emphatic phrase in an ordinary checkbox, not a state transition, release constraint, ownership assignment, response deadline, or explicit risk decision.

**Decision:**

Adopt a machine-readable incident-severity lifecycle for confirmed defects using these two enforcement mechanisms:

1. A release gate for unresolved Critical/High data-integrity or security defects.
2. A `doctor`/build check that verifies the queue and enforces that release gate.

A maintainer may explicitly defer an otherwise blocking defect with exactly one dated line:

`Deferred <date> — known open, accepting the risk.`

Missing severity on a confirmed data-integrity/security defect fails closed. Research uncertainty remains distinguishable from source-confirmed behavior.

Implementation includes retroactive classification and disposition of the current defect inventory. Acceptance evidence must show that the chosen mechanism would have escalated EF-25 when it was first filed on 2026-07-14. A future-only policy is insufficient.

**Reasoning:**

Detection succeeded twice; prioritization failed. A severity label that does not alter workflow is another declared control without wiring. Machine-readable state and an explicit release/risk consequence turn detection into action while preserving a deliberate escape hatch for a solo maintainer.

**Rejected alternatives:**

- **Rely on emphatic wording in TODO items** — rejected because "confirmed — DATA LOSS" remained an ordinary peer for 17 days.
- **Treat every open bug as release-blocking** — rejected because unverified research and low-impact defects need different handling.
- **Bind only future defects** — rejected because the existing confirmed backlog is the demonstrated exposure and must be classified retroactively.
- **Severity-ordered queue with explicit owner and response deadline** — rejected for this single-maintainer project. Assigning every incident back to the sole maintainer adds ceremony that will be skipped; a skipped control is worse than no control. A future maintainer with a team may revisit ownership and deadlines when they produce real routing value.
- **Multi-field risk-acceptance record** — rejected because requiring scope, exposure, mitigation, review date, and release effect makes routine deferral too expensive. The control's value is the deliberate, dated act of accepting known risk; by the third deferral, a longer form would be skipped and recreate the unwired-policy failure ARC-023 prohibits.

---

## ARC-025 — Pin Publish Tooling to the Supported Node Runtime

**Date:** 2026-08-01
**Status:** Accepted

**Context:**

The publish workflow ran on Node 20 but installed `npm@latest`. When npm 12 became the latest release, the workflow failed before publication because npm 12 requires a newer Node runtime. Trusted publishing itself was healthy; the failure was caused by an unbounded tool-version dependency.

**Decision:**

Pin the publish workflow to npm 11 while CI and publish jobs use Node 20, and retain a manual workflow-dispatch path for recovery after a release has already been created. Validate the workflow with a regression test covering both invariants.

**Reasoning:**

The publish tool must remain compatible with the declared runtime and should not change major versions implicitly during a release. Manual dispatch provides a bounded recovery path without recreating tags or changing package contents. The fix was verified by a successful OIDC publication of `arcane-cli@0.15.0`.

**Rejected alternatives:**

- **Install `npm@latest`** — rejected because an external major-version change broke the Node 20 release path.
- **Upgrade the workflow runtime immediately** — rejected because it expands release risk and is unrelated to the package publication contract.
- **Republish by creating another release tag** — rejected because the existing release was valid; only the workflow toolchain needed correction.

---

## ARC-026 — Explicit Self-Hosted Manifest and Authoritative Root Validation

**Date:** 2026-08-02
**Status:** Accepted

**Context:**

The Arcane source repository dogfoods its own installed governance files, but the generated root `.arcane.json` is intentionally gitignored because it represents installed-target state. Without a committed source-tree marker, `doctor` reported the framework repository as uninitialized. A broad fallback would also risk hiding a malformed generated root manifest behind a valid source manifest.

**Decision:**

1. Commit `src/assets/.arcane.json` as the source repository's explicit self-hosting manifest with `selfHosted: true`, `tracking_mode: "internal"`, and `external_provider: null`.
2. Keep the generated root `.arcane.json` ignored; add only a negation rule for the committed source manifest.
3. Make `doctor` prefer the root manifest and use the source manifest only when the root manifest is absent. Invalid root JSON remains a failure and must never be masked by fallback.
4. Type tracker settings as manifest fields, including a nullable external provider for internal tracking.

**Reasoning:**

An explicit marker makes the narrow self-hosting exemption auditable and keeps source truth separate from generated consumer state. Root-first resolution preserves the installed repository contract, while refusing fallback on parse errors prevents a broken generated configuration from appearing healthy.

**Rejected alternatives:**

- **Treat every source manifest as self-hosted** — rejected because an unmarked or externally tracked source tree should not receive an implicit exemption.
- **Fall back after any root-manifest error** — rejected because malformed root JSON must remain visible and actionable.
- **Commit the generated root manifest** — rejected because it conflates installed-target state with framework source truth and changes the existing ignore contract.

---

## ARC-027 — Registry-Driven Self-Host Parity Guard

**Date:** 2026-08-02
**Status:** Accepted
**Supersedes:** [ARC-006](#arc-006--arcane-self-installs-via-spell-init-dogfooding)

**Context:**

ARC-006 assumed the Arcane source repository could refresh its installed dogfood copies by running `spell update` after each release. That path cannot execute: the generated root `.arcane.json` is deliberately ignored, while `update.ts` requires that root manifest and iterates only `manifest.components`. Six root files consequently accumulated real content drift after the `0.15.0` and `0.15.1` merges, including a PR spell that instructed merge where canonical governance required rebase.

Raw byte comparison also obscured the defect. It initially reported 38 differing files although only 6 had substantive content changes; the rest were line-ending-only differences. A permanently red parity check would be ignored just like a permanently failing health check.

**Decision:**

1. Treat registered files under root `.github/`, `.arcane/`, and `.claude/` as **generated dogfood output**. `src/assets/` is canonical. Contributors edit canonical sources only; `npm run fix:self-host-parity` is the sole supported writer for generated root copies.
2. Derive parity scope from `src/modules/registry.ts`. Do not maintain a second file list. Exclude `skipExisting` components because they are explicitly user-owned.
3. Compare canonical and generated content after normalizing `CRLF` and lone `CR` to `LF`. Line-ending-only differences are clean and must not fail the gate.
4. Provide a dedicated `--check` mode that never writes and exits nonzero for missing or substantively drifted generated files. CI runs this check as a required step; it is a failure gate, not a warning.
5. Provide a dedicated `--fix` mode that copies canonical content to missing or substantively drifted generated paths. Do not add self-host behavior to the consumer update command.
6. Require negative regression coverage: create real root drift and assert the exact CI command fails. A clean-state-only test is insufficient evidence; this is the fourth observed recurrence of EF-26's inert-control lesson.
7. Keep active tracking provenance accurate: internal tracking is operator-selected and session-scoped because no root `.arcane.json` or active PRD persists it. ARC-026's `src/assets/.arcane.json` is a self-hosted doctor marker, not active repository configuration; persistent tracking remains EF-14's unresolved scope.

**Reasoning:**

- Registry-derived scope makes the existing installation contract the single source of truth.
- A dedicated command separates source-repository generation from consumer update semantics.
- EOL normalization preserves signal on Windows and Linux without weakening substantive comparison.
- A negative fixture proves the gate detects the failure it exists to prevent.
- Declaring root copies generated removes ambiguous ownership and prevents well-intentioned direct edits.

**Rejected alternatives:**

- **Commit a special root self-host manifest and reuse `spell update`** — rejected because it creates a second manifest model and conflicts with the deliberate root-manifest ignore contract preserved by ARC-026.
- **Add a self-host branch to `update.ts`** — rejected because `update.ts` is the consumer command that only days earlier shipped the EF-25 data-loss bug. Adding repository-specific behavior to that highest-risk write path immediately after remediation expands its blast radius without need.
- **Maintain a separate parity file list** — rejected because it would drift independently from the registry, recreating the same defect at a new layer.
- **Fail on raw byte differences** — rejected because checkout-dependent line endings make the gate permanently red and train maintainers to ignore it.
- **Use symlinks instead of generated copies** — remains rejected for the Windows and copier-path reasons preserved in ARC-006. This repository's own local `.git/config` sets `core.symlinks=false`, so the rejection is a demonstrated constraint of the maintainer's actual environment, not merely a judgment call about symlink fragility — modern Windows symlink support does not apply here because it is disabled, not absent.

---

## ARC-028 — Concurrency and Isolation Model for Parallel Work

**Date:** 2026-08-15
**Status:** Proposed
**Intake:** [EF-33](docs/intake/batch-001/EF-33.md)

**Context:**

One working tree supports one thing at a time. On 2026-07-10 a live session had its branch switched underneath it mid-run by another actor glancing at `main` from a second terminal — the session recovered via reflog, and the incident chartered this record's research spike (TODO: "Concurrency model: parallel work for solo operators"). The same shared-tree configuration also produced a second incident class: files parked at the repository root by one session were swept into an unrelated pull request by a co-tenant session.

Parallelism evidence exists on both sides. A 2026-07-17 dogfooding run executed four epics as separate `spell-full-cycle` invocations — three in parallel isolated worktrees — against one consumer repo: two epics independently claimed the same DB-migration sequence number and two added conflicting imports to the same file region, all surfacing only at human merge review. A 2026-07-22 re-run of three invocations strictly serialized in one workspace produced zero cross-run collisions and zero migration incidents.

Worktrees carry their own recorded hazards. All linked worktrees share one physical `.git/config`: a test fixture's `git init` inherited `GIT_DIR` and contaminated the shared config, flipping `core.bare` and overwriting identity (journal 2026-08-03). And a repository read through a cross-filesystem mount honestly reported eight healthy linked worktrees as `prunable` — a `git worktree prune` from that vantage point would have deregistered all of them with no warning ([EF-33](docs/intake/batch-001/EF-33.md)).

A prior decision in the operator's private operations records (ADR-058) selected per-agent **full clones** for autonomous daemon fleets, rejecting worktrees there because shared `.git` state raises lock-contention risk under concurrent unattended cron auto-pulls. That rejection is scoped to the daemon topology; it says nothing about interactive sessions.

A 2026-08-14 live observation supplied the missing positive evidence: two concurrent interactive sessions ran against one repo, one in the primary checkout and one in a linked worktree. The worktree session could neither see nor disturb the primary's pre-existing uncommitted files; git itself refused to check the same branch out twice; and the merge path (topic branch → PR gate) was identical from both. While drafting this very record, the source repository's primary checkout was found occupied by another active session (staged changes on its own session branch) — the drafting session applied rule R3 below and proceeded in a fresh linked worktree without touching the primary.

Finally, the concept has no name. Four colliding "workspace" terms are in circulation (git worktree · VS Code workspace · Codespaces · OpenClaw workspace), DMC must be able to render N concurrent sessions as a control center, and the model must pass the brother test — a non-technical user should never fear the button. Per the spike charter, this ADR proposes the model before any implementation.

**Decision:**

1. **Three isolation primitives, five decision inputs.** Every unit of work runs in exactly one of: the **primary checkout**, a **linked worktree**, or a **full clone**. The primitive is selected from: purpose (produce work vs. manage repo state), concurrent-actor count, task footprint overlap, autonomy level (interactive vs. unattended), and local-state needs (visibility of uncommitted state; untracked tooling such as `node_modules`/`.env`).
2. **R1 — Repo-state management runs in the primary checkout only.** Reconciling uncommitted files, branch pruning, fast-forwarding `main`, releases, and worktree lifecycle operations are primary-checkout work. This explicitly includes local `--ff-only` self-merge of `main`: a linked worktree cannot hold `main` while the primary does, so from any other primitive, self-merge (where power level permits it) goes through the platform's PR merge instead of a local fast-forward.
3. **R2 — A solo session defaults to the primary checkout on a session branch.** The zero-friction path stays the do-nothing path: one actor, one checkout, standard session-branch discipline, no new tooling.
4. **R3 — Every additional concurrent interactive session gets its own linked worktree.** At most one actor occupies the primary checkout at a time. Never switch or delete a branch attached to another worktree; git's refusal to double-checkout a branch is the enforcement, not an obstacle.
5. **R4 — Overlapping footprints serialize.** Parallel tasks that touch the same files or shared sequences (DB migration numbers, generated indexes) must not run in parallel isolation: run them sequentially in one workspace, or re-scope them to disjoint footprints first. Isolation hides collisions until merge review; serialization is the safe default until re-derivation tooling (fresh-pull sequence re-derivation, shared numbering locks) exists.
6. **R5 — Autonomous daemons with unattended automated git operations use full clones.** This upholds the private ADR-058 decision within its scope: cron-driven fleets contend on shared `.git` state, and clone isolation also contains blast radius.
7. **R6 — Delegation states the primitive.** When the orchestrator delegates work, the delegation message must name the isolation primitive for the task, extending the existing rule that delegation must name the target repo.
8. **R7 — Hazard rails.** All linked worktrees share one physical `.git` and `.git/config`: treat config-mutating operations as fleet-wide. Any `git worktree prune`, `worktree remove`, `gc`, or branch deletion requires a same-vantage-point existence check first (adopting EF-33's proposed rule — a path that resolves as dead through a mount may be alive). A branch attached to an active worktree cannot be locally deleted — skip local delete, use remote delete + prune. A fresh worktree contains no untracked tooling state; budget for re-install in code repos.
9. **R8 — The primitive never changes governance.** Topic branch, attribution, and PR gate are identical from every primitive. The existing "return to `main` after merge" convention is hereby scoped to the primary checkout: a worktree session ends with push → PR → worktree removal (performed from the primary vantage point per R7), not with a checkout of `main`.
10. **Naming.** The chosen Arcane word names the **product-level container concept** — the isolated parallel-session unit that DMC renders — and never replaces git vocabulary in technical payloads ("worktree" remains the correct term for the git primitive). Live four-check results (who coined it · estate activity · same-audience claims · first association):

    | Candidate | Four-check result | Verdict |
    |---|---|---|
    | **Wing** | Common English; no estate. **Same-audience conflict: Wingware's Wing Python IDE — active commercial developer IDE, now shipping AI-assisted development.** | Kill-leaning |
    | **Parlor** | Common English; parlor magic is public-domain stage-magic vocabulary. Two small active tech products (Parlor.fm social app; Parlor customer-collaboration SaaS) — adjacent, no giant, neither in agent/CLI tooling. | Viable, with disclosure |
    | **Séance** | French common noun — literally "a sitting/session," etymologically exact. Séance lore ties to the roster (Bess). **Adjacent AI claim: "Seance AI" (AE Studio), a consumer talk-to-the-departed product.** Occult first-association and the diacritic (CLI: `seance`) are brother-test considerations. | Viable, with flags |
    | **Cabinet** | Spirit cabinet (Davenport Brothers, 1850s) is public-domain stage-magic lore. Active claims are out-of-space (woodworking CAD cluster; Microsoft's dormant `.cab` archive format). **Internal collision: the File Cabinet UI concept already planned for DMC.** | Viable, with internal-collision flag |

    Prior kills for the record: Backstage (Spotify OSS developer portal), Vault (HashiCorp), Studio (saturated), Stage/Staging (collides with git/deploy vocabulary). **Selection: operator pick at review of this record.** Corollary of the naming standard's "the more autonomous the tool, the more boring its name": daemon full clones (the most autonomous primitive) do **not** take the lore word.
11. **Follow-up scope — explicitly not executed by this record:** (a) governance wording updates — scope git-conventions' "return to main after merge" to the primary checkout, add the working-tree dimension to agent-policies' Multi-Agent Concurrency Rules, and scope the Magus+ local ff-merge flow per R1 (each touches `src/assets/` → version bump + parity regeneration); (b) spell updates — `spell-open-session` primitive selection at session start, `spell-close-session` worktree-aware session ending, `spell-full-cycle` multi-epic serialization guidance per R4; (c) DMC rendering contract for N session containers; (d) EF-33 rails implementation (flips EF-33 `deferred → shipped`); (e) naming rollout after the operator's pick.

**Reasoning:**

- **The model is evidence-shaped, not aesthetic.** Every rule maps to a recorded incident: R1/R3 to the 2026-07-10 branch-switch and root-sweep incidents, R4 to the 2026-07-17 collision vs. 2026-07-22 zero-collision pair, R5 to the private ADR-058 lock-contention finding, R7 to the shared-config contamination and EF-33 near-miss, R8 to the 2026-08-14 observation that the PR gate is primitive-independent.
- **The brother test is satisfied by construction.** The default (R2) is the do-nothing path; every escalation is additive and reversible, and the scariest operations (prune, remove, config mutation) are fenced behind R7's explicit checks.
- **DMC gets a clean rendering contract:** one container = one primitive instance; the primary checkout is simply the container that also holds repo-state authority.
- **Enforcement is free where possible.** Git already refuses double-checkout of a branch and already blocks deletion of worktree-attached branches — the model treats those refusals as guardrails to lean on rather than errors to work around.

**Rejected alternatives:**

- **Plain branches in one shared tree for concurrent actors** — rejected: this is the exact configuration that produced the 2026-07-10 branch-switch and root-sweep incident class.
- **Full clones for interactive sessions** — rejected: heavyweight (no shared object store, duplicated tooling state, slower spin-up), and the private ADR-058 rationale for clones is scoped to unattended daemon fleets, not interactive work.
- **Worktree-always, no primary default** — rejected: violates the near-zero-friction constraint for solo operators, and forfeits the primary checkout's unique visibility into pre-existing uncommitted state (the 2026-08-14 observation).
- **An Arcane-native virtual workspace layer** — rejected: nothing ships today; delegation itself is still persona roleplay in practice (no runtime agent registry), so building a novel isolation layer would stack an unproven abstraction on an unshipped one. Build on git primitives every tool already understands.
- **Coordination locks to keep overlapping-footprint work parallel** — rejected: the 2026-07-17 vs. 2026-07-22 evidence says serialization, not added machinery, is the safe default until re-derivation tooling exists.

---

## ARC-029 — Best-Practice-First Solution Selection Standard

**Date:** 2026-08-15
**Status:** Proposed
**Intake:** [EF-34](docs/intake/batch-001/EF-34.md)

**Context:**

Twice in one incident chain, expedience silently displaced correctness. First, the 2026-08-03 contamination firings were closed with a journal-documented `--no-verify` workaround instead of a root-cause fix — the expedient path became institutional practice, unfiled and unfixed, until the class fired a third time (EF-34). Second, while scoping that fix on 2026-08-15, the drafting agent recommended the minimal option (scrub hook environment only) over the community-standard hook shape (fast pre-commit; full suite on pre-push) — not because the minimal option was better, but because it was the smallest diff and avoided a workflow change the operator had not yet approved. The operator caught it only by explicitly asking "what does the community actually do?"

Existing governance covers fragments of this but not the principle: universal-agent-rules rule 4 ("no fix-it-later shortcuts") forbids deferring work but says nothing about which solution to choose; rule 15 / ADR-034 mandates verified information and flagged trade-offs, but only for purchase-class recommendations; the operations-side "pause-before-pivot" concept ("ensure the RIGHT tool is used, not just any working one") captures the spirit but was never promoted into distributed governance. No rule tells an agent that "smaller change" and "avoids needing approval" are not reasons to recommend a worse solution.

**Decision:**

1. **Correctness precedence.** When candidate solutions differ in quality, the default choice is the solution that is correct for the problem and recognized as standard practice by the relevant community — never the easiest, fastest, or smallest-diff option on those grounds alone. Expedience is legitimate only as an explicitly labeled stopgap with a queued follow-up to the correct solution.
2. **Recommendation contract (enforcement contract, per ARC-023).** Whenever an agent presents options or makes a recommendation, it must identify which option is the community-standard / best-practice choice — verified live when checkable (extending ADR-034's verification mandate from purchases to engineering decisions), never asserted from memory. If the agent recommends a different option, it must state the justification explicitly. "Smaller diff," "faster to implement," and "avoids needing human approval" are not justifications — they are signals to ask the human.
3. **The absent-human rule.** The absence of a human approver never downgrades the target solution. If the correct solution exceeds the agent's power level, scope, or session mandate, the agent queues it (TODO / intake finding / work item) and either halts or applies a clearly labeled interim measure that links to the queued item. An unlabeled stopgap that persists is a governance violation, not a solution.
4. **Not gold-plating.** "Correct" means fit for the problem as the community would recognize it — not maximal. Scope discipline (YAGNI, the brother test) still applies. This standard governs the quality of the chosen solution, not its size; invoking it to justify over-engineering inverts its intent.
5. **Follow-up scope — explicitly not executed by this record:** (a) add the rule to `universal-agent-rules.md` (new Solution Selection section) and a one-line echo in `portable-bootstrap.md`; (b) add recommendation-contract language to the option-presenting spells (`spell-plan`, `spell-architect`, `spell-review`); each touches `src/assets/` → version bump + parity regeneration. `product-excellence-standards.md` is not the home — it scores product quality, not agent conduct.

**Reasoning:**

- **The rule would have fired on its own motivating incident.** Under decision 2, the 2026-08-15 hook recommendation would have been forced to read "community standard is the pre-push shape; I am recommending the minimal option only because it is the smallest change" — surfacing the trade-off immediately instead of after operator cross-examination.
- **A bare principle would be an inert control.** Per ARC-023 and the EF-24 lesson, the standard ships with a checkable contract (best-practice option named, deviation justified) that reviewers and spells can verify mechanically, not an aspiration.
- **It closes the loop that produced EF-34.** The `--no-verify` culture was expedience institutionalized by the absent-human path: the workaround was applied when no fix session was convenient, never labeled as a stopgap, and never queued. Decision 3 makes that sequence a named violation.

**Rejected alternatives:**

- **Aspirational statement without an enforcement contract** — rejected: inert control (ARC-023, EF-24); the repository already had the spirit of this rule in scattered fragments and it failed to prevent the motivating incident.
- **Always choose the most thorough solution** — rejected: inverts into gold-plating and violates the brother test; decision 4 exists precisely to block this reading.
- **Ban stopgaps entirely** — rejected: labeled, queued stopgaps are legitimate under real constraints; the violation is the unlabeled stopgap that quietly becomes permanent.
- **Fold into ADR-034's recommendation guardrails** — rejected: ADR-034 is scoped to spending and irreversible-action recommendations with a confirmation-gate mechanism; solution selection applies to every engineering choice and needs its own contract.
