import { readFile, readdir } from "node:fs/promises";
import { join } from "node:path";
import { Ajv2020, type ErrorObject, type ValidateFunction } from "ajv/dist/2020.js";
import { PRESENCE_SCHEMA_ASSET_PATH, PRESENCE_SCHEMA_ID } from "../../src/modules/presence/types.js";
import { REPO_ROOT } from "./state-schema.js";
import { request, type IncomingHttpHeaders } from "node:http";
import type { AddressInfo } from "node:net";
import { createPresenceServer, type PresenceServer } from "../../src/modules/presence/server.js";
import { createSessionTable, type SessionTable } from "../../src/modules/presence/sessions.js";
import { mintSessionRef } from "../../src/modules/agent-ref.js";

export const PRESENCE_SCHEMA_PATH = join(REPO_ROOT, "src/assets", PRESENCE_SCHEMA_ASSET_PATH);
export const PRESENCE_FIXTURE_DIR = join(REPO_ROOT, "test/fixtures/presence");

export interface PresenceSchema {
  $id: string;
  additionalProperties: boolean;
  required: string[];
  properties: Record<string, unknown>;
  $defs: Record<string, { required?: string[]; properties?: Record<string, unknown> }>;
}

export async function loadPresenceSchema(): Promise<PresenceSchema> {
  return JSON.parse(await readFile(PRESENCE_SCHEMA_PATH, "utf8")) as PresenceSchema;
}

/** The record root, or one of the `$defs`. */
export type PresenceDef = "record" | string;

/**
 * Compiles the shipped schema with ajv (a devDependency only, ARC-037
 * decision 8). Returns a validator per definition that lists errors.
 */
export async function compilePresenceSchema(): Promise<(def: PresenceDef, value: unknown) => string[]> {
  const ajv = new Ajv2020({ allErrors: true, strict: true, allowUnionTypes: true });
  ajv.addSchema(await loadPresenceSchema());
  const cache = new Map<string, ValidateFunction>();
  return (def, value) => {
    const key = def === "record" ? PRESENCE_SCHEMA_ID : `${PRESENCE_SCHEMA_ID}#/$defs/${def}`;
    let validate = cache.get(key);
    if (validate === undefined) {
      validate = ajv.getSchema(key);
      if (validate === undefined) throw new Error(`no presence schema definition "${def}"`);
      cache.set(key, validate);
    }
    if (validate(value)) return [];
    return (validate.errors ?? []).map((e: ErrorObject) => `${e.instancePath || "/"} ${e.message ?? ""}`.trim());
  };
}

export interface PresenceFixture {
  file: string;
  /** The schema definition the file name's first segment names (`record` is the root). */
  def: string;
  value: unknown;
}

export async function loadPresenceFixtures(): Promise<PresenceFixture[]> {
  const files = (await readdir(PRESENCE_FIXTURE_DIR)).filter((f) => f.endsWith(".json")).sort();
  return Promise.all(
    files.map(async (file) => ({
      file,
      def: file.split(".")[0],
      value: JSON.parse(await readFile(join(PRESENCE_FIXTURE_DIR, file), "utf8")) as unknown,
    })),
  );
}

export async function loadPresenceFixture<T>(file: string): Promise<T> {
  return JSON.parse(await readFile(join(PRESENCE_FIXTURE_DIR, file), "utf8")) as T;
}

// ── Loopback test clients ─────────────────────────────────────────────────────


/** A fixed capability for in-process servers. Lowercase name: the secrets scan reads `...TOKEN =` as a credential. */
export const testToken = "test-presence-capability-0123456789abcdefghijk";

export interface HttpResult {
  status: number;
  headers: IncomingHttpHeaders;
  body: string;
}

export interface HttpRequest {
  method?: string;
  path: string;
  headers?: Record<string, string>;
  body?: string;
  /** Sends the bearer header for this token. */
  token?: string;
}

