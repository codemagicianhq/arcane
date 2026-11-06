import { describe, expect, it } from "vitest";
import { existsSync } from "node:fs";
import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import {
  ACTIONS,
  HARNESSES,
  PRESENCE_SCHEMA_ASSET_PATH,
  PRESENCE_SCHEMA_ID,
  REPORT_STATUSES,
  SESSION_EVENTS,
  STATUSES,
  nullAgentBlock,
  presenceCapabilities,
  type SessionRecord,
} from "../src/modules/presence/types.js";
import { copyAssets } from "../scripts/copy-assets.js";
import { createDenylistRules, scanFile } from "../src/modules/denylist-scan.js";
import { createFixtureDir, removeFixtureDir } from "./helpers/fixture-dir.js";
import { REPO_ROOT } from "./helpers/state-schema.js";
import {
  PRESENCE_FIXTURE_DIR,
  PRESENCE_SCHEMA_PATH,
  compilePresenceSchema,
  loadPresenceFixture,
  loadPresenceFixtures,
  loadPresenceSchema,
} from "./helpers/presence.js";

describe("presence schema: identity and shipping (PC-04, ARC-060 decision 3)", () => {
  it("carries the agreed $id and a closed record root", async () => {
    const schema = await loadPresenceSchema();
    expect(schema.$id).toBe(PRESENCE_SCHEMA_ID);
    expect(PRESENCE_SCHEMA_ID).toBe("https://arcaneai.net/schemas/presence/v0");
    expect(schema.additionalProperties).toBe(false);
  });

  it("ships under dist/assets/schemas/ through scripts/copy-assets.ts", async () => {
    const dest = await createFixtureDir("presence-schema-copy");
    try {
      const { violations } = await copyAssets(join(REPO_ROOT, "src/assets"), dest);
      expect(violations).toEqual([]);
      expect(existsSync(join(dest, PRESENCE_SCHEMA_ASSET_PATH))).toBe(true);
    } finally {
      await removeFixtureDir(dest);
    }
  });

  it("is validated with a devDependency only (PC-01, ARC-037 decision 8)", async () => {
    const pkg = JSON.parse(await readFile(join(REPO_ROOT, "package.json"), "utf8")) as {
      dependencies: Record<string, string>;
      devDependencies: Record<string, string>;
    };
    expect(pkg.dependencies).not.toHaveProperty("ajv");
    expect(pkg.devDependencies).toHaveProperty("ajv");
  });
});

describe("presence schema: the TypeScript twin agrees (architecture D3)", () => {
  it("record keys, vocabularies and $defs match the constants", async () => {
    const schema = await loadPresenceSchema();
    const record: Record<keyof SessionRecord, true> = {
      session: true, agent: true, harness: true, repository: true, checkout: true, spell: true, task: true,
      message: true, status: true, required_actions: true, started_at: true, reported_at: true, ended_at: true, stale: true,
    };
    expect(schema.required).toEqual(Object.keys(record));
    const props = schema.properties as Record<string, { enum?: unknown[] }>;
    expect(props["status"]?.enum).toEqual([...STATUSES]);
    const defs = schema.$defs as Record<string, { enum?: unknown[]; properties?: Record<string, { enum?: unknown[]; items?: { enum?: unknown[] } }> }>;
    expect(defs["harness"]?.enum).toEqual([...HARNESSES]);
    expect(defs["reportStatus"]?.enum).toEqual([...REPORT_STATUSES]);
    expect(defs["capabilities"]?.properties?.["actions"]?.items?.enum).toEqual([...ACTIONS]);
    expect(defs["event"]?.properties?.["event"]?.enum).toEqual([...SESSION_EVENTS]);
    expect(Object.keys(nullAgentBlock())).toEqual(defs["agent"] ? Object.keys(defs["agent"].properties ?? {}) : []);
  });
});

