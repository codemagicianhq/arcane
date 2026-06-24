import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtemp, writeFile, mkdir, rm } from "node:fs/promises";
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
  autonomy: { default_power_level: "Sidekick", exec_allowed: true },
  spawn: { can_spawn: false, spawnable_by: ["orchestrator"] },
  clients: {
    openclaw: { workspace_prefix: "workspace" },
    copilot: { agent_file: true },
    claude: { include_in_instructions: true },
    codex: { include_in_agents_md: true },
  },
};

const SAMPLE_ROSTER: AgentRoster = {
  schema_version: 1,
  naming_strategy: "custom",
  agent_profile: "base",
  openclaw: { enabled: true, workspace_root: "~/.openclaw" },
  roster: [
    { definition: "orchestrator", name: "Primus", id: "main" },
    { definition: "fullstack-dev", name: "Thor", id: "thor" },
  ],
};

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
  it("loads a valid roster from .arcane/agents.yaml", async () => {
    const arcaneDir = join(tmpDir, ".arcane");
    await mkdir(arcaneDir, { recursive: true });
    await writeFile(
      join(arcaneDir, "agents.yaml"),
      stringify(SAMPLE_ROSTER),
      "utf8",
    );

    const roster = await loadRoster(tmpDir);
    expect(roster.schema_version).toBe(1);
    expect(roster.naming_strategy).toBe("custom");
    expect(roster.roster).toHaveLength(2);
    expect(roster.roster[0]?.name).toBe("Primus");
  });

  it("throws AgentRosterNotFoundError when .arcane/agents.yaml is missing", async () => {
    await expect(loadRoster(tmpDir)).rejects.toThrow(AgentRosterNotFoundError);
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
