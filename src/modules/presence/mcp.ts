/**
 * `spell presence mcp`: the presence channel as an MCP server over stdio
 * (ARC-060 decision 5; architecture D17). Newline-delimited JSON-RPC 2.0,
 * hand-written: no SDK, no new dependency.
 *
 * Dual-era (MCP specification, "Versioning and Compatibility", read
 * 2026-11-05, features/presence-channel/progress.txt PS-12):
 * - Legacy clients open with `initialize`; the server answers with the
 *   client's version when it supports it, else its newest legacy version.
 * - Modern clients (2026-07-28) send the version in every request's `_meta`
 *   and may call `server/discover`; an unsupported version is error -32022
 *   listing the supported ones. Modern results carry `resultType: "complete"`.
 *
 * Resource subscriptions (PC-19; architecture D26, specification read
 * 2026-11-05) follow the era too: a legacy client calls `resources/subscribe`;
 * a modern client opens `subscriptions/listen`, whose acknowledgment and
 * updates carry its request id in `_meta`. Either era's method is -32601 in
 * the other. Updates come from one `/v0/events` feed per process, opened for
 * the first subscription and closed with the last.
 *
 * Two tools (`presence_report`, `presence_end`) and two resources
 * (`arcane://presence/sessions`, `arcane://presence/capabilities`). The tools
 * call the same reporter as the CLI, so they read only what it reads and the
 * service holds the one state. Nothing here starts the service, writes a
 * file, or writes anything to stdout that is not a protocol message.
 */

import { createInterface } from "node:readline";
import type { Readable, Writable } from "node:stream";
import { callPresence, openEventFeed, resolveEndpoint, type EventFeed } from "./client.js";
import { sendEnd, sendReport, type ReportFlags, type ReporterDeps } from "./reporter.js";
import { HARNESSES, REPORT_STATUSES, SESSION_EVENTS, type SessionRecord } from "./types.js";

export const MODERN_VERSIONS = ["2026-07-28"] as const;
export const LEGACY_VERSIONS = ["2025-11-25", "2025-06-18", "2024-11-05"] as const;
export const SUPPORTED_VERSIONS: readonly string[] = [...MODERN_VERSIONS, ...LEGACY_VERSIONS];
export const SERVER_NAME = "arcane-presence";
export const NOT_CONFIGURED_TEXT = "no presence channel is configured on this machine";
const VERSION_KEY = "io.modelcontextprotocol/protocolVersion";
const SERVER_INFO_KEY = "io.modelcontextprotocol/serverInfo";
const SUBSCRIPTION_KEY = "io.modelcontextprotocol/subscriptionId";
/** While a subscription waits on a service that is not answering, the feed is retried this often. */
export const FEED_RETRY_MS = 5_000;

export const SESSIONS_URI = "arcane://presence/sessions";
export const CAPABILITIES_URI = "arcane://presence/capabilities";

/** `subscribe` is the one addition to ARC-060 decision 5's surface (PC-19): read-only, like the feed it relays. */
const SERVER_CAPABILITIES = { tools: {}, resources: { subscribe: true } };

const LINE = { type: "string", maxLength: 256 };
export const PRESENCE_TOOLS = [
  {
    name: "presence_report",
    title: "Report presence",
    description:
      "Report this session to the local presence service (the same as `spell presence report`). " +
      "Observation only: it changes what a dashboard shows, nothing else. Answers that no channel is configured when no service runs.",
    inputSchema: {
      type: "object",
      additionalProperties: false,
      required: ["status"],
      properties: {
        status: { type: "string", enum: [...REPORT_STATUSES] },
        task: { ...LINE, description: "What the session is doing, in one line." },
        spell: { ...LINE, description: "The spell running, e.g. spell-implement." },
        message: { ...LINE, description: "A free one-line note; an empty string clears it." },
        required_actions: { type: "array", maxItems: 20, items: { type: "string" }, description: "Lines of the Now tier of an Action required block, '<action> — <reason>'." },
        agent: { type: "string", description: "The roster agent (a slug or an alias); default: the orchestrator." },
        harness: { type: "string", enum: [...HARNESSES] },
        cwd: { type: "string", description: "The checkout to report for; default: the server's working directory." },
      },
    },
  },
  {
    name: "presence_end",
    title: "End presence",
    description: "End this checkout's session on the local presence service (the same as `spell presence end`).",
    inputSchema: {
      type: "object",
      additionalProperties: false,
      properties: { cwd: { type: "string", description: "The checkout; default: the server's working directory." } },
    },
  },
] as const;