describe("presence schema: fixtures (PC-04, PC-10)", () => {
  it("every fixture validates against the definition its file name names", async () => {
    const validate = await compilePresenceSchema();
    const fixtures = await loadPresenceFixtures();
    expect(fixtures.length).toBeGreaterThan(0);
    for (const f of fixtures) expect({ file: f.file, errors: validate(f.def, f.value) }).toEqual({ file: f.file, errors: [] });
  });

  it("covers every $def that a client receives or sends", async () => {
    const defs = new Set((await loadPresenceFixtures()).map((f) => f.def));
    for (const def of ["record", "report", "end", "snapshot", "health", "hello", "event", "error", "capabilities"]) {
      expect(defs.has(def)).toBe(true);
    }
  });

  it("validates the PRD's example record unchanged", async () => {
    const prd = await readFile(join(REPO_ROOT, "features/presence-channel/PRD.md"), "utf8");
    const example = /## Example: a session record\n\n```json\n([\s\S]*?)\n```/.exec(prd)?.[1];
    expect(example).toBeDefined();
    const validate = await compilePresenceSchema();
    expect(validate("record", JSON.parse(example!))).toEqual([]);
    expect(await loadPresenceFixture("record.v3.json")).toEqual(JSON.parse(example!));
  });

  it("accepts the three agent blocks: v3, v2 (ARC-060 decision 13) and null; refuses one missing a key", async () => {
    const validate = await compilePresenceSchema();
    const v3 = await loadPresenceFixture<SessionRecord>("record.v3.json");
    const v2 = await loadPresenceFixture<SessionRecord>("record.v2.json");
    expect(v3.agent.ref).toMatch(/^arcane:agent:/);
    expect(v2.agent.ref).toBeNull();
    expect(v2.agent.aliases).toEqual([]);
    expect(v2.agent.slug).toBe("main");
    for (const agent of [v3.agent, v2.agent, nullAgentBlock()]) expect(validate("agent", agent)).toEqual([]);
    const missing: Record<string, unknown> = { ...v2.agent };
    delete missing["origin"];
    expect(validate("agent", missing).join("\n")).toContain("origin");
  });

  it("accepts the capability descriptor and refuses an action outside the vocabulary (PC-10)", async () => {
    const validate = await compilePresenceSchema();
    expect(presenceCapabilities()).toEqual({ observe: true, actions: [] });
    expect(validate("capabilities", presenceCapabilities())).toEqual([]);
    expect(validate("capabilities", { observe: true, actions: ["open", "resume", "instruct"] })).toEqual([]);
    expect(validate("capabilities", { observe: true, actions: ["steer"] }).length).toBeGreaterThan(0);
  });
});

describe("presence schema: refusals (PC-03, PC-04)", () => {
  it("refuses a record with an extra key", async () => {
    const validate = await compilePresenceSchema();
    const record = { ...(await loadPresenceFixture<SessionRecord>("record.v3.json")), extra: true };
    expect(validate("record", record).join("\n")).toContain("must NOT have additional properties");
  });

  it("refuses a report with an unknown status, with status done, and with 21 needs-you lines", async () => {
    const validate = await compilePresenceSchema();
    const report = await loadPresenceFixture<Record<string, unknown>>("report.full.json");
    expect(validate("report", { ...report, status: "thinking" }).length).toBeGreaterThan(0);
    expect(validate("report", { ...report, status: "done" }).length).toBeGreaterThan(0);
    const line = { action: "Approve the plan", reason: null };
    expect(validate("report", { ...report, required_actions: Array.from({ length: 20 }, () => line) })).toEqual([]);
    expect(validate("report", { ...report, required_actions: Array.from({ length: 21 }, () => line) }).join("\n")).toContain("must NOT have more than 20 items");
  });

  it("refuses a session reference of another type and a 257-character task", async () => {
    const validate = await compilePresenceSchema();
    const record = await loadPresenceFixture<SessionRecord>("record.v3.json");
    expect(validate("record", { ...record, session: record.agent.ref }).length).toBeGreaterThan(0);
    expect(validate("record", { ...record, task: "x".repeat(257) }).length).toBeGreaterThan(0);
  });
});

describe("presence fixtures leak nothing (PC-12, ARC-031)", () => {
  it("the denylist scan finds no planted or configured term in any fixture or in the schema", async () => {
    // Planted private-looking names prove the rule works; ARCANE_ORG_TOKENS adds the operator's
    // real terms where it is configured (locally, or as the CI secret ARC-031 describes).
    const planted = ["ordovica-undisclosed-partner", "tidewright-build-02"];
    const configured = (process.env["ARCANE_ORG_TOKENS"] ?? "").split(/[,\n]/).map((t) => t.trim()).filter(Boolean);
    const rules = createDenylistRules([...planted, ...configured], "presence-leak");

    const dir = await createFixtureDir("presence-leak");
    try {
      const probe = join(dir, "probe.json");
      await writeFile(probe, `{"task": "talk to ${planted[0]}"}\n`, "utf8");
      expect((await scanFile(probe, "probe.json", rules)).length).toBe(1);
    } finally {
      await removeFixtureDir(dir);
    }

    const files = (await loadPresenceFixtures()).map((f) => [join(PRESENCE_FIXTURE_DIR, f.file), f.file] as const);
    for (const [abs, display] of [...files, [PRESENCE_SCHEMA_PATH, "presence.schema.json"] as const]) {
      expect(await scanFile(abs, display, rules)).toEqual([]);
    }
  });
});
