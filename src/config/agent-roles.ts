/**
 * Canonical agent role definitions.
 * Each entry maps to a YAML template file at src/assets/agents/{id}.yaml.
 * These are the 12 standard roles that ship with Arcane.
 */

import type { AgentCategory } from "../types.js";

export interface AgentRoleConfig {
  id: string;
  role: string;
  category: AgentCategory;
}

export const AGENT_ROLES: AgentRoleConfig[] = [
  {
    id: "orchestrator",
    role: "Product Operations Manager",
    category: "operations",
  },
  {
    id: "architecture-lead",
    role: "CTO / Architecture Lead",
    category: "engineering",
  },
  {
    id: "fullstack-dev",
    role: "Full-Stack Developer",
    category: "engineering",
  },
  {
    id: "qa-lead",
    role: "QA Lead",
    category: "quality",
  },
  {
    id: "devops",
    role: "DevOps / CI/CD Engineer",
    category: "engineering",
  },
  {
    id: "frontend-dev",
    role: "Frontend Developer",
    category: "engineering",
  },
  {
    id: "mobile-dev",
    role: "Mobile Developer",
    category: "engineering",
  },
  {
    id: "research-analyst",
    role: "Research & Backlog Analyst",
    category: "research",
  },
  {
    id: "marketing-strategist",
    role: "Marketing Strategist",
    category: "operations",
  },
  {
    id: "operations-comms",
    role: "Operations Communications",
    category: "operations",
  },
  {
    id: "collaborator",
    role: "External Collaboration Lead",
    category: "operations",
  },
  {
    id: "security-ops",
    role: "Security Operations",
    category: "quality",
  },
];

/** Lookup by role ID. */
export function getAgentRole(id: string): AgentRoleConfig | undefined {
  return AGENT_ROLES.find((r) => r.id === id);
}