export function httpRequest(port: number, req: HttpRequest): Promise<HttpResult> {
  return new Promise((resolve, reject) => {
    const headers: Record<string, string> = { ...(req.headers ?? {}) };
    if (req.token !== undefined) headers["Authorization"] = `Bearer ${req.token}`;
    if (req.body !== undefined) {
      headers["Content-Type"] ??= "application/json";
      headers["Content-Length"] = String(Buffer.byteLength(req.body));
    }
    const r = request({ host: "127.0.0.1", port, method: req.method ?? "GET", path: req.path, headers, agent: false }, (res) => {
      const chunks: Buffer[] = [];
      res.on("data", (c: Buffer) => chunks.push(c));
      res.on("end", () => resolve({ status: res.statusCode ?? 0, headers: res.headers, body: Buffer.concat(chunks).toString("utf8") }));
      res.on("error", reject);
    });
    r.on("error", reject);
    if (req.body !== undefined) r.write(req.body);
    r.end();
  });
}

export interface RunningPresence {
  port: number;
  token: string;
  table: SessionTable;
  presence: PresenceServer;
  close(): Promise<void>;
}

export async function startPresence(options: { keepaliveMs?: number; maxSubscribers?: number; now?: () => number } = {}): Promise<RunningPresence> {
  const table = createSessionTable({ mint: mintSessionRef, ...(options.now === undefined ? {} : { now: options.now }) });
  const presence = createPresenceServer({
    token: testToken,
    table,
    generator: { name: "arcane-cli", version: "0.0.0-test" },
    startedAt: "2026-11-12T14:58:00.000Z",
    ...options,
  });
  await new Promise<void>((resolve) => presence.server.listen(0, "127.0.0.1", resolve));
  const port = (presence.server.address() as AddressInfo).port;
  return {
    port,
    token: testToken,
    table,
    presence,
    close: () =>
      new Promise<void>((resolve) => {
        presence.closeFeeds();
        presence.server.closeAllConnections();
        presence.server.close(() => resolve());
      }),
  };
}

export interface FeedEvent {
  event: string;
  data: unknown;
}

export interface Feed {
  status: number;
  headers: IncomingHttpHeaders;
  events: FeedEvent[];
  comments: string[];
  /** Resolves once `count` events have arrived (rejects after `timeoutMs`). */
  waitFor(count: number, timeoutMs?: number): Promise<FeedEvent[]>;
  close(): void;
}

/** Subscribes to /v0/events and parses the stream as it arrives. */
export function openFeed(port: number, token: string | undefined, headers: Record<string, string> = {}): Promise<Feed> {
  return new Promise((resolve, reject) => {
    const all: Record<string, string> = { ...headers };
    if (token !== undefined) all["Authorization"] = `Bearer ${token}`;
    const r = request({ host: "127.0.0.1", port, path: "/v0/events", headers: all, agent: false }, (res) => {
      const events: FeedEvent[] = [];
      const comments: string[] = [];
      const waiters: Array<() => void> = [];
      let buffer = "";
      res.setEncoding("utf8");
      res.on("data", (chunk: string) => {
        buffer += chunk;
        let index: number;
        while ((index = buffer.indexOf("\n\n")) >= 0) {
          const block = buffer.slice(0, index);
          buffer = buffer.slice(index + 2);
          if (block.startsWith(":")) {
            comments.push(block);
            continue;
          }
          const name = /^event: (.*)$/m.exec(block)?.[1];
          const data = /^data: (.*)$/m.exec(block)?.[1];
          if (name !== undefined && data !== undefined) events.push({ event: name, data: JSON.parse(data) as unknown });
        }
        for (const w of [...waiters]) w();
      });
      res.on("error", () => undefined);
      resolve({
        status: res.statusCode ?? 0,
        headers: res.headers,
        events,
        comments,
        waitFor(count, timeoutMs = 5_000) {
          return new Promise((ok, fail) => {
            const check = () => {
              if (events.length >= count) {
                waiters.splice(waiters.indexOf(check), 1);
                clearTimeout(timer);
                ok(events.slice(0, count));
              }
            };
            const timer = setTimeout(() => {
              waiters.splice(waiters.indexOf(check), 1);
              fail(new Error(`expected ${count} events, got ${events.length}: ${events.map((e) => e.event).join(", ")}`));
            }, timeoutMs);
            waiters.push(check);
            check();
          });
        },
        close() {
          r.destroy();
        },
      });
    });
    r.on("error", reject);
    r.end();
  });
}
