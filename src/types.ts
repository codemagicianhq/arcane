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
  selfHosted?: boolean;
  tracking_mode?: TrackingMode;
  external_provider?: ExternalProvider | null;
  /**
   * Declares this repo as a hub that manages other ventures (idea books,
   * spell-manifest promotion, venture registry). Absent means "consumer" —
   * the default for every install. Never inferred from repo content (e.g.
   * a `ventures/` directory existing is not sufficient — `spell-summon-venture`
   * legitimately creates that directory in consumer repos too) and never
   * written automatically by `spell init`/`spell update`; only set via an
   * explicit operator answer to the CLI's hub question / retrofit wizard.
   */
  role?: HubRole;
  /**
   * Directory holding venture/business folders in a hub repo. Defaults to
   * "ventures" when `role` is "hub" and this is unset.
   */
  business_root?: string;
  /**
   * Directory holding this repository's own subject matter, when the repo IS
   * one subject rather than a portfolio of ventures (EF-07). Independent of
   * `business_root` and may coexist with it; where both apply to a shared
   * document, the subject root wins.
   *
   * `"."` is a supported value meaning the repository root itself is the
   * subject tree — documents sit alongside Arcane's own files rather than
   * under a wrapper directory. That matters for adoption: an existing archive
   * can come under governance without being restructured first.
   *
   * `null` means "asked, and this repo has no single subject root" (a
   * portfolio) — distinct from `undefined`, which means the question has
   * never been put to the operator. Same asked-but-none semantics
   * `external_provider: null` already carries.
   */
  subject_root?: string | null;
  /**
   * Whether this repository's contents are sensitive by default (EF-12).
   * `"sensitive"` switches agents to reference-not-transcribe behaviour: cite
   * document paths rather than copying contents into journals, decisions, or
   * commit messages, and retain no screenshots of them.
   *
   * Declared once for the whole repository rather than inferred per file —
   * content-based sensitivity detection is unreliable for general documents
   * (see the docs-mode PRD's rejection of scanning as a primary mechanism).
   */
  content_sensitivity?: ContentSensitivity;
}

export type HubRole = "hub" | "consumer";

export type ContentSensitivity = "standard" | "sensitive";

export type TrackingMode = "internal" | "external";
/**
 * ARC-011's already-shipped vocabulary (spell-open-session.prompt.md,
 * spell-plan.prompt.md). Not "azure-devops"/"github"/"gitlab" -- those were
 * never used anywhere; "ado" is the literal value both prompts read/write.
 */
export type ExternalProvider = "ado" | "jira" | "other";

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
  /**
   * When true, `spell update` never CREATES this component's files — it
   * reports them as missing instead. `init` and `add` install normally.
   *
   * For files whose mere appearance changes how Git treats an existing
   * repository: dropping a `.gitattributes` carrying `text=auto eol=lf` into a
   * live repo triggers a renormalization that can touch every tracked file.
   * That is a legitimate thing for an operator to choose, and an illegitimate
   * thing to do to them silently during a routine version upgrade (EF-17).
   */
  initOnly?: boolean;
  /**
   * Maps an installed path (as it appears in `files`, and therefore in the
   * manifest) to a different path under the assets root to copy it FROM.
   *
   * Needed for files whose installed name is a dotfile that must not exist as
   * a dotfile inside the package itself: a nested `.gitignore` shipped in an
   * npm tarball can silently exclude sibling files from the published package,
   * and a nested `.gitattributes` would apply its rules to Arcane's own source
   * tree. Storing the target path in `files` keeps uninstall correct, since
   * the manifest records what actually landed in the repository.
   */
  sourceOverrides?: Record<string, string>;
}

export type Profile = "full" | "lite" | "governance-only" | "methodology" | "docs";

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
