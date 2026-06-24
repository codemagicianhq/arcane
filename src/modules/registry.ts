import type { Profile, RegistryComponent, ProfileDefinition } from "../types.js";
import { PROFILE_CONFIGS } from "../config/profiles.js";

export class ComponentNotFoundError extends Error {
  constructor(name: string, available: string[]) {
    super(
      `Component "${name}" not found. Available components: ${available.join(", ")}`,
    );
    this.name = "ComponentNotFoundError";
  }
}

// ─── Component definitions ───────────────────────────────────────────────────
// File paths are relative to src/assets/ (source) / dist/assets/ (published).

const COMPONENTS: RegistryComponent[] = [
  // Governance
  {
    name: "git-conventions",
    description: "Git branching, commit message, and PR conventions",
    files: [".arcane/governance/git-conventions.md"],
  },
  {
    name: "testing-standards",
    description: "Testing framework selection, coverage thresholds, and CI gates",
    files: [".arcane/governance/testing-standards.md"],
  },
  {
    name: "decision-documentation-standard",
    description: "ADR format and decision-logging conventions",
    files: [".arcane/governance/decision-documentation-standard.md"],
  },
  {
    name: "agent-work-queue-model",
    description: "Work queue model for AI agent task assignment and tracking",
    files: [".arcane/governance/agent-work-queue-model.md"],
  },
  {
    name: "naming-conventions",
    description: "Machine, agent, and service naming rules (three-tier model)",
    files: [".arcane/governance/naming-conventions.md"],
  },
  {
    name: "agent-policies",
    description: "Agent autonomy levels, power levels, and operational constraints",
    files: [".arcane/governance/agent-policies.md"],
  },
  {
    name: "threat-model",
    description: "Security threat model covering STRIDE categories and mitigations",
    files: [".arcane/governance/threat-model.md"],
  },
  {
    name: "hardening-checklist",
    description: "Production hardening checklist for infrastructure and agents",
    files: [".arcane/governance/hardening-checklist.md"],
  },
  {
    name: "authentication-strategy",
    description: "Authentication patterns, token management, and identity strategy",
    files: [".arcane/governance/authentication-strategy.md"],
  },
  {
    name: "new-business-setup",
    description: "Step-by-step playbook for bootstrapping a new business unit",
    files: [".arcane/governance/new-business-setup.md"],
  },
  {
    name: "agent-approved-paths",
    description: "Approved repository paths and access boundaries for agents",
    files: [".arcane/governance/agent-approved-paths.md"],
  },
  {
    name: "portable-bootstrap",
    description: "Portable AI context bootstrap for onboarding new AI clients",
    files: [".arcane/governance/portable-bootstrap.md"],
  },
  // Governance — methodology
  {
    name: "development-methodology",
    description: "Spell Loop development methodology",
    files: [".arcane/governance/development-methodology.md"],
  },
  {
    name: "cicd-standards",
    description: "CI/CD pipeline standards and quality gates",
    files: [".arcane/governance/cicd-standards.md"],
  },
  {
    name: "poc-management-pattern",
    description: "POC lifecycle management pattern",
    files: [".arcane/governance/poc-management-pattern.md"],
  },
  {
    name: "product-excellence-standards",
    description: "Product quality gate standards and spell-elevate requirements",
    files: [".arcane/governance/product-excellence-standards.md"],
  },
  {
    name: "spell-authoring-standards",
    description: "Spell Quality Rubric — the authoring bar for spell prompts (8 dimensions)",
    files: [".arcane/governance/spell-authoring-standards.md"],
  },
  {
    name: "rca-process-standard",
    description: "Root cause analysis process standard",
    files: [".arcane/governance/rca-process-standard.md"],
  },
  {
    name: "universal-agent-rules",
    description: "Universal rules for all AI agents operating in any Arcane-managed repo",
    files: [".arcane/governance/universal-agent-rules.md"],
  },
  // VS Code Copilot instructions — installed to .github/instructions/
  {
    name: "agent-output-instructions",
    description: "Copilot enforcement rules: PR link format, merge strategy, and branch naming",
    files: [".github/instructions/agent-output.instructions.md"],
  },
  // Spell prompts — installed to .github/prompts/ (VS Code Copilot convention)
  {
    name: "spell-prompts",
    description: "Full Arcane spell prompt library (33 spells)",
    files: [
      ".github/prompts/spell-arcane-version.prompt.md",
      ".github/prompts/spell-architect.prompt.md",
      ".github/prompts/spell-brainstorm.prompt.md",
      ".github/prompts/spell-scope.prompt.md",
      ".github/prompts/spell-bootstrap-business.prompt.md",
      ".github/prompts/spell-bug.prompt.md",
      ".github/prompts/spell-bump.prompt.md",
      ".github/prompts/spell-check-drift.prompt.md",
      ".github/prompts/spell-close-session.prompt.md",
      ".github/prompts/spell-commit-work.prompt.md",
      ".github/prompts/spell-dotnet-expert.prompt.md",
      ".github/prompts/spell-elevate.prompt.md",
      ".github/prompts/spell-explain-concept.prompt.md",
      ".github/prompts/spell-full-cycle.prompt.md",
      ".github/prompts/spell-generate-bot-icons.prompt.md",
      ".github/prompts/spell-implement.prompt.md",
      ".github/prompts/spell-open-session.prompt.md",
      ".github/prompts/spell-plan.prompt.md",
      ".github/prompts/spell-present-arcane.prompt.md",
      ".github/prompts/spell-product-review.prompt.md",
      ".github/prompts/spell-review.prompt.md",
      ".github/prompts/spell-security-review.prompt.md",
      ".github/prompts/spell-ship.prompt.md",
      ".github/prompts/spell-suggest-feature.prompt.md",
      ".github/prompts/spell-test.prompt.md",
      ".github/prompts/spell-todo.prompt.md",
      // Workflow spell additions — PR lifecycle, status, capture, feedback
      ".github/prompts/spell-address-review.prompt.md",
      ".github/prompts/spell-create-pull-request.prompt.md",
      ".github/prompts/spell-document.prompt.md",
      ".github/prompts/spell-feedback.prompt.md",
      ".github/prompts/spell-save-idea.prompt.md",
      ".github/prompts/spell-status.prompt.md",
      ".github/prompts/spell-review-batch.prompt.md",
    ],
  },
  // Templates
  {
    name: "venture-template",
    description: "Starter template for a new business venture folder",
    files: [".arcane/templates/venture-template/overview.md"],
  },
  // Session continuity — files required for spell-close-session / spell-open-session
  {
    name: "session-continuity",
    description: "Session lifecycle files (TODO.md, DECISIONS.md, ai-context/, journal/) for close/open session spells",
    skipExisting: true,
    files: [
      "TODO.md",
      "DECISIONS.md",
      "ai-context/system-prompt-context.md",
      "journal/.gitkeep",
    ],
  },
  // Agent definitions
  // NOTE: the full portable agent system is managed by `spell agents init` / sync / list.
  // This component only installs the policy reference template for governance-only setups.
  {
    name: "agent-definitions",
    description: "Agent policy reference template (for governance-only setups — use `spell agents init` for the full agent system)",
    files: [".arcane/agents/agent-policies-template.md"],
  },
  // Agent mode files — VS Code Copilot reads these to surface named agent modes in the UI
  {
    name: "agent-files",
    description: "VS Code Copilot agent mode files for all 12 Arcane personas (.github/agents/*.agent.md)",
    files: [
      ".github/agents/flash.agent.md",
      ".github/agents/gandalf.agent.md",
      ".github/agents/gideon.agent.md",
      ".github/agents/heimdall.agent.md",
      ".github/agents/trinity.agent.md",
      ".github/agents/primus.agent.md",
      ".github/agents/scotty.agent.md",
      ".github/agents/snape.agent.md",
      ".github/agents/thor.agent.md",
      ".github/agents/vision.agent.md",
      ".github/agents/wanda.agent.md",
      ".github/agents/wasp.agent.md",
    ],
  },
  // Claude commands
  {
    name: "claude-commands",
    description: "Claude Code slash command wrappers for all 31 Arcane spells",
    files: [
      ".claude/commands/spell-architect.md",
      ".claude/commands/spell-brainstorm.md",
      ".claude/commands/spell-scope.md",
      ".claude/commands/spell-bootstrap-business.md",
      ".claude/commands/spell-bug.md",
      ".claude/commands/spell-check-drift.md",
      ".claude/commands/spell-close-session.md",
      ".claude/commands/spell-commit-work.md",
      ".claude/commands/spell-dotnet-expert.md",
      ".claude/commands/spell-elevate.md",
      ".claude/commands/spell-explain-concept.md",
      ".claude/commands/spell-full-cycle.md",
      ".claude/commands/spell-generate-bot-icons.md",
      ".claude/commands/spell-implement.md",
      ".claude/commands/spell-open-session.md",
      ".claude/commands/spell-plan.md",
      ".claude/commands/spell-present-arcane.md",
      ".claude/commands/spell-product-review.md",
      ".claude/commands/spell-review.md",
      ".claude/commands/spell-security-review.md",
      ".claude/commands/spell-ship.md",
      ".claude/commands/spell-suggest-feature.md",
      ".claude/commands/spell-test.md",
      ".claude/commands/spell-todo.md",
      // Workflow spell additions — PR lifecycle, status, capture, feedback
      ".claude/commands/spell-address-review.md",
      ".claude/commands/spell-create-pull-request.md",
      ".claude/commands/spell-document.md",
      ".claude/commands/spell-feedback.md",
      ".claude/commands/spell-save-idea.md",
      ".claude/commands/spell-status.md",
      ".claude/commands/spell-review-batch.md",
    ],
  },
];

