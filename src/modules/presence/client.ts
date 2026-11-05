/**
 * The loopback client every presence caller shares: the reporter, `status`,
 * `stop` and the MCP server (architecture D15).
 *
 * - The token is only ever sent to 127.0.0.1. The port comes from
 *   server.json; its `url` is display text and is never dialled, so a
 *   rewritten server.json cannot send the token off the machine.
 * - A server.json whose pid is not alive is treated as no channel at all, so
 *   a crashed service's port is not handed the token by the next reporter.
 * - One round trip, with short deadlines: 1 s to connect, 1.5 s for the answer.
 */

import { request } from "node:http";
import { readServerInfo, readToken, type StoreOptions } from "./store.js";
import { LOOPBACK_HOST, type ServerInfo } from "./types.js";

export const CONNECT_TIMEOUT_MS = 1_000;
export const RESPONSE_TIMEOUT_MS = 1_500;

export type ClientResult =
  | { kind: "not-configured" }
  | { kind: "unreachable" }
  | { kind: "refused"; status: number; code: string | null; field: string | null }
  | { kind: "ok"; status: number; body: unknown };

export interface ClientOptions extends StoreOptions {
  env?: NodeJS.ProcessEnv;
  connectTimeoutMs?: number;
  responseTimeoutMs?: number;
}

/**
 * True when a process with this pid exists and this account may signal it.
 * EPERM (the pid belongs to another account) counts as not alive: the
 * service always runs as the reporter's own account, so such a pid can never
 * be it, and treating it as alive would hand the token to whatever now holds
 * the recorded port.
 */
export function pidAlive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

export interface Endpoint {
  info: ServerInfo;
  token: string;
}

/** The recorded, live service and the token to open it, or null when no channel is configured. */
export function resolveEndpoint(options: ClientOptions = {}): Endpoint | null {
  const info = readServerInfo(options);
  if (info === null || !pidAlive(info.pid)) return null;
  const token = readToken({ ...options, env: options.env ?? process.env });
  if (token === null) return null;
  return { info, token };
}

function errorFields(body: unknown): { code: string | null; field: string | null } {
  const e = (body as { error?: { code?: unknown; field?: unknown } } | null)?.error;
  return { code: typeof e?.code === "string" ? e.code : null, field: typeof e?.field === "string" ? e.field : null };
}

/** One request to the service at `port` on loopback. */
export function send(port: number, token: string, method: string, path: string, body: unknown, options: ClientOptions = {}): Promise<ClientResult> {
  const connectTimeout = options.connectTimeoutMs ?? CONNECT_TIMEOUT_MS;
  const responseTimeout = options.responseTimeoutMs ?? RESPONSE_TIMEOUT_MS;
  const payload = body === undefined ? undefined : JSON.stringify(body);
  return new Promise((resolve) => {
    let settled = false;
    const done = (result: ClientResult) => {
      if (settled) return;
      settled = true;
      clearTimeout(connectTimer);
      clearTimeout(responseTimer);
      resolve(result);
    };
    const headers: Record<string, string | number> = { Authorization: `Bearer ${token}`, Accept: "application/json" };
    if (payload !== undefined) {
      headers["Content-Type"] = "application/json";
      headers["Content-Length"] = Buffer.byteLength(payload);
    }
    const req = request({ host: LOOPBACK_HOST, port, method, path, headers, agent: false }, (res) => {
      const chunks: Buffer[] = [];
      res.on("data", (c: Buffer) => chunks.push(c));
      res.on("error", () => done({ kind: "unreachable" }));
      res.on("end", () => {
        const status = res.statusCode ?? 0;
        const text = Buffer.concat(chunks).toString("utf8");
        let parsed: unknown = null;
        try {
          parsed = text.length > 0 ? (JSON.parse(text) as unknown) : null;
        } catch {
          parsed = null;
        }
        if (status >= 200 && status < 300 && parsed !== null) done({ kind: "ok", status, body: parsed });
        else if (status === 401 || status === 400 || status === 404 || status === 413) done({ kind: "refused", status, ...errorFields(parsed) });
        else done({ kind: "unreachable" });
      });
    });
    const connectTimer = setTimeout(() => {
      req.destroy();
      done({ kind: "unreachable" });
    }, connectTimeout);
    const responseTimer = setTimeout(() => {
      req.destroy();
      done({ kind: "unreachable" });
    }, connectTimeout + responseTimeout);
    req.on("socket", (socket) => {
      socket.once("connect", () => clearTimeout(connectTimer));
    });
    req.on("error", () => done({ kind: "unreachable" }));
    if (payload !== undefined) req.write(payload);
    req.end();
  });
}

/** Resolves the endpoint and sends one request; `not-configured` when there is no live, openable service. */
export async function callPresence(method: string, path: string, body: unknown, options: ClientOptions = {}): Promise<ClientResult> {
  const endpoint = resolveEndpoint(options);
  if (endpoint === null) return { kind: "not-configured" };
  return send(endpoint.info.port, endpoint.token, method, path, body, options);
}
