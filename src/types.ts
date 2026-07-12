/**
 * Shared TypeScript interfaces for the Arcane CLI.
 * No runtime code — types and interfaces only.
 */

export interface InstalledComponent {
  name: string;
  files: string[];
  installedVersion: string;
}

export interface ArcaneManifest {
  version: string;
  profile: Profile;
  installedAt: string;
  components: InstalledComponent[];
}

export interface RegistryComponent {
  name: string;
  description: string;
  files: string[];
  /**
   * Directories to copy recursively (relative to assets root → target root).
   * Each entry is a path like ".github/prompts" — the entire directory
   * tree is copied, preserving structure.
   */
  directories?: string[];
  /**
   * When true, existing files are silently skipped instead of throwing.
   * Used for user-owned files (TODO.md, DECISIONS.md) that should be
   * created on first init but never overwritten on re-init or update.
   */
  skipExisting?: boolean;
}

export type Profile = "full" | "lite" | "governance-only" | "methodology";

export interface ProfileDefinition {
  id: Profile;
  displayName: string;
  description: string;
  /** Names of the components included in this profile (expanded — no wildcards). */
  components: string[];
}

export interface SpellInitOptions {
  profile?: Profile;
  force?: boolean;
  dryRun?: boolean;
}

export interface SpellAddOptions {
  force?: boolean;
  dryRun?: boolean;
}

export interface SpellUpdateOptions {
  dryRun?: boolean;
}

export interface VersionCheckResult {
  current: string;
  latest: string | null;
  updateAvailable: boolean;
  error?: string;
}

// ─── Agent system types ───────────────────────────────────────────────────────

export type NamingStrategy = "arcanos" | "generic" | "random" | "custom";
export type AgentProfileId = "base" | "full" | "custom";
export type PowerLevel =
  | "Spectator"
  | "Apprentice"
  | "Wizard"
  | "Sorcerer"
  | "Magus"
  | "Archmage";
export type AgentCategory =
  | "engineering"
  | "operations"
  | "quality"
  | "research";

export interface AgentModelConfig {
  primary: string;
  fallback: string[];
}

export interface AgentToolConfig {
  allowed: string[];
  denied: string[];
}

export interface AgentAutonomyConfig {
  default_power_level: PowerLevel;
  exec_allowed: boolean;
}

export interface AgentSpawnConfig {
  can_spawn: boolean;
  spawnable_by: string[];
}

export interface AgentClientConfig {
  openclaw?: { workspace_prefix: string };
  copilot?: { agent_file: boolean };
  claude?: { include_in_instructions: boolean };
  codex?: { include_in_agents_md: boolean };
}

export interface AgentPersona {
  description: string;
  behavioral_rules: string[];
  personality?: string;
  voice?: string;
  visual_description?: string;
  catchphrases?: string[];
}

export interface AgentDefinition {
  id: string;
  role: string;
  category: AgentCategory;
  persona: AgentPersona;
  model: AgentModelConfig;
  tools: AgentToolConfig;
  autonomy: AgentAutonomyConfig;
  spawn: AgentSpawnConfig;
  clients: AgentClientConfig;
}

export interface AgentRosterEntry {
  /** Role ID from the canonical definition (e.g. "fullstack-dev") */
  definition: string;
  /** Assigned display name (null until naming strategy is applied) */
  name: string | null;
  /** OpenClaw agent ID (e.g. "lafayette", "main" for orchestrator) */
  id: string;
}

export interface OpenClawAgentConfig {
  enabled: boolean;
  /** Path to OpenClaw workspace root — supports ~ expansion */
  workspace_root: string;
}

export interface AgentRoster {
  schema_version: number;
  naming_strategy: NamingStrategy;
  agent_profile: AgentProfileId;
  openclaw: OpenClawAgentConfig;
  roster: AgentRosterEntry[];
}

export interface AgentSyncOptions {
  dryRun?: boolean;
  force?: boolean;
  /** If false, skip OpenClaw output. Defaults to true. */
  openclaw?: boolean;
  /** If false, skip Copilot output. Defaults to true. */
  copilot?: boolean;
  /** If false, skip Claude output. Defaults to true. */
  claude?: boolean;
  /** If false, skip Codex output. Defaults to true. */
  codex?: boolean;
}

export interface AgentInitOptions {
  profile?: AgentProfileId;
  naming?: NamingStrategy;
  dryRun?: boolean;
  force?: boolean;
}
