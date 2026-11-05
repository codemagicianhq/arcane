/**
 * The roster seam (ARC-060 decisions 4 and 13; architecture D7, D9).
 *
 * The only presence file that touches a roster. It works on resolved
 * profiles, the shape the agent-identity PRD's AI-07 gives `resolveRoster`,
 * from one provider. Today's provider reads a v2 roster through the state
 * export's `collectAgents`, which already applies the roster precedence and
 * computes `origin` and `definition_revision`: `slug` is the entry's v2 `id`,
 * `ref` is null and `aliases` is [] (ARC-060 decision 13). A reader never
 * mints a reference and never writes a roster (ARC-059 decision 5).
 *
 * TODO(agent-identity AI-02, AI-07): when the loader accepts roster v3,
 * replace `v2Profiles` with a provider over `resolveRoster`'s resolved
 * profiles; `matchAgent` and `defaultAgent` stay as they are.
 *
 * No roster, a roster the loader refuses, an unmatched `--agent` and an
 * ambiguous one all yield the null block: the reporter never fails a spell
 * over a roster, and an identity is never guessed.
 */

import { collectAgents } from "../state/agents.js";
import { nullAgentBlock, type AgentAlias, type AgentBlock } from "./types.js";

export interface ResolvedProfile {
  ref: string | null;
  slug: string;
  name: string | null;
  origin: "repo" | "user";
  definition_revision: string | null;
  aliases: AgentAlias[];
  /** The role definition id, e.g. "orchestrator". */
  definition: string;
}

export type ProfileProvider = (targetDir: string) => Promise<ResolvedProfile[]>;

export interface AgentDeps {
  profiles?: ProfileProvider;
  /** The home the user-tier store sits under; tests point it elsewhere. */
  homeDir?: string;
}

/** Profiles from a v2 roster (ARC-060 decision 13). Empty when no roster applies or it cannot be loaded. */
export async function v2Profiles(targetDir: string, homeDir?: string): Promise<ResolvedProfile[]> {
  try {
    const { agents } = await collectAgents(targetDir, homeDir === undefined ? {} : { homeDir });
    if (agents === null) return [];
    return agents.entries.map((e) => ({
      ref: null,
      slug: e.id,
      name: e.name,
      origin: e.origin,
      definition_revision: e.definition_revision,
      aliases: [],
      definition: e.definition,
    }));
  } catch {
    return [];
  }
}

/** A slug first; then exactly one profile holding an alias of that value, in any context. */
export function matchAgent(profiles: ResolvedProfile[], value: string): ResolvedProfile | null {
  const bySlug = profiles.filter((p) => p.slug === value);
  if (bySlug.length === 1) return bySlug[0] ?? null;
  if (bySlug.length > 1) return null;
  const byAlias = profiles.filter((p) => p.aliases.some((a) => a.value === value));
  return byAlias.length === 1 ? (byAlias[0] ?? null) : null;
}

/** ARC-060 decision 4: the roster's single orchestrator entry, else nobody. */
export function defaultAgent(profiles: ResolvedProfile[]): ResolvedProfile | null {
  const orchestrators = profiles.filter((p) => p.definition === "orchestrator");
  return orchestrators.length === 1 ? (orchestrators[0] ?? null) : null;
}

export function toAgentBlock(profile: ResolvedProfile | null): AgentBlock {
  if (profile === null) return nullAgentBlock();
  return {
    ref: profile.ref,
    slug: profile.slug,
    name: profile.name,
    origin: profile.origin,
    definition_revision: profile.definition_revision,
    aliases: profile.aliases.map((a) => ({ value: a.value, context: a.context })),
  };
}

export async function resolveSessionAgent(targetDir: string, agentFlag: string | undefined, deps: AgentDeps = {}): Promise<AgentBlock> {
  const provider = deps.profiles ?? ((dir: string) => v2Profiles(dir, deps.homeDir));
  let profiles: ResolvedProfile[];
  try {
    profiles = await provider(targetDir);
  } catch {
    return nullAgentBlock();
  }
  return toAgentBlock(agentFlag === undefined ? defaultAgent(profiles) : matchAgent(profiles, agentFlag));
}
