import { afterEach, describe, expect, it } from "vitest";
import { TIMING_TEST_TIMEOUT } from "./helpers/timeouts.js";
import { STALE_AFTER_MS, EXPIRE_AFTER_MS, type SessionRecord } from "../src/modules/presence/types.js";
import { compilePresenceSchema, httpRequest, loadPresenceFixture, openFeed, startPresence, type Feed, type RunningPresence } from "./helpers/presence.js";

let svc: RunningPresence | undefined;
const feeds: Feed[] = [];
afterEach(async () => {
  for (const f of feeds.splice(0)) f.close();
  await svc?.close();
  svc = undefined;
});

async function feed(s: RunningPresence, headers: Record<string, string> = {}): Promise<Feed> {
  const f = await openFeed(s.port, s.token, headers);
  feeds.push(f);
  return f;
}

async function report(s: RunningPresence, extra: Record<string, unknown> = {}, path?: string): Promise<SessionRecord> {
  const base = await loadPresenceFixture<Record<string, unknown>>("report.full.json");
  const checkout = { ...(base["checkout"] as Record<string, unknown>), ...(path === undefined ? {} : { path }) };
  const res = await httpRequest(s.port, { method: "POST", path: "/v0/sessions/report", token: s.token, body: JSON.stringify({ ...base, checkout, ...extra }) });
  expect([200, 201]).toContain(res.status);
  return JSON.parse(res.body) as SessionRecord;
}

