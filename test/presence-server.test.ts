import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { checkBearer } from "../src/modules/presence/auth.js";
import { logEvent, setLogSink } from "../src/modules/presence/log.js";
import { PRESENCE_ROUTES } from "../src/modules/presence/server.js";
import { request } from "node:http";
import { MAX_BODY_BYTES, MAX_SESSIONS, type SessionRecord } from "../src/modules/presence/types.js";
import { REPO_ROOT } from "./helpers/state-schema.js";
import { compilePresenceSchema, httpRequest, loadPresenceFixture, startPresence, type HttpResult, type RunningPresence } from "./helpers/presence.js";

let svc: RunningPresence;
beforeEach(async () => {
  svc = await startPresence();
});
afterEach(async () => {
  await svc.close();
});

const ALL_PATHS = ["/v0/health", "/v0/sessions/report", "/v0/sessions/end", "/v0/sessions", "/v0/sessions/arcane:session:019a4b10-2c3d-7e4f-8a9b-0c1d2e3f4a5b", "/v0/events", "/", "/v1/health", "/v0/unknown"];
const METHODS = ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"];

function corsHeaders(res: HttpResult): string[] {
  return Object.keys(res.headers).filter((h) => h.toLowerCase().startsWith("access-control-"));
}

async function report(body: unknown, token = svc.token): Promise<HttpResult> {
  return httpRequest(svc.port, { method: "POST", path: "/v0/sessions/report", token, body: JSON.stringify(body) });
}

describe("authentication runs first (PC-03, ARC-060 decision 3; threat-model control 2)", () => {
  it("answers 401 with an empty body to every method and path without the token, with a wrong one, and with another scheme", async () => {
    const variants: Array<Record<string, string>> = [{}, { Authorization: "Bearer wrong-token-value" }, { Authorization: `Basic ${svc.token}` }, { Authorization: `bearer ${svc.token}` }, { Authorization: `Bearer ${svc.token} extra` }];
    for (const path of ALL_PATHS) {
      for (const method of METHODS) {
        for (const headers of variants) {
          const res = await httpRequest(svc.port, { method, path, headers });
          expect({ path, method, status: res.status, body: res.body }).toEqual({ path, method, status: 401, body: "" });
          expect(res.headers["www-authenticate"]).toBe("Bearer");
          expect(corsHeaders(res)).toEqual([]);
        }
      }
    }
  });

  it("answers every route with the right token", async () => {
    expect((await httpRequest(svc.port, { path: "/v0/health", token: svc.token })).status).toBe(200);
    expect((await httpRequest(svc.port, { path: "/v0/sessions", token: svc.token })).status).toBe(200);
    expect((await httpRequest(svc.port, { path: "/v0/nothing", token: svc.token })).status).toBe(404);
    const wrongMethod = await httpRequest(svc.port, { method: "GET", path: "/v0/sessions/report", token: svc.token });
    expect(wrongMethod.status).toBe(405);
    expect(wrongMethod.headers["allow"]).toBe("POST");
    expect((await httpRequest(svc.port, { method: "DELETE", path: "/v0/health", token: svc.token })).headers["allow"]).toBe("GET");
  });
});

describe("browser and DNS-rebinding reach (PC-03; threat-model control 5)", () => {
  it("a foreign Host header without the token is 401; with it, the request succeeds (there is no Host check)", async () => {
    expect((await httpRequest(svc.port, { path: "/v0/health", headers: { Host: "attacker.example" } })).status).toBe(401);
    expect((await httpRequest(svc.port, { path: "/v0/health", headers: { Host: "attacker.example" }, token: svc.token })).status).toBe(200);
  });

  it("a preflight is 401 with no CORS header, and an Origin with the token gets no CORS header", async () => {
    const preflight = await httpRequest(svc.port, {
      method: "OPTIONS",
      path: "/v0/sessions",
      headers: { Origin: "https://attacker.example", "Access-Control-Request-Method": "GET", "Access-Control-Request-Headers": "authorization" },
    });
    expect(preflight.status).toBe(401);
    expect(corsHeaders(preflight)).toEqual([]);
    for (const path of ["/v0/health", "/v0/sessions", "/v0/nothing"]) {
      const res = await httpRequest(svc.port, { path, headers: { Origin: "https://attacker.example" }, token: svc.token });
      expect(corsHeaders(res)).toEqual([]);
    }
  });

  it("never reads a token from a query string or a cookie", async () => {
    expect((await httpRequest(svc.port, { path: `/v0/health?token=${svc.token}` })).status).toBe(401);
    expect((await httpRequest(svc.port, { path: `/v0/health?access_token=${svc.token}` })).status).toBe(401);
    expect((await httpRequest(svc.port, { path: "/v0/health", headers: { Cookie: `token=${svc.token}` } })).status).toBe(401);
  });
});

