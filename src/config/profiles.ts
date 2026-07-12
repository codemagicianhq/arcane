/**
 * Profile configuration — the canonical source of truth for Arcane profiles.
 *
 * A profile bundles a curated set of components for a common use case.
 * Adding or changing profiles requires only editing this file — no changes to
 * the registry or CLI command logic are needed.
 *
 * The special value "*" for `components` means "all registered components"
 * and is expanded by the registry at runtime.
 */

import type { Profile } from "../types.js";

export interface ProfileConfig {
  id: Profile;
  displayName: string;
  description: string;
  /**
   * Component names included in this profile.
   * Use the special value "*" to mean "all registered components" (full install).
   */
  components: string[] | "*";
}

export const PROFILE_CONFIGS: ProfileConfig[] = [
  {
    id: "full",
    displayName: "Full Suite",
    description: "All components — spells, governance, agents, templates",
    components: "*",
  },
  {
    id: "lite",
    displayName: "Essentials",
    description: "Spells + core governance — fast start",
    components: ["spell-prompts", "claude-commands", "agent-output-instructions", "git-conventions", "testing-standards", "session-continuity"],
  },
  {
    id: "methodology",
    displayName: "Methodology Suite",
    description: "Spells + governance — full methodology without security/infra docs",
    components: [
      "spell-prompts",
      "claude-commands",
      "agent-output-instructions",
      "git-conventions",
      "testing-standards",
      "session-continuity",
      "decision-documentation-standard",
      "agent-work-queue-model",
      "development-methodology",
      "spell-authoring-standards",
    ],
  },
  {
    id: "governance-only",
    displayName: "Governance Only",
    description: "Standards docs only — no spells or agents",
    components: [
      "agent-output-instructions",
      "git-conventions",
      "testing-standards",
      "decision-documentation-standard",
      "agent-work-queue-model",
      "naming-conventions",
      "agent-policies",
      "threat-model",
      "hardening-checklist",
      "authentication-strategy",
      "new-business-setup",
      "agent-approved-paths",
      "portable-bootstrap",
      "development-methodology",
      "cicd-standards",
      "poc-management-pattern",
      "product-excellence-standards",
      "rca-process-standard",
      "universal-agent-rules",
      "spell-authoring-standards",
    ],
  },
];
