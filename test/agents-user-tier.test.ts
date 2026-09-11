import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { promises as fs } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { loadRoster, agentsBaseDir, projectAgentsDir } from "../src/modules/agent-loader.js";
import { syncAgents } from "../src/modules/agent-generator.js";
import { resolveRoster } from "../src/modules/agents.js";
import { stringify } from "yaml";
import { readManifest, writeManifest } from "../src/modules/manifest.js";
import { runUninstall } from "../src/commands/uninstall.js";
import {
  LEGACY_USER_AGENT_FANOUT_DIR,
  USER_AGENT_FANOUT_DIR,
  clientOfFanoutPath,
  describeFanoutOutcomes,
  syncUserTierFanout,
  userAgentFanoutPath,
  userTierRoot,
} from "../src/modules/user-tier.js";
import { removeFixtureDir } from "./helpers/fixture-dir.js";
import type { AgentRoster } from "../src/types.js";

const ASSETS_DIR = join(process.cwd(), "src/assets");

let home: string;
let repo: string;

beforeEach(async () => {
  home = await fs.mkdtemp(join(tmpdir(), "agents-user-tier-home-"));
  repo = await fs.mkdtemp(join(tmpdir(), "agents-user-tier-repo-"));
});

afterEach(async () => {
  await removeFixtureDir(home);
  await removeFixtureDir(repo);
});

const ROSTER: AgentRoster = {
  schema_version: 2,
  naming_strategy: "arcanos",
  agent_profile: "base",
  openclaw: { enabled: true, workspace_root: join(tmpdir(), "never-written") },
  roster: [
    { definition: "architecture-lead", name: "Merlin", id: "merlin" },
    { definition: "qa-lead", name: "Bess", id: "bess" },
  ],
};

/** A store as `spell init --user` leaves it, with no fan-out yet. */
async function emptyStore(): Promise<string> {
  const storeRoot = userTierRoot(home);
  await fs.mkdir(storeRoot, { recursive: true });
  await writeManifest(storeRoot, {
    version: "1.3.0",
    profile: "full",
    installedAt: "2026-09-11T00:00:00.000Z",
    components: [],
    scope: "user",
  });
  return storeRoot;
}

describe("agentsBaseDir — the store is the framework layer, not a directory inside one", () => {
  it("puts a repository's roster under its .arcane layer", () => {
    expect(agentsBaseDir(repo)).toBe(join(repo, ".arcane"));
    expect(projectAgentsDir(repo)).toBe(join(repo, ".arcane", "agents"));
  });

  it("puts the user tier's roster at the store root, never nested a second time", () => {
    const storeRoot = userTierRoot(home);
    expect(agentsBaseDir(storeRoot, "user")).toBe(storeRoot);
    expect(projectAgentsDir(storeRoot, "user")).toBe(join(storeRoot, "agents"));
    expect(agentsBaseDir(storeRoot, "user")).not.toContain(join(".arcane", ".arcane"));
  });
});

