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
import type { AgentDefinition, AgentRoster, InstallScope } from "../types.js";
import {
  AgentConfigValidationError,
  validateAgentDefinition,
  validateAgentRoster,
} from "./agent-schema.js";

export { AgentConfigValidationError } from "./agent-schema.js";

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
  /**
   * Names the tier the caller actually asked for. A `--user` run that reports
   * the repository's path sends the operator to the wrong file and the wrong
   * command, which is worse than no message.
   */
  constructor(scope: InstallScope = "repo") {
    const user = scope === "user";
    super(
      `No agent roster found at ${user ? "~/.arcane/agents.yaml" : ".arcane/agents.yaml"}. ` +
      `Run "spell agents init${user ? " --user" : ""}" to create one.`,
    );
    this.name = "AgentRosterNotFoundError";
  }
}

function parseYaml(content: string, source: string): unknown {
  try {
    return parse(content);
  } catch (err) {
    const detail = err instanceof Error ? err.message : "unknown YAML parse error";
    throw new AgentConfigValidationError(source, [`malformed YAML: ${detail}`]);
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
  return validateAgentDefinition(parseYaml(content, filePath), filePath);
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
    const filePath = join(agentsDir, file);
    const content = await readFile(filePath, "utf8");
    definitions.push(validateAgentDefinition(parseYaml(content, filePath), filePath));
  }
  return definitions;
}

// ─── Roster loaders ───────────────────────────────────────────────────────────

/**
 * Loads the agent roster from .arcane/agents.yaml in the target directory.
 * Throws AgentRosterNotFoundError if not initialized.
 */
/**
 * The directory holding `agents.yaml` and the per-role definition files.
 *
 * A repository keeps them under its framework layer, `<repo>/.arcane`. The
 * user tier's store IS that layer -- `~/.arcane` already plays the role
 * `<repo>/.arcane` plays in a repository, which is why its spells live at
 * `~/.arcane/spells/<id>.md` and not `~/.arcane/.arcane/spells/` (CS-04's
 * store view, `componentForScope`). Agents follow the same rule.
 */
export function agentsBaseDir(targetDir: string, scope: InstallScope = "repo"): string {
  return scope === "user" ? targetDir : join(targetDir, ".arcane");
}

export async function loadRoster(
  targetDir: string,
  scope: InstallScope = "repo",
): Promise<AgentRoster> {
  const rosterPath = join(agentsBaseDir(targetDir, scope), "agents.yaml");
  let content: string;
  try {
    content = await readFile(rosterPath, "utf8");
  } catch {
    throw new AgentRosterNotFoundError(scope);
  }
  return validateAgentRoster(parseYaml(content, rosterPath), rosterPath);
}

/**
 * Returns true if a roster file exists in the target directory.
 */
export async function rosterExists(
  targetDir: string,
  scope: InstallScope = "repo",
): Promise<boolean> {
  try {
    await access(join(agentsBaseDir(targetDir, scope), "agents.yaml"));
    return true;
  } catch {
    return false;
  }
}

/**
 * Returns the path to the project's agent definitions directory.
 */
export function projectAgentsDir(
  targetDir: string,
  scope: InstallScope = "repo",
): string {
  return join(agentsBaseDir(targetDir, scope), "agents");
}
