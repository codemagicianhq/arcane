import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtemp, readFile, rm, mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { stringify } from "yaml";
import { syncAgents } from "../src/modules/agent-generator.js";
import type { AgentDefinition, AgentRoster } from "../src/types.js";
import { MARKER_START, MARKER_END } from "../src/modules/merger.js";

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const ORCHESTRATOR_DEF: AgentDefinition = {
  id: "orchestrator",
  role: "Product Operations Manager",
  category: "operations",
  persona: {
    description: "Owns product operations and task routing.",
    behavioral_rules: ["Route tasks to the right specialist", "Escalate blockers immediately"],
    personality: "Commanding and principled. Serves the mission above ego.",
    voice: "Direct, measured, and strategic.",
    visual_description: "Tall White male in dark command attire with blue accent lighting.",
    catchphrases: ["Spellcasters, roll out.", "Till all sprints are done.", "Freedom is the right of all deployed code."],
  },
  model: { primary: "openai-codex", fallback: [] },
  tools: { allowed: ["shell", "git"], denied: ["sudo"] },
  autonomy: { default_power_level: "Champion", exec_allowed: true },
  spawn: { can_spawn: true, spawnable_by: [] },
  clients: {
    openclaw: { workspace_prefix: "workspace" },
    copilot: { agent_file: true },
    claude: { include_in_instructions: true },
    codex: { include_in_agents_md: true },
  },
};

const DEV_DEF: AgentDefinition = {
  id: "fullstack-dev",
  role: "Full-Stack Developer",
  category: "engineering",
  persona: {
    description: "Implements features across the stack.",
    behavioral_rules: ["Write clean code"],
  },
  model: { primary: "openai-codex", fallback: [] },
  tools: { allowed: ["shell"], denied: ["sudo"] },
  autonomy: { default_power_level: "Sidekick", exec_allowed: true },
  spawn: { can_spawn: false, spawnable_by: ["orchestrator"] },
  clients: {
    openclaw: { workspace_prefix: "workspace" },
    copilot: { agent_file: true },
    claude: { include_in_instructions: true },
    codex: { include_in_agents_md: true },
  },
};

function makeRoster(openclawRoot: string): AgentRoster {
  return {
    schema_version: 1,
    naming_strategy: "custom",
    agent_profile: "base",
    openclaw: { enabled: true, workspace_root: openclawRoot },
    roster: [
      { definition: "orchestrator", name: "Primus", id: "main" },
      { definition: "fullstack-dev", name: "Thor", id: "thor" },
    ],
  };
}

// ─── Setup ────────────────────────────────────────────────────────────────────

let tmpDir: string;
let assetsDir: string;
let openclawRoot: string;

beforeEach(async () => {
  tmpDir = await mkdtemp(join(tmpdir(), "arcane-generator-test-"));
  // Set up bundled assets dir with agent definitions
  assetsDir = join(tmpDir, "assets");
  const bundledAgentsDir = join(assetsDir, "agents");
  await mkdir(bundledAgentsDir, { recursive: true });
  await writeFile(
    join(bundledAgentsDir, "orchestrator.yaml"),
    stringify(ORCHESTRATOR_DEF),
    "utf8",
  );
  await writeFile(
    join(bundledAgentsDir, "fullstack-dev.yaml"),
    stringify(DEV_DEF),
    "utf8",
  );
  // Set up a fake openclaw root inside tmpDir (avoids touching real ~/.openclaw)
  openclawRoot = join(tmpDir, "openclaw");
  await mkdir(openclawRoot, { recursive: true });
});

afterEach(async () => {
  await rm(tmpDir, { recursive: true, force: true });
});

// ─── dry-run mode ─────────────────────────────────────────────────────────────

describe("syncAgents — dry-run", () => {
  it("returns synced items and does not write files", async () => {
    const roster = makeRoster(openclawRoot);
    const result = await syncAgents(tmpDir, assetsDir, roster, {
      dryRun: true,
    });

    // dry-run still populates synced list
    expect(result.synced.length).toBeGreaterThan(0);
    // But no actual output directories were created
    const githubAgentsDir = join(tmpDir, ".github", "agents");
    await expect(
      readFile(join(githubAgentsDir, "primus.agent.md"), "utf8"),
    ).rejects.toThrow();
  });
});

// ─── Copilot output ───────────────────────────────────────────────────────────

describe("syncAgents — Copilot output", () => {
  it("creates .github/agents/{slug}.agent.md for each agent with copilot.agent_file=true", async () => {
    const roster = makeRoster(openclawRoot);
    await syncAgents(tmpDir, assetsDir, roster, { openclaw: false });

    const primusAgent = await readFile(
      join(tmpDir, ".github", "agents", "primus.agent.md"),
      "utf8",
    );
    const thorAgent = await readFile(
      join(tmpDir, ".github", "agents", "thor.agent.md"),
      "utf8",
    );

    expect(primusAgent).toContain("Primus");
    expect(primusAgent).toContain("Product Operations Manager");
    expect(primusAgent).toContain("Spellcasters, roll out.");
    expect(primusAgent).toContain("Commanding and principled");
    expect(primusAgent).toContain("Direct, measured, and strategic");
    expect(thorAgent).toContain("Thor");
    expect(thorAgent).toContain("Full-Stack Developer");
  });

  it("merges roster table into .github/copilot-instructions.md", async () => {
    const roster = makeRoster(openclawRoot);
    await syncAgents(tmpDir, assetsDir, roster, { openclaw: false });

    const instructions = await readFile(
      join(tmpDir, ".github", "copilot-instructions.md"),
      "utf8",
    );
    expect(instructions).toContain(MARKER_START);
    expect(instructions).toContain(MARKER_END);
    expect(instructions).toContain("Primus");
    expect(instructions).toContain("Thor");
  });
});

