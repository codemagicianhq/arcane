import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { spawnSync } from "node:child_process";
import { createServer, type IncomingMessage, type Server, type ServerResponse } from "node:http";
import type { AddressInfo } from "node:net";
import { callPresence, pidAlive, resolveEndpoint, send } from "../src/modules/presence/client.js";
import { PRESENCE_ENV } from "../src/modules/presence/types.js";
import { createFixtureDir, removeFixtureDir } from "./helpers/fixture-dir.js";
import { recordService, testToken } from "./helpers/presence.js";

let home: string;
let server: Server;
let port: number;
let handler: (req: IncomingMessage, res: ServerResponse) => void;
let seen: Array<{ method?: string; url?: string; auth?: string; body: string }>;

beforeEach(async () => {
  home = await createFixtureDir("presence-client");
  seen = [];
  handler = (_req, res) => {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end('{"ok":true}');
  };
  server = createServer((req, res) => {
    const chunks: Buffer[] = [];
    req.on("data", (c: Buffer) => chunks.push(c));
    req.on("end", () => {
      seen.push({ method: req.method, url: req.url, auth: req.headers.authorization, body: Buffer.concat(chunks).toString("utf8") });
      handler(req, res);
    });
  });
  await new Promise<void>((r) => server.listen(0, "127.0.0.1", r));
  port = (server.address() as AddressInfo).port;
});
afterEach(async () => {
  server.closeAllConnections();
  await new Promise<void>((r) => server.close(() => r()));
  await removeFixtureDir(home);
});

describe("pidAlive", () => {
  it("is true for this process and false for an exited one", () => {
    expect(pidAlive(process.pid)).toBe(true);
    expect(pidAlive(spawnSync(process.execPath, ["-e", ""]).pid)).toBe(false);
  });
});

describe("resolveEndpoint (architecture D15)", () => {
  it("is null with no record, with a dead pid, and with no token", () => {
    expect(resolveEndpoint({ home, env: {} })).toBeNull();
    recordService(home, port, { pid: spawnSync(process.execPath, ["-e", ""]).pid });
    expect(resolveEndpoint({ home, env: {} })).toBeNull();
    recordService(home, port, { token: "" });
    expect(resolveEndpoint({ home, env: {} })).toBeNull();
  });

  it("takes the token from the variable before the file", () => {
    recordService(home, port);
    expect(resolveEndpoint({ home, env: {} })?.token).toBe(testToken);
    expect(resolveEndpoint({ home, env: { [PRESENCE_ENV.token]: "from-the-variable" } })?.token).toBe("from-the-variable");
  });
});

describe("send and callPresence", () => {
  it("sends the bearer header and the JSON body to 127.0.0.1", async () => {
    recordService(home, port, { url: "http://198.51.100.7:9" });
    const result = await callPresence("POST", "/v0/sessions/report", { a: 1 }, { home, env: {} });
    expect(result).toEqual({ kind: "ok", status: 200, body: { ok: true } });
    expect(seen).toEqual([{ method: "POST", url: "/v0/sessions/report", auth: `Bearer ${testToken}`, body: '{"a":1}' }]);
  });

  it("maps 401, 400, 404 and 413 to refused with the error's code and field", async () => {
    for (const status of [401, 400, 404, 413]) {
      handler = (_req, res) => {
        res.writeHead(status, { "Content-Type": "application/json" });
        res.end(status === 401 ? "" : JSON.stringify({ error: { code: "c", field: "f", message: "m" } }));
      };
      const result = await send(port, testToken, "GET", "/v0/health", undefined);
      expect(result).toEqual(status === 401 ? { kind: "refused", status, code: null, field: null } : { kind: "refused", status, code: "c", field: "f" });
    }
  });

  it("treats a 5xx, a 2xx that is not JSON, and a refused connection as unreachable", async () => {
    handler = (_req, res) => {
      res.writeHead(500);
      res.end("boom");
    };
    expect(await send(port, testToken, "GET", "/v0/health", undefined)).toEqual({ kind: "unreachable" });
    handler = (_req, res) => {
      res.writeHead(200);
      res.end("not json");
    };
    expect(await send(port, testToken, "GET", "/v0/health", undefined)).toEqual({ kind: "unreachable" });
    expect(await send(1, testToken, "GET", "/v0/health", undefined)).toEqual({ kind: "unreachable" });
  });

  it("gives up on a service that never answers within its deadline", async () => {
    handler = () => undefined;
    const started = Date.now();
    expect(await send(port, testToken, "GET", "/v0/health", undefined, { connectTimeoutMs: 100, responseTimeoutMs: 100 })).toEqual({ kind: "unreachable" });
    expect(Date.now() - started).toBeLessThan(1_000);
  });

  it("is not-configured without a recorded service", async () => {
    expect(await callPresence("GET", "/v0/health", undefined, { home, env: {} })).toEqual({ kind: "not-configured" });
    expect(seen).toEqual([]);
  });
});
