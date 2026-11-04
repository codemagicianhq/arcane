/**
 * The TypeScript twin of `src/assets/schemas/state.schema.json` (ARC-044
 * decision 1, architecture D2). The schema is the public contract and this
 * file mirrors it field for field; `test/state-schema.test.ts` keeps the two
 * in step by validating every fixture document against the schema and by
 * checking the serializer's key order against the schema's property order.
 *
 * Additive-only after 1.0.0: a field is never removed or retyped here or in
 * the schema. A breaking change is a new major version and a new decision
 * record.
 */

import type { ExternalProvider, HubRole, InstallScope, PushPolicy, TrackingMode, ContentSensitivity } from "../../types.js";

export const STATE_SCHEMA_VERSION = "1.0.0";
export const STATE_SCHEMA_ID = "https://arcaneai.net/schemas/state/v1";
/** The schema's path under the assets directory (`src/assets/` in source, `dist/assets/` when packaged). */
export const STATE_SCHEMA_ASSET_PATH = "schemas/state.schema.json";

export interface StateGenerator {
  name: "arcane-cli";
  version: string;
}

export interface StateRepository {
  /** Absolute real path; every other path in the document is POSIX-relative to it. */
  root: string;
  scope: InstallScope;
  /** Resolved: "consumer" when the manifest declares no role. */
  role: HubRole;
  profile: string;
}

export interface VersionComponent {
  name: string;
  installedVersion: string;
}

export interface VersionsSection {
  files: string;
  cli: string;
  latest: string | null;
  drift: {
    files_behind_cli: boolean;
    cli_behind_latest: boolean | null;
  };
  components: VersionComponent[];
}

export type RemoteProvider = "github" | "ado" | "other";

export interface GitRemote {
  provider: RemoteProvider;
  /** origin's URL with userinfo stripped. */
  url: string;
}

export interface GitWorktree {
  /** POSIX path relative to repository.root; "." for the main worktree. */
  path: string;
  branch: string | null;
}

export interface PullRequestRef {
  id: number;
  url: string;
  state: string;
}

export interface GitSection {
  branch: string | null;
  detached: boolean;
  trunk: string | null;
  ahead: number | null;
  behind: number | null;
  uncommitted: number | null;
  remote: GitRemote | null;
  worktrees: GitWorktree[] | null;
  pull_request: PullRequestRef | null;
}

export interface DecisionEntry {
  id: string;
  title: string;
  status: string | null;
  date: string | null;
  anchor: string;
}

export interface BookItem {
  text: string;
  section: string | null;
  locator: string;
  checked: boolean;
}

export interface BookSection {
  open: number;
  done: number;
  /** File order: order is meaning in a book. */
  items: BookItem[];
}

export interface JournalEntry {
  date: string;
  slug: string;
  title: string | null;
  path: string;
}

export interface IndexesSection {
  decisions: DecisionEntry[] | null;
  todos: BookSection | null;
  ideas: BookSection | null;
  done: BookSection | null;
  journal: JournalEntry[] | null;
}

export interface ConfigSection {
  tracking_mode: TrackingMode | null;
  external_provider: ExternalProvider | null;
  push_policy: PushPolicy | null;
  role: HubRole | null;
  business_root: string | null;
  spell_scope: InstallScope | null;
  content_sensitivity: ContentSensitivity | null;
}

export interface RegistryRepo {
  name: string | null;
  remote: string | null;
  default: boolean;
  /** Present only with --include-local-paths; this machine's clone path. */
  local_path?: string | null;
}

export interface RegistryVenture {
  slug: string;
  name: string | null;
  aliases: string[];
  status: string | null;
  visibility: string | null;
  ownership: string | null;
  /** The registry's value as written: a provider name, an object, or null. */
  tracking: unknown;
  repos: RegistryRepo[];
}

export interface RegistrySection {
  updated: string | null;
  ventures: RegistryVenture[];
}

export interface FeatureTracking {
  tracking_mode: string | null;
  external_provider: string | null;
  adoWorkItemId: number | string | null;
  githubIssueId: number | string | null;
}

export interface FeatureEntry {
  slug: string;
  title: string | null;
  status: string | null;
  implementation_status: string | null;
  tracking: FeatureTracking | null;
  path: string;
}

export interface AgentEntry {
  definition: string;
  name: string | null;
  id: string;
  epithet: string | null;
  origin: "repo" | "user";
  /** `sha256:` + hex digest of the role definition file; null with a warning when missing. */
  definition_revision: string | null;
}

export interface AgentsSection {
  schema: "roster-v2";
  naming_strategy: string;
  agent_profile: string;
  entries: AgentEntry[];
}

export interface StateDocument {
  schema_version: string;
  generated_at: string;
  generator: StateGenerator;
  repository: StateRepository;
  versions: VersionsSection;
  git: GitSection | null;
  indexes: IndexesSection;
  config: ConfigSection;
  registry: RegistrySection | null;
  features: FeatureEntry[] | null;
  agents: AgentsSection | null;
  warnings: string[];
}
