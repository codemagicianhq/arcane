import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createHash } from "node:crypto";
import { copyFile, mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { stringify } from "yaml";
import type { AgentRoster, ArcaneManifest } from "../src/types.js";
import { writeManifest } from "../src/modules/manifest.js";
import { userTierRoot } from "../src/modules/user-tier.js";
import { collectAgents } from "../src/modules/state/agents.js";
import { defaultAgent, matchAgent, resolveSessionAgent, type ResolvedProfile } from "../src/modules/presence/agent.js";
import { sendReport } from "../src/modules/presence/reporter.js";
import { runPresenceReport } from "../src/commands/presence.js";
import { nullAgentBlock, type SessionRecord } from "../src/modules/presence/types.js";
import { createFixtureDir, removeFixtureDir } from "./helpers/fixture-dir.js";
import { REPO_ROOT } from "./helpers/state-schema.js";
import { HEAVY_TEST_TIMEOUT } from "./helpers/timeouts.js";
import { arcaneRepo, compilePresenceSchema, recordService, startPresence, type RunningPresence } from "./helpers/presence.js";

const ASSETS_AGENTS = join(REPO_ROOT, "src/assets/agents");
const MANIFEST: ArcaneManifest = { version: "1.17.3", profile: "full", installedAt: "2026-11-01T00:00:00.000Z", components: [] };
const ROSTER: AgentRoster = {
  schema_version: 2,
  naming_strategy: "arcanos",
  agent_profile: "base",
  openclaw: { enabled: false, workspace_root: "~/.openclaw/never-written" },
  roster: [
    { definition: "orchestrator", name: "Kellar", id: "main" },
    { definition: "architecture-lead", name: "Merlin", id: "merlin", epithet: "the Archmage" },
    { definition: "qa-lead", name: null, id: "qa" },
  ],
};

async function writeRoster(base: string, roster: AgentRoster | Record<string, unknown>, definitions: string[]): Promise<void> {
  await mkdir(join(base, "agents"), { recursive: true });
  await writeFile(join(base, "agents.yaml"), stringify(roster), "utf8");
  for (const id of definitions) await copyFile(join(ASSETS_AGENTS, `${id}.yaml`), join(base, "agents", `${id}.yaml`));
}

async function sha256(path: string): Promise<string> {
  return `sha256:${createHash("sha256").update(await readFile(path)).digest("hex")}`;
}

const fixtures: string[] = [];
async function fixture(prefix: string): Promise<string> {
  const dir = await createFixtureDir(prefix);
  fixtures.push(dir);
  return dir;
}

let svc: RunningPresence;
let home: string;
beforeEach(async () => {
  svc = await startPresence();
  home = await fixture("presence-agent-home");
  recordService(home, svc.port);
});
afterEach(async () => {
  await svc.close();
  for (const dir of fixtures.splice(0)) await removeFixtureDir(dir);
});

async function v2Repo(): Promise<string> {
  const dir = await arcaneRepo("presence-agent-repo");
  fixtures.push(dir);
  await writeRoster(join(dir, ".arcane"), ROSTER, ["orchestrator", "architecture-lead"]);
  return dir;
}

async function reported(dir: string, agent?: string): Promise<SessionRecord> {
  const outcome = await sendReport(dir, { status: "working", ...(agent === undefined ? {} : { agent }) }, { home, env: {} });
  expect(outcome.kind).toBe("sent");
  return (outcome as { record: SessionRecord }).record;
}

describe("a v2 roster fills the agent block (ARC-060 decision 13, PC-04)", () => {
  it("--agent <id> reports that entry's slug, name, origin and revision, with ref null and aliases []", async () => {
    const dir = await v2Repo();
    const record = await reported(dir, "merlin");
    expect(record.agent).toEqual({
      ref: null,
      slug: "merlin",
      name: "Merlin",
      origin: "repo",
      definition_revision: await sha256(join(dir, ".arcane", "agents", "architecture-lead.yaml")),
      aliases: [],
    });
    expect((await compilePresenceSchema())("record", record)).toEqual([]);
  }, HEAVY_TEST_TIMEOUT);

  it("without --agent reports the orchestrator as slug main, and --agent main is the same block (D9)", async () => {
    const dir = await v2Repo();
    const byDefault = await reported(dir);
    expect(byDefault.agent.slug).toBe("main");
    expect(byDefault.agent.name).toBe("Kellar");
    svc.table.end(byDefault.checkout.path);
    expect((await reported(dir, "main")).agent).toEqual(byDefault.agent);
  }, HEAVY_TEST_TIMEOUT);

  it("reports for an entry exactly the id, origin and revision the state export gives it", async () => {
    const dir = await v2Repo();
    const { agents } = await collectAgents(dir);
    for (const entry of agents!.entries) {
      const block = await resolveSessionAgent(dir, entry.id);
      expect({ slug: block.slug, origin: block.origin, definition_revision: block.definition_revision }).toEqual({
        slug: entry.id,
        origin: entry.origin,
        definition_revision: entry.definition_revision,
      });
    }
  }, HEAVY_TEST_TIMEOUT);

  it("falls back to an opted-in user tier with origin user; a missing definition is a null revision and no stderr", async () => {
    const dir = await arcaneRepo("presence-agent-user");
    fixtures.push(dir);
    await writeManifest(dir, { ...MANIFEST, spell_scope: "user" });
    const store = userTierRoot(home);
    await writeManifest(store, { ...MANIFEST, scope: "user" });
    await writeRoster(store, ROSTER, ["orchestrator"]);
    const block = await resolveSessionAgent(dir, "merlin", { homeDir: home });
    expect(block.origin).toBe("user");
    expect(block.definition_revision).toBeNull();
    const err: string[] = [];
    await runPresenceReport(dir, { status: "working", agent: "merlin" }, { out: () => undefined, err: (l) => err.push(l) }, { home, env: {}, resolveAgent: (d, f) => resolveSessionAgent(d, f, { homeDir: home }) });
    expect(err).toEqual([]);
    expect(svc.table.snapshot()[0]?.agent.origin).toBe("user");
  }, HEAVY_TEST_TIMEOUT);

  it("never writes: the roster file is byte-identical and nothing is added beside it (ARC-059 decision 5)", async () => {
    const dir = await v2Repo();
    const before = await readFile(join(dir, ".arcane", "agents.yaml"), "utf8");
    const listing = (await readdir(join(dir, ".arcane"))).sort();
    await reported(dir, "merlin");
    expect(await readFile(join(dir, ".arcane", "agents.yaml"), "utf8")).toBe(before);
    expect((await readdir(join(dir, ".arcane"))).sort()).toEqual(listing);
  }, HEAVY_TEST_TIMEOUT);
});

describe("the null block (PC-05, architecture D7)", () => {
  it("no roster, an unmatched --agent, and a roster the loader refuses each yield the null block, silently", async () => {
    const bare = await arcaneRepo("presence-agent-bare");
    fixtures.push(bare);
    expect((await reported(bare)).agent).toEqual(nullAgentBlock());
    svc.table.end((await reported(bare)).checkout.path);

    const dir = await v2Repo();
    expect((await reported(dir, "nobody")).agent).toEqual(nullAgentBlock());
    svc.table.end(dir);

    const refused = await arcaneRepo("presence-agent-v3");
    fixtures.push(refused);
    await writeRoster(join(refused, ".arcane"), { ...ROSTER, schema_version: 3 }, []);
    const err: string[] = [];
    const run = await runPresenceReport(refused, { status: "working", agent: "merlin" }, { out: () => undefined, err: (l) => err.push(l) }, { home, env: {} });
    expect(run.outcome?.kind).toBe("sent");
    expect(err).toEqual([]);
    const record = svc.table.snapshot().find((r) => r.checkout.path === refused);
    expect(record?.agent).toEqual(nullAgentBlock());
  }, HEAVY_TEST_TIMEOUT);

  it("a provider that throws yields the null block", async () => {
    expect(await resolveSessionAgent("/nowhere", "x", { profiles: () => Promise.reject(new Error("boom")) })).toEqual(nullAgentBlock());
  });
});

describe("matching resolved v3 profiles at the seam (PC-05; on-disk v3 is the agent-identity feature's)", () => {
  const rev = `sha256:${"a".repeat(64)}`;
  const profiles: ResolvedProfile[] = [
    { ref: "arcane:agent:019a3f2c-7b1e-7d4a-9c0b-3e5f6a7b8c9d", slug: "kellar", name: "Kellar", origin: "repo", definition_revision: rev, aliases: [{ value: "main", context: "openclaw" }], definition: "orchestrator" },
    { ref: "arcane:agent:019a3f2c-7b1e-7d4a-9c0b-3e5f6a7b8c9e", slug: "merlin", name: "Merlin", origin: "repo", definition_revision: rev, aliases: [{ value: "archmage", context: "slug" }], definition: "architecture-lead" },
    { ref: "arcane:agent:019a3f2c-7b1e-7d4a-9c0b-3e5f6a7b8c9f", slug: "lince", name: "Lince", origin: "repo", definition_revision: rev, aliases: [{ value: "archmage", context: "openclaw" }], definition: "qa-lead" },
  ];
  const provider = () => Promise.resolve(profiles);

  it("--agent <slug> returns that profile's six fields", async () => {
    expect(await resolveSessionAgent("/r", "merlin", { profiles: provider })).toEqual({
      ref: profiles[1].ref,
      slug: "merlin",
      name: "Merlin",
      origin: "repo",
      definition_revision: rev,
      aliases: [{ value: "archmage", context: "slug" }],
    });
  });

  it("--agent main resolves the openclaw alias to the entry's own slug", async () => {
    expect((await resolveSessionAgent("/r", "main", { profiles: provider })).slug).toBe("kellar");
  });

  it("an alias held by two profiles, or an unknown value, returns the null block", async () => {
    expect(await resolveSessionAgent("/r", "archmage", { profiles: provider })).toEqual(nullAgentBlock());
    expect(await resolveSessionAgent("/r", "ghost", { profiles: provider })).toEqual(nullAgentBlock());
  });

  it("without --agent: one orchestrator is returned, none or two return nobody", async () => {
    expect((await resolveSessionAgent("/r", undefined, { profiles: provider })).slug).toBe("kellar");
    expect(defaultAgent(profiles.slice(1))).toBeNull();
    expect(defaultAgent([profiles[0], { ...profiles[0], slug: "second" }])).toBeNull();
  });

  it("a slug held twice matches nobody", () => {
    expect(matchAgent([profiles[1], { ...profiles[1] }], "merlin")).toBeNull();
  });
});

describe("agent.ts is the only presence file that reads a roster", () => {
  it("no other file under src/modules/presence imports the roster, the loader or the state agents collector", async () => {
    const dir = join(REPO_ROOT, "src/modules/presence");
    for (const file of await readdir(dir)) {
      const source = await readFile(join(dir, file), "utf8");
      const imports = [...source.matchAll(/from "([^"]+)";/g)].map((m) => m[1] ?? "");
      const roster = imports.filter((i) => ["../agents.js", "../state/agents.js", "../agent-loader.js", "../agent-schema.js"].includes(i));
      expect({ file, roster }).toEqual({ file, roster: file === "agent.ts" ? ["../state/agents.js"] : [] });
    }
  });
});