describe("limits (PC-03; threat-model control 10)", () => {
  it("answers 413 to a body one byte over the cap and keeps serving", async () => {
    const body = "x".repeat(MAX_BODY_BYTES + 1);
    const res = await httpRequest(svc.port, { method: "POST", path: "/v0/sessions/report", token: svc.token, body });
    expect(res.status).toBe(413);
    expect((await httpRequest(svc.port, { path: "/v0/health", token: svc.token })).status).toBe(200);
  });

  it("answers 413 to a chunked body that grows past the cap without a Content-Length", async () => {
    const res = await new Promise<number>((resolve, reject) => {
      const req = request(
        { host: "127.0.0.1", port: svc.port, method: "POST", path: "/v0/sessions/report", headers: { Authorization: `Bearer ${svc.token}`, "Transfer-Encoding": "chunked" }, agent: false },
        (r) => {
          r.resume();
          resolve(r.statusCode ?? 0);
        },
      );
      req.on("error", reject);
      for (let i = 0; i < 70; i += 1) req.write("x".repeat(1024));
      req.end();
    });
    expect(res).toBe(413);
    expect((await httpRequest(svc.port, { path: "/v0/health", token: svc.token })).status).toBe(200);
  });

  it("refuses a report that would mint session 257 with 503, and still updates an existing one (review of PR #435)", async () => {
    const full = await loadPresenceFixture<Record<string, unknown>>("report.full.json");
    const checkout = full["checkout"] as Record<string, unknown>;
    for (let i = 0; i < MAX_SESSIONS; i += 1) svc.table.report({ ...(full as object), checkout: { ...checkout, path: `/c/${i}` } } as never);
    const refused = await report({ ...full, checkout: { ...checkout, path: "/c/one-more" } });
    expect(refused.status).toBe(503);
    expect((JSON.parse(refused.body) as { error: { code: string } }).error.code).toBe("too_many_sessions");
    expect((await report({ ...full, checkout: { ...checkout, path: "/c/0" } })).status).toBe(200);
  });

  it("answers 400 invalid_json to a body that is not JSON, and 400 naming the field for a bad status", async () => {
    const notJson = await httpRequest(svc.port, { method: "POST", path: "/v0/sessions/report", token: svc.token, body: "{" });
    expect(notJson.status).toBe(400);
    expect(JSON.parse(notJson.body)).toEqual({ error: { code: "invalid_json", message: "the body is not valid JSON" } });
    const full = await loadPresenceFixture<Record<string, unknown>>("report.full.json");
    const bad = await report({ ...full, status: "thinking" });
    expect(bad.status).toBe(400);
    expect((JSON.parse(bad.body) as { error: { field: string } }).error.field).toBe("status");
  });

  it("sets the connection limits", () => {
    expect(svc.presence.server.maxConnections).toBe(128);
    expect(svc.presence.server.headersTimeout).toBe(5_000);
    expect(svc.presence.server.requestTimeout).toBe(10_000);
  });
});

describe("the JSON routes (PC-03, PC-04)", () => {
  it("report answers 201 then 200; end answers 200 then 404; a session is readable by reference", async () => {
    const validate = await compilePresenceSchema();
    const full = await loadPresenceFixture<Record<string, unknown>>("report.full.json");
    const created = await report(full);
    expect(created.status).toBe(201);
    const record = JSON.parse(created.body) as SessionRecord;
    expect(validate("record", record)).toEqual([]);
    expect((await report(full)).status).toBe(200);

    const one = await httpRequest(svc.port, { path: `/v0/sessions/${record.session}`, token: svc.token });
    expect(one.status).toBe(200);
    expect((JSON.parse(one.body) as SessionRecord).session).toBe(record.session);

    const snapshot = await httpRequest(svc.port, { path: "/v0/sessions", token: svc.token });
    const doc = JSON.parse(snapshot.body) as unknown;
    expect(validate("snapshot", doc)).toEqual([]);

    const end = { checkout: { path: record.checkout.path } };
    const ended = await httpRequest(svc.port, { method: "POST", path: "/v0/sessions/end", token: svc.token, body: JSON.stringify(end) });
    expect(ended.status).toBe(200);
    expect((JSON.parse(ended.body) as SessionRecord).status).toBe("done");
    const again = await httpRequest(svc.port, { method: "POST", path: "/v0/sessions/end", token: svc.token, body: JSON.stringify(end) });
    expect(again.status).toBe(404);
    expect((await httpRequest(svc.port, { path: `/v0/sessions/${record.session}`, token: svc.token })).status).toBe(404);
  });

  it("answers 404 to a malformed or foreign reference", async () => {
    for (const seg of ["nope", "arcane:agent:019a3f2c-7b1e-7d4a-9c0b-3e5f6a7b8c9d", "%E0%A4%A", "arcane:session:019a4b10-2c3d-7e4f-8a9b-0c1d2e3f4a5b"]) {
      expect((await httpRequest(svc.port, { path: `/v0/sessions/${seg}`, token: svc.token })).status).toBe(404);
    }
  });

  it("answers 400 to a bad end body", async () => {
    const res = await httpRequest(svc.port, { method: "POST", path: "/v0/sessions/end", token: svc.token, body: JSON.stringify({ path: "/x" }) });
    expect(res.status).toBe(400);
  });

  it("health carries the contract, the generator, the descriptor and the count, and validates", async () => {
    const validate = await compilePresenceSchema();
    const res = await httpRequest(svc.port, { path: "/v0/health", token: svc.token });
    const doc = JSON.parse(res.body) as { capabilities: unknown; sessions: number; contract: string };
    expect(validate("health", doc)).toEqual([]);
    expect(doc.capabilities).toEqual({ observe: true, actions: [] });
    expect(doc.contract).toBe("v0");
    expect(doc.sessions).toBe(0);
    expect(res.headers["content-type"]).toBe("application/json; charset=utf-8");
    expect(res.headers["cache-control"]).toBe("no-store");
    expect(res.headers["x-content-type-options"]).toBe("nosniff");
  });

  it("the snapshot envelope declares the same descriptor (PC-10)", async () => {
    const res = await httpRequest(svc.port, { path: "/v0/sessions", token: svc.token });
    expect((JSON.parse(res.body) as { capabilities: unknown }).capabilities).toEqual({ observe: true, actions: [] });
  });
});

