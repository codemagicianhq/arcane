import { describe, expect, it } from "vitest";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { createSessionTable } from "../src/modules/presence/sessions.js";
import { createUuidV7Generator, parseRef } from "../src/modules/agent-ref.js";
import { EXPIRE_AFTER_MS, STALE_AFTER_MS, nullAgentBlock, type ReportBody, type SessionEvent, type SessionEventName } from "../src/modules/presence/types.js";
import { REPO_ROOT } from "./helpers/state-schema.js";
import { compilePresenceSchema } from "./helpers/presence.js";

const START = Date.parse("2026-11-12T15:00:00.000Z");

function harness() {
  let ms = START;
  const uuid = createUuidV7Generator({ now: () => ms });
  let minted = 0;
  const table = createSessionTable({
    now: () => ms,
    mint: () => {
      minted += 1;
      return `arcane:session:${uuid()}`;
    },
  });
  const events: SessionEvent[] = [];
  table.listen((e) => events.push(e));
  return {
    table,
    events,
    names: () => events.map((e) => e.event),
    advance: (by: number) => {
      ms += by;
    },
    minted: () => minted,
  };
}

function report(path = "/home/operator/ventures/ordovica/geothermal-api", extra: Partial<ReportBody> = {}): ReportBody {
  return {
    status: "working",
    harness: "claude-code",
    agent: nullAgentBlock(),
    repository: { root: "/home/operator/ventures/ordovica/geothermal-api", name: "geothermal-api", remote: null },
    checkout: { path, branch: "main", linked_worktree: false },
    ...extra,
  };
}

describe("session table: one checkout, one session (PC-04, ARC-060 decision 4)", () => {
  it("two reports from one checkout yield one record and one reference", () => {
    const h = harness();
    const first = h.table.report(report());
    const second = h.table.report(report());
    expect(first.created).toBe(true);
    expect(second.created).toBe(false);
    expect(second.record.session).toBe(first.record.session);
    expect(h.table.count()).toBe(1);
    expect(h.minted()).toBe(1);
    expect(parseRef(first.record.session, "session").ok).toBe(true);
  });

  it("end then report mints a second reference", () => {
    const h = harness();
    const first = h.table.report(report());
    h.table.end(first.record.checkout.path);
    const again = h.table.report(report());
    expect(again.created).toBe(true);
    expect(again.record.session).not.toBe(first.record.session);
  });

  it("a second checkout path is a second record", () => {
    const h = harness();
    h.table.report(report());
    h.table.report(report("/home/operator/ventures/ordovica/geothermal-api-telemetry"));
    expect(h.table.count()).toBe(2);
  });

  it("every record and event validates against the schema", async () => {
    const validate = await compilePresenceSchema();
    const h = harness();
    h.table.report(report(undefined, { spell: "spell-implement", task: "WT-03", needs_you: [{ action: "Approve", reason: null }], status: "waiting" }));
    h.advance(STALE_AFTER_MS);
    h.table.sweep();
    h.table.report(report());
    h.table.end(report().checkout.path);
    for (const e of h.events) expect(validate("event", e)).toEqual([]);
  });
});

describe("session table: a report is a patch (architecture D4)", () => {
  it("keeps an absent task, clears needs_you when it is not sent, clears message on null", () => {
    const h = harness();
    h.table.report(report(undefined, { task: "WT-03", message: "warming up", spell: "spell-implement" }));
    const waiting = h.table.report(report(undefined, { status: "waiting", needs_you: [{ action: "Approve the migration", reason: "a schema change" }] }));
    expect(waiting.record.task).toBe("WT-03");
    expect(waiting.record.spell).toBe("spell-implement");
    expect(waiting.record.needs_you).toHaveLength(1);
    const working = h.table.report(report(undefined, { message: null }));
    expect(working.record.needs_you).toEqual([]);
    expect(working.record.message).toBeNull();
    expect(working.record.task).toBe("WT-03");
  });

  it("sets started_at at mint and reported_at on every report", () => {
    const h = harness();
    const first = h.table.report(report());
    h.advance(1_000);
    const second = h.table.report(report());
    expect(second.record.started_at).toBe(first.record.started_at);
    expect(Date.parse(second.record.reported_at) - Date.parse(first.record.reported_at)).toBe(1_000);
  });

  it("hands out copies: mutating a returned record changes nothing stored", () => {
    const h = harness();
    const { record } = h.table.report(report(undefined, { task: "original" }));
    record.task = "mutated";
    record.needs_you.push({ action: "x", reason: null });
    expect(h.table.snapshot()[0]?.task).toBe("original");
    expect(h.table.snapshot()[0]?.needs_you).toEqual([]);
  });
});