describe("syncAgents at the user tier", () => {
  it("renders one agent file per rostered agent and writes none of them itself", async () => {
    const storeRoot = await emptyStore();
    const result = await syncAgents(storeRoot, ASSETS_DIR, ROSTER, { scope: "user" });

    expect(result.userAgentFiles.map((f) => f.relativePath)).toEqual([
      userAgentFanoutPath("merlin"),
      userAgentFanoutPath("bess"),
    ]);
    for (const file of result.userAgentFiles) {
      expect(file.client).toBe("copilot-agents");
      expect(file.content).toContain("name: ");
      await expect(fs.access(join(home, file.relativePath))).rejects.toThrow();
    }
  });

  it("writes no marker merges and no repository agent directory", async () => {
    const storeRoot = await emptyStore();
    await syncAgents(storeRoot, ASSETS_DIR, ROSTER, { scope: "user" });

    for (const path of ["CLAUDE.md", "AGENTS.md", join(".github", "copilot-instructions.md")]) {
      await expect(fs.access(join(storeRoot, path))).rejects.toThrow();
    }
    await expect(fs.access(join(storeRoot, ".github", "agents"))).rejects.toThrow();
  });

  it("targets ~/.claude/agents, the one home location both clients read", () => {
    expect(USER_AGENT_FANOUT_DIR).toBe(".claude/agents");
    expect(userAgentFanoutPath("merlin")).toBe(".claude/agents/merlin.md");
    // A plain .md, not .agent.md: VS Code registers every .md under a
    // `.claude/agents` directory as an agent, and Claude Code expects .md for
    // a subagent. One name both accept (ARC-047 decision 3, amended).
    expect(userAgentFanoutPath("merlin").endsWith(".agent.md")).toBe(false);
  });

  it("still recognizes the pre-amendment location as its own, so a sync can prune it", () => {
    expect(clientOfFanoutPath(`${LEGACY_USER_AGENT_FANOUT_DIR}/merlin.agent.md`)).toBe("copilot-agents");
    expect(clientOfFanoutPath(userAgentFanoutPath("merlin"))).toBe("copilot-agents");
    // An unrecognized path is treated as another command's and never pruned,
    // which is exactly how the old copies would have been stranded.
    expect(clientOfFanoutPath("somewhere/else/merlin.md")).toBeUndefined();
  });

  it("writes a description that reads as a label and gates automatic delegation", async () => {
    const storeRoot = await emptyStore();
    const { userAgentFiles } = await syncAgents(storeRoot, ASSETS_DIR, ROSTER, { scope: "user" });
    const merlin = userAgentFiles.find((f) => f.relativePath.endsWith("merlin.md"));
    expect(merlin?.content).toContain("name: Merlin");
    expect(merlin?.content).toContain("Use only when explicitly asked for Merlin by name");
    // The persona prose is hard-wrapped YAML; a first-LINE slice cut it
    // mid-sentence ("...and system design. Reviews").
    expect(merlin?.content).not.toMatch(/Reviews Use only when/);
    // Everything below the frontmatter is the repository tier's file verbatim.
    expect(merlin?.content).toContain("## Behavioral Rules");
    expect(merlin?.content).toContain("## Tools");
  });
});

describe("the user tier's agent files go through the fan-out's hash guard", () => {
  async function syncOnce(storeRoot: string, previous?: Record<string, string>) {
    const { userAgentFiles } = await syncAgents(storeRoot, ASSETS_DIR, ROSTER, { scope: "user" });
    return syncUserTierFanout({
      homeDir: home,
      storeRoot,
      spellIds: [],
      extraFiles: userAgentFiles,
      ownedClients: ["copilot-agents"],
      ...(previous === undefined ? {} : { previous }),
    });
  }

  it("writes each file once and records it", async () => {
    const storeRoot = await emptyStore();
    const { record, outcomes } = await syncOnce(storeRoot);

    expect(outcomes.every((o) => o.status === "written")).toBe(true);
    expect(Object.keys(record).sort()).toEqual(
      [userAgentFanoutPath("bess"), userAgentFanoutPath("merlin")].sort(),
    );
    const written = await fs.readFile(join(home, userAgentFanoutPath("merlin")), "utf8");
    expect(written).toContain("name: Merlin");
  });

  it("is a no-op on a rerun", async () => {
    const storeRoot = await emptyStore();
    const first = await syncOnce(storeRoot);
    const second = await syncOnce(storeRoot, first.record);
    expect(second.outcomes.every((o) => o.status === "unchanged")).toBe(true);
    expect(second.record).toEqual(first.record);
  });

  it("never overwrites an agent file the operator edited", async () => {
    const storeRoot = await emptyStore();
    const first = await syncOnce(storeRoot);
    const target = join(home, userAgentFanoutPath("merlin"));
    await fs.writeFile(target, "---\nname: Merlin\n---\n\nMy own version.\n", "utf8");

    const second = await syncOnce(storeRoot, first.record);
    const outcome = second.outcomes.find((o) => o.relativePath === userAgentFanoutPath("merlin"));
    expect(outcome?.status).toBe("customized");
    expect(await fs.readFile(target, "utf8")).toContain("My own version.");
  });

  it("leaves the spell clients' records alone, so the two commands can share one map", async () => {
    const storeRoot = await emptyStore();
    const spellRecords = {
      ".agents/skills/spell-status/SKILL.md": "a".repeat(64),
      ".claude/commands/spell-status.md": "b".repeat(64),
    };
    const { record } = await syncOnce(storeRoot, spellRecords);
    expect(record[".agents/skills/spell-status/SKILL.md"]).toBe("a".repeat(64));
    expect(record[".claude/commands/spell-status.md"]).toBe("b".repeat(64));
    expect(Object.keys(record)).toHaveLength(4);
  });
});

