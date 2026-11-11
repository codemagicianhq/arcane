/**
 * Validation and normalization of the two request bodies the service accepts
 * (ARC-060 decision 3; architecture D11). Pure: no I/O.
 *
 * - The shape is closed: an unknown key is refused, naming it.
 * - One-line strings have every control character (CR and LF included)
 *   replaced by a space and are then cut to 256 code points, never splitting
 *   a surrogate pair.
 * - `required_actions` over 20 entries is refused, never cut: a silently dropped
 *   required-action line is the one loss an operator cannot see.
 * - `needs_you`, the field's name before 1.20, was accepted as
 *   `required_actions` for the 1.20 series only (ARC-060 decision 14); since
 *   1.23.0 it is an unknown field like any other.
 * - `done` is not a report status: a session ends through `end` (D6).
 */

import {
  ALIAS_CONTEXTS,
  HARNESSES,
  MAX_ALIASES,
  MAX_LINE_CHARS,
  MAX_REQUIRED_ACTIONS,
  REPORT_STATUSES,
  type AgentAlias,
  type AgentBlock,
  type CheckoutInfo,
  type EndBody,
  type Harness,
  type RequiredAction,
  type ReportBody,
  type ReportStatus,
  type RepositoryInfo,
} from "./types.js";

export type Validated<T> = { ok: true; value: T } | { ok: false; code: string; field?: string; message: string };

class Refusal extends Error {
  constructor(
    readonly code: string,
    readonly field: string | undefined,
    message: string,
  ) {
    super(message);
  }
}

