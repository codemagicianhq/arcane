/**
 * Naming strategy logic for agent roster setup.
 *
 * Four strategies:
 *   arcanos — the built-in persona roster (default): twelve legendary agents
 *   generic — maps each role to a short, memorable generic label
 *   random  — assigns random common names from a curated pool
 *   custom  — prompts the user to type a name for each role
 */

import { input } from "@inquirer/prompts";
import type { NamingStrategy } from "../types.js";
import { getAgentRole } from "../config/agent-roles.js";

// ─── Generic names ────────────────────────────────────────────────────────────

/** Short, role-derived display names for the generic strategy. */
const GENERIC_NAME_MAP: Record<string, string> = {
  "orchestrator": "Orchestrator",
  "architecture-lead": "Architect",
  "fullstack-dev": "Developer",
  "qa-lead": "QA Lead",
  "devops": "DevOps",
  "frontend-dev": "Frontend",
  "mobile-dev": "Mobile",
  "research-analyst": "Researcher",
  "marketing-strategist": "Marketer",
  "operations-comms": "Comms",
  "collaborator": "Collaborator",
  "security-ops": "Security",
};

// ─── Arcanos preset names ─────────────────────────────────────────────────────

/** Persona names from the Arcanos roster — twelve legendary agents. */
const ARCANOS_NAME_MAP: Record<string, string> = {
  "orchestrator": "Kellar",
  "architecture-lead": "Merlin",
  "fullstack-dev": "Lafayette",
  "qa-lead": "Lince",
  "devops": "Prospero",
  "frontend-dev": "Adelaide",
  "mobile-dev": "Mercurio",
  "research-analyst": "Alexander",
  "marketing-strategist": "Circe",
  "operations-comms": "Bess",
  "collaborator": "Iris",
  "security-ops": "Custodio",
};

// ─── Random name pool ─────────────────────────────────────────────────────────

/**
 * Curated pool of common single-word names.
 * Gender-neutral where possible to avoid unintentional character typecasting.
 */
const RANDOM_NAME_POOL: string[] = [
  "Aiden", "Blake", "Casey", "Dana", "Ellis", "Finley", "Gray", "Harper",
  "Indigo", "Jordan", "Kai", "Lane", "Morgan", "Nova", "Owen", "Parker",
  "Quinn", "River", "Sage", "Taylor", "Uma", "Vale", "Wren", "Xander",
  "Yael", "Zara", "Avery", "Brett", "Charlie", "Devon",
];

// ─── Strategy implementations ────────────────────────────────────────────────

export interface NamingResult {
  definition: string;
  name: string;
}

/** Assigns short generic labels derived from each role. */
export function applyGenericNames(roleIds: string[]): NamingResult[] {
  return roleIds.map((id) => ({
    definition: id,
    name: GENERIC_NAME_MAP[id] ?? id,
  }));
}

/** Assigns Arcanos persona names (Kellar, Merlin, Lafayette, etc.). */
export function applyArcanosNames(roleIds: string[]): NamingResult[] {
  return roleIds.map((id) => ({
    definition: id,
    name: ARCANOS_NAME_MAP[id] ?? GENERIC_NAME_MAP[id] ?? id,
  }));
}

/**
 * Assigns random names from the pool, shuffled per call.
 * If more roles than pool entries, wraps around.
 */
export function applyRandomNames(roleIds: string[]): NamingResult[] {
  const shuffled = [...RANDOM_NAME_POOL].sort(() => Math.random() - 0.5);
  return roleIds.map((id, i) => ({
    definition: id,
    name: shuffled[i % shuffled.length]!,
  }));
}

/**
 * Prompts the user to type a name for each role interactively.
 * Defaults to the generic name to speed up entry.
 */
export async function promptCustomNames(roleIds: string[]): Promise<NamingResult[]> {
  const results: NamingResult[] = [];
  for (const id of roleIds) {
    const role = getAgentRole(id);
    const defaultName = GENERIC_NAME_MAP[id] ?? id;
    const name = await input({
      message: `Name for ${role?.role ?? id}:`,
      default: defaultName,
      validate: (v) =>
        v.trim().length > 0 ? true : "Name cannot be empty",
    });
    results.push({ definition: id, name: name.trim() });
  }
  return results;
}

/**
 * Applies the selected naming strategy to a list of role IDs.
 * Returns an array of definition→name pairs.
 */
export async function applyNamingStrategy(
  strategy: NamingStrategy,
  roleIds: string[],
): Promise<NamingResult[]> {
  switch (strategy) {
    case "arcanos":
      return applyArcanosNames(roleIds);
    case "generic":
      return applyGenericNames(roleIds);
    case "random":
      return applyRandomNames(roleIds);
    case "custom":
      return promptCustomNames(roleIds);
  }
}