describe("the route table is exactly ARC-060 decision 3's six routes (threat-model control 8)", () => {
  it("lists six routes, all under /v0/, and nothing that acts", () => {
    expect(PRESENCE_ROUTES.map(([m, p]) => `${m} ${p}`)).toEqual([
      "GET /v0/health",
      "POST /v0/sessions/report",
      "POST /v0/sessions/end",
      "GET /v0/sessions",
      "GET /v0/sessions/{session}",
      "GET /v0/events",
    ]);
  });
});

describe("checkBearer (PC-06; 95% tier)", () => {
  it("accepts only the exact header for the exact token, and never throws", () => {
    const token = "abcdefghijklmnopqrstuvwxyz0123456789ABCDEFG";
    expect(checkBearer(`Bearer ${token}`, token)).toBe(true);
    for (const header of [undefined, null, 7, "", "Bearer", "Bearer ", `Bearer ${token}x`, `Bearer ${token.slice(1)}`, `bearer ${token}`, `Bearer  ${token}`, [`Bearer ${token}`]]) {
      expect(checkBearer(header, token)).toBe(false);
    }
    expect(checkBearer("Bearer x", "")).toBe(false);
  });
});

describe("the logger (PC-12; threat-model control 12)", () => {
  it("has exactly three parameters and logs only an event name, a reference and a status", async () => {
    expect(logEvent.length).toBe(3);
    const lines: string[] = [];
    const previous = setLogSink((l) => lines.push(l));
    try {
      const full = await loadPresenceFixture<Record<string, unknown>>("report.full.json");
      const marker = "PRIVATE-MARKER-ordovica-undisclosed-partner";
      const body = { ...full, task: marker, message: marker, needs_you: [{ action: marker, reason: marker }] };
      const created = JSON.parse((await report(body)).body) as SessionRecord;
      await report({ ...body, status: "working" });
      await httpRequest(svc.port, { method: "POST", path: "/v0/sessions/end", token: svc.token, body: JSON.stringify({ checkout: { path: created.checkout.path } }) });
      expect(lines).toHaveLength(3);
      for (const line of lines) {
        expect(line).not.toContain(marker);
        expect(line).not.toContain(created.checkout.path);
        expect(line).not.toContain(svc.token);
        expect(line).toMatch(/^\S+ presence session\.[a-z_]+ arcane:session:[0-9a-f-]{36} [a-z]+$/);
      }
      logEvent("anything with spaces", "not a ref", "Bad Status");
      expect(lines.at(-1)).toMatch(/ presence - - -$/);
    } finally {
      setLogSink(previous);
    }
  });
});

describe("the service side does no execution and no outbound request (architecture D1; threat-model controls 11 and 15)", () => {
  it("server.ts, auth.ts and log.ts import nothing that runs a process, reads a repository or dials out", async () => {
    for (const file of ["server.ts", "auth.ts", "log.ts"]) {
      const source = await readFile(join(REPO_ROOT, "src/modules/presence", file), "utf8");
      const imports = [...source.matchAll(/from "([^"]+)";/g)].map((m) => m[1]);
      for (const forbidden of ["node:child_process", "../git.js", "../manifest.js", "../agents.js", "./client.js", "./reporter.js", "node:https", "node:net"]) {
        expect({ file, forbidden, present: imports.includes(forbidden) }).toEqual({ file, forbidden, present: false });
      }
      expect(source).not.toMatch(/\brequest\(|\bfetch\(|\.connect\(/);
    }
  });
});