export const PRESENCE_RESOURCES = [
  { uri: SESSIONS_URI, name: "presence-sessions", title: "Presence sessions", description: "The GET /v0/sessions document: every active and stale session.", mimeType: "application/json" },
  { uri: CAPABILITIES_URI, name: "presence-capabilities", title: "Presence capabilities", description: "The capability descriptor: observation only, no actions.", mimeType: "application/json" },
] as const;

type Id = string | number | null;
interface JsonRpcError {
  code: number;
  message: string;
  data?: unknown;
}

class RpcError extends Error {
  constructor(
    readonly code: number,
    message: string,
    readonly data?: unknown,
  ) {
    super(message);
  }
}

export interface McpOptions {
  input: Readable;
  output: Writable;
  version: string;
  cwd?: string;
  deps?: ReporterDeps;
  /** Diagnostics (never stdout). */
  log?: (line: string) => void;
  /** How often a subscription retries a service that is down (tests shorten it). */
  feedRetryMs?: number;
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function text(value: string, isError = false): Record<string, unknown> {
  return { content: [{ type: "text", text: value }], isError };
}

function stringArg(args: Record<string, unknown>, key: string): string | undefined {
  const v = args[key];
  if (v === undefined) return undefined;
  if (typeof v !== "string") throw new RpcError(-32602, `${key} must be a string`);
  return v;
}

/** Serves one stdio stream until it ends. Resolves when the input closes. */
export function serveMcp(options: McpOptions): Promise<void> {
  const deps = options.deps ?? {};
  const cwd = options.cwd ?? process.cwd();
  const log = options.log ?? ((line: string) => process.stderr.write(`${line}\n`));
  const write = (message: unknown) => {
    options.output.write(`${JSON.stringify(message)}\n`);
  };
  const reply = (id: Id, result: unknown) => write({ jsonrpc: "2.0", id, result });
  const fail = (id: Id, error: JsonRpcError) => write({ jsonrpc: "2.0", id, error });

  const report = async (args: Record<string, unknown>): Promise<Record<string, unknown>> => {
    const status = stringArg(args, "status");
    if (status === undefined) return text("status is required: one of working, waiting, blocked, idle.", true);
    const needs = args["required_actions"];
    if (needs !== undefined && (!Array.isArray(needs) || needs.some((n) => typeof n !== "string"))) {
      return text("required_actions must be a list of strings.", true);
    }
    const flags: ReportFlags = { status };
    for (const key of ["task", "spell", "message", "agent", "harness"] as const) {
      const v = stringArg(args, key);
      if (v !== undefined) flags[key] = v;
    }
    if (Array.isArray(needs)) flags.requiredActions = needs as string[];
    if (resolveEndpoint(deps) === null) return text(NOT_CONFIGURED_TEXT);
    const where = stringArg(args, "cwd") ?? cwd;
    const outcome = await sendReport(where, flags, deps);
    if (outcome.kind === "refused") return text(outcome.line, true);
    if (outcome.kind === "silent") return text(`Nothing was reported: ${where} is not inside an Arcane repository, or the service did not answer.`);
    const record: SessionRecord = outcome.record;
    return { ...text(`Reported ${record.status} for ${record.session}.`), structuredContent: record };
  };

  const end = async (args: Record<string, unknown>): Promise<Record<string, unknown>> => {
    if (resolveEndpoint(deps) === null) return text(NOT_CONFIGURED_TEXT);
    const where = stringArg(args, "cwd") ?? cwd;
    const outcome = await sendEnd(where, deps);
    if (outcome.kind === "refused") return text(outcome.line, true);
    if (outcome.kind === "silent") return text(`No session was open for ${where}.`);
    return { ...text(`Ended ${outcome.record.session}.`), structuredContent: outcome.record };
  };

  const findResource = (uri: unknown) => {
    const resource = PRESENCE_RESOURCES.find((r) => r.uri === uri);
    if (resource === undefined) throw new RpcError(-32602, "Resource not found", { uri });
    return resource;
  };

  // ── Subscriptions (PC-19, architecture D26) ────────────────────────────────
  // Only the sessions resource changes; the capability descriptor is constant.
  const legacy = new Set<string>();
  const listens = new Map<string | number, string[]>();
  let pending = 0;
  let feed: EventFeed | null = null;
  let connecting: Promise<void> | null = null;
  let retry: NodeJS.Timeout | undefined;
  /** A feed attempt failed, or the feed was lost: the next one that opens is itself a change. */
  let down = false;
  let closed = false;
  const retryMs = options.feedRetryMs ?? FEED_RETRY_MS;

  const watchesSessions = () => pending > 0 || legacy.has(SESSIONS_URI) || [...listens.values()].some((uris) => uris.includes(SESSIONS_URI));

  const notifyUpdated = () => {
    if (legacy.has(SESSIONS_URI)) write({ jsonrpc: "2.0", method: "notifications/resources/updated", params: { uri: SESSIONS_URI } });
    for (const [id, uris] of listens) {
      if (uris.includes(SESSIONS_URI)) write({ jsonrpc: "2.0", method: "notifications/resources/updated", params: { _meta: { [SUBSCRIPTION_KEY]: id }, uri: SESSIONS_URI } });
    }
  };

  const releaseFeedIfIdle = () => {
    if (watchesSessions()) return;
    feed?.close();
    feed = null;
    clearTimeout(retry);
    retry = undefined;
    down = false;
  };

  const scheduleRetry = () => {
    if (retry !== undefined || closed || !watchesSessions()) return;
    retry = setTimeout(() => {
      retry = undefined;
      void ensureFeed();
    }, retryMs);
    retry.unref();
  };

  const ensureFeed = (): Promise<void> => {
    if (closed || feed !== null || !watchesSessions()) return Promise.resolve();
    if (connecting !== null) return connecting;
    connecting = openEventFeed(
      {
        onEvent: (name) => {
          if ((SESSION_EVENTS as readonly string[]).includes(name)) notifyUpdated();
        },
        onClose: () => {
          feed = null;
          if (closed || !watchesSessions()) return;
          down = true;
          notifyUpdated();
          scheduleRetry();
        },
      },
      deps,
    ).then((opened) => {
      connecting = null;
      if (opened === null) {
        down = true;
        scheduleRetry();
        return;
      }
      if (closed || !watchesSessions()) {
        opened.close();
        return;
      }
      feed = opened;
      if (down) {
        down = false;
        notifyUpdated();
      }
    });
    return connecting;
  };

  /** Legacy `resources/subscribe`: answered once the first feed attempt has settled. */
  const subscribe = async (uri: unknown): Promise<Record<string, unknown>> => {
    const resource = findResource(uri);
    if (resource.uri === SESSIONS_URI) {
      pending++;
      await ensureFeed();
      pending--;
    }
    legacy.add(resource.uri);
    return {};
  };

  const unsubscribe = (uri: unknown): Record<string, unknown> => {
    legacy.delete(findResource(uri).uri);
    releaseFeedIfIdle();
    return {};
  };

  /** Modern `subscriptions/listen`: acknowledged, then left open until cancelled or stdin ends. */
  const listen = async (id: string | number, params: Record<string, unknown>): Promise<void> => {
    if (listens.has(id)) throw new RpcError(-32602, "A subscription with this id is already open", { id });
    const filter = isObject(params["notifications"]) ? params["notifications"] : {};
    const asked = filter["resourceSubscriptions"];
    if (asked !== undefined && (!Array.isArray(asked) || asked.some((u) => typeof u !== "string"))) {
      throw new RpcError(-32602, "notifications.resourceSubscriptions must be a list of URIs");
    }
    const honored = Array.isArray(asked) && asked.includes(SESSIONS_URI) ? [SESSIONS_URI] : [];
    if (honored.length > 0) {
      pending++;
      await ensureFeed();
      pending--;
    }
    write({
      jsonrpc: "2.0",
      method: "notifications/subscriptions/acknowledged",
      params: { _meta: { [SUBSCRIPTION_KEY]: id }, notifications: honored.length > 0 ? { resourceSubscriptions: honored } : {} },
    });
    listens.set(id, honored);
  };

  const cancel = (params: Record<string, unknown>) => {
    const requestId = params["requestId"];
    if ((typeof requestId === "string" || typeof requestId === "number") && listens.delete(requestId)) releaseFeedIfIdle();
  };

  /** stdin ended: each open listen gets its completion result, then its cancellation (D26). */
  const teardown = () => {
    closed = true;
    for (const id of listens.keys()) {
      write({ jsonrpc: "2.0", id, result: { resultType: "complete", _meta: { [SUBSCRIPTION_KEY]: id } } });
      write({ jsonrpc: "2.0", method: "notifications/cancelled", params: { requestId: id, reason: "The server's input closed." } });
    }
    listens.clear();
    legacy.clear();
    feed?.close();
    feed = null;
    clearTimeout(retry);
  };

  const read = async (uri: unknown): Promise<Record<string, unknown>> => {
    const resource = findResource(uri);
    const result = await callPresence("GET", resource.uri === SESSIONS_URI ? "/v0/sessions" : "/v0/health", undefined, deps);
    if (result.kind !== "ok") return { contents: [{ uri: resource.uri, mimeType: "text/plain", text: NOT_CONFIGURED_TEXT }] };
    const body = resource.uri === SESSIONS_URI ? result.body : (result.body as { capabilities: unknown }).capabilities;
    return { contents: [{ uri: resource.uri, mimeType: "application/json", text: JSON.stringify(body) }] };
  };

  const handle = async (method: string, params: Record<string, unknown>): Promise<Record<string, unknown>> => {
    switch (method) {
      case "ping":
        return {};
      case "tools/list":
        return { tools: PRESENCE_TOOLS };
      case "tools/call": {
        const name = params["name"];
        const args = isObject(params["arguments"]) ? params["arguments"] : {};
        try {
          if (name === "presence_report") return await report(args);
          if (name === "presence_end") return await end(args);
        } catch (error) {
          // A wrong-typed argument is something the model can fix: a tool execution error, not a protocol error.
          if (error instanceof RpcError && error.code === -32602) return text(error.message, true);
          throw error;
        }
        throw new RpcError(-32602, `Unknown tool: ${String(name)}`);
      }
      case "resources/list":
        return { resources: PRESENCE_RESOURCES };
      case "resources/read":
        return read(params["uri"]);
      case "resources/subscribe":
        return subscribe(params["uri"]);
      case "resources/unsubscribe":
        return unsubscribe(params["uri"]);
      default:
        throw new RpcError(-32601, `Method not found: ${method}`);
    }
  };

  const dispatch = async (raw: string): Promise<void> => {
    let message: unknown;
    try {
      message = JSON.parse(raw);
    } catch {
      fail(null, { code: -32700, message: "Parse error" });
      return;
    }
    if (!isObject(message) || message["jsonrpc"] !== "2.0" || typeof message["method"] !== "string") {
      const id = isObject(message) && (typeof message["id"] === "string" || typeof message["id"] === "number") ? message["id"] : null;
      fail(id, { code: -32600, message: "Invalid Request" });
      return;
    }
    const method = message["method"];
    const hasId = "id" in message;
    const rawId = message["id"];
    if (hasId && rawId !== null && typeof rawId !== "string" && typeof rawId !== "number") {
      fail(null, { code: -32600, message: "Invalid Request" });
      return;
    }
    const id = (rawId ?? null) as Id;
    const params = isObject(message["params"]) ? message["params"] : {};
    if (!hasId) {
      // A notification: nothing to answer. A cancelled listen ends its subscription.
      if (method === "notifications/cancelled") cancel(params);
      return;
    }

    try {
      if (method === "initialize") {
        const requested = params["protocolVersion"];
        const protocolVersion = typeof requested === "string" && (LEGACY_VERSIONS as readonly string[]).includes(requested) ? requested : LEGACY_VERSIONS[0];
        reply(id, { protocolVersion, capabilities: SERVER_CAPABILITIES, serverInfo: { name: SERVER_NAME, version: options.version } });
        return;
      }
      const meta = isObject(params["_meta"]) ? params["_meta"] : {};
      const requested = meta[VERSION_KEY];
      const modern = typeof requested === "string" && (MODERN_VERSIONS as readonly string[]).includes(requested);
      if (requested !== undefined && (typeof requested !== "string" || !SUPPORTED_VERSIONS.includes(requested))) {
        fail(id, { code: -32022, message: "Unsupported protocol version", data: { supported: SUPPORTED_VERSIONS, requested } });
        return;
      }
      if (method === "server/discover") {
        reply(id, { resultType: "complete", supportedVersions: SUPPORTED_VERSIONS, capabilities: SERVER_CAPABILITIES, _meta: { [SERVER_INFO_KEY]: { name: SERVER_NAME, version: options.version } } });
        return;
      }
      // Subscriptions are chosen per era (D26): each era's method is unknown in the other.
      if (method === "subscriptions/listen") {
        if (!modern) throw new RpcError(-32601, `Method not found: ${method}`);
        if (id === null) throw new RpcError(-32600, "subscriptions/listen needs a request id");
        await listen(id, params);
        return;
      }
      if (modern && (method === "resources/subscribe" || method === "resources/unsubscribe")) throw new RpcError(-32601, `Method not found: ${method}`);
      const result = await handle(method, params);
      reply(id, modern ? { resultType: "complete", ...result } : result);
    } catch (error) {
      if (error instanceof RpcError) {
        fail(id, error.data === undefined ? { code: error.code, message: error.message } : { code: error.code, message: error.message, data: error.data });
      } else {
        log(`spell presence mcp: internal error on ${method}`);
        fail(id, { code: -32603, message: "Internal error" });
      }
    }
  };

  return new Promise((resolve) => {
    const lines = createInterface({ input: options.input, crlfDelay: Infinity });
    let chain = Promise.resolve();
    lines.on("line", (line) => {
      if (line.trim() === "") return;
      chain = chain.then(() => dispatch(line));
    });
    lines.on("close", () => {
      void chain.then(() => {
        teardown();
        resolve();
      });
    });
  });
}
