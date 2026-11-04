import { describe, it, expect, beforeEach, afterEach, vi, type MockInstance } from "vitest";
import { createHash } from "node:crypto";
import { copyFile, mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { stringify } from "yaml";
import type { AgentRoster, ArcaneManifest } from "../src/types.js";
import { AgentConfigValidationError } from "../src/modules/agent-loader.js";
import { writeManifest } from "../src/modules/manifest.js";
import { userTierRoot } from "../src/modules/user-tier.js";
import { collectAgents } from "../src/modules/state/agents.js";
import { collectState } from "../src/modules/state/collect.js";
import { runState } from "../src/commands/state.js";
import { createFixtureDir, removeFixtureDir } from "./helpers/fixture-dir.js";
import { REPO_ROOT, compileStateSchema } from "./helpers/state-schema.js";
import { HEAVY_TEST_TIMEOUT } from "./helpers/timeouts.js";

const ASSETS_AGENTS = join(REPO_ROOT, "src/assets/agents");

const ROSTER: AgentRoster = {
  schema_version: 2,
  naming_strategy: "arcanos",
  agent_profile: "base",
  openclaw: { enabled: false, workspace_root: "~/never-written" },
  roster: [
    { definition: "architecture-lead", name: "Merlin", id: "merlin", epithet: "the Archmage" },
    { definition: "qa-lead", name: null, id: "qa" },
  ],
};

const MANIFEST: ArcaneManifest = { version: "1.0.0", profile: "full", installedAt: "2026-01-01T00:00:00.000Z", components: [] };

const fixtures: string[] = [];
afterEach(async () => {
  for (const dir of fixtures.splice(0)) await removeFixtureDir(dir);
});

async function fixture(prefix: string): Promise<string> {
  const dir = await createFixtureDir(prefix);
  fixtures.push(dir);
  return dir;
}

async function sha256(path: string): Promise<string> {
  return `sha256:${createHash("sha256").update(await readFile(path)).digest("hex")}`;
}

/** Writes a roster plus one bundled definition into `<base>/agents.yaml` and `<base>/agents/`. */
async function writeRoster(base: string, roster: AgentRoster, definitions: string[]): Promise<void> {
  await mkdir(join(base, "agents"), { recursive: true });
  await writeFile(join(base, "agents.yaml"), stringify(roster), "utf8");
  for (const id of definitions) await copyFile(join(ASSETS_AGENTS, `${id}.yaml`), join(base, "agents", `${id}.yaml`));
}

describe("collectAgents (ST-12, D10)", () => {
  it("exports a repository's own roster as roster-v2 with origin repo and sha256 definition revisions", async () => {
    const dir = await fixture("state-agents-repo");
    await writeManifest(dir, MANIFEST);
    await writeRoster(join(dir, ".arcane"), ROSTER, ["architecture-lead"]);
    const { agents, warnings } = await collectAgents(dir);
    expect(agents?.schema).toBe("roster-v2");
    expect(agents?.naming_strategy).toBe("arcanos");
    expect(agents?.agent_profile).toBe("base");
    expect(agents?.entries).toEqual([
      {
        definition: "architecture-lead",
        name: "Merlin",
        id: "merlin",
        epithet: "the Archmage",
        origin: "repo",
        definition_revision: await sha256(join(dir, ".arcane", "agents", "architecture-lead.yaml")),
      },
      { definition: "qa-lead", name: null, id: "qa", epithet: null, origin: "repo", definition_revision: null },
    ]);
    expect(warnings).toEqual(['agents: the definition file for "qa-lead" (qa) is missing from its definitions directory; definition_revision is null']);
    for (const entry of agents!.entries) {
      for (const v3 of ["ref", "slug", "aliases", "derived_from", "binding"]) expect(entry).not.toHaveProperty(v3);
    }
    const validate = await compileStateSchema();
    const doc = await collectState(dir, "1.0.0", { online: false, includeLocalPaths: false });
    expect(validate(doc)).toEqual([]);
    expect(doc.agents?.entries).toHaveLength(2);
  }, HEAVY_TEST_TIMEOUT);

  it("falls back to an opted-in user tier with origin user, and is null when no roster applies", async () => {
    const home = await fixture("state-agents-home");
    const dir = await fixture("state-agents-optin");
    await writeManifest(dir, { ...MANIFEST, spell_scope: "user" });
    expect(await collectAgents(dir, { homeDir: home })).toEqual({ agents: null, warnings: [] });

    const store = userTierRoot(home);
    await mkdir(store, { recursive: true });
    await writeManifest(store, { ...MANIFEST, scope: "user" });
    await writeRoster(store, ROSTER, ["architecture-lead", "qa-lead"]);
    const { agents, warnings } = await collectAgents(dir, { homeDir: home });
    expect(warnings).toEqual([]);
    expect(agents?.entries.map((e) => e.origin)).toEqual(["user", "user"]);
    expect(agents?.entries[1].definition_revision).toBe(await sha256(join(store, "agents", "qa-lead.yaml")));

    const doc = await collectState(dir, "1.0.0", { online: false, includeLocalPaths: false, homeDir: home });
    expect(doc.agents?.entries[0].origin).toBe("user");

    // A repository that did not opt in never reads the store.
    const plain = await fixture("state-agents-plain");
    await writeManifest(plain, MANIFEST);
    expect(await collectAgents(plain, { homeDir: home })).toEqual({ agents: null, warnings: [] });
  }, HEAVY_TEST_TIMEOUT);

  it("propagates the loader's error for a malformed roster", async () => {
    const dir = await fixture("state-agents-malformed");
    await writeManifest(dir, MANIFEST);
    await mkdir(join(dir, ".arcane"), { recursive: true });
    await writeFile(join(dir, ".arcane", "agents.yaml"), "schema_version: 2\nnaming_strategy: nope\nroster: not-a-list\n", "utf8");
    await expect(collectAgents(dir)).rejects.toBeInstanceOf(AgentConfigValidationError);
    await expect(collectState(dir, "1.0.0", { online: false, includeLocalPaths: false })).rejects.toBeInstanceOf(AgentConfigValidationError);
  }, HEAVY_TEST_TIMEOUT);
});

describe("spell state with a malformed roster (ST-12)", () => {
  let errorSpy: MockInstance<typeof console.error>;
  let written: string[];

  beforeEach(() => {
    written = [];
    process.exitCode = undefined;
    errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    process.exitCode = undefined;
    vi.restoreAllMocks();
  });

  it("prints the loader's message on stderr, writes no JSON, and sets exit code 1", async () => {
    const dir = await fixture("state-agents-cmd");
    await writeManifest(dir, MANIFEST);
    await mkdir(join(dir, ".arcane"), { recursive: true });
    await writeFile(join(dir, ".arcane", "agents.yaml"), "schema_version: 2\nnaming_strategy: nope\nroster: not-a-list\n", "utf8");
    await runState(dir, "1.0.0", { json: true }, { write: async (text) => void written.push(text) });
    expect(process.exitCode).toBe(1);
    expect(written).toEqual([]);
    expect(errorSpy).toHaveBeenCalledTimes(1);
    const message = errorSpy.mock.calls[0][0] as string;
    expect(message).toContain("Invalid agent configuration in");
    expect(message).toContain("naming_strategy");
  }, HEAVY_TEST_TIMEOUT);
});
