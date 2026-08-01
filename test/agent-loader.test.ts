import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { mkdtemp, writeFile, mkdir, rm } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { stringify } from "yaml";
import {
  loadAgentDefinition,
  loadAllAgentDefinitions,
  loadRoster,
  rosterExists,
  projectAgentsDir,
  AgentDefinitionNotFoundError,
  AgentRosterNotFoundError,
} from "../src/modules/agent-loader.js";
import { runAgentsList } from "../src/modules/agents.js";
import type { AgentDefinition, AgentRoster } from "../src/types.js";

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const SAMPLE_DEFINITION: AgentDefinition = {
  id: "fullstack-dev",
  role: "Full-Stack Developer",
  category: "engineering",
  persona: {
    description: "Implements features across the stack.",
    behavioral_rules: ["Write clean code", "Run tests before committing"],
  },
  model: { primary: "openai-codex", fallback: ["anthropic-claude"] },
  tools: { allowed: ["shell", "git"], denied: ["sudo"] },
  autonomy: { default_power_level: "Apprentice", exec_allowed: true },
  spawn: { can_spawn: false, spawnable_by: ["orchestrator"] },
  clients: {
    openclaw: { workspace_prefix: "workspace" },
    copilot: { agent_file: true },
    claude: { include_in_instructions: true },
    codex: { include_in_agents_md: true },
  },
};

const SAMPLE_ROSTER: AgentRoster = {
  schema_version: 2,
  naming_strategy: "custom",
  agent_profile: "base",
  openclaw: { enabled: true, workspace_root: "~/.openclaw" },
  roster: [
    { definition: "orchestrator", name: "Kellar", id: "main" },
    { definition: "fullstack-dev", name: "Lafayette", id: "lafayette" },
  ],
};

const BIN = join(process.cwd(), "dist", "index.js");

// ─── Setup ────────────────────────────────────────────────────────────────────

let tmpDir: string;
let agentsDir: string;

beforeEach(async () => {
  tmpDir = await mkdtemp(join(tmpdir(), "arcane-agent-loader-test-"));
  agentsDir = join(tmpDir, "agents");
  await mkdir(agentsDir, { recursive: true });
});

afterEach(async () => {
  await rm(tmpDir, { recursive: true, force: true });
  vi.restoreAllMocks();
});

// ─── loadAgentDefinition ─────────────────────────────────────────────────────

describe("loadAgentDefinition", () => {
  it("loads a valid YAML definition by id", async () => {
    await writeFile(
      join(agentsDir, "fullstack-dev.yaml"),
      stringify(SAMPLE_DEFINITION),
      "utf8",
    );

    const def = await loadAgentDefinition(agentsDir, "fullstack-dev");

    expect(def.id).toBe("fullstack-dev");
    expect(def.role).toBe("Full-Stack Developer");
    expect(def.category).toBe("engineering");
    expect(def.persona.behavioral_rules).toHaveLength(2);
  });

  it("throws AgentDefinitionNotFoundError for missing file", async () => {
    await expect(
      loadAgentDefinition(agentsDir, "nonexistent-role"),
    ).rejects.toThrow(AgentDefinitionNotFoundError);
  });

  it("error message includes the missing role id", async () => {
    await expect(
      loadAgentDefinition(agentsDir, "missing-role"),
    ).rejects.toThrow("missing-role");
  });

  it("rejects malformed definition YAML", async () => {
    await writeFile(join(agentsDir, "broken.yaml"), "id: [", "utf8");

    await expect(loadAgentDefinition(agentsDir, "broken")).rejects.toThrow(
      /malformed YAML/,
    );
  });

  it("rejects a definition with missing required fields", async () => {
    const missingTools = { ...SAMPLE_DEFINITION, tools: undefined };
    await writeFile(join(agentsDir, "missing.yaml"), stringify(missingTools), "utf8");

    await expect(loadAgentDefinition(agentsDir, "missing")).rejects.toThrow(
      /tools must be an object/,
    );
  });

  it.each([
    ["invalid power level", { autonomy: { default_power_level: "Emperor", exec_allowed: true } }, "autonomy.default_power_level"],
    ["invalid exec permission", { autonomy: { default_power_level: "Wizard", exec_allowed: "yes" } }, "autonomy.exec_allowed"],
    ["invalid allowed tools", { tools: { allowed: "shell", denied: [] } }, "tools.allowed"],
    ["invalid denied tools", { tools: { allowed: [], denied: [false] } }, "tools.denied"],
    ["invalid spawn permission", { spawn: { can_spawn: "yes", spawnable_by: [] } }, "spawn.can_spawn"],
    ["invalid spawn allowlist", { spawn: { can_spawn: false, spawnable_by: "orchestrator" } }, "spawn.spawnable_by"],
  ])("rejects %s", async (_name, override, expectedPath) => {
    const definition = { ...SAMPLE_DEFINITION, ...override };
    await writeFile(join(agentsDir, "invalid.yaml"), stringify(definition), "utf8");

    await expect(loadAgentDefinition(agentsDir, "invalid")).rejects.toThrow(
      expectedPath,
    );
  });
});

// ─── loadAllAgentDefinitions ─────────────────────────────────────────────────

