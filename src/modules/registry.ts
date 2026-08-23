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
    name: "framework-decisions",
    description: "Offline reference for legacy framework ADR citations",
    files: [".arcane/governance/framework-decisions.md"],
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
    description: "Product quality gate standards and spell-enchant requirements",
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
  // Repository baseline files (EF-10 + EF-17). skipExisting: these are
  // user-owned once written -- a repo with its own .gitattributes has an
  // intentional policy Arcane must not overwrite. Sources are stored under a
  // non-dotfile path and mapped via sourceOverrides; see RegistryComponent.
  {
    name: "docs-baseline",
    description: "Line-ending and binary-format baseline for document repositories (.gitattributes/.gitignore)",
    files: [".gitattributes", ".gitignore"],
    sourceOverrides: {
      ".gitattributes": "docs-baseline/gitattributes",
      ".gitignore": "docs-baseline/gitignore",
    },
    skipExisting: true,
  },
  {
    name: "records-conventions",
    description: "Supersession, tombstone, and retention conventions for records repositories",
    files: [".arcane/governance/records-conventions.md"],
  },
  // ─── Spells ────────────────────────────────────────────────────────────────
  // Split from the former monolithic `spell-prompts` + `claude-commands` pair
  // so a profile can select spells by capability (see ARC-0NN). Grouping lives
  // here and only here -- every spell file stays flat and unrenamed on disk.
  //
  // Each component carries BOTH client formats of the same spell: the Copilot
  // prompt (.github/prompts/*.prompt.md) and the Claude Code wrapper
  // (.claude/commands/*.md). They are never independently selectable -- every
  // profile that wanted one always wanted the other -- and pairing them here
  // makes it structurally impossible for the two formats of one spell to drift
  // apart across profiles.
  {
    name: "spells-session",
    description: "Session lifecycle — open, close, commit, status, version",
    files: [
      ".github/prompts/spell-open-session.prompt.md",
      ".claude/commands/spell-open-session.md",
      ".github/prompts/spell-close-session.prompt.md",
      ".claude/commands/spell-close-session.md",
      ".github/prompts/spell-commit-work.prompt.md",
      ".claude/commands/spell-commit-work.md",
      ".github/prompts/spell-status.prompt.md",
      ".claude/commands/spell-status.md",
      ".github/prompts/spell-arcane-version.prompt.md",
      ".claude/commands/spell-arcane-version.md",
    ],
  },
  {
    name: "spells-capture",
    description: "Idea, todo, feedback and explanation capture",
    files: [
      ".github/prompts/spell-save-idea.prompt.md",
      ".claude/commands/spell-save-idea.md",
      ".github/prompts/spell-todo.prompt.md",
      ".claude/commands/spell-todo.md",
      ".github/prompts/spell-feedback.prompt.md",
      ".claude/commands/spell-feedback.md",
      ".github/prompts/spell-suggest-feature.prompt.md",
      ".claude/commands/spell-suggest-feature.md",
      ".github/prompts/spell-document.prompt.md",
      ".claude/commands/spell-document.md",
      ".github/prompts/spell-brainstorm.prompt.md",
      ".claude/commands/spell-brainstorm.md",
      ".github/prompts/spell-explain-concept.prompt.md",
      ".claude/commands/spell-explain-concept.md",
    ],
  },
  {
    name: "spells-delivery",
    description: "Pull-request lifecycle — open a PR, respond to review feedback",
    files: [
      ".github/prompts/spell-create-pull-request.prompt.md",
      ".claude/commands/spell-create-pull-request.md",
      ".github/prompts/spell-address-review.prompt.md",
      ".claude/commands/spell-address-review.md",
    ],
  },
  {
    name: "spells-review",
    description: "Adversarial code review — requires source and tests, so excluded from docs-only profiles",
    files: [
      ".github/prompts/spell-review.prompt.md",
      ".claude/commands/spell-review.md",
      ".github/prompts/spell-review-batch.prompt.md",
      ".claude/commands/spell-review-batch.md",
    ],
  },
  {
    name: "spells-planning",
    description: "PRD, architecture, scoping and product review",
    files: [
      ".github/prompts/spell-plan.prompt.md",
      ".claude/commands/spell-plan.md",
      ".github/prompts/spell-architect.prompt.md",
      ".claude/commands/spell-architect.md",
      ".github/prompts/spell-scope.prompt.md",
      ".claude/commands/spell-scope.md",
      ".github/prompts/spell-product-review.prompt.md",
      ".claude/commands/spell-product-review.md",
    ],
  },
  {
    name: "spells-build",
    description: "Code and product delivery — implementation, tests, stack experts, release, deployment, asset tooling",
    files: [
      ".github/prompts/spell-implement.prompt.md",
      ".claude/commands/spell-implement.md",
      ".github/prompts/spell-test.prompt.md",
      ".claude/commands/spell-test.md",
      ".github/prompts/spell-full-cycle.prompt.md",
      ".claude/commands/spell-full-cycle.md",
      ".github/prompts/spell-bug.prompt.md",
      ".claude/commands/spell-bug.md",
      ".github/prompts/spell-bump.prompt.md",
      ".claude/commands/spell-bump.md",
      ".github/prompts/spell-dotnet-expert.prompt.md",
      ".claude/commands/spell-dotnet-expert.md",
      ".github/prompts/spell-security-review.prompt.md",
      ".claude/commands/spell-security-review.md",
      ".github/prompts/spell-ship.prompt.md",
      ".claude/commands/spell-ship.md",
      ".github/prompts/spell-enchant.prompt.md",
      ".claude/commands/spell-enchant.md",
      ".github/prompts/spell-generate-bot-icons.prompt.md",
      ".claude/commands/spell-generate-bot-icons.md",
    ],
  },
  {
    name: "spells-docs",
    description: "Documentation and records workflows — adopt an existing document tree",
    files: [
      ".github/prompts/spell-adopt-docs.prompt.md",
      ".claude/commands/spell-adopt-docs.md",
    ],
  },
  {
    name: "spells-venture",
    description: "Hub-only venture management",
    files: [
      ".github/prompts/spell-summon-venture.prompt.md",
      ".claude/commands/spell-summon-venture.md",
      ".github/prompts/spell-manifest.prompt.md",
      ".claude/commands/spell-manifest.md",
    ],
  },
  {
    name: "spells-meta",
    description: "Arcane-about-Arcane — presentation and documentation drift detection",
    files: [
      ".github/prompts/spell-present-arcane.prompt.md",
      ".claude/commands/spell-present-arcane.md",
      ".github/prompts/spell-check-drift.prompt.md",
      ".claude/commands/spell-check-drift.md",
    ],
  },
  // Templates
  {
    name: "venture-template",
    description: "Starter template for a new business venture folder — overview plus idea/todo books",
    files: [
      ".arcane/templates/venture-template/overview.md",
      ".arcane/templates/venture-template/IDEAS.md",
      ".arcane/templates/venture-template/TODO.md",
    ],
  },
  // Session continuity — files required for spell-close-session / spell-open-session
  {
    name: "session-continuity",
    description: "Install-once project orientation and session lifecycle files",
    skipExisting: true,
    files: [
      "README.md",
      "project.md",
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
  // NOTE: the static `agent-files` component was retired — `.github/agents/*.agent.md`
  // files are generated per-roster by `spell agents init` / `spell agents sync`, so
  // installing a fixed-name set via `spell init` shipped stale names and collided
  // with the generated output.
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
/** Names of the capability-scoped spell components, derived not hand-listed. */
export const SPELL_COMPONENT_NAMES: string[] = COMPONENTS.map((c) => c.name).filter((n) =>
  n.startsWith("spells-"),
);

/**
 * The exact set of components that reconstitutes what the retired monolithic
 * `spell-prompts` / `claude-commands` pair used to install.
 *
 * **Deliberately a frozen literal, not derived from `SPELL_COMPONENT_NAMES`.**
 * Deriving it would mean every future `spells-*` group silently joins this
 * list, so a legacy install would be handed brand-new spells it never had —
 * and a test asserting `migration === SPELL_COMPONENT_NAMES` would be
 * self-referential, passing while the behaviour changed underneath it. This
 * list describes history: what the old monolith contained, as of the 0.18.0
 * split. It must not grow.
 */
const LEGACY_MONOLITH_REPLACEMENTS = [
  "spells-session",
  "spells-capture",
  "spells-delivery",
  "spells-review",
  "spells-planning",
  "spells-build",
  "spells-venture",
  "spells-meta",
] as const;

/**
 * Components that no longer exist under their old name, mapped to the set that
 * replaces them.
 *
 * `spell-prompts` and `claude-commands` were one monolithic pair holding all 34
 * spells in each client format. Both map to the same replacements, because
 * those components now carry both formats of every spell — so a manifest
 * listing either legacy name (or both, which every profile that had one did)
 * converges on the same result. Callers must dedupe.
 *
 * Without this, `spell update` would hit `ComponentNotFoundError` for the
 * legacy names, print "not in registry — skipping", preserve the dead entry,
 * and silently never update that repo's spells again.
 *
 * Null-prototype so a manifest component named `constructor` or `toString`
 * can't resolve to an inherited function and blow up the lookup.
 */
export const LEGACY_COMPONENT_MIGRATIONS: Readonly<Record<string, readonly string[]>> =
  Object.assign(Object.create(null) as Record<string, readonly string[]>, {
    "spell-prompts": LEGACY_MONOLITH_REPLACEMENTS,
    "claude-commands": LEGACY_MONOLITH_REPLACEMENTS,
  });

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