// ─── Profile map (derived from config) ───────────────────────────────────────

function buildProfileMap(): Record<Profile, string[]> {
  const allNames = COMPONENTS.map((c) => c.name);
  const map = {} as Record<Profile, string[]>;
  for (const config of PROFILE_CONFIGS) {
    map[config.id] = config.components === "*" ? allNames : config.components;
  }
  return map;
}

const PROFILE_MAP = buildProfileMap();

// ─── API ──────────────────────────────────────────────────────────────────────

const componentIndex = new Map(COMPONENTS.map((c) => [c.name, c]));

/**
 * Returns a component by name.
 * Throws ComponentNotFoundError if not found.
 */
export function getComponent(name: string): RegistryComponent {
  const component = componentIndex.get(name);
  if (!component) {
    throw new ComponentNotFoundError(name, Array.from(componentIndex.keys()));
  }
  return component;
}

/**
 * Returns all components for the given profile.
 */
export function getProfile(profile: Profile): RegistryComponent[] {
  return PROFILE_MAP[profile].map((name) => getComponent(name));
}

/**
 * Returns all registered components.
 */
export function getAllComponents(): RegistryComponent[] {
  return [...COMPONENTS];
}

/**
 * Returns all profile definitions with their component lists expanded.
 * Profiles are sourced from src/config/profiles.ts.
 */
export function listProfiles(): ProfileDefinition[] {
  const allNames = COMPONENTS.map((c) => c.name);
  return PROFILE_CONFIGS.map((config) => ({
    id: config.id,
    displayName: config.displayName,
    description: config.description,
    components:
      config.components === "*" ? [...allNames] : [...config.components],
  }));
}
