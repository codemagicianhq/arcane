/**
 * Agent definition and roster loader.
 *
 * Reads canonical agent YAML files from two locations:
 *   - assetsDir/agents/  — bundled templates (used during init/add)
 *   - targetDir/.arcane/agents/  — project's installed/customized definitions (used during sync)
 */

import { readFile, readdir, access } from "node:fs/promises";
import { join } from "node:path";
import { parse } from "yaml";
import type { AgentDefinition, AgentRoster } from "../types.js";

// ─── Error types ──────────────────────────────────────────────────────────────

export class AgentDefinitionNotFoundError extends Error {
  constructor(id: string, searchDir: string) {
    super(
      `Agent definition "${id}" not found in "${searchDir}". ` +
      `Check that ${id}.yaml exists or run "spell agents add ${id}".`,
    );
    this.name = "AgentDefinitionNotFoundError";
  }
}

export class AgentRosterNotFoundError extends Error {
  constructor() {
    super(
      'No agent roster found at .arcane/agents.yaml. ' +
      'Run "spell agents init" to create one.',
    );
    this.name = "AgentRosterNotFoundError";
  }
}

// ─── Definition loaders ───────────────────────────────────────────────────────

/**
 * Loads a single agent definition from a directory.
 * Used by `spell agents sync` (reads from .arcane/agents/).
 */
export async function loadAgentDefinition(
  agentsDir: string,
  id: string,
): Promise<AgentDefinition> {
  const filePath = join(agentsDir, `${id}.yaml`);
  let content: string;
  try {
    content = await readFile(filePath, "utf8");
  } catch {
    throw new AgentDefinitionNotFoundError(id, agentsDir);
  }
  return parse(content) as AgentDefinition;
}

/**
 * Loads all agent definition files from a directory.
 * Skips non-YAML files and the agents.yaml roster file.
 */
export async function loadAllAgentDefinitions(
  agentsDir: string,
): Promise<AgentDefinition[]> {
  let entries: string[];
  try {
    entries = await readdir(agentsDir);
  } catch {
    return [];
  }

  const definitions: AgentDefinition[] = [];
  for (const file of entries) {
    if (!file.endsWith(".yaml") || file === "agents.yaml") continue;
    const content = await readFile(join(agentsDir, file), "utf8");
    definitions.push(parse(content) as AgentDefinition);
  }
  return definitions;
}

// ─── Roster loaders ───────────────────────────────────────────────────────────

/**
 * Loads the agent roster from .arcane/agents.yaml in the target directory.
 * Throws AgentRosterNotFoundError if not initialized.
 */
export async function loadRoster(targetDir: string): Promise<AgentRoster> {
  const rosterPath = join(targetDir, ".arcane", "agents.yaml");
  let content: string;
  try {
    content = await readFile(rosterPath, "utf8");
  } catch {
    throw new AgentRosterNotFoundError();
  }
  return parse(content) as AgentRoster;
}

/**
 * Returns true if a roster file exists in the target directory.
 */
export async function rosterExists(targetDir: string): Promise<boolean> {
  try {
    await access(join(targetDir, ".arcane", "agents.yaml"));
    return true;
  } catch {
    return false;
  }
}

/**
 * Returns the path to the project's agent definitions directory.
 */
export function projectAgentsDir(targetDir: string): string {
  return join(targetDir, ".arcane", "agents");
}
