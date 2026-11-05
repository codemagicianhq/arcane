/**
 * The loopback HTTP surface (ARC-060 decisions 3 and 8; architecture D11, D12).
 *
 * - Authentication runs first, before routing and before any body is read:
 *   without the exact bearer header the answer is 401 with an empty body, for
 *   every method and path, so an unauthenticated caller learns nothing.
 * - Exactly six routes, all under /v0/. Observation only: none steers a session.
 * - No Access-Control-* header on any response, and no Host check (Tailscale
 *   Serve rewrites it): the token and the absence of CORS are the defence
 *   against a browser page.
 * - The caller listens: this module never chooses an address.
 *
 * This module imports no process, git, manifest or roster code and makes no
 * outbound request (threat-model controls 11 and 15).
 */

import { createServer, type IncomingMessage, type Server, type ServerResponse } from "node:http";
import { parseRef } from "../agent-ref.js";
import { checkBearer } from "./auth.js";
import { logEvent } from "./log.js";
import type { SessionTable } from "./sessions.js";
import {
  CONNECTIONS_CHECK_MS,
  HEADERS_TIMEOUT_MS,
  HELLO_EVENT,
  KEEPALIVE_MS,
  MAX_BODY_BYTES,
  MAX_CONNECTIONS,
  MAX_SESSIONS,
  MAX_SUBSCRIBER_BUFFER_BYTES,
  MAX_SUBSCRIBERS,
  PRESENCE_CONTRACT,
  REQUEST_TIMEOUT_MS,
  presenceCapabilities,
  type ErrorDocument,
  type HealthDocument,
  type HelloDocument,
  type PresenceGenerator,
  type SessionEvent,
  type SnapshotDocument,
} from "./types.js";
import { validateEnd, validateReport } from "./validate.js";

/** The whole route table (threat-model control 8): six routes, no other. */
export const PRESENCE_ROUTES = [
  ["GET", "/v0/health"],
  ["POST", "/v0/sessions/report"],
  ["POST", "/v0/sessions/end"],
  ["GET", "/v0/sessions"],
  ["GET", "/v0/sessions/{session}"],
  ["GET", "/v0/events"],
] as const;

export interface PresenceServerOptions {
  /** The bearer token, or a getter: `serve` binds before it writes the token (architecture D13). */
  token: string | (() => string);
  table: SessionTable;
  generator: PresenceGenerator;
  startedAt: string;
  now?: () => number;
  keepaliveMs?: number;
  maxSubscribers?: number;
}

export interface PresenceServer {
  server: Server;
  /** Ends every open event feed (a clean shutdown calls this before closing the server). */
  closeFeeds(): void;
  subscriberCount(): number;
}

const JSON_HEADERS = {
  "Content-Type": "application/json; charset=utf-8",
  "Cache-Control": "no-store",
  "X-Content-Type-Options": "nosniff",
};

function send(res: ServerResponse, status: number, body: unknown, extra: Record<string, string> = {}): void {
  const text = `${JSON.stringify(body)}\n`;
  res.writeHead(status, { ...JSON_HEADERS, "Content-Length": Buffer.byteLength(text), ...extra });
  res.end(text);
}

function error(res: ServerResponse, status: number, code: string, message: string, field?: string, extra: Record<string, string> = {}): void {
  const body: ErrorDocument = { error: field === undefined ? { code, message } : { code, field, message } };
  send(res, status, body, extra);
}

function unauthorized(res: ServerResponse): void {
  res.writeHead(401, { "Content-Length": 0, "WWW-Authenticate": "Bearer", "Cache-Control": "no-store", Connection: "close" });
  res.end();
}

/** Reads a body up to the cap; resolves null after answering 413 itself. */
function readBody(req: IncomingMessage, res: ServerResponse): Promise<string | null> {
  return new Promise((resolve) => {
    const tooLarge = () => {
      error(res, 413, "too_large", `bodies are limited to ${MAX_BODY_BYTES} bytes`, undefined, { Connection: "close" });
      req.resume();
      resolve(null);
    };
    const declared = Number(req.headers["content-length"] ?? "0");
    if (Number.isFinite(declared) && declared > MAX_BODY_BYTES) {
      tooLarge();
      return;
    }
    const chunks: Buffer[] = [];
    let size = 0;
    let done = false;
    req.on("data", (chunk: Buffer) => {
      if (done) return;
      size += chunk.length;
      if (size > MAX_BODY_BYTES) {
        done = true;
        tooLarge();
        return;
      }
      chunks.push(chunk);
    });
    req.on("end", () => {
      if (done) return;
      done = true;
      resolve(Buffer.concat(chunks).toString("utf8"));
    });
    req.on("error", () => {
      if (done) return;
      done = true;
      resolve(null);
    });
  });
}

function parseJson(text: string): { ok: true; value: unknown } | { ok: false } {
  try {
    return { ok: true, value: JSON.parse(text) as unknown };
  } catch {
    return { ok: false };
  }
}

type Matched = { route: (typeof PRESENCE_ROUTES)[number]; param?: string } | { allow: string[] } | null;

function match(method: string, pathname: string): Matched {
  const allow: string[] = [];
  for (const route of PRESENCE_ROUTES) {
    const [m, pattern] = route;
    let param: string | undefined;
    let hit = pattern === pathname;
    if (!hit && pattern.endsWith("/{session}")) {
      const prefix = pattern.slice(0, -"{session}".length);
      const rest = pathname.startsWith(prefix) ? pathname.slice(prefix.length) : "";
      if (rest.length > 0 && !rest.includes("/") && !PRESENCE_ROUTES.some(([, p]) => p === pathname)) {
        hit = true;
        try {
          param = decodeURIComponent(rest);
        } catch {
          param = "";
        }
      }
    }
    if (!hit) continue;
    if (m === method) return param === undefined ? { route } : { route, param };
    allow.push(m);
  }
  return allow.length > 0 ? { allow } : null;
}

