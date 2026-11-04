/**
 * The agents section (PRD ST-12, architecture D10): the effective roster
 * after precedence resolution -- the repository's roster wins; the opted-in
 * user tier applies only when the repository has none (ARC-047, as
 * `resolveRoster` already implements it) -- with provenance on every entry:
 * `origin` and `definition_revision`, the hash of the role definition file.
 *
 * Entries keep today's roster v2 fields under `schema: "roster-v2"`. The v3
 * fields (`ref`, `slug`, `aliases`, `derived_from`, `binding`) wait for the
 * agent-identity decision record and are added additively by its own
 * feature, never here.
 *
 * A missing roster is null. A malformed roster propagates
 * `AgentConfigValidationError`: the command prints the loader's message and
 * exits 1 (PRD ST-12, architecture D12).
 */

import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { AgentRosterNotFoundError } from "../agent-loader.js";
import { resolveRoster } from "../agents.js";
import type { AgentEntry, AgentsSection } from "./types.js";

export interface CollectAgentsOptions {
  /** The home the user-tier store sits under; tests point it at a temp directory. */
  homeDir?: string;
}

export interface CollectAgentsResult {
  /** Null when no roster applies to this repository. */
  agents: AgentsSection | null;
  warnings: string[];
}

/** `sha256:` + the hex digest of the file, or null when it cannot be read. */
async function fileRevision(path: string): Promise<string | null> {
  try {
    return `sha256:${createHash("sha256").update(await readFile(path)).digest("hex")}`;
  } catch {
    return null;
  }
}

export async function collectAgents(targetDir: string, options: CollectAgentsOptions = {}): Promise<CollectAgentsResult> {
  let resolved;
  try {
    resolved = await resolveRoster(targetDir, "repo", options.homeDir);
  } catch (error) {
    if (error instanceof AgentRosterNotFoundError) return { agents: null, warnings: [] };
    throw error;
  }

  const origin = resolved.fromUserTier ? "user" : "repo";
  const warnings: string[] = [];
  const entries: AgentEntry[] = [];
  for (const entry of resolved.roster.roster) {
    const definitionPath = join(resolved.definitionsDir, `${entry.definition}.yaml`);
    const definition_revision = await fileRevision(definitionPath);
    if (definition_revision === null) {
      warnings.push(`agents: the definition file for "${entry.definition}" (${entry.id}) is missing from its definitions directory; definition_revision is null`);
    }
    entries.push({
      definition: entry.definition,
      name: entry.name,
      id: entry.id,
      epithet: entry.epithet ?? null,
      origin,
      definition_revision,
    });
  }

  return {
    agents: {
      schema: "roster-v2",
      naming_strategy: resolved.roster.naming_strategy,
      agent_profile: resolved.roster.agent_profile,
      entries,
    },
    warnings,
  };
}
