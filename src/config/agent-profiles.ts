/**
 * Agent profile configurations.
 * Controls which roles are included when running `spell agents init`.
 * Separate from src/config/profiles.ts (which governs governance/prompts components).
 */

import type { AgentProfileId } from "../types.js";

export interface AgentProfileConfig {
  id: AgentProfileId;
  displayName: string;
  description: string;
  /** Role IDs included in this profile. Empty means user selects interactively. */
  roles: string[];
}

export const AGENT_PROFILE_CONFIGS: AgentProfileConfig[] = [
  {
    id: "base",
    displayName: "Base",
    description: "Core team: orchestrator, architecture-lead, fullstack-dev, qa-lead",
    roles: ["orchestrator", "architecture-lead", "fullstack-dev", "qa-lead"],
  },
  {
    id: "full",
    displayName: "Full",
    description: "Complete roster — all 12 roles",
    roles: [
      "orchestrator",
      "architecture-lead",
      "fullstack-dev",
      "qa-lead",
      "devops",
      "frontend-dev",
      "mobile-dev",
      "research-analyst",
      "marketing-strategist",
      "operations-comms",
      "collaborator",
      "security-ops",
    ],
  },
  {
    id: "custom",
    displayName: "Custom",
    description: "Select roles interactively",
    roles: [], // populated at runtime via checkbox prompt
  },
];

/** Lookup by profile ID. */
export function getAgentProfileConfig(id: AgentProfileId): AgentProfileConfig {
  const config = AGENT_PROFILE_CONFIGS.find((p) => p.id === id);
  if (!config) throw new Error(`Unknown agent profile: "${id}"`);
  return config;
}
