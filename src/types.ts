/**
 * Shared TypeScript interfaces for the Arcane CLI.
 * No runtime code — types and interfaces only.
 */

export interface InstalledComponent {
  name: string;
  files: string[];
  installedVersion: string;
  /**
   * SHA-256 hex digest of each file's content, keyed by its entry in
   * `files`, recorded at the point the file is written (ARC-038 decision 1).
   * `spell update` compares a file's current on-disk hash against this
   * record to distinguish "untouched since install" (safe to overwrite)
   * from "operator edited it" (needs a three-way merge, not a silent
   * overwrite). Optional and per-file rather than required: an install or a
   * file written before this field existed simply has no entry, and update
   * falls back to the pre-ARC-038 unconditional-overwrite behavior for it --
   * this field protects edits made after it starts being recorded, not
   * retroactively.
   */
  fileHashes?: Record<string, string>;
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
  /**
   * Whether this repository may push to a remote (EF-09).
   *
   * - `"open"` (default, and the value every existing install behaves as)
   *   — no change from today.
   * - `"guarded"` — no technical control installed, but the operator is
   *   reminded that this repository was flagged as sensitive.
   * - `"blocked"` — a pre-push hook and a disabled push URL, so an accidental
   *   `git push` fails. Not tamper-proof by design: the threat modelled is an
   *   accidental push, not a determined operator (see features/push-safety/PRD.md).
   *
   * Reversed only by `spell unblock-push`, never as a side effect of another
   * command.
   */
  push_policy?: PushPolicy;
  /**
   * ISO timestamp of the last `spell unblock-push`. Present only if a block
   * was ever lifted -- the PRD requires the change be a visible, recorded
   * event rather than a silent flag flip.
   */
  push_policy_unblocked_at?: string;
  /**
   * Repository-relative path prefixes to exclude from the secrets/org-leak
   * scan (ARC-037). Matched as a literal substring against the file's
   * repo-relative path -- the same semantics `SCAN_EXCLUDED_PREFIXES` already
   * used before this field existed, not a glob. Use sparingly: an exclusion
   * is a scan blind spot for that path, not a suppression of one confirmed
   * false positive elsewhere in the same file.
   */
  secretsScanExcludePrefixes?: string[];
}

export type HubRole = "hub" | "consumer";

export type ContentSensitivity = "standard" | "sensitive";

export type PushPolicy = "open" | "guarded" | "blocked";

export type TrackingMode = "internal" | "external";
/**
 * ARC-011's already-shipped vocabulary (spell-open-session.prompt.md,
 * spell-plan.prompt.md) plus `"github"` (ARC-032 implementation note,
 * 2026-08-31, BC-09). Not "azure-devops"/"gitlab" -- those were never used
 * anywhere. `"github"` was also removed once before, by ARC-032 itself, for
 * that same reason -- but this addition is not a reversion of that fix:
 * ARC-032 dropped it because nothing read or wrote it; this one exists
 * because `spell-bug`/`spell-plan`/`spell-scope`/`spell-suggest-feature`/
 * `spell-full-cycle` now have a real, working `gh issue` branch that does.
 */
export type ExternalProvider = "ado" | "github" | "jira" | "other";

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
  /** Delete orphaned managed files (TODO.md T10 / ARC-038), hash-checked so an edited file is reported, never silently destroyed. */
  prune?: boolean;
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
  /** Naming-strategy-bound epithet (e.g. "the Archmage") — present only for arcanos naming. */
  epithet?: string;
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

// ─── Delegation records (BC-19: solo-operator mode, no roster required) ──────

export type DelegationStatus = "active" | "revoked";

/**
 * A single standing-authority grant, recorded explicitly instead of living as
 * ad hoc prose. Parallel to agent-policies.md's roster-based power-level
 * matrix, for repos with no installed .arcane/agents.yaml roster at all.
 */
export interface Delegation {
  id: string;
  grantedBy: string;
  grantedAt: string;
  scope: string;
  permittedActions: string[];
  excludedActions: string[];
  status: DelegationStatus;
  /** How to revoke this specific grant -- always a git-native action. */
  revocation: string;
}

export interface DelegationsFile {
  delegations: Delegation[];
}