describe("a repository that takes its spells from the user tier", () => {
  async function optedOutRepo() {
    await fs.mkdir(join(repo, ".arcane", "agents"), { recursive: true });
    await writeManifest(repo, {
      version: "1.3.0",
      profile: "full",
      installedAt: "2026-09-11T00:00:00.000Z",
      components: [],
      spell_scope: "user",
    });
  }

  it("receives no agent files of its own", async () => {
    await optedOutRepo();
    const result = await syncAgents(repo, ASSETS_DIR, ROSTER, { spellScope: "user" });
    expect(result.synced.filter((s) => s.startsWith(".github/agents/"))).toEqual([]);
    await expect(fs.access(join(repo, ".github", "agents", "merlin.agent.md"))).rejects.toThrow();
  });

  it("still gets its three roster tables, which are continuity content", async () => {
    await optedOutRepo();
    const result = await syncAgents(repo, ASSETS_DIR, ROSTER, { spellScope: "user" });
    expect(result.synced).toContain("CLAUDE.md (agents section)");
    expect(result.synced).toContain("AGENTS.md (agents section)");
    expect(result.synced).toContain(".github/copilot-instructions.md (agents section)");
    expect(await fs.readFile(join(repo, "CLAUDE.md"), "utf8")).toContain("Merlin");
  });

  it("names the agent files left over from before the opt-out and deletes none of them", async () => {
    await optedOutRepo();
    await fs.mkdir(join(repo, ".github", "agents"), { recursive: true });
    await fs.writeFile(join(repo, ".github", "agents", "merlin.agent.md"), "old\n", "utf8");
    await fs.writeFile(join(repo, ".github", "agents", "bess.agent.md"), "old\n", "utf8");

    const result = await syncAgents(repo, ASSETS_DIR, ROSTER, { spellScope: "user" });
    expect(result.unmanagedAgentFiles).toEqual([
      ".github/agents/bess.agent.md",
      ".github/agents/merlin.agent.md",
    ]);
    const kept = await fs.readFile(join(repo, ".github", "agents", "merlin.agent.md"), "utf8");
    expect(kept).toBe("old\n");
  });

  it("is unaffected when it has not opted out", async () => {
    await fs.mkdir(join(repo, ".arcane", "agents"), { recursive: true });
    const result = await syncAgents(repo, ASSETS_DIR, ROSTER, {});
    expect(result.synced).toContain(".github/agents/merlin.agent.md");
    expect(result.unmanagedAgentFiles).toEqual([]);
    expect(result.userAgentFiles).toEqual([]);
    const written = await fs.readFile(join(repo, ".github", "agents", "merlin.agent.md"), "utf8");
    expect(written).toContain("name: Merlin");
  });
});

describe("the store round-trips through loadRoster", () => {
  it("reads back a roster written at the store root", async () => {
    const storeRoot = await emptyStore();
    await fs.writeFile(
      join(agentsBaseDir(storeRoot, "user"), "agents.yaml"),
      JSON.stringify(ROSTER),
      "utf8",
    );
    const roster = await loadRoster(storeRoot, "user");
    expect(roster.roster.map((r) => r.name)).toEqual(["Merlin", "Bess"]);
    const manifest = await readManifest(storeRoot);
    expect(manifest.scope).toBe("user");
  });
});