describe("loadAllAgentDefinitions", () => {
  it("returns an empty array for an empty directory", async () => {
    const result = await loadAllAgentDefinitions(agentsDir);
    expect(result).toEqual([]);
  });

  it("returns an empty array when directory does not exist", async () => {
    const result = await loadAllAgentDefinitions(
      join(tmpDir, "nonexistent"),
    );
    expect(result).toEqual([]);
  });

  it("loads all YAML files from the directory", async () => {
    await writeFile(
      join(agentsDir, "fullstack-dev.yaml"),
      stringify(SAMPLE_DEFINITION),
      "utf8",
    );
    const orchestrator = { ...SAMPLE_DEFINITION, id: "orchestrator", role: "Orchestrator" };
    await writeFile(
      join(agentsDir, "orchestrator.yaml"),
      stringify(orchestrator),
      "utf8",
    );

    const result = await loadAllAgentDefinitions(agentsDir);
    expect(result).toHaveLength(2);
    expect(result.map((d) => d.id)).toContain("fullstack-dev");
    expect(result.map((d) => d.id)).toContain("orchestrator");
  });

  it("skips agents.yaml roster file", async () => {
    await writeFile(
      join(agentsDir, "fullstack-dev.yaml"),
      stringify(SAMPLE_DEFINITION),
      "utf8",
    );
    await writeFile(
      join(agentsDir, "agents.yaml"),
      stringify(SAMPLE_ROSTER),
      "utf8",
    );

    const result = await loadAllAgentDefinitions(agentsDir);
    // Should only return the definition, not the roster
    expect(result).toHaveLength(1);
    expect(result[0]?.id).toBe("fullstack-dev");
  });

  it("skips non-YAML files", async () => {
    await writeFile(join(agentsDir, "README.md"), "# readme", "utf8");
    await writeFile(
      join(agentsDir, "fullstack-dev.yaml"),
      stringify(SAMPLE_DEFINITION),
      "utf8",
    );

    const result = await loadAllAgentDefinitions(agentsDir);
    expect(result).toHaveLength(1);
  });
});

// ─── loadRoster ──────────────────────────────────────────────────────────────

describe("loadRoster", () => {
  async function writeRoster(roster: unknown) {
    const arcaneDir = join(tmpDir, ".arcane");
    await mkdir(arcaneDir, { recursive: true });
    await writeFile(join(arcaneDir, "agents.yaml"), stringify(roster), "utf8");
  }

  it("loads a valid roster from .arcane/agents.yaml", async () => {
    await writeRoster(SAMPLE_ROSTER);

    const roster = await loadRoster(tmpDir);
    expect(roster.schema_version).toBe(2);
    expect(roster.naming_strategy).toBe("custom");
    expect(roster.roster).toHaveLength(2);
    expect(roster.roster[0]?.name).toBe("Kellar");
  });

  it("throws AgentRosterNotFoundError when .arcane/agents.yaml is missing", async () => {
    await expect(loadRoster(tmpDir)).rejects.toThrow(AgentRosterNotFoundError);
  });

  it("rejects malformed roster YAML", async () => {
    const arcaneDir = join(tmpDir, ".arcane");
    await mkdir(arcaneDir, { recursive: true });
    await writeFile(join(arcaneDir, "agents.yaml"), "schema_version: [", "utf8");

    await expect(loadRoster(tmpDir)).rejects.toThrow(/malformed YAML/);
  });

  it("rejects a missing schema version", async () => {
    const missingVersion = { ...SAMPLE_ROSTER, schema_version: undefined };
    await writeRoster(missingVersion);

    await expect(loadRoster(tmpDir)).rejects.toThrow(/schema_version must be an integer/);
  });

  it("migrates a valid schema v1 roster to v2", async () => {
    await writeRoster({ ...SAMPLE_ROSTER, schema_version: 1 });

    await expect(loadRoster(tmpDir)).resolves.toMatchObject({ schema_version: 2 });
  });

  it("rejects an unsupported future schema version", async () => {
    await writeRoster({ ...SAMPLE_ROSTER, schema_version: 3 });

    await expect(loadRoster(tmpDir)).rejects.toThrow(/newer than supported version 2/);
  });

  it("rejects malformed roster entries", async () => {
    await writeRoster({
      ...SAMPLE_ROSTER,
      roster: [{ definition: "orchestrator", name: "Kellar" }],
    });

    await expect(loadRoster(tmpDir)).rejects.toThrow(/roster\[0\]\.id/);
  });

  it("emits no listed output after roster validation fails", async () => {
    await writeRoster({ ...SAMPLE_ROSTER, schema_version: 3 });
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const exitSpy = vi.spyOn(process, "exit").mockImplementation((() => {}) as never);

    await runAgentsList(tmpDir);

    expect(exitSpy).toHaveBeenCalledWith(1);
    expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining("newer than supported"));
    expect(logSpy).not.toHaveBeenCalled();
  });

  it("built CLI refuses a future roster without emitting list output", async () => {
    await writeRoster({ ...SAMPLE_ROSTER, schema_version: 3 });

    const result = spawnSync(process.execPath, [BIN, "agents", "list"], {
      cwd: tmpDir,
      encoding: "utf8",
    });

    expect(result.status).toBe(1);
    expect(result.stdout).toBe("");
    expect(result.stderr).toContain("newer than supported version 2");
  });
});

// ─── rosterExists ────────────────────────────────────────────────────────────

describe("rosterExists", () => {
  it("returns false when .arcane/agents.yaml does not exist", async () => {
    expect(await rosterExists(tmpDir)).toBe(false);
  });

  it("returns true when .arcane/agents.yaml exists", async () => {
    const arcaneDir = join(tmpDir, ".arcane");
    await mkdir(arcaneDir, { recursive: true });
    await writeFile(
      join(arcaneDir, "agents.yaml"),
      stringify(SAMPLE_ROSTER),
      "utf8",
    );
    expect(await rosterExists(tmpDir)).toBe(true);
  });
});

// ─── projectAgentsDir ────────────────────────────────────────────────────────

describe("projectAgentsDir", () => {
  it("returns .arcane/agents under targetDir", () => {
    const base = join("some", "repo");
    expect(projectAgentsDir(base)).toBe(join(base, ".arcane", "agents"));
  });
});