// ─── Claude output ────────────────────────────────────────────────────────────

describe("syncAgents — Claude output", () => {
  it("merges roster table into CLAUDE.md", async () => {
    const roster = makeRoster(openclawRoot);
    await syncAgents(tmpDir, assetsDir, roster, {
      openclaw: false,
      copilot: false,
      codex: false,
    });

    const claudeMd = await readFile(join(tmpDir, "CLAUDE.md"), "utf8");
    expect(claudeMd).toContain(MARKER_START);
    expect(claudeMd).toContain("Primus");
    expect(claudeMd).toContain("Product Operations Manager");
  });
});

// ─── Codex output ────────────────────────────────────────────────────────────

describe("syncAgents — Codex output", () => {
  it("merges roster table into AGENTS.md", async () => {
    const roster = makeRoster(openclawRoot);
    await syncAgents(tmpDir, assetsDir, roster, {
      openclaw: false,
      copilot: false,
      claude: false,
    });

    const agentsMd = await readFile(join(tmpDir, "AGENTS.md"), "utf8");
    expect(agentsMd).toContain(MARKER_START);
    expect(agentsMd).toContain("Thor");
    expect(agentsMd).toContain("Full-Stack Developer");
  });
});

// ─── OpenClaw output ─────────────────────────────────────────────────────────

describe("syncAgents — OpenClaw output", () => {
  it("writes IDENTITY.md, SOUL.md, TOOLS.md into the correct workspace dirs", async () => {
    const roster = makeRoster(openclawRoot);
    await syncAgents(tmpDir, assetsDir, roster, {
      copilot: false,
      claude: false,
      codex: false,
    });

    // Orchestrator gets "workspace" (not "workspace-main") because id==="main"
    const identity = await readFile(
      join(openclawRoot, "workspace", "IDENTITY.md"),
      "utf8",
    );
    expect(identity).toContain("Primus");
    expect(identity).toContain("Product Operations Manager");
    expect(identity).toContain("Spellcasters, roll out.");

    const soul = await readFile(
      join(openclawRoot, "workspace", "SOUL.md"),
      "utf8",
    );
    expect(soul).toContain("Champion");

    const tools = await readFile(
      join(openclawRoot, "workspace", "TOOLS.md"),
      "utf8",
    );
    expect(tools).toContain("shell");
    expect(tools).toContain("sudo");
  });

  it("writes Thor's files to workspace-thor", async () => {
    const roster = makeRoster(openclawRoot);
    await syncAgents(tmpDir, assetsDir, roster, {
      copilot: false,
      claude: false,
      codex: false,
    });

    const thorIdentity = await readFile(
      join(openclawRoot, "workspace-thor", "IDENTITY.md"),
      "utf8",
    );
    expect(thorIdentity).toContain("Thor");
  });

  it("generates openclaw-roster.json patch file", async () => {
    const roster = makeRoster(openclawRoot);
    await syncAgents(tmpDir, assetsDir, roster, {
      copilot: false,
      claude: false,
      codex: false,
    });

    const patch = JSON.parse(
      await readFile(
        join(tmpDir, ".arcane", "generated", "openclaw-roster.json"),
        "utf8",
      ),
    ) as { agents: Array<{ id: string; identity: { name: string } }> };

    expect(patch.agents).toHaveLength(2);
    expect(patch.agents[0]?.id).toBe("main");
    expect(patch.agents[0]?.identity.name).toBe("Primus");
    expect(patch.agents[1]?.id).toBe("thor");
    expect(patch.agents[1]?.identity.name).toBe("Thor");
  });

  it("skips OpenClaw output when openclaw is disabled in roster", async () => {
    const roster: AgentRoster = {
      ...makeRoster(openclawRoot),
      openclaw: { enabled: false, workspace_root: openclawRoot },
    };
    await syncAgents(tmpDir, assetsDir, roster, {
      copilot: false,
      claude: false,
      codex: false,
    });

    await expect(
      readFile(join(openclawRoot, "workspace", "IDENTITY.md"), "utf8"),
    ).rejects.toThrow();
  });
});

// ─── skipped agents ───────────────────────────────────────────────────────────

describe("syncAgents — missing definitions", () => {
  it("skips agents whose definition files cannot be found and reports them", async () => {
    const roster: AgentRoster = {
      ...makeRoster(openclawRoot),
      roster: [
        { definition: "orchestrator", name: "Primus", id: "main" },
        { definition: "nonexistent-role", name: "Ghost", id: "ghost" },
      ],
    };

    const result = await syncAgents(tmpDir, assetsDir, roster, {
      openclaw: false,
      copilot: false,
      claude: false,
      codex: false,
    });

    expect(result.skipped.some((s) => s.includes("nonexistent-role"))).toBe(true);
  });
});