describe("uninstall --user leaves nothing of the agent tier behind", () => {
  it("removes the roster and the definition files it wrote", async () => {
    const storeRoot = await emptyStore();
    const agentsDir = join(agentsBaseDir(storeRoot, "user"), "agents");
    await fs.mkdir(agentsDir, { recursive: true });
    await fs.writeFile(join(storeRoot, "agents.yaml"), "schema_version: 2\n", "utf8");
    await fs.writeFile(join(agentsDir, "qa-lead.yaml"), "id: qa-lead\n", "utf8");

    await runUninstall({ yes: true, user: true }, storeRoot);

    await expect(fs.access(join(storeRoot, "agents.yaml"))).rejects.toThrow();
    await expect(fs.access(agentsDir)).rejects.toThrow();
  });
});

describe("the output names the tier the run actually wrote", () => {
  it("reports only the clients a run wrote for", async () => {
    const storeRoot = await emptyStore();
    const { userAgentFiles } = await syncAgents(storeRoot, ASSETS_DIR, ROSTER, { scope: "user" });
    const { outcomes } = await syncUserTierFanout({
      homeDir: home,
      storeRoot,
      spellIds: [],
      extraFiles: userAgentFiles,
      ownedClients: ["copilot-agents"],
    });
    const lines = describeFanoutOutcomes(outcomes);
    expect(lines[0]).toContain("2 agent personas (VS Code + Claude Code)");
    // A correct agent run used to read as a broken one by reporting zero of
    // the two spell clients it was never going to write.
    expect(lines[0]).not.toContain("0 ");
  });

  it("sends a --user run to the user tier's roster, not the repository's", async () => {
    await expect(loadRoster(repo, "user")).rejects.toThrow(/~\/\.arcane\/agents\.yaml/);
    await expect(loadRoster(repo, "user")).rejects.toThrow(/spell agents init --user/);
    await expect(loadRoster(repo)).rejects.toThrow(/^No agent roster found at \.arcane/);
  });
});

describe("resolveRoster — a repository that opted in and has no roster of its own", () => {
  async function storeWithRoster(): Promise<string> {
    const storeRoot = await emptyStore();
    await fs.writeFile(join(storeRoot, "agents.yaml"), stringify(ROSTER), "utf8");
    return storeRoot;
  }

  it("falls back to the user tier's roster, and says where its definitions live", async () => {
    await storeWithRoster();
    await writeManifest(repo, {
      version: "1.3.2",
      profile: "full",
      installedAt: "2026-09-11T00:00:00.000Z",
      components: [],
      spell_scope: "user",
    });

    const resolved = await resolveRoster(repo, "repo", home);
    expect(resolved.fromUserTier).toBe(true);
    expect(resolved.roster.roster.map((r) => r.name)).toEqual(["Merlin", "Bess"]);
    expect(resolved.definitionsDir).toBe(join(userTierRoot(home), "agents"));
  });

  it("prefers the repository's own roster when it has one", async () => {
    await storeWithRoster();
    await writeManifest(repo, {
      version: "1.3.2",
      profile: "full",
      installedAt: "2026-09-11T00:00:00.000Z",
      components: [],
      spell_scope: "user",
    });
    await fs.mkdir(join(repo, ".arcane"), { recursive: true });
    await fs.writeFile(
      join(repo, ".arcane", "agents.yaml"),
      stringify({ ...ROSTER, roster: [{ definition: "qa-lead", name: "Bess", id: "bess" }] }),
      "utf8",
    );

    const resolved = await resolveRoster(repo, "repo", home);
    expect(resolved.fromUserTier).toBe(false);
    expect(resolved.roster.roster.map((r) => r.name)).toEqual(["Bess"]);
  });

  it("still refuses when the repository has NOT opted in — no roster means no roster", async () => {
    await storeWithRoster();
    await writeManifest(repo, {
      version: "1.3.2",
      profile: "full",
      installedAt: "2026-09-11T00:00:00.000Z",
      components: [],
    });
    await expect(resolveRoster(repo, "repo", home)).rejects.toThrow(/No agent roster found/);
  });
});
