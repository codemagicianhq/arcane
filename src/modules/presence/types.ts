/**
 * The presence channel's contract in TypeScript (ARC-060; features/presence-channel/
 * architecture.md D3): the twin of `src/assets/schemas/presence.schema.json`, plus the
 * constants every other presence module reads. A test keeps the two in step.
 *
 * No I/O here, and nothing here imports a module that does.
 */

import type { GitRemote } from "../state/types.js";

export const PRESENCE_CONTRACT = "v0";
export const PRESENCE_SCHEMA_ID = "https://arcaneai.net/schemas/presence/v0";
/** Relative to the package's assets directory (src/assets in the tree, dist/assets when built). */
export const PRESENCE_SCHEMA_ASSET_PATH = "schemas/presence.schema.json";

/** ARC-060 decision 2: a constant, overridable by `--port` or `ARCANE_PRESENCE_PORT`. */
export const DEFAULT_PORT = 27226;
/**
 * The two environment variables. Lowercase keys on purpose: the repository-wide secrets scan
 * (ARC-037) reads an upper-case `...TOKEN... =` assignment as a credential.
 */
export const PRESENCE_ENV = { port: "ARCANE_PRESENCE_PORT", token: "ARCANE_PRESENCE_TOKEN" } as const;
/** The only address the service binds and the only one the client dials (D14, D15). */
export const LOOPBACK_HOST = "127.0.0.1";

// ── Limits (ARC-060 decision 3; architecture D11) ─────────────────────────────
export const MAX_BODY_BYTES = 65_536;
export const MAX_LINE_CHARS = 256;
export const MAX_REQUIRED_ACTIONS = 20;
export const MAX_SUBSCRIBERS = 32;
export const MAX_SUBSCRIBER_BUFFER_BYTES = 1_048_576;
export const MAX_CONNECTIONS = 128;
/** Sessions held at once; a report that would mint the next one is 503 (review of PR #435). */
export const MAX_SESSIONS = 256;
/** Aliases on one agent block (review of PR #435). */
export const MAX_ALIASES = 32;
export const CONNECTIONS_CHECK_MS = 1_000;
export const HEADERS_TIMEOUT_MS = 5_000;
export const REQUEST_TIMEOUT_MS = 10_000;

// ── Clocks (ARC-060 decision 7; architecture D10: constants, not options) ─────
export const STALE_AFTER_MS = 90_000;
export const EXPIRE_AFTER_MS = 86_400_000;
export const KEEPALIVE_MS = 15_000;
export const SWEEP_MS = 5_000;

// ── Vocabularies ──────────────────────────────────────────────────────────────
export const HARNESSES = ["claude-code", "copilot", "codex", "openclaw", "cron", "other"] as const;
export type Harness = (typeof HARNESSES)[number];

export const STATUSES = ["working", "waiting", "blocked", "idle", "done"] as const;
export type Status = (typeof STATUSES)[number];
/** `done` is set by `end` only (architecture D6). */
export const REPORT_STATUSES = ["working", "waiting", "blocked", "idle"] as const;
export type ReportStatus = (typeof REPORT_STATUSES)[number];

/** ARC-059 decision 10's vocabulary; extended only by a decision record (ARC-060 decision 8). */
export const ACTIONS = ["open", "resume", "instruct"] as const;
export type Action = (typeof ACTIONS)[number];

export const ALIAS_CONTEXTS = ["openclaw", "slug"] as const;
export type AliasContext = (typeof ALIAS_CONTEXTS)[number];

export const SESSION_EVENTS = [
  "session.started",
  "session.updated",
  "session.action_required",
  "session.stale",
  "session.resumed",
  "session.ended",
  "session.expired",
] as const;
export type SessionEventName = (typeof SESSION_EVENTS)[number];
export const HELLO_EVENT = "server.hello";

// ── Shapes ────────────────────────────────────────────────────────────────────
export interface Capabilities {
  observe: boolean;
  actions: Action[];
}

/** This iteration is observation only, by contract (ARC-060 decision 8). A fresh object per call. */
export function presenceCapabilities(): Capabilities {
  return { observe: true, actions: [] };
}

export interface AgentAlias {
  value: string;
  context: AliasContext;
}

/**
 * Always all six keys (architecture D7). On a v2 roster `ref` is null and
 * `aliases` empty (ARC-060 decision 13); with no agent every field is null.
 */
export interface AgentBlock {
  ref: string | null;
  slug: string | null;
  name: string | null;
  origin: "repo" | "user" | null;
  definition_revision: string | null;
  aliases: AgentAlias[];
}

export function nullAgentBlock(): AgentBlock {
  return { ref: null, slug: null, name: null, origin: null, definition_revision: null, aliases: [] };
}

export interface RequiredAction {
  action: string;
  reason: string | null;
}

export interface RepositoryInfo {
  /** Absolute real path of the main working tree. A label: the service never opens it. */
  root: string;
  name: string;
  remote: GitRemote | null;
}

export interface CheckoutInfo {
  /** Absolute real path of this worktree: the session key. */
  path: string;
  /** Branch name, the short commit id when detached, or null when unknown. */
  branch: string | null;
  linked_worktree: boolean;
}

export interface SessionRecord {
  session: string;
  agent: AgentBlock;
  harness: Harness;
  repository: RepositoryInfo;
  checkout: CheckoutInfo;
  spell: string | null;
  task: string | null;
  message: string | null;
  status: Status;
  required_actions: RequiredAction[];
  started_at: string;
  reported_at: string;
  ended_at: string | null;
  stale: boolean;
}

/**
 * `POST /v0/sessions/report` (architecture D4): a patch on the checkout's
 * record. An absent `spell`, `task` or `message` keeps the stored value and
 * `null` clears it; `required_actions` replaces the stored list (absent means `[]`).
 */
export interface ReportBody {
  status: ReportStatus;
  harness: Harness;
  agent: AgentBlock;
  repository: RepositoryInfo;
  checkout: CheckoutInfo;
  spell?: string | null;
  task?: string | null;
  message?: string | null;
  required_actions?: RequiredAction[];
}

export interface EndBody {
  checkout: { path: string };
}

export interface PresenceGenerator {
  name: "arcane-cli";
  version: string;
}

export interface HealthDocument {
  ok: true;
  generator: PresenceGenerator;
  contract: typeof PRESENCE_CONTRACT;
  capabilities: Capabilities;
  sessions: number;
  started_at: string;
}

export interface SnapshotDocument {
  capabilities: Capabilities;
  generated_at: string;
  sessions: SessionRecord[];
}

export interface HelloDocument {
  contract: typeof PRESENCE_CONTRACT;
  capabilities: Capabilities;
  sessions: SessionRecord[];
}

export interface SessionEvent {
  event: SessionEventName;
  data: SessionRecord;
}

export interface ErrorDocument {
  error: { code: string; field?: string; message: string };
}

/** What `serve` writes to `~/.arcane/presence/server.json` (ARC-060 decision 2). No secret. */
export interface ServerInfo {
  url: string;
  pid: number;
  port: number;
  started_at: string;
  generator: PresenceGenerator;
}