export function createPresenceServer(options: PresenceServerOptions): PresenceServer {
  const now = options.now ?? Date.now;
  const keepaliveMs = options.keepaliveMs ?? KEEPALIVE_MS;
  const maxSubscribers = options.maxSubscribers ?? MAX_SUBSCRIBERS;
  const { table } = options;
  const token = typeof options.token === "function" ? options.token : (): string => options.token as string;
  const feeds = new Set<ServerResponse>();

  table.listen((e) => logEvent(e.event, e.data.session, e.data.status));

  const health = (): HealthDocument => ({
    ok: true,
    generator: options.generator,
    contract: PRESENCE_CONTRACT,
    capabilities: presenceCapabilities(),
    sessions: table.count(),
    started_at: options.startedAt,
  });

  const snapshot = (): SnapshotDocument => ({
    capabilities: presenceCapabilities(),
    generated_at: new Date(now()).toISOString(),
    sessions: table.snapshot(),
  });

  /**
   * A subscriber whose backlog is already over the cap is too slow and is
   * closed before the next event; the first write (server.hello, which can be
   * large on its own) is never judged by the cap.
   */
  const writeEvent = (res: ServerResponse, name: string, data: unknown): void => {
    if (res.writableLength > MAX_SUBSCRIBER_BUFFER_BYTES) {
      res.destroy();
      feeds.delete(res);
      return;
    }
    res.write(`event: ${name}\ndata: ${JSON.stringify(data)}\n\n`);
  };

  table.listen((e: SessionEvent) => {
    for (const feed of feeds) writeEvent(feed, e.event, e.data);
  });

  const events = (req: IncomingMessage, res: ServerResponse): void => {
    if (feeds.size >= maxSubscribers) {
      error(res, 503, "too_many_subscribers", `at most ${maxSubscribers} event feeds are served at once`, undefined, { "Retry-After": "5" });
      return;
    }
    res.writeHead(200, {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
      Connection: "keep-alive",
    });
    feeds.add(res);
    const hello: HelloDocument = { contract: PRESENCE_CONTRACT, capabilities: presenceCapabilities(), sessions: table.snapshot() };
    res.write(`event: ${HELLO_EVENT}\ndata: ${JSON.stringify(hello)}\n\n`);
    const keepalive = setInterval(() => res.write(": keepalive\n\n"), keepaliveMs);
    keepalive.unref();
    const drop = () => {
      clearInterval(keepalive);
      feeds.delete(res);
    };
    req.on("close", drop);
    res.on("close", drop);
  };

  const handle = async (req: IncomingMessage, res: ServerResponse): Promise<void> => {
    if (!checkBearer(req.headers.authorization, token())) {
      unauthorized(res);
      req.resume();
      return;
    }
    const pathname = new URL(req.url ?? "/", "http://127.0.0.1").pathname;
    const found = match(req.method ?? "GET", pathname);
    if (found === null) {
      error(res, 404, "not_found", "no such route");
      req.resume();
      return;
    }
    if ("allow" in found) {
      error(res, 405, "method_not_allowed", `use ${found.allow.join(", ")}`, undefined, { Allow: found.allow.join(", ") });
      req.resume();
      return;
    }
    const path = found.route[1];

    if (path === "/v0/health") return send(res, 200, health());
    if (path === "/v0/sessions") return send(res, 200, snapshot());
    if (path === "/v0/events") return events(req, res);
    if (path === "/v0/sessions/{session}") {
      const parsed = parseRef(found.param, "session");
      const record = parsed.ok ? table.get(found.param ?? "") : null;
      if (record === null) return error(res, 404, "not_found", "no such session");
      return send(res, 200, record);
    }

    const text = await readBody(req, res);
    if (text === null) return;
    const json = parseJson(text);
    if (!json.ok) return error(res, 400, "invalid_json", "the body is not valid JSON");

    if (path === "/v0/sessions/report") {
      const result = validateReport(json.value);
      if (!result.ok) return error(res, 400, result.code, result.message, result.field);
      const isNew = table.snapshot().every((r) => r.checkout.path !== result.value.checkout.path);
      if (isNew && table.count() >= MAX_SESSIONS) {
        return error(res, 503, "too_many_sessions", `at most ${MAX_SESSIONS} sessions are held at once`, undefined, { "Retry-After": "60" });
      }
      const { record, created } = table.report(result.value);
      return send(res, created ? 201 : 200, record);
    }
    const result = validateEnd(json.value);
    if (!result.ok) return error(res, 400, result.code, result.message, result.field);
    const ended = table.end(result.value.checkout.path);
    if (ended === null) return error(res, 404, "not_found", "no session reports from that checkout", "checkout.path");
    return send(res, 200, ended);
  };

  // headersTimeout and requestTimeout are enforced on this interval (Node's default is 30 s), so a
  // process without the token cannot hold all MAX_CONNECTIONS slots open for long.
  const server = createServer({ connectionsCheckingInterval: CONNECTIONS_CHECK_MS }, (req, res) => {
    handle(req, res).catch(() => {
      if (!res.headersSent) error(res, 500, "internal", "the service could not answer");
      else res.destroy();
    });
  });
  server.maxConnections = MAX_CONNECTIONS;
  server.headersTimeout = HEADERS_TIMEOUT_MS;
  server.requestTimeout = REQUEST_TIMEOUT_MS;

  return {
    server,
    closeFeeds() {
      for (const feed of feeds) feed.end();
      feeds.clear();
    },
    subscriberCount() {
      return feeds.size;
    },
  };
}