describe("the event feed (PC-08, ARC-060 decision 3)", () => {
  it("starts with server.hello carrying the existing sessions, then one event per report, in order", async () => {
    svc = await startPresence();
    const validate = await compilePresenceSchema();
    const existing = await report(svc);
    const f = await feed(svc);
    expect(f.status).toBe(200);
    expect(f.headers["content-type"]).toBe("text/event-stream; charset=utf-8");
    const [hello] = await f.waitFor(1);
    expect(hello?.event).toBe("server.hello");
    expect(validate("hello", hello?.data)).toEqual([]);
    expect((hello?.data as { sessions: SessionRecord[] }).sessions.map((r) => r.session)).toEqual([existing.session]);

    await report(svc, { task: "two" });
    await report(svc, { needs_you: [] });
    await report(svc, {}, "/home/operator/ventures/ordovica/geothermal-api-second");
    const events = await f.waitFor(4);
    expect(events.slice(1).map((e) => e.event)).toEqual(["session.updated", "session.needs_you", "session.started"]);
    for (const e of events.slice(1)) expect(validate("event", e)).toEqual([]);
    expect((events[1]?.data as SessionRecord).task).toBe("two");
  });

  it("gives a reconnecting subscriber a fresh server.hello and no replay, whatever Last-Event-ID says", async () => {
    svc = await startPresence();
    const first = await feed(svc);
    await report(svc);
    await first.waitFor(2);
    first.close();
    await report(svc, { task: "while away" });
    const again = await feed(svc, { "Last-Event-ID": "1" });
    const [hello] = await again.waitFor(1);
    expect(hello?.event).toBe("server.hello");
    const sessions = (hello?.data as { sessions: SessionRecord[] }).sessions;
    expect(sessions).toHaveLength(1);
    expect(sessions[0]?.task).toBe("while away");
    await new Promise((r) => setTimeout(r, 50));
    expect(again.events).toHaveLength(1);
  });

  it("delivers every event of a ten-report sequence, in order, to each of sixteen subscribers", async () => {
    svc = await startPresence();
    const s = svc;
    const subscribers = await Promise.all(Array.from({ length: 16 }, () => feed(s)));
    await Promise.all(subscribers.map((f) => f.waitFor(1)));
    const tasks = Array.from({ length: 10 }, (_, i) => `task ${i}`);
    for (const task of tasks) await report(s, { task });
    for (const f of subscribers) {
      const events = await f.waitFor(11);
      expect(events.slice(1).map((e) => (e.data as SessionRecord).task)).toEqual(tasks);
    }
  });

  it("refuses a thirty-third subscriber with 503 and Retry-After, and frees a slot on disconnect", async () => {
    svc = await startPresence();
    const s = svc;
    const open = await Promise.all(Array.from({ length: 32 }, () => feed(s)));
    await Promise.all(open.map((f) => f.waitFor(1)));
    const refused = await httpRequest(s.port, { path: "/v0/events", token: s.token });
    expect(refused.status).toBe(503);
    expect(refused.headers["retry-after"]).toBe("5");
    expect((JSON.parse(refused.body) as { error: { code: string } }).error.code).toBe("too_many_subscribers");
    expect((await httpRequest(s.port, { path: "/v0/health", token: s.token })).status).toBe(200);
    open[0]?.close();
    for (let i = 0; i < 50 && s.presence.subscriberCount() > 31; i += 1) await new Promise((r) => setTimeout(r, 20));
    const later = await feed(s);
    expect(later.status).toBe(200);
    expect((await later.waitFor(1))[0]?.event).toBe("server.hello");
  });

  it("sends a keepalive comment line between events", async () => {
    svc = await startPresence({ keepaliveMs: 50 });
    const f = await feed(svc);
    await f.waitFor(1);
    await new Promise((r) => setTimeout(r, 180));
    expect(f.comments.length).toBeGreaterThan(0);
    expect(f.comments.every((c) => c === ": keepalive")).toBe(true);
  });

  it("declares the descriptor and the contract in server.hello (PC-10)", async () => {
    svc = await startPresence();
    const [hello] = await (await feed(svc)).waitFor(1);
    expect(hello?.data).toMatchObject({ contract: "v0", capabilities: { observe: true, actions: [] } });
  });

  it("answers the feed without a token with 401, an empty body and no CORS header (threat-model controls 2 and 5)", async () => {
    svc = await startPresence();
    const res = await httpRequest(svc.port, { path: "/v0/events", headers: { Origin: "https://attacker.example" } });
    expect(res.status).toBe(401);
    expect(res.body).toBe("");
    const f = await feed(svc, { Origin: "https://attacker.example" });
    expect(Object.keys(f.headers).filter((h) => h.startsWith("access-control-"))).toEqual([]);
  });

  it("carries session.stale and session.expired from the sweep with the full record (PC-07)", async () => {
    let ms = Date.parse("2026-11-12T15:00:00.000Z");
    svc = await startPresence({ now: () => ms });
    const f = await feed(svc);
    await f.waitFor(1);
    const record = await report(svc);
    ms += STALE_AFTER_MS;
    svc.table.sweep();
    ms += EXPIRE_AFTER_MS;
    svc.table.sweep();
    const events = await f.waitFor(4);
    expect(events.map((e) => e.event)).toEqual(["server.hello", "session.started", "session.stale", "session.expired"]);
    expect((events[2]?.data as SessionRecord).session).toBe(record.session);
    expect((events[2]?.data as SessionRecord).stale).toBe(true);
  });

  it("delivers a server.hello larger than the 1 MiB backlog cap to a new subscriber (review of PR #435)", async () => {
    svc = await startPresence();
    const s = svc;
    const base = await loadPresenceFixture<Record<string, unknown>>("report.full.json");
    const aliases = Array.from({ length: 32 }, (_, i) => ({ value: `${"v".repeat(250)}${i}`, context: "slug" }));
    const agent = { ...(base["agent"] as object), aliases };
    const count = 160;
    for (let i = 0; i < count; i += 1) s.table.report({ ...(base as object), agent, checkout: { path: `/c/${i}`, branch: "main", linked_worktree: false } } as never);
    const f = await feed(s);
    const [hello] = await f.waitFor(1, 15_000);
    expect(JSON.stringify(hello?.data).length).toBeGreaterThan(1_048_576);
    expect((hello?.data as { sessions: unknown[] }).sessions).toHaveLength(count);
  });

  it("closes a subscriber that stops reading once its backlog passes 1 MiB, and keeps serving the others", async () => {
    svc = await startPresence();
    const s = svc;
    const { connect } = await import("node:net");
    const stuck = connect({ host: "127.0.0.1", port: s.port });
    await new Promise<void>((r) => stuck.once("connect", () => r()));
    stuck.write(`GET /v0/events HTTP/1.1\r\nHost: x\r\nAuthorization: Bearer ${s.token}\r\n\r\n`);
    stuck.pause();
    for (let i = 0; i < 50 && s.presence.subscriberCount() < 1; i += 1) await new Promise((r) => setTimeout(r, 20));
    expect(s.presence.subscriberCount()).toBe(1);
    const healthy = await feed(s);
    await healthy.waitFor(1);
    const base = await loadPresenceFixture<Record<string, unknown>>("report.full.json");
    const big = { ...(base as object), message: "m".repeat(250), needs_you: Array.from({ length: 20 }, () => ({ action: "a".repeat(256), reason: "r".repeat(256) })) };
    for (let i = 0; i < 600 && s.presence.subscriberCount() > 1; i += 1) {
      s.table.report(big as never);
      if (i % 25 === 0) await new Promise((r) => setTimeout(r, 5));
    }
    expect(s.presence.subscriberCount()).toBe(1);
    expect((await httpRequest(s.port, { path: "/v0/health", token: s.token })).status).toBe(200);
    stuck.destroy();
  }, TIMING_TEST_TIMEOUT);

  it("closeFeeds ends every open feed", async () => {
    svc = await startPresence();
    const f = await feed(svc);
    await f.waitFor(1);
    svc.presence.closeFeeds();
    expect(svc.presence.subscriberCount()).toBe(0);
  });
});