describe("session table: exactly one event per report, by precedence (PC-08, architecture D5)", () => {
  type Setup = (h: ReturnType<typeof harness>) => void;
  const needs = [{ action: "Approve", reason: null }];
  const cases: Array<[string, Setup, Partial<ReportBody>, SessionEventName]> = [
    ["a first report with needs-you lines is started", () => undefined, { needs_you: needs }, "session.started"],
    ["resumed beats needs_you after a stale record", (h) => { h.table.report(report()); h.advance(STALE_AFTER_MS); h.table.sweep(); }, { needs_you: needs }, "session.resumed"],
    ["resumed without a change", (h) => { h.table.report(report()); h.advance(STALE_AFTER_MS); h.table.sweep(); }, {}, "session.resumed"],
    ["needs_you beats updated", (h) => { h.table.report(report()); }, { needs_you: needs, task: "changed" }, "session.needs_you"],
    ["clearing needs_you is a needs_you change", (h) => { h.table.report(report(undefined, { needs_you: needs })); }, {}, "session.needs_you"],
    ["an identical report is updated", (h) => { h.table.report(report()); }, {}, "session.updated"],
    ["a status change alone is updated", (h) => { h.table.report(report()); }, { status: "blocked" }, "session.updated"],
  ];
  it.each(cases)("%s", (_label, setup, extra, expected) => {
    const h = harness();
    setup(h);
    const before = h.events.length;
    const result = h.table.report(report(undefined, extra));
    expect(h.events.length - before).toBe(1);
    expect(result.event).toBe(expected);
    expect(h.events.at(-1)?.event).toBe(expected);
    expect(h.events.at(-1)?.data).toEqual(result.record);
  });
});

describe("session table: the clocks (PC-07, ARC-060 decision 7; threat-model control 7)", () => {
  it("90 s of silence emits session.stale once and leaves status as last reported", () => {
    const h = harness();
    h.table.report(report(undefined, { status: "waiting" }));
    h.advance(STALE_AFTER_MS - 1);
    expect(h.table.sweep()).toEqual([]);
    h.advance(1);
    expect(h.table.sweep().map((e) => e.event)).toEqual(["session.stale"]);
    expect(h.table.sweep()).toEqual([]);
    const [record] = h.table.snapshot();
    expect(record?.stale).toBe(true);
    expect(record?.status).toBe("waiting");
  });

  it("the next report clears stale with session.resumed", () => {
    const h = harness();
    h.table.report(report());
    h.advance(STALE_AFTER_MS);
    h.table.sweep();
    const resumed = h.table.report(report());
    expect(resumed.event).toBe("session.resumed");
    expect(resumed.record.stale).toBe(false);
  });

  it("24 h of silence emits session.expired and drops the record", () => {
    const h = harness();
    const { record } = h.table.report(report());
    h.advance(STALE_AFTER_MS);
    h.table.sweep();
    h.advance(EXPIRE_AFTER_MS - STALE_AFTER_MS);
    expect(h.table.sweep().map((e) => e.event)).toEqual(["session.expired"]);
    expect(h.table.snapshot()).toEqual([]);
    expect(h.table.get(record.session)).toBeNull();
    expect(h.names()).toEqual(["session.started", "session.stale", "session.expired"]);
  });

  it("a session silent past both clocks at once expires without a separate stale event", () => {
    const h = harness();
    h.table.report(report());
    h.advance(EXPIRE_AFTER_MS);
    expect(h.table.sweep().map((e) => e.event)).toEqual(["session.expired"]);
  });

  it("a new table starts empty", () => {
    expect(harness().table.snapshot()).toEqual([]);
  });

  it("accepts its clocks as options", () => {
    let ms = START;
    const table = createSessionTable({ now: () => ms, mint: () => "arcane:session:x", staleAfterMs: 10, expireAfterMs: 20 });
    table.report(report());
    ms += 10;
    expect(table.sweep().map((e) => e.event)).toEqual(["session.stale"]);
    ms += 10;
    expect(table.sweep().map((e) => e.event)).toEqual(["session.expired"]);
  });
});

describe("session table: end (PC-03, architecture D6)", () => {
  it("returns the record with done and ended_at, emits session.ended, and drops it", () => {
    const h = harness();
    const { record } = h.table.report(report());
    h.advance(5_000);
    const ended = h.table.end(record.checkout.path);
    expect(ended?.status).toBe("done");
    expect(ended?.ended_at).toBe(new Date(START + 5_000).toISOString());
    expect(h.events.at(-1)).toEqual({ event: "session.ended", data: ended });
    expect(h.table.get(record.session)).toBeNull();
    expect(h.table.snapshot()).toEqual([]);
  });

  it("returns null for an unknown checkout and emits nothing", () => {
    const h = harness();
    expect(h.table.end("/nowhere")).toBeNull();
    expect(h.events).toEqual([]);
  });
});

describe("session table: snapshot order and listeners", () => {
  it("sorts by started_at then session", () => {
    const h = harness();
    h.table.report(report("/b"));
    h.table.report(report("/a"));
    h.advance(1);
    h.table.report(report("/c"));
    const snapshot = h.table.snapshot();
    expect(snapshot.map((r) => r.checkout.path)).toEqual(["/b", "/a", "/c"]);
    expect(snapshot[0].session < snapshot[1].session).toBe(true);
  });

  it("a removed listener hears nothing more", () => {
    const h = harness();
    const heard: string[] = [];
    const remove = h.table.listen((e) => heard.push(e.event));
    h.table.report(report());
    remove();
    h.table.report(report());
    expect(heard).toEqual(["session.started"]);
  });
});

describe("session table: no I/O (architecture D1; threat-model control 11)", () => {
  it("imports only ./types.js", async () => {
    const source = await readFile(join(REPO_ROOT, "src/modules/presence/sessions.ts"), "utf8");
    const imports = [...source.matchAll(/from "([^"]+)";/g)].map((m) => m[1]);
    expect(imports).toEqual(["./types.js"]);
  });
});
