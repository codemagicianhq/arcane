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
| [ARC-022](#arc-022--fail-safe-ci-path-filter-policy)                                               | Fail-Safe CI Path-Filter Policy                                                | 2026-07-31 | Accepted   |
| [ARC-023](#arc-023--normative-controls-require-inline-enforcement-contracts)                       | Normative Controls Require Inline Enforcement Contracts                        | 2026-07-31 | Accepted   |
| [ARC-024](#arc-024--confirmed-severity-must-have-operational-consequences)                         | Confirmed Severity Must Have Operational Consequences                          | 2026-07-31 | Accepted   |
| [ARC-025](#arc-025--pin-publish-tooling-to-the-supported-node-runtime)                             | Pin Publish Tooling to the Supported Node Runtime                              | 2026-08-01 | Accepted   |
| [ARC-026](#arc-026--explicit-self-hosted-manifest-and-authoritative-root-validation)               | Explicit Self-Hosted Manifest and Authoritative Root Validation                | 2026-08-02 | Accepted   |
| [ARC-027](#arc-027--registry-driven-self-host-parity-guard)                                        | Registry-Driven Self-Host Parity Guard                                         | 2026-08-02 | Accepted   |
| [ARC-028](#arc-028--concurrency-and-isolation-model-for-parallel-work)                             | Concurrency and Isolation Model for Parallel Work                              | 2026-08-15 | Accepted   |
| [ARC-029](#arc-029--best-practice-first-solution-selection-standard)                               | Best-Practice-First Solution Selection Standard                                | 2026-08-15 | Accepted   |
| [ARC-030](#arc-030--venture-idea-lifecycle-hub-role-registry-and-spell-manifest-promotion)         | Venture Idea Lifecycle: Hub Role, Registry, and `spell-manifest` Promotion      | 2026-08-21 | Accepted   |
| [ARC-031](#arc-031--fictional-venture-names-for-examples-and-a-repository-wide-privacy-gate)       | Fictional Venture Names for Examples, and a Repository-Wide Privacy Gate       | 2026-08-22 | Accepted   |
| [ARC-032](#arc-032--persisted-tracking-configuration-tracking_mode-and-external_provider-in-the-manifest) | Persisted Tracking Configuration: tracking_mode and external_provider in the Manifest | 2026-08-22 | Accepted   |
| [ARC-033](#arc-033--docs-mode-subject-root-content-sensitivity-and-capability-scoped-spell-components) | Docs Mode: Subject Root, Content Sensitivity, and Capability-Scoped Spell Components | 2026-08-23 | Accepted   |
| [ARC-034](#arc-034--push-safety-for-sensitive-repositories)                                        | Push Safety for Sensitive Repositories                                        | 2026-08-23 | Accepted   |
| [ARC-035](#arc-035--auto-merge-requires-a-clear-review-round)                                      | Auto-Merge Requires a Clear Review Round                                       | 2026-08-25 | Accepted   |
| [ARC-036](#arc-036--generated-state-diagrams-deterministic-mermaid-for-computed-spell-state)       | Generated State Diagrams: Deterministic Mermaid for Computed Spell State       | 2026-08-30 | Accepted   |
| [ARC-037](#arc-037--secret-and-org-leak-detection-pre-commit-scan-plus-repository-wide-ci-backstop) | Secret and Org-Leak Detection: Pre-Commit Scan Plus Repository-Wide CI Backstop | 2026-08-31 | Accepted   |
| [ARC-038](#arc-038--content-preserving-updates-and-vendor-neutral-governance-content) | Content-Preserving Updates and Vendor-Neutral Governance Content | 2026-08-31 | Accepted   |
| [ARC-039](#arc-039--build-time-spell-compiler-generated-client-stubs-and-shared-prose-fragments) | Build-Time Spell Compiler: Generated Client Stubs and Shared Prose Fragments | 2026-08-31 | Accepted   |
| [ARC-040](#arc-040--session-handoff-durability-pointer-never-sole-carrier) | Session Handoff Durability: Pointer, Never Sole Carrier | 2026-08-31 | Accepted   |
| [ARC-041](#arc-041--a-local-out-of-repo-supply-channel-for-the-org-token-privacy-denylist) | A Local, Out-of-Repo Supply Channel for the Org-Token Privacy Denylist | 2026-09-02 | Accepted   |
| [ARC-042](#arc-042--show-report-compiled-template-distribution-model-and-program-decisions) | Show Report: Compiled-Template Distribution Model and Program Decisions | 2026-09-03 | Accepted   |

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
**Amended by:** [ARC-040](#arc-040--session-handoff-durability-pointer-never-sole-carrier) (corrects the field count to eight — EF-21 added `Pending Verification` without amending this record — and adds the durability guarantee: task-bearing handoff content must also live on a tracked surface, not only in this ephemeral block)

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
**Related:** [ARC-009](#arc-009--session-naming-and-pr-lifecycle-reliability-policy), [ARC-014](#arc-014--spell-authoring-standards-a-quality-rubric-for-spell-prompts)

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
**Amended by:** [ARC-030](#arc-030--venture-idea-lifecycle-hub-role-registry-and-spell-manifest-promotion) (resolved inline-vs-separate-file for venture/portfolio data -- chose separate, `{business_root}/registry.json`), [ARC-032](#arc-032--persisted-tracking-configuration-tracking_mode-and-external_provider-in-the-manifest) (resolved the same question for `tracking_mode`/`external_provider` -- chose inline, matching `profile`), [ARC-033](#arc-033--docs-mode-subject-root-content-sensitivity-and-capability-scoped-spell-components) (resolved it again for `subject_root`/`content_sensitivity` -- inline, same contract). The broader schema (operator identity, provider coordinates, repository lists) remains open below.

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
**Status:** Accepted (2026-08-22)
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
**Related:** [ARC-035](#arc-035--auto-merge-requires-a-clear-review-round) (adjacent, not superseded — this is a queue gate over filed, severity-tagged records; ARC-035 is a merge-time gate over in-flight review state that never touches the incident queue)

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
**Status:** Accepted (2026-08-24 — naming resolved, see item 10)
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
    | **Chamber** (operator's pick, 2026-08-23, four-check run same day) | Common English; no estate. **Trademark clear** — no live US class 9/42 mark for software named Chamber; the only class 042 hit (CHAMBEROCITY, reg. 4888952) is chamber-of-commerce membership software. **Same-audience collision, three live claims:** OpenChamber (openchamber.dev, 9.1k★/953 forks, MIT) is "an agentic development environment" whose unit of isolated work is literally called a *Session*; cirruslabs/chamber (AGPL) runs Claude/Codex agents in isolated Tart VMs — semantically identical to the proposed meaning, and Cirrus Labs is now OpenAI-adjacent; Chamber (YC W26, usechamber.io) is "the AIOps Agent for ML Teams". **First association** is segmentio/chamber, the AWS Parameter Store secrets CLI (2.6k★, v3.0, live), then OpenChamber, then "echo chamber" — which names the exact failure mode an isolated workspace already worries about. | **Kill** |

    Fresh candidates surfaced by that run, for the next pick: **Grotto** (cleanest of everything checked — no developer tool, package or CLI found under the name; spatial, oracular, instantly comprehensible), **Cloister** (semantically the most exact of the whole set: a cloister *is* separate cells where individual work happens undisturbed; only two tiny collisions), **Vestry**, **Oratory**. Avoid **Sanctum** (Laravel Sanctum, an EDR, a VPN daemon, the MIT Sanctum processor), **Crucible** (Atlassian), **Alcove** (an AI-agent context tool), **Sigil** (EPUB editor), and **Enclave** — for developers that means SGX/confidential-computing hardware-isolated memory, a term-of-art collision that would actively mislead.

    **Caveat on the trademark column, recorded rather than implied:** these are search-derived findings. TSDR, Justia, uspto.report and TMview all blocked direct fetch (403/404/ECONNRESET) during the run. They support "no obvious registered mark and no enforcement culture"; they are not a clearance search and not legal advice. Whichever word is finally picked carries the same caveat.

    Prior kills for the record: Backstage (Spotify OSS developer portal), Vault (HashiCorp), Studio (saturated), Stage/Staging (collides with git/deploy vocabulary), Chamber (OpenChamber, segmentio/chamber, Chamber YC W26 — see the table). Chamber was picked on condition of clearing the four-check and did not clear it; the check worked as intended.

    **Selection: `session workspace` — picked 2026-08-24.** The vetted lore candidates were never needed, because the Naming Test settles the question one step earlier: *a universe name has to be earned by the absence of an established industry term*, and no such absence exists here. Four independent tools already call this concept a workspace (git worktree · VS Code workspace · Codespaces · OpenClaw workspace). That convergence is evidence the word is **right**, not evidence it is unavailable — overloading is not absence. The concept therefore takes **no lore word at all**. This is the first ARC naming decision to resolve that way, and it is the Naming Test working as designed rather than an exception to it.

    **Why qualified rather than bare.** A check run at pick time found `workspace` already load-bearing inside Arcane in two other senses: (i) the **agent sandbox root** (`workspace-{agent}`) in [agent-approved-paths.md](.arcane/governance/agent-approved-paths.md) and [agent-policies.md](.arcane/governance/agent-policies.md) — a permissions boundary, not a session container; and (ii) **`openclaw.workspace_root` / `openclaw.workspace_prefix`**, validated schema fields in `src/types.ts` and `src/modules/agent-schema.ts` that consumers already set — meaning Arcane itself ships one of the four colliding meanings this record exists to disambiguate. Taking the bare word would have used one noun for three things: the same internal-collision class that flagged Cabinet against DMC's File Cabinet, and it would have reproduced the ambiguity rather than ended it. **`session workspace`** keeps the industry term's near-zero teaching cost, composes with vocabulary Arcane already owns (`spell-open-session` / `spell-close-session`), and requires no rename and no schema change.

    **Usage rule.** `session workspace` is the product-level noun: **one session workspace = one instance of one isolation primitive**, which is what DMC renders as a tile. Shorten to `workspace` only where the surrounding context is unambiguously about sessions — never in the same passage as an agent sandbox root or an OpenClaw field. Technical payloads are unchanged: `worktree`, `primary checkout` and `clone` remain the correct terms for the git primitives, per this item's opening rule. The full-clone corollary is now moot — with no lore word in play, a daemon clone is a session workspace like any other, and the naming standard's "the more autonomous the tool, the more boring its name" is satisfied by construction.

    **Four-check disposition, recorded rather than skipped:** a generic industry term cannot be appropriated from a coiner, so checks 1–3 (who coined it · estate still trading · same-audience claim) do not bind, and the trademark caveat above is moot for a generic term. Check 4 (first association) does bind, and its answer is known and accepted: the first association *is* the overloaded set. That is precisely why the qualifier is mandatory rather than stylistic.
11. **Follow-up scope — explicitly not executed by this record:** (a) ~~governance wording updates~~ **shipped** — the working-tree dimension went into agent-policies' Multi-Agent Concurrency Rules 2026-08-22 (rule 8), and 2026-08-23 completed the rest: git-conventions' session-branch close, docs-workflow ff-merge (both the merge step and its ff-only recovery), Magus+ self-merge, Post-Merge Cleanup, and the ADO cleanup block are each scoped to the primary checkout per R1/R8, with the linked-worktree path spelled out alongside — **and so is `agent-policies.md`'s own near-duplicate of the Agent Workflow**, which a first pass left contradicting `git-conventions.md` on the same question; (b) ~~spell updates~~ **shipped 2026-08-23** — `spell-open-session` selects and states the isolation primitive before the Mutation Guard writes anything, `spell-close-session` forks its step 10 on the primitive and never checks out trunk from a worktree, `spell-full-cycle` requires a footprint comparison before running epics concurrently per R4, and `spell-implement`/`spell-full-cycle`/`spell-ship`'s trunk-sync and cleanup steps are scoped too;

    **Two corrections on the record, because the first pass claimed completion it had not achieved.** It was site-list-driven where it had to be search-driven, and shipped green while three spells still carried an unconditional `git checkout main` — one of them in a file the same commit edited. A repository-wide check now fails if any distributed prompt or governance document contains a trunk checkout without primitive scoping nearby, so the next pass that misses a site fails in CI rather than in a consuming repository. Separately, the primitive detection first written as `git rev-parse --git-common-dir` vs `--git-dir` was **wrong**: `--git-dir` returns an absolute path while `--git-common-dir` stays relative whenever the process is below the repository root, so it reported the primary checkout as a linked worktree from any subdirectory. Both calls now pass `--path-format=absolute`, verified from the repository root, a subdirectory, and a real worktree.

    The refusals the worktree rules lean on are also **conditional, not universal**: they hold when a working tree actually holds trunk. A bare repository with worktrees attached — one bare clone plus one worktree per agent, a normal fleet layout — usually has no such checkout, and there `git switch <trunk>` and `git branch -d` both succeed. The prompts now establish that from `git worktree list` rather than asserting the failure unconditionally, and name the bare repository itself as the removal vantage point instead of a "primary checkout" that does not exist; (c) DMC rendering contract for N session containers — **out of scope for this repository**, it belongs to the DMC/ops repo; (d) ~~EF-33 rails implementation (flips EF-33 `deferred → shipped`)~~ **shipped 2026-08-22** — R7's same-vantage-point check is now documented in git-conventions.md and railed into `spell-commit-work`/`spell-close-session`/`spell-ship`'s branch-deletion steps and `spell-open-session`'s worktree/stale-branch reads; [EF-33](docs/intake/batch-001/EF-33.md) flipped to `shipped`; (e) ~~naming rollout~~ **shipped 2026-08-24** — the concept is a **session workspace**, resolved by the Naming Test rather than by the four-check (see item 10); `git-conventions.md` carries the definition at the point a reader first meets the primitives, and the mechanical instructions keep their git vocabulary unchanged by design. **This ADR is now Accepted. Everything this repository owns is done — (a), (b), (d) and (e) are complete, and (c) is not ours.**

    The three git refusals these rules lean on were verified directly rather than assumed, since the spell text now instructs agents not to work around them: `git checkout main` from a linked worktree gives `fatal: 'main' is already used by worktree at <path>`; `git branch -d <branch>` gives `error: cannot delete branch '<branch>' used by worktree at <path>`, from the primary checkout **and** from inside the worktree itself.

**Reasoning:**

- **The model is evidence-shaped, not aesthetic.** Every rule maps to a recorded incident: R1/R3 to the 2026-07-10 branch-switch and root-sweep incidents, R4 to the 2026-07-17 collision vs. 2026-07-22 zero-collision pair, R5 to the private ADR-058 lock-contention finding, R7 to the shared-config contamination and EF-33 near-miss, R8 to the 2026-08-14 observation that the PR gate is primitive-independent.
- **The brother test is satisfied by construction.** The default (R2) is the do-nothing path; every escalation is additive and reversible, and the scariest operations (prune, remove, config mutation) are fenced behind R7's explicit checks.
- **DMC gets a clean rendering contract:** one **session workspace** = one primitive instance; the primary checkout is simply the session workspace that also holds repo-state authority.
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
**Status:** Accepted (2026-09-01, operator accept call — [OPERATOR-QUEUE.md Q-004](docs/plans/become-current/OPERATOR-QUEUE.md#q-004--acceptreviserreject-adr-arc-029-best-practice-first-solution-selection))
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

---

## ARC-030 — Venture Idea Lifecycle: Hub Role, Registry, and `spell-manifest` Promotion

**Date:** 2026-08-21
**Status:** Accepted
**Related:** [ARC-011](#arc-011--optional-external-tracking-mode-with-process-template-aware-ado-mapping) (tracking mode — promotion respects it), [ARC-016](#arc-016--public-repository-model-fresh-start-build-in-public-with-an-org-leak-gate) (build-in-public — extended from org identifiers to idea content), [ARC-008](#arc-008--clean-break-for-spell-assess-removal-no-compatibility-alias) (clean-break rename precedent, applied to `spell-bootstrap-business`)
**Amends:** [ARC-020](#arc-020--canonical-repository-configuration-schema) (see Relationship to ARC-020 below)

**Context:**

An operator running Arcane across a private governance-hub repo (holding per-venture folders under `ventures/`) and several downstream consumer repos had no mechanism for capturing venture-level ideas anywhere but an overloaded hub `TODO.md`, no way to distinguish which repo was "the hub" versus an ordinary consumer, and no path for an idea captured hub-side to land in a real consumer repo without either manual copy-paste or accidentally leaking one venture's existence into another's repo. Idea-stage ventures (no code repo yet) had no capture surface at all. Separately, the operator is building Arcane itself in public while running private venture strategy through the same tool — any mechanism that captures private ideas needed an explicit, stated disclosure boundary, not a silently-discovered one.

**Decision:**

**1. Hub role — explicit, CLI-asked, never inferred.** `ArcaneManifest` gains `role?: "hub" | "consumer"` (absent = consumer, the default for every existing install) and `business_root?: string` (default `"ventures"`). `role` is never inferred from repo content — a `ventures/` directory existing proves nothing, since `spell-summon-venture`/`spell-bootstrap-business` already create that directory in ordinary consumer repos too. It is set by explicit operator answer only: `spell init` asks once on interactive installs (skipped for scripted/`--profile` installs, matching every other interactive init step); `spell update` runs a **general retrofit mechanism** (`src/modules/hub.ts`'s `MANIFEST_RETROFITS` registry) that asks about any manifest field the installed version predates, once, and is designed for future fields to register against — not a one-off for `role`. Both paths write the answer explicitly (`role: "consumer"` is a real written value, not an absent field) so a later retrofit run can tell "asked and declined" apart from "predates this feature."

**2. Venture registry — a separate file, hub-owned, never installed.** `{business_root}/registry.json` is the single source of truth for the venture portfolio: per venture, `name`, `aliases` (natural-phrase resolution — every venture-targeted spell resolves exact slug → alias → closest match offered, **never guessed**), `status` (`idea|active|paused|archived`), `visibility` (`public|private`), `ownership` (`llc|co-venture|personal`), `tracking` (`ado|github|none` + optional coordinates), and `repos[]` (remote, default flag, per-machine `clones` paths — `remote: null` is legal, for a deliberately local-only repo with no remote at all). It is never touched by `spell update` and never distributed — it is pure operator/portfolio data, structurally incapable of being treated as framework content.

**3. Two-tier idea/todo books.** The existing repo-root `IDEAS.md` inbox (`spell-save-idea`) is unchanged and remains repo-scoped everywhere. In a hub, venture-targeted phrasing ("save this idea for ordo", "add a todo for ordo") routes instead to `{business_root}/<slug>/IDEAS.md` / `TODO.md` — created from the venture-template stubs (now shipped alongside `overview.md`) on first use. `spell-todo` gains `--sweep` (report open-item counts across every book, hub or consumer). Venture-targeting phrasing is refused outright in a consumer repo, with the sibling's name stripped before any local fallback write — a consumer repo must never contain another venture's name, even by accident.

**4. `spell-manifest` — hub-gated promotion.** A new spell triages `status: new` book entries in batch (list, select by number/range, route) to one of: a consumer repo's `IDEAS.md`, a PRD scaffold, a tracker item (ADO or GitHub, works without a local clone), a demoted todo, another venture's book, drop, or public disclosure. Landing downstream always precedes marking the hub entry promoted (`<!-- status: promoted → <dest> DATE -->`), and a duplicate-guard content-grep makes a re-run or interrupted batch safe.

**5. Disclosure is keyed off destination *visibility*, never destination *type*.** A GitHub issue filed on a public repo is exactly as much a disclosure as an entry in that repo's public `IDEAS.md` — both require the same gate. The gate is per-entry, never covered by a batch `all`/`go` confirmation, and requires the literal word `disclose` after the exact outbound text is shown. This is the mechanism that resolves the build-in-public tension directly: hub books are private-by-default incubation **even for ventures whose own repo is public** (including Arcane itself); promotion to a public destination is a deliberate, visible act, not a side effect of having saved an idea. A repo's first-ever disclosure offers to add a standing boundary statement to its public `IDEAS.md` header — *"build-in-public covers source, decisions, and the accepted roadmap; idea incubation is curated and lands here when committed"* — so the policy is declared publicly, not discovered.

**6. Leak scanning is deliberately asymmetric.** Before any write to a consumer or public destination, outbound text is scanned for every other venture's slug/aliases, hub path fragments, machine names (`registry.json`'s `clones` keys), and the org-token denylist — hub-side, at promotion time, because only the hub holds the full sibling list. `spell-check-drift` gains a mirrored but *structural* check for the other direction: a non-hub repo containing `ventures/*/IDEAS.md`, `ventures/*/TODO.md`, or `ventures/registry.json` at all is **Critical**, checked by file existence only. A consumer repo cannot safely hold a content-level version of this check, because the sibling-name list it would need is exactly the thing that must never reach a consumer — the asymmetry is the design, not a gap.

**7. Arcane itself is not a sibling — the one deliberate carve-out.** The never-reference-a-sibling rule continues to protect the hub and every other venture, but a consumer repo may reference Arcane, because it is the installed, publicly-homed dependency every consumer already visibly depends on (`.arcane.json`, the spell prompts themselves, the public GitHub repo) — filing feedback about it is no different from filing an issue against any tool in use. `spell-feedback` gains an upstream-routing step: substantial feedback items additionally classify as framework-shaped (belongs in Arcane) versus repo-local; framework-shaped items are genericized (venture names, org tokens, machine names, hub paths stripped) and offered as a GitHub issue on `codemagicianhq/arcane`, gated by the same literal-`disclose` discipline as `spell-manifest`. Unauthenticated/offline/declined queues (`<!-- upstream: queued -->`) rather than blocking; `spell-feedback --flush` re-offers queued items. This spell never reads `ventures/registry.json` and never writes to a hub book — framework lessons and venture ideas stay on genuinely separate channels; the shared discipline is the disclosure gate, not the destination.

**8. `spell-bootstrap-business` → `spell-summon-venture`, clean break.** Re-imagined as a hub-gated, one-move venture creator: folder, `overview.md`/`config.md`/`legal.md` (existing behavior, preserved), the two new books, and a `ventures/registry.json` entry, in one operation. No compatibility alias, per ARC-008's precedent — the install base is small enough that the rename cost is low and a stale alias would be actively misleading (the old spell's behavior — no hub gate, no books, no registry — no longer exists to alias to).

**Relationship to ARC-020:** ARC-020 (Proposed, not yet Accepted) left open "whether user-owned configuration remains inside `.arcane.json` or moves to a separate file with an independent update lifecycle." This decision resolves that question **for venture/portfolio data specifically**: it lives in `{business_root}/registry.json`, never inside `.arcane.json`, never distributed. ARC-020's broader question (operator identity, tracking provider, repository lists in general) remains open; this ARC does not presume to answer it, only to establish that at least one class of user-owned data is correctly modeled as a separate, hub-owned file rather than a manifest field.

**Reasoning:**

- Explicit-only role assignment is the same discipline as every other structural gate in this codebase (ARC-023): a silently-inferred hub status would be exactly the kind of unenforced control ARC-023/ARC-024 exist to prevent, and — concretely — would let a consumer repo's ordinary `ventures/` folder (created by this very spell, in the old model) accidentally unlock hub-only behavior.
- A general retrofit mechanism rather than a one-off `role` migration means the *next* manifest field addition doesn't need to reinvent this — it registers a `ManifestRetrofit` and inherits the same once-only, explicit-write behavior.
- Disclosure-by-visibility (not by destination type) is the detail that actually makes the build-in-public boundary trustworthy: a narrower rule keyed only on "writing to `IDEAS.md`" would have let a tracker item on a public repo slip through ungated.
- The asymmetric leak-scan is not a compromise — a symmetric version would require shipping the sibling-name list to every consumer, which is precisely the leak the whole design exists to prevent.

**Rejected alternatives:**

- **Infer hub status from a `ventures/` directory existing** — rejected: that directory is legitimately created in ordinary consumer repos by this same spell; content-based inference would make hub-gated behavior unlockable by accident.
- **Put the venture registry inside `.arcane.json`** — rejected: bloats a framework-managed file with pure operator data, and — per ARC-020's own open question — is exactly the "inline" option that a separate-file model resolves more cleanly for this data class.
- **Symmetric leak scanning (give consumers their own sibling-checking logic)** — rejected: requires distributing the sibling-name list to every consumer, defeating the purpose.
- **A consumer→consumer idea-promotion path** — rejected as unneeded scope: the only cross-repo path this design supports is hub→consumer (via `spell-manifest`) and consumer→Arcane (via `spell-feedback`'s upstream routing); nothing here lets one venture's consumer repo write into another's.
- **Alias for `spell-bootstrap-business`** — rejected per ARC-008 precedent: the renamed spell's behavior changed substantively (hub gate, books, registry), so an alias would silently promise old, no-longer-true behavior.

---

## ARC-031 — Fictional Venture Names for Examples, and a Repository-Wide Privacy Gate

**Date:** 2026-08-22
**Status:** Accepted
**Related:** [ARC-014](#arc-014--org-token-lint-as-a-build-gate) (org-token gate — this widens its surface and splits its purpose), [ARC-016](#arc-016--public-repository-model-fresh-start-build-in-public-with-an-org-leak-gate) (build-in-public leak gate), [ARC-030](#arc-030--venture-idea-lifecycle-hub-role-registry-and-spell-manifest-promotion) (the venture examples this governs)

**Context:**

Arcane is a methodology framework, so almost every spell prompt, governance doc, and decision record carries a **worked example** — and examples about venture management have to name ventures. With no designated fictional set, each new example invents its own, and the path of least resistance is to reach for a real name because it reads as realistic. A real name written into a spell prompt is then copied verbatim into `dist/assets/` and published in the npm tarball.

The existing org-token gate (ARC-014) was built for a related but *different* problem — **portability**: a distributed spell that hardcodes the maintainer's organization is not reusable by anyone else. It scanned exactly the surface that concern required, `src/assets/.github/prompts`. That surface is too narrow for a **privacy** concern: a real organization name reached a published release through a decision record and a test fixture, neither of which the gate looked at.

The two concerns also need different token sets. "Code Magician" and `codemagicianhq` legitimately appear throughout this repository — it *is* Code Magician's repository, named in `package.json`, `LICENSE`, and `README.md`. They simply must not be baked into distributed spells. A private venture name has no such carve-out: it belongs nowhere, in any file.

**Decision:**

**1. A canonical fictional venture family — the "Three Frontiers" set.** Every example that needs a venture name uses one of:

| Role | Name | Slug | Aliases | Fictional business |
| --- | --- | --- | --- | --- |
| Primary | Ordovica | `ordovica` | `ordo`, `ord` | Deep-earth geothermal and critical-mineral recovery |
| Sibling | Tidewright | `tidewright` | `tide`, `tw` | Tidal energy; autonomous coastal-infrastructure repair |
| Sibling | Overshore | `overshore` | `over`, `osh` | Orbital manufacturing in vacuum and microgravity |

Three, not one, because several examples show *lists* of ventures — closest-match suggestions, portfolio registries, multi-book sweeps. The premise (a post-AI physical economy where energy, atoms and orbit stayed scarce) exists only to keep additions coherent; it carries no product meaning and readers never need to know it.

**2. The org-token gate splits into two layers with distinct surfaces.**

- **Portability layer** — package-derived tokens (author, repository owner) scanned across `src/assets/.github/prompts`, exactly as ARC-014 defined. Unchanged.
- **Privacy layer** — a denylist of real venture, customer, and machine names, scanned across the **whole repository**: docs, decision records, tests, workflows, source. Generated and vendored trees (`node_modules`, `dist`, `coverage`, `.git`) are skipped.

Findings from both are merged and deduplicated by `file:line`; either layer fails the build.

**3. The denylist lives in a CI secret, never in the repository.** `ARCANE_ORG_TOKENS` is supplied to the build from `secrets.ARCANE_ORG_TOKENS`. Committing the list of names-that-must-not-appear would itself publish them — the enforcement is public and auditable, the list is not. With the secret unset (local builds, forks, contributors) the privacy layer is inert and costs nothing, so no contributor is blocked by a list they cannot see.

**4. Adding a name to the fictional universe requires clearing a screening checklist** — npm registry, GitHub org namespace, company and trademark records, **and game/product/fiction listings**, plus no offensive or awkward reading in English or Spanish, no collision with code vocabulary (`node`, `null`, `main`), and no resemblance to any real venture. Candidates during this research passed a company search and were still real products; registry checks alone cleared names with four real companies behind them.

**5. Fictional names must read corporate, not mystical.** An entire early shortlist was rejected because an elemental-fantasy register collides with Arcane's own branding — a reader could not tell a fictional venture from a framework concept. The placeholder reads as a company precisely because Arcane does not.

**Reasoning:**

- A designated set converts an unbounded judgment call ("is this example name safe?") into a lookup. Judgment fails under time pressure; lookups do not.
- Splitting the layers is what makes a repository-wide scan viable at all. A single merged token set applied everywhere would flag hundreds of legitimate mentions of the maintainer's own name and be switched off within a day — a gate that cries wolf is worse than no gate.
- Keeping the denylist in a secret resolves the obvious paradox of a privacy control that would otherwise have to enumerate the private data in public.
- The precedent is well-established: Microsoft legally cleared Contoso, Fabrikam, and Northwind Traders for fictitious use rather than inventing names ad hoc, and moved to a frontier-era name (Zava) in Dec 2025 as the older set began to read as dated.

**Rejected alternatives:**

- **A documented rule ("never use real names in examples") with no mechanical gate** — rejected: the rule already existed in spirit and did not hold. Controls that depend on remembering are not controls (ARC-023).
- **Commit the denylist to the repository** — rejected: publishes the exact names it exists to protect.
- **Scan the whole repository with the merged token set** — rejected: the maintainer's own name appears legitimately throughout its own repository; this fails the build on `README.md` and `LICENSE`.
- **One fictional venture instead of three** — rejected: examples that demonstrate alias resolution, closest-match suggestions, and portfolio sweeps are incoherent with a single name.
- **Generic placeholders (`example-venture`, `acme`) instead of a named universe** — rejected: real examples read better and are easier to follow, `acme` is heavily overloaded, and a distinctive slug is far easier to grep for when auditing whether an example leaked.

---

## ARC-032 — Persisted Tracking Configuration: `tracking_mode` and `external_provider` in the Manifest

**Date:** 2026-08-22
**Status:** Accepted
**Related:** [ARC-011](#arc-011--optional-external-tracking-mode-with-process-template-aware-ado-mapping) (defined the `tracking_mode`/`external_provider` vocabulary this decision persists), [ARC-030](#arc-030--venture-idea-lifecycle-hub-role-registry-and-spell-manifest-promotion) (built the `MANIFEST_RETROFITS` mechanism this decision extends, and set the Accepted-while-amending-a-Proposed-ADR precedent this decision follows)
**Amends:** [ARC-020](#arc-020--canonical-repository-configuration-schema) (see Relationship to ARC-020 below)
**Intake:** [EF-14](docs/intake/batch-001/EF-14.md)

**Context:**

ARC-011 defined `tracking_mode`/`external_provider` as spell-flow-guidance concepts but never gave
them a storage location — every session and every `spell-plan` run asks again, or silently infers
from ADO context. `.arcane.json` already persists one directly analogous repo-level decision,
`profile`, chosen once at init and reused everywhere. EF-14 asked for the same treatment.

ARC-020 (Proposed) would eventually settle this as part of a full repository-configuration schema,
but that schema's own scope — operator identity, business roots, provider coordinates, repository
lists — and its central open question (inline in `.arcane.json` versus a separate file) are far
broader than these two fields need to wait for.

**Decision:**

1. `tracking_mode` (`internal | external`) and `external_provider` (`ado | jira | other`) persist
   in `.arcane.json`, using exactly `profile`'s contract: chosen once (at `spell init`, or via
   `spell update`'s retrofit wizard for installs that predate the field), never silently
   overwritten, read by spells instead of re-asked.
2. `governance-only`/`methodology` profiles — no code, no CI, no artifact production — default to
   `tracking_mode: internal, external_provider: null` without a question, even under a scripted
   `--profile` install (a deterministic default has nothing for non-interactive mode to skip).
   `full`/`lite` ask once, interactively only.
3. Question wording states the actual choice — "Track work in this repo (TODO.md / PRDs)" vs.
   "Track work in an external tracker (Azure DevOps / Jira / other)" — replacing the bare
   `internal`/`external` tokens that field-tested as ambiguous with repository visibility.
4. `ExternalProvider`'s TypeScript union is corrected to `"ado" | "jira" | "other"` — the values
   ARC-011 and both consuming spells have always actually used. It had drifted to
   `"azure-devops" | "github" | "gitlab" | "jira"`, values nothing in the codebase ever wrote or
   read.
5. `readManifest` rejects an unsupported `tracking_mode`/`external_provider` value instead of
   silently accepting it — a new `ManifestInvalidFieldError`, distinct from the existing
   `ManifestCorruptError` (which means "not valid JSON at all").

**Relationship to ARC-020:** ARC-020 (Proposed, not yet Accepted) left open "whether user-owned
configuration remains inside `.arcane.json` or moves to a separate file with an independent update
lifecycle." ARC-030 already resolved that question for one data class — the venture registry — by
choosing a separate file, precisely because that data is a growing, multi-entry, operationally
independent dataset. `tracking_mode`/`external_provider` are the opposite shape: two small,
session-independent scalar choices, the same shape `profile` already is. This decision resolves
the inline-versus-separate-file question for **this** data class by choosing inline, matching
`profile`'s existing, working precedent — not by generalizing a rule from ARC-030's registry
decision, which was correct for a different shape of data. ARC-020's broader scope (operator
identity, provider coordinates, repository lists in general) remains open; this ARC does not
presume to answer it, only to add a second data point (alongside ARC-030's) showing that the right
storage model depends on what the data actually looks like, not a single blanket answer.

**Reasoning:**

- `profile` is a proven precedent: chosen once, persisted, read everywhere, never re-asked. Two
  more fields of the identical shape get the identical treatment rather than inventing a new
  pattern.
- `MANIFEST_RETROFITS` already exists and already generalizes past its original single field
  (ARC-030's own stated intent: "future manifest fields register a retrofit here instead of
  leaving older installs permanently unset"). Registering one more entry is the mechanism working
  as designed, not scope creep.
- Correcting `ExternalProvider`'s type to match what ARC-011 and both prompts actually use closes
  a real, silent gap: the type could never have caught a typo in the values the codebase actually
  reads and writes, because none of its allowed values were the real ones.

**Rejected alternatives:**

- **Wait for ARC-020's full schema before persisting anything** — rejected: ARC-030 already
  established that a scoped, incremental field addition is preferable to blocking on a
  broad-scope ADR with a genuinely open architectural fork; repeating that wait here would leave
  EF-14's defect live for no reason tied to this specific field pair.
- **Flip ARC-020 itself to Accepted** — rejected: ARC-020's own text has an explicit, unresolved
  question this decision does not answer for the general case. Flipping it would misrepresent that
  question as settled.
- **A single combined question merging profile and tracking-mode selection (EF-04's proposal)** —
  rejected as out of scope here: EF-04 is docs-mode work, not yet actioned. This decision keeps
  the two as sequential, separate questions and leaves EF-04's deeper UX unification for later.

**Implementation note (2026-08-31, BC-09):**

- **`ExternalProvider` extended to `"ado" | "github" | "jira" | "other"`, adding back a value
  decision 4 above deliberately removed.** This is not a reversion of that correction. Decision 4
  dropped `"github"` (along with `"azure-devops"`/`"gitlab"`) because nothing in the codebase read
  or wrote it — a value sitting in the type with zero consuming code path, exactly the drift the
  correction existed to close. This addition is different in kind: `spell-bug`, `spell-plan`,
  `spell-scope`, `spell-suggest-feature`, and `spell-full-cycle` now have a real `gh issue`
  branch — creation, fetch, and close-out commands, verified against the live `gh` CLI's actual
  flags before being written into shipped prompts rather than assumed — so `external_provider:
  github` has genuine, working behavior behind it from the moment it ships, not a placeholder
  value waiting for a future implementation the way the removed `"github"` always had been.
- **`readManifest`'s rejection behavior (decision 5) is unchanged in shape, only in its accepted
  set:** `VALID_EXTERNAL_PROVIDERS` in `src/modules/manifest.ts` gained `"github"`; an unsupported
  value still throws `ManifestInvalidFieldError`, not silently accepted, exactly as decision 5
  specified — this extension adds one more valid value, it does not loosen the validation itself.
- **GitHub Issues has no configurable work-item-type hierarchy the way ADO's process templates
  do**, so its governance treatment (`development-methodology.md` → GitHub Issues Conventions) is
  necessarily a different shape from the ADO section it sits beside: labels substitute for types,
  and a body task-list substitutes for native parent/child linkage — documented as a substitute,
  not represented as equivalent, so a reader doesn't mistake the checkbox convention for something
  the platform itself enforces.

---

## ARC-033 — Docs Mode: Subject Root, Content Sensitivity, and Capability-Scoped Spell Components

**Date:** 2026-08-23
**Status:** Accepted
**Amends:** [ARC-020](#arc-020--canonical-repository-configuration-schema) (third slice — see Relationship to ARC-020)
**Related:** [ARC-030](#arc-030--venture-idea-lifecycle-hub-role-registry-and-spell-manifest-promotion), [ARC-032](#arc-032--persisted-tracking-configuration-tracking_mode-and-external_provider-in-the-manifest) (the persist-once contract this reuses), [ARC-019](#arc-019--repository-document-ownership-and-path-model) (document ownership)
**Intake:** [EF-03](docs/intake/batch-001/EF-03.md), [EF-04](docs/intake/batch-001/EF-04.md), [EF-07](docs/intake/batch-001/EF-07.md), [EF-10](docs/intake/batch-001/EF-10.md), [EF-11](docs/intake/batch-001/EF-11.md), [EF-12](docs/intake/batch-001/EF-12.md)

**Context:**

Arcane's governance has acknowledged documentation-only repositories since ADR-048 (`cicd-standards.md` carries a docs-only branch-policy exception), but nothing executable expressed that: there was no docs profile, no way to describe a repository that IS one subject rather than a portfolio of ventures, no records conventions, no line-ending baseline for consuming repositories, and no instruction telling agents to reference rather than transcribe sensitive documents. Six batch-001 findings describe facets of the same gap; the accepted docs-mode PRD unified them, and this record captures the decisions that PRD deferred to implementation.

One structural obstacle blocked all of it: every spell shipped inside a single `spell-prompts` component (plus `claude-commands` for the Claude wrappers). Because a profile selects whole components, "session and planning spells without implementation and deployment spells" was inexpressible.

**Decision:**

1. **Spell components are capability-scoped.** Split into `spells-session`, `spells-capture`, `spells-delivery`, `spells-review`, `spells-planning`, `spells-build`, `spells-venture`, `spells-meta`, `spells-docs`. Grouping lives in the registry only — **no spell file is renamed or moved**, and every file stays flat in `.github/prompts/` and `.claude/commands/`.

2. **Each component carries both client formats of its spells.** The Copilot prompt and the Claude wrapper for one spell are never independently selectable — every profile that took one always took the other — and pairing them makes divergence across profiles structurally impossible.

3. **Legacy manifests migrate deterministically, against a frozen list.** `spell-prompts`/`claude-commands` map to the eight groups that reconstitute what the monolith held, written as a literal — *not* derived from the live set of `spells-*` components. A derived list would silently hand every future group to legacy installs, and a test asserting migration-equals-derived-list could never fail.

4. **`profile: docs` is a fifth preset**, not a composition UX. Named presets stay the single init question; composition lives in the registry and in `spell add`.

5. **`subject_root` describes a single-subject repository.** Independent of `business_root` and may coexist with it; where both apply to a shared document, the subject root wins. **`"."` is supported** and means the repository root itself is the subject tree — the decision that lets an existing archive come under governance without being restructured first. `null` records "asked, no single subject root" distinctly from `undefined` ("never asked"), the same asked-but-none semantics `external_provider: null` already carries.

6. **`content_sensitivity` is declared once per repository**, not inferred per file. `"sensitive"` switches agents to reference-not-transcribe: cite paths, never contents, in journals, decisions, commits and PRs; retain no screenshots of repository contents; sanitized summaries are permitted only where they carry no recoverable detail. This is a governance default constraining what agents *write down* — not an access control, and not a substitute for repository permissions.

7. **Superseded records stay in place with a tombstone**, rather than moving to an archive directory. Moving breaks every existing link, and the reader most likely to arrive at an outdated document is exactly the one who must be told where to go instead. Deletion is a separate explicit decision from supersession, and Arcane ships **no retention schedule** — periods are jurisdiction- and contract-specific, and a framework default would be guesswork wearing the costume of a standard.

8. **The docs profile emits a line-ending and binary-format baseline** (`.gitattributes`/`.gitignore`) as `skipExisting` user-owned files: a repository with its own already has an intentional policy. `spell update` reports a missing baseline and never renormalizes an existing repository, because renormalization produces a large intentional diff that must be an operator's choice. Git LFS is documented as an opt-in decision, not configured by default.

9. **The docs-repo PR contradiction resolves toward the docs-only exception.** `git-conventions.md`'s policy table said docs repos require a PR while `cicd-standards.md` recorded ADR-048's exception; the exception governs, and the table is corrected.

**Relationship to ARC-020:** this is the third slice, following the pattern ARC-030 and ARC-032 established. ARC-020 (still Proposed) left open whether user-owned configuration lives inside `.arcane.json` or in a separate file. `subject_root` and `content_sensitivity` are the same shape as `profile` and `tracking_mode` — small, session-independent scalar choices — so they go inline, on the identical ask-once/retrofit/never-overwrite contract. ARC-020's broader scope (operator identity, provider coordinates, repository lists) remains open; three data points now show that the right storage model follows the shape of the data rather than one blanket answer.

**Reasoning:**

- Capability grouping was the minimum change that made a docs profile expressible. File-level subtraction would have added a second, subtractive selection mechanism to reason about; full composition would have turned "what profile is this repo?" from a one-word answer into a set, rippling through every downstream branch that reads it.
- Root-as-subject is what makes adoption non-destructive. Requiring a named subdirectory would force exactly the repositories docs mode exists to welcome into a history-churning restructure before they could adopt anything.
- Declaring sensitivity per repository rather than detecting it per file follows the reasoning ARC-022 applied to CI path filters: content-based classification of general documents has no reliable signature, so it degrades into a hand-maintained list that fails silently.
- Retaining superseded documents in place is the same principle as never breaking a published URL. The tombstone is for the reader who arrives by a stale link — the one person a move guarantees you cannot reach.

**Rejected alternatives:**

- **Profile composition as the init UX** — rejected: it needs the same registry split underneath, but the manifest field becomes a set and every profile-branching consumer must handle combinations. Presets keep the simple front door; `spell add` already covers unusual mixes.
- **A universal archive directory for superseded records** — rejected: breaks inbound links, splits file history across a rename, and imposes a layout on subjects whose organisation is determined elsewhere.
- **Shipping a default retention schedule** — rejected as guesswork presented as a standard. Absence of a known period is recorded as "unknown, therefore do not delete", not as "no obligation".
- **Deriving the legacy migration list from the live `spells-*` set** — rejected after adversarial review: future groups would ride into legacy installs silently, behind a self-referential test that could not detect it.
- **Storing the `.gitattributes`/`.gitignore` sources as real dotfiles inside the package** — rejected: a nested `.gitignore` in an npm tarball can exclude sibling files from the published package, and a nested `.gitattributes` would apply its rules to Arcane's own source tree. Sources are stored under a plain path and mapped to their installed dotfile name.
- **Keeping `spell-review` in the docs profile** — rejected during review: its own workflow validates that new code has corresponding tests, which a docs repository has neither of. Code review became its own component rather than being quietly retained.

---

## ARC-034 — Push Safety for Sensitive Repositories

**Date:** 2026-08-23
**Status:** Accepted
**Related:** [ARC-032](#arc-032--persisted-tracking-configuration-tracking_mode-and-external_provider-in-the-manifest), [ARC-033](#arc-033--docs-mode-subject-root-content-sensitivity-and-capability-scoped-spell-components) (the persist-once manifest contract this reuses; `content_sensitivity` is the adjacent, distinct concern)
**Intake:** [EF-09](docs/intake/batch-001/EF-09.md)
**Design:** [features/push-safety/PRD.md](features/push-safety/PRD.md), accepted by the operator 2026-08-23

**Context:**

A repository holding sensitive material has no protection against one accidental `git push` publishing its entire history. Deleting the content later does not undo it: it remains in history, in any clone already taken, and in the remote's own backups. Arcane's registry had no hook, push guard, or sensitive-repository component of any kind, and `git-conventions.md` unconditionally assumed a push/PR flow.

**Decision:**

1. **`push_policy: "open" | "guarded" | "blocked"`** on the manifest, on the same ask-once/retrofit/never-silently-overwrite contract as `profile` and `tracking_mode`. Default `"open"` — strictly additive, so every existing repository behaves exactly as before.

2. **`"blocked"` installs two layered controls.** A `pre-push` hook, and a sentinel push URL on **every** configured remote — not just `origin`, since a repository commonly also has an `upstream` or `backup`, and protecting one in particular protects nothing in particular. Both layers are needed, and they cover each other's blind spot: `git push --no-verify` skips hooks entirely, so only the URL catches it; `git push <url>` and pushes to a second remote never consult the first remote's URL, so only the hook catches those. Verified empirically in review: **for a remote this repository can actually cover, with the hook installed at the repository root**, no single bypass gets through — only combining a hook bypass and a remote bypass in one command does, which is the determined-operator case this does not claim to stop. Two qualifiers are load-bearing, and both were learned by having the unqualified claim disproved: the remote must exist when the policy is applied, and its push URL must not be configured outside this repository. `remote.<name>.pushurl` is multivalued and git collects values across system, global and local scope, so a local write **adds** to git's list and cannot subtract an outside value — and the outside value sorts first, meaning git delivers the push and only then fails on the sentinel. A repository in that state cannot be covered from inside itself, so applying the policy **refuses for that remote and says why**, rather than writing a sentinel that makes it look covered. The fetch URL is deliberately untouched, so a blocked repository can still pull.

   **Known gap, stated rather than glossed:** the URL layer applies only to remotes that exist when the policy is applied. A remote added *later* is covered by the hook alone, which `--no-verify` skips. `init` warns about this explicitly when no remote is configured, and `doctor` reports any remote whose push URL is still live — reading the **effective** URLs across every config scope, not just this repository's. Reading only local scope was itself a defect: it reported a repository fully covered while a globally-configured push URL delivered the history on `--no-verify` alone.

   **The hook is installed at the repository root and `core.hooksPath` is written as an ABSOLUTE path.** Both were learned the hard way. `core.hooksPath` is shared config, but `.arcane/hooks/` is an untracked directory that exists only where it was created, and git resolves a *relative* hooks path against each worktree's own top level — so every linked worktree had the config and no hook, and `git push <url>` walked out in one ordinary command. That is the case ARC-028 R3 makes routine, so the control was missing exactly where this framework tells people to work. Separately, `--is-inside-work-tree` is true from any subdirectory, so initialising inside a monorepo package installed the hook somewhere repository-wide config would never resolve to, and disabled the repository's real `.git/hooks` as collateral. The install path is now anchored on `--git-common-dir`, which is identical from every worktree.

   **R7's collision guard also covers git's default hooks directory.** It originally looked only for a competing `core.hooksPath`, which misses the commonest case of all: a repository with ordinary `.git/hooks/*` and no config key to collide with had every hook silently switched off — §3's own stated rationale, defeated by the one route the guard was not watching.

   **The recovery record lives inside the remote's own config section** (`remote.<name>.arcaneOriginalPushUrl`), not in a flat `arcane.originalPushUrl.<name>` key. Review broke the flat scheme three ways against real repositories, each of which silently left remotes pushable in a repository the operator had been told was blocked: `my_remote` is a legal remote name but an illegal trailing config key, so git errored and aborted the loop before reaching later remotes; trailing key segments are case-insensitive, so `origin` and `Origin` collided and restore pointed one remote at the other's URL; and `git remote rename` orphaned the record entirely. A `remote.<name>.*` subsection has none of those properties — git accepts any legal remote name, subsection names are case-sensitive, and `remote rename` moves the whole section including keys git has never heard of. Application is also per-remote fault-isolated now: one remote that cannot be covered is reported, never allowed to abandon the rest.

3. **Installation refuses rather than clobbering an existing `core.hooksPath`, at any scope.** That config is a single exclusive slot: Git reads one hooks directory, never several. Pointing it at Arcane's would silently disable whatever hook manager already owns it. This is not hypothetical — Arcane's own repository uses `.husky/_` to run lint, typecheck and the full suite, so a naive install would have turned that off while appearing to add protection.

   The effective value is read with `git config --get`, which respects local > global > system precedence. An earlier implementation read `--local --get` and was therefore blind to a **global** `core.hooksPath` — the standard way organisations deploy pre-commit and corporate hook managers. Because a local value overrides a global one, that version reported "installed" while silently disabling the org's hooks: precisely the harm this rule exists to prevent, reached through the rule itself. Caught in adversarial review against a real global config.

   **Deviation from the accepted PRD, recorded rather than silent:** R2 says the hook ships "via a new registry component". It is instead embedded in `src/modules/push-safety.ts`. A registry file would be user-deletable, would flow through self-host parity, and would leave the config pointing at a hook that no longer exists — the failure mode §5 exists to detect. Embedding makes the hook body a property of the installed CLI version instead.

4. **`"guarded"` installs nothing** but reports through `doctor` — and reports **regardless of remote state**. An earlier draft only reported when no remote was configured, which would have silenced the reminder the instant any remote was added, including a wrong one, making `"guarded"` behave identically to `"open"` exactly when it mattered.

5. **`doctor` verifies enforcement, not just declaration.** A manifest saying `"blocked"` while the hook or push URL is absent is reported as *"declared but not enforced — the manifest claims a protection this repository does not have."* A control that is only asserted is worse than none, because it is trusted.

   That means checking the hook **file exists**, not merely that `core.hooksPath` points at Arcane's directory. An earlier implementation checked only the config, so deleting the hook file left `doctor` reporting the hook as present while real pushes succeeded — a declaration check wearing an enforcement check's name, in the one place whose entire purpose is the distinction. Likewise, a `blocked` repository with no remote is **not** reported as fully protected: there is no push URL in place, and saying otherwise would be the same false confidence in a different spot.

6. **Unblocking is its own command, never a side effect.** `spell unblock-push` requires an interactive TTY, requires the repository name typed back, records `push_policy: "open"` with a timestamp, and offers no "just this once" mode — the manifest must never describe a protection the repository no longer has.

   **`spell uninstall` therefore refuses on a blocked repository** rather than either ignoring the block or quietly lifting it. Review found that uninstall deleted `.arcane.json` while leaving the hook and the sentinel URLs in force: the repository could not push, and `unblock-push` — the only supported way out — no longer recognised it, so recovery meant hand-editing git config after being told "Uninstalled". Silently unblocking instead would have handed any script the bypass this rule exists to deny, since `uninstall --yes` is non-interactive. Refusing preserves both properties: the operator runs `unblock-push` deliberately, then uninstalls.

7. **The retrofit records the choice but installs nothing.** Unlike `init`, a `spell update` that learns a repository should be blocked does not start blocking it mid-workflow; `doctor` reports the gap instead.

**Reasoning — and what this deliberately does not claim:**

The threat modelled is an **accidental** push: the wrong remote, muscle memory from another repository, an unsupervised agent, a misconfigured job. It is *not* a determined operator, and the PRD is explicit that nothing Arcane ships from a local CLI could be. Both controls are trivially reversible by anyone who decides to reverse them, and `core.hooksPath` does not travel to a fresh clone.

Saying so plainly is part of the decision. A control that is believed to be stronger than it is produces exactly the behaviour it was meant to prevent — someone relies on it and stops being careful. The PRD's comparison of six mechanisms found that only platform-side controls (a remote that does not exist, or one that rejects the push) survive a deliberate client-side bypass, and those are outside what this CLI can configure or verify.

The typed-repository-name confirmation is scoped honestly for the same reason: it guards a human against unblocking the wrong repository. It is **not** agent-resistance — anything that can read `.arcane.json` can read the name back. The interactive-TTY requirement is the actual bar against a scripted actor, and it is not absolute either, since a pseudo-TTY defeats it.

**Open questions (unresolved, carried from the PRD):**

- Whether an interactive-TTY requirement is sufficient agent-resistance for the unblock path, or whether that needs an out-of-band channel the local process cannot read back.
- Whether `push_policy` should ever be settable per-directory rather than per-repository.
- Whether non-CLI Git clients (GitHub Desktop, editor integrations) honour `core.hooksPath` hooks identically. Assumed yes, since hooks are a Git-level mechanism, but unverified — flagged rather than asserted.

**Rejected alternatives:**

- **A hook alone** — rejected: `--no-verify` skips it entirely, so it would fail against the single most likely bypass, which is not even deliberate.
- **Encryption at rest** — rejected as the primary mechanism: it changes what a push *exposes*, not whether one happens, and does not satisfy an operator who wants no push event at all.
- **Content scanning to decide what may be pushed** — rejected for the reason ARC-022 rejected it for CI filters: general documents have no reliable signature, so it degrades into a hand-maintained list that fails silently.
- **A "just this once" override** — rejected: it would leave the manifest asserting `"blocked"` while a push went through, which is precisely the false-confidence failure this ADR exists to avoid.
- **Blocking on the retrofit path too** — rejected: an upgrade should not begin blocking pushes in a repository someone is mid-workflow in.

---

## ARC-035 — Auto-Merge Requires a Clear Review Round

**Date:** 2026-08-25
**Status:** Accepted
**Related:** [ARC-023](#arc-023--normative-controls-require-inline-enforcement-contracts) (the enforcement-mode taxonomy this decision's rules are classified against), [ARC-024](#arc-024--confirmed-severity-must-have-operational-consequences) (adjacent, not superseded — a filed-severity release gate vs. this decision's in-flight-review merge gate), [ARC-034](#arc-034--push-safety-for-sensitive-repositories) (the pre-push hook this extends), [ARC-009](#arc-009--session-naming-and-pr-lifecycle-reliability-policy) (the merge-strategy ruleset this shares)
**Intake:** [EF-36](docs/intake/batch-001/EF-36.md)

**Context:**

Auto-merge is enabled on the sole condition "CI is green," which says nothing about whether a review round is still open on the same PR. This is not hypothetical: it fired once, closing a PR mid-round, and the fix for the finding that round had just surfaced landed on the now-dead branch and never reached `main` — `0.20.0` shipped to npm with a HIGH defect live (PR #63, 2026-08-23).

Verified live against the actual platform state on 2026-08-25, not assumed: the `protect main` ruleset (`gh api repos/codemagicianhq/arcane/rulesets/18841659`) has `required_approving_review_count: 0` and `required_reviewers: []`. Separately, a grep across every `.github/prompts/*.prompt.md` and `.arcane/governance/*.md` file found zero uses of `gh pr review`, `REQUEST_CHANGES`, or `reviewDecision` — no spell in this repository (`spell-review`, `code-review`, `spell-create-pull-request`) ever posts a formal review or vote. `code-review --comment` posts inline PR comments, which do not participate in GitHub's mergeability calculation. So the actual gap is stronger than "auto-merge ignores an open round": **there is currently no review-state signal reaching the platform's merge logic at all** — nothing to ignore.

[ARC-024](#arc-024--confirmed-severity-must-have-operational-consequences) does not cover this, checked against the implementation rather than the decision text: `src/modules/incident-gate.ts` gates on records in the incident queue that already carry a `severity` field. A finding raised inside an open review round, before anyone has filed it, does not exist in that queue yet.

**Decision:**

1. **Auto-merge is narrowed, not removed.** `allow_auto_merge` stays available — the skip-and-continue property it was chosen for (D8, 2026-08-23) is real and worth keeping for routine changes. What changes is eligibility: CI-green is necessary but no longer sufficient. **Enforcement: verified external platform policy** (ARC-023 mode 3) — a new required status check, added to the `protect main` ruleset's `required_status_checks` alongside the two that already exist (`Lint, typecheck, test, build`; `PR branch is rebased on target`).

2. **The new check (`Review round clear`, `scripts/check-review-round.ts`, matching the `check-*.ts` naming already used for `check-distributed-adr-references.ts`/`check-version-bump.ts`) reads PR review state, not approval count.** It fails only while the PR has an outstanding `CHANGES_REQUESTED` review that has not been superseded or dismissed; a PR with no reviews at all passes, preserving today's zero-friction path for changes nobody reviews formally. **Deliberately not `required_approving_review_count`.** GitHub does not let a PR author approve their own pull request, and in this repository the author and the only available human reviewer are routinely the same identity — there is no second GitHub account in play. Requiring an approval would make every PR permanently unmergeable without an admin bypass, and this ruleset already has `current_user_can_bypass: "never"`. Gating on the *absence of an active objection* rather than *presence of an approval* avoids that trap while still closing the gap PR #63 exposed. **Enforcement: executable check** (ARC-023 mode 1).

3. **`spell-review` and `code-review`'s adversarial-round conclusion must post that formal state**, not only a chat summary: `gh pr review --request-changes` when the round ends with a confirmed blocker still outstanding; the reviewing pass explicitly dismisses or supersedes that review once the blocker is fixed and re-verified, rather than leaving it stale (`dismiss_stale_reviews_on_push` is `false` on this ruleset, so a later push does not clear it automatically — closing the round is a deliberate step, matching the discipline this repository already applies to closing everything else). ADO's equivalent (`az repos pr set-vote --vote reject`) is not new machinery — it is the same primitive `spell-commit-work.prompt.md`'s self-approval step already uses for the *author* side; this extends it to the *reviewer* side. **Enforcement: structured spell gate** (ARC-023 mode 2) for the posting behavior, backed by the executable check in (2) for the merge-time consequence.

4. **The silent stranded-commit mode is made loud by extending [ARC-034](#arc-034--push-safety-for-sensitive-repositories)'s existing pre-push hook**, not by adding a second, competing hook: before accepting a push, check whether the current branch's associated PR (`gh pr view --json state`) is already `CLOSED` or `MERGED`, and warn — loudly, not blocking, since pushing to a branch behind a closed PR is sometimes intentional — rather than accepting the push into a void with no error at all, which is what turned this from a process gap into a shipped defect the first time. **Enforcement: executable check** (ARC-023 mode 1).

5. **Unchanged: the authorization gate in `spell-create-pull-request.prompt.md#authorization-gate:40`.** That gate decides whether an *agent* is permitted to request auto-merge at a given power level. This decision governs a different question — whether the *platform* honors that request once made — and the two compose: an agent still needs power-level authorization to ask for auto-merge, and the platform now additionally withholds it while a round is open, regardless of who asked.

6. **A new record (ARC-035), not an amendment to ARC-024.** The mechanisms do not overlap: ARC-024 is a queue gate over filed, severity-tagged records; this is a merge-time gate over review state that never touches the incident queue. `Related:` link added in both directions.

**Reasoning:**

This is the third confirmed instance, on this repository alone, of governance declared in prose with nothing checking whether the platform actually enforces it — the ADO branch-policy gap (2026-08-21) and this same ruleset's `allowed_merge_methods`/`required_linear_history` contradiction (2026-08-24/25) are the first two, both recorded under `TODO.md`'s `doctor`/`ward` item. `required_approving_review_count: 0` with zero spells ever posting a review is a fourth data point for the same pattern, found by this ADR's own verification pass rather than assumed from the finding's original framing.

Binding the check continuously (a required status check re-evaluated on every push and review event) rather than only at the moment auto-merge is requested matters because of how PR #63 actually failed: the round opened *after* the PR had already looked clean, not before. A merge-time-only check would have passed at request time and missed the same failure.

**Open questions (unresolved, carried forward for implementation):**

- **Needs empirical verification before implementation, not assumed:** whether GitHub allows a PR author to submit `--request-changes` on their own pull request. The restriction I'm confident about is narrower and specific — authors cannot `--approve` their own PR — but this design never asks for an approval, only for the ability to request changes, which is believed unrestricted for authors but has not been tested against a live PR.
- Exact dismissal/supersession mechanics when a round clears — who or what calls `gh pr review --dismiss`, and how the reviewing pass confirms the fix it's approving is the fix that was actually requested — needs to be spec'd during implementation.
- ADO-side equivalent of the new required check (a build-validation policy reading vote state) is unspecified here; the GitHub half is concrete, the ADO half needs its own pass before this is portable in practice, not just in principle.
- Whether an ad-hoc, human-run round that never goes through `spell-review`/`code-review` (a quick pairing session, a comment-only look) should have any way to signal "hold off" without posting a formal review — currently out of scope; falls back to no signal, same as today.

**Rejected alternatives:**

- **`required_approving_review_count: 1`** — rejected: GitHub blocks self-approval, this is a solo-operator repository where author and reviewer are usually the same identity, and the ruleset's `current_user_can_bypass: "never"` removes the admin-override escape hatch. Would make every PR unmergeable, not safer.
- **An Arcane-owned label convention** (`review:open`/`review:clear`, gating a required check that reads the label instead of review state) — considered as the portable, self-controlled alternative EF-36's own open questions raised. Rejected as primary: it invents and has to maintain new machinery when a real, established provider primitive (PR review state) already exists and needs only a required-check wrapper, not a whole new signal. Noted rather than dismissed, since it may still be the right answer for the ad-hoc-round gap above.
- **Removing auto-merge entirely** — rejected: throws away the skip-and-continue property D8 was chosen for, over-correcting a gap that a narrower, still-automatic-when-safe control closes without reintroducing manual-merge friction for routine changes.
- **Binding the check only at the moment auto-merge is requested** — rejected: does not cover PR #63's actual failure shape, where the round opened after the PR already looked mergeable.

**Implementation note (2026-08-31, BC-01):**

- **Decisions 1-3 and 6 shipped as specified**: `scripts/check-review-round.ts` (decision 2), the `Review round clear` CI job gated to `pull_request` events (decision 1), and formal round-state posting added to `spell-review.prompt.md` step 10 and `spell-review-batch.prompt.md` step 2.4 (decision 3) — resolving open question 2 above: the reviewing pass finds the blocking review's ID via `gh api .../reviews --jq 'select(.state=="CHANGES_REQUESTED")'` and dismisses it with `PUT .../reviews/{id}/dismissals` (`event=DISMISS`, a `message` naming the fix commit), verified against GitHub's REST docs before being written into the shipped prompt rather than assumed from memory.
- **Decision 4 shipped only for this repository's own `.husky/pre-push`, not for the "shipped `HOOK_BODY`" consumer path the decision text named.** Checked against `src/modules/push-safety.ts ("arcane: push blocked (push_policy: blocked). Run 'spell unblock-push' to undo.")` before implementing, not assumed from the decision's phrasing: `HOOK_BODY` installs exclusively for `.arcane.json`'s `push_policy: "blocked"` tier (a narrow, opt-in "this history must never reach a remote" control for sensitive repos) and unconditionally `exit 1`s on every push — there is no branch inside it a "warn, don't block" closed-PR check could reach without either being dead code (the block already fires first, regardless) or misapplied scope creep (folding a general PR-hygiene warning into a hook whose repos may not even use a normal PR workflow). Separately, Arcane ships **no** general-purpose pre-push hook to `guarded`/`open` policy repos at all (confirmed: no `src/assets/.husky/`) — and this repository itself is `open` policy, meaning the actual PR #63 incident happened on exactly the tier decision 4's named vehicle cannot reach. Consumer-facing coverage of decision 4 remains a real, open gap, tracked as a new item at `TODO.md` (added same date) rather than silently claimed done.
- **Empirical test (open question 1) result: authors CANNOT self-request-changes on GitHub.** Run live against this epic's own PR ([#88](https://github.com/codemagicianhq/arcane/pull/88)), not assumed: `gh pr review 88 --request-changes` as the PR author failed with `GraphQL: Review Can not request changes on your own pull request (addPullRequestReview)` — no review object was created (`gh api .../pulls/88/reviews` returned `[]` immediately after). This settles the open question the other direction from what decision 3's text guessed ("believed unrestricted for authors but... not tested") — the restriction is the same as self-approval, just previously untested. **Consequence, per step 1's own instruction to note it and continue:** in a solo-operator repository where the author and the only human reviewer are routinely the same GitHub identity, `spell-review`'s decision-3 posting step will hit this exact error whenever it runs under the author's own account — the check in decision 2 still functions correctly for genuinely reviewer-posted state (a second collaborator or a distinct bot/service identity), but self-review can never produce the formal blocking signal the merge gate reads. `spell-review.prompt.md` step 10 now names this failure mode explicitly rather than leaving an agent to hit an unexplained GraphQL error.

---

## ARC-036 — Generated State Diagrams: Deterministic Mermaid for Computed Spell State

**Date:** 2026-08-30
**Status:** Accepted
**Verified:** [journal/2026-08-30-generated-state-diagrams.md](journal/2026-08-30-generated-state-diagrams.md)
**Related:** [ARC-023](#arc-023--normative-controls-require-inline-enforcement-contracts) (enforcement mode for the prompt-template rules), [ARC-032](#arc-032--persisted-tracking-configuration-tracking_mode-and-external_provider-in-the-manifest) (the `external_provider` key that tracker-aware fencing reads)
**PRD:** [features/generated-state-diagrams/PRD.md](features/generated-state-diagrams/PRD.md)

**Context:** Spells already compute state — version-drift readings, branch/PR topology, pipeline stage — and report it as prose. Rule 8 (`universal-agent-rules.md ("Use Mermaid for diagrams"):36`) mandates Mermaid only for explanatory flow/architecture/sequence diagrams; nothing covers machine-derived state, so each spell would invent its own shape or none: the two-axis version check emits prose warnings, and `spell status` never compares the manifest version to the CLI's at all.

**Decision:** Spell output describing computed state emits a deterministic, data-derived Mermaid diagram under one named convention — **generated state diagrams** — an additive extension of rule 8, with an applicability guard keeping one-line, speed-rule, and single-reading outputs diagram-free.

**Reasoning:**

- The values are already computed — a string template adds no model judgment and no new failure mode.
- Markdown-native: renders in VS Code chat, GitHub, and Obsidian; degrades to readable fenced source in terminals; ADO wikis take the `:::mermaid` fence, keyed to `external_provider` (ARC-032).
- One referenced convention beats per-spell prescriptions (spell-authoring-standards D8); the guard preserves `spell-explain-concept`'s "don't use diagrams for simple definitions" restraint.
- Differentiator: no other AI dev framework auto-visualizes its own governance, version, or session state.

**Naming impact:** "generated state diagrams" — repo grep clean: no prior use of the phrase, no spell or doc collision, and clearly distinct from rule 8's explanatory-diagram mandate.

**Rejected alternatives:**

- Model-authored diagrams per spell — non-deterministic, drift-prone, and restates rule 8 across 36 files instead of referencing one convention.
- Rendered images/SVG or a rendering service — breaks the markdown-native, no-lock-in pillar.

---

## ARC-037 — Secret and Org-Leak Detection: Pre-Commit Scan Plus Repository-Wide CI Backstop

**Date:** 2026-08-31
**Status:** Accepted (2026-09-01, operator accept call — [OPERATOR-QUEUE.md Q-006](docs/plans/become-current/OPERATOR-QUEUE.md#q-006--acceptreviserreject-adr-arc-037-secret-and-org-leak-detection)). Implementation: BC-30.
**Related:** [ARC-016](#arc-016--public-repository-model-fresh-start-build-in-public-with-an-org-leak-gate) (decision 3's org-leak gate, partially unbuilt — audited and disposed of below), [ARC-034](#arc-034--push-safety-for-sensitive-repositories) (its pre-push hook is examined as a candidate bind point and ruled out, not extended)
**Intake:** [EF-35](docs/intake/batch-001/EF-35.md)

**Context:**

EF-35 found that Arcane's secret-handling policy is documented in five governance files but checked
nowhere, and that `threat-model.md` overclaimed "Mitigated" for credential exposure as a result (that
overclaim was corrected the same day EF-35 was filed; this ADR is only about the missing detection
mechanism EF-35 deferred). EF-35's own research method — searching the repository for the names of
well-known third-party scanners (`gitleaks`, `trufflehog`, `detect-secrets`, `git-secrets`,
`secretlint`, `ggshield`) — found none and concluded no scanner exists "anywhere."

**That conclusion needs correcting before this ADR can settle anything.** `scripts/copy-assets.ts`
has run a homegrown, regex-based secrets scanner (`SECRETS_PATTERNS` — API keys, Bearer tokens, PEM
headers, Slack tokens, AWS access key IDs, GitHub PATs, OpenAI-style keys) since this repository's
very first public commit (`07b98a0`, predating EF-35's 2026-08-23 filing by roughly two months). It
runs inside `copyDir`, which `npm run build` calls, which CI's `Lint, typecheck, test, build` job
runs as a required check on every PR. EF-35's search terms — all third-party tool *names* — could not
find in-house scanning code with no such name attached; that is a real gap in EF-35's methodology, not
a fabrication, and it does not survive independent verification. **The corrected gap is narrower than
EF-35 stated:** this scanner's bind point is `npm run build`, and its scope is *only* files being
copied from `src/assets/` to `dist/assets/` — it protects the shipped product's asset tree from
carrying a secret, and does nothing for the rest of this repository (`src/`, `test/`, `scripts/`,
governance docs, `journal/`), and nothing for any consumer repository at all, ever, at any point.
That is the actual hole EF-35's Impact section describes.

Separately, [ARC-016](#arc-016--public-repository-model-fresh-start-build-in-public-with-an-org-leak-gate)
decision 3 (2026-06-24) mandated an **org-token** leak gate — a narrower concern than general secrets
(org names, venture names, machine names, ADO URLs, not credentials) — as three deliverables: a
`spell check-leaks` command, a pre-commit hook, and a CI gate. Audited against current `HEAD`: the CI
gate shipped (`scripts/org-token-lint.ts`, wired into the same `npm run build` path as the secrets
scanner above — this piece of ARC-016 is **done**, not a gap, correcting PLAN.md's "unbuilt" framing
for this specific piece). The command and the pre-commit hook were never built: no `spell check-leaks`
exists in `src/index.ts`'s command list, and `.husky/pre-commit` runs `npm run lint && npm run
typecheck` only (confirmed directly, not inferred).

**Decision:**

1. **Bind point: pre-commit, as a third step in the existing `.husky/pre-commit` script** — not a
   separate hook file, and not ARC-034's pre-push hook. EF-35's own reasoning already ranks pre-commit
   highest ("the only point where remediation is still free"); once a secret is committed, remediation
   means rotating the credential, not editing history. Extending the existing hook script (after
   `lint && typecheck`) reuses the install/collision-guard machinery already proven for that hook
   rather than inventing a second one.
2. **ARC-034's pre-push hook is ruled out as a bind point, not merely deprioritized.** Checked directly
   against `src/modules/push-safety.ts ("arcane: push blocked (push_policy: blocked). Run 'spell unblock-push' to undo.")`: `HOOK_BODY` is a static, unconditional `exit 1`, installed
   only for the `push_policy: "blocked"` tier — the minority of repositories (confirmed this session:
   `guarded`/`open` repos, including this one, get no shipped pre-push hook of any kind). There is no
   branch inside an unconditional block a scan step could reach without either being dead code (the
   block already fires first) or changing what an already-shipped, tested hook does. Secret-scanning
   needs its own bind point, independent of `push_policy` — the same missing primitive a still-open
   TODO.md item (`ARC-035` decision 4's closed-PR push warning) separately needs for an unrelated
   reason; BC-30's implementation should build one shared, `push_policy`-independent hook-install path
   rather than two.
3. **CI backstop: widen the existing scanner's scope from `src/assets/`-only to repository-wide,**
   mirroring how `scanRepository`/`resolvePrivateTokens` already does a full-tree walk for the *private*
   org-token denylist in the same file. This is a scope change to an already-shipped, already-required
   check, not a new gate — it catches anything that bypasses the new pre-commit hook (`--no-verify`,
   a client that doesn't run hooks, a direct API commit) before merge.
4. **Self-host and shipped parity, both required, as two separate deliverables.** (a) This repository's
   own `.husky/pre-commit` gains the scan step directly (self-host fix, no new distributable content).
   (b) Arcane currently ships **no** `.husky/` hooks to consumers at all (`src/assets/.husky/` does not
   exist — confirmed this session investigating a different, related gap). A consumer-facing pre-commit
   hook installer is new distributable content, not a self-host-only patch; skipping it would leave
   every consumer repository exactly as unprotected as EF-35's Impact section describes today.
5. **False-positive posture: extend `copy-assets.ts`'s existing (currently empty)
   `SCAN_EXCLUDED_PREFIXES` mechanism into an `.arcane.json`-configurable field** (exact name/shape
   left to BC-30) rather than inventing a parallel allowlist format. This is not a hypothetical
   concern: `test/copy-assets.test.ts ("still blocks on a secrets-pattern violation via the underlying copyDir")` already commits a literal API-key-shaped fixture string
   to test that `SECRETS_PATTERNS` fires correctly — the exact self-referential collision EF-35's
   proposed-fix point 4 warned about, confirmed to already exist in this repository's own test suite,
   which decision 3's repository-wide widening would trip the moment it ships without an allowlist.
   (PLAN.md's BC-10 route cites `org-token-lint.test.ts` for this concern; the actual fixture lives in
   `copy-assets.test.ts` — corrected here rather than perpetuated.)
6. **Bypass posture: `--no-verify` defeats pre-commit hooks by design, and this ADR does not pretend
   otherwise.** ARC-034's push-safety achieves `--no-verify`-resistance through a disabled push URL —
   a mechanism that works *because* push-safety's desired end state is binary ("block every push").
   Secret-scanning has no equivalent: it must let non-secret commits through, so there is no "disable
   everything" fallback to borrow. Decision 3's CI backstop is the real defense-in-depth here — it
   inspects pushed content independently of whatever happened to local hooks — and this is stated
   plainly rather than presenting the pre-commit hook as tamper-proof, which it is not and cannot be.
7. **ARC-016's three unbuilt-or-partial deliverables, disposed of individually:**
   - **CI gate — already done**, per the Context section above. No further action; PLAN.md/TODO.md
     framing that treats this as outstanding should be corrected when this ADR is implemented.
   - **Pre-commit hook — absorbed**, not built separately. The single new pre-commit step (decision 1)
     runs both the org-token check (already-existing `scanRepository`/`resolvePrivateTokens` logic) and
     the generic-secrets check (`SECRETS_PATTERNS`) together, rather than shipping two independent
     hook mechanisms for two related leak classes.
   - **`spell check-leaks` standalone command — retired as originally specified.** A dedicated
     top-level command duplicates what becomes continuous, hook-driven protection once decisions 1–4
     ship. An on-demand equivalent (for a manual check outside the commit path — e.g. auditing history
     already in the repo) fits better as a mode of `spell doctor`, which already exists for
     "check my environment" queries, than as new top-level CLI surface.
8. **Scanner choice: extend the existing in-house `SECRETS_PATTERNS` regex engine; do not adopt an
   external tool (gitleaks, trufflehog, or similar).** Arcane distributes as a single `npm install`;
   the leading third-party scanners ship as standalone non-npm binaries requiring a separate install
   step (`brew`, `curl`, `go install`). Requiring that for a *mandatory* pre-commit dependency conflicts
   with the zero-extra-install distribution model every other Arcane capability follows. The existing
   patterns already cover the highest-value common credential shapes and are already exercised by
   `test/copy-assets.test.ts`.

**Open questions (deferred to BC-30's implementation, not blocking acceptance of the shape above):**

- Exact `.arcane.json` field name and match semantics for the new exclude-list (literal prefix match,
  mirroring `SCAN_EXCLUDED_PREFIXES` exactly, or glob support).
- Whether the widened repository-wide CI scan should also become its own named required status check
  (the way `Review round clear` is one, per ARC-035) or remain folded into the existing build job.
- Whether detection should be mandatory for every Arcane-managed repository or opt-in on the same axis
  as `content_sensitivity`/`push_policy` (EF-35's own first open question — a genuine operator-facing
  policy call this ADR does not presume to resolve).
- Whether GitHub's native secret scanning + push protection (already enabled operationally on this
  repository, per TODO.md's EF-35 entry) should reduce `doctor`'s scope to "report whether the
  platform feature is on" for GitHub-hosted repos specifically, alongside the portable scanner above.

**Reasoning:**

- Pre-commit is the only bind point where remediation is still free (EF-35's own framing); CI is the
  only bind point that cannot be locally bypassed. Using both, and explicitly not the third candidate
  (ARC-034's pre-push hook, mechanically unusable here), covers the two properties that actually matter
  without inventing a third redundant check.
- Reusing and widening two already-shipped, already-tested mechanisms (`SECRETS_PATTERNS`,
  `scanRepository`) is smaller and lower-risk than introducing new scanning logic or a new dependency,
  and inherits their existing test coverage rather than starting from zero.
- Naming the bypass limitation explicitly (decision 6) is consistent with how ARC-034 itself describes
  its own hook as "deliberately not tamper-proof" rather than overclaiming — the same discipline EF-35
  criticized `threat-model.md` for lacking should apply to this ADR's own claims about itself.

**Rejected alternatives:**

- **Extend ARC-034's pre-push hook to also scan for secrets** — ruled out mechanically (decision 2),
  not merely deprioritized: the hook's unconditional block and narrow `push_policy: "blocked"`-only
  installation leave no reachable branch for a conditional scan step.
- **Adopt gitleaks or trufflehog as the scanning engine** — rejected: both ship as external binaries,
  conflicting with Arcane's single-`npm-install` distribution model for a capability meant to be
  mandatory (decision 8). Worth revisiting only if the in-house pattern set proves insufficient in
  practice, which has not been observed.
- **Wait for ARC-020's full repository-configuration schema before adding an `.arcane.json` field** —
  rejected using ARC-032's own precedent: a small, scoped field (the exclude-list) does not need to
  wait for a broader, still-open schema decision.
- **Keep `spell check-leaks` as its own top-level command, as ARC-016 originally specified** —
  rejected: once detection is continuous (pre-commit + CI), a separate on-demand command duplicates
  coverage the hook already provides for the common case; the genuinely different use case (auditing
  content already committed, outside the commit path) fits `spell doctor` better than a new verb.

---

## ARC-038 — Content-Preserving Updates and Vendor-Neutral Governance Content

**Date:** 2026-08-31
**Status:** Accepted (2026-09-01, operator accept call — [OPERATOR-QUEUE.md Q-007](docs/plans/become-current/OPERATOR-QUEUE.md#q-007--acceptreviserreject-adr-arc-038-content-preserving-updates-and-vendor-neutral-governance-content)). Implementation: BC-31.
**Related:** [ARC-019](#arc-019--repository-document-ownership-and-path-model) (its own "Open follow-up" section names the override-model gap this ADR closes), [ARC-020](#arc-020--canonical-repository-configuration-schema) (examined as a candidate to subsume — see Decision 4: it is not), [ARC-011](#arc-011--optional-external-tracking-mode-with-process-template-aware-ado-mapping)/[ARC-032](#arc-032--persisted-tracking-configuration-tracking_mode-and-external_provider-in-the-manifest) (the `external_provider` pattern this ADR's vendor-neutral-content decision reuses, not reinvents)
**Sources:** TODO.md's vendor-neutral-customization backlog item (filed 2026-07-14) — a research spike per that item's own instruction, not a straight-to-implementation route

**Context:**

This item bundles three related but distinct asks, filed together on 2026-07-14: (a) an override/
customization model for shipped governance content that survives `spell update`; (b) a vendor-neutral
core for `naming-conventions.md` plus pluggable vendor profiles (Azure/AWS/GCP/Netlify/Vercel); (c) a
structural home for vendor-specific standards distinct from that neutral core.

**(a) is real and current, checked directly against `src/commands/update.ts`.** Every file in an
installed component is either fully preserved (`component.skipExisting: true` — used today only for
`.gitattributes`/`.gitignore`, a deliberate whole-file, install-once model) or unconditionally
overwritten via `copyFile(..., { force: true })`. There is no per-file record of what shipped versus
what an operator later edited, so editing even one line of, say, `.arcane/governance/git-conventions.md`
and later running `spell update` silently discards that edit with no distinction from a file nobody
ever touched. This is exactly the gap [ARC-019](#arc-019--repository-document-ownership-and-path-model)'s
own "Open follow-up" section named and left open: "The single-layer model does not yet let an operator
override a shipped standard safely... must define precedence and update-safe ownership before Arcane
claims managed standards are customizable."

**(b)'s specific premise does not hold today, checked directly rather than assumed.** A full-text
search of `src/assets/.arcane/governance/naming-conventions.md` for `Azure`, `CAF`, `GoDaddy`, or any
cloud-resource-naming term returns nothing. The file's actual scope, confirmed by its section headings,
is agent/persona naming (Machines, AI Agents, the Arcanos roster, Power Levels) — unrelated to cloud
resource naming entirely. Either this content was removed during the repository's public-readiness
passes sometime after 2026-07-14 (ARC-016's org-leak gate, ARC-031's privacy gate, and the fictional-
venture-name convention are the likely vehicles, all landing well after this item was filed), or the
original filing simply named the wrong file. Either way, treating `naming-conventions.md` as needing a
vendor-neutral/pluggable split today would be solving a problem that no longer exists there.

**The underlying concern in (b) is not stale — it just lives somewhere else, confirmed by search.**
`src/assets/.arcane/governance/cicd-standards.md` is thoroughly Azure-DevOps-specific: a section titled
literally "Branch Policies (Azure DevOps)", three full `azure-pipelines*.yml` templates, Azure
Pipelines' own skip-CI syntax (`[skip azurepipelines]` etc.) documented as platform knowledge, and an
operational checklist scoped explicitly to "Azure DevOps organizations" and "Azure Functions, App
Service" deployments. This is real, current, substantial vendor lock-in in shipped governance — just
in a CI/CD standards file, not a naming-conventions file.

**Decision:**

1. **Override model: per-file content hashing plus an npm-history-backed three-way merge**, generalizing
   `skipExisting`'s existing binary, component-level flag into a precise, per-file, content-aware one.
   `ArcaneManifest`'s `InstalledComponent` gains a hash (SHA-256, algorithm to be pinned at
   implementation) recorded per file at the point it is written. On `spell update`, for each file:
   compare its current on-disk hash to the recorded one.
   - **Match (untouched since install):** overwrite unconditionally, exactly like today — this is the
     common case and should stay as cheap as it is now.
   - **Differ (operator has edited it):** do not silently discard the edit. Fetch the exact
     previously-installed version's content — `manifest.version` already records which published
     version was last installed, and that exact `src/assets/` tree is permanently retrievable from the
     npm registry (`npm view arcane-cli@<version>` / a registry tarball fetch) — as the three-way
     merge's common ancestor: old-vendor-version vs. operator's-current-content vs. new-vendor-version.
     Auto-merge non-overlapping changes; write standard conflict markers into the file for genuine
     collisions, the same shape `copier`'s regenerate-old/diff/regenerate-new/merge approach uses (see
     the prior-art research this spike drew on), reusing npm's own permanent version history instead of
     vendoring a second copy of every past release.
   - `skipExisting` components (`.gitattributes`/`.gitignore`) keep their current, simpler whole-file
     behavior unchanged — they are meant to be the operator's from the moment they are written, never
     re-templated, and do not need merge machinery.
2. **Vendor-neutral CI/CD standards, applying an already-proven pattern rather than inventing one.**
   Split `cicd-standards.md` into a vendor-neutral core (branch-policy principles, PR requirements,
   the *concept* of CI-skip semantics) and a provider-specific profile carrying today's Azure DevOps
   content (pipeline YAML templates, ADO's specific skip-CI syntax, the ADO-scoped operational
   checklist). This is not a new architecture: it is the identical shape `development-methodology.md`
   already uses successfully for tracking providers (Process-Template-Aware ADO Hierarchy Rules
   alongside GitHub Issues Conventions, from BC-09/ARC-032) and the identical shape `ExternalProvider`
   itself already resolves through (ARC-011, ARC-032, BC-09). A future GitHub-Actions- or
   GitLab-CI-specific profile can be added the same way, without touching the core.
   **`naming-conventions.md` needs no change under this decision** — see Context; the premise that
   motivated naming it does not hold today.
3. **Home for vendor-specific standards: no new mechanism — apply spell-authoring-standards.md's
   existing D2 gate to vendor coupling, not only org coupling.** D2 ("Distributability / no
   org-coupling") already forbids baking a specific organization into shipped content; this decision
   extends that same bar, and the same remediation shape (a neutral core + resolved-per-provider
   detail), to a specific *vendor/platform* the way decision 2 demonstrates concretely for CI/CD. No
   separate "vendor-specific standards directory" is introduced — the pattern is the split itself,
   applied wherever a future governance doc risks the same coupling.
4. **ARC-020's remainder is not subsumed by this ADR — correcting an assumption already on record.**
   OPERATOR-QUEUE.md's Q-005 anticipated that this ADR "will subsume or close ARC-020's open
   remainder (operator identity, provider coordinates, repository lists)." Checked directly: those
   three items are manifest **data fields** (what values `.arcane.json` stores for a given operator/
   repo), while this ADR's decisions 1–3 are about **governance-content architecture** (how shipped
   docs avoid vendor lock-in and survive updates without clobbering edits) — a different axis, not a
   subset or superset relationship. This ADR closes ARC-019's follow-up and the real half of the
   2026-07-14 backlog item; it does not touch operator identity, provider coordinates, or repository
   lists at all. ARC-020's remainder should be closed the same way ARC-030/032/033 already closed
   their own pieces of it — one more scoped amendment per field group, when a concrete epic needs one,
   not by waiting for this ADR to have covered it by accident. Q-005 is updated to reflect this rather
   than left to imply a closure that did not happen.

**Open questions (deferred to BC-31's implementation, not blocking acceptance of the shape above):**

- Exact hash algorithm and manifest field shape for per-file content hashes (this ADR specifies the
  mechanism, not the byte format).
- Conflict-marker UX when the three-way merge finds a genuine collision: does `spell update` stop and
  report the file, or complete the update and list conflicted files at the end?
- Whether the npm-registry fetch for the merge base should be cached locally (repeat updates across
  many repos re-fetching the same historical version) and where that cache would live.
- Exact split point and file names for `cicd-standards.md`'s core/profile division — this ADR settles
  that a split happens and mirrors an existing pattern, not the specific new file names.

**Reasoning:**

- A per-file hash is the minimum information needed to distinguish "never touched" from "customized,"
  and is the stated prerequisite IDEAS.md's own prior-art research (I14) already identified for either
  a merge path or honest drift detection — this decision follows that research rather than
  re-deriving it.
- Using npm's own registry as the historical-version store avoids inventing new vendoring
  infrastructure: every past release is already a permanent, fetchable artifact there, which is
  exactly what a three-way merge's common ancestor needs.
- Reusing the `external_provider`/per-provider-section pattern for CI/CD content (decision 2) is
  smaller and more consistent than a bespoke plugin system: it is the same shape this repository has
  now shipped twice (ARC-011/032 for tracking, BC-09 for issue tracking) and proven to work.
- Verifying (b)'s premise before acting on it — rather than trusting a six-week-old backlog item's
  file citation — surfaced that the real instance had moved; fixing the *name* the backlog item still
  used instead of the *actual* current violation would have looked like progress while leaving the
  substantial, real Azure lock-in in `cicd-standards.md` completely untouched.

**Rejected alternatives:**

- **Angular `ng update`-style versioned migration schematics** instead of a hash-detect-plus-merge
  approach — rejected: requires hand-authoring an imperative transform for every future change to
  every governed file, an ongoing authoring burden with no natural end, versus a generic diff/merge
  mechanism that works unchanged as new versions ship.
- **Treat `naming-conventions.md` as still needing the vendor-neutral split**, per the original 2026-07-14
  filing — rejected after direct verification found no vendor-specific content there today; acting on
  a stale citation without checking it would have been effort spent on an already-solved problem.
- **Vendor a second, permanent copy of every past `src/assets/` release** for the merge base — rejected:
  npm's registry already is that permanent store; duplicating it adds storage and a second source of
  truth for no benefit over fetching on demand.
- **Accept Q-005's pre-written assumption that this ADR subsumes ARC-020's remainder** without checking
  it — rejected once decision 4's direct comparison showed the two scopes don't actually overlap;
  presenting a false subsumption would have left `operator identity`/`provider coordinates`/`repository
  lists` looking resolved when nothing in this ADR touches them.

---

## ARC-039 — Build-Time Spell Compiler: Generated Client Stubs and Shared Prose Fragments

**Date:** 2026-08-31
**Status:** Accepted (2026-09-01, operator accept call — [OPERATOR-QUEUE.md Q-008](docs/plans/become-current/OPERATOR-QUEUE.md#q-008--acceptreviserreject-adr-arc-039-build-time-spell-compiler)). Implementation: BC-32.
**Related:** [ARC-027](#arc-027--registry-driven-self-host-parity-guard) (the parity model this ADR adds a third axis to, not replaces), [ARC-023](#arc-023--normative-controls-require-inline-enforcement-contracts) (EF-24's actually-shipped fix — this ADR is a related but distinct architectural direction for the same underlying problem class, not a re-litigation of EF-24, which is already closed)
**Sources:** IDEAS.md:13 (I5, 2026-08-02, "spell compiler, not spell runtime") and IDEAS.md:23 (I15, 2026-08-21, dual-copy elimination) — a research-first route, not straight to implementation

**Context:**

I5 proposed that the CLI become a spell *compiler*: `spell render <name>` would print a fully resolved
prompt to stdout, with `/spell-*` becoming a thin shim, and render-time injection of `.arcane.json`
config, governance paths, business/subject roots, and validated roster identity structurally
preventing an agent from fabricating those values. I5 itself named the central risk: `spell-authoring-
standards.md`'s D2 Gold bar requires a spell to work in a vanilla repo with no Arcane context files
present, and baking repo-specific runtime values into rendered text cannot satisfy that when the values
don't exist yet. I15 gave a concrete driver: "66 hand-maintained files" (33 `.claude/commands/spell-
*.md` + 33 `.github/prompts/spell-*.prompt.md`) that ARC-027's parity guard never compares against each
other — it keeps each client format in lockstep with its own `src/assets/` source, but does nothing
about the two client formats drifting from *each other*.

**I15's own premise needs correcting before design starts, checked directly rather than assumed.**
Every `.claude/commands/spell-*.md` file inspected (all 36 present today, not 33 — the count grew since
I15 was written) is exactly 9 lines and already a thin shim: a one-line title, two boilerplate sentences
naming the spell, and a literal Claude Code `@`-file-inclusion directive
(`@.github/prompts/spell-<name>.prompt.md`) that pulls the real workflow content in at invocation time.
**These are not two independently-maintained full copies — the body already lives in exactly one place,
and Claude Code's own include mechanism already prevents body-content drift.** The actual, narrower gap
is that these 36 near-identical stub files are still individually hand-authored rather than generated,
so a typo, a stale title after a rename, or an inconsistent pointer path is possible — a real but much
smaller problem than "66 files can diverge," which described a risk that does not exist for body
content today.

**Decision:**

1. **Formalize `.github/prompts/spell-*.prompt.md` as each spell's sole authored source, and generate
   the `.claude/commands/spell-*.md` stub from its frontmatter** (`name`, `description`) via a new
   `renderClaudeCommandStub()` function — structurally the same pattern `src/modules/agent-generator.ts`
   already uses successfully for agent definitions (one canonical source, multiple client-specific
   `render*()` functions: `renderCopilotAgent`, `renderIdentity`, `renderSoul`, `renderTools`), applied
   to a second content class instead of inventing a new mechanism. Wire this into the existing
   self-host-parity pipeline as a **new third parity axis** — stub-content-vs-prompt-frontmatter — which
   ARC-027 explicitly does not check today. This closes I15's actual, verified gap directly.
2. **Extract genuinely shared prose into named, canonical fragments assembled at build time**, for
   content already proven to drift when hand-copy-pasted across multiple spell bodies. Concrete,
   already-experienced instance: the `tracking_mode`/`external_provider` resolution block appears,
   worded almost identically, in `spell-open-session`, `spell-plan`, `spell-scope`,
   `spell-suggest-feature`, and `spell-full-cycle` — five files this session's own BC-09 had to edit
   in lockstep by hand to keep consistent. A small library of named fragments (e.g. under a new
   `src/assets/.github/prompts/_fragments/` directory, never shipped standalone) gets inlined into each
   consuming prompt at the same build step decision 1 runs at, the same "compute it, don't restate it"
   principle IDEAS.md's own 2026-08-02 entry already argued for the compiler, applied without needing
   runtime resolution at all.
3. **Explicitly do not pursue runtime operator-config injection — the part of I5's vision this ADR
   scopes out, not silently drops.** Decisions 1–2 fully address I15's stated drift problem and this
   session's own directly-experienced cross-file copy-paste pain, using only build-time generation of
   *static* structure (stub files, shared fragments) — never a repo-specific runtime *value* (a
   `tracking_mode` setting, a roster identity, a resolved `business_root`) baked into emitted text. That
   is deliberate: such a value can be absent entirely (I5's own named vanilla-repo case) or can change
   between whenever a render happened and whenever the spell is actually invoked, and baking it in
   either breaks D2 Gold or creates exactly the two-sources-of-truth/version-skew risk I5's own text
   flagged as unresolved. Every rendered prompt keeps saying "resolve X from `.arcane.json`; ask if
   unset" in prose, exactly as today's hand-written prompts do — nothing about *how* a spell resolves
   repo state changes under this decision, only how its *boilerplate structure* is produced.
4. **No `spell render` CLI subcommand, and no client-facing behavior change.** Because decisions 1–2 are
   build-time generation (the same model `copy-assets.ts`/`self-host-parity.ts` already run at Arcane's
   own release time), there is no runtime rendering step to expose. `/spell-*` remains exactly what it
   is today — a real file the client reads directly — for the `.github/prompts/` side, and becomes a
   *generated* real file (not a live include-at-runtime shim) for the `.claude/commands/` side. Both
   are ordinary, already-finished files at the point either client ever sees them.
5. **This does not fully deliver I5's most ambitious claim, and that is disclosed rather than
   presented as achieved.** I5 hoped render-time injection would structurally defuse EF-02, EF-08,
   EF-14, EF-19, EF-23, EF-29, and fabricated author/model trailers — those are all cases of an agent
   getting a *runtime* fact wrong, which only the runtime-injection approach decision 3 rules out could
   have structurally prevented. This ADR does not claim to close any of those findings; it closes I15's
   drift finding and generalizes a pattern this repository has now proven three times over (agent
   definitions via `agent-generator.ts`; tracking providers via `ExternalProvider`/ARC-011/032/BC-09;
   CI/CD vendor profiles via ARC-038) to a fourth application, while leaving the harder, genuinely
   unresolved runtime-injection question open for whoever revisits it with a concrete answer to the D2
   Gold tension I5 itself could not resolve.

**Open questions (deferred to BC-32's implementation, not blocking acceptance of the shape above):**

- Exact fragment syntax for decision 2 (a simple marker comment the generator substitutes, versus a
  more general include directive) and where the fragment library physically lives.
- Whether decision 1's stub generator should also validate that the `.claude/commands/` filename and
  the `.github/prompts/` filename agree (both derived from the same spell name) as a fourth parity
  check, or whether that is already implied by generating one from the other.
- Whether a future, separate ADR should revisit runtime operator-config injection specifically for the
  fabricated-trailer problem I5 named, now that this ADR has settled the build-time half — this ADR
  takes no position on whether that is worth pursuing, only that it is out of this scope.

**Reasoning:**

- Verifying I15's "66 files" claim against the real files, rather than accepting it, found the actual
  problem is an order of magnitude smaller than described (36 nine-line stubs, not 36 independently
  hand-maintained full bodies) — sizing the fix to the real problem instead of the one originally
  described avoids over-building a rendering system for a drift class that mostly does not exist.
- Reusing `agent-generator.ts`'s proven one-source/multiple-`render*()` shape for a second content
  class is smaller and lower-risk than a new "spell render" runtime feature, and inherits a pattern
  already exercised in production rather than starting from zero.
- Naming decision 3's exclusion explicitly, rather than letting BC-32 quietly narrow scope during
  implementation, keeps this ADR honest about what it does and does not solve — matching how ARC-034
  names its own hook as "deliberately not tamper-proof" instead of overclaiming.

**Rejected alternatives:**

- **Build the full `spell render <name>` runtime-injection compiler as I5 originally envisioned** —
  rejected for this ADR's scope: the D2 Gold vanilla-repo tension I5 itself named has no resolution
  that doesn't either violate D2 Gold or accept a real version-skew risk, and the concrete drift
  problem (I15) does not need it to be solved.
- **Leave the `.claude/commands/spell-*.md` stubs hand-authored, since they are "only" 9 lines each** —
  rejected: 36 near-identical hand files is still 36 places a rename or a copy-paste slip can produce a
  stale title or a broken `@`-include path, and generating them costs little once decision 1's function
  exists.
- **Treat commands-vs-prompts drift as already solved and do nothing** — rejected: the `@`-include
  mechanism prevents *body* drift, but the stub files themselves are still hand-authored and
  unvalidated; a real, if narrow, gap remains worth closing mechanically rather than by continued
  manual care.

**Implementation note (2026-09-01, BC-32):**

- **Re-verified the count directly before generating anything, per this ADR's own precedent of not
  trusting a prior count.** 41 spells today, not the 36 this ADR recorded on 2026-08-31 — the count
  grew again in the intervening day (BC-30/BC-31 shipped no new spells, but the total nonetheless
  moved). Implementation proceeded against the freshly-counted 41, not the ADR's now-stale figure.
- **Decision 1 shipped as specified, with one real premise correction found before generating
  anything.** `parsePromptFrontmatter()` / `renderClaudeCommandStub()` / `deriveStubTitle()` land in
  a new `src/modules/spell-compiler.ts`, mirroring `agent-generator.ts`'s one-source/multiple-render()
  shape exactly as decision 1 specified. **Correction, checked directly rather than assumed:** this
  decision's own text says the stub is generated "from its frontmatter (`name`, `description`)" —
  but every one of the 41 current stubs' `description:` field is actually a distinct, hand-crafted
  Claude-Code-specific "Use PROACTIVELY whenever X, even if Y" invocation hint, verified byte-for-byte
  absent from the corresponding prompt's own `description` field in all 41 cases. Generating strictly
  per the decision's literal text would have silently discarded this phrasing for every spell — a real
  regression to Claude Code's own proactive-invocation behavior, not a neutral refactor. Added a new
  `claude_description` frontmatter field to the prompt source instead, backfilled verbatim from each
  stub's existing description (scripted, not hand-typed, to guarantee zero wording drift in the
  backfill itself); `renderClaudeCommandStub()` prefers it and falls back to the plain `description`
  only for a spell that has neither (none do today). Proceeding on the decision's literal reading
  without checking real stub content first would have been exactly the kind of unverified premise this
  program has repeatedly had to correct after the fact.
- **Regenerating all 41 stubs from the corrected source found 2 real, pre-existing drift bugs** —
  proof the problem decision 1 names is live, not hypothetical: `spell-check-drift`'s stub said
  "Check Drift" against its prompt's actual name "Check Doc Drift", and `spell-dotnet-expert`'s stub
  said "Dotnet Expert" against ".NET Expert". Both are corrected as a disclosed side effect of
  generation, not a separate fix.
- **Open question 2 (filename agreement) resolves itself, not by a fourth check.** The stub's filename
  is derived directly from the prompt's own id at generation time (`{id}.prompt.md` → `{id}.md`), so
  the two can never disagree by construction — no separate validation was needed or added.
- **Open question 1 (fragment syntax) resolved: named, paired marker comments, generalizing
  `merger.ts`'s proven single-anonymous-marker model rather than inventing a new one.**
  `<!-- fragment:{name}:start -->` / `<!-- fragment:{name}:end -->` bound an always-regenerable span,
  the same idempotent, Arcane-owns-this-region model `merger.ts` already uses for CLAUDE.md's routing
  table — generalized to a *name* so one file can host more than one distinct fragment, which a single
  anonymous marker pair cannot. The library lives at
  `src/assets/.github/prompts/_fragments/*.md` exactly where this ADR's decision 2 named it; plain
  `.md` (not `.prompt.md`) so every existing "find the spell prompts" filter in this codebase already
  excludes it without change. `expandFragment()` re-indents injected lines to the start marker's own
  leading whitespace, since real consuming prompts nest the marker at different list depths — an
  indentation bug here silently dedented the closing marker in 4 of 5 real files on first pass, caught
  by inspection before landing and now covered by a dedicated regression test.
- **Decision 2's own motivating premise is narrower than described, checked directly rather than
  ported forward from the ADR's text.** The 5 files named as duplicating a resolution-order paragraph
  "worded almost identically" do **not**, once diffed for real: `spell-open-session` and `spell-plan`
  resolve tracking config in a 4-source order (root `.arcane.json` → self-hosted manifest → PRD
  frontmatter → ask); `spell-scope` checks only PRD frontmatter or asks, skipping `.arcane.json`
  entirely; `spell-suggest-feature` and `spell-full-cycle` each carry their own distinct qualifier
  wording. Only the bare 2-line `tracking_mode`/`external_provider` enum declaration is genuinely
  identical across all 5. Extracted exactly that (`_fragments/tracking-mode-declaration.md`) rather
  than homogenizing the surrounding resolution logic to force a fragment that was never really there —
  forcing uniformity onto behavior that has already independently diverged would have been a silent,
  undisclosed logic change smuggled inside a stub/fragment-mechanics epic. The deeper inconsistency
  (should `spell-scope` resolve from `.arcane.json` too?) is filed as its own open item in `TODO.md`
  rather than decided here.
- **Wired as two new self-host-parity axes** (`runStubParity`, `runFragmentParity` in
  `scripts/self-host-parity.ts`), both operating on canonical `src/assets/` content and settling before
  the pre-existing canonical-vs-root-copy axis runs in `--fix` mode, so root dogfood copies reflect the
  fully-repaired canonical state rather than a stale one. `npm run check:self-host-parity` reports all
  four axes together, tagged (`[fragment]`/`[stub]`/`[copy]`) so a failure names which relationship
  broke. Full regression coverage in `test/spell-compiler.test.ts`, including a read-only consistency
  guard asserting all 41 real spells stay compiler-consistent going forward.

---

## ARC-040 — Session Handoff Durability: Pointer, Never Sole Carrier

**Date:** 2026-08-31
**Status:** Accepted
**Amends:** [ARC-005](#arc-005--session-handoff-prompt-automatic-continuation-context) (see Relationship to ARC-005 below)
**Sources:** `features/handoff-durability/PRD.md` (a real incident, not a formal batch-001 intake — see that PRD's own corrected frontmatter)

**Context:**

ARC-005's handoff block is explicitly ephemeral — overwritten at every close, consumed at every open —
and nothing in either spell requires the work it names to also exist on a tracked, durable surface. A
real incident made this concrete: a consuming repo's stated next-session objective, including
conventions established that same session, existed only in the handoff block and a journal narrative;
one close-session overwriting the block, and the task was gone. Separately, ARC-005 documents seven
handoff fields, but EF-21 added an eighth (`Pending Verification`) without amending the record.

**Decision:**

1. `spell-close-session` gains step 4b: before the handoff is written, register every not-finished,
   task-bearing item (an incomplete `Active task`, the `Next concrete action`, and any durable content
   that would otherwise live only in `Notes`) on a durable surface. The sink is tracking-mode aware,
   per ARC-032: `internal` → the appropriate `TODO.md`; `external` → a work item via the configured
   `external_provider`, falling back to `TODO.md` when tracker tooling is unavailable that session.
2. The handoff template's `Active task`, `Next concrete action`, and `Notes` fields each name their
   durable home in-line once step 4b registers it.
3. `Notes` is formally a pointer-only field: it must never be the sole carrier of durable content.
4. `spell-open-session` gains a Durability check in Handoff Detection, sequenced after the Mutation
   Guard and before the consumed-marker write: it confirms the named durable references actually
   exist, and if step 4b was skipped or incomplete, registers the missing content now, on the
   session's own branch, before consuming the handoff. A failure here leaves the handoff unconsumed,
   so the next open-session idempotently re-checks rather than silently losing the gap.
5. `spell-open-session` surfaces `Last completed step`, `Blockers`, and `Notes` verbatim in
   `## Picking Up From Last Session`, alongside the fields it already surfaced — these three were
   written by close-session but never read back.
6. The fresh-install scaffold (`ai-context/system-prompt-context.md`) ships its example handoff block
   in step 5b's real format (bullet fields, `>` header lines) and pre-consumed (a `> ✓ Consumed:`
   marker already present) — its previous plain bold-colon format with no consumed marker meant a
   brand-new repo's placeholder content ("Next concrete action: Begin work") could be mistaken by the
   very first `spell-open-session` run for a real, unconsumed handoff.

**Relationship to ARC-005:** ARC-005 remains the design of record for the handoff mechanism itself
(the block's existence, its location in `system-prompt-context.md`, the consumed-marker state
machine) — this decision does not replace it, only corrects its field count (seven → eight, matching
EF-21's already-shipped `Pending Verification` field) and adds the durability guarantee ARC-005 never
made: that a handoff's task-bearing content survives being overwritten, because it also lives
somewhere the overwrite cannot reach.

**Reasoning:**

- Reusing `TODO.md`/tracker infrastructure that already exists (per ARC-032's tracking configuration)
  needs no new file and no new mechanism — the PRD's own "no new files" constraint, inherited from
  ARC-005.
- Gating the consumed-marker write on the Durability check (rather than treating durability as a
  separate, skippable step) means a session that closes without registering its own unfinished work
  cannot silently proceed past open-session next time — the check runs exactly where the marker write
  already is, not bolted on elsewhere.
- Fixing the scaffold's format is the smallest change that removes a real false-positive: the scaffold
  already satisfied the open-session detection logic's literal trigger condition (a
  `## Next Session Handoff` heading with no `> ✓ Consumed:` line) well enough to be mistaken for a
  live handoff, which is worse than doing nothing for a first-time user.

**Rejected alternatives:**

- **A dedicated durable-handoff file** — rejected for the same reason ARC-005 rejected a dedicated
  `ai-context/handoff.md`: more distribution surface for no benefit over reusing `TODO.md`, which
  every tracking mode already reads.
- **Require durability registration synchronously inside step 5b's handoff write itself, rather than a
  separate step 4b** — rejected: keeping registration as its own numbered step makes it independently
  skippable-and-auditable (the applicability guard: nothing to register when the close is fully clean)
  rather than an unconditional sub-clause of a step that already does several other things.

---

## ARC-041 — A Local, Out-of-Repo Supply Channel for the Org-Token Privacy Denylist

**Date:** 2026-09-02
**Status:** Accepted
**Amends:** [ARC-031](#arc-031--fictional-venture-names-for-examples-and-a-repository-wide-privacy-gate) decision 3 (the denylist stays a CI secret; this adds a second, local-only supply channel alongside it, not a replacement)
**Related:** [ARC-037](#arc-037--secret-and-org-leak-detection-pre-commit-scan-plus-repository-wide-ci-backstop) (the staged-files-only pre-commit scan shape this reuses). The separate portability layer (package-derived tokens, scanned across `src/assets/.github/prompts`, ARC-031 decision 2) is untouched by this decision.

**Context:**

ARC-031 decision 3 keeps `ARCANE_ORG_TOKENS` a CI-only secret so the denylist itself cannot leak the
names it protects. That decision is still correct — but it has a real, now-demonstrated consequence:
nothing available locally (`typecheck`, `lint`, the full test suite, `check:self-host-parity`) can
check content against the denylist before a push, so the very first signal a local session gets is
CI failing after the push already happened. Confirmed live: a real client name leaked into shipped
content and was fixed, then the very commit describing that fix quoted the same name while narrating
its removal, retriggering the identical CI failure minutes later — the natural way to document a leak
re-committed it, with no local warning either time (`docs/rcas/RCA-001-static-drift-and-ci-only-gates.md`).

The operator decided this gap should close, ahead of this ADR being drafted (`docs/plans/lessons-
hardening/OPERATOR-QUEUE.md` Q-003's own pre-decision note, recorded 2026-09-02): adopt a local supply
channel, default to `~/.arcane/org-tokens` when unset, and reuse the CI secret's own delimiter format
rather than inventing a new one. This ADR records that decision formally, with the empirical checks
the plan called for.

**Empirical-first:**

- `git check-ignore -v` on a path outside the repository fails outright ("outside repository") —
  gitignore patterns only ever apply within the working tree. A literal `~/.arcane/` line in
  `.gitignore` cannot mean the user's home directory; git never expands `~`. Confirmed directly: a
  `~` directory created *inside* the repository is what that pattern actually matches (`.gitignore`
  itself, tracked and shipped, currently carries exactly this dead line) — the real home-directory
  `~/.arcane/org-tokens` this ADR adds is untouched by it either way, since nothing this ADR does
  writes inside the repository.
- Timed a real 100-file scan using the existing `scanFile`/`createDenylistRules` engine
  (`src/modules/denylist-scan.ts`) against 100 real files from this repository: 29.0ms total, 0.29ms
  per file average. A staged-files-only pre-commit scan (typically far fewer than 100 files per
  commit) adds negligible latency to `.husky/pre-commit`.

**Decision:**

**1. `resolvePrivateTokens()` gains a second token source, additive to the existing CI secret.** When
`ARCANE_ORG_TOKENS` is unset (the normal case for any local session — the secret is CI-only by
ARC-031 decision 3), it additionally attempts to read a local file, in order:
   - `$ARCANE_ORG_TOKENS_FILE`, if that environment variable is set — an explicit override, e.g. for a
     machine that keeps the file somewhere other than the default.
   - Otherwise, `~/.arcane/org-tokens` (resolved via `os.homedir()`, never a shell-expanded string) —
     the operator's chosen default, and the exact path `.gitignore`'s existing (currently dead) `~/.arcane/`
     line was clearly written to anticipate.

   File format: identical to the CI secret's own — one or more tokens, separated by commas and/or
   newlines (`configuredTokens.split(/[,\r\n]+/)`, `scripts/org-token-lint.ts`'s own existing regex).
   Not a new format: a local file is literally "what you'd put in the CI secret, saved to disk
   instead," so a maintainer moving between the two never has to reformat anything.

**2. Hard refusal of any path under the repository root, regardless of `.gitignore`.** Before reading
either the env-var-named file or the default path, resolve it with `node:path`'s `resolve()`/`normalize()`
and compare against `git rev-parse --show-toplevel`; refuse (empty result, loud warning) if the
resolved path falls inside the repository. This is not a hypothetical: a gitignored in-repo file can
still be force-added (`git add -f`) or accidentally un-ignored by a later `.gitignore` edit — exactly
the class of hole ARC-031 decision 3 was written to close for the CI secret, now closed for the local
file too, structurally rather than by convention.

**3. `.husky/pre-commit` gains a staged-files-only org-token scan** through this same resolution,
alongside the existing `doctor:leaks` step (BC-30, repository-wide). Staged-only, not repository-wide,
by design: a full repo scan on every commit is the wrong cost/benefit trade for a pre-commit hook (the
100-file timing above), and the files actually being committed are exactly the files a leak would be
new in.

**4. `spell ward` gains a `--terms-file` flag**, reading the identical format, so a consumer repo
running `spell ward` to check candidate names against its own private denylist can supply one from a
file instead of a shell argument — closing the same shell-history-exposure gap decision 1 closes for
`resolvePrivateTokens()` itself.

**5. CI's `ARCANE_ORG_TOKENS` secret stays authoritative and unchanged.** This ADR adds a local,
best-effort backstop; it does not weaken, replace, or gate CI's own enforcement in any way. A
contributor with no local file configured sees exactly the CI-only behavior that exists today.

**Reasoning:**

- The gap this closes is asymmetric in a way that matters: CI enforcement protects the published
  artifact, but the *authoring* moment — the one place a local warning would actually change what gets
  written — currently has zero coverage. A local file doesn't need to be perfect to be valuable; it
  only needs to catch the same leak-and-redescribe pattern that has already recurred.
- Reusing the CI secret's exact delimiter format (rather than JSON, YAML, or a new bespoke format)
  means there is nothing new to document or get wrong — the file's content is, by construction,
  whatever the CI secret's value already is or would be.
- The in-repo refusal is structural, not advisory, because ARC-031's own core insight (a privacy
  control that would otherwise have to store the private data it protects) applies identically here: a
  local file that *could* legally live inside the repository is one accidental `git add -f` away from
  publishing the exact names it exists to keep private.

**Rejected alternatives:**

- **A gitignored in-repo file** — rejected: `.gitignore` is easy to edit, force-add bypasses it
  entirely, and this is precisely the shape of hole ARC-031 decision 3 already reasoned about and
  closed for the CI-secret case. Extending the same reasoning here means the file must live
  *structurally* outside the repository, not merely outside version control by convention.
- **A committed, encrypted denylist** — rejected: adds a key-management problem (where does the
  decryption key live, and how is *that* kept out of the repository) to solve a problem a plain
  out-of-repo file already solves for free, with less machinery to get wrong.
- **No local channel at all, leave it CI-only** — rejected as the status quo this ADR responds to: the
  demonstrated, repeated failure mode (leak, fix, redescribe-and-re-leak) has no local defense today,
  and the fix is small relative to the recurring cost.

**Open questions closed by the operator's own pre-decision, recorded here for the permanent record:**
adopt this at all (yes), file format (reuse the CI secret's own delimiter convention, not a new
format), and home-directory default (yes, `~/.arcane/org-tokens` — see
`docs/plans/lessons-hardening/OPERATOR-QUEUE.md` Q-003).

---

## ARC-042 — Show Report: Compiled-Template Distribution Model and Program Decisions

**Date:** 2026-09-03
**Status:** Accepted (2026-09-03, operator accept call — [OPERATOR-QUEUE.md Q-002](docs/plans/show-report/OPERATOR-QUEUE.md#q-002--accept-revise-or-reject-arc-042); all seven decisions accepted as drafted after the operator explicitly weighed decision 2's name against the Naming Test and kept "Show Report" — it is already earned theater lingo, a stage manager's post-performance record, not a plain descriptive label). Implementation: SR-02 onward.
**Related:** [ARC-016](#arc-016--public-repository-model-fresh-start-build-in-public-with-an-org-leak-gate) (the public-repository, MIT-licensed model this decision's distribution choice must respect), [ARC-031](#arc-031--fictional-venture-names-for-examples-and-a-repository-wide-privacy-gate) (the privacy-gate class that bounds what report content may ever surface)
**Sources:** [docs/plans/show-report/PLAN.md](docs/plans/show-report/PLAN.md), [docs/research/show-report-feasibility.md](docs/research/show-report-feasibility.md), [docs/research/show-report-design.md](docs/research/show-report-design.md), [docs/research/show-report-narrative.md](docs/research/show-report-narrative.md), [features/show-report/PRD.md](features/show-report/PRD.md)

**Context:**

After each autonomous program (Become Current, Lessons Hardening) the operator hand-built a
"completion ledger" HTML page — a format the operator wants automated, rendered with the private
`arcane-ui` design system for visual fidelity, and usable offline by open-source `arcane-cli` users
with no proprietary runtime installed. Three roster agents researched feasibility, design, and
narrative structure (memos above); the plan they informed settled on a **compiled-template**
distribution model: `arcane-ui` pre-renders the report's React components once, offline, into a
static Mustache template (markup plus a CSS subset, zero React, zero client JS); that artifact is
vendored into public `arcane-cli`, which fills it from a JSON data model at report-generation time.
This is one of three options weighed (a hosted render endpoint, and open-sourcing `arcane-ui` outright
were the other two — both rejected below) and is the one that satisfies all three of the operator's
stated constraints (fidelity, offline use, open-source distribution) at once. Program activation
(SR-00) requires the operator to settle seven decisions before the remaining epics (SR-01 through
SR-08) can build against a fixed contract; this ADR is where those seven are recorded for explicit
accept/revise/reject, per [docs/plans/show-report/OPERATOR-QUEUE.md](docs/plans/show-report/OPERATOR-QUEUE.md) Q-002.

**Decision:**

1. **Licensing of the compiled template: recommend yes** — rendered markup plus a CSS subset derived
   from proprietary `theme.css` ships inside MIT `arcane-cli`, with a license notice in the template
   header naming Code Magician LLC and permitting use with Arcane. The rendered *output* (static HTML/
   CSS, not the React source) is what ships; the component source, tokens, and design system stay
   private in `arcane-ui`. **If declined:** fall back to open-sourcing a narrow
   `@codemagician/arcane-ui-report` subset instead — the JSON contract and CLI surface are unchanged
   either way, so this choice is reversible without a redesign.
2. **Name: "Show Report"** (Circe's recommendation) over "Completion Report" — file, command, and
   module names use `show-report` / `spell report` throughout.
3. **Dependency: add `mustache` to `arcane-cli`** (MIT, ~10 KB, zero transitive deps) rather than
   hand-rolling a template renderer — spec-conformant escaping matters more here than avoiding one
   small dependency, and it keeps the zero-extra-install distribution model ARC-037 decision 8 already
   committed this repository to.
4. **Design tool: Claude Design, via the `/design-sync` skill and `DesignSync` tool** — SR-05a syncs
   `arcane-ui`'s tokens and report-relevant exportable components into a design-system project
   incrementally (one component at a time, never a wholesale replace); Show Report is designed there
   against Circe's narrative structure and the frozen JSON model, in both the operator and share
   lenses, light and dark, and print. The approved design is SR-05b's build spec.
5. **Export-contract scope: register only Show Report now.** `arcane-ui`'s new static-export registry
   (`src/export/registry.ts`, `exportable: true` metadata, a conformance test against known
   server-render traps) is a general mechanism, but only the components Show Report actually needs are
   registered at SR-05b. Auditing and registering the whole exportable subset up front is explicitly
   deferred — smaller surface now, extended per-need later, not speculatively.
6. **Fonts: no licensing action needed.** `arcane-ui`'s specified fonts (Chakra Petch, Rajdhani,
   JetBrains Mono) are already served from Google Fonts under the SIL Open Font License — free for
   embedding, redistribution, and commercial use with no attribution requirement. The compiled template
   carries its own Google Fonts `<link>`, matching `arcane-ui`'s own "consumer-supplied fonts" decision
   in `spec/HANDOFF.md`; no font files are vendored into either repository. Recorded here for the
   permanent record, not because it was genuinely open.
7. **`arcane-ui` release tagging: recommend yes** — tag every publish (`vX.Y.Z` on the publishing
   commit), no release branches yet. This repository's automation (`check:report-template`, and SR-07's
   pipeline-driven PR-on-template-change) needs to say "this template was compiled from `arcane-ui`
   commit X, tagged vY.Z.W" and have that be independently reproducible — not just a version string in
   a header comment. `arcane-ui` is trunk-based with zero git tags today; this decision is drafted in
   full as its own `ARCUI-016`-shaped entry in `arcane-ui`'s own governance, in that repository's PRD
   for SR-05b — recorded here only as a dependency this program needs answered before SR-06/SR-07.
   Full release branches (`release/2.x`) are explicitly not adopted now — no evidence of a need to
   maintain parallel version lines yet, and tags compose cleanly into that model later if the need
   appears.

**Reasoning:**

- The compiled-template model is the only one of the three weighed options that gets exact visual
  fidelity, zero network dependency for offline `arcane-cli` users, and open-source distribution all at
  once — the other two each sacrifice one of the three (see Rejected alternatives).
- Licensing the *rendered output* rather than the component source lets `arcane-ui` stay a private,
  commercially-licensed product while still letting its design work reach every `arcane-cli` user,
  mirroring how compiled/minified distributions of otherwise-proprietary tooling are commonly licensed
  for their output alone.
- Keeping the export-contract registration scoped to exactly what Show Report needs (decision 5) avoids
  committing `arcane-ui` to a large, speculative export surface before a second consumer of the
  mechanism exists to validate the general shape is right.

**Rejected alternatives:**

- **A hosted render endpoint** — rejected: introduces a network dependency that breaks offline use for
  `arcane-cli` consumers, and sends report data (potentially including venture/client names — the same
  class ARC-031 exists to keep out of shipped content) off-machine. Remains available later as an
  optional hosted-publishing add-on, not the default path.
- **Open-sourcing `arcane-ui` outright and rendering it locally in `arcane-cli`** — rejected as the
  default: exact fidelity and zero network dependency, but adds a ~200 KB React runtime to every
  `arcane-cli` install for a capability (one static document) that doesn't need a UI framework at
  request time, and is a business decision with consequences well beyond this one report feature. Stays
  the documented fallback only if decision 1's compiled-template licensing is declined.

**Open questions (deferred to SR-05b/SR-06/SR-07 implementation, not blocking acceptance of the shape
above):**

- The exact `ARCUI-016`-shaped release-tagging ADR text is `arcane-ui`'s own governance artifact, not
  this repository's — decision 7 above records only the dependency and the recommendation.
- Whether the light color scheme's contrast retune (measured at 1.18–2.93:1 on light surfaces for
  signal/accent tokens) is containable within SR-05b's scope, or whether Show Report ships dark-only
  first with light tracked as its own follow-on `arcane-ui` item — the plan's own stated riskiest
  assumption, not resolved by this ADR.