const AGENT_REF = /^arcane:agent:[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
const REVISION = /^sha256:[0-9a-f]{64}$/;
// C0 and C1 controls, DEL, and the two Unicode line separators.
// eslint-disable-next-line no-control-regex -- matching control characters is the point
const CONTROL = new RegExp("[\\u0000-\\u001f\\u007f-\\u009f\\u2028\\u2029]", "g");

/** One line, at most 256 code points (architecture D11). */
export function oneLine(value: string): string {
  const flat = value.replace(CONTROL, " ");
  const points = Array.from(flat);
  return points.length > MAX_LINE_CHARS ? points.slice(0, MAX_LINE_CHARS).join("") : flat;
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function closed(value: unknown, field: string | undefined, required: readonly string[], optional: readonly string[] = []): Record<string, unknown> {
  if (!isObject(value)) throw new Refusal("invalid_field", field, `${field ?? "the body"} must be an object`);
  const allowed = new Set([...required, ...optional]);
  for (const key of Object.keys(value)) {
    if (!allowed.has(key)) throw new Refusal("unknown_field", join(field, key), `${join(field, key)} is not a field of this contract`);
  }
  for (const key of required) {
    if (!(key in value)) throw new Refusal("missing_field", join(field, key), `${join(field, key)} is required`);
  }
  return value;
}

function join(parent: string | undefined, key: string): string {
  return parent === undefined ? key : `${parent}.${key}`;
}

function nonEmpty(value: unknown, field: string): string {
  if (typeof value !== "string" || value.length === 0) throw new Refusal("invalid_field", field, `${field} must be a non-empty string`);
  return value;
}

function line(value: unknown, field: string, nullable: boolean): string | null {
  if (value === null && nullable) return null;
  if (typeof value !== "string") throw new Refusal("invalid_field", field, `${field} must be a string${nullable ? " or null" : ""}`);
  return oneLine(value);
}

function nonEmptyLine(value: unknown, field: string): string {
  const out = line(value, field, false)!;
  if (out.trim().length === 0) throw new Refusal("invalid_field", field, `${field} must not be empty`);
  return out;
}

function oneOf<T extends string>(value: unknown, allowed: readonly T[], field: string): T {
  if (typeof value !== "string" || !(allowed as readonly string[]).includes(value)) {
    throw new Refusal("invalid_field", field, `${field} must be one of ${allowed.join(", ")}`);
  }
  return value as T;
}

function agent(value: unknown): AgentBlock {
  const a = closed(value, "agent", ["ref", "slug", "name", "origin", "definition_revision", "aliases"]);
  if (a["ref"] !== null && (typeof a["ref"] !== "string" || !AGENT_REF.test(a["ref"]))) {
    throw new Refusal("invalid_field", "agent.ref", "agent.ref must be an arcane:agent: reference or null");
  }
  if (a["origin"] !== null && a["origin"] !== "repo" && a["origin"] !== "user") {
    throw new Refusal("invalid_field", "agent.origin", "agent.origin must be repo, user or null");
  }
  if (a["definition_revision"] !== null && (typeof a["definition_revision"] !== "string" || !REVISION.test(a["definition_revision"]))) {
    throw new Refusal("invalid_field", "agent.definition_revision", "agent.definition_revision must be sha256:<64 hex> or null");
  }
  if (!Array.isArray(a["aliases"])) throw new Refusal("invalid_field", "agent.aliases", "agent.aliases must be a list");
  if (a["aliases"].length > MAX_ALIASES) throw new Refusal("invalid_field", "agent.aliases", `agent.aliases carries at most ${MAX_ALIASES} entries`);
  const aliases: AgentAlias[] = a["aliases"].map((item: unknown, i) => {
    const field = `agent.aliases.${i}`;
    const alias = closed(item, field, ["value", "context"]);
    return { value: nonEmptyLine(alias["value"], `${field}.value`), context: oneOf(alias["context"], ALIAS_CONTEXTS, `${field}.context`) };
  });
  return {
    ref: a["ref"],
    slug: line(a["slug"], "agent.slug", true),
    name: line(a["name"], "agent.name", true),
    origin: a["origin"],
    definition_revision: a["definition_revision"],
    aliases,
  };
}

function repository(value: unknown): RepositoryInfo {
  const r = closed(value, "repository", ["root", "name", "remote"]);
  let remote: RepositoryInfo["remote"] = null;
  if (r["remote"] !== null) {
    const rem = closed(r["remote"], "repository.remote", ["provider", "url"]);
    if (typeof rem["url"] !== "string") throw new Refusal("invalid_field", "repository.remote.url", "repository.remote.url must be a string");
    remote = { provider: oneOf(rem["provider"], ["github", "ado", "other"] as const, "repository.remote.provider"), url: rem["url"] };
  }
  return { root: nonEmpty(r["root"], "repository.root"), name: nonEmptyLine(r["name"], "repository.name"), remote };
}

function checkout(value: unknown): CheckoutInfo {
  const c = closed(value, "checkout", ["path", "branch", "linked_worktree"]);
  if (typeof c["linked_worktree"] !== "boolean") {
    throw new Refusal("invalid_field", "checkout.linked_worktree", "checkout.linked_worktree must be true or false");
  }
  return { path: nonEmpty(c["path"], "checkout.path"), branch: line(c["branch"], "checkout.branch", true), linked_worktree: c["linked_worktree"] };
}

function requiredActions(value: unknown): RequiredAction[] {
  if (!Array.isArray(value)) throw new Refusal("invalid_field", "required_actions", "required_actions must be a list");
  if (value.length > MAX_REQUIRED_ACTIONS) {
    throw new Refusal("too_many_lines", "required_actions", `required_actions carries at most ${MAX_REQUIRED_ACTIONS} lines; ${value.length} were sent`);
  }
  return value.map((item: unknown, i) => {
    const field = `required_actions.${i}`;
    const n = closed(item, field, ["action", "reason"]);
    return { action: nonEmptyLine(n["action"], `${field}.action`), reason: line(n["reason"], `${field}.reason`, true) };
  });
}

function refuse<T>(fn: () => T): Validated<T> {
  try {
    return { ok: true, value: fn() };
  } catch (error) {
    if (error instanceof Refusal) {
      return error.field === undefined
        ? { ok: false, code: error.code, message: error.message }
        : { ok: false, code: error.code, field: error.field, message: error.message };
    }
    throw error;
  }
}

/** The body of `POST /v0/sessions/report`, normalized. */
export function validateReport(value: unknown): Validated<ReportBody> {
  return refuse(() => {
    const b = closed(value, undefined, ["status", "harness", "agent", "repository", "checkout"], ["spell", "task", "message", "required_actions"]);
    if (b["status"] === "done") {
      throw new Refusal("invalid_field", "status", "status done is set by ending a session: use POST /v0/sessions/end (spell presence end)");
    }
    const out: ReportBody = {
      status: oneOf<ReportStatus>(b["status"], REPORT_STATUSES, "status"),
      harness: oneOf<Harness>(b["harness"], HARNESSES, "harness"),
      agent: agent(b["agent"]),
      repository: repository(b["repository"]),
      checkout: checkout(b["checkout"]),
    };
    for (const key of ["spell", "task", "message"] as const) {
      if (key in b) out[key] = line(b[key], key, true);
    }
    if ("required_actions" in b) out.required_actions = requiredActions(b["required_actions"]);
    return out;
  });
}

/** The body of `POST /v0/sessions/end`. */
export function validateEnd(value: unknown): Validated<EndBody> {
  return refuse(() => {
    const b = closed(value, undefined, ["checkout"]);
    const c = closed(b["checkout"], "checkout", ["path"]);
    return { checkout: { path: nonEmpty(c["path"], "checkout.path") } };
  });
}
